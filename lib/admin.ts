// Admin configuration
// Только эти Telegram ID имеют доступ к админ панели

const ADMIN_TELEGRAM_IDS = [
  409627169, // Owner
];

export function isAdminTelegramId(telegramId: number): boolean {
  return ADMIN_TELEGRAM_IDS.includes(telegramId);
}

export function getAdminTelegramIds(): number[] {
  return ADMIN_TELEGRAM_IDS;
}
