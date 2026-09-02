export default function LoansPage() {
    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
                <a
                    href="/loans/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                >
                    + Create Loan
                </a>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
                <p className="font-semibold">No global loan list endpoint available yet.</p>
                <p className="mt-1">
                    There is no backend endpoint to list all loans. To find a loan, search for the customer
                    first — each customer profile shows their active and closed loans.
                </p>
                <a href="/customers" className="mt-3 inline-block text-amber-700 underline hover:text-amber-900">
                    Go to Customer Search →
                </a>
            </div>
        </div>
    );
}
