import { NextRequest, NextResponse } from 'next/server';
import { getGroupExpenses, getGroupById } from '@/lib/db-adapter';
import { getGroupSummary } from '@/lib/calculator';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const group = getGroupById(params.groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const expenses = getGroupExpenses(params.groupId);
    const members = group.members.map((m: any) => m.user!);
    const summary = getGroupSummary(expenses, members);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Get summary error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate summary' },
      { status: 500 }
    );
  }
}










