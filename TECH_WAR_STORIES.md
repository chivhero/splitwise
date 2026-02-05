# SplitWize Telegram Mini App: Technical War Stories

## Database & Architecture

### 🛑 The Bug: Integer Overflow with Telegram User IDs

**What was happening?** Users with Telegram IDs above 2,147,483,647 (the maximum value for PostgreSQL `INTEGER`) were unable to register. The database would throw constraint violations or silently truncate IDs, causing authentication failures and data corruption.

**The Root Cause:** PostgreSQL `INTEGER` type has a maximum value of 2^31 - 1. Modern Telegram user IDs can exceed this limit, especially for newer accounts. Our initial schema (`lib/db.ts`) used `INTEGER UNIQUE NOT NULL` for `telegram_id`, which worked fine during development but broke in production.

**The Fix:** 
- Created migration `migrations/003_bigint_telegram_id.sql` to alter the column type:
  ```sql
  ALTER TABLE users ALTER COLUMN telegram_id TYPE BIGINT;
  ```
- Updated schema definitions in `lib/db-postgres.ts` to use `BIGINT UNIQUE` (nullable for name-only users)
- Updated TypeScript types in `types/index.ts` to reflect `BIGINT` storage
- **Key Learning:** Always use `BIGINT` for external ID systems (Telegram, Discord, etc.) that may exceed 32-bit integer limits

---

### 🛑 The Bug: "Ghost Data" - Members Disappearing After Adding Expenses

**What was happening?** Users would add a member to a group, see them appear in the UI, but when adding an expense, the newly added member would vanish from the selection list. Other users would see "Неизвестный" (Unknown) instead of member names. The member count would show correctly on the main page but incorrectly inside the group.

**The Root Cause:** **Read Replica Lag** in Vercel Postgres (Neon). When we wrote a new member to the primary database, subsequent reads from read replicas could return stale data. The sequence was:
1. `POST /api/groups/[groupId]/join` → writes to primary ✅
2. `GET /api/groups/[groupId]` → reads from replica (stale) ❌
3. Frontend overwrites fresh local state with stale data

This is a classic **eventual consistency** problem in distributed databases.

**The Fix:** Multi-layered approach combining backend retry logic and frontend optimistic updates:

**Backend (`lib/db-postgres.ts`):**
```typescript
export async function getGroupMembers(groupId: string, retryCount = 0): Promise<GroupMember[]> {
  // COUNT(*) typically hits primary or freshest replica
  const countResult = await sql`
    SELECT COUNT(*) as cnt FROM group_members WHERE group_id = ${groupId}
  `;
  const expectedCount = parseInt(countResult.rows[0]?.cnt || '0');
  
  // SELECT with JOIN might hit stale replica
  const result = await sql`SELECT ... FROM group_members gm INNER JOIN users u ...`;
  
  // If SELECT returns fewer rows than COUNT → replica lag detected
  if (result.rows.length < expectedCount && retryCount < 3) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return getGroupMembers(groupId, retryCount + 1);
  }
  
  return result.rows.map(...);
}
```

**API Layer (`app/api/groups/[groupId]/join/route.ts`):**
- Removed `getGroupById()` call after adding member (avoided stale read)
- Returns only the `newMember` object directly
- Client updates local state immediately

**Frontend (`app/group/[groupId]/page.tsx`):**
- Uses `localStorage` to cache members per group
- Merges API response with cached data
- `handleMemberAdded` directly appends to local state without re-fetching
- Removed `loadGroupData()` call after `handleExpenseAdded` to prevent overwriting fresh state

