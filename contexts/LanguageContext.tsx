'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import enMessages from '@/messages/en.json';
import ruMessages from '@/messages/ru.json';

type Locale = 'en' | 'ru';

type Messages = typeof enMessages;

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, any>) => string;
  messages: Messages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const messages: Record<Locale, Messages> = {
  en: enMessages,
  ru: ruMessages,
};

// Функция для получения значения из вложенного объекта по пути (например, "common.loading")
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path; // Возвращаем ключ, если перевод не найден
    }
  }
  
  return typeof current === 'string' ? current : path;
}

// Функция для замены параметров в строке
function interpolate(template: string, params?: Record<string, any>): string {
  if (!params) return template;
  
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

// Определение языка пользователя
function detectUserLanguage(): Locale {
  // 1. Проверяем Telegram WebApp
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    const tgLang = window.Telegram.WebApp.initDataUnsafe?.user?.language_code;
    if (tgLang) {
      // Русский язык для ru, be, uk, kk и других стран СНГ
      if (['ru', 'be', 'uk', 'kk', 'ky', 'uz', 'tg', 'az', 'hy', 'ka'].includes(tgLang)) {
        return 'ru';
      }
      return 'en';
    }
  }
  
  // 2. Проверяем localStorage
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('language');
    if (saved === 'en' || saved === 'ru') {
      return saved;
    }
    
    // 3. Проверяем язык браузера
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ru') || 
        browserLang.startsWith('be') || 
        browserLang.startsWith('uk')) {
      return 'ru';
    }
  }
  
  // 4. По умолчанию английский
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Определяем язык при монтировании
    const detectedLocale = detectUserLanguage();
    setLocaleState(detectedLocale);
    setMounted(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', newLocale);
    }
  };

  const t = (key: string, params?: Record<string, any>): string => {
    const template = getNestedValue(messages[locale], key);
    return interpolate(template, params);
  };

  // Показываем заглушку пока не определили язык
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, messages: messages[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}


