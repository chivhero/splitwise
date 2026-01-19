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

    const user = await getUserByTelegramId(Number(telegramId));
    if (!user) {
      console.error('[GET /api/groups] User not found:', telegramId);
      return NextResponse.json(
        { error: 'User not authenticated. Please restart the app.' },
        { status: 401 }
      );
    }

    const groups = await getUserGroups(user.id);
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

    const user = await getUserByTelegramId(Number(telegramId));
    if (!user) {
      console.error('[POST /api/groups] User not authenticated:', telegramId);
      return NextResponse.json(
        { error: 'User not authenticated. Please restart the app.' },
        { status: 401 }
      );
    }

    // Проверка лимита групп для бесплатных пользователей
    if (!user.isPremium) {
      const userGroups = await getUserGroups(user.id);
      const FREE_GROUPS_LIMIT = 5;
      
      if (userGroups.length >= FREE_GROUPS_LIMIT) {
        return NextResponse.json(
          { 
            error: 'Достигнут лимит групп',
            message: `Бесплатные пользователи могут создать до ${FREE_GROUPS_LIMIT} групп. Оформите Premium для безлимитных групп.`,
            limit: FREE_GROUPS_LIMIT,
            current: userGroups.length,
            needsPremium: true
          },
          { status: 403 }
        );
      }
    }
    
    const group = await createGroup(name, user.id, description, currency || 'USD');

    // Добавляем дополнительных участников
    if (memberTelegramIds && Array.isArray(memberTelegramIds)) {
      for (const memberId of memberTelegramIds) {
        const member = await getUserByTelegramId(Number(memberId));
        if (member && member.id !== user.id) {
          await addGroupMember(group.id, member.id);
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








