import { NextRequest, NextResponse } from 'next/server';
import { getActiveUsersForReminder } from '@/lib/db-adapter';
import { sendFridayReminders } from '@/lib/telegram-bot';

/**
 * GET /api/cron/friday-reminder
 *
 * Called automatically by Vercel Cron every Friday at 15:00 UTC (18:00 MSK).
 * Configured in vercel.json:  { "schedule": "0 15 * * 5" }
 *
 * Security: Vercel sends Authorization: Bearer <CRON_SECRET> with every cron request.
 * The same CRON_SECRET must be set as an environment variable in the Vercel project.
 *
 * Manual trigger (dev):
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/friday-reminder
 */
export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret) {
    console.error('❌ [friday-reminder] CRON_SECRET env var is not set');
    return NextResponse.json({ error: 'Server misconfigured: missing CRON_SECRET' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('❌ [friday-reminder] Unauthorized request — bad or missing Authorization header');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Day-of-week guard (extra safety net) ─────────────────────────────────
  // Vercel Cron already ensures this only fires on Fridays, but if someone
  // manually triggers the endpoint with the correct secret on a wrong day we
  // still want to be defensive.
  const nowUtc = new Date();
  const nowMsk = new Date(nowUtc.getTime() + 3 * 60 * 60 * 1000); // UTC+3
  const dayOfWeek = nowMsk.getDay(); // 0 = Sunday, 5 = Friday

  if (dayOfWeek !== 5) {
    console.log(`ℹ️  [friday-reminder] Skipping — today is not Friday (MSK weekday: ${dayOfWeek})`);
    return NextResponse.json({
      skipped: true,
      reason: 'Not Friday in MSK timezone',
      mskDay: dayOfWeek,
    });
  }

  const startedAt = Date.now();
  console.log(`🚀 [friday-reminder] Starting at ${nowMsk.toISOString()} MSK`);

  // ── Fetch active users ────────────────────────────────────────────────────
  let users: Awaited<ReturnType<typeof getActiveUsersForReminder>>;

  try {
    users = await getActiveUsersForReminder();
    console.log(`📋 [friday-reminder] Found ${users.length} eligible users`);
  } catch (err) {
    console.error('❌ [friday-reminder] DB error fetching users:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (users.length === 0) {
    console.log('ℹ️  [friday-reminder] No eligible users, nothing to send');
    return NextResponse.json({ sent: 0, failed: 0, total: 0, elapsed_ms: Date.now() - startedAt });
  }

  // ── Send reminders ────────────────────────────────────────────────────────
  const { sent, failed, total, results } = await sendFridayReminders(users);

  const elapsed = Date.now() - startedAt;

  console.log(`✅ [friday-reminder] Done in ${elapsed}ms — sent: ${sent}, failed: ${failed}, total: ${total}`);

  // Log failed sends for debugging (don't expose telegram IDs in the response)
  const failedDetails = results.filter(r => !r.ok);
  if (failedDetails.length > 0) {
    console.warn(
      `⚠️  [friday-reminder] Failed deliveries:`,
      failedDetails.map(r => ({ telegramId: r.telegramId, error: r.error }))
    );
  }

  return NextResponse.json({
    sent,
    failed,
    total,
    elapsed_ms: elapsed,
    timestamp_msk: nowMsk.toISOString(),
  });
}
