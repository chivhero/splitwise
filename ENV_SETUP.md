# Environment Variables Setup

## Добавь в `.env.local` (для разработки):

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_BOT_USERNAME=YourBotUsername
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin Configuration
# Укажи свой Telegram ID (можно получить у @userinfobot)
ADMIN_TELEGRAM_IDS=123456789,987654321

# Database (SQLite для разработки)
USE_SQLITE=true

# PostgreSQL (для продакшена на Vercel)
# POSTGRES_URL=your_postgres_url_here
```

## Добавь в Vercel Environment Variables:

1. Открой https://vercel.com/your-project/settings/environment-variables
2. Добавь:
   - `TELEGRAM_BOT_TOKEN` - токен твоего бота
   - `TELEGRAM_BOT_USERNAME` - username бота
   - `ADMIN_TELEGRAM_IDS` - **ТВОЙ TELEGRAM ID** (важно!)
   - `POSTGRES_URL` - автоматически создаётся Vercel

## Как узнать свой Telegram ID:

1. Открой @userinfobot в Telegram
2. Отправь `/start`
3. Бот покажет твой ID (например: `123456789`)
4. Скопируй этот ID в `ADMIN_TELEGRAM_IDS`

## Несколько админов:

```bash
ADMIN_TELEGRAM_IDS=123456789,987654321,555555555
```

## ⚠️ ВАЖНО:

- НЕ коммить `.env.local` в Git!
- Bot Token должен быть в секрете
- Telegram ID должен быть именно твой для безопасности


