// ====================================================================
// 🏠 Houseland Master Facebook Scraper (2023 - 2026)
// کۆکردنەوەی تەواوی موڵکەکان بە وێنە، ڤیدیۆ، ناونیشان و وەسفی ڕەسەن
// ====================================================================

(async function runMasterScraper() {
  console.clear();
  console.log(
    '%c🚀 دەستکرا بە کۆکردنەوەی تەواوی موڵکەکانی هاوس لاند لە ٢٠٢٣ ەوە تا ئێستا...',
    'color: #38bdf8; font-size: 16px; font-weight: bold;'
  );

  const STORAGE_KEY = 'houseland_all_posts_db';
  const kurdishDigits = (str) =>
    (str || '').replace(/[٠-٩۰-۹]/g, (d) =>
      '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(d) > 9
        ? (('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(d) - 10) % 10).toString()
        : '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()
    );

  const codeRegex =
    /(?:#کۆدی_ژمارە_|کۆدی_ژمارە_|کۆد[ی]?\s*[:\-—#_]?\s*|#\s*)([0-9٠-٩۰-۹]{3,5})/i;

  function detectPropertyType(text) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const header = lines.slice(0, 8).join(' ');

    if (/خانوو|خانووی/i.test(header)) return 'HOUSE';
    if (/زەوی|پارچە\s*زەوی/i.test(header)) return 'LAND';
    if (/شوقە|شوقەی/i.test(header)) return 'APARTMENT';
    if (/دوکان|دوکانی/i.test(header)) return 'SHOP';
    if (/باخ|ڤێلا|ڤیلا/i.test(header)) return 'VILLA';
    if (/کێڵگە|مەزرەعە/i.test(header)) return 'FARM';
    if (/باڵەخانە|بینا|کۆگا/i.test(header)) return 'COMMERCIAL';
    if (/بازرگانی/i.test(header)) return 'COMMERCIAL';

    const beforeStreet = text.split(/شەقام|پەیوەندی|ژمارە|0770/)[0] || text;
    if (/خانوو/i.test(beforeStreet)) return 'HOUSE';
    if (/زەوی/i.test(beforeStreet)) return 'LAND';
    if (/شوقە/i.test(beforeStreet)) return 'APARTMENT';
    if (/دوکان/i.test(beforeStreet)) return 'SHOP';
    if (/باخ|ڤێلا/i.test(beforeStreet)) return 'VILLA';

    return 'HOUSE';
  }

  function detectTransactionType(text) {
    if (/بۆ\s*کرێ|کرێ/i.test(text) && !/بۆ\s*فرۆشتن/i.test(text)) {
      return 'FOR_RENT';
    }
    return 'FOR_SALE';
  }

  // Restore previously collected posts from localStorage so progress is never lost
  const savedData = localStorage.getItem(STORAGE_KEY);
  const collectedMap = new Map();
  if (savedData) {
    try {
      const arr = JSON.parse(savedData);
      arr.forEach((item) => collectedMap.set(item.code, item));
      console.log(`📦 پێشتر ${collectedMap.size} پۆست پاشەکەوت کراوە و دەستپێدەکاتەوە.`);
    } catch (e) {}
  }

  // Create sleek floating UI controller
  const existingUI = document.getElementById('houseland-scraper-ui');
  if (existingUI) existingUI.remove();

  const ui = document.createElement('div');
  ui.id = 'houseland-scraper-ui';
  ui.style.position = 'fixed';
  ui.style.bottom = '24px';
  ui.style.right = '24px';
  ui.style.zIndex = '999999';
  ui.style.background = 'rgba(15, 23, 42, 0.95)';
  ui.style.border = '1px solid rgba(234, 179, 8, 0.4)';
  ui.style.borderRadius = '16px';
  ui.style.padding = '18px 24px';
  ui.style.boxShadow = '0 20px 40px rgba(0,0,0,0.6)';
  ui.style.color = '#fff';
  ui.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  ui.style.direction = 'rtl';
  ui.style.minWidth = '280px';
  ui.style.backdropFilter = 'blur(12px)';

  ui.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
      <span style="font-weight: 700; color: #facc15; font-size: 15px;">🏠 هاوس لاند سکراپەر</span>
      <span id="hl-status" style="font-size: 11px; background: #22c55e20; color: #22c55e; padding: 2px 8px; border-radius: 12px; font-weight: 600;">چالاکە</span>
    </div>
    <div style="font-size: 26px; font-weight: 800; color: #ffffff; margin-bottom: 6px;">
      <span id="hl-count">${collectedMap.size}</span> <span style="font-size: 14px; font-weight: 500; color: #94a3b8;">موڵک</span>
    </div>
    <div id="hl-last-code" style="font-size: 12px; color: #cbd5e1; margin-bottom: 14px;">دواین کۆد: چاوەڕوانە...</div>
    <div style="display: flex; gap: 8px;">
      <button id="hl-pause-btn" style="flex: 1; background: #334155; border: none; border-radius: 8px; padding: 8px 12px; color: #fff; font-size: 12px; cursor: pointer; font-weight: 600;">وەستاندن</button>
      <button id="hl-download-btn" style="flex: 2; background: #eab308; border: none; border-radius: 8px; padding: 8px 12px; color: #000; font-size: 12px; cursor: pointer; font-weight: 700;">💾 داونلۆدی فایل</button>
    </div>
  `;
  document.body.appendChild(ui);

  const countEl = document.getElementById('hl-count');
  const lastCodeEl = document.getElementById('hl-last-code');
  const statusEl = document.getElementById('hl-status');
  const pauseBtn = document.getElementById('hl-pause-btn');
  const downloadBtn = document.getElementById('hl-download-btn');

  let isPaused = false;
  pauseBtn.onclick = () => {
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? 'بەردەوامبە' : 'وەستاندن';
    pauseBtn.style.background = isPaused ? '#16a34a' : '#334155';
    statusEl.innerText = isPaused ? 'وەستاوە' : 'چالاکە';
    statusEl.style.color = isPaused ? '#eab308' : '#22c55e';
  };

  function triggerDownload() {
    const list = Array.from(collectedMap.values());
    if (list.length === 0) {
      alert('هیچ پۆستێک کۆنەکراوەتەوە تا ئێستا!');
      return;
    }
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `houseland_all_posts_${list.length}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  downloadBtn.onclick = triggerDownload;
  window.downloadHouselandAllPosts = triggerDownload;

  let emptyScrolls = 0;

  function scanCurrentPosts() {
    // Open See More
    document.querySelectorAll('div[role="button"], span[role="button"]').forEach((btn) => {
      const txt = (btn.innerText || btn.textContent || '').trim();
      if (txt === 'See more' || txt === 'زیاتر ببینە' || txt === 'عرض المزيد') {
        try { btn.click(); } catch (e) {}
      }
    });

    const candidates = Array.from(document.querySelectorAll('div[dir="auto"]')).filter((el) => {
      const txt = el.innerText || '';
      return (
        codeRegex.test(txt) &&
        (txt.includes('ناونیشان') ||
          txt.includes('ڕووبەر') ||
          txt.includes('پەیوەندی') ||
          txt.includes('هاوسلاند'))
      );
    });

    let newFound = 0;
    for (const el of candidates) {
      const rawText = (el.innerText || '').trim();
      const match = rawText.match(codeRegex);
      if (!match) continue;

      const code = kurdishDigits(match[1]);
      if (!code || collectedMap.has(code)) continue;

      const children = Array.from(el.querySelectorAll('div[dir="auto"]')).filter((c) => c !== el);
      const childHasFullPost = children.some((c) => {
        const cTxt = c.innerText || '';
        return codeRegex.test(cTxt) && (cTxt.includes('ناونیشان') || cTxt.includes('ڕووبەر'));
      });
      if (childHasFullPost) continue;

      // Card element for photos and video link
      let postCard = el;
      while (postCard.parentElement && postCard.parentElement !== document.body) {
        if (
          postCard.getAttribute('role') === 'article' ||
          (postCard.dataset && postCard.dataset.pagelet && postCard.dataset.pagelet.includes('FeedUnit'))
        ) {
          break;
        }
        postCard = postCard.parentElement;
      }

      // Photos
      const imgs = new Set();
      postCard.querySelectorAll('img').forEach((img) => {
        const src = img.src || img.getAttribute('data-src') || '';
        if (
          src &&
          src.includes('scontent') &&
          !src.includes('emoji') &&
          !src.includes('rsrc') &&
          !src.includes('p32x32') &&
          !src.includes('p50x50') &&
          !src.includes('p24x24') &&
          !src.includes('p16x16')
        ) {
          imgs.add(src);
        }
      });

      // Video / Reels
      let videoLink = null;
      const vAnchor = postCard.querySelector(
        'a[href*="/reel/"], a[href*="/videos/"], a[href*="/watch/"]'
      );
      if (vAnchor && vAnchor.href) videoLink = vAnchor.href.split('?')[0];

      // Extraction of details
      const cleanDesc = rawText.replace(/See less/gi, '').trim();
      const pType = detectPropertyType(cleanDesc);
      const txType = detectTransactionType(cleanDesc);

      let nearestLandmark = '';
      const lm =
        cleanDesc.match(/📍\s*ناونیشان\s*[:\-—]\s*([^\n\r]+)/) ||
        cleanDesc.match(/ناونیشان\s*[:\-—]\s*([^\n\r]+)/);
      if (lm) nearestLandmark = lm[1].replace(/^[:\-\s]+/, '').trim();

      // Neighborhood
      const nMatch =
        cleanDesc.match(/📍\s*#([^\s\n\r_\-]+)/i) || cleanDesc.match(/#([^\s\n\r_\-]+)\s*(?:📍|\n)/i);
      let neighborhood = nMatch ? nMatch[1].replace(/_/g, ' ').trim() : null;
      if (!neighborhood && nearestLandmark) {
        neighborhood = nearestLandmark.split('-')[0].trim();
      }
      if (!neighborhood) neighborhood = 'سلێمانی';

      // Area
      const areaMatch = cleanDesc.match(/ڕووبەر\s*[:\-—]+\s*([0-9٠-٩]+(?:\.[0-9٠-٩]+)?)/i);
      const areaSqm = areaMatch ? Math.round(Number(kurdishDigits(areaMatch[1]))) : 100;

      // Price
      let price = 2;
      const priceMatch = cleanDesc.match(
        /نرخ\s*[:\-—]+\s*([0-9٠-٩]+(?:\.[0-9٠-٩]+)?)\s*(دەفتەر|دۆلار|\$)?/i
      );
      if (priceMatch) {
        const val = Number(kurdishDigits(priceMatch[1]));
        if (priceMatch[2]?.includes('دەفتەر')) price = val * 10000;
        else price = val;
      }

      // Street
      const streetMatch = cleanDesc.match(/شەقام\s*[:\-—]+\s*([0-9٠-٩]+)/i);
      const streetWidth = streetMatch ? Number(kurdishDigits(streetMatch[1])) : null;

      // Facing
      let facing = null;
      const fMatch = cleanDesc.match(/ڕووی\s*[:\-—]+\s*([^\n\r]+)/i);
      if (fMatch) {
        const fStr = fMatch[1];
        if (/ڕۆژهەڵات|شرق/i.test(fStr)) facing = 'EAST';
        else if (/ڕۆژئاوا|غرب/i.test(fStr)) facing = 'WEST';
        else if (/باکوور|شمال/i.test(fStr)) facing = 'NORTH';
        else if (/باشوور|جنوب|قیبلە/i.test(fStr)) facing = 'SOUTH';
      }

      const TYPE_NAMES_KU = {
        HOUSE: 'خانوو',
        LAND: 'زەوی',
        APARTMENT: 'شوقە',
        SHOP: 'دوکان',
        VILLA: 'ڤێلا',
        FARM: 'کێڵگە',
        COMMERCIAL: 'بینای بازرگانی',
      };
      const typeKu = TYPE_NAMES_KU[pType] || 'خانوو';
      const title = neighborhood ? `${typeKu} — ${neighborhood}` : typeKu;

      const postObj = {
        code,
        title,
        propertyType: pType,
        transactionType: txType,
        neighborhood,
        nearestLandmark: nearestLandmark || null,
        areaSqm,
        facing,
        streetWidth,
        price,
        currency: 'USD',
        description: cleanDesc,
        images: Array.from(imgs),
        videoLink,
        status: 'APPROVED',
      };

      collectedMap.set(code, postObj);
      newFound++;

      // Update UI
      countEl.innerText = collectedMap.size;
      lastCodeEl.innerText = `دواین کۆد: #${code} (${title})`;
    }

    if (newFound > 0) {
      // Auto save to localStorage every time new posts are found
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(collectedMap.values())));
      } catch (e) {}
    }

    return newFound;
  }

  // Continuous auto-scroll loop
  while (true) {
    if (!isPaused) {
      const found = scanCurrentPosts();
      if (found === 0) {
        emptyScrolls++;
        if (emptyScrolls > 45) {
          console.log('📌 گەیشتینە کۆتایی پۆستەکانی پەیجەکە.');
          triggerDownload();
          break;
        }
      } else {
        emptyScrolls = 0;
      }
      window.scrollBy(0, 1500);
    }
    await new Promise((r) => setTimeout(r, 650));
  }
})();
