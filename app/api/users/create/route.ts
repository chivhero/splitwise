import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByTelegramId } from '@/lib/db-adapter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, firstName, lastName, username } = body;

    if (!telegramId || !firstName) {
      return NextResponse.json(
        { error: 'telegramId and firstName are required' },
        { status: 400 }
      );
    }

    // Проверяем, не существует ли уже такой пользователь
    const existingUser = getUserByTelegramId(Number(telegramId));
    if (existingUser) {
      return NextResponse.json({ user: existingUser });
    }

    // Создаём нового пользователя
    const user = createUser(
      Number(telegramId),
      firstName,
      lastName || undefined,
      username || `user_${telegramId}`
    );

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}



