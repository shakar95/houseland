import type { Request, Response, NextFunction } from 'express';
import { eq, or } from 'drizzle-orm';
import { db, profiles } from '../db/index.js';
import { createSupabaseServerClient } from '../supabaseAdmin.js';

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    if (!supabaseKey) {
      return res.status(503).json({ error: 'Auth not configured' });
    }

    const supabase = createSupabaseServerClient(supabaseKey);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });

    const userEmail = data.user.email ?? '';
    const lookupConditions = [eq(profiles.googleAuthId, data.user.id)];
    if (userEmail) {
      lookupConditions.push(eq(profiles.email, userEmail));
    }

    let [profile] = await db
      .select()
      .from(profiles)
      .where(or(...lookupConditions))
      .limit(1);

    if (!profile && data.user.email) {
      const [created] = await db
        .insert(profiles)
        .values({
          email: data.user.email,
          fullName: data.user.user_metadata?.full_name ?? data.user.email.split('@')[0],
          googleAuthId: data.user.id,
        })
        .returning();
      profile = created;
    } else if (profile && !profile.googleAuthId) {
      const [updated] = await db
        .update(profiles)
        .set({ googleAuthId: data.user.id })
        .where(eq(profiles.id, profile.id))
        .returning();
      profile = updated;
    }

    if (!profile) return res.status(401).json({ error: 'Profile not found' });

    req.userId = profile.id;
    req.userRole = profile.role;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
