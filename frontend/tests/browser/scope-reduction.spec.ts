import { test, expect, Page } from '@playwright/test';

async function session(page: Page, role = 'ADMIN') {
  await page.addInitScript(() => localStorage.setItem('tagad_token', 'fixture-token'));
  await page.route(/^https?:\/\/[^/]+\/api\//, route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { data: { id: 'fixture', role, fullName: 'Synthetic User', email: 'fixture@example.test' } } }));
  await page.route('**/api/dashboard/stats?*', route => route.fulfill({ json: {
    summary: { totalBeneficiaries: 0, totalMale: 0, totalFemale: 0, totalPrograms: 0, totalBudgetAllocated: 0, totalBudgetUsed: 0 },
    byBarangay: [], recentBeneficiaries: [],
  } }));
}

for (const width of [390, 1280]) {
  test(`workspace navigation at ${width}px preserves workflows and marks mapping unavailable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await session(page);
    await page.goto('/dashboard');
    const nav = page.getByRole('navigation', { name: 'GAD workspace' });
    await expect(nav.getByRole('heading')).toHaveCount(6);
    await expect(nav.getByRole('link')).toHaveCount(8);
    await expect(nav).toContainText('Interactive mapping is not yet available');
    await expect(nav.getByRole('link', { name: /Table Builder|Statistical Catalog|Data Entry Grid/ })).toHaveCount(0);
    const links = [
      ['Beneficiary Registry', '/data-encoding'],
      ['Programs and Services', '/programs'],
      ['GAD Plans and Budgets', '/gad-plan'],
      ['Accomplishments', '/accomplishments'],
      ['Working Reports', '/reports'],
      ['User Management', '/users'],
      ['Barangay and Sex Statistics', '/dashboard#barangay-statistics'],
    ];
    for (const [label, path] of links) {
      await nav.getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(path + '$'));
      await expect(page.getByRole('main')).not.toContainText('Page Not Found');
    }
    await expect(page.locator('#barangay-statistics')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('hidden statistical deep links retain existing access and data workspace', async ({ page }) => {
  await session(page);
  for (const path of ['/statistical-catalog', '/admin/statistical-catalog', '/statistical-data', '/admin/statistical-data', '/table-builder', '/admin/table-builder']) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(path + '$'));
    await expect(page.getByRole('main')).not.toContainText('Page Not Found');
    await expect(page.getByText('Loading page...', { exact: true })).toHaveCount(0);
    const text = await page.getByRole('main').innerText();
    expect(text.length).toBeGreaterThan(20);
  }
});

test('viewer retains workspace access without administration and cannot open users', async ({ page }) => {
  await session(page, 'VIEWER');
  await page.goto('/dashboard');
  await expect(page.getByRole('navigation', { name: 'GAD workspace' }).getByRole('link', { name: 'User Management' })).toHaveCount(0);
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
});

test('anonymous statistical tools stay protected after navigation is hidden', async ({ page }) => {
  await page.route(/^https?:\/\/[^/]+\/api\//, route => route.fulfill({ status: 401, json: {} }));
  for (const path of ['/statistical-data', '/table-builder', '/admin/statistical-data', '/admin/table-builder', '/admin/statistical-catalog']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Personnel Sign In' })).toBeVisible();
  }
});

test('reports disclose template and registry limits and dashboard outage shows no statistics', async ({ page }) => {
  await session(page);
  await page.goto('/reports');
  await expect(page.getByText('Download working exports; official template acceptance is pending.')).toBeVisible();
  await expect(page.getByText(/Up to 100 accessible registry records across all years/)).toBeVisible();
  await page.route('**/api/dashboard/stats?*', route => route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } }));
  await page.goto('/dashboard');
  await expect(page.getByText('Failed to load analytics')).toBeVisible();
  await expect(page.getByText('Registered Records', { exact: true })).toHaveCount(0);
});
