'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getSession, clearSession, getActiveBook, setActiveBook, type ActiveBook } from '@/lib/auth/session';
import { RoleGate } from '@/components/shared/RoleGate';
import { cn } from '@/lib/utils';
import { telemetry } from '@/lib/telemetry/tracker';
import {
    LayoutDashboard, Users, Landmark, Gem, CreditCard, Package,
    LockKeyhole, FileText, Settings, ChevronRight, LogOut, User,
    HardDrive, Usb, ShieldCheck, RefreshCw,
} from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    roles?: string[];
    children?: { href: string; label: string }[];
}

const NAV: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
        href: '/customers',
        label: 'Customers (Grahak)',
        icon: Users,
        children: [
            { href: '/customers', label: 'All Customers (Grahak)' },
            { href: '/customers/new', label: 'Add Customer (Naya Grahak)' },
        ],
    },
    {
        href: '/loans',
        label: 'Loans (Rinn)',
        icon: Landmark,
        children: [
            { href: '/loans', label: 'All Loans (Sabhi)' },
            { href: '/loans?status=ACTIVE', label: 'Active (Chalu)' },
            { href: '/loans?status=OVERDUE', label: 'Overdue (Muddat Paar)' },
            { href: '/loans?status=CLOSED', label: 'Closed (Chukta)' },
            { href: '/loans/new', label: 'Create Loan (Naya Loan)' },
        ],
    },
    {
        href: '/jewellery',
        label: 'Jewellery (Gehne)',
        icon: Gem,
        roles: ['OWNER', 'MANAGER', 'APPRAISER'],
        children: [
            { href: '/jewellery', label: 'Inventory (Girvi Sona)' },
            { href: '/jewellery/appraisals', label: 'Appraisals (Purity Check)' },
        ],
    },
    {
        href: '/payments',
        label: 'Payments (Wasooli)',
        icon: CreditCard,
        roles: ['OWNER', 'MANAGER', 'CASHIER'],
        children: [
            { href: '/payments/new', label: 'Receive Payment (Kist Jama)' },
            { href: '/payments', label: "Today's Payments (Aaj Ki Jama)" },
        ],
    },
    {
        href: '/packets',
        label: 'Packets (Tijori Theli)',
        icon: Package,
        children: [
            { href: '/packets', label: 'All Packets (Tijori Theli)' },
        ],
    },
    {
        href: '/closures',
        label: 'Closures (Chukta)',
        icon: LockKeyhole,
        roles: ['OWNER', 'MANAGER', 'CASHIER'],
        children: [
            { href: '/closures', label: 'Pending Closures (Gehne Wapsi)' },
        ],
    },
    { href: '/reports', label: 'Reports (Hisab-Kitab)', icon: FileText, roles: ['OWNER', 'MANAGER'] },
    { href: '/settings', label: 'Settings', icon: Settings, roles: ['OWNER'] },
];

function NavLink({ item }: { item: NavItem }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isParentActive = pathname === item.href || (item.children?.some(c => {
        const cPath = c.href.split('?')[0];
        return pathname === cPath || pathname.startsWith(cPath + '/');
    }));
    const [open, setOpen] = useState(isParentActive);

    useEffect(() => {
        if (isParentActive) {
            setOpen(true);
        }
    }, [isParentActive]);

    if (item.children) {
        return (
            <div>
                <button
                    onClick={() => setOpen(v => !v)}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isParentActive
                            ? 'bg-amber-50 text-amber-800 font-semibold'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )}
                >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronRight className={cn('w-3.5 h-3.5 transition-transform duration-200', open ? 'rotate-90' : '')} />
                </button>
                {open && (
                    <div className="ml-7 mt-0.5 space-y-0.5">
                        {item.children.map(child => {
                            const [childPath, childQuery] = child.href.split('?');
                            const isSamePath = pathname === childPath;
                            let isChildActive = false;

                            if (isSamePath) {
                                if (childQuery) {
                                    const childParams = new URLSearchParams(childQuery);
                                    let allMatch = true;
                                    childParams.forEach((val, key) => {
                                        if (searchParams.get(key) !== val) allMatch = false;
                                    });
                                    isChildActive = allMatch;
                                } else {
                                    if (child.href === '/loans') {
                                        isChildActive = !searchParams.get('status');
                                    } else {
                                        isChildActive = pathname === child.href;
                                    }
                                }
                            }

                            return (
                                <Link
                                    key={child.href}
                                    href={child.href}
                                    className={cn(
                                        'block px-3 py-1.5 rounded-lg text-sm transition-colors',
                                        isChildActive
                                            ? 'text-amber-800 font-semibold bg-amber-100/70 shadow-2xs'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                                    )}
                                >
                                    {child.label}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            href={item.href}
            className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isParentActive
                    ? 'bg-amber-50 text-amber-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
            )}
        >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
        </Link>
    );
}

export function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const session = getSession();
    const [book, setBook] = useState<ActiveBook>('book1');

    useEffect(() => {
        setBook(getActiveBook());
        telemetry.track('PAGE_VIEW', { path: pathname });

        const handleKey = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
                e.preventDefault();
                const current = getActiveBook();
                const next = current === 'book1' ? 'book2' : 'book1';
                setActiveBook(next);
                setBook(next);
                telemetry.track('CLICK', { action: 'HOTKEY_SWITCH_BOOK', to: next });
                window.location.reload();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [pathname]);

    function toggleBook() {
        const next = book === 'book1' ? 'book2' : 'book1';
        setActiveBook(next);
        setBook(next);
        telemetry.track('CLICK', { action: 'CLICK_SWITCH_BOOK', to: next });
        window.location.reload();
    }

    function handleLogout() {
        clearSession();
        router.push('/login');
    }

    return (
        <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-200">
            {/* Logo */}
            <div className="flex items-center gap-3 h-16 px-4 border-b border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <Gem className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">Radhika Jewellers</p>
                    <p className="text-xs text-gray-500">Gold Loan ERP</p>
                </div>
            </div>

            {/* Book Switcher Badge */}
            <div className="px-3 pt-3 pb-1">
                <button
                    onClick={toggleBook}
                    title={book === 'book1' ? 'Active: Gopal Nathmal Varma (Ctrl+Shift+B to switch)' : 'Active: XYZ (Ctrl+Shift+B to switch)'}
                    className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border shadow-xs",
                        book === 'book1'
                            ? "bg-blue-50/80 border-blue-200 text-blue-800 hover:bg-blue-100"
                            : "bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                    )}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {book === 'book1' ? (
                            <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                            <Usb className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate">{book === 'book1' ? 'Gopal Nathmal Varma' : 'XYZ'}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 border border-current opacity-70 shrink-0 ml-1">
                        Ctrl+⇧+B
                    </span>
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 custom-scrollbar">
                {NAV.map(item => {
                    const el = <NavLink key={item.href} item={item} />;
                    if (item.roles) {
                        return (
                            <RoleGate key={item.href} roles={item.roles as any}>
                                {el}
                            </RoleGate>
                        );
                    }
                    return el;
                })}
            </nav>

            {/* Cloud Vault & Sync Indicator */}
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Cloud Vault Protected</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">WAL 60s</span>
            </div>

            {/* User footer */}
            <div className="border-t border-gray-200 px-3 py-3">
                <div className="flex items-center gap-3 px-2 py-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0" suppressHydrationWarning>
                        <p className="text-sm font-medium text-gray-900 truncate" suppressHydrationWarning>{session?.user.name ?? 'Staff'}</p>
                        <p className="text-xs text-gray-500" suppressHydrationWarning>{session?.user.role}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
