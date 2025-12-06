import { NextRequest, NextResponse } from 'next/server';
import { addGroupMember, getUserByTelegramId, getGroupById, createUser, initDB } from '@/lib/db-adapter';

// Инициализируем БД при старте
let dbInitialized = false;

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    // Инициализируем БД если ещё не сделали
    if (!dbInitialized) {
      console.log('🔧 [Join] Initializing database...');
      await initDB();
      dbInitialized = true;
      console.log('✅ [Join] Database initialized!');
    }

    const body = await request.json();
    const { telegramId } = body;

    console.log('🔗 [Join] Request to join group:', params.groupId, 'by telegram user:', telegramId);

    if (!telegramId) {
      console.error('❌ [Join] Missing telegramId');
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400 }
      );
    }

    const groupId = params.groupId;

    // Проверяем существование группы
    console.log('🔍 [Join] Looking for group:', groupId);
    const group = await getGroupById(groupId);
    if (!group) {
      console.error('❌ [Join] Group not found:', groupId);
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }
    console.log('✅ [Join] Group found:', group.name);

    // Получаем или создаём пользователя
    console.log('🔍 [Join] Looking for user with telegram ID:', telegramId);
    let user = await getUserByTelegramId(Number(telegramId));
    if (!user) {
      console.log('➕ [Join] User not found, creating new user');
      user = await createUser(Number(telegramId), 'New User', '', 'user_' + telegramId);
      console.log('✅ [Join] User created:', user.id);
    } else {
      console.log('✅ [Join] User found:', user.id);
    }

    // Проверяем, не является ли пользователь уже участником
    const isAlreadyMember = group.members.some((m: any) => m.userId === user.id);
    if (isAlreadyMember) {
      console.log('ℹ️ [Join] User is already a member');
      return NextResponse.json(
        { message: 'Already a member', group },
        { status: 200 }
      );
    }

    // Добавляем пользователя в группу
    console.log('➕ [Join] Adding user to group');
    await addGroupMember(groupId, user.id);
    console.log('✅ [Join] User added to group successfully');

    // Получаем обновлённую группу
    const updatedGroup = await getGroupById(groupId);

    return NextResponse.json({ 
      message: 'Successfully joined group',
      group: updatedGroup 
    });
  } catch (error) {
    console.error('❌ [Join] Error:', error);
    return NextResponse.json(
      { error: 'Failed to join group', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
