import { NextRequest, NextResponse } from 'next/server';
import { answerInlineQuery } from '@/lib/bot';
import { getGroupById } from '@/lib/db-adapter';

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'SplitWisedbot';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received Telegram update:', JSON.stringify(body, null, 2));

    if (body.inline_query) {
      const inlineQuery = body.inline_query;
      const query = inlineQuery.query;

      if (query.startsWith('join_group_')) {
        const groupId = query.replace('join_group_', '');
        const group = await getGroupById(groupId);

        if (group) {
          const results = [
            {
              type: 'article',
              id: groupId,
              title: `Приглашение в группу "${group.name}"`,
              input_message_content: {
                message_text: `<b>Присоединяйтесь к группе "${group.name}" для совместного учета расходов!</b>`,
                parse_mode: 'HTML',
              },
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🚀 Принять приглашение',
                      url: `https://t.me/${BOT_USERNAME}?startapp=join_${groupId}`,
                    },
                  ],
                ],
              },
              description: 'Нажмите, чтобы отправить приглашение в этот чат.',
              thumb_url: 'https://i.imgur.com/2Y2qcoF.png', // A generic "invite" icon
            },
          ];
          await answerInlineQuery(inlineQuery.id, results);
        }
      }
    } else if (body.message) {
      // Handle message
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 });
  }
}
