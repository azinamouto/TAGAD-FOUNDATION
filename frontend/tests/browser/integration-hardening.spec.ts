import { test, expect, Page } from '@playwright/test';

const program = { id: 'p1', title: 'Synthetic program', office: 'TEST', sector: 'Women', year: 2026, budget: 10, status: 'ACTIVE', targetMale: 0, targetFemale: 1, actualMale: null, actualFemale: 0 };
const record = { id: 'r1', firstName: 'Synthetic', lastName: 'Resident', sex: 'FEMALE', age: 0, office: 'TEST', barangay: 'Synthetic barangay', sector: 'Women', program: 'Synthetic program' };
async function setup(page: Page) {
  await page.addInitScript(() => localStorage.setItem('tagad_token', 'synthetic-token'));
  await page.route(/^https?:\/\/[^/]+\/api\//, route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { data: { id: 'fixture', role: 'ADMIN', fullName: 'Synthetic tester', email: 'fixture@example.test' } } }));
  await page.route('**/api/programs', route => route.fulfill({ json: { data: [program] } }));
  await page.route('**/api/beneficiaries?*', route => route.fulfill({ json: { data: [record], meta: { page: 1, total: 1, totalPages: 1 } } }));
  await page.route('**/api/public/barangays', route => route.fulfill({ json: { data: [{ name: 'Synthetic barangay' }] } }));
  await page.route('**/api/users', route => route.fulfill({ json: { data: [{ id: 'u1', name: 'Synthetic user', email: 'fixture@example.test', office: 'TEST', role: 'ENCODER', isActive: true }] } }));
}

test('registry consumes API meta and recovers from archiving the last row on a page', async ({ page }) => {
  await setup(page); let archived = false;
  const pages: number[] = [];
  await page.route('**/api/beneficiaries?*', route => {
    const current = Number(new URL(route.request().url()).searchParams.get('page')); pages.push(current);
    return route.fulfill({ json: { data: archived && current === 2 ? [] : [record], meta: { page: current, total: archived ? 10 : 11, totalPages: archived ? 1 : 2 } } });
  });
  await page.route('**/api/beneficiaries/r1', route => { archived = true; return route.fulfill({ json: { data: {} } }); });
  await page.goto('/data-encoding');
  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Archive record Synthetic Resident' }).click();
  await expect(page.getByText('Page 1 of 1')).toBeVisible();
  expect(pages.slice(-2)).toEqual([2, 1]);
  await expect(page.getByRole('table')).toContainText('Synthetic Resident');
});

for (const [path, edit, save, endpoint] of [
  ['/programs', 'Edit program Synthetic program', 'Save Program', '**/api/programs/p1'],
  ['/data-encoding', 'Edit record Synthetic Resident', 'Save Record', '**/api/beneficiaries/r1'],
  ['/users', 'Edit user Synthetic user', 'Save User', '**/api/users/u1'],
]) {
  test(`editor stays locked during save and exposes retryable validation failure: ${path}`, async ({ page }) => {
    await setup(page); let attempts = 0;
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route(endpoint, async route => {
      attempts++;
      if (attempts === 1) { await pending; await route.fulfill({ status: 400, json: { error: { message: 'Synthetic validation failure' } } }); }
      else await route.fulfill({ json: { data: {} } });
    });
    await page.goto(path); await page.getByRole('button', { name: edit, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: save, exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText('Saving');
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape'); await expect(dialog).toBeVisible();
    release();
    await expect(dialog.getByRole('alert')).toHaveText('Synthetic validation failure');
    await dialog.getByRole('button', { name: save, exact: true }).click();
    await expect(dialog).toHaveCount(0); expect(attempts).toBe(2);
  });
}

test('program editing preserves unrecorded counts and rejects negative numeric values', async ({ page }) => {
  await setup(page); let saved: any;
  await page.route('**/api/programs/p1', route => { saved = route.request().postDataJSON(); return route.fulfill({ json: { data: {} } }); });
  await page.goto('/programs'); await page.getByRole('button', { name: 'Edit program Synthetic program' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Actual male', exact: true })).toHaveValue('');
  await page.getByRole('spinbutton', { name: 'Target male', exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Save Program' }).click();
  expect(saved).toBeUndefined();
  await page.getByRole('spinbutton', { name: 'Target male', exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save Program' }).click();
  await expect.poll(() => saved?.targetMale).toBe(0);
  expect(saved).not.toHaveProperty('actualMale'); expect(saved.actualFemale).toBe(0);
});

test('dashboard clears a barangay selection absent from refreshed authorized data', async ({ page }) => {
  await setup(page);
  await page.route('**/api/dashboard/stats?*', route => route.fulfill({ json: { data: {
    summary: { totalBeneficiaries: 1, totalMale: 1, totalFemale: 0, totalPrograms: 0, totalBudgetAllocated: 0, totalBudgetUsed: 0 },
    byBarangay: [{ barangay: new URL(route.request().url()).searchParams.get('year') === '2025' ? 'Synthetic B' : 'Synthetic A', male: 1, female: 0 }], recentBeneficiaries: [],
  } } }));
  await page.goto('/dashboard');
  await page.getByLabel('Registry barangay').selectOption('Synthetic A');
  await page.getByLabel('Reporting year').selectOption('2025');
  await expect(page.getByLabel('Registry barangay')).toHaveValue('');
  await expect(page.getByRole('region', { name: 'Barangay registry data', exact: true })).toContainText('Synthetic B');
});

test('export session rejection clears credentials through shared API handling', async ({ page }) => {
  await setup(page);
  await page.route('**/api/reports/**', route => route.fulfill({ status: 401, json: {} }));
  await page.goto('/reports');
  await page.getByRole('button', { name: 'Download GAD Plan and Budget (GPB)', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('tagad_token'))).toBeNull();
});
