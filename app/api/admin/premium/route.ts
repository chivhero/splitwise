import { NextRequest, NextResponse } from 'next/server';
import { updateUserPremium, getUserById, logAdminAction } from '@/lib/db-adapter';

export async function POST(request: NextRequest) {
  try {
    const adminId = parseInt(request.headers.get('x-admin-user-id') || '0');
    const { targetUserId, days } = await request.json();
    
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
      adminId,
      action: 'GRANT_PREMIUM',
      targetUserId,
      details: { days, expiresAt: expiresAt.toISOString() },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    console.log(`✅ Admin ${adminId} granted ${days} days Premium to user ${targetUserId}`);
    
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

