import { FC, useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Search, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  LogOut, BarChart2, Settings, Home, ShoppingCart,
  BarChart, Copy, RefreshCcw, ChevronDown,
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// ── Scaffold hooks (unmodified) ──────────────────────────────────────────
import useUserSOLBalanceStore from '../../stores/useUserSOLBalanceStore';
import { notify } from '../../utils/notifications';
import { useNetworkConfiguration } from '../../contexts/NetworkConfigurationProvider';
import { useAutoConnect } from '../../contexts/AutoConnectProvider';

// ── WalletMultiButton with SSR disabled (required in Next.js) ──────────
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);
const WalletDisconnectButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletDisconnectButton,
  { ssr: false }
);

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════════════════ */
const C = {
  bg:           '#10131c',
  surface:      'rgba(255,255,255,0.03)',
  surfaceSolid: '#181c27',   // solid background for dropdowns
  gold:         '#dc9e00',
  text:         '#ffffff',
  muted:        '#7a8fa6',
  green:        '#4ade80',
  red:          '#ff4a4a',
  border:       'rgba(222,160,1,0.10)',
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
type Tab         = 'home' | 'market' | 'settings';
// Only Mainnet and Devnet are secure; Testnet is the UI name for Devnet.
// ‘localnet’ is excluded: the ContextProvider does not handle it reliably.
type NetworkUI   = 'Mainnet' | 'Devnet' | 'Testnet';

// Map UI → hook useNetworkConfiguration value
const NET_MAP: Record<NetworkUI, string> = {
  Mainnet: 'mainnet-beta',
  Devnet:  'devnet',
  Testnet: 'devnet',   // “testnet-beta” does not exist in clusterApiUrl; it points to devnet
};

interface SPLToken { mint: string; symbol: string; amount: number; color: string; }

const TOKEN_COLORS: Record<string, string> = {
  SOL: '#9945FF', USDC: '#2775CA', RAY: '#5AC4BE', BONK: '#F7931A',
  JUP: '#19FB9B', PYTH: '#6C4ED9', JITO: '#16C784', WIF: '#E44E9E',
};

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function truncate(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function tokenColor(symbol: string) {
  return TOKEN_COLORS[symbol] ?? '#7a8fa6';
}

/* ── Toggle button reusable ─────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-label="Toggle"
      style={{
        width: 44, height: 24,
        backgroundColor: checked ? C.gold : 'transparent',
        border: `1px solid ${checked ? C.gold : C.border}`,
        borderRadius: 12, position: 'relative',
        cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2,
        width: 18, height: 18,
        backgroundColor: checked ? '#10131c' : C.muted,
        borderRadius: '50%', transition: 'all 0.2s',
      }} />
    </button>
  );
}

/* ── Skeleton row ───────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 13, width: '35%', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <div style={{ height: 11, width: '20%', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.04)' }} />
      </div>
      <div style={{ height: 13, width: 60, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

/* ── XL Hexagon logo SVG ────────────────────────────────────────────────── */
function HexLogo({ size = 24 }: { size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 2L43.0526 13V35L24 46L4.94744 35V13L24 2Z"
        fill={C.surface} stroke={C.gold} strokeWidth="2.5" />
      <path d="M23 28H25V32H23V28Z" fill={C.gold} />
      <circle cx="18" cy="22" r="2.5" fill={C.gold} />
      <circle cx="30" cy="22" r="2.5" fill={C.gold} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SPLASH SCREEN (STATE A — wallet not connected)
═══════════════════════════════════════════════════════════════════════════ */
function SplashScreen() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 24px', minHeight: '100vh',
      width: '100%', maxWidth: 600, margin: '0 auto',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 28 }}>
        <HexLogo size={64} />
      </div>

      {/* Headline */}
      <h1 style={{
        color: C.text, fontSize: 32, fontWeight: 800,
        textAlign: 'center', margin: '0 0 12px',
      }}>
        Access your Crypto
      </h1>
      <p style={{
        color: C.muted, fontSize: 14, textAlign: 'center',
        lineHeight: 1.65, maxWidth: 280, margin: '0 0 48px',
      }}>
        Manage Solana & EVM assets securely in one place
      </p>

      {/*
        WalletMultiButton styled as a flat gold button.
        The !bg-[…] classes use the Tailwind modifier to override
        the base styles of the wallet adapter. If Tailwind JIT is not active,
        it uses the style prop as a fallback instead.
      */}
      <WalletMultiButtonDynamic
        className="!bg-[#dea001] !text-[#10131c] !rounded-2xl !font-extrabold !text-lg !px-10 !py-5 !border-0 !shadow-none hover:!opacity-90 !transition-opacity !w-full"
        style={{
          width: '100%', maxWidth: 360,
          backgroundColor: C.gold, color: C.bg,
          borderRadius: 16, border: 'none',
          padding: '18px 0', fontSize: 18, fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        Connect Wallet
      </WalletMultiButtonDynamic>

      <div style={{ height: 80 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL HEADER — glassmorphism full-width
═══════════════════════════════════════════════════════════════════════════ */
interface HeaderProps {
  publicKeyStr:    string;
  networkUI:       NetworkUI;
  setNetworkUI:    (n: NetworkUI) => void;
  autoConnect:     boolean;
  setAutoConnect:  (v: boolean) => void;
  onDisconnect:    () => void;
  onCopyAddress:   () => void;
}

function GlobalHeader({
  publicKeyStr, networkUI, setNetworkUI,
  autoConnect, setAutoConnect, onDisconnect, onCopyAddress,
}: HeaderProps) {
  const [walletOpen,   setWalletOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const walletRef   = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close by clicking outside the window
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (walletRef.current   && !walletRef.current.contains(e.target   as Node)) setWalletOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dropdownBase: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 12px)', right: 0,
    backgroundColor: C.surfaceSolid,
    border: `1px solid ${C.border}`, borderRadius: 12,
    padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
    zIndex: 50,
  };

  const dropItemBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px', borderRadius: 8,
    backgroundColor: 'transparent', border: 'none',
    color: C.text, cursor: 'pointer', textAlign: 'left',
    fontSize: 13, fontWeight: 500, width: '100%',
  };

  return (
    <header style={{
      width: '100%',
      borderBottom: `1px solid ${C.border}`,
      position: 'sticky', top: 0, zIndex: 40,
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: 'rgba(16,19,28,0.60)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
    }}>
      {/* ── Logo ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <HexLogo size={24} />
        <span style={{ color: C.text, fontSize: 16, fontWeight: 700, letterSpacing: '-0.5px' }}>
          Xpectre
        </span>
      </div>

      {/* ── Right actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Wallet dropdown */}
        <div ref={walletRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setWalletOpen(!walletOpen); setSettingsOpen(false); }}
            style={{
              backgroundColor: walletOpen ? 'rgba(222,160,1,0.10)' : C.surface,
              borderRadius: 20, padding: '7px 14px',
              border: `1px solid ${walletOpen ? C.gold : C.border}`,
              display: 'flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', transition: 'all 0.18s',
            }}
          >
            <span style={{ color: C.text, fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
              {truncate(publicKeyStr)}
            </span>
            <ChevronDown
              size={14} color={C.muted}
              style={{ transform: walletOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </button>

          {walletOpen && (
            <div style={{ ...dropdownBase, width: 190 }}>
              <button style={dropItemBase} onClick={onCopyAddress}>
                <Copy size={14} color={C.muted} /> Copy address
              </button>
              {/* “Change wallet” opens the wallet adapter's native modal; this menu may be removed, and the base screen may appear when the button is clicked. */}
              <WalletMultiButtonDynamic
                style={{
                  ...dropItemBase,
                  backgroundColor: 'transparent',
                  boxShadow: 'none', height: 'auto',
                }}
              >
                <RefreshCcw size={14} color={C.muted} />
                <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500 }}>Change wallet</span>
              </WalletMultiButtonDynamic>
              <div style={{ height: 1, backgroundColor: C.border, margin: '4px 0' }} />
              <button style={{ ...dropItemBase, color: C.red }} onClick={onDisconnect}>
                <LogOut size={14} color={C.red} /> Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Settings dropdown */}
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setSettingsOpen(!settingsOpen); setWalletOpen(false); }}
            style={{
              backgroundColor: settingsOpen ? 'rgba(222,160,1,0.10)' : C.surface,
              borderRadius: '50%', width: 36, height: 36,
              border: `1px solid ${settingsOpen ? C.gold : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0,
            }}
          >
            <Settings size={17} color={settingsOpen ? C.gold : C.muted} />
          </button>

          {settingsOpen && (
            <div style={{ ...dropdownBase, width: 220, padding: 14, gap: 14 }}>
              {/* Autoconnect */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>Autoconnect</span>
                <Toggle checked={autoConnect} onChange={() => setAutoConnect(!autoConnect)} />
              </div>
              <div style={{ height: 1, backgroundColor: C.border }} />
              {/* Network */}
              <div>
                <span style={{ color: C.muted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  Network
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(['Mainnet', 'Devnet', 'Testnet'] as NetworkUI[]).map(net => (
                    <button
                      key={net}
                      onClick={() => setNetworkUI(net)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: networkUI === net ? 'rgba(222,160,1,0.10)' : 'transparent',
                        color: networkUI === net ? C.gold : C.text,
                        border: `1px solid ${networkUI === net ? C.gold : 'transparent'}`,
                        borderRadius: 8, fontWeight: 500, fontSize: 13,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONDITIONAL SEARCH BAR (non functional, only UI) — hidden in Settings
═══════════════════════════════════════════════════════════════════════════ */
function ConditionalSearchBar({ activeTab }: { activeTab: Tab }) {
  if (activeTab === 'settings') return null;
  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: '16px 16px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        backgroundColor: C.surface, borderRadius: 16,
        padding: '13px 16px', border: `1px solid ${C.border}`,
      }}>
        <Search size={16} color={C.muted} />
        <input
          placeholder="Search assets..."
          style={{ background: 'none', border: 'none', outline: 'none', color: C.text, fontSize: 15, width: '100%' }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOME TAB
═══════════════════════════════════════════════════════════════════════════ */
function HomeTab({
  balance, solPrice, splTokens, loadingTokens, onRefreshTokens,
}: {
  balance: number;
  solPrice: number | null;
  splTokens: SPLToken[];
  loadingTokens: boolean;
  onRefreshTokens: () => void;
}) {
  const fiatValue = solPrice ? (balance * solPrice).toFixed(2) : '0.00';

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Balance Card ── */}
      <div style={{
        backgroundColor: C.surface, borderRadius: 16,
        border: `1px solid ${C.border}`, padding: 24,
      }}>
        {/* Live price indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: solPrice ? C.green : C.muted,
          }} />
          <span style={{ color: solPrice ? C.green : C.muted, fontSize: 13, fontWeight: 600 }}>
            {solPrice ? `Live • 1 SOL = $${solPrice.toFixed(2)}` : 'Fetching price...'}
          </span>
        </div>

        {/* SOL balance */}
        <p style={{ color: C.text, fontSize: 44, fontWeight: 800, lineHeight: 1, margin: 0 }}>
          {balance.toFixed(4)}{' '}
          <span style={{ fontSize: 22, fontWeight: 500, color: C.muted }}>SOL</span>
        </p>
        <p style={{ color: C.muted, fontSize: 16, margin: '8px 0 0' }}>
          ${fiatValue} USD
        </p>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 24 }}>
          {[
            { label: 'Buy',     icon: <ShoppingCart   size={20} color={C.gold} /> },
            { label: 'Swap',    icon: <ArrowLeftRight  size={20} color={C.gold} /> },
            { label: 'Send',    icon: <ArrowUpRight    size={20} color={C.gold} /> },
            { label: 'Receive', icon: <ArrowDownLeft   size={20} color={C.gold} /> },
          ].map(a => (
            <button
              key={a.label}
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 16, padding: '14px 4px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}
            >
              {a.icon}
              <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Your Assets ── */}
      <div>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
          Your Assets
        </h2>
        <div style={{
          backgroundColor: C.surface, borderRadius: 16,
          border: `1px solid ${C.border}`, overflow: 'hidden',
        }}>
          {/* SOL — siempre primero */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px', borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              backgroundColor: 'rgba(153,69,255,0.10)',
              border: '1px solid rgba(153,69,255,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#9945FF', fontSize: 12, fontWeight: 700 }}>SOL</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>Solana</p>
              <p style={{ color: C.muted, fontSize: 13, margin: '2px 0 0' }}>{balance.toFixed(4)} SOL</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>${fiatValue}</p>
            </div>
          </div>

          {/* Skeletons mientras carga */}
          {loadingTokens && <><SkeletonRow /><SkeletonRow /></>}

          {/* Tokens SPL reales */}
          {!loadingTokens && splTokens.map((token, i) => (
            <div
              key={token.mint}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
                borderBottom: i < splTokens.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                backgroundColor: token.color + '1a',
                border: `1px solid ${token.color}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: token.color, fontSize: 10, fontWeight: 700 }}>
                  {token.symbol.slice(0, 4)}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>{token.symbol}</p>
                <p style={{ color: C.muted, fontSize: 12, margin: '2px 0 0', fontFamily: 'monospace' }}>
                  {token.mint.slice(0, 8)}...
                </p>
              </div>
              <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: 0 }}>
                {token.amount.toLocaleString()}
              </p>
            </div>
          ))}

          {/* Empty state */}
          {!loadingTokens && splTokens.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>No other assets found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MARKET TAB — empty state
═══════════════════════════════════════════════════════════════════════════ */
function MarketTab() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 16, minHeight: '60vh',
    }}>
      <BarChart size={52} color={C.muted} style={{ marginBottom: 16 }} />
      <p style={{ color: C.muted, fontSize: 16, fontWeight: 600, margin: 0 }}>coming soon</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SETTINGS TAB
   ⚠️  NetworkUI 'Testnet' → hook 'devnet' (testnet-beta dont exist in clusterApiUrl)
   ⚠️  without 'localnet' option to evade crashes
