/**
 * Creates Supabase Auth users (email + password) and syncs Prisma profiles.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Run: npm run db:seed:auth
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient, UserRole } from '@prisma/client';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

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

async function main() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    console.error('Get service role key: Supabase → Project Settings → API → service_role');
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const lines: string[] = [
    'Houseland — Test login (email + password)',
    '========================================',
    '',
    'Supabase: Authentication → Providers → Email → Enable',
    '',
  ];

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
        if (!found) {
          console.error(`User exists but not found: ${u.email}`, createErr.message);
          continue;
        }
        authUserId = found.id;
        await admin.auth.admin.updateUserById(authUserId, {
          password: u.password,
          email_confirm: true,
        });
        console.log(`Updated password: ${u.email}`);
      } else {
        console.error(`Failed ${u.email}:`, createErr.message);
        continue;
      }
    } else {
      authUserId = created.user.id;
      console.log(`Created auth user: ${u.email}`);
    }

    await prisma.profile.upsert({
      where: { email: u.email },
      update: {
        role: u.role,
        fullName: u.fullName,
        googleAuthId: authUserId,
      },
      create: {
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        googleAuthId: authUserId,
      },
    });

    lines.push(`${u.role}:`);
    lines.push(`  Email:    ${u.email}`);
    lines.push(`  Password: ${u.password}`);
    lines.push('');
  }

  const readmePath = join(process.cwd(), 'Readme.txt');
  writeFileSync(readmePath, lines.join('\n'), 'utf8');
  console.log(`\nCredentials saved to ${readmePath}`);
  console.log('\nRun: npm run db:seed  (for demo properties)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
