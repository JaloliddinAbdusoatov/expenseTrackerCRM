# EmotionFlow CRM - React Vite Version

A modern expense tracking application with emotion tracking, built with React, Vite, and TypeScript.

## Features

- 📊 Financial Timeline - Track your expenses with a beautiful timeline view
- 😊 Emotion Tracking - Record how you feel about each transaction
- 🎯 Goals - Set and track financial goals
- 💬 AI Chat - Get financial advice through chat
- 🏆 Challenges - Participate in financial challenges
- 📈 Analytics - View spending insights and emotional patterns

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### Build

```bash
# Для продакшена задайте API и домен (sitemap / SEO в generate.js):
export SEO_BASE_URL=https://ваш-домен
export VITE_API_URL=https://ваш-домен/api
npm run build
```

Артефакт: папка **`dist/`** — заливайте **целиком** на свой nginx или хостинг. Внутри: `index.html`, каталоги `about/`, `auth/`, `signup/`, `assets/`, `robots.txt`, `sitemap.xml`, PWA (`sw.js`, `manifest.json`).

В nginx для этой статики: `root` → путь к `dist`, в `location /` — `try_files $uri $uri/index.html /index.html;`.

Бэкенд поднимайте отдельно: **ExpanseTrackerBackend** (`docker compose up -d`), в `.env` укажите **`FRONTEND_URL`** на URL вашего сайта.

### Preview локально

```bash
npm run preview
```

## Troubleshooting

If you see console errors about **Content Security Policy (CSP)**, **"unsupported MIME type ('text/html')"**, or **"listener indicated an asynchronous response"** (often from `tab.js` or `reports:1`), they are usually caused by a **browser extension**, not by this app. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for how to fix or ignore them.

## Project Structure

```
src/
├── components/        # React components
│   ├── ui/           # UI primitives (shadcn/ui)
│   └── ...           # Feature components
├── pages/            # Page components
├── lib/              # Utilities and data
├── hooks/            # Custom React hooks
└── App.tsx           # Main app component
```

## Features Overview

### Dashboard
View all your transactions in a timeline format with emotion indicators.

### Goals
Set financial goals and track your progress with visual progress bars.

### Emotions
Analyze your spending patterns by emotion with interactive charts.

### Chat
Get AI-powered financial advice through a chat interface.

### Challenges
Participate in community financial challenges and see leaderboards.

### Settings
Manage your profile and app preferences.

## Styling

The app uses a dark theme with atmospheric gradients and animations. The color scheme includes:
- Primary: Orange (#FF8C42)
- Accent: Purple (#B366FF)
- Emotions: Green (happy), Yellow (neutral), Red (sad)

## License

MIT
