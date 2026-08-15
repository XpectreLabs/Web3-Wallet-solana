// tests/wallet-connect.spec.ts
import { test, expect } from '../tests/fixtures/wallet-fixtures';

test('user can connect wallet and see their balance', async ({ page }) => {
  await page.goto('/');

  // Splash screen — ConnectWallet.tsx
  await expect(page.getByText('Access your Crypto')).toBeVisible();

  // WalletMultiButton opens the wallet-adapter modal
  await page.getByRole('button', { name: /connect wallet/i }).click();

  // wallet-adapter's modal lists our mock wallet by name
  await page.getByRole('button', { name: /XpectreWallet/i }).click();

  // --- Llenar el formulario de creación de wallet ---
  await page.getByRole('textbox').fill('TestPassword123!');
  await page.getByRole('button', { name: /Generate Seed Phrase/i }).click();

  // --- NUEVO PASO: Confirmar la frase semilla ---
  await page.getByRole('button', { name: /I Saved It\. Complete Setup/i }).click();

  // After connecting, the dashboard should render — balance card visible
  // After connecting, the dashboard should render — balance card visible
  await expect(page.getByRole('heading', { name: 'SOL Price History' })).toBeVisible({ timeout: 10_000 });

  // The wallet pill in TopHeader should show a truncated address
  await expect(page.locator('text=/^[1-9A-HJ-NP-Za-km-z]{4}\\.\\.\\./')).toBeVisible();
});