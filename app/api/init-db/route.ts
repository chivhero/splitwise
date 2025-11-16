import { NextResponse } from 'next/server';
import { initDB } from '@/lib/db-postgres';

export async function GET() {
  try {
    await initDB();
    return NextResponse.json({ 
      success: true, 
      message: '✅ Database initialized successfully!' 
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

