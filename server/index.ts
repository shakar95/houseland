import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';
import { db } from './db/index.js';
import { agencySettings, staff, profiles, properties, analytics, contracts, crmEntries, neighborhoods, propertyDetailsMv } from './db/schema.js';
import { eq, desc, and, or, sql, inArray, ilike, count } from 'drizzle-orm';
import { requireAuth, requireRole, type AuthRequest } from './middleware/auth.js';
import { generatePropertyCode } from './utils/propertyCode.js';
import { ensureTestUsers } from './ensureTestUsers.js';
import {
  ADMIN_LIST_COLUMNS,
  PUBLIC_LIST_COLUMNS,
  PUBLIC_STATUSES,
  buildDrizzlePropertyWhere,
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
  const [settings] = await db.select().from(agencySettings).where(eq(agencySettings.id, 'default'));
  res.json(settings || null);
}));

app.put('/api/agency', requireAuth, requireRole('ADMIN'), wrap(async (req: AuthRequest, res) => {
  const { id, ...updateData } = req.body;
  const [settings] = await db.insert(agencySettings)
    .values({ id: 'default', ...req.body })
    .onConflictDoUpdate({
      target: agencySettings.id,
      set: updateData,
    })
    .returning();
  res.json(settings);
}));

// ——— Staff ———
app.get('/api/staff', wrap(async (_req, res) => {
  const staffList = await db.select().from(staff).where(eq(staff.active, true));
  res.json(staffList);
}));

app.post('/api/staff', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  const [newStaff] = await db.insert(staff).values(req.body).returning();
  res.json(newStaff);
}));

app.put('/api/staff/:id', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  const [updatedStaff] = await db.update(staff)
    .set(req.body)
    .where(eq(staff.id, param(req.params.id)))
    .returning();
  res.json(updatedStaff);
}));

app.delete('/api/staff/:id', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  await db.update(staff)
    .set({ active: false })
    .where(eq(staff.id, param(req.params.id)));
  res.json({ ok: true });
}));

// ——— Neighborhoods ———
app.get('/api/neighborhoods', wrap(async (_req, res) => {
  // Cache neighborhoods for 5 minutes to reduce DB load but allow updates
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  const list = await db.select().from(neighborhoods);

  const counts = await db.select({
    neighborhood: properties.neighborhood,
    count: count()
  }).from(properties).groupBy(properties.neighborhood);

  const countMap = Object.fromEntries(counts.map(c => [c.neighborhood, c.count]));

  const sorted = list
    .map(n => ({ ...n, propertyCount: countMap[n.name] || 0 }))
    .sort((a, b) => b.propertyCount - a.propertyCount || a.name.localeCompare(b.name));

  res.json(sorted);
}));

// ——— Neighborhoods (Admin) ———
app.get('/api/admin/neighborhoods', requireAuth, requireRole('ADMIN'), wrap(async (_req, res) => {
  const list = await db.select().from(neighborhoods).orderBy(neighborhoods.name);
  
  const counts = await db.select({
    neighborhood: properties.neighborhood,
    count: count()
  }).from(properties).groupBy(properties.neighborhood);
  
  const countMap = Object.fromEntries(counts.map(c => [c.neighborhood, c.count]));
  
  res.json(list.map(n => ({
    ...n,
    propertyCount: countMap[n.name] || 0
  })));
}));

app.put('/api/admin/neighborhoods/:id', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  const { name, nameEn, nameKu, nameAr, latitude, longitude, aliases } = req.body;
  const id = param(req.params.id);
  
  const [existing] = await db.select().from(neighborhoods).where(eq(neighborhoods.id, id));
  if (!existing) return res.status(404).json({ error: 'Not found' });
  
  try {
    const [updated] = await db.update(neighborhoods)
      .set({ name, nameEn, nameKu, nameAr, latitude, longitude, aliases })
      .where(eq(neighborhoods.id, id))
      .returning();
      
    if (existing.name !== name) {
      await db.update(properties)
        .set({ neighborhood: name })
        .where(eq(properties.neighborhood, existing.name));
    }
    
    res.json(updated);
  } catch (error: any) {
    const code = error?.code || error?.cause?.code;
    const msg = error?.message || error?.cause?.message || '';
    if (code === '23505' || msg.includes('unique constraint')) {
      return res.status(400).json({ error: 'A neighborhood with this name already exists. Please use the merge feature instead of renaming.' });
    }
    throw error;
  }
}));

