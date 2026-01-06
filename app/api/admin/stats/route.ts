import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/db-postgres';
import { isAdminTelegramId } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const telegramId = searchParams.get('telegramId');

    if (!telegramId) {
      return NextResponse.json(
        { error: 'Telegram ID is required' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const isAdmin = isAdminTelegramId(parseInt(telegramId));
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Admin only.' },
        { status: 403 }
      );
    }

    // Get stats
    const stats = await getStats();

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
