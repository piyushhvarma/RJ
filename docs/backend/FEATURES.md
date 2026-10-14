# FEATURES.md — Done / Not Done / Backlog

Status key: ✅ built (unverified — not yet run against a real DB) · 🟡
partially built / stubbed · ⬜ not started

## Backend

### Data model
- ✅ Full Prisma schema — Users, Customers, CustomerDocuments,
  BiometricEnrollment/VerificationLog, Loan/LoanScheme, JewelleryItem/Photo,
  Appraisal, Payment, LedgerEntry (append-only), Packet/StorageLocation/
  PacketMovement, Document/DocumentVersion, Notification, AuditLog,
  IdSequence.
- ⬜ Migration never actually run — **do this first**, before anything else.

### Auth & security
- ✅ JWT login (`auth/`), bcrypt password hashing
- ✅ `JwtAuthGuard` + `RolesGuard` + `@Roles()` decorator, enforced
  server-side on every controller
- ✅ `AuditService` — single write path for all `AuditLog` rows
- ⬜ MFA for privileged roles (PRD §85 requires it for Owner/Manager) — not
  implemented at all yet
- ⬜ Session/device tracking, login attempt throttling (PRD §58)
- ⬜ Rate limiting

### Customers
- ✅ Register, get by ID (with documents/biometric/loans included), search
  by name/mobile/code
- ⬜ KYC document upload endpoint (currently no file upload exists at all)
- ⬜ Customer photo capture endpoint
- ⬜ Digital signature capture endpoint

### Biometric
- ✅ `BiometricAdapter` interface + `MockBiometricAdapter` stub
- ✅ Enroll / verify / manual-fallback endpoints, with attempt counting and
  audit logging on failure
- ⬜ Real vendor SDK integration (no hardware procured yet — intentional)
- ⬜ Consent/notice flow (PRD §13.5) — not implemented

### Loans
- ✅ Create (DRAFT)
- ✅ Disburse (validates collateral + completed appraisal exist, moves to
  ACTIVE, writes DISBURSEMENT ledger entry)
- ⬜ Approve step as a distinct action (currently folded into disburse —
  PRD's state machine has APPROVAL_PENDING → APPROVED as separate from
  DISBURSED; worth revisiting whether to split these)
- ⬜ Renewal (§30)
- ⬜ Top-up (§29)
- ⬜ Part release of individual jewellery items (§31)
- ⬜ Overdue/notice/auction-eligible state transitions and the scheduled
  job that would drive them
- ⬜ HOLD status entry/exit workflow (§49)
- ⬜ Loan closure orchestration — **this is the highest-priority gap**:
  nothing currently ties biometric verification + final payment + packet
  retrieval + jewellery verification + gold release into one controlled,
  auditable flow. Each piece exists (biometric verify, payment receive,
  packet retrieve/release) but nothing sequences them per §43/§102's
  checklist or enforces §48's failed-closure conditions.

### Jewellery & Appraisal
- ✅ Item creation with server-computed net weight/valuation
- ✅ Photo attachment
- ✅ Appraisal confirm (appraiser) → approve+lock (manager) workflow
- ⬜ Amendment workflow for correcting a locked appraisal (PRD explicitly
  requires this exists, not just that locking works)
- ⬜ Jewellery category master list as a configurable table (currently
  `category` is a free-text string)
- ⬜ LTV engine (§21) — no LTV calculation or threshold-warning logic
  exists yet
- ⬜ Gold valuation engine separating market rate / internal rate /
  intrinsic value / loan amount (§20) — currently `valuationRate` is just
  taken as given per item, no rate-source tracking beyond the Appraisal
  record's `goldRateSource`/`goldRateValue`

### Payments & Ledger
- ✅ Receive payment with explicit component breakdown, validated against
  outstanding principal, writes ledger entries
- ⬜ **Interest engine (§24) — not built.** Interest/penalty components are
  currently trusted as given by the caller. This needs its own design pass:
  daily/monthly accrual, simple interest, rounding rules, grace period,
  overdue penalty schedule, and a way to preview "amount due today" before
  a payment is made.
- ⬜ Part-payment allocation policy as a configurable rule (currently the
  caller just supplies whatever breakdown they want, with no policy engine
  behind it)
- ⬜ Payment reversal/void workflow (record exists via `RecordLifecycle`
  field on `Payment`, but no service method changes it yet)

### Packets & Storage
- ✅ Create, store (with `StorageLocation` upsert + movement record),
  retrieve, release
- ⬜ Packet label / QR generation (no printable label or QR payload exists)
- ⬜ QR authenticated-lookup endpoint (§34 — scanning should require login,
  not expose data to an unauthenticated scan)
- ⬜ Physical inventory reconciliation flow (§72 — compare expected vs
  physically-scanned packet counts)
- ⬜ Safe access log / dual-authorization for safe access (§73)

### Documents
- ⬜ **Entire module not started.** Need: PDF generation for the pledge
  agreement (§38), jewellery annexure (§39), payment receipt (§27), closure/
  gold-release receipt (§47); document versioning with reasons (§42);
  verification codes + QR (§41); reprint tracking with visible "REPRINT"
  marking (§98/§99).

### Notifications
- ⬜ Not started. SMS/WhatsApp/email integration, plus the trigger rules
  in §92 (due-in-7-days, due-in-3-days, overdue, payment receipt, closure
  confirmation).

### Reports & Dashboard
- ⬜ Not started. Daily collection, outstanding/overdue loans, gold
  inventory, employee activity, financial reconciliation, closure reports
  (§68). Main dashboard KPIs (§52) and alerts (§53).

### Object storage
- ⬜ Not started. All `fileUrl`/photo fields currently just accept a plain
  string as if upload already happened via some other mechanism. Need an
  actual upload endpoint + S3-compatible storage wiring.

## Frontend
- ⬜ Nothing started. Next.js + TypeScript + Tailwind + shadcn/ui per the
  chosen stack. No pages, no API client, no auth flow, nothing.

## Suggested build order (highest leverage first)

1. **Get the backend running** — migrate, seed, boot, smoke-test every
   existing endpoint with a real Postgres instance. Fix whatever breaks.
2. **Loan closure orchestration** — the single most important missing
   piece; almost every other module's value depends on closure working
   correctly and safely.
3. **Documents module** — pledge document generation is required before a
   loan can realistically be used in a shop (physical signing workflow
   depends on it existing).
4. **Object storage + upload endpoints** — customer photo, jewellery
   photos, KYC docs, signed-document scans all need this; currently
   faked as plain strings.
5. **Interest engine** — needed before payments/closure amounts are
   trustworthy for real use.
6. **Frontend** — once the API is stable enough to build against.
7. **Notifications, reports, dashboard, LTV engine, valuation engine,
   renewals/top-ups/part-release** — round out toward full PRD scope.
