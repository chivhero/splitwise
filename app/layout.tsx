import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import TelegramProvider from '@/components/TelegramProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import ErrorBoundary from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'SplitWise - Делим расходы легко',
  description: 'Простое приложение для разделения расходов с друзьями',
  other: {
    'app-version': 'tribute-v3-' + Date.now(),
    'cache-control': 'no-cache, no-store, must-revalidate',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive"
        />
        <ErrorBoundary>
          <LanguageProvider>
            <TelegramProvider>
              {children}
            </TelegramProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

