import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, logAdminAction } from '@/lib/db-adapter';

const ADMIN_IDS = [409627169];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminTelegramId = searchParams.get('adminTelegramId');
    
    // Проверка админа
    if (!adminTelegramId || !ADMIN_IDS.includes(Number(adminTelegramId))) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Получаем всех пользователей
    const users = await getAllUsers();
    
    // Логируем действие
    await logAdminAction({
      adminId: Number(adminTelegramId),
      action: 'VIEW_USERS',
      details: { count: users.length },
    });
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
