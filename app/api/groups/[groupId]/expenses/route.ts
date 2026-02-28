import { NextRequest, NextResponse } from 'next/server';
import { createExpense, getGroupExpenses, getUserByTelegramId, getGroupById } from '@/lib/db-adapter';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const expenses = await getGroupExpenses(params.groupId);
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const body = await request.json();
    const { 
      description, 
      amount, 
      paidByUserId,
      paidByTelegramId, 
      splitBetweenUserIds,
      splitBetweenTelegramIds, 
      telegramId, 
      category, 
      date,
      splitType,
      customSplits
    } = body;

    console.log('[API /expenses] Request:', { 
      description, 
      amount, 
      paidByUserId,
      paidByTelegramId,
      splitBetweenUserIds,
      splitBetweenTelegramIds, 
      telegramId 
    });

    if (!description || !amount || !telegramId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const user = await getUserByTelegramId(Number(telegramId));
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const group = await getGroupById(params.groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Проверяем лимиты для бесплатного плана
    if (!user.isPremium) {
      const existingExpenses = await getGroupExpenses(params.groupId);
      if (existingExpenses.length >= 50) {
        return NextResponse.json(
          { error: 'Free plan allows only 50 expenses per group. Upgrade to Premium!' },
          { status: 403 }
        );
      }
    }

    // Логируем доступных участников для отладки
    console.log('[API /expenses] Group members:', group.members.map((m: any) => ({
      userId: m.userId,
      userDbId: m.user?.id,
      firstName: m.user?.firstName,
      telegramId: m.user?.telegramId
    })));

    // Определяем кто платил
    let paidByUser;
    if (paidByUserId) {
      console.log('[API /expenses] Looking for paidByUserId:', paidByUserId);
      paidByUser = group.members.find((m: any) => m.userId === paidByUserId)?.user;
      console.log('[API /expenses] Found paidByUser:', paidByUser ? { id: paidByUser.id, firstName: paidByUser.firstName } : null);
    } else if (paidByTelegramId) {
      paidByUser = group.members.find((m: any) => m.user?.telegramId === Number(paidByTelegramId))?.user;
    }

    if (!paidByUser) {
      console.error('[API /expenses] Paid by user not found. paidByUserId:', paidByUserId, 'available members:', group.members.map((m: any) => m.userId));
      return NextResponse.json(
        { error: 'Paid by user not found' },
        { status: 404 }
      );
    }

    // Определяем между кем делить
    let finalSplitBetweenUserIds: string[] = [];
    if (splitBetweenUserIds && splitBetweenUserIds.length > 0) {
      finalSplitBetweenUserIds = splitBetweenUserIds;
    } else if (splitBetweenTelegramIds && splitBetweenTelegramIds.length > 0) {
      // Конвертируем telegram IDs в user IDs
      for (const tgId of splitBetweenTelegramIds) {
        const member = group.members.find((m: any) => m.user?.telegramId === Number(tgId));
        if (member && member.user) {
          finalSplitBetweenUserIds.push(member.user.id);
        }
      }
    }

    if (finalSplitBetweenUserIds.length === 0) {
      console.error('[API /expenses] No valid split between users');
      return NextResponse.json(
        { error: 'No valid split between users' },
        { status: 400 }
      );
    }

    console.log('[API /expenses] Creating expense:', {
      paidBy: paidByUser.id,
      splitBetween: finalSplitBetweenUserIds,
      splitType: splitType || 'equal',
      customSplits: customSplits || null
    });

    // Validation for custom split
    if (splitType === 'custom') {
      if (!customSplits || typeof customSplits !== 'object') {
        return NextResponse.json(
          { error: 'customSplits required when splitType is "custom"' },
          { status: 400 }
        );
      }
      
      // Validate all participants have shares
      for (const userId of finalSplitBetweenUserIds) {
        if (!(userId in customSplits)) {
          return NextResponse.json(
            { error: `Missing share for user ${userId} in customSplits` },
            { status: 400 }
          );
        }
        if (typeof customSplits[userId] !== 'number' || customSplits[userId] < 1) {
          return NextResponse.json(
            { error: `Invalid share for user ${userId}: must be a number >= 1` },
            { status: 400 }
          );
        }
      }
    }

    const expense = await createExpense(
      params.groupId,
      description,
      Number(amount),
      paidByUser.id,
      finalSplitBetweenUserIds,
      user.id,
      group.currency,
      category,
      date ? new Date(date) : undefined,
      splitType || 'equal',
      customSplits || undefined
    );

    console.log('[API /expenses] Expense created:', expense.id);
    return NextResponse.json({ expense });
  } catch (error) {
    console.error('[API /expenses] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
