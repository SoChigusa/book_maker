// ────────────────────────────────────────────────────────────
// ユーティリティ関数：paraRefs／ページ幅／chapters から
// 「ページごとの HTML 文字列リスト」を返す。

import Chapter from "@/app/types";

//────────────────────────────────────────────────────────────
export function extractPagesFromRefs(
  paraRefs: { [key: string]: HTMLDivElement | null },
  chapters: Chapter[],
  pageWidth: number
): { pageHTMLs: string[]; pageCount: number } {
  type ItemPos = { key: string; page: number; el: HTMLDivElement };

  const allRefs = paraRefs;

  // 1) まず「0_title」が存在しなければ空の array を返す
  const titleEl0 = allRefs['0_title'];
  if (!titleEl0) {
    return { pageHTMLs: [], pageCount: 0 };
  }

  // 2) baseline を取得 ("0_title" の右端位置)
  const baseline = titleEl0.offsetLeft + titleEl0.offsetWidth;

  // 3) 各要素を「章→段落→行」の順序で並べる
  const processingOrder: { key: string; el: HTMLDivElement }[] = [];
  chapters.forEach((chapter, chapIdx) => {
    // 章タイトル
    const titleKey = `${chapIdx}_title`;
    const titleEl = allRefs[titleKey];
    if (titleEl) {
      processingOrder.push({ key: titleKey, el: titleEl });
    }

    // 本文行
    chapter.chapterContents.forEach((paraText, paraIdx) => {
      paraText.split('\n').forEach((_, lineIdx) => {
        const lineKey = `${chapIdx}_${paraIdx}_${lineIdx}`;
        const lineEl = allRefs[lineKey];
        if (lineEl) {
          processingOrder.push({ key: lineKey, el: lineEl });
        }
      });
      const sepKey = `${chapIdx}_${paraIdx}_sep`;
      const sepEl = allRefs[sepKey];
      if (sepEl) processingOrder.push({ key: sepKey, el: sepEl });
    });
  });

  // 4) パディング調整をシミュレートしつつ、ページ番号を決める
  let cumulativePad = 0;
  const itemPositions: ItemPos[] = [];
  let maxPage = 0;

  processingOrder.forEach(({ key, el }) => {
    const originalRight = el.offsetLeft + el.offsetWidth;
    const relative = baseline - (originalRight - cumulativePad);
    const mod = relative % pageWidth;

    // タイトル行は改ページ、または 「折り返しオーバー」なら改ページ
    const isNotFirstTitle = key.includes('_title') && key !== '0_title';
    if (mod + el.offsetWidth > pageWidth || isNotFirstTitle) {
      const pad = pageWidth - mod;
      cumulativePad += pad;
      // （計算上だけ pad を加え、DOM の style.paddingRight はいじらない）
    }

    const effectiveRight = originalRight - cumulativePad;
    const page = Math.floor((baseline - effectiveRight) / pageWidth);
    if (page > maxPage) {
      maxPage = page;
    }
    itemPositions.push({ key, page, el });
  });

  const pageCount = maxPage + 1;

  // 5) pageCount 要素の配列を作り、各 page に対応する outerHTML を結合する
  const pages: string[] = Array(pageCount).fill('').map(() => '');

  itemPositions.forEach(({ page, el }) => {
    pages[page] += el.outerHTML;
  });

  return { pageHTMLs: pages, pageCount };
}

export function makeCacheKey(
  chapters: Chapter[],
  pageWidth: number,
  padding: number,
  fontSize: number
): string {
  const chaptersJson = JSON.stringify(
    chapters.map((ch) => ({ title: ch.chapterTitle, contents: ch.chapterContents }))
  );
  return `pagerCache:${chaptersJson}:${pageWidth}:${padding}:${fontSize}`;
}

export function getCache(
  chapters: Chapter[],
  pageWidth: number,
  padding: number,
  fontSize: number
): { pageHTMLs: string[]; pageCount: number } | null {
  const key = makeCacheKey(chapters, pageWidth, padding, fontSize);
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function generateAllFontCaches(
  paraRefs: { [key: string]: HTMLDivElement | null },
  chapters: Chapter[],
  pageWidth: number,
  padding: number,
  fontSizeList: number[]
) {
  fontSizeList.forEach((fs) => {
    document.documentElement.style.fontSize = `${fs}px`;
    const { pageHTMLs, pageCount } = extractPagesFromRefs(paraRefs, chapters, pageWidth);
    const key = makeCacheKey(chapters, pageWidth, padding, fs);
    try {
      localStorage.setItem(key, JSON.stringify({ pageHTMLs, pageCount }));
    } catch {
      /** ignore errors */
    }
  });
}