import { Connection, LAMPORTS_PER_SOL, PublicKey, TransactionSignature } from '@solana/web3.js';
import { handleError } from '../errorHandler';
import { SOLANA_FAUCET_URL } from '../constants';

export interface AirdropResult {
    signature: TransactionSignature;
    method: 'localnet' | 'faucet' | 'rpc';
}

/**
 * Requests a 1-SOL airdrop for the given wallet address.
 *
 * Strategy (in order):
 *  1. Localnet  → direct RPC airdrop (no rate limits).
 *  2. Devnet/Testnet → official Solana faucet API (faucet.solana.com).
 *  3. Fallback  → direct RPC call if the faucet API fails.
 *
 * @param publicKey          - Recipient wallet public key
 * @param connection         - Active RPC connection
 * @param networkConfiguration - Value from useNetworkConfiguration hook ('localnet' | 'devnet' | 'mainnet-beta' …)
 * @returns AirdropResult with the confirmed signature and method used
 * @throws WalletError on failure (classifies known patterns via handleError)
 */
export async function requestAirdrop(
    publicKey: PublicKey,
    connection: Connection,
    networkConfiguration: string
): Promise<AirdropResult> {
    let signature: TransactionSignature = '';

    // ── 1. Localnet: unlimited direct RPC airdrop ────────────────────────────
    if (networkConfiguration === 'localnet') {
        try {
            signature = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
            const latestBlockhash = await connection.getLatestBlockhash();
            await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
            return { signature, method: 'localnet' };
        } catch (err) {
            throw handleError(err, 'requestAirdrop — localnet');
        }
    }

    // ── 2. Devnet/Testnet: official Solana faucet API ────────────────────────
    try {
        const resp = await fetch(`${SOLANA_FAUCET_URL}/api/request_airdrop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pubkey: publicKey.toBase58(),
                lamports: LAMPORTS_PER_SOL,
            }),
        });

        if (resp.ok) {
            const data = await resp.json();
            signature = data?.signature ?? '';

            if (signature) {
                const latestBlockhash = await connection.getLatestBlockhash();
                await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
                return { signature, method: 'faucet' };
            }
        }

        // Faucet returned a non-OK response → log and fall through to RPC
        const errText = await resp.text().catch(() => '');
        console.warn('Faucet API error, falling back to RPC:', resp.status, errText);
    } catch (faucetErr) {
        console.warn('Faucet API unavailable, falling back to RPC:', faucetErr);
    }

    // ── 3. Fallback: direct RPC airdrop ─────────────────────────────────────
    try {
        signature = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
        const latestBlockhash = await connection.getLatestBlockhash();
        await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
        return { signature, method: 'rpc' };
    } catch (err) {
        throw handleError(err, 'requestAirdrop — rpc fallback');
    }
}
