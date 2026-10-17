import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import type { PrismaClient, Prisma } from '@prisma/client';
import type { Request } from 'express';
import prisma from '../lib/prisma';
import { AppError, ConflictError, ForbiddenError, ValidationError } from '../lib/errors';
import { parseCsv } from '../lib/csvParser';
import { AuditService } from './AuditService';

export const COLUMNS = ['barangay_code', 'period', 'male', 'female', 'source_reference'];
const MAX_ROWS = 1000;
const secret = randomBytes(32); // Restart invalidates previews; never persists draft contents.
const count = z.union([z.number(), z.string().regex(/^\d+$/, 'Use a nonnegative whole number')])
  .transform(Number).pipe(z.number().int().min(0).max(2147483647));
const rowSchema = z.object({
  barangay_code: z.string().trim().min(1).max(50),
  period: z.string().trim().regex(/^\d{4}(?:-(?:Q[1-4]|0[1-9]|1[0-2]))?$/, 'Use YYYY, YYYY-Q1 to Q4, or YYYY-MM'),
  male: count, female: count,
  source_reference: z.string().trim().min(1).max(1000),
}).strict();
export type EntryRow = z.infer<typeof rowSchema>;
const seriesSchema = z.object({
  code: z.string().trim().regex(/^[A-Z0-9][A-Z0-9_-]{1,79}$/),
  name: z.string().trim().min(1).max(200),
  sourceReference: z.string().trim().min(1).max(1000),
}).strict();
type Db = PrismaClient | Prisma.TransactionClient;
type Actor = { id: string; role: string; officeId: string; barangayId: string | null };
type RowResult = { rowNumber: number; input: unknown; row?: EntryRow; barangayId?: string; errors: string[] };

export function validateEntryRows(input: unknown): RowResult[] {
  if (!Array.isArray(input) || !input.length || input.length > MAX_ROWS) throw new ValidationError('Provide 1–1000 rows.');
  const seen = new Map<string, number>();
  const results: RowResult[] = input.map((raw, index) => {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) return { rowNumber: index + 1, input: raw, errors: parsed.error.issues.map(e => e.path.join('.') + ': ' + e.message) };
    return { rowNumber: index + 1, input: raw, row: parsed.data, errors: [] };
  });
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.row) continue;
    const key = JSON.stringify([r.row.barangay_code, r.row.period]);
    const previous = seen.get(key);
    if (previous !== undefined) {
      r.errors.push('Duplicate barangay and period in this input.');
      results[previous].errors.push('Duplicate barangay and period in this input.');
    } else seen.set(key, i);
  }
  return results;
}

export async function parseEntryFile(file: { originalname: string; buffer: Buffer }) {
  if (file.buffer.length > 2 * 1024 * 1024) throw new ValidationError('File exceeds 2 MB.');
  const extension = file.originalname.toLowerCase().split('.').pop();
  let headers: string[] = [], rows: unknown[][] = [], rowNumbers: number[] = [];
  if (extension === 'csv') {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
    const parsed = parseCsv(text, { headerRow: 1, headerRowCount: 1 });
    headers = parsed.headers; rows = parsed.rows; rowNumbers = parsed.rowNumbers;
  } else if (extension === 'xlsx') {
    if (file.buffer[0] !== 0x50 || file.buffer[1] !== 0x4b) throw new ValidationError('Invalid XLSX file.');
    validateXlsxArchive(file.buffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    if (workbook.worksheets.length !== 1) throw new ValidationError('Use exactly one worksheet.');
    for (const sheet of workbook.worksheets) {
      if (sheet.rowCount > MAX_ROWS + 1) throw new ValidationError('Worksheet exceeds 1000 data rows.');
      sheet.eachRow({ includeEmpty: true }, row => {
        if (row.number > MAX_ROWS + 1 || row.cellCount > COLUMNS.length) throw new ValidationError('Worksheet exceeds 1000 rows or 5 columns.');
        const cells = COLUMNS.map((_, i) => row.getCell(i + 1).value ?? '');
        if (cells.some(c => typeof c !== 'string' && typeof c !== 'number')) throw new ValidationError('Formulas, dates and rich-text cells are not supported. Use plain values.');
        if (cells.some(c => String(c).length > 1000)) throw new ValidationError('Cell exceeds 1000 characters.');
        if (row.number === 1) headers = cells.map(String);
        else { rows.push(cells); rowNumbers.push(row.number); }
      });
    }
  } else throw new ValidationError('Upload a .csv or .xlsx file.');
  if (headers.length !== COLUMNS.length || headers.some((h, i) => h !== COLUMNS[i])) {
    throw new ValidationError('Columns must match the template, in order: ' + COLUMNS.join(', '));
  }
  if (!rows.length || rows.length > MAX_ROWS) throw new ValidationError('Provide 1–1000 data rows.');
  return { rows: rows.map(values => Object.fromEntries(COLUMNS.map((c, i) => [c, values[i] ?? '']))), rowNumbers };
}

// Bound decompression before ExcelJS caches shared strings. Reject ZIP64 and
// archives whose central-directory sizes exceed this small intake budget.
export function validateXlsxArchive(buffer: Buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new ValidationError('Invalid XLSX ZIP directory.');
  const entries = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16), total = 0;
  if (entries > 100 || buffer.readUInt16LE(end + 4) !== 0) throw new ValidationError('Unsupported XLSX archive.');
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50) throw new ValidationError('Invalid XLSX ZIP entry.');
    total += buffer.readUInt32LE(offset + 24);
    if (total > 10 * 1024 * 1024) throw new ValidationError('Expanded workbook exceeds 10 MB.');
    const local = buffer.readUInt32LE(offset + 42);
    const size = buffer.readUInt32LE(offset + 20);
    const method = buffer.readUInt16LE(offset + 10);
    if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== 0x04034b50 || (buffer.readUInt16LE(offset + 8) & 1)) throw new ValidationError('Invalid or encrypted XLSX entry.');
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    if (start + size > end || ![0, 8].includes(method)) throw new ValidationError('Unsupported XLSX compression.');
    const bytes = buffer.subarray(start, start + size);
    const actual = method === 0 ? bytes : inflateRawSync(bytes, { maxOutputLength: Math.max(1, buffer.readUInt32LE(offset + 24)) });
    if (actual.length !== buffer.readUInt32LE(offset + 24)) throw new ValidationError('XLSX entry size mismatch.');
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
}

