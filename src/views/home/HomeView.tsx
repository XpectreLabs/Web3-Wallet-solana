import { FC, useEffect, useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { HistoryView } from '../history/HistoryView';

import { RecentActivity } from '../../components/RecentActivity';

// Scaffold hooks (unmodified)
import useUserSOLBalanceStore from '../../stores/useUserSOLBalanceStore';
import { notify } from '../../utils/notifications';
import { useNetworkConfiguration } from '../../contexts/NetworkConfigurationProvider';
import { useAutoConnect } from '../../contexts/AutoConnectProvider';

// Layout
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Tab } from '../../components/layout/Sidebar';
import ConnectWallet from '../../components/ConnectWallet';

// Views
import { HomeContent, SPLToken, tokenColor } from './HomeContent';
import { MarketSwapView } from '../market/MarketSwapView';
import { SendModal } from '../send/SendModal';
import { ReceiveModal } from '../receive/ReceiveModal';
import { BuyModal } from '../buy/BuyModal';
import { SettingsView } from '../settings/SettingsView';

/* ─────────────────────────────────────────────
   Network UI mapping
───────────────────────────────────────────── */
type NetworkUI = 'Mainnet' | 'Devnet' | 'Testnet';

const NET_MAP: Record<NetworkUI, string> = {
  Mainnet: 'mainnet-beta',
  Devnet: 'devnet',
  Testnet: 'testnet',
};

