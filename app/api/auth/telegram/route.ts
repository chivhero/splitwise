import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByTelegramId } from '@/lib/db-adapter';
import { TelegramUser } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const telegramUser: TelegramUser = body.telegramUser;

    if (!telegramUser || !telegramUser.id) {
      return NextResponse.json(
        { error: 'Invalid Telegram user data' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    let user = getUserByTelegramId(telegramUser.id);

    // Если нет - создаём
    if (!user) {
      user = createUser(
        telegramUser.id,
        telegramUser.first_name,
        telegramUser.last_name,
        telegramUser.username,
        telegramUser.photo_url
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}










