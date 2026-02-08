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
  return webApp?.initDataUnsafe?.user || null;
}

/**
 * Get raw initData string from Telegram WebApp
 * This string should be sent to backend for HMAC-SHA256 validation
 * @returns initData string or empty string if not available
 */
export function getTelegramInitData(): string {
  const webApp = getTelegramWebApp();
  return webApp?.initData || '';
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
export function shareGroupLink(groupId: string, groupName: string) {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'SplitWisedbot';
  const url = `https://t.me/${botUsername}?startapp=join_${groupId}`;
  const text = `🎉 Присоединяйся к группе "${groupName}" для разделения расходов!`;
  
  const webApp = getTelegramWebApp();
  if (webApp) {
    // Используем Telegram share API
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  } else {
    // Fallback для браузера
    navigator.clipboard.writeText(url);
    alert('Ссылка скопирована в буфер обмена!');
  }
}

// Tribute Payments
export function openPremiumInvoice(callback?: (status: string) => void) {
  const webApp = getTelegramWebApp();
  const tgUser = getTelegramUser();
  
  console.log('💳 openPremiumInvoice called - using TRIBUTE payment');
  
  if (webApp && tgUser) {
    // Получаем ссылку на Tribute товар
    console.log('📞 Calling /api/payments/tribute/create-link');
    fetch('/api/payments/tribute/create-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegramId: tgUser.id }),
    })
      .then(res => {
        console.log('📥 API Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('📦 API Response data:', data);
        if (data.paymentUrl) {
          console.log('✅ Opening Tribute payment:', data.paymentUrl);
          
          // Открываем ссылку Tribute в новой вкладке/окне
          // Tribute автоматически определит пользователя через Telegram Mini App
          webApp.openLink(data.paymentUrl);
          
          // После успешной оплаты Tribute отправит вебхук
          // Можно показать пользователю сообщение
          hapticFeedback('light');
          
          // Вызываем callback (если нужно обновить UI)
          // Примечание: статус будет обновлен через вебхук автоматически
          if (callback) {
            // Проверяем статус через 3 секунды (время на оплату)
            setTimeout(() => {
              fetch(`/api/users/premium-status?telegramId=${tgUser.id}`)
                .then(r => r.json())
                .then(d => {
                  if (d.isPremium) {
                    callback('paid');
                  }
                })
                .catch(err => console.error('Failed to check status:', err));
            }, 3000);
          }
        } else {
          console.error('❌ No paymentUrl in response:', data);
          showTelegramPopup('Ошибка создания платежа. Попробуйте позже.');
        }
      })
      .catch(err => {
        console.error('❌ Failed to create payment link:', err);
        showTelegramPopup('Ошибка создания платежа. Попробуйте позже.');
      });
  } else {
    showTelegramPopup('Платежи доступны только в Telegram приложении.');
  }
}








