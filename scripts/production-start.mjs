import { spawnSync } from 'node:child_process';

function sanitizeDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error(
      'DATABASE_URL is missing. Add it in Render → Environment (no quotes around the value).',
    );
    process.exit(1);
  }
  const url = raw.trim().replace(/^["']+|["']+$/g, '');
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    console.error(
      'DATABASE_URL must start with postgresql:// — remove surrounding " quotes in Render.',
    );
    console.error('First characters received:', JSON.stringify(url.slice(0, 20)));
    process.exit(1);
  }
  process.env.DATABASE_URL = url;
}

sanitizeDatabaseUrl();
process.env.NODE_ENV = 'production';

const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const server = spawnSync('node', ['dist-server/index.js'], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(server.status ?? 1);
