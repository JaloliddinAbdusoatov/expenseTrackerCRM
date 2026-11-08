/**
 * Static SEO landing pages (About-style content) in RU / EN / JA.
 * Outputs to public/seo/*.html — copied to dist on vite build.
 *
 *   SEO_BASE_URL=https://yourdomain.com node scripts/generate.js
 *   npm run generate:seo
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'seo');
const PUBLIC_ROOT = path.join(__dirname, '..', 'public');
const BASE_URL = (process.env.SEO_BASE_URL || 'https://emotionflow.uz').replace(/\/$/, '');

const STR = {
  en: {
    login: 'Login',
    signUp: 'Sign up',
    langs: 'Language',
    productTag: 'Expense Tracker',
    badge: 'Your smart expense tracker',
    heroTitlePrefix: 'Better money decisions with',
    heroTitleAccent: 'smooth focus and clarity',
    heroDescription:
      'EmotionFlow helps you manage spending, set realistic goals, and stay motivated with lightweight interactions and minimal distractions.',
    startFree: 'Start managing your money',
    haveAccount: 'I already have an account',
    getStartedTitle: 'Sign in or create an account',
    getStartedSubtitle: 'Choose an option to continue to the app.',
    highlight1Title: 'Smart expense tracking',
    highlight1Desc: 'Track income, expenses, and daily mood in one clean workflow.',
    highlight2Title: 'Secure and private',
    highlight2Desc: 'Your account data stays protected with secure authentication.',
    highlight3Title: 'Fast progress insights',
    highlight3Desc: 'Visual reports and goals help you improve your money habits.',
    problemTitle: 'Problem We Solve',
    problemItem1: 'Most users track spending but do not understand why overspending happens.',
    problemItem2: 'Traditional trackers show numbers only and miss behavioral context.',
    problemItem3: 'Budget control, motivation, and reporting are often scattered across tools.',
    solutionTitle: 'Our Solution',
    solutionItem1: 'Emotion + finance analytics reveals spending patterns behind the numbers.',
    solutionItem2: 'An AI assistant provides personalized insights, recommendations, and quick actions.',
    solutionItem3: 'Goals, challenges, and reports are unified in one connected platform.',
    featuresTitle: 'Key Product Capabilities',
    feature1Title: 'AI Chat Assistant',
    feature1Desc: 'Guides users with personalized financial insights and practical next steps.',
    feature2Title: 'Emotion Analytics',
    feature2Desc: 'Visualizes happy, neutral, and sad spending patterns over time.',
    feature3Title: 'Goals & Budgets',
    feature3Desc: 'Helps users set limits, track progress, and stay on plan.',
    feature4Title: 'Challenges & Achievements',
    feature4Desc: 'Boosts motivation through gamified milestones and leaderboards.',
    feature5Title: 'Smart Reports',
    feature5Desc: 'Exports clear PDF/Excel/HTML reports for analysis and sharing.',
    feature6Title: 'Multilingual Experience',
    feature6Desc: 'Supports multiple languages for broader accessibility.',
    stackTitle: 'Technology Stack',
    stackItem1: 'React + TypeScript + Vite',
    stackItem2: 'NestJS + TypeORM',
    stackItem3: 'SQLite (MVP), with a scalable database path',
    stackItem4: 'Gemini AI integration',
    stackItem5: 'Rate limiting, validation, and monitoring',
    roadmapTitle: 'Product Roadmap',
    roadmapItem1: 'Strengthen production-grade security and authorization.',
    roadmapItem2: 'Scale the data layer for larger concurrent user traffic.',
    roadmapItem3: 'Expand mobile-first workflows and notifications.',
    roadmapItem4: 'Introduce AI-based spending forecasts and savings plans.',
    impactTitle: 'Expected Impact',
    impactDescription:
      'EmotionFlow helps users move from passive tracking to active decision-making. By combining financial data with emotional context and AI guidance, the platform improves awareness, discipline, and long-term money habits for individuals and families.',
    metaTitle: 'EmotionFlow — smart expense & emotion tracker',
    metaDescription:
      'Manage spending, goals, and emotions in one place. Secure, multilingual, with AI insights. Sign up or log in.',
    jsonLdName: 'EmotionFlow',
    jsonLdDesc: 'Expense and emotion tracking with AI assistant, budgets, and reports.',
  },
  ru: {
    login: 'Войти',
    signUp: 'Регистрация',
    langs: 'Язык',
    productTag: 'Трекер расходов',
    badge: 'Ваш умный трекер расходов',
    heroTitlePrefix: 'Лучшие финансовые решения с',
    heroTitleAccent: 'фокусом и ясностью',
    heroDescription:
      'EmotionFlow помогает управлять тратами, ставить реалистичные цели и сохранять мотивацию без лишнего шума.',
    startFree: 'Начните управлять своими деньгами',
    haveAccount: 'У меня уже есть аккаунт',
    getStartedTitle: 'Вход или регистрация',
    getStartedSubtitle: 'Выберите действие, чтобы перейти в приложение.',
    highlight1Title: 'Умный учет расходов',
    highlight1Desc: 'Отслеживайте доходы, расходы и настроение в одном удобном потоке.',
    highlight2Title: 'Безопасность и приватность',
    highlight2Desc: 'Данные аккаунта защищены надежной аутентификацией.',
    highlight3Title: 'Быстрые инсайты прогресса',
    highlight3Desc: 'Визуальные отчеты и цели помогают улучшать финансовые привычки.',
    problemTitle: 'Проблема, которую мы решаем',
    problemItem1: 'Большинство пользователей ведут учет расходов, но не понимают причины перерасхода.',
    problemItem2: 'Обычные трекеры показывают только цифры и не дают поведенческого контекста.',
    problemItem3: 'Контроль бюджета, мотивация и отчеты часто разбросаны по разным инструментам.',
    solutionTitle: 'Наше решение',
    solutionItem1: 'Аналитика эмоций и финансов раскрывает реальные паттерны расходов.',
    solutionItem2: 'AI-помощник дает персональные инсайты, рекомендации и быстрые действия.',
    solutionItem3: 'Цели, челленджи и отчеты объединены в одной экосистеме.',
    featuresTitle: 'Ключевые возможности продукта',
    feature1Title: 'AI Чат-помощник',
    feature1Desc: 'Подсказывает персональные финансовые инсайты и практичные следующие шаги.',
    feature2Title: 'Аналитика эмоций',
    feature2Desc: 'Показывает динамику расходов по эмоциям: радость, нейтрально и грусть.',
    feature3Title: 'Цели и бюджеты',
    feature3Desc: 'Помогает задавать лимиты, отслеживать прогресс и держать фокус.',
    feature4Title: 'Челленджи и достижения',
    feature4Desc: 'Повышает мотивацию через геймификацию и таблицы лидеров.',
    feature5Title: 'Умные отчеты',
    feature5Desc: 'Экспортирует понятные PDF/Excel/HTML отчеты для анализа и обмена.',
    feature6Title: 'Мультиязычный интерфейс',
    feature6Desc: 'Поддерживает несколько языков для удобства разных пользователей.',
    stackTitle: 'Почему это готовый продукт',
    stackItem1: 'Стабильная работа в браузере и на телефоне (PWA).',
    stackItem2: 'Безопасная авторизация и защита аккаунта.',
    stackItem3: 'Быстрый интерфейс и удобная ежедневная работа.',
    stackItem4: 'AI-помощник для подсказок и анализа расходов.',
    stackItem5: 'Регулярные улучшения и поддержка пользователей.',
    roadmapTitle: 'Что доступно уже сейчас',
    roadmapItem1: 'Полный цикл: регистрация, вход, верификация и восстановление доступа.',
    roadmapItem2: 'Учёт расходов и доходов с эмоциями, категориями и фото.',
    roadmapItem3: 'Цели, бюджеты, отчёты и персональные инсайты.',
    roadmapItem4: 'Мультиязычность и адаптация под мобильные устройства.',
    impactTitle: 'Ожидаемый эффект',
    impactDescription:
      'EmotionFlow переводит пользователей от пассивного учета к активным финансовым решениям. Комбинация данных о расходах, эмоционального контекста и AI-подсказок повышает осознанность, дисциплину и долгосрочные финансовые привычки у пользователей и семей.',
    metaTitle: 'EmotionFlow — умный трекер расходов и эмоций',
    metaDescription:
      'Управляйте тратами, целями и эмоциями в одном месте. Безопасно, на нескольких языках, с AI. Регистрация и вход.',
    jsonLdName: 'EmotionFlow',
    jsonLdDesc: 'Учёт расходов и эмоций с AI-помощником, бюджетами и отчётами.',
  },
  ja: {
    login: 'ログイン',
    signUp: '新規登録',
    langs: '言語',
    productTag: '支出トラッカー',
    badge: 'あなたのスマートな経費トラッカー',
    heroTitlePrefix: 'より良いお金の判断を',
    heroTitleAccent: '集中と明確さで',
    heroDescription:
      'EmotionFlowは支出管理、現実的な目標設定、そして軽快で邪魔の少ない操作でモチベーション維持をサポートします。',
    startFree: 'お金の管理を始めましょう',
    haveAccount: 'すでにアカウントを持っています',
    getStartedTitle: 'ログインまたは新規登録',
    getStartedSubtitle: 'アプリに進むにはオプションを選択してください。',
    highlight1Title: 'スマートな支出管理',
    highlight1Desc: '収入・支出・日々の気分を一つの分かりやすい流れで記録できます。',
    highlight2Title: '安全性とプライバシー',
    highlight2Desc: 'アカウントデータは安全な認証で保護されます。',
    highlight3Title: '進捗を素早く可視化',
    highlight3Desc: 'ビジュアルレポートと目標管理で、お金の習慣を改善できます。',
    problemTitle: '解決する課題',
    problemItem1: '多くのユーザーは支出を記録しますが、浪費の原因までは把握できていません。',
    problemItem2: '従来の家計簿は数字中心で、行動の文脈が見えにくいです。',
    problemItem3: '予算管理、モチベーション、レポート機能が別々のツールに分散しがちです。',
    solutionTitle: '私たちの解決策',
    solutionItem1: '感情と財務の分析を組み合わせ、数字の背後にある支出パターンを可視化します。',
    solutionItem2: 'AIアシスタントが個別インサイト、提案、素早い操作を提供します。',
    solutionItem3: '目標、チャレンジ、レポートを1つのプラットフォームに統合します。',
    featuresTitle: '主要機能',
    feature1Title: 'AIチャットアシスタント',
    feature1Desc: '個別の金融インサイトと実行しやすい次の一手を提案します。',
    feature2Title: '感情分析',
    feature2Desc: '喜び・中立・悲しみによる支出傾向を時系列で可視化します。',
    feature3Title: '目標と予算',
    feature3Desc: '上限設定、進捗追跡、計画の継続をサポートします。',
    feature4Title: 'チャレンジと実績',
    feature4Desc: 'ゲーミフィケーションとランキングで継続的な動機づけを高めます。',
    feature5Title: 'スマートレポート',
    feature5Desc: '分析や共有に使えるPDF/Excel/HTMLレポートを出力します。',
    feature6Title: '多言語対応',
    feature6Desc: '複数言語をサポートし、より広いユーザーに使いやすくします。',
    stackTitle: '技術スタック',
    stackItem1: 'React + TypeScript + Vite',
    stackItem2: 'NestJS + TypeORM',
    stackItem3: 'SQLite（MVP）、拡張可能なDB構成',
    stackItem4: 'Gemini AI連携',
    stackItem5: 'レート制限、バリデーション、モニタリング',
    roadmapTitle: 'プロダクトロードマップ',
    roadmapItem1: '本番向けのセキュリティと認証を強化。',
    roadmapItem2: '同時接続ユーザー増加に備えてデータ層を拡張。',
    roadmapItem3: 'モバイル中心の体験と通知機能を拡充。',
    roadmapItem4: 'AIによる支出予測と節約プランを導入。',
    impactTitle: '期待される効果',
    impactDescription:
      'EmotionFlowは、受動的な記録から能動的な意思決定へとユーザーを導きます。財務データに感情の文脈とAIガイダンスを組み合わせることで、個人や家族の気づき、継続性、そして長期的な金銭習慣を高めます。',
    metaTitle: 'EmotionFlow — スマートな支出・感情トラッカー',
    metaDescription:
      '支出・目標・感情を一元管理。安全で多言語対応、AIインサイト。新規登録またはログイン。',
    jsonLdName: 'EmotionFlow',
    jsonLdDesc: 'AIアシスタント、予算、レポート付きの支出・感情トラッキング。',
  },
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Для сниппета Google + JSON-LD: сначала фраза из H1, затем основное описание. */
function seoSnippetDescription(t) {
  return `${t.heroTitlePrefix} ${t.heroTitleAccent}. ${t.metaDescription}`;
}

