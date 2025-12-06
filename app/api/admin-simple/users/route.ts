import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, logAdminAction, initDB } from '@/lib/db-adapter';

const ADMIN_IDS = [409627169];
let dbInitialized = false;

export async function GET(request: NextRequest) {
  try {
    // Инициализируем БД если ещё не сделали
    if (!dbInitialized) {
      console.log('🔧 [Users API] Initializing database...');
      await initDB();
      dbInitialized = true;
      console.log('✅ [Users API] Database initialized!');
    }

    const { searchParams } = new URL(request.url);
    const adminTelegramId = searchParams.get('adminTelegramId');
    
    console.log('👤 [Users API] Admin request from:', adminTelegramId);
    
    // Проверка админа
    if (!adminTelegramId || !ADMIN_IDS.includes(Number(adminTelegramId))) {
      console.warn('⛔ [Users API] Access denied for:', adminTelegramId);
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Получаем всех пользователей
    console.log('📋 [Users API] Fetching all users...');
    const users = await getAllUsers();
    console.log('✅ [Users API] Found users:', users.length);
    
    // Логируем действие (но не падаем если не получится)
    try {
      await logAdminAction({
        adminId: Number(adminTelegramId),
        action: 'VIEW_USERS',
        details: { count: users.length },
      });
    } catch (logError) {
      console.warn('⚠️ [Users API] Failed to log action:', logError);
      // Не падаем если логирование не сработало
    }
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('❌ [Users API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
