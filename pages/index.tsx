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
          // .replace(/…/g, '︙')
          // .replace(/\.{3}/g, '︙')
          .replace(/――/g, '\u2500\u2500')
          .replace(/“/g, '\u301D')
          .replace(/”/g, '\u301F')
          .replace(/([A-Za-z])/g, '<span class="alphabet">$1</span>')
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


  return (
    <>
      <Head>
        <title>縦書き小説ビューワー</title>
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
        <Pager
          pageHeight={600}
          pageWidth={480}
          paddingX={7}
          defaultFontSize={16}
          chapters={chapters}
        />
      </div>
    </>
  );
}
