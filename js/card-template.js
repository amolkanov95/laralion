// ============================================
// ШАБЛОН КАРТОЧКИ ТОВАРА — единственный источник разметки.
// Используется браузерным рендером (js/catalog-render.js → window.CardTemplate)
// и пре-рендером для SEO (scripts/prerender-catalog.mjs → module.exports).
// Меняешь разметку карточки — меняй ТОЛЬКО здесь.
// assetURL — функция преобразования пути фото ('/collections/x.webp' → URL).
// ============================================

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();          // Node (пре-рендер)
    } else {
        root.CardTemplate = factory();       // браузер (classic script)
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Экранирование пользовательских строк, попадающих в HTML-разметку
    const esc = (str) => String(str).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));

    // Стиль кружка: два цвета (hex + hex2) → диагональ, иначе сплошной.
    const swatchStyle = (color) => color.hex2
        ? `background: linear-gradient(135deg, ${esc(color.hex)} 0 50%, ${esc(color.hex2)} 50% 100%)`
        : `background-color: ${esc(color.hex)}`;

    // Первое фото цвета = фото цвета в карточке.
    const colorImage = (color) => (Array.isArray(color.images) && color.images[0]) || '';

    // Человекочитаемая категория для авто-шаблона alt.
    const CATEGORY_LABEL = {
        bedding: 'постельное бельё',
        kitchen: 'кухонный текстиль',
        fabrics: 'ткань'
    };

    // SEO-alt фото: ручной product.seoAlt с откатом на авто-шаблон.
    const altText = (product, colorName) => {
        if (product.seoAlt && String(product.seoAlt).trim()) {
            return String(product.seoAlt).trim();
        }
        const parts = [product.name];
        const category = CATEGORY_LABEL[product.category];
        if (category) parts.push(category);
        if (colorName) parts.push(String(colorName).toLowerCase());
        parts.push('варёный хлопок');
        return parts[0] + ' — ' + parts.slice(1).join(', ');
    };

    const cardHTML = (product, assetURL) => {
        const colors = product.colors || [];
        const colorDesc = (color) => color.shortDescription || product.shortDescription || '';
        const initialDesc = colors.length ? colorDesc(colors[0]) : (product.shortDescription || '');
        const initialImage = assetURL(colors.length ? colorImage(colors[0]) : (product.mainImage || ''));
        const initialAlt = altText(product, colors.length ? colors[0].name : '');

        const swatchesHTML = colors.map((color, index) => `
                            <button type="button" class="color-swatch ${index === 0 ? 'active' : ''}" aria-label="Цвет: ${esc(color.name)}" data-color="${esc(color.name)}" data-image="${esc(assetURL(colorImage(color)))}" data-description="${esc(colorDesc(color))}" title="${esc(color.name)}" style="${swatchStyle(color)}"></button>`
        ).join('');

        return `
                <article class="collection-card" data-product="${esc(product.slug)}" data-category="${esc(product.category)}">
                    <div class="collection-image-wrapper">
                        <img src="${esc(initialImage)}" alt="${esc(initialAlt)}" class="collection-image" loading="lazy">
                    </div>
                    <div class="collection-content">
                        <h3 class="collection-name">${esc(product.name)}</h3>
                        <p class="collection-description">${esc(initialDesc)}</p>

                        <div class="color-swatches">${swatchesHTML}
                        </div>

                        <p class="collection-price">${esc(product.price)}</p>
                        <button type="button" class="collection-btn">
                            <span>Смотреть</span>
                            <span>→</span>
                        </button>
                    </div>
                </article>`;
    };

    return { cardHTML };
}));
