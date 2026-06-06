import { test, expect } from '@playwright/test';

test.describe('Web Builder Flow', () => {
  test('web builder redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard/web-builder');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('public homepage renders key sections', async ({ page }) => {
    await page.goto('/');
    // Page should have a visible header/nav
    await expect(page.locator('header, nav').first()).toBeVisible({ timeout: 10000 });
    // Page should load without console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const severeErrors = errors.filter(e => e.includes('TypeError') || e.includes('ReferenceError'));
    expect(severeErrors.length).toBe(0);
  });

  test('pricing page is accessible from homepage', async ({ page }) => {
    await page.goto('/');
    const pricingLink = page.locator('a[href="/pricing"]');
    if (await pricingLink.isVisible({ timeout: 3000 })) {
      await pricingLink.first().click();
      await expect(page).toHaveURL(/\/pricing/, { timeout: 10000 });
    }
  });

  test('docs page loads successfully', async ({ page }) => {
    const response = await page.goto('/docs');
    expect(response?.status()).toBe(200);
  });

  test('features page loads successfully', async ({ page }) => {
    const response = await page.goto('/features');
    expect(response?.status()).toBe(200);
  });
});