app.delete('/api/admin/neighborhoods/:id', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  const id = param(req.params.id);
  await db.delete(neighborhoods).where(eq(neighborhoods.id, id));
  res.json({ ok: true });
}));

app.post('/api/admin/neighborhoods/merge', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  const { primaryId, duplicateIds, newName, nameEn, nameKu, nameAr } = req.body;
  
  const [primary] = await db.select().from(neighborhoods).where(eq(neighborhoods.id, primaryId));
  if (!primary) return res.status(404).json({ error: 'Primary not found' });
  
  const duplicates = await db.select().from(neighborhoods).where(inArray(neighborhoods.id, duplicateIds));
  if (duplicates.length === 0) return res.status(400).json({ error: 'No duplicates found' });
  
  const duplicateNames = duplicates.map(d => d.name);
  // Collect all aliases: primary's existing + duplicate names + all duplicate aliases
  const newAliases = new Set([...primary.aliases, ...duplicateNames]);
  for (const d of duplicates) {
    d.aliases.forEach(a => newAliases.add(a));
  }
  // If renaming, also save the old primary name as an alias
  const finalName = (newName && newName.trim()) ? newName.trim() : primary.name;
  const isRenaming = finalName !== primary.name;
  if (isRenaming) {
    newAliases.add(primary.name);
  }
  // Don't include the final name itself as an alias
  newAliases.delete(finalName);
  
  await db.transaction(async (tx) => {
    // Move duplicate properties to the final name (covering both rename + old primary name)
    const allOldNames = [...duplicateNames];
    if (isRenaming) allOldNames.push(primary.name);

    if (allOldNames.length > 0) {
      await tx.update(properties)
        .set({ neighborhood: finalName })
        .where(inArray(properties.neighborhood, allOldNames));
    }
      
    const updateData: any = { name: finalName, aliases: Array.from(newAliases) };
    if (isRenaming) {
      if (nameEn !== undefined) updateData.nameEn = nameEn;
      if (nameKu !== undefined) updateData.nameKu = nameKu;
      if (nameAr !== undefined) updateData.nameAr = nameAr;
    }

    await tx.update(neighborhoods)
      .set(updateData)
      .where(eq(neighborhoods.id, primaryId));
      
    if (duplicateIds.length > 0) {
      await tx.delete(neighborhoods).where(inArray(neighborhoods.id, duplicateIds));
    }
  });
  
  res.json({ ok: true });
}));

// ——— Properties (public) ———
app.get('/api/properties', wrap(async (req, res) => {
  const isAdmin = req.query.status !== undefined;
  const whereCond = buildDrizzlePropertyWhere(req.query as Record<string, unknown>, isAdmin);
  
  const limitRaw = Number(req.query.limit);
  const take = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50;
  
  const pageRaw = Number(req.query.page);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const offset = (page - 1) * take;

  // Get total count for pagination
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(properties);
  if (whereCond) countQuery = countQuery.where(whereCond) as any;
  const [{ count: totalCount }] = await countQuery;
  const totalPages = Math.ceil(totalCount / take);

  if (isAdmin) {
    let query = db.select(ADMIN_LIST_COLUMNS).from(properties);
    if (whereCond) query = query.where(whereCond) as any;
    query = query.orderBy(desc(properties.createdAt)).limit(take).offset(offset) as any;
    
    const results = await query;
    res.json({ data: results, meta: { totalCount, totalPages, currentPage: page } });
    return;
  }

  const cacheKey = listingCacheKey({ ...req.query, page, limit: take } as Record<string, unknown>);
  const cached = getListingCache(cacheKey);
  if (cached) {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json(cached);
    return;
  }

  let query = db.select(PUBLIC_LIST_COLUMNS).from(properties);
  if (whereCond) query = query.where(whereCond) as any;
  query = query.orderBy(desc(properties.createdAt)).limit(take).offset(offset) as any;

  const results = await query;

  const payload = {
    data: results.map((p) => maskPropertyForPublic(toPublicListingCard(p))),
    meta: { totalCount, totalPages, currentPage: page }
  };
  
  setListingCache(cacheKey, payload);
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
  res.json(payload);
}));

