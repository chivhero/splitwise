import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SDKProvider } from '@twa-dev/sdk/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ErrorBoundary from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'SplitWise - Делим расходы легко',
  description: 'Простое приложение для разделения расходов с друзьями',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <ErrorBoundary>
          <LanguageProvider>
            <SDKProvider>
              {children}
            </SDKProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
