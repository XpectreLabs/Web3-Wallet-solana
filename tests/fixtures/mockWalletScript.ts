// tests/fixtures/mockWalletScript.ts
// ─────────────────────────────────────────────────────────────────────────────
// Generates the JS string that gets injected into the browser page via
// page.addInitScript(). This code runs INSIDE the browser context, before
// your app loads, so @solana/wallet-adapter-react detects it exactly like
// it would detect real Phantom or Solflare.
//
// It implements the Solana Wallet Standard (the same protocol Phantom and
// Solflare use), backed by a real Devnet keypair. Signatures are real —
// only the "click Approve" popup is skipped.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the injectable mock wallet script.
 * @param secretKeyArray - the test keypair's secret key, as a plain number array
 *                         (e.g. JSON.parse(process.env.TEST_WALLET_SECRET_KEY))
 */
export function buildMockWalletScript(secretKeyArray: number[]): string {
  return `
(() => {
  // ── tweetnacl-style ed25519 sign, loaded from CDN inside the page ──
  // We load nacl dynamically because addInitScript runs before any of
  // your app's bundled dependencies exist.
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tweetnacl/1.0.3/nacl.min.js';
  document.head.appendChild(script);

  const SECRET_KEY = new Uint8Array(${JSON.stringify(secretKeyArray)});

  function waitForNacl(cb) {
    if (window.nacl) return cb();
    setTimeout(() => waitForNacl(cb), 20);
  }

  waitForNacl(() => {
    const keypair = window.nacl.sign.keyPair.fromSecretKey(SECRET_KEY);
    const publicKeyBytes = keypair.publicKey;

    // Minimal base58 encode (no external deps available in this injected context)
    const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    function toBase58(bytes) {
      let digits = [0];
      for (let i = 0; i < bytes.length; i++) {
        let carry = bytes[i];
        for (let j = 0; j < digits.length; j++) {
          carry += digits[j] << 8;
          digits[j] = carry % 58;
          carry = (carry / 58) | 0;
        }
        while (carry > 0) {
          digits.push(carry % 58);
          carry = (carry / 58) | 0;
        }
      }
      let result = '';
      for (let k = 0; bytes[k] === 0 && k < bytes.length - 1; k++) result += '1';
      for (let q = digits.length - 1; q >= 0; q--) result += ALPHABET[digits[q]];
      return result;
    }

    const publicKeyBase58 = toBase58(publicKeyBytes);

    const listeners = {};
    function emit(event, ...args) {
      (listeners[event] || []).forEach((fn) => fn(...args));
    }

    // ── The Wallet Standard wallet object ──
    const mockWallet = {
      version: '1.0.0',
      name: 'Playwright Mock Wallet',
      icon: 'data:image/svg+xml;base64,PHN2Zy8+', // empty placeholder icon
      chains: ['solana:devnet'],
      accounts: [
        {
          address: publicKeyBase58,
          publicKey: publicKeyBytes,
          chains: ['solana:devnet'],
          features: ['solana:signTransaction', 'solana:signMessage', 'solana:signAndSendTransaction'],
        },
      ],
      features: {
        'standard:connect': {
          version: '1.0.0',
          connect: async () => ({ accounts: mockWallet.accounts }),
        },
        'standard:disconnect': {
          version: '1.0.0',
          disconnect: async () => {},
        },
        'standard:events': {
          version: '1.0.0',
          on: (event, cb) => {
            listeners[event] = listeners[event] || [];
            listeners[event].push(cb);
            return () => {
              listeners[event] = listeners[event].filter((f) => f !== cb);
            };
          },
        },
        'solana:signTransaction': {
          version: '1.0.0',
          signTransaction: async (...inputs) => {
            return inputs.map((input) => {
              // input.transaction is the serialized message bytes to sign
              const signature = window.nacl.sign.detached(input.transaction, keypair.secretKey);
              return { signedTransaction: input.transaction, signature };
            });
          },
        },
        'solana:signMessage': {
          version: '1.0.0',
          signMessage: async (...inputs) => {
            return inputs.map((input) => {
              const signature = window.nacl.sign.detached(input.message, keypair.secretKey);
              return { signedMessage: input.message, signature };
            });
          },
        },
      },
    };

    // ── Register following the Wallet Standard protocol ──
    // 1. Answer apps that already dispatched "app-ready" before we loaded
    window.dispatchEvent(
      new CustomEvent('wallet-standard:register-wallet', {
        detail: { register: (cb) => cb(mockWallet) },
      })
    );

    // 2. Listen for apps that dispatch "app-ready" after we've loaded
    window.addEventListener('wallet-standard:app-ready', (event) => {
      event.detail.register(mockWallet);
    });
  });
})();
`;
}
