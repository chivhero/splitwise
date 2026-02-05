import { NextRequest, NextResponse } from 'next/server';
import { toggleExpenseItem, deleteExpenseItem } from '@/lib/db-adapter';

// PATCH - toggle checkbox
export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string; expenseId: string; itemId: string } }
) {
  try {
    const body = await request.json();
    const { isChecked } = body;

    if (typeof isChecked !== 'boolean') {
      return NextResponse.json(
        { error: 'isChecked must be a boolean' },
        { status: 400 }
      );
    }

    await toggleExpenseItem(params.itemId, isChecked);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /items/[itemId] PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

// DELETE - удалить item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; expenseId: string; itemId: string } }
) {
  try {
    await deleteExpenseItem(params.itemId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /items/[itemId] DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
