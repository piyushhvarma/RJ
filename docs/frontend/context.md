# context.md (Frontend) — Gold Loan & Pledge Management ERP

Read this file first. Companion files: `FRONTEND_PRD.md` (screens/wizards/
UX requirements), `FRONTEND_FEATURES.md` (done/not-done checklist —
currently everything is not-done), `FRONTEND_ARCHITECTURE.md` (project
structure, API client, auth, form/state conventions), and `API_REFERENCE.md`
(the exact backend endpoints, roles, and payloads this frontend talks to).

## 1. What this is

The staff-facing web application for a jewellery shop's gold-loan
operation (Radhika Jewellers / Silveransh). This is used **in-shop, by
staff, under time pressure** — not a public-facing consumer app. There is
no customer login; customers never touch this UI directly. Read
`FRONTEND_PRD.md` §"Usability" for what that implies about design (large
buttons, keyboard shortcuts, minimal screens, fast search, print/camera/
scanner shortcuts).

## 2. Current status

**Nothing exists yet.** No repo, no scaffold, no dependencies installed.
This is a from-scratch Next.js build against an existing (partially built,
not-yet-verified-running) NestJS backend. See `API_REFERENCE.md` for
exactly what the backend currently exposes — build against that, not
against the full PRD's eventual scope, since large parts of the backend
(documents, closure orchestration, interest engine, notifications,
reports) don't exist yet either. Check with the backend project's own
`FEATURES.md` before assuming an endpoint exists.

## 3. Tech stack (already chosen)

- **Next.js + TypeScript** (App Router)
- **Tailwind CSS + shadcn/ui**
- Not yet decided/built, your call unless told otherwise: data-fetching
  library (TanStack Query is a natural fit for a JWT-bearer REST API like
  this one), form handling (react-hook-form + zod is the natural pairing
  with the backend's class-validator DTOs — see
  `FRONTEND_ARCHITECTURE.md` for how to keep the two in sync).

## 4. The backend this talks to

A NestJS + Prisma + PostgreSQL API. Auth is JWT bearer tokens (`POST
/auth/login` → `{ accessToken, user }`). Every other endpoint requires
`Authorization: Bearer <token>` and enforces role checks **server-side** —
the backend will reject a request from the wrong role regardless of what
the UI shows. That said, the UI should still hide/disable actions the
current user's role can't perform — good UX, not a substitute for the
backend's enforcement. See `API_REFERENCE.md` for the full endpoint list
with roles and payload shapes.

**The backend itself has never been run against a real database yet** —
if you're picking this up around the same time as the backend work, there
may be schema hiccups. Coordinate on that separately; don't assume every
documented endpoint definitely works exactly as described until it's been
smoke-tested.

## 5. User roles — reflect these in the UI, don't just rely on the backend

| Role | Primary use in this UI |
|---|---|
| **Owner** | Everything, plus settings/user management |
| **Manager** | Approve appraisals, disburse loans, authorize gold release, view reports |
| **Appraiser** | Enter jewellery items, record weight/purity/photos, confirm appraisals |
| **Cashier** | Receive payments, verify biometrics at closure, view outstanding |
| **Staff** | Register customers, capture photos, create draft loans, print documents |

Design the navigation and available actions per-role — e.g. a Cashier
should not see a "Release Gold" button at all, even though the backend
would also reject the call if they tried.

## 6. Design principle carried over from the backend

> No digital status should claim completion before the corresponding
> physical operation has actually happened.

This matters for UI copy and flow, not just backend logic: don't show a
packet as "Stored" until the store-location call actually succeeds; don't
show a document as "Signed" just because it was generated/printed; make
failure states and required physical steps (printing, physical signature,
sealing a packet, scanning a QR) explicit in the UI rather than
auto-advancing through them.

## 7. Where to go next

Read `FRONTEND_PRD.md` for the actual screen list and the guided wizards
(loan creation, closure), then `FRONTEND_ARCHITECTURE.md` for how to
structure the Next.js app, then start with whatever `FRONTEND_FEATURES.md`
prioritizes first (almost certainly: auth/login screen + customer search/
registration, since every other screen depends on being logged in and
having a customer to work with).
