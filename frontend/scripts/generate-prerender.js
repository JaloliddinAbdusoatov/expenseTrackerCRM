/**
 * After `vite build`:
 * 1. `dist/index.html` (`/`) — внутрь #root вставляется статический HTML лендинга (как на About:
 *    «Лучшие финансовые решения с фокусом и ясностью»). React при монтировании заменяет содержимое.
 * 2. `dist/about/index.html` — тот же пререндер лендинга, что и `/` (удобный URL для SEO и шаринга).
 * 3. `dist/auth/index.html`, `dist/signup/index.html` — только SPA-шелл.
 *
 * Генерируется `/`, `/about`, `/auth`, `/signup`. Admin не трогаем.
 *
 * Тексты RU ниже должны совпадать с `STR.ru` в scripts/generate.js (hero, CTA).
 *
 *   node scripts/generate-prerender.js
 * Опционально: PRERENDER_ROUTES="/auth,/signup" — подмножество из /about, /auth, /signup (корень всегда).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PUBLIC_ROOT = path.join(__dirname, '..', 'public');
const INDEX = path.join(DIST, 'index.html');

/** Вложенные пути: только эти (корень — отдельно). */
const ALLOWED_NESTED = ['/about', '/auth', '/signup'];

/** Синхронизировать с scripts/generate.js → STR.ru */
const LANDING_RU = {
  productTag: 'Трекер расходов',
  badge: 'Ваш умный трекер расходов',
  heroTitlePrefix: 'Лучшие финансовые решения с',
  heroTitleAccent: 'фокусом и ясностью',
  heroDescription:
    'EmotionFlow помогает управлять тратами, ставить реалистичные цели и сохранять мотивацию без лишнего шума.',
  startFree: 'Начните управлять своими деньгами',
  haveAccount: 'У меня уже есть аккаунт',
  login: 'Войти',
  signUp: 'Регистрация',
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildLandingPreludeRu() {
  const t = LANDING_RU;
  const btnPrimary =
    'display:inline-flex;align-items:center;justify-content:center;padding:.65rem 1.2rem;border-radius:9999px;text-decoration:none;font-weight:600;font-size:.9rem;background:linear-gradient(135deg,#6366f1,#7c3aed,#4f46e5);color:#fff;box-shadow:0 4px 20px rgba(79,70,229,.35)';
  const btnGhost =
    'display:inline-flex;align-items:center;justify-content:center;padding:.65rem 1.2rem;border-radius:9999px;text-decoration:none;font-weight:600;font-size:.9rem;background:rgba(255,255,255,.08);color:#e2e8f0;border:1px solid rgba(255,255,255,.14)';
  return `
<article id="__landing-prerender" lang="ru" style="min-height:100vh;box-sizing:border-box;background:#0f172a;color:#f8fafc;padding:2rem 1.25rem 4rem;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.65">
  <p style="color:#94a3b8;font-size:.9rem;margin:0 0 .25rem">${escapeHtml(t.productTag)}</p>
  <p style="display:inline-flex;align-items:center;margin:0 0 1rem;border:1px solid rgba(165,180,252,.4);color:#a5b4fc;padding:.35rem .85rem;border-radius:9999px;font-size:.875rem">✦ ${escapeHtml(t.badge)}</p>
  <h1 style="font-size:clamp(2rem,5vw,3.75rem);line-height:1.1;margin:0 0 1rem;font-weight:700">${escapeHtml(t.heroTitlePrefix)} <span style="background:linear-gradient(90deg,#a5b4fc,#818cf8,#c4b5fd);-webkit-background-clip:text;background-clip:text;color:transparent">${escapeHtml(t.heroTitleAccent)}</span></h1>
  <p style="font-size:1.05rem;color:#94a3b8;max-width:42rem;margin:0 0 1.5rem">${escapeHtml(t.heroDescription)}</p>
  <div style="display:flex;flex-wrap:wrap;gap:.75rem;margin:0 0 2rem">
    <a href="/signup" style="${btnPrimary}">${escapeHtml(t.startFree)} →</a>
    <a href="/auth" style="${btnGhost}">${escapeHtml(t.haveAccount)}</a>
  </div>
  <p style="font-size:.8rem;color:#64748b;margin:0">Загрузка приложения… Если интерфейс не появился, откройте <a href="/signup" style="color:#a5b4fc">${escapeHtml(t.signUp)}</a> или <a href="/auth" style="color:#a5b4fc">${escapeHtml(t.login)}</a>.</p>
</article>`.trim();
}

function injectRootPrelude(html, prelude) {
  const needle = '<div id="root"></div>';
  if (!html.includes(needle)) {
    throw new Error('[generate-prerender] Expected `<div id="root"></div>` in dist/index.html');
  }
  return html.replace(needle, `<div id="root">${prelude}\n</div>`);
}

function parseNestedRoutes() {
  const raw = process.env.PRERENDER_ROUTES;
  if (!raw?.trim()) return [...ALLOWED_NESTED];
  const arr = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((r) => (r.startsWith('/') ? r : `/${r}`));
  const invalid = arr.filter((r) => !ALLOWED_NESTED.includes(r));
  if (invalid.length) {
    throw new Error(
      `[generate-prerender] Only nested routes allowed: ${ALLOWED_NESTED.join(', ')}. Invalid: ${invalid.join(', ')}`,
    );
  }
  return arr;
}

function assertNoAdmin(routes) {
  for (const r of routes) {
    if (r === '/admin' || r.startsWith('/admin/')) {
      throw new Error(`[generate-prerender] Refusing admin path "${r}".`);
    }
  }
}

/** Копируем robots/sitemap; Vite кладёт public/seo в dist — убираем, в деплой эти HTML не идут. */
function syncSeoFilesFromPublicToDist() {
  const names = ['robots.txt', 'sitemap.xml'];
  for (const name of names) {
    const from = path.join(PUBLIC_ROOT, name);
    const to = path.join(DIST, name);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, to);
      console.log(`[generate-prerender] Copied public/${name} → dist/${name}`);
    } else {
      console.warn(
        `[generate-prerender] Нет public/${name} — сначала запустите node scripts/generate.js`,
      );
    }
  }

  const seoDst = path.join(DIST, 'seo');
  if (fs.existsSync(seoDst)) {
    fs.rmSync(seoDst, { recursive: true, force: true });
    console.log('[generate-prerender] Removed dist/seo');
  }
}

function main() {
  if (!fs.existsSync(INDEX)) {
    console.error('[generate-prerender] dist/index.html missing — run `vite build` first.');
    process.exit(1);
  }

  const nestedRoutes = parseNestedRoutes();
  assertNoAdmin(nestedRoutes);

  const shell = fs.readFileSync(INDEX, 'utf8');
  const prelude = buildLandingPreludeRu();
  const rootHtml = injectRootPrelude(shell, prelude);
  fs.writeFileSync(INDEX, rootHtml, 'utf8');
  console.log('[generate-prerender] Injected static landing HTML into dist/index.html (/)');

  const written = [];
  for (const route of nestedRoutes) {
    const segment = route.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!segment) continue;
    const dir = path.join(DIST, segment);
    fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, 'index.html');
    const content = route === '/about' ? rootHtml : shell;
    fs.writeFileSync(out, content, 'utf8');
    written.push(route);
  }

  if (written.length) {
    console.log('[generate-prerender] Wrote nested HTML for:', written.join(', '));
  }

  syncSeoFilesFromPublicToDist();
}

main();
