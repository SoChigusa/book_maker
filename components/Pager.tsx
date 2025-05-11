import React, { useRef, useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/router';

type PagerProps = {
  children: React.ReactNode;
  pageHeight: number;
  pageWidth: number;
  overlap: number;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
};

export function Pager({ children, pageWidth, pageHeight, overlap, fontSize, onFontSizeChange }: PagerProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null);

  const router = useRouter();

  const pageParam = Array.isArray(router.query.page) ? router.query.page[0] : router.query.page;
  const parsed = parseInt(pageParam || '', 10);
  let pageIndex = isNaN(parsed) ? 0 : parsed - 1;
  pageIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));

  useLayoutEffect(() => {
    if (!innerRef.current) return;
    const totalW = innerRef.current.scrollWidth;
    setPageCount(Math.ceil((totalW - overlap) / (pageWidth - overlap)));
  }, [children, pageWidth, overlap]);

  const goNext = () => {
    if (pageIndex < pageCount - 1) {
      const next = pageIndex + 2; // 1-based page
      router.push({ pathname: router.pathname, query: { ...router.query, page: next } }, undefined, { shallow: true });
    }
  };
  const goPrev = () => {
    if (pageIndex > 0) {
      const prev = pageIndex; // 1-based page
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
    onFontSizeChange(parseInt(e.target.value, 10));
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
            transform: `translateX(${pageIndex * (pageWidth - overlap)}px)`,
            transition: 'transform 0.3s'
          }}
        >
          {children}
        </div>
      </div>

      {/* Font-size selector */}
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