/* ═══════════════════════════════════════════════
   HomeView — Root Orchestrator
═══════════════════════════════════════════════ */
export const HomeView: FC = () => {
  // ── Solana hooks ──────────────────────────
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();
  const { balance, getUserSOLBalance, setBalance } = useUserSOLBalanceStore();
  const { networkConfiguration, setNetworkConfiguration } = useNetworkConfiguration();
  const { autoConnect, setAutoConnect } = useAutoConnect();

  // ── UI state ──────────────────────────────
  const [activeTabState, setActiveTabState] = useState<Tab>('home');
  const [lastTabChange, setLastTabChange] = useState<number>(0);
  const [globalSearch, setGlobalSearch] = useState('');

  const setActiveTab = useCallback(
    (tab: Tab) => {
      const now = Date.now();
      if (now - lastTabChange < 800) return; // 800ms cooldown to avoid API spam
      setLastTabChange(now);
      setActiveTabState(tab);
      if (tab !== 'history') {
        setGlobalSearch('');
      }
    },
    [lastTabChange]
  );
  
  const handleGlobalSearch = useCallback((query: string) => {
    setGlobalSearch(query);
    setActiveTab('history');
  }, [setActiveTab]);
  const [splTokens, setSplTokens] = useState<SPLToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [solPriceChange, setSolPriceChange] = useState<number | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);

  // Map networkConfiguration hook value to UI label
  const networkUI: NetworkUI =
    networkConfiguration === 'mainnet-beta' ? 'Mainnet' :
      networkConfiguration === 'testnet' ? 'Testnet' : 'Devnet';

  const setNetworkUI = useCallback(
    (n: NetworkUI) => {
      setNetworkConfiguration(NET_MAP[n]);
    },
    [setNetworkConfiguration]
  );



  // ── SOL/USD Price — CoinGecko primary, Jupiter fallback, 60s refresh ──
  useEffect(() => {
    let mounted = true;

    const fetchPrice = async () => {
      try {
        const r = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true',
          { signal: AbortSignal.timeout(8000) }
        );
        if (!r.ok) throw new Error('CoinGecko unavailable');
        const d = await r.json();
        if (mounted && d?.solana?.usd) {
          setSolPrice(d.solana.usd);
          setSolPriceChange(d.solana.usd_24h_change ?? null);
        }
      } catch {
        try {
          const r2 = await fetch(
            'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112'
          );
          if (!r2.ok) throw new Error('Jupiter unavailable');
          const d2 = await r2.json();
          const p =
            d2?.data?.['So11111111111111111111111111111111111111112']?.price;
          if (mounted && p) setSolPrice(parseFloat(p));
        } catch {
          /* Price unavailable — keep null */
        }
      }
    };

    fetchPrice();
    const id = setInterval(fetchPrice, 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  // ── SPL Token fetch ───────────────────────
  const fetchSPLTokens = useCallback(async () => {
    if (!publicKey) return;
    setLoadingTokens(true);
    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });
      const tokens: SPLToken[] = accounts.value
        .map((acc) => {
          const info = acc.account.data.parsed.info;
          const mint = info.mint as string;
          const amount = info.tokenAmount.uiAmount ?? 0;
          const symbol = mint.slice(0, 4).toUpperCase();
          return { mint, symbol, amount, color: tokenColor(symbol) };
        })
        .filter((t) => t.amount > 0);
      setSplTokens(tokens);
    } catch {
      notify({ type: 'error', message: 'Failed to load SPL tokens' });
    } finally {
      setLoadingTokens(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) fetchSPLTokens();
    else setSplTokens([]);
  }, [connected, publicKey, fetchSPLTokens]);


  // ── Fetch SOL & SPL Balances + Real-time Listener ─────────────────────
  useEffect(() => {
    if (!publicKey) return;

    // 1. Initial fetch on mount or wallet change
    getUserSOLBalance(publicKey, connection);

    // 2. Subscribe to wallet account changes (fires when SOL balance changes, e.g. paying fees)
    const subscriptionId = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        // Update store with new lamports directly (saves 1 RPC call)
        setBalance(accountInfo.lamports / LAMPORTS_PER_SOL);
        // SPL balances still need an RPC call (or their own websocket)
        fetchSPLTokens();
      },
      'confirmed'
    );

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [publicKey, connection, getUserSOLBalance, fetchSPLTokens, setBalance]);

  // ── Disconnect ────────────────────────────
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setActiveTab('home');
      setSplTokens([]);
      notify({ type: 'success', message: 'Wallet disconnected' });
    } catch {
      notify({ type: 'error', message: 'Failed to disconnect wallet' });
    }
  }, [disconnect]);

  const publicKeyStr = publicKey?.toBase58() ?? '';

  /* ═══════════════════════════════════════════
     STATE A — Not connected → Splash screen
  ═══════════════════════════════════════════ */
  if (!connected) {
    return <ConnectWallet />;
  }

  /* ═══════════════════════════════════════════
     STATE B — Connected → Dashboard
  ═══════════════════════════════════════════ */
  return (
    <>
      <DashboardLayout
        activeTab={activeTabState}
        setActiveTab={setActiveTab}
        publicKeyStr={publicKeyStr}
        networkUI={networkUI}
        setNetworkUI={setNetworkUI}
        autoConnect={autoConnect}
        setAutoConnect={setAutoConnect}
        onDisconnect={handleDisconnect}
        onGlobalSearch={handleGlobalSearch}
      >
        {activeTabState === 'home' && (
          <HomeContent
            balance={balance}
            solPrice={solPrice}
            solPriceChange={solPriceChange}
            splTokens={splTokens}
            loadingTokens={loadingTokens}
            setActiveTab={setActiveTab}
            onBuyClick={() => {
              if (networkUI === 'Mainnet') {
                setBuyModalOpen(true);
              } else {
                notify({ type: 'error', message: 'Buying SOL is only available on Mainnet.' });
              }
            }}
            onSendClick={() => setSendModalOpen(true)}
            onSwapClick={() => setSwapModalOpen(true)}
            onReceiveClick={() => setReceiveModalOpen(true)}
          />
        )}

        {activeTabState === 'history' && (
          <HistoryView initialSearch={globalSearch} />
        )}

        {activeTabState === 'settings' && (
          <SettingsView
            publicKeyStr={publicKeyStr}
            networkUI={networkUI}
            setNetworkUI={setNetworkUI}
            autoConnect={autoConnect}
            setAutoConnect={setAutoConnect}
            onDisconnect={handleDisconnect}
          />
        )}
      </DashboardLayout>
      <BuyModal isOpen={buyModalOpen} onClose={() => setBuyModalOpen(false)} />
      <SendModal isOpen={sendModalOpen} onClose={() => setSendModalOpen(false)} />
      <MarketSwapView isOpen={swapModalOpen} onClose={() => setSwapModalOpen(false)} solBalance={balance} />
      <ReceiveModal isOpen={receiveModalOpen} onClose={() => setReceiveModalOpen(false)} />
    </>
  );
};
