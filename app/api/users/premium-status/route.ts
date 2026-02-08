import { NextRequest, NextResponse } from 'next/server';
import { getUserByTelegramId } from '@/lib/db-postgres';

/**
 * Проверка Premium статуса пользователя
 * GET /api/users/premium-status?telegramId=123456
 */
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

    const user = await getUserByTelegramId(parseInt(telegramId));

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isPremium = user.premiumUntil ? new Date(user.premiumUntil) > new Date() : false;

    return NextResponse.json({
      isPremium,
      premiumUntil: user.premiumUntil,
      success: true,
    });
  } catch (error) {
    console.error('Error checking premium status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
