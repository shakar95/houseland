import type { Prisma, PropertyStatus as PrismaPropertyStatus } from '@prisma/client';
import { PropertyStatus as Status } from '@prisma/client';
import {
  and,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  type SQL,
} from 'drizzle-orm';
import {
  properties,
  type FacingDirection,
  type PropertyStatus,
  type PropertyType,
  type TransactionType,
} from '../db/schema.js';

export const PUBLIC_STATUSES: PropertyStatus[] = ['APPROVED'];
export const PRISMA_PUBLIC_STATUSES: PrismaPropertyStatus[] = [Status.APPROVED];

/** Drizzle column selection for listing cards / grid */
export const PUBLIC_LIST_COLUMNS = {
  id: properties.id,
  code: properties.code,
  title: properties.title,
  propertyType: properties.propertyType,
  transactionType: properties.transactionType,
  areaSqm: properties.areaSqm,
  price: properties.price,
  currency: properties.currency,
  bedrooms: properties.bedrooms,
  bathrooms: properties.bathrooms,
  floors: properties.floors,
  facing: properties.facing,
  neighborhood: properties.neighborhood,
  status: properties.status,
  thumbnailUrl: properties.thumbnailUrl,
  imageCount: properties.imageCount,
  videoLink: properties.videoLink,
  frontageMeters: properties.frontageMeters,
  streetWidth: properties.streetWidth,
  streetWidth2: properties.streetWidth2,
  isCorner: properties.isCorner,
  nearestLandmark: properties.nearestLandmark,
};

/** Drizzle column selection for dashboard / CRM */
export const ADMIN_LIST_COLUMNS = {
  id: properties.id,
  code: properties.code,
  title: properties.title,
  status: properties.status,
  price: properties.price,
  currency: properties.currency,
  propertyType: properties.propertyType,
  transactionType: properties.transactionType,
  neighborhood: properties.neighborhood,
  thumbnailUrl: properties.thumbnailUrl,
};

/** Fields needed for listing cards / grid — thumbnail only, no full images array (Prisma). */
export const PUBLIC_LIST_SELECT = {
  id: true,
  code: true,
  title: true,
  propertyType: true,
  transactionType: true,
  areaSqm: true,
  price: true,
  currency: true,
  bedrooms: true,
  bathrooms: true,
  floors: true,
  facing: true,
  neighborhood: true,
  status: true,
  thumbnailUrl: true,
  imageCount: true,
  videoLink: true,
  frontageMeters: true,
  streetWidth: true,
  streetWidth2: true,
  isCorner: true,
  nearestLandmark: true,
} satisfies Prisma.PropertySelect;

/** Dashboard / CRM — no descriptions or image arrays (Prisma). */
export const ADMIN_LIST_SELECT = {
  id: true,
  code: true,
  title: true,
  status: true,
  price: true,
  currency: true,
  propertyType: true,
  transactionType: true,
  neighborhood: true,
  thumbnailUrl: true,
} satisfies Prisma.PropertySelect;

