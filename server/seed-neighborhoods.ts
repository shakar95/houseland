import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db/index.js';
import { neighborhoods } from './db/schema.js';
import { sql } from 'drizzle-orm';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Creating table if not exists...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "neighborhoods" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL UNIQUE,
      "latitude" double precision NOT NULL,
      "longitude" double precision NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
  
  console.log('Reading slemani.geojson...');
  const geojsonPath = path.resolve(__dirname, '../slemani.geojson');
  const fileContent = fs.readFileSync(geojsonPath, 'utf-8');
  const data = JSON.parse(fileContent);

  const features = data.features || [];
  console.log(`Found ${features.length} features in GeoJSON.`);

  const uniqueNeighborhoods = new Map<string, { lat: number; lng: number }>();

  for (const feature of features) {
    let name = feature.properties?.name || feature.properties?.['name:ckb'];
    if (!name) continue;

    // Optional: Trim trailing spaces or specific characters if needed
    name = name.trim();

    if (uniqueNeighborhoods.has(name)) {
      continue; // Skip duplicates, keep the first one
    }

    let lat = 0;
    let lng = 0;

    if (feature.geometry?.type === 'Point') {
      lng = feature.geometry.coordinates[0];
      lat = feature.geometry.coordinates[1];
    } else if (feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon') {
      // Basic fallback: just grab the first coordinate of the first ring
      const coords = feature.geometry.type === 'Polygon' 
        ? feature.geometry.coordinates[0][0]
        : feature.geometry.coordinates[0][0][0];
      lng = coords[0];
      lat = coords[1];
    }

    if (lat !== 0 && lng !== 0) {
      uniqueNeighborhoods.set(name, { lat, lng });
    }
  }

  console.log(`Extracted ${uniqueNeighborhoods.size} unique neighborhoods.`);

  console.log('Clearing existing neighborhoods...');
  // await db.delete(neighborhoods); // Prisma will do it
  const prisma = new PrismaClient();
  await prisma.neighborhood.deleteMany({});

  console.log('Inserting neighborhoods...');
  const insertData = Array.from(uniqueNeighborhoods.entries()).map(([name, coords]) => ({
    name,
    latitude: coords.lat,
    longitude: coords.lng,
  }));

  if (insertData.length > 0) {
    await prisma.neighborhood.createMany({
      data: insertData,
      skipDuplicates: true,
    });
  }

  console.log('Done seeding neighborhoods.');
  process.exit(0);
}

main().catch(console.error);
