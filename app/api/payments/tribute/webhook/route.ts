import { NextRequest, NextResponse } from 'next/server';
import { getUserByTelegramId, updateUserPremium } from '@/lib/db-postgres';
import crypto from 'crypto';

const TRIBUTE_API_KEY = process.env.TRIBUTE_API_KEY;
const TRIBUTE_PRODUCT_ID = process.env.TRIBUTE_PRODUCT_ID;

/**
 * Проверка HMAC подписи от Tribute
 * Подпись формируется как: HMAC-SHA256(request_body, API_KEY)
 */
function verifyTributeSignature(body: string, signature: string): boolean {
  if (!TRIBUTE_API_KEY || !signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', TRIBUTE_API_KEY);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');

  return signature === expectedSignature;
}

/**
 * Webhook для обработки событий от Tribute
 * Документация: https://wiki.tribute.tg/ru/api-dokumentaciya/vebkhuki
 */
export async function POST(request: NextRequest) {
  try {
    // Получаем подпись из заголовка
    const signature = request.headers.get('trbt-signature');
    const rawBody = await request.text();
    
    // Проверяем подпись
    if (!verifyTributeSignature(rawBody, signature || '')) {
      console.error('❌ Invalid Tribute webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    console.log('📥 Tribute Event:', event.name);

    // Обработка покупки цифрового товара
    if (event.name === 'new_digital_product') {
      const payload = event.payload;
      const productId = payload.product_id;
      const telegramUserId = payload.telegram_user_id;
      const purchaseId = payload.purchase_id;

      console.log('💳 New digital product purchase:', {
        productId,
        telegramUserId,
        purchaseId,
        amount: payload.amount,
        currency: payload.currency,
      });

      // Проверяем, что это наш Premium продукт
      if (productId.toString() !== TRIBUTE_PRODUCT_ID) {
        console.log('⚠️  Unknown product ID, skipping');
        return NextResponse.json({ success: true });
      }

      try {
        // Находим пользователя по Telegram ID
        const user = await getUserByTelegramId(telegramUserId);

        if (!user) {
          console.error('❌ User not found:', telegramUserId);
          return NextResponse.json({ success: true }); // Возвращаем success чтобы не ретраить
        }

        // Активируем Premium на 1 месяц
        const premiumUntil = new Date();
        premiumUntil.setMonth(premiumUntil.getMonth() + 1);

        await updateUserPremium(user.id, premiumUntil);

        console.log('🎉 Premium activated via Tribute:', {
          userId: user.id,
          telegramId: telegramUserId,
          until: premiumUntil.toISOString(),
          purchaseId,
        });

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('❌ Error activating premium:', error);
        return NextResponse.json({ success: true }); // Не ретраим на ошибках БД
      }
    }

    // Обработка возврата
    if (event.name === 'digital_product_refunded') {
      const payload = event.payload;
      const telegramUserId = payload.telegram_user_id;
      const productId = payload.product_id;

      console.log('🔄 Digital product refunded:', {
        productId,
        telegramUserId,
        purchaseId: payload.purchase_id,
      });

      // Можно деактивировать Premium, но обычно этого не делают
      // (пользователь использует до конца оплаченного периода)

      return NextResponse.json({ success: true });
    }

    // Другие события
    console.log('ℹ️  Unhandled event type:', event.name);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Tribute webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
