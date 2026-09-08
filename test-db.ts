import { db } from './server/db/index.js';
import { neighborhoods } from './server/db/schema.js';

async function main() {
  try {
    const list = await db.select().from(neighborhoods).orderBy(neighborhoods.name);
    console.log('Success!', list.length);
  } catch (e) {
    console.error('DB ERROR:', e);
  }
  process.exit(0);
}
main();
