import { NextRequest, NextResponse } from 'next/server';
import { getGroupExpenses, getGroupById, getGroupMembers } from '@/lib/db-adapter';
import { getGroupSummary } from '@/lib/calculator';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const group = await getGroupById(params.groupId);
    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    const expenses = await getGroupExpenses(params.groupId);
    
    // Получаем членов группы напрямую (для консистентности)
    const groupMembers = await getGroupMembers(params.groupId);
    
    // Извлекаем объекты user, фильтруя undefined
    const members = groupMembers
      .map((m: any) => m.user)
      .filter((u: any) => u !== undefined && u !== null);
    
    console.log(`[Summary API] Group ${params.groupId}: ${expenses.length} expenses, ${members.length} members`);
    
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
