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
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
    await expect(page.getByText(status === 200 ? 'Logout confirmed by server.' : 'Local authentication cleared. Server logout was not confirmed.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Personnel Sign In' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('tagad_token'))).toBeNull();
  });
}