app.get('/api/properties/:idOrCode', wrap(async (req, res) => {
  const key = param(req.params.idOrCode);
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key);
  const matchCond = isUuid 
    ? or(eq(propertyDetailsMv.id, key), eq(propertyDetailsMv.code, key))
    : eq(propertyDetailsMv.code, key);

  const [row] = await db.select().from(propertyDetailsMv).where(
    and(
      matchCond,
      req.query.admin !== 'true' ? inArray(propertyDetailsMv.status, PUBLIC_STATUSES) : undefined
    )
  ).catch(async () => {
    // Fallback if materialized view doesn't exist yet
    const fallbackMatch = isUuid 
      ? or(eq(properties.id, key), eq(properties.code, key))
      : eq(properties.code, key);
    const [p] = await db.select().from(properties).where(
      and(
        fallbackMatch,
        req.query.admin !== 'true' ? inArray(properties.status, PUBLIC_STATUSES) : undefined
      )
    );
    if (!p) return [];
    const [a] = await db.select().from(analytics).where(eq(analytics.propertyId, p.id));
    return [{
      ...p,
      viewsCount: a?.viewsCount ?? 0,
      phoneClicks: a?.phoneClicks ?? 0,
      whatsappClicks: a?.whatsappClicks ?? 0,
      saleContractsCount: a?.saleContractsCount ?? 0,
      rentContractsCount: a?.rentContractsCount ?? 0,
    }];
  });

  if (!row) return res.status(404).json({ error: 'Not found' });

  const { viewsCount, phoneClicks, whatsappClicks, saleContractsCount, rentContractsCount, ...baseProperty } = row;
  const fullProperty = { 
    ...baseProperty, 
    analytics: { 
      propertyId: baseProperty.id,
      viewsCount, 
      phoneClicks, 
      whatsappClicks, 
      saleContractsCount, 
      rentContractsCount 
    } 
  };

  if (req.query.admin !== 'true') {
    void db.insert(analytics)
      .values({ propertyId: baseProperty.id, viewsCount: 1 })
      .onConflictDoUpdate({
        target: analytics.propertyId,
        set: { viewsCount: sql`${analytics.viewsCount} + 1` }
      })
      .catch(() => {});
    return res.json(maskPropertyForPublic(fullProperty));
  }
  res.json(fullProperty);
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
    req.userRole === 'ADMIN' ? 'APPROVED' : 'PENDING';
  
  const [property] = await db.insert(properties).values({
    ...sanitized,
    videoLink: resolvedVideoLink,
    ...media,
    code,
    status,
    submitterId: req.userId,
  }).returning();
  
  await db.insert(analytics).values({ propertyId: property.id });
  invalidateListingCache();
  res.json(property);
}));

app.patch('/api/properties/:id', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (req, res) => {
  const target = param(req.params.id);
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(target);
  const matchCond = isUuid 
    ? or(eq(properties.id, target), eq(properties.code, target))
    : eq(properties.code, target);

  const [existing] = await db.select({ id: properties.id }).from(properties).where(matchCond);
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

  const [property] = await db.update(properties)
    .set(updateData)
    .where(eq(properties.id, existing.id))
    .returning();
  invalidateListingCache();
  res.json(property);
}));

app.delete('/api/properties/:id', requireAuth, requireRole('ADMIN'), wrap(async (req, res) => {
  const target = param(req.params.id);
  const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(target);
  const matchCond = isUuid 
    ? or(eq(properties.id, target), eq(properties.code, target))
    : eq(properties.code, target);

  const [existing] = await db.select({ id: properties.id }).from(properties).where(matchCond);
  if (!existing) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  await db.delete(analytics).where(eq(analytics.propertyId, existing.id));
  await db.delete(contracts).where(eq(contracts.propertyId, existing.id));
  await db.delete(properties).where(eq(properties.id, existing.id));
  invalidateListingCache();
  res.json({ success: true });
}));

