# MIGRATION_NOTES.md — What This Migration Actually Does and Doesn't Guarantee

Read this before trusting the migrated data for anything real. Nothing here
is hidden or silently approximated — every caveat below is also a comment
at the relevant line in `migrate-legacy-jsoft.ts`.

## What the source data actually contained

The `.mdb` file (Jsoft legacy pledge software) has 26,570 pledge records
spanning January 2016 to July 2026, with 24,830 marked closed/refunded and
1,740 marked active. Payment history (`PledgeRec`) has 24,828 rows. This is
real, decade-old business history — verified by cross-checking row counts
and status breakdowns directly against the raw file before writing this
script.

## Known, deliberate limitations — not bugs

1. **No mobile numbers, KYC documents, photos, or biometric data exist for
   any migrated customer.** The old system never collected any of this.
   Every migrated `Customer.mobile` is `null` and `kycStatus` is `PENDING`.
   This has to be collected the next time each real person actually walks
   into the shop — there is no way to backfill it from old data that was
   never captured.

2. **One `JewelleryItem` per pledge, always.** The old system stored one
   free-text description per pledge (e.g. "GOLD SEVEN PIEC"), which
   sometimes clearly bundles multiple physical pieces into a single
   record. This migration does NOT attempt to split those into separate
   items — it would require guessing, which is worse than being honest
   about not knowing. Every migrated item's `appraisalRemarks` says this
   explicitly. If you need accurate per-piece counts for old pledges, that
   requires manually reviewing the physical items or the original paper
   records — this script can't recover information that was never
   digitized.

3. **Metal type is inferred from text, not verified.** `MetalType` is set
   to `SILVER` if the old description contains "chandi" or "silver", `GOLD`
   if it contains "gold", otherwise `OTHER`. This is a best-effort text
   match against real historical data, not a re-appraisal. Spot-check a
   sample before trusting it in aggregate reports.

4. **Purity is stored as a raw percentage, not a karat.** The old `Fine`
   field is a purity percentage that was used for both metals. Rather than
   guess a karat equivalent, `purityKarat` is stored as `"<value>% Fine"`
   for every migrated item, gold or silver. If you want proper karat
   labels for gold items going forward, that's a separate, deliberate
   conversion decision — not something this script silently invents.

5. **No physical storage location for ACTIVE loans.** Closed loans get a
   `Packet` row marked `RELEASED` (because a refund date in the source data
   proves the gold actually came back — see `RefundedDt`). Active loans get
   **no packet created at all**, because the old system never tracked
   where anything physically sat. This is intentional: creating a fake
   `StorageLocation` would violate the whole system's core principle of
   never claiming a physical fact we don't actually have evidence for.
   **This means: someone needs to physically walk your vault/safe and
   match all 1,740 active packets against this migrated loan data,
   creating real Packet + StorageLocation records through the normal app
   flow (`POST /packets`, `POST /packets/:id/store`) as they go.** This is
   real, necessary, unavoidable manual work — not something any script can
   shortcut.

6. **Ledger balances (`balanceAfter`) are approximate for migrated
   payments.** Each payment's own `principalComponent`/`interestComponent`
   values are accurate (taken directly from the source `PledgeRec` rows).
   But `balanceAfter` on each ledger entry only reflects that one payment
   against the original principal — it does NOT replay every prior payment
   in date order to compute a true running balance. If you need an exact
   day-by-day balance history, that requires a more careful pass that
   processes each loan's payments in strict chronological order.

7. **Payment mode is always recorded as CASH.** No digital-payment concept
   was found in the source tables checked (`Tran`'s `tran_type` lookup
   only distinguishes cash/cheque/journal/etc. at a general-ledger level,
   not per pledge-payment) — if some of these were actually cheque or bank
   transfers, that distinction has been lost. Worth a second look at the
   `PaymentType` and `Tran` tables if payment-mode accuracy matters to you.

8. **Interest rate is treated as a flat annual simple rate.** The source
   `intratepa` field is used directly as `Loan.interestRate` with
   `interestType = ANNUAL_SIMPLE`. This has not been cross-checked against
   your actual historical interest calculation method — if the old system
   computed interest differently (e.g. monthly compounding, slab-based
   rates), the migrated `interestRate` value is still correct as a
   *stored fact from the source record*, but any *derived* interest
   calculations you run going forward should be checked against a few
   known historical examples first.

9. **Any pledge with a status value other than `'r'` or `'c'`** gets
   migrated with `Loan.status = HOLD` and a note in `holdNotes` naming the
   unrecognized value, rather than being silently guessed as active or
   closed. Check the `HOLD` loans after migration — there may be very few,
   or this may reveal a status code this script didn't account for.

10. **`Tran` (the 51,397-row general ledger table) was not migrated.**
    `PledgeRec` already gives clean, pledge-specific payment records, which
    is what actually maps to this app's `Payment`/`LedgerEntry` model.
    `Tran` looks like a broader general-ledger/accounting overlay (cash
    deposits, journal entries, etc.) that doesn't map cleanly onto
    per-loan payments. It's still sitting in the exported `.mdb` data if
    you want to dig into it separately for accounting reconciliation —
    just not part of this migration.

## What to actually check after running this

Pick 5-10 loans across different years and statuses (including at least
one silver item and one `HOLD` status if any exist) and compare every
field against the original pledge record by `legacyPledgeNo`. Don't just
trust that the row counts match — that only proves nothing crashed, not
that every field mapped correctly.
