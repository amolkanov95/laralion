// ============================================
// ПРЕ-РЕНДЕР КАТАЛОГА (SEO/GEO — задача 3.2 ТЗ)
// Генерирует из products.json:
//   1) статические карточки товаров в index.html (маркеры prerender:cards) —
//      fallback для поисковых и ИИ-краулеров без JS; клиентский рендер
//      перерисовывает грид после загрузки, поэтому расхождений не бывает;
//   2) JSON-LD ItemList/Product/AggregateOffer в <head> (маркеры prerender:jsonld);
//   3) llms.txt — описание бизнеса и каталога для ИИ-агентов.
// Разметку карточки даёт js/card-template.js — общий шаблон с браузером.
// Запуск: node scripts/prerender-catalog.mjs (локально и в CI при изменении
// products.json — см. .github/workflows/prerender.yml).
// ============================================

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { cardHTML } = require('../js/card-template.js');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Фактический адрес сайта. При привязке домена laralion.ru заменить здесь
// и в <head> index.html, sitemap.xml, robots.txt (см. спеку, раздел «Домен»).
const ORIGIN = 'https://amolkanov95.github.io/laralion';

const data = JSON.parse(readFileSync(join(ROOT, 'products.json'), 'utf8'));
const products = (Array.isArray(data.products) ? data.products : [])
    .filter((p) => p && p.published !== false);

// Guard: при битом/пустом products.json останавливаемся с ошибкой,
// чтобы автозапуск в CI не закоммитил главную с пустым каталогом.
if (!products.length) {
    throw new Error('products.json: 0 опубликованных товаров — пре-рендер остановлен');
}

// Пути фото в статике — относительные ('./collections/...'): работают и на
// корне домена (Cloudflare/Netlify/localhost), и в подпапке GitHub Pages.
const relAsset = (p) => (p && p.startsWith('/') && !p.startsWith('//')) ? '.' + p : p;
const absAsset = (p) => {
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    return ORIGIN + (p.startsWith('/') ? p : '/' + p);
};

// --- JSON-LD: логика перенесена из js/seo-jsonld.js (файл будет удалён) ---
const firstImage = (product) => {
    const colors = Array.isArray(product.colors) ? product.colors : [];
    if (colors.length) {
        const imgs = Array.isArray(colors[0].images) ? colors[0].images : [];
        if (imgs[0]) return imgs[0];
    }
    if (product.mainImage) return product.mainImage;
    const images = Array.isArray(product.images) ? product.images : [];
    return images[0] || '';
};

const truncate = (str, max) => {
    const s = String(str || '').trim();
    return s.length > max ? s.slice(0, max).trimEnd() + '…' : s;
};

// Число из строки цены: «от 7 400 ₽» → 7400. Если цифр нет — null.
const parsePrice = (price) => {
    const digits = String(price || '').replace(/[^0-9]/g, '');
    if (!digits) return null;
    const num = parseInt(digits, 10);
    return Number.isFinite(num) ? num : null;
};

const buildProduct = (product) => {
    const item = {
        '@type': 'Product',
        name: String(product.name || ''),
        description: truncate(product.shortDescription || product.fullDescription, 300),
        brand: { '@type': 'Brand', name: 'Lara Lion' }
    };
    const image = absAsset(firstImage(product));
    if (image) item.image = image;
    const lowPrice = parsePrice(product.price);
    if (lowPrice != null) {
        const sizes = Array.isArray(product.sizes) ? product.sizes : [];
        item.offers = {
            '@type': 'AggregateOffer',
            priceCurrency: 'RUB',
            lowPrice: lowPrice,
            offerCount: Math.max(1, sizes.length),
            availability: 'https://schema.org/InStock'
        };
    }
    return item;
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: buildProduct(product)
    }))
};

// --- Замена содержимого между HTML-маркерами (идемпотентно) ---
const replaceBetween = (source, startMark, endMark, content) => {
    const start = source.indexOf(startMark);
    const end = source.indexOf(endMark);
    if (start === -1 || end === -1 || end < start) {
        throw new Error(`Маркеры ${startMark} … ${endMark} не найдены в index.html`);
    }
    return source.slice(0, start + startMark.length) + content + source.slice(end);
};

const indexPath = join(ROOT, 'index.html');
let html = readFileSync(indexPath, 'utf8');

const cardsHTML = products.map((p) => cardHTML(p, relAsset)).join('') + '\n                    ';
html = replaceBetween(html, '<!-- prerender:cards:start -->', '<!-- prerender:cards:end -->', cardsHTML);

// «<» экранируем юникод-эскейпом \u003c (валидный JSON): строка вида «</script>»
// в описании товара из CMS иначе молча оборвала бы <script>-блок в head;
// заодно защищает HTML-маркеры пре-рендера от коллизий со строками данных.
const jsonLdHTML = '\n    <script type="application/ld+json">\n'
    + JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c')
    + '\n    </script>\n    ';
html = replaceBetween(html, '<!-- prerender:jsonld:start -->', '<!-- prerender:jsonld:end -->', jsonLdHTML);

writeFileSync(indexPath, html);

// --- llms.txt ---
const catalogLines = products.map((p) =>
    `- ${p.name} — ${p.price || 'цена по запросу'} — ${p.shortDescription || truncate(p.fullDescription, 120)}`
).join('\n');

const llms = `# Lara Lion — премиальный домашний текстиль из варёного хлопка (Ярославль)

Ателье Lara Lion шьёт постельное бельё с рюшами и кружевом из 100% варёного
хлопка, кухонный текстиль и продаёт ткани. Индивидуальный пошив по меркам
заказчика (в среднем ~3 дня) и готовые комплекты. Фирменная подарочная
упаковка включена в стоимость каждого комплекта.

Сайт: ${ORIGIN}/

## Каталог
${catalogLines}

## Контакты
- Адрес: 150030, Ярославль, проспект Фрунзе, 3, офис 511
- Телефон: +7 906 639 41 70
- Email: laralion@mail.ru
- Режим работы: Пн–Пт 9:00–18:00, Сб–Вс по договорённости
- Ozon: https://ozon.ru/s/lara-lion
- Avito: https://www.avito.ru/user/a473e347f13379228ba139453378b361/profile
- VK: https://vk.ru/creativeworkshop_yar

## Услуги и доставка
- Индивидуальный пошив постельного белья по размерам заказчика
- Доставка: СДЭК, Почта России, Авито-доставка, службы маркетплейсов
`;

writeFileSync(join(ROOT, 'llms.txt'), llms);

console.log(`Пре-рендер готов: ${products.length} товаров (index.html, llms.txt).`);
