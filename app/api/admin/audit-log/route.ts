import { NextRequest, NextResponse } from 'next/server';
import { getAuditLog } from '@/lib/db-adapter';

export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-user-id');
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    console.log(`📜 Admin ${adminId} requested audit log (limit: ${limit})`);
    
    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 1000' },
        { status: 400 }
      );
    }
    
    const logs = await getAuditLog(limit);
    
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}

