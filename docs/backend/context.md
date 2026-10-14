# context.md — Gold Loan & Pledge Management ERP

Read this file first. It tells you what this project is, what already
exists, what conventions to follow, and where to look for the rest of the
detail. The other files in this folder (`PRD.md`, `FEATURES.md`,
`ARCHITECTURE.md`) are referenced from here — read them when this file
points you to them, not necessarily all up front.

---

## 1. What this is

A production system for a jewellery shop (**Radhika Jewellers / Silveransh**,
based in India) that lends money against pledged gold jewellery. This is
**not** a generic CRUD app — it's a digital control layer around a physical
operation. Every rupee, every gram of gold, every document, and every
physical movement of a packet in/out of a safe must be traceable years
later. Read `PRD.md` for the full requirements; the one sentence that
matters most is:

> No important physical or financial event should exist without a
> corresponding digital record, and no digital status should claim
> completion before the corresponding physical operation has actually
> happened.

The business is owned by Piyush's family (the "girvi"/gold-lending business
in the Vidarbha region) and is connected to Silveransh, a D2C silver
jewellery brand run by Piyush's brother Ankit, where Piyush has done prior
software/ops work.

## 2. Current status (read this before writing any code)

The **backend** is partially built. It has NOT been run or tested yet —
it was written in an environment with no database access and no ability to
run `npx prisma generate`/`migrate`. Treat everything as "should work,
unverified" until you've actually booted it against a real Postgres
instance and exercised the endpoints.

See `FEATURES.md` for the exact done/not-done breakdown. Short version:

**Done:** Prisma schema (full MVP data model), auth (JWT + roles), audit
logging, ID generation, Customers, Biometric (mocked adapter), Loans
(create + disburse), Jewellery + Appraisal workflow, Packets (create/store/
retrieve/release), Payments (manual allocation, no interest engine yet).

