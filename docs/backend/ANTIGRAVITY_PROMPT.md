# ANTIGRAVITY_PROMPT.md

Paste the text below as your opening message to Antigravity, with the
project folder (containing `context.md`, `PRD.md`, `FEATURES.md`,
`ARCHITECTURE.md`, and `backend/`) open as the workspace.

---

## Prompt to paste

You're picking up an existing, partially-built project: a production Gold
Loan & Pledge Management ERP for a jewellery shop (Radhika Jewellers /
Silveransh) that lends money against pledged gold jewellery. This is a
real system meant to go into production at a physical shop — not a demo —
so correctness, auditability, and not silently faking completion of
physical steps (like "gold released" or "document signed") all matter more
than usual.

Before you write or change any code, read these files in this exact order:

1. `context.md` — project overview, current status, tech stack, critical
   gotchas, and conventions. This tells you what NOT to reinvent.
2. `ARCHITECTURE.md` — the data model and the specific design patterns
   already established (ID generation, audit logging, append-only ledger,
   role enforcement, hardware-abstraction pattern, state-machine
   validation). Every new piece of code you write should follow these
   same patterns, not introduce new ones.
3. `PRD.md` — condensed product requirements: roles and what each can/
   can't do, the loan/packet/document state machines, the non-negotiable
   business rules (BR-001 through BR-015), and the MVP scope.
4. `FEATURES.md` — an exact done/not-done checklist with a prioritized
   backlog at the bottom. Start with whatever's marked highest priority
   there unless I tell you otherwise.
5. `backend/prisma/schema.prisma` — the actual data model, which is more
   authoritative than any prose description of it.

Important context before you start:

- **The backend has never actually been run.** It was written without
  access to a real Postgres instance or the ability to run
  `npx prisma generate`/`migrate`. Your first task, unless I say
  otherwise, is: run `npm install` in `backend/`, get a local Postgres
  instance up, run `npx prisma generate` then
  `npx prisma migrate dev --name init`, run `npm run seed`, boot with
  `npm run start:dev`, and smoke-test the existing endpoints (auth/login,
  customers, loans, jewellery, appraisal, packets, payments). Fix
  whatever breaks. Report back what you found before moving on to new
  features — I want to know if the schema has issues before more code
  gets built on top of it.
- **This is an ESM TypeScript project** (`"type": "module"`, NodeNext
  module resolution). Every relative import needs an explicit `.js`
  extension (e.g. `from '../prisma/prisma.service.js'`), even though the
  source is `.ts`. This has already bitten us once — don't reintroduce
  the bug in new files.
- **Follow the established module shape** for any new feature:
  `*.controller.ts` / `*.service.ts` / `*.module.ts` / `dto/*.dto.ts`,
  matching the existing modules under `backend/src/`.
- **Don't fake the interest engine, biometric hardware, or document
  generation** with quick inline stand-ins presented as if they're real —
  where something is intentionally stubbed (like the biometric adapter),
  it's documented as such in `context.md`/`ARCHITECTURE.md`. Where
  something is genuinely missing (interest engine, documents, closure
  orchestration), build it properly or flag that it needs a dedicated
  design pass — don't quietly approximate it.
- **Every sensitive/privileged action needs an audit log entry** written
  via `AuditService`, and every status transition needs to validate the
  current state first. Don't let a loan or packet jump straight to a
  terminal state.
- Work in reviewable chunks. After finishing a module or a coherent slice
  of work, stop and summarize what you built, what you verified actually
  works (vs. what's still unverified), and what you'd suggest doing next
  — don't silently keep going through the entire backlog in one pass.

Once you've read the four context files and the schema, tell me what
you understand the current state to be, in your own words, before you
start writing code — I want to confirm you've got the right picture
first.
