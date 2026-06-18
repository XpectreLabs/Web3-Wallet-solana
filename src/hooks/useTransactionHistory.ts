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

import { useEffect, useState, useCallback } from 'react';
import { Connection, PublicKey, ConfirmedSignatureInfo } from '@solana/web3.js';
import { notify } from '../utils/notifications';
import { handleError } from '../utils/errorHandler';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TransactionType = 'sent' | 'received' | 'unknown';

export interface ParsedTransaction {
  signature: string;
  type: TransactionType;
  amount: number;          // In lamports or token units
  address: string;         // Counter-party address (destination for sent, source for received)
  timestamp: number;       // Unix timestamp
  confirmationStatus: 'confirmed' | 'finalized' | 'processed';
  symbol: string;          // 'SOL' or token symbol
  fee: number;             // Transaction fee in lamports
}

export interface UseTransactionHistoryState {
  transactions: ParsedTransaction[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get confirmation status from ConfirmedSignatureInfo
// ═══════════════════════════════════════════════════════════════════════════

function getConfirmationStatus(sig: ConfirmedSignatureInfo): 'confirmed' | 'finalized' | 'processed' {
  if (sig.confirmationStatus === 'finalized') return 'finalized';
  if (sig.confirmationStatus === 'confirmed') return 'confirmed';
  return 'processed';
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Truncate address for display
// ═══════════════════════════════════════════════════════════════════════════

export function truncateAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
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
  const [lastSignature, setLastSignature] = useState<string | null>(null);

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
        const signatures = await connection.getSignaturesForAddress(publicKey, {
          limit: 25,
          before: isLoadMore ? lastSignature : undefined,
        });

        if (signatures.length === 0) {
          if (!isLoadMore) setTransactions([]);
          setHasMore(false);
          setLoading(false);
          return;
        }

        // Parse each transaction in parallel
        const parsedTxs = await Promise.all(
          signatures.map(async (sig) => {
            try {
              const tx = await connection.getParsedTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed'
              });

              if (!tx) {
                // Fallback: if transaction can't be parsed, return a minimal entry
                return {
                  signature: sig.signature,
                  type: 'unknown' as TransactionType,
                  amount: 0,
                  address: 'Unknown',
                  timestamp: sig.blockTime ?? Date.now() / 1000,
                  confirmationStatus: getConfirmationStatus(sig),
                  symbol: 'SOL',
                  fee: 5000, // Default Solana fee estimate
                };
              }

              // Extract transaction meta (fees, success status)
              const meta = tx.meta;
              const fee = meta?.fee ?? 5000;

              // Check if transaction was successful
              if (meta?.err) {
                // Failed transaction — still display but mark as unknown
                return {
                  signature: sig.signature,
                  type: 'unknown' as TransactionType,
                  amount: 0,
                  address: 'Failed TX',
                  timestamp: tx.blockTime ?? Date.now() / 1000,
                  confirmationStatus: getConfirmationStatus(sig),
                  symbol: 'SOL',
                  fee,
                };
              }

              // ─────────────────────────────────────────────────────────
              // Parse instructions to determine if sent or received SOL
              // ─────────────────────────────────────────────────────────

              let type: TransactionType = 'unknown';
              let amount = 0;
              let address = 'Contract Interaction';
              let symbol = 'SOL';

              const message = tx.transaction.message;

              // Iterate through instructions
              for (const instruction of message.instructions) {
<<<<<<< Updated upstream
                // Check if the instruction is a ParsedInstruction (since it can also be PartiallyDecodedInstruction)
                if ('program' in instruction && 'parsed' in instruction) {
                  // Check if this is a System program SOL transfer
=======
                // Fix: Type Guard to check if it's a ParsedInstruction before accessing program/parsed
                if ('program' in instruction) {
>>>>>>> Stashed changes
                  if (instruction.program === 'system' && instruction.parsed?.type === 'transfer') {
                    const parsed = instruction.parsed;
                    const source = parsed.info?.source;
                    const destination = parsed.info?.destination;
                    const transferAmount = parsed.info?.lamports ?? 0;

                    if (source === publicKey.toBase58()) {
                      // User is the source → SENT
                      type = 'sent';
                      amount = transferAmount / 1e9; // Convert lamports to SOL
                      address = destination;
                    } else if (destination === publicKey.toBase58()) {
                      // User is the destination → RECEIVED
                      type = 'received';
                      amount = transferAmount / 1e9;
                      address = source;
                    }
                  }
                }

                // TODO: Parse SPL token transfers (TokenkegQfeZyiNwAJsyFbPVwwQQfqs5MGcgm3fLZ5j)
                // This would require additional logic to identify token transfers
              }

              return {
                signature: sig.signature,
                type,
                amount,
                address,
                timestamp: tx.blockTime ?? Date.now() / 1000,
                confirmationStatus: getConfirmationStatus(sig),
                symbol,
                fee,
              };
            } catch (err) {
              console.error(`Error parsing transaction ${sig.signature}:`, err);
              // Return a fallback entry
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

        // Update state
        if (isLoadMore) {
          setTransactions((prev) => [...prev, ...parsedTxs]);
        } else {
          setTransactions(parsedTxs);
        }

        // Set up pagination
        if (signatures.length < 25) {
          setHasMore(false);
        } else {
          setLastSignature(signatures[signatures.length - 1].signature);
        }
      } catch (err) {
        const walletError = handleError(err, 'useTransactionHistory');
        setError(walletError.message);
      } finally {
        setLoading(false);
      }
    },
    [publicKey, connection, lastSignature]
  );

  // ───────────────────────────────────────────────────────────────────────
  // Initial fetch when wallet changes
  // ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!publicKey) {
      setTransactions([]);
      setLastSignature(null);
      setHasMore(true);
      return;
    }

    // Reset pagination on wallet change
    setLastSignature(null);
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
    setLastSignature(null);
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