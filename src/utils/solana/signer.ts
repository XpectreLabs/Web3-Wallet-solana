import {
    Connection,
    PublicKey,
    SystemProgram,
    TransactionMessage,
    VersionedTransaction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
} from '@solana/spl-token';
import { verify } from '@noble/ed25519';
import { handleError, WalletError } from '../errorHandler';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TransferParams {
    connection: Connection;
    senderPublicKey: PublicKey;
    sendTransaction: (
        transaction: VersionedTransaction,
        connection: Connection
    ) => Promise<string>;
    type: 'sol' | 'spl';
    recipientAddress: string;
    amount: number;
    mintAddress?: string;
}

// ── Functions ──────────────────────────────────────────────────────────────────

/**
 * Reusable service to perform SOL or SPL token transfers
 * compatible with the web interface (using Wallet Adapter).
 *
 * On failure, throws a structured WalletError (never a raw JS Error) so that
 * every caller receives a consistent, user-friendly error shape.
 *
 * @param params Transfer parameters
 * @returns The signature of the confirmed transaction
 * @throws {WalletError} when validation or network steps fail
 */
export async function executeTransfer({
    connection,
    senderPublicKey,
    sendTransaction,
    type,
    recipientAddress,
    amount,
    mintAddress,
}: TransferParams): Promise<string> {
    // 1. Input validation
    let recipient: PublicKey;
    try {
        recipient = new PublicKey(recipientAddress);
    } catch (err) {
        // handleError classifies this as INVALID_ADDRESS and logs to console.
        // We re-throw the returned WalletError so the caller can display it.
        throw handleError(err, 'executeTransfer — recipient address');
    }

    if (amount <= 0) {
        // Build a WalletError manually for a known validation rule, then throw it.
        throw handleError(
            new Error('Amount to send must be greater than zero.'),
            'executeTransfer — amount validation'
        );
    }

    const instructions = [];

    // 2. Instruction construction based on transfer type
    if (type === 'sol') {
        // Send native SOL: 1 SOL = 10^9 Lamports
        const lamports = amount * LAMPORTS_PER_SOL;
        instructions.push(
            SystemProgram.transfer({
                fromPubkey: senderPublicKey,
                toPubkey: recipient,
                lamports,
            })
        );
    } else {
        // Send SPL Token
        if (!mintAddress) {
            throw handleError(
                new Error('Mint address is required to send SPL tokens.'),
                'executeTransfer — mint address missing'
            );
        }

        let mint: PublicKey;
        try {
            mint = new PublicKey(mintAddress);
        } catch (err) {
            throw handleError(err, 'executeTransfer — mint address');
        }

        // Derive Associated Token Account (ATA) addresses for both sides
        // getAssociatedTokenAddress is a pure PDA derivation — no network call
        const senderATA    = await getAssociatedTokenAddress(mint, senderPublicKey);
        const recipientATA = await getAssociatedTokenAddress(mint, recipient);

        // Check on-chain whether the recipient already has a token account.
        // If not, we add an instruction to create it (costs ~0.002 SOL in rent).
        let recipientATAInfo;
        try {
            recipientATAInfo = await connection.getAccountInfo(recipientATA);
        } catch (err) {
            throw handleError(err, 'executeTransfer — getAccountInfo (recipient ATA)');
        }

        if (recipientATAInfo === null) {
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    senderPublicKey, // Payer of rent for the new account
                    recipientATA,    // New associated token account address
                    recipient,       // Owner (recipient wallet)
                    mint             // Token mint address
                )
            );
        }

        // Default to 9 decimals for standard tokens.
        // Note: In production, fetch dynamically using getMint(connection, mint).
        const decimals = 9;
        const amountInMinUnits = amount * Math.pow(10, decimals);

        instructions.push(
            createTransferInstruction(
                senderATA,
                recipientATA,
                senderPublicKey,
                amountInMinUnits
            )
        );
    }

    // 3. Build versioned transaction (V0 format)
    let blockhash: string;
    let lastValidBlockHeight: number;
    try {
        const result = await connection.getLatestBlockhash();
        blockhash            = result.blockhash;
        lastValidBlockHeight = result.lastValidBlockHeight;
    } catch (err) {
        throw handleError(err, 'executeTransfer — getLatestBlockhash');
    }

    const messageV0 = new TransactionMessage({
        payerKey: senderPublicKey,
        recentBlockhash: blockhash,
        instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // 4. Send and confirm — wrapped in try/catch to capture network and wallet errors.
    //    This covers: user rejection, insufficient funds, blockhash expiry, RPC issues.
    try {
        // Request signature from Wallet Adapter (triggers browser wallet popup)
        const signature = await sendTransaction(transaction, connection);

        // Wait for on-chain confirmation
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

        return signature;
    } catch (err) {
        // classifySolanaError inside handleError will map known patterns
        // (e.g. "User rejected", "0x1 insufficient funds") to readable messages.
        throw handleError(err, 'executeTransfer — send & confirm');
    }
}

/**
 * Verifies that a message was signed by the wallet matching the given public key.
 * Uses the @noble/ed25519 library for cryptographic verification.
 *
 * @param signature - The raw signature bytes returned by wallet.signMessage()
 * @param message   - The original message bytes that were signed
 * @param publicKey - The Solana PublicKey of the signer
 * @returns true if the signature is valid, false otherwise
 */
export async function verifyMessageSignature(
    signature: Uint8Array,
    message: Uint8Array,
    publicKey: PublicKey
): Promise<boolean> {
    return verify(signature, message, publicKey.toBytes());
}

