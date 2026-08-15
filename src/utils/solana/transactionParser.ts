import { ParsedTransactionWithMeta, ConfirmedSignatureInfo, PublicKey } from '@solana/web3.js';

export type TransactionType = 'sent' | 'received' | 'unknown';

export interface ParsedTransaction {
  signature: string;
  type: TransactionType;
  amount: number;          // In lamports or token units
  address: string;         // Counter-party address
  timestamp: number;       // Unix timestamp
  confirmationStatus: 'confirmed' | 'finalized' | 'processed';
  symbol: string;          // 'SOL' or token symbol
  fee: number;             // Transaction fee in lamports
}

export function getConfirmationStatus(sig: ConfirmedSignatureInfo): 'confirmed' | 'finalized' | 'processed' {
  if (sig.confirmationStatus === 'finalized') return 'finalized';
  if (sig.confirmationStatus === 'confirmed') return 'confirmed';
  return 'processed';
}

/**
 * Parses a raw transaction to determine type (sent/received), amount, and counterparty address.
 */
export function parseTransaction(
  tx: ParsedTransactionWithMeta | null,
  sig: ConfirmedSignatureInfo,
  publicKey: PublicKey
): ParsedTransaction {
  if (!tx) {
    return {
      signature: sig.signature,
      type: 'unknown',
      amount: 0,
      address: 'Unknown',
      timestamp: sig.blockTime ?? Date.now() / 1000,
      confirmationStatus: getConfirmationStatus(sig),
      symbol: 'SOL',
      fee: 5000,
    };
  }

  const meta = tx.meta;
  const fee = meta?.fee ?? 5000;

  if (meta?.err) {
    return {
      signature: sig.signature,
      type: 'unknown',
      amount: 0,
      address: 'Failed TX',
      timestamp: tx.blockTime ?? Date.now() / 1000,
      confirmationStatus: getConfirmationStatus(sig),
      symbol: 'SOL',
      fee,
    };
  }

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
    // TODO: Parse SPL token transfers
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
}