app.post('/api/properties/:id/analytics', wrap(async (req, res) => {
  const { event } = req.body as { event: 'phone' | 'whatsapp' };
  const field = event === 'phone' ? analytics.phoneClicks : analytics.whatsappClicks;
  await db.update(analytics)
    .set({ [event === 'phone' ? 'phoneClicks' : 'whatsappClicks']: sql`${field} + 1` })
    .where(eq(analytics.propertyId, param(req.params.id)));
  res.json({ ok: true });
}));

// ——— CRM ———
app.get('/api/crm', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (_req, res) => {
  const entries = await db.select().from(crmEntries).orderBy(desc(crmEntries.updatedAt));
  res.json(entries);
}));

app.post('/api/crm', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (req, res) => {
  const [entry] = await db.insert(crmEntries).values(req.body).returning();
  res.json(entry);
}));

app.patch('/api/crm/:id', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (req, res) => {
  const [entry] = await db.update(crmEntries)
    .set(req.body)
    .where(eq(crmEntries.id, param(req.params.id)))
    .returning();
  res.json(entry);
}));

// ——— Contracts ———
app.get('/api/contracts', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (_req, res) => {
  const results = await db.query.contracts.findMany({
    with: { property: true },
    orderBy: (contracts, { desc }) => [desc(contracts.date)],
  });
  res.json(results);
}));

app.post('/api/contracts', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (req, res) => {
  const [contract] = await db.insert(contracts).values({
    ...req.body,
    date: req.body.date ? new Date(req.body.date) : new Date(),
  }).returning();
  
  const analyticsField = req.body.contractType === 'SALE' ? analytics.saleContractsCount : analytics.rentContractsCount;
  
  await db.update(analytics)
    .set({ [req.body.contractType === 'SALE' ? 'saleContractsCount' : 'rentContractsCount']: sql`${analyticsField} + 1` })
    .where(eq(analytics.propertyId, req.body.propertyId));

  const newStatus = req.body.contractType === 'SALE' ? 'SOLD' : 'RENTED';
  await db.update(properties)
    .set({ status: newStatus })
    .where(eq(properties.id, req.body.propertyId));

  res.json(contract);
}));

// ——— Analytics dashboard ———
app.get('/api/analytics/dashboard', requireAuth, requireRole('ADMIN', 'STAFF'), wrap(async (_req, res) => {
  const all = await db.query.analytics.findMany({
    with: {
      property: {
        columns: { code: true, title: true, status: true }
      }
    }
  });

  const [{ count: sold }] = await db.select({ count: count() }).from(properties).where(eq(properties.status, 'SOLD'));
  const [{ count: rented }] = await db.select({ count: count() }).from(properties).where(eq(properties.status, 'RENTED'));
  const [{ count: pending }] = await db.select({ count: count() }).from(properties).where(eq(properties.status, 'PENDING'));
  const [{ count: active }] = await db.select({ count: count() }).from(properties).where(eq(properties.status, 'APPROVED'));

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
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, req.userId as string));
  res.json(profile || null);
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

// --- Global Error Handler ---
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('[Houseland API Error]:', message, err);
  
  // Log to file so we can see it
  try {
    const fs = require('fs');
    fs.appendFileSync('server-error.log', `[${new Date().toISOString()}] ${message}\n${err instanceof Error ? err.stack : ''}\n\n`);
  } catch (e) {}

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
      const props = await db.select({ id: properties.id, videoLink: properties.videoLink }).from(properties).where(
        or(
          ilike(properties.videoLink, '%facebook.com/share/%'),
          ilike(properties.videoLink, '%facebook.com/reel/%'),
          ilike(properties.videoLink, '%facebook.com/watch%'),
          ilike(properties.videoLink, '%fb.watch/%')
        )
      );
      for (const prop of props) {
        if (prop.videoLink) {
          const resolved = await resolveVideoUrl(prop.videoLink);
          if (resolved && resolved !== prop.videoLink) {
            await db.update(properties)
              .set({ videoLink: resolved })
              .where(eq(properties.id, prop.id));
            console.log(`[VideoResolver] Auto-migrated property ${prop.id} to canonical reel/video URL: ${resolved}`);
          }
        }
      }
    } catch (e) {
      console.warn('[VideoResolver] Background migration error:', e);
    }
  })();
});
