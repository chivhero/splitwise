# 🚀 Деплой на Vercel

## Зачем Vercel?

✅ Постоянный HTTPS URL (не меняется)
✅ Быстрый деплой (1-2 минуты)
✅ Бесплатный для личных проектов
✅ Автоматические SSL сертификаты
✅ PostgreSQL поддержка (Vercel Postgres)

---

## 📝 Инструкция по деплою

### Шаг 1: Авторизация

```bash
# Откройте новый терминал в проекте
cd /Users/chivhero/Desktop/splitwise-telegram-backup-main

# Активируйте Node.js
source activate.sh

# Авторизуйтесь в Vercel
vercel login
```

Выберите метод входа (GitHub, GitLab, Bitbucket, Email)

### Шаг 2: Деплой

```bash
# Первый деплой (preview)
vercel

# Production деплой
vercel --prod
```

**Ответьте на вопросы:**
- Set up and deploy? → **Y**
- Which scope? → Выберите ваш аккаунт
- Link to existing project? → **N** (первый раз)
- What's your project's name? → `splitwise-telegram` (или свой)
- In which directory? → `.` (Enter)
- Want to modify settings? → **N**

### Шаг 3: Настройте переменные окружения

После деплоя:

1. Откройте: https://vercel.com/dashboard
2. Выберите проект `splitwise-telegram`
3. Settings → Environment Variables
4. Добавьте:

```env
TELEGRAM_BOT_TOKEN=8533199204:AAG4CZJAuw1vsfQ8RbOh6Nf-jIg-roUZAY8
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=SplitWisedbot
NEXT_PUBLIC_APP_URL=https://ваш-проект.vercel.app
```

5. Redeploy: Deployments → Latest → ⋮ → Redeploy

### Шаг 4: Обновите URL в BotFather

1. Откройте @BotFather в Telegram
2. `/mybots` → @SplitWisedbot → Bot Settings → Menu Button
3. Введите новый URL: `https://ваш-проект.vercel.app`
4. Готово! 🎉

---

## 📊 Для Production: PostgreSQL

⚠️ SQLite не работает на Vercel (serverless)

### Вариант 1: Vercel Postgres (рекомендуется)

```bash
# В Vercel Dashboard
Storage → Create Database → Postgres
```

Автоматически добавит переменные:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

### Вариант 2: Supabase (бесплатно)

1. Зарегистрируйтесь: https://supabase.com
2. Create Project → получите DATABASE_URL
3. Добавьте в Vercel Environment Variables

---

## 🎯 После деплоя

Вы получите URL вида: `https://splitwise-telegram-xxx.vercel.app`

✅ Постоянный (не меняется)
✅ HTTPS (работает в Telegram)
✅ Быстрый (edge network)
✅ Автообновление при git push (опционально)

---

## 💡 Быстрый деплой (одна команда)

```bash
source activate.sh && vercel --prod
```

---

## 🔧 Если что-то пошло не так

### Ошибка: "No framework detected"

**Решение**: 
```bash
# Убедитесь, что package.json существует
ls package.json

# Убедитесь в правильной директории
pwd
```

### Ошибка: "Database connection failed"

**Решение**: Используйте PostgreSQL для production (см. выше)

### Ошибка: "Build failed"

**Решение**:
```bash
# Проверьте локальный build
npm run build

# Если работает локально, проверьте логи на Vercel
```

---

**🚀 Готово к деплою!**

Запустите:
```bash
source activate.sh
vercel login
vercel --prod
```

