import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import TelegramProvider from '@/components/TelegramProvider';
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
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body className={inter.className}>
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

