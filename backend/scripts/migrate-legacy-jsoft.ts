// scripts/migrate-legacy-jsoft.ts
//
// One-time migration of the historical "Jsoft" Access database (pledge.mdb)
// into this app's Postgres schema. Reads the already-extracted CSVs in
// scripts/legacy-data/ (pledge.csv, pledgerec.csv — exported from the .mdb
// via mdbtools) rather than reading the .mdb directly, since mdbtools isn't
// readily available on Windows.
//
// DESIGN PRINCIPLES (read this before changing anything):
// 1. Every migrated row is permanently traceable back to its source —
//    Loan.legacyPledgeNo stores the original pno, Customer.legacySourceRef
//    stores the dedup key used to group old rows into one customer. Nothing
//    is migrated anonymously.
// 2. We never claim something happened that we don't actually have evidence
//    for. Historical CLOSED loans get a packet marked RELEASED (we know the
//    gold went back — refundeddt proves it).
// 3. Every insert is attributed to a dedicated migration User, never a real
//    staff member's identity, and every audit log action is prefixed
//    LEGACY_MIGRATION_ so these are forever distinguishable from live
//    actions in the audit trail.
// 4. Idempotent: re-running this script skips any pledge whose
//    legacyPledgeNo already exists, so it's safe to re-run after fixing a
//    bug partway through a big run — BUT that also means it will NOT
//    retroactively fix already-migrated loans. Wipe first if you want
//    changes applied to everything.
//
// USAGE (from backend/):
//   npm install csv-parse --save-dev
//   npx tsx scripts/migrate-legacy-jsoft.ts

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import {
  PrismaClient,
  LoanStatus,
  InterestType,
  MetalType,
  PaymentMode,
  LedgerEntryType,
} from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const LEGACY_DATA_DIR = path.join(__dirname, 'legacy-data');
const BATCH_LOG_EVERY = 500;

// ── small helpers ──────────────────────────────────────────────────────

