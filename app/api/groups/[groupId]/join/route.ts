import { NextRequest, NextResponse } from 'next/server';
import { addGroupMember, getUserByTelegramId, getUserById, getGroupById, createUser } from '@/lib/db-adapter';

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const body = await request.json();
    const { telegramId, userId } = body;

    console.log('[API /groups/join] Request:', { groupId: params.groupId, telegramId, userId });

    if (!telegramId && !userId) {
      console.error('[API /groups/join] Missing telegramId or userId');
      return NextResponse.json(
        { error: 'telegramId or userId is required' },
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

    // Получаем пользователя
    let user;
    if (userId) {
      console.log('[API /groups/join] Getting user by userId:', userId);
      user = await getUserById(userId);
    } else if (telegramId) {
      console.log('[API /groups/join] Getting user by telegramId:', telegramId);
      user = await getUserByTelegramId(Number(telegramId));
      
      if (!user) {
        console.log('[API /groups/join] User not found, creating new user');
        user = await createUser(Number(telegramId), 'New User', '', 'user_' + telegramId);
      }
    }
    
    if (!user) {
      console.error('[API /groups/join] User not found');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
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

    // Вместо повторного чтения из БД (может попасть на read replica),
    // вручную конструируем обновлённую группу с новым участником
    const newMember = {
      userId: user.id,
      groupId: groupId,
      role: 'member',
      joinedAt: new Date(),
      user: user,
    };
    
    const updatedGroup = {
      ...group,
      members: [...group.members, newMember],
    };

    console.log('[API /groups/join] Successfully added user to group. Total members:', updatedGroup.members.length);
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
