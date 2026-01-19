import { NextRequest, NextResponse } from 'next/server';
import { getGroupById } from '@/lib/db-adapter';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    console.log('[API /groups/groupId] Fetching group:', params.groupId);
    
    const group = await getGroupById(params.groupId);

    if (!group) {
      console.log('[API /groups/groupId] Group not found:', params.groupId);
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    console.log('[API /groups/groupId] Group loaded with', group.members?.length || 0, 'members');
    console.log('[API /groups/groupId] Members:', group.members?.map((m: { userId: string; user?: { firstName?: string } }) => ({ 
      userId: m.userId, 
      firstName: m.user?.firstName,
      hasUser: !!m.user 
    })));

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Get group error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group' },
      { status: 500 }
    );
  }
}










