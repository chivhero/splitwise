import { NextRequest, NextResponse } from 'next/server';
import { updateUserPremium, getUserById, logAdminAction } from '@/lib/db-adapter';

const ADMIN_IDS = [409627169];

export async function POST(request: NextRequest) {
  try {
    const { adminTelegramId, targetUserId, days } = await request.json();
    
    // Проверка админа
    if (!adminTelegramId || !ADMIN_IDS.includes(Number(adminTelegramId))) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Валидация
    if (!targetUserId || !days) {
      return NextResponse.json(
        { error: 'targetUserId and days are required' },
        { status: 400 }
      );
    }
    
    if (days < 1 || days > 3650) {
      return NextResponse.json(
        { error: 'Days must be between 1 and 3650' },
        { status: 400 }
      );
    }
    
    // Проверяем существование пользователя
    const user = await getUserById(targetUserId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Вычисляем дату окончания Premium
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    
    // Выдаём Premium
    await updateUserPremium(targetUserId, expiresAt);
    
    // Логируем действие
    await logAdminAction({
      adminId: adminTelegramId,
      action: 'GRANT_PREMIUM',
      targetUserId,
      details: { days, expiresAt: expiresAt.toISOString() },
    });
    
    console.log(`✅ Admin ${adminTelegramId} granted ${days} days Premium to user ${targetUserId}`);
    
    return NextResponse.json({
      success: true,
      message: `Premium granted for ${days} days`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error granting premium:', error);
    return NextResponse.json(
      { error: 'Failed to grant premium' },
      { status: 500 }
    );
  }
}


