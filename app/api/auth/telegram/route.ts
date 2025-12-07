import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByTelegramId, initDB } from '@/lib/db-adapter';
import { TelegramUser } from '@/types';

// Инициализируем БД при старте
let dbInitialized = false;

export async function POST(request: NextRequest) {
  try {
    // Инициализируем БД если ещё не сделали
    if (!dbInitialized) {
      console.log('🔧 Initializing database...');
      await initDB();
      dbInitialized = true;
      console.log('✅ Database initialized!');
    }

    const body = await request.json();
    const telegramUser: TelegramUser = body.telegramUser;

    console.log('👤 Authenticating user:', telegramUser);

    if (!telegramUser || !telegramUser.id) {
      return NextResponse.json(
        { error: 'Invalid Telegram user data' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли пользователь
    let user = await getUserByTelegramId(telegramUser.id);

    // Если нет - создаём
    if (!user) {
      console.log('➕ Creating new user:', telegramUser.id);

      // Обеспечиваем наличие first_name
      const firstName = telegramUser.first_name || telegramUser.username || `User ${telegramUser.id}`;

      user = await createUser(
        telegramUser.id,
        firstName,
        telegramUser.last_name,
        telegramUser.username,
        telegramUser.photo_url
      );
      console.log('✅ User created:', user.id);
    } else {
      console.log('✅ User already exists:', user.id);
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('❌ Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
