import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, ssl: 'require' });

/** Approximate city centers in Sulaymaniyah governorate */
const CITY_CENTERS = [
  { id: 'sulaymaniyah', lat: 35.557, lng: 45.435 },
  { id: 'chamchamal', lat: 35.533, lng: 44.835 },
  { id: 'kalar', lat: 34.625, lng: 45.320 },
  { id: 'ranya', lat: 36.255, lng: 44.883 },
  { id: 'dukan', lat: 35.955, lng: 44.955 },
  { id: 'penjwen', lat: 35.623, lng: 45.948 },
  { id: 'said_sadiq', lat: 35.350, lng: 45.867 },
  { id: 'halabja', lat: 35.178, lng: 45.986 },
];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function inferCity(lat, lng) {
  let best = { id: 'sulaymaniyah', dist: Infinity };
  for (const c of CITY_CENTERS) {
    const dist = haversineKm(lat, lng, c.lat, c.lng);
    if (dist < best.dist) best = { id: c.id, dist };
  }
  return best.id;
}

async function main() {
  const ashti = await sql`
    SELECT name, city, "nameKu", "nameEn", latitude, longitude
    FROM neighborhoods
    WHERE name ILIKE ${'%ashti%'}
       OR name ILIKE ${'%ئاشتی%'}
       OR COALESCE("nameKu", '') ILIKE ${'%ئاشتی%'}
       OR COALESCE("nameEn", '') ILIKE ${'%ashti%'}
    ORDER BY latitude
  `;
  console.log('=== Ashti before ===');
  console.log(JSON.stringify(ashti, null, 2));

  const all = await sql`SELECT id, latitude, longitude, city FROM neighborhoods`;
  const byCity = new Map();

  for (const row of all) {
    const next = inferCity(Number(row.latitude), Number(row.longitude));
    if (!byCity.has(next)) byCity.set(next, []);
    byCity.get(next).push(row.id);
  }

  let updated = 0;
  for (const [city, ids] of byCity) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const result = await sql`
        UPDATE neighborhoods
        SET city = ${city}
        WHERE id IN ${sql(chunk)} AND city IS DISTINCT FROM ${city}
      `;
      updated += result.count;
    }
  }

  console.log('=== City counts ===');
  for (const [city, ids] of [...byCity.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${city}: ${ids.length}`);
  }
  console.log(`Updated ${updated} rows`);

  const ashtiAfter = await sql`
    SELECT name, city, "nameKu", "nameEn", latitude, longitude
    FROM neighborhoods
    WHERE name ILIKE ${'%ashti%'}
       OR name ILIKE ${'%ئاشتی%'}
       OR COALESCE("nameKu", '') ILIKE ${'%ئاشتی%'}
       OR COALESCE("nameEn", '') ILIKE ${'%ashti%'}
    ORDER BY city, latitude
  `;
  console.log('=== Ashti after ===');
  console.log(JSON.stringify(ashtiAfter, null, 2));

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
