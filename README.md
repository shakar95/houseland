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

## Deploy on Render

1. Create a **Web Service** from this repo (or use `render.yaml`).
2. **Environment variables** (required):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Supabase **Session pooler** URI (encode `@` → `%40`, `#` → `%23`) |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_URL` | Leave **empty** (same-origin `/api`) |

**Do not set `NODE_ENV` on Render** — it makes `npm install` skip Vite/TypeScript and the build fails.

3. **Build command:** `npm run build:render`  
4. **Start command:** `npm start` (migrations + server; sets `NODE_ENV=production` automatically)  
5. **`DATABASE_URL` on Render** — paste the pooler URI **without** extra quotes:
   - Must start with `postgresql://`
   - Example shape: `postgresql://postgres.REF:ENCODED_PASS@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require`
   - Do **not** paste `"postgresql://..."` (no `"` characters)
6. In Supabase Auth, add redirect URL: `https://YOUR-APP.onrender.com/auth/callback`

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
