# Statistical workspace audit and decision

Scope: the user's confirmed 69-table CBMS register is the mother-table catalog.
The detailed layouts are not yet authoritative. Keep each source identity fixed;
configure dimensions (categories) and indicators (measures) through Table Builder
as layouts become known. A dataset is a reporting release; observations belong
to a mother table and dataset. Do not invent child schemas or create physical SQL
tables from uploaded column names. Existing JSON dimensions and validated binding
metadata provide flexibility without bypassing governance.

Audit findings before this pass:

- The existing spreadsheet UI loads only the first 500 observations.
- Paste parsing can shift columns when optional cells are blank or unmatched.
- Failed rows are excluded from Save All retries; refresh/navigation can discard
  drafts, and edits during requests can be overwritten by stale responses.
- UI notes/status fields do not match persisted suppression fields in the API.
- Observation detail does not check its dataset's scope; encoder dataset detail
  allows unresolved office ownership; VALIDATED data remains writable despite
  the documented DRAFT-only contract.
- No unified mother-table/data search or server-wide statistical summary exists.
- Table Builder already supports dimensions, allowed values, indicators, and
  ordering. Build on it and expose configuration from the workspace.

Decision: retain Express for this hardening pass. Nest provides modules, dependency
injection, guards and a consistent architecture, but uses Express by default.
Moving existing routes would not itself fix access, schemas, pagination or query
costs. Keep authorization and query logic in services, validate inputs at route
boundaries, and test contracts. Reconsider an incremental module migration when
team/module ownership makes its architectural benefits measurable.

Sources reviewed: https://docs.nestjs.com/ and
https://docs.nestjs.com/techniques/performance and
https://expressjs.com/en/advanced/best-practice-performance/ .
This decision is project-specific, not a claim that Express is inherently faster.

Search scope confirmed by the user: the 69 mother tables and their statistical
data, with summaries; exclude operational records. Data matches must be filtered
by dataset visibility before counting/pagination. Group summaries by indicator
and unit, and label record counts distinctly from population totals. A search
match is a possible fit, not an authoritative schema assignment. Production
scale and latency still need measurement on representative deployed data.
