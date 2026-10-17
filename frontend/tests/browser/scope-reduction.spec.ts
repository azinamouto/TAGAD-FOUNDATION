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
    await expect(nav.getByRole('heading')).toHaveCount(5);
    await expect(nav.getByRole('link')).toHaveCount(9);
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

for (const authenticated of [false, true]) {
  test(`retired generic tools are unavailable for ${authenticated ? 'authenticated' : 'anonymous'} visitors`, async ({ page }) => {
    if (authenticated) await session(page);
    const requests: string[] = [];
    page.on('request', request => {
      if (/\/api\/.*(statistical|table-builder|datasets)/.test(request.url())) requests.push(request.url());
    });
    for (const prefix of ['', '/admin']) {
      for (const path of ['/statistical-catalog', '/statistical-data', '/statistical-data/fixture', '/table-builder', '/table-builder/fixture']) {
        await page.goto(`${prefix}${path}?datasetId=fixture#details`);
        await expect(page.getByRole('heading', { name: 'Page Not Found', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Go to Dashboard' })).toBeVisible();
      }
    }
    expect(requests).toEqual([]);
  });
}

test('viewer retains workspace access without administration and cannot open users', async ({ page }) => {
  await session(page, 'VIEWER');
  await page.goto('/dashboard');
  await expect(page.getByRole('navigation', { name: 'GAD workspace' }).getByRole('link', { name: 'User Management' })).toHaveCount(0);
  await page.goto('/users');
  await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
});

test('anonymous GAD workspace and administration remain protected', async ({ page }) => {
  await page.route(/^https?:\/\/[^/]+\/api\//, route => route.fulfill({ status: 401, json: {} }));
  for (const path of ['/dashboard', '/data-encoding', '/beneficiaries', '/programs', '/gad-plan', '/accomplishments', '/reports', '/users', '/admin/users']) {
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

test('review: incomplete successful dashboard payload is unavailable, not measured zero', async ({ page }) => {
  await session(page);
  await page.route('**/api/dashboard/stats?*', route => route.fulfill({ json: { summary: {} } }));
  await page.goto('/dashboard');
  await expect(page.getByText('Failed to load analytics')).toBeVisible();
  await expect(page.getByText('Registered Records', { exact: true })).toHaveCount(0);
});


test('report outage does not download a fabricated export', async ({ page }) => {
  await session(page);
  await page.route('**/api/reports/**', route => route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } }));
  let downloads = 0;
  page.on('download', () => { downloads++; });
  await page.goto('/reports');
  await page.getByRole('button', { name: /Download/ }).first().click();
  await expect(page.getByText('Failed to generate report')).toBeVisible();
  expect(downloads).toBe(0);
});


test('GAD registry aliases retain beneficiary CSV intake after generic grid retirement', async ({ page }) => {
  await session(page);
  await page.route('**/api/beneficiaries?*', route => route.fulfill({ json: { data: [], pagination: { total: 0, page: 1, totalPages: 0 } } }));
  for (const path of ['/data-encoding', '/beneficiaries', '/admin/data-encoding', '/admin/beneficiaries']) {
    await page.goto(path);
    await page.getByRole('button', { name: 'Import CSV', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Upload CSV Dataset', exact: true })).toBeVisible();
    await expect(page.getByLabel('Upload CSV File')).toBeAttached();
  }
});
