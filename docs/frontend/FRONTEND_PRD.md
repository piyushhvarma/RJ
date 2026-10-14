# FRONTEND_PRD.md — Screens, Wizards & UX Requirements

Condensed from the source PRD's frontend-relevant sections (§79–§102,
§97–§99). Section numbers (§N) refer to the original 132-section source
document.

## Navigation (§79)

```
Dashboard

Customers
 ├── All Customers
 ├── Add Customer
 └── Customer Search

Loans
 ├── Active
 ├── Due
 ├── Overdue
 ├── Closed
 └── Create Loan

Jewellery
 ├── Inventory
 ├── Appraisals
 └── Valuation

Payments
 ├── Receive Payment
 ├── Today's Payments
 └── Reconciliation

Packets
 ├── All Packets
 ├── Storage
 ├── Movement
 └── Exceptions

Closures
 ├── Pending
 ├── Verification
 └── Completed

Reports
Audit
Settings
```

Show/hide sections per the current user's role (see `context.md` §5).

## Dashboard (§52, §53)

Top-level KPIs: total active loans (₹), total outstanding (₹), total gold
pledged (kg), active customers, due today, overdue, closures today,
payments today (₹). Backend endpoints for these don't exist yet
(reports/dashboard aggregation is unbuilt — see `API_REFERENCE.md`) — this
screen will need backend work in parallel, or can start as static/mocked
while that's built.

Alerts, grouped by severity:
- **Critical:** packet missing, jewellery mismatch, unauthorized
  modification, failed biometric attempts, reconciliation mismatch
- **Warning:** loan overdue, document not signed, packet not stored,
  appraisal pending, payment pending
- **Info:** due tomorrow, renewal due, new loan created

## Loan creation wizard (§80, §81)

A guided, step-by-step wizard — not a single giant form:

1. Customer (search existing or register new)
2. KYC (upload/verify documents)
3. Jewellery (add items, weight, purity, photos)
4. Appraisal (appraiser confirms)
5. Valuation (computed from weight × purity × rate)
6. Loan (amount, interest scheme, maturity)
7. Review — a summary checklist screen before generating anything:
   ```
   CHECK EVERYTHING
   Customer: ✓ Name ✓ Mobile ✓ Photo ✓ KYC
   Jewellery: ✓ 3 Items ✓ 83.10g Net ✓ Photos
   Loan: ✓ ₹1,50,000 ✓ 2% Monthly ✓ Maturity: XX
   Packet: ✓ PKT-184
   Location: ✓ SAFE01-L03-S12-P07
   [CONFIRM & GENERATE DOCUMENT]
   ```
8. Generate Document (backend module not built yet — see
   `API_REFERENCE.md`; this step of the wizard will be blocked until that
   exists, build the UI shell but expect it to be a stub/placeholder for
   now)
9. Print
10. Physical Signing (explicit UI state — don't auto-advance past this;
    the whole point is that a printed document isn't "signed" until a
    human confirms the physical signature happened)
11. Packet Assignment
12. Storage (assign safe/locker/shelf/position — maps directly to
    `POST /packets/:id/store`, see `API_REFERENCE.md`)

Each step should be resumable — staff will get interrupted mid-wizard in a
real shop. Persist wizard progress somewhere (don't lose entered data on a
page refresh).

## Closure UI (§82, §102) — deliberately different visual treatment

This is the highest-risk workflow in the app; the PRD explicitly calls for
a distinct visual style (e.g. a different accent color, more confirmation
steps) so staff can't mistake it for a routine screen:

```
STEP 1  Loan Identification
STEP 2  Customer Verification
STEP 3  Fingerprint Verification
STEP 4  Final Settlement
STEP 5  Packet Retrieval
STEP 6  Jewellery Verification
STEP 7  Gold Release
STEP 8  Customer Acknowledgement
STEP 9  Close Loan
```

Closure screen should prominently display (§44):
```
CUSTOMER            [name]
LOAN                 [loan code]
ORIGINAL LOAN        ₹[amount]
PRINCIPAL OUTSTANDING ₹[amount]
INTEREST             ₹[amount]
PENALTY              ₹[amount]
TOTAL PAYABLE        ₹[amount]

[VERIFY CUSTOMER] [VERIFY FINGERPRINT] [RECEIVE PAYMENT]
[RETRIEVE PACKET] [RELEASE GOLD]
```

**Note:** the backend has no single closure-orchestration endpoint yet —
each of these buttons currently maps to a separate existing endpoint
(biometric verify, payment receive, packet retrieve, packet release — see
`API_REFERENCE.md`). Build the UI to walk through them in sequence and
block advancing past a failed/incomplete step, but know that the backend
doesn't yet enforce the full sequencing itself — treat the frontend's
step-gating as provisional until backend closure orchestration exists.

Before releasing, show the expected-vs-actual jewellery comparison (§45):
```
Expected Jewellery
1. Necklace — 43.10g — 22K
2. Ring — 10.00g — 22K
3. Bangle — 31.50g — 18K
```
with photos, for the staff member to physically compare against what's in
the packet.

## Customer profile (§55)

```
[Photo]
Name / Mobile / Address / KYC Status / Biometric Status
Active Loans → [list]
Closed Loans → [list]
Total Borrowed / Total Repaid / Total Interest
```

## Loan profile (§56)

```
Loan ID / Customer / Status / Created / Maturity
Financial Summary: Principal / Interest / Penalty / Outstanding
Collateral: [jewellery items]
Physical Custody: Packet / Safe / Locker / Shelf
Documents: Pledge / Appraisal / Receipts / Renewals / Closure
Timeline: [chronological audit events — see §74's example format]
```

## Search (§54)

Global search across: customer name, mobile, customer ID, loan ID, packet
ID, jewellery ID, QR/barcode, KYC reference, receipt number. Results
should only show what the current user's role is authorized to see.
Backend currently only has a customer-scoped search (`GET /customers?q=`)
— a true global search endpoint doesn't exist yet.

## Empty states (§96) — use these exact tones, not generic "no data"

```
No overdue loans.
No packets currently outside storage.
No pending closures.
No documents awaiting signature.
No reconciliation exceptions.
```

## Error messages (§95) — be specific, never generic

Bad: "Something went wrong." / "Verification failed."
Good: "Payment could not be completed because the loan is already closed."
Good: "Fingerprint verification failed. Attempt 2 of 3. Customer may retry
or proceed through authorized alternate verification."

The backend's error responses (NestJS `BadRequestException` etc.) already
carry specific messages like this — surface them directly rather than
replacing them with a generic toast.

## Usability & accessibility (§97) — this shop runs under time pressure

- Large buttons, minimal unnecessary screens, clear labels
- Strong visual status indicators (color + text, not color alone)
- Fast search, barcode/QR scanning support, camera shortcuts, print
  shortcut
- Keyboard shortcuts for common actions
- Responsive desktop/tablet UI (this runs on a shop PC/tablet, not
  primarily mobile)
- Prioritize speed and error prevention over decorative UI

## Performance targets (§83) — design against these, not just "make it fast"

- Normal screens: < 2 seconds
- Search: < 1 second for indexed queries
- Loan profile: < 2 seconds
- Document generation: < 5 seconds (when that backend module exists)
- Image upload: must show a progress indicator
- Reports: background/progress indication for large datasets

## Printing (§98, §99)

The app must support print preview, page numbering, margins, print-safe
layouts, and a PDF fallback. A reprinted document must visibly say
**"REPRINT"** — the UI needs a clear distinct state/badge for this, not
just a log entry buried somewhere.
