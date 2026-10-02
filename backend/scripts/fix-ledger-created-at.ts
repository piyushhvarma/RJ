import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting LedgerEntry createdAt Data Correction ---');

  // 1. Update DISBURSEMENT ledger entries to match loan.sanctionedDate
  console.log('1. Correcting DISBURSEMENT ledger entries to match loan.sanctionedDate...');
  const disbResult = await prisma.$executeRawUnsafe(`
    UPDATE ledger_entries le
    SET "createdAt" = l."sanctionedDate"
    FROM loans l
    WHERE le."loanId" = l.id
      AND le.type = 'DISBURSEMENT'
      AND l."sanctionedDate" IS NOT NULL
      AND le."createdAt" != l."sanctionedDate";
  `);
  console.log(`   Updated ${disbResult} DISBURSEMENT ledger entries.`);

  // 2. Update PAYMENT, PRINCIPAL_PAID, INTEREST_PAID, PENALTY_PAID entries that have a relatedPaymentId to match payment.paymentDate
  console.log('2. Correcting payment-related ledger entries to match payment.paymentDate...');
  const paymentResult = await prisma.$executeRawUnsafe(`
    UPDATE ledger_entries le
    SET "createdAt" = p."paymentDate"
    FROM payments p
    WHERE le."relatedPaymentId" = p.id
      AND p."paymentDate" IS NOT NULL
      AND le."createdAt" != p."paymentDate";
  `);
  console.log(`   Updated ${paymentResult} payment-related ledger entries.`);

  // 3. Update any remaining payment ledger entries without relatedPaymentId (if any)
  console.log('3. Checking any orphan payment ledger entries...');
  const orphanResult = await prisma.$executeRawUnsafe(`
    UPDATE ledger_entries le
    SET "createdAt" = l."sanctionedDate"
    FROM loans l
    WHERE le."loanId" = l.id
      AND le."relatedPaymentId" IS NULL
      AND le.type != 'DISBURSEMENT'
      AND l."sanctionedDate" IS NOT NULL
      AND le."createdAt" > NOW() - INTERVAL '30 days'
      AND l."sanctionedDate" < NOW() - INTERVAL '30 days';
  `);
  console.log(`   Updated ${orphanResult} other historical ledger entries.`);

  console.log('\n--- Verification Sample ---');
  const sample = await prisma.ledgerEntry.findMany({
    take: 5,
    orderBy: { createdAt: 'asc' },
    include: { loan: { select: { loanCode: true, sanctionedDate: true } } },
  });

  for (const s of sample) {
    console.log(`Entry ${s.type} | Amount ₹${s.amount} | Ledger CreatedAt: ${s.createdAt.toISOString()} | Loan Sanctioned: ${s.loan.sanctionedDate?.toISOString()}`);
  }

  console.log('\n--- LedgerEntry createdAt correction completed successfully! ---');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Data correction failed:', err);
  process.exit(1);
});
