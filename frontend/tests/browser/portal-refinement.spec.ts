import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Synthetic responses are isolated to browser tests; no fixture data ships in the portal.
const summary = { totalBeneficiaries: 7, totalMale: 3, totalFemale: 4, totalPrograms: 2, totalBudgetAllocated: 100, totalBudgetUsed: 25 };
const data = { summary, byBarangay: [{ barangay: 'Synthetic A', male: 3, female: 4 }, { barangay: 'Synthetic missing', male: null, female: 0 }], recentBeneficiaries: [{ id: 'fixture', firstName: 'Synthetic', lastName: 'Entry', sex: 'FEMALE', barangay: 'Synthetic A', sector: 'Test sector', office: 'Test office' }] };
const fullName = 'Synthetic Official With A Long Untruncated Display Name';
async function session(page: Page) {
  await page.addInitScript(() => localStorage.setItem('tagad_token', 'fixture-token'));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { data: { id: 'fixture', role: 'ADMIN', fullName, email: 'fixture@example.test' } } }));
}
for (const width of [320, 390, 768, 1024, 1440]) {
  test('readable portal, accessible navigation and data at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await session(page);
    await page.route('**/api/dashboard/stats?*', route => route.fulfill({ json: { data } }));
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Registered Records', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Account menu' })).toContainText(fullName);
    const account = page.getByRole('button', { name: 'Account menu' });
    expect(await account.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await expect(page.getByRole('row', { name: /Synthetic missing/ })).toContainText('Not recorded');
    await expect(page.getByRole('row', { name: /Synthetic missing/ }).getByRole('cell').last()).toHaveText('Not recorded');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/portal-' + width + '.png', fullPage: true });
    if (width < 1024) {
      const open = page.getByRole('button', { name: 'Open navigation' });
      await open.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press('Tab');
        expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
      }
      await page.screenshot({ path: 'test-results/portal-drawer-' + width + '.png' });
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(open).toBeFocused();
      await open.click();
    }
    const nav = page.getByRole('navigation', { name: 'GAD workspace' });
    await nav.getByRole('link', { name: 'Barangay and Sex Statistics', exact: true }).click();
    await expect(page).toHaveURL(/dashboard#barangay-statistics$/);
    if (width < 1024) {
      await expect(page.getByRole('dialog')).not.toBeVisible();
      await page.getByRole('button', { name: 'Open navigation' }).click();
    }
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.locator('[aria-current="page"]')).toHaveText('Barangay and Sex Statistics');
    if (width < 1024) await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Account menu' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem', { name: 'Sign out' })).toHaveCount(0);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });
}
test('outage can retry, reporting year survives failure, loading is announced', async ({ page }) => {
  await session(page);
  let fail = true;
  await page.route('**/api/dashboard/stats?*', async route => {
    await new Promise(resolve => setTimeout(resolve, 250));
    await route.fulfill(fail ? { status: 503, json: {} } : { json: data });
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('status', { name: 'Loading analytics' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Failed to load analytics');
  await page.getByLabel('Reporting year').selectOption('2025');
  await expect(page.getByRole('alert')).toContainText('Reporting year 2025');
  await expect(page.getByRole('heading', { name: 'Registered Records', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/portal-error.png', fullPage: true });
  fail = false;
  const request = page.waitForRequest('**/api/dashboard/stats?year=2025');
  await page.getByRole('button', { name: 'Retry analytics' }).click();
  await request;
  await expect(page.getByRole('heading', { name: 'Registered Records', exact: true })).toBeVisible();
});
test('empty charts explain zero records without inventing data', async ({ page }) => {
  await session(page);
  await page.route('**/api/dashboard/stats?*', route => route.fulfill({ json: { summary: Object.fromEntries(Object.keys(summary).map(key => [key, 0])), byBarangay: [], recentBeneficiaries: [] } }));
  await page.goto('/dashboard');
  await expect(page.getByText('No barangay registry records are available in your scope.')).toBeVisible();
  await expect(page.getByText('No recorded male or female registry entries in your scope.')).toBeVisible();
  await expect(page.getByText('Utilization rate is unavailable without an allocated budget.')).toBeVisible();
  await page.screenshot({ path: 'test-results/portal-empty.png', fullPage: true });
});
