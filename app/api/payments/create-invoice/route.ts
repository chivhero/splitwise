import { NextRequest, NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'SplitWisedbot';

export async function POST(request: NextRequest) {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Bot token not configured' },
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

    // Создаём invoice link через Telegram Bot API
    // Документация: https://core.telegram.org/bots/api#createinvoicelink
    const invoiceData = {
      title: '⭐ SplitWise Premium',
      description: 'Премиум подписка на 1 месяц - разблокируйте все функции!',
      payload: `premium_${telegramId}_${Date.now()}`, // Уникальный payload для идентификации платежа
      provider_token: '', // Для Telegram Stars оставляем пустым
      currency: 'XTR', // XTR = Telegram Stars
      prices: [
        {
          label: 'SplitWise Premium (1 месяц)',
          amount: 100, // 100 звёзд = 1 месяц премиума
        },
      ],
    };

    // Создаём invoice link
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error('Failed to create invoice:', data);
      return NextResponse.json(
        { error: 'Failed to create invoice', details: data.description },
        { status: 500 }
      );
    }

    // Возвращаем invoice URL
    return NextResponse.json({
      invoiceUrl: data.result,
      success: true,
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
