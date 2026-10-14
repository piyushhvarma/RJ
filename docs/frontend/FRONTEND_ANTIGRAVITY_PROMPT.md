# FRONTEND_ANTIGRAVITY_PROMPT.md

Paste the text below as your opening message to Antigravity, with a
workspace containing `context.md`, `FRONTEND_PRD.md`,
`FRONTEND_FEATURES.md`, `FRONTEND_ARCHITECTURE.md`, and `API_REFERENCE.md`
(these frontend docs) — ideally alongside the backend project too, since
this build depends on it directly.

---

## Prompt to paste

You're starting a from-scratch Next.js frontend for an existing (partially
built, backend-only) production system: a Gold Loan & Pledge Management
ERP for a jewellery shop (Radhika Jewellers / Silveransh) that lends money
against pledged gold jewellery. This is the staff-facing app used in-shop
under time pressure — no customer-facing login exists or is planned.

Before writing any code, read these files in this order:

1. `context.md` — what this app is, current status (nothing built yet),
   tech stack, the core design principle carried over from the backend
   (don't let the UI claim a physical step happened before it actually
   did), and the role table.
2. `API_REFERENCE.md` — the exact backend endpoints that currently exist,
   with roles and request/response shapes. **Build only against what's
   actually documented here as existing** — large parts of the eventual
   product (documents, closure orchestration, notifications, reports,
   file upload) are explicitly called out as not built yet. Don't
   assume an endpoint exists because the PRD describes the eventual
   feature.
3. `FRONTEND_PRD.md` — the screen list, navigation structure, the loan-
   creation and closure wizards (step by step), error-message tone,
   empty-state copy, and usability/performance requirements.
4. `FRONTEND_FEATURES.md` — the prioritized build order, and importantly
   the sections marked "partially blocked" and "fully blocked" — don't
   spend effort building full UI for those, build minimal placeholders
   at most, and say so explicitly if you do.
5. `FRONTEND_ARCHITECTURE.md` — the project structure, API client
   pattern, form/validation conventions (zod schemas mirroring backend
   DTOs exactly), state management (TanStack Query), and the role-gating
   and status-badge component patterns to establish early so they're
   reused consistently rather than reinvented per screen.

Important context before you start:

- **The backend itself may not be running/verified yet.** If you have
  access to the backend project, check its own `FEATURES.md` for current
  status before assuming any endpoint in `API_REFERENCE.md` definitely
  works as documented — that reference was written from the backend's
  source code, not from an actually-running, tested server.
- **This UI is used under time pressure by shop staff, not by end
  consumers.** Prioritize clarity, large touch targets, and fast keyboard/
  scanner-driven workflows over decorative design. Follow the usability
  section in `FRONTEND_PRD.md`.
- **Never let the UI claim a physical action completed before the
  corresponding API call actually succeeded** — e.g. don't optimistically
  show a packet as "Stored" before the store-location request returns
  success; don't let a wizard silently auto-advance through the physical-
  signature confirmation step.
- **Role-gate the UI to match the backend's role table**, even though the
  backend is the real enforcement boundary — hiding an action a role can't
  perform is good UX, not security theater, as long as you don't treat it
  as a substitute for the backend's own checks.
- **Match backend DTOs exactly** when writing zod schemas / form types —
  field names, optionality, and enums should mirror `API_REFERENCE.md`
  precisely, since drift here causes confusing runtime validation
  mismatches rather than compile-time errors.
- Start with the foundational layer (auth, API client, app shell) before
  any feature screens — everything else depends on it.
- Work in reviewable chunks. After finishing the foundational layer or a
  coherent screen/flow, stop and summarize what you built and what you'd
  suggest next, rather than silently working through the entire backlog.

Once you've read all five files, tell me what you understand the current
state to be (both frontend and what you understand about the backend's
current state) before writing any code — I want to confirm the picture is
right first.
