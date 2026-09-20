import assert from 'node:assert/strict';
import prisma, { testDatabaseConnection, stopDatabaseConnectionMonitor } from '../server/lib/prisma';
import { OfficeService } from '../server/services/OfficeService';
import { UserService } from '../server/services/UserService';
import { ProgramService } from '../server/services/ProgramService';
import { GADPlanService } from '../server/services/GADPlanService';
import { BeneficiaryService } from '../server/services/BeneficiaryService';
import { AccomplishmentService } from '../server/services/AccomplishmentService';
import { StatisticalCatalogService } from '../server/services/StatisticalCatalogService';
import { StatisticalDatasetService } from '../server/services/StatisticalDatasetService';
import { CsvIngestionService } from '../server/services/CsvIngestionService';
import { FeedbackService } from '../server/services/FeedbackService';
import { TableBuilderService } from '../server/services/TableBuilderService';
import { ObservationService } from '../server/services/ObservationService';
import { StatisticalObservationIngestionService } from '../server/services/StatisticalObservationIngestionService';

const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.pathname !== '/tagad_qualification') {
  throw new Error('Disposable qualification database required');
}
await testDatabaseConnection();
const user = await prisma.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' } });
const office = await prisma.office.findFirstOrThrow();
const barangay = await prisma.barangay.findFirstOrThrow();
const table = await prisma.statisticalTableDefinition.findFirstOrThrow();
const actor = { id: user.id, role: user.role, officeId: office.id };
const customTable = await TableBuilderService.createTable({ tableCode: 'AUDIT-CUSTOM', title: 'Audit fixture', domain: 'General' }, actor);
const plan = await prisma.gADPlan.create({ data: { officeId: office.id, fiscalYear: 2097 } });
const program = await prisma.program.create({ data: { officeId: office.id, title: 'Audit fixture', sector: 'General', fiscalYear: 2097 } });
const dataset = await prisma.statisticalDataset.create({ data: { datasetCode: 'AUDIT-FIXTURE', name: 'Audit fixture', reportingYear: 2097, importedById: user.id } });
const feedback = await FeedbackService.submit({ name: 'Synthetic', email: 'audit@example.test', subject: 'Fixture', message: 'Synthetic only' });
const feedbackRow = await prisma.citizenFeedback.findUniqueOrThrow({ where: { id: feedback.id } });
const csvParams = {
  csvContent: 'title,sector,fiscalYear\nAudit CSV fixture,General,2097',
  filename: 'audit.csv', datasetType: 'PROGRAM_CATALOG', actorUser: actor, targetOfficeId: office.id,
};
assert.equal((await CsvIngestionService.generatePreview(csvParams)).validRows, 1);

