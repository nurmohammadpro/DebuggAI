import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const ROUTES: { name: string; path: string }[] = [
  { name: 'home', path: '/' },
  { name: 'pricing', path: '/pricing' },
  { name: 'demo-ui-index', path: '/demo/ui' },
  { name: 'demo-ui-dashboard', path: '/demo/ui/dashboard' },
  { name: 'demo-ui-debugger', path: '/demo/ui/debugger' },
  { name: 'demo-ui-workspace', path: '/demo/ui/workspace' },
  // Auth-guarded routes are still useful to ensure the redirect UI looks sane:
  { name: 'dashboard-home-redirect', path: '/dashboard/home' },
  { name: 'dashboard-debug-redirect', path: '/dashboard/debug' },
  { name: 'dashboard-web-builder-redirect', path: '/dashboard/web-builder' },
];

test.describe('UI Audit (Screenshots + Console)', () => {
  for (const vp of VIEWPORTS) {
    test.describe(vp.name, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      for (const r of ROUTES) {
        test(`${r.name}`, async ({ page }, testInfo) => {
          const consoleErrors: string[] = [];
          page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });

          await page.goto(r.path, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(750);

          // Basic smoke: page should render something visible.
          await expect(page.locator('body')).toBeVisible();

          const outDir = testInfo.outputDir;
          await page.screenshot({
            path: `${outDir}/${vp.name}__${r.name}.png`,
            fullPage: true,
          });

          // Attach for report viewing.
          await testInfo.attach(`${vp.name}__${r.name}`, {
            path: `${outDir}/${vp.name}__${r.name}.png`,
            contentType: 'image/png',
          });

          // Fail only on hard JS runtime errors (not CSP report-only warnings, etc.)
          const hardErrors = consoleErrors.filter(
            (t) =>
              t.includes('TypeError') ||
              t.includes('ReferenceError') ||
              t.includes('Cannot read properties of') ||
              t.includes('Unhandled')
          );
          expect(hardErrors, hardErrors.join('\n')).toEqual([]);
        });
      }
    });
  }
});

