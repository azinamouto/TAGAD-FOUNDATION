import { test, expect, Page } from '@playwright/test';
const series = { id: 'synthetic-series', code: 'SYNTH', name: 'Synthetic source', sourceReference: 'Synthetic only' };
const row = { barangay_code: 'SYNTH-1', period: '2026', male: 3, female: 4, source_reference: 'Synthetic source' };
async function setup(page: Page, canWrite = true, references = true) {
  await page.addInitScript(() => localStorage.setItem('tagad_token', 'synthetic-token'));
  await page.route('**/api/auth/me', route => route.fulfill({ json: { data: { id: 'synthetic-user', role: canWrite ? 'ENCODER' : 'VIEWER', fullName: 'Synthetic tester', email: 'fixture@example.test' } } }));
  await page.route('**/api/provisional-gad/context', route => route.fulfill({ json: { data: {
    series: [series], canWrite, references: references ? [
      { barangayId: 'b1', isSynthetic: true, barangay: { code: 'SYNTH-1', name: 'Synthetic A' } },
      { barangayId: 'b2', isSynthetic: true, barangay: { code: 'SYNTH-2', name: 'Synthetic B' } },
    ] : [],
  } } }));
  await page.route('**/api/provisional-gad/statistics?*', route => route.fulfill({ json: { data: {
    series, period: '2026', totals: { male: 3, female: 4, total: 7 }, missing: 1,
    rows: [
      { barangayId: 'b1', name: 'Synthetic A', isSynthetic: true, eligible: true, male: 3, female: 4, total: 7, sourceReference: 'Synthetic source' },
      { barangayId: 'b2', name: 'Synthetic B', isSynthetic: true, eligible: true, male: null, female: null, total: null, sourceReference: null },
    ],
  } } }));
}
for (const width of [390, 1280]) {
  test('manual preview and confirmation, totals and missing data at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 }); await setup(page);
    let commits = 0;
    await page.route('**/api/provisional-gad/preview', route => route.fulfill({ json: { data: { rows: [row], sourceFileName: null, confirmationToken: 'fixture', results: [{ rowNumber: 1, input: row, row, errors: [] }] } } }));
    await page.route('**/api/provisional-gad/commit', route => { commits++; return route.fulfill({ json: { data: { inserted: 1 } } }); });
    await page.goto('/barangay-statistics');
    await page.getByLabel('Source series', { exact: true }).selectOption(series.id);
    await page.getByLabel('Statistics reporting period').fill('2026');
    await expect(page.getByText('1 eligible barangay(s) have no record', { exact: false })).toBeVisible();
    await page.getByLabel('Barangay', { exact: true }).selectOption('SYNTH-1');
    await page.getByLabel('Entry reporting period').fill('2026');
    await page.getByLabel('Male count', { exact: true }).fill('3'); await page.getByLabel('Female count', { exact: true }).fill('4');
    await page.getByLabel('Source/reference', { exact: true }).fill('Synthetic source');
    await expect(page.getByText('Calculated total: 7')).toBeVisible();
    await page.getByRole('button', { name: 'Preview manual entry' }).click();
    await expect(page.getByRole('region', { name: 'Entry preview' })).toBeVisible();
    expect(commits).toBe(0);
    await page.getByRole('button', { name: 'Confirm and save 1 record(s)', exact: true }).click();
    await expect(page.getByText('Saved 1 provisional record(s).')).toBeVisible(); expect(commits).toBe(1);
    await expect(page.getByRole('row', { name: /Synthetic B/ })).toContainText('No data');
    await expect(page.getByRole('img', { name: 'Male and female comparison chart' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 1280) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: 'test-results/provisional-gad-desktop.png', fullPage: true });
    }
  });
}
test('CSV upload errors highlight rows and disable confirmation', async ({ page }) => {
  await setup(page);
  await page.route('**/api/provisional-gad/preview', route => route.fulfill({ json: { data: { rows: [row], sourceFileName: 'fixture.csv', confirmationToken: null, results: [{ rowNumber: 2, input: row, row, errors: ['A persisted entry already exists.'] }] } } }));
  await page.goto('/barangay-statistics'); await page.getByLabel('Source series', { exact: true }).selectOption(series.id);
  await page.getByLabel('Upload CSV or XLSX').setInputFiles({ name: 'fixture.csv', mimeType: 'text/csv', buffer: Buffer.from('synthetic') });
  await expect(page.getByRole('region', { name: 'Entry preview' })).toContainText('persisted entry already exists');
  await expect(page.getByRole('button', { name: 'Confirm and save 1 record(s)' })).toBeDisabled();
});
test('viewer cannot encode; outages remove statistics', async ({ page }) => {
  await setup(page, false); await page.goto('/barangay-statistics');
  await expect(page.getByRole('heading', { name: 'Encode counts' })).toHaveCount(0);
  await page.getByLabel('Source series', { exact: true }).selectOption(series.id);
  await page.route('**/api/provisional-gad/statistics?*', route => route.fulfill({ status: 503, json: { error: { message: 'Storage unavailable' } } }));
  await page.getByLabel('Statistics reporting period').fill('2026');
  await expect(page.getByRole('alert')).toContainText('Storage unavailable');
  await expect(page.getByRole('img', { name: 'Male and female comparison chart' })).toHaveCount(0);
});
test('unverified roster blocks entry and expired session hides the workspace', async ({ page }) => {
  await setup(page, true, false); await page.goto('/barangay-statistics');
  await expect(page.getByText(/No eligible barangay roster/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Preview manual entry' })).toBeDisabled();
  await page.route('**/api/auth/me', route => route.fulfill({ status: 401, json: {} }));
  await page.reload(); await expect(page.getByRole('alert')).toContainText('session has expired');
  await expect(page.getByRole('heading', { name: 'Encode counts' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Personnel Sign In' })).toBeVisible();
});
