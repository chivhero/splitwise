# COMPLETE HANDOVER DOCUMENT FOR CLAUDE AI
> Generated: 2026-01-24 | Last commit: `c5ce63b` | Branch: `main`
> Workspace: `/Users/chivhero/Desktop/splitwise-telegram-backup-main`

---

## 1. PROJECT OVERVIEW

### What Is This?
**SplitWize** — a Telegram Mini App for splitting expenses between friends. Built as a full-stack Next.js application running inside Telegram's WebApp iframe. Users create groups, add expenses, and the app calculates optimal settlements (who owes whom).

### Tech Stack
| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router, `'use client'` components) |
| **Language** | TypeScript + React 18 |
| **Styling** | Tailwind CSS with custom glassmorphism design system |
| **Database** | PostgreSQL via `@vercel/postgres` (Neon under the hood) |
| **Local DB** | SQLite via `better-sqlite3` (dev mode) |
| **Hosting** | Vercel |
| **i18n** | Custom `LanguageContext` with `messages/ru.json` and `messages/en.json` |
| **Auth** | Telegram WebApp `initData` (no separate auth system) |
| **Payments** | Tribute (card payments) — **currently blocked by moderation** |
| **Bot** | Telegram Bot (`@SplitWisedbot`) for launching the Mini App |

### Key URLs / Identifiers
- **GitHub repos**: `chivhero/splitwise` (origin), `chivhero/splitwise-telegram-backup` (backup)
- **Vercel project**: Connected to `chivhero/splitwise-telegram-backup` (as of last session)
- **Bot username**: `@SplitWisedbot`
- **Owner Telegram ID**: `409627169` (admin check in `lib/admin.ts`)
- **Tribute product link**: `https://t.me/tribute/app?startapp=pqS3`
- **Tribute product ID**: `103295`

---

## 2. REPOSITORY STRUCTURE

