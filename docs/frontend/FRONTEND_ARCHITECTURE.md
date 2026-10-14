# FRONTEND_ARCHITECTURE.md — Structure & Conventions

Nothing is built yet, so this file is prescriptive (what to set up) rather
than descriptive (what already exists), unlike the backend's equivalent
doc. Deviate from these only if you have a concrete reason — write it down
in this file if you do, so the next person (human or agent) knows it was a
deliberate choice.

## Suggested project structure (Next.js App Router)

```
frontend/
  src/
    app/
      login/
      (shell)/                 ← route group for the authenticated app shell
        dashboard/
        customers/
          [id]/
          new/
        loans/
          [id]/
          new/                 ← the loan creation wizard
        jewellery/
        payments/
        packets/
        closures/
          [loanId]/             ← the closure wizard
        reports/
        audit/
        settings/
    components/
      ui/                       ← shadcn components live here
      shared/                   ← app-specific reusable pieces (status
                                   badges, role-gated button wrapper, etc.)
    lib/
      api/
        client.ts                ← fetch wrapper: base URL, bearer token,
                                     error normalization
        customers.ts             ← one file per backend resource, typed
        loans.ts                   request/response functions matching
        jewellery.ts                API_REFERENCE.md exactly
        appraisals.ts
        packets.ts
        payments.ts
        biometric.ts
        auth.ts
      auth/
        session.ts                ← token storage + role, read/write
      schemas/                   ← zod schemas mirroring the backend's
                                     class-validator DTOs (see below)
    hooks/                       ← TanStack Query hooks per resource, thin
                                     wrappers around lib/api/*
```

## API client conventions

- One typed function per backend endpoint in `lib/api/<resource>.ts`,
  matching `API_REFERENCE.md` exactly — field names, optionality, enums.
  When the backend changes, this is the one place that needs updating.
- Central `client.ts` handles: attaching `Authorization: Bearer <token>`,
  parsing the NestJS error response shape (`{ statusCode, message, error }`)
  into something the UI can display directly (remember: backend error
  messages are already specific and human-readable, per §95 — don't
  replace them with a generic "Something went wrong").
- On a 401, clear the session and redirect to `/login`. On a 403, show the
  backend's message (it'll say which roles are required) rather than a
  generic "forbidden."

## Form + validation conventions

- Use `react-hook-form` + `zod`. For each backend DTO in
  `API_REFERENCE.md`, write a matching zod schema in `lib/schemas/`. Keep
  the same field names and optionality as the backend DTO — this is the
  contract, don't drift from it silently.
- Where the backend computes a value server-side (e.g. jewellery
  `netWeight`/`valuation`), don't build a client-side form field for it —
  show it as read-only, populated from the response after submit, exactly
  as `API_REFERENCE.md` notes for that endpoint.
- Where the backend requires an exact sum (payment components must equal
  `amount`), validate that client-side before allowing submit, with a
  live running total shown to the user — don't just let the request 400
  and show the raw error.

## State/data-fetching conventions

- TanStack Query for all server state. One query-key convention per
  resource, e.g. `['loan', loanId]`, `['customer', customerId]`,
  `['jewellery', { loanId }]`. Invalidate the relevant query keys after
  any mutation (e.g. disbursing a loan invalidates `['loan', loanId]`).
- Don't reach for global client state (Redux/Zustand/etc.) for anything
  that's really server data — session/role is the one exception, since
  it's genuinely client-only state.

## Role-gating pattern

Build one shared component, e.g. `<RoleGate roles={['OWNER','MANAGER']}>`,
that reads the current session's role and conditionally renders children.
Use it to hide/disable nav items and action buttons per `FRONTEND_PRD.md`
§5's role table. This is a UX nicety — **the backend enforces the real
security boundary**, this component just keeps the UI from showing actions
that would fail anyway.

## Status/state display conventions

Every entity with a status enum (`Loan.status`, `Packet.status`,
`Appraisal.status`) should render through one shared `<StatusBadge>`-style
component with a consistent color+label mapping, defined once. Don't
inline color logic per-screen — when a new status value gets added on the
backend, there should be exactly one place in the frontend to update.

## The closure and loan-creation wizards specifically

Both are multi-step, need to be resumable (staff get interrupted), and
touch multiple backend resources in sequence with real business
consequences if a step is skipped or done out of order. Build these as
their own dedicated wizard components with explicit step state (not just
"whichever fields are filled in") — e.g. a discriminated-union step type
or an explicit step-index-plus-completed-steps model — so "can the user
advance to step N+1" is a single clear check, not scattered form-validity
logic. See `FRONTEND_PRD.md` for the exact step lists for each wizard.
