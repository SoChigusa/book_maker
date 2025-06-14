type TextElementProps = {
  pageHeight: number;
  elementKey: 'title' | 'mainText' | 'mainTextTail' | 'divider';
  text: string;
}

const TextElement = ({ pageHeight, elementKey, text }: TextElementProps) => {
  switch (elementKey) {
    case 'title':
      return (
        <div
          style={{
            height: pageHeight,
          }}
        >
          <h4>{text}</h4>
        </div>
      );

    case 'divider':
      return (
        <div
          style={{
            height: pageHeight,
          }}
        >
          <p
            style={{ textAlign: 'center', paddingRight: '1em', paddingLeft: '1em' }}>
            ＊＊＊
          </p>
        </div >
      );

    default:
      return (
        <div
          style={{
            height: pageHeight,
          }}
        >
          {text == '' ? (
            <br />
          ) : (
            <p
              className={/^[「（]/.test(text.trim()) || elementKey == 'mainTextTail' ? 'conversation' : 'descriptive'}
              dangerouslySetInnerHTML={{ __html: text }}
            />
          )
          }
        </div>
      );

  }
};

export default TextElement;