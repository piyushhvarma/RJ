import { PrismaClient, LoanStatus } from '@prisma/client';
import * as fs from 'fs';
import { parse } from 'csv-parse';

const prisma = new PrismaClient();

function parseMsDate(dateStr: string): Date {
    if (!dateStr || !dateStr.includes('Date(')) return new Date();
    const match = dateStr.match(/\d+/);
    if (!match) return new Date();
    return new Date(Number(match[0]));
}

async function main() {
    console.log('Starting Legacy Data Migration...');

    // Get default system user
    const adminUser = await prisma.user.findFirst();
    if (!adminUser) throw new Error("No admin user found. Seed the db first!");

    const customerMap = new Map<string, string>();
    let rowsProcessed = 0;
    let codeCounter = 1;

    const parser = fs.createReadStream('./prisma/legacy_loans.csv').pipe(parse({ columns: true, skip_empty_lines: true, bom: true }));

    for await (const row of parser) {
        rowsProcessed++;
        if (rowsProcessed % 1000 === 0) console.log(`Processed ${rowsProcessed} rows...`);

        try {
            const customerKey = `${row.pledgersName}_${row.city}`;
            let customerId = customerMap.get(customerKey);

            if (!customerId) {
                const address = [row.address, row.city, row.taluka, row.dist].filter(Boolean).join(', ');
                const genCode = `CLGY-${Date.now()}-${codeCounter++}`;
                const customer = await prisma.customer.create({
                    data: {
                        customerCode: genCode,
                        fullName: row.pledgersName || 'Unknown',
                        mobile: `9999900000`,
                        address,
                        createdById: adminUser.id
                    }
                });
                customerId = customer.id;
                customerMap.set(customerKey, customerId);
            }

            let status: LoanStatus = 'ACTIVE';
            if (row.status === 'r') status = 'CLOSED';

            const loanAmt = parseFloat(row.loanAmt) || 0;
            const loanDate = parseMsDate(row.loandate);

            await prisma.loan.create({
                data: {
                    id: `LL-${row.pno}`,
                    loanCode: `LGY-${row.pno}`,
                    customerId,
                    status,
                    sanctionedDate: loanDate,
                    principalAmount: loanAmt,
                    createdById: adminUser.id,
                    appraisals: {
                        create: {
                            status: 'MANAGER_APPROVED',
                            totalEstimatedValue: parseFloat(row.estamtrs) || 0,
                            appraisedById: adminUser.id,
                            items: {
                                create: [
                                    {
                                        type: row.pledgetype?.replace(/,.*$/, '') || 'Jewellery',
                                        grossWeight: parseFloat(row.GrossWt) || 0,
                                        netWeight: parseFloat(row.FineWt) || 0,
                                        purity: parseFloat(row.Fine) || 80,
                                        quantity: parseInt(row.qty) || 1
                                    }
                                ]
                            }
                        }
                    },
                    ledger: {
                        create: [
                            {
                                type: 'DISBURSEMENT',
                                amount: loanAmt,
                                balanceAfter: loanAmt,
                                createdById: adminUser.id
                            }
                        ]
                    }
                }
            });
        } catch (err: any) {
            console.error(`Error processing row ${row.pno}: ${err.message}`);
        }
    }

    console.log(`\nMigration completed successfully. Processed ${rowsProcessed} total records.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
