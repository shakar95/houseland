/**
 * Creates Supabase Auth users (email + password) and syncs Prisma profiles.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Run: npm run db:seed:auth
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureTestUsers } from '../server/ensureTestUsers.js';

const prisma = new PrismaClient();

async function main() {
  const results = await ensureTestUsers(prisma);
  for (const r of results) console.log(r.email, '→', r.status);

  const lines = [
    'Houseland — Test login',
    '====================',
    '',
    'ADMIN:  admin@houseland.iq  /  HouselandAdmin2026!',
    'CLIENT: client@houseland.iq /  HouselandClient2026!',
    '',
    'Login: http://localhost:5173/login',
  ];
  writeFileSync(join(process.cwd(), 'Readme.txt'), lines.join('\n'), 'utf8');
  console.log('\nCredentials saved to Readme.txt');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
