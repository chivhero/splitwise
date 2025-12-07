const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

interface SendMessageOptions {
  parse_mode?: 'HTML' | 'MarkdownV2' | 'Markdown';
  reply_markup?: any;
}

export async function sendMessage(chatId: number | string, text: string, options: SendMessageOptions = {}) {
  const url = `${BASE_URL}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text,
    ...options,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API Error:', errorData);
      throw new Error(`Telegram API error: ${errorData.description}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}

export async function answerInlineQuery(inlineQueryId: string, results: any[]) {
  const url = `${BASE_URL}/answerInlineQuery`;
  const payload = {
    inline_query_id: inlineQueryId,
    results,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API Error:', errorData);
      throw new Error(`Telegram API error: ${errorData.description}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to answer inline query:', error);
    throw error;
  }
}
