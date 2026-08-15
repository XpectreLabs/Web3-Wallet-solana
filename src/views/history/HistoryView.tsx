// src/views/history/HistoryView.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Main transaction history view component.
//
// Responsibilities:
//   - Use the useTransactionHistory hook to fetch and manage transaction data
//   - Display transaction list with filtering (by type, search by address)
//   - Handle loading, error, and empty states
//   - Provide infinite scroll / "Load More" functionality
//   - Navigate to Solana Explorer on transaction click
//
// This component orchestrates the UI for the entire History tab.
// ─────────────────────────────────────────────────────────────────────────────

import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { AlertCircle, Loader } from 'lucide-react';

// Custom hook and utilities
import { useTransactionHistory, ParsedTransaction } from '../../hooks/useTransactionHistory';
import { getExplorerUrl } from '../../utils/explorer';
import { C } from '../../utils/theme';
import { isValidBase58Address, sanitizeInput } from '../../utils/security';

// Sub-components (will be created next)
import { HistoryFilters } from './HistoryFilters';
import { TransactionRow } from './TransactionRow';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type FilterType = 'all' | 'sent' | 'received';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Format timestamp to human-readable date
// ═══════════════════════════════════════════════════════════════════════════

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Today
  if (diffDays === 0 && diffHours < 24) {
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }

  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }

  // This week
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Format as date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Filter transactions by type and search
// ═══════════════════════════════════════════════════════════════════════════

function filterTransactions(
  transactions: ParsedTransaction[],
  filterType: FilterType,
  searchAddress: string
): ParsedTransaction[] {
  return transactions.filter((tx) => {
    // Filter by type
    if (filterType !== 'all' && tx.type !== filterType) {
      return false;
    }

    // Filter by search address (case-insensitive)
    if (searchAddress.trim()) {
      const search = searchAddress.toLowerCase();
      if (!tx.address.toLowerCase().includes(search)) {
        return false;
      }
    }

    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Group transactions by date
// ═══════════════════════════════════════════════════════════════════════════

interface GroupedTransactions {
  date: string;
  transactions: ParsedTransaction[];
}

function groupByDate(transactions: ParsedTransaction[]): GroupedTransactions[] {
  const grouped: { [key: string]: ParsedTransaction[] } = {};

  transactions.forEach((tx) => {
    const dateKey = formatDate(tx.timestamp);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(tx);
  });

  // Convert to array and maintain order
  return Object.entries(grouped).map(([date, txs]) => ({
    date,
    transactions: txs,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const HistoryView: FC<{ initialSearch?: string }> = ({ initialSearch = '' }) => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  // Fetch transaction history
  const { transactions, loading, error, hasMore, fetchMore, refresh } = useTransactionHistory(
    publicKey,
    connection
  );

  // UI state for filters and search
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchAddress, setSearchAddress] = useState(initialSearch);

  // Ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Infinite scroll: detect when user scrolls near bottom and fetch more
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, loading, fetchMore]);

  // ─────────────────────────────────────────────────────────────────────────
  // Apply filters, validation and grouping
  // ─────────────────────────────────────────────────────────────────────────

  const isSearchActive = searchAddress.trim().length > 0;
  const sanitizedSearch = sanitizeInput(searchAddress);
  
  // Removed strict Base58 validation to allow partial matching
  const filteredTransactions = filterTransactions(transactions, filterType, sanitizedSearch);
  const groupedTransactions = groupByDate(filteredTransactions);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const handleTransactionClick = useCallback((signature: string) => {
    const explorerUrl = getExplorerUrl(
      connection.rpcEndpoint,
      signature,
      'tx'
    );
    window.open(explorerUrl, '_blank');
  }, [connection.rpcEndpoint]);

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">Transaction History</h1>
        <p className="text-xp-muted text-[15px]">
          View all your Solana transactions in one place
        </p>
      </div>

      {/* Filters */}
      <HistoryFilters
        filterType={filterType}
        setFilterType={setFilterType}
        searchAddress={searchAddress}
        setSearchAddress={setSearchAddress}
      />

      {/* Error state */}
      {error && !loading && (
        <div
          className="rounded-2xl p-6 flex items-center justify-between gap-4 mb-8"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.red}40` }}
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-xp-danger shrink-0" />
            <p className="text-white font-semibold">Ocurrió un error</p>
          </div>
          <button
            onClick={() => refresh()}
            className="px-4 py-2 bg-xp-danger/10 hover:bg-xp-danger/20 text-xp-danger rounded-xl font-bold text-[14px] transition-colors cursor-pointer border-none"
          >
            Reintentar
          </button>
        </div>
      )}



      {/* Loading state (initial) */}
      {loading && transactions.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader size={24} className="text-xp-gold animate-spin" />
          <p className="ml-3 text-xp-muted font-medium">Loading transactions...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && transactions.length === 0 && !error && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <p className="text-xp-muted text-[15px] mb-2">No transactions found</p>
          <p className="text-xp-muted text-[13px]">
            Your transaction history will appear here once you send or receive SOL
          </p>
        </div>
      )}

      {/* No results after filter */}
      {!loading && transactions.length > 0 && filteredTransactions.length === 0 && !error && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}
        >
          <p className="text-xp-muted text-[15px] mb-2">No matching transactions</p>
          <p className="text-xp-muted text-[13px]">
            Try adjusting your filters or search criteria
          </p>
        </div>
      )}

      {/* Transaction list */}
      {filteredTransactions.length > 0 && (
        <div className="space-y-8">
          {groupedTransactions.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="px-1 mb-4 flex items-center gap-3">
                <p
                  className="text-[12px] font-bold tracking-wide uppercase"
                  style={{ color: C.gold }}
                >
                  {group.date}
                </p>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: C.border }}
                />
              </div>

              {/* Transactions for this date */}
              <div
                className="rounded-2xl overflow-hidden border"
                style={{ backgroundColor: C.surface, borderColor: C.border }}
              >
                {group.transactions.map((tx, idx) => (
                  <div
                    key={tx.signature}
                    style={{
                      borderBottom:
                        idx < group.transactions.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}
                  >
                    <TransactionRow
                      transaction={tx}
                      onClick={() => handleTransactionClick(tx.signature)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more trigger (for infinite scroll) */}
      {hasMore && filteredTransactions.length > 0 && (
        <div
          ref={loadMoreRef}
          className="flex justify-center py-8"
        >
          {loading && (
            <div className="flex items-center gap-2">
              <Loader size={20} className="text-[#dea001] animate-spin" />
              <p className="text-[#7a8fa6] text-[14px]">Loading more...</p>
            </div>
          )}
        </div>
      )}

      {/* End of list message */}
      {!hasMore && filteredTransactions.length > 0 && (
        <div className="text-center py-8">
          <p className="text-[#7a8fa6] text-[14px]">
            You&apos;ve reached the end of your transaction history
          </p>
        </div>
      )}
    </div>
  );
};
