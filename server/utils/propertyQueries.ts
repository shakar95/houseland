import type { Prisma, PropertyStatus } from '@prisma/client';
import { PropertyStatus as Status } from '@prisma/client';

export const PUBLIC_STATUSES: PropertyStatus[] = [Status.APPROVED];

/** Fields needed for listing cards / grid — skips heavy text & location. */
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
  neighborhood: true,
  images: true,
  status: true,
} satisfies Prisma.PropertySelect;

/** Dashboard / CRM — no descriptions or image arrays. */
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
} satisfies Prisma.PropertySelect;

export function parseMulti(value: unknown) {
  if (!value || value === 'all') return [] as string[];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildPropertyWhere(query: Record<string, unknown>, isAdmin: boolean): Prisma.PropertyWhereInput {
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
  } = query;

  const neighborhoods = parseMulti(neighborhood);
  const propertyTypes = parseMulti(propertyType);
  const transactionTypes = parseMulti(transactionType);

  const where: Prisma.PropertyWhereInput = {};

  if (!isAdmin) {
    where.status = { in: PUBLIC_STATUSES };
  } else if (status && status !== 'all') {
    where.status = status as PropertyStatus;
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
  if (floor) {
    where.floors = Number(floor);
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

export function trimImagesForList<T extends { images: string[] }>(p: T) {
  const urls = p.images.filter(Boolean);
  return {
    ...p,
    images: urls.length ? [urls[0]] : [],
    imageCount: urls.length,
  };
}

export function maskPropertyForPublic<T extends Record<string, unknown>>(p: T) {
  const { latitude, longitude, submitterId, ...rest } = p;
  return { ...rest, latitude: undefined, longitude: undefined, submitterId: undefined };
}
