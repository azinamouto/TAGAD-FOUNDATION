# WP01 data dictionary — v0.1.0

Status: **proposed semantic dictionary, not a schema or approved LGU vocabulary**. Date: 2026-10-13. Authority and checksum: [SOURCE_REGISTER.md](SOURCE_REGISTER.md). C/P/U have the meanings in [REQUIREMENTS_BASELINE.md](REQUIREMENTS_BASELINE.md). C confirms that the concept is requested; P definitions/types/rules below remain recommendations unless explicitly described as observed implementation. All requiredness, permitted categories and sensitive collection need D03/D05 confirmation. No new fields, enum values or tables are implemented.

## Source and interpretation keys

- **S**: original proposal, section cited in each row; [verbatim file](../../requirements/TALIBON_GAD_SDD_PROPOSAL.md).
- **E02**: [Prisma schema](../../../backend/prisma/schema.prisma), named model/field below, at the PR #40 baseline.
- **E05**: [beneficiary validation](../../../backend/server/validation/schemas.ts) (`createBeneficiarySchema`), [form](../../../frontend/src/pages/DataEncoding.tsx) and [service](../../../backend/server/services/BeneficiaryService.ts) (`createBeneficiary`).
- **E07**: schema statistical models, [observation validator](../../../backend/server/validators/observationValidator.ts) (`createObservationSchema`, `updateObservationSchema`), [dataset validator](../../../backend/server/validators/datasetValidator.ts) (`createDatasetSchema`).

Logical types below express meaning, not database design. Unavailable, absent, unknown, refused, not applicable, suppressed and invalid have different meanings; proposed labels are not authorized enum values. An absent numeric observation is never evidence of zero. Existing code defaults are documented evidence, not proposed LGU rules. Source-backed values must remain recoverable after any later approved normalization.

## Grain and identity

| ID / concept | Proposed definition, type and validation | Source / current evidence | Status, proposed custodian and gates |
| --- | --- | --- | --- |
| DD01 Registry record | Stable record identifier for a person registered by a source/office; identifier/string. A record is neither proof of a distinct municipal resident nor proof of service receipt. No name-only merge. | S IV/V.3; E02 `Beneficiary.id` UUID | C concept / P definition; owning office; D04/D05 |
| DD02 Service activity | Identified occurrence of a program/activity/project/service; reference plus actual date/location. Do not derive an occurrence from a fiscal year or free-text plan alone. | S V.2–3; E02 has no service-occurrence model | C / P; service office; D04 |
| DD03 Participation | One authorized source record linking permitted beneficiary reference to activity/service; distinct from activity and registry. Episode/repeat key, cancellation and correction rules U. | S V.3; E02 no participation relation | C tracking / P grain; service office; D04/D05 |
| DD04 Aggregate observation | One measure for one source version, period, geography and full dimension tuple; numeric value with unit/status. Define a duplicate key only after approved grain. Do not manufacture person records from aggregates. | S IV/V.2; E02 `StatisticalObservation`, E07 | C / P; data owner; D03/D04/D08 |
| DD05 Program/PAP | Identified planned intervention, distinct from occurrence and reported accomplishment; reference/text. Keep source title and owning office. | S II/V.2–3; E02 `Program`, `GADPlanItem` | C / P; GFPS/service office; D04/D09 |

## People, classification, geography and scope

