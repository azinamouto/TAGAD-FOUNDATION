import './testEnvironment';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import ExcelJS from 'exceljs';
import { Role } from '@prisma/client';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { ProgramService } from '../server/services/ProgramService';
import { UserService } from '../server/services/UserService';
import { GADPlanService } from '../server/services/GADPlanService';
import { AccomplishmentService } from '../server/services/AccomplishmentService';
import { BeneficiaryService } from '../server/services/BeneficiaryService';
import { getGPBExcel, getGARExcel, getBeneficiariesExcel } from '../server/controllers/reportController';
import * as programs from '../server/controllers/admin/programController';
import * as users from '../server/controllers/admin/userController';
import { getBeneficiaries } from '../server/controllers/admin/beneficiaryController';
const actor = { id: 'synthetic', role: Role.ENCODER, officeId: 'office-a' };

async function withApi(routes: Record<string, any>, run: (base: string) => Promise<void>) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => { req.user = actor; next(); });
  for (const [path, handler] of Object.entries(routes)) app.all(path, handler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${(server.address() as any).port}`); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

test('workspace controllers never return demo lists or confirm disconnected program/account writes', async () => {
  setDatabaseConnected(false);
  await withApi({ '/programs': programs.getPrograms, '/users': users.getUsers, '/registry': getBeneficiaries,
    '/program-create': programs.createProgram, '/program-update': programs.updateProgram, '/program-delete': programs.deleteProgram,
    '/user-create': users.createUser, '/user-update': users.updateUser, '/user-delete': users.deleteUser }, async base => {
    for (const path of ['programs', 'users', 'registry', 'program-create', 'program-update', 'program-delete', 'user-create', 'user-update', 'user-delete']) {
      const response = await fetch(`${base}/${path}`);
      assert.equal(response.status, 503, path);
      assert.equal((await response.json()).data, undefined);
    }
  });
});

test('program list/detail enforce existing encoder scope and database errors never return fixtures', async () => {
  setDatabaseConnected(true);
  const findMany = prisma.program.findMany, findUnique = prisma.program.findUnique, findUsers = prisma.user.findMany;
  try {
    prisma.program.findMany = (async ({ where }: any) => { assert.equal(where.officeId, 'office-a'); return []; }) as any;
    assert.deepEqual(await ProgramService.getPrograms({ officeId: 'office-b' }, actor, { strict: true }), []);
    prisma.program.findUnique = (async () => ({ id: 'foreign', officeId: 'office-b' })) as any;
    await assert.rejects(ProgramService.getProgramById('foreign', actor, { strict: true }), /not found/i);
    await assert.rejects(ProgramService.getPrograms({}, { ...actor, officeId: null }, { strict: true }), /assigned office/);
    prisma.program.findMany = (async () => { throw new Error('synthetic outage'); }) as any;
    prisma.user.findMany = (async () => { throw new Error('synthetic outage'); }) as any;
    await assert.rejects(ProgramService.getPrograms({}, actor, { strict: true }), /unavailable/);
    await assert.rejects(UserService.getUsers({}, { strict: true }), /unavailable/);
  } finally { prisma.program.findMany = findMany; prisma.program.findUnique = findUnique; prisma.user.findMany = findUsers; setDatabaseConnected(false); }
});

test('GPB and GAR reject ambiguous periods before reading or exporting data', async () => {
  const plans = GADPlanService.getGADPlans, accomplishments = AccomplishmentService.getAccomplishments;
  let reads = 0;
  GADPlanService.getGADPlans = (async () => { reads++; return { plans: [], items: [] }; }) as any;
  AccomplishmentService.getAccomplishments = async () => { reads++; return []; };
  try {
    await withApi({ '/gpb': getGPBExcel, '/gar': getGARExcel }, async base => {
      for (const path of ['gpb', 'gar']) for (const query of ['year=2026junk', 'year=', 'year=2026&year=2025', 'year=NaN', 'year=2200']) {
        assert.equal((await fetch(`${base}/${path}?${query}`)).status, 422);
      }
      assert.equal(reads, 0);
    });
  } finally { GADPlanService.getGADPlans = plans; AccomplishmentService.getAccomplishments = accomplishments; }
});

test('working GPB/GAR workbooks preserve source values, missing counts, year and actor', async () => {
  const plans = GADPlanService.getGADPlans, accomplishments = AccomplishmentService.getAccomplishments;
  GADPlanService.getGADPlans = (async (params: any, user: any, options: any) => {
    assert.equal(params.year, 2026); assert.equal(user.officeId, actor.officeId); assert.equal(options.strict, true);
    return { plans: [{ office: { name: 'Source office' }, status: 'DRAFT', items: [{ activity: 'Synthetic activity', budget: 12.5, genderIssue: 'Source issue' }] }], items: [] };
  }) as any;
  AccomplishmentService.getAccomplishments = (async (params: any, user: any, options: any) => {
    assert.equal(params.year, 2026); assert.equal(user.officeId, actor.officeId); assert.equal(options.strict, true);
    return [{ program: { title: 'Synthetic program', office: { name: 'Source office' }, budgetTarget: 12.5 }, actualMale: 0, actualFemale: null, actualBudgetUsed: 0 }];
  }) as any;
  try {
    await withApi({ '/gpb': getGPBExcel, '/gar': getGARExcel }, async base => {
      for (const path of ['gpb', 'gar']) {
        const response = await fetch(`${base}/${path}?year=2026`); assert.equal(response.status, 200);
        const book = new ExcelJS.Workbook(); await book.xlsx.load(Buffer.from(await response.arrayBuffer()) as any);
        const sheet = book.worksheets[0]; assert.match(String(sheet.getCell('A1').value), /2026/);
        if (path === 'gpb') { assert.equal(sheet.getCell('D3').value, 'Synthetic activity'); assert.equal(sheet.getCell('I3').value, 12.5); assert.equal(sheet.getCell('K3').value, 'DRAFT'); }
        else { assert.equal(sheet.getCell('B3').value, 'Synthetic program'); assert.equal(sheet.getCell('E3').value, 12.5); assert.equal(sheet.getCell('F3').value, 0); assert.equal(sheet.getCell('G3').value, 0); assert.equal(sheet.getCell('H3').value, null); assert.equal(sheet.getCell('I3').value, null); }
      }
    });
  } finally { GADPlanService.getGADPlans = plans; AccomplishmentService.getAccomplishments = accomplishments; }
});

test('registry Excel tolerates missing references and exports the actual encoding timestamp', async () => {
  const original = BeneficiaryService.getBeneficiaries;
  BeneficiaryService.getBeneficiaries = (async () => ({ data: [{ id: 'fixture', firstName: 'Synthetic', office: null, barangay: null, age: 0, dateEncoded: '2026-02-03T10:00:00Z' }], pagination: {} })) as any;
  try {
    await withApi({ '/excel': getBeneficiariesExcel }, async base => {
      const response = await fetch(base + '/excel'); assert.equal(response.status, 200);
      const book = new ExcelJS.Workbook(); await book.xlsx.load(Buffer.from(await response.arrayBuffer()) as any);
      assert.equal(book.worksheets[0].getCell('I2').value, '2026-02-03');
      assert.equal(book.worksheets[0].getCell('E2').value, 0);
    });
  } finally { BeneficiaryService.getBeneficiaries = original; }
});
