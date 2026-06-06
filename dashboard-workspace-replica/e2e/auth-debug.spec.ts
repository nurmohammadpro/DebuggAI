import { test, expect } from '@playwright/test';

test.describe('Auth & Debug Flow', () => {
  test('unauthenticated user is redirected from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('unauthenticated user is redirected from /dashboard/debug to /login', async ({ page }) => {
    await page.goto('/dashboard/debug');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 5000 });
  });

  test('login page links to sign up', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.locator('a[href="/signup"]');
    await expect(signupLink).toBeVisible({ timeout: 5000 });
  });

  test('signup page renders registration form', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /sign up|create account|get started/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
  });

  test('homepage is accessible without auth', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('homepage has CTA linking to signup or login', async ({ page }) => {
    await page.goto('/');
    const ctaLinks = page.locator('a[href="/signup"], a[href="/login"], a[href="/pricing"]');
    await expect(ctaLinks.first()).toBeVisible({ timeout: 10000 });
  });

  test('forgot password page is accessible', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });
});
