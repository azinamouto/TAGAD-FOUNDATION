import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Synthetic intercepted responses only; these tests never write live data.
const program = { id: 'p1', title: 'Synthetic livelihood program with a readable full title', office: 'Test office', sector: 'Women', fiscalYear: 2026, budgetTarget: 1000, targetMale: 0, targetFemale: 8, actualMale: null, actualFemale: 4, status: 'ACTIVE' };
const registry = { id: 'b1', firstName: 'Synthetic', lastName: 'Resident', sex: 'FEMALE', age: 0, barangay: 'Synthetic barangay', sector: 'Women', program: 'Synthetic service', office: null, createdAt: '2026-01-01T00:00:00Z' };
const users = [{ id: 'u1', fullName: 'Synthetic Active', email: 'active@example.test', role: 'ENCODER', office: { code: 'TEST' }, isActive: true }, { id: 'u2', name: 'Synthetic Inactive', email: 'inactive@example.test', role: 'VIEWER', office: 'TEST', isActive: false }];
async function setup(page: Page, role = 'ADMIN') {
  await page.addInitScript(() => localStorage.setItem('tagad_token', 'synthetic-token'));
  await page.route(/^https?:\/\/[^/]+\/api\//, route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { data: { id: 'synthetic-admin', role, fullName: 'Synthetic tester', email: 'tester@example.test', office: { code: 'DEFAULT' } } } }));
  await page.route('**/api/programs', route => route.fulfill({ json: { data: [program, { ...program, id: 'p2', title: 'Synthetic prior year', fiscalYear: 2025 }] } }));
  await page.route('**/api/beneficiaries?*', route => route.fulfill({ json: { data: [registry], pagination: { page: 1, total: 1, totalPages: 1 } } }));
  await page.route('**/api/public/barangays', route => route.fulfill({ json: { data: [{ name: 'Synthetic barangay' }] } }));
  await page.route('**/api/users', route => route.fulfill({ json: { data: users } }));
}
for (const width of [320, 390, 768, 1024, 1440]) {
  test(`management pages and forms are usable at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000); // Four pages and seven axe scans per viewport.
    await setup(page); await page.setViewportSize({ width, height: 900 });
    for (const [path, heading, action] of [['/programs', 'Program Monitoring', 'New Program'], ['/data-encoding', 'Data Encoding', 'Add Beneficiary'], ['/reports', 'Reports and Exports', ''], ['/users', 'User Management', 'Add User']]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByText(/Loading programs|Loading registry records|Loading user accounts/)).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      if (width === 320 || width === 1440) await page.screenshot({ path: `test-results/management-${path.slice(1)}-${width}.png`, fullPage: true });
      if (action) {
        await page.getByRole('button', { name: action, exact: true }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        expect(await dialog.evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && el.scrollWidth <= el.clientWidth; })).toBe(true);
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).scrollIntoViewIfNeeded();
        await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport();
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(dialog).toHaveCount(0);
      }
    }
  });
}

test('program filters preserve zero versus missing and editing uses the existing API', async ({ page }) => {
  await setup(page); let saved: any;
  await page.route('**/api/programs/p1', route => { saved = route.request().postDataJSON(); return route.fulfill({ json: { data: program } }); });
  await page.goto('/programs');
  await page.getByLabel('Fiscal year', { exact: true }).selectOption('2026');
  await expect(page.getByRole('table')).not.toContainText('Synthetic prior year');
  await expect(page.getByRole('table')).toContainText('0 / 8');
  await expect(page.getByRole('table')).toContainText('Not recorded / 4');
  await page.getByLabel('Search programs', { exact: true }).fill('unmatched');
  await expect(page.getByRole('table')).toContainText('No programs match these filters.');
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByRole('button', { name: 'Edit program ' + program.title, exact: true }).click();
  await page.getByLabel('Program Title').fill('Synthetic edited title');
  await page.getByRole('button', { name: 'Save Program', exact: true }).click();
  await expect.poll(() => saved?.title).toBe('Synthetic edited title');
  expect(saved.year).toBe(2026); expect(saved.office).toBe('Test office');
});

test('account filters reflect active state; edit preserves office and omitted password', async ({ page }) => {
  await setup(page); let saved: any;
  await page.route('**/api/users/u1', route => { saved = route.request().postDataJSON(); return route.fulfill({ json: { data: users[0] } }); });
  await page.goto('/users');
  await expect(page.getByText('2 of 2 accounts / 1 active')).toBeVisible();
  await page.getByLabel('Account status', { exact: true }).selectOption('inactive');
  await expect(page.getByRole('table')).toContainText('Synthetic Inactive');
  await expect(page.getByRole('table')).not.toContainText('Synthetic Active');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('button', { name: 'Edit user Synthetic Active' }).click();
  await expect(page.getByLabel('Full Name')).toHaveValue('Synthetic Active');
  await expect(page.getByLabel('Office', { exact: false })).toHaveValue('TEST');
  await page.getByRole('button', { name: 'Save User', exact: true }).click();
  await expect.poll(() => saved?.name).toBe('Synthetic Active');
  expect(saved.office).toBe('TEST'); expect(saved).not.toHaveProperty('password');
});

for (const [path, endpoint, retry, empty] of [['/programs', '**/api/programs', 'Retry programs', 'No programs are recorded'], ['/users', '**/api/users', 'Retry users', 'No users match'], ['/data-encoding', '**/api/beneficiaries?*', 'Retry registry', 'No beneficiary records found']]) {
  test(`outage is distinct from empty and retries ${path}`, async ({ page }) => {
    await setup(page); let fail = true;
    await page.route(endpoint, route => route.fulfill(fail ? { status: 503, json: {} } : { json: { data: [] } }));
    await page.goto(path); await expect(page.getByRole('alert')).toContainText('unavailable');
    await expect(page.getByRole('table')).toHaveCount(0);
    fail = false; await page.getByRole('button', { name: retry, exact: true }).click();
    await expect(page.getByRole('table')).toContainText(empty);
  });
}

test('registry latest search wins and missing ownership stays explicit', async ({ page }) => {
  await setup(page);
  await page.route('**/api/beneficiaries?*', async route => {
    const search = new URL(route.request().url()).searchParams.get('search');
    if (search === 'old') await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({ json: { data: [{ ...registry, firstName: search || 'Initial' }], pagination: { page: 1, total: 1, totalPages: 1 } } });
  });
  await page.goto('/data-encoding');
  await expect(page.getByRole('table')).toContainText('Not recorded');
  const search = page.getByRole('textbox', { name: 'Search registry by name' });
  const oldRequest = page.waitForRequest(r => r.url().includes('search=old'));
  await search.fill('old'); await oldRequest; await search.fill('new');
  await expect(page.getByRole('table')).toContainText('new Resident');
  await page.waitForTimeout(900);
  await expect(page.getByRole('table')).not.toContainText('old Resident');
});

test('registry editing and pagination retain payload and filter contracts', async ({ page }) => {
  await setup(page); let saved: any;
  await page.route('**/api/beneficiaries?*', route => {
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: { data: [{ ...registry, office: 'TEST' }], pagination: { page: Number(params.get('page')), total: 11, totalPages: 2 } } });
  });
  await page.route('**/api/beneficiaries/b1', route => { saved = route.request().postDataJSON(); return route.fulfill({ json: { data: registry } }); });
  await page.goto('/data-encoding');
  await page.getByRole('textbox', { name: 'Search registry by name' }).fill('Synthetic');
  const next = page.waitForRequest(r => r.url().includes('/beneficiaries?') && new URL(r.url()).searchParams.get('page') === '2');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  expect(new URL((await next).url()).searchParams.get('search')).toBe('Synthetic');
  await page.getByRole('button', { name: 'Edit record Synthetic Resident' }).click();
  await page.getByLabel('Last Name').fill('Updated');
  await page.getByRole('button', { name: 'Save Record', exact: true }).click();
  await expect.poll(() => saved?.lastName).toBe('Updated');
  expect(saved.age).toBe('0'); expect(saved.office).toBe('TEST'); expect(saved.barangay).toBe('Synthetic barangay');
});

test('viewer cannot mutate and failed references do not invent a roster', async ({ page }) => {
  await setup(page, 'VIEWER');
  await page.goto('/programs'); await expect(page.getByRole('button', { name: /New Program|Edit program|Delete program/ })).toHaveCount(0);
  await page.route('**/api/public/barangays', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/data-encoding'); await expect(page.getByRole('button', { name: /Add Beneficiary|Import CSV|Edit record|Archive record/ })).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('No substitute roster');
  await page.getByRole('combobox', { name: 'Filter by barangay' }).click();
  await expect(page.getByRole('option')).toHaveCount(1);
});

test('exports retain fiscal year, registry scope and authorization', async ({ page }) => {
  await setup(page); const requests: string[] = [];
  await page.route('**/api/reports/**', route => {
    expect(route.request().headers().authorization).toBe('Bearer synthetic-token');
    requests.push(route.request().url());
    return route.fulfill({ contentType: 'application/octet-stream', body: 'synthetic export fixture' });
  });
  await page.goto('/reports'); await page.getByLabel('GPB / GAR Year').selectOption('2025');
  for (const name of ['GAD Plan and Budget (GPB)', 'GAD Accomplishment Report (GAR)', 'Beneficiary Registry']) {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download ' + name, exact: true }).click(); await download;
  }
  expect(requests[0]).toContain('/reports/gpb-excel?year=2025');
  expect(requests[1]).toContain('/reports/gar-excel?year=2025');
  expect(requests[2]).toMatch(/\/reports\/beneficiaries-pdf$/);
});
