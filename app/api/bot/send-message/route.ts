import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/bot'; // Предполагается, что эта функция существует

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chatId, text, parseMode, replyMarkup } = body;

    if (!chatId || !text) {
      return NextResponse.json({ error: 'Missing chatId or text' }, { status: 400 });
    }

    const result = await sendMessage(chatId, text, { parse_mode: parseMode, reply_markup: replyMarkup });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
