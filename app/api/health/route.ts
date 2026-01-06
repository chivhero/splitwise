import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Проверяем переменные окружения
    const hasDatabase = !!process.env.POSTGRES_URL;
    const hasBotToken = !!process.env.TELEGRAM_BOT_TOKEN;
    
    return NextResponse.json({ 
      status: 'ok',
      database: hasDatabase ? 'connected' : 'not configured',
      botToken: hasBotToken ? 'configured' : 'not configured',
      env: process.env.NODE_ENV
    });
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

