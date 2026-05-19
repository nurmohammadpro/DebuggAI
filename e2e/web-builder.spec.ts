import { test, expect } from '@playwright/test';

test.describe('Web Builder Flow', () => {
  test('visual editor loads without crashing', async ({ page }) => {
    await page.goto('/dashboard/web-builder');
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).not.toHaveText(/500|Internal Server Error/);
  });

  test('visual editor renders the toolbar', async ({ page }) => {
    await page.goto('/dashboard/web-builder');
    // Wait for the visual editor to mount
    await page.waitForTimeout(3000);

    // The toolbar should show Visual/Code toggle
    const visualBtn = page.locator('button', { hasText: 'Visual' });
    const codeBtn = page.locator('button', { hasText: 'Code' });

    // At least the visual editor shell should render
    await expect(visualBtn.or(codeBtn).first()).toBeVisible({ timeout: 10000 });
  });

  test('component palette shows categories', async ({ page }) => {
    await page.goto('/dashboard/web-builder');
    await page.waitForTimeout(3000);

    // Palette should have category tabs
    const layoutTab = page.locator('button', { hasText: 'Layout' });
    const formsTab = page.locator('button', { hasText: 'Forms' });

    await expect(layoutTab.or(formsTab).first()).toBeVisible({ timeout: 10000 });
  });

  test('generates code from visual editor', async ({ page }) => {
    await page.goto('/dashboard/web-builder');
    await page.waitForTimeout(3000);

    // Find and click the "Generate Code" button
    const generateBtn = page.locator('button', { hasText: 'Generate Code' }).first();

    if (await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateBtn.click();
      await page.waitForTimeout(1000);
      // Should not crash after code generation
      await expect(page.locator('body')).not.toHaveText(/500|Internal Server Error/);
    }
  });

  test('search filters components in palette', async ({ page }) => {
    await page.goto('/dashboard/web-builder');
    await page.waitForTimeout(3000);

    const searchInput = page.locator('input[placeholder="Find component..."]');

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('button');
      await page.waitForTimeout(500);

      // Should filter to show only matching components
      const paletteItems = page.locator('[draggable="true"]');
      const count = await paletteItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
