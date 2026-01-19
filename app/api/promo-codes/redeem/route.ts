import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserByTelegramId, 
  getPromoCode, 
  hasUserRedeemedPromo,
  redeemPromoCode,
  updateUserPremium 
} from '@/lib/db-postgres';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, code } = body;

    // Очищаем код от пробелов и приводим к верхнему регистру
    const cleanCode = code?.toString().trim().toUpperCase().replace(/\s/g, '');

    console.log('[Promo Redeem] Request:', { telegramId, originalCode: code, cleanCode });

    if (!telegramId || !cleanCode) {
      return NextResponse.json(
        { error: 'Telegram ID and promo code are required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      console.log('[Promo Redeem] User not found:', telegramId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[Promo Redeem] User found:', user.id);

    // Get promo code
    const promoCode = await getPromoCode(cleanCode);
    console.log('[Promo Redeem] Promo code lookup result:', promoCode ? { id: promoCode.id, code: promoCode.code, is_active: promoCode.is_active } : null);
    
    if (!promoCode) {
      console.log('[Promo Redeem] Promo code not found:', cleanCode);
      return NextResponse.json(
        { error: 'Промокод не найден' },
        { status: 404 }
      );
    }

    // Check if promo code is active
    if (!promoCode.is_active) {
      return NextResponse.json(
        { error: 'Промокод больше не активен' },
        { status: 400 }
      );
    }

    // Check if expired
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Срок действия промокода истёк' },
        { status: 400 }
      );
    }

    // Check if max uses reached
    if (promoCode.max_uses !== null && promoCode.used_count >= promoCode.max_uses) {
      return NextResponse.json(
        { error: 'Промокод больше нельзя использовать (достигнут лимит)' },
        { status: 400 }
      );
    }

    // Check if user already redeemed
    const alreadyRedeemed = await hasUserRedeemedPromo(user.id, promoCode.id);
    if (alreadyRedeemed) {
      return NextResponse.json(
        { error: 'Вы уже использовали этот промокод' },
        { status: 400 }
      );
    }

    // Calculate new premium expiration
    const now = new Date();
    const currentPremiumUntil = user.premiumUntil && new Date(user.premiumUntil) > now 
      ? new Date(user.premiumUntil) 
      : now;
    
    const newPremiumUntil = new Date(currentPremiumUntil);
    newPremiumUntil.setDate(newPremiumUntil.getDate() + promoCode.premium_days);

    // Redeem promo code
    const redeemed = await redeemPromoCode(user.id, promoCode.id);
    if (!redeemed) {
      return NextResponse.json(
        { error: 'Не удалось активировать промокод' },
        { status: 500 }
      );
    }

    // Update user premium status
    await updateUserPremium(user.id, newPremiumUntil);

    return NextResponse.json({
      success: true,
      premiumUntil: newPremiumUntil,
      premiumDays: promoCode.premium_days,
      message: `🎉 Промокод активирован! Premium продлён на ${promoCode.premium_days} дней`
    });
  } catch (error) {
    console.error('Error redeeming promo code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
