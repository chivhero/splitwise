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
    const { description, amount, paidByTelegramId, splitBetweenTelegramIds, telegramId, category, date } = body;

    if (!description || !amount || !paidByTelegramId || !splitBetweenTelegramIds || !telegramId) {
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

    const paidByUser = await getUserByTelegramId(Number(paidByTelegramId));
    if (!paidByUser) {
      return NextResponse.json(
        { error: 'Paid by user not found' },
        { status: 404 }
      );
    }

    // Конвертируем telegram IDs в user IDs
    const splitBetweenUserIds: string[] = [];
    for (const tgId of splitBetweenTelegramIds) {
      const member = await getUserByTelegramId(Number(tgId));
      if (member) {
        splitBetweenUserIds.push(member.id);
      }
    }

    const expense = await createExpense(
      params.groupId,
      description,
      Number(amount),
      paidByUser.id,
      splitBetweenUserIds,
      user.id,
      group.currency,
      category,
      date ? new Date(date) : undefined
    );

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
