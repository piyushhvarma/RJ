# scripts/README.md — Running the Legacy Jsoft Migration

## What's in this folder

- `legacy-data/pledge.csv`, `legacy-data/pledgerec.csv` — your real historical
  data, already extracted from `Jsoft.mdb` (26,570 pledges, 24,828 payment
  records). No need to touch the original `.mdb` file or install any Access-
  reading tools on Windows — this is already done.
- `migrate-legacy-jsoft.ts` — the migration script itself.
- `wipe-migrated-data.ts` — clears out any prior migrated data so you can
  run the migration cleanly. Read the confirmation prompt carefully before
  typing "yes" — it deletes real rows.
- `MIGRATION_NOTES.md` — **read this before trusting any of the migrated
  data.** It documents every place this migration had to make a judgment
  call or couldn't recover information the old system never captured.

## Before you start

Two schema fields were added to support this migration properly:
`Customer.mobile` is now optional (historical customers never had one on
file), and `JewelleryItem.metalType` was added (your history includes real
silver "chandi" pledges, not just gold). You need to apply this schema
change first:

```
npx prisma generate
npx prisma migrate dev --name add_legacy_migration_fields
```

## Run order

```
npm install csv-parse --save-dev

# 1. If you already have data from a prior migration you don't fully
#    trust (e.g. from an earlier agent session), wipe it first. Skip
#    this if your database is already empty of business data.
npm run migrate:wipe-legacy

# 2. Run the actual migration. This processes 26,570 pledges — it will
#    take a few minutes and print progress every 500 records.
npm run migrate:legacy-jsoft
```

## After it finishes

1. Read `MIGRATION_NOTES.md` in full — it's short, and every caveat in it
   matters for how much you can trust specific fields.
2. Spot-check 5-10 loans by their original pledge number
   (`Loan.legacyPledgeNo`) against the source data, across different years
   and at least one silver item.
3. Check for any loans with `status = HOLD` — that means this script hit a
   status value in the source data it didn't recognize as either "closed"
   or "active", and needs a human decision.
4. Plan the physical safe-walk for your ~1,740 active loans — no packets
   or storage locations were created for them, on purpose (see
   `MIGRATION_NOTES.md` point 5). This is real, necessary work, not
   something a script can shortcut.
5. Plan how staff will collect missing mobile numbers/KYC for historical
   customers as they come in for new loans or to close existing ones.
