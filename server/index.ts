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

const wrap = <T extends express.Request = express.Request>(
  fn: (req: T, res: express.Response, next: express.NextFunction) => Promise<unknown>
): express.RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
};

const app = express();
const PORT = Number(process.env.PORT) || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ——— Agency ———
app.get('/api/agency', wrap(async (_req, res) => {
  const settings = await prisma.agencySettings.findUnique({ where: { id: 'default' } });
  res.json(settings);
}));

app.put('/api/agency', requireAuth, requireRole('ADMIN'), wrap(async (req: AuthRequest, res) => {
  const settings = await prisma.agencySettings.upsert({
    where: { id: 'default' },
    update: req.body,
    create: { id: 'default', ...req.body },
  });
  res.json(settings);
}));

// ——— Staff ———
app.get('/api/staff', wrap(async (_req, res) => {
  const staff = await prisma.staff.findMany({ where: { active: true } });
  res.json(staff);
}));

app.post('/api/staff', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  const staff = await prisma.staff.create({ data: req.body });
  res.json(staff);
}));

app.put('/api/staff/:id', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  const staff = await prisma.staff.update({ where: { id: param(req.params.id) }, data: req.body });
  res.json(staff);
}));

app.delete('/api/staff/:id', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  await prisma.staff.update({ where: { id: param(req.params.id) }, data: { active: false } });
  res.json({ ok: true });
}));

// ——— Properties (public) ———
app.get('/api/properties', wrap(async (req, res) => {
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
}));

app.get('/api/properties/:idOrCode', wrap(async (req, res) => {
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
}));

function sanitizePropertyInput(body: Record<string, unknown>) {
  const numOrNull = (val: unknown) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  };
  const intOrNull = (val: unknown) => {
    const n = numOrNull(val);
    return n !== null ? Math.round(n) : null;
  };
  const strOrNull = (val: unknown) => {
    if (typeof val !== 'string') return null;
    const trimmed = val.trim();
    return trimmed ? trimmed : null;
  };

  return {
    title: String(body.title || 'Untitled'),
    description: String(body.description || ''),
    propertyType: body.propertyType as any,
    transactionType: body.transactionType as any,
    areaSqm: Number(body.areaSqm) || 0,
    price: Number(body.price) || 0,
    currency: body.currency === 'IQD' ? ('IQD' as const) : ('USD' as const),
    neighborhood: String(body.neighborhood || ''),
    frontageMeters: numOrNull(body.frontageMeters),
    streetWidth: numOrNull(body.streetWidth),
    streetWidth2: body.isCorner ? numOrNull(body.streetWidth2) : null,
    isCorner: Boolean(body.isCorner),
    nearestLandmark: strOrNull(body.nearestLandmark),
    dimensions: strOrNull(body.dimensions),
    floors: intOrNull(body.floors),
    bedrooms: intOrNull(body.bedrooms),
    bathrooms: intOrNull(body.bathrooms),
    facing: body.facing && ['NORTH', 'SOUTH', 'EAST', 'WEST'].includes(String(body.facing)) ? (body.facing as any) : null,
    videoLink: strOrNull(body.videoLink),
    latitude: typeof body.latitude === 'number' ? body.latitude : Number(body.latitude) || 35.556,
    longitude: typeof body.longitude === 'number' ? body.longitude : Number(body.longitude) || 45.432,
  };
}

