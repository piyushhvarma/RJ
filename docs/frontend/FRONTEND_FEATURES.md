# FRONTEND_FEATURES.md — Done / Not Done / Backlog

Status: everything is ⬜ not started — this is a from-scratch build. This
file exists to give the build order and to call out which screens are
blocked on missing backend pieces, so effort isn't wasted building UI for
an API that doesn't exist yet.

## Foundational (build first — everything else depends on these)

- ⬜ Next.js project scaffold, Tailwind + shadcn/ui installed and configured
- ⬜ API client wrapper (base URL, attaches bearer token, typed request/
  response per `API_REFERENCE.md`)
- ⬜ Auth: login page, token storage, route protection (redirect to login
  if no valid token), role available in a client-side context/store for
  conditionally rendering nav items and buttons
- ⬜ App shell: the navigation structure from `FRONTEND_PRD.md`, with
  role-based visibility

## Ready to build now (backend endpoints exist)

- ⬜ Customer search screen (`GET /customers?q=`)
- ⬜ Customer registration form (`POST /customers`)
- ⬜ Customer profile screen (`GET /customers/:id`) — active/closed loans
  list, KYC/biometric status display
- ⬜ Biometric enrollment action (`POST /customers/:customerId/biometric/enroll`)
- ⬜ Loan creation (draft) form (`POST /loans`)
- ⬜ Loan profile screen (`GET /loans/:id`)
- ⬜ Jewellery item entry form, with the server-computed net weight/
  valuation shown as read-only feedback after submit (`POST /jewellery`)
- ⬜ Jewellery photo attachment UI (`POST /jewellery/:id/photos`) — note:
  this needs an actual file → URL upload step that doesn't exist on the
  backend yet; you'll need a temporary workaround (e.g. a placeholder/manual
  URL field) or to coordinate getting object storage built first
- ⬜ Appraisal creation + confirm (appraiser) + approve (manager) actions
- ⬜ Loan disburse form/action, with the precondition errors (missing
  jewellery, appraisal not locked) surfaced clearly, not as a generic error
- ⬜ Packet creation, storage assignment form (safe/locker/shelf/position),
  packet detail view with movement history
- ⬜ Payment receipt form, with client-side validation that the four
  components sum to the total before allowing submit
- ⬜ Payments list for a loan

## Partially blocked (backend exists but is incomplete for the full flow)

- ⬜ **Closure wizard** — the individual actions (biometric verify, payment,
  packet retrieve, packet release) exist, but there's no backend
  orchestration enforcing the sequence or the failed-closure conditions
  (§48 in the source PRD). Build the wizard to walk through the steps and
  gate advancement client-side, but flag this clearly as provisional —
  once backend closure orchestration exists, this screen will need
  rework to match whatever single endpoint/response shape it exposes.
- ⬜ **Loan creation wizard's later steps** (generate document, print,
  physical signing) — no document-generation backend exists. Build the
  wizard shell and the "physical signing confirmed" state as a UI-only
  placeholder for now.

## Fully blocked (no backend support at all yet)

- ⬜ Dashboard KPIs and alerts (no aggregation endpoints)
- ⬜ Reports (daily collection, overdue, gold inventory, etc. — nothing
  exists)
- ⬜ Global cross-entity search (only customer search exists)
- ⬜ Document viewing/printing/reprint tracking
- ⬜ Notifications (nothing to display)
- ⬜ Renewals, top-ups, part-release UI
- ⬜ Audit log / timeline viewer UI (backend `AuditService.timeline()`
  exists as a service method but isn't exposed via any controller/route
  yet — this is a quick backend addition if you need it soon, worth
  flagging back to whoever's on backend rather than blocking on it silently)
- ⬜ Settings / user management (no endpoints to create/manage staff
  accounts beyond the seed script)

## Suggested build order

1. Foundational layer (auth, API client, app shell)
2. Customer flows (search, register, profile, biometric enroll)
3. Loan creation flow up through disburse (loan draft → jewellery →
   appraisal confirm/approve → disburse) — this is the single longest
   coherent path through currently-existing endpoints and will surface
   any remaining backend rough edges
4. Packet creation/storage
5. Payments
6. Closure wizard (provisional, as noted above)
7. Everything in "fully blocked" — pick these up as their backend
   counterparts get built, checking `API_REFERENCE.md` for updates first