function seoJsonLdDescription(t) {
  return `${t.heroTitlePrefix} ${t.heroTitleAccent}. ${t.jsonLdDesc}`;
}

function langSwitch(current, t) {
  const links = [
    ['en', 'English'],
    ['ru', 'Русский'],
    ['ja', '日本語'],
  ]
    .map(
      ([code, label]) =>
        `<a href="${code === 'en' ? 'index.html' : code + '.html'}" rel="alternate" hreflang="${code}"${current === code ? ' aria-current="page"' : ''} style="color:${current === code ? '#a5b4fc' : '#94a3b8'};text-decoration:none;margin:0 .5rem;font-weight:${current === code ? '600' : '400'}">${label}</a>`,
    )
    .join('');
  return `<nav aria-label="${escapeHtml(t.langs)}" style="display:inline-flex;align-items:center;flex-wrap:wrap">${links}</nav>`;
}

function hreflangAlternates() {
  return `
    <link rel="alternate" hreflang="en" href="${BASE_URL}/seo/index.html" />
    <link rel="alternate" hreflang="ru" href="${BASE_URL}/seo/ru.html" />
    <link rel="alternate" hreflang="ja" href="${BASE_URL}/seo/ja.html" />
    <link rel="alternate" hreflang="x-default" href="${BASE_URL}/seo/index.html" />`;
}

