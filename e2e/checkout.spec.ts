import { test, expect } from '@playwright/test';

test.describe('Checkout & Pricing Flow', () => {
  test('pricing page returns 200', async ({ page }) => {
    const response = await page.goto('/pricing');
    expect(response?.status()).toBe(200);
  });

  test('pricing page renders FREE plan', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText('Free', { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

  test('pricing page renders Pro plan', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText('Pro', { exact: false }).first()).toBeVisible({ timeout: 10000 });
  });

  test('pricing page has at least one CTA button', async ({ page }) => {
    await page.goto('/pricing');
    const buttons = page.locator('a[href*="checkout"], button, a[href*="signup"], a[href*="sign-up"]');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('billing page redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard/billing');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('checkout requires authentication', async ({ page }) => {
    const response = await page.goto('/dashboard/billing');
    // Either a redirect happened or the URL indicates auth is required
    const url = page.url();
    expect(url).toMatch(/\/login/);
  });
});
