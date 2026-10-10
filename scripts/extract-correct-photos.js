// ====================================================================
// 📸 Houseland Accurate Property Photos Extractor
// کۆکردنەوەی وێنەی ڕاستەقینەی هەر موڵکێک بەپێی ڕیزبەندی پۆستی فەیسبووک
// ====================================================================

(async function extractAccuratePhotos() {
  console.clear();
  console.log(
    '%c🚀 دەستکرا بە کۆکردنەوەی وێنە ڕاستەقینەکانی هەر موڵکێک بە ڕیزبەندی...',
    'color: #38bdf8; font-size: 15px; font-weight: bold;'
  );

  const kurdishDigits = (str) =>
    (str || '').replace(/[٠-٩۰-۹]/g, (d) =>
      '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(d) > 9
        ? (('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(d) - 10) % 10).toString()
        : '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()
    );

  const codeRegex =
    /(?:#کۆدی_ژمارە_|کۆدی_ژمارە_|کۆد[ی]?\s*[:\-—#_]?\s*|#\s*)([0-9٠-٩۰-۹]{3,5})/i;
  const BAN_PHOTO_ID = '2046261545812072'; // Pinned blue phone banner

  function isValidVideoLink(href) {
    if (!href) return false;
    const clean = href.split('?')[0].replace(/\/+$/, '');
    if (/facebook\.com\/(?:reel|videos|watch)$/i.test(clean)) return false;
    return /facebook\.com\/(?:reel\/\d+|[^\/]+\/videos\/\d+|watch\/?\?v=\d+)/i.test(href);
  }

  const propertyDataMap = new Map();

  function scanVisiblePosts() {
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

    for (const el of candidates) {
      const rawText = (el.innerText || '').trim();
      const match = rawText.match(codeRegex);
      if (!match) continue;
      const code = kurdishDigits(match[1]);
      if (!code || propertyDataMap.has(code)) continue;

      // Find boundary of THIS single post
      let card = el;
      while (card.parentElement && card.parentElement !== document.body) {
        const parentText = card.parentElement.innerText || '';
        const count = (
          parentText.match(/(?:#کۆدی_ژمارە_|کۆدی_ژمارە_)\s*[0-9٠-٩۰-۹]+/g) || []
        ).length;
        if (count > 1) break;
        card = card.parentElement;
      }

      // Collect real images in exact DOM order
      const postImgs = [];
      const seenSrc = new Set();
      const allImgs = Array.from(card.querySelectorAll('img'));

      for (const img of allImgs) {
        const src = img.src || img.getAttribute('data-src') || '';
        if (!src || !src.includes('scontent')) continue;
        if (src.includes(BAN_PHOTO_ID) || src.includes('472916940')) continue;
        if (
          src.includes('emoji') ||
          src.includes('rsrc') ||
          src.includes('p32x32') ||
          src.includes('p50x50') ||
          src.includes('p40x40') ||
          src.includes('p24x24') ||
          src.includes('p16x16') ||
          src.includes('100x100')
        )
          continue;

        const idMatch = src.match(/\/(\d+_\d+_\d+_n\.)/);
        const photoKey = idMatch ? idMatch[1] : src.split('?')[0];
        if (!seenSrc.has(photoKey)) {
          seenSrc.add(photoKey);
          postImgs.push(src);
        }
      }

      // Check real video link if any
      let realVideo = null;
      const anchors = Array.from(card.querySelectorAll('a[href*="/reel/"], a[href*="/videos/"], a[href*="/watch/"]'));
      for (const a of anchors) {
        if (isValidVideoLink(a.href)) {
          realVideo = a.href.split('?')[0];
          break;
        }
      }

      if (postImgs.length > 0 || realVideo) {
        propertyDataMap.set(code, {
          code,
          images: postImgs,
          videoLink: realVideo,
        });
        console.log(
          `📸 [#${code}] -> ${postImgs.length} وێنەی ڕاستەقینە دۆزرایەوە ${realVideo ? '🎬 ڤیدیۆ' : ''}`
        );
      }
    }
  }

  // Scroll smoothly through page from top to bottom
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 800));

  let emptyCount = 0;
  while (emptyCount < 40) {
    const beforeCount = propertyDataMap.size;
    scanVisiblePosts();
    if (propertyDataMap.size === beforeCount) {
      emptyCount++;
    } else {
      emptyCount = 0;
    }
    window.scrollBy(0, 1400);
    await new Promise((r) => setTimeout(r, 600));
  }

  const results = Array.from(propertyDataMap.values());
  console.log(
    `%c🎉 تەواو بوو! وێنەی ${results.length} موڵک بە تەواوی و بە ڕیزبەندی دۆزرانەوە.`,
    'color: #22c55e; font-size: 16px; font-weight: bold;'
  );

  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'houseland_accurate_photos.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  console.log('💾 فایلی houseland_accurate_photos.json دابەزێندرا!');
})();
