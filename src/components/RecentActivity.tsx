// src/components/dashboard/RecentActivity.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Recent Activity section component for the Home dashboard.
//
// Responsibilities:
//   - Display the latest 2-3 transactions from wallet history
//   - Show loading, error, and empty states
//   - Provide a "View More" link to navigate to the full History tab
//   - Match the Xpectre design system
//
// This component is placed in the Home dashboard below "Your Assets".
// ─────────────────────────────────────────────────────────────────────────────

import { FC } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { ArrowUpRight, ArrowDownLeft, Loader, AlertCircle } from 'lucide-react';

import { useRecentTransactions, RecentTransaction } from '../hooks/useRecentTransactions';
import { getExplorerUrl } from '../utils/explorer';
import { C } from '../utils/theme';

interface RecentActivityProps {
  onViewMoreClick: () => void; // Callback to switch to History tab
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Truncate address
// ═══════════════════════════════════════════════════════════════════════════

function truncateAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Format timestamp to relative time
// ═══════════════════════════════════════════════════════════════════════════

function formatTimeAgo(timestamp: number): string {
  const diffSeconds = Math.floor((Date.now() - timestamp * 1000) / 1000);

  if (diffSeconds < 60) return 'just now';
  const diffMins = Math.floor(diffSeconds / 60);
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSACTION ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const RecentTransactionItem: FC<{
  transaction: RecentTransaction;
  onClick: () => void;
}> = ({ transaction, onClick }) => {
  const { type, amount, address, timestamp } = transaction;
  const isReceived = type === 'received';

  const isFailed = type === 'unknown';
  const iconColor = isReceived ? C.green : isFailed ? C.red : '#ffffff';
  const iconBg = isReceived ? 'rgba(74, 222, 128, 0.1)' : isFailed ? 'rgba(255, 74, 74, 0.1)' : 'rgba(255, 255, 255, 0.1)';

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors cursor-pointer border-0 text-left bg-transparent"
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border"
        style={{
          backgroundColor: iconBg,
          borderColor: `${iconColor}33`,
        }}
      >
        <div style={{ color: iconColor }}>
          {isReceived ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-[13px] font-semibold">
          {isReceived ? 'Received' : type === 'unknown' ? 'Failed' : 'Sent'}
        </p>
        <p className="text-[#7a8fa6] text-[12px]">
          {type === 'unknown' ? 'Unknown' : truncateAddress(address)} • {formatTimeAgo(timestamp)}
        </p>
      </div>

      {/* Amount */}
      <p
        className="text-[13px] font-semibold shrink-0"
        style={{ color: isReceived ? C.green : isFailed ? C.red : '#ffffff' }}
      >
        {isReceived ? '+' : '-'}{amount.toFixed(4)}
      </p>
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const RecentActivity: FC<RecentActivityProps> = ({ onViewMoreClick }) => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  const { transactions, loading, error } = useRecentTransactions(publicKey, connection, 2);

  // Handler for transaction click → open explorer
  const handleTransactionClick = (signature: string) => {
    const explorerUrl = getExplorerUrl(connection.rpcEndpoint, signature, 'tx');
    window.open(explorerUrl, '_blank');
  };

  // ───────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header with "View More" button */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-white text-[18px] font-bold">Recent Activity</h3>
        <button
          onClick={onViewMoreClick}
          className="text-xp-gold text-[13px] font-bold hover:text-xp-gold/90 transition-colors cursor-pointer bg-transparent border-0 p-0"
        >
          View More
        </button>
      </div>

      {/* Loading state */}
      {loading && transactions.length === 0 && (
        <div
          className="rounded-2xl p-8 flex items-center justify-center gap-3"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <Loader size={18} className="text-xp-gold animate-spin" />
          <p className="text-xp-muted text-[14px]">Loading activity...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.red}40` }}
        >
          <AlertCircle size={16} className="text-xp-danger mt-1 shrink-0" />
          <p className="text-xp-muted text-[12px]">Could not load recent activity</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && transactions.length === 0 && !error && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <p className="text-xp-muted text-[14px]">No recent activity</p>
          <p className="text-xp-muted text-[12px] mt-1">
            Send or receive SOL to see transactions here
          </p>
        </div>
      )}

      {/* Transaction list */}
      {transactions.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden border"
          style={{ backgroundColor: C.surface, borderColor: C.border }}
        >
          {transactions.map((tx, idx) => (
            <div
              key={tx.signature}
              style={{
                borderBottom:
                  idx < transactions.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              <RecentTransactionItem
                transaction={tx}
                onClick={() => handleTransactionClick(tx.signature)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
