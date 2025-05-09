// pages/index.tsx
import Head from 'next/head';
import { Pager } from '../components/Pager';  // ①Pagerをインポート
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
        return '　' + fs.readFileSync(filePath, 'utf-8');
      } catch {
        return '　ファイルが見つかりません';
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
  return (
    <>
      <Head>
        <title>縦書き小説</title>
        <style>{`
          html, body, #__next {
            margin: 0;
            padding: 0;
            height: 100%;
          }
          #novel-window {
            writing-mode: vertical-rl;
            font-size: 18px;
            line-height: 1.5;
            font-family: '游明朝体', 'Noto Serif JP', serif;
          }
        `}</style>
      </Head>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
      }}>
        <Pager pageHeight={600} pageWidth={450} overlap={30}>
          {chapters.map((chapter, idx) => (
            <div key={idx}>
              <b>　{chapter.chapterTitle}</b>
              {chapter.chapterContents.flatMap((content, i) => [
                <p
                  key={i}
                  dangerouslySetInnerHTML={{
                    __html: content.replace(/\n/g, '<br>　'),
                  }}
                />,
                i < chapter.chapterContents.length - 1 && (
                  <p key={`${i}_sep`} style={{ textAlign: 'center' }}>
                    ＊＊＊
                  </p>
                ),
              ])}
            </div>
          ))}
        </Pager>
      </div>
    </>
  );
}