import '../globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import TelegramProvider from '@/components/TelegramProvider';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {locales} from '@/i18n';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'SplitWise - Делим расходы легко',
  description: 'Простое приложение для разделения расходов с друзьями',
};

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function RootLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // Проверяем валидность локали
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Получаем переводы для текущей локали
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <TelegramProvider>
            {children}
          </TelegramProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