| ID / concept | Proposed definition, type and validation | Source / current evidence | Status, proposed custodian and gates |
| --- | --- | --- | --- |
| DD06 Sex / gender concepts | Preserve source concept label and reported code/text. Male/female and other applicable categories are source wording; separate concepts only when approved. No inference from names, service or omission. | S V.2; E02 `Sex` = MALE/FEMALE; E05 binary validator | C wording / U vocabulary; GFPS/sector office/DPO; D03/D05 |
| DD07 Missing demographic value | Explicit reason if authorized: unknown, not collected, refused or not applicable; distinct from reported category. No default female or age zero. Requiredness and reason labels U. | S V.2; E05 service uses defaults; proposed correction in audit | P; source owner; D03/D05 |
| DD08 Birthdate | Source-supplied calendar date only when necessary/authorized; absent allowed by approved form. Never infer date from age. | S V.2 age group; E02 `Beneficiary.birthdate` optional date | P collection choice; office/DPO; D03/D05 |
| DD09 Age observation | Whole completed years at explicitly recorded reference date, or source-provided age with method. Reject invalid values under approved limits; do not adopt current 0–150 validator as policy. | S V.2; E02 `age` integer, E05 range 0–150 | C age / P definition; GFPS; D03 |
| DD10 Age reference date | Calendar date used for age or age-group assignment; source/reference/activity basis recorded. Entry timestamp is not a substitute. Leap-day and date-boundary rules U. | S V.2; current age has no explicit reference-date field | P; GFPS/office; D03/D04 |
| DD11 Age band | Versioned code/label with non-overlapping lower/upper boundaries and inclusion rules; unknown remains separate. No age thresholds invented. | S V.2/V.4; E07 dimension metadata | C / U bands; GFPS/sector office; D03 |
| DD12 Barangay | Stable reference to approved geography; preserve UUID and source code/name/alias mapping. Residence, activity location and reporting coverage are distinct usages. Ambiguous aliases require review. | S IV/V.2; E02 `Barangay.id/code/name`; E05 UI list not authority | C / P; MPDC/GIS; D03/D07 |
| DD13 Sector membership | Source-defined population grouping; code/version, potentially multiple memberships if approved. Membership totals may overlap and must not be summed as unique people. | S IV/VI; E02 `Beneficiary.sector` single string; E05 limited UI list | C / U vocabulary and cardinality; GFPS/sector offices; D03 |
| DD14 Beneficiary type | Source classification of recipient in a service context; code/version. Do not silently equate to sector or invent categories. | S V.2; no distinct E02 beneficiary-type field | C / U definition; service office; D03/D04 |
| DD15 Owning office | Institution accountable for a record/dataset independent of current encoder assignment; stable reference. Missing/ambiguous owner needs reconciliation, not unrestricted access. | S IV/V.2/XI; E02 `Office`, optional `Beneficiary.officeId`; dataset importer relation | C / P; MPDC/office; D02/D08 |
| DD16 Actor/persona assignment | Designated user, permitted actions, office/barangay scope and effective assignment; references. Missing assignment does not imply municipal scope. | S V.1/XII.1; E02 `User.role/officeId/barangayId` | C personas / P assignment semantics; MPDC/GFPS; D02 |
| DD17 Personal/contact fields | Name/contact/address/household identifiers only where minimum necessary and approved; restricted text/references. Not automatically required by a request for statistics. | S V.6; E02/E05 beneficiary name/contact/address/household | P minimum collection; service office/DPO; D04/D05 |
| DD18 Geographic geometry | Source-supplied boundary or point, with CRS, date, license, stable-code mapping and verification evidence; missing geometry explicit. A point is not a boundary. | S barangay concept; stakeholder S01; E02 `Barangay.boundary/latitude/longitude/geoSource/geoVerified` | T map / P metadata; GIS/MPDC; D07 |

## Time, services, measures and reports

