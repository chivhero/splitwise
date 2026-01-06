import { NextRequest, NextResponse } from 'next/server';
import { getUserByTelegramId, isUserAdmin, createPromoCode, getAllPromoCodes, deactivatePromoCode } from '@/lib/db-postgres';

// GET - получить все промокоды
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const user = await getUserByTelegramId(parseInt(telegramId));
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403 }
      );
    }

    const promoCodes = await getAllPromoCodes();

    return NextResponse.json({ promoCodes });
  } catch (error) {
    console.error('Error getting promo codes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - создать новый промокод
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, code, premiumDays, maxUses, expiresAt } = body;

    if (!telegramId || !code || !premiumDays) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403 }
      );
    }

    // Create promo code
    const promoCode = await createPromoCode(
      code,
      premiumDays,
      maxUses || null,
      expiresAt ? new Date(expiresAt) : null,
      user.id
    );

    return NextResponse.json({ promoCode, success: true });
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    
    if (error.message?.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'Promo code already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - деактивировать промокод
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, promoCodeId } = body;

    if (!telegramId || !promoCodeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403 }
      );
    }

    await deactivatePromoCode(promoCodeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating promo code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
