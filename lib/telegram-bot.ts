/**
 * Telegram Bot API helpers (server-side only)
 *
 * This is separate from lib/telegram.ts which is the client-side WebApp SDK.
 * This module calls the Telegram Bot HTTP API directly and must only run on the server.
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'SplitWisedbot';
const BOT_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── Message Variations ───────────────────────────────────────────────────────

/**
 * Message templates for the Friday reminder.
 * Each entry is a [text, emoji-header] tuple.
 * {name} is replaced with the user's first name.
 */
const FRIDAY_MESSAGES: Array<{ text: string; button: string }> = [
  {
    text:
      '🎉 <b>Пятница, {name}!</b>\n\n' +
      'Самое время записать расходы за неделю, пока всё ещё свежо в памяти.\n\n' +
      'Открой SplitWize и зафиксируй — это займёт меньше минуты 👇',
    button: '💰 Открыть SplitWize',
  },
  {
    text:
      '🍕 <b>Привет, {name}!</b>\n\n' +
      'Пятничные посиделки уже на горизонте? Не забудь добавить расходы в SplitWize, ' +
      'чтобы в понедельник не мучиться с расчётами 😄\n\n' +
      'Кто сколько должен — узнаешь за 10 секунд:',
    button: '🧮 Посмотреть расчёты',
  },
  {
    text:
      '💸 <b>{name}, неделя позади!</b>\n\n' +
      'А долги ещё не посчитаны? Загляни в SplitWize — ' +
      'все расходы в одном месте, никаких споров в чате 🙌',
    button: '📊 Открыть SplitWize',
  },
  {
    text:
      '🏖️ <b>Выходные близко, {name}!</b>\n\n' +
      'Планируешь куда-то с друзьями или семьёй? ' +
      'SplitWize поможет честно разделить все расходы — ' +
      'кафе, такси, продукты — всё учтём 💪',
    button: '➕ Добавить расход',
  },
  {
    text:
      '🍺 <b>Пятничный вечер, {name}!</b>\n\n' +
      'Лучшее время проверить — кто кому что должен. ' +
      'Открой SplitWize и закрой все долги до выходных 😎',
    button: '✅ Посмотреть долги',
  },
  {
    text:
      '✨ <b>Конец рабочей недели, {name}!</b>\n\n' +
      'Если за неделю были общие расходы — зафиксируй их прямо сейчас, ' +
      'пока память свежая. Твои друзья скажут спасибо 😊',
    button: '📝 Открыть SplitWize',
  },
  {
    text:
      '🎊 <b>ПЯТНИЦА, {name}!</b>\n\n' +
      'Время тусоваться — и не забывать добавлять расходы в SplitWize! ' +
      'Чем раньше запишешь, тем проще разделить потом 🤝',
    button: '🚀 Перейти в приложение',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendMessageResult {
  ok: boolean;
  telegramId: number;
  error?: string;
}

// ─── Core send function ───────────────────────────────────────────────────────

/**
 * Sends a single Telegram message via Bot API.
 * Uses HTML parse mode and attaches a WebApp inline button.
 */
export async function sendBotMessage(
  chatId: number,
  html: string,
  buttonText: string
): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not set' };
  }

  const body = {
    chat_id: chatId,
    text: html,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: buttonText,
            url: `https://t.me/${BOT_USERNAME}`,
          },
        ],
      ],
    },
  };

  try {
    const response = await fetch(`${BOT_API_BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.ok) {
      return { ok: false, error: data.description ?? 'Unknown Telegram API error' };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

// ─── Friday reminder ──────────────────────────────────────────────────────────

/**
 * Picks a random message variation and personalises it with the user's first name.
 */
export function buildFridayMessage(firstName: string): { text: string; button: string } {
  const template = FRIDAY_MESSAGES[Math.floor(Math.random() * FRIDAY_MESSAGES.length)];
  const name = firstName || 'друг';
  return {
    text: template.text.replace(/\{name\}/g, name),
    button: template.button,
  };
}

/**
 * Sends the Friday reminder to a single user.
 * Wraps sendBotMessage with per-user error handling so one failure doesn't stop the batch.
 */
export async function sendFridayReminder(
  telegramId: number,
  firstName: string
): Promise<SendMessageResult> {
  const { text, button } = buildFridayMessage(firstName);
  const result = await sendBotMessage(telegramId, text, button);
  return { ...result, telegramId };
}

/**
 * Sends Friday reminders to a list of users, throttled to avoid hitting
 * Telegram's 30 msg/s limit.  Returns per-user results and a summary.
 */
export async function sendFridayReminders(
  users: Array<{ telegramId: number; firstName: string }>
): Promise<{
  sent: number;
  failed: number;
  total: number;
  results: SendMessageResult[];
}> {
  const results: SendMessageResult[] = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const result = await sendFridayReminder(user.telegramId, user.firstName);
    results.push(result);

    // Stay safely below Telegram's 30 msg/s rate limit.
    // Add a 50 ms gap after every message; add an extra 200 ms every 20 messages.
    if (i < users.length - 1) {
      const delay = (i + 1) % 20 === 0 ? 250 : 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const sent = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  return { sent, failed, total: users.length, results };
}
