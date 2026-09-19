import { desc, sql } from 'drizzle-orm';
import { db, properties } from '../db/index.js';

export async function generatePropertyCode(): Promise<string> {
  // Prefer max numeric suffix so deletes don't reuse / collide with count()+1
  const rows = await db
    .select({ code: properties.code })
    .from(properties)
    .orderBy(desc(properties.createdAt))
    .limit(500);

  let max = 0;
  for (const { code } of rows) {
    const m = String(code || '').match(/(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }

  if (max === 0) {
    const [res] = await db.select({ total: sql<number>`count(*)::int` }).from(properties);
    max = Number(res?.total ?? 0);
  }

  return `SULI-${String(max + 1).padStart(3, '0')}`;
}
