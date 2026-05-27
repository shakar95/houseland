import { prisma } from '../prisma.js';

export async function generatePropertyCode(): Promise<string> {
  const count = await prisma.property.count();
  const num = String(count + 1).padStart(3, '0');
  return `SULI-${num}`;
}
