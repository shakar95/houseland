import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { prisma } from './prisma.js';
import { requireAuth, requireRole, type AuthRequest } from './middleware/auth.js';
import { generatePropertyCode } from './utils/propertyCode.js';
import { PropertyStatus } from '@prisma/client';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PUBLIC_STATUSES: PropertyStatus[] = [PropertyStatus.APPROVED];

function maskPropertyForPublic<T extends Record<string, unknown>>(p: T) {
  const { latitude, longitude, submitterId, ...rest } = p;
  return { ...rest, latitude: undefined, longitude: undefined, submitterId: undefined };
}

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
  const staff = await prisma.staff.update({ where: { id: req.params.id }, data: req.body });
  res.json(staff);
});

app.delete('/api/staff/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.staff.update({ where: { id: req.params.id }, data: { active: false } });
  res.json({ ok: true });
});

// ——— Properties (public) ———
app.get('/api/properties', async (req, res) => {
  const {
    code,
    minArea,
    maxArea,
    minPrice,
    maxPrice,
    neighborhood,
    floor,
    propertyType,
    transactionType,
    status,
  } = req.query;

  const isAdmin = status !== undefined;
  const where: Record<string, unknown> = {
    ...(!isAdmin ? { status: { in: PUBLIC_STATUSES } } : {}),
    ...(code && { code: { contains: String(code), mode: 'insensitive' } }),
    ...(neighborhood && neighborhood !== 'all' && { neighborhood: String(neighborhood) }),
    ...(propertyType && propertyType !== 'all' && { propertyType: String(propertyType) }),
    ...(transactionType && transactionType !== 'all' && { transactionType: String(transactionType) }),
    ...(isAdmin && status && status !== 'all' && { status: String(status) }),
    ...(floor && { floors: Number(floor) }),
  };

  if (minArea || maxArea) {
    where.areaSqm = {
      ...(minArea && { gte: Number(minArea) }),
      ...(maxArea && { lte: Number(maxArea) }),
    };
  }
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice && { gte: Number(minPrice) }),
      ...(maxPrice && { lte: Number(maxPrice) }),
    };
  }

  const properties = await prisma.property.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { analytics: true },
  });

  res.json(isAdmin ? properties : properties.map(maskPropertyForPublic));
});

app.get('/api/properties/:idOrCode', async (req, res) => {
  const key = req.params.idOrCode;
  const property = await prisma.property.findFirst({
    where: {
      OR: [{ id: key }, { code: key }],
      ...(req.query.admin !== 'true' ? { status: { in: PUBLIC_STATUSES } } : {}),
    },
    include: { analytics: true },
  });
  if (!property) return res.status(404).json({ error: 'Not found' });

  if (req.query.admin !== 'true') {
    await prisma.analytics.upsert({
      where: { propertyId: property.id },
      update: { viewsCount: { increment: 1 } },
      create: { propertyId: property.id, viewsCount: 1 },
    });
    return res.json(maskPropertyForPublic(property));
  }
  res.json(property);
});

app.post('/api/properties', requireAuth, async (req: AuthRequest, res) => {
  const code = await generatePropertyCode();
  const property = await prisma.property.create({
    data: {
      ...req.body,
      code,
      status: PropertyStatus.PENDING,
      submitterId: req.userId,
    },
  });
  await prisma.analytics.create({ data: { propertyId: property.id } });
  res.json(property);
});

app.patch('/api/properties/:id', requireAuth, requireRole('ADMIN', 'STAFF'), async (req, res) => {
  const property = await prisma.property.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(property);
});

app.post('/api/properties/:id/analytics', async (req, res) => {
  const { event } = req.body as { event: 'phone' | 'whatsapp' };
  const field = event === 'phone' ? 'phoneClicks' : 'whatsappClicks';
  await prisma.analytics.update({
    where: { propertyId: req.params.id },
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
  const entry = await prisma.crmEntry.update({ where: { id: req.params.id }, data: req.body });
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

app.listen(PORT, () => {
  console.log(`Houseland API running on http://localhost:${PORT}`);
});