**Key Learning:** In serverless environments with read replicas, always:
1. Use retry logic comparing `COUNT(*)` vs `SELECT` results
2. Return minimal data from write operations (don't re-read entire entities)
3. Implement optimistic UI updates on the client
4. Cache critical data in `localStorage` as a fallback

---

## Next.js & Telegram Quirks

### 🛑 The Bug: Language Switching Not Updating UI

**What was happening?** When users clicked the language switcher, the locale state changed but components didn't re-render with new translations. Users saw mixed Russian/English text or stale translations.

**The Root Cause:** React wasn't detecting that translations had changed because the `locale` value was stored in Context but components weren't keyed to force re-render. The `useLanguage()` hook updated state, but React's reconciliation algorithm didn't recognize that child components needed to re-render.

**The Fix:** Added `key={locale}` prop to root elements in components that display translated content:
- `app/page.tsx`: `<div key={locale} className="min-h-screen...">`
- `components/PremiumBanner.tsx`: `<div key={locale} className="...">`
- `components/CreateGroupModal.tsx`: `<div key={locale} className="...">`

This forces React to unmount and remount components when locale changes, ensuring fresh translations.

**Key Learning:** When using Context for i18n, use `key` prop to force re-renders on language changes. Alternatively, use a library like `next-intl` that handles this automatically.

---

### 🛑 The Bug: Telegram WebApp Authentication Failing Silently

**What was happening?** Users opening the app outside Telegram would see a blank screen or "Authentication failed" message. No server logs appeared, making debugging impossible.

**The Root Cause:** 
1. `window.Telegram.WebApp.initData` was empty when opened outside Telegram
2. Frontend was making API calls with empty `initData` string
3. Backend validation (`validateInitData`) failed but error wasn't properly surfaced
4. No client-side check for Telegram WebApp environment

**The Fix:**

**Frontend (`app/page.tsx`):**
```typescript
const tgUser = getTelegramUser();
if (!tgUser) {
  return (
    <div>
      <h2>Пожалуйста, откройте это приложение через официального бота</h2>
      <a href="https://t.me/SplitWisedbot">Открыть бота</a>
    </div>
  );
}
```

**Backend (`lib/telegram-auth.ts`):**
- Implemented HMAC-SHA256 validation for `initData`
- Handles both `hash` and `signature` parameters (Telegram uses both inconsistently)
- Validates `auth_date` to prevent replay attacks

**Key Learning:** Always check for Telegram WebApp environment before making authenticated API calls. Use `window.Telegram?.WebApp` check and display helpful error messages.

---

### 🛑 The Bug: Server Actions vs Client Components Hydration Mismatch

**What was happening?** During development, we saw hydration errors where server-rendered HTML didn't match client-rendered HTML, especially for user-specific data like group members.

**The Root Cause:** Next.js was attempting to server-render components that depended on `window.Telegram.WebApp.initDataUnsafe`, which is only available on the client. This caused:
- Server: Renders with empty/default data
- Client: Hydrates with actual Telegram user data
- Mismatch → Hydration error

**The Fix:**
- Made all Telegram-dependent components `'use client'`
- Used `useEffect` to load data after mount
- Added loading states during initial render
- Used `mounted` state for Portal-based modals (`components/PromoCodeInput.tsx`)

**Key Learning:** In Telegram Mini Apps, almost everything should be client components. Use Server Components only for static content or data that doesn't depend on Telegram context.

---

## UI/UX Evolution

### 🛑 The Bug: Promo Code Modal Hidden Behind Premium Banner

**What was happening?** The promo code input modal appeared below the Premium banner due to z-index stacking issues. Users couldn't interact with the modal, and it looked broken.

**The Root Cause:** CSS z-index stacking context. The Premium banner had `z-index: 10`, and the modal was rendered within the same DOM hierarchy, inheriting a lower stacking order.

**The Fix:** Used React Portal (`react-dom/createPortal`) to render the modal directly into `document.body`, bypassing the normal DOM hierarchy:

```typescript
{showModal && mounted && createPortal(
  <div style={{ zIndex: 99999 }}>
    {/* Modal content */}
  </div>,
  document.body
)}
```

**Additional Improvements:**
- Redesigned modal with gradient backgrounds and glassmorphism
- Auto-uppercase input with whitespace removal: `e.target.value.toUpperCase().replace(/\s/g, '')`
- Added `autoComplete="off"`, `autoCorrect="off"`, `autoCapitalize="characters"` for better mobile UX
- Used `tracking-[0.2em]` for better code readability

**Key Learning:** Use Portals for modals that must appear above all other content. Set explicit z-index values and render to `document.body` to avoid stacking context issues.

---

### 🛑 The Bug: Expense Form UX Issues

**What was happening?** 
1. Users had to manually select themselves as payer every time
2. No visual feedback for validation errors
3. Long member lists weren't scrollable
4. "Test User Developer" appeared in production lists

**The Fix:**

**Auto-select payer (`components/AddExpenseModal.tsx`):**
```typescript
const currentUserMember = group.members.find(m => m.user?.telegramId === telegramId);
const [paidBy, setPaidBy] = useState<string>(currentUserMember?.userId || '');
```

**Client-side validation:**
```typescript
if (!paidBy) {
  setPaidByError(true);
  hapticFeedback('error');
  return;
}
// Visual feedback: ring-2 ring-red-500 on select element
```

**Scrollable lists:**
```typescript
<div className="max-h-48 overflow-y-auto">
  {/* Member selection list */}
</div>
```

**Display "You"/"Вы" for current user:**
```typescript
const getMemberName = (userId: string) => {
  if (userId === currentUserId) {
    return locale === 'ru' ? 'Вы' : 'You';
  }
  // ... rest of logic
};
```

**Removed test user:** Deleted hardcoded "Test User Developer" creation logic from `app/api/groups/route.ts`

**Key Learning:** Always auto-select sensible defaults, provide immediate visual feedback for validation, and ensure lists are scrollable on mobile. Use haptic feedback for better UX in Telegram Mini Apps.

---

## Performance & Optimization

### 🛑 The Bug: Slow Database Processing for New Members

**What was happening?** After adding a member, users had to wait 5-10 seconds before the member appeared in expense splitting lists. During this time, "Неизвестный" (Unknown) was displayed.

**The Root Cause:** Multiple factors:
1. Read replica lag (300-500ms typical)
2. Multiple sequential API calls (get group → get members → get expenses)
3. No client-side caching
4. Frontend re-fetching entire group data after each operation

**The Fix:**
- Implemented retry logic in `getGroupMembers` and `getGroupExpenses` (see "Ghost Data" section above)
- Added `localStorage` caching for members per group
- Changed `/api/groups/[groupId]/join` to return only new member (optimistic update)
- Removed unnecessary `loadGroupData()` calls after mutations
- Used `Promise.all()` for parallel API calls where possible

**Key Learning:** In serverless environments, minimize round trips, cache aggressively on the client, and use optimistic updates. Read replica lag is unavoidable, so detect and retry.

---

## Security

### 🛑 The Bug: Insecure Telegram Authentication

**What was happening?** Initially, we trusted `window.Telegram.WebApp.initDataUnsafe` without server-side validation. This allowed potential spoofing of user data.

**The Root Cause:** Telegram's `initDataUnsafe` is convenient but not secure—it's just parsed JSON without signature validation. Anyone could modify it client-side.

**The Fix:** Implemented HMAC-SHA256 validation server-side (`lib/telegram-auth.ts`):

```typescript
export function validateInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash') || params.get('signature'); // Telegram inconsistency
  
  // Create secret key: HMAC-SHA256(bot_token, "WebAppData")
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  
  // Calculate hash: HMAC-SHA256(data-check-string, secret_key)
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  return calculatedHash === hash;
}
```

**Additional Security:**
- Validates `auth_date` to prevent replay attacks (max 24 hours)
- Parses user data only after validation
- Returns 401 Unauthorized for invalid signatures

**Key Learning:** Never trust client-provided data. Always validate Telegram `initData` server-side using HMAC-SHA256. Telegram uses both `hash` and `signature` parameters inconsistently—handle both.

---

## Summary

Building a Telegram Mini App on Next.js + Vercel Postgres taught us:

1. **Database:** Use `BIGINT` for external IDs, implement retry logic for read replicas, return minimal data from write operations
2. **Next.js:** Use `'use client'` for Telegram-dependent components, use `key` prop for forced re-renders, handle hydration carefully
3. **Telegram:** Always validate `initData` server-side, check for WebApp environment, use Portals for modals
4. **UX:** Auto-select defaults, provide immediate feedback, cache aggressively, use optimistic updates

The biggest challenge was **read replica lag**—a problem that doesn't exist in traditional monolithic apps but is common in serverless architectures. Our solution combined backend retry logic, frontend caching, and optimistic UI updates.
