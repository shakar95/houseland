import { createClient } from '@supabase/supabase-js';
import { PrismaClient, UserRole } from '@prisma/client';

const TEST_USERS = [
  {
    email: 'admin@houseland.iq',
    password: 'HouselandAdmin2026!',
    role: UserRole.ADMIN,
    fullName: 'بەڕێوەبەری هاوسلاند',
  },
  {
    email: 'client@houseland.iq',
    password: 'HouselandClient2026!',
    role: UserRole.CLIENT,
    fullName: 'بەکارهێنەری تاقیکردنەوە',
  },
] as const;

export async function ensureTestUsers(prisma: PrismaClient) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in server .env');
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: { email: string; status: string }[] = [];

  for (const u of TEST_USERS) {
    let authUserId: string | undefined;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.fullName },
    });

    if (createErr) {
      const msg = createErr.message.toLowerCase();
      if (msg.includes('already') || msg.includes('registered')) {
        const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
        const found = list.users.find((x) => x.email === u.email);
        if (!found) throw new Error(`Could not resolve user: ${u.email}`);
        authUserId = found.id;
        await admin.auth.admin.updateUserById(authUserId, {
          password: u.password,
          email_confirm: true,
        });
        results.push({ email: u.email, status: 'password_reset' });
      } else {
        throw new Error(`${u.email}: ${createErr.message}`);
      }
    } else {
      authUserId = created.user.id;
      results.push({ email: u.email, status: 'created' });
    }

    await prisma.profile.upsert({
      where: { email: u.email },
      update: { role: u.role, fullName: u.fullName, googleAuthId: authUserId },
      create: {
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        googleAuthId: authUserId,
      },
    });
  }

  return results;
}
