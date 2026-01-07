import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByTelegramId } from '@/lib/db-adapter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, firstName, lastName, username } = body;

    console.log('[API /users/create] Request:', { telegramId, firstName, lastName, username });

    if (!telegramId || !firstName) {
      console.error('[API /users/create] Missing required fields');
      return NextResponse.json(
        { error: 'telegramId and firstName are required' },
        { status: 400 }
      );
    }

    // createUser теперь сам обрабатывает проверку и создание/обновление
    const user = await createUser(
      Number(telegramId),
      firstName,
      lastName || undefined,
      username || `user_${telegramId}`
    );

    console.log('[API /users/create] User created/updated:', user.id);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('[API /users/create] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
