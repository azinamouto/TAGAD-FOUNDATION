# Backend hardening API notes

This supplements existing API documentation for the September 16 backend pass.
All admin routes require bearer authentication. Frontend integration is outside
this pass. See [verification and limits](backend-security-verification-2026-09-16.md).

## Sessions and failures

Login issues access and refresh tokens sharing one session identifier. Refresh
rotation preserves that session, and consumes the old refresh token once.
Bearer-only logout invalidates its paired refresh session. A supplied refresh
token must belong to the same user/session. Legacy refresh tokens without session
contract version 2 require a new login. Storage failures return 503 rather than
accepting an unverifiable token or claiming durable logout succeeded.

Unexpected production errors omit internal database messages, codes and details.
Use protected server diagnostics to investigate; do not log tokens or private
request bodies to compensate.

## Statistical import layout

Existing discover, preview and execute request bodies accept the same optional
`csvLayout` object: `{ "headerRow": 3, "headerRowCount": 2 }`. Header rows count
CSV records starting at one, so a quoted multiline cell is still one record.
One to five header records are supported. Discovery returns the selected layout;
reuse it for preview and execution. Ambiguous source layouts need an explicit
selection. Duplicate flattened headers and malformed quoted records are rejected.

Existing measure-column mapping entries may include `period` and `dimensions`,
for example:

```json
{
  "columnName": "Population / Male",
  "indicatorId": "<existing indicator UUID>",
  "unit": "persons",
  "period": "2024",
  "dimensions": { "sex": "MALE" }
}
```

Dimension keys/values must match the target table's vocabulary. Per-column
dimensions override common dimensions for that measure. These fields allow matrix
unpivoting without inventing a separate indicator for each sex/period column.
Both import modes reject partial numeric strings and malformed separators; resolve
preview errors before execution. The 69-table register does not supply detailed
source schemas or automatic semantic mappings.

## Mother-table search and summaries

- `GET /api/admin/statistical-search?q=population`: at most 100 query characters;
  empty query lists the 69 registered mother tables. Matches titles, source tab
  names and accessible unsuppressed observation content. Results carry source
  identity, nullable `tableId`, accessible/matching observation counts and meaning.
- `GET /api/admin/statistical-search/tables/:id/summary?datasetId=<uuid>&page=1&limit=50`:
  groups the authorized dataset by period, indicator and unit. Maximum page size
  is 100; `pagination.hasMore` indicates another page. Minimum, maximum and
  arithmetic mean are decimal strings to preserve database precision.

ADMIN/SUPER_ADMIN see all datasets; ENCODER sees published, own and assigned-office
datasets; VIEWER sees published data only. Suppressed cells are excluded before
matching/counting. Search counts are observation counts, not population. Summary
means are unweighted across stored cells and do not establish population rates.
Summary aggregation covers the dataset, not just one observation-grid page.
Missing database storage returns 503; missing canonical table definitions have a
null search `tableId` and cannot be summarized until registered.

## Feedback review

Public feedback now requires durable storage. Apply the reviewed feedback
migration in the intended environment through its normal migration process before
using the feature; this pass only tested it locally.

- `GET /api/admin/feedback?status=NEW&page=1&limit=20`: ADMIN/SUPER_ADMIN only;
  metadata listing, maximum 100 per page.
- `GET /api/admin/feedback/:id`: private details, with access audit.
- `PATCH /api/admin/feedback/:id`: strict body with `status`, `reviewNote` (3–2000
  trimmed characters) and `expectedUpdatedAt` (the previously read ISO timestamp).

Statuses are `NEW`, `IN_REVIEW`, `RESOLVED`, `DISMISSED`. A stale timestamp returns
409: reload and reconcile the review before retrying. Review and audit commit
together. This does not send email or provide anonymous citizen tracking.

## GAD workflow and partial updates

Plans start DRAFT. Submit transitions DRAFT/REVISED to SUBMITTED; approval or
revision requires SUBMITTED; APPROVED is terminal in this workflow. SUPER_ADMIN
follows these transitions too. Approval enforces the configured budget percentage;
an authorized explicit override requires justification. Revision requires remarks.
Both generic status and dedicated action routes share these checks.

Generic plan PUT must omit `status`. Submitted/approved plans cannot be edited,
deleted or extended with items. Use the existing workflow endpoints for status
changes. An audit-write failure rolls back the workflow transition. The named
GAD Focal/MPDC/Mayor chain is awaiting approved assignments; it is not configured.

Partial updates preserve omitted values, including plan/program budgets,
accomplishment counts and office activation. Explicit zero and false values
remain valid. Creation defaults still apply to new records.

## Troubleshooting and remaining work

401 requires a valid/fresh login; 403 requires reviewing role, office scope or
workflow state; 409 requires reloading current state; 422 requires correcting
validation or workflow prerequisites. A 503 needs storage/revocation availability
investigation, not a fallback that reports success without saving.

Search uses substring matching, including dimension JSON. The 1,001-observation
regression proves pagination-independent aggregation, not production performance.
Profile authorized representative datasets before choosing indexes or search
infrastructure. See the [waiting feature register](backend-feature-register.md)
for requirements that still need policies, data or a configuration specification.
