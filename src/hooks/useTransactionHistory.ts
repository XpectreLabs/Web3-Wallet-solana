// src/hooks/useTransactionHistory.ts
// ─────────────────────────────────────────────────────────────────────────────
// Custom hook to fetch, parse, and manage transaction history for a Solana wallet.
//
// Responsibilities:
//   - Fetch signatures via getSignaturesForAddress
//   - Parse each transaction to determine type (sent/received)
//   - Extract transaction details (amount, address, confirmation status)
//   - Handle loading, error, and empty states
//   - Provide filtering and searching capabilities
//
// Returns a transaction array with parsed data ready for UI consumption.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from 'react';
import { Connection, PublicKey, ConfirmedSignatureInfo } from '@solana/web3.js';
import { notify } from '../utils/notifications';
import { handleError } from '../utils/errorHandler';
import { parseTransaction } from '../utils/solana/transactionParser';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

import { ParsedTransaction, TransactionType, getConfirmationStatus } from '../utils/solana/transactionParser';

export type { TransactionType, ParsedTransaction };

export interface UseTransactionHistoryState {
  transactions: ParsedTransaction[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
}



// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Truncate address for display
// ═══════════════════════════════════════════════════════════════════════════

export function truncateAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Sleep utility for rate-limit back-off
// ═══════════════════════════════════════════════════════════════════════════

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Fetch a single transaction with exponential-backoff retry
//
// Why this exists:
//   Public RPC nodes return HTTP 429 when too many requests arrive at once.
//   This wrapper retries up to MAX_RETRIES times, doubling the wait on each
//   attempt so the server has time to recover.
// ═══════════════════════════════════════════════════════════════════════════

const MAX_RETRIES = 3;
const BASE_RETRY_MS = 1000; // 1 s → 2 s → 4 s

async function fetchWithRetry(
  connection: Connection,
  signature: string,
  attempt = 0
): Promise<Awaited<ReturnType<Connection['getParsedTransaction']>>> {
  try {
    return await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });
  } catch (err: unknown) {
    const isRateLimit =
      err instanceof Error &&
      (err.message.includes('429') || err.message.toLowerCase().includes('too many'));

    if (isRateLimit && attempt < MAX_RETRIES) {
      const waitMs = BASE_RETRY_MS * Math.pow(2, attempt);
      console.warn(`[useTransactionHistory] 429 on ${signature.slice(0, 8)}… retrying in ${waitMs}ms`);
      await sleep(waitMs);
      return fetchWithRetry(connection, signature, attempt + 1);
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════

export function useTransactionHistory(
  publicKey: PublicKey | null,
  connection: Connection
): UseTransactionHistoryState {
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  // useRef instead of useState: the callback always reads the latest value
  // without needing to be in the useCallback dependency array, which would
  // recreate fetchTransactions on every page load → infinite fetch loop.
  const lastSignatureRef = useRef<string | null>(null);

  // ───────────────────────────────────────────────────────────────────────
  // Fetch transaction signatures (initial or paginated)
  // ───────────────────────────────────────────────────────────────────────

  const fetchTransactions = useCallback(
    async (isLoadMore: boolean = false) => {
      if (!publicKey) {
        setTransactions([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch signatures for the wallet
        // limit: 25 per request (default), before: for pagination
        let signatures: any[] = [];
        try {
          signatures = await connection.getSignaturesForAddress(publicKey, {
            limit: 25,
            before: isLoadMore && lastSignatureRef.current ? lastSignatureRef.current : undefined,
          });
        } catch (err: any) {
          const errString = String(err?.message || err).toLowerCase();
          if (isLoadMore && (errString.includes('not found') || errString.includes('failed to get signatures'))) {
            console.warn('[useTransactionHistory] Pagination reference tx dropped by RPC. Stopping pagination.');
            setHasMore(false);
            setLoading(false);
            return;
          }
          throw err;
        }

        if (signatures.length === 0) {
          if (!isLoadMore) setTransactions([]);
          setHasMore(false);
          setLoading(false);
          return;
        }

        // ─────────────────────────────────────────────────────────────────
        // Batch processing: fetch transactions in groups of BATCH_SIZE with
        // a short pause between batches to respect RPC rate limits.
        //
        // Instead of firing 25 simultaneous requests (which triggers 429),
        // we send 5 at a time and wait 300 ms before the next group.
        // Each individual request also has its own retry logic (fetchWithRetry).
        // ─────────────────────────────────────────────────────────────────
        const BATCH_SIZE = 5;
        const BATCH_DELAY_MS = 300;
        const parsedTxs: ParsedTransaction[] = [];

        for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
          const batch = signatures.slice(i, i + BATCH_SIZE);

          const batchResults = await Promise.all(
            batch.map(async (sig) => {
              try {
                const tx = await fetchWithRetry(connection, sig.signature);

                const parsedTx = parseTransaction(tx, sig, publicKey);
                return parsedTx;

              } catch (err) {
                console.error(`[useTransactionHistory] Error parsing ${sig.signature}:`, err);
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

          parsedTxs.push(...batchResults);

          // Flush each batch to the UI immediately so the user sees results
          // progressively rather than waiting for all 25 to finish.
          if (isLoadMore) {
            setTransactions((prev) => [...prev, ...batchResults]);
          } else {
            setTransactions([...parsedTxs]);
          }

          // Wait between batches (except after the last one)
          if (i + BATCH_SIZE < signatures.length) {
            await sleep(BATCH_DELAY_MS);
          }
        }

        // Set up pagination
        if (signatures.length < 25) {
          setHasMore(false);
        } else {
          lastSignatureRef.current = signatures[signatures.length - 1].signature;
        }
      } catch (err) {
        const walletError = handleError(err, 'useTransactionHistory');
        setError(walletError.message);
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connection]
  );

  // ───────────────────────────────────────────────────────────────────────
  // Initial fetch when wallet changes
  // ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!publicKey) {
      setTransactions([]);
      lastSignatureRef.current = null;
      setHasMore(true);
      return;
    }

    // Reset pagination on wallet change
    lastSignatureRef.current = null;
    setHasMore(true);

    // Fetch initial transactions
    fetchTransactions(false);
  }, [publicKey, fetchTransactions]);

  // ───────────────────────────────────────────────────────────────────────
  // Fetch more (pagination)
  // ───────────────────────────────────────────────────────────────────────

  const fetchMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchTransactions(true);
  }, [fetchTransactions, hasMore, loading]);

  // ───────────────────────────────────────────────────────────────────────
  // Refresh transaction history
  // ───────────────────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    lastSignatureRef.current = null;
    setHasMore(true);
    await fetchTransactions(false);
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    hasMore,
    fetchMore,
    refresh,
  };
}
