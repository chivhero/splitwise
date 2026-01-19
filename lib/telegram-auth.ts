// Telegram WebApp Authorization Validation
// Author: @V_day0 (https://x.com/V_day0)
// Security: HIGH - validates Telegram initData with HMAC-SHA256

import crypto from 'crypto';

/**
 * Validates Telegram WebApp initData signature
 * @param initData - Raw initData string from Telegram WebApp
 * @param botToken - Bot token from environment variable
 * @returns true if signature is valid, false otherwise
 */
export function validateInitData(initData: string, botToken: string): boolean {
  try {
    console.log('[Telegram Auth] Validating initData...');
    console.log('[Telegram Auth] initData length:', initData.length);
    console.log('[Telegram Auth] botToken length:', botToken.length);
    
    // Parse initData into URLSearchParams
    const params = new URLSearchParams(initData);
    
    // Telegram может использовать либо 'hash' либо 'signature'
    const hash = params.get('hash') || params.get('signature');
    
    if (!hash) {
      console.error('[Telegram Auth] No hash/signature provided in initData');
      return false;
    }

    console.log('[Telegram Auth] Hash from initData:', hash);

    // Remove hash/signature from params for validation
    params.delete('hash');
    params.delete('signature');

    // Sort params alphabetically and create data-check-string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    console.log('[Telegram Auth] data-check-string:', dataCheckString);

    // Create secret key: HMAC-SHA256(bot_token, "WebAppData")
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    console.log('[Telegram Auth] secretKey (hex):', secretKey.toString('hex'));

    // Calculate hash: HMAC-SHA256(data-check-string, secret_key)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Compare hashes
    const isValid = calculatedHash === hash;

    if (!isValid) {
      console.error('[Telegram Auth] Hash validation failed');
      console.error('[Telegram Auth] Expected:', calculatedHash);
      console.error('[Telegram Auth] Received:', hash);
    } else {
      console.log('[Telegram Auth] ✅ Hash validation successful!');
    }

    return isValid;
  } catch (error) {
    console.error('[Telegram Auth] Validation error:', error);
    return false;
  }
}

/**
 * Extracts user data from validated initData
 * @param initData - Raw initData string from Telegram WebApp
 * @returns Parsed user object or null
 */
export function parseInitData(initData: string): {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
} | null {
  try {
    const params = new URLSearchParams(initData);
    const userParam = params.get('user');
    
    if (!userParam) {
      console.error('[Telegram Auth] No user data in initData');
      return null;
    }

    const user = JSON.parse(decodeURIComponent(userParam));
    
    // Validate required fields
    if (!user.id || !user.first_name) {
      console.error('[Telegram Auth] Missing required user fields');
      return null;
    }

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      photo_url: user.photo_url,
      language_code: user.language_code,
    };
  } catch (error) {
    console.error('[Telegram Auth] Failed to parse initData:', error);
    return null;
  }
}

/**
 * Validates auth_date from initData (prevents replay attacks)
 * @param initData - Raw initData string from Telegram WebApp
 * @param maxAgeSeconds - Maximum age of initData in seconds (default: 86400 = 24 hours)
 * @returns true if auth_date is valid, false otherwise
 */
export function validateAuthDate(initData: string, maxAgeSeconds: number = 86400): boolean {
  try {
    const params = new URLSearchParams(initData);
    const authDate = params.get('auth_date');
    
    if (!authDate) {
      console.error('[Telegram Auth] No auth_date in initData');
      return false;
    }

    const authTimestamp = parseInt(authDate, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const age = currentTimestamp - authTimestamp;

    if (age > maxAgeSeconds) {
      console.error(`[Telegram Auth] initData too old: ${age}s (max: ${maxAgeSeconds}s)`);
      return false;
    }

    if (age < 0) {
      console.error('[Telegram Auth] initData from future (clock skew)');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram Auth] Failed to validate auth_date:', error);
    return false;
  }
}
