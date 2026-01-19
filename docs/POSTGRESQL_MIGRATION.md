# 🐘 PostgreSQL Migration Guide

Полное руководство по миграции с SQLite на PostgreSQL для production деплоя.

## 🎯 Зачем нужна миграция?

SQLite работает локально, но **не поддерживается на serverless платформах** (Vercel, Netlify). Для production необходим PostgreSQL.

---

## 🚀 Быстрый старт

### 1. Получите PostgreSQL базу

Выберите один из вариантов:

**Vercel Postgres** (рекомендуется для Vercel):
```bash
# В вашем Vercel проекте
vercel postgres create
```

**Supabase** (бесплатный tier):
1. Зайдите на https://supabase.com
2. Создайте проект
3. Скопируйте Connection String из Settings → Database

**Neon** (serverless PostgreSQL):
1. Зайдите на https://neon.tech
2. Создайте проект
3. Скопируйте Connection String

### 2. Настройте переменные окружения

В production (Vercel/Netlify):
```env
USE_SQLITE=false
DATABASE_URL=postgresql://user:password@host:5432/database
```

В локальной разработке (оставьте как есть):
```env
USE_SQLITE=true
```

### 3. Запустите миграции

```bash
# Для production (когда DATABASE_URL настроен)
npm run migrate
```

---

## 📦 Что было создано

### Новые файлы:

```
lib/
├── db.ts                    # SQLite (original, для dev)
├── db-postgres.ts           # PostgreSQL (новый, для prod)
└── db-adapter.ts            # Автоматический переключатель

migrations/
└── 001_initial_schema.sql   # SQL схема для PostgreSQL

scripts/
└── migrate.ts               # Скрипт миграции
```

### Обновлённые файлы:

- `package.json` - добавлены скрипты `migrate` и `db:init`
- `.env.example` - добавлен `DATABASE_URL`
- `.env.local` - добавлен `USE_SQLITE=true`

---

## 🔄 Как работает автоматическое переключение

`lib/db-adapter.ts` автоматически выбирает правильную БД:

```typescript
// Development (локально)
USE_SQLITE=true → использует SQLite

// Production (Vercel)
USE_SQLITE=false или DATABASE_URL установлен → использует PostgreSQL
```

---

## 📝 Использование в коде

### Раньше (SQLite only):

```typescript
import { createUser } from '@/lib/db';
```

### Теперь (адаптивно):

```typescript
// Автоматически выберет правильную БД
import { createUser } from '@/lib/db-adapter';
```

**Или используйте напрямую:**

```typescript
// Для разработки (SQLite)
import { createUser } from '@/lib/db';

// Для production (PostgreSQL)
import { createUser } from '@/lib/db-postgres';
```

---

## 🛠️ Команды

### Инициализация БД

```bash
# Создать все таблицы (автоматически при запуске)
npm run db:init
```

### Миграции

```bash
# Запустить все pending миграции
npm run migrate

# Проверить статус
npm run migrate -- --status
```

### Разработка

```bash
# Локальная разработка (SQLite)
USE_SQLITE=true npm run dev

# Тестирование с PostgreSQL локально
DATABASE_URL=postgresql://... npm run dev
```

---

## 🔧 Настройка Vercel

### Через Dashboard:

1. Зайдите в ваш проект на Vercel
2. Settings → Environment Variables
3. Добавьте:
   ```
   DATABASE_URL = postgresql://user:password@host:5432/database
   USE_SQLITE = false
   ```

### Через CLI:

```bash
# Добавить DATABASE_URL
vercel env add DATABASE_URL production

# Вставьте ваш PostgreSQL connection string

# Деплой
vercel --prod
```

---

## 📊 Миграция данных (если нужно)

Если у вас уже есть данные в SQLite и нужно перенести в PostgreSQL:

### 1. Экспорт из SQLite

```bash
sqlite3 data.db .dump > export.sql
```

