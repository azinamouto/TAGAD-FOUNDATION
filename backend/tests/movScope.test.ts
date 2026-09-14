import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { MOVAttachmentService as Service } from '../server/services/MOVAttachmentService';
import { Role } from '@prisma/client';
const actor = { id: 'encoder', role: Role.ENCODER, officeId: 'office-a' };
test('MOV denies access when database is unavailable', async () => {
  setDatabaseConnected(false);
  await assert.rejects(Service.listByAccomplishment('record', actor), (e: any) => e.statusCode === 503);
  await assert.rejects(Service.upload('record', { buffer: Buffer.from('test'), size: 4, mimetype: 'application/pdf', originalname: 'test.pdf' }, actor), (e: any) => e.statusCode === 503);
});
test('MOV denies encoder without a verifiable matching office', async () => {
  const original = prisma.gADAccomplishment.findUnique;
  setDatabaseConnected(true);
  try {
    for (const officeId of [null, 'office-b']) {
      prisma.gADAccomplishment.findUnique = (async () => ({ program: { officeId }, gadPlanItem: null })) as any;
      await assert.rejects(Service.listByAccomplishment('record', actor), (e: any) => e.statusCode === 403);
    }
    prisma.gADAccomplishment.findUnique = (async () => ({ program: { officeId: 'office-a' }, gadPlanItem: null })) as any;
    await assert.rejects(Service.listByAccomplishment('record', { ...actor, officeId: null }), (e: any) => e.statusCode === 403);
  } finally { prisma.gADAccomplishment.findUnique = original; setDatabaseConnected(false); }
});
