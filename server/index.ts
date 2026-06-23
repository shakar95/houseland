import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';
import { requireAuth, requireRole, type AuthRequest } from './middleware/auth.js';
import { generatePropertyCode } from './utils/propertyCode.js';
import { ensureTestUsers } from './ensureTestUsers.js';
import {
  ADMIN_LIST_SELECT,
  PUBLIC_LIST_SELECT,
  PUBLIC_STATUSES,
  buildPropertyWhere,
  maskPropertyForPublic,
} from './utils/propertyQueries.js';
import { toPublicListingCard, syncPropertyMedia } from './utils/propertyMedia.js';
import {
  getListingCache,
  setListingCache,
  listingCacheKey,
  invalidateListingCache,
} from './utils/listingCache.js';
import { PropertyStatus } from '@prisma/client';

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

const app = express();
const PORT = Number(process.env.PORT) || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ——— Agency ———
app.get('/api/agency', async (_req, res) => {
  const settings = await prisma.agencySettings.findUnique({ where: { id: 'default' } });
  res.json(settings);
});

app.put('/api/agency', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const settings = await prisma.agencySettings.upsert({
    where: { id: 'default' },
    update: req.body,
    create: { id: 'default', ...req.body },
  });
  res.json(settings);
});

// ——— Staff ———
app.get('/api/staff', async (_req, res) => {
  const staff = await prisma.staff.findMany({ where: { active: true } });
  res.json(staff);
});

app.post('/api/staff', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const staff = await prisma.staff.create({ data: req.body });
  res.json(staff);
});

app.put('/api/staff/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const staff = await prisma.staff.update({ where: { id: param(req.params.id) }, data: req.body });
  res.json(staff);
});

app.delete('/api/staff/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.staff.update({ where: { id: param(req.params.id) }, data: { active: false } });
  res.json({ ok: true });
});

// ——— Properties (public) ———
app.get('/api/properties', async (req, res) => {
  const isAdmin = req.query.status !== undefined;
  const where = buildPropertyWhere(req.query as Record<string, unknown>, isAdmin);
  const limitRaw = Number(req.query.limit);
  const take = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : undefined;

  if (isAdmin) {
    const properties = await prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: ADMIN_LIST_SELECT,
      ...(take ? { take } : {}),
    });
    res.json(properties);
    return;
  }

  const cacheKey = listingCacheKey(req.query as Record<string, unknown>);
  const cached = getListingCache(cacheKey);
  if (cached) {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json(cached);
    return;
  }

  const properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: PUBLIC_LIST_SELECT,
    ...(take ? { take } : {}),
  });

  const payload = properties.map((p) => maskPropertyForPublic(toPublicListingCard(p)));
  setListingCache(cacheKey, payload);
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  res.json(payload);
});

app.get('/api/properties/:idOrCode', async (req, res) => {
  const key = param(req.params.idOrCode);
  const property = await prisma.property.findFirst({
    where: {
      OR: [{ id: key }, { code: key }],
      ...(req.query.admin !== 'true' ? { status: { in: PUBLIC_STATUSES } } : {}),
    },
    include: { analytics: true },
  });
  if (!property) return res.status(404).json({ error: 'Not found' });

  if (req.query.admin !== 'true') {
    void prisma.analytics
      .upsert({
        where: { propertyId: property.id },
        update: { viewsCount: { increment: 1 } },
        create: { propertyId: property.id, viewsCount: 1 },
      })
      .catch(() => {});
    return res.json(maskPropertyForPublic(property));
  }
  res.json(property);
});

app.post('/api/properties', requireAuth, async (req: AuthRequest, res) => {
  const code = await generatePropertyCode();
  const media = syncPropertyMedia((req.body.images as string[]) ?? []);
  const status =
    req.userRole === 'ADMIN' ? PropertyStatus.APPROVED : PropertyStatus.PENDING;
  const property = await prisma.property.create({
    data: {
      ...req.body,
      ...media,
      code,
      status,
      submitterId: req.userId,
    },
  });
  await prisma.analytics.create({ data: { propertyId: property.id } });
  invalidateListingCache();
  res.json(property);
});

