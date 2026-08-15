import { ERROR_CODES } from '../errorConstants';
import {
  JUPITER_QUOTE_URL,
  JUPITER_SWAP_URL,
  JUPITER_FALLBACK_QUOTE_URL,
  JUPITER_FALLBACK_SWAP_URL,
  JUPITER_TOKEN_LIST_URL,
} from '../constants';

export interface JupiterToken {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
}

export const TOKENS = {
  SOL: {
    symbol: 'SOL',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
  },
  USDC: {
    symbol: 'USDC',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Mainnet USDC
    decimals: 6,
  }
};

/**
 * Calls the Jupiter v6 API to get a swap quote.
 * @param inputMint Token the user is paying
 * @param outputMint Token the user wants to receive
 * @param amount Amount in human-readable format (e.g., 1 SOL)
 * @param slippageBps Slippage in Basis Points (e.g., 50 = 0.5%)
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50,
  inputDecimals: number = 9
): Promise<JupiterQuoteResponse | null> {
  if (amount <= 0) return null;

  // 1. Convert human-readable amount to minimum units
  const amountInMinUnits = Math.floor(amount * Math.pow(10, inputDecimals));

  // 2. Try the official Jupiter API first
  try {
    const url = `${JUPITER_QUOTE_URL}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInMinUnits}&slippageBps=${slippageBps}`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (!data.error) {
        return data as JupiterQuoteResponse;
      }
    } else {
      // If the response is not OK (e.g. status 400), check if it's a "no route found" error
      try {
        const errData = await response.json();
        if (errData.errorCode === ERROR_CODES.SLIPPAGE_TOO_LOW || errData.message?.toLowerCase().includes('route')) {
          throw new Error(ERROR_CODES.SLIPPAGE_TOO_LOW);
        }
      } catch (e) {
        if (e instanceof Error && e.message === ERROR_CODES.SLIPPAGE_TOO_LOW) {
          throw e;
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message === ERROR_CODES.SLIPPAGE_TOO_LOW) {
      throw err;
    }
    console.warn('Official Jupiter quote API failed (possibly due to DNS block), trying QuickNode mirror...', err);
  }

  // 3. Fallback to the QuickNode public mirror (limited token support: SOL, USDC, USDT)
  const url = `${JUPITER_FALLBACK_QUOTE_URL}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInMinUnits}&slippageBps=${slippageBps}`;
  const response = await fetch(url);
  if (!response.ok) {
      const errorText = await response.text();
      if (errorText.includes(ERROR_CODES.SLIPPAGE_TOO_LOW) || errorText.toLowerCase().includes('route')) {
        throw new Error(ERROR_CODES.SLIPPAGE_TOO_LOW);
      }
      throw new Error(`Jupiter Quote Error: ${errorText}`);
  }
  const data = await response.json();
  
  if (data.error) {
      if (data.error.includes(ERROR_CODES.SLIPPAGE_TOO_LOW) || data.error.toLowerCase().includes('route')) {
        throw new Error(ERROR_CODES.SLIPPAGE_TOO_LOW);
      }
      throw new Error(data.error);
  }
  
  return data as JupiterQuoteResponse;
}

const FALLBACK_TOKENS: JupiterToken[] = [
  {
    address: 'So11111111111111111111111111111111111111112',
    chainId: 101,
    decimals: 9,
    name: 'Solana',
    symbol: 'SOL',
    logoURI: ''
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    chainId: 101,
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    logoURI: ''
  },
  {
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    chainId: 101,
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
    logoURI: ''
  }
];

let cachedJupiterTokens: JupiterToken[] | null = null;

/**
 * Fetches the strict list of verified tokens from Jupiter.
 * Uses an in-memory cache to prevent redundant network requests.
 */
export async function getJupiterTokens(): Promise<JupiterToken[]> {
  if (cachedJupiterTokens) {
    return cachedJupiterTokens;
  }

  try {
    const res = await fetch(JUPITER_TOKEN_LIST_URL);
    if (!res.ok) return FALLBACK_TOKENS;
    
    const list = await res.json() as JupiterToken[];
    if (list.length > 0) {
      cachedJupiterTokens = list;
      return list;
    }
    
    return FALLBACK_TOKENS;
  } catch (err) {
    console.error('Failed to fetch Jupiter tokens:', err);
    return FALLBACK_TOKENS;
  }
}

/**
 * Calls the Jupiter v6 API to request the assembled transaction (POST /swap).
 * @param quoteResponse The exact quote object returned by getJupiterQuote.
 * @param userPublicKey The base58 public key string of the user's wallet.
 * @returns The base64 encoded transaction, or null if it fails.
 */
export async function getJupiterSwapTransaction(
  quoteResponse: JupiterQuoteResponse,
  userPublicKey: string
): Promise<string | null> {
  const body = {
    quoteResponse,
    userPublicKey,
    wrapAndUnwrapSol: true,
  };

  // 1. Try the official Jupiter API first
  try {
    const response = await fetch(JUPITER_SWAP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (response.ok) {
      const data = await response.json();
      if (data.swapTransaction) {
        return data.swapTransaction as string;
      }
    }
  } catch (err) {
    console.warn('Official Jupiter swap API failed, trying QuickNode mirror...', err);
  }

  // 2. Fallback to the QuickNode public mirror
  const url = JUPITER_FALLBACK_SWAP_URL;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      console.error('Jupiter Swap Error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.swapTransaction as string; // This is a base64 encoded string!
  } catch (err) {
    console.error('Failed to get swap transaction from Jupiter:', err);
    return null;
  }
}