| ID / concept | Proposed definition, type and validation | Source / current evidence | Status, proposed custodian and gates |
| --- | --- | --- | --- |
| DD19 Service category | Versioned classification of service offered/received; mapped source form. Required IV categories listed below; same program may need more than one category if approved. | S IV/V.3; E02 generic program sector/title | C / U vocabulary; sector office; D03/D04/D08 |
| DD20 Activity date/range | Actual occurrence date or date interval, with source precision and timezone when time is relevant. Missing/partial date stays explicit; do not backfill from creation time. | S V.2; E02 fiscal years/quarters/timeline text | C / P; service office; D04 |
| DD21 Activity location | Venue/barangay or approved broader location for occurrence, separate from residence. Precision and restricted-location handling U. | S V.2; no occurrence location in E02 | C / P; service office/DPO; D04/D05/D07 |
| DD22 Reporting period | Explicit start/end or source period code plus calendar/fiscal convention. Define boundary inclusion and timezone; creation year does not prove service year. | S V.4–5; E02 dataset reportingYear/reportingPeriod, observation period | C reporting / P semantics; MPDC/source owner; D03/D04/D06 |
| DD23 Indicator definition | Stable code, label, version, purpose, population, grain, unit, dimensions, source/method, formula, numerator/denominator, valid range, frequency, steward, sensitivity and acceptance evidence. Required fields depend on count/rate/type. | S V.2/V.4; E02 `StatisticalIndicator`, `StatisticalDimension`, `TableDimensionBinding` | C / P metadata; GFPS/sector office; D03/D08 |
| DD24 Count | Number of approved units at declared grain; nonnegative whole number when genuinely a count. State inclusion, repeats and coverage; missing is not zero. | S V.3–4; E02 manual sex counters and Decimal observations | P definition; source owner; D03/D04 |
| DD25 Numerator / denominator | Quantities with same declared population, scope and period as approved formula. Zero, unknown or incompatible denominator yields undefined/not calculable, not a fabricated rate. | S V.4 gaps/analysis; E02 indicator definition fields | P / U formulas; GFPS/sector office; D03 |
| DD26 Unit and numeric value | Declared unit, precision and rounding; distinguish people, events, currency and rates. Do not sum rates or mix incompatible units. Negative values may be valid for an approved change measure, not counts. | E02 observation Decimal(18,4); E07 finite numeric validator | P; GFPS/data owner; D03/D06 |
| DD27 Target versus actual | Planned intended output versus source-evidenced result; separate measures with comparable units. Manual historical total retains its reported nature. | S V.3/V.5; E02 `Program.targetMale/actualMale`, analogous female fields and accomplishments | C monitoring / P definition; service office; D04/D09 |
| DD28 Money / expenditure | Source currency and exact decimal amount; planned allocation and actual expenditure distinct. Conversion, attribution, rounding and applicable budget rules U. | S VIII/V.5; E02 program/plan/accomplishment Decimal(14,2) | C budget / P semantics; budget authority/GFPS; D06/D09/D13 |
| DD29 Gender issue/result | Human-reviewed source narrative tied to evidence; missing text remains incomplete. No generated assertion of completion. | S II/V.4–5; E02 `GADPlanItem.genderIssue/gadResult` | C / P; GFPS/MPDC; D09 |
| DD30 Report/template snapshot | Report type, template version, source versions, scope, period, dictionary/formula versions, generation time and authorized actor. Changes require identifiable correction lineage. | S V.5/XII.5; E02 existing plan/accomplishment; proposed snapshot | C reporting / P metadata; report owner; D06/D09 |

## Provenance, quality, confidentiality and lifecycle

| ID / concept | Proposed definition, type and validation | Source / current evidence | Status, proposed custodian and gates |
| --- | --- | --- | --- |
| DD31 Source reference | Agency/custodian, source document/file/table, source version/date, method, period, received date, reviewer and checksum or stable reference where appropriate; original source labels retained. | S VII.1/XII.2; E02 `StatisticalProvenance`, E07 dataset metadata | P; data owner; D01/D08 |
| DD32 Batch and correction lineage | Identifies submission, retry, original record/version, correction reason and reviewer; idempotence rule requires approved grain. No silent historical overwrite. | S IV/XII.2; E02 ingestionBatchId/provenanceId/audit | P; source owner; D04/D08 |
| DD33 Observation status | Measured zero, absent, unknown, invalid, suppressed and unavailable have separate meanings; explanatory reason where safe. Status must not be encoded as an invented numeric value. | E02 numericValue required/suppressionStatus; E07 default NONE | P / U vocabulary; GFPS/DPO; D03/D05 |
| DD34 Sensitivity and release | Classification, collection purpose, permitted audience/actions, release decision and evidence. Restricted person data, internal and public aggregates are candidate distinctions, not approved labels. | S V.1/V.6; E02 publication/suppression fields | C protection / P categories; DPO/service custodian; D05 |
| DD35 Suppression | Withheld output under approved release rules, including complementary totals and repeated filters; threshold/rule/version U. Never represent suppression as zero. | S V.6; E02 suppressionStatus/reason are mechanisms only | P; DPO/statistics owner; D05 |
| DD36 Publication/verification status | Source quality and permission to release are separate concepts; neither a technical OFFICIAL value nor a published flag proves official authenticity. Authorized transitions U. | E02/E07 publication DRAFT/VALIDATED/OFFICIAL/PUBLISHED/WITHDRAWN and verification states | P; MPDC/source owner; D08/D09 |
| DD37 Freshness/coverage | Source period, last validated update, expected cadence and known gaps; computation/display time distinct from source currency. No SLA invented. | S III.2/V.4/XII.2; E02 timestamps | C updating / P metadata; data owner; D08/D11 |
| DD38 Audit and evidence attachment | Actor/action/scope/time/result and permitted source evidence; minimize logged content and protect attachment access. Retention, holds and disposal U. | S V.1/V.6; E02 `AuditLog`, `MOVAttachment` | C accountability / P fields; DPO/operator; D05/D10 |

