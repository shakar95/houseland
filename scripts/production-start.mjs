import { spawnSync } from 'node:child_process';

function sanitizeEnvUrl(name) {
  const raw = process.env[name];
  if (!raw) return null;
  const url = raw.trim().replace(/^["']+|["']+$/g, '');
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    console.error(
      `[houseland] ${name} must start with postgresql:// (remove " quotes in Render).`,
    );
    console.error(`[houseland] Got: ${JSON.stringify(url.slice(0, 24))}...`);
    process.exit(1);
  }
  process.env[name] = url;
  return url;
}

console.log('[houseland] Starting production...');

if (!sanitizeEnvUrl('DATABASE_URL')) {
  console.error('[houseland] DATABASE_URL is missing. Set it in Render → Environment.');
  process.exit(1);
}

sanitizeEnvUrl('DIRECT_URL');
process.env.NODE_ENV = 'production';

console.log('[houseland] Syncing database (prisma db push)...');
const db = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
  stdio: 'inherit',
  env: process.env,
});
if (db.status !== 0) {
  console.error('[houseland] prisma db push failed.');
  process.exit(db.status ?? 1);
}

console.log('[houseland] Starting server on port', process.env.PORT || 3001);
const server = spawnSync('node', ['dist-server/index.js'], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(server.status ?? 1);
