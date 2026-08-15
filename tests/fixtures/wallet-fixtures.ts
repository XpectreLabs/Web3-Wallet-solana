// tests/fixtures/wallet-fixtures.ts
// ─────────────────────────────────────────────────────────────────────────────
// Extends Playwright's base test with a `page` that already has the mock
// Devnet wallet injected and ready before any navigation happens.
// ─────────────────────────────────────────────────────────────────────────────

import { test as base } from '@playwright/test';
import { buildMockWalletScript } from './mockWalletScript';
import 'dotenv/config';

export const test = base.extend({
  page: async ({ page }, use) => {
    const secretKeyJson = process.env.TEST_WALLET_SECRET_KEY;

    if (!secretKeyJson) {
      throw new Error(
        'TEST_WALLET_SECRET_KEY is not set. Run generate-test-keypair.js and add it to .env.test'
      );
    }

    const secretKeyArray: number[] = JSON.parse(secretKeyJson);

    // Injected BEFORE any page script runs, so wallet-adapter-react sees
    // this wallet the moment the app initializes — same as a real extension.
    await page.addInitScript(buildMockWalletScript(secretKeyArray));

    await use(page);
  },
});

export { expect } from '@playwright/test';
