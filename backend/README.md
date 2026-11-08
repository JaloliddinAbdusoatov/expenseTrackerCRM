# ExpanseTracker Backend (NestJS + PostgreSQL)

Backend для вашего приложения EmotionFlow / ExpanseTracker.

## Стек

- **NestJS** (REST API)
- **TypeORM + PostgreSQL** (база `emotionflow` по умолчанию)
- **Google Gemini API** (для AI чата с function calling / tools)
- Валидация через `class-validator`
- **@nestjs/config** для работы с `.env`
- **Helmet** для безопасности HTTP заголовков
- **Throttler** для rate limiting (защита от DDoS)
- **Compression** для оптимизации ответов
- Глобальная обработка ошибок и логирование

## Структура

- `src/app.module.ts` — корневой модуль
- `src/config/typeorm.config.ts` — подключение PostgreSQL / SQLite
- `src/users` — пользователи, аватарки
- `src/auth` — регистрация, логин, email-верификация, сброс пароля
- `src/chat` — разбор сообщений вроде `"курица 100"` в траты с эмоцией `medium`
- `src/challenges` — создание челленджей и подбор участников по близкой сумме

## Основные эндпоинты

Базовый префикс: `/api`.

### Auth

- `POST /api/auth/register` — регистрация  
  `body: { email, username, password }`  
  Возвращает `verificationToken` (вместо реальной отправки письма).

- `POST /api/auth/verify-email/:token` — верификация email.
- `POST /api/auth/login` — логин, возвращает `userId`.
- `POST /api/auth/request-password-reset` — запрос сброса пароля, возвращает `resetToken` для теста.
- `POST /api/auth/reset-password` — сброс пароля по токену.

### Chat (AI-powered with Tools)

- `POST /api/chat/message`  
  `body: { userId, message }`  
  Возвращает: `{ message: string, toolUsed?: string }`

**AI Tools:**
1. **`add_expense`** — автоматически распознает и добавляет расходы из сообщения
   - Примеры: `"курица 100"`, `"coffee 5"`, `"потратил 50 на обед"`
   - AI определяет описание, сумму и эмоцию

2. **`get_insights`** — персональный финансовый обзор с учетом дат
   - Анализирует траты за период (this_month, last_month, last_3_months, all_time)
   - Фокус: spending, categories, emotions, trends, savings
   - Возвращает статистику, топ категории, распределение эмоций

**Примеры запросов:**
- `"курица 100"` → добавит расход
- `"Show me my spending this month"` → вызовет `get_insights`
- `"How much did I spend on food?"` → анализ с фокусом на категории

**Примечание:** Если `GEMINI_API_KEY` не настроен, чат работает в простом режиме (базовый парсинг).

### Challenges

- `POST /api/challenges`  
  `body: { title, description?, targetAmount }` — создать челлендж.
- `POST /api/challenges/:id/participants`  
  `body: { userId, savedAmount? }` — добавить участника.
- `GET /api/challenges/match?targetAmount=1000` — вернуть челленджи с максимально близкой суммой.

### Health Check

- `GET /api/health` — проверка состояния сервера (uptime, memory, environment)

## Production Features

✅ **Безопасность:**
- Helmet для защиты HTTP заголовков
- Rate Limiting (100 запросов в минуту)
- CORS с проверкой окружения
- Глобальная обработка ошибок (скрывает детали в production)

✅ **Производительность:**
- Compression middleware (gzip)
- Оптимизированные запросы
- Структурированное логирование

✅ **Мониторинг:**
- Health check endpoint
- Request/response логирование
- Обработка ошибок с логированием

## Настройка

1. **Создайте `.env` файл** (см. `ENV_SETUP.md` или `env.example.txt`)
2. **Установите зависимости:**
```bash
npm install
```

3. **Обязательно настройте `GEMINI_API_KEY`** для работы AI чата:
   - Получите ключ на https://aistudio.google.com/apikey
   - Добавьте в `.env`: `GEMINI_API_KEY=AIza...`

## Запуск

### Docker (PostgreSQL + API)

Подходит для прод-сервера или локально без ручной установки Postgres.

```bash
cd ExpanseTrackerBackend
cp env.example.txt .env
# Отредактируйте .env: JWT_SECRET, DB_PASSWORD, FRONTEND_URL (URL вашего фронта), при необходимости GEMINI_API_KEY, SMTP
docker compose up -d --build
```

API: **http://localhost:3000/api** (порт меняется через `PORT` в `.env`). База: `postgres://…` внутри сети compose, с хоста — порт из `DB_PORT` (по умолчанию 5432).

Проверка: `curl http://localhost:3000/api/health`

Фронт собирается отдельно (**ExpanceTracker** → `npm run build` → выкладываете `dist/` на свой nginx); в сборке фронта `VITE_API_URL` должен указывать на этот API (например `https://ваш-домен/api`).

### Development (без Docker)

```bash
cd ExpanseTrackerBackend
npm install
npm run start:dev
```

Backend будет доступен на `http://localhost:3000/api`.

### Production

```bash
npm run build
NODE_ENV=production npm run start:prod
```

⚠️ **Важно для production:**
1. Установите `NODE_ENV=production` в `.env`
2. Настройте `FRONTEND_URL` на ваш production домен
3. Используйте сильный `JWT_SECRET`
4. Настройте реальные API ключи для Resend и Gemini

### Health Check

После запуска проверьте работоспособность:
```bash
curl http://localhost:3000/api/health
```

См. `ENV_SETUP.md` для подробной настройки переменных окружения.
См. `PRODUCTION_CHECKLIST.md` для полного чеклиста production готовности.