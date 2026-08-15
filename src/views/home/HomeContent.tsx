import { FC } from 'react';
import {
  ShoppingCart,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import SkeletonRow from '../../components/ui/SkeletonRow';
import { Tab } from '../../components/layout/Sidebar';
import { RecentActivity } from '../../components/RecentActivity';

import { PriceChart } from '../../components/PriceChart';

import { C } from '../../utils/theme';

// Token brand colors for known SPL token symbols
const TOKEN_COLORS: Record<string, string> = {
  SOL: '#9945FF',
  USDC: '#2775CA',
  RAY: '#5AC4BE',
  BONK: '#F7931A',
  JUP: '#19FB9B',
  PYTH: '#6C4ED9',
  JITO: '#16C784',
  WIF: '#E44E9E',
};

export interface SPLToken {
  mint: string;
  symbol: string;
  amount: number;
  color: string;
}

export function tokenColor(symbol: string): string {
  return TOKEN_COLORS[symbol] ?? '#7a8fa6';
}

interface HomeContentProps {
  balance: number;
  solPrice: number | null;
  solPriceChange: number | null;
  splTokens: SPLToken[];
  loadingTokens: boolean;
  setActiveTab: (t: Tab) => void;
  onBuyClick: () => void;
  onSendClick: () => void;
  onSwapClick: () => void;
  onReceiveClick: () => void;
}

export const HomeContent: FC<HomeContentProps> = ({
  balance,
  solPrice,
  solPriceChange,
  splTokens,
  loadingTokens,
  setActiveTab,
  onBuyClick,
  onSendClick,
  onSwapClick,
  onReceiveClick,
}) => {
  const fiatValue = solPrice ? (balance * solPrice).toFixed(2) : '0.00';

  // Format the 24h change badge — returns null when unavailable or NaN
  const changeLabel =
    solPriceChange !== null && !isNaN(solPriceChange)
      ? (solPriceChange > 0 ? '+' : '') + solPriceChange.toFixed(2) + '%'
      : null;

  const changeColor =
    solPriceChange === null || isNaN(solPriceChange)
      ? C.muted
      : solPriceChange > 0
        ? C.green
        : solPriceChange < 0
          ? C.red
          : C.muted;

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in duration-300">
      {/* ── Balance Card ── */}
      <div
        className="rounded-2xl p-6 md:p-8"
        style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
      >
        {/* Live price indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: solPrice ? C.green : C.muted }}
          />
          <span
            className="text-[13px] font-bold tracking-wide"
            style={{ color: solPrice ? C.green : C.muted }}
          >
            {solPrice ? `LIVE • 1 SOL = $${solPrice.toFixed(2)}` : 'Fetching price...'}
          </span>
          {solPrice && changeLabel && (
            <span
              className="text-[12px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{
                color: changeColor,
                backgroundColor: `${changeColor}1a`,
              }}
            >
              {changeLabel}
            </span>
          )}
        </div>

        {/* SOL Balance */}
        <p className="text-white text-5xl font-extrabold tracking-tight">
          {balance.toFixed(4)}{' '}
          <span className="text-[22px] font-medium text-xp-muted">SOL</span>
        </p>
        <p className="text-xp-muted text-lg mt-2 font-medium">${fiatValue} USD</p>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-4 sm:flex gap-3 sm:gap-4 mt-8 sm:max-w-xl">
          {[
            {
              label: 'Buy',
              icon: <ShoppingCart size={20} className="text-xp-gold" />,
              onClick: onBuyClick,
            },
            {
              label: 'Swap',
              icon: <ArrowLeftRight size={20} className="text-xp-gold" />,
              onClick: onSwapClick,
            },
            {
              label: 'Send',
              icon: <ArrowUpRight size={20} className="text-xp-gold" />,
              onClick: onSendClick,
            },
            {
              label: 'Receive',
              icon: <ArrowDownLeft size={20} className="text-xp-gold" />,
              onClick: onReceiveClick,
            },
          ].map((a) => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border bg-transparent hover:bg-white/[0.03] transition-colors cursor-pointer"
              style={{ borderColor: C.border }}
            >
              {a.icon}
              <span className="text-white text-[13px] font-semibold">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <PriceChart />

      {/* ── Your Assets ── */}
      <div>
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-white text-lg font-bold tracking-wide">Your Assets</h2>
        </div>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          {/* SOL — always first */}
          <div
            className="flex items-center gap-4 px-4 py-4 border-b hover:bg-white/[0.02] transition-colors"
            style={{ borderColor: C.border }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: 'rgba(153, 69, 255, 0.1)',
                borderColor: 'rgba(153, 69, 255, 0.2)',
              }}
            >
              <span className="text-[#9945FF] text-[11px] font-bold">SOL</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-[15px] font-semibold">Solana</p>
              <p className="text-xp-muted text-[13px] mt-0.5">{balance.toFixed(4)} SOL</p>
            </div>
            <div className="text-right">
              <p className="text-white text-[15px] font-semibold">${fiatValue}</p>
            </div>
          </div>

          {/* Loading skeleton */}
          {loadingTokens && (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}

          {/* Real SPL Tokens */}
          {!loadingTokens &&
            splTokens.map((token, i) => (
              <div
                key={token.mint}
                className={`flex items-center gap-4 px-4 py-4 hover:bg-white/[0.02] transition-colors ${i < splTokens.length - 1 ? 'border-b' : ''
                  }`}
                style={{ borderColor: C.border }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${token.color}1a`,
                    borderColor: `${token.color}33`,
                  }}
                >
                  <span className="text-[11px] font-bold" style={{ color: token.color }}>
                    {token.symbol.slice(0, 3)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-white text-[15px] font-semibold">{token.symbol}</p>
                  <p className="text-xp-muted text-[12px] mt-0.5 font-mono">
                    {token.mint.slice(0, 8)}...
                  </p>
                </div>
                <p className="text-white text-[15px] font-semibold">
                  {token.amount.toLocaleString()}
                </p>
              </div>
            ))}

          {/* Empty state */}
          {!loadingTokens && splTokens.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-xp-muted text-[14px]">No tokens found</p>
            </div>
          )}
        </div>
      </div>
      {/* ── Recent Activity ── */}
      <div className="mt-8">
        <RecentActivity onViewMoreClick={() => setActiveTab('history')} />
      </div>
    </div>
  );
};