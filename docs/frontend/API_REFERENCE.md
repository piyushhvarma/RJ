# API_REFERENCE.md — Current Backend Endpoints

This reflects the backend code as it currently exists. **The backend has
not been run against a real database yet** — treat this as "should be
accurate to the code" rather than "verified correct." If an endpoint
behaves differently than documented here once the backend is actually
running, trust the running behavior and flag the mismatch.

Base URL: whatever `PORT` is set to locally (default `http://localhost:3000`).

All endpoints except `POST /auth/login` require:
```
Authorization: Bearer <accessToken>
```
A 401 means missing/invalid/expired token. A 403 means the token is valid
but the user's role isn't allowed to call that endpoint.

---

## Auth

### `POST /auth/login`
No auth required.

Request:
```json
{ "email": "string", "password": "string (min 8 chars)" }
```
Response:
```json
{
  "accessToken": "string",
  "user": { "id": "string", "employeeCode": "string", "name": "string", "role": "OWNER|MANAGER|APPRAISER|CASHIER|STAFF" }
}
```
401 on bad credentials or disabled user — message is intentionally generic
either way ("Invalid credentials").

---

## Customers

### `POST /customers`
Roles: OWNER, MANAGER, STAFF

Request:
```json
{
  "fullName": "string",
  "guardianName": "string?",
  "dateOfBirth": "ISO date string?",
  "mobile": "string",
  "alternateMobile": "string?",
  "address": "string?",
  "city": "string?",
  "state": "string?",
  "pincode": "string?",
  "occupation": "string?"
}
```
Response: the created `Customer` row (includes generated `customerCode`
like `CUS-2026-000001`). Note: no photo/signature upload yet — those
fields exist on the model but there's no endpoint to set them.

### `GET /customers?q=<search term>`
Any authenticated role. Matches against name, mobile, or customer code
(case-insensitive). Omit `q` to get the 25 most recent customers.

### `GET /customers/:id`
Any authenticated role. Returns the customer plus `documents`, `biometric`,
and `loans` (most recent first).

---

## Biometric (nested under a customer)

### `POST /customers/:customerId/biometric/enroll`
Roles: OWNER, MANAGER, STAFF

No request body needed. Calls the (currently mocked) biometric adapter,
creates a `BiometricEnrollment` row, sets `customer.biometricStatus`.

### `POST /customers/:customerId/biometric/verify`
Roles: OWNER, MANAGER, CASHIER

Request:
```json
{ "loanId": "string?" }
```
Response includes `result` (`MATCH`/`NO_MATCH`/`DEVICE_ERROR`),
`attemptsRemaining`, and `fallbackAvailable` (true once 3 attempts are
used). 404 if the customer has no enrollment on file.

**Mock adapter behavior for testing:** the mock always returns `MATCH`
unless the stored `templateRef` happens to end in `-fail` (there's no way
to trigger this through the API today since enrollment always generates a
random success template — this is a testing seam for backend/integration
tests, not something the frontend can currently drive).

### `POST /customers/:customerId/biometric/fallback`
Roles: OWNER, MANAGER only

Request:
```json
{ "reason": "string", "approvedById": "string", "loanId": "string?" }
```
Records an authorized manual override when biometric verification can't
succeed. `approvedById` should be a manager/owner's user ID — the UI
should make it clear this is a second person authorizing, not just the
current user re-confirming.

---

## Loans

### `POST /loans`
Roles: OWNER, MANAGER, STAFF

Request:
```json
{ "customerId": "string", "schemeId": "string?", "principalAmount": "number?" }
```
Creates a loan in `DRAFT` status. `principalAmount` at this stage is
optional/provisional — the real amount is locked in at disburse time.

### `GET /loans/:id`
Any authenticated role. Returns the loan with `customer`, `jewelleryItems`
(with photos), `appraisals`, `payments`, `ledgerEntries`, `packet` (with
`storageLocation`), and `documents`.

### `POST /loans/:id/disburse`
Roles: OWNER, MANAGER only

Request:
```json
{
  "principalAmount": "number (positive)",
  "interestRate": "number",
  "interestType": "MONTHLY_SIMPLE|DAILY_SIMPLE|ANNUAL_SIMPLE|CUSTOM",
  "processingCharges": "number?",
  "maturityDate": "ISO date string"
}
```
Preconditions enforced server-side (400 if not met): loan must currently
be `DRAFT` or `APPROVED`, must have ≥1 jewellery item, and must have an
appraisal with status `MANAGER_APPROVED` or `LOCKED`. On success: loan →
`ACTIVE`, writes a `DISBURSEMENT` ledger entry.

---

## Jewellery

### `POST /jewellery`
Roles: OWNER, MANAGER, APPRAISER

