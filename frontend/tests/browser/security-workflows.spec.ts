import { test, expect, Page } from '@playwright/test';
const user = { id: 'fixture-user', role: 'ADMIN', fullName: 'Fixture Official', email: 'fixture@example.test' };
async function seed(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('tagad_token', 'fixture-token');
    localStorage.setItem('tagad_user', JSON.stringify({ id: 'cached-admin', roles: ['ADMIN'] }));
  });
}
async function session(page: Page) {
  await seed(page);
  await page.route('**/api/auth/me', route => route.fulfill({ json: { data: user } }));
}
for (const status of [401, 403, 503]) {
  test(`session ${status} never restores cached administrative access`, async ({ page }) => {
    await seed(page);
    await page.route('**/api/auth/me', route => route.fulfill({ status, json: { error: { message: 'Fixture failure' } } }));
    await page.goto('/gad-plan');
    await expect(page.getByRole('alert')).toContainText(status === 401 ? 'expired' : status === 403 ? 'forbidden' : 'unreachable');
    await expect(page.getByRole('heading', { name: 'GAD Plan & Budget (GPB)' })).toHaveCount(0);
    if (status !== 503) expect(await page.evaluate(() => localStorage.getItem('tagad_token'))).toBeNull();
  });
}
test('revision requires remarks and sends REVISED lifecycle action', async ({ page }) => {
  await session(page);
  await page.route('**/api/gad-plans?*', route => route.fulfill({ json: { data: [{ id: 'plan-1', status: 'SUBMITTED', genderIssue: 'Test plan', budget: 100 }] } }));
  let remarks: string | undefined;
  await page.route('**/api/gad-plans/plan-1/revise', route => { remarks = route.request().postDataJSON().remarks; return route.fulfill({ json: { data: {} } }); });
  await page.goto('/gad-plan');
  await page.getByRole('button', { name: 'Request revision', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Request revision' })).toBeDisabled();
  await dialog.getByLabel('Revision remarks (required)').fill('Clarify beneficiaries');
  await dialog.getByRole('button', { name: 'Request revision' }).click();
  await expect(dialog).toHaveCount(0);
  expect(remarks).toBe('Clarify beneficiaries');
});
test('revised plan supports resubmission through submit endpoint', async ({ page }) => {
  await session(page);
  await page.route('**/api/gad-plans?*', route => route.fulfill({ json: { data: [{ id: 'plan-1', status: 'REVISED', genderIssue: 'Test plan', revisionRemarks: 'Clarify beneficiaries' }] } }));
  await page.route('**/api/gad-plans/plan-1/submit', route => route.fulfill({ json: { data: {} } }));
  await page.goto('/gad-plan');
  const request = page.waitForRequest('**/api/gad-plans/plan-1/submit');
  await page.getByRole('button', { name: 'Resubmit plan' }).click();
  expect((await request).method()).toBe('POST');
});
test('observation search renders scoped counts and workspace links', async ({ page }) => {
  await session(page);
  await page.route('**/api/statistical-catalog/**', route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/admin/statistical-search?*', route => route.fulfill({ json: { data: { tables: [{ tableId: 'table-1', tableCode: 'T1', title: 'Population fixture', matchingObservationCount: 2, accessibleObservationCount: 5 }], summaryMeaning: 'Stored observations, not population totals.' } } }));
  await page.goto('/admin/statistical-catalog');
  await page.getByRole('textbox', { name: 'Search stored observations' }).fill('population');
  await page.getByRole('button', { name: 'Search data' }).click();
  await expect(page.getByRole('link', { name: 'Population fixture' })).toHaveAttribute('href', '/admin/statistical-data/table-1');
  await expect(page.getByText('2 matching / 5 accessible observations')).toBeVisible();
});
test('MOV list and multipart upload use the authenticated backend', async ({ page }) => {
  await session(page);
  await page.route('**/api/accomplishments', route => route.fulfill({ json: { data: [{ id: 'acc-1', actualOutput: 'Test output' }] } }));
  await page.route('**/api/gad-plans?*', route => route.fulfill({ json: { data: [] } }));
  let uploaded = false;
  await page.route('**/api/admin/accomplishments/acc-1/mov', route => {
    if (route.request().method() === 'POST') {
      uploaded = route.request().headers()['content-type'].includes('multipart/form-data') && route.request().postDataBuffer()!.includes(Buffer.from('fixture-file'));
    }
    return route.fulfill({ json: { data: route.request().method() === 'GET' ? [{ id: 'mov-1', fileName: 'fixture.pdf', fileSizeBytes: 1024 }] : {} } });
  });
  await page.goto('/accomplishments');
  await page.getByRole('button', { name: 'MOV attachments' }).click();
  await expect(page.getByText('fixture.pdf (1 KB)')).toBeVisible();
  await page.getByLabel('Upload verification file (maximum 20 MB)').setInputFiles({ name: 'fixture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fixture-file') });
  await expect.poll(() => uploaded).toBe(true);
});

for (const status of [200, 503]) {
  test(`logout ${status} communicates server confirmation accurately`, async ({ page }) => {
    await session(page);
    await page.route('**/api/gad-plans?*', route => route.fulfill({ json: { data: [] } }));
    await page.route('**/api/auth/logout', route => route.fulfill({ status, json: { data: {} } }));
    await page.goto('/gad-plan');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByText(status === 200 ? 'Logout confirmed by server.' : 'Local authentication cleared. Server logout was not confirmed.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Personnel Sign In' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('tagad_token'))).toBeNull();
  });
}

async function workspace(page: Page) {
  await session(page);
  await page.route('**/api/admin/datasets?*', route => route.fulfill({ json: { data: [{ id: 'dataset-1', name: 'Fixture dataset', publicationStatus: 'DRAFT' }] } }));
  await page.route('**/api/admin/table-builder/tables/table-1', route => route.fulfill({ json: { data: { id: 'table-1', tableCode: 'T1', title: 'Fixture table', isSystemTable: true, indicators: [{ id: 'indicator-1', name: 'Population', indicatorCode: 'POP' }], dimensionBindings: [{ dimensionId: 'sex', dimension: { dimensionCode: 'SEX', name: 'Sex' }, allowedValues: ['Female', 'Male'] }] } } }));
  await page.route('**/api/admin/table-builder/tables/table-1/observations?*', route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/admin/barangays', route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/admin/statistical-search/tables/table-1/summary?*', route => route.fulfill({ json: { data: { groups: [{ period: '2026', indicatorId: 'indicator-1', indicatorName: 'Population', unit: 'count', observationCount: 2, minimum: '10', maximum: '20', arithmeticMean: '15' }], pagination: { hasMore: false }, summaryMeaning: 'Means are unweighted.' } } }));
  await page.goto('/admin/statistical-data/table-1');
}
test('dataset summary labels unweighted statistics and disables unavailable pagination', async ({ page }) => {
  await workspace(page);
  await expect(page.getByRole('heading', { name: 'Dataset summary' })).toBeVisible();
  await expect(page.getByText('Means are unweighted.')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Unweighted mean' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
});
test('measure mapping sends selected CSV columns and per-measure overrides to preview', async ({ page }) => {
  await workspace(page);
  await page.route('**/api/admin/statistical-import/discover', route => route.fulfill({ json: { data: { headers: ['Year', 'Barangay', 'Women'], totalRows: 1, candidateMappings: { period: { sourceColumn: 'Year' }, barangay: { sourceColumn: 'Barangay' } } } } }));
  let mapping: any;
  await page.route('**/api/admin/statistical-import/preview', route => { mapping = route.request().postDataJSON().mapping; return route.fulfill({ status: 422, json: { error: { message: 'Fixture preview received' } } }); });
  await page.getByRole('button', { name: 'Import CSV' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'fixture.csv', mimeType: 'text/csv', buffer: Buffer.from('Year,Barangay,Women\n2026,Poblacion,10') });
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Measure Columns (Unpivot multiple metrics)' }).click();
  await dialog.getByRole('button', { name: 'Add measure' }).click();
  await dialog.getByLabel('CSV column', { exact: true }).selectOption('Women');
  await dialog.getByLabel('Indicator', { exact: true }).selectOption('indicator-1');
  await dialog.getByLabel('Period override').fill('2025');
  await dialog.getByLabel('SEX override').fill('Female');
  await dialog.getByRole('button', { name: 'Generate Preview' }).click();
  await expect.poll(() => mapping?.measureColumns).toEqual([{ columnName: 'Women', indicatorId: 'indicator-1', period: '2025', dimensions: { SEX: 'Female' } }]);
});