### 2. Конвертация (вручную)

Отредактируйте `export.sql`:
- Замените `INTEGER` на `BOOLEAN` для is_premium
- Замените `TEXT` на `TIMESTAMP` для дат
- Замените `REAL` на `DECIMAL(10,2)` для amount

### 3. Импорт в PostgreSQL

```bash
psql $DATABASE_URL < export.sql
```

**Или используйте pgloader:**

```bash
brew install pgloader  # macOS
pgloader data.db postgresql://user:pass@host:5432/db
```

---

## ✅ Проверка миграции

### 1. Проверьте таблицы

```sql
-- Подключитесь к БД
psql $DATABASE_URL

-- Список таблиц
\dt

-- Должны видеть:
-- users
-- groups
-- group_members
-- expenses
-- schema_migrations
```

### 2. Тест подключения

```bash
# Запустите приложение
npm run dev

# Создайте тестового пользователя через API
curl http://localhost:3000/api/auth/telegram -X POST \
  -H "Content-Type: application/json" \
  -d '{"initData": "query_id=...&user=...&auth_date=...&hash=..."}'
```

**Note**: В production initData предоставляется автоматически Telegram WebApp SDK.
```

### 3. Проверьте логи

```bash
# При запуске должны увидеть:
📊 Database mode: PostgreSQL (Production)
✅ Using PostgreSQL database
```

---

## 🔍 Отличия SQLite vs PostgreSQL

| Фича | SQLite | PostgreSQL |
|------|--------|------------|
| **Тип данных** | REAL | DECIMAL(10,2) |
| **Boolean** | INTEGER (0/1) | BOOLEAN |
| **Dates** | TEXT (ISO string) | TIMESTAMP |
| **JSON** | TEXT | JSONB |
| **Синхронность** | Синхронные функции | Async/await |
| **Concurrency** | Ограничена | Полная поддержка |
| **Serverless** | ❌ Не работает | ✅ Работает |

---

## 🚨 Troubleshooting

### "Connection refused" ошибка

**Решение:**
- Проверьте DATABASE_URL (правильный host, порт, credentials)
- Убедитесь что БД запущена
- Проверьте firewall правила

### "relation does not exist"

**Решение:**
```bash
# Запустите миграции
npm run migrate
```

### "SSL connection required"

**Решение:**
Добавьте `?sslmode=require` к DATABASE_URL:
```
DATABASE_URL=postgresql://...?sslmode=require
```

### Медленные запросы

**Решение:**
- Убедитесь что indexes созданы (см. migration файл)
- Используйте `EXPLAIN ANALYZE` для анализа
- Добавьте connection pooling

---

## 📚 Дополнительные ресурсы

- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [@vercel/postgres Package](https://www.npmjs.com/package/@vercel/postgres)

---

## ✨ Best Practices

### 1. Connection Pooling

```typescript
// Vercel Postgres автоматически использует pooling
import { sql } from '@vercel/postgres';
```

### 2. Indexes

```sql
-- Добавлены в migration:
CREATE INDEX idx_users_telegram ON users(telegram_id);
CREATE INDEX idx_expenses_group ON expenses(group_id);
```

### 3. Backups

```bash
# Автоматические backups на Vercel Postgres
# Или настройте pg_dump cron:
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### 4. Monitoring

```typescript
// Добавьте health check endpoint
import { healthCheck } from '@/lib/db-postgres';

export async function GET() {
  const isHealthy = await healthCheck();
  return Response.json({ status: isHealthy ? 'ok' : 'error' });
}
```

---

## 🎉 Готово!

После выполнения этих шагов ваше приложение:

✅ Работает с PostgreSQL в production  
✅ Использует SQLite для локальной разработки  
✅ Автоматически переключается между БД  
✅ Готово к масштабированию  

**Следующий шаг:** Деплой на Vercel! 🚀

```bash
vercel --prod
```










