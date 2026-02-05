import { NextRequest, NextResponse } from 'next/server';
import { deleteExpenseComment } from '@/lib/db-adapter';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string; expenseId: string; commentId: string } }
) {
  try {
    const { commentId } = params;

    await deleteExpenseComment(commentId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting expense comment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
