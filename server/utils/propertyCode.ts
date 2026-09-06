import { count } from 'drizzle-orm';
import { db, properties } from '../db/index.js';

export async function generatePropertyCode(): Promise<string> {
  const [res] = await db.select({ total: count() }).from(properties);
  const total = Number(res?.total ?? 0);
  const num = String(total + 1).padStart(3, '0');
  return `SULI-${num}`;
}
