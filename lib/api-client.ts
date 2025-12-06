/**
 * API Client с автоматической передачей Telegram initData
 */

import { getTelegramWebApp } from './telegram';

/**
 * Получить initData для отправки в API
 */
export function getInitData(): string | null {
  if (typeof window === 'undefined') return null;
  
  const webApp = getTelegramWebApp();
  return webApp?.initData || null;
}

/**
 * Fetch wrapper с автоматической передачей Telegram auth
 */
export async function authFetch(url: string, options: RequestInit = {}) {
  const initData = getInitData();
  
  const headers = new Headers(options.headers || {});
  
  if (initData) {
    headers.set('x-telegram-init-data', initData);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Админский API клиент (с дополнительной валидацией)
 */
export const adminAPI = {
  async grantPremium(targetUserId: string, days: number) {
    const response = await authFetch('/api/admin/premium', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, days }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to grant premium');
    }
    
    return response.json();
  },
  
  async getStats() {
    const response = await authFetch('/api/admin/stats');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch stats');
    }
    
    return response.json();
  },
  
  async createPromoCode(code: string, days: number, maxUses: number) {
    const response = await authFetch('/api/admin/promocodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, days, maxUses }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create promo code');
    }
    
    return response.json();
  },
  
  async getAuditLog(limit: number = 50) {
    const response = await authFetch(`/api/admin/audit-log?limit=${limit}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch audit log');
    }
    
    return response.json();
  },
};


