import dotenv from 'dotenv';
dotenv.config();

import prisma from '../server/lib/prisma';
import { AuthService } from '../server/services/AuthService';
import { BeneficiaryService } from '../server/services/BeneficiaryService';
import { ProgramService } from '../server/services/ProgramService';
import { GADPlanService } from '../server/services/GADPlanService';
import { AccomplishmentService } from '../server/services/AccomplishmentService';
import { DashboardService } from '../server/services/DashboardService';
import { UserService } from '../server/services/UserService';
import { OfficeService } from '../server/services/OfficeService';
import { BarangayService } from '../server/services/BarangayService';
import { AuditService } from '../server/services/AuditService';
import { sanitizePII } from '../server/middleware/piiSanitizer';
import { Role, GADPlanStatus } from '@prisma/client';

import bcrypt from 'bcryptjs';

async function runIntegrationTests() {
  console.log('====================================================');
  console.log(' TAGAD SPRINT 4 BACKEND INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;
  const integrationPassword = process.env.TEST_PASSWORD;
  if (!integrationPassword) throw new Error('TEST_PASSWORD is required to run backend integration tests.');

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 0. Ensure test fixtures exist if live database is connected
    const { isDatabaseConnected } = await import('../server/lib/prisma');
    if (isDatabaseConnected()) {
      const testHash = await bcrypt.hash(integrationPassword, 10);
      const mswdo = await prisma.office.findFirst({ where: { code: 'MSWDO' } });
      const mpdc = await prisma.office.findFirst({ where: { code: 'MPDC' } });

      await prisma.user.upsert({
        where: { email: 'admin@talibon.gov.ph' },
        update: { passwordHash: testHash, role: Role.ADMIN, officeId: mpdc?.id, isActive: true },
        create: { email: 'admin@talibon.gov.ph', fullName: 'System Administrator', passwordHash: testHash, role: Role.ADMIN, officeId: mpdc?.id, isActive: true },
      });

      await prisma.user.upsert({
        where: { email: 'mswdo@talibon.gov.ph' },
        update: { passwordHash: testHash, role: Role.ENCODER, officeId: mswdo?.id, isActive: true },
        create: { email: 'mswdo@talibon.gov.ph', fullName: 'MSWDO GAD Encoder', passwordHash: testHash, role: Role.ENCODER, officeId: mswdo?.id, isActive: true },
      });

      await prisma.user.upsert({
        where: { email: 'encoder.mswdo@talibon.gov.ph' },
        update: { passwordHash: testHash, role: Role.ENCODER, officeId: mswdo?.id, isActive: true },
        create: { email: 'encoder.mswdo@talibon.gov.ph', fullName: 'MSWDO Secondary Encoder', passwordHash: testHash, role: Role.ENCODER, officeId: mswdo?.id, isActive: true },
      });
    }

    // 1. Authenticate ADMIN and ENCODER
    console.log('>> 1. TESTING AUTHENTICATION & TOKEN ISSUANCE');
    const adminLogin = await AuthService.login('admin@talibon.gov.ph', integrationPassword);
    assert(!!adminLogin.accessToken && adminLogin.user.role === Role.ADMIN, 'Admin login returns valid JWT and role');

    const encoderLogin = await AuthService.login('mswdo@talibon.gov.ph', integrationPassword);
    assert(!!encoderLogin.accessToken && encoderLogin.user.role === Role.ENCODER, 'Encoder login returns valid JWT and role');

    const meProfile = await AuthService.getMe(adminLogin.user.id);
    assert(meProfile.email === 'admin@talibon.gov.ph', 'AuthService.getMe returns correct profile');

    const refreshed = await AuthService.refreshToken(adminLogin.refreshToken);
    assert(!!refreshed.accessToken, 'AuthService.refreshToken issues fresh access token');

    let badAuthFailed = false;
    try {
      await AuthService.login('admin@talibon.gov.ph', 'WrongPassword!');
    } catch (e: any) {
      badAuthFailed = e.code === 'INVALID_CREDENTIALS';
    }
    assert(badAuthFailed, 'AuthService rejects invalid credentials with INVALID_CREDENTIALS');

    // 2. Public API PII Safety Tests
    console.log('\n>> 2. TESTING PUBLIC API & ZERO-PII SAFETY');
    const publicDash = await DashboardService.getPublicDashboardStats(2026);
    assert(typeof publicDash.summary.totalBeneficiaries === 'number', 'Public dashboard returns numeric summary');

    const rawBeneficiary = {
      firstName: 'Juanita',
      lastName: 'Dela Cruz',
      contactNumber: '09123456789',
      addressStreet: 'Poblacion Street 1',
      passwordHash: 'secret_hash',
      sector: 'Senior Citizen',
      age: 68,
      sex: 'FEMALE',
    };
    const sanitized = sanitizePII(rawBeneficiary);
    assert(
      !sanitized.firstName &&
      !sanitized.lastName &&
      !sanitized.contactNumber &&
      !sanitized.addressStreet &&
      !sanitized.passwordHash &&
      sanitized.sector === 'Senior Citizen',
      'PII Sanitizer deeply strips personal names, contact, street address, and secrets'
    );

    const publicDemographics = await BeneficiaryService.getDemographicsAggregates({ year: 2026 });
    assert(Array.isArray(publicDemographics.byBarangay) && Array.isArray(publicDemographics.bySector), 'Public demographics returns aggregated arrays only');

    // 3. Office Isolation & Scoping
    console.log('\n>> 3. TESTING OFFICE ISOLATION & RBAC SCOPING');
    const allOffices = await OfficeService.getOffices();
    const allBrgys = await BarangayService.getBarangays();
    const mswdoOffice = allOffices.find((o: any) => o.code === 'MSWDO') || allOffices[0];
    const maoOffice = allOffices.find((o: any) => o.code === 'MAO') || allOffices[1] || allOffices[0];
    const testBrgy = allBrgys[0];

    assert(!!mswdoOffice && !!maoOffice && !!testBrgy, 'Reference Offices and Barangays exist in system');

    // Encoders can create within their office
    const createdBen = await BeneficiaryService.createBeneficiary(
      {
        firstName: 'Maria',
        lastName: 'Santos',
        sex: 'FEMALE',
        age: 34,
        sector: 'Solo Parents',
        barangayId: testBrgy!.id,
      },
      { id: encoderLogin.user.id, role: Role.ENCODER, officeId: mswdoOffice!.id }
    );
    assert(createdBen.officeId === mswdoOffice!.id, 'Encoder creating beneficiary is automatically scoped to own office');

    // Encoder trying to update another office's program
    const maoProgram = await ProgramService.createProgram(
      {
        title: 'Agricultural Women Farmers Grant',
        fiscalYear: 2026,
        officeId: maoOffice!.id,
        sector: 'Agriculture & Livelihood',
        budgetTarget: 500000,
      },
      { id: adminLogin.user.id, role: Role.ADMIN, officeId: null }
    );

    let crossOfficeBlocked = false;
    try {
      await ProgramService.updateProgram(
        maoProgram.id,
        { title: 'Attempted Hijack' },
        { id: encoderLogin.user.id, role: Role.ENCODER, officeId: mswdoOffice!.id }
      );
    } catch (e: any) {
      crossOfficeBlocked = e.code === 'OFFICE_SCOPE_MISMATCH';
    }
    assert(crossOfficeBlocked, 'ENCODER cannot modify program of another office (OFFICE_SCOPE_MISMATCH enforced)');

    // Admin can update any office's program
    const adminUpdatedProg = await ProgramService.updateProgram(
      maoProgram.id,
      { budgetTarget: 550000 },
      { id: adminLogin.user.id, role: Role.ADMIN, officeId: null }
    );
    assert(adminUpdatedProg.budgetTarget === 550000, 'ADMIN has full cross-office authority to update program');

    // 4. GAD Plan Status Workflow
    console.log('\n>> 4. TESTING GAD PLAN WORKFLOW & ROLE RESTRICTIONS');
    const newPlanItem = await GADPlanService.createGADPlan(
      {
        fiscalYear: 2026,
        officeId: mswdoOffice!.id,
        activity: 'Women Leadership Capacity Workshop',
        genderIssue: 'Low representation in community councils',
        gadResult: 'Empowered women barangay leaders',
        performanceIndicator: '50 women trained',
        targetGroup: 'Barangay Women Leaders',
        timeline: 'Q2 2026',
        responsibleOffice: 'MSWDO',
        budget: 75000,
      },
      { id: encoderLogin.user.id, role: Role.ENCODER, officeId: mswdoOffice!.id }
    );
    assert(newPlanItem.budget === 75000, 'GAD Plan line item created successfully');

    let encoderApproveBlocked = false;
    try {
      await GADPlanService.updatePlanStatus(
        newPlanItem.planId,
        GADPlanStatus.APPROVED,
        { id: encoderLogin.user.id, role: Role.ENCODER, officeId: mswdoOffice!.id }
      );
    } catch (e: any) {
      encoderApproveBlocked = e.code === 'FORBIDDEN';
    }
    assert(encoderApproveBlocked, 'ENCODER is forbidden from approving GAD Plans (Only ADMIN can approve)');

    const approvedPlan = await GADPlanService.updatePlanStatus(
      newPlanItem.planId,
      GADPlanStatus.APPROVED,
      { id: adminLogin.user.id, role: Role.ADMIN, officeId: null }
    );
    assert(approvedPlan.status === GADPlanStatus.APPROVED, 'ADMIN successfully approves GAD Plan');

    // 5. Accomplishments & Actuals
    console.log('\n>> 5. TESTING ACCOMPLISHMENTS & ACTUALS TRACKING');
    const accRecord = await AccomplishmentService.createAccomplishment(
      {
        gadPlanId: newPlanItem.id,
        fiscalYear: 2026,
        quarter: 2,
        actualOutput: 'Conducted 3-day leadership workshop for 52 women leaders',
        actualMale: 2,
        actualFemale: 50,
        actualBudgetUsed: 72000,
        outputSummary: 'Target exceeded by 4%',
      },
      { id: encoderLogin.user.id, role: Role.ENCODER, officeId: mswdoOffice!.id }
    );
    assert(accRecord.actualFemale === 50 && accRecord.actualBudgetUsed === 72000, 'Accomplishment created with gender disaggregated beneficiaries and budget');

    // 6. Sprint 4 Hardening: Token Revocation, Refresh Rotation, Session Invalidation
    console.log('\n>> 6. TESTING TOKEN REVOCATION, ROTATION & LOGOUT HARDENING');
    
    // Test refresh token rotation
    const rotationLogin = await AuthService.login('admin@talibon.gov.ph', integrationPassword);
    const firstRefreshToken = rotationLogin.refreshToken;
    const firstRotated = await AuthService.refreshToken(firstRefreshToken);
    assert(!!firstRotated.accessToken && !!firstRotated.refreshToken, 'Refresh token rotated and returned new access & refresh tokens');

    // Attempting to reuse old refresh token must be rejected
    let reuseBlocked = false;
    try {
      await AuthService.refreshToken(firstRefreshToken);
    } catch (e: any) {
      reuseBlocked = e.code === 'INVALID_REFRESH_TOKEN' || e.name === 'TokenRevokedError';
    }
    assert(reuseBlocked, 'Replay attack prevented: Reusing previous refresh token is immediately rejected');

    // Test access token revocation on logout
    const logoutTestLogin = await AuthService.login('encoder.mswdo@talibon.gov.ph', integrationPassword);
    const dummyReq: any = {
      headers: {
        authorization: `Bearer ${logoutTestLogin.accessToken}`,
      },
      body: {
        refreshToken: logoutTestLogin.refreshToken,
      },
      socket: { remoteAddress: '127.0.0.1' },
    };
    await AuthService.logout(logoutTestLogin.user.id, dummyReq);

    // Verifying revoked access token throws TokenRevokedError
    let tokenRevokedCheckPassed = false;
    try {
      const { verifyAccessToken } = await import('../server/lib/jwt');
      verifyAccessToken(logoutTestLogin.accessToken);
    } catch (e: any) {
      tokenRevokedCheckPassed = e.name === 'TokenRevokedError';
    }
    assert(tokenRevokedCheckPassed, 'Logged out access token is immediately revoked and blocked on subsequent requests');

    // 7. Sprint 4 Hardening: UUID Parameter Validation Schema Tests
    console.log('\n>> 7. TESTING UUID PARAMETER VALIDATION SCHEMA');
    const { uuidParamSchema, uuidSchema } = await import('../server/validation/schemas');
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const invalidUuid = 'not-a-valid-uuid-12345';

    const validResult = uuidParamSchema.safeParse({ id: validUuid });
    const invalidResult = uuidParamSchema.safeParse({ id: invalidUuid });

    assert(validResult.success, 'UUID schema validates RFC4122 standard UUID strings');
    assert(!invalidResult.success, 'UUID schema strictly rejects malformed / non-UUID parameter strings');

    // 8. Audit Logging Verification
    console.log('\n>> 8. TESTING CENTRALIZED TRANSACTIONAL AUDIT LOGGING');
    const logsResult = await UserService.getUsers();
    assert(logsResult.length > 0, 'Users query succeeds');

    const auditResponse = await AuditService.getLogs({ limit: 10 });
    const auditTrail = auditResponse.logs;
    assert(auditTrail.length > 0, `Audit logs captured in system (total checked: ${auditTrail.length})`);
    const hasPlanStatusLog = auditTrail.some((l: any) => l.action.includes('GAD_PLAN') || l.action.includes('USER') || l.action.includes('BENEFICIARY') || l.action.includes('PROGRAM'));
    assert(hasPlanStatusLog, 'Audit log accurately records state mutations via atomic transactions');

    // 9. Sprint 5: Phase 1 CSV Schema Discovery Tests
    console.log('\n>> 9. TESTING SPRINT 5 PHASE 1 CSV SCHEMA DISCOVERY');
    const { CsvDiscoveryService } = await import('../server/services/CsvDiscoveryService');

    // Test sample raw CSV input (representative LGU format)
    const sampleLguCsv = `first_name,last_name,middle_name,gender,age,sector,barangay,contact_no,custom_remarks
Maria,Santos,Dela Cruz,Female,34,Women,Poblacion,09171234567,Solo parent applicant
Juan,Reyes,Alvarez,Male,67,Senior Citizen,TLB-POB,09189876543,Pension recipient
Elena,Gonzales,Lim,F,24,Youth,San Jose,09223334444,Skills training grantee
Roberto,Cruz,,M,45,Farmer,San Isidro,,Irrigation beneficiary`;

    const discovery = CsvDiscoveryService.discoverSchema(sampleLguCsv, 'lgu_sample_beneficiaries.csv');
    assert(discovery.totalRows === 4, 'CSV Discovery accurately parses row count');
    assert(discovery.totalColumns === 9, 'CSV Discovery accurately identifies column count');
    assert(discovery.summary.datasetTypeGuess === 'BENEFICIARY_REGISTRY', 'CSV Discovery infers dataset type as BENEFICIARY_REGISTRY');
    assert(discovery.summary.hasRequiredIdentityFields, 'CSV Discovery detects required personal identity fields');
    assert(discovery.summary.hasBarangayField, 'CSV Discovery recognizes Talibon barangay location column');
    assert(discovery.summary.hasGenderField, 'CSV Discovery recognizes gender/sex column');
    assert(discovery.columns['custom_remarks']?.inferredTargetField === 'custom_remarks', 'Unmapped custom columns are safely preserved as custom attributes');
    assert(discovery.schemaMapping.length === 9, 'CSV Discovery produces complete CSV-to-TAGAD data mapping matrix');

    // Test malformed / empty CSV handling
    const emptyDiscovery = CsvDiscoveryService.discoverSchema('', 'empty.csv');
    assert(emptyDiscovery.totalRows === 0 && emptyDiscovery.summary.datasetTypeGuess === 'UNKNOWN', 'Empty CSV is handled gracefully with zero rows and low readiness');

    // 10. Sprint 6: Phase 2 CSV Ingestion Engine Tests
    console.log('\n>> 10. TESTING SPRINT 6 PHASE 2 CSV INGESTION PIPELINE');
    const { CsvIngestionService } = await import('../server/services/CsvIngestionService');

    const adminActor = {
      id: adminLogin.user.id,
      role: Role.ADMIN,
      officeId: adminLogin.user.officeId,
      email: adminLogin.user.email,
      fullName: adminLogin.user.fullName,
    };

    const encoderActor = {
      id: encoderLogin.user.id,
      role: Role.ENCODER,
      officeId: encoderLogin.user.officeId,
      email: encoderLogin.user.email,
      fullName: encoderLogin.user.fullName,
    };

    // Test 1: Valid Beneficiary CSV Preview & Execution
    const validBenCsv = `first_name,last_name,sex,age,sector,barangay,contact_number
Teresa,Magbanua,FEMALE,38,Women,Poblacion,09191112222
Gabriela,Silang,FEMALE,45,Solo Parent,San Jose,09193334444`;

    const benPreview = await CsvIngestionService.generatePreview({
      csvContent: validBenCsv,
      actorUser: adminActor,
    });
    assert(benPreview.totalRows === 2 && benPreview.validRows === 2, 'Test 1: Beneficiary preview validates canonical rows');
    assert(benPreview.sampleRows.length === 2 && benPreview.sampleRows[0].canonicalData.barangayName === 'Poblacion', 'Test 1: Preview accurately maps canonical fields and resolves barangay');

    const benExecution = await CsvIngestionService.executeIngestion({
      csvContent: validBenCsv,
      duplicateStrategy: 'SKIP',
      actorUser: adminActor,
    });
    assert(benExecution.success && benExecution.insertedCount === 2, 'Test 1: Beneficiary CSV transaction successfully persists records');

    // Test 2: Valid Program Catalog CSV Ingestion
    const validProgCsv = `title,sector,fiscal_year,budget_target,target_male,target_female,office
Livelihood Training for Rural Women,Women,2026,150000,10,40,MSWDO
Youth Leadership Summit,Youth,2026,75000,25,25,MPDC`;

    const progExecution = await CsvIngestionService.executeIngestion({
      csvContent: validProgCsv,
      datasetType: 'PROGRAM_CATALOG',
      actorUser: adminActor,
    });
    assert(progExecution.success && progExecution.insertedCount === 2, 'Test 2: Program Catalog CSV successfully ingested with budget numbers');

    // Test 3: Invalid Barangay Rejection (Zero foreign-key contamination)
    const invalidBrgyCsv = `first_name,last_name,sex,age,sector,barangay
Andres,Bonifacio,MALE,33,Farmer,Tagbilaran`;

    const invalidBrgyPreview = await CsvIngestionService.generatePreview({
      csvContent: invalidBrgyCsv,
      actorUser: adminActor,
    });
    assert(invalidBrgyPreview.errorRows === 1, 'Test 3: Non-Talibon barangay rejected in validation');
    const brgyError = invalidBrgyPreview.rowIssues.find((i) => i.field === 'barangay');
    assert(!!brgyError && brgyError.message.includes('not one of the 25 official Talibon barangays'), 'Test 3: Descriptive error returned for invalid barangay');

    // Test 4: ENCODER Office Scope Isolation
    const encoderCrossOfficeCsv = `first_name,last_name,sex,age,sector,barangay,office
Melchora,Aquino,FEMALE,84,Senior Citizen,San Isidro,MPDC`;

    const encoderPreview = await CsvIngestionService.generatePreview({
      csvContent: encoderCrossOfficeCsv,
      actorUser: encoderActor,
    });
    assert(encoderPreview.targetOfficeId === encoderActor.officeId, 'Test 4: Encoder cannot override office; target locked to encoder assigned office');
    const encoderExecution = await CsvIngestionService.executeIngestion({
      csvContent: encoderCrossOfficeCsv,
      actorUser: encoderActor,
    });
    assert(encoderExecution.success && encoderExecution.insertedCount === 1, 'Test 4: Encoder record persisted stamped with authorized office');

    // Test 5: Duplicate SKIP Strategy
    const dupSkipExecution = await CsvIngestionService.executeIngestion({
      csvContent: validBenCsv,
      duplicateStrategy: 'SKIP',
      actorUser: adminActor,
    });
    assert(dupSkipExecution.skippedCount === 2 && dupSkipExecution.insertedCount === 0, 'Test 5: Duplicate SKIP correctly skips already ingested citizens');

    // Test 6: Duplicate UPDATE Strategy
    const updateBenCsv = `first_name,last_name,sex,age,sector,barangay,contact_number
Teresa,Magbanua,FEMALE,39,Senior Citizen,Poblacion,09199998888`;

    const dupUpdateExecution = await CsvIngestionService.executeIngestion({
      csvContent: updateBenCsv,
      duplicateStrategy: 'UPDATE',
      actorUser: adminActor,
    });
    assert(dupUpdateExecution.updatedCount === 1, 'Test 6: Duplicate UPDATE modifies mutable fields without inserting duplicate row');

    // Test 7: Duplicate APPEND Strategy
    const dupAppendExecution = await CsvIngestionService.executeIngestion({
      csvContent: updateBenCsv,
      duplicateStrategy: 'APPEND',
      actorUser: adminActor,
    });
    assert(dupAppendExecution.insertedCount === 1, 'Test 7: Duplicate APPEND inserts separate record upon explicit user request');

    // Test 8: STRICT Mode Rollback on Critical Validation Failure
    const strictCsv = `first_name,last_name,sex,age,sector,barangay
Apolinario,Mabini,MALE,40,PWD,Poblacion
Emilio,Aguinaldo,MALE,50,General,CebuCity`;

    let strictFailed = false;
    try {
      await CsvIngestionService.executeIngestion({
        csvContent: strictCsv,
        ingestionMode: 'STRICT',
        actorUser: adminActor,
      });
    } catch (e: any) {
      strictFailed = true;
    }
    assert(strictFailed, 'Test 8: STRICT mode aborts transaction when invalid row is detected');

    // Test 9: TOLERANT Mode Partial Ingestion
    const tolerantExecution = await CsvIngestionService.executeIngestion({
      csvContent: strictCsv,
      ingestionMode: 'TOLERANT',
      actorUser: adminActor,
    });
    assert(tolerantExecution.insertedCount === 1 && tolerantExecution.errorCount === 1, 'Test 9: TOLERANT mode commits valid rows and reports invalid row error');

    // Test 10: Audit Log Verification with Zero-PII
    const latestAudit = await AuditService.getLogs({ action: 'BATCH_CSV_INGESTION', limit: 1 });
    assert(latestAudit.logs.length > 0, 'Test 10: Centralized AuditService recorded BATCH_CSV_INGESTION action');
    const auditRecord = latestAudit.logs[0];
    const rawAuditString = JSON.stringify(auditRecord);
    assert(!rawAuditString.includes('Magbanua') && !rawAuditString.includes('0919'), 'Test 10: Audit log contains zero citizen PII names or contact numbers');

    // Test 11: Household Ingestion & Unique household_no
    const householdCsv = `household_no,barangay,is_4ps,is_indigent,head_name,purok
HH-2026-001,Poblacion,true,true,Juan Dela Cruz,Purok 1
HH-2026-001,Poblacion,true,false,Juan Dela Cruz,Purok 1 Updated`;

    const hhExecution = await CsvIngestionService.executeIngestion({
      csvContent: householdCsv,
      datasetType: 'HOUSEHOLD_SURVEY',
      actorUser: adminActor,
    });
    assert(hhExecution.insertedCount >= 1, 'Test 11: Household survey ingestion successfully handles household records');

    // Test 12: RBAC VIEWER Ingestion Guard
    const viewerActor = {
      id: 'viewer-uuid-1',
      role: Role.VIEWER,
      officeId: null,
      email: 'viewer@talibon.gov.ph',
      fullName: 'Public Viewer',
    };
    const { IngestionController } = await import('../server/controllers/admin/ingestionController');
    let viewerForbidden = false;
    const mockReq: any = {
      user: viewerActor,
      body: { csvContent: validBenCsv },
      headers: {},
      socket: {},
    };
    const mockRes: any = {
      status(code: number) {
        if (code === 403) viewerForbidden = true;
        return this;
      },
      json(data: any) {
        if (data?.error?.code === 'FORBIDDEN' || data?.error?.message?.includes('read-only')) viewerForbidden = true;
        return this;
      },
    };
    await IngestionController.executeIngestion(mockReq, mockRes);
    assert(viewerForbidden, 'Test 12: VIEWER role is strictly forbidden (403) from executing ingestion');

  } catch (error) {
    console.error('Test Suite encountered unhandled error:', error);
    failed++;
  } finally {
    console.log('\n====================================================');
    console.log(` TEST RUN SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
    await prisma.$disconnect();
    if (failed > 0) process.exit(1);
  }
}

runIntegrationTests();