═══════════════════════════════════════════════════════════════════════════ */
function SettingsTab({
  onDisconnect, publicKeyStr,
  networkUI, setNetworkUI,
  autoConnect, setAutoConnect,
}: {
  onDisconnect:   () => void;
  publicKeyStr:   string;
  networkUI:      NetworkUI;
  setNetworkUI:   (n: NetworkUI) => void;
  autoConnect:    boolean;
  setAutoConnect: (v: boolean) => void;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(publicKeyStr);
    notify({ type: 'success', message: '¡Dirección copiada!' });
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>

      {/* ── Wallet Management ── */}
      <div>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
          Wallet Management
        </h2>
        <div style={{
          backgroundColor: C.surface, borderRadius: 16,
          border: `1px solid ${C.border}`, overflow: 'hidden',
        }}>
          {/* Copy address */}
          <button
            onClick={handleCopy}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '16px', backgroundColor: 'transparent', border: 'none',
              borderBottom: `1px solid ${C.border}`, color: C.text,
              cursor: 'pointer', fontSize: 15, fontWeight: 500,
            }}
          >
            <Copy size={18} color={C.muted} /> Copy address
          </button>

          {/* Change wallet → abre modal nativo */}
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <WalletMultiButtonDynamic
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '16px', backgroundColor: 'transparent',
                border: 'none', color: C.text,
                cursor: 'pointer', fontSize: 15, fontWeight: 500,
                boxShadow: 'none', height: 'auto', borderRadius: 0,
              }}
            >
              <RefreshCcw size={18} color={C.muted} />
              <span>Change wallet</span>
            </WalletMultiButtonDynamic>
          </div>

          {/* Disconnect */}
          <button
            onClick={onDisconnect}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '16px', backgroundColor: 'transparent', border: 'none',
              color: C.red, cursor: 'pointer', fontSize: 15, fontWeight: 500,
            }}
          >
            <LogOut size={18} color={C.red} /> Disconnect
          </button>
        </div>
      </div>

      {/* ── Networks and Nodes ── */}
      <div>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
          Networks and nodes
        </h2>
        <div style={{
          backgroundColor: C.surface, borderRadius: 16,
          border: `1px solid ${C.border}`, padding: 16,
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {(['Mainnet', 'Devnet', 'Testnet'] as NetworkUI[]).map(net => (
              <button
                key={net}
                onClick={() => setNetworkUI(net)}
                style={{
                  flex: 1, padding: '12px 0',
                  backgroundColor: networkUI === net ? C.gold : 'transparent',
                  color: networkUI === net ? '#10131c' : C.text,
                  border: `1px solid ${networkUI === net ? C.gold : C.border}`,
                  borderRadius: 16, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                {net}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Preferences ── */}
      <div>
        <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>
          Preferences
        </h2>
        <div style={{
          backgroundColor: C.surface, borderRadius: 16,
          border: `1px solid ${C.border}`, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>Autoconnect</span>
            <Toggle checked={autoConnect} onChange={() => setAutoConnect(!autoConnect)} />
          </div>
          <p style={{ color: C.muted, fontSize: 12, margin: '6px 0 0' }}>
            Automatically reconnect the wallet when recharging
          </p>
        </div>
      </div>

      <p style={{ color: C.muted, fontSize: 11, textAlign: 'center', margin: 0 }}>
        Xpectre Labs v1.0 · Build 2026.06
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOTTOM NAV
═══════════════════════════════════════════════════════════════════════════ */
function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'home',     label: 'Home',     icon: <Home      size={24} /> },
    { key: 'market',   label: 'Market',   icon: <BarChart2 size={24} /> },
    { key: 'settings', label: 'Settings', icon: <Settings  size={24} /> },
  ];
  return (
    <nav style={{
      position: 'sticky', bottom: 0, zIndex: 30,
      backgroundColor: '#10131c',
      borderTop: `1px solid ${C.border}`,
      display: 'flex',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* Centered at 900px on desktop, full-width on mobile */}
      <div style={{ width: '100%', maxWidth: 900, margin: '0 auto', display: 'flex' }}>
        {tabs.map(t => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, padding: '14px 0',
                backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                color: isActive ? C.gold : C.muted,
                borderTop: isActive ? `2px solid ${C.gold}` : '2px solid transparent',
                marginTop: -1, transition: 'color 0.12s',
              }}
            >
              {t.icon}
              <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROOT — HomeView
═══════════════════════════════════════════════════════════════════════════ */
export const HomeView: FC = () => {

  // ── Solana hooks (scaffold, without modifications) ─────────────────────────────────
  const { publicKey, connected, disconnect } = useWallet();
  const { connection }                        = useConnection();
  const { balance, getUserSOLBalance }        = useUserSOLBalanceStore();
  const { networkConfiguration, setNetworkConfiguration } = useNetworkConfiguration();
  const { autoConnect, setAutoConnect }       = useAutoConnect();

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab,     setActiveTab]     = useState<Tab>('home');
  const [splTokens,     setSplTokens]     = useState<SPLToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [solPrice,      setSolPrice]      = useState<number | null>(null);

  // Map networkConfiguration from the hook to the UI (Mainnet/Devnet/Testnet)
  const networkUI: NetworkUI = networkConfiguration === 'mainnet-beta' ? 'Mainnet' : 'Devnet';

  const setNetworkUI = useCallback((n: NetworkUI) => {
    setNetworkConfiguration(NET_MAP[n]);
  }, [setNetworkConfiguration]);

  // ── Balance SOL ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (publicKey) getUserSOLBalance(publicKey, connection);
  }, [publicKey, connection, getUserSOLBalance]);

  // ── Precio SOL/USD — CoinGecko con fallback Jupiter, refresh 60s ───────────
  useEffect(() => {
    let mounted = true;
    const fetchPrice = async () => {
      try {
        const r = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
          { signal: AbortSignal.timeout(8000) }
        );
        if (!r.ok) throw new Error('cg');
        const d = await r.json();
        if (mounted && d?.solana?.usd) setSolPrice(d.solana.usd);
      } catch {
        try {
          const r2 = await fetch(
            'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112'
          );
          if (!r2.ok) throw new Error('jup');
          const d2 = await r2.json();
          const p = d2?.data?.['So11111111111111111111111111111111111111112']?.price;
          if (mounted && p) setSolPrice(parseFloat(p));
        } catch { /* precio no disponible */ }
      }
    };
    fetchPrice();
    const id = setInterval(fetchPrice, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // ── SPL Tokens ──────────────────────────────────────────────────────
  const fetchSPLTokens = useCallback(async () => {
    if (!publicKey) return;
    setLoadingTokens(true);
    try {
      const accounts = await connection.getParsedTokenAccountsByOwner(
        publicKey, { programId: TOKEN_PROGRAM_ID }
      );
      const tokens: SPLToken[] = accounts.value
        .map(acc => {
          const info   = acc.account.data.parsed.info;
          const mint   = info.mint as string;
          const amount = info.tokenAmount.uiAmount ?? 0;
          const symbol = mint.slice(0, 4).toUpperCase();
          return { mint, symbol, amount, color: tokenColor(symbol) };
        })
        .filter(t => t.amount > 0);
      setSplTokens(tokens);
    } catch {
      notify({ type: 'error', message: 'Error al cargar tokens SPL' });
    } finally {
      setLoadingTokens(false);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) fetchSPLTokens();
    else setSplTokens([]);
  }, [connected, publicKey, fetchSPLTokens]);

  // ── Disconnect ─────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      setActiveTab('home');
      setSplTokens([]);
      notify({ type: 'success', message: 'Wallet desconectada' });
    } catch {
      notify({ type: 'error', message: 'Error al desconectar' });
    }
  }, [disconnect]);

  // ── Copy address ───────────────────────────────────────────────────────────
  const handleCopyAddress = useCallback(() => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58());
    notify({ type: 'success', message: '¡Dirección copiada!' });
  }, [publicKey]);

  // ── Scroll to top on tab change ────────────────────────────────────────────
  useEffect(() => {
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const publicKeyStr = publicKey?.toBase58() ?? '';

  /* ══════════════════════════════════════════════════════════════════════════
     STATE A — Wallet not connectect: just splash
  ══════════════════════════════════════════════════════════════════════════ */
  if (!connected) {
    return <SplashScreen />;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     STATE B — Wallet connectect: complete layout
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* 1. Header full-width glassmorphism */}
      <GlobalHeader
        publicKeyStr={publicKeyStr}
        networkUI={networkUI}
        setNetworkUI={setNetworkUI}
        autoConnect={autoConnect}
        setAutoConnect={setAutoConnect}
        onDisconnect={handleDisconnect}
        onCopyAddress={handleCopyAddress}
      />

      {/* 2. Conditional search bar (visible on the home and market screens, hidden in settings)) */}
      <ConditionalSearchBar activeTab={activeTab} />

      {/* 3. Main content — 900px centered container */}
      <main
        id="main-scroll"
        style={{
          flex: 1,
          width: '100%', maxWidth: 900, margin: '0 auto',
          overflowY: 'auto', scrollbarWidth: 'none',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {activeTab === 'home' && (
          <HomeTab
            balance={balance}
            solPrice={solPrice}
            splTokens={splTokens}
            loadingTokens={loadingTokens}
            onRefreshTokens={fetchSPLTokens}
          />
        )}
        {activeTab === 'market' && <MarketTab />}
        {activeTab === 'settings' && (
          <SettingsTab
            onDisconnect={handleDisconnect}
            publicKeyStr={publicKeyStr}
            networkUI={networkUI}
            setNetworkUI={setNetworkUI}
            autoConnect={autoConnect}
            setAutoConnect={setAutoConnect}
          />
        )}
      </main>

      {/* 4. Bottom nav sticky */}
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
};
