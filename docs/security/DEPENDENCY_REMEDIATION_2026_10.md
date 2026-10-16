# Dependency remediation — October 2026

Assessment date: 2026-10-17 (Asia/Shanghai). Recommendation: **BLOCKED** pending the unpatched high-severity `braces` dependency. Publish as a draft; do not merge.

## Baseline and scope

- PR [#43](https://github.com/azinamouto/TAGAD-FOUNDATION/pull/43) is merged at `8f43b37ff0fa54a64ac4e4e8cff2c13788cda47b`; latest `origin/main` was fetched before branching.
- Branch: `security/tagad-dependency-hardening`. The configured origin uses the old `rynzz22` repository URL; GitHub resolves the requested repository as `azinamouto/TAGAD-FOUNDATION`.
- Untracked `docs/audits/` is preserved and excluded from this commit. The historical `docs/realignment/retirement/dependency-audit.json` is unchanged.
- No application features, schemas, migrations, authentication/authorization settings, rate-limit settings, privacy controls, or production environments were changed.
- Environment: Windows, Node 22.16.0, npm 10.9.2. Registry/advisory evidence is a point-in-time snapshot.

## Audit results

Counts below are npm vulnerable-package findings, including propagated parent findings; they are **not** counts of distinct advisories.

| Installation | Before critical / high / moderate / low | After critical / high / moderate / low | Unique GHSA before → after |
| --- | --- | --- | --- |
| backend | 1 / 1 / 1 / 0 | 0 / 0 / 0 / 0 | 6 → 0 |
| frontend | 1 / 11 / 3 / 1 | 0 / 6 / 0 / 0 | 25 → 1 |
| root | 1 / 23 / 7 / 3 | 0 / 6 / 2 / 0 | 103 → 2 |

Production-only (`npm audit --omit=dev`) after remediation: backend 0 findings; frontend 6 high; root 6 high and 2 moderate. `shadcn` is declared as a production dependency, so its toolchain remains visible in production-only audits even though application code imports its CSS rather than its CLI.

## Changes and compatibility

- Backend lockfile: `proxy-addr` 2.0.7 → 2.0.8; `brace-expansion` 1.1.18 → 1.1.21 and 2.1.4 → 2.1.7; `ip-address` 10.7.0 → 10.7.4. All satisfy existing dependency ranges.
- Frontend lockfile: targeted compatible updates of MCP SDK, brace-expansion, fast-uri, hono, ip-address, postcss-selector-parser, proxy-addr, source-map-js, and undici. `tsx` is updated from exact 4.21.0 to exact 4.23.15 so its supported esbuild dependency resolves to patched 0.28.2; no forced esbuild override.
- Root lockfile: targeted compatible security updates, including Express, Axios, React Router, Vite, and their affected transitives. The baseline root lock was stale (`react-example` 0.0.0) and inconsistent with the already-committed manifest. npm reconciled it with `tagad-system` 2.0.0, including dependencies already required there (such as Zod 4 and Supabase). Root `package.json` is unchanged. Transitive major changes required by a compatible parent update are reflected in the lock; no direct dependency major range was broadened.
- Updates used targeted `npm update ... --package-lock-only --ignore-scripts` and the explicit compatible tsx install. No `npm audit fix --force`, blanket suppressions, or new overrides.
- CI now runs `npm audit --audit-level=high` independently for backend, frontend, and root using a matrix with `fail-fast: false`. Removed the success-producing `|| echo` fallback. No audit `continue-on-error`; registry/audit errors also fail. Existing CodeQL availability handling remains separate. Branch-protection enforcement remains a repository setting, not changed by this PR.
- Three HTTP regression cases in `ipAttributionProxy.test.ts` verify that short IPv4-mapped IPv6 prefixes, zero-leading IPv6 subnets, and unrelated correctly mapped subnets cannot let an IPv4 peer forge the client/audit IP.

## Production exposure and remaining risks

- Backend Express uses `proxy-addr` for trusted-proxy IP attribution. The critical issue could affect IP-based controls under affected trust-subnet configuration; patched 2.0.8 is installed. Existing default distrust and rate limiting are preserved. `ip-address` is reached through express-rate-limit; brace-expansion through ExcelJS/archiver.
- Frontend MCP/Express/Hono/Undici/globbing findings predominantly enter via the shadcn development CLI dependency. Source-map-js and PostCSS paths are build tooling. Source inspection found `frontend/src/index.css` imports `shadcn/tailwind.css`; this is not proof that the installed CLI toolchain is harmless or absent from deployment artifacts. All package findings remain audited, regardless of inferred browser reachability.
- **Blocking:** [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), high, affects braces <=3.0.3. Registry latest is 3.0.3 and the advisory lists no patched version. Six high package findings remain in both frontend and root: braces, micromatch, fast-glob, @ts-morph/common, ts-morph, shadcn. Paths include `shadcn → fast-glob → micromatch → braces` and `shadcn → ts-morph → @ts-morph/common → fast-glob → micromatch → braces`.
- npm proposes shadcn 1.0.0 (a breaking downgrade), while current shadcn 4.22.0 still depends on the affected fast-glob chain. This was not applied. Removing/replacing the CSS/CLI dependency or maintaining a reviewed patch requires a separate compatibility decision; it is not suppressed here. Avoid processing untrusted glob patterns with this toolchain while awaiting remediation.
- Root additionally retains the moderate uuid advisory through ExcelJS → uuid 8.3.2, propagated to ExcelJS (two package findings, one advisory). npm proposes a breaking ExcelJS downgrade. Backend already has a pre-existing uuid 11 override; no new root cross-major override is introduced in this minimal patch.
- Root bootstrap dependencies are audited because `server.ts` imports the backend entry point. The older root dependency graph must not be assumed irrelevant merely because backend/frontend have separate manifests.

## Verification

| Check | Result |
| --- | --- |
| Clean lockfile installs | PASS: backend `npm ci`, frontend `npm ci --include=dev`, root `npm ci` |
| Dependency tree consistency | PASS: `npm ls --all --json` exits 0 for all three installs |
| Backend typecheck | PASS |
| Backend tests / build | PASS: 267 tests, 70 suites, 0 failures/skips; `npm test` posttest TypeScript build succeeds |
| Prisma generation / validation | PASS; unchanged schema |
| Frontend typecheck / tests | PASS: 19 tests, 0 failures/skips |
| Frontend production build | PASS; existing >500 kB chunk-size warning remains |
| Root build | PASS; delegates to frontend build and backend typecheck, not a separate production deployment smoke test |
| Browser security and scope suites | PASS: all 18 tests with installed Chrome, one worker, local Vite on port 5187 |
| Database qualification | PASS on isolated rerun: GAD workflows, 21 audit rollback cases, search scope/privacy, revocation, and synthetic backup/restore of all 20 public tables |
| Audit gate / YAML validation | PASS: YAML parses; backend gate exits 0; frontend/root gates exit 1, correctly blocking unresolved highs |
| Full and production-only audits | Backend clean; frontend/root unresolved findings as counted above |
| Whitespace validation | PASS: `git diff --check` |

Browser environment notes: the first Playwright-managed Vite startup timed out; the next attempt could not launch the absent bundled Chromium. The first installed-Chrome run passed 17/18, with the mobile test still on the lazy-loading screen at the 5-second assertion deadline. The complete rerun on the warmed local server with one worker passed all 18 in 40.6 seconds, without modifying assertions, timeouts, or application code. No claim is made for the unavailable bundled Chromium.

Database qualification notes: the first run, concurrent with other verification, hit a Prisma interactive-transaction deadline (6200 ms elapsed versus 5000 ms) during an injected late-chunk audit failure. The suite was rerun without concurrent installation/browser/build work; no timeout or safety assertion was relaxed. The complete isolated rerun passed, including the previously timed-out rollback case and synthetic backup/restore; PostgreSQL was stopped and its disposable workspace removed by the existing runner.

The database qualification uses disposable synthetic local databases. It does not certify deployed backups or modify a production database. CI results are pending when this draft is published; the high-severity audit jobs are expected to fail until braces is remediated.

## Package evidence: versions and representative dependency chains

Before values come from the merged main lockfiles and fresh npm audit JSON. After values come from the resulting lockfiles. Chains are representative paths resolved from each baseline lock; multiple installed versions/paths are retained where reported. The advisory register below gives affected ranges; resolved versions here are the selected patched versions when the package is no longer flagged (not necessarily the earliest patched release).

### backend

| Package | Before severity | Before versions → after versions | Representative chain(s) | After finding |
| --- | --- | --- | --- | --- |
| `brace-expansion` | high | 1.1.18, 2.1.4 → 1.1.21, 2.1.7 | exceljs → archiver → archiver-utils → glob → minimatch → brace-expansion; exceljs → archiver → readdir-glob → minimatch → brace-expansion | none |
| `ip-address` | moderate | 10.7.0 → 10.7.4 | express-rate-limit → ip-address | none |
| `proxy-addr` | critical | 2.0.7 → 2.0.8 | express → proxy-addr | none |

### frontend

| Package | Before severity | Before versions → after versions | Representative chain(s) | After finding |
| --- | --- | --- | --- | --- |
| `@modelcontextprotocol/sdk` | high | 1.30.0 → 1.32.1 | shadcn → @modelcontextprotocol/sdk | none |
| `@ts-morph/common` | high | 0.27.0 → 0.27.0 | shadcn → ts-morph → @ts-morph/common | high |
| `brace-expansion` | high | 5.0.9 → 5.0.12 | shadcn → ts-morph → @ts-morph/common → minimatch → brace-expansion | none |
| `braces` | high | 3.0.3 → 3.0.3 | shadcn → fast-glob → micromatch → braces | high |
| `esbuild` | low | 0.27.7 → 0.25.12, 0.28.2 | tsx → esbuild | none |
| `fast-glob` | high | 3.3.3 → 3.3.3 | shadcn → fast-glob | high |
| `fast-uri` | high | 3.1.6 → 3.1.8 | shadcn → @modelcontextprotocol/sdk → ajv → fast-uri | none |
| `hono` | moderate | 4.13.5 → 4.13.13 | shadcn → @modelcontextprotocol/sdk → hono | none |
| `ip-address` | moderate | 10.7.0 → 10.7.4 | shadcn → socks → ip-address | none |
| `micromatch` | high | 4.0.8 → 4.0.8 | shadcn → fast-glob → micromatch | high |
| `postcss-selector-parser` | moderate | 7.1.5 → 7.1.6 | shadcn → postcss-selector-parser | none |
| `proxy-addr` | critical | 2.0.7 → 2.0.8 | shadcn → @modelcontextprotocol/sdk → express → proxy-addr | none |
| `shadcn` | high | 4.19.0 → 4.19.0 | shadcn | high |
| `source-map-js` | high | 1.2.1 → 1.2.2 | @tailwindcss/vite → @tailwindcss/node → source-map-js | none |
| `ts-morph` | high | 26.0.0 → 26.0.0 | shadcn → ts-morph | high |
| `undici` | high | 7.29.0 → 7.30.1 | shadcn → undici | none |

### root

| Package | Before severity | Before versions → after versions | Representative chain(s) | After finding |
| --- | --- | --- | --- | --- |
| `@babel/core` | low | 7.29.0 → 7.29.7 | @vitejs/plugin-react → @babel/core | none |
| `@hono/node-server` | moderate | 1.19.14 → 2.1.5 | shadcn → @modelcontextprotocol/sdk → @hono/node-server | none |
| `@modelcontextprotocol/sdk` | high | 1.29.0 → 1.32.1 | shadcn → @modelcontextprotocol/sdk | none |
| `@ts-morph/common` | high | 0.27.0 → 0.27.0 | shadcn → ts-morph → @ts-morph/common | high |
| `axios` | high | 1.16.0 → 1.20.0 | axios | none |
| `baseline-browser-mapping` | moderate | 2.10.27 → 2.11.29 | shadcn → browserslist → baseline-browser-mapping | none |
| `body-parser` | moderate | 1.20.5, 2.2.2 → 1.20.8, 2.3.0 | shadcn → @modelcontextprotocol/sdk → express → body-parser; express → body-parser | none |
| `brace-expansion` | high | 1.1.14, 2.1.0, 5.0.5 → 1.1.21, 2.1.7, 5.0.12 | shadcn → ts-morph → @ts-morph/common → minimatch → brace-expansion; exceljs → archiver → archiver-utils → glob → minimatch → brace-expansion; exceljs → archiver → readdir-glob → minimatch → brace-expansion | none |
| `braces` | high | 3.0.3 → 3.0.3 | shadcn → fast-glob → micromatch → braces | high |
| `browserslist` | high | 4.28.2 → 4.29.3 | shadcn → browserslist | none |
| `esbuild` | low | 0.27.7 → 0.25.12, 0.28.2 | tsx → esbuild | none |
| `exceljs` | moderate | 4.4.0 → 4.4.0 | exceljs | moderate |
| `fast-glob` | high | 3.3.3 → 3.3.3 | shadcn → fast-glob | high |
| `fast-uri` | high | 3.1.2 → 3.1.8 | shadcn → @modelcontextprotocol/sdk → ajv → fast-uri | none |
| `form-data` | high | 4.0.5 → 4.0.6 | axios → form-data | none |
| `hono` | high | 4.12.18 → 4.13.13 | shadcn → @modelcontextprotocol/sdk → hono | none |
| `ip-address` | high | 10.2.0 → 10.7.4 | shadcn → @modelcontextprotocol/sdk → express-rate-limit → ip-address | none |
| `js-yaml` | high | 4.1.1 → 4.3.2 | shadcn → cosmiconfig → js-yaml | none |
| `micromatch` | high | 4.0.8 → 4.0.8 | shadcn → fast-glob → micromatch | high |
| `nanoid` | high | 3.3.12 → 3.3.20 | shadcn → postcss → nanoid | none |
| `postcss` | high | 8.5.14 → 8.5.30 | shadcn → postcss | none |
| `postcss-selector-parser` | moderate | 7.1.1 → 7.1.6 | shadcn → postcss-selector-parser | none |
| `protobufjs` | high | 7.5.6 → 7.6.6 | @google/genai → protobufjs | none |
| `proxy-addr` | critical | 2.0.7 → 2.0.8 | express → proxy-addr | none |
| `qs` | moderate | 6.14.2, 6.15.1 → 6.16.1 | express → body-parser → qs; express → qs | none |
| `react-router` | high | 7.15.0 → 7.18.4 | react-router-dom → react-router | none |
| `react-router-dom` | low | 7.15.0 → 7.18.4 | react-router-dom | none |
| `shadcn` | high | 4.7.0 → 4.7.0 | shadcn | high |
| `source-map-js` | high | 1.2.1 → 1.2.2 | @tailwindcss/vite → @tailwindcss/node → source-map-js | none |
| `tmp` | high | 0.2.5 → 0.2.7 | exceljs → tmp | none |
| `ts-morph` | high | 26.0.0 → 26.0.0 | shadcn → ts-morph | high |
| `uuid` | moderate | 8.3.2 → 8.3.2 | exceljs → uuid | moderate |
| `vite` | high | 6.4.2 → 6.4.4 | vite | none |
| `ws` | high | 8.20.0 → 8.22.0 | @google/genai → ws | none |

## Advisory register

Deduplicated GHSA IDs across all three initial audits. npm source IDs may differ for different affected version branches. Propagated parent findings without their own advisory are listed in the package tables above.

| Package | Severity | Advisory | npm source ID(s) | Affected ranges in audit | Installations |
| --- | --- | --- | --- | --- | --- |
| @babel/core | low | [GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8) | 1123528 | <=7.29.0 | root |
| @hono/node-server | moderate | [GHSA-frvp-7c67-39w9](https://github.com/advisories/GHSA-frvp-7c67-39w9) | 1139322 | <1.19.15 | root |
| @modelcontextprotocol/sdk | high | [GHSA-6qxp-vccf-f47h](https://github.com/advisories/GHSA-6qxp-vccf-f47h) | 1241339 | >=1.12.0 <1.31.0 | frontend, root |
| axios | high | [GHSA-3pq3-5fj3-cg6v](https://github.com/advisories/GHSA-3pq3-5fj3-cg6v) | 1240607 | >=1.13.0 <1.20.0 | root |
| axios | moderate | [GHSA-42h9-826w-cgv3](https://github.com/advisories/GHSA-42h9-826w-cgv3) | 1153185 | >=1.0.0 <1.18.0 | root |
| axios | moderate | [GHSA-44g4-m2mj-wpvx](https://github.com/advisories/GHSA-44g4-m2mj-wpvx) | 1240629 | >=1.15.0 <1.20.0 | root |
| axios | moderate | [GHSA-4hqw-qxg8-jxx2](https://github.com/advisories/GHSA-4hqw-qxg8-jxx2) | 1240627 | >=1.12.0 <1.20.0 | root |
| axios | high | [GHSA-542g-h47m-68v8](https://github.com/advisories/GHSA-542g-h47m-68v8) | 1240608 | >=1.13.0 <1.20.0 | root |
| axios | moderate | [GHSA-7q8q-rj6j-mhjq](https://github.com/advisories/GHSA-7q8q-rj6j-mhjq) | 1153180 | >=1.0.0 <1.18.0 | root |
| axios | moderate | [GHSA-9fr6-4gfg-395g](https://github.com/advisories/GHSA-9fr6-4gfg-395g) | 1240601 | >=1.0.0 <1.20.0 | root |
| axios | moderate | [GHSA-f4gw-2p7v-4548](https://github.com/advisories/GHSA-f4gw-2p7v-4548) | 1153184 | >=1.15.0 <1.18.0 | root |
| axios | high | [GHSA-gcfj-64vw-6mp9](https://github.com/advisories/GHSA-gcfj-64vw-6mp9) | 1153178 | >=1.15.2 <1.18.0 | root |
| axios | moderate | [GHSA-hcpx-6fm6-wx23](https://github.com/advisories/GHSA-hcpx-6fm6-wx23) | 1193664 | >=1.15.1 <1.18.0 | root |
| axios | moderate | [GHSA-j8rh-479h-cp32](https://github.com/advisories/GHSA-j8rh-479h-cp32) | 1240626 | >=1.0.0 <1.20.0 | root |
| axios | moderate | [GHSA-jqh4-m9w3-8hp9](https://github.com/advisories/GHSA-jqh4-m9w3-8hp9) | 1153182 | >=1.7.0 <1.18.0 | root |
| axios | high | [GHSA-m8m8-qj5v-23w3](https://github.com/advisories/GHSA-m8m8-qj5v-23w3) | 1240628 | >=1.15.2 <1.20.0 | root |
| axios | high | [GHSA-mghh-pgcx-3jjj](https://github.com/advisories/GHSA-mghh-pgcx-3jjj) | 1240604 | >=1.15.0 <1.20.0 | root |
| axios | moderate | [GHSA-mmx7-hfxf-jppx](https://github.com/advisories/GHSA-mmx7-hfxf-jppx) | 1147949 | >=1.0.0 <1.18.0 | root |
| axios | moderate | [GHSA-mwf2-3pr3-8698](https://github.com/advisories/GHSA-mwf2-3pr3-8698) | 1153175 | >=1.13.0 <1.18.0 | root |
| axios | moderate | [GHSA-pmv8-rq9r-6j72](https://github.com/advisories/GHSA-pmv8-rq9r-6j72) | 1147950 | >=1.0.0 <1.18.0 | root |
| axios | moderate | [GHSA-vh66-26gq-q6x8](https://github.com/advisories/GHSA-vh66-26gq-q6x8) | 1240600 | >=1.7.0 <1.20.0 | root |
| axios | high | [GHSA-x97p-jq2g-jp4f](https://github.com/advisories/GHSA-x97p-jq2g-jp4f) | 1240605 | >=1.15.1 <1.20.0 | root |
| axios | moderate | [GHSA-xj6q-8x83-jv6g](https://github.com/advisories/GHSA-xj6q-8x83-jv6g) | 1138749 | >=1.15.2 <1.18.0 | root |
| baseline-browser-mapping | moderate | [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | 1193686 | >=2.0.0 <2.11.0 | root |
| body-parser | low | [GHSA-v422-hmwv-36x6](https://github.com/advisories/GHSA-v422-hmwv-36x6) | 1123976, 1123977 | <1.20.6; >=2.0.0 <2.3.0 | root |
| brace-expansion | high | [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) | 1123896, 1123897, 1123898 | <1.1.16; >=2.0.0 <2.1.2; >=3.0.0 <5.0.7 | root |
| brace-expansion | high | [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | 1240108, 1240109, 1240111 | <1.1.19; >=2.0.0 <2.1.5; >=4.0.0 <5.0.10 | backend, frontend, root |
| brace-expansion | moderate | [GHSA-jxxr-4gwj-5jf2](https://github.com/advisories/GHSA-jxxr-4gwj-5jf2) | 1120311 | >=5.0.0 <5.0.6 | root |
| brace-expansion | high | [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | 1130588, 1130589, 1130591 | <1.1.17; >=2.0.0 <2.1.3; >=4.0.0 <5.0.8 | root |
| brace-expansion | moderate | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | 1240100, 1240101, 1240103 | <1.1.21; >=2.0.0 <2.1.7; >=4.0.0 <5.0.12 | backend, frontend, root |
| brace-expansion | high | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | 1240104, 1240105, 1240107 | <1.1.20; >=2.0.0 <2.1.6; >=4.0.0 <5.0.11 | backend, frontend, root |
| brace-expansion | high | [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | 1130734, 1130736, 1130737 | <1.1.18; >=2.0.0 <2.1.4; >=4.0.0 <5.0.9 | root |
| braces | high | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | 1240992 | <=3.0.3 | frontend, root |
| browserslist | high | [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) | 1153172 | <=4.28.6 | root |
| browserslist | high | [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) | 1153171 | <=4.28.6 | root |
| esbuild | low | [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) | 1120680 | >=0.27.3 <0.28.1 | frontend, root |
| fast-uri | high | [GHSA-4c8g-83qw-93j6](https://github.com/advisories/GHSA-4c8g-83qw-93j6) | 1204921 | >=3.0.0 <3.1.3 | root |
| fast-uri | high | [GHSA-58mr-gqgx-xq4g](https://github.com/advisories/GHSA-58mr-gqgx-xq4g) | 1239946 | =3.1.6 | frontend |
| fast-uri | high | [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7) | 1130720 | >=3.0.0 <3.1.5 | root |
| fast-uri | high | [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc) | 1158524 | >=3.0.0 <3.1.6 | root |
| fast-uri | high | [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf) | 1158527 | >=3.1.2 <3.1.6 | root |
| fast-uri | moderate | [GHSA-hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) | 1240091 | >=3.0.0 <3.1.8 | frontend, root |
| fast-uri | high | [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp) | 1158530 | >=3.0.0 <3.1.6 | root |
| fast-uri | high | [GHSA-qw65-cvwx-89v3](https://github.com/advisories/GHSA-qw65-cvwx-89v3) | 1239943 | >=3.0.0 <3.1.7 | frontend, root |
| fast-uri | high | [GHSA-v2hh-gcrm-f6hx](https://github.com/advisories/GHSA-v2hh-gcrm-f6hx) | 1124064 | >=3.0.0 <=3.1.3 | root |
| form-data | high | [GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) | 1120743 | >=4.0.0 <4.0.6 | root |
| hono | moderate | [GHSA-2gcr-mfcq-wcc3](https://github.com/advisories/GHSA-2gcr-mfcq-wcc3) | 1120085 | <4.12.21 | root |
| hono | moderate | [GHSA-3hrh-pfw6-9m5x](https://github.com/advisories/GHSA-3hrh-pfw6-9m5x) | 1120083 | <4.12.21 | root |
| hono | moderate | [GHSA-54fx-42gc-7vw4](https://github.com/advisories/GHSA-54fx-42gc-7vw4) | 1138773 | >=4.12.0 <4.12.34 | root |
| hono | low | [GHSA-79qm-7rj5-m7r9](https://github.com/advisories/GHSA-79qm-7rj5-m7r9) | 1138772 | >=4.7.0 <4.12.34 | root |
| hono | high | [GHSA-88fw-hqm2-52qc](https://github.com/advisories/GHSA-88fw-hqm2-52qc) | 1123999 | <4.12.25 | root |
| hono | moderate | [GHSA-8j4g-w8fx-2239](https://github.com/advisories/GHSA-8j4g-w8fx-2239) | 1130733 | <4.12.34 | root |
| hono | moderate | [GHSA-crvj-82cr-hjcx](https://github.com/advisories/GHSA-crvj-82cr-hjcx) | 1193731 | <4.13.5 | root |
| hono | moderate | [GHSA-f23p-vx2j-j53r](https://github.com/advisories/GHSA-f23p-vx2j-j53r) | 1138771 | >=3.8.0 <4.12.34 | root |
| hono | moderate | [GHSA-f577-qrjj-4474](https://github.com/advisories/GHSA-f577-qrjj-4474) | 1120084 | <4.12.21 | root |
| hono | moderate | [GHSA-g6gw-c38x-mqfc](https://github.com/advisories/GHSA-g6gw-c38x-mqfc) | 1193730 | <4.13.5 | root |
| hono | moderate | [GHSA-gqvv-2mrq-wpjv](https://github.com/advisories/GHSA-gqvv-2mrq-wpjv) | 1193729 | <4.13.5 | root |
| hono | moderate | [GHSA-hvrm-45r6-mjfj](https://github.com/advisories/GHSA-hvrm-45r6-mjfj) | 1124009 | >=4.11.8 <4.12.27 | root |
| hono | moderate | [GHSA-hxh3-vqpv-xpqv](https://github.com/advisories/GHSA-hxh3-vqpv-xpqv) | 1240640 | <4.13.7 | frontend, root |
| hono | moderate | [GHSA-j6c9-x7qj-28xf](https://github.com/advisories/GHSA-j6c9-x7qj-28xf) | 1124001 | <4.12.25 | root |
| hono | moderate | [GHSA-rv63-4mwf-qqc2](https://github.com/advisories/GHSA-rv63-4mwf-qqc2) | 1123997 | <4.12.25 | root |
| hono | moderate | [GHSA-w62v-xxxg-mg59](https://github.com/advisories/GHSA-w62v-xxxg-mg59) | 1124010 | >=4.0.0 <4.12.27 | root |
| hono | moderate | [GHSA-wgpf-jwqj-8h8p](https://github.com/advisories/GHSA-wgpf-jwqj-8h8p) | 1123998 | <4.12.25 | root |
| hono | moderate | [GHSA-wwfh-h76j-fc44](https://github.com/advisories/GHSA-wwfh-h76j-fc44) | 1124000 | <4.12.25 | root |
| hono | moderate | [GHSA-xgm2-5f3f-mvvc](https://github.com/advisories/GHSA-xgm2-5f3f-mvvc) | 1124005 | >=4.3.3 <4.12.27 | root |
| hono | moderate | [GHSA-xrhx-7g5j-rcj5](https://github.com/advisories/GHSA-xrhx-7g5j-rcj5) | 1120082 | <4.12.21 | root |
| ip-address | moderate | [GHSA-22jq-vg5j-6vgg](https://github.com/advisories/GHSA-22jq-vg5j-6vgg) | 1130724 | >=10.1.1 <=10.2.0 | root |
| ip-address | moderate | [GHSA-2vr4-cq9g-pvrc](https://github.com/advisories/GHSA-2vr4-cq9g-pvrc) | 1239949 | >=10.2.0 <=10.5.0 | root |
| ip-address | moderate | [GHSA-4xrf-jv44-h6hh](https://github.com/advisories/GHSA-4xrf-jv44-h6hh) | 1130723 | >=10.1.1 <=10.2.1 | root |
| ip-address | moderate | [GHSA-h3mg-xc3c-68pw](https://github.com/advisories/GHSA-h3mg-xc3c-68pw) | 1240098 | <=10.7.0 | backend, frontend, root |
| ip-address | moderate | [GHSA-j6r3-76f7-8jcv](https://github.com/advisories/GHSA-j6r3-76f7-8jcv) | 1240097 | <=10.7.0 | backend, frontend, root |
| ip-address | high | [GHSA-mwp4-54f8-5fhr](https://github.com/advisories/GHSA-mwp4-54f8-5fhr) | 1130722 | <=10.3.0 | root |
| ip-address | moderate | [GHSA-rpw4-54j3-4h4q](https://github.com/advisories/GHSA-rpw4-54j3-4h4q) | 1239948 | <=10.5.0 | root |
| js-yaml | high | [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | 1193727 | >=4.0.0 <4.3.2 | root |
| js-yaml | high | [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) | 1123911 | >=4.0.0 <4.3.0 | root |
| js-yaml | high | [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | 1138115 | >=4.0.0 <4.3.1 | root |
| js-yaml | moderate | [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) | 1121860 | >=4.0.0 <=4.1.1 | root |
| nanoid | high | [GHSA-28wg-ghj8-5hjv](https://github.com/advisories/GHSA-28wg-ghj8-5hjv) | 1138811 | <3.3.16 | root |
| nanoid | high | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | 1139427 | <3.3.18 | root |
| postcss | moderate | [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | 1130709 | <=8.5.22 | root |
| postcss | high | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | 1139510 | <=8.5.17 | root |
| postcss-selector-parser | moderate | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | 1241232 | <7.1.6 | frontend, root |
| postcss-selector-parser | low | [GHSA-w9m9-85wc-3x92](https://github.com/advisories/GHSA-w9m9-85wc-3x92) | 1153169 | >=7.1.0 <7.1.3 | root |
| protobufjs | moderate | [GHSA-f38q-mgvj-vph7](https://github.com/advisories/GHSA-f38q-mgvj-vph7) | 1123492 | <=7.6.2 | root |
| protobufjs | moderate | [GHSA-j3f2-48v5-ccww](https://github.com/advisories/GHSA-j3f2-48v5-ccww) | 1123964 | >=7.5.0 <=7.6.4 | root |
| protobufjs | moderate | [GHSA-jggg-4jg4-v7c6](https://github.com/advisories/GHSA-jggg-4jg4-v7c6) | 1119378 | <=7.5.7 | root |
| protobufjs | high | [GHSA-wcpc-wj8m-hjx6](https://github.com/advisories/GHSA-wcpc-wj8m-hjx6) | 1123488 | <=7.6.0 | root |
| proxy-addr | critical | [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h) | 1241210 | >=1.1.0 <2.0.8 | backend, frontend, root |
| qs | moderate | [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | 1158507 | >=2.2.5 <6.16.0 | root |
| qs | moderate | [GHSA-q8mj-m7cp-5q26](https://github.com/advisories/GHSA-q8mj-m7cp-5q26) | 1119502 | >=6.11.1 <=6.15.1 | root |
| qs | moderate | [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) | 1158506 | >=6.14.2 <=6.15.3 | root |
| react-router | moderate | [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg) | 1124272 | >=6.4.0 <7.18.0 | root |
| react-router | low | [GHSA-84g9-w2xq-vcv6](https://github.com/advisories/GHSA-84g9-w2xq-vcv6) | 1120807 | >=7.12.0 <7.15.1 | root |
| react-router | high | [GHSA-chx6-hx7r-mcp5](https://github.com/advisories/GHSA-chx6-hx7r-mcp5) | 1124276 | >=7.0.0 <7.18.0 | root |
| react-router | moderate | [GHSA-h8fp-f39c-q6mh](https://github.com/advisories/GHSA-h8fp-f39c-q6mh) | 1124271 | >=7.11.0 <7.18.0 | root |
| react-router | high | [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) | 1138769 | >=7.12.0 <7.18.2 | root |
| react-router | moderate | [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6) | 1124268 | >=6.0.0 <7.18.0 | root |
| source-map-js | high | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | 1241209 | >=1.0.0 <1.2.2 | frontend, root |
| tmp | high | [GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65) | 1120654 | <0.2.6 | root |
| undici | low | [GHSA-2gqq-gqf2-x968](https://github.com/advisories/GHSA-2gqq-gqf2-x968) | 1240048 | >=7.1.0 <7.29.1 | frontend |
| undici | moderate | [GHSA-2jfj-6hjv-fm6j](https://github.com/advisories/GHSA-2jfj-6hjv-fm6j) | 1240046 | >=7.0.0 <7.29.1 | frontend |
| undici | moderate | [GHSA-3wwx-pv8p-q78v](https://github.com/advisories/GHSA-3wwx-pv8p-q78v) | 1239933 | >=7.28.0 <7.29.1 | frontend |
| undici | moderate | [GHSA-3xpg-4rpp-hhhm](https://github.com/advisories/GHSA-3xpg-4rpp-hhhm) | 1240044 | >=7.15.0 <7.29.1 | frontend |
| undici | low | [GHSA-8436-99hf-9mmv](https://github.com/advisories/GHSA-8436-99hf-9mmv) | 1240052 | >=7.0.0 <7.29.1 | frontend |
| undici | moderate | [GHSA-pmjh-fq2x-6v4x](https://github.com/advisories/GHSA-pmjh-fq2x-6v4x) | 1240036 | >=7.11.0 <7.29.1 | frontend |
| undici | low | [GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r) | 1240038 | >=7.0.0 <7.29.1 | frontend |
| undici | high | [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5) | 1240041 | >=7.0.0 <7.29.1 | frontend |
| undici | moderate | [GHSA-rx4f-c7p8-82vq](https://github.com/advisories/GHSA-rx4f-c7p8-82vq) | 1240055 | >=7.0.0 <7.29.1 | frontend |
| undici | high | [GHSA-w293-vg96-wgc3](https://github.com/advisories/GHSA-w293-vg96-wgc3) | 1240050 | >=7.24.1 <7.29.1 | frontend |
| uuid | moderate | [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | 1119441 | <11.1.1 | root |
| vite | high | [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) | 1123525 | <=6.4.2 | root |
| vite | moderate | [GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) | 1120784 | <=6.4.2 | root |
| ws | moderate | [GHSA-58qx-3vcg-4xpx](https://github.com/advisories/GHSA-58qx-3vcg-4xpx) | 1119108 | >=8.0.0 <8.20.1 | root |
| ws | high | [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) | 1123259 | >=8.0.0 <8.21.0 | root |

## Reproduction

Run `npm ci` in root/backend and `npm ci --include=dev` in frontend. Run `npm audit --json`, `npm audit --omit=dev --json`, and `npm audit --audit-level=high` separately in all three directories. A high-gate failure is expected for root/frontend until the documented blocker is resolved.

Run backend `npm run typecheck`, `npm test` (includes the build), `npm run db:validate`, and `npm run test:qualification` using only local test configuration. Run frontend `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:browser`. The qualification script creates and destroys its own disposable local PostgreSQL cluster; no production credentials or database are used.

Raw command logs and audit/tree snapshots are retained locally under `.git/dependency-hardening/` and are not committed. This report preserves counts, version changes, advisory IDs/ranges, chains, exposure, and verification outcomes for PR review. Historical retirement audit evidence is not rewritten.
