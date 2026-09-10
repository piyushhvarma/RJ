// scripts/wipe-migrated-data.ts
//
// Clears out prior migrated business data so migrate-legacy-jsoft.ts can
// run cleanly from scratch, without trusting whatever an earlier migration
// (e.g. one run autonomously by an agent) actually did.
//
// Deliberately does NOT touch: User (your real staff accounts), IdSequence
// (would cause code collisions/reuse if reset), or StorageLocation (harmless
// reference data, safe to keep).
//
// Deletes in FK-safe order (children before parents). Run with a plain
// `npx tsx scripts/wipe-migrated-data.ts` — it will ask for confirmation
// before doing anything, since this is destructive.

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

async function main() {
  const counts = {
    customers: await prisma.customer.count(),
    loans: await prisma.loan.count(),
    jewellery: await prisma.jewelleryItem.count(),
    payments: await prisma.payment.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
    packets: await prisma.packet.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('This will PERMANENTLY delete the following from your database:');
  console.table(counts);
  console.log('\nUsers and ID sequences will be left untouched.');

  const ok = await confirm('\nType "yes" and press Enter to confirm, anything else cancels: ');
  if (!ok) {
    console.log('Cancelled — nothing was deleted.');
    return;
  }

  console.log('Deleting, in dependency order...');

  // Children first.
  await prisma.auditLog.deleteMany({});
  await prisma.biometricVerificationLog.deleteMany({});
  await prisma.biometricEnrollment.deleteMany({});
  await prisma.documentVersion.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.packetMovement.deleteMany({});
  await prisma.packet.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.jewelleryPhoto.deleteMany({});
  await prisma.jewelleryItem.deleteMany({});
  await prisma.appraisal.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.loan.deleteMany({});
  await prisma.customerDocument.deleteMany({});
  await prisma.customer.deleteMany({});

  console.log('Done. Database is clean and ready for migrate-legacy-jsoft.ts.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
