import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { useRouter } from 'next/router';
import Chapter from '@/app/types';
import { generateAllFontCaches, getCache } from '@/utils/pagerCache';

type PagerProps = {
  pageHeight: number;
  pageWidth: number;
  padding: number;
  defaultFontSize: number;
  fontSizeList: number[];
  chapters: Chapter[];
};



export function Pager({ pageWidth, pageHeight, padding, defaultFontSize, fontSizeList, chapters }: PagerProps) {
  const router = useRouter();
  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const paraRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [pageCount, setPageCount] = useState(1);
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [animOffset, setAnimOffset] = useState<number>(pageWidth + 2 * padding);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(defaultFontSize);

  // page number from query
  const pageParam = Array.isArray(router.query.page) ? router.query.page[0] : router.query.page;
  const parsed = parseInt(pageParam || '', 10);
  const hasPageQuery = !isNaN(parsed);
  let pageIndex = hasPageQuery ? parsed - 1 : 0;
  pageIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));

  // font size from query
  // const fontParam = Array.isArray(router.query.fontSize)
  //   ? router.query.fontSize[0]
  //   : router.query.fontSize;
  // const parsedFont = parseInt(fontParam || '', 10);
  // setFontSize(isNaN(parsedFont) ? defaultFontSize : parsedFont);

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
  // 章コンテンツが大きい場合はハッシュ化するのが本来望ましいが、
  // サンプルとして簡易に JSON.stringify を使う
  const cacheKey = React.useCallback(
    (fs: number) => {
      const chaptersJson = JSON.stringify(
        chapters.map((ch) => ({ title: ch.chapterTitle, contents: ch.chapterContents }))
      );
      return `pagerCache:${chaptersJson}:${pageWidth}:${padding}:${fs}`;
    },
    [chapters, pageWidth, padding]
  );

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
      // キャッシュ取得。なければ全フォント生成＆再取得
      const cached = getCache(chapters, pageWidth, padding, fontSize);
      if (cached) {
        setPageHTMLs(cached.pageHTMLs);
        setPageCount(cached.pageCount);
      } else {
        setIsBuildingCache(true);
      }
      return;
    }

    // 初回アクセス時に、すべてのフォントサイズでキャッシュ生成
    setIsBuildingCache(true);
  }, [router, hasPageQuery, cacheKey, chapters, fontSize, pageWidth, padding, pageCount]);

  // if (!innerRef.current) return;
  //     generateAllFontCaches(paraRefs.current, chapters, pageWidth, padding, fontSizeList);
  //     // 初期フォント用キャッシュを読み込む
  //     const initialCache = getCache(chapters, pageWidth, padding, fontSize);
  //     if (initialCache) {
  //       setPageHTMLs(initialCache.pageHTMLs);
  //       setPageCount(initialCache.pageCount);
  //     }
  //     router.replace(
  //       { pathname: router.pathname, query: { ...router.query, page: 1 } },
  //       undefined,
  //       { shallow: true }
  //     );

  // ──────────────────────────────────────────────────────────
  // 実際に生成が必要なタイミングでキャッシュを生成
  //──────────────────────────────────────────────────────────
  useEffect(() => {
    // isBuildingCache=true かつ innerRef がマウントされたら実行
    if (!isBuildingCache || !innerRef.current) return;

    // ページ分割用の hidden コンテナで DOM が揃った状態
    generateAllFontCaches(paraRefs.current, chapters, pageWidth, padding, fontSizeList);

    // 最終的に必要な fontSize のキャッシュを読み込む
    const loaded = getCache(chapters, pageWidth, padding, fontSize);
    if (loaded) {
      setPageHTMLs(loaded.pageHTMLs);
      setPageCount(loaded.pageCount);
    }

    // 初回アクセス時なら /?page=1 にジャンプ
    if (!hasPageQuery) {
      router.replace(
        { pathname: router.pathname, query: { ...router.query, page: 1 } },
        undefined,
        { shallow: true }
      );
    }

    // キャッシュ処理が完了したので、測定用コンテナを非表示
    setIsBuildingCache(false);
  }, [isBuildingCache, chapters, pageWidth, padding, fontSize, fontSizeList, hasPageQuery, router]);

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
    const newFontSize = parseInt(e.target.value, 10);

    // (1) 現在ページの先頭 50 文字を「指紋」として取っておく
    const snippet = pageHTMLs[pageIndex].slice(0, 50);
    setFingerprint(snippet);
    // (2) フォントを更新し、キャッシュから読み込み
    setFontSize(newFontSize);

    // キャッシュから読み込み：pageHTMLs と pageCount を新しいフォント用キャッシュで置き換え
    let newCache = getCache(chapters, pageWidth, padding, newFontSize);
    if (!newCache) {
      generateAllFontCaches(paraRefs.current, chapters, pageWidth, padding, fontSizeList);
      newCache = getCache(chapters, pageWidth, padding, newFontSize);
    }
    if (newCache) {
      setPageHTMLs(newCache.pageHTMLs);
      setPageCount(newCache.pageCount);
    }
  };

  // ──────────────────────────────────────────────────────────
  // フォント変更後に「指紋（スニペット）」を使って同じ箇所を探す
  //──────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!fingerprint) return;
    // ページごとの HTML を巡って、fingerprint を含むページを探す
    const targetPage = pageHTMLs.findIndex((html) =>
      html.includes(fingerprint)
    );
    if (targetPage !== -1) {
      router.push(
        { pathname: router.pathname, query: { ...router.query, page: targetPage + 1 } },
        undefined,
        { shallow: true }
      );
    }
    // 一度使ったらクリア
    setFingerprint(null);
  }, [pageHTMLs, fingerprint, router]);

  return (
    <>
      {(isBuildingCache || !hasPageQuery) && (
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
      {hasPageQuery && !isBuildingCache && pageHTMLs.length > 0 && (
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
              {fontSizeList.map((size) => (
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
