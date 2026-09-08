import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { neighborhoods } from '../server/db/schema.js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error('DATABASE_URL is missing');

const client = postgres(dbUrl);
const db = drizzle(client);

// Basic transliteration maps
const kurdishToArabic: Record<string, string> = {
  'پ': 'ب', 'چ': 'ج', 'ژ': 'ز', 'ڤ': 'ف', 'گ': 'ك',
  'ۆ': 'و', 'ێ': 'ي', 'ە': '', 'ڕ': 'ر', 'ڵ': 'ل', 'ی': 'ي', 'ک': 'ك'
};

const kurdishToEnglish: Record<string, string> = {
  'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ج': 'j', 'چ': 'ch',
  'ح': 'h', 'خ': 'kh', 'د': 'd', 'ر': 'r', 'ڕ': 'r', 'ز': 'z',
  'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ع': 'a', 'غ': 'gh', 'ف': 'f',
  'ڤ': 'v', 'ق': 'q', 'ک': 'k', 'ك': 'k', 'گ': 'g', 'ل': 'l',
  'ڵ': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'ە': 'a', 'و': 'w',
  'ۆ': 'o', 'ی': 'y', 'ێ': 'e', 'ي': 'y', 'ط': 't', 'ظ': 'z',
  'ص': 's', 'ض': 'd', 'ث': 'th', 'ذ': 'dh', 'ة': 'a', 'ء': '',
  'أ': 'a', 'إ': 'e', 'ؤ': 'o', 'ئ': 'e', 'ى': 'a'
};

const arabicToKurdish: Record<string, string> = {
  'ة': 'ە', 'ي': 'ی', 'ك': 'ک', 'أ': 'ئە', 'إ': 'ئێ', 'ؤ': 'ئۆ', 'ى': 'ا', 'ء': ''
};

function transliterateToEnglish(str: string): string {
  let res = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    res += kurdishToEnglish[char] || char;
  }
  return res.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function transliterateToArabic(str: string): string {
  let res = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    res += kurdishToArabic[char] !== undefined ? kurdishToArabic[char] : char;
  }
  return res;
}

function convertArabicToKurdish(str: string): string {
  let res = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    res += arabicToKurdish[char] !== undefined ? arabicToKurdish[char] : char;
  }
  return res;
}

// Simple English to Kurdish map
const enToKuMap = [
  ['sh', 'ش'], ['ch', 'چ'], ['zh', 'ژ'], ['kh', 'خ'], ['gh', 'غ'],
  ['a', 'ا'], ['b', 'ب'], ['c', 'ک'], ['d', 'د'], ['e', 'ە'],
  ['f', 'ف'], ['g', 'گ'], ['h', 'ه'], ['i', 'ی'], ['j', 'ج'],
  ['k', 'ک'], ['l', 'ل'], ['m', 'م'], ['n', 'ن'], ['o', 'ۆ'],
  ['p', 'پ'], ['q', 'ق'], ['r', 'ر'], ['s', 'س'], ['t', 'ت'],
  ['u', 'و'], ['v', 'ڤ'], ['w', 'و'], ['x', 'خ'], ['y', 'ی'], ['z', 'ز']
];

function transliterateToKurdish(str: string): string {
  let lower = str.toLowerCase();
  for (const [en, ku] of enToKuMap) {
    lower = lower.split(en).join(ku);
  }
  return lower;
}

function isKurdishOrArabic(str: string) {
  return /[\u0600-\u06FF]/.test(str);
}

function isDefinitelyKurdish(str: string) {
  return /[پچژڤگۆێەڕڵ]/.test(str);
}

function isDefinitelyArabic(str: string) {
  return /[ةؤءأإى]/.test(str);
}

async function run() {
  console.log('Fetching all neighborhoods...');
  const allNeighborhoods = await db.select().from(neighborhoods);
  console.log(`Found ${allNeighborhoods.length} neighborhoods.`);

  let updatedCount = 0;

  for (const n of allNeighborhoods) {
    let nameEn = n.nameEn || '';
    let nameKu = n.nameKu || '';
    let nameAr = n.nameAr || '';

    if (isKurdishOrArabic(n.name)) {
      if (isDefinitelyArabic(n.name)) {
        nameAr = n.name;
        nameKu = convertArabicToKurdish(n.name);
        nameEn = transliterateToEnglish(n.name);
      } else {
        nameKu = n.name;
        nameAr = transliterateToArabic(n.name);
        nameEn = transliterateToEnglish(n.name);
      }
    } else {
      nameEn = n.name;
      nameKu = transliterateToKurdish(n.name);
      nameAr = transliterateToArabic(nameKu);
    }

    await db.update(neighborhoods)
      .set({ nameEn, nameKu, nameAr })
      .where(eq(neighborhoods.id, n.id));
    
    updatedCount++;
    if (updatedCount % 100 === 0) {
      console.log(`Updated ${updatedCount}/${allNeighborhoods.length}`);
    }
  }

  console.log(`Finished updating ${updatedCount} neighborhoods.`);
  process.exit(0);
}

run().catch(console.error);
