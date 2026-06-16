// ============================================
// ДИНАМИЧЕСКАЯ МИКРОРАЗМЕТКА КАТАЛОГА (Schema.org Product / ItemList)
// Источник — window.PRODUCTS (см. js/products.js, загрузка асинхронная).
// После window.catalogReady генерирует один <script type="application/ld+json">
// с ItemList из Product и инжектит его в <head>.
//
// Новый товар, добавленный в /admin (products.json), попадает сюда автоматически.
// Vanilla JS, без зависимостей; defensive-код на случай пустого/битого каталога.
// ============================================

(function seoJsonLd() {
    'use strict';

    const ORIGIN = 'https://laralion.ru';
    const toAbs = (path) => {
        // window.assetURL — префикс подпапки (GitHub Pages); затем добавляем домен.
        const url = (typeof window.assetURL === 'function') ? window.assetURL(path) : path;
        if (!url) return '';
        if (/^https?:\/\//i.test(url)) return url;       // уже абсолютный URL
        return ORIGIN + (url.startsWith('/') ? url : '/' + url);
    };

    // Первое фото товара: первое фото первого цвета → mainImage → первый из images.
    // Та же логика выбора, что в js/catalog-render.js (colorImage).
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

    // Усечение полного описания как fallback для описания товара.
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

        const image = toAbs(firstImage(product));
        if (image) item.image = image;

        const lowPrice = parsePrice(product.price);
        if (lowPrice != null) {
            // offerCount = число вариантов покупки (размеры), минимум 1.
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

    const ready = window.catalogReady || Promise.resolve();

    ready.then(() => {
        try {
            const products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
            const itemListElement = products
                .filter((p) => p && p.published !== false)
                .map((product, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    item: buildProduct(product)
                }));

            if (!itemListElement.length) return;

            const data = {
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                itemListElement: itemListElement
            };

            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify(data);
            document.head.appendChild(script);
        } catch (error) {
            console.error('Не удалось сформировать микроразметку каталога (Product JSON-LD):', error);
        }
    });
})();