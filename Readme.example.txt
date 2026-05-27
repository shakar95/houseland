Houseland — Test login (email + password)
========================================

Run once locally:
  npm run db:seed:auth
  npm run db:seed

Supabase Dashboard:
  Authentication → Providers → Email → Enable

Credentials are written to Readme.txt (gitignored) after db:seed:auth.

Default test accounts (passwords set by seed script):
  ADMIN:  admin@houseland.iq
  CLIENT: client@houseland.iq

Login at: /login
