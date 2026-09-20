import prisma, { isDatabaseConnected } from '../lib/prisma';
import { Role, Sex, ProgramStatus } from '@prisma/client';
import { CsvDiscoveryService, CsvDiscoveryResult, CsvToTagadFieldMapping } from './CsvDiscoveryService';
import { FALLBACK_BARANGAYS, FALLBACK_OFFICES, FallbackBarangay, FallbackOffice } from '../lib/fallbackStore';
import { AuditService } from './AuditService';
import { ValidationError, ForbiddenError, OfficeScopeError } from '../lib/errors';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MEMORY_BENEFICIARIES } from './BeneficiaryService';
import { MEMORY_PROGRAMS } from './ProgramService';

export type IngestionDatasetType =
  | 'BENEFICIARY_REGISTRY'
  | 'HOUSEHOLD_SURVEY'
  | 'PROGRAM_CATALOG'
  | 'GAD_ACCOMPLISHMENT';

export type DuplicateStrategy = 'SKIP' | 'UPDATE' | 'APPEND';
export type IngestionMode = 'STRICT' | 'TOLERANT';

export interface RowValidationIssue {
  rowNumber: number;
  field: string;
  value: any;
  severity: 'ERROR' | 'WARNING';
  message: string;
}

export interface IngestionPreviewRow {
  rowNumber: number;
  status: 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE';
  canonicalData: Record<string, any>;
  rawRow: Record<string, string>;
  issues: RowValidationIssue[];
  isDuplicate?: boolean;
  existingId?: string;
}

export interface IngestionPreviewResult {
  datasetType: IngestionDatasetType;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  duplicateRows: number;
  duplicateStrategy: DuplicateStrategy;
  ingestionMode: IngestionMode;
  targetOfficeId: string | null;
  targetOfficeName?: string | null;
  canProceed: boolean;
  sampleRows: IngestionPreviewRow[];
  rowIssues: RowValidationIssue[];
}

export interface IngestionSummaryResult {
  batchId: string;
  datasetType: IngestionDatasetType;
  filename?: string;
  duplicateStrategy: DuplicateStrategy;
  ingestionMode: IngestionMode;
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  processingTimeMs: number;
  errors: RowValidationIssue[];
  warnings: RowValidationIssue[];
  success: boolean;
}

export interface ActorContext {
  id: string;
  role: Role;
  officeId: string | null;
  email?: string;
  fullName?: string;
}

interface ReferenceCache {
  barangays: {
    byId: Map<string, { id: string; code: string; name: string }>;
    byCode: Map<string, { id: string; code: string; name: string }>;
    byName: Map<string, { id: string; code: string; name: string }>;
    byCleanName: Map<string, { id: string; code: string; name: string }>;
    all: Array<{ id: string; code: string; name: string }>;
  };
  offices: {
    byId: Map<string, { id: string; code: string; name: string; isActive: boolean }>;
    byCode: Map<string, { id: string; code: string; name: string; isActive: boolean }>;
    byName: Map<string, { id: string; code: string; name: string; isActive: boolean }>;
    all: Array<{ id: string; code: string; name: string; isActive: boolean }>;
  };
}

// In-memory fallback stores for non-DB environments
export const MEMORY_HOUSEHOLDS: any[] = [];
export const MEMORY_INGESTED_BENEFICIARIES: any[] = [];
export const MEMORY_INGESTED_PROGRAMS: any[] = [];
export const MEMORY_INGESTED_ACCOMPLISHMENTS: any[] = [];

export class CsvIngestionService {
  /**
   * Pre-loads canonical reference data (25 Talibon Barangays + 5 LGU Offices) into memory lookups.
   */
  public static async loadReferenceData(): Promise<ReferenceCache> {
    let dbBarangays: Array<{ id: string; code: string; name: string }> = [];
    let dbOffices: Array<{ id: string; code: string; name: string; isActive: boolean }> = [];

    if (isDatabaseConnected()) {
      try {
        dbBarangays = await prisma.barangay.findMany({
          select: { id: true, code: true, name: true },
        });
        dbOffices = await prisma.office.findMany({
          select: { id: true, code: true, name: true, isActive: true },
        });
      } catch (err) {
        console.warn('Could not query database for reference data, using fallback store:', err);
      }
    }

    if (dbBarangays.length === 0) {
      dbBarangays = FALLBACK_BARANGAYS.map((b) => ({ id: b.id, code: b.code, name: b.name }));
    }
    if (dbOffices.length === 0) {
      dbOffices = FALLBACK_OFFICES.map((o) => ({ id: o.id, code: o.code, name: o.name, isActive: o.isActive }));
    }

    const barangayById = new Map<string, { id: string; code: string; name: string }>();
    const barangayByCode = new Map<string, { id: string; code: string; name: string }>();
    const barangayByName = new Map<string, { id: string; code: string; name: string }>();
    const barangayByCleanName = new Map<string, { id: string; code: string; name: string }>();

    for (const b of dbBarangays) {
      barangayById.set(b.id, b);
      barangayByCode.set(b.code.toLowerCase().trim(), b);
      barangayByName.set(b.name.toLowerCase().trim(), b);
      const clean = this.cleanBarangayName(b.name);
      barangayByCleanName.set(clean, b);
    }

    const officeById = new Map<string, { id: string; code: string; name: string; isActive: boolean }>();
    const officeByCode = new Map<string, { id: string; code: string; name: string; isActive: boolean }>();
    const officeByName = new Map<string, { id: string; code: string; name: string; isActive: boolean }>();

    for (const o of dbOffices) {
      officeById.set(o.id, o);
      officeByCode.set(o.code.toLowerCase().trim(), o);
      officeByName.set(o.name.toLowerCase().trim(), o);
    }

    return {
      barangays: {
        byId: barangayById,
        byCode: barangayByCode,
        byName: barangayByName,
        byCleanName: barangayByCleanName,
        all: dbBarangays,
      },
      offices: {
        byId: officeById,
        byCode: officeByCode,
        byName: officeByName,
        all: dbOffices,
      },
    };
  }

  /**
   * Cleans barangay string variations (e.g. 'Brgy. San Jose', 'Barangay San Jose' -> 'san jose')
   */
  public static cleanBarangayName(raw: string): string {
    return raw
      .toLowerCase()
      .trim()
      .replace(/^(brgy\.?|barangay|baranggay|bgy\.?)\s+/i, '')
      .replace(/[^a-z0-9]/g, '');
  }

