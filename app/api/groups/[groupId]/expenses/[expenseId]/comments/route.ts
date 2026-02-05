import { NextRequest, NextResponse } from 'next/server';
import { createExpenseComment, getExpenseComments, getUserByTelegramId } from '@/lib/db-adapter';

// GET - получить все комментарии для расхода
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string; expenseId: string } }
) {
  try {
    const comments = await getExpenseComments(params.expenseId);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('[API /expenses/comments GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get comments' },
      { status: 500 }
    );
  }
}

// POST - создать новый комментарий
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string; expenseId: string } }
) {
  try {
    const body = await request.json();
    const { text, telegramId, userId } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { error: 'Text is required' },
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

    const comment = await createExpenseComment(
      params.expenseId,
      text.trim(),
      user.id
    );

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('[API /expenses/comments POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
