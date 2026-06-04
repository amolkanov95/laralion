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

    const cardHTML = (product) => {
        const swatchesHTML = product.colors.map((color, index) => `
                            <div class="color-swatch ${index === 0 ? 'active' : ''}" data-color="${esc(color.name)}" data-image="${esc(color.image)}" title="${esc(color.name)}" style="background-color: ${esc(color.hex)}"></div>`
        ).join('');

        return `
                <div class="collection-card" data-product="${esc(product.slug)}" data-category="${esc(product.category)}">
                    <div class="collection-image-wrapper">
                        <img src="${esc(product.mainImage)}" alt="${esc(product.name)}" class="collection-image" loading="lazy">
                    </div>
                    <div class="collection-content">
                        <h3 class="collection-name">${esc(product.name)}</h3>
                        <p class="collection-description">${esc(product.shortDescription)}</p>

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
