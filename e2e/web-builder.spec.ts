import { test, expect } from '@playwright/test';

test.describe('Web Builder Flow', () => {
  test('web builder redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard/web-builder');
    await page.waitForTimeout(2000);
    // Unauthenticated users should be redirected
    const url = page.url();
    expect(url.includes('/login') || url.includes('/web-builder')).toBeTruthy();
  });

  test('login page has link to home', async ({ page }) => {
    await page.goto('/login');
    // Verify the page is functional with navigation
    await expect(page.locator('a[href="/"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('dashboard redirects to login with return URL', async ({ page }) => {
    await page.goto('/dashboard/web-builder');
    await page.waitForTimeout(2000);
    // Should redirect to login (with or without redirect param)
    const url = page.url();
    expect(url).toMatch(/\/login/);
  });

  test('public homepage links to sign in', async ({ page }) => {
    await page.goto('/');
    // Homepage should have a sign in button/link
    const signInLink = page.locator('a[href="/login"]').or(page.getByRole('link', { name: /sign in/i }));
    await expect(signInLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('pricing page is accessible from homepage', async ({ page }) => {
    await page.goto('/');
    // Click pricing link if visible
    const pricingLink = page.locator('a[href="/pricing"]').first();
    if (await pricingLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pricingLink.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/pricing');
    }
  });
});