app.patch('/api/properties/:id', requireAuth, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const body = { ...req.body } as Record<string, unknown>;
  if (Array.isArray(body.images)) {
    Object.assign(body, syncPropertyMedia(body.images as string[]));
  }
  const property = await prisma.property.update({
    where: { id: param(req.params.id) },
    data: body,
  });
  invalidateListingCache();
  res.json(property);
});

app.post('/api/properties/:id/analytics', async (req, res) => {
  const { event } = req.body as { event: 'phone' | 'whatsapp' };
  const field = event === 'phone' ? 'phoneClicks' : 'whatsappClicks';
  await prisma.analytics.update({
    where: { propertyId: param(req.params.id) },
    data: { [field]: { increment: 1 } },
  });
  res.json({ ok: true });
});

// ——— CRM ———
app.get('/api/crm', requireAuth, requireRole('ADMIN', 'STAFF'), async (_req, res) => {
  const entries = await prisma.crmEntry.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json(entries);
});

app.post('/api/crm', requireAuth, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const entry = await prisma.crmEntry.create({ data: req.body });
  res.json(entry);
});

app.patch('/api/crm/:id', requireAuth, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const entry = await prisma.crmEntry.update({ where: { id: param(req.params.id) }, data: req.body });
  res.json(entry);
});

// ——— Contracts ———
app.get('/api/contracts', requireAuth, requireRole('ADMIN', 'STAFF'), async (_req, res) => {
  const contracts = await prisma.contract.findMany({
    include: { property: true },
    orderBy: { date: 'desc' },
  });
  res.json(contracts);
});

app.post('/api/contracts', requireAuth, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const contract = await prisma.contract.create({ data: req.body });
  const analyticsField =
    req.body.contractType === 'SALE' ? 'saleContractsCount' : 'rentContractsCount';
  await prisma.analytics.update({
    where: { propertyId: req.body.propertyId },
    data: { [analyticsField]: { increment: 1 } },
  });
  const newStatus = req.body.contractType === 'SALE' ? PropertyStatus.SOLD : PropertyStatus.RENTED;
  await prisma.property.update({
    where: { id: req.body.propertyId },
    data: { status: newStatus },
  });
  res.json(contract);
});

// ——— Analytics dashboard ———
app.get('/api/analytics/dashboard', requireAuth, requireRole('ADMIN', 'STAFF'), async (_req, res) => {
  const all = await prisma.analytics.findMany({
    include: { property: { select: { code: true, title: true, status: true } } },
  });
  const sold = await prisma.property.count({ where: { status: PropertyStatus.SOLD } });
  const rented = await prisma.property.count({ where: { status: PropertyStatus.RENTED } });
  const pending = await prisma.property.count({ where: { status: PropertyStatus.PENDING } });
  const active = await prisma.property.count({ where: { status: PropertyStatus.APPROVED } });

  const totals = all.reduce(
    (acc, a) => ({
      views: acc.views + a.viewsCount,
      phone: acc.phone + a.phoneClicks,
      whatsapp: acc.whatsapp + a.whatsappClicks,
    }),
    { views: 0, phone: 0, whatsapp: 0 }
  );

  const topProperties = [...all]
    .sort((a, b) => b.viewsCount - a.viewsCount)
    .slice(0, 10);

  res.json({ totals, sold, rented, pending, active, topProperties });
});

// ——— Profile ———
app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.userId } });
  res.json(profile);
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/ensure-test-users', async (_req, res) => {
    try {
      const results = await ensureTestUsers(prisma);
      res.json({ ok: true, results });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Setup failed';
      res.status(500).json({ error: message });
    }
  });
}

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Houseland Real Estate API running on http://localhost:${PORT}`);
});
