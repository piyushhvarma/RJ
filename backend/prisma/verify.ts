import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const [
    totalCustomers,
    customersWithoutMobile,
    totalLoans,
    activeLoans,
    closedLoans,
    holdLoans,
    totalJewellery,
    goldItems,
    silverItems,
    otherItems,
    totalPackets,
    storedPackets,
    releasedPackets,
    totalLocations,
    totalPayments,
    totalLedgerEntries,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { mobile: null } }),
    prisma.loan.count(),
    prisma.loan.count({ where: { status: 'ACTIVE' } }),
    prisma.loan.count({ where: { status: 'CLOSED' } }),
    prisma.loan.count({ where: { status: 'HOLD' } }),
    prisma.jewelleryItem.count(),
    prisma.jewelleryItem.count({ where: { metalType: 'GOLD' } }),
    prisma.jewelleryItem.count({ where: { metalType: 'SILVER' } }),
    prisma.jewelleryItem.count({ where: { metalType: 'OTHER' } }),
    prisma.packet.count(),
    prisma.packet.count({ where: { status: 'STORED' } }),
    prisma.packet.count({ where: { status: 'RELEASED' } }),
    prisma.storageLocation.count(),
    prisma.payment.count(),
    prisma.ledgerEntry.count(),
  ]);

  // Check Box-32 active loans
  const box32 = await prisma.storageLocation.findFirst({
    where: { label: 'Box-32' },
    include: {
      packets: {
        where: { status: 'STORED' },
        include: {
          loan: {
            select: {
              loanCode: true,
              legacyPledgeNo: true,
              status: true,
              principalAmount: true,
              customer: { select: { fullName: true } },
            },
          },
        },
      },
    },
  });

  console.log('=== MIGRATION VERIFICATION SUMMARY ===');
  console.log(`Total Customers:       ${totalCustomers} (${customersWithoutMobile} with null mobile as per legacy)`);
  console.log(`Total Loans:           ${totalLoans}`);
  console.log(`  - Active Loans:      ${activeLoans}`);
  console.log(`  - Closed Loans:      ${closedLoans}`);
  console.log(`  - Hold Loans:        ${holdLoans}`);
  console.log(`Total Jewellery Items: ${totalJewellery}`);
  console.log(`  - Gold Items:        ${goldItems}`);
  console.log(`  - Silver Items:      ${silverItems}`);
  console.log(`  - Other Items:       ${otherItems}`);
  console.log(`Total Packets:         ${totalPackets}`);
  console.log(`  - STORED (Active):   ${storedPackets}`);
  console.log(`  - RELEASED (Closed): ${releasedPackets}`);
  console.log(`Storage Locations:     ${totalLocations} physical boxes created (Box-01 to Box-100)`);
  console.log(`Total Payments:        ${totalPayments}`);
  console.log(`Total Ledger Entries:  ${totalLedgerEntries}`);

  if (box32) {
    console.log(`\n=== Physical Box-32 Spot Check ===`);
    console.log(`Active packets physically in Box-32 right now: ${box32.packets.length}`);
    for (const p of box32.packets.slice(0, 5)) {
      console.log(`  * ${p.packetCode} -> Loan ${p.loan.loanCode} (Legacy: ${p.loan.legacyPledgeNo}), ${p.loan.customer.fullName}, Principal: Rs.${p.loan.principalAmount}`);
    }
    if (box32.packets.length > 5) {
      console.log(`  ... and ${box32.packets.length - 5} more loans sharing Box-32`);
    }
  }
}

verify().finally(async () => {
  await prisma.$disconnect();
});
