// src/utils/constants.ts
// ─────────────────────────────────────────────────────────────────────────────
// Application-wide constants.
//
// All external API URLs, timeouts, and magic numbers are defined here so they
// are easy to find, update, and audit in one place. No logic belongs in this
// file — only named constants.
// ─────────────────────────────────────────────────────────────────────────────

// ── Jupiter API ───────────────────────────────────────────────────────────────

/** Official Jupiter v6 swap quote endpoint */
export const JUPITER_QUOTE_URL    = 'https://quote-api.jup.ag/v6/quote';

/** Official Jupiter v6 swap transaction endpoint */
export const JUPITER_SWAP_URL     = 'https://quote-api.jup.ag/v6/swap';

/** QuickNode public mirror for Jupiter quotes (fallback when official API is blocked) */
export const JUPITER_FALLBACK_QUOTE_URL = 'https://public.jupiterapi.com/quote';

/** QuickNode public mirror for Jupiter swaps (fallback when official API is blocked) */
export const JUPITER_FALLBACK_SWAP_URL  = 'https://public.jupiterapi.com/swap';

/** Jupiter strict token list — verified tokens only */
export const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/strict';

/** Jupiter Price API v2 — used as CoinGecko fallback for SOL price */
export const JUPITER_PRICE_API_URL = 'https://api.jup.ag/price/v2';

/** SOL mint address used as the Jupiter Price API query key */
export const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';

// ── CoinGecko API ─────────────────────────────────────────────────────────────

/** CoinGecko simple price endpoint for SOL/USD with 24h change */
export const COINGECKO_SOL_PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true';

// ── Solana Faucet ─────────────────────────────────────────────────────────────

/** Official Solana faucet base URL — used for Devnet/Testnet airdrops */
export const SOLANA_FAUCET_URL = 'https://faucet.solana.com';

// ── UI Timings ────────────────────────────────────────────────────────────────

/** How often (ms) the SOL/USD price refreshes from CoinGecko */
export const PRICE_REFRESH_INTERVAL_MS = 60_000;

/** Debounce delay (ms) before requesting a Jupiter swap quote after user input */
export const QUOTE_DEBOUNCE_MS = 500;

/** Debounce delay (ms) before fetching SPL token balance after mint address input */
export const SPL_BALANCE_DEBOUNCE_MS = 600;

/** Minimum ms between tab navigation actions to prevent API spam */
export const TAB_CHANGE_COOLDOWN_MS = 800;

/** Timeout (ms) for external price fetch requests */
export const PRICE_FETCH_TIMEOUT_MS = 8_000;
