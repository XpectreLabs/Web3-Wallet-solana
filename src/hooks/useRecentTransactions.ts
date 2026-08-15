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

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TransactionType = 'sent' | 'received' | 'unknown';

export interface RecentTransaction {
  signature: string;
  type: TransactionType;
  amount: number;
  address: string;
  timestamp: number;
  confirmationStatus: 'confirmed' | 'finalized' | 'processed';
  symbol: string;
}

export interface UseRecentTransactionsState {
  transactions: RecentTransaction[];
  loading: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get confirmation status
// ═══════════════════════════════════════════════════════════════════════════

function getConfirmationStatus(sig: ConfirmedSignatureInfo): 'confirmed' | 'finalized' | 'processed' {
  if (sig.confirmationStatus === 'finalized') return 'finalized';
  if (sig.confirmationStatus === 'confirmed') return 'confirmed';
  return 'processed';
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

              if (!tx) {
                return {
                  signature: sig.signature,
                  type: 'unknown' as TransactionType,
                  amount: 0,
                  address: 'Unknown',
                  timestamp: sig.blockTime ?? Date.now() / 1000,
                  confirmationStatus: getConfirmationStatus(sig),
                  symbol: 'SOL',
                };
              }

              const meta = tx.meta;

              // Check if transaction failed
              if (meta?.err) {
                return {
                  signature: sig.signature,
                  type: 'unknown' as TransactionType,
                  amount: 0,
                  address: 'Failed TX',
                  timestamp: tx.blockTime ?? Date.now() / 1000,
                  confirmationStatus: getConfirmationStatus(sig),
                  symbol: 'SOL',
                };
              }

              // Parse instructions to determine sent/received
              let type: TransactionType = 'unknown';
              let amount = 0;
              let address = 'Contract Interaction';
              let symbol = 'SOL';

              const message = tx.transaction.message;

              for (const instruction of message.instructions) {
                if ('parsed' in instruction && instruction.program === 'system' && instruction.parsed?.type === 'transfer') {
                  const parsed = instruction.parsed;
                  const source = parsed.info?.source;
                  const destination = parsed.info?.destination;
                  const transferAmount = parsed.info?.lamports ?? 0;

                  if (source === publicKey.toBase58()) {
                    type = 'sent';
                    amount = transferAmount / 1e9;
                    address = destination;
                  } else if (destination === publicKey.toBase58()) {
                    type = 'received';
                    amount = transferAmount / 1e9;
                    address = source;
                  }
                }
              }

              return {
                signature: sig.signature,
                type,
                amount,
                address,
                timestamp: tx.blockTime ?? Date.now() / 1000,
                confirmationStatus: getConfirmationStatus(sig),
                symbol,
              };
            } catch (err) {
              console.error(`Error parsing transaction ${sig.signature}:`, err);
              return {
                signature: sig.signature,
                type: 'unknown' as TransactionType,
                amount: 0,
                address: 'Parse Error',
                timestamp: sig.blockTime ?? Date.now() / 1000,
                confirmationStatus: getConfirmationStatus(sig),
                symbol: 'SOL',
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
