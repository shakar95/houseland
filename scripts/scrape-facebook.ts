import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = path.resolve(process.cwd(), '.chrome-session');
const API_URL = 'https://houseland-2kbm.onrender.com';
const PAGE_URL = 'https://www.facebook.com/HouselandRealEstat';

function parseKurdishDigits(str: string): string {
  const map: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };
  return str.replace(/[٠-٩۰-۹]/g, (d) => map[d] || d);
}

export function parsePostText(text: string) {
  const normalized = parseKurdishDigits(text);

  // 1. Code
  const codeMatch =
    text.match(/#کۆدی_ژمارە_([٠-٩0-9]+)_?/i) ||
    text.match(/کۆد[یە]?_?ژمارە_?[:\-_\s]*([٠-٩0-9]+)/i) ||
    text.match(/#?کۆد[یە]?[:\-_\s]*([٠-٩0-9]+)/i);
  const code = codeMatch ? parseKurdishDigits(codeMatch[1]).trim() : null;

  // 2. Transaction Type
  const isForSale = /بۆ\s*فرۆشتن|للبيع|فرۆشتن/i.test(text);
  const transactionType = isForSale ? 'FOR_SALE' : 'FOR_RENT';

  // 3. Property Type
  let propertyType = 'HOUSE';
  if (/خانووی\s*بازرگانی|بینای\s*بازرگانی|مولکی\s*بازرگانی/i.test(text)) propertyType = 'COMMERCIAL';
  else if (/شوقە/i.test(text)) propertyType = 'APARTMENT';
  else if (/دوکان/i.test(text)) propertyType = 'SHOP';
  else if (/زەوی/i.test(text)) propertyType = 'LAND';
  else if (/باخ|ڤێلا/i.test(text)) propertyType = 'VILLA';
  else if (/کۆگا/i.test(text)) propertyType = 'WAREHOUSE';
  else if (/باڵەخانە/i.test(text)) propertyType = 'BUILDING';
  else if (/خانوو/i.test(text)) propertyType = 'HOUSE';

  // 4. Neighborhood
  const nMatch =
    text.match(/📍\s*#([^\s\n\r_\-]+)/i) ||
    text.match(/#([^\s\n\r_\-]+)\s*(?:📍|\n)/i);
  let neighborhood = nMatch ? nMatch[1].replace(/_/g, ' ').trim() : 'سلێمانی';

  // 5. Landmark / Address
  const landmarkMatch = normalized.match(/📍\s*ناونیشان\s*[:\-]+\s*([^\n\r]+)/i);
  const nearestLandmark = landmarkMatch ? landmarkMatch[1].trim() : null;

  // 6. Area
  const areaMatch = normalized.match(/(?:🅰️\s*)?ڕووبەر\s*[:\-]+\s*([0-9]+(?:\.[0-9]+)?)/i);
  const areaSqm = areaMatch ? Math.round(Number(areaMatch[1])) : 100;

  // 7. Frontage
  const frontMatch = normalized.match(/(?:🗺\s*)?پێشی\s*[:\-]+\s*([0-9]+(?:\.[0-9]+)?)/i);
  const frontageMeters = frontMatch ? Math.round(Number(frontMatch[1])) : null;

  // 8. Facing
  let facing: string | null = null;
  const facingMatch = text.match(/(?:🌗\s*)?ڕووی\s*[:\-]+\s*([^\n\r]+)/i);
  if (facingMatch) {
    const fStr = facingMatch[1];
    if (/ڕۆژهەڵات|شرق/i.test(fStr)) facing = 'EAST';
    else if (/ڕۆژئاوا|غرب/i.test(fStr)) facing = 'WEST';
    else if (/باکوور|شمال/i.test(fStr)) facing = 'NORTH';
    else if (/باشوور|جنوب|قیبلە/i.test(fStr)) facing = 'SOUTH';
  }

  // 9. Street width
  const streetMatch = normalized.match(/(?:🚧\s*)?شەقام\s*[:\-]+\s*([0-9]+)/i);
  const streetWidth = streetMatch ? Number(streetMatch[1]) : null;

  // 10. Price (Default 2 if not found)
  let price = 2;
  const priceMatch = normalized.match(/نرخ\s*[:\-]+\s*([0-9]+(?:\.[0-9]+)?)\s*(دەفتەر|دۆلار|\$)?/i);
  if (priceMatch) {
    const val = Number(priceMatch[1]);
    if (priceMatch[2]?.includes('دەفتەر')) {
      price = val * 10000;
    } else {
      price = val;
    }
  }

  return {
    code,
    title: `${propertyType} — ${neighborhood}`,
    propertyType,
    transactionType,
    neighborhood,
    nearestLandmark,
    areaSqm,
    frontageMeters,
    facing,
    streetWidth,
    price,
    currency: 'USD' as const,
    description: text.trim(),
  };
}

// Check if property code already exists in Houseland
async function isCodeAlreadyExists(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/properties?search=${encodeURIComponent(code)}`);
    if (!res.ok) return false;
    const json = await res.json();
    return Array.isArray(json.data) && json.data.some((p: any) => p.code === code);
  } catch {
    return false;
  }
}

// Get admin JWT token via Supabase Auth
async function getAdminToken(): Promise<string> {
  const supabaseUrl = 'https://dauxpyyuppqcxxhvfyrk.supabase.co';
  const supabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhdXhweXl1cHBxY3h4aHZmeXJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDM4NzAsImV4cCI6MjA5NTM3OTg3MH0.B2IDoSokrnBb7Zfmoc4IxwgQi4poP5esa7sE0Nc2E-4';

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      email: 'admin@houseland.iq',
      password: 'HouselandAdmin2026!',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to login as admin: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

// Upload images to Supabase Storage
async function uploadImagesToSupabase(imageUrls: string[], token: string): Promise<string[]> {
  const supabaseUrl = 'https://dauxpyyuppqcxxhvfyrk.supabase.co';
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
    const userId = payload.sub;

    const uploadedUrls: string[] = [];
    for (const imgUrl of imageUrls) {
      try {
        const res = await fetch(imgUrl);
        if (!res.ok) continue;
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        if (buffer.length < 5000) continue; // Skip tiny icons

        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`;
        const storagePath = `${userId}/${filename}`;

        const uploadRes = await fetch(
          `${supabaseUrl}/storage/v1/object/property-images/${storagePath}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'image/jpeg',
            },
            body: buffer,
          }
        );

        if (uploadRes.ok) {
          uploadedUrls.push(
            `${supabaseUrl}/storage/v1/object/public/property-images/${storagePath}`
          );
        }
      } catch {
        /* skip failed image */
      }
    }
    return uploadedUrls;
  } catch {
    return [];
  }
}

// Post property to Houseland API
async function postProperty(propertyData: any, token: string) {
  const res = await fetch(`${API_URL}/api/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(propertyData),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create property ${propertyData.code}: ${err}`);
  }

  return await res.json();
}

async function getBrowser() {
  const portFile = path.join(USER_DATA_DIR, 'DevToolsActivePort');
  if (fs.existsSync(portFile)) {
    try {
      const lines = fs.readFileSync(portFile, 'utf8').trim().split('\n');
      const ws = `ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`;
      console.log('🔄 پەیوەندی بە پەنجەرەی کراوەی Chrome دەکرێت...');
      const browser = await puppeteer.connect({ browserWSEndpoint: ws });
      return browser;
    } catch {
      try {
        fs.unlinkSync(portFile);
      } catch {}
    }
  }

  console.log('🌐 پەنجەرەی نوێی Google Chrome دەکرێتەوە...');
  return await puppeteer.launch({
    executablePath: CHROME_PATH,
    userDataDir: USER_DATA_DIR,
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });
}

async function main() {
  console.log('====================================================');
  console.log('🚀 Houseland Facebook Scraper & Importer دەستیپێکرد');
  console.log('====================================================\n');

  console.log('🔑 لۆگینی ئەدمین دەپشکنرێت...');
  const adminToken = await getAdminToken();
  console.log('✅ لۆگینی ئەدمین سەرکەوتوو بوو!\n');

  const browser = await getBrowser();
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes('facebook')) || pages[0] || (await browser.newPage());

  if (!page.url().includes('HouselandRealEstat')) {
    console.log(`📄 دەچێتە سەر پەیجی فەیسبووک: ${PAGE_URL}`);
    await page.goto(PAGE_URL, { waitUntil: 'load', timeout: 60000 });
  }

  console.log('\n----------------------------------------------------');
  console.log('📢 چاودێری پەیجەکە دەکرێت...');
  console.log('تکایە لە پەنجەرەی کرۆم دڵنیابە لە چوونەژوورەوەی فەیسبووک.');
  console.log('سکریپتەکە دەوەستێت تا لۆگین دەبیت و پۆستەکان بەردەست دەبن...');
  console.log('----------------------------------------------------\n');

  // Wait until user is logged in (no login modal or feed is loaded)
  let ready = false;
  for (let i = 0; i < 150; i++) {
    const status = await page.evaluate(() => {
      const text = document.body?.innerText || '';
      const hasLoginForm = text.includes('Email or phone number') && text.includes('Password') && text.includes('Log In');
      const hasPosts = text.includes('کۆدی') || text.includes('ڕووبەر') || document.querySelectorAll('div[role="article"]').length > 1;
      return { hasLoginForm, hasPosts };
    });

    if (status.hasPosts && !status.hasLoginForm) {
      ready = true;
      break;
    }

    if (i % 8 === 0 && i > 0) {
      console.log('⏳ هێشتا چاوەڕێین... تکایە لە پەنجەرەی کرۆم لۆگین ببە.');
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('✅ دەستکرا بە پشکنینی پۆستەکانی هاوسلاند...\n');

  let addedCount = 0;
  const targetCount = 100;
  const seenCodes = new Set<string>();

  // Function to click all "See more" / "زیاتر ببینە" buttons so full text is available
  const expandSeeMore = async () => {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"], span[role="button"]'));
      buttons.forEach((b) => {
        const text = (b.textContent || '').trim();
        if (text.includes('See more') || text.includes('زیاتر ببینە') || text.includes('عرض المزيد')) {
          (b as HTMLElement).click();
        }
      });
    });
  };

  // Helper to extract visible posts on the page
  const extractPosts = async () => {
    await expandSeeMore();
    return await page.evaluate(() => {
      const results: { text: string; videoLink?: string; images: string[] }[] = [];

      const elements = Array.from(document.querySelectorAll('div[role="article"], div[data-pagelet*="FeedUnit"], div[data-ad-preview="message"]'));

      elements.forEach((el) => {
        const text = el.textContent || '';
        if (!text.includes('کۆد') && !text.includes('هاوسلاند') && !text.includes('ڕووبەر')) {
          return;
        }

        let videoLink: string | undefined;
        const videoAnchor = el.querySelector('a[href*="/reel/"], a[href*="/watch/"], a[href*="/videos/"]');
        if (videoAnchor) {
          const href = (videoAnchor as HTMLAnchorElement).href;
          if (href && !href.includes('comment')) videoLink = href;
        }

        const imgs: string[] = [];
        const imgElements = el.querySelectorAll('img[src*="scontent"], img[src*="fbcdn"]');
        imgElements.forEach((img) => {
          const src = (img as HTMLImageElement).src;
          if (src && !src.includes('emoji') && !src.includes('rsrc.php') && !src.includes('p32x32') && !src.includes('p50x50')) {
            imgs.push(src);
          }
        });

        results.push({ text, videoLink, images: imgs });
      });

      return results;
    });
  };

  let noNewPostsCount = 0;

  while (addedCount < targetCount) {
    const rawPosts = await extractPosts();

    for (const raw of rawPosts) {
      if (addedCount >= targetCount) break;

      const parsed = parsePostText(raw.text);

      if (!parsed.code || parsed.transactionType !== 'FOR_SALE') {
        continue;
      }

      if (seenCodes.has(parsed.code)) {
        continue;
      }
      seenCodes.add(parsed.code);

      const exists = await isCodeAlreadyExists(parsed.code);
      if (exists) {
        console.log(`⏩ [کۆدی ${parsed.code}] پێشتر لە ئەپەکەدا هەیە، تێپەڕێنرا.`);
        continue;
      }

      try {
        let finalImages: string[] = [];
        if (raw.images.length > 0 && !raw.videoLink) {
          console.log(`📸 داونلۆد و ئەپلۆدکردنی وێنەکان بۆ موڵکی #${parsed.code}...`);
          finalImages = await uploadImagesToSupabase(raw.images.slice(0, 8), adminToken);
        }
        if (finalImages.length === 0 && raw.images.length > 0) {
          finalImages = raw.images.slice(0, 8);
        }

        const payload: any = {
          ...parsed,
          videoLink: raw.videoLink || null,
          images: finalImages,
          status: 'APPROVED',
        };

        await postProperty(payload, adminToken);
        addedCount++;
        console.log(
          `🎉 [${addedCount}/${targetCount}] موڵکی کۆد #${parsed.code} (${parsed.neighborhood}) بە سەرکەوتوویی زیاد کرا!`
        );
      } catch (err: any) {
        console.error(`⚠️ هەڵە لە پۆستکردنی کۆد ${parsed.code}:`, err.message);
      }
    }

    // Scroll down to load older posts
    const prevHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.evaluate(() => window.scrollBy(0, 1800));
    await new Promise((r) => setTimeout(r, 3000));
    const newHeight = await page.evaluate(() => document.body.scrollHeight);

    if (newHeight === prevHeight) {
      noNewPostsCount++;
      if (noNewPostsCount > 15) {
        console.log('📌 چیتر پۆستی نوێ بارنەبوو.');
        break;
      }
    } else {
      noNewPostsCount = 0;
    }
  }

  console.log('\n====================================================');
  console.log(`🏁 کۆتایی هات! سەرجەم ${addedCount} موڵک بە سەرکەوتوویی هاوردە کران.`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
