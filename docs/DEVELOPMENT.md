# 🛠️ Руководство разработчика SplitWise

Полное руководство по разработке, настройке и запуску проекта.

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Настройка проекта](#настройка-проекта)
- [Разработка](#разработка)
- [Архитектура](#архитектура)
- [Тестирование](#тестирование)
- [Деплой](#деплой)
- [Монетизация](#монетизация)

---

## 🚀 Быстрый старт

### Требования

- Node.js 20.x (используйте nvm)
- npm или yarn
- Telegram бот (создайте через @BotFather)

### Установка

```bash
# 1. Клонируйте репозиторий
cd /Users/chivhero/Desktop/projects/2

# 2. Установите зависимости
npm install

# 3. Скопируйте и настройте переменные окружения
cp .env.example .env.local
# Отредактируйте .env.local с вашими данными

# 4. Запустите dev сервер
npm run dev
```

Приложение запустится на `http://localhost:3000`

---

## ⚙️ Настройка проекта

### 1. Node.js версия

Проект требует Node.js 20.x (из-за better-sqlite3):

```bash
# Используйте nvm
nvm install 20
nvm use 20

# Или автоматически через .nvmrc
nvm use
```

### 2. Переменные окружения

Файл `.env.local`:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (SQLite для разработки)
# Для production используйте PostgreSQL
# DATABASE_URL=postgresql://user:pass@host:5432/db

# Environment
NODE_ENV=development
```

### 3. Telegram Bot настройка

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Настройте Web App URL:
   - `/mybots` → выберите бота → `Bot Settings` → `Menu Button`
   - Укажите URL приложения

Для локального тестирования используйте **ngrok**:

```bash
# Установка
brew install ngrok  # macOS

# Запуск туннеля
ngrok http 3000

# Скопируйте HTTPS URL и укажите в BotFather
```

---

## 💻 Разработка

### Структура проекта

```
/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── auth/         # Telegram авторизация
│   │   └── groups/       # CRUD для групп и расходов
│   ├── group/[id]/       # Детальная страница группы
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Главная страница
├── components/            # React компоненты
│   ├── TelegramProvider.tsx
│   ├── GroupList.tsx
│   ├── ExpenseList.tsx
│   └── ...
├── lib/                   # Бизнес-логика
│   ├── db.ts             # Database layer
│   ├── calculator.ts     # Алгоритм расчетов
│   └── telegram.ts       # Telegram helpers
├── types/                 # TypeScript types
└── tests/                 # Jest тесты
```

### Команды разработки

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Production запуск
npm start

# Линтинг
npm run lint

# Тестирование
npm test
npm run test:watch
npm run test:coverage
```

### API Endpoints

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/api/auth/telegram` | POST | Авторизация через Telegram |
| `/api/groups` | GET, POST | Список групп, создание |
| `/api/groups/[id]` | GET, PUT, DELETE | CRUD группы |
| `/api/groups/[id]/expenses` | GET, POST | Расходы группы |
| `/api/groups/[id]/summary` | GET | Сводка и расчеты |

---

## 🏗️ Архитектура

### Frontend

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** React hooks (no global state)
- **Platform:** Telegram Web App

### Backend

- **API:** Next.js API Routes
- **Database:** SQLite (dev), PostgreSQL (production)
- **ORM:** Native SQL queries (better-sqlite3)

### Алгоритм расчета долгов

Реализован в `lib/calculator.ts`:

1. **calculateBalances** - вычисляет балансы участников
2. **calculateSettlements** - минимизирует транзакции (greedy algorithm)
3. **getGroupSummary** - объединяет всю информацию

Пример:
```typescript
import { calculateBalances, calculateSettlements } from '@/lib/calculator';

const expenses = [...]; // массив расходов
const members = [...];  // массив участников

const balances = calculateBalances(expenses, members);
const settlements = calculateSettlements(balances);
// settlements содержит оптимальный список переводов
```

---

## 🧪 Тестирование

Проект использует **Jest + React Testing Library**.

### Запуск тестов

```bash
# Все тесты
npm test

# Watch режим
npm run test:watch

# С покрытием
npm run test:coverage
```

### Структура тестов

```
lib/__tests__/
  └── calculator.test.ts      # Unit тесты алгоритмов

components/__tests__/
  └── SettlementsView.test.tsx # Component тесты
```

### Написание тестов

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

Подробнее: см. `docs/TESTING.md`

---

## 🚀 Деплой

### Vercel (рекомендуется)

```bash
# 1. Установите Vercel CLI
npm i -g vercel

# 2. Авторизуйтесь
vercel login

# 3. Деплой
vercel

# 4. Production деплой
vercel --prod
```

### ⚠️ Важно для Production

**SQLite не работает на serverless!** Необходимо мигрировать на PostgreSQL:

1. Установите PostgreSQL (Vercel Postgres, Supabase, PlanetScale)
2. Обновите `lib/db.ts` для работы с PostgreSQL
3. Добавьте `DATABASE_URL` в environment variables на Vercel

### Environment Variables на Vercel

В настройках проекта добавьте:

```
TELEGRAM_BOT_TOKEN=your_token
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://...
```

---

## 💰 Монетизация

### Бизнес-модель: Freemium

**Free план:**
- До 3 групп
- До 50 расходов на группу
- Базовый функционал

**Premium ($2.99/мес):**
- Безлимитные группы
- Безлимитные расходы
- Экспорт отчетов (будущее)
- Приоритетная поддержка

### Цель: $1000/месяц

**Математика:**
- $2.99 × 334 Premium users = $998/мес
- При конверсии 5-10% нужно 3,500-6,500 активных пользователей

### Каналы привлечения

1. **Telegram каналы** (travel, tech, финансы)
2. **Reddit** (r/travel, r/digitalnomad)
3. **Product Hunt** запуск
4. **Content marketing** + SEO
5. **Реферальная программа**

### Реалистичный план

| Месяц | Пользователи | Premium | MRR |
|-------|-------------|---------|-----|
| 1-2 | 500 | 10 | $30 |
| 3-4 | 2,000 | 50 | $150 |
| 5-6 | 5,000 | 200 | $600 |
| **7+** | **6,500** | **334** | **$1,000** ✅ |

### Реализация Premium

Проверка лимитов в `app/api/groups/route.ts`:

```typescript
if (!user.isPremium) {
  const existingGroups = getUserGroups(user.id);
  if (existingGroups.length >= 3) {
    return NextResponse.json(
      { error: 'Free plan allows only 3 groups. Upgrade to Premium!' },
      { status: 403 }
    );
  }
}
```

---

## 📊 Метрики успеха

### Week 1
- 100+ регистраций
- 5+ Premium users
- < 5% crash rate

### Month 1
- 500+ пользователей
- 25+ Premium ($75 MRR)
- 30%+ Day 7 retention

### Month 6-7
- 5,000+ пользователей
- 350+ Premium ($1,046 MRR) ✅
- Product-market fit

---

## 🔒 Безопасность

### TODO: Критичные задачи

1. **Telegram auth verification**
   - Верификация `initData` через hash
   - Проверка подписи

2. **Rate limiting**
   - Ограничение запросов (10 req/sec per user)
   - Использовать Upstash Redis

3. **SQL injection**
   - ✅ Уже используются prepared statements

---

## 🐛 Troubleshooting

### База данных не создается

```bash
chmod 755 /Users/chivhero/Desktop/projects/2
```

### Telegram WebApp не инициализируется

- Открывайте через Telegram, не браузер
- Проверьте Web App URL в BotFather
- Используйте HTTPS (или ngrok для локального теста)

### Node.js несовместимость

```bash
# Используйте Node.js 20
nvm install 20
nvm use 20
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Полезные ссылки

- [Telegram Bot API](https://core.telegram.org/bots)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)
- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Deployment](https://vercel.com/docs)

---

**Готово! Начните разработку с `npm run dev`** 🚀










