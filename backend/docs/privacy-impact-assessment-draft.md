# Technical privacy impact assessment draft

Prepared 2026-09-16 for LGU/DPO review. This is an engineering inventory and
open-decision register, not an approved PIA or legal compliance certification.
No lawful basis, retention duration or authority to disclose is inferred.

## Processing inventory

| Area | Data / purpose observed in application | Review required |
| --- | --- | --- |
| Accounts and authentication | User identity, email, role/office assignment; password hashes and token/session revocations support access control. | Account provisioning authority, access reviews, termination and account-record retention. |
| Beneficiaries | Names, demographic categories, address/contact and household references support program records. | Necessity of each field, lawful basis, notice, sensitive-data classification, permitted linkage and subject-request process. |
| Statistical observations | Values, dimensions, periods, geographic references and provenance support tabulation and reporting. | Whether imported dimensions identify people or households; approved suppression, aggregation and release criteria. |
| GAD plans/accomplishments and MOV | Budget/program records and uploaded evidence support review. Evidence files can contain personal information. | Accepted content, redaction, authorized reviewers, retention and any onward disclosure. |
| Citizen feedback | Name, email, subject, message and internal review notes support handling requests. | Approved notice and processing basis; avoid requesting unnecessary sensitive data; define recipient and deletion authority. |
| Audit/security records | Actor identifiers, actions and selected change metadata support investigation and accountability. | Necessity of recorded fields, reader privileges, retention, access-request handling and log export recipients. |

Flows to review: browser to backend API; backend to database and configured MOV
storage; role-scoped reads and exports back to the browser. Hosting locations,
processors/subprocessors, contractual arrangements and configured error-tracking
transfers need an environment-specific inventory. This local pass did not verify
production infrastructure or external disclosures.

## Risks and current safeguards

| Risk | Locally verified safeguard | Residual question / action |
| --- | --- | --- |
| Revoked sessions reused after restart or on another process | Shared durable checks, fail-closed storage errors, session-wide logout and atomic refresh consumption. | Operational availability and deployed database privileges need separate verification. |
| Internal details exposed in errors | Production unexpected errors return generic messages. | Review individual domain responses and approved diagnostic access. |
| Feedback exposed broadly | ADMIN/SUPER_ADMIN review; metadata-only listing; audited private detail reads; migration denies direct anonymous/authenticated database access. | Approve reviewer assignments and retention; confirm deployed migration before use. |
| Statistical searches reveal hidden data | Office/publication scope applied before matching and aggregation; suppressed observations excluded. | Suppression correctness and re-identification risk across small cells require approved statistical rules. |
| Unauthorized or untraceable approval | Shared GAD state/budget gates, protected submitted/approved plans, transactional workflow audit. | Named actor chain and delegation rules are awaiting LGU policy. |
| Narrative edits erase financial/demographic totals | Partial update schemas preserve omitted values. | Review source-data quality and correction responsibilities. |
| Excess collection or indefinite retention | No invented retention period or automatic deletion introduced. | LGU/DPO must decide necessity, retention triggers, legal holds, deletion authorization and evidence. Waiting is an unresolved risk, not mitigation. |
| Unapproved breach notices or integrations | No automated notification/submission introduced by this pass. | Establish incident owners, assessment/escalation process, authorized recipients and integration contracts. |

## Required review and sign-off

The LGU/DPO should document processing owners, purposes and lawful bases;
categories of data subjects and information; notices and rights-request handling;
processors and transfers; retention and disposal rules; incident responsibilities;
and risk severity/likelihood with approved mitigations. Obtain representative
source files through an approved channel to assess detailed CBMS disclosure risk.
Do not activate automated deletion, named approval chains or external submissions
from draft CMS settings. Record the approver, policy version and effective date
when these decisions become authoritative.

Reference material for the reviewer: [NPC PIA guidance](https://www.privacy.gov.ph/wp-content/uploads/2022/01/NPC_AdvisoryNo.2017-03.pdf),
[NPC privacy manual guidance](https://privacy.gov.ph/creating-a-privacy-manual/),
and [NPC breach reporting guidance](https://privacy.gov.ph/pips-and-pics/breach-reporting/).
These sources do not establish TAGAD's compliance or resolve its processing facts.
