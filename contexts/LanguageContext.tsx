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
  try {
    // 1. Проверяем localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language');
      if (saved === 'en' || saved === 'ru') {
        return saved;
      }
    }
    
    // 2. Проверяем язык браузера
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.language) {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('ru') || 
          browserLang.startsWith('be') || 
          browserLang.startsWith('uk')) {
        return 'ru';
      }
    }
  } catch (error) {
    console.warn('Error detecting language:', error);
  }
  
  // 3. По умолчанию русский
  return 'ru';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Инициализируем язык сразу, синхронно
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'ru';
    return detectUserLanguage();
  });

  const setLocale = (newLocale: Locale) => {
    console.log('[Language] Switching to:', newLocale);
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('language', newLocale);
        console.log('[Language] Saved to localStorage:', newLocale);
      } catch (error) {
        console.warn('Failed to save language to localStorage:', error);
      }
    }
  };

  const t = (key: string, params?: Record<string, any>): string => {
    const template = getNestedValue(messages[locale], key);
    const result = interpolate(template, params);
    return result;
  };

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


