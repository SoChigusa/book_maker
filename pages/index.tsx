// pages/index.tsx
import React, { useRef, useState, useEffect } from 'react';
import Head from 'next/head';
import { Pager } from '../components/Pager';
import chapters from '../chapters.json';
import fs from 'fs';
import path from 'path';
import type Chapter from '../app/types';

export const getStaticProps = async (): Promise<{
  props: {
    chapters: Chapter[];
  };
}> => {
  const updatedChapters = chapters.map((chapter) => {
    const chapterContents = chapter.chapterContents.map((file) => {
      const filePath = path.join(process.cwd(), file);
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const sanitized = raw
          .replace(/…/g, '︙')
          .replace(/\.{3}/g, '︙')
          .replace(/――/g, '\u2500\u2500')
          .replace(/\[([^\]]+)\]\{([^\}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
        return sanitized;
      } catch {
        return 'ファイルが見つかりません。';
      }
    });
    return { ...chapter, chapterContents };
  });

  return {
    props: {
      chapters: updatedChapters,
    },
  };
};

interface NovelProps {
  chapters: Chapter[];
}

export default function Novel({ chapters }: NovelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paraRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [padMap, setPadMap] = useState<Record<string, number>>({});

  const PAGE_WIDTH = 450;

  // After mount, compute positions and mark paragraphs at page boundaries, and compute right padding
  useEffect(() => {
    if (!paraRefs.current['0_title']) return;
    const baseline = paraRefs.current['0_title'].offsetLeft + paraRefs.current['0_title'].offsetWidth;
    const newPadMap: Record<string, number> = {};
    let cumulativePad = 0;
    Object.entries(paraRefs.current).forEach(([key, el]) => {
      if (!el) return;
      if (key === '0_title') return;
      const originalRight = el.offsetLeft + el.offsetWidth;
      const relative = baseline - (originalRight - cumulativePad);
      const mod = relative % PAGE_WIDTH;
      if (mod + el.offsetWidth > PAGE_WIDTH || key.includes('_title')) {
        const pad = PAGE_WIDTH - mod;
        newPadMap[key] = pad;
        cumulativePad += pad;
      }
    });
    setPadMap(newPadMap);
  }, [chapters]);

  return (
    <>
      <Head>
        <title>縦書き小説</title>
      </Head>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
        }}
      >
        <div ref={containerRef}>
          <Pager pageHeight={600} pageWidth={PAGE_WIDTH} overlap={0}>
            {chapters.map((chapter, idx) => {
              const keyNameTitle = `${idx}_title`;
              return (
                <div key={idx}>
                  <div
                    ref={(el) => {
                      paraRefs.current[keyNameTitle] = el;
                    }}
                    style={{
                      paddingRight: padMap[keyNameTitle] !== undefined ? `${padMap[keyNameTitle]}px` : undefined,
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
                            style={{
                              // backgroundColor: highlighted.has(keyName)
                              //   ? 'rgba(255,230,230,0.7)'
                              //   : undefined,
                              paddingRight: padMap[keyName] !== undefined ? `${padMap[keyName]}px` : undefined,
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
          </Pager>
        </div>
      </div>
    </>
  );
}
