// src/pages/_app.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs original scaffold:
//   - Removed: <AppBar />, <Footer />, <ContentContainer />
//   - Full background: #10131c with gold radial glow at top-center (fixed, zIndex 0)
//   - <ContextProvider> and <Notifications /> remain unchanged
//   - <Component /> renders directly without generic wrappers
// ─────────────────────────────────────────────────────────────────────────────// src/pages/_app.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs original scaffold:
//   - Removed: <AppBar />, <Footer />, <ContentContainer />
//   - Full background: #10131c with gold radial glow at top-center (fixed, zIndex 0)
//   - <ContextProvider> and <Notifications /> remain unchanged
//   - <Component /> renders directly without generic wrappers
// ─────────────────────────────────────────────────────────────────────────────

import { AppProps } from 'next/app';
import Head from 'next/head';
import { FC } from 'react';
import { ContextProvider } from '../contexts/ContextProvider';
import Notifications from '../components/Notification';

require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.css');

const App: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <title>Xpectre Wallet</title>
        <meta name="description" content="Xpectre Labs — Solana Web3 Wallet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <ContextProvider>
        {/*
          Root shell: covers 100vw / 100vh, background color #10131c.
          The gold radial glow is set as a decorative layer (z-index 0).
          The actual content goes at z-index 1.
        */}
        <div
          style={{
            backgroundColor: '#10131c',
            minHeight: '100vh',
            width: '100%',
            position: 'relative',
            fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          }}
        >
          {/* ── Radial gold glow — decorative, non-interactive ── */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              width: '100%',
              height: 420,
              background:
                'radial-gradient(circle at top center, rgba(222,160,1,0.10) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {/* ── Global notifications (toast) ── */}
          <Notifications />

          {/* ── Active page ── */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Component {...pageProps} />
          </div>
        </div>
      </ContextProvider>
    </>
  );
};

export default App;
