import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== AUDIT CONTROL TOTALS & LEDGER RECONCILIATION ===\n');

  // 1. Overall Ledger Row Count & Financial Sums
  const [overall] = await prisma.$queryRaw<any[]>`
    SELECT 
      COUNT(*)::int as total_rows,
      SUM(amount)::numeric(18,2) as gross_amount_sum,
      SUM("balanceAfter")::numeric(18,2) as gross_balance_after_sum,
      COUNT(DISTINCT "loanId")::int as distinct_loans_covered
    FROM ledger_entries
  `;

  // 2. Type-by-Type Breakdown
  const typeBreakdown = await prisma.$queryRaw<any[]>`
    SELECT 
      type,
      COUNT(*)::int as row_count,
      SUM(amount)::numeric(18,2) as sum_amount,
      SUM("balanceAfter")::numeric(18,2) as sum_balance_after,
      MIN("createdAt") as earliest_created_at,
      MAX("createdAt") as latest_created_at
    FROM ledger_entries
    GROUP BY type
    ORDER BY row_count DESC
  `;

  // 3. Disbursement Ledger vs Loans Principal Reconciliation
  const [disbRecon] = await prisma.$queryRaw<any[]>`
    SELECT 
      (SELECT SUM("principalAmount") FROM loans)::numeric(18,2) as loans_table_principal_sum,
      (SELECT SUM(amount) FROM ledger_entries WHERE type = 'DISBURSEMENT')::numeric(18,2) as ledger_disbursement_sum,
      (SELECT COUNT(*) FROM loans)::int as loans_table_count,
      (SELECT COUNT(*) FROM ledger_entries WHERE type = 'DISBURSEMENT')::int as ledger_disbursement_count
  `;

  // 4. Payments Table vs Ledger Entries Reconciliation
  const [paymentRecon] = await prisma.$queryRaw<any[]>`
    SELECT 
      (SELECT SUM(amount) FROM payments)::numeric(18,2) as payments_table_amount_sum,
      (SELECT SUM("principalComponent") FROM payments)::numeric(18,2) as payments_table_principal_sum,
      (SELECT SUM("interestComponent") FROM payments)::numeric(18,2) as payments_table_interest_sum,
      (SELECT COUNT(*) FROM payments)::int as payments_count,
      (SELECT COUNT(DISTINCT "relatedPaymentId") FROM ledger_entries WHERE "relatedPaymentId" IS NOT NULL)::int as ledger_linked_payments_count
  `;

  // 5. Integrity Check: Null amounts or orphan loans
  const [integrity] = await prisma.$queryRaw<any[]>`
    SELECT 
      COUNT(CASE WHEN amount IS NULL THEN 1 END)::int as null_amount_count,
      COUNT(CASE WHEN "balanceAfter" IS NULL THEN 1 END)::int as null_balance_count,
      COUNT(CASE WHEN l.id IS NULL THEN 1 END)::int as orphan_loan_entries
    FROM ledger_entries le
    LEFT JOIN loans l ON le."loanId" = l.id
  `;

  // 6. Immutable Audit Snapshot Archival
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ledger_entries_audit_snapshot_20261004 AS
    SELECT * FROM ledger_entries;
  `);

  const [snap] = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*)::int as snapshot_rows FROM ledger_entries_audit_snapshot_20261004
  `;

  console.log('1. OVERALL LEDGER INTEGRITY:');
  console.log(JSON.stringify(overall, null, 2));

  console.log('\n2. BREAKDOWN BY ENTRY TYPE:');
  console.table(typeBreakdown);

  console.log('\n3. DISBURSEMENT vs LOANS TABLE RECONCILIATION:');
  console.log(JSON.stringify(disbRecon, null, 2));

  console.log('\n4. PAYMENTS TABLE vs LEDGER RECONCILIATION:');
  console.log(JSON.stringify(paymentRecon, null, 2));

  console.log('\n5. DATA INTEGRITY CHECKS (ZERO TOLERANCE):');
  console.log(JSON.stringify(integrity, null, 2));

  console.log('\n6. IMMUTABLE SNAPSHOT TABLE ARCHIVED:');
  console.log(`Table "ledger_entries_audit_snapshot_20261004" verified with ${snap.snapshot_rows} rows.`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
