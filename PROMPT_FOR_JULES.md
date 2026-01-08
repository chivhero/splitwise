# 🐛 BUG REPORT: Connection Error при добавлении участников

## 📊 Статус проекта

- **Репозиторий**: https://github.com/chivhero/splitwise
- **Production URL**: https://2-self-zeta.vercel.app
- **Database**: Neon PostgreSQL (Vercel)
- **Дата**: 8 января 2026

---

## 🎯 Цель

Реализовать возможность добавления участников в группу **просто по имени**, без обязательной привязки к Telegram ID, так как не все участники используют Telegram.

---

## ❌ Проблема

При попытке добавить участника в группу через `/api/users/create-by-name` возникает ошибка:

```
NeonDbError: null value in column "telegram_id" of relation "users" violates not-null constraint
```

**Ошибка возникает даже после:**
1. ✅ Выполнения миграции `ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL`
2. ✅ Проверки в БД (`is_nullable = YES`)
3. ✅ Force redeploy приложения с очисткой кеша

---

## 🔍 Что было сделано

### 1. Миграция базы данных

**Файл**: `migrations/002_make_telegram_id_optional.sql`

```sql
-- Drop the NOT NULL constraint from telegram_id
ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL;

-- Drop the unique index and recreate it as partial index (only for non-null values)
DROP INDEX IF EXISTS idx_users_telegram;
CREATE UNIQUE INDEX idx_users_telegram ON users(telegram_id) WHERE telegram_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.telegram_id IS 'Telegram ID (optional - users can be added by name only)';
```

**Статус**: ✅ Миграция выполнена успешно в Neon SQL Editor

**Проверка**:
```sql
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'telegram_id';

-- Результат: telegram_id | is_nullable: YES | data_type: integer
```

### 2. Изменения в коде

#### `types/index.ts`
```typescript
export interface User {
  id: string;
  telegramId?: number; // ← Сделан опциональным
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  isPremium: boolean;
  premiumUntil?: Date;
  isAdmin?: boolean;
  createdAt: Date;
}
```

#### `lib/db-postgres.ts`
Добавлена новая функция:
```typescript
export async function createUserByName(
  firstName: string,
  lastName?: string
): Promise<User> {
  const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const result = await sql`
    INSERT INTO users (id, telegram_id, first_name, last_name, created_at)
    VALUES (${id}, NULL, ${firstName}, ${lastName || null}, NOW())
    RETURNING *
  `;

  const row = result.rows[0];
  
  return {
    id: row.id,
    telegramId: row.telegram_id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    photoUrl: row.photo_url,
    isPremium: row.is_premium,
    premiumUntil: row.premium_until ? new Date(row.premium_until) : undefined,
    isAdmin: row.is_admin,
    createdAt: new Date(row.created_at),
  };
}
```

#### `app/api/users/create-by-name/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createUserByName } from '@/lib/db-adapter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName } = body;

    if (!firstName) {
      return NextResponse.json(
        { error: 'firstName is required' },
        { status: 400 }
      );
    }

    const user = await createUserByName(
      firstName,
      lastName || undefined
    );

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[API /users/create-by-name] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
```

### 3. Deployment

```bash
vercel --prod --yes --force
```

**Статус**: ✅ Build успешный, deployment завершен

---

## 🔴 Текущая ошибка (из логов)

```
[API /users/create-by-name] Request: { firstName: 'John', lastName: 'Anderson' }

[API /users/create-by-name] Error: NeonDbError: null value in column "telegram_id" of relation "users" violates not-null constraint
    at execute (/var/task/.next/server/chunks/923.js:12:7843)
    ...
  severity: 'ERROR',
  code: '23502',
  detail: 'Failing row contains (user_1767903623689_3n504og0k, null, John, Anderson, null, null, f, null, 2026-01-08 20:20:23.719014, null).',
  schema: 'public',
  table: 'users',
  column: 'telegram_id',
```

---

## 🤔 Гипотезы

1. **Кеширование схемы БД**: Возможно Vercel/Neon кеширует старую схему БД
2. **Другая БД**: Приложение подключается к другой базе данных (не той, где выполнена миграция)
3. **Pooler connection**: Использование connection pooler может кешировать старую схему
4. **Constraint не удален**: Constraint `NOT NULL` физически не удален, хотя `information_schema` показывает `is_nullable = YES`

---

## 📝 Вопросы к Jules

1. **Почему после выполнения миграции и force redeploy всё еще возникает ошибка NOT NULL constraint?**

2. **Как убедиться, что приложение использует именно ту БД, где выполнена миграция?**

3. **Может ли Neon кешировать схему БД? Как сбросить этот кеш?**

4. **Есть ли способ проверить актуальные constraints на таблице?**
   ```sql
   -- Проверка constraints
   SELECT conname, contype, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conrelid = 'users'::regclass;
   ```

5. **Правильно ли использование `@vercel/postgres` для работы с Neon?**

---

## 📦 Репозиторий

**GitHub**: https://github.com/chivhero/splitwise

**Ключевые файлы**:
- `migrations/002_make_telegram_id_optional.sql`
- `lib/db-postgres.ts` (функция `createUserByName`)
- `app/api/users/create-by-name/route.ts`
- `types/index.ts`

**Commits**:
- `[REFACTOR] Упрощена система участников - добавление по имени без Telegram ID`
- `[FIX] TypeScript: добавлены типы для параметров find()`
- `[FIX] TypeScript + translations: исправлены ошибки компиляции`

---

## 🔧 Environment

- **Database**: Neon PostgreSQL (через Vercel Storage)
- **Connection**: `@vercel/postgres` (sql tagged template)
- **DATABASE_URL**: Используется из Vercel Environment Variables
- **Deployment**: Vercel Serverless Functions
- **Node.js**: 20.x

---

## 💡 Ожидаемое поведение

1. Пользователь нажимает "Add Member"
2. Вводит имя и фамилию (например, "John Anderson")
3. POST `/api/users/create-by-name` → создаёт пользователя с `telegram_id = NULL`
4. Пользователь добавляется в группу
5. ✅ Успех!

**Фактическое поведение**: 
❌ Ошибка `NOT NULL constraint violation`

---

## 🆘 Помощь нужна

Не понимаю, почему после всех изменений constraint `NOT NULL` всё ещё активен. 

Пробовали:
- ✅ Миграция в Neon SQL Editor
- ✅ Проверка `information_schema`
- ✅ Force redeploy с `--force`
- ✅ Проверка кода
- ❌ Всё равно ошибка

**Что еще попробовать?**

---

## 📸 Скриншоты

1. Neon SQL Editor: `is_nullable = YES` для `telegram_id`
2. Vercel Logs: Ошибка `NOT NULL constraint violation`
3. Production URL: https://2-self-zeta.vercel.app

---

**Спасибо за помощь! 🙏**
