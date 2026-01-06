# 🌟 Настройка Telegram Stars Payments

## Что реализовано

✅ API endpoint для создания invoice через Telegram Stars
✅ Webhook handler для обработки платежей
✅ Автоматическая активация Premium после оплаты
✅ Проверка статуса Premium в реальном времени
✅ Интеграция с существующим UI

## Как работает

1. Пользователь нажимает "Активировать Premium" в баннере
2. Создаётся invoice с ценой 100 Telegram Stars
3. Telegram показывает окно оплаты
4. После оплаты webhook получает уведомление
5. База данных обновляется (premium = true, срок 1 месяц)
6. Пользователь получает сообщение об активации

## Настройка Telegram Bot

### 1. Установка webhook

Выполните в терминале (замените YOUR_BOT_TOKEN на ваш токен):

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://2-self-zeta.vercel.app/api/payments/webhook",
    "allowed_updates": ["pre_checkout_query", "message"],
    "secret_token": "YOUR_RANDOM_SECRET_TOKEN"
  }'
```

### 2. Проверка webhook

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

Должно показать:
```json
{
  "ok": true,
  "result": {
    "url": "https://2-self-zeta.vercel.app/api/payments/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

## Переменные окружения

Добавьте в `.env.local` и `.env.production` (Vercel):

```env
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# Telegram Webhook Secret (для безопасности)
TELEGRAM_WEBHOOK_SECRET=your_random_secret_token_here

# Bot Username
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=SplitWisedbot
```

## Цены Premium

Текущие цены (можно изменить в `/api/payments/create-invoice/route.ts`):

- **100 Telegram Stars** = 1 месяц Premium

Для изменения цены измените поле `amount` в `prices`:

```typescript
prices: [
  {
    label: 'SplitWise Premium (1 месяц)',
    amount: 100, // <- измените здесь
  },
],
```

## Тестирование

### В Telegram

1. Откройте бота @SplitWisedbot
2. Запустите Mini App
3. Нажмите "Активировать Premium" в баннере
4. Выберите способ оплаты (карта/Apple Pay/Google Pay)
5. Подтвердите оплату 100 звёзд
6. Через 2-3 секунды Premium активируется

### Тестовые платежи

Telegram предоставляет тестовую среду для разработки. Используйте:

```bash
# Тестовый режим бота
curl -X POST "https://api.telegram.org/botYOUR_TEST_BOT_TOKEN/setWebhook" ...
```

## Проверка логов

### Vercel Logs

```bash
vercel logs --follow
```

Вы увидите:
- `📥 Telegram Update:` - входящие обновления от Telegram
- `✅ Successful payment:` - успешные платежи
- `🎉 Premium activated for user:` - активация Premium

### Локальная разработка

Для локального тестирования webhook используйте ngrok:

```bash
ngrok http 3000
```

Затем установите webhook на ngrok URL:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -d "url=https://your-ngrok-url.ngrok.io/api/payments/webhook"
```

## Архитектура

```
User clicks "Activate Premium"
         ↓
   lib/telegram.ts: openPremiumInvoice()
         ↓
   POST /api/payments/create-invoice
         ↓
   Telegram Bot API: createInvoiceLink
         ↓
   User pays via Telegram
         ↓
   Telegram sends pre_checkout_query
         ↓
   POST /api/payments/webhook (answer OK)
         ↓
   Telegram sends successful_payment
         ↓
   POST /api/payments/webhook
         ↓
   lib/db: updateUserPremium()
         ↓
   Send confirmation message to user
         ↓
   Frontend: refresh premium status
```

## FAQ

### Как изменить срок Premium?

В `/api/payments/webhook/route.ts` измените:

```typescript
const premiumUntil = new Date();
premiumUntil.setMonth(premiumUntil.getMonth() + 1); // <- измените на нужный срок
```

### Как добавить разные планы?

Создайте несколько invoice с разными payload:
- `premium_1month_${telegramId}`
- `premium_3months_${telegramId}`
- `premium_1year_${telegramId}`

И обрабатывайте их по-разному в webhook.

### Webhook не работает

1. Проверьте `getWebhookInfo`
2. Убедитесь, что URL доступен (HTTPS обязателен)
3. Проверьте логи Vercel
4. Убедитесь, что `TELEGRAM_BOT_TOKEN` правильный

## Безопасность

✅ Webhook проверяет `secret_token` header
✅ Все транзакции проходят через Telegram API
✅ Данные карт не хранятся
✅ Payload содержит уникальный идентификатор

## Поддержка

Документация Telegram:
- https://core.telegram.org/bots/api#payments
- https://core.telegram.org/bots/payments

Telegram Stars:
- https://telegram.org/blog/telegram-stars
