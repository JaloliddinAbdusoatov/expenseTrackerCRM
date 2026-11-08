import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = path.resolve(__dirname, 'dist');
const TEMPLATE_PATH = path.resolve(DIST_DIR, 'index.html');
const SITE_URL = (process.env.SITE_URL || 'https://hitechrobotics.uz').replace(/\/+$/, '');

const NOINDEX_PATHS = new Set([
    'privacy-policy',
    'terms-of-use',
    'sales-policy',
    'legal',
]);

function toAbsUrl(url) {
    if (!url || typeof url !== 'string') return null;
    const t = url.trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t)) return t;
    return t.startsWith('/') ? `${SITE_URL}${t}` : `${SITE_URL}/${t}`;
}

function toPublicAbsUrl(url) {
    // If backend returns http://localhost:8000/media/... rewrite to SITE_URL/media/...
    const t = toAbsUrl(url);
    if (!t) return null;
    try {
        const u = new URL(t);
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === 'backend') {
            return `${SITE_URL}${u.pathname}`;
        }
        return t;
    } catch {
        return t;
    }
}

// Load .env for API URL
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '.env');
        const raw = readFileSync(envPath, 'utf-8');
        raw.split('\n').forEach((line) => {
            const m = line.match(/^([^#=]+)=(.*)$/);
            if (m) {
                const key = m[1].trim();
                let val = m[2].trim().replace(/^["']|["']$/g, '');
                if (!process.env[key]) process.env[key] = val;
            }
        });
    } catch (_) {}
}
loadEnv();

const API_BASE_URL = process.env.VITE_API_URL ? `${process.env.VITE_API_URL}/api` : null;

// Load data from API or Fallback
async function loadAllData() {
    let categories = [];
    let products = [];
    let insights = [];
    let legalPages = [];

    if (API_BASE_URL) {
        try {
            const fetchAll = async (endpoint) => {
                const out = [];
                let url = `${API_BASE_URL}/${endpoint}`;
                while (url) {
                    const res = await axios.get(url, { timeout: 10000 });
                    const data = res.data;
                    const list = Array.isArray(data) ? data : (data.results || []);
                    out.push(...list);
                    url = data.next && data.next.startsWith('http') ? data.next : null;
                }
                return out;
            };

            const [catList, prodList] = await Promise.all([
                fetchAll('categories/'),
                fetchAll('products/')
            ]);
            
            categories = catList;
            products = prodList;

            // Insights listing
            try {
                const insightsRes = await axios.get(`${API_BASE_URL}/insights/`, {
                    timeout: 10000,
                    params: { page: 1, page_size: 500 },
                });
                const payload = insightsRes.data || {};
                insights = Array.isArray(payload) ? payload : (payload.insights || payload.results || []);
            } catch (e) {}

            // Fetch footer for legal pages
            try {
                const footerRes = await axios.get(`${API_BASE_URL}/contact-info/`, { timeout: 5000 });
                if (footerRes.data && footerRes.data.links) {
                    legalPages = footerRes.data.links.map(link => ({
                        path: link.to.startsWith('/') ? link.to.slice(1) : link.to,
                        title: link.text,
                        description: `Legal document: ${link.text}`
                    }));
                }
            } catch (e) {}

            console.log(`📡 Fetched ${categories.length} categories, ${products.length} products, ${insights.length} insights, and ${legalPages.length} legal pages`);
        } catch (error) {
            console.warn('⚠️ API fetch failed, using local fallback files...');
        }
    }

    if (categories.length === 0 || products.length === 0) {
        try {
            const categoriesPath = path.resolve(__dirname, 'copiedJsons', 'categories.json');
            const productsPath = path.resolve(__dirname, 'copiedJsons', 'products.json');
            const categoriesData = JSON.parse(readFileSync(categoriesPath, 'utf-8'));
            const productsData = JSON.parse(readFileSync(productsPath, 'utf-8'));
            categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData.results || []);
            products = Array.isArray(productsData) ? productsData : (productsData.results || []);
            
            // Fallback legal pages
            legalPages = [
                { path: 'legal-privacy-policy', title: 'Privacy Policy', description: 'Privacy Policy of Hitech Robotics' },
                { path: 'legal-terms-of-use', title: 'Terms of Use', description: 'Terms of Use of Hitech Robotics' }
            ];
            console.log(`📦 Loaded ${categories.length} categories and ${products.length} products from local JSON`);
        } catch (e) {
            console.error('❌ Failed to load any data');
        }
    }

    return { categories, products, insights, legalPages };
}

function generateSchema(type, data) {
    if (type === 'Organization') {
        return {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Hitech Robotics",
            "url": SITE_URL,
            "logo": `${SITE_URL}/assets/robotImg/HitechRoboticsLogo.png`,
            "sameAs": [
                "https://www.facebook.com/hitechroboticsuz",
                "https://www.instagram.com/hitechroboticsuz"
            ]
        };
    }
    if (type === 'Product') {
        const images = [toPublicAbsUrl(data.product_image)];
        if (data.highlights && data.highlights.slides) {
            data.highlights.slides.forEach(slide => {
                if (slide.image) images.push(toPublicAbsUrl(slide.image));
            });
        }

        const catSlug = data.product_category_slug || data.category_slug;
        const productUrl = `${SITE_URL}/${catSlug}/${data.slug}`;

        const price = data.product_price != null ? Number(data.product_price) : null;
        const offers = {
            "@type": "Offer",
            "url": productUrl,
            "availability": "https://schema.org/InStock"
        };
        if (price !== null && !Number.isNaN(price)) {
            offers.price = price;
            offers.priceCurrency = data.currency || "USD";
        }

        return {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": data.product_name,
            "description": data.product_description,
            "image": images.filter(Boolean),
            "sku": `HR-${data.id || data.slug}`,
            "url": productUrl,
            "brand": { "@type": "Brand", "name": "Hitech Robotics" },
            "offers": offers
        };
    }
    return null;
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderTextToHtml(text) {
    const t = String(text ?? '').trim();
    if (!t) return '';
    // Keep it simple: paragraphs split by blank lines.
    return t
        .split(/\n{2,}/g)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
        .join('\n');
}

function renderInsightStaticContent(insight) {
    if (!insight) return '';
    const title = escapeHtml(insight.title || 'Insight');
    const excerpt = insight.excerpt ? `<p>${escapeHtml(insight.excerpt)}</p>` : '';
    const published = insight.published_at ? `<p><small>${escapeHtml(insight.published_at)}</small></p>` : '';

    const sections = Array.isArray(insight.body_sections) ? insight.body_sections : [];
    let bodyHtml = '';
    if (sections.length) {
        bodyHtml = sections
            .map((s) => {
                if (s?.type === 'text' && s.content) return `<p>${escapeHtml(s.content).replace(/\n/g, '<br/>')}</p>`;
                if (s?.type === 'image' && s.url) return `<img src="${escapeHtml(s.url)}" alt="${title}" />`;
                return '';
            })
            .filter(Boolean)
            .join('\n');
    } else if (insight.body) {
        bodyHtml = renderTextToHtml(insight.body);
    }

    const imgAbs = toPublicAbsUrl(insight.image_display_url);
    const img = imgAbs
        ? `<img src="${escapeHtml(imgAbs)}" alt="${title}" />`
        : '';

    return `
    <main class="seo-static">
      <style>
        .seo-static{max-width:900px;margin:0 auto;padding:24px 16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
        .seo-static h1{font-size:34px;line-height:1.15;margin:0 0 12px;color:inherit}
        .seo-static p{font-size:16px;line-height:1.7;margin:10px 0;color:inherit}
        .seo-static img{max-width:100%;height:auto;border-radius:14px;margin:14px 0;border:1px solid rgba(255,255,255,.12)}
        .seo-static small{opacity:.75}
      </style>
      <article>
        <header>
          <h1>${title}</h1>
          ${published}
          ${excerpt}
          ${img}
        </header>
        <section>
          ${bodyHtml}
        </section>
      </article>
    </main>
  `.trim();
}

function renderInsightsListingStaticContent(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return '';
    const cards = list
        .slice(0, 30)
        .map((i) => {
            const slug = escapeHtml(i.slug || '');
            const title = escapeHtml(i.title || i.slug || 'Insight');
            const excerpt = i.excerpt ? escapeHtml(i.excerpt) : '';
            const img = toPublicAbsUrl(i.image_display_url);
            return `
        <article style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,.10)">
          <h2 style="font-size:20px;margin:0 0 6px"><a href="/insights/${slug}">${title}</a></h2>
          ${img ? `<img src="${escapeHtml(img)}" alt="${title}" style="max-width:100%;height:auto;border-radius:12px;margin:10px 0;border:1px solid rgba(255,255,255,.12)"/>` : ''}
          ${excerpt ? `<p style="margin:0;opacity:.9">${excerpt}</p>` : ''}
        </article>
      `.trim();
        })
        .join('\n');

    return `
    <main class="seo-static">
      <style>
        .seo-static{max-width:900px;margin:0 auto;padding:24px 16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
        .seo-static a{color:inherit}
      </style>
      <header>
        <h1 style="font-size:34px;line-height:1.15;margin:0 0 12px">Industry Insights</h1>
        <p style="margin:0 0 16px;opacity:.85">Expert analysis and updates on robotics, automation, and industrial innovation.</p>
      </header>
      <section>
        ${cards}
      </section>
    </main>
  `.trim();
}

function renderProductStaticContent(product) {
    if (!product) return '';
    const title = escapeHtml(product.product_name || product.slug || 'Product');
    const desc = product.product_description ? `<p>${escapeHtml(product.product_description)}</p>` : '';
    const imgAbs = toPublicAbsUrl(product.product_image);
    const img = imgAbs ? `<img src="${escapeHtml(imgAbs)}" alt="${title}" />` : '';
    const price = product.product_price != null ? `<p><strong>Price:</strong> ${escapeHtml(product.product_price)}</p>` : '';
    const specs = Array.isArray(product.specs) && product.specs.length
        ? `<h2>Specifications</h2><ul>${product.specs.map(s => `<li><strong>${escapeHtml(s.label)}</strong>: ${escapeHtml(s.value)}</li>`).join('')}</ul>`
        : '';
    return `
    <main class="seo-static">
      <style>
        .seo-static{max-width:1100px;margin:0 auto;padding:24px 16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
        .seo-static h1{font-size:32px;line-height:1.15;margin:0 0 12px}
        .seo-static p{font-size:16px;line-height:1.7;margin:10px 0}
        .seo-static img{max-width:100%;height:auto;border-radius:14px;margin:14px 0;border:1px solid rgba(255,255,255,.12)}
        .seo-static ul{padding-left:18px}
        .seo-static li{margin:6px 0}
      </style>
      <article>
        <header>
          <h1>${title}</h1>
          ${img}
          ${desc}
          ${price}
        </header>
        <section>
          ${specs}
        </section>
      </article>
    </main>
  `.trim();
}

function injectMetadata(html, metadata) {
    const { title, description, image, url, schema, noIndex = false, includeCanonical = true } = metadata;
    let result = html;

    // 1. Удаляем существующие мета-теги (включая charset)
    const tagsToRemove = [
        /<meta[^>]*?charset=["'].*?["'][^>]*?>/gis,
        /<title>.*?<\/title>/gis,
        /<meta[^>]*?name=["']description["'][^>]*?>/gis,
        /<meta[^>]*?property=["']og:title["'][^>]*?>/gis,
        /<meta[^>]*?property=["']og:description["'][^>]*?>/gis,
        /<meta[^>]*?property=["']og:image["'][^>]*?>/gis,
        /<meta[^>]*?property=["']og:url["'][^>]*?>/gis,
        /<meta[^>]*?property=["']og:type["'][^>]*?>/gis,
        /<meta[^>]*?name=["']twitter:title["'][^>]*?>/gis,
        /<meta[^>]*?name=["']twitter:description["'][^>]*?>/gis,
        /<meta[^>]*?name=["']twitter:image["'][^>]*?>/gis,
        /<meta[^>]*?name=["']twitter:card["'][^>]*?>/gis,
        /<meta[^>]*?name=["']twitter:url["'][^>]*?>/gis,
        /<link[^>]*?rel=["']canonical["'][^>]*?>/gis
    ];

    tagsToRemove.forEach(regex => {
        result = result.replace(regex, '');
    });

    // 2. Формируем новый блок в строгом порядке
    const fullTitle = `${title} | Hitech Robotics`;
    const finalImage = toPublicAbsUrl(image) || `${SITE_URL}/assets/robotImg/HitechRoboticsLogo.png`;

    const metaTags = [
        `<meta charset="UTF-8">`, // 1. Charset всегда первый
        `<title>${fullTitle}</title>`, // 2. Title второй
        `<meta name="description" content="${description.replace(/"/g, '&quot;')}">`, // 3. Description третий
        ...(includeCanonical ? [`<link rel="canonical" href="${url}">`] : []),
        ...(noIndex ? [`<meta name="robots" content="noindex, follow">`] : [`<meta name="robots" content="index, follow">`]),
        `<!-- SEO Meta Tags -->`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:url" content="${url}">`,
        `<meta property="og:title" content="${fullTitle}">`,
        `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}">`,
        `<meta property="og:image" content="${finalImage}">`,
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:url" content="${url}">`,
        `<meta name="twitter:title" content="${fullTitle}">`,
        `<meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">`,
        `<meta name="twitter:image" content="${finalImage}">`
    ];

    if (schema) {
        metaTags.push(`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
    }

    // 3. Вставляем всё в самое начало <head>
    return result.replace('<head>', `<head>\n    ${metaTags.join('\n    ')}`);
}

function parseRequestedPaths() {
    const arg = process.argv.find((a) => a.startsWith('--paths='));
    if (!arg) return null;
    const raw = arg.slice('--paths='.length);
    if (!raw.trim()) return null;
    return new Set(
        raw
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => p.replace(/^\/+/, '').replace(/\/+$/, ''))
    );
}

async function fetchInsightsListing() {
    if (!API_BASE_URL) return [];
    const res = await axios.get(`${API_BASE_URL}/insights/`, {
        timeout: 10000,
        params: { page: 1, page_size: 500 },
    });
    const payload = res.data || {};
    return Array.isArray(payload) ? payload : (payload.insights || payload.results || []);
}

async function fetchInsightDetail(slug) {
    if (!API_BASE_URL) return null;
    const res = await axios.get(`${API_BASE_URL}/insights/${slug}/`, { timeout: 10000 });
    return res.data || null;
}

async function fetchProductDetail(slug) {
    if (!API_BASE_URL) return null;
    const res = await axios.get(`${API_BASE_URL}/products/${slug}/`, { timeout: 10000 });
    return res.data || null;
}

async function fetchCategoryLanding(slug) {
    if (!API_BASE_URL) return null;
    const res = await axios.get(`${API_BASE_URL}/products/categories/${slug}/`, { timeout: 10000 });
    return res.data || null;
}

async function prerender() {
    if (!existsSync(TEMPLATE_PATH)) {
        console.error('❌ dist/index.html not found.');
        return;
    }

    const template = readFileSync(TEMPLATE_PATH, 'utf-8');
    const only = parseRequestedPaths();

    // If this is a targeted regeneration, avoid fetching full categories/products lists.
    let categories = [];
    let products = [];
    let insights = [];
    let legalPages = [];

    if (!only) {
        const all = await loadAllData();
        categories = all.categories;
        products = all.products;
        insights = all.insights;
        legalPages = all.legalPages;
    } else {
        const needsInsights = [...only].some((p) => p === 'insights' || p.startsWith('insights/'));
        if (needsInsights) {
            insights = await fetchInsightsListing().catch(() => []);
        }
    }

    const pages = [
        { path: '', title: 'Future of Robotics', description: 'Advanced AI robots in Uzbekistan. Humanoids and quadruped robots for rent and sale.', schema: generateSchema('Organization') },
        { path: 'about', title: 'About Us', description: 'Learn about Hitech Robotics mission to bring advanced automation to Central Asia.' },
        { path: 'contact', title: 'Contact Us', description: 'Get in touch with Hitech Robotics for robot rentals, sales, and support.' },
        { path: 'partners', title: 'Our Partners', description: 'Technology and industry partners of Hitech Robotics in Central Asia.' },
        { path: 'insights', title: 'Industry Insights', description: 'Expert analysis and updates on robotics, automation, and industrial innovation.' },
        { path: 'showrooms', title: 'Our Showrooms', description: 'Visit Hitech Robotics showrooms in Tashkent and other cities to see our robots in action.' },
        { path: 'privacy-policy', title: 'Privacy Policy', description: 'Hitech Robotics Privacy Policy - how we handle and protect your personal data.' },
        { path: 'terms-of-use', title: 'Terms of Use', description: 'Hitech Robotics Website Terms of Use and service conditions.' },
        { path: 'sales-policy', title: 'Sales Policy', description: 'Hitech Robotics Sales and Refund Policy for robotics equipment.' },
        { path: 'legal', title: 'Legal Information', description: 'Legal basis and regulatory information for Hitech Robotics operations in Uzbekistan.' }
    ];


    legalPages.forEach(lp => {  
         pages.push(lp); 
         }); 

    // Remove old dynamic legalPages detection since we've added them statically with better metadata
    // categories.forEach...
categories.forEach(cat => {  
        pages.push({
            path: cat.slug,
            title: cat.name_en || cat.name || cat.slug,
            description: `Explore ${cat.name_en || cat.slug} robots.`
        });
    });

    products.forEach(prod => {
        const catSlug = prod.product_category_slug || prod.category_slug;
        if (catSlug && prod.slug) {
            pages.push({
                path: `${catSlug}/${prod.slug}`,
                title: prod.product_name,
                description: prod.product_description,
                image: prod.product_image,
                schema: generateSchema('Product', prod)
            });
        }
    });

    // Insight detail pages
    (insights || []).forEach((it) => {
        if (it?.slug) {
            pages.push({
                path: `insights/${it.slug}`,
                title: it.title || it.slug,
                description: it.excerpt || 'Industry insight by Hitech Robotics.',
                image: toPublicAbsUrl(it.image_display_url),
                schema: {
                    "@context": "https://schema.org",
                    "@type": "Article",
                    "headline": it.title || it.slug,
                    "datePublished": it.published_at || undefined,
                    "image": it.image_display_url ? [toPublicAbsUrl(it.image_display_url)] : undefined,
                    "author": { "@type": "Organization", "name": "Hitech Robotics" },
                    "publisher": { "@type": "Organization", "name": "Hitech Robotics" },
                    "mainEntityOfPage": `${SITE_URL}/insights/${it.slug}`,
                }
            });
        }
    });

    // If targeted regeneration, ensure requested paths exist in pages list even without global lists.
    if (only) {
        const existing = new Set(pages.map((p) => String(p.path || '').replace(/^\/+|\/+$/g, '')));
        for (const p of only) {
            if (existing.has(p)) continue;

            // Insights detail
            if (p.startsWith('insights/')) {
                const slug = p.split('/')[1];
                pages.push({
                    path: p,
                    title: slug || 'Insight',
                    description: 'Industry insight by Hitech Robotics.',
                });
                existing.add(p);
                continue;
            }

            // Product detail: <category>/<product>
            if (p.includes('/')) {
                const [catSlug, prodSlug] = p.split('/');
                let prod = null;
                if (prodSlug) prod = await fetchProductDetail(prodSlug).catch(() => null);
                pages.push({
                    path: p,
                    title: prod?.product_name || prodSlug || p,
                    description: prod?.product_description || `Explore ${prod?.product_name || prodSlug || 'robot'} by Hitech Robotics.`,
                    image: toPublicAbsUrl(prod?.product_image),
                    schema: prod ? generateSchema('Product', { ...prod, slug: prodSlug, product_category_slug: catSlug }) : null,
                });
                existing.add(p);
                continue;
            }

            // Category landing: <category>
            {
                const catSlug = p;
                const landing = await fetchCategoryLanding(catSlug).catch(() => null);
                const label = landing?.deviceLandingData?.[catSlug]?.label || catSlug;
                pages.push({
                    path: p,
                    title: label,
                    description: `Explore ${label} robots.`,
                });
                existing.add(p);
            }
        }
    }

    const finalPages = only ? pages.filter((p) => only.has(String(p.path || '').replace(/^\/+|\/+$/g, ''))) : pages;

    console.log(`🚀 Pre-rendering ${finalPages.length} pages${only ? ' (filtered)' : ''}...`);

    for (const page of finalPages) {
        const pageDir = path.join(DIST_DIR, page.path);
        if (!existsSync(pageDir)) mkdirSync(pageDir, { recursive: true });

        // Generate additional content for products to boost SEO
        let additionalContent = '';
        if (page.schema && page.schema['@type'] === 'Product') {
            const productSlug = page.path.split('/').pop();
            // Prefer detail API to get specs/text if possible
            let product = null;
            if (productSlug) {
                product = await fetchProductDetail(productSlug).catch(() => null);
            }
            if (!product && products.length) {
                product = products.find(p => p.slug === productSlug) || null;
            }
            if (product) {
                // Visible static content inside root (will be replaced by React after load)
                additionalContent += renderProductStaticContent(product);

                // 1. Related Products (Internal Linking)
                const related = products.length
                    ? products
                        .filter(p => (p.product_category_slug === product.product_category_slug || p.category_slug === product.category_slug) && p.slug !== product.slug)
                        .slice(0, 5)
                    : [];
                
                if (related.length > 0) {
                    additionalContent += `<div class="seo-related-products" style="margin-top: 40px;">
                        <h2>Related ${product.product_category_name || 'Robots'}</h2>
                        <ul>
                            ${related.map(r => `<li><a href="${SITE_URL}/${r.product_category_slug || r.category_slug}/${r.slug}">${r.product_name}</a></li>`).join('')}
                        </ul>
                    </div>`;
                }

                // 2. Expanded Specs (Content Length) - transforming array to sentences
                if (product.specs && product.specs.length > 0) {
                    const specsSentence = product.specs.map(s => `${s.label.toLowerCase()} is ${s.value}`).join(', ');
                    additionalContent += `<div class="seo-tech-specs" style="margin-top: 20px;">
                        <h3>Technical Specifications and Features Deep Dive</h3>
                        <p>${product.product_name} represents the cutting edge in robotics. 
                           In terms of performance, its ${specsSentence}. 
                           These technical capabilities make ${product.product_name} a perfect choice for 
                           industrial, educational, and research projects where reliability and advanced AI are required.</p>
                        <p>Our company Hitech Robotics provides full support and maintenance for ${product.product_name} in Uzbekistan.</p>
                    </div>`;
                }
            }
        }

        // Insight detail static content
        if (String(page.path || '').startsWith('insights/')) {
            const slug = String(page.path || '').split('/')[1];
            if (slug) {
                const insight = await fetchInsightDetail(slug).catch(() => null);
                if (insight) additionalContent += renderInsightStaticContent(insight);
            }
        }

        // Insights listing static content
        if (String(page.path || '') === 'insights') {
            // In non-targeted mode, insights are already fetched. In targeted mode, fetch listing now.
            const list = insights.length ? insights : await fetchInsightsListing().catch(() => []);
            additionalContent += renderInsightsListingStaticContent(list);
        }

        const isNoIndex = NOINDEX_PATHS.has(String(page.path || '').replace(/^\/+|\/+$/g, ''));
        const content = injectMetadata(template, {
            title: page.title,
            description: page.description,
            image: page.image,
            url: `${SITE_URL}/${page.path}`,
            schema: page.schema,
            noIndex: isNoIndex,
            includeCanonical: !isNoIndex,
        });

        // Put static content INSIDE #root for SEO, but React will replace it when JS runs.
        let htmlWithRoot = content;
        if (additionalContent && htmlWithRoot.includes('<div id="root"></div>')) {
            htmlWithRoot = htmlWithRoot.replace(
                '<div id="root"></div>',
                `<div id="root"><div id="seo-static">${additionalContent}</div></div>`
            );
        }
        // Remove SEO static block as soon as app is ready (reduces visual "double content").
        const remover = `<script>(function(){function rm(){var el=document.getElementById('seo-static');if(el) el.remove();}\nwindow.addEventListener('app-ready',rm,{once:true});\nsetTimeout(rm,8000);}())</script>`;
        const finalHtml = htmlWithRoot.includes('</body>')
            ? htmlWithRoot.replace('</body>', `${remover}\n</body>`)
            : htmlWithRoot;
        writeFileSync(path.join(pageDir, 'index.html'), finalHtml);
    }

    console.log('✅ All pages pre-rendered successfully!');
}

prerender();

