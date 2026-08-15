import { FC, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

import { C } from '../../utils/theme';

export interface BuyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const BuyModal: FC<BuyModalProps> = ({ isOpen, onClose }) => {
    const { publicKey } = useWallet();

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Build the MoonPay URL
    // Note: In production, you would append your MoonPay API Key: &apiKey=pk_live_...
    const walletParam = publicKey ? `&walletAddress=${publicKey.toBase58()}` : '';
    const moonpayUrl = `https://buy.moonpay.com?currencyCode=sol&colorCode=${encodeURIComponent(C.gold)}${walletParam}`;

    return (
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
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: C.surfaceSolid,
                    border:          `1px solid ${C.border}`,
                    borderRadius:    20,
                    padding:         '28px 0 0 0',
                    width:           '100%',
                    maxWidth:        420,
                    height:          'auto',
                    display:         'flex',
                    flexDirection:   'column',
                    boxShadow:       '0 24px 64px rgba(0,0,0,0.5)',
                    overflow:        'hidden',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px 20px 28px' }}>
                    <h2 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: 0 }}>
                        Buy Solana (SOL)
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

                {/* MoonPay Redirect Info */}
                <div style={{ flex: 1, backgroundColor: C.surfaceSolid, padding: '0 28px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {!publicKey && (
                        <div style={{ 
                            flex: 1,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            borderRadius: 16,
                            color: C.muted,
                            flexDirection: 'column',
                            gap: 12,
                            padding: 24,
                            textAlign: 'center'
                        }}>
                            <p>Please connect your wallet first to purchase SOL.</p>
                        </div>
                    )}
                    {publicKey && (
                        <>
                            <div style={{
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderRadius: 16,
                                padding: 24,
                                textAlign: 'center',
                                border: `1px solid ${C.border}`
                            }}>
                                <p style={{ color: C.text, fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
                                    We partner with <strong>MoonPay</strong> to provide a secure and fast way to purchase SOL using your credit card, debit card, or bank transfer.
                                </p>
                                <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
                                    For your security, MoonPay runs in a verified external window. The purchased SOL will be sent directly to your connected wallet address.
                                </p>
                            </div>

                            <button
                                onClick={() => window.open(moonpayUrl, 'MoonPay', 'width=450,height=750,noopener,noreferrer')}
                                style={{
                                    width:           '100%',
                                    padding:         '16px 0',
                                    backgroundColor: C.gold,
                                    color:           C.bg,
                                    border:          'none',
                                    borderRadius:    14,
                                    fontSize:        16,
                                    fontWeight:      800,
                                    cursor:          'pointer',
                                    transition:      'opacity 0.18s',
                                    marginTop:       'auto',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                            >
                                Continue to MoonPay
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
