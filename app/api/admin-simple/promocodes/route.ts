import { NextRequest, NextResponse } from 'next/server';
import { createPromoCode, logAdminAction } from '@/lib/db-adapter';

const ADMIN_IDS = [409627169];

export async function POST(request: NextRequest) {
  try {
    const { adminTelegramId, code, days, maxUses } = await request.json();
    
    // Проверка админа
    if (!adminTelegramId || !ADMIN_IDS.includes(Number(adminTelegramId))) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Валидация
    if (!code || !days || !maxUses) {
      return NextResponse.json(
        { error: 'code, days and maxUses are required' },
        { status: 400 }
      );
    }
    
    if (code.length < 3 || code.length > 50) {
      return NextResponse.json(
        { error: 'Code must be between 3 and 50 characters' },
        { status: 400 }
      );
    }
    
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days must be between 1 and 365' },
        { status: 400 }
      );
    }
    
    if (maxUses < 1 || maxUses > 10000) {
      return NextResponse.json(
        { error: 'Max uses must be between 1 and 10000' },
        { status: 400 }
      );
    }
    
    // Создаём промо-код
    const promoCode = await createPromoCode(
      code.toUpperCase(),
      days,
      maxUses,
      adminTelegramId
    );
    
    // Логируем действие
    await logAdminAction({
      adminId: adminTelegramId,
      action: 'CREATE_PROMO_CODE',
      targetEntityId: code,
      details: { code, days, maxUses },
    });
    
    console.log(`✅ Admin ${adminTelegramId} created promo code: ${code}`);
    
    return NextResponse.json({
      success: true,
      promoCode,
    });
  } catch (error: any) {
    console.error('Error creating promo code:', error);
    
    // Проверяем duplicate key error
    if (error.message?.includes('unique') || error.code === '23505') {
      return NextResponse.json(
        { error: 'Promo code already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create promo code' },
      { status: 500 }
    );
  }
}


