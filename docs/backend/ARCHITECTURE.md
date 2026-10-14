# ARCHITECTURE.md — Data Model & Design Patterns

## Entity relationship overview

```
User (role: OWNER/MANAGER/APPRAISER/CASHIER/STAFF)
   │  (referenced by *ById string fields everywhere — see §"Attribution" below)
   │
Customer ──< CustomerDocument (KYC)
   │      ──< BiometricEnrollment (1:1)
   │      ──< BiometricVerificationLog
   │      ──< Notification
   │
   └──< Loan ──< JewelleryItem ──< JewelleryPhoto
          │  ──< Appraisal
          │  ──< Payment
          │  ──< LedgerEntry (append-only)
          │  ──< Document ──< DocumentVersion
          │  ──1:1── Packet ──< PacketMovement
          │                 ──> StorageLocation
          │  ──< BiometricVerificationLog (loan-scoped attempts)

AuditLog — references entities by (entityType, entityId) string pair,
           NOT foreign keys — so it can outlive anything it points to.

IdSequence — one row per (prefix, year), backs every human-readable code.
```

## Design patterns used throughout — replicate these, don't invent new ones

### 1. Human-readable IDs via `IdGeneratorService`

Every entity that needs a display code (`CUS-2026-000001`, `GL-2026-000184`,
`PAY-2026-001927`, `BIO-2026-000184`, `PKT-2026-000184`) gets it from
`IdGeneratorService.next(prefix, tx)`, called **inside the same
transaction** as the entity's creation. This does an atomic upsert+increment
on `IdSequence` so concurrent requests never collide or reuse a number.

Jewellery items are the one exception — they're numbered relative to their
parent loan (`GL-2026-000184-01`, `-02`, ...) via
`IdGeneratorService.jewelleryItemCode(loanCode, sequenceInLoan)`, not a
global sequence.

**If you add a new entity that needs a display code:** add its prefix to
the `IdPrefix` type in `id-generator.service.ts` and call `.next()` inside
your creation transaction. Don't hand-roll a counter.

### 2. Audit logging via `AuditService`

`AuditService.log()` is the only function that writes to `AuditLog`. Every
service method that performs a sensitive mutation calls it, passing the
same `tx` (Prisma transaction client) used for the mutation itself, so the
action and its audit record commit or roll back together. Look at
`customers.service.ts::create()` or `loans.service.ts::disburse()` for the
canonical shape:

```ts
return this.prisma.$transaction(async (tx) => {
  const result = await tx.someModel.create({ ... });
  await this.audit.log({ entityType, entityId, action, userId, roleAtTime, ... }, tx);
  return result;
});
```

`AuditLog.userId` is a plain string, not a hard cascading foreign key —
this is deliberate, so that disabling or removing a `User` row can never
take historical audit records down with it (PRD BR-010 / TC-010).

### 3. Append-only financial ledger

`Loan` has no `balance` or `outstanding` column. Financial position is
always derived by summing `LedgerEntry` rows for that loan (see
`payments.service.ts::outstandingPrincipal()`). When you need "current
outstanding," write a derivation function like that one rather than adding
a mutable field — mutable balance fields are exactly what PRD §4.2/§25
prohibit, since they can silently drift from the transaction history and
can't be reconstructed for an audit years later.

### 4. Role enforcement, always server-side

Every controller has `@UseGuards(JwtAuthGuard, RolesGuard)` at the class
level, and every route that needs restricting has `@Roles(UserRole.X, ...)`
on the handler. `JwtAuthGuard` verifies the bearer token and attaches
`{ id, employeeCode, role }` to `request.user`; `RolesGuard` reads the
`@Roles()` metadata and checks it against `request.user.role`. Pull the
current user in a handler via the `@CurrentUser()` param decorator — never
trust a `userId` passed in the request body for "who performed this
action."

### 5. Vendor/hardware abstraction (biometric today, likely printer/camera
   later)

`biometric/biometric.interface.ts` defines `BiometricAdapter` — the only
contract the rest of the app is allowed to depend on. `MockBiometricAdapter`
implements it today; `biometric.module.ts` binds the interface to the mock
via a DI token (`BIOMETRIC_ADAPTER`). To add a real vendor's SDK, write a
new adapter class implementing the same interface and change one `useClass`
line in `biometric.module.ts`. **Nothing else in the codebase should ever
import `MockBiometricAdapter` directly** — always depend on
`BIOMETRIC_ADAPTER` / `BiometricAdapter`.

If/when camera or printer integrations need the same hardware-swappability
(PRD §64/§65 mention this pattern generally), follow the same shape:
interface → DI token → swappable implementation.

### 6. State machines are validated, not assumed

Every service method that transitions an entity's status checks the
current status first and throws `BadRequestException` if the transition
isn't legal (see `loans.service.ts::disburse()`, `appraisal.service.ts`,
`packets.service.ts::release()`). When adding a new transition, check
`PRD.md`'s state machine diagrams for what's actually legal before writing
the check — don't just let any status jump to any other status.

### 7. Lifecycle instead of delete

Records with a `RecordLifecycle` field (`ACTIVE`/`VOIDED`/`CANCELLED`/
`REVERSED`/`ARCHIVED`) — currently `Customer` and `Payment` — should be
"soft-transitioned" via that field, never actually `DELETE`d through
normal application code. If you add void/reversal endpoints, they should
update this field (with an audit log entry and a reason), not call
`.delete()`.

## Module wiring conventions

Each feature module (`customers/`, `loans/`, etc.) is a self-contained
Nest module: `*.module.ts` imports `CommonModule` (for
`IdGeneratorService`) and `AuditModule` (for `AuditService`) as needed, and
does **not** re-register `JwtModule` — that's configured once, globally,
in `AuthModule` (`@Global()` + `JwtModule.registerAsync(...)` reading
`JWT_SECRET` from config). Any module using `JwtAuthGuard` gets `JwtService`
injected for free because of that global registration — don't add
`JwtModule.register({})` to a feature module, it'll create a
second/misconfigured instance.

## The ESM `.js` import rule

Covered in `context.md` §5 — repeating here because it's easy to forget:
every relative import in `src/` needs an explicit `.js` extension. Package
imports don't.
