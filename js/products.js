// ============================================
// ЗАГРУЗКА ДАННЫХ КАТАЛОГА
// Источник данных — products.json (редактируется через Decap CMS /admin).
// Загружается асинхронно (fetch), поэтому работает на http(s), но НЕ на file://.
//
// window.PRODUCTS    — массив товаров (пустой до завершения загрузки).
// window.catalogReady — промис, разрешается после заполнения window.PRODUCTS.
//                       Рендер каталога ждёт его перед построением карточек.
// ============================================

window.PRODUCTS = [];

// Базовый префикс сайта = папка, в которой лежит index.html.
// На корне домена (Cloudflare Worker, Netlify, localhost) — пустой;
// на GitHub Pages, где сайт в подпапке /laralion/, — "/laralion".
window.SITE_BASE = location.pathname.replace(/\/[^/]*$/, '');

// Префиксует абсолютные пути изображений (из products.json: /collections/...)
// базой подпапки, чтобы фото грузились и на GitHub Pages. Относительные и
// внешние ссылки не трогаем; на корне домена SITE_BASE пуст → путь без изменений.
window.assetURL = (path) => {
    if (!path || !path.startsWith('/') || path.startsWith('//')) return path;
    return window.SITE_BASE + path;
};

window.catalogReady = fetch('./products.json', { cache: 'no-cache' })
    .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then((data) => {
        window.PRODUCTS = Array.isArray(data.products) ? data.products : [];
    })
    .catch((error) => {
        console.error('Не удалось загрузить каталог (products.json):', error);
        window.PRODUCTS = [];
    });
