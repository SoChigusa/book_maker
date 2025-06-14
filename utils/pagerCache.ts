// ────────────────────────────────────────────────────────────
// ユーティリティ関数：paraRefs／ページ幅／chapters から
// 「ページごとの HTML 文字列リスト」を返す。

import Chapter from "@/app/types";
import TextElement from "@/components/TextElement";
import type { CSSProperties, JSX } from 'react';
import { createRoot, Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";

function measureJSXViaHTML(
  el: React.ReactElement,
  container: HTMLDivElement,
): number {
  // 1) renderToStaticMarkup で HTML 文字列化
  const html = renderToStaticMarkup(el);

  // 3) innerHTML に挿入
  container.innerHTML = html;
  document.body.appendChild(container);

  // 4) 折り返し後の幅を測定
  const usedWidth = container.getBoundingClientRect().width;

  // 5) 後片付け
  document.body.removeChild(container);
  container.innerHTML = '';

  return usedWidth;
}

//────────────────────────────────────────────────────────────
export function extractPagesFromContents(
  chapters: Chapter[],
  pageHeight: number,
  pageWidth: number,
  fontSize: number,
  measureStyle: CSSProperties
) {
  type ItemPos = { key: string; page: number; el: JSX.Element };

  // 3) 各要素を「章→段落→行」の順序で並べる
  const processingOrder: { key: string; el: JSX.Element, fullText?: string }[] = [];
  chapters.forEach((chapter, chapIdx) => {
    // 章タイトル
    const titleKey = `${chapIdx}_title`;
    const titleEl = TextElement({
      pageHeight: pageHeight,
      elementKey: 'title',
      text: chapter.chapterTitle,
    });
    if (titleEl) processingOrder.push({ key: titleKey, el: titleEl });

    // 本文行
    chapter.chapterContents.forEach((paraText, paraIdx) => {
      paraText.split('\n').forEach((lineText, lineIdx) => {
        const lineKey = `${chapIdx}_${paraIdx}_${lineIdx}`;
        const lineEl = TextElement({
          pageHeight: pageHeight,
          elementKey: 'mainText',
          text: lineText,
        });
        if (lineEl) processingOrder.push({ key: lineKey, el: lineEl, fullText: lineText });
      });
      if (paraIdx != chapter.chapterContents.length - 1) {
        const sepKey = `${chapIdx}_${paraIdx}_sep`;
        const sepEl = TextElement({
          pageHeight: pageHeight,
          elementKey: 'divider',
          text: '',
        });
        if (sepEl) processingOrder.push({ key: sepKey, el: sepEl });
      }
    });
  });

  // 4) パディング調整をシミュレートしつつ、ページ番号を決める
  let distance = 0;
  const itemPositions: ItemPos[] = [];

  // 判定用コンテナ
  const measurer = document.createElement('div');
  measurer.classList.add('novel-window');
  Object.assign(measurer.style, {
    fontSize: fontSize + 'px',
    ...measureStyle
  });

  processingOrder.forEach(async ({ key, el, fullText }) => {
    const page = Math.floor(distance / pageWidth);

    // 残り幅を計算
    const remainder = distance % pageWidth;
    const avail = pageWidth - remainder;

    // 実際の幅を計測
    const usedWidth = measureJSXViaHTML(el, measurer);
    distance += usedWidth;

    // ここで usedWidth をもとに二分探索など分割ロジックを実行
    // タイトル：問答無用でページ送り
    const isNotFirstTitle = key.includes('_title') && key !== '0_title';
    if (isNotFirstTitle) {
      distance += avail;
      itemPositions.push({ key, page: page + 1, el });
    } else if (usedWidth > avail) {

      // 本文：分割の可能性を探るため、テキスト幅を二分探索で測定
      if (fullText !== undefined) {
        let w = 0, lo = 0, hi = fullText.length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          const lineEl = TextElement({
            pageHeight: pageHeight,
            elementKey: 'mainText',
            text: fullText.slice(0, mid),
          });
          w = measureJSXViaHTML(lineEl, measurer);
          if (w <= avail) {
            lo = mid;
          } else {
            hi = mid - 1;
          }
        }

        // 前半を現在ページ、後半を次ページへ
        itemPositions.push({
          key,
          page,
          el: TextElement({
            pageHeight: pageHeight,
            elementKey: 'mainText',
            text: fullText.slice(0, lo),
          }),
        });
        itemPositions.push({
          key: key + '_tail',
          page: page + 1,
          el: TextElement({
            pageHeight: pageHeight,
            elementKey: 'mainTextTail',
            text: fullText.slice(lo, fullText.length),
          }),
        });
        distance += avail - w + 1.5 * fontSize;
      }

      // セクションディバイダー：問答無用でページ送り
      else {
        distance += avail;
        itemPositions.push({ key, page: page + 1, el });
      }
    } else {
      itemPositions.push({ key, page, el });
    }

  });

  // 最終ページ数
  const pageCount = Math.floor(distance / pageWidth) + 1;

  // 5) pageCount 要素の配列を作り、各 page に対応する outerHTML を結合する
  const pages: string[] = Array(pageCount).fill('').map(() => '');

  itemPositions.forEach(({ page, el }) => {
    pages[page] += renderToStaticMarkup(el);
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
  measureStyle: CSSProperties,
  chapters: Chapter[],
  pageHeight: number,
  pageWidth: number,
  padding: number,
  fontSizeList: number[]
) {
  fontSizeList.forEach((fs) => {
    document.documentElement.style.fontSize = `${fs}px`;
    const { pageHTMLs, pageCount } = extractPagesFromContents(chapters, pageHeight, pageWidth, fs, measureStyle);
    const key = makeCacheKey(chapters, pageWidth, padding, fs);
    try {
      localStorage.setItem(key, JSON.stringify({ pageHTMLs, pageCount }));
    } catch {
      /** ignore errors */
    }
  });
}