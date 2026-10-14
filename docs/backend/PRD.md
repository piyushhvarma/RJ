# PRD.md — Gold Loan & Pledge Management ERP (implementation-focused)

This is a condensed, engineering-oriented version of the full product
requirements document for Radhika Jewellers / Silveransh's Gold Loan &
Pledge Management ERP. The original source PRD (132 sections, shared by
the product owner) is the ultimate source of truth for edge cases and
nuance — treat this file as the "what to build, in what order, and why"
summary. Section numbers below (§N) refer to the original PRD's numbering
so you can cross-reference.

## Product vision

The system should answer, for any pledge, within seconds: who owns this
gold, what loan is it attached to, exactly what jewellery is inside the
packet, where is the packet physically stored, how much is outstanding,
what documents were signed, who handled it, and what happens when the
customer comes to close it — without relying on an employee's memory.

## Core principles (§4)

1. **Physical reality must map to digital reality** — every pledge has a
   unique pledge ID, packet ID, customer ID, jewellery IDs, storage
   location, QR/barcode, documents, and a financial ledger.
2. **Financial records are append-only** — payments, reversals,
   adjustments never overwrite; old value, new value, user, timestamp,
   reason, and authorization are all preserved.
3. **No silent modification** — loan amount, principal, interest rate,
   gold weight, purity, valuation, payment, closure status can never
   change without proper permission and an audit trail.
4. **Gold is a physical asset independent of financial status** — a loan
   can be financially CLOSED while the gold is still not RELEASED, until
   the physical release workflow completes.
5. **Biometric verification supplements, never replaces**, the full
   closure workflow — there must always be an authorized fallback path.

## User roles (§7) — enforce these server-side, not just in the UI

| Role | Can | Cannot |
|---|---|---|
| **Owner** | Everything | — |
| **Manager** | Create/approve loans, approve appraisals/top-ups/adjustments, process closures, authorize gold release, view reports | Delete audit history, change system owner, modify immutable financial records |
| **Appraiser** | Create appraisal, record weight/purity, upload jewellery photos, enter valuation | Release gold, alter payments, close loans, modify completed transactions |
| **Cashier** | Receive payments, generate receipts, process permitted renewals | Change appraisal/principal, release gold, modify customer identity |
| **Staff** | Register customers, capture photos, upload docs, create preliminary loan entries, print | Sensitive actions need authorization |

Critical test cases to keep passing as you build (§118):
- Staff attempting to change an approved loan amount → **denied**
- Cashier attempting gold release → **denied**
- Fingerprint mismatch → **release blocked**
- Packet missing → **closure blocked**
- Payment short by any amount → **closure blocked**
- Jewellery count mismatch → **release blocked**
- Attempt to delete a payment → **unavailable, reversal workflow required instead**

## The core entity chain

```
Customer → KYC → Photo → Biometric Enrollment
   → Loan → Jewellery (weight/purity/photos) → Appraisal → Valuation
   → Document Generation → Print → Physical Signature
   → Packet → QR/Barcode → Safe/Locker → STORED
   → Payments / Renewal / Top-up (loan ACTIVE)
   → Closure: Customer Verification → Biometric → Final Payment
     → Packet Retrieval → Jewellery Verification → Gold Release
     → Customer Acknowledgement → CLOSED
```

## Loan state machine (§23)

```
DRAFT → APPRAISAL_PENDING → APPRAISED → APPROVAL_PENDING → APPROVED
  → DOCUMENT_PENDING → DISBURSED → ACTIVE → OVERDUE → NOTICE
  → AUCTION_ELIGIBLE → AUCTIONED → CLOSED
```
(`HOLD` can be entered from most active states for disputes — §49.)

## Packet state machine (§40, §100)

```
CREATED → SEALED → STORED → IN_CLOSURE_PROCESS → RETRIEVED → RELEASED
```
A packet's status must never claim `STORED` before storage is actually
confirmed, and never `RELEASED` before the physical handover happened.

## Document status (§40, distinct from loan/packet status)

```
GENERATED → PRINTED → SIGNED_PHYSICALLY → PACKET_CREATED → STORED
```
Never mark a document as signed just because it was printed.

## Non-negotiable business rules (§109 — enforce these in code, not docs)

- BR-001: every active loan must have ≥1 active collateral item
- BR-002: every collateral item belongs to exactly one active pledge
- BR-003: every stored pledge must have a physical location
- BR-004/BR-005: every payment belongs to a loan and has a receipt
- BR-006: every closed loan has zero outstanding balance unless an
  authorized exception exists
- BR-007/BR-008: gold cannot be released before closure authorization;
  release must create an audit event
- BR-009/BR-010: critical loan changes require authorization; financial
  transactions cannot be silently edited
- BR-011/BR-012: a packet can't be simultaneously stored and released;
  released jewellery can't remain active collateral
- BR-013/BR-014: a biometric mismatch can't be silently ignored; manual
  override requires authorization + reason

## MVP scope (§103) — this is what "V1" means

- **Customer:** registration, photo, KYC, signature, search
- **Jewellery:** items, weight, purity, photos, appraisal
- **Loan:** creation, interest, payments, outstanding, closure
- **Documents:** A4 pledge document, jewellery annexure, payment receipt,
  closure receipt
- **Physical custody:** packet ID, QR, safe/locker/location, movement
- **Security:** roles, permissions, audit logs
- **Biometric:** enrollment, verification, closure integration

Explicitly OUT of scope for V1 (§6): public customer mobile app, automated
auction marketplace, AI jewellery valuation, facial recognition,
crypto/payment tokens, third-party lending, automatic RBI/legal compliance
certification, full accounting ERP replacement, multi-country ops.

## Compliance note (§13.5, §87, §129)

India's DPDP framework (2025 Rules, phased commencement) requires clear
notices, purpose limitation, and reasonable security safeguards. RBI's
gold-lending framework has requirements around assaying, ownership
verification, safe custody, and transparent procedures for regulated
entities. **This system should be compliance-ready, not falsely marketed
as compliant** — the exact regulatory obligations depend on the business's
legal structure and lending model, which should be confirmed with counsel
before production deployment. Don't hard-code specific regulatory
thresholds as if they're universally correct.

## Key KPIs the product is optimized around (§120–124)

- Packet retrieval time: **< 60 seconds** from authorized search to
  location.
- **100%** of active packets have a valid digital location (no
  `LOCATION = UNKNOWN`).
- Digital ledger reconciles exactly with physical cash/payment — any
  discrepancy creates an exception, never a silent adjustment.
- **100%** of active pledges have a generated, traceable pledge document.
- Biometric: track enrollment success rate, failed-verification rate,
  fallback count — **do not** optimize for "100% biometric success"; false
  rejects and hardware issues are normal and expected.

For anything not covered here — printing/reprint rules, specific screen
layouts, report formats, the full field lists for every entity — refer to
the original 132-section source PRD.
