import { NextRequest, NextResponse } from 'next/server';
import { createPromoCode, getAllPromoCodes, logAdminAction } from '@/lib/db-adapter';

// GET - получить все промо-коды
export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-user-id');
    console.log(`📋 Admin ${adminId} requested promo codes list`);
    
    const promoCodes = await getAllPromoCodes();
    
    return NextResponse.json({ promoCodes });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch promo codes' },
      { status: 500 }
    );
  }
}

// POST - создать новый промо-код
export async function POST(request: NextRequest) {
  try {
    const adminId = parseInt(request.headers.get('x-admin-user-id') || '0');
    const { code, days, maxUses } = await request.json();
    
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
    const promoCode = await createPromoCode(code.toUpperCase(), days, maxUses, adminId);
    
    // Логируем действие
    await logAdminAction({
      adminId,
      action: 'CREATE_PROMO_CODE',
      targetEntityId: code,
      details: { code, days, maxUses },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
    
    console.log(`✅ Admin ${adminId} created promo code: ${code}`);
    
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

