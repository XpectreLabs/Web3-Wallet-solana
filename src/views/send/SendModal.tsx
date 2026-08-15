import { FC, useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { notify } from '../../utils/notifications';
import { handleError } from '../../utils/errorHandler';
import { executeTransfer } from '../../utils/solana/signer';
import useUserSOLBalanceStore from '../../stores/useUserSOLBalanceStore';
import { sanitizeInput, isValidBase58Address, isPhishingAddress, isLargeTransaction } from '../../utils/security';
import { logAuditEvent } from '../../utils/security/auditLogger';

import { C } from '../../utils/theme';

// ── Types ─────────────────────────────────────────────────────────────────────
type TransferType = 'sol' | 'spl';

export interface SendModalProps {
    /** Controls whether the modal is visible */
    isOpen: boolean;
    /** Called when the user closes the modal (X button or backdrop click) */
    onClose: () => void;
}

// ── Helper: shared input style ────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: C.inputBg,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: '14px 16px',
    color: C.text,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
    color: C.muted,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
    display: 'block',
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * SendModal — standalone send transaction modal.
 *
 * Supports:
 *  - Native SOL transfers
 *  - SPL token transfers (requires Mint Address)
 *
 * Delegates all transaction logic to `executeTransfer()` in
 * `utils/solana/signer.ts` and surfaces errors via `notify()`.
 *
 * ⚠️  SPL Note: signer.ts currently assumes 9 decimal places for all tokens.
 *     Tokens like USDC (6) or BONK (5) will compute incorrect amounts until
 *     `getMint()` is integrated in signer.ts.
 *
 * Usage (when your teammate finishes home/index.tsx):
 *   const [sendOpen, setSendOpen] = useState(false);
 *   <SendModal isOpen={sendOpen} onClose={() => setSendOpen(false)} />
 */
export const SendModal: FC<SendModalProps> = ({ isOpen, onClose }) => {
    const { connection }                    = useConnection();
    const { publicKey, sendTransaction }    = useWallet();

    // ── Wallet / balance ──────────────────────────────────────────────────────
    const { balance: solBalance } = useUserSOLBalanceStore();

    // ── Form state ────────────────────────────────────────────────────────────
    const [transferType,     setTransferType]     = useState<TransferType>('sol');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount,           setAmount]           = useState('');
    const [mintAddress,      setMintAddress]      = useState('');
    const [loading,          setLoading]          = useState(false);
    const [inlineError,      setInlineError]      = useState<string | null>(null);
    const [inlineWarning,    setInlineWarning]    = useState<string | null>(null);
    const [isPhishing,       setIsPhishing]       = useState(false);

    // ── SPL token balance (fetched when mint address is valid) ────────────────
    const [splBalance,       setSplBalance]       = useState<number | null>(null);
    const [fetchingBalance,  setFetchingBalance]  = useState(false);

    // ── Reset form whenever modal opens ──────────────────────────────────────
    useEffect(() => {
        if (isOpen) {
            setTransferType('sol');
            setRecipientAddress('');
            setAmount('');
            setMintAddress('');
            setInlineError(null);
            setInlineWarning(null);
            setIsPhishing(false);
            setSplBalance(null);
        }
    }, [isOpen]);

    // ── Reactive security & warning checks ───────────────────────────────────
    useEffect(() => {
        setIsPhishing(false);
        setInlineWarning(null);

        const trimmedAddr = recipientAddress.trim();
        if (!trimmedAddr) return;

        // Phishing check
        if (isPhishingAddress(trimmedAddr)) {
            setIsPhishing(true);
            setInlineError('CRITICAL: Phishing address detected. This address is flagged as unsafe. Sending is disabled.');
            logAuditEvent('security', 'phishing_blocked', `Phishing address input detected: ${trimmedAddr}`);
            return;
        }

        // Clean phishing error if address was changed to something safe
        if (inlineError?.startsWith('CRITICAL: Phishing')) {
            setInlineError(null);
        }

        // Self-transfer check
        if (publicKey && trimmedAddr === publicKey.toBase58()) {
            setInlineWarning('Warning: The destination address is your own address (self-transfer).');
            return;
        }

        // Large transaction check
        const numAmt = parseFloat(amount);
        if (!isNaN(numAmt) && numAmt > 0 && isLargeTransaction(numAmt, transferType)) {
            setInlineWarning(`Warning: You are transferring a large amount of funds (${numAmt} ${transferType === 'sol' ? 'SOL' : 'tokens'}). Please double check the recipient.`);
        }
    }, [recipientAddress, amount, transferType, publicKey]);

    // ── Fetch SPL balance when mint address changes (debounced 600ms) ─────────
    // Solana public keys are always 32-44 characters in Base58
    useEffect(() => {
        if (transferType !== 'spl' || !publicKey || mintAddress.trim().length < 32) {
            setSplBalance(null);
            return;
        }

        const timeout = setTimeout(async () => {
            setFetchingBalance(true);
            try {
                const mint = new PublicKey(mintAddress.trim());
                // getAssociatedTokenAddress derives the token account address (no network call)
                const ata  = await getAssociatedTokenAddress(mint, publicKey);
                // getTokenAccountBalance fetches the actual balance from the RPC
                const info = await connection.getTokenAccountBalance(ata);
                setSplBalance(info.value.uiAmount ?? 0);
            } catch {
                // Invalid mint or sender has no account for this token
                setSplBalance(null);
            } finally {
                setFetchingBalance(false);
            }
        }, 600);

        return () => clearTimeout(timeout);
    }, [mintAddress, publicKey, connection, transferType]);

    // ── Close on Escape key ───────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // ── Form validation ───────────────────────────────────────────────────────
    function validate(): string | null {
        if (!recipientAddress.trim()) return 'Destination address is required.';
        
        // Phishing guard
        if (isPhishingAddress(recipientAddress)) {
            return 'CRITICAL: Phishing address detected. Sending is disabled.';
        }

        // Validar que la dirección de destino sea correcta (matemáticamente en Solana)
        if (!isValidBase58Address(recipientAddress)) {
            return 'The destination address is not a valid Solana address.';
        }

        const parsedAmount = parseFloat(amount);
        if (!amount || parsedAmount <= 0) return 'Amount must be greater than zero.';

        // Validar que no se supere el saldo disponible
        if (transferType === 'sol' && parsedAmount > solBalance) {
            return 'Insufficient SOL balance for this transaction.';
        }

        if (transferType === 'spl') {
            if (!mintAddress.trim()) return 'Token Mint Address is required for SPL transfers.';
            
            // Validar si es un mint válido
            if (!isValidBase58Address(mintAddress)) {
                return 'The mint address is not a valid Solana address.';
            }

            // Validar saldo si ya lo trajimos
            if (splBalance !== null && parsedAmount > splBalance) {
                return 'Insufficient SPL Token balance.';
            }
        }
        
        return null;
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSend = useCallback(async () => {
        // 1. Wallet guard
        if (!publicKey) {
            notify({ type: 'error', message: 'Wallet not connected!' });
            return;
        }

        // 2. Front-end validation
        const validationError = validate();
        if (validationError) {
            setInlineError(validationError);
            return;
        }
        setInlineError(null);
        setLoading(true);

        // 3. Call executeTransfer from utils/solana/signer.ts
        try {
            const signature = await executeTransfer({
                connection,
                senderPublicKey:  publicKey,
                sendTransaction,
                type:             transferType,
                recipientAddress: recipientAddress.trim(),
                amount:           parseFloat(amount),
                // mintAddress is only passed for SPL — undefined for SOL
                ...(transferType === 'spl' && { mintAddress: mintAddress.trim() }),
            });

            logAuditEvent(
                'transaction',
                'transfer_success',
                `Successfully sent ${amount} ${transferType === 'sol' ? 'SOL' : 'SPL'} to ${recipientAddress.trim()}`
            );

            notify({
                type:    'success',
                message: 'Transaction successful!',
                txid:    signature,
            });

            onClose(); // Close modal on success
        } catch (err: unknown) {
            const walletError = handleError(err, 'handleSend');
            notify({
                type:        'error',
                message:     walletError.message,
                description: walletError.code,
            });
        } finally {
            setLoading(false);
        }
    }, [
        publicKey, connection, sendTransaction,
        transferType, recipientAddress, amount, mintAddress, onClose,
    ]);

    // ── Don't render anything when closed ────────────────────────────────────
    if (!isOpen) return null;

    return (
        // ── Backdrop — clicking outside the card closes the modal ─────────────
        <div
            onClick={onClose}
            style={{
                position:        'fixed',
                inset:           0,
                zIndex:          100,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                backgroundColor: 'rgba(0,0,0,0.65)',
                backdropFilter:  'blur(4px)',
                padding:         '0 16px',
            }}
        >
            {/* ── Modal card — stopPropagation prevents backdrop from firing ── */}
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: C.surfaceSolid,
                    border:          `1px solid ${C.border}`,
                    borderRadius:    20,
                    padding:         28,
                    width:           '100%',
                    maxWidth:        480,
                    display:         'flex',
                    flexDirection:   'column',
                    gap:             20,
                    boxShadow:       '0 24px 64px rgba(0,0,0,0.5)',
                }}
            >
                {/* ── Header ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: 0 }}>
                        Send Crypto
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close modal"
                        style={{
                            background:   'none',
                            border:       'none',
                            color:        C.muted,
                            cursor:       'pointer',
                            fontSize:     22,
                            lineHeight:   1,
                            padding:      4,
                            borderRadius: 6,
                            transition:   'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = C.text)}
                        onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
                    >
                        ✕
                    </button>
                </div>

                {/* ── Transfer type selector: SOL / SPL Token ── */}
                <div>
                    <label style={labelStyle}>Transaction Type</label>
                    <div style={{
                        display:         'flex',
                        backgroundColor: C.inputBg,
                        border:          `1px solid ${C.border}`,
                        borderRadius:    12,
                        padding:         4,
                        gap:             4,
                    }}>
                        {(['sol', 'spl'] as TransferType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => { setTransferType(type); setInlineError(null); }}
                                style={{
                                    flex:            1,
                                    padding:         '10px 0',
                                    borderRadius:    9,
                                    border:          'none',
                                    backgroundColor: transferType === type ? C.gold : 'transparent',
                                    color:           transferType === type ? C.bg : C.muted,
                                    fontWeight:      700,
                                    fontSize:        14,
                                    cursor:          'pointer',
                                    transition:      'all 0.18s',
                                }}
                            >
                                {type === 'sol' ? 'SOL' : 'SPL Token'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Destination Address ── */}
                <div>
                    <label style={labelStyle}>Destination Address</label>
                    <input
                        style={inputStyle}
                        placeholder="Enter wallet address"
                        value={recipientAddress}
                        onChange={e => { setRecipientAddress(sanitizeInput(e.target.value)); setInlineError(null); }}
                        disabled={loading}
                        spellCheck={false}
                    />
                </div>

                {/* ── Amount ── */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>Amount</label>
                        {/* Available balance — shown for SOL always, for SPL once mint is resolved */}
                        <span style={{ color: C.muted, fontSize: 12 }}>
                            {transferType === 'sol' && (
                                <>Available: <strong style={{ color: C.text }}>{solBalance.toFixed(4)} SOL</strong></>
                            )}
                            {transferType === 'spl' && fetchingBalance && 'Fetching balance...'}
                            {transferType === 'spl' && !fetchingBalance && splBalance !== null && (
                                <>Available: <strong style={{ color: C.text }}>{splBalance.toLocaleString()}</strong></>
                            )}
                        </span>
                    </div>
                    <input
                        style={inputStyle}
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="any"
                        value={amount}
                        onChange={e => { setAmount(sanitizeInput(e.target.value)); setInlineError(null); }}
                        disabled={loading}
                    />
                </div>

                {/* ── Mint Address (SPL only) ── */}
                {transferType === 'spl' && (
                    <div>
                        <label style={labelStyle}>Token Mint Address</label>
                        <input
                            style={inputStyle}
                            placeholder="Enter token mint address"
                            value={mintAddress}
                            onChange={e => { setMintAddress(sanitizeInput(e.target.value)); setInlineError(null); }}
                            disabled={loading}
                            spellCheck={false}
                        />
                        {/* ATA creation warning — always shown for SPL */}
                        <p style={{
                            color:     C.muted,
                            fontSize:  12,
                            marginTop: 8,
                            lineHeight: 1.5,
                        }}>
                            ⚠️ If the recipient has never held this token, an Associated Token Account
                            will be created automatically. This costs ~<strong style={{ color: C.text }}>0.002 SOL</strong> in rent
                            and will be charged to your wallet.
                        </p>
                    </div>
                )}

                {/* ── Inline validation error ── */}
                {inlineError && (
                    <p style={{
                        color:        C.red,
                        fontSize:     13,
                        margin:       0,
                        padding:      '10px 14px',
                        backgroundColor: 'rgba(255,74,74,0.08)',
                        borderRadius: 8,
                        border:       `1px solid rgba(255,74,74,0.20)`,
                    }}>
                        {inlineError}
                    </p>
                )}

                {/* ── Inline warning ── */}
                {inlineWarning && !inlineError && (
                    <p style={{
                        color:        '#dea001',
                        fontSize:     13,
                        margin:       0,
                        padding:      '10px 14px',
                        backgroundColor: 'rgba(222,160,1,0.08)',
                        borderRadius: 8,
                        border:       `1px solid rgba(222,160,1,0.20)`,
                    }}>
                        {inlineWarning}
                    </p>
                )}

                {/* ── Fee estimate row ── */}
                <div style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'center',
                    borderTop:      `1px solid ${C.border}`,
                    paddingTop:     14,
                }}>
                    <span style={{ color: C.muted, fontSize: 13 }}>Network fee estimate</span>
                    <span style={{ color: C.muted, fontSize: 13 }}>~0.00005 SOL</span>
                </div>

                {/* ── Send button ── */}
                <button
                    onClick={handleSend}
                    disabled={loading || !publicKey || isPhishing}
                    style={{
                        width:           '100%',
                        padding:         '16px 0',
                        backgroundColor: loading || !publicKey || isPhishing ? 'rgba(220,158,0,0.35)' : C.gold,
                        color:           C.bg,
                        border:          'none',
                        borderRadius:    14,
                        fontSize:        16,
                        fontWeight:      800,
                        cursor:          loading || !publicKey || isPhishing ? 'not-allowed' : 'pointer',
                        transition:      'opacity 0.18s',
                        letterSpacing:   '0.3px',
                    }}
                    onMouseEnter={e => {
                        if (!loading && publicKey && !isPhishing) e.currentTarget.style.opacity = '0.88';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.opacity = '1';
                    }}
                >
                    {loading ? 'Sending...' : !publicKey ? 'Wallet not connected' : isPhishing ? 'Phishing Blocked' : 'Send Transaction'}
                </button>
            </div>
        </div>
    );
};
