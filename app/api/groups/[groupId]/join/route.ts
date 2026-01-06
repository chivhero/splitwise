import { NextRequest, NextResponse } from 'next/server';
import { addGroupMember, getUserByTelegramId, getGroupById, createUser } from '@/lib/db-adapter';

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const body = await request.json();
    const { telegramId } = body;

    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400 }
      );
    }

    const groupId = params.groupId;

    // Проверяем существование группы
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Получаем или создаём пользователя
    let user = await getUserByTelegramId(Number(telegramId));
    if (!user) {
      user = await createUser(Number(telegramId), 'New User', '', 'user_' + telegramId);
    }

    // Проверяем, не является ли пользователь уже участником
    const isAlreadyMember = group.members.some((m: any) => m.userId === user.id);
    if (isAlreadyMember) {
      return NextResponse.json(
        { message: 'Already a member', group },
        { status: 200 }
      );
    }

    // Добавляем пользователя в группу
    await addGroupMember(groupId, user.id);

    // Получаем обновлённую группу
    const updatedGroup = await getGroupById(groupId);

    return NextResponse.json({ 
      message: 'Successfully joined group',
      group: updatedGroup 
    });
  } catch (error) {
    console.error('Join group error:', error);
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    );
  }
}
