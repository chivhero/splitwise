import { NextRequest, NextResponse } from 'next/server';

const TRIBUTE_PRODUCT_LINK = process.env.TRIBUTE_PRODUCT_LINK;
const TRIBUTE_PRODUCT_ID = process.env.TRIBUTE_PRODUCT_ID;

/**
 * Создание ссылки на оплату через Tribute
 * Возвращает готовую ссылку на товар в Tribute
 */
export async function POST(request: NextRequest) {
  try {
    if (!TRIBUTE_PRODUCT_LINK) {
      return NextResponse.json(
        { error: 'Tribute product link not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { telegramId } = body;

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      );
    }

    // Логируем запрос на оплату
    console.log('💳 Creating Tribute payment link for user:', telegramId);

    // Возвращаем готовую ссылку на товар Tribute
    // Tribute автоматически определит пользователя через Telegram Mini App
    return NextResponse.json({
      paymentUrl: TRIBUTE_PRODUCT_LINK,
      productId: TRIBUTE_PRODUCT_ID,
      success: true,
    });
  } catch (error) {
    console.error('Error creating Tribute payment link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
