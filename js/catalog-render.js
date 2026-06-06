// ============================================
// РЕНДЕР КАТАЛОГА
// Строит карточки товаров из единого источника
// window.PRODUCTS и вставляет в .collections-grid.
//
// Данные загружаются асинхронно (см. products.js), поэтому рендер
// ждёт window.catalogReady. После построения карточек диспатчится
// событие 'catalog:rendered' — на него переинициализируются модули
// color-swatches и scroll-animations (карточек ещё нет на DOMContentLoaded).
// ============================================

(function renderCatalog() {
    const grid = document.querySelector('.collections-grid');
    if (!grid) return;

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

    const cardHTML = (product) => {
        const colors = product.colors || [];
        // Описание активного (первого) цвета; fallback — общее краткое описание.
        const colorDesc = (color) => color.shortDescription || product.shortDescription || '';
        const initialDesc = colors.length ? colorDesc(colors[0]) : (product.shortDescription || '');
        // Фото в карточке: первое фото первого цвета, иначе общее главное фото.
        // assetURL — префикс подпапки для GitHub Pages (см. products.js).
        const initialImage = window.assetURL(colors.length ? colorImage(colors[0]) : (product.mainImage || ''));

        const swatchesHTML = colors.map((color, index) => `
                            <div class="color-swatch ${index === 0 ? 'active' : ''}" data-color="${esc(color.name)}" data-image="${esc(window.assetURL(colorImage(color)))}" data-description="${esc(colorDesc(color))}" title="${esc(color.name)}" style="${swatchStyle(color)}"></div>`
        ).join('');

        return `
                <div class="collection-card" data-product="${esc(product.slug)}" data-category="${esc(product.category)}">
                    <div class="collection-image-wrapper">
                        <img src="${esc(initialImage)}" alt="${esc(product.name)}" class="collection-image" loading="lazy">
                    </div>
                    <div class="collection-content">
                        <h3 class="collection-name">${esc(product.name)}</h3>
                        <p class="collection-description">${esc(initialDesc)}</p>

                        <div class="color-swatches">${swatchesHTML}
                        </div>

                        <p class="collection-price">${esc(product.price)}</p>
                        <button class="collection-btn" onclick="openModal('${esc(product.slug)}')">
                            <span>Смотреть</span>
                            <span>→</span>
                        </button>
                    </div>
                </div>`;
    };

    const ready = window.catalogReady || Promise.resolve();

    ready.then(() => {
        const products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];

        grid.innerHTML = products
            .filter((p) => p.published !== false)
            .map(cardHTML)
            .join('');

        // Карточки в DOM — оповестить зависимые модули (свотчи, анимации).
        document.dispatchEvent(new CustomEvent('catalog:rendered'));
    });
})();
