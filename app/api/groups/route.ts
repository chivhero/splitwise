import { NextRequest, NextResponse } from 'next/server';
import { createGroup, getUserGroups, addGroupMember, getUserByTelegramId, createUser } from '@/lib/db-adapter';

// GET /api/groups?telegramId=123
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400 }
      );
    }

    let user = getUserByTelegramId(Number(telegramId));
    if (!user) {
      // Автоматически создаём пользователя для разработки
      user = createUser(Number(telegramId), 'Test User', 'Developer', 'testuser');
    }

    const groups = getUserGroups(user.id);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// POST /api/groups
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, currency, telegramId, memberTelegramIds } = body;

    if (!name || !telegramId) {
      return NextResponse.json(
        { error: 'name and telegramId are required' },
        { status: 400 }
      );
    }

    let user = getUserByTelegramId(Number(telegramId));
    if (!user) {
      // Автоматически создаём пользователя для разработки
      user = createUser(Number(telegramId), 'Test User', 'Developer', 'testuser');
    }

    // Лимиты убраны - бесконечное количество групп для всех пользователей!
    
    const group = createGroup(name, user.id, description, currency || 'USD');

    // Добавляем дополнительных участников
    if (memberTelegramIds && Array.isArray(memberTelegramIds)) {
      for (const memberId of memberTelegramIds) {
        const member = getUserByTelegramId(Number(memberId));
        if (member && member.id !== user.id) {
          addGroupMember(group.id, member.id);
        }
      }
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}








