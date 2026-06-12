import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { handleError } from '../errorHandler';

/**
 * Fetches the SOL balance for a given wallet address from the Solana network.
 * Converts the result from lamports (smallest unit) to SOL.
 *
 * Returns null when the request fails so callers can distinguish between
 * a genuine zero balance and a network/RPC error.
 *
 * @param publicKey  - The wallet's public key to query
 * @param connection - An active RPC connection to the Solana cluster
 * @returns The wallet's balance in SOL (e.g. 1.5), or null on error
 */
export async function getUserSOLBalance(
    publicKey: PublicKey,
    connection: Connection
): Promise<number | null> {
    try {
        const balanceLamports = await connection.getBalance(publicKey, 'confirmed');
        // LAMPORTS_PER_SOL = 1_000_000_000 (10^9)
        return balanceLamports / LAMPORTS_PER_SOL;
    } catch (e) {
        // Route the error through the central handler.
        // handleError logs it to the console and returns a structured WalletError.
        handleError(e, 'getUserSOLBalance');
        // Return null to signal failure without hiding it behind a numeric value
        return null;
    }
}
