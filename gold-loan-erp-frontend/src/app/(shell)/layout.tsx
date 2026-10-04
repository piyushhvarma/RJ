import React, { Suspense } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden">
            <Suspense fallback={<aside className="w-64 min-h-screen bg-white border-r border-gray-200" />}>
                <Sidebar />
            </Suspense>
            <main className="flex-1 overflow-auto custom-scrollbar">
                {children}
            </main>
        </div>
    );
}
