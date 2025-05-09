import { useRef, useState, useEffect, useLayoutEffect } from 'react';

type PagerProps = {
  children: React.ReactNode;
  pageHeight: number;
  pageWidth: number;
  overlap: number;
};

export function Pager({ children, pageWidth, pageHeight, overlap }: PagerProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);

  useLayoutEffect(() => {
    if (!innerRef.current) return;
    const totalW = innerRef.current.scrollWidth;
    setPageCount(Math.ceil((totalW - overlap) / (pageWidth - overlap)));
  }, [children, pageWidth]);

  const goNext = () => setPageIndex(i => Math.min(i + 1, pageCount - 1));
  const goPrev = () => setPageIndex(i => Math.max(i - 1, 0));

  return (
    <div id='novel-window' style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        position: 'relative',
        width: pageWidth,
        height: pageHeight,
        overflow: 'hidden',
        padding: '3px',
        border: '2px solid #666',
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
            transform: `translateX(${pageIndex * (pageWidth - overlap)}px)`,
            transition: 'transform 0.3s'
          }}
        >
          {children}
        </div>
      </div>

      <button
        onClick={goNext}
        disabled={pageIndex === pageCount - 1}
        style={{ position: 'absolute', top: 10, left: 10, writingMode: 'horizontal-tb' }}
      >次へ ◀</button>
      <button
        onClick={goPrev}
        disabled={pageIndex === 0}
        style={{ position: 'absolute', bottom: 10, right: 10, writingMode: 'horizontal-tb' }}
      >▶ 前へ</button>
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