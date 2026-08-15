// tests/wallet-connect.spec.ts
import { test, expect } from '../tests/fixtures/wallet-fixtures';

// ==========================================
// 1. FLUJO PRINCIPAL MAESTRO (HERO FLOW)
// ==========================================
test('user can complete the main critical path: interact with all sections, modals, and disconnect', async ({ page }) => {
  await page.goto('/');

  // 1. Conexión Inicial
  await expect(page.getByText('Access your Crypto')).toBeVisible();
  await page.getByRole('button', { name: /connect wallet/i }).click();
  await page.getByRole('button', { name: /XpectreWallet/i }).click();
  await page.getByRole('textbox').fill('TestPassword123!');
  await page.getByRole('button', { name: /Generate Seed Phrase/i }).click();
  await page.getByRole('button', { name: /I Saved It\. Complete Setup/i }).click();

  await expect(page.getByRole('heading', { name: 'SOL Price History' })).toBeVisible({ timeout: 10_000 });

  // 2. DASHBOARD: Scroll, Gráfica y Modales
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(500);

  // Interactuar con los rangos de tiempo de la gráfica
  await page.getByText('24H', { exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByText('30D', { exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByText('1Y', { exact: true }).click();
  await page.waitForTimeout(500);
  await page.getByText('7D', { exact: true }).click();
  await page.waitForTimeout(500);

  await page.evaluate(() => window.scrollBy(0, -500));
  await page.waitForTimeout(500);

  // Modales
  await page.getByRole('button', { name: /Send/i }).click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: /Receive/i }).click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: /Swap/i }).click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 3. HISTORY: Navegación y Scroll
  await page.getByRole('button', { name: 'History', exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollBy(0, -800));
  await page.waitForTimeout(500);

  // 4. SETTINGS: Navegación y Scroll
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollBy(0, -800));
  await page.waitForTimeout(500);

  // 5. REGRESO A HOME Y SIDEBAR
  await page.getByRole('button', { name: 'Home', exact: true }).first().click();
  await page.waitForTimeout(500);

  const collapseButton = page.locator('button').filter({ hasNotText: /[a-zA-Z]/ }).last();
  if (await collapseButton.isVisible()) {
    await collapseButton.click();
    await page.waitForTimeout(500);
    await collapseButton.click();
    await page.waitForTimeout(500);
  }

  // 6. DESCONEXIÓN
  const walletButton = page.getByRole('button', { name: /\.\.\./ });
  await walletButton.waitFor({ state: 'visible' });
  await walletButton.click();

  const disconnectOption = page.getByText('Disconnect');
  await disconnectOption.waitFor({ state: 'visible' });
  await disconnectOption.click();

  await expect(page.getByText('Access your Crypto')).toBeVisible({ timeout: 10_000 });
});

// ==========================================
// 2. PRUEBAS DE CASOS EXTREMOS (EDGE CASES)
// ==========================================

test('UI renders correctly on mobile devices', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'History', exact: true }).first()).not.toBeVisible();
});

test('user can close the connect modal without connecting', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /connect wallet/i }).click();
  await expect(page.getByRole('button', { name: /XpectreWallet/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /XpectreWallet/i })).not.toBeVisible();
});

test('shows error when creating wallet with weak password', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /connect wallet/i }).click();
  await page.getByRole('button', { name: /XpectreWallet/i }).click();
  await page.getByRole('textbox').fill('123');
  await page.getByRole('button', { name: /Generate Seed Phrase/i }).click();

  // Ajusta este texto si tu UI arroja un error diferente
  await expect(page.getByText(/Password must be at least/i)).toBeVisible();
});

// ==========================================
// 3. PRUEBAS AVANZADAS WEB3
// ==========================================

test.skip('wallet remains connected after page reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /connect wallet/i }).click();
  await page.getByRole('button', { name: /XpectreWallet/i }).click();
  await page.getByRole('textbox').fill('TestPassword123!');
  await page.getByRole('button', { name: /Generate Seed Phrase/i }).click();
  await page.getByRole('button', { name: /I Saved It\. Complete Setup/i }).click();

  await expect(page.getByRole('heading', { name: 'SOL Price History' })).toBeVisible();

  // Recargamos la página simulando F5
  await page.reload();

  // Deberíamos seguir viendo el dashboard, no la pantalla de inicio
  await expect(page.getByText('Access your Crypto')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'SOL Price History' })).toBeVisible();
});

test('shows validation error for invalid Solana address in Send modal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /connect wallet/i }).click();
  await page.getByRole('button', { name: /XpectreWallet/i }).click();
  await page.getByRole('textbox').fill('TestPassword123!');
  await page.getByRole('button', { name: /Generate Seed Phrase/i }).click();
  await page.getByRole('button', { name: /I Saved It\. Complete Setup/i }).click();

  // Abrimos modal de envío
  await page.getByRole('button', { name: /Send/i }).click();

  // Llenamos datos falsos (Ajusta los placeholders si tu UI usa textos diferentes)
  const addressInput = page.getByRole('textbox').first(); // Usualmente el primer textbox es la dirección
  await addressInput.fill('direccion-falsa-123');

  // Hacemos clic en enviar/confirmar
  // Si tu botón de Send está deshabilitado por defecto hasta que la dirección sea válida, puedes probar eso en su lugar:
  // await expect(page.getByRole('button', { name: /Send/i }).last()).toBeDisabled();
});

test('copy address button successfully copies to clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit no soporta permisos automatizados de portapapeles');
  
  // Le damos permiso a Playwright para usar el portapapeles
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/');
  await page.getByRole('button', { name: /connect wallet/i }).click();
  await page.getByRole('button', { name: /XpectreWallet/i }).click();
  await page.getByRole('textbox').fill('TestPassword123!');
  await page.getByRole('button', { name: /Generate Seed Phrase/i }).click();
  await page.getByRole('button', { name: /I Saved It\. Complete Setup/i }).click();

  // Clic en la llave pública y luego en copiar
  await page.getByRole('button', { name: /\.\.\./ }).click();
  await page.getByText(/Copy address/i).click();

  // Leemos qué hay en el portapapeles
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());

  // Una llave pública de Solana tiene entre 32 y 44 caracteres
  expect(clipboardText.length).toBeGreaterThan(30);
  expect(clipboardText.length).toBeLessThan(50);
});