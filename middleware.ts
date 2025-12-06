import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTelegramUserFromInitData, isAdmin } from '@/lib/telegram-auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Проверяем только админские роуты
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    console.log(`🔐 Admin route access attempt: ${pathname}`);
    
    // Получаем initData из заголовков или cookies
    const initData = 
      request.headers.get('x-telegram-init-data') ||
      request.cookies.get('tg-init-data')?.value;
    
    if (!initData) {
      console.warn('⚠️ Admin access attempt without initData');
      
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { 
            error: 'Unauthorized',
            message: 'Telegram authentication required'
          },
          { status: 401 }
        );
      }
      
      // Редирект на главную для страниц
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Валидируем и получаем Telegram ID
    const userId = getTelegramUserFromInitData(initData);
    
    if (!userId) {
      console.warn('⚠️ Invalid or forged Telegram data');
      
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { 
            error: 'Unauthorized',
            message: 'Invalid Telegram authentication'
          },
          { status: 401 }
        );
      }
      
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Проверяем является ли пользователь админом
    if (!isAdmin(userId)) {
      console.warn(`⚠️ Admin access denied for user ${userId}`);
      console.warn(`   Path: ${pathname}`);
      console.warn(`   IP: ${request.headers.get('x-forwarded-for') || 'unknown'}`);
      console.warn(`   User-Agent: ${request.headers.get('user-agent') || 'unknown'}`);
      
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: 'Admin access required'
          },
          { status: 403 }
        );
      }
      
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    console.log(`✅ Admin access granted for user ${userId} to ${pathname}`);
    
    // Добавляем userId в заголовки для использования в API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-admin-user-id', userId.toString());
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};