export async function resolveVideoUrl(rawUrl: string | null | undefined): Promise<string | null> {
  if (!rawUrl) return null;
  let currentUrl = rawUrl.trim();
  if (!currentUrl) return null;

  if (!currentUrl.includes('facebook.com') && !currentUrl.includes('fb.watch')) {
    return currentUrl;
  }

  try {
    // 1. Follow shortlinks / share redirects (/share/r/, /share/v/, fb.watch/)
    if (currentUrl.includes('/share/') || currentUrl.includes('fb.watch/')) {
      for (let i = 0; i < 3; i++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(currentUrl, {
          method: 'HEAD',
          redirect: 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const location = res.headers.get('location');
        if (!location) break;
        currentUrl = new URL(location, currentUrl).toString();
        if (currentUrl.includes('/videos/') || currentUrl.includes('/reel/')) break;
      }
    }

    // 2. If it is NOT already a reel or video and has a numeric video ID, check canonical redirect
    if (!currentUrl.includes('/reel/') && !currentUrl.includes('/videos/')) {
      const numericIdMatch = currentUrl.match(/(\d{10,})/);
      if (numericIdMatch) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const watchRes = await fetch(`https://www.facebook.com/watch/?v=${numericIdMatch[1]}`, {
            method: 'HEAD',
            redirect: 'manual',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          const watchLoc = watchRes.headers.get('location');
          if (watchLoc && (watchLoc.includes('/videos/') || watchLoc.includes('/reel/'))) {
            currentUrl = new URL(watchLoc, currentUrl).toString();
          }
        } catch {}
      }
    }

    // 3. Clean tracking query parameters
    const parsed = new URL(currentUrl);
    ['rdid', 'share_url', 'ref', 'mibextid', 'sfnsn', 'fs', 's', 'extid', '__tn__', 'locale', '_rdr'].forEach((p) =>
      parsed.searchParams.delete(p)
    );
    return parsed.toString();
  } catch (e) {
    console.warn('[VideoResolver] Could not resolve video URL redirect:', e);
    return currentUrl;
  }
}

app.get('/api/resolve-video-url', wrap(async (req, res) => {
  const url = String(req.query.url || '');
  if (!url) {
    res.json({ resolvedUrl: '' });
    return;
  }
  const resolved = await resolveVideoUrl(url);
  res.json({ resolvedUrl: resolved || url });
}));

app.post('/api/properties', requireAuth, wrap(async (req: AuthRequest, res) => {
  const code = await generatePropertyCode();
  const media = syncPropertyMedia((req.body.images as string[]) ?? []);
  const sanitized = sanitizePropertyInput(req.body);
  const resolvedVideoLink = await resolveVideoUrl(sanitized.videoLink);
  const status =
    req.userRole === 'ADMIN' ? PropertyStatus.APPROVED : PropertyStatus.PENDING;
  const property = await prisma.property.create({
    data: {
      ...sanitized,
      videoLink: resolvedVideoLink,
      ...media,
      code,
      status,
      submitterId: req.userId,
    },
  });
  await prisma.analytics.create({ data: { propertyId: property.id } });
  invalidateListingCache();
  res.json(property);
}));

app.patch('/api/properties/:id', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (req, res) => {
  const target = param(req.params.id);
  const existing = await prisma.property.findFirst({
    where: {
      OR: [{ id: target }, { code: target }],
    },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }

  const body = { ...req.body } as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};

  const numOrNull = (val: unknown) => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  };
  const intOrNull = (val: unknown) => {
    const n = numOrNull(val);
    return n !== null ? Math.round(n) : null;
  };
  const strOrNull = (val: unknown) => {
    if (typeof val !== 'string') return null;
    const trimmed = val.trim();
    return trimmed ? trimmed : null;
  };

  if (body.title !== undefined) updateData.title = String(body.title || '');
  if (body.description !== undefined) updateData.description = String(body.description || '');
  if (body.propertyType !== undefined) updateData.propertyType = body.propertyType as any;
  if (body.transactionType !== undefined) updateData.transactionType = body.transactionType as any;
  if (body.areaSqm !== undefined) updateData.areaSqm = Number(body.areaSqm) || 0;
  if (body.price !== undefined) updateData.price = Number(body.price) || 0;
  if (body.currency !== undefined) updateData.currency = body.currency === 'IQD' ? 'IQD' : 'USD';
  if (body.neighborhood !== undefined) updateData.neighborhood = String(body.neighborhood || '');
  if (body.frontageMeters !== undefined) updateData.frontageMeters = numOrNull(body.frontageMeters);
  if (body.streetWidth !== undefined) updateData.streetWidth = numOrNull(body.streetWidth);
  if (body.isCorner !== undefined) updateData.isCorner = Boolean(body.isCorner);
  if (body.streetWidth2 !== undefined) updateData.streetWidth2 = body.isCorner ? numOrNull(body.streetWidth2) : null;
  if (body.nearestLandmark !== undefined) updateData.nearestLandmark = strOrNull(body.nearestLandmark);
  if (body.dimensions !== undefined) updateData.dimensions = strOrNull(body.dimensions);
  if (body.floors !== undefined) updateData.floors = intOrNull(body.floors);
  if (body.bedrooms !== undefined) updateData.bedrooms = intOrNull(body.bedrooms);
  if (body.bathrooms !== undefined) updateData.bathrooms = intOrNull(body.bathrooms);
  if (body.facing !== undefined) {
    updateData.facing = body.facing && ['NORTH', 'SOUTH', 'EAST', 'WEST'].includes(String(body.facing)) ? (body.facing as any) : null;
  }
  if (body.latitude !== undefined) updateData.latitude = typeof body.latitude === 'number' ? body.latitude : Number(body.latitude) || 35.556;
  if (body.longitude !== undefined) updateData.longitude = typeof body.longitude === 'number' ? body.longitude : Number(body.longitude) || 45.432;
  if (body.status !== undefined && ['PENDING', 'APPROVED', 'REJECTED', 'SOLD', 'RENTED'].includes(String(body.status))) {
    updateData.status = body.status as any;
  }

  if (Array.isArray(body.images)) {
    Object.assign(updateData, syncPropertyMedia(body.images as string[]));
  }

  if (body.videoLink !== undefined) {
    if (typeof body.videoLink === 'string' && body.videoLink.trim()) {
      updateData.videoLink = await resolveVideoUrl(body.videoLink);
    } else {
      updateData.videoLink = null;
    }
  }

  const property = await prisma.property.update({
    where: { id: existing.id },
    data: updateData,
  });
  invalidateListingCache();
  res.json(property);
}));

