import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    console.log('Customers:', await prisma.customer.count());
    console.log('Loans:', await prisma.loan.count());
    console.log('Appraisals:', await prisma.appraisal.count());
    console.log('Jewellery Items:', await prisma.jewelleryItem.count());
    console.log('Ledger Entries:', await prisma.ledgerEntry.count());
}

verify().finally(async () => {
    await prisma.$disconnect();
});