Request:
```json
{
  "loanId": "string",
  "category": "string",
  "description": "string",
  "grossWeight": "number (positive, grams)",
  "stoneWeight": "number? (default 0)",
  "purityKarat": "string (e.g. \"22K\")",
  "fineness": "integer? (e.g. 916)",
  "valuationRate": "number (positive, rate per gram)",
  "hallmarkDetails": "string?",
  "identifyingMarks": "string?",
  "condition": "string?",
  "ownershipDeclaration": "boolean?",
  "appraisalRemarks": "string?"
}
```
`netWeight` and `valuation` are computed server-side — don't send them,
they'll be ignored (`ValidationPipe` strips unknown fields). 400 if the
loan's appraisal is already `LOCKED`. On success, if the loan was `DRAFT`
it moves to `APPRAISAL_PENDING`.

### `POST /jewellery/:id/photos`
Roles: OWNER, MANAGER, APPRAISER, STAFF

Request:
```json
{ "angle": "string (e.g. \"front\", \"back\", \"close_up\", \"hallmark\")", "fileUrl": "string" }
```
**No actual upload endpoint exists** — `fileUrl` is expected to already be
a valid URL. Object storage/upload is not built yet (see the backend
project's `FEATURES.md`). The frontend will need either a temporary direct-
to-somewhere upload solution or to wait for that backend piece.

### `GET /jewellery?loanId=<id>`
Any authenticated role. Returns items with their photos, ordered by item
code.

---

## Appraisal

### `POST /appraisals`
Roles: OWNER, MANAGER, APPRAISER

Request:
```json
{ "loanId": "string", "goldRateSource": "string?", "goldRateValue": "number?", "notes": "string?" }
```
400 if the loan has no jewellery items yet.

### `POST /appraisals/:id/confirm`
Roles: OWNER, MANAGER, APPRAISER

No body. Only legal from status `DRAFT`. Moves appraisal to
`APPRAISER_CONFIRMED` and the loan to `APPRAISED`.

### `POST /appraisals/:id/approve`
Roles: OWNER, MANAGER only

Request:
```json
{ "notes": "string?" }
```
Only legal from status `APPRAISER_CONFIRMED`. Moves appraisal straight to
`LOCKED` (approval and locking are the same event in this system) and the
loan to `APPROVED`.

---

## Packets

### `POST /packets`
Roles: OWNER, MANAGER, STAFF

Request:
```json
{ "loanId": "string" }
```
400 if the loan already has a packet. Creates with status `CREATED`.

### `POST /packets/:id/store`
Roles: OWNER, MANAGER, STAFF

Request:
```json
{ "branch": "string? (default \"Main Branch\")", "safe": "string", "locker": "string", "shelf": "string", "position": "string" }
```
Upserts a `StorageLocation` (label built as `{safe}-L{locker}-S{shelf}-P{position}`),
sets packet status to `STORED`, records a movement entry. 400 if the
packet is already `RELEASED`.

### `POST /packets/:id/retrieve`
Roles: OWNER, MANAGER only

Request:
```json
{ "reason": "string" }
```
Only legal from status `STORED`. Moves to `IN_CLOSURE_PROCESS`, records a
movement entry (no destination location yet).

### `POST /packets/:id/release`
Roles: OWNER, MANAGER only

No body. Only legal from `IN_CLOSURE_PROCESS` or `RETRIEVED`. Moves to
`RELEASED`. **This does not check anything else** — it doesn't itself
verify payment was completed, biometric passed, or jewellery was counted.
Those checks are the frontend/orchestration's responsibility until a real
closure-orchestration backend module exists — see the backend project's
`FEATURES.md`.

### `GET /packets/:id`
Any authenticated role. Returns the packet with `storageLocation`,
`movements` (chronological), and `loan`.

---

## Payments

### `POST /payments`
Roles: OWNER, MANAGER, CASHIER

Request:
```json
{
  "loanId": "string",
  "amount": "number (positive)",
  "mode": "CASH|UPI|BANK_TRANSFER|OTHER",
  "principalComponent": "number? (default 0)",
  "interestComponent": "number? (default 0)",
  "penaltyComponent": "number? (default 0)",
  "otherCharges": "number? (default 0)",
  "transactionRef": "string?",
  "notes": "string?"
}
```
**The four components must sum exactly to `amount`** (400 otherwise) —
the frontend needs to compute/validate this before submitting, since
there's no server-side interest calculation to fall back on yet (interest
engine isn't built — see backend `FEATURES.md`). `principalComponent`
can't exceed the loan's current outstanding principal (also 400). Loan
must be `ACTIVE`, `OVERDUE`, or `NOTICE`.

### `GET /payments?loanId=<id>`
Any authenticated role. Most recent first.

---

## What's NOT here yet (don't build UI that assumes these exist)

- Document generation/retrieval (`/documents/...`) — no endpoints at all
- Loan closure as a single orchestrated action — currently just the
  individual biometric/payment/packet endpoints above, called separately
- Renewals, top-ups, part-release (`/loans/:id/renew`, `/topup`, etc.)
- Notifications (SMS/WhatsApp/email)
- Reports/dashboard aggregation endpoints
- File/photo upload (only `fileUrl` string fields exist)
- Global cross-entity search (only `GET /customers?q=` exists)
- User management endpoints (creating Owner/Manager/etc. accounts —
  currently only done via the seed script)

Cross-check against the backend project's own `FEATURES.md` before relying
on anything not listed above, in case it's been built since this doc was
written.
