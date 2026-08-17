# Xpectre Wallet — Solana Web3 dApp

Xpectre Wallet is a decentralized application (dApp) built on Solana, designed to provide a fast, secure, and seamless experience for managing crypto assets and connecting to Web3. This project is built on top of the official [Solana dApp Scaffold Next](https://github.com/solana-labs/dapp-scaffold), extended with a custom design system, transaction history, token swaps, security features, and E2E testing.

| Responsive | Desktop |
| :---: | :---: |
| ![](./Xpectre-mobile.png) | ![](./Xpectre-desktop.png) |

---

## Tech Stack

- **Next.js** (Pages Router) + **TypeScript**
- **Tailwind CSS**
- **Solana Web3.js** + **Wallet Adapter** (Phantom, Solflare)
- **Jupiter API** for token swaps
- **Playwright** for E2E testing

---

## Getting Started

### Installation

```bash
npm install
# or
yarn install
```

### Build and Run

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The app defaults to Devnet; switch networks from the settings view.

### Docker

```bash
docker compose up --build
```

Serves the production build on [http://localhost:3000](http://localhost:3000). The image is multi-stage and ships only the Next.js standalone output.

---

## Project Structure

```
├── public         : publicly hosted assets
├── src            : primary source code
│   ├── components : reusable UI components
│   ├── contexts   : React contexts for global state (wallet, network, autoconnect)
│   ├── hooks      : custom React hooks (transaction history, clipboard, etc.)
│   ├── models     : shared TypeScript types
│   ├── pages      : Next.js routes and page entry points
│   ├── stores     : Zustand stores for state management (balance, notifications)
│   ├── styles     : global and reusable styles
│   ├── utils      : helper functions (Solana integration, security, explorer links, theme tokens)
│   └── views      : page-level views composed from components (home, history, market, send, settings)
```

---

## End-to-End Testing (Playwright)

This project uses [Playwright](https://playwright.dev/) for full E2E UI and Web3 interaction testing. A mock Solana wallet is injected to test critical paths securely, without requiring real browser extensions.

### 1. Environment Setup

Copy the example env file:

```bash
cp .env.example .env.test
```

Generate a local test keypair and add it to your new `.env.test` file:

```bash
node generate-test-keypair.js
```

Your `.env.test` should now have a `TEST_WALLET_SECRET_KEY` variable.

> **Note:** `.env.test` is gitignored. Never commit real secret keys — this keypair should only ever hold Devnet test funds.

### 2. Running the Tests

To execute the full E2E test suite (main wallet flow, mobile responsiveness, and UI error handling):

```bash
yarn playwright test
```

### 3. Viewing the Results

To see video recordings and traces of every test run:

```bash
yarn playwright show-report
```

---

## Roadmap

Work currently in flight — each item is an open pull request or an active branch:

- **Mobile navigation refactor** — expandable search, bottom nav rework and viewport height fixes ([#134](https://github.com/XpectreLabs/Web3-Wallet-solana/pull/134))
- **Next.js 13 → 16 upgrade** ([#143](https://github.com/XpectreLabs/Web3-Wallet-solana/pull/143))
- **Dynamic mint decimals for SPL transfers** — the transfer builder currently assumes 9 decimals; reading precision from the mint makes it correct for every token
- **Expanded Playwright coverage** — additional mobile Safari and WebKit paths ([`test/e2e-setup`](https://github.com/XpectreLabs/Web3-Wallet-solana/tree/test/e2e-setup))

---

## Contributing

Anyone is welcome to open an issue to discuss, build, or request a feature. Please follow the existing project architecture and style when contributing.

1. Fork the repo on GitHub
2. Clone the project to your own machine
3. Commit changes to your own branch
4. Push your work back up to your fork
5. Submit a Pull Request so we can review your changes

**NOTE**: Be sure to merge the latest from "upstream" before making a pull request!

---

## License

Apache-2.0. See [LICENSE](LICENSE).