app.delete('/api/properties/:id', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  const target = param(req.params.id);
  const existing = await prisma.property.findFirst({
    where: { OR: [{ id: target }, { code: target }] },
    select: { id: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  await prisma.analytics.deleteMany({ where: { propertyId: existing.id } });
  await prisma.contract.deleteMany({ where: { propertyId: existing.id } });
  await prisma.property.delete({ where: { id: existing.id } });
  invalidateListingCache();
  res.json({ success: true });
}));

app.post('/api/properties/:id/analytics', wrap(async (req, res) => {
  const { event } = req.body as { event: 'phone' | 'whatsapp' };
  const field = event === 'phone' ? 'phoneClicks' : 'whatsappClicks';
  await prisma.analytics.update({
    where: { propertyId: param(req.params.id) },
    data: { [field]: { increment: 1 } },
  });
  res.json({ ok: true });
}));

// ——— CRM ———
app.get('/api/crm', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (_req, res) => {
  const entries = await prisma.crmEntry.findMany({ orderBy: { updatedAt: 'desc' } });
  res.json(entries);
}));

app.post('/api/crm', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (req, res) => {
  const entry = await prisma.crmEntry.create({ data: req.body });
  res.json(entry);
}));

app.patch('/api/crm/:id', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (req, res) => {
  const entry = await prisma.crmEntry.update({ where: { id: param(req.params.id) }, data: req.body });
  res.json(entry);
}));

// ——— Contracts ———
app.get('/api/contracts', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (_req, res) => {
  const contracts = await prisma.contract.findMany({
    include: { property: true },
    orderBy: { date: 'desc' },
  });
  res.json(contracts);
}));

app.post('/api/contracts', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (req, res) => {
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
}));

// ——— Analytics dashboard ———
app.get('/api/analytics/dashboard', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (_req, res) => {
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
}));

// ——— Profile ———
app.get('/api/me', requireAuth, wrap(async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { id: req.userId } });
  res.json(profile);
}));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/ensure-test-users', wrap(async (_req, res) => {
    try {
      const results = await ensureTestUsers(prisma);
      res.json({ ok: true, results });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Setup failed';
      res.status(500).json({ error: message });
    }
  }));
}

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  app.use(express.static(dist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

// Global error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[Houseland API Error]:', message);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Server or database error. Please try again.' });
});

process.on('unhandledRejection', (reason) => {
  console.error('[Houseland Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Houseland Uncaught Exception]:', err);
});

app.listen(PORT, () => {
  console.log(`Houseland Real Estate API running on http://localhost:${PORT}`);
  // Background migration for legacy share links
  (async () => {
    try {
      const properties = await prisma.property.findMany({
        where: {
          OR: [
            { videoLink: { contains: 'facebook.com/share/' } },
            { videoLink: { contains: 'facebook.com/reel/' } },
            { videoLink: { contains: 'facebook.com/watch' } },
            { videoLink: { contains: 'fb.watch/' } },
          ],
        },
        select: { id: true, videoLink: true },
      });
      for (const prop of properties) {
        if (prop.videoLink) {
          const resolved = await resolveVideoUrl(prop.videoLink);
          if (resolved && resolved !== prop.videoLink) {
            await prisma.property.update({
              where: { id: prop.id },
              data: { videoLink: resolved },
            });
            console.log(`[VideoResolver] Auto-migrated property ${prop.id} to canonical reel/video URL: ${resolved}`);
          }
        }
      }
    } catch (e) {
      console.warn('[VideoResolver] Background migration error:', e);
    }
  })();
});