/** Old dates are "MM/DD/YY HH:mm:ss" — e.g. "01/21/16 00:00:00". */
function parseLegacyDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const [datePart] = raw.split(' ');
  const [mm, dd, yy] = datePart.split('/').map(Number);
  if (!mm || !dd || Number.isNaN(yy)) return null;
  // Two-digit years in this dataset run 2016–2026 → all are 20xx.
  const year = 2000 + yy;
  const d = new Date(year, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseNumber(raw: string | undefined, fallback = 0): number {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(raw: string | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeCustomerKey(name: string, address: string, city: string): string {
  return `${name}|${address}|${city}`.toLowerCase().replace(/\s+/g, ' ').trim();
}

function inferMetalType(pledgeType: string): MetalType {
  const lower = pledgeType.toLowerCase();
  if (lower.includes('chandi') || lower.includes('silver')) return 'SILVER';
  if (lower.includes('gold')) return 'GOLD';
  return 'OTHER';
}

/**
 * Your real storage rule, confirmed directly against the source data:
 * the physical box a packet sits in is the last two digits of the entry's
 * ref number (RefDocNo) — e.g. entry 1701 → box "01", entry 1332 → box
 * "32". Boxes are numbered 01 through 100, not 00 through 99 — when the
 * ref number is an exact multiple of 100 (1000, 1200, etc.), the box is
 * "100", not "00". There are ~100 physical boxes, constantly reused as
 * old packets are released and new ones come in. Returns null when
 * RefDocNo isn't a usable number (56 rows in the source data, 4 of them
 * currently active) — those get flagged for manual placement rather than
 * guessed.
 */
function boxNumberFor(refDocNo: string | undefined): string | null {
  const raw = (refDocNo ?? '').trim();
  if (!/^\d+$/.test(raw)) return null;
  const remainder = Number(raw) % 100;
  // Box "100" covers exact multiples of 100 (1000, 1200, ...), never "00".
  if (remainder === 0) return '100';
  return String(remainder).padStart(2, '0');
}

/**
 * Atomically issues a code like "GL-2016-000001" for the GIVEN year — not
 * necessarily the current year, since historical loans should keep their
 * real year for the code to stay chronologically meaningful. Mirrors
 * IdGeneratorService's logic but lets the caller pick the year.
 */
async function nextLegacyCode(
  tx: PrismaClient | any,
  prefix: 'CUS' | 'GL' | 'PAY' | 'PKT',
  year: number,
): Promise<string> {
  const seq = await tx.idSequence.upsert({
    where: { prefix_year: { prefix, year } },
    create: { prefix, year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return `${prefix}-${year}-${String(seq.lastValue).padStart(6, '0')}`;
}

// ── row shapes from the exported CSVs ──────────────────────────────────

interface PledgeRow {
  pno: string;
  pledgersName: string;
  address: string;
  city: string;
  post: string;
  taluka: string;
  dist: string;
  loanAmt: string;
  loandate: string;
  loanrefdate: string;
  intratepa: string;
  pledgetype: string;
  GrossWt: string;
  EstWt: string;
  Fine: string;
  FineWt: string;
  estamtrs: string;
  status: string; // 'r' = refunded/closed, 'c' = continued/active
  RefundedDt: string;
  RefDocNo: string;
}

interface PledgeRecRow {
  PRecNo: string;
  Pno: string;
  IntAmtPaid: string;
  LoanAmtPaid: string;
  OnDate: string;
  Narration: string;
}

async function main() {
  console.log('Reading legacy CSVs...');
  const pledgeRows: PledgeRow[] = parse(readFileSync(path.join(LEGACY_DATA_DIR, 'pledge.csv')), {
    columns: true,
    skip_empty_lines: true,
  });
  const pledgeRecRows: PledgeRecRow[] = parse(
    readFileSync(path.join(LEGACY_DATA_DIR, 'pledgerec.csv')),
    { columns: true, skip_empty_lines: true },
  );
  console.log(`Loaded ${pledgeRows.length} pledge rows, ${pledgeRecRows.length} payment rows.`);

  // Group PledgeRec rows by their parent pno for fast lookup during the loan loop.
  const paymentsByPno = new Map<string, PledgeRecRow[]>();
  for (const rec of pledgeRecRows) {
    const key = rec.Pno;
    if (!paymentsByPno.has(key)) paymentsByPno.set(key, []);
    paymentsByPno.get(key)!.push(rec);
  }

  // 1. Dedicated migration user — every migrated row's *ById fields point here.
  const migrationUser = await prisma.user.upsert({
    where: { email: 'legacy-migration@system.internal' },
    create: {
      employeeCode: 'SYSTEM-MIGRATION',
      name: 'Legacy Data Migration (Jsoft)',
      email: 'legacy-migration@system.internal',
      passwordHash: 'NOT_A_REAL_LOGIN', // never used to authenticate
      role: 'OWNER',
      active: false, // can never actually log in with this account
    },
    update: {},
  });

  // 2. Build the customer dedup map (name+address+city → key).
  const customerIdByKey = new Map<string, string>();

  let customersCreated = 0;
  let loansCreated = 0;
  let loansSkipped = 0;
  let jewelleryCreated = 0;
  let paymentsCreated = 0;
  const needsManualPlacement: string[] = [];

  for (let i = 0; i < pledgeRows.length; i++) {
    const row = pledgeRows[i];
    const pno = cleanText(row.pno);

    if (!pno) continue;

    // Idempotency: skip if this pledge was already migrated in a prior run.
    const existing = await prisma.loan.findUnique({ where: { legacyPledgeNo: pno } });
    if (existing) {
      loansSkipped++;
      continue;
    }

    const name = cleanText(row.pledgersName) || 'Unknown (legacy record)';
    const address = cleanText(row.address);
    const city = cleanText(row.city);
    const dedupKey = normalizeCustomerKey(name, address, city);

    // 3. Find-or-create the customer.
    let customerId = customerIdByKey.get(dedupKey);
    if (!customerId) {
      const customerCode = await nextLegacyCode(prisma, 'CUS', new Date().getFullYear());
      const customer = await prisma.customer.create({
        data: {
          customerCode,
          fullName: name,
          address: [address, cleanText(row.post), cleanText(row.taluka)]
            .filter((v, idx, arr) => v && arr.indexOf(v) === idx) // drop empty/duplicate parts
            .join(', '),
          city,
          state: cleanText(row.dist), // district, closest available field — not a true Indian state
          mobile: null, // never captured by the old system
          kycStatus: 'PENDING',
          createdById: migrationUser.id,
          legacySourceRef: dedupKey,
        },
      });
      customerId = customer.id;
      customerIdByKey.set(dedupKey, customer.id);
      customersCreated++;

      await prisma.auditLog.create({
        data: {
          entityType: 'Customer',
          entityId: customer.id,
          action: 'LEGACY_MIGRATION_CUSTOMER_CREATED',
          userId: migrationUser.id,
          roleAtTime: 'OWNER',
          newValue: { customerCode, source: 'Jsoft pledge.mdb', dedupKey },
          result: 'SUCCESS',
        },
      });
    }

    // 4. Create the Loan.
    const loanDate = parseLegacyDate(row.loandate) ?? new Date();
    const maturityDate = parseLegacyDate(row.loanrefdate);
    const status: LoanStatus = row.status === 'r' ? 'CLOSED' : row.status === 'c' ? 'ACTIVE' : 'HOLD';
    const principalAmount = parseNumber(row.loanAmt);
    const interestRate = parseNumber(row.intratepa);

    const loanCode = await nextLegacyCode(prisma, 'GL', loanDate.getFullYear());

    const loan = await prisma.loan.create({
      data: {
        loanCode,
        customerId,
        status,
        principalAmount,
        interestRate,
        interestType: 'ANNUAL_SIMPLE', // intratepa reads as a per-annum rate in the source system
        sanctionedDate: loanDate,
        maturityDate: maturityDate ?? undefined,
        createdById: migrationUser.id,
        approvedById: status !== 'DRAFT' ? migrationUser.id : undefined,
        legacyPledgeNo: pno,
        // HOLD is used for any status value we didn't recognize — flag it
        // for manual review rather than silently guessing ACTIVE or CLOSED.
        holdReason: status === 'HOLD' ? 'SYSTEM_DISCREPANCY' : undefined,
        holdNotes: status === 'HOLD' ? `Unrecognized legacy status value: "${row.status}"` : undefined,
      },
    });
    loansCreated++;

    // 5. Disbursement ledger entry.
    await prisma.ledgerEntry.create({
      data: {
        loanId: loan.id,
        type: 'DISBURSEMENT' as LedgerEntryType,
        amount: principalAmount,
        balanceAfter: principalAmount,
        createdById: migrationUser.id,
        reason: 'Legacy migration — original disbursement per Jsoft pledge record',
      },
    });

    // 6. Auto-locked appraisal — these loans are historical, there's no live
    // appraiser workflow to replay, so it goes straight to LOCKED.
    await prisma.appraisal.create({
      data: {
        loanId: loan.id,
        appraiserId: migrationUser.id,
        status: 'LOCKED',
        approvedById: migrationUser.id,
        approvedAt: loanDate,
        notes: 'Legacy migration — no live appraisal workflow existed for this record.',
      },
    });

    // 7. One JewelleryItem per pledge. The old system doesn't reliably give
    // us a per-piece breakdown for multi-item pledges, so this is a KNOWN
    // FIDELITY LOSS for those cases — flagged in appraisalRemarks.
    const pledgeType = cleanText(row.pledgetype) || 'Unspecified item (legacy)';
    const grossWeight = parseNumber(row.GrossWt) || parseNumber(row.EstWt) || 0.001;
    const fineWeight = parseNumber(row.FineWt);
    const netWeight = fineWeight > 0 ? fineWeight : grossWeight;
    const valuation = parseNumber(row.estamtrs);
    const valuationRate = netWeight > 0 ? valuation / netWeight : 0;
    const metalType = inferMetalType(pledgeType);

    const item = await prisma.jewelleryItem.create({
      data: {
        itemCode: `${loanCode}-01`,
        loanId: loan.id,
        category: pledgeType,
        metalType,
        description: pledgeType,
        grossWeight,
        stoneWeight: 0, // not captured separately in the legacy system
        netWeight,
        purityKarat: row.Fine ? `${cleanText(row.Fine)}% Fine` : 'Unknown',
        valuationRate,
        valuation,
        ownershipDeclaration: false, // not something we can assume — must be re-verified in person
        appraisalRemarks:
          'Migrated from Jsoft legacy system. Original description may bundle multiple physical pieces into one record — verify piece count in person before treating this as authoritative.',
        status: status === 'CLOSED' ? 'RELEASED' : 'PLEDGED',
        releasedAt: status === 'CLOSED' ? parseLegacyDate(row.RefundedDt) ?? undefined : undefined,
      },
    });
    jewelleryCreated++;

    await prisma.auditLog.create({
      data: {
        entityType: 'Loan',
        entityId: loan.id,
        action: 'LEGACY_MIGRATION_LOAN_CREATED',
        userId: migrationUser.id,
        roleAtTime: 'OWNER',
        newValue: { loanCode, legacyPledgeNo: pno, status, principalAmount },
        result: 'SUCCESS',
      },
    });

    // 8. Packet — with a real physical box location derived from your
    // confirmed storage rule (last two digits of RefDocNo, "100" not "00"
    // for exact multiples of 100). Closed loans get status RELEASED
    // (refundedDt proves the gold came back) but still record which box it
    // USED to sit in. Active loans get status STORED with their real
    // current box. Only the ~56 rows (4 currently active) with no usable
    // RefDocNo get skipped here and need manual placement.
    const box = boxNumberFor(row.RefDocNo);
    if (box === null) {
      needsManualPlacement.push(pno);
    } else {
      const packetCode = await nextLegacyCode(prisma, 'PKT', loanDate.getFullYear());

      const location = await prisma.storageLocation.upsert({
        where: {
          branch_safe_locker_shelf_position: {
            branch: 'Main Branch',
            safe: 'Vault',
            locker: 'Box',
            shelf: '-',
            position: box,
          },
        },
        create: {
          branch: 'Main Branch',
          safe: 'Vault',
          locker: 'Box',
          shelf: '-',
          position: box,
          label: `Box-${box}`,
        },
        update: {},
      });

      if (status === 'CLOSED') {
        const releasedAt = parseLegacyDate(row.RefundedDt) ?? maturityDate ?? loanDate;
        await prisma.packet.create({
          data: {
            packetCode,
            loanId: loan.id,
            status: 'RELEASED',
            storageLocationId: location.id,
            storedAt: loanDate,
            releasedAt,
            createdById: migrationUser.id,
          },
        });
      } else {
        // ACTIVE — this is genuinely where the packet sits right now.
        await prisma.packet.create({
          data: {
            packetCode,
            loanId: loan.id,
            status: 'STORED',
            storageLocationId: location.id,
            storedAt: loanDate, // exact original storage date unknown — loan date is the best available approximation
            createdById: migrationUser.id,
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          entityType: 'Packet',
          entityId: loan.id,
          action: 'LEGACY_MIGRATION_PACKET_PLACED',
          userId: migrationUser.id,
          roleAtTime: 'OWNER',
          newValue: { box, status: status === 'CLOSED' ? 'RELEASED' : 'STORED' },
          reason: 'Derived from RefDocNo mod 100 per confirmed storage rule',
          result: 'SUCCESS',
        },
      });
    }

    // 9. Payments for this loan.
    const payments = paymentsByPno.get(pno) ?? [];
    for (const rec of payments) {
      const paymentDate = parseLegacyDate(rec.OnDate) ?? loanDate;
      const principalComponent = parseNumber(rec.LoanAmtPaid);
      const interestComponent = parseNumber(rec.IntAmtPaid);
      const amount = principalComponent + interestComponent;
      if (amount <= 0) continue;

      const paymentCode = await nextLegacyCode(prisma, 'PAY', paymentDate.getFullYear());

      const payment = await prisma.payment.create({
        data: {
          paymentCode,
          loanId: loan.id,
          amount,
          mode: 'CASH' as PaymentMode, // the legacy system has no digital-payment concept we found
          principalComponent,
          interestComponent,
          penaltyComponent: 0,
          otherCharges: 0,
          cashierId: migrationUser.id,
          receiptNumber: paymentCode,
          notes: cleanText(rec.Narration) || undefined,
          paymentDate,
        },
      });
      paymentsCreated++;

      await prisma.ledgerEntry.create({
        data: {
          loanId: loan.id,
          type: 'PAYMENT',
          amount,
          // NOTE: approximate — only reflects THIS payment's principal
          // component against original principal, not a true running
          // balance replayed across all prior payments. See
          // MIGRATION_NOTES.md.
          balanceAfter: principalAmount - principalComponent,
          relatedPaymentId: payment.id,
          createdById: migrationUser.id,
          reason: 'Legacy migration payment',
        },
      });
      if (principalComponent > 0) {
        await prisma.ledgerEntry.create({
          data: {
            loanId: loan.id,
            type: 'PRINCIPAL_PAID',
            amount: principalComponent,
            balanceAfter: principalAmount - principalComponent,
            relatedPaymentId: payment.id,
            createdById: migrationUser.id,
          },
        });
      }
      if (interestComponent > 0) {
        await prisma.ledgerEntry.create({
          data: {
            loanId: loan.id,
            type: 'INTEREST_PAID',
            amount: interestComponent,
            balanceAfter: principalAmount - principalComponent,
            relatedPaymentId: payment.id,
            createdById: migrationUser.id,
          },
        });
      }
    }

    if ((i + 1) % BATCH_LOG_EVERY === 0) {
      console.log(`  ...processed ${i + 1}/${pledgeRows.length} pledges`);
    }
  }

  console.log('\nDone.');
  console.log(`  Customers created:  ${customersCreated}`);
  console.log(`  Loans created:      ${loansCreated}`);
  console.log(`  Loans skipped (already migrated): ${loansSkipped}`);
  console.log(`  Jewellery items:    ${jewelleryCreated}`);
  console.log(`  Payments created:   ${paymentsCreated}`);
  if (needsManualPlacement.length > 0) {
    console.log(
      `\n  ${needsManualPlacement.length} loans had no usable ref number and got NO packet — these need manual physical placement:`,
    );
    console.log('   ' + needsManualPlacement.join(', '));
  }
  console.log('\nSee MIGRATION_NOTES.md for the caveats you need to know about this data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
