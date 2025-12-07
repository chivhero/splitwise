// Telegram Web App SDK helpers
import { TelegramUser } from '@/types';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          query_id?: string;
          auth_date?: number;
          hash?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          setText: (text: string) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        showPopup: (params: {
          title?: string;
          message: string;
          buttons?: Array<{ id?: string; type?: string; text: string }>;
        }, callback?: (buttonId: string) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
        switchInlineQuery: (query: string, choose_chat_types?: Array<'users' | 'bots' | 'groups' | 'channels'>) => void;
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
      };
    };
  }
}

export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function getTelegramUser(): TelegramUser | null {
  const webApp = getTelegramWebApp();
  if (webApp?.initDataUnsafe?.user) {
    return webApp.initDataUnsafe.user;
  }

  if (typeof window !== 'undefined') {
    const cookie = document.cookie.split('; ').find(row => row.startsWith('telegram_user='));
    if (cookie) {
      try {
        return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
      } catch (e) {
        return null;
      }
    }
  }

  return null;
}

export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
}

export function initTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.ready();
    webApp.expand();
  }
}

export function showMainButton(text: string, onClick: () => void) {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.MainButton.setText(text);
    webApp.MainButton.onClick(onClick);
    webApp.MainButton.show();
  }
}

export function hideMainButton() {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.MainButton.hide();
  }
}

export function hapticFeedback(type: 'light' | 'success' | 'error' = 'light') {
  const webApp = getTelegramWebApp();
  if (webApp?.HapticFeedback) {
    if (type === 'success' || type === 'error') {
      webApp.HapticFeedback.notificationOccurred(type);
    } else {
      webApp.HapticFeedback.impactOccurred(type);
    }
  }
}

export function showTelegramPopup(message: string, title?: string) {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.showPopup({
      title,
      message,
      buttons: [{ type: 'ok', text: 'OK' }],
    });
  } else {
    alert(message);
  }
}

export function confirmTelegramAction(message: string, callback: (confirmed: boolean) => void) {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.showConfirm(message, callback);
  } else {
    callback(confirm(message));
  }
}

// Share group link
export function shareGroupLink(groupId: string) {
  const webApp = getTelegramWebApp();
  if (webApp && webApp.switchInlineQuery) {
    try {
      webApp.switchInlineQuery(`join_group_${groupId}`, ['users', 'groups', 'channels']);
    } catch (e) {
      console.error('Error calling switchInlineQuery:', e);
      showTelegramPopup('Не удалось открыть окно выбора чата. Возможно, ваша версия Telegram устарела.');
    }
  } else {
    // Fallback for older Telegram versions or non-Telegram environments
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'SplitWisedbot';
    const url = `https://t.me/${botUsername}?startapp=join_${groupId}`;
    navigator.clipboard.writeText(url);
    showTelegramPopup('Ссылка-приглашение скопирована! Теперь вы можете вставить ее в любой чат.');
  }
}

// Telegram Payments
export function openPremiumInvoice(callback?: (status: string) => void) {
  const webApp = getTelegramWebApp();
  if (webApp) {
    // URL будет генерироваться на бэкенде
    fetch('/api/payments/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.json())
      .then(data => {
        if (data.invoiceUrl) {
          webApp.openInvoice(data.invoiceUrl, (status) => {
            if (status === 'paid') {
              hapticFeedback('success');
            }
            callback?.(status);
          });
        }
      })
      .catch(err => {
        console.error('Failed to create invoice:', err);
        showTelegramPopup('Ошибка создания счёта. Попробуйте позже.');
      });
  }
}