## Required category and population coverage

These are source labels, not a pre-approved taxonomy or counts. All category definitions, source forms, measure codes, update frequencies and named custodians remain U under D03/D08. Proposed review roles do not assign institutional authority. Use DD19/DD23/DD31 and scenarios AC06–AC09 for each service family.

| Source category / requirement | Proposed source/form to request and review role | Clarification gate |
| --- | --- | --- |
| Training/capacity development / M01 | Attendance and activity summary from delivering office | D04 repeat attendance versus distinct people |
| Livelihood / M02 | Recipient/service summary from designated livelihood office | D03/D04 program participation versus benefit |
| Employment / M02 | Approved employment measure/source from designated sector office | D03/D08 employment status versus program outcome |
| Health / M03 | Minimum approved health-service aggregate, MHO review | D05 sensitive fields and release |
| Social welfare/social services / M03 | Approved service/benefit summary, MSWDO review | D04/D05 recipient grain and confidentiality |
| WCPD/VAWC Desk / M04 | Approved protection-service summary from designated service custodian | D05 aggregate-only versus restricted minimum detail; no case files requested here |
| Consultations/decision-making / M05 | Participation/activity summary from convening office | D04 participation unit and eligible population |
| Gender-responsive benefits/policies/programs / M06 | Benefit reach definition and source from responsible office | D03/D04 access versus actual receipt |
| Education / M07 | Approved education indicator and period, designated sector office | D03/D08 enrollment or service measures cannot be assumed |
| Agriculture / M08 | Approved agriculture service/indicator source, designated office | D03/D08 separate agriculture definition |
| Fisheries / M08 | Approved fisheries service/indicator source, designated office | D03/D08 separate fisheries definition |
| Disaster risk reduction / M09 | Approved DRR gender indicator/source, designated office | D03/D05/D08 exposure and service figures distinct |

VI explicitly names women, men, children, youth, senior citizens, persons with disabilities, solo parents, farmers, fisherfolk, workers and other sectors. II/X additionally refer to girls and boys. These labels span sex, age and sector concepts; they are not mutually exclusive sector codes. For every label, D03 must specify definition, eligibility evidence, overlap, effective version and appropriate dimension before coding. No statutory ages, disability criteria, employment classifications or solo-parent eligibility are invented. Community organizations and LGU offices are project beneficiaries; that does not automatically make them individual service recipients or grant access to personal data.

## Candidate measures for consultation

All measures below are P, with source support in V.3–4; none is an approved official indicator. Each requires the complete DD23 definition, named source/update steward, D03/D04 counting rules and D05 release rule. Dimensions are candidates from V.2: sex, age band, barangay, sector, office, service/program and period; confidentiality may restrict combinations.

| Candidate | Grain, unit and proposed calculation | Unresolved choices / acceptance |
| --- | --- | --- |
| Registered records | Count accepted registry records within declared snapshot/scope; unit records; denominator not applicable | Not municipal population or distinct-person service reach; D04; AC06/AC08 |
| Activity attendance/service events | Count accepted participation units under approved episode key; unit attendance/episodes | Repeated visits and cancellations need D04 definition; aggregate inputs cannot prove individual identity; AC06 |
| Distinct beneficiaries | Count distinct approved person keys within stated service/scope/period; unit persons | Requires necessary, authorized linkage; unavailable where only totals exist; cross-office sum invalid without approved deduplication; AC06 |
| Participation share by source category | Eligible category participation divided by comparable total times 100; unit percent | Denominator population, unknown categories, overlap and zero-denominator behavior need D03/D04; AC05/AC08 |
| Gender gap / period comparison | Difference or ratio between approved comparable measures | Sign/direction, denominator, definitions, target and interpretation need GFPS confirmation; no automatic prioritization or claim of causal impact; AC08 |
| Target/actual variance | Actual minus target in same unit, period and population, if that convention is approved | Formula direction, percentage variant, financial rounding and historical corrections need D03/D06/D09; AC09/AC11 |

No official statistical observations, default denominators, age bands, policy thresholds or source mappings are supplied by this draft. Dictionary review must record approved, rejected or revised choices against each DD ID and version before dependent implementation.
