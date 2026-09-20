# Phase 3 deployment evidence

Copy to `deployment-evidence.local.md` (gitignored) or your restricted operations record. Add only a redacted summary to issue #28. Never include passwords, connection strings, tokens, signed URLs, beneficiary data, or backup contents.

Status: **NOT DEPLOYED / NOT VERIFIED**

| Release detail | Operator entry |
| --- | --- |
| Date / operator / backup contact | |
| Release commit and passing CI links | |
| Frontend deployment ID / HTTPS URL | |
| Backend deployment ID / HTTPS URL / region | |
| Production database project / region / runtime role | |
| Applied SQL ledger / reconciliation review | |
| Private MOV bucket / integration evidence | |
| Verified proxy chain / TRUST_PROXY setting | |
| Backup provider / schedule / destination / encryption key custodian | |
| Actual retention / PITR window / accepted RPO and RTO | |
| Last successful DB backup and object export timestamps | |
| Restore source / isolated target / checksum evidence | |
| Actual measured RPO / restore duration / drill date | |
| Monitoring dashboard / alert recipients / escalation owner | |
| Alert delivery test / acknowledgement / recovery notification | |
| Previous known-good deployment and rollback procedure | |

## Priority 5: deployment architecture

- [ ] Frontend deployed; direct navigation and refresh work; API requests return JSON.
- [ ] Backend deployed; `/api/health` and `/api/ready` return expected 200 JSON.
- [ ] Production PostgreSQL schema and SQL constraints verified; Data API access denied.
- [ ] Private object storage: upload, authorized download, wrong-office denial, URL expiry pass.
- [ ] Backend secrets protected; Vite bundle contains public values only; demo mode disabled.
- [ ] HTTPS certificate and HTTP redirect verified on both hosts.
- [ ] Allowed and untrusted-origin CORS preflight checks pass.
- [ ] Actual proxy chain verified on all ingress routes; forged headers cannot bypass rate limits.
- [ ] Auth/login/logout/revocation, office scope, exports, and public app smoke checks pass.

## Priority 6: recovery

- [ ] Automated DB backups and separate MOV object exports have completed successfully.
- [ ] Retention/lifecycle rules configured and verified for both; keys recoverable independently.
- [ ] Failure and missed-backup alert delivery verified.
- [ ] Recent real backup restored to an isolated target; SQL/RLS and private bucket restored.
- [ ] Counts/fingerprints, foreign keys, attachment paths/checksums, and app flows verified.
- [ ] Measured RPO/RTO accepted; next quarterly drill scheduled with owner.

## Priority 7: monitoring

- [ ] Frontend, API health, and readiness monitors active.
- [ ] Application resource, restart, 5xx, and latency monitoring active.
- [ ] Database connection/capacity/performance monitoring active.
- [ ] Sanitized backend Sentry event received with the correct release.
- [ ] TLS expiry monitoring active.
- [ ] Alerts received and acknowledged; backup contact and escalation tested.

## Unresolved items / acceptance

List remaining failures and owners here. Do not mark Phase 3 complete while any required item is unverified.
