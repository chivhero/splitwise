import { NextRequest, NextResponse } from 'next/server';
import { addGroupMember, getUserByTelegramId, getGroupById, createUser } from '@/lib/db-adapter';

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const body = await request.json();
    const { telegramId } = body;

    console.log('[API /groups/join] Request:', { groupId: params.groupId, telegramId });

    if (!telegramId) {
      console.error('[API /groups/join] Missing telegramId');
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400 }
      );
    }

    const groupId = params.groupId;

    // Проверяем существование группы
    const group = await getGroupById(groupId);
    if (!group) {
      console.error('[API /groups/join] Group not found:', groupId);
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Получаем или создаём пользователя
    console.log('[API /groups/join] Getting user by telegramId:', telegramId);
    let user = await getUserByTelegramId(Number(telegramId));
    
    if (!user) {
      console.log('[API /groups/join] User not found, creating new user');
      user = await createUser(Number(telegramId), 'New User', '', 'user_' + telegramId);
    }
    
    console.log('[API /groups/join] User retrieved/created:', user.id);

    // Проверяем, не является ли пользователь уже участником
    const isAlreadyMember = group.members.some((m: any) => m.userId === user.id);
    if (isAlreadyMember) {
      console.log('[API /groups/join] User is already a member');
      return NextResponse.json(
        { message: 'Already a member', group },
        { status: 200 }
      );
    }

    // Добавляем пользователя в группу
    console.log('[API /groups/join] Adding user to group:', { userId: user.id, groupId });
    await addGroupMember(groupId, user.id);

    // Получаем обновлённую группу
    const updatedGroup = await getGroupById(groupId);

    console.log('[API /groups/join] Successfully added user to group');
    return NextResponse.json({ 
      message: 'Successfully joined group',
      group: updatedGroup 
    });
  } catch (error) {
    console.error('[API /groups/join] Error:', error);
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    );
  }
}
