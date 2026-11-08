# Environment Setup

## Backend (.env file)

Создайте файл `.env` в корне `ExpanseTrackerBackend/` на основе `env.example.txt`:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=emotionflow

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Email Service (SMTP) - ОБЯЗАТЕЛЬНО для отправки email!
# Настройте SMTP для отправки email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@example.com

# Google Gemini API (for AI chat) - ОБЯЗАТЕЛЬНО для работы AI чата!
GEMINI_API_KEY=your-gemini-api-key-here

# Frontend URL (for CORS and email links)
# IMPORTANT: Change this to your actual frontend URL!
# This URL will be used in verification and password reset email links
# Examples:
# - Development: http://localhost:8080
#Local network: http://192.168.1.100:8080 (use your computer's IP)
# - Production: https://yourdomain.com
FRONTEND_URL=http://0.0.0.0:8080
```

## Frontend (.env file)

Создайте файл `.env` в корне `ExpanceTracker/` на основе `env.example.txt`:

```bash
# API Backend URL
VITE_API_URL=http://localhost:3000/api
```

## Как настроить SMTP для отправки email

### Для Gmail / Google Workspace (рекомендуется):

1. **Включите двухфакторную аутентификацию** в вашем Google аккаунте
   - https://myaccount.google.com/security

2. **Создайте App Password:**
   - Зайдите на https://myaccount.google.com/apppasswords
   - Выберите "Почта" и "Другое (название)"
   - Введите название (например, "ExpanseTracker")
   - Нажмите "Создать"
   - **Скопируйте App Password** (16 символов с пробелами, например: "abcd efgh ijkl mnop")

3. **Настройте в `.env`:**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@jdu.uz
   EMAIL_PASS=your-app-password (можно с пробелами или без)
   EMAIL_FROM=your-email@jdu.uz
   ```

**Важно:** 
- Используйте **App Password**, а не обычный пароль!
- App Password можно вставлять с пробелами или без - система автоматически уберет пробелы
- Без настроек SMTP письма отправляться НЕ будут (будет только лог в консоль)
- Email будет отправляться автоматически при регистрации и запросе сброса пароля

### Для других провайдеров:

- **Yahoo Mail:** `smtp.mail.yahoo.com:587`
- **Outlook/Hotmail:** `smtp-mail.outlook.com:587`
- **Другие:** Проверьте SMTP настройки у вашего email провайдера

## Как получить Google Gemini API Key

1. Зайдите на https://aistudio.google.com/apikey
2. Войдите или создайте аккаунт Google
3. Нажмите **"Create API Key"** или **"Get API key"**
4. Выберите проект (или создайте новый)
5. Скопируйте API ключ (он начинается с `AIza...`)
6. Вставьте в `.env`: `GEMINI_API_KEY=AIza...`

**Важно:** 
- Без `GEMINI_API_KEY` чат будет работать в простом режиме (простой парсинг типа "курица 100"), но не будет использовать AI с tools для insights
- Gemini API имеет бесплатный тариф с щедрыми лимитами
- Используется модель `gemini-1.5-flash` (быстрая и эффективная)
