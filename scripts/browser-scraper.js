// ====================================================================
// Houseland Facebook Importer & Scraper (Master Edition v3.0)
// کۆکردنەوەی پۆستەکان بە ناونیشانی نزیک، وێنەکان، و ڤیدیۆکان
// ====================================================================

(async function () {
  console.clear();
  console.log(
    '%c🚀 دەستکرا بە پشکنین و کۆکردنەوەی تەواوی پۆستەکان بە وێنە و ناونیشانی نزیکەوە...',
    'color: #38bdf8; font-size: 16px; font-weight: bold;'
  );

  const kurdishToEnglishDigits = (str) => {
    if (!str) return '';
    const map = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
      '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
      '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    };
    return str.replace(/[٠-٩۰-۹]/g, (w) => map[w] || w);
  };

  function parsePostText(text) {
    if (!text) return null;
    const normalized = kurdishToEnglishDigits(text);

    // 1. Code
    const codeMatch =
      normalized.match(/#کۆدی_ژمارە_([0-9]+)/i) ||
      normalized.match(/کۆد(?:ی)?(?:\s*ژمارە)?\s*[:#\-_]?\s*([0-9]+)/i) ||
      normalized.match(/#([0-9]{4,5})/);
    if (!codeMatch) return null;
    const code = codeMatch[1];

    // 2. Transaction Type
    let transactionType = 'FOR_SALE';
    if (/بۆ\s*کرێ|کرێ/i.test(text) && !/بۆ\s*فرۆشتن/i.test(text)) {
      transactionType = 'FOR_RENT';
    }

    // 3. Property Type
    let propertyType = 'HOUSE';
    if (/بازرگانی/i.test(text)) propertyType = 'COMMERCIAL';
    else if (/زەوی/i.test(text)) propertyType = 'LAND';
    else if (/شوقە/i.test(text)) propertyType = 'APARTMENT';
    else if (/دوکان/i.test(text)) propertyType = 'SHOP';
    else if (/باخ|ڤێلا/i.test(text)) propertyType = 'VILLA';
    else if (/کۆگا/i.test(text)) propertyType = 'WAREHOUSE';
    else if (/باڵەخانە/i.test(text)) propertyType = 'BUILDING';

    // 4. ناونیشانی نزیک (nearestLandmark)
    let nearestLandmark = null;
    const landmarkMatch = text.match(/(?:📍\s*)?ناونیشان\s*[:\-]+\s*([^\r\n]+)/i);
    if (landmarkMatch) {
      const raw = landmarkMatch[1].split(/(?:[\r\n]|[\u200e\u200f\s]*ڕووبەر)/)[0];
      nearestLandmark = raw.replace(/[\u200e\u200f\u202a-\u202e]/g, '').trim();
    }

    // 5. گەڕەک (neighborhood)
    const nMatch =
      text.match(/📍\s*#([^\s\n\r_\-]+)/i) ||
      text.match(/#([^\s\n\r_\-]+)\s*(?:📍|\n)/i);
    let neighborhood = nMatch ? nMatch[1].replace(/_/g, ' ').trim() : null;
    if (!neighborhood && nearestLandmark) {
      neighborhood = nearestLandmark.split('-')[0].trim();
    }
    if (!neighborhood) neighborhood = 'سلێمانی';

    // 6. ڕووبەر (areaSqm)
    const areaMatch = normalized.match(/(?:🅰️\s*)?ڕووبەر\s*[:\-]+\s*([0-9]+(?:\.[0-9]+)?)/i);
    const areaSqm = areaMatch ? Math.round(Number(areaMatch[1])) : 100;

    // 7. پێشی (frontageMeters)
    const frontMatch = normalized.match(/(?:🗺\s*)?پێشی\s*[:\-]+\s*([0-9]+(?:\.[0-9]+)?)/i);
    const frontageMeters = frontMatch ? Math.round(Number(frontMatch[1])) : null;

    // 8. ڕوو (facing)
    let facing = null;
    const facingMatch = text.match(/(?:🌗\s*)?ڕووی\s*[:\-]+\s*([^\n\r]+)/i);
    if (facingMatch) {
      const fStr = facingMatch[1];
      if (/ڕۆژهەڵات|شرق/i.test(fStr)) facing = 'EAST';
      else if (/ڕۆژئاوا|غرب/i.test(fStr)) facing = 'WEST';
      else if (/باکوور|شمال/i.test(fStr)) facing = 'NORTH';
      else if (/باشوور|جنوب|قیبلە/i.test(fStr)) facing = 'SOUTH';
    }

    // 9. شەقام (streetWidth)
    const streetMatch = normalized.match(/(?:🚧\s*)?شەقام\s*[:\-]+\s*([0-9]+)/i);
    const streetWidth = streetMatch ? Number(streetMatch[1]) : null;

    // 10. نرخ (price)
    let price = 2;
    const priceMatch = normalized.match(/نرخ\s*[:\-]+\s*([0-9]+(?:\.[0-9]+)?)\s*(دەفتەر|دۆلار|\$)?/i);
    if (priceMatch) {
      const val = Number(priceMatch[1]);
      if (priceMatch[2]?.includes('دەفتەر')) price = val * 10000;
      else price = val;
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
      currency: 'USD',
      description: text.trim(),
    };
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(
      `%c📥 فایلی ${filename} داونلۆد کرا! (سەرجەم ${data.length} پۆست)`,
      'color: #22c55e; font-size: 15px; font-weight: bold;'
    );
  }

  const collectedPosts = new Map();
  const targetCount = 100;
  let emptyScrolls = 0;

  window.finishHouselandExport = () => {
    const arr = Array.from(collectedPosts.values());
    downloadJSON(arr, 'houseland_posts.json');
    downloadJSON(arr.map(p => ({ code: p.code, images: p.images, videoLink: p.videoLink })), 'houseland_photos.json');
  };

  console.log(
    '%c💡 تێبینی: هەرکات ویستت فایلەکان داونلۆد بکەیت دەتوانیت بنووسیت finishHouselandExport()',
    'color: #f59e0b; font-size: 13px;'
  );

  while (collectedPosts.size < targetCount) {
    // کلیک لەسەر See more
    document.querySelectorAll('div[role="button"], span[role="button"]').forEach((btn) => {
      const txt = btn.textContent?.trim() || '';
      if (txt === 'See more' || txt === 'زیاتر ببینە' || txt === 'عرض المزيد') {
        try { btn.click(); } catch (e) {}
      }
    });

    // دۆزینەوەی هەموو ئەو بەشانەی کۆدیان تێدایە
    const allCandidateDivs = Array.from(document.querySelectorAll('div, span, article')).filter((el) => {
      const t = el.textContent || '';
      return (t.includes('کۆدی_ژمارە') || t.includes('کۆدی ژمارە')) && t.length > 50 && t.length < 5000;
    });

    let newFound = 0;

    for (const textEl of allCandidateDivs) {
      const rawText = textEl.textContent || '';
      const parsed = parsePostText(rawText);
      if (!parsed || !parsed.code || parsed.transactionType !== 'FOR_SALE') continue;

      if (!collectedPosts.has(parsed.code)) {
        // گەیشتن بە کارتی پۆستەکە بە وێنەکانیەوە
        let postCard = textEl;
        while (postCard.parentElement && postCard.parentElement !== document.body) {
          if (
            postCard.getAttribute('role') === 'article' ||
            (postCard.dataset && postCard.dataset.pagelet && postCard.dataset.pagelet.includes('FeedUnit'))
          ) {
            break;
          }
          if (postCard.parentElement) {
            const codeMatches = (postCard.parentElement.textContent.match(/کۆدی_ژمارە|کۆدی ژمارە/g) || []).length;
            if (codeMatches > 1) break;
          }
          postCard = postCard.parentElement;
        }

        // ڤیدیۆ یان ڕیل
        let videoLink = null;
        const vAnchor = postCard.querySelector('a[href*="/reel/"], a[href*="/videos/"], a[href*="/watch/"]');
        if (vAnchor && vAnchor.href) videoLink = vAnchor.href.split('?')[0];

        // هەموو وێنەکانی موڵکەکە
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

        const postData = {
          ...parsed,
          videoLink,
          images: Array.from(imgs),
        };

        collectedPosts.set(parsed.code, postData);
        newFound++;

        console.log(
          `%c✅ [${collectedPosts.size}/${targetCount}] کۆدی #${parsed.code} (${parsed.neighborhood}) | ناونیشان: ${parsed.nearestLandmark || 'نادیار'} | 📸 ${postData.images.length} وێنە ${postData.videoLink ? '🎬 ڤیدیۆ' : ''}`,
          'color: #10b981; font-weight: bold;'
        );
      }
    }

    if (newFound === 0) {
      emptyScrolls++;
      if (emptyScrolls > 35) {
        console.log('📌 گەیشتینە کۆتایی پۆستەکان.');
        break;
      }
    } else {
      emptyScrolls = 0;
    }

    // سکرۆڵکردن بەرەو خوارەوە بە ٣ شێوازی مسۆگەر بۆ ئەوەی فەیسبووک پۆستەکان بار بکات
    window.scrollBy(0, 1200);
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop += 1200;
    }
    window.dispatchEvent(new Event('scroll'));
    await new Promise((r) => setTimeout(r, 2200));
  }

  console.log(`🎉 سەرجەم ${collectedPosts.size} پۆست کۆکرایەوە! دابەزاندنی فایلەکان...`);
  const finalPosts = Array.from(collectedPosts.values());
  downloadJSON(finalPosts, 'houseland_posts.json');
  downloadJSON(finalPosts.map(p => ({ code: p.code, images: p.images, videoLink: p.videoLink })), 'houseland_photos.json');
})();
