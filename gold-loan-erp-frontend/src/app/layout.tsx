import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Radhika Jewellers — Gold Loan ERP',
  description: 'Gold Loan & Pledge Management System — Enterprise Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-gray-50 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