```
splitwise-telegram-backup-main/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Telegram SDK script, providers)
│   ├── page.tsx                  # Home page (group list, premium banner)
│   ├── globals.css               # Tailwind + custom glassmorphism styles
│   ├── group/[groupId]/page.tsx  # Group detail page (expenses, settlements)
│   ├── admin/                    # Admin panel (promo codes, stats)
│   └── api/
│       ├── auth/                 # Telegram auth validation
│       ├── groups/               # CRUD for groups, members, expenses
│       │   └── [groupId]/
│       │       ├── expenses/
│       │       │   └── [expenseId]/
│       │       │       ├── route.ts        # DELETE expense
│       │       │       ├── items/          # Checklist items CRUD
│       │       │       │   ├── route.ts    # GET/POST items
│       │       │       │   └── [itemId]/route.ts  # PATCH/DELETE item
│       │       │       └── comments/       # Comments CRUD
│       │       │           ├── route.ts    # GET/POST comments
│       │       │           └── [commentId]/route.ts  # DELETE comment
│       │       └── join/                   # Join group via link
│       ├── payments/
│       │   ├── create-invoice/route.ts     # Telegram Stars invoice (LEGACY, still exists)
│       │   └── tribute/
│       │       ├── create-link/route.ts    # Returns Tribute product link
│       │       └── webhook/route.ts        # HMAC-verified webhook handler
│       ├── users/
│       │   └── premium-status/route.ts     # GET premium status by telegramId
│       ├── promo-codes/                    # Admin promo code management
│       ├── health/                         # DB health check
│       └── init-db/                        # DB initialization endpoint
├── components/
│   ├── ExpenseDetailsModal.tsx    # Full-screen expense detail view (items + comments)
│   ├── ExpenseList.tsx            # Clickable expense cards → opens details modal
│   ├── AddExpenseModal.tsx        # Full-screen modal for adding expenses
│   ├── AddMemberModal.tsx         # Add member by name
│   ├── CreateGroupModal.tsx       # Create new group
│   ├── GroupList.tsx              # List of user's groups
│   ├── PremiumBanner.tsx          # Premium upsell banner with Tribute payment
│   ├── SettlementsView.tsx        # Who owes whom + optimal settlements
│   ├── LanguageSwitcher.tsx       # RU/EN toggle
│   ├── PromoCodeInput.tsx         # Promo code redemption
│   ├── TelegramProvider.tsx       # Telegram SDK initialization
│   └── ErrorBoundary.tsx          # React error boundary
├── lib/
│   ├── db-adapter.ts              # Auto-switches between SQLite (dev) and PostgreSQL (prod)
│   ├── db-postgres.ts             # PostgreSQL implementation (all DB functions)
│   ├── db.ts                      # SQLite implementation (dev only)
│   ├── telegram.ts                # Telegram WebApp SDK helpers + Tribute payment flow
│   ├── telegram-auth.ts           # HMAC-SHA256 auth verification
│   ├── calculator.ts              # Expense splitting & settlement algorithm
│   └── admin.ts                   # Admin authorization (hardcoded Telegram ID)
├── types/index.ts                 # TypeScript interfaces (User, Group, Expense, ExpenseItem, ExpenseComment, etc.)
├── messages/
│   ├── ru.json                    # Russian translations
│   └── en.json                    # English translations
├── contexts/
│   └── LanguageContext.tsx         # i18n context provider
├── migrations/
│   ├── 001_initial_schema.sql
│   ├── 002_make_telegram_id_optional.sql
│   ├── 003_bigint_telegram_id.sql
│   └── 004_expense_details.sql    # expense_items + expense_comments tables
├── scripts/
│   ├── run-migration.js           # Plain JS migration runner (dotenv + @vercel/postgres)
│   ├── check-db.js                # DB diagnostic tool
│   ├── migrate-production.js      # Production migration helper
│   └── tribute-get-products.js    # Tribute API diagnostic
├── docs/
│   ├── TRIBUTE_SETUP.md           # Complete Tribute integration guide
│   ├── BOT_SETUP.md
│   ├── DEVELOPMENT.md
│   ├── POSTGRESQL_MIGRATION.md
│   └── TESTING.md
├── public/version.json            # Build version metadata for cache-busting diagnostics
├── next.config.js                 # CSP headers + aggressive cache-busting headers
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

---

## 3. DATABASE SCHEMA

### Tables (PostgreSQL on Vercel/Neon)

```sql
-- Core tables
users (id TEXT PK, telegram_id BIGINT UNIQUE, first_name, last_name, username, photo_url, is_premium BOOLEAN, premium_until TIMESTAMP, is_admin BOOLEAN, created_at)
groups (id TEXT PK, name, description, currency DEFAULT 'USD', created_by FK→users, created_at)
group_members (user_id + group_id COMPOSITE PK, role DEFAULT 'member', joined_at)
expenses (id TEXT PK, group_id FK→groups, description, amount, currency, paid_by FK→users, split_between TEXT, date, created_by FK→users, created_at, category)

-- Promo system
promo_codes (id TEXT PK, code UNIQUE, premium_days, max_uses, used_count, is_active, created_by, created_at, expires_at)
promo_redemptions (id TEXT PK, promo_code_id FK, user_id FK, redeemed_at)

