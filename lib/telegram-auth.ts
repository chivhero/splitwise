import crypto from 'crypto';

/**
 * Валидация Telegram Web App initData
 * Проверяет криптографическую подпись от Telegram
 */
export function validateTelegramWebAppData(initData: string): boolean {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!BOT_TOKEN) {
      console.error('❌ TELEGRAM_BOT_TOKEN not configured');
      return false;
    }

    // Парсим initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    
    if (!hash) {
      console.warn('⚠️ No hash in initData');
      return false;
    }
    
    params.delete('hash');
    
    // Проверяем время (данные не старше 24 часов)
    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    
    if (now - authDate > 86400) {
      console.warn('⚠️ Expired initData (older than 24 hours)');
      return false;
    }
    
    // Сортируем параметры по алфавиту
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Создаём секретный ключ из Bot Token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(BOT_TOKEN)
      .digest();
    
    // Вычисляем hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // Безопасное сравнение (защита от timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(calculatedHash, 'hex')
    );
    
    if (!isValid) {
      console.warn('⚠️ Invalid initData hash - possible forgery attempt');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Error validating Telegram data:', error);
    return false;
  }
}

/**
 * Получить Telegram User ID из валидированного initData
 */
export function getTelegramUserFromInitData(initData: string): number | null {
  if (!validateTelegramWebAppData(initData)) {
    return null;
  }
  
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    
    if (!userParam) {
      return null;
    }
    
    const userData = JSON.parse(userParam);
    return userData.id || null;
  } catch (error) {
    console.error('❌ Error parsing Telegram user data:', error);
    return null;
  }
}

/**
 * Получить полные данные пользователя из initData
 */
export function getTelegramUserData(initData: string) {
  if (!validateTelegramWebAppData(initData)) {
    return null;
  }
  
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    
    if (!userParam) {
      return null;
    }
    
    return JSON.parse(userParam);
  } catch (error) {
    console.error('❌ Error parsing Telegram user data:', error);
    return null;
  }
}

/**
 * Проверка является ли пользователь админом
 */
export function isAdmin(userId: number): boolean {
  const ADMIN_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || [];
  return ADMIN_IDS.includes(userId);
}

/**
 * Получить список админов
 */
export function getAdminIds(): number[] {
  return process.env.ADMIN_TELEGRAM_IDS?.split(',').map(id => parseInt(id.trim())) || [];
}


