import { useRef, useState, useLayoutEffect } from 'react';

type PagerProps = {
  children: React.ReactNode;
  pageHeight: number;
  pageWidth: number;
  overlap: number;
};

export function Pager({ children, pageWidth, pageHeight, overlap }: PagerProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [pageIndex, setPageIndex] = useState(0);
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null);

  useLayoutEffect(() => {
    if (!innerRef.current) return;
    const totalW = innerRef.current.scrollWidth;
    setPageCount(Math.ceil((totalW - overlap) / (pageWidth - overlap)));
  }, [children, pageWidth, overlap]);

  const goNext = () => setPageIndex(i => Math.min(i + 1, pageCount - 1));
  const goPrev = () => setPageIndex(i => Math.max(i - 1, 0));

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

  return (
    <div
      className='novel-window'
      ref={containerRef}
      onMouseEnter={handleMouseMove}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleZoneClick}
      style={{
        position: 'relative',
        display: 'inline-block',
        cursor: 'pointer',
      }}
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
      <div style={{
        position: 'relative',
        width: pageWidth,
        height: pageHeight + 14,
        overflow: 'hidden',
        padding: '7px 3px',
        zIndex: 0,
        boxSizing: 'border-box',
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
