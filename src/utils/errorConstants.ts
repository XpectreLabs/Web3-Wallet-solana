export const ERROR_CODES = {
    USER_REJECTED: 'USER_REJECTED',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    BLOCKHASH_EXPIRED: 'BLOCKHASH_EXPIRED',
    INVALID_ADDRESS: 'INVALID_ADDRESS',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SLIPPAGE_TOO_LOW: 'SLIPPAGE_TOO_LOW',
    UNKNOWN_SOLANA_ERROR: 'UNKNOWN_SOLANA_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export const ERROR_MESSAGES = {
    USER_REJECTED: 'Transaction was cancelled from your wallet.',
    INSUFFICIENT_FUNDS: 'Insufficient funds to complete this operation.',
    BLOCKHASH_EXPIRED: 'The transaction expired. Please try again.',
    INVALID_ADDRESS: 'The address provided is not a valid Solana public key.',
    NETWORK_ERROR: 'Could not connect to the Solana network. Check your internet connection.',
    SLIPPAGE_TOO_LOW: 'No route found with the current slippage tolerance. Try increasing it.',
    UNKNOWN_SOLANA_ERROR: 'An unexpected error occurred on the Solana network. Please try again.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

export const ERROR_RULES = [
    {
        patterns: ['user rejected', 'transaction cancelled'],
        code: ERROR_CODES.USER_REJECTED,
        message: ERROR_MESSAGES.USER_REJECTED,
    },
    {
        patterns: ['insufficient funds', '0x1'],
        code: ERROR_CODES.INSUFFICIENT_FUNDS,
        message: ERROR_MESSAGES.INSUFFICIENT_FUNDS,
    },
    {
        patterns: ['blockhash not found', 'block height exceeded'],
        code: ERROR_CODES.BLOCKHASH_EXPIRED,
        message: ERROR_MESSAGES.BLOCKHASH_EXPIRED,
    },
    {
        patterns: ['invalid public key', 'non-base58'],
        code: ERROR_CODES.INVALID_ADDRESS,
        message: ERROR_MESSAGES.INVALID_ADDRESS,
    },
    {
        patterns: ['network', 'fetch', 'econnrefused'],
        code: ERROR_CODES.NETWORK_ERROR,
        message: ERROR_MESSAGES.NETWORK_ERROR,
    },
    {
        patterns: ['could_not_find_any_route', 'could not find any route', 'no route found', 'route', 'slippage_too_low'],
        code: ERROR_CODES.SLIPPAGE_TOO_LOW,
        message: ERROR_MESSAGES.SLIPPAGE_TOO_LOW,
    },
] as const;