**Not done:** Interest engine (§24 of the PRD — this is a real, nontrivial
piece, don't fake it), Document generation (PDF pledge documents, receipts),
Loan closure orchestration (the thing that ties biometric verification +
final payment + packet release + jewellery verification together into one
controlled flow), Notifications, Reports, the entire frontend (Next.js),
and file/object storage for photos and documents (currently DTOs just take
a `fileUrl` string as if upload already happened elsewhere).

**No frontend exists at all yet.** Only a NestJS backend.

## 3. Tech stack (already chosen, don't re-litigate)

- **Backend:** NestJS (TypeScript), ESM project (`"type": "module"` in
  package.json) — see the gotcha in §5 below, this matters a lot.
- **ORM:** Prisma 6, PostgreSQL.
- **Auth:** JWT via `@nestjs/jwt`, bcrypt password hashing, role-based
  guards enforced server-side (never trust the frontend to hide a button).
- **Frontend (not yet started):** Next.js + TypeScript, Tailwind CSS +
  shadcn/ui.
- **Object storage (not yet wired up):** S3-compatible, planned but not
  implemented — photo/document upload endpoints don't exist yet, only
  fields that accept a `fileUrl` string.

## 4. Where things live

```
gold-loan-erp/
  backend/
    prisma/
      schema.prisma       ← the entire data model, read this first
      seed.ts              ← creates one OWNER user for local testing
    src/
      app.module.ts        ← wires every feature module together
      main.ts               ← global ValidationPipe + CORS here
      prisma/               ← PrismaService/PrismaModule (thin wrapper)
      auth/                 ← login, JWT issuing (global module)
      common/
        decorators/         ← @Roles(), @CurrentUser()
        guards/              ← JwtAuthGuard, RolesGuard
        services/            ← IdGeneratorService (CUS-2026-000001 etc.)
      audit/                ← AuditService — the ONLY place AuditLog rows
                               get written from
      biometric/            ← BiometricAdapter interface + MockBiometricAdapter
      customers/
      loans/
      jewellery/
      appraisal/
      packets/
      payments/
  context.md               ← this file
  PRD.md                   ← condensed, implementation-focused requirements
  FEATURES.md               ← done/not-done checklist, prioritized backlog
  ARCHITECTURE.md            ← data model + design pattern reference
```

Each feature module follows the same shape: `*.controller.ts` (routes +
`@Roles()`), `*.service.ts` (business logic + Prisma calls), `*.module.ts`
(wiring), `dto/*.dto.ts` (class-validator DTOs). **Follow this shape for
any new module** — don't invent a different structure.

## 5. Critical gotcha: this is an ESM project

`tsconfig.json` has `"module": "nodenext"` and `"moduleResolution":
"nodenext"`. This means **every relative import needs an explicit `.js`
extension**, even though the source files are `.ts`:

```ts
// CORRECT
import { PrismaService } from '../prisma/prisma.service.js';

// WRONG — will fail at runtime even though it type-checks fine in some setups
import { PrismaService } from '../prisma/prisma.service';
```

This bit us once already while building this — every file in the current
codebase has been fixed to do this correctly. **Any new file you write
must follow this convention too**, or the build will fail in ways that are
confusing to debug. Package imports (`from '@prisma/client'`, `from
'@nestjs/common'`) do NOT need `.js` — only relative imports (`./` or
`../`).

## 6. Conventions already established — follow these, don't reinvent

- **Every human-readable ID** (customer, loan, jewellery item, packet,
  payment, biometric enrollment) is issued via `IdGeneratorService.next()`,
  which atomically increments a row in the `IdSequence` table inside the
  same transaction as the entity creation. Never hand-roll an ID scheme
  for a new entity type — add a new prefix to `IdGeneratorService` instead.
- **Every privileged/sensitive mutation writes an `AuditLog` row** via
  `AuditService.log()`, inside the same Prisma transaction as the mutation
  itself, so an action and its audit trail either both commit or both
  roll back. Look at any existing service (e.g. `customers.service.ts`,
  `loans.service.ts`) for the pattern before writing a new one.
- **Financial state is never a mutable balance column.** It's derived from
  the append-only `LedgerEntry` table (see `payments.service.ts`'s
  `outstandingPrincipal()` for the pattern). Don't add a `balance` field to
  `Loan` and start mutating it directly — that violates the append-only
  principle the whole PRD is built around (§4.2/§25).
- **Roles are enforced server-side only**, via `@UseGuards(JwtAuthGuard,
  RolesGuard)` + `@Roles(UserRole.X, ...)` on controllers. Every new
  controller needs both guards. Check `PRD.md` §7 for exactly which roles
  can do what before deciding which roles to allow on a new endpoint.
- **State machines matter.** `Loan.status`, `Packet.status`,
  `Appraisal.status`, `Document.status` all have specific enums with
  specific legal transitions described in the PRD. Don't let an entity
  jump straight to a terminal state (e.g. a loan going straight to
  `CLOSED` without going through the closure checklist) — validate the
  current state before transitioning, the way `loans.service.ts`'s
  `disburse()` does.
- **The biometric device is abstracted behind an interface**
  (`BiometricAdapter` in `biometric/biometric.interface.ts`) with a mock
  implementation (`MockBiometricAdapter`) wired in via the
  `BIOMETRIC_ADAPTER` injection token in `biometric.module.ts`. When real
  hardware is procured, write a new class implementing the same interface
  and swap the `useClass` in that one module — don't let any other file
  reference the mock directly.
- **No hard deletes.** Anything with a `RecordLifecycle` field (`ACTIVE`,
  `VOIDED`, `CANCELLED`, `REVERSED`, `ARCHIVED`) gets its lifecycle field
  changed, never a `DELETE` — see PRD §60.

## 7. What NOT to do

- Don't implement the interest engine as a quick inline formula "for now."
  It needs its own careful design (rounding rules, grace periods, overdue
  penalty, renewal handling) — see PRD §24 and treat it as a dedicated task.
- Don't wire up a real biometric SDK without asking — there's no hardware
  procured yet, the mock is intentional and documented.
- Don't build the frontend and backend features in the same pass without
  checking in — this is a big surface area, work in reviewable chunks.
- Don't mark a loan `CLOSED` or a packet `RELEASED` without going through
  the checklist described in PRD §102/§48 (payment confirmed, biometric
  verified or authorized fallback, jewellery count verified, etc.) — those
  are business rules (BR-006 through BR-013), not suggestions.
- Don't add `console.log`-only "audit trails." Use `AuditService.log()`.

## 8. Environment

`.env` in `backend/` already has the shape needed
(`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`,
`SEED_OWNER_EMAIL`/`SEED_OWNER_PASSWORD`). This has NOT been run against a
real database yet — do that first (`npx prisma generate` then
`npx prisma migrate dev --name init`, then `npm run seed`, then
`npm run start:dev`) and report back anything that breaks before writing
new code, since the schema itself is unverified.

## 9. Where to go next

Check `FEATURES.md` for the prioritized backlog. In order of what unlocks
the most value next: (1) get the backend actually running and fix any
schema/type issues that surface, (2) Document generation module, (3) Loan
closure orchestration, (4) Notifications, (5) start the Next.js frontend
against the now-verified API, (6) interest engine, (7) reports.