function buildPage(langCode, fileName, t) {
  const canonical = `${BASE_URL}/seo/${fileName}`;
  const u = (href, text, style) =>
    `<a href="${href}" style="${style || ''}color:#c7d2fe;text-decoration:none;font-weight:600">${escapeHtml(text)}</a>`;

  const card =
    'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:1rem;padding:1.25rem;margin-bottom:1rem';
  const h3 = 'font-size:1.25rem;font-weight:600;margin:0 0 .75rem';
  const muted = 'color:#94a3b8;font-size:.925rem';
  const ul = 'margin:0;padding-left:1.1rem;' + muted;

  const highlights = [
    [t.highlight1Title, t.highlight1Desc],
    [t.highlight2Title, t.highlight2Desc],
    [t.highlight3Title, t.highlight3Desc],
  ];
  const problems = [t.problemItem1, t.problemItem2, t.problemItem3];
  const solutions = [t.solutionItem1, t.solutionItem2, t.solutionItem3];
  const features = [
    [t.feature1Title, t.feature1Desc],
    [t.feature2Title, t.feature2Desc],
    [t.feature3Title, t.feature3Desc],
    [t.feature4Title, t.feature4Desc],
    [t.feature5Title, t.feature5Desc],
    [t.feature6Title, t.feature6Desc],
  ];
  const stack = [t.stackItem1, t.stackItem2, t.stackItem3, t.stackItem4, t.stackItem5];
  const roadmap = [t.roadmapItem1, t.roadmapItem2, t.roadmapItem3, t.roadmapItem4];

  const snippetDesc = seoSnippetDescription(t);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: t.jsonLdName,
    description: seoJsonLdDescription(t),
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: BASE_URL,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  const ogImage = `${BASE_URL}/og-image.png`;

  return `<!DOCTYPE html>
<html lang="${langCode}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(t.metaTitle)}</title>
  <meta name="description" content="${escapeHtml(snippetDesc)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${canonical}" />
  ${hreflangAlternates()}
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:title" content="${escapeHtml(t.metaTitle)}" />
  <meta property="og:description" content="${escapeHtml(snippetDesc)}" />
  <meta property="og:image" content="${escapeXml(ogImage)}" />
  <meta property="og:locale" content="${langCode === 'ja' ? 'ja_JP' : langCode === 'ru' ? 'ru_RU' : 'en_US'}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(t.metaTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(snippetDesc)}" />
  <meta name="twitter:image" content="${escapeXml(ogImage)}" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>
    :root { --bg:#0a0f1a; --text:#f8fafc; --muted:#94a3b8; --primary:#818cf8; --border:rgba(255,255,255,.14); }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:var(--bg); color:var(--text); line-height:1.65; }
    .wrap { max-width:72rem; margin:0 auto; padding:2rem 1.25rem 4rem; position:relative; z-index:10; min-height:100vh; display:flex; flex-direction:column; }
    .topbar { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border); margin-bottom:2rem; }
    .brand { display:flex; align-items:center; gap:.75rem; font-weight:600; color:var(--text); text-decoration:none; }
    .brand-mark { width:2.25rem; height:2.25rem; border-radius:.75rem; border:1px solid rgba(129,140,248,.35); background:rgba(129,140,248,.12); display:flex; align-items:center; justify-content:center; }
    .btn-row { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
    .btn { display:inline-flex; align-items:center; justify-content:center; padding:.6rem 1.15rem; border-radius:9999px; text-decoration:none; font-weight:600; font-size:.9rem; border:none; cursor:pointer; }
    .btn-primary { background:linear-gradient(135deg,#6366f1,#7c3aed,#4f46e5); color:#fff; box-shadow:0 4px 20px rgba(79,70,229,.35); }
    .btn-ghost { background:rgba(255,255,255,.08); color:#e2e8f0; border:1px solid var(--border); }
    .badge { display:inline-flex; align-items:center; gap:.5rem; border:1px solid rgba(129,140,248,.4); color:var(--primary); padding:.35rem .85rem; border-radius:9999px; font-size:.875rem; margin-bottom:1rem; }
    .hero h1 { font-size:clamp(2rem,5vw,3.75rem); line-height:1.1; margin:0 0 1rem; font-weight:700; }
    .hero h1 .accent { background:linear-gradient(90deg,#a5b4fc,#818cf8,#c4b5fd); -webkit-background-clip:text; background-clip:text; color:transparent; }
    .hero p.lead { font-size:1.05rem; color:var(--muted); max-width:42rem; margin:0 0 1.5rem; }
    .cta-block { display:flex; flex-wrap:wrap; gap:.75rem; margin:1.5rem 0 2rem; }
    .panel { ${card} margin-top:1.5rem; }
    .panel h2 { ${h3}; margin-top:0 }
    .grid3 { display:grid; gap:1rem; }
    @media(min-width:768px){ .grid3 { grid-template-columns:repeat(3,1fr); } }
    .grid2 { display:grid; gap:1rem; }
    @media(min-width:768px){ .grid2 { grid-template-columns:repeat(2,1fr); } }
    .glow { pointer-events:none; position:fixed; border-radius:9999px; filter:blur(64px); opacity:.35; z-index:0; }
  </style>
</head>
<body>
  <div class="glow" style="width:18rem;height:18rem;background:rgba(99,102,241,.25);top:-4rem;left:2rem"></div>
  <div class="glow" style="width:20rem;height:20rem;background:rgba(167,139,250,.2);top:30%;right:-3rem"></div>

  <div class="wrap">
    <header class="topbar">
      <a class="brand" href="/">
        <span class="brand-mark" aria-hidden="true">💠</span>
        <span>EmotionFlow</span>
      </a>
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:.75rem">
        ${langSwitch(langCode, t)}
        <span style="color:var(--border);user-select:none">|</span>
        <div class="btn-row">
          <a class="btn btn-ghost" href="/auth">${escapeHtml(t.login)}</a>
          <a class="btn btn-primary" href="/signup">${escapeHtml(t.signUp)}</a>
        </div>
      </div>
    </header>

    <section class="hero">
      <p style="color:var(--muted);font-size:.9rem;margin:0 0 .25rem">${escapeHtml(t.productTag)}</p>
      <div class="badge">✦ ${escapeHtml(t.badge)}</div>
      <h1>${escapeHtml(t.heroTitlePrefix)} <span class="accent">${escapeHtml(t.heroTitleAccent)}</span></h1>
      <p class="lead">${escapeHtml(t.heroDescription)}</p>
      <div class="cta-block">
        <a class="btn btn-primary" href="/signup">${escapeHtml(t.startFree)} →</a>
        <a class="btn btn-ghost" href="/auth">${escapeHtml(t.haveAccount)}</a>
      </div>
    </section>

    <section class="panel" aria-labelledby="get-started">
      <h2 id="get-started">${escapeHtml(t.getStartedTitle)}</h2>
      <p style="${muted};margin:0 0 1rem">${escapeHtml(t.getStartedSubtitle)}</p>
      <div class="btn-row">
        <a class="btn btn-primary" href="/signup">${escapeHtml(t.signUp)}</a>
        <a class="btn btn-ghost" href="/auth">${escapeHtml(t.login)}</a>
      </div>
      <p style="${muted};font-size:.85rem;margin:1rem 0 0">App: ${u('/signup', t.signUp)} · ${u('/auth', t.login)}</p>
    </section>

    <div class="grid3" style="margin-top:1rem">
      ${highlights
        .map(
          ([title, desc]) => `
      <article style="${card}">
        <h3 style="${h3}">${escapeHtml(title)}</h3>
        <p style="${muted};margin:0">${escapeHtml(desc)}</p>
      </article>`,
        )
        .join('')}
    </div>

    <div class="grid2" style="margin-top:1rem">
      <article style="${card}">
        <h3 style="${h3}">🧠 ${escapeHtml(t.problemTitle)}</h3>
        <ul style="${ul}">${problems.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      </article>
      <article style="${card}">
        <h3 style="${h3}">⚡ ${escapeHtml(t.solutionTitle)}</h3>
        <ul style="${ul}">${solutions.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      </article>
    </div>

    <section style="margin-top:2rem">
      <h2 style="font-size:1.5rem;font-weight:600;margin:0 0 1rem">${escapeHtml(t.featuresTitle)}</h2>
      <div class="grid2">
        ${features
          .map(
            ([title, desc]) => `
        <article style="${card}">
          <h4 style="font-size:1.05rem;font-weight:600;margin:0 0 .5rem">${escapeHtml(title)}</h4>
          <p style="${muted};margin:0">${escapeHtml(desc)}</p>
        </article>`,
          )
          .join('')}
      </div>
    </section>

    <div class="grid2" style="margin-top:1rem">
      <article style="${card}">
        <h3 style="${h3}">${escapeHtml(t.stackTitle)}</h3>
        <ul style="${ul}">${stack.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      </article>
      <article style="${card}">
        <h3 style="${h3}">${escapeHtml(t.roadmapTitle)}</h3>
        <ul style="${ul}">${roadmap.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      </article>
    </div>

    <article style="${card};margin-top:1rem">
      <h3 style="${h3}">${escapeHtml(t.impactTitle)}</h3>
      <p style="${muted};margin:0">${escapeHtml(t.impactDescription)}</p>
    </article>

    <footer style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--border);${muted};font-size:.875rem;text-align:center">
      <p style="margin:0 0 .75rem">EmotionFlow · <a href="/" style="color:var(--primary)">SPA app</a></p>
      <p style="margin:0">${langSwitch(langCode, t)}</p>
    </footer>
  </div>
</body>
</html>`;
}

