import { PrismaClient, LoanStatus, InterestType, RecordLifecycle } from '@prisma/client';
import * as fs from 'fs';
import { parse } from 'csv-parse';

const prisma = new PrismaClient();

function parseMsDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    if (dateStr.includes('Date(')) {
        const match = dateStr.match(/\d+/);
        if (!match) return null;
        return new Date(Number(match[0]));
    }
    // Handle "21-01-2016 00:00:00" format
    const parts = dateStr.split(" ");
    if (parts[0]) {
        const [day, month, year] = parts[0].split("-");
        if (day && month && year) {
            return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
        }
    }
    return new Date(dateStr);
}

async function main() {
    console.log('Starting Complete Legacy Data Migration with full mapping...');

    const adminUser = await prisma.user.findFirst();
    if (!adminUser) throw new Error("No admin user found. Seed the db first!");

    console.log('Wiping existing data for idempotency...');
    await prisma.ledgerEntry.deleteMany({});
    await prisma.appraisal.deleteMany({});
    await prisma.jewelleryPhoto.deleteMany({});
    await prisma.jewelleryItem.deleteMany({});
    await prisma.packet.deleteMany({});
    await prisma.loan.deleteMany({});
    await prisma.customer.deleteMany({});
    // Delete schemes created by previous runs
    await prisma.loanScheme.deleteMany({
        where: { name: { in: ['Standard 3%', 'Custom 2.75%', 'Custom 2.5%', 'Custom 2%'] } }
    });

    console.log('Setting up Loan Schemes...');
    const schemes = {
        '3': await prisma.loanScheme.create({ data: { name: 'Standard 3%', interestType: 'MONTHLY_SIMPLE', interestRate: 3.0, active: true } }),
        '2.75': await prisma.loanScheme.create({ data: { name: 'Custom 2.75%', interestType: 'MONTHLY_SIMPLE', interestRate: 2.75, active: true } }),
        '2.5': await prisma.loanScheme.create({ data: { name: 'Custom 2.5%', interestType: 'MONTHLY_SIMPLE', interestRate: 2.5, active: true } }),
        '2': await prisma.loanScheme.create({ data: { name: 'Custom 2%', interestType: 'MONTHLY_SIMPLE', interestRate: 2.0, active: true } })
    };

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
                const addressFields = [row.address, row.city, row.post, row.taluka, row.dist].filter(Boolean);
                const address = addressFields.join(', ');
                const genCode = `CLGY-${Date.now()}-${codeCounter++}`;

                const customer = await prisma.customer.create({
                    data: {
                        customerCode: genCode,
                        fullName: row.pledgersName || 'Unknown Name',
                        mobile: `9999900000`,
                        address,
                        city: row.city || null,
                        state: 'Maharashtra',
                        createdById: adminUser.id,
                        status: 'ACTIVE'
                    }
                });
                customerId = customer.id;
                customerMap.set(customerKey, customerId);
            }

            const isClosed = row.status === 'r';
            const status: LoanStatus = isClosed ? 'CLOSED' : 'ACTIVE';
            const loanAmt = parseFloat(row.loanAmt) || 0;
            const loanDate = parseMsDate(row.loandate) || new Date();
            const maturityDateDate = parseMsDate(row.loanrefdate);
            const closedDate = isClosed ? parseMsDate(row.RefundedDt) : null;

            // Calculate interest logic
            let finalInterestRate = 3.0;
            let schemeId = schemes['3'].id;

            // If legacy intratepa = 24% PA -> 2% PM
            const legacyIntPa = parseFloat(row.intratepa);
            if (legacyIntPa) {
                const legacyIntPm = legacyIntPa / 12;
                if (legacyIntPm === 2.0) { finalInterestRate = 2.0; schemeId = schemes['2'].id; }
                else if (legacyIntPm === 2.5) { finalInterestRate = 2.5; schemeId = schemes['2.5'].id; }
                else if (legacyIntPm === 2.75) { finalInterestRate = 2.75; schemeId = schemes['2.75'].id; }
            }

            let interestTypeToUse: InterestType = 'MONTHLY_SIMPLE';
            // Compound logic: exceeding 1 year
            let durationDays = 0;
            if (isClosed && closedDate) {
                durationDays = (closedDate.getTime() - loanDate.getTime()) / (1000 * 3600 * 24);
            } else {
                durationDays = (Date.now() - loanDate.getTime()) / (1000 * 3600 * 24);
            }

            if (durationDays > 365) {
                interestTypeToUse = 'ANNUAL_COMPOUNDED';
            }

            const jewelleryDesc = row.pledgetype?.replace(/,.*$/, '') || 'Jewellery';
            const qty = parseInt(row.qty) || 1;
            const fullDesc = qty > 1 ? `${jewelleryDesc} (Qty: ${qty})` : jewelleryDesc;

            const extraNotes = [
                `Legacy AC: ${row.ac_no}`,
                row.Bag_No ? `Legacy Bag: ${row.Bag_No}` : null,
                `Original Valuation: ${row.estamtrs}`
            ].filter(Boolean).join(' | ');

            const loan = await prisma.loan.create({
                data: {
                    id: `LL-${row.pno}`,
                    loanCode: `LGY-${row.pno}`,
                    customerId,
                    status,
                    sanctionedDate: loanDate,
                    maturityDate: maturityDateDate,
                    principalAmount: loanAmt,
                    schemeId: schemeId,
                    interestRate: finalInterestRate,
                    interestType: interestTypeToUse,
                    createdById: adminUser.id,
                    holdNotes: extraNotes,
                    updatedAt: closedDate || loanDate, // Help track closure date
                    appraisals: {
                        create: {
                            status: 'MANAGER_APPROVED',
                            appraiserId: adminUser.id,
                            approvedById: adminUser.id,
                            approvedAt: loanDate,
                            notes: extraNotes
                        }
                    },
                    jewelleryItems: {
                        create: [
                            {
                                itemCode: `JGY-${row.pno}-1`,
                                category: 'Legacy Jewellery',
                                description: fullDesc,
                                grossWeight: parseFloat(row.GrossWt) || 0,
                                stoneWeight: 0,
                                netWeight: parseFloat(row.FineWt) || 0,
                                purityKarat: row.Fine ? `${row.Fine}%` : '80%',
                                valuationRate: 0,
                                valuation: parseFloat(row.estamtrs) || 0,
                                status: isClosed ? 'RELEASED' : 'PLEDGED',
                                releasedAt: closedDate,
                            }
                        ]
                    },
                    ledgerEntries: {
                        create: [
                            {
                                type: 'DISBURSEMENT',
                                amount: loanAmt,
                                balanceAfter: loanAmt,
                                createdById: adminUser.id,
                                createdAt: loanDate
                            }
                        ]
                    }
                }
            });

            // If loan is closed, simulate a payment that zeros the balance
            if (isClosed) {
                await prisma.ledgerEntry.create({
                    data: {
                        loanId: loan.id,
                        type: 'PAYMENT',
                        amount: loanAmt,
                        balanceAfter: 0,
                        createdById: adminUser.id,
                        reason: 'Legacy closure simulation',
                        createdAt: closedDate || loanDate
                    }
                });
            }

            // Create a packet if Bag_No is provided
            if (row.Bag_No && row.Bag_No.trim() !== "") {
                await prisma.packet.create({
                    data: {
                        packetCode: `PKT-LGY-${row.pno}`,
                        loanId: loan.id,
                        status: isClosed ? 'RELEASED' : 'STORED',
                        createdById: adminUser.id,
                        releasedAt: closedDate
                    }
                });
            }

        } catch (err: any) {
            console.error(`Error processing row ${row.pno}: ${err.message}`);
        }
    }

    console.log(`\nFull Migration completed successfully! Processed ${rowsProcessed} total records.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
