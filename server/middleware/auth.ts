import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../prisma.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Auth not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });

  let profile = await prisma.profile.findFirst({
    where: { OR: [{ googleAuthId: data.user.id }, { email: data.user.email ?? '' }] },
  });

  if (!profile && data.user.email) {
    profile = await prisma.profile.create({
      data: {
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name ?? data.user.email.split('@')[0],
        googleAuthId: data.user.id,
      },
    });
  }

  if (!profile) return res.status(401).json({ error: 'Profile not found' });

  req.userId = profile.id;
  req.userRole = profile.role;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
