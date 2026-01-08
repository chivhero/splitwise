import { NextRequest, NextResponse } from 'next/server';
import { createUserByName } from '@/lib/db-adapter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName } = body;

    console.log('[API /users/create-by-name] Request:', { firstName, lastName });

    if (!firstName) {
      console.error('[API /users/create-by-name] Missing firstName');
      return NextResponse.json(
        { error: 'firstName is required' },
        { status: 400 }
      );
    }

    // Создаём пользователя без Telegram ID
    const user = await createUserByName(
      firstName,
      lastName || undefined
    );

    console.log('[API /users/create-by-name] User created:', user.id);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('[API /users/create-by-name] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
