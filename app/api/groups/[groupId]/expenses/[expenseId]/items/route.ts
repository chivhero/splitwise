import { NextRequest, NextResponse } from 'next/server';
import { createExpenseItem, getExpenseItems, getUserByTelegramId } from '@/lib/db-adapter';

// GET - получить все items для расхода
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string; expenseId: string } }
) {
  try {
    const items = await getExpenseItems(params.expenseId);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('[API /expenses/items GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get items' },
      { status: 500 }
    );
  }
}

// POST - создать новый item
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; expenseId: string } }
) {
  try {
    const body = await request.json();
    const { description, telegramId, userId } = body;

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    // Получаем пользователя
    let user;
    if (userId) {
      user = { id: userId };
    } else if (telegramId) {
      user = await getUserByTelegramId(Number(telegramId));
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const item = await createExpenseItem(
      params.expenseId,
      description.trim(),
      user.id
    );

    return NextResponse.json({ item });
  } catch (error) {
    console.error('[API /expenses/items POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
