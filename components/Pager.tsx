import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { useRouter } from 'next/router';
import Chapter from '@/app/types';

type PagerProps = {
  pageHeight: number;
  pageWidth: number;
  padding: number;
  defaultFontSize: number;
  chapters: Chapter[];
};

// ────────────────────────────────────────────────────────────
// ユーティリティ関数：paraRefs／ページ幅／chapters から
// 「ページごとの HTML 文字列リスト」を返す。
//────────────────────────────────────────────────────────────
export function extractPagesFromRefs(
  paraRefs: React.MutableRefObject<{ [key: string]: HTMLDivElement | null }>,
  chapters: Chapter[],
  pageWidth: number,
  setPageCount: React.Dispatch<React.SetStateAction<number>>
): string[] {
  type ItemPos = { key: string; page: number; el: HTMLDivElement };

  const allRefs = paraRefs.current;

  // 1) まず「0_title」が存在しなければ空の array を返す
  const titleEl0 = allRefs['0_title'];
  if (!titleEl0) {
    return [];
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
  setPageCount(pageCount);

  // 5) pageCount 要素の配列を作り、各 page に対応する outerHTML を結合する
  const pages: string[] = Array(pageCount).fill('').map(() => '');

  itemPositions.forEach(({ page, el }) => {
    pages[page] += el.outerHTML;
  });

  return pages;
}

export function Pager({ pageWidth, pageHeight, padding, defaultFontSize, chapters }: PagerProps) {
  const router = useRouter();
  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const paraRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [pageCount, setPageCount] = useState(1);
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [animOffset, setAnimOffset] = useState<number>(pageWidth + 2 * padding);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // page number from query
  const pageParam = Array.isArray(router.query.page) ? router.query.page[0] : router.query.page;
  const parsed = parseInt(pageParam || '', 10);
  let pageIndex = isNaN(parsed) ? 0 : parsed - 1;
  pageIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));
  const hasPageQuery = !isNaN(parsed);

  // font size from query
  const fontParam = Array.isArray(router.query.fontSize)
    ? router.query.fontSize[0]
    : router.query.fontSize;
  const parsedFont = parseInt(fontParam || '', 10);
  const fontSize = isNaN(parsedFont) ? defaultFontSize : parsedFont;

  // ──────────────────────────────────────────────────────────
  // 「測定用コンテナ」を描画する（ユーザーには見せない）
  //   → ここで初めてすべての要素が DOM に乗り、paraRefs が埋まる
  //──────────────────────────────────────────────────────────
  // style に visibility: hidden を付けることで非表示にする
  // 必要があれば offscreen (top:-9999px, left:-9999px) に置いても OK
  const measureStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: pageWidth * chapters.length, // 十分に大きな幅を確保しておく
    height: pageHeight,
    overflow: 'visible',
    WebkitColumnWidth: pageWidth,
    columnWidth: pageWidth,
    columnGap: 0,
    WebkitColumnFill: 'auto',
    columnFill: 'auto',
    // visibility: 'hidden', // ここで非表示にする
  };

  // // padding adjustment
  // useLayoutEffect(() => {
  //   Object.values(paraRefs.current).forEach(el => {
  //     if (el) {
  //       el.style.paddingRight = '';
  //     }
  //   });
  //   if (!paraRefs.current['0_title']) return;
  //   const baseline = paraRefs.current['0_title'].offsetLeft + paraRefs.current['0_title'].offsetWidth;
  //   let cumulativePad = 0;
  //   Object.entries(paraRefs.current).forEach(([key, el]) => {
  //     if (!el) return;
  //     if (key === '0_title') return;
  //     const originalRight = el.offsetLeft + el.offsetWidth;
  //     const relative = baseline - (originalRight - cumulativePad);
  //     const mod = relative % pageWidth;
  //     if (mod + el.offsetWidth > pageWidth - paddingX || key.includes('_title')) {
  //       const pad = pageWidth + paddingX - mod;
  //       el.style.paddingRight = `${pad}px`;
  //       cumulativePad += pad;
  //     }
  //   });
  // }, [chapters, fontSize, paddingX, pageWidth]);

  // // page count adjustment
  // useLayoutEffect(() => {
  //   if (!innerRef.current) return;
  //   const totalW = innerRef.current.scrollWidth;
  //   setPageCount(Math.ceil(totalW / pageWidth));
  // }, [chapters, pageWidth, fontSize]);

  // ──────────────────────────────────────────────────────────
  // キャッシュキーの作成 (chapters + pageWidth + paddingX + fontSize を文字列化したものをキーにする例)
  //──────────────────────────────────────────────────────────
  const cacheKey = React.useMemo(() => {
    // 章コンテンツが大きい場合はハッシュ化するのが本来望ましいが、
    // サンプルとして簡易に JSON.stringify を使う
    const chaptersJson = JSON.stringify(
      chapters.map((ch) => ({ title: ch.chapterTitle, contents: ch.chapterContents }))
    );
    return `pagerCache:${chaptersJson}:${pageWidth}:${padding}:${fontSize}`;
  }, [chapters, pageWidth, padding, fontSize]);

  // ──────────────────────────────────────────────────────────
  // 「ページごとの HTML 文字列リスト」を保持する state
  //──────────────────────────────────────────────────────────
  const [pageHTMLs, setPageHTMLs] = useState<string[]>(['']);
  const [isBuildingCache, setIsBuildingCache] = useState<boolean>(false);

  // ──────────────────────────────────────────────────────────
  // 初回アクセス判定とキャッシュ生成
  //──────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!router.isReady) return;

    // すでに ?page がついているならキャッシュ生成は不要
    if (hasPageQuery) {
      // ページクエリがある＝キャッシュモードなので、キャッシュを localStorage から読むだけ
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed = JSON.parse(stored) as { pageHTMLs: string[]; pageCount: number };
          setPageHTMLs(parsed.pageHTMLs);
          setPageCount(parsed.pageCount);
        }
      } catch {
        // もしパースに失敗したら何もしない（最悪再生成）
      }
      return;
    }

    // ここからは「初回アクセス (hasPageQuery が false)」のときだけ実行
    setIsBuildingCache(true);

    // 1) 測定用コンテナとしてまず DOM を構築し、extractPagesFromRefs を実行
    if (!innerRef.current) return;
    const pages = extractPagesFromRefs(paraRefs, chapters, pageWidth, setPageCount);
    setPageHTMLs(pages);

    // 2) localStorage にキャッシュを保存
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ pageHTMLs: pages, pageCount }));
    } catch {
      // 保存エラーは無視
    }

    // 3) キャッシュができたら自動で ?page=1 に遷移
    router.replace(
      { pathname: router.pathname, query: { ...router.query, page: 1 } },
      undefined,
      { shallow: true }
    );
  }, [router, hasPageQuery, cacheKey, chapters, pageWidth, padding, pageCount]);

  // jump after font-size change
  useEffect(() => {
    if (!pendingKey) return;
    if (!paraRefs.current['0_title']) return;
    const baseline = paraRefs.current['0_title'].offsetLeft + paraRefs.current['0_title'].offsetWidth;
    const el = paraRefs.current[pendingKey];
    if (el) {
      const elRight = el.offsetLeft + el.offsetWidth;
      const newPage = Math.floor((baseline - elRight) / pageWidth) + 1;
      router.push(
        { pathname: router.pathname, query: { ...router.query, page: newPage } },
        undefined,
        { shallow: true }
      );
    }
    setPendingKey(null);
  }, [router, fontSize, pageWidth, pendingKey]);

  const goNextAnimated = () => {
    if (isAnimating || pageIndex >= pageCount - 1) return;
    setIsAnimating(true);
    setAnimOffset(2 * pageWidth + 4 * padding);
  };

  const goPrevAnimated = () => {
    if (isAnimating || pageIndex <= 0) return;
    setIsAnimating(true);
    setAnimOffset(0);
  };

  // // スライド終了後にページ番号を更新し、再び中央に戻す
  // const handleTransitionEnd = () => {
  //   if (!isAnimating) return;
  //   if (animOffset === 2 * pageWidth) {
  //     const nextPage = pageIndex + 2;
  //     router.push(
  //       { pathname: router.pathname, query: { ...router.query, page: nextPage } },
  //       undefined,
  //       { shallow: true }
  //     );
  //   } else if (animOffset === 0) {
  //     const prevPage = pageIndex;
  //     router.push(
  //       { pathname: router.pathname, query: { ...router.query, page: prevPage } },
  //       undefined,
  //       { shallow: true }
  //     );
  //   }
  //   // アニメーション後、中央表示に戻す
  //   setAnimOffset(pageWidth);
  //   setIsAnimating(false);
  // };

  const handleTransitionEnd = () => {
    if (!isAnimating) return;

    // next／prev を確定させる
    if (animOffset === 2 * pageWidth + 4 * padding) {
      router.push({ pathname: router.pathname, query: { ...router.query, page: pageIndex + 2 } }, undefined, { shallow: true });
    } else if (animOffset === 0) {
      router.push({ pathname: router.pathname, query: { ...router.query, page: pageIndex } }, undefined, { shallow: true });
    }

    // ここで直接 -pageWidth に戻しても、一瞬 transition: none で描画されてしまうので、
    // 「次のイベントループ」で位置を戻すように setTimeout をかますとズレは起こりません
    setIsAnimating(false);
    setTimeout(() => {
      setAnimOffset(pageWidth + 2 * padding);
    }, 0);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    setHoverZone(x < width / 2 ? 'left' : 'right');
  };
  const handleMouseLeave = () => setHoverZone(null);

  const handleZoneClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - left;
    if (clickX > width / 2) {
      goPrevAnimated();
    } else {
      goNextAnimated();
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (paraRefs.current['0_title']) {
      const baseline = paraRefs.current['0_title'].offsetLeft + paraRefs.current['0_title'].offsetWidth;
      const entries = Object.entries(paraRefs.current)
        .filter(([, el]) => el !== null);
      const firstOnPage = entries
        .map(([key, el]) => ({ key, right: el!.offsetLeft + el!.offsetWidth }))
        .filter(item => item.right <= baseline - pageIndex * pageWidth)
        .sort((a, b) => b.right - a.right)[0];
      setPendingKey(firstOnPage ? firstOnPage.key : null);
    }
    const newFontSize = parseInt(e.target.value, 10);
    router.push(
      { pathname: router.pathname, query: { ...router.query, fontSize: newFontSize } },
      undefined,
      { shallow: true }
    );
  };

  return (
    <>
      {(!hasPageQuery || isBuildingCache) && (
        <div
          className='novel-window'
          ref={containerRef}
          style={measureStyle}
        >
          <div style={{
            position: 'relative',
            width: pageWidth + 2 * padding,
            height: pageHeight + 2 * padding,
            overflow: 'hidden',
            padding: `${padding}px ${padding}px`,
            zIndex: 0,
          }}>
            <div
              ref={innerRef}
              style={{
                height: pageHeight,
                WebkitColumnWidth: pageWidth,
                columnWidth: pageWidth,
                columnGap: 0,
                WebkitColumnFill: 'auto',
                columnFill: 'auto',
              }}
            >
              {chapters.map((chapter, idx) => {
                const keyNameTitle = `${idx}_title`;
                return (
                  <div key={idx} style={{ visibility: 'hidden' }}>
                    <div
                      ref={(el) => {
                        paraRefs.current[keyNameTitle] = el;
                      }}
                    >
                      <h4>{chapter.chapterTitle}</h4>
                    </div>
                    {chapter.chapterContents.flatMap((content, i) =>
                      [
                        ...content.split('\n').map((line, index) => {
                          const keyName = `${idx}_${i}_${index}`;
                          if (line == '') {
                            return (
                              <div
                                key={keyName}
                                ref={(el) => {
                                  paraRefs.current[keyName] = el;
                                }}
                              ><br /></div>
                            );
                          } else {
                            return (
                              <div
                                key={keyName}
                                ref={(el) => {
                                  paraRefs.current[keyName] = el;
                                }}
                              >
                                <p
                                  className={/^[「（]/.test(line.trim()) ? 'conversation' : 'descriptive'}
                                  dangerouslySetInnerHTML={{ __html: line }}
                                />
                              </div>
                            );
                          }
                        }),
                        i < chapter.chapterContents.length - 1 && (
                          <div
                            key={`${idx}_${i}_sep`}
                            ref={(el) => {
                              paraRefs.current[`${idx}_${i}_sep`] = el;
                            }}
                          >
                            <p style={{ textAlign: 'center', paddingRight: '1em', paddingLeft: '1em' }}>
                              ＊＊＊
                            </p>
                          </div>
                        ),
                      ].filter(Boolean)
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2) ?page がある or キャッシュ生成完了後の通常表示 */}
      {hasPageQuery && pageHTMLs.length > 0 && (
        <div
          className='novel-window'
          ref={containerRef}
          onClick={handleZoneClick}
          style={{
            position: 'relative',
            display: 'inline-block',
            cursor: 'pointer',
            fontSize: fontSize + 'px',
          }}
        >
          <div style={{
            position: 'relative',
            width: pageWidth + 2 * padding,
            height: pageHeight + 2 * padding,
            overflow: 'hidden',
            padding: `${padding}px ${padding}px`,
            zIndex: 0,
            boxSizing: 'border-box',
            border: '2px solid #666',
          }}
            onMouseEnter={handleMouseMove}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Hover overlays */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '50%',
                height: '100%',
                backgroundColor: hoverZone === 'left' && pageIndex != pageCount - 1 ? 'rgba(0,0,0,0.3)' : 'transparent',
                zIndex: 1,
                transition: 'background-color 0.2s',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                width: '50%',
                height: '100%',
                backgroundColor: hoverZone === 'right' && pageIndex != 0 ? 'rgba(0,0,0,0.3)' : 'transparent',
                zIndex: 1,
                transition: 'background-color 0.2s',
              }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 3 * pageWidth + 6 * padding,
                height: pageHeight,
                overflow: 'hidden',
                transform: `translateX(${animOffset}px)`,
                transition: isAnimating ? 'transform 0.3s' : 'none',
              }}
              onTransitionEnd={handleTransitionEnd}
            >
              {/* 前ページ（存在しなければ空のまま） */}
              <div
                style={{
                  width: pageWidth + 2 * padding,
                  height: pageHeight,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
                dangerouslySetInnerHTML={{ __html: pageHTMLs[pageIndex - 1] || '' }}
              />

              {/* 現在ページ */}
              <div
                style={{
                  width: pageWidth + 2 * padding,
                  height: pageHeight,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
                dangerouslySetInnerHTML={{ __html: pageHTMLs[pageIndex] || '' }}
              />

              {/* 次ページ（存在しなければ空のまま） */}
              <div
                style={{
                  width: pageWidth + 2 * padding,
                  height: pageHeight,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
                dangerouslySetInnerHTML={{ __html: pageHTMLs[pageIndex + 1] || '' }}
              />
            </div>
          </div>

          <div style={{
            position: 'absolute',
            bottom: -24,
            left: 10,
            writingMode: 'horizontal-tb',
            zIndex: 2,
          }}>
            <select value={fontSize} onChange={handleSelectChange} onClick={(e) => e.stopPropagation()}>
              {[12, 14, 16, 18, 20, 22, 24].map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>

          <div style={{
            position: 'absolute',
            bottom: -24,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '14px',
            writingMode: 'horizontal-tb'
          }}>
            {pageIndex + 1} / {pageCount}
          </div>
        </div >
      )}
    </>
  );
}
