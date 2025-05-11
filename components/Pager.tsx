import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { useRouter } from 'next/router';
import Chapter from '@/app/types';

type PagerProps = {
  pageHeight: number;
  pageWidth: number;
  paddingX: number;
  defaultFontSize: number;
  chapters: Chapter[];
};

export function Pager({ pageWidth, pageHeight, paddingX, defaultFontSize, chapters }: PagerProps) {
  const router = useRouter();
  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const paraRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [pageCount, setPageCount] = useState(1);
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null);

  // page number from query
  const pageParam = Array.isArray(router.query.page) ? router.query.page[0] : router.query.page;
  const parsed = parseInt(pageParam || '', 10);
  let pageIndex = isNaN(parsed) ? 0 : parsed - 1;
  pageIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));

  // font size from query
  const fontParam = Array.isArray(router.query.fontSize)
    ? router.query.fontSize[0]
    : router.query.fontSize;
  const parsedFont = parseInt(fontParam || '', 10);
  const fontSize = isNaN(parsedFont) ? defaultFontSize : parsedFont;

  // padding adjustment
  useEffect(() => {
    Object.values(paraRefs.current).forEach(el => {
      if (el) {
        el.style.paddingRight = '';
      }
    });
    if (!paraRefs.current['0_title']) return;
    const baseline = paraRefs.current['0_title'].offsetLeft + paraRefs.current['0_title'].offsetWidth;
    let cumulativePad = 0;
    Object.entries(paraRefs.current).forEach(([key, el]) => {
      if (!el) return;
      if (key === '0_title') return;
      const originalRight = el.offsetLeft + el.offsetWidth;
      const relative = baseline - (originalRight - cumulativePad);
      const mod = relative % pageWidth;
      if (mod + el.offsetWidth > pageWidth - paddingX || key.includes('_title')) {
        const pad = pageWidth + paddingX - mod;
        el.style.paddingRight = `${pad}px`;
        cumulativePad += pad;
      }
    });
  }, [chapters, fontSize]);

  // page count adjustment
  useLayoutEffect(() => {
    if (!innerRef.current) return;
    const totalW = innerRef.current.scrollWidth;
    setPageCount(Math.ceil(totalW / pageWidth));
  }, [chapters, pageWidth, fontSize]);

  const goNext = () => {
    if (pageIndex < pageCount - 1) {
      const next = pageIndex + 2;
      router.push({ pathname: router.pathname, query: { ...router.query, page: next } }, undefined, { shallow: true });
    }
  };
  const goPrev = () => {
    if (pageIndex > 0) {
      const prev = pageIndex;
      router.push({ pathname: router.pathname, query: { ...router.query, page: prev } }, undefined, { shallow: true });
    }
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
      goPrev();
    } else {
      goNext();
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFontSize = parseInt(e.target.value, 10);
    router.push(
      { pathname: router.pathname, query: { ...router.query, fontSize: newFontSize } },
      undefined,
      { shallow: true }
    );
  };

  return (
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
        width: pageWidth,
        height: pageHeight + 14,
        overflow: 'hidden',
        padding: '7px 3px',
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
          ref={innerRef}
          style={{
            height: pageHeight,
            WebkitColumnWidth: pageWidth,
            columnWidth: pageWidth,
            columnGap: 0,
            WebkitColumnFill: 'auto',
            columnFill: 'auto',
            transform: `translateX(${pageIndex * pageWidth}px)`,
            transition: 'transform 0.3s'
          }}
        >
          {chapters.map((chapter, idx) => {
            const keyNameTitle = `${idx}_title`;
            return (
              <div key={idx}>
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
                      return (
                        <div
                          key={keyName}
                          ref={(el) => {
                            paraRefs.current[keyName] = el;
                          }}
                        >
                          <p
                            className={line.trim().startsWith('「') ? 'conversation' : 'descriptive'}
                            dangerouslySetInnerHTML={{ __html: line }}
                          />
                        </div>
                      );
                    }),
                    i < chapter.chapterContents.length - 1 && (
                      <p
                        key={`${i}_sep`}
                        style={{ textAlign: 'center', paddingRight: '1em', paddingLeft: '1em' }}>
                        ＊＊＊
                      </p>
                    ),
                  ].filter(Boolean)
                )}
              </div>
            )
          })}
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
    </div>
  );
}
