# Houseland — Sulaymaniyah Real Estate

Premium single-agency real estate web app for **Houseland** (Sulaymaniyah, Iraq).

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Leaflet, Recharts
- **Backend:** Express API + Prisma ORM
- **Auth & DB:** Supabase (Google OAuth + PostgreSQL)

## Theme

- Primary: Deep Royal Blue (`royal-*`)
- Accent: Elegant Gold (`gold-*`)

## Setup

1. Copy `.env.example` to `.env` and fill in Supabase + `DATABASE_URL`.
2. In Supabase Dashboard:
   - Enable **Google** provider under Authentication.
   - Add redirect URL: `http://localhost:5173/auth/callback`
3. Install and migrate:

```bash
cd houseland
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

4. Run dev (client + API):

```bash
npm run dev
```

- Site: http://localhost:5173  
- API: http://localhost:3001  

## Admin access

After first Google sign-in, promote your user in the database:

```sql
UPDATE profiles SET role = 'ADMIN' WHERE email = 'your@email.com';
```

## Features

- Client property submission (PENDING → admin approval)
- Contact masking (agency phones only on public listings)
- Location obfuscation (neighborhood circle on public maps)
- Sulaymaniyah neighborhood dropdown
- Advanced filters, video embeds, PDF flyers
- Dashboard: analytics, property ledger, CRM, staff, agency settings