  /**
   * Resolves a raw barangay input string to canonical Talibon Barangay record.
   */
  public static resolveBarangay(
    raw: string | null | undefined,
    ref: ReferenceCache
  ): { match: { id: string; code: string; name: string } | null; error?: string } {
    if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
      return { match: null, error: 'Barangay is required' };
    }

    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();

    // 1. Direct UUID match
    if (ref.barangays.byId.has(trimmed)) {
      return { match: ref.barangays.byId.get(trimmed)! };
    }

    // 2. Direct Code match (e.g., TLB-POB)
    if (ref.barangays.byCode.has(lower)) {
      return { match: ref.barangays.byCode.get(lower)! };
    }

    // 3. Exact Name match (e.g., Poblacion)
    if (ref.barangays.byName.has(lower)) {
      return { match: ref.barangays.byName.get(lower)! };
    }

    // 4. Normalized clean name match (e.g., "Brgy. San Jose" -> "sanjose")
    const clean = this.cleanBarangayName(trimmed);
    if (ref.barangays.byCleanName.has(clean)) {
      return { match: ref.barangays.byCleanName.get(clean)! };
    }

    return {
      match: null,
      error: `Invalid Barangay: "${trimmed}" is not one of the 25 official Talibon barangays`,
    };
  }

  /**
   * Resolves an office with strict ENCODER isolation and ADMIN scoping.
   */
  public static resolveOffice(
    raw: string | null | undefined,
    ref: ReferenceCache,
    actor: ActorContext,
    targetOfficeIdOverride?: string | null
  ): { officeId: string; officeName: string; warning?: string; error?: string } {
    // ENCODER scope rule: CSV value CANNOT override encoder's assigned office
    if (actor.role === Role.ENCODER) {
      if (!actor.officeId) {
        return {
          officeId: '',
          officeName: '',
          error: 'Encoder account has no assigned office scope',
        };
      }
      const assigned = ref.offices.byId.get(actor.officeId);
      const assignedName = assigned?.name || actor.officeId;

      let warning: string | undefined;
      if (raw && typeof raw === 'string' && raw.trim().length > 0) {
        const lower = raw.trim().toLowerCase();
        const found = ref.offices.byCode.get(lower) || ref.offices.byName.get(lower) || ref.offices.byId.get(raw.trim());
        if (found && found.id !== actor.officeId) {
          warning = `CSV office (${found.code}) differs from assigned encoder office. Record will be stamped with ${assigned?.code || assignedName}.`;
        }
      }

      return {
        officeId: actor.officeId,
        officeName: assignedName,
        warning,
      };
    }

    // ADMIN scope rule: Check targetOfficeId override, then CSV value, then fallback
    if (targetOfficeIdOverride) {
      const target = ref.offices.byId.get(targetOfficeIdOverride);
      if (!target) {
        return { officeId: '', officeName: '', error: `Specified target office ${targetOfficeIdOverride} does not exist` };
      }
      return { officeId: target.id, officeName: target.name };
    }

    if (raw && typeof raw === 'string' && raw.trim().length > 0) {
      const lower = raw.trim().toLowerCase();
      const match = ref.offices.byCode.get(lower) || ref.offices.byName.get(lower) || ref.offices.byId.get(raw.trim());
      if (match) {
        return { officeId: match.id, officeName: match.name };
      }
      return { officeId: '', officeName: '', error: `Invalid office: "${raw}" does not match any official LGU office` };
    }

    // Default for Admin if unspecified
    const defaultOffice = ref.offices.all[0];
    return {
      officeId: defaultOffice?.id || '',
      officeName: defaultOffice?.name || 'Municipal Planning and Development Coordinator',
    };
  }

  /**
   * Normalizes Sex/Gender strings to canonical 'MALE' | 'FEMALE'
   */
  public static normalizeSex(raw: any): { value: Sex | null; error?: string } {
    if (!raw || typeof raw !== 'string') {
      return { value: null, error: 'Sex/Gender is required' };
    }
    const clean = raw.trim().toUpperCase();
    if (['MALE', 'M', 'LALAKI', 'LALAKE', 'BOY', 'MAN'].includes(clean)) {
      return { value: Sex.MALE };
    }
    if (['FEMALE', 'F', 'BABAE', 'BABAYE', 'GIRL', 'WOMAN'].includes(clean)) {
      return { value: Sex.FEMALE };
    }
    return {
      value: null,
      error: `Invalid sex/gender value: "${raw}". Must normalize cleanly to MALE or FEMALE.`,
    };
  }

  /**
   * Normalizes age and birthdate deterministically respecting SQL check (0 <= age <= 130)
   */
  public static normalizeAgeAndBirthdate(
    rawAge: any,
    rawBirthdate: any
  ): { age: number | null; birthdate: Date | null; warning?: string; error?: string } {
    let age: number | null = null;
    let birthdate: Date | null = null;
    let warning: string | undefined;

    if (rawBirthdate && typeof rawBirthdate === 'string' && rawBirthdate.trim().length > 0) {
      const parsed = new Date(rawBirthdate.trim());
      if (!isNaN(parsed.getTime())) {
        birthdate = parsed;
      }
    }

    if (rawAge !== undefined && rawAge !== null && String(rawAge).trim().length > 0) {
      const parsedAge = parseInt(String(rawAge).trim(), 10);
      if (!isNaN(parsedAge)) {
        age = parsedAge;
      } else {
        return { age: null, birthdate, error: `Invalid age value: "${rawAge}". Must be an integer.` };
      }
    }

    // Derive age from birthdate if age is absent
    if (age === null && birthdate !== null) {
      const diffMs = Date.now() - birthdate.getTime();
      const calculatedAge = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
      if (calculatedAge >= 0 && calculatedAge <= 130) {
        age = calculatedAge;
      }
    }

    // Verify age constraint
    if (age === null) {
      return { age: null, birthdate, error: 'Age or valid Birthdate is required.' };
    }

    if (age < 0 || age > 130) {
      return { age, birthdate, error: `Age ${age} violates valid demographic constraint (0 to 130).` };
    }

    // Cross-verify if both age and birthdate exist
    if (birthdate !== null) {
      const diffMs = Date.now() - birthdate.getTime();
      const calculatedAge = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
      if (Math.abs(calculatedAge - age) > 2) {
        warning = `Provided age (${age}) differs from birthdate-derived age (${calculatedAge}).`;
      }
    }

    return { age, birthdate, warning };
  }

  /**
   * Normalizes Boolean flags (4Ps, Indigent, etc.)
   */
  public static normalizeBoolean(raw: any, defaultValue = false): boolean {
    if (raw === undefined || raw === null) return defaultValue;
    if (typeof raw === 'boolean') return raw;
    const clean = String(raw).trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'oo', 't'].includes(clean)) return true;
    if (['false', '0', 'no', 'n', 'hindi', 'f'].includes(clean)) return false;
    return defaultValue;
  }

  /**
   * Normalizes Currency amounts (₱, commas, etc.)
   */
  public static normalizeCurrency(raw: any): { value: number; error?: string } {
    if (raw === undefined || raw === null || String(raw).trim().length === 0) {
      return { value: 0 };
    }
    if (typeof raw === 'number') {
      if (raw < 0) return { value: 0, error: 'Budget amount cannot be negative.' };
      return { value: Math.round(raw * 100) / 100 };
    }
    const clean = String(raw).replace(/[₱$,\sA-Za-z]/g, '').trim();
    const parsed = parseFloat(clean);
    if (isNaN(parsed)) {
      return { value: 0, error: `Invalid currency amount: "${raw}".` };
    }
    if (parsed < 0) {
      return { value: 0, error: 'Budget amount cannot be negative.' };
    }
    return { value: Math.round(parsed * 100) / 100 };
  }

  /**
   * Normalizes String values (trims, handles BOM, prevents null errors)
   */
  public static normalizeString(raw: any): string {
    if (raw === undefined || raw === null) return '';
    return String(raw).replace(/^\uFEFF/, '').trim();
  }

  /**
   * Splits composite full name into firstName, lastName, middleName
   */
  public static splitFullName(fullName: string): { firstName: string; lastName: string; middleName: string | null } {
    const clean = this.normalizeString(fullName);
    if (!clean) return { firstName: '', lastName: '', middleName: null };

    // Format: "Lastname, Firstname Middlename"
    if (clean.includes(',')) {
      const parts = clean.split(',').map((p) => p.trim());
      const lastName = parts[0];
      const rest = parts[1] || '';
      const restTokens = rest.split(/\s+/).filter(Boolean);
      const firstName = restTokens[0] || '';
      const middleName = restTokens.slice(1).join(' ') || null;
      return { firstName, lastName, middleName };
    }

    // Format: "Firstname Middlename Lastname"
    const tokens = clean.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
      return { firstName: tokens[0], lastName: tokens[0], middleName: null };
    }
    if (tokens.length === 2) {
      return { firstName: tokens[0], lastName: tokens[1], middleName: null };
    }
    const firstName = tokens[0];
    const lastName = tokens[tokens.length - 1];
    const middleName = tokens.slice(1, tokens.length - 1).join(' ') || null;
    return { firstName, lastName, middleName };
  }

  /**
   * Maps raw CSV header keys according to confirmed mappings or default discovery
   */
  public static buildMappingMap(
    headers: string[],
    confirmedMappings?: Record<string, string> | Array<{ sourceColumn: string; targetField: string }>,
    discoveryMapping?: CsvToTagadFieldMapping[]
  ): Map<string, string> {
    const map = new Map<string, string>();

    // 1. Apply confirmed mappings if provided
    if (confirmedMappings) {
      if (Array.isArray(confirmedMappings)) {
        for (const m of confirmedMappings) {
          map.set(m.sourceColumn.toLowerCase().trim(), m.targetField);
        }
      } else if (typeof confirmedMappings === 'object') {
        for (const [k, v] of Object.entries(confirmedMappings)) {
          map.set(k.toLowerCase().trim(), v);
        }
      }
    }

    // 2. Apply discovery heuristics for unmapped headers
    if (discoveryMapping) {
      for (const m of discoveryMapping) {
        const src = m.sourceColumn.toLowerCase().trim();
        if (!map.has(src) && m.tagadDestinationField) {
          const dest = m.tagadDestinationField.startsWith('metadata.')
            ? m.tagadDestinationField.replace(/^metadata\./, '')
            : m.tagadDestinationField;
          map.set(src, dest);
        }
      }
    }

    // 3. Fallback direct match for common field names
    for (const h of headers) {
      const lower = h.toLowerCase().trim();
      if (!map.has(lower)) {
        map.set(lower, CsvDiscoveryService.normalizeHeader(h));
      }
    }

    return map;
  }

  /**
   * Normalizes incoming dataset type names (e.g. PROGRAM_MONITORING -> PROGRAM_CATALOG)
   */
  public static normalizeDatasetType(rawType?: string): IngestionDatasetType {
    if (!rawType) return 'BENEFICIARY_REGISTRY';
    const upper = rawType.toUpperCase().trim();
    if (upper === 'PROGRAM_MONITORING' || upper === 'PROGRAM_CATALOG') return 'PROGRAM_CATALOG';
    if (upper === 'ACCOMPLISHMENT_REPORT' || upper === 'GAD_ACCOMPLISHMENT') return 'GAD_ACCOMPLISHMENT';
    if (upper === 'HOUSEHOLD_SURVEY') return 'HOUSEHOLD_SURVEY';
    return 'BENEFICIARY_REGISTRY';
  }

  /**
   * Generates a pre-flight Dry-Run Preview matrix without writing any records to the database.
   */
  public static async generatePreview(params: {
    csvContent: string;
    filename?: string;
    datasetType?: string;
    confirmedMappings?: Record<string, string> | Array<{ sourceColumn: string; targetField: string }>;
    duplicateStrategy?: DuplicateStrategy;
    ingestionMode?: IngestionMode;
    targetOfficeId?: string | null;
    actorUser: ActorContext;
  }): Promise<IngestionPreviewResult> {
    const {
      csvContent,
      filename = 'dataset.csv',
      duplicateStrategy = 'SKIP',
      ingestionMode = 'TOLERANT',
      targetOfficeId,
      actorUser,
    } = params;

    const ref = await this.loadReferenceData();
    const { headers, rows } = CsvDiscoveryService.parseCsvLines(csvContent);

    if (rows.length === 0) {
      throw new ValidationError('CSV content is empty or contains no data rows.');
    }

    const discovery = CsvDiscoveryService.discoverSchema(csvContent, filename);
    const datasetType = this.normalizeDatasetType(params.datasetType || discovery.summary.datasetTypeGuess);
    const mappingMap = this.buildMappingMap(headers, params.confirmedMappings, discovery.schemaMapping);

    const officeResolution = this.resolveOffice(undefined, ref, actorUser, targetOfficeId);

    const allRows: IngestionPreviewRow[] = [];
    const allIssues: RowValidationIssue[] = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // Pre-fetch potential duplicates from DB or fallback
    const existingDuplicatesMap = await this.fetchExistingDuplicatesMap(datasetType, rows, headers, mappingMap, ref);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const rowNumber = rowIndex + 1;
      const rawValues = rows[rowIndex];
      const rawRow: Record<string, string> = {};
      const canonicalData: Record<string, any> = {};
      const rowIssues: RowValidationIssue[] = [];

      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const header = headers[colIdx];
        const val = rawValues[colIdx] !== undefined ? rawValues[colIdx] : '';
        rawRow[header] = val;
        canonicalData[header] = val;
        canonicalData[header.toLowerCase().trim()] = val;
        canonicalData[CsvDiscoveryService.normalizeHeader(header)] = val;
        const targetField = mappingMap.get(header.toLowerCase().trim());
        if (targetField) {
          canonicalData[targetField] = val;
        }
      }

      // Process and Validate Row based on Dataset Type
      let isDuplicate = false;
      let existingId: string | undefined;

      if (datasetType === 'BENEFICIARY_REGISTRY') {
        const result = this.processBeneficiaryRow(canonicalData, rowNumber, ref, actorUser, officeResolution.officeId);
        Object.assign(canonicalData, result.data);
        rowIssues.push(...result.issues);

        // Check Duplicates
        const dupKey = this.getBeneficiaryDuplicateKey(canonicalData);
        if (dupKey && existingDuplicatesMap.has(dupKey)) {
          isDuplicate = true;
          existingId = existingDuplicatesMap.get(dupKey);
          duplicateCount++;
          rowIssues.push({
            rowNumber,
            field: 'duplicate',
            value: dupKey,
            severity: 'WARNING',
            message: `Citizen record matches existing beneficiary in Barangay ${canonicalData.barangayName || ''}`,
          });
        }
      } else if (datasetType === 'PROGRAM_CATALOG') {
        const result = this.processProgramRow(canonicalData, rowNumber, ref, actorUser, officeResolution.officeId);
        Object.assign(canonicalData, result.data);
        rowIssues.push(...result.issues);
      } else if (datasetType === 'HOUSEHOLD_SURVEY') {
        const result = this.processHouseholdRow(canonicalData, rowNumber, ref);
        Object.assign(canonicalData, result.data);
        rowIssues.push(...result.issues);
      } else if (datasetType === 'GAD_ACCOMPLISHMENT') {
        const result = this.processAccomplishmentRow(canonicalData, rowNumber);
        Object.assign(canonicalData, result.data);
        rowIssues.push(...result.issues);
      }

      // Add office warning if encoder CSV conflicted
      if (officeResolution.warning) {
        rowIssues.push({
          rowNumber,
          field: 'officeId',
          value: officeResolution.officeName,
          severity: 'WARNING',
          message: officeResolution.warning,
        });
      }

      const hasError = rowIssues.some((i) => i.severity === 'ERROR');
      const hasWarning = rowIssues.some((i) => i.severity === 'WARNING');

      let status: 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE' = 'VALID';
      if (hasError) {
        status = 'ERROR';
        errorCount++;
      } else if (isDuplicate) {
        status = 'DUPLICATE';
      } else if (hasWarning) {
        status = 'WARNING';
        warningCount++;
      } else {
        validCount++;
      }

      allIssues.push(...rowIssues);
      allRows.push({
        rowNumber,
        status,
        canonicalData,
        rawRow,
        issues: rowIssues,
        isDuplicate,
        existingId,
      });
    }

    const canProceed = ingestionMode === 'STRICT' ? errorCount === 0 : (validCount > 0 || duplicateCount > 0);

    return {
      datasetType,
      totalRows: rows.length,
      validRows: validCount,
      warningRows: warningCount,
      errorRows: errorCount,
      duplicateRows: duplicateCount,
      duplicateStrategy,
      ingestionMode,
      targetOfficeId: officeResolution.officeId,
      targetOfficeName: officeResolution.officeName,
      canProceed,
      sampleRows: allRows.slice(0, 10),
      rowIssues: allIssues.slice(0, 100),
    };
  }

  /**
   * Executes the transaction batch ingestion into the database with audit logging.
   */
  public static async executeIngestion(
    params: {
      csvContent: string;
      filename?: string;
      datasetType?: string;
      confirmedMappings?: Record<string, string> | Array<{ sourceColumn: string; targetField: string }>;
      duplicateStrategy?: DuplicateStrategy;
      ingestionMode?: IngestionMode;
      targetOfficeId?: string | null;
      actorUser: ActorContext;
    },
    req?: Request
  ): Promise<IngestionSummaryResult> {
    const startTime = Date.now();
    const batchId = uuidv4();
    const {
      csvContent,
      filename = 'dataset.csv',
      duplicateStrategy = 'SKIP',
      ingestionMode = 'TOLERANT',
      actorUser,
    } = params;

    if (actorUser.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers have read-only access and cannot perform batch ingestion');
    }

    // 1. Run complete dry-run validation first
    const preview = await this.generatePreview(params);

    if (ingestionMode === 'STRICT' && preview.errorRows > 0) {
      throw new ValidationError(
        `Strict Ingestion aborted: ${preview.errorRows} row(s) contained validation errors. No records were written.`,
        preview.rowIssues.filter((i) => i.severity === 'ERROR')
      );
    }

    if (!preview.canProceed && preview.validRows === 0 && preview.duplicateRows === 0) {
      throw new ValidationError('Ingestion aborted: No valid records available to import.', preview.rowIssues);
    }

    const ref = await this.loadReferenceData();
    const { headers, rows } = CsvDiscoveryService.parseCsvLines(csvContent);
    const discovery = CsvDiscoveryService.discoverSchema(csvContent, filename);
    const mappingMap = this.buildMappingMap(headers, params.confirmedMappings, discovery.schemaMapping);
    const officeResolution = this.resolveOffice(undefined, ref, actorUser, params.targetOfficeId);

    const CHUNK_SIZE = 250;
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: RowValidationIssue[] = [];
    const warnings: RowValidationIssue[] = [];

    // 2. Process rows in chunks
    for (let chunkStart = 0; chunkStart < rows.length; chunkStart += CHUNK_SIZE) {
      const chunkRows = rows.slice(chunkStart, chunkStart + CHUNK_SIZE);

      if (isDatabaseConnected()) {
        await prisma.$transaction(async (tx) => {
          for (let i = 0; i < chunkRows.length; i++) {
            const rowIndex = chunkStart + i;
            const rowNumber = rowIndex + 1;
            const rawValues = chunkRows[i];

            const canonicalData: Record<string, any> = {};
            for (let colIdx = 0; colIdx < headers.length; colIdx++) {
              const header = headers[colIdx];
              const val = rawValues[colIdx] !== undefined ? rawValues[colIdx] : '';
              canonicalData[header] = val;
              canonicalData[header.toLowerCase().trim()] = val;
              canonicalData[CsvDiscoveryService.normalizeHeader(header)] = val;
              const targetField = mappingMap.get(header.toLowerCase().trim());
              if (targetField) {
                canonicalData[targetField] = val;
              }
            }

            try {
              if (preview.datasetType === 'BENEFICIARY_REGISTRY') {
                const res = this.processBeneficiaryRow(canonicalData, rowNumber, ref, actorUser, officeResolution.officeId);
                if (res.issues.some((iss) => iss.severity === 'ERROR')) {
                  errors.push(...res.issues.filter((iss) => iss.severity === 'ERROR'));
                  errorCount++;
                  if (ingestionMode === 'STRICT') throw new Error(`Row ${rowNumber} failed validation`);
                  continue;
                }
                warnings.push(...res.issues.filter((iss) => iss.severity === 'WARNING'));

                // Deduplication check
                const existing = await tx.beneficiary.findFirst({
                  where: {
                    firstName: { equals: res.data.firstName, mode: 'insensitive' },
                    lastName: { equals: res.data.lastName, mode: 'insensitive' },
                    barangayId: res.data.barangayId,
                    isArchived: false,
                  },
                });

                if (existing) {
                  if (duplicateStrategy === 'SKIP') {
                    skippedCount++;
                  } else if (duplicateStrategy === 'UPDATE') {
                    await tx.beneficiary.update({
                      where: { id: existing.id },
                      data: {
                        age: res.data.age,
                        birthdate: res.data.birthdate,
                        sector: res.data.sector,
                        contactNumber: res.data.contactNumber || existing.contactNumber,
                        addressStreet: res.data.addressStreet || existing.addressStreet,
                        householdId: res.data.householdId || existing.householdId,
                      },
                    });
                    updatedCount++;
                  } else if (duplicateStrategy === 'APPEND') {
                    await tx.beneficiary.create({
                      data: {
                        firstName: res.data.firstName,
                        lastName: res.data.lastName,
                        middleName: res.data.middleName,
                        sex: res.data.sex,
                        age: res.data.age,
                        birthdate: res.data.birthdate,
                        sector: res.data.sector,
                        barangayId: res.data.barangayId,
                        officeId: res.data.officeId,
                        contactNumber: res.data.contactNumber,
                        addressStreet: res.data.addressStreet,
                        householdId: res.data.householdId,
                        encodedById: actorUser.id,
                      },
                    });
                    insertedCount++;
                  }
                } else {
                  await tx.beneficiary.create({
                    data: {
                      firstName: res.data.firstName,
                      lastName: res.data.lastName,
                      middleName: res.data.middleName,
                      sex: res.data.sex,
                      age: res.data.age,
                      birthdate: res.data.birthdate,
                      sector: res.data.sector,
                      barangayId: res.data.barangayId,
                      officeId: res.data.officeId,
                      contactNumber: res.data.contactNumber,
                      addressStreet: res.data.addressStreet,
                      householdId: res.data.householdId,
                      encodedById: actorUser.id,
                    },
                  });
                  insertedCount++;
                }
              } else if (preview.datasetType === 'PROGRAM_CATALOG') {
                const res = this.processProgramRow(canonicalData, rowNumber, ref, actorUser, officeResolution.officeId);
                if (res.issues.some((iss) => iss.severity === 'ERROR')) {
                  errors.push(...res.issues.filter((iss) => iss.severity === 'ERROR'));
                  errorCount++;
                  if (ingestionMode === 'STRICT') throw new Error(`Row ${rowNumber} failed validation`);
                  continue;
                }
                warnings.push(...res.issues.filter((iss) => iss.severity === 'WARNING'));

                await tx.program.create({
                  data: {
                    title: res.data.title,
                    description: res.data.description,
                    sector: res.data.sector,
                    fiscalYear: res.data.fiscalYear,
                    status: res.data.status || ProgramStatus.ACTIVE,
                    budgetTarget: res.data.budgetTarget,
                    targetMale: res.data.targetMale,
                    targetFemale: res.data.targetFemale,
                    officeId: res.data.officeId,
                    createdById: actorUser.id,
                  },
                });
                insertedCount++;
              } else if (preview.datasetType === 'HOUSEHOLD_SURVEY') {
                const res = this.processHouseholdRow(canonicalData, rowNumber, ref);
                if (res.issues.some((iss) => iss.severity === 'ERROR')) {
                  errors.push(...res.issues.filter((iss) => iss.severity === 'ERROR'));
                  errorCount++;
                  if (ingestionMode === 'STRICT') throw new Error(`Row ${rowNumber} failed validation`);
                  continue;
                }

                await tx.household.upsert({
                  where: { householdNo: res.data.householdNo },
                  update: {
                    purok: res.data.purok,
                    is4Ps: res.data.is4Ps,
                    isIndigent: res.data.isIndigent,
                    headName: res.data.headName,
                  },
                  create: {
                    householdNo: res.data.householdNo,
                    barangayId: res.data.barangayId,
                    purok: res.data.purok,
                    is4Ps: res.data.is4Ps,
                    isIndigent: res.data.isIndigent,
                    headName: res.data.headName,
                  },
                });
                insertedCount++;
              } else if (preview.datasetType === 'GAD_ACCOMPLISHMENT') {
                const res = this.processAccomplishmentRow(canonicalData, rowNumber);
                if (res.issues.some((iss) => iss.severity === 'ERROR')) {
                  errors.push(...res.issues.filter((iss) => iss.severity === 'ERROR'));
                  errorCount++;
                  if (ingestionMode === 'STRICT') throw new Error(`Row ${rowNumber} failed validation`);
                  continue;
                }

                await tx.gADAccomplishment.create({
                  data: {
                    fiscalYear: res.data.fiscalYear,
                    quarter: res.data.quarter,
                    actualOutput: res.data.actualOutput,
                    actualMale: res.data.actualMale,
                    actualFemale: res.data.actualFemale,
                    actualBudgetUsed: res.data.actualBudgetUsed,
                    outputSummary: res.data.outputSummary,
                    remarks: res.data.remarks,
                    varianceExplanation: res.data.varianceExplanation,
                    programId: res.data.programId,
                    gadPlanItemId: res.data.gadPlanItemId,
                    createdById: actorUser.id,
                  },
                });
                insertedCount++;
              }
            } catch (err: any) {
              if (ingestionMode === 'STRICT') throw err;
              errorCount++;
              errors.push({
                rowNumber,
                field: 'database',
                value: null,
                severity: 'ERROR',
                message: err.message || 'Database write failed',
              });
            }
          }
          // Outside row-level tolerant handling: audit failure must abort this chunk.
          await AuditService.logActionTx(tx, {
            userId: actorUser.id,
            action: 'BATCH_CSV_INGESTION',
            entityType: preview.datasetType,
            entityId: batchId,
            afterState: {
              batchId, chunkStart, chunkRows: chunkRows.length,
              datasetType: preview.datasetType, duplicateStrategy, ingestionMode,
              targetOfficeId: officeResolution.officeId,
              insertedCount, updatedCount, skippedCount, errorCount,
            },
            req,
          });
        });
      } else {
        // Fallback in-memory processing
        for (let i = 0; i < chunkRows.length; i++) {
          const rowIndex = chunkStart + i;
          const rowNumber = rowIndex + 1;
          const rawValues = chunkRows[i];

          const canonicalData: Record<string, any> = {};
          for (let colIdx = 0; colIdx < headers.length; colIdx++) {
            const header = headers[colIdx];
            const val = rawValues[colIdx] !== undefined ? rawValues[colIdx] : '';
            canonicalData[header] = val;
            canonicalData[header.toLowerCase().trim()] = val;
            canonicalData[CsvDiscoveryService.normalizeHeader(header)] = val;
            const targetField = mappingMap.get(header.toLowerCase().trim());
            if (targetField) {
              canonicalData[targetField] = val;
            }
          }

          if (preview.datasetType === 'BENEFICIARY_REGISTRY') {
            const res = this.processBeneficiaryRow(canonicalData, rowNumber, ref, actorUser, officeResolution.officeId);
            if (res.issues.some((iss) => iss.severity === 'ERROR')) {
              errors.push(...res.issues.filter((iss) => iss.severity === 'ERROR'));
              errorCount++;
              continue;
            }
            const existingIdx = MEMORY_BENEFICIARIES.findIndex(
              (b) =>
                b.firstName?.toLowerCase() === res.data.firstName.toLowerCase() &&
                b.lastName?.toLowerCase() === res.data.lastName.toLowerCase() &&
                b.barangayId === res.data.barangayId
            );

            if (existingIdx >= 0) {
              if (duplicateStrategy === 'SKIP') {
                skippedCount++;
              } else if (duplicateStrategy === 'UPDATE') {
                MEMORY_BENEFICIARIES[existingIdx] = {
                  ...MEMORY_BENEFICIARIES[existingIdx],
                  ...res.data,
                  updatedAt: new Date(),
                };
                updatedCount++;
              } else if (duplicateStrategy === 'APPEND') {
                const newRecord = {
                  id: `ben-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                  ...res.data,
                  barangay: ref.barangays.byId.get(res.data.barangayId)?.name || 'Poblacion',
                  office: ref.offices.byId.get(res.data.officeId)?.code || 'MSWDO',
                  encodedById: actorUser.id,
                  isArchived: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                MEMORY_BENEFICIARIES.unshift(newRecord);
                MEMORY_INGESTED_BENEFICIARIES.push(newRecord);
                insertedCount++;
              }
            } else {
              const newRecord = {
                id: `ben-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                ...res.data,
                barangay: ref.barangays.byId.get(res.data.barangayId)?.name || 'Poblacion',
                office: ref.offices.byId.get(res.data.officeId)?.code || 'MSWDO',
                encodedById: actorUser.id,
                isArchived: false,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              MEMORY_BENEFICIARIES.unshift(newRecord);
              MEMORY_INGESTED_BENEFICIARIES.push(newRecord);
              insertedCount++;
            }
          } else if (preview.datasetType === 'PROGRAM_CATALOG') {
            const res = this.processProgramRow(canonicalData, rowNumber, ref, actorUser, officeResolution.officeId);
            if (res.issues.some((iss) => iss.severity === 'ERROR')) {
              errors.push(...res.issues.filter((iss) => iss.severity === 'ERROR'));
              errorCount++;
              continue;
            }
            const newProg = {
              id: `prog-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              ...res.data,
              office: ref.offices.byId.get(res.data.officeId)?.code || 'MSWDO',
              status: res.data.status || 'ACTIVE',
              createdById: actorUser.id,
              createdAt: new Date(),
            };
            MEMORY_PROGRAMS.unshift(newProg);
            MEMORY_INGESTED_PROGRAMS.push(newProg);
            insertedCount++;
          } else if (preview.datasetType === 'HOUSEHOLD_SURVEY') {
            const res = this.processHouseholdRow(canonicalData, rowNumber, ref);
            if (res.issues.some((iss) => iss.severity === 'ERROR')) {
              errors.push(...res.issues.filter((iss) => iss.severity === 'ERROR'));
              errorCount++;
              continue;
            }
            const existingHhIdx = MEMORY_HOUSEHOLDS.findIndex((h) => h.householdNo === res.data.householdNo);
            if (existingHhIdx >= 0) {
              MEMORY_HOUSEHOLDS[existingHhIdx] = { ...MEMORY_HOUSEHOLDS[existingHhIdx], ...res.data };
            } else {
              MEMORY_HOUSEHOLDS.push({ id: `hh-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, ...res.data });
            }
            insertedCount++;
          } else if (preview.datasetType === 'GAD_ACCOMPLISHMENT') {
            const res = this.processAccomplishmentRow(canonicalData, rowNumber);
            if (res.issues.some((iss) => iss.severity === 'ERROR')) {
              errors.push(...res.issues.filter((iss) => iss.severity === 'ERROR'));
              errorCount++;
              continue;
            }
            insertedCount++;
          }
        }
      }
    }

    const processingTimeMs = Date.now() - startTime;

    // 3. Centralized Audit Log with Zero Citizen PII
    if (!isDatabaseConnected()) await AuditService.logAction({
      userId: actorUser.id,
      action: 'BATCH_CSV_INGESTION',
      entityType: preview.datasetType,
      entityId: batchId,
      beforeState: {
        batchId,
        filename,
        totalRows: rows.length,
        datasetType: preview.datasetType,
        duplicateStrategy,
        ingestionMode,
        targetOfficeId: officeResolution.officeId,
      },
      afterState: {
        batchId,
        insertedCount,
        updatedCount,
        skippedCount,
        errorCount,
        processingTimeMs,
        success: insertedCount > 0 || updatedCount > 0 || skippedCount > 0,
      },
      req,
    });

    return {
      batchId,
      datasetType: preview.datasetType,
      filename,
      duplicateStrategy,
      ingestionMode,
      totalRows: rows.length,
      insertedCount,
      updatedCount,
      skippedCount,
      errorCount,
      processingTimeMs,
      errors,
      warnings,
      success: insertedCount > 0 || updatedCount > 0 || skippedCount > 0,
    };
  }

  // ---------------------------------------------------------------------------
  // ROW PROCESSORS & NORMALIZERS
  // ---------------------------------------------------------------------------

  private static processBeneficiaryRow(
    raw: Record<string, any>,
    rowNumber: number,
    ref: ReferenceCache,
    actor: ActorContext,
    enforcedOfficeId: string
  ): { data: Record<string, any>; issues: RowValidationIssue[] } {
    const issues: RowValidationIssue[] = [];

    // 1. Names
    let firstName = this.normalizeString(raw.firstName || raw.first_name || raw.fname);
    let lastName = this.normalizeString(raw.lastName || raw.last_name || raw.lname || raw.surname);
    let middleName = this.normalizeString(raw.middleName || raw.middle_name || raw.mname) || null;

    if ((!firstName || !lastName) && (raw.fullName || raw.full_name || raw.name)) {
      const split = this.splitFullName(raw.fullName || raw.full_name || raw.name);
      firstName = firstName || split.firstName;
      lastName = lastName || split.lastName;
      middleName = middleName || split.middleName;
    }

    if (!firstName) {
      issues.push({ rowNumber, field: 'firstName', value: firstName, severity: 'ERROR', message: 'First name is required' });
    }
    if (!lastName) {
      issues.push({ rowNumber, field: 'lastName', value: lastName, severity: 'ERROR', message: 'Last name is required' });
    }

    // 2. Sex
    const sexResult = this.normalizeSex(raw.sex || raw.gender || raw.kasarian);
    if (sexResult.error || !sexResult.value) {
      issues.push({ rowNumber, field: 'sex', value: raw.sex || raw.gender, severity: 'ERROR', message: sexResult.error || 'Sex is required' });
    }

    // 3. Age & Birthdate
    const ageResult = this.normalizeAgeAndBirthdate(raw.age || raw.edad, raw.birthdate || raw.birth_date || raw.dob);
    if (ageResult.error || ageResult.age === null) {
      issues.push({ rowNumber, field: 'age', value: raw.age, severity: 'ERROR', message: ageResult.error || 'Valid age or birthdate is required' });
    }
    if (ageResult.warning) {
      issues.push({ rowNumber, field: 'age', value: raw.age, severity: 'WARNING', message: ageResult.warning });
    }

    // 4. Sector
    let sector = this.normalizeString(raw.sector || raw.vulnerability_sector || raw.category || raw.sektor);
    if (!sector) {
      sector = 'GENERAL';
    }

    // 5. Barangay Resolution
    const brgyResult = this.resolveBarangay(raw.barangayId || raw.barangay || raw.barangayCode || raw.brgy, ref);
    if (brgyResult.error || !brgyResult.match) {
      issues.push({
        rowNumber,
        field: 'barangay',
        value: raw.barangay || raw.brgy,
        severity: 'ERROR',
        message: brgyResult.error || 'Valid Talibon Barangay is required',
      });
    }

    // 6. Optional Contact & Address
    const contactNumber = this.normalizeString(raw.contactNumber || raw.contact_number || raw.phone || raw.mobile) || null;
    const addressStreet = this.normalizeString(raw.addressStreet || raw.address_street || raw.address || raw.purok || raw.sitio) || null;
    const householdId = this.normalizeString(raw.householdId || raw.household_id) || null;

    return {
      data: {
        firstName,
        lastName,
        middleName,
        sex: sexResult.value,
        age: ageResult.age,
        birthdate: ageResult.birthdate,
        sector,
        barangayId: brgyResult.match?.id || '',
        barangayName: brgyResult.match?.name || '',
        officeId: enforcedOfficeId,
        contactNumber,
        addressStreet,
        householdId,
      },
      issues,
    };
  }

  private static processProgramRow(
    raw: Record<string, any>,
    rowNumber: number,
    ref: ReferenceCache,
    actor: ActorContext,
    enforcedOfficeId: string
  ): { data: Record<string, any>; issues: RowValidationIssue[] } {
    const issues: RowValidationIssue[] = [];

    const title = this.normalizeString(raw.title || raw.program_title || raw.name);
    if (!title || title.length < 3) {
      issues.push({ rowNumber, field: 'title', value: title, severity: 'ERROR', message: 'Program title must be at least 3 characters' });
    }

    const sector = this.normalizeString(raw.sector || raw.category) || 'General GAD';
    const description = this.normalizeString(raw.description) || null;

    let fiscalYear = parseInt(String(raw.fiscalYear || raw.fiscal_year || raw.year || new Date().getFullYear()), 10);
    if (isNaN(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2100) {
      issues.push({ rowNumber, field: 'fiscalYear', value: raw.fiscalYear, severity: 'ERROR', message: 'Fiscal year must be between 2000 and 2100' });
      fiscalYear = new Date().getFullYear();
    }

    const budgetResult = this.normalizeCurrency(raw.budgetTarget || raw.budget_target || raw.budget);
    if (budgetResult.error) {
      issues.push({ rowNumber, field: 'budgetTarget', value: raw.budgetTarget, severity: 'ERROR', message: budgetResult.error });
    }

    const targetMale = parseInt(String(raw.targetMale || raw.target_male || 0), 10) || 0;
    const targetFemale = parseInt(String(raw.targetFemale || raw.target_female || 0), 10) || 0;

    let status: ProgramStatus = ProgramStatus.ACTIVE;
    if (raw.status) {
      const s = String(raw.status).toUpperCase().trim();
      if (['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(s)) {
        status = s as ProgramStatus;
      }
    }

    return {
      data: {
        title,
        description,
        sector,
        fiscalYear,
        budgetTarget: budgetResult.value,
        targetMale,
        targetFemale,
        status,
        officeId: enforcedOfficeId,
      },
      issues,
    };
  }

  private static processHouseholdRow(
    raw: Record<string, any>,
    rowNumber: number,
    ref: ReferenceCache
  ): { data: Record<string, any>; issues: RowValidationIssue[] } {
    const issues: RowValidationIssue[] = [];

    const householdNo = this.normalizeString(raw.householdNo || raw.household_no || raw.household_number || raw.householdnumber || raw.household_id || raw.hh_no || raw.hh_id || raw.id);
    if (!householdNo) {
      issues.push({ rowNumber, field: 'householdNo', value: householdNo, severity: 'ERROR', message: 'Household Number is required' });
    }

    const brgyResult = this.resolveBarangay(raw.barangayId || raw.barangay || raw.barangayCode || raw.brgy, ref);
    if (brgyResult.error || !brgyResult.match) {
      issues.push({ rowNumber, field: 'barangay', value: raw.barangay, severity: 'ERROR', message: brgyResult.error || 'Valid Barangay is required' });
    }

    const purok = this.normalizeString(raw.purok || raw.sitio) || null;
    const is4Ps = this.normalizeBoolean(raw.is4Ps ?? raw.is_4ps ?? raw['4ps']);
    const isIndigent = this.normalizeBoolean(raw.isIndigent ?? raw.is_indigent ?? raw.indigent);
    let headName = this.normalizeString(raw.headName || raw.head_name || raw.household_head) || null;
    if (!headName && (raw.head_first_name || raw.head_last_name)) {
      headName = `${this.normalizeString(raw.head_first_name)} ${this.normalizeString(raw.head_last_name)}`.trim() || null;
    }

    return {
      data: {
        householdNo,
        barangayId: brgyResult.match?.id || '',
        purok,
        is4Ps,
        isIndigent,
        headName,
      },
      issues,
    };
  }

  private static processAccomplishmentRow(
    raw: Record<string, any>,
    rowNumber: number
  ): { data: Record<string, any>; issues: RowValidationIssue[] } {
    const issues: RowValidationIssue[] = [];

    let fiscalYear = parseInt(String(raw.fiscalYear || raw.fiscal_year || raw.year || new Date().getFullYear()), 10);
    if (isNaN(fiscalYear) || fiscalYear < 2000 || fiscalYear > 2100) {
      issues.push({ rowNumber, field: 'fiscalYear', value: raw.fiscalYear, severity: 'ERROR', message: 'Fiscal year must be between 2000 and 2100' });
      fiscalYear = new Date().getFullYear();
    }

    let quarter: number | null = null;
    if (raw.quarter !== undefined && raw.quarter !== null && String(raw.quarter).trim().length > 0) {
      const q = parseInt(String(raw.quarter).trim(), 10);
      if (q >= 1 && q <= 4) {
        quarter = q;
      } else {
        issues.push({ rowNumber, field: 'quarter', value: raw.quarter, severity: 'ERROR', message: 'Quarter must be an integer between 1 and 4' });
      }
    }

    const actualOutput = this.normalizeString(raw.actualOutput || raw.actual_output || raw.output || raw.activity);
    if (!actualOutput) {
      issues.push({ rowNumber, field: 'actualOutput', value: actualOutput, severity: 'ERROR', message: 'Actual output is required' });
    }

    const budgetResult = this.normalizeCurrency(raw.actualBudgetUsed || raw.actual_budget_used || raw.budget_used);
    if (budgetResult.error) {
      issues.push({ rowNumber, field: 'actualBudgetUsed', value: raw.actualBudgetUsed, severity: 'ERROR', message: budgetResult.error });
    }

    const actualMale = parseInt(String(raw.actualMale || raw.actual_male || raw.male_beneficiaries || 0), 10) || 0;
    const actualFemale = parseInt(String(raw.actualFemale || raw.actual_female || raw.female_beneficiaries || 0), 10) || 0;

    const programId = this.normalizeString(raw.programId || raw.program_id) || null;
    const gadPlanItemId = this.normalizeString(raw.gadPlanItemId || raw.gad_plan_item_id) || null;
    const outputSummary = this.normalizeString(raw.outputSummary || raw.output_summary) || null;
    const remarks = this.normalizeString(raw.remarks || raw.notes) || null;
    const varianceExplanation = this.normalizeString(raw.varianceExplanation || raw.variance_explanation) || null;

    return {
      data: {
        fiscalYear,
        quarter,
        actualOutput,
        actualBudgetUsed: budgetResult.value,
        actualMale,
        actualFemale,
        programId,
        gadPlanItemId,
        outputSummary,
        remarks,
        varianceExplanation,
      },
      issues,
    };
  }

  // ---------------------------------------------------------------------------
  // DUPLICATE MATCHING UTILITIES
  // ---------------------------------------------------------------------------

  private static getBeneficiaryDuplicateKey(data: Record<string, any>): string | null {
    if (!data.firstName || !data.lastName || !data.barangayId) return null;
    const fn = data.firstName.toLowerCase().trim();
    const ln = data.lastName.toLowerCase().trim();
    const brgy = data.barangayId;
    const bday = data.birthdate ? new Date(data.birthdate).toISOString().slice(0, 10) : `age-${data.age || 0}`;
    return `${fn}|${ln}|${brgy}|${bday}`;
  }

  private static async fetchExistingDuplicatesMap(
    datasetType: IngestionDatasetType,
    rows: string[][],
    headers: string[],
    mappingMap: Map<string, string>,
    ref: ReferenceCache
  ): Promise<Map<string, string>> {
    const dupMap = new Map<string, string>();

    if (datasetType === 'BENEFICIARY_REGISTRY') {
      if (isDatabaseConnected()) {
        try {
          const beneficiaries = await prisma.beneficiary.findMany({
            where: { isArchived: false },
            select: { id: true, firstName: true, lastName: true, barangayId: true, birthdate: true, age: true },
          });
          for (const b of beneficiaries) {
            const fn = b.firstName.toLowerCase().trim();
            const ln = b.lastName.toLowerCase().trim();
            const bday = b.birthdate ? b.birthdate.toISOString().slice(0, 10) : `age-${b.age || 0}`;
            dupMap.set(`${fn}|${ln}|${b.barangayId}|${bday}`, b.id);
            // Fallback key without birthdate
            dupMap.set(`${fn}|${ln}|${b.barangayId}`, b.id);
          }
        } catch {
          // Fallback to memory store if query fails
        }
      }

      // Memory beneficiaries check
      for (const b of [...MEMORY_BENEFICIARIES, ...MEMORY_INGESTED_BENEFICIARIES]) {
        if (b.firstName && b.lastName && b.barangayId) {
          const fn = b.firstName.toLowerCase().trim();
          const ln = b.lastName.toLowerCase().trim();
          const bday = b.birthdate ? new Date(b.birthdate).toISOString().slice(0, 10) : `age-${b.age || 0}`;
          dupMap.set(`${fn}|${ln}|${b.barangayId}|${bday}`, b.id);
          dupMap.set(`${fn}|${ln}|${b.barangayId}`, b.id);
        }
      }
    }

    return dupMap;
  }
}
