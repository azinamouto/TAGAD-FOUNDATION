import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import router from '../server/routes/admin/movAttachments';
import { MOVAttachmentService } from '../server/services/MOVAttachmentService';

test('MOV multipart parser forwards file bytes and rejects unexpected file fields', async () => {
  const original = MOVAttachmentService.upload;
  let calls = 0;
  MOVAttachmentService.upload = (async (id, file, actor) => {
    calls++;
    assert.equal(id, 'record');
    assert.equal(actor.officeId, 'office-a');
    assert.equal(file.originalname, 'evidence.pdf');
    assert.equal(file.mimetype, 'application/pdf');
    assert.equal(file.buffer.toString(), '%PDF-1.4\nfixture');
    return { id: 'attachment' };
  }) as typeof original;
  const app = express();
  app.use((req: any, _res, next) => {
    req.user = { id: 'encoder', role: 'ENCODER', officeId: 'office-a' };
    next();
  });
  app.use('/accomplishments/:accomplishmentId/mov', router);
  app.use((error: any, _req: any, res: any, _next: any) => res.status(400).json({ code: error.code }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as any).port}/accomplishments/record/mov`;
  try {
    for (const field of ['file', 'unexpected']) {
      const form = new FormData();
      form.append(field, new Blob(['%PDF-1.4\nfixture'], { type: 'application/pdf' }), 'evidence.pdf');
      const response = await fetch(url, { method: 'POST', body: form });
      assert.equal(response.status, field === 'file' ? 201 : 400);
      if (field !== 'file') assert.equal((await response.json()).code, 'LIMIT_UNEXPECTED_FILE');
    }
    assert.equal(calls, 1);
  } finally {
    MOVAttachmentService.upload = original;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
