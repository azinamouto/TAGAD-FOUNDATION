// Synthetic preservation graph; only the disposable runner may invoke this.
import assert from 'node:assert/strict';
import { PrismaClient, Prisma } from '@prisma/client';
const url = new URL(process.env.DATABASE_URL || '');
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.pathname, '/tagad_qualification');
const db = new PrismaClient();
try {
  const office = await db.office.create({ data: { code: 'WP03_SYNTHETIC', name: 'Synthetic preservation office' } });
  const barangay = await db.barangay.findFirstOrThrow();
  const user = await db.user.create({ data: { email: 'wp03@synthetic.invalid', fullName: 'Synthetic preservation actor', passwordHash: 'not-a-login-hash', officeId: office.id, barangayId: barangay.id } });
  const household = await db.household.create({ data: { householdNo: 'WP03_SYNTHETIC', barangayId: barangay.id } });
  await db.beneficiary.create({ data: { firstName: 'Synthetic', lastName: 'Preservation', sex: 'FEMALE', age: 40, sector: 'Synthetic', barangayId: barangay.id, householdId: household.id, officeId: office.id, encodedById: user.id } });
  const program = await db.program.create({ data: { title: 'Synthetic preservation', sector: 'Synthetic', fiscalYear: 2099, officeId: office.id, createdById: user.id, budgetTarget: '1234.56' } });
  const plan = await db.gADPlan.create({ data: { officeId: office.id, fiscalYear: 2099, createdById: user.id, totalBudget: '1234.56' } });
  const item = await db.gADPlanItem.create({ data: { gadPlanId: plan.id, programId: program.id, genderIssue: 'Synthetic', gadResult: 'Synthetic', activity: 'Synthetic', performanceIndicator: 'Synthetic', targetGroup: 'Synthetic', timeline: '2099', responsibleOffice: 'Synthetic', budget: '12.34' } });
  const accomplishment = await db.gADAccomplishment.create({ data: { programId: program.id, gadPlanItemId: item.id, fiscalYear: 2099, quarter: 1, actualOutput: 'Synthetic', actualFemale: 2, actualBudgetUsed: '12.34', createdById: user.id } });
  await db.mOVAttachment.create({ data: { accomplishmentId: accomplishment.id, storagePath: 'synthetic/wp03-proof.txt', fileName: 'wp03-proof.txt', fileType: 'text/plain', fileSizeBytes: 16, uploadedById: user.id } });
  await db.auditLog.create({ data: { userId: user.id, action: 'SYNTHETIC_PRESERVATION', entityType: 'Program', entityId: program.id, beforeState: { synthetic: true }, afterState: { amount: '12.34' } } });
  const table = await db.statisticalTableDefinition.create({ data: { tableNumber: 90003, tableCode: 'WP03_SYNTHETIC', title: 'Synthetic preservation', domain: 'Synthetic' } });
  const dimension = await db.statisticalDimension.create({ data: { dimensionCode: 'WP03_SYNTHETIC', name: 'Synthetic sex dimension' } });
  await db.tableDimensionBinding.create({ data: { tableDefinitionId: table.id, dimensionId: dimension.id, allowedValues: ['FEMALE', 'MALE'] } });
  const dataset = await db.statisticalDataset.create({ data: { datasetCode: 'WP03_SYNTHETIC', name: 'Synthetic historical-like dataset', reportingYear: 2099, importedById: user.id } });
  const indicator = await db.statisticalIndicator.create({ data: { indicatorCode: 'WP03_SYNTHETIC', name: 'Synthetic', title: 'Synthetic', tableDefinitionId: table.id, unit: 'synthetic units' } });
  const provenance = await db.statisticalProvenance.create({ data: { datasetCode: dataset.datasetCode, tableCode: table.tableCode, sourceFileName: 'synthetic.csv', importedById: user.id, methodologyNotes: 'Synthetic only; no official LGU claim.' } });
  await db.statisticalObservation.create({ data: { datasetId: dataset.id, tableDefinitionId: table.id, indicatorId: indicator.id, provenanceId: provenance.id, barangayId: barangay.id, period: '2099', numericValue: '123.4567', dimensions: { sex: 'FEMALE', synthetic: true }, suppressionStatus: 'SUPPRESSED', suppressionReason: 'Synthetic preservation fixture' } });
  await db.citizenFeedback.create({ data: { name: 'Synthetic', email: 'wp03@synthetic.invalid', subject: 'Preservation', message: 'Synthetic feedback record', reviewedById: user.id } });
  // Read every scalar field through the generated client, including empty models.
  for (const model of Prisma.dmmf.datamodel.models) {
    await (db as any)[model.name[0].toLowerCase() + model.name.slice(1)].findMany({ take: 1 });
  }
  console.log('Preservation fixture PASS: linked synthetic graph and all Prisma model columns readable.');
} finally { await db.$disconnect(); }
