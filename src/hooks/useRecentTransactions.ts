// src/hooks/useRecentTransactions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Custom hook to fetch only the most recent transactions for dashboard display.
//
// Responsibilities:
//   - Fetch only the latest N transactions (default: 2)
//   - Parse transaction data (same as useTransactionHistory)
//   - Handle loading, error, and empty states
//   - Lightweight alternative to useTransactionHistory for dashboard preview
//
// Used in the "Recent Activity" section of the Home dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { Connection, PublicKey, ConfirmedSignatureInfo } from '@solana/web3.js';
import { notify } from '../utils/notifications';
import { handleError } from '../utils/errorHandler';
import { parseTransaction } from '../utils/solana/transactionParser';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

import { ParsedTransaction as RecentTransaction, TransactionType, getConfirmationStatus } from '../utils/solana/transactionParser';

export type { TransactionType, RecentTransaction };

export interface UseRecentTransactionsState {
  transactions: RecentTransaction[];
  loading: boolean;
  error: string | null;
}



// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useRecentTransactions(
  publicKey: PublicKey | null,
  connection: Connection,
  limit: number = 2
): UseRecentTransactionsState {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) {
      setTransactions([]);
      return;
    }

    const fetchRecentTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch only the limit we need
        const signatures = await connection.getSignaturesForAddress(publicKey, {
          limit,
        });

        if (signatures.length === 0) {
          setTransactions([]);
          setLoading(false);
          return;
        }

        // Parse each transaction
        const parsedTxs = await Promise.all(
          signatures.map(async (sig) => {
            try {
              const tx = await connection.getParsedTransaction(sig.signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
              });

              const parsedTx = parseTransaction(tx, sig, publicKey);
              // Extract only what RecentTransaction needs if we were to narrow it, but they are exactly compatible now.
              return parsedTx;
            } catch (err) {
              const parseErr = handleError(err, 'useRecentTransactions - parse');
              return {
                signature: sig.signature,
                type: 'unknown' as TransactionType,
                amount: 0,
                address: 'Parse Error',
                timestamp: sig.blockTime ?? Date.now() / 1000,
                confirmationStatus: getConfirmationStatus(sig),
                symbol: 'SOL',
                fee: 5000,
              };
            }
          })
        );

        setTransactions(parsedTxs);
      } catch (err) {
        const walletError = handleError(err, 'useRecentTransactions');
        setError(walletError.message);
        notify({
          type: 'error',
          message: 'Failed to load recent transactions',
          description: walletError.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTransactions();
  }, [publicKey, connection, limit]);

  return {
    transactions,
    loading,
    error,
  };
}
