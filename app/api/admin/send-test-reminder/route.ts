import { NextRequest, NextResponse } from 'next/server';
import { getUserByTelegramId } from '@/lib/db-postgres';
import { sendFridayReminder, buildFridayMessage } from '@/lib/telegram-bot';
import { isAdminTelegramId } from '@/lib/admin';
import { getActiveUsersForReminder } from '@/lib/db-adapter';

/**
 * POST /api/admin/send-test-reminder
 *
 * Allows an admin to:
 *  1. Preview the message text (dry-run)
 *  2. Send a test reminder to themselves only
 *  3. Send the reminder to all active users (full broadcast)
 *
 * Body:
 *   { telegramId: number, mode: 'preview' | 'self' | 'broadcast' }
 *
 * Only available to admins (checked via isUserAdmin / ADMIN_TELEGRAM_IDS).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, mode = 'preview' } = body as {
      telegramId: number;
      mode?: 'preview' | 'self' | 'broadcast';
    };

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
    }

    // ── Admin check (по ADMIN_TELEGRAM_IDS из env, не колонке is_admin в БД) ─
    if (!isAdminTelegramId(telegramId)) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const admin = await getUserByTelegramId(telegramId);
    if (!admin) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ── Preview mode — just return the rendered message text ──────────────
    if (mode === 'preview') {
      const sample = buildFridayMessage(admin.firstName);
      return NextResponse.json({
        mode: 'preview',
        firstName: admin.firstName,
        message: sample.text,
        button: sample.button,
        note: 'HTML formatting — will render in Telegram',
      });
    }

    // ── Self mode — send only to the calling admin ─────────────────────────
    if (mode === 'self') {
      const result = await sendFridayReminder(telegramId, admin.firstName);
      return NextResponse.json({
        mode: 'self',
        sent: result.ok ? 1 : 0,
        failed: result.ok ? 0 : 1,
        error: result.error,
      });
    }

    // ── Broadcast mode — send to all active users ─────────────────────────
    if (mode === 'broadcast') {
      const users = await getActiveUsersForReminder();

      if (users.length === 0) {
        return NextResponse.json({ mode: 'broadcast', sent: 0, failed: 0, total: 0 });
      }

      const { sendFridayReminders } = await import('@/lib/telegram-bot');
      const { sent, failed, total } = await sendFridayReminders(users);

      return NextResponse.json({ mode: 'broadcast', sent, failed, total });
    }

    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });
  } catch (err) {
    console.error('[send-test-reminder] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
