import { Client } from 'pg';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('====================================================');
  console.log('CLONING POSTGRESQL (gold_loan_erp) -> BOOK 2 (KACCHA)');
  console.log('====================================================\n');

  const startTime = Date.now();

  // 1. Connect to PostgreSQL
  const pgClient = new Client({
    connectionString: 'postgresql://postgres:Piyush@1110@localhost:5432/gold_loan_erp'
  });
  await pgClient.connect();
  console.log('Connected to PostgreSQL database: gold_loan_erp');

  // 2. Connect to Book 2 (SQLite)
  const book2Path = path.resolve(__dirname, '../data/book2_kaccha.db');
  console.log(`Target SQLite Book 2 path: ${book2Path}`);

  // Create backup of existing file just in case
  if (fs.existsSync(book2Path)) {
    const backupPath = `${book2Path}.pre-clone-${Date.now()}.bak`;
    fs.copyFileSync(book2Path, backupPath);
    console.log(`Created local safety backup at: ${backupPath}`);
  }

  const prismaBook2 = new PrismaClient({
    datasources: { db: { url: `file:${book2Path}` } }
  });
  await prismaBook2.$connect();

  // Configure SQLite WAL mode & high-performance bulk settings
  await prismaBook2.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
  await prismaBook2.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
  await prismaBook2.$executeRawUnsafe('PRAGMA cache_size = 20000;');
  await prismaBook2.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
  console.log('Configured SQLite: WAL mode active, synchronous NORMAL, cache_size 20000, foreign_keys OFF for migration.\n');

  // 3. Clear existing Book 2 tables in safe reverse order
  console.log('Clearing old records from Book 2...');
  const tablesToClear = [
    'audit_logs',
    'document_versions',
    'documents',
    'packet_movements',
    'packets',
    'appraisals',
    'jewellery_photos',
    'jewellery_items',
    'ledger_entries',
    'payments',
    'loans',
    'loan_schemes',
    'biometric_verification_logs',
    'biometric_enrollments',
    'customer_documents',
    'customers',
    'storage_locations',
    'id_sequences',
    'notifications',
    'users'
  ];

  for (const tbl of tablesToClear) {
    await prismaBook2.$executeRawUnsafe(`DELETE FROM "${tbl}";`);
  }
  console.log('Cleared all tables in Book 2.\n');

  // Helper for chunked insert
  async function cloneTable(
    tableName: string,
    prismaModel: any,
    chunkSize = 1000,
    transformRow?: (row: any) => any
  ) {
    const tableStart = Date.now();
    const countRes = await pgClient.query(`SELECT count(*) FROM "${tableName}";`);
    const totalRows = parseInt(countRes.rows[0].count, 10);

    if (totalRows === 0) {
      console.log(`[${tableName}] 0 rows in PostgreSQL. Skipping.`);
      return;
    }

    process.stdout.write(`[${tableName}] Cloning ${totalRows.toLocaleString()} rows... `);

    // Fetch in stream/chunks from PG
    const queryRes = await pgClient.query(`SELECT * FROM "${tableName}";`);
    const rows = transformRow ? queryRes.rows.map(transformRow) : queryRes.rows;

    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await prismaModel.createMany({
        data: chunk
      });
      inserted += chunk.length;
    }

    const elapsed = ((Date.now() - tableStart) / 1000).toFixed(2);
    console.log(`DONE (${inserted.toLocaleString()} rows in ${elapsed}s)`);
  }

  // 4. Clone in dependency-safe order
  console.log('--- Beginning Data Migration ---');

  // 4.1 Users
  await cloneTable('users', prismaBook2.user, 500);

  // 4.2 Storage Locations
  await cloneTable('storage_locations', prismaBook2.storageLocation, 500);

  // 4.3 Loan Schemes
  await cloneTable('loan_schemes', prismaBook2.loanScheme, 500);

  // 4.4 Customers
  await cloneTable('customers', prismaBook2.customer, 1000);

  // 4.5 Customer Documents
  await cloneTable('customer_documents', prismaBook2.customerDocument, 1000);

  // 4.6 Biometric Enrollments
  await cloneTable('biometric_enrollments', prismaBook2.biometricEnrollment, 500);

  // 4.7 Biometric Verification Logs
  await cloneTable('biometric_verification_logs', prismaBook2.biometricVerificationLog, 500);

  // 4.8 Loans
  await cloneTable('loans', prismaBook2.loan, 1000);

  // 4.9 Jewellery Items
  await cloneTable('jewellery_items', prismaBook2.jewelleryItem, 1000);

  // 4.10 Jewellery Photos
  await cloneTable('jewellery_photos', prismaBook2.jewelleryPhoto, 1000);

  // 4.11 Appraisals
  await cloneTable('appraisals', prismaBook2.appraisal, 1000);

  // 4.12 Packets
  await cloneTable('packets', prismaBook2.packet, 1000);

  // 4.13 Packet Movements
  await cloneTable('packet_movements', prismaBook2.packetMovement, 500);

  // 4.14 Payments
  await cloneTable('payments', prismaBook2.payment, 1000);

  // 4.15 Ledger Entries
  await cloneTable('ledger_entries', prismaBook2.ledgerEntry, 1000);

  // 4.16 Documents
  await cloneTable('documents', prismaBook2.document, 500);

  // 4.17 Document Versions
  await cloneTable('document_versions', prismaBook2.documentVersion, 500);

  // 4.18 Notifications
  await cloneTable('notifications', prismaBook2.notification, 500);

  // 4.19 ID Sequences
  await cloneTable('id_sequences', prismaBook2.idSequence, 500);

  // 4.20 Audit Logs
  await cloneTable('audit_logs', prismaBook2.auditLog, 1000);

  // 4.21 Ledger Entries Audit Snapshot Table
  console.log('\nCreating and cloning ledger_entries_audit_snapshot_20261004...');
  await prismaBook2.$executeRawUnsafe(`DROP TABLE IF EXISTS ledger_entries_audit_snapshot_20261004;`);
  await prismaBook2.$executeRawUnsafe(`
    CREATE TABLE ledger_entries_audit_snapshot_20261004 AS SELECT * FROM ledger_entries;
  `);
  const snapCount: any[] = await prismaBook2.$queryRawUnsafe(
    `SELECT count(*) as count FROM ledger_entries_audit_snapshot_20261004;`
  );
  console.log(`Snapshot table created with ${snapCount[0].count.toLocaleString()} rows.`);

  // 5. Foreign Key Check
  console.log('\nRe-enabling foreign keys & verifying integrity...');
  await prismaBook2.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
  const fkErrors: any[] = await prismaBook2.$queryRawUnsafe('PRAGMA foreign_key_check;');
  if (fkErrors.length > 0) {
    console.error(`WARNING: ${fkErrors.length} foreign key discrepancies found:`, fkErrors);
  } else {
    console.log('Foreign key check passed: 0 discrepancies found! 100% relational integrity.');
  }

  // 6. Final Control Totals Verification
  console.log('\n====================================================');
  console.log('FINAL CONTROL TOTALS: PostgreSQL vs SQLite Book 2');
  console.log('====================================================');

  const verificationTables = [
    'users',
    'storage_locations',
    'loan_schemes',
    'customers',
    'loans',
    'jewellery_items',
    'appraisals',
    'packets',
    'packet_movements',
    'payments',
    'ledger_entries',
    'documents',
    'document_versions',
    'biometric_enrollments',
    'id_sequences',
    'audit_logs'
  ];

  let totalPgRows = 0;
  let totalBook2Rows = 0;
  let allMatched = true;

  for (const tbl of verificationTables) {
    const pgRes = await pgClient.query(`SELECT count(*) FROM "${tbl}";`);
    const pgCount = parseInt(pgRes.rows[0].count, 10);
    const b2Res: any[] = await prismaBook2.$queryRawUnsafe(`SELECT count(*) as count FROM "${tbl}";`);
    const b2Count = parseInt(b2Res[0].count, 10);

    totalPgRows += pgCount;
    totalBook2Rows += b2Count;

    const status = pgCount === b2Count ? 'MATCH' : 'MISMATCH';
    if (pgCount !== b2Count) allMatched = false;

    console.log(
      `${tbl.padEnd(25)} | PG: ${pgCount.toString().padStart(7)} | Book2: ${b2Count.toString().padStart(7)} | ${status}`
    );
  }

  console.log('----------------------------------------------------');
  console.log(
    `TOTAL ROWS                | PG: ${totalPgRows.toString().padStart(7)} | Book2: ${totalBook2Rows.toString().padStart(7)} | ${
      allMatched ? '100% PERFECT MATCH' : 'MISMATCH DETECTED'
    }`
  );
  console.log('====================================================');

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Migration completed successfully in ${totalElapsed} seconds.`);

  await pgClient.end();
  await prismaBook2.$disconnect();
}

main().catch(err => {
  console.error('Fatal error during clone:', err);
  process.exit(1);
});
