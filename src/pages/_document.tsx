import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx)
    return initialProps
  }

  render() {
    return (
      <Html data-theme="solana">
        <Head>
          <link rel="shortcut icon" href="/favicon.ico" />
          {/* Inter font — non-blocking load to avoid render-blocking resource (Lighthouse) */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* Step 1: preload tells the browser to fetch early but not block rendering */}
          <link
            rel="preload"
            as="style"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          />
          {/* Step 2: load as print (invisible), then switch to 'all' once loaded */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
            media="print"
            // @ts-ignore — onLoad is valid HTML but TS doesn't type it on <link>
            onLoad="this.media='all'"
          />
          {/* Fallback for browsers with JavaScript disabled */}
          <noscript>
            <link
              rel="stylesheet"
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
            />
          </noscript>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
