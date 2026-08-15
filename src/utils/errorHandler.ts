import { ERROR_CODES, ERROR_MESSAGES, ERROR_RULES } from './errorConstants';

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

    for (const rule of ERROR_RULES) {
        if (rule.patterns.some((pattern) => msg.includes(pattern))) {
            return {
                code: rule.code,
                message: rule.message,
            };
        }
    }

    // Fallback for any unrecognised Solana error
    return {
        code: ERROR_CODES.UNKNOWN_SOLANA_ERROR,
        message: ERROR_MESSAGES.UNKNOWN_SOLANA_ERROR,
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
        if (classified.code === ERROR_CODES.NETWORK_ERROR && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('xpectre_connection_lost'));
        }
        return {
            ...classified,
            raw: error,
        };
    }

    // ── Case 2: Plain string was thrown (e.g. throw "something failed") ───
    if (typeof error === 'string') {
        const classified = classifySolanaError(error);
        if (classified.code === ERROR_CODES.NETWORK_ERROR && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('xpectre_connection_lost'));
        }
        return {
            ...classified,
            raw: error,
        };
    }

    // ── Case 3: Completely unknown shape (object, null, number, etc.) ──────
    return {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: ERROR_MESSAGES.UNKNOWN_ERROR,
        raw: error,
    };
}
