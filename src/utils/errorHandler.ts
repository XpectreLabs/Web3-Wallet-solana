// ── Types ──────────────────────────────────────────────────────────────────────

/**
 * Standardized error shape used across the entire wallet application.
 *
 * @property code    - Machine-readable identifier (e.g. 'INSUFFICIENT_FUNDS').
 *                     Useful for conditional logic based on the error type.
 * @property message - Human-readable description shown to the user.
 * @property raw     - The original thrown value, preserved for debugging.
 */
export interface WalletError {
    code: string;
    message: string;
    raw?: unknown;
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/**
 * Inspects a raw error message string and maps known Solana / wallet-adapter
 * patterns to a structured { code, message } pair.
 *
 * Only the `code` and `message` fields are returned here; the `raw` field is
 * added by the caller (handleError) so the original error is never lost.
 */
function classifySolanaError(raw: string): Pick<WalletError, 'code' | 'message'> {
    const msg = raw.toLowerCase();

    if (msg.includes('user rejected') || msg.includes('transaction cancelled')) {
        return {
            code: 'USER_REJECTED',
            message: 'Transaction was cancelled from your wallet.',
        };
    }

    if (msg.includes('insufficient funds') || msg.includes('0x1')) {
        return {
            code: 'INSUFFICIENT_FUNDS',
            message: 'Insufficient funds to complete this operation.',
        };
    }

    if (msg.includes('blockhash not found') || msg.includes('block height exceeded')) {
        return {
            code: 'BLOCKHASH_EXPIRED',
            message: 'The transaction expired. Please try again.',
        };
    }

    if (msg.includes('invalid public key') || msg.includes('non-base58')) {
        return {
            code: 'INVALID_ADDRESS',
            message: 'The address provided is not a valid Solana public key.',
        };
    }

    if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
        return {
            code: 'NETWORK_ERROR',
            message: 'Could not connect to the Solana network. Check your internet connection.',
        };
    }

    // Fallback for any unrecognised Solana error
    return {
        code: 'UNKNOWN_SOLANA_ERROR',
        message: 'An unexpected error occurred on the Solana network. Please try again.',
    };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Central error handler for the wallet application.
 *
 * Accepts any thrown value (Error object, string, unknown) and returns a
 * consistent WalletError. Always logs the technical details to the browser
 * console so developers can inspect the root cause via DevTools (F12).
 *
 * Usage example:
 *   try {
 *     await executeTransfer(params);
 *   } catch (err) {
 *     const walletError = handleError(err, 'executeTransfer');
 *     notify({ type: 'error', message: walletError.message });
 *   }
 *
 * @param error   - The caught value (can be anything JavaScript throws).
 * @param context - Optional label describing where the error occurred.
 *                  Appears in the console prefix for easier filtering.
 * @returns       A normalised WalletError ready for display or logging.
 */
export function handleError(error: unknown, context?: string): WalletError {
    const prefix = context ? `[${context}]` : '[handleError]';

    // Always print the raw error so the developer can debug via DevTools
    console.error(`${prefix}`, error);

    // ── Case 1: Standard JavaScript Error object ───────────────────────────
    if (error instanceof Error) {
        const classified = classifySolanaError(error.message);
        return {
            ...classified,
            raw: error,
        };
    }

    // ── Case 2: Plain string was thrown (e.g. throw "something failed") ───
    if (typeof error === 'string') {
        const classified = classifySolanaError(error);
        return {
            ...classified,
            raw: error,
        };
    }

    // ── Case 3: Completely unknown shape (object, null, number, etc.) ──────
    return {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        raw: error,
    };
}
