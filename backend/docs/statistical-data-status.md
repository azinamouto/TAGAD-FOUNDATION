# Statistical data availability (GOV-3 backend)

`hasRealData` means that a table has at least one **persisted observation**.
The backend reads `_count.observations`; catalog `verificationStatus` does not
determine this flag. `dataStatus` is `REAL DATA` when the flag is true and
`NO DATA` otherwise. Fallback tables report `false` / `NO DATA`.

| Catalog metadata | Persisted observations | hasRealData | dataStatus |
| --- | --- | --- | --- |
| VERIFIED | 0 | false | NO DATA |
| UNVERIFIED | 1 or more | true | REAL DATA |
| Any, using fallback storage | Not established | false | NO DATA |

The count is across the table's observations, not a selected dataset. This
describes data presence, not approval, data quality, or publication permission.
TableBuilderService and StatisticalCatalogService use the shared
`server/lib/statisticalDataStatus.ts` helper. `tests/statisticalDataStatus.test.ts`
checks the distinction using database fixtures.

This corrects the older section 6 of root `docs/STATISTICAL_DATA_GOVERNANCE.md`.
The exact replacement is prepared in
[`governance-data-status.patch`](../patches/governance-data-status.patch).
Applying it requires the requested exception to the backend-only write boundary;
the root document has not been edited during this pass.
