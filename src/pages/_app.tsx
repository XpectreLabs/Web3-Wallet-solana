// src/pages/_app.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Xpectre Wallet — App Shell
// - Full dark background (#121921) with decorative gold radial glow
// - ContextProvider wraps all Solana wallet adapters + network config
// - Notifications (toast) system from scaffold
// ─────────────────────────────────────────────────────────────────────────────

import { AppProps } from 'next/app';
import Head from 'next/head';
import { FC, useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { ContextProvider } from '../contexts/ContextProvider';
import Notifications from '../components/Notification';

require('@solana/wallet-adapter-react-ui/styles.css');
require('../styles/globals.css');

const App: FC<AppProps> = ({ Component, pageProps }) => {
  const [isConnectionLost, setIsConnectionLost] = useState(false);

  useEffect(() => {
    // 1. Force HTTPS redirect
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'http:' &&
      !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ) {
      window.location.href = window.location.href.replace('http:', 'https:');
    }

    // 2. Connectivity event handlers
    const handleOnline = () => setIsConnectionLost(false);
    const handleOffline = () => setIsConnectionLost(true);
    const handleCustomLoss = () => setIsConnectionLost(true);

    if (typeof window !== 'undefined') {
      if (!window.navigator.onLine) {
        setIsConnectionLost(true);
      }
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('xpectre_connection_lost', handleCustomLoss);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('xpectre_connection_lost', handleCustomLoss);
      }
    };
  }, []);

  if (isConnectionLost) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 text-center"
        style={{
          backgroundColor: '#10131c',
          background: 'radial-gradient(circle at center, #1b2030 0%, #10131c 100%)',
          fontFamily: 'sans-serif'
        }}
      >
        <div
          className="p-8 rounded-[28px] border max-w-sm w-full animate-in fade-in zoom-in duration-300"
          style={{
            backgroundColor: 'rgba(24, 28, 39, 0.7)',
            borderColor: 'rgba(222, 160, 1, 0.1)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)'
          }}
        >
          <div className="w-16 h-16 rounded-full bg-[#ff4a4a]/10 flex items-center justify-center mx-auto mb-6 border border-[#ff4a4a]/20">
            <WifiOff size={32} className="text-[#ff4a4a]" />
          </div>
          <h2 className="text-white text-xl font-bold mb-3">Connection Lost</h2>
          <p className="text-[#7a8fa6] text-[14px] leading-relaxed mb-8">
            The connection to the network was lost. Please verify your internet connection or try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#dea001] text-[#10131c] rounded-2xl py-3.5 text-[15px] font-bold transition-all border-none cursor-pointer hover:brightness-110 flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> Reconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Xpectre Wallet</title>
        <meta name="description" content="Xpectre Labs — Solana Web3 Wallet Dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#121921" />
        <meta property="og:title" content="Xpectre Wallet" />
        <meta property="og:description" content="Xpectre Labs — Solana Web3 Wallet" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Xpectre Wallet" />
        <meta name="twitter:description" content="Xpectre Labs — Solana Web3 Wallet" />
      </Head>

      <ContextProvider>
        {/* Root shell */}
        <div className="relative min-h-screen flex flex-col font-sans" style={{ backgroundColor: '#121921', color: '#f0f4f8' }}>

{/* Decorative gold radial glow (Animated) */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-0 pointer-events-none animate-in fade-in duration-[1500ms] ease-in-out"
            style={{
              background: 'radial-gradient(circle at top center, rgba(222, 160, 1, 0.15) 0%, transparent 60%)',
            }}
          />

          {/* Toast notifications */}
          <Notifications />

          {/* Active page */}
          <div className="relative z-10 flex-1 w-full flex flex-col">
            <Component {...pageProps} />
          </div>

        </div>
      </ContextProvider>
    </>
  );
};

export default App;