function writeSitemapAndRobots() {
  const paths = ['/', '/about', '/auth', '/signup'];
  const today = new Date().toISOString().slice(0, 10);
  const urlEntries = paths
    .map(
      (p) => `  <url>
    <loc>${escapeXml(`${BASE_URL}${p === '/' ? '/' : p}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p === '/' || p === '/about' ? '1.0' : '0.8'}</priority>
  </url>`,
    )
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
  fs.writeFileSync(path.join(PUBLIC_ROOT, 'sitemap.xml'), sitemap, 'utf8');
  console.log('Wrote public/sitemap.xml');

  const robots = `User-agent: *
Disallow: /admin

Sitemap: ${BASE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(PUBLIC_ROOT, 'robots.txt'), robots, 'utf8');
  console.log('Wrote public/robots.txt');
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pages = [
    ['en', 'index.html', STR.en],
    ['ru', 'ru.html', STR.ru],
    ['ja', 'ja.html', STR.ja],
  ];
  for (const [lang, file, t] of pages) {
    const html = buildPage(lang, file, t);
    fs.writeFileSync(path.join(OUT_DIR, file), html, 'utf8');
    console.log('Wrote', path.join('public/seo', file));
  }
  writeSitemapAndRobots();
  console.log('SEO_BASE_URL =', BASE_URL);
}

main();