export function parseMulti(value: unknown) {
  if (!value || value === 'all') return [] as string[];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Drizzle SQL WHERE conditions builder */
export function buildDrizzlePropertyConditions(
  query: Record<string, unknown>,
  isAdmin: boolean
): SQL[] {
  const {
    code,
    minArea,
    maxArea,
    minPrice,
    maxPrice,
    neighborhood,
    floor,
    floors: floorsParam,
    facing,
    streetWidth,
    minStreetWidth,
    maxStreetWidth,
    propertyType,
    transactionType,
    status,
  } = query;

  const neighborhoods = parseMulti(neighborhood);
  const propertyTypes = parseMulti(propertyType) as PropertyType[];
  const transactionTypes = parseMulti(transactionType) as TransactionType[];
  const facings = parseMulti(facing) as FacingDirection[];

  const conditions: (SQL | undefined)[] = [];

  if (!isAdmin) {
    conditions.push(inArray(properties.status, PUBLIC_STATUSES));
  } else if (status && status !== 'all') {
    conditions.push(eq(properties.status, status as PropertyStatus));
  }

  if (code) {
    conditions.push(ilike(properties.code, `%${String(code)}%`));
  }
  if (neighborhoods.length > 0) {
    conditions.push(inArray(properties.neighborhood, neighborhoods));
  }
  if (propertyTypes.length > 0) {
    conditions.push(inArray(properties.propertyType, propertyTypes));
  }
  if (transactionTypes.length > 0) {
    conditions.push(inArray(properties.transactionType, transactionTypes));
  }
  if (facings.length > 0) {
    conditions.push(inArray(properties.facing, facings));
  }

  // Floors filter — supports exact chips (e.g. 1, 2) or plus threshold (e.g. 5+ or 6+)
  const floorItems = parseMulti(floor || floorsParam);
  if (floorItems.length > 0) {
    const hasPlus = floorItems.some((s) => s.includes('+'));
    const plusThreshold = hasPlus
      ? Math.min(
          ...floorItems
            .filter((s) => s.includes('+'))
            .map((s) => Number(s.replace('+', '')))
            .filter((n) => !isNaN(n))
        )
      : null;
    const exactFloors = floorItems
      .filter((s) => !s.includes('+'))
      .map(Number)
      .filter((n) => !isNaN(n));

    const floorConds: SQL[] = [];
    if (exactFloors.length > 0) {
      floorConds.push(inArray(properties.floors, exactFloors));
    }
    if (plusThreshold != null && !isNaN(plusThreshold)) {
      floorConds.push(gte(properties.floors, plusThreshold));
    }
    if (floorConds.length === 1) {
      conditions.push(floorConds[0]);
    } else if (floorConds.length > 1) {
      const combined = or(...floorConds);
      if (combined) conditions.push(combined);
    }
  }

  // Street width filters (checks streetWidth and corner streetWidth2)
  if (minStreetWidth) {
    const minW = Number(minStreetWidth);
    if (!isNaN(minW)) {
      const cond = or(
        gte(properties.streetWidth, minW),
        and(eq(properties.isCorner, true), gte(properties.streetWidth2, minW))
      );
      if (cond) conditions.push(cond);
    }
  }
  if (maxStreetWidth) {
    const maxW = Number(maxStreetWidth);
    if (!isNaN(maxW)) {
      conditions.push(lte(properties.streetWidth, maxW));
    }
  }

  const streetWidthItems = parseMulti(streetWidth);
  if (streetWidthItems.length > 0) {
    const hasPlusWidth = streetWidthItems.some((s) => s.includes('+'));
    const plusThreshold = hasPlusWidth
      ? Math.min(
          ...streetWidthItems
            .filter((s) => s.includes('+'))
            .map((s) => Number(s.replace('+', '')))
            .filter((n) => !isNaN(n))
        )
      : null;
    const exactWidths = streetWidthItems
      .filter((s) => !s.includes('+'))
      .map(Number)
      .filter((n) => !isNaN(n));

    const widthConds: SQL[] = [];
    if (exactWidths.length > 0) {
      const c = or(
        inArray(properties.streetWidth, exactWidths),
        and(eq(properties.isCorner, true), inArray(properties.streetWidth2, exactWidths))
      );
      if (c) widthConds.push(c);
    }
    if (plusThreshold != null && !isNaN(plusThreshold)) {
      const c = or(
        gte(properties.streetWidth, plusThreshold),
        and(eq(properties.isCorner, true), gte(properties.streetWidth2, plusThreshold))
      );
      if (c) widthConds.push(c);
    }
    if (widthConds.length === 1) {
      conditions.push(widthConds[0]);
    } else if (widthConds.length > 1) {
      const combined = or(...widthConds);
      if (combined) conditions.push(combined);
    }
  }

  if (minArea) {
    conditions.push(gte(properties.areaSqm, Number(minArea)));
  }
  if (maxArea) {
    conditions.push(lte(properties.areaSqm, Number(maxArea)));
  }
  if (minPrice) {
    conditions.push(gte(properties.price, Number(minPrice)));
  }
  if (maxPrice) {
    conditions.push(lte(properties.price, Number(maxPrice)));
  }

  return conditions.filter((c): c is SQL => c !== undefined);
}

export function buildDrizzlePropertyWhere(
  query: Record<string, unknown>,
  isAdmin: boolean
): SQL | undefined {
  const conditions = buildDrizzlePropertyConditions(query, isAdmin);
  return conditions.length ? and(...conditions) : undefined;
}

/** Legacy Prisma WHERE input builder */
export function buildPropertyWhere(
  query: Record<string, unknown>,
  isAdmin: boolean
): Prisma.PropertyWhereInput {
  const {
    code,
    minArea,
    maxArea,
    minPrice,
    maxPrice,
    neighborhood,
    floor,
    floors: floorsParam,
    facing,
    streetWidth,
    minStreetWidth,
    maxStreetWidth,
    propertyType,
    transactionType,
    status,
  } = query;

  const neighborhoods = parseMulti(neighborhood);
  const propertyTypes = parseMulti(propertyType);
  const transactionTypes = parseMulti(transactionType);
  const facings = parseMulti(facing);

  const where: Prisma.PropertyWhereInput = {};

  if (!isAdmin) {
    where.status = { in: PRISMA_PUBLIC_STATUSES };
  } else if (status && status !== 'all') {
    where.status = status as PrismaPropertyStatus;
  }

  if (code) {
    where.code = { contains: String(code), mode: 'insensitive' };
  }
  if (neighborhoods.length > 0) {
    where.neighborhood = { in: neighborhoods };
  }
  if (propertyTypes.length > 0) {
    where.propertyType = { in: propertyTypes as Prisma.EnumPropertyTypeFilter['in'] };
  }
  if (transactionTypes.length > 0) {
    where.transactionType = { in: transactionTypes as Prisma.EnumTransactionTypeFilter['in'] };
  }
  if (facings.length > 0) {
    where.facing = { in: facings as any };
  }

  const floorItems = parseMulti(floor || floorsParam);
  if (floorItems.length > 0) {
    const exactFloors = floorItems
      .filter((s) => !s.includes('+'))
      .map(Number)
      .filter((n) => !isNaN(n));
    if (exactFloors.length > 0) {
      where.floors = { in: exactFloors };
    }
  }

  if (minStreetWidth || maxStreetWidth) {
    where.streetWidth = {};
    if (minStreetWidth) where.streetWidth.gte = Number(minStreetWidth);
    if (maxStreetWidth) where.streetWidth.lte = Number(maxStreetWidth);
  } else if (streetWidth) {
    const streetWidthItems = parseMulti(streetWidth).map(Number).filter((n) => !isNaN(n));
    if (streetWidthItems.length > 0) {
      where.streetWidth = { in: streetWidthItems };
    }
  }

  if (minArea || maxArea) {
    where.areaSqm = {};
    if (minArea) where.areaSqm.gte = Number(minArea);
    if (maxArea) where.areaSqm.lte = Number(maxArea);
  }
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = Number(minPrice);
    if (maxPrice) where.price.lte = Number(maxPrice);
  }

  return where;
}

export function trimImagesForList<T extends { images?: string[] | null }>(p: T) {
  const urls = (p.images || []).filter(Boolean);
  return {
    ...p,
    images: urls.length ? [urls[0]] : [],
    imageCount: urls.length,
  };
}

export function maskPropertyForPublic<T extends Record<string, unknown>>(p: T) {
  const { latitude, longitude, submitterId, owner, ownerContact, ownerName, ownerPhone, ...rest } = p;
  return {
    ...rest,
    latitude: undefined,
    longitude: undefined,
    submitterId: undefined,
    owner: undefined,
    ownerContact: undefined,
    ownerName: undefined,
    ownerPhone: undefined,
  };
}
