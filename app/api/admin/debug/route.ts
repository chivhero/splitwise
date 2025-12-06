import { NextRequest, NextResponse } from 'next/server';
import { getTelegramUserFromInitData, isAdmin, getAdminIds } from '@/lib/telegram-auth';

export async function GET(request: NextRequest) {
  const initData = request.headers.get('x-telegram-init-data');
  const adminIdHeader = request.headers.get('x-admin-user-id');
  
  let userId = null;
  let isValidated = false;
  
  if (initData) {
    userId = getTelegramUserFromInitData(initData);
    isValidated = userId !== null;
  }
  
  const adminIds = getAdminIds();
  const isUserAdmin = userId ? isAdmin(userId) : false;
  
  return NextResponse.json({
    debug: {
      hasInitData: !!initData,
      initDataLength: initData?.length || 0,
      userId,
      isValidated,
      isUserAdmin,
      adminIdFromHeader: adminIdHeader,
      configuredAdminIds: adminIds,
      env: {
        hasAdminIds: !!process.env.ADMIN_TELEGRAM_IDS,
        adminIdsValue: process.env.ADMIN_TELEGRAM_IDS || 'NOT SET',
      },
    },
  });
}