function sign(value: unknown) { return createHmac('sha256', secret).update(JSON.stringify(value)).digest('hex'); }
function tokenPayload(actorId: string, seriesId: string, rows: unknown, sourceFileName: string | null, expires: number) {
  return { actorId, seriesId, rows, sourceFileName, expires };
}

export class ProvisionalGadService {
  constructor(private db: PrismaClient = prisma) {}
  private async actor(db: Db, actorId: string, write = false): Promise<Actor> {
    const user = await db.user.findUnique({ where: { id: actorId }, include: { office: true } });
    if (!user?.isActive || !user.officeId || !user.office?.isActive) throw new ForbiddenError('An active account with an explicit active owning office is required.');
    if (!['SUPER_ADMIN', 'ADMIN', 'ENCODER', 'VIEWER'].includes(user.role) || (write && user.role === 'VIEWER')) throw new ForbiddenError('Your role cannot perform this action.');
    return { id: user.id, officeId: user.officeId, role: user.role, barangayId: user.barangayId };
  }
  private references(db: Db, actor: Actor) {
    return db.provisionalGadReference.findMany({
      where: { isActive: true, ...(process.env.NODE_ENV === 'test' ? {} : { isSynthetic: false }), ...(actor.barangayId ? { barangayId: actor.barangayId } : {}) },
      include: { barangay: { select: { id: true, code: true, name: true } } }, orderBy: { barangay: { name: 'asc' } },
    });
  }
  private async series(db: Db, id: string, actor: Actor) {
    if (!z.string().uuid().safeParse(id).success) throw new ValidationError('Select a valid source series.');
    const series = await db.provisionalGadSeries.findUnique({ where: { id } });
    if (!series || series.owningOfficeId !== actor.officeId) throw new ForbiddenError('Source series is unavailable in your owning office.');
    return series;
  }
  async context(actorId: string) {
    const actor = await this.actor(this.db, actorId);
    const [series, references] = await Promise.all([
      this.db.provisionalGadSeries.findMany({ where: { owningOfficeId: actor.officeId }, orderBy: { name: 'asc' } }),
      this.references(this.db, actor),
    ]);
    return { series, references, canWrite: actor.role !== 'VIEWER', owningOfficeId: actor.officeId };
  }
  async createSeries(actorId: string, input: unknown, req?: Request) {
    const parsed = seriesSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Provide a unique uppercase series code (2–80 characters), name, and source reference.');
    return this.db.$transaction(async tx => {
      const actor = await this.actor(tx, actorId, true);
      const record = await tx.provisionalGadSeries.create({ data: { ...parsed.data, owningOfficeId: actor.officeId, creatorId: actor.id } });
      await AuditService.logActionTx(tx, { userId: actor.id, action: 'PROVISIONAL_GAD_SERIES_CREATED', entityType: 'ProvisionalGadSeries', entityId: record.id, afterState: record, req });
      return record;
    });
  }
  private async validate(db: Db, actor: Actor, seriesId: string, input: unknown) {
    await this.series(db, seriesId, actor);
    const results = validateEntryRows(input);
    const references = await this.references(db, actor);
    const existing = await db.provisionalGadEntry.findMany({
      where: { seriesId, OR: results.filter(r => r.row).map(r => ({ period: r.row!.period, barangay: { code: r.row!.barangay_code } })) },
      select: { barangayId: true, period: true },
    });
    for (const result of results) {
      if (!result.row) continue;
      const ref = references.find(r => r.barangay.code === result.row!.barangay_code);
      if (!ref) result.errors.push('Barangay has no active roster evidence in your authorized scope.');
      else {
        result.barangayId = ref.barangayId;
        if (existing.some(e => e.barangayId === ref.barangayId && e.period === result.row!.period)) result.errors.push('A persisted entry already exists. Overwriting is not allowed.');
      }
    }
    return results;
  }
  async preview(actorId: string, seriesId: string, input: unknown, sourceFileName: string | null = null) {
    const actor = await this.actor(this.db, actorId, true);
    const results = await this.validate(this.db, actor, seriesId, input);
    const rows = results.map(r => r.row ?? r.input);
    const expires = Date.now() + 15 * 60 * 1000;
    const valid = results.every(r => !r.errors.length);
    return { results, rows, sourceFileName, confirmationToken: valid ? expires + '.' + sign(tokenPayload(actorId, seriesId, rows, sourceFileName, expires)) : null };
  }
  async commit(actorId: string, input: any, req?: Request) {
    if (input?.confirmed !== true || typeof input?.confirmationToken !== 'string') throw new ValidationError('Preview and explicitly confirm the records before saving.');
    const { seriesId, rows, sourceFileName = null } = input;
    const [expiry, signature] = input.confirmationToken.split('.');
    const expires = Number(expiry);
    const expected = sign(tokenPayload(actorId, seriesId, rows, sourceFileName, expires));
    if (!Number.isFinite(expires) || expires < Date.now() || !/^[0-9a-f]{64}$/.test(signature || '') || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new ValidationError('Preview expired or changed. Preview again before saving.');
    return this.db.$transaction(async tx => {
      const actor = await this.actor(tx, actorId, true);
      const results = await this.validate(tx, actor, seriesId, rows);
      if (results.some(r => r.errors.length)) throw new ConflictError('Records changed or contain errors. Preview again.', results);
      const batchId = randomUUID();
      for (const result of results) {
        const row = result.row!;
        const entry = await tx.provisionalGadEntry.create({ data: {
          seriesId, barangayId: result.barangayId!, period: row.period, male: row.male, female: row.female,
          sourceReference: row.source_reference, sourceFileName, batchId, owningOfficeId: actor.officeId, creatorId: actor.id,
        } });
        await AuditService.logActionTx(tx, { userId: actor.id, action: 'PROVISIONAL_GAD_ENTRY_CREATED', entityType: 'ProvisionalGadEntry', entityId: entry.id, afterState: entry, req });
      }
      return { inserted: results.length, batchId };
    }, { isolationLevel: 'Serializable', timeout: 30000 });
  }
  async statistics(actorId: string, seriesId: string, period: string) {
    if (!rowSchema.shape.period.safeParse(period).success) throw new ValidationError('Select one valid reporting period.');
    const actor = await this.actor(this.db, actorId);
    const series = await this.series(this.db, seriesId, actor);
    const references = await this.references(this.db, actor);
    const entries = await this.db.provisionalGadEntry.findMany({ where: { seriesId, period, owningOfficeId: actor.officeId, ...(actor.barangayId ? { barangayId: actor.barangayId } : {}), ...(process.env.NODE_ENV === 'test' ? {} : { NOT: { barangay: { provisionalReference: { isSynthetic: true } } } }) }, include: { barangay: { select: { id: true, code: true, name: true, provisionalReference: { select: { isSynthetic: true } } } } } });
    const ids = new Set([...references.map(r => r.barangayId), ...entries.map(e => e.barangayId)]);
    const rows = [...ids].map(id => {
      const entry = entries.find(e => e.barangayId === id);
      const ref = references.find(r => r.barangayId === id);
      return { barangayId: id, name: entry?.barangay.name ?? ref!.barangay.name, isSynthetic: entry?.barangay.provisionalReference?.isSynthetic ?? ref?.isSynthetic ?? false,
        eligible: !!ref, male: entry?.male ?? null, female: entry?.female ?? null,
        total: entry ? entry.male + entry.female : null, sourceReference: entry?.sourceReference ?? null };
    });
    return { series, period, rows, totals: entries.length ? {
      male: entries.reduce((s, e) => s + e.male, 0), female: entries.reduce((s, e) => s + e.female, 0),
      total: entries.reduce((s, e) => s + e.male + e.female, 0),
    } : null, missing: rows.filter(r => r.total === null).length };
  }
}

export function provisionalError(error: any): AppError {
  if (error instanceof AppError) return error;
  if (error?.code === 'P2002' || error?.code === 'P2034') return new ConflictError('Duplicate or concurrent submission. Nothing was saved; preview again.');
  return new AppError('Provisional data storage is unavailable. No save was confirmed. Retry after checking the connection.', 503, 'PROVISIONAL_STORAGE_UNAVAILABLE');
}
