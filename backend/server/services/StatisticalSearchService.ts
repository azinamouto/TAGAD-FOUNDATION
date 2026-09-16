import { Prisma } from '@prisma/client';
import prisma, { isDatabaseConnected } from '../lib/prisma';
import { CBMS_SOURCE_ROWS } from '../data/cbmsSourceRows';
import { AppError, ForbiddenError, NotFoundError } from '../lib/errors';
import { ActorContext } from './TableBuilderService';
import { StatisticalDatasetService } from './StatisticalDatasetService';

function visibility(actor: ActorContext) {
  if (!actor?.id) throw new ForbiddenError('Authentication required');
  if (['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) return Prisma.sql`TRUE`;
  if (actor.role === 'VIEWER') return Prisma.sql`d.publication_status = 'PUBLISHED'`;
  if (actor.role === 'ENCODER') return Prisma.sql`(d.publication_status = 'PUBLISHED' OR d.imported_by_id::text = ${actor.id}
    ${actor.officeId ? Prisma.sql`OR u.office_id::text = ${actor.officeId}` : Prisma.empty})`;
  throw new ForbiddenError('Unrecognized role');
}

// Wildcards are escaped: an entered % or _ is a literal search character.
function pattern(query: string) { return '%' + query.replace(/[\\%_]/g, '\\$&') + '%'; }

export class StatisticalSearchService {
  private static requireDatabase() {
    if (!isDatabaseConnected()) throw new AppError('Statistical search temporarily unavailable', 503);
  }

  static async search(query: string, actor: ActorContext) {
    const scope = visibility(actor);
    this.requireDatabase();
    const needle = pattern(query.trim());
    const catalog = Prisma.join(CBMS_SOURCE_ROWS.map(row => Prisma.sql`(${row.tableNumber}, ${row.tableCode}, ${row.title}, ${row.tabName})`));
    // The source register bounds the response at 69 tables. Metadata matches do
    // not grant access to data: visibility is applied before counts or matching.
    const tables = await prisma.$queryRaw<any[]>(Prisma.sql`
      WITH catalog(number, code, title, tab) AS (VALUES ${catalog}),
      accessible AS (
        SELECT o.*, d.name AS dataset_name, d.dataset_code, b.name AS barangay_name,
          i.name AS indicator_name, i.indicator_code
        FROM tagad_statistical_observations o
        JOIN tagad_statistical_datasets d ON d.id = o.dataset_id
        LEFT JOIN tagad_users u ON u.id = d.imported_by_id
        LEFT JOIN tagad_barangays b ON b.id = o.barangay_id
        LEFT JOIN tagad_statistical_indicators i ON i.id = o.indicator_id
        WHERE ${scope} AND o.suppression_status = 'NONE'
      ), matched AS (
        SELECT a.*, (concat_ws(' ', a.period, a.numeric_value::text, a.unit, a.dimensions::text,
          a.dataset_name, a.dataset_code, a.barangay_name, a.indicator_name, a.indicator_code) ILIKE ${needle}) AS matches
        FROM accessible a
      )
      SELECT c.number::int AS "tableNumber", c.code AS "tableCode", c.title, c.tab AS "tabName", t.id AS "tableId",
        count(m.id)::int AS "accessibleObservationCount",
        count(m.id) FILTER (WHERE m.matches)::int AS "matchingObservationCount"
      FROM catalog c LEFT JOIN tagad_statistical_table_definitions t
        ON t.table_number = c.number AND t.table_code = c.code AND t.is_system_table AND NOT t.is_archived
      LEFT JOIN matched m ON m.table_definition_id = t.id
      GROUP BY c.number, c.code, c.title, c.tab, t.id
      HAVING concat_ws(' ', c.number::text, c.code, c.title, c.tab) ILIKE ${needle}
        OR count(m.id) FILTER (WHERE m.matches) > 0
      ORDER BY c.number`);
    return { query: query.trim(), catalogSize: 69, tables, total: tables.length,
      summaryMeaning: 'Counts describe accessible, unsuppressed stored observations, not population totals.' };
  }

  static async summarize(tableId: string, datasetId: string, actor: ActorContext, page: number, limit: number) {
    const scope = visibility(actor);
    this.requireDatabase();
    const table = await prisma.statisticalTableDefinition.findUnique({ where: { id: tableId } });
    if (!table || !table.isSystemTable || table.isArchived || !CBMS_SOURCE_ROWS.some(row => row.tableNumber === table.tableNumber && row.tableCode === table.tableCode)) {
      throw new NotFoundError('CBMS mother table');
    }
    const dataset = await StatisticalDatasetService.getDatasetById(datasetId, actor);
    if (actor.role === 'VIEWER' && dataset.publicationStatus !== 'PUBLISHED') throw new ForbiddenError('Published data required');
    const groups = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT o.period, o.indicator_id AS "indicatorId", i.name AS "indicatorName", o.unit,
        count(*)::int AS "observationCount", min(o.numeric_value)::text AS minimum,
        max(o.numeric_value)::text AS maximum, avg(o.numeric_value)::text AS "arithmeticMean"
      FROM tagad_statistical_observations o JOIN tagad_statistical_datasets d ON d.id = o.dataset_id
      LEFT JOIN tagad_users u ON u.id = d.imported_by_id
      LEFT JOIN tagad_statistical_indicators i ON i.id = o.indicator_id
      WHERE o.table_definition_id = ${tableId}::uuid AND o.dataset_id = ${datasetId}::uuid
        AND ${scope} AND o.suppression_status = 'NONE'
      GROUP BY o.period, o.indicator_id, i.name, o.unit
      ORDER BY o.period, o.indicator_id, o.unit
      LIMIT ${limit + 1} OFFSET ${(page - 1) * limit}`);
    return { tableId, datasetId, groups: groups.slice(0, limit), pagination: { page, limit, hasMore: groups.length > limit },
      summaryMeaning: 'Descriptive statistics of stored, unsuppressed observations. Means are unweighted; no population total or weighted rate is inferred.' };
  }
}
