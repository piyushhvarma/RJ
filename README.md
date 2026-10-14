# Gold Loan ERP — Monorepo

Enterprise Resource Planning system tailored for jewellery gold loans, customer valuation, loan disbursements, ledger accounting, safe packet management, and settlement tracking.

---

## 🏛️ Architecture & Directory Structure

```text
gold-loan-erp/
├── backend/                  # NestJS 12 API Service (Port 3000)
│   ├── src/                  # Modular domain modules (loans, customers, jewellery, packets, payments, etc.)
│   ├── prisma/               # Database schema & migrations (PostgreSQL)
│   ├── scripts/              # Historical data migration & audit reconciliation tools
│   │   ├── legacy-data/      # Source CSVs & raw migration archives
│   │   ├── migrate-legacy-jsoft.ts
│   │   ├── categorize-jewellery.mjs
│   │   └── audit-control-totals.ts
│   └── test/                 # Unit & E2E Vitest suites
│
├── frontend/                 # Next.js 16 App Router UI (Port 3001)
│   ├── src/
│   │   ├── app/              # App router routes & layout groups ((shell), login, etc.)
│   │   ├── components/       # UI library & business domain components
│   │   └── lib/              # API clients, auth helpers, schemas, and utility functions
│   └── public/               # Static assets & icons
│
└── docs/                     # Specifications, PRDs, and architecture blueprints
    ├── backend/              # Backend PRD, Features, and Architecture docs
    └── frontend/             # Frontend PRD, UI Architecture, and API Reference
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v20+ recommended
- **PostgreSQL**: Running instance configured in `backend/.env`

### 2. Install All Dependencies
Install dependencies across both backend and frontend in a single step:
```bash
npm run install:all
```

### 3. Database Setup (Prisma)
Generate the Prisma client and apply database migrations:
```bash
npm run db:generate
npm run db:migrate
```
*(Optional) Seed initial development data:*
```bash
npm run db:seed
```

### 4. Run Development Servers
Launch both backend and frontend concurrently:
```bash
npm run dev
```
- **Backend API**: http://localhost:3000
- **Frontend App**: http://localhost:3001

---

## 🛠️ Monorepo Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs both backend and frontend concurrently |
| `npm run dev:backend` | Starts NestJS API with hot reload on port 3000 |
| `npm run dev:frontend` | Starts Next.js frontend on port 3001 |
| `npm run build` | Builds both backend and frontend for production |
| `npm run build:backend` | Compiles NestJS backend |
| `npm run build:frontend` | Builds Next.js production bundle |
| `npm run lint` | Runs linter across backend and frontend |
| `npm run test` | Runs backend test suite |
| `npm run db:migrate` | Runs Prisma schema migrations |
| `npm run db:studio` | Opens Prisma Studio GUI to inspect database records |
| `npm run db:generate` | Regenerates Prisma Client types |
| `npm run install:all` | Installs dependencies for both projects |

---

## 📦 Data Migration & Tools

Migration and reconciliation utilities live in `backend/scripts/`:
- **`npm run migrate:legacy-jsoft`** (in `backend/`): Migrates pledges and ledger payments from legacy systems.
- **`npm run migrate:wipe-legacy`** (in `backend/`): Safely resets migrated legacy data for re-runs.
- See [`backend/scripts/README.md`](backend/scripts/README.md) for full migration workflows.
