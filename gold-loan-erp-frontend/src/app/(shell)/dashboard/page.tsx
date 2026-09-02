export default function DashboardPage() {
    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Radhika Jewellers — Gold Loan Operations</p>
            </div>

            {/* KPI placeholder — no aggregation endpoints exist yet */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 mb-8">
                <div className="flex gap-3">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Dashboard KPIs not yet available</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            Aggregation endpoints (total active loans, outstanding balance, gold inventory, etc.)
                            are not built on the backend yet. Use the navigation to access customers, loans, packets, and payments.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick links */}
            <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Register Customer', href: '/customers/new', color: 'bg-blue-500' },
                    { label: 'Create Loan', href: '/loans/new', color: 'bg-green-500' },
                    { label: 'Receive Payment', href: '/payments/new', color: 'bg-purple-500' },
                    { label: 'Search Customers', href: '/customers', color: 'bg-amber-500' },
                ].map(item => (
                    <a
                        key={item.href}
                        href={item.href}
                        className={`${item.color} rounded-xl p-5 text-white text-sm font-semibold hover:opacity-90 transition-opacity`}
                    >
                        {item.label}
                    </a>
                ))}
            </div>
        </div>
    );
}