-- Expense details (Migration 004)
expense_items (id TEXT PK, expense_id FK→expenses ON DELETE CASCADE, description, is_checked BOOLEAN, created_by FK→users, created_at)
expense_comments (id TEXT PK, expense_id FK→expenses ON DELETE CASCADE, text, created_by FK→users, created_at)
```

### Key Design Decisions
- `telegram_id` is `BIGINT` (supports IDs > 2.1B) and **nullable** (users can be added by name only without a Telegram account)
- `split_between` in expenses is stored as comma-separated TEXT of user IDs (parsed in JS)
- IDs use format: `user_<timestamp>_<random>`, `group_<timestamp>_<random>`, etc.
- `expense_items` and `expense_comments` have `ON DELETE CASCADE` from expenses

---

## 4. COMPLETE FEATURE MAP

### ✅ Fully Implemented & Working
| Feature | Status | Key Files |
|---------|--------|-----------|
| User auth via Telegram WebApp | ✅ Working | `lib/telegram.ts`, `lib/telegram-auth.ts` |
| Create/view groups | ✅ Working | `components/CreateGroupModal.tsx`, `components/GroupList.tsx` |
| Add members by name (no Telegram required) | ✅ Working | `components/AddMemberModal.tsx`, inline in `AddExpenseModal.tsx` |
| Add/delete expenses with categories | ✅ Working | `components/AddExpenseModal.tsx`, API routes |
| Expense detail view (full-screen modal) | ✅ Working | `components/ExpenseDetailsModal.tsx` |
| Expense checklist (items with checkboxes) | ✅ Working | API: `items/route.ts`, DB: `expense_items` |
| Expense comments | ✅ Working | API: `comments/route.ts`, DB: `expense_comments` |
| Balance calculations & optimal settlements | ✅ Working | `lib/calculator.ts`, `components/SettlementsView.tsx` |
| Join group via invite link | ✅ Working | `app/api/groups/[groupId]/join/` |
| Share group link via Telegram | ✅ Working | `lib/telegram.ts → shareGroupLink()` |
| i18n (Russian/English) | ✅ Working | `messages/*.json`, `contexts/LanguageContext.tsx` |
| Glassmorphism UI design | ✅ Working | `app/globals.css`, Tailwind config |
| Admin panel (promo codes, stats) | ✅ Working | `app/admin/`, restricted to owner ID |
| Promo code system | ✅ Working | `components/PromoCodeInput.tsx`, API routes |
| Telegram haptic feedback | ✅ Working | `lib/telegram.ts → hapticFeedback()` |
| Read replica lag workaround | ✅ Working | localStorage cache in `group/[groupId]/page.tsx` |

### ⚠️ Implemented but BLOCKED
| Feature | Status | Blocker |
|---------|--------|---------|
| **Tribute payment (Premium)** | ⚠️ Blocked | Tribute product rejected by moderation: "Цифровой товар недоступен" |

### 📋 Not Yet Implemented
| Feature | Notes |
|---------|-------|
| Edit expense | TODO in `ExpenseList.tsx` line 134: `console.log('Edit expense:', selectedExpense.id)` |
| Premium feature gating | Premium status is tracked but no features are actually gated behind it |
| Export/download expenses | Not started |
| Receipt photo attachment | Not started |
| Notifications | Not started |

---

## 5. PAYMENT SYSTEM — CURRENT STATE

### Architecture
The app has **two payment paths** in the codebase:

#### Path A: Telegram Stars (LEGACY — code exists but NOT active in UI)
- **File**: `app/api/payments/create-invoice/route.ts`
- **Amount**: 50 Stars (XTR currency)
- **Flow**: `createInvoiceLink` → Telegram Bot API → `openInvoice` in WebApp
- **Status**: Code present, but the UI (`lib/telegram.ts → openPremiumInvoice()`) now calls Tribute instead

#### Path B: Tribute (ACTIVE in code — but product blocked by moderation)
- **Files**:
  - `app/api/payments/tribute/create-link/route.ts` — returns `TRIBUTE_PRODUCT_LINK` env var
  - `app/api/payments/tribute/webhook/route.ts` — HMAC-SHA256 verified webhook handler
  - `lib/telegram.ts → openPremiumInvoice()` — calls `/api/payments/tribute/create-link`, opens link via `webApp.openLink()`
- **Price**: 100 ₽ (displayed in UI), mapped to Tribute digital product
- **Webhook flow**: Tribute sends `new_digital_product` event → verify signature → find user by `telegram_user_id` → set `premium_until` to +1 month
- **Current blocker**: Tribute product was rejected by their moderation. Error: "Цифровой товар недоступен — Товар удален и недоступен для покупки"

### Environment Variables for Payments
```env
TELEGRAM_BOT_TOKEN=...          # For Stars invoice creation (legacy path)
TRIBUTE_API_KEY=0f3646cd-b468-489c-9469-f94807b7  # For webhook signature verification
TRIBUTE_PRODUCT_ID=103295       # To match webhook events
TRIBUTE_PRODUCT_LINK=https://t.me/tribute/app?startapp=pqS3  # Opened via webApp.openLink()
```

### What Needs to Happen
1. User resolves Tribute moderation issue (contacts Tribute support)
2. Gets new/approved product link and ID
3. Updates `TRIBUTE_PRODUCT_LINK` and `TRIBUTE_PRODUCT_ID` in Vercel env vars
4. Configures Tribute webhook URL: `https://<vercel-domain>/api/payments/tribute/webhook`
5. Redeploys on Vercel

### ⚠️ Known Bug in Webhook
The webhook file (`app/api/payments/tribute/webhook/route.ts`) imports directly from `@/lib/db-postgres`:
```typescript
import { getUserByTelegramId, updateUserPremium } from '@/lib/db-postgres';
```
This should ideally use `@/lib/db-adapter` for consistency, though in production it makes no difference since Vercel always uses PostgreSQL.

---

## 6. COMMIT HISTORY (Last 20 Commits, Newest First)

| # | Hash | Date | Message | What Changed |
|---|------|------|---------|-------------|
| 1 | `c5ce63b` | 2026-02-08 | deploy: rebuild with openLink type fix | Empty commit to trigger Vercel build |
| 2 | `8506079` | 2026-02-08 | fix: add openLink to Telegram WebApp types | Added `openLink` to `Window.Telegram.WebApp` type definition in `lib/telegram.ts` |
| 3 | `77ebf63` | 2026-02-08 | fix: force new Vercel deployment via Git push | Empty commit |
| 4 | `496a112` | 2026-02-08 | deploy: trigger first build from splitwise repo | Empty commit |
| 5 | `b3baa8b` | 2026-02-08 | test: verify Vercel webhook trigger | Empty commit |
| 6 | `4b95277` | 2026-02-08 | deploy: first build after Vercel Git reconnect | Empty commit |
| 7 | `8f6d495` | 2026-02-08 | deploy: trigger build after Vercel Git connect | Empty commit |
| 8 | `8e818ae` | 2026-02-08 | deploy: trigger Vercel build for Tribute integration | Empty commit |
| 9 | `5e2739b` | 2026-02-08 | fix: aggressive cache-busting for Telegram WebApp | Added `Cache-Control` headers in `next.config.js`, version indicator in `app/page.tsx`, metadata in `app/layout.tsx` |
| 10 | `016f6d2` | 2026-02-08 | debug: add comprehensive logging for Tribute payment flow | Added `console.log` diagnostics in `lib/telegram.ts`, `PremiumBanner.tsx`, `tribute/create-link/route.ts` |
| 11 | `d45e33c` | 2026-02-08 | chore: trigger Vercel redeploy for Tribute integration | Empty commit |
| 12 | `929c03f` | 2026-02-08 | feat: интеграция Tribute для оплаты Premium | **Major**: Added Tribute API routes, webhook, updated `openPremiumInvoice()`, env vars, TRIBUTE_SETUP.md (+444 lines) |
| 13 | `da41fca` | 2026-02-07 | Update Premium pricing: 50 Stars (100 ₽) with UI improvements | Set Stars amount to 50, updated i18n to show "100 ₽" |
| 14 | `c361873` | 2026-02-05 | Fix: Make comment input sticky and scroll into view on focus | Fixed keyboard overlap in `ExpenseDetailsModal.tsx` — sticky input, `scrollIntoView`, `pb-20` |
| 15 | `c6cab97` | 2026-02-05 | Fix: Hide FAB when modal open, improve items/comments creation | Added `isDetailsModalOpen` state to hide FAB; fixed `userId`/`telegramId` in item/comment payloads |
| 16 | `a477c65` | 2026-02-05 | Update ExpenseDetailsModal styling to match app design | Restyled modal to match glassmorphism design |
| 17 | `8bf7941` | 2026-02-05 | Debug: Add console logs and increase z-index for modal | Set modal `z-[9999]`, added migration script |
| 18 | `3e095a0` | 2026-02-05 | Add expense details feature with checklist and comments | **Major**: +1087 lines. New tables, API routes, `ExpenseDetailsModal.tsx`, DB functions, types, migration |
| 19 | `729ec6c` | 2026-02-05 | [fix] Persist new members added in expense modal to parent | Fixed member list sync between `AddExpenseModal` and parent |
| 20 | `7eb545f` | 2026-02-05 | [i18n] Add missing translations for inline member creation | Added translation keys for inline member creation |

### Commits Before These 20 (Older History Summary)
- `822a05b` — Inline member creation in Add Expense Modal
- `13eb443` — Make Add Expense Modal fullscreen on mobile
- `952043e` — Improve group details action buttons layout
- `d49445c..110b79b` — Multiple fixes for read replica lag bugs
- `5459d3f` — UX improvements, auth sync & member fix
- `73faaad..db487fb` — DB schema alignment, TypeScript fixes
- `41b5fd3` — Simplified member system (add by name, no Telegram ID required)
- `8cb0481..485ce81` — Various bug fixes (language switching, connection errors)
- `9f49619..d62bb27` — Admin panel with promo code system
- `08791c2` — Telegram Stars payment system
- `75449cb..c29426e` — Glassmorphism design overhaul
- `ecf6509` — Initial working version

---

## 7. VERCEL DEPLOYMENT — CRITICAL CONTEXT

### The Deployment Nightmare (Documented Problem)
During the Tribute integration, we discovered a severe deployment issue:

1. **Two GitHub repos exist**: `chivhero/splitwise` (active development) and `chivhero/splitwise-telegram-backup` (backup)
2. **Git remotes**: `origin` → `chivhero/splitwise`, `backup` → `chivhero/splitwise-telegram-backup`
3. **Vercel was tracking the wrong repo**: The Vercel project was configured to auto-deploy from `chivhero/splitwise-telegram-backup`, but code was being pushed to `chivhero/splitwise`
4. **Multiple empty commits** (commits 1-8 above) were attempts to trigger Vercel builds
5. **Resolution**: User connected Vercel to `chivhero/splitwise-telegram-backup` and code was pushed to both remotes

### Current Deployment Setup
- **Vercel project**: Connected to `chivhero/splitwise-telegram-backup` Git repo
- **Both remotes should be kept in sync** — push to both `origin` and `backup`
- **Vercel domain**: Likely `https://2-self-zeta.vercel.app` (referenced in debugging) or a custom domain
- **BotFather WebApp URL**: Must point to the Vercel domain

### Cache-Busting Artifacts (Can Be Cleaned Up)
These were added during debugging and can be removed once stable:
- `app/page.tsx`: Build version indicator `v.tribute-3` in top-right corner
- `app/page.tsx`: Bundle content diagnostics `console.log` statements
- `app/layout.tsx`: `app-version` meta tag with `Date.now()`
- `components/PremiumBanner.tsx`: i18n diagnostic `console.log`
- `lib/telegram.ts`: Multiple `console.log` statements in `openPremiumInvoice()`
- `public/version.json`: Build metadata file
- `next.config.js`: Aggressive `Cache-Control: no-cache` headers (may want to keep for Telegram WebApp)

---

## 8. KEY ARCHITECTURAL PATTERNS

### Database Adapter Pattern
`lib/db-adapter.ts` automatically switches between SQLite (dev) and PostgreSQL (prod) based on environment variables:
```typescript
const useSQLite = process.env.USE_SQLITE === 'true' || (!process.env.DATABASE_URL && !process.env.POSTGRES_URL);
```
All API routes should import from `@/lib/db-adapter`, not directly from `db-postgres.ts`.

### Read Replica Lag Workaround
Vercel Postgres (Neon) uses read replicas that can lag behind writes. The app works around this in `app/group/[groupId]/page.tsx`:
- After adding a member, it's immediately added to React state (optimistic update)
- Members are cached in `localStorage` with key `group_members_${groupId}`
- On page load, missing members from cache are merged into API response
- Retry logic: if API returns fewer members than cache, retry up to 2x with 500ms delay

### Telegram WebApp Integration
- SDK loaded via `<Script src="telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />`
- `TelegramProvider` component calls `webApp.ready()` and `webApp.expand()` on mount
- Haptic feedback used throughout for UI interactions
- Group sharing uses `https://t.me/{botUsername}?startapp=join_{groupId}` deep links
- `ExpenseDetailsModal` calls `window.Telegram.WebApp.expand()` on mount to ensure full screen

### i18n System
Custom implementation (not `next-intl` despite being in dependencies):
- `contexts/LanguageContext.tsx` provides `t()` function and `locale` state
- Translation files: `messages/ru.json` and `messages/en.json`
- Language auto-detection from Telegram user's language code
- Components use `key={locale}` to force re-render on language change

---

## 9. KNOWN ISSUES & TECHNICAL DEBT

### Critical
1. **Tribute payment blocked** — Product rejected by moderation. User needs to resolve with Tribute support, then update env vars and redeploy.

### Important
2. **Edit expense not implemented** — The Edit button in `ExpenseDetailsModal` only logs to console. The `onEdit` callback needs a full implementation with an edit modal.
3. **Webhook imports from db-postgres directly** — `app/api/payments/tribute/webhook/route.ts` and `app/api/users/premium-status/route.ts` import from `@/lib/db-postgres` instead of `@/lib/db-adapter`. Should be fixed for consistency.
4. **No input validation on expense amounts** — Could lead to negative amounts or very large numbers.
5. **No rate limiting** on any API endpoints.

### Cleanup
6. **Debug artifacts everywhere** — Multiple `console.log` statements added during Tribute debugging (see Section 7 for list).
7. **Empty deploy commits** — 6+ empty commits in history from deployment troubleshooting.
8. **Version indicator in UI** — `v.tribute-3` text visible in top-right corner of home page.
9. **`data.db` in repo root** — SQLite development database file; should be in `.gitignore`.

### UX Issues
10. **Keyboard overlap on mobile** — Partially fixed for comments input (sticky + scrollIntoView), but may still occur in other modals.
11. **FAB hide/show** — Works but depends on state callback chain: `ExpenseDetailsModal` → `ExpenseList.onModalOpen` → `GroupPage.setIsDetailsModalOpen`.
12. **No loading skeleton** — Just a spinner. Could benefit from skeleton UI for perceived performance.

---

## 10. ENVIRONMENT VARIABLES

### Required for Production (Vercel)
```env
# Telegram
TELEGRAM_BOT_TOKEN=<bot token from @BotFather>
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=SplitWisedbot
NEXT_PUBLIC_APP_URL=https://<vercel-domain>.vercel.app

# Database (auto-provisioned by Vercel Postgres)
POSTGRES_URL=<connection string>
POSTGRES_PRISMA_URL=<prisma connection string>
POSTGRES_URL_NO_SSL=<no ssl connection string>
POSTGRES_URL_NON_POOLING=<non-pooling connection string>
POSTGRES_USER=<username>
POSTGRES_HOST=<host>
POSTGRES_PASSWORD=<password>
POSTGRES_DATABASE=<database name>

# Tribute Payments
TRIBUTE_API_KEY=0f3646cd-b468-489c-9469-f94807b7
TRIBUTE_PRODUCT_ID=103295
TRIBUTE_PRODUCT_LINK=https://t.me/tribute/app?startapp=pqS3
```

### Local Development
```env
# .env.local
USE_SQLITE=true  # or just don't set POSTGRES_URL
NODE_ENV=development
```

---

## 11. API ENDPOINTS MAP

### Groups
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/groups?telegramId=` | List user's groups |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/[groupId]` | Get group details + members |
| POST | `/api/groups/[groupId]/join` | Join group via invite |

### Expenses
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/groups/[groupId]/expenses` | List group expenses |
| POST | `/api/groups/[groupId]/expenses` | Create expense |
| DELETE | `/api/groups/[groupId]/expenses/[expenseId]` | Delete expense |

### Expense Items (Checklist)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/groups/[groupId]/expenses/[expenseId]/items` | List items |
| POST | `/api/groups/[groupId]/expenses/[expenseId]/items` | Create item (`{description, userId|telegramId}`) |
| PATCH | `/api/groups/[groupId]/expenses/[expenseId]/items/[itemId]` | Toggle checkbox (`{isChecked}`) |
| DELETE | `/api/groups/[groupId]/expenses/[expenseId]/items/[itemId]` | Delete item |

### Expense Comments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/groups/[groupId]/expenses/[expenseId]/comments` | List comments |
| POST | `/api/groups/[groupId]/expenses/[expenseId]/comments` | Create comment (`{text, userId|telegramId}`) |
| DELETE | `/api/groups/[groupId]/expenses/[expenseId]/comments/[commentId]` | Delete comment |

### Payments
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/create-invoice` | Create Telegram Stars invoice (LEGACY) |
| POST | `/api/payments/tribute/create-link` | Get Tribute payment link |
| POST | `/api/payments/tribute/webhook` | Tribute webhook handler (HMAC verified) |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/premium-status?telegramId=` | Check premium status |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/stats` | Admin statistics |
| Various | `/api/promo-codes/*` | Promo code CRUD |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | DB health check |
| POST | `/api/init-db` | Initialize DB tables |

---

## 12. CHAT DISCUSSION → CODE MAPPING

### Discussion 1: Expense Details Feature
**User request**: "Реализовать возможность «провалиться» в конкретный расход"
- Clickable expense cards → `components/ExpenseList.tsx` (onClick handler, line 92-95)
- Full-screen detail modal → `components/ExpenseDetailsModal.tsx` (436 lines)
- Checklist items → DB: `expense_items` table, API: `items/route.ts`, UI: checkbox list in modal
- Comments → DB: `expense_comments` table, API: `comments/route.ts`, UI: chat-like feed
- Migration → `migrations/004_expense_details.sql`
- DB functions → `lib/db-postgres.ts` (lines 700-836)
- Types → `types/index.ts` (ExpenseItem, ExpenseComment interfaces)

**Issues encountered & fixed**:
- Modal not showing → increased z-index to 9999
- Styling mismatch → restyled to glassmorphism
- FAB overlapping modal → `isDetailsModalOpen` state hides FAB
- Items/comments not saving → fixed API payload to include `userId`/`telegramId`
- Keyboard overlapping comment input → sticky input + scrollIntoView + pb-20

### Discussion 2: Premium Pricing Update
**User request**: "Установить стоимость Премиум-подписки равной 50 Stars"
- Stars amount → `app/api/payments/create-invoice/route.ts` (amount: 50)
- UI text → `messages/ru.json` and `messages/en.json` ("100 ₽")

### Discussion 3: Tribute Payment Integration
**User request**: "Оплата картой через Tribute вместо Stars"
- Tribute create-link API → `app/api/payments/tribute/create-link/route.ts`
- Tribute webhook → `app/api/payments/tribute/webhook/route.ts`
- Frontend payment flow → `lib/telegram.ts → openPremiumInvoice()` (now calls Tribute)
- Setup docs → `docs/TRIBUTE_SETUP.md`
- **Blocked by**: Tribute moderation rejection

### Discussion 4: Vercel Deployment Crisis
**Problem**: Code changes not appearing in production despite commits
- Root cause: Vercel tracking wrong Git repo
- Resolution: Connected Vercel to `splitwise-telegram-backup` repo
- TypeScript build error: missing `openLink` type → fixed in `lib/telegram.ts`
- Cache issues → aggressive headers in `next.config.js`, version metadata

---

## 13. PENDING TASKS (Prioritized)

### P0 — Blocking
1. **Resolve Tribute moderation** — User is working with Tribute support. Once approved:
   - Get new product link/ID from Tribute
   - Update Vercel env vars: `TRIBUTE_PRODUCT_LINK`, `TRIBUTE_PRODUCT_ID`
   - Configure Tribute webhook URL to point to the Vercel domain
   - Redeploy

### P1 — Should Do Next
2. **Implement Edit Expense** — The "Edit" button exists but does nothing. Need an edit modal similar to `AddExpenseModal` pre-filled with current values.
3. **Clean up debug artifacts** — Remove all diagnostic `console.log` statements, version indicator, and unnecessary cache-busting metadata.
4. **Fix webhook import** — Change `import from '@/lib/db-postgres'` to `'@/lib/db-adapter'` in webhook and premium-status routes.

### P2 — Nice to Have
5. **Premium feature gating** — Actually restrict features (>5 groups, advanced reports) based on premium status.
6. **Add loading skeletons** — Replace spinner with skeleton UI.
7. **Rate limiting** — Add basic rate limiting to API routes.
8. **Input validation** — Validate expense amounts, description lengths, etc.

---

## 14. HOW TO DEVELOP

### Local Setup
```bash
# Install dependencies
npm install

# Run locally (uses SQLite)
npm run dev

# The app will be at http://localhost:3000
# For Telegram testing, use ngrok or similar tunnel
```

### Run Database Migration
```bash
# Ensure .env.local has POSTGRES_URL
node scripts/run-migration.js
```

### Deploy
```bash
# Push to both remotes
git push origin main
git push backup main

# Vercel auto-deploys from backup remote
# Or manual: vercel --prod
```

### Key Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest tests
node scripts/check-db.js  # Check DB state
```

---

## 15. USER CONTEXT

- **Language**: Russian (primary), all communication in Russian
- **User's Telegram ID**: 409627169 (hardcoded as admin)
- **User's GitHub**: `chivhero`
- **User preference**: Wants card payments (Tribute) over Telegram Stars
- **User's decision**: Keep Tribute code as-is, will resolve moderation issue with support
- **Tone**: Informal, prefers quick solutions, tests directly in Telegram (not localhost)

---

*End of handover document. This file should give complete context to any AI or developer continuing this project.*
