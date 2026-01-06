import { NextRequest, NextResponse } from 'next/server';
import { getUserByTelegramId, updateUserPremium } from '@/lib/db-postgres';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Проверка, что запрос пришёл от Telegram
function verifyTelegramWebhook(request: NextRequest): boolean {
  // В production можно добавить проверку secret_token
  const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
  const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  
  if (expectedToken && secretToken !== expectedToken) {
    return false;
  }
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Проверяем, что запрос от Telegram
    if (!verifyTelegramWebhook(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const update = await request.json();
    console.log('📥 Telegram Update:', JSON.stringify(update, null, 2));

    // Обработка pre_checkout_query
    // Telegram проверяет, можем ли мы принять платёж
    if (update.pre_checkout_query) {
      const preCheckoutQuery = update.pre_checkout_query;
      
      // Отвечаем "OK" - платёж может быть завершён
      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: preCheckoutQuery.id,
            ok: true,
          }),
        }
      );

      return NextResponse.json({ ok: true });
    }

    // Обработка successful_payment
    // Платёж успешно завершён
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const telegramId = update.message.from.id;
      
      console.log('✅ Successful payment:', {
        telegramId,
        currency: payment.currency,
        totalAmount: payment.total_amount,
        payload: payment.invoice_payload,
      });

      // Проверяем, что это оплата премиума
      if (payment.invoice_payload?.startsWith('premium_')) {
        try {
          // Находим пользователя
          const user = await getUserByTelegramId(telegramId);
          
          if (!user) {
            console.error('User not found:', telegramId);
            return NextResponse.json({ ok: true }); // Возвращаем ok, чтобы не ретраить webhook
          }

          // Активируем премиум на 1 месяц
          const premiumUntil = new Date();
          premiumUntil.setMonth(premiumUntil.getMonth() + 1);
          
          await updateUserPremium(user.id, premiumUntil);
          
          console.log('🎉 Premium activated for user:', user.id, 'until:', premiumUntil);

          // Отправляем сообщение пользователю
          await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: telegramId,
                text: '🎉 Поздравляем! Premium активирован на 1 месяц!\n\n✨ Все функции разблокированы!',
                parse_mode: 'HTML',
              }),
            }
          );
        } catch (error) {
          console.error('Error activating premium:', error);
          // Не выбрасываем ошибку, чтобы Telegram не ретраил webhook
        }
      }

      return NextResponse.json({ ok: true });
    }

    // Другие типы обновлений
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
