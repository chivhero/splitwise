import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/db-adapter';

export async function GET(request: NextRequest) {
  try {
    // Admin ID уже проверен в middleware
    const adminId = request.headers.get('x-admin-user-id');
    
    console.log(`📊 Admin ${adminId} requested stats`);
    
    const stats = await getStats();
    
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