// Compare every public table after each failed operation, including audit records,
// join rows and denormalized totals. No mocked transaction or database delegates.
const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
async function snapshot() {
  const result = [];
  for (const { tablename } of tables) {
    const quoted = '"' + tablename.replaceAll('"', '""') + '"';
    result.push(await prisma.$queryRawUnsafe(`SELECT count(*)::text AS count, md5(COALESCE(string_agg(row_to_json(r)::text, E'\\n' ORDER BY row_to_json(r)::text), '')) AS fingerprint FROM public.${quoted} r`));
  }
  return result;
}
const cases: Array<[string, () => Promise<unknown>]> = [
  ['office create', () => OfficeService.createOffice({ code: 'AUDIT-ROLLBACK', name: 'Rollback' }, user.id)],
  ['office update', () => OfficeService.updateOffice(office.id, { name: 'Must roll back' }, user.id)],
  ['user role update', () => UserService.updateUser(user.id, { role: 'VIEWER' }, user.id)],
  ['user deactivation', () => UserService.deactivateUser(user.id, user.id)],
  ['program delete', () => ProgramService.deleteProgram(program.id, actor)],
  ['GAD item create', () => GADPlanService.createGADPlanItem(plan.id, { activity: 'Rollback', budget: 100 }, actor)],
  ['GAD submit', () => GADPlanService.submitPlan(plan.id, actor)],
  ['beneficiary create', () => BeneficiaryService.createBeneficiary({ firstName: 'Synthetic', lastName: 'Audit', sex: 'FEMALE', barangayId: barangay.id, officeId: office.id }, actor)],
  ['accomplishment create', () => AccomplishmentService.createAccomplishment({ programId: program.id, actualOutput: 'Synthetic audit test', fiscalYear: 2097, quarter: 1 }, actor)],
  ['dataset create', () => StatisticalDatasetService.createDataset({ datasetCode: 'AUDIT-ROLLBACK', name: 'Rollback' }, actor)],
  ['table create', () => TableBuilderService.createTable({ tableCode: 'AUDIT-ROLLBACK', title: 'Rollback', domain: 'General' }, actor)],
  ['dimension create', () => TableBuilderService.createDimension({ dimensionCode: 'AUDIT-ROLLBACK', name: 'Rollback' }, actor)],
  ['observation create', () => ObservationService.createObservation(customTable.id, { datasetId: dataset.id, period: '2097', numericValue: 1 }, actor)],
  ['statistical CSV import', () => StatisticalObservationIngestionService.execute({
    csvContent: `Period,Count,Barangay\n2097,5,${barangay.code}`, datasetId: dataset.id, tableId: customTable.id,
    ingestionMode: 'RECORD_PER_ROW', duplicateStrategy: 'REJECT',
    mapping: { period: { sourceColumn: 'Period' }, numericValueColumn: 'Count', barangay: { sourceColumn: 'Barangay' } },
  }, actor)],
  ['catalog dataset create', () => StatisticalCatalogService.createDataset({ datasetCode: 'AUDIT-LEGACY', name: 'Rollback', importedById: user.id })],
  ['catalog indicator create', () => StatisticalCatalogService.registerIndicator({ indicatorCode: 'AUDIT-ROLLBACK', name: 'Rollback', title: 'Rollback', tableDefinitionId: table.id })],
  ['catalog observation create', () => StatisticalCatalogService.createObservation({ datasetId: dataset.id, tableDefinitionId: table.id, period: '2097', numericValue: 1 })],
  ['feedback submit', () => FeedbackService.submit({ name: 'Synthetic', email: 'test@example.test', subject: 'Rollback', message: 'Rollback' })],
  ['feedback review', () => FeedbackService.review(actor, feedback.id, { status: 'REVIEWED', reviewNote: 'Rollback', expectedUpdatedAt: feedbackRow.updatedAt.toISOString() })],
  ['strict CSV chunk', () => CsvIngestionService.executeIngestion({ ...csvParams, ingestionMode: 'STRICT' })],
  ['tolerant CSV chunk', () => CsvIngestionService.executeIngestion({ ...csvParams, ingestionMode: 'TOLERANT' })],
];
try {
  await prisma.$executeRawUnsafe(`CREATE FUNCTION qualification_reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'INJECTED_AUDIT_FAILURE'; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER qualification_reject_audit BEFORE INSERT ON tagad_audit_logs FOR EACH ROW EXECUTE FUNCTION qualification_reject_audit()');
  try {
    for (const [name, mutate] of cases) {
      const before = await snapshot();
      await assert.rejects(mutate, /INJECTED_AUDIT_FAILURE/, name);
      assert.deepEqual(await snapshot(), before, `${name}: database changed after audit failure`);
      console.log(`Audit rollback PASS: ${name}`);
    }
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS qualification_reject_audit ON tagad_audit_logs');
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS qualification_reject_audit()');
  }
  const created = await OfficeService.createOffice({ code: 'AUDIT-SUCCESS', name: 'Audited success' }, user.id);
  assert.equal(await prisma.auditLog.count({ where: { entityId: created.id, action: 'OFFICE_CREATED' } }), 1);
  const item = await GADPlanService.createGADPlanItem(plan.id, { activity: 'Audited success' }, actor);
  assert.equal(await prisma.auditLog.count({ where: { entityId: item.id, action: 'GAD_PLAN_ITEM_CREATED' } }), 1);
  const imported = await CsvIngestionService.executeIngestion(csvParams);
  assert.equal(imported.insertedCount, 1);
  assert.equal(await prisma.auditLog.count({ where: { entityId: imported.batchId, action: 'BATCH_CSV_INGESTION' } }), 1);
  // Failure in chunk two must preserve chunk one's rows AND its durable audit.
  await prisma.$executeRawUnsafe(`CREATE FUNCTION qualification_reject_later_chunk() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'BATCH_CSV_INGESTION' AND (NEW.after_state->>'chunkStart')::int = 250 THEN RAISE EXCEPTION 'INJECTED_LATER_CHUNK_FAILURE'; END IF; RETURN NEW; END $$`);
  await prisma.$executeRawUnsafe('CREATE TRIGGER qualification_reject_later_chunk BEFORE INSERT ON tagad_audit_logs FOR EACH ROW EXECUTE FUNCTION qualification_reject_later_chunk()');
  const auditsBefore = await prisma.auditLog.count({ where: { action: 'BATCH_CSV_INGESTION' } });
  try {
    await assert.rejects(CsvIngestionService.executeIngestion({ ...csvParams,
      csvContent: 'title,sector,fiscalYear\n' + Array.from({ length: 251 }, (_, i) => `Chunk audit ${i},General,2097`).join('\n'),
    }), /INJECTED_LATER_CHUNK_FAILURE/);
    assert.equal(await prisma.program.count({ where: { title: { startsWith: 'Chunk audit ' } } }), 250);
    assert.equal(await prisma.program.count({ where: { title: 'Chunk audit 250' } }), 0);
    assert.equal(await prisma.auditLog.count({ where: { action: 'BATCH_CSV_INGESTION' } }), auditsBefore + 1);
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER qualification_reject_later_chunk ON tagad_audit_logs');
    await prisma.$executeRawUnsafe('DROP FUNCTION qualification_reject_later_chunk()');
  }
  console.log(`Audit PostgreSQL PASS: ${cases.length} failure cases leave every public table unchanged; successful mutations persist audits.`);
} finally {
  stopDatabaseConnectionMonitor();
  await prisma.$disconnect();
}
