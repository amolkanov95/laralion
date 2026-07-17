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

    // Делегированный клик: открываем модалку по клику в ЛЮБУЮ область карточки
    // (пользователи чаще тапают саму карточку, а не кнопку). Кружки цвета
    // исключены — они только меняют цвет. Кнопка «Смотреть» остаётся видимым CTA
    // и точкой входа для клавиатуры: её click всплывает сюда и тоже открывает окно.
    // openModal — глобальная функция из modal.js; на момент клика она уже определена.
    grid.addEventListener('click', (e) => {
        if (e.target.closest('.color-swatches')) return; // выбор цвета — не открытие
        const card = e.target.closest('.collection-card');
        if (!card || !grid.contains(card)) return;
        if (typeof openModal === 'function') openModal(card.dataset.product);
    });

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

    // SEO-alt фото: вариант B (ручной product.seoAlt) с откатом на A (авто-шаблон
    // из названия, категории и активного цвета). colorName — опциональное название
    // выбранного цвета. Возвращает НЕэкранированную строку (esc применяется в разметке).
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

    const cardHTML = (product) => {
        const colors = product.colors || [];
        // Описание активного (первого) цвета; fallback — общее краткое описание.
        const colorDesc = (color) => color.shortDescription || product.shortDescription || '';
        const initialDesc = colors.length ? colorDesc(colors[0]) : (product.shortDescription || '');
        // Фото в карточке: первое фото первого цвета, иначе общее главное фото.
        // assetURL — префикс подпапки для GitHub Pages (см. products.js).
        const initialImage = window.assetURL(colors.length ? colorImage(colors[0]) : (product.mainImage || ''));
        // Alt главного фото карточки: seoAlt → авто-шаблон (с активным = первым цветом).
        const initialAlt = altText(product, colors.length ? colors[0].name : '');

        const swatchesHTML = colors.map((color, index) => `
                            <button type="button" class="color-swatch ${index === 0 ? 'active' : ''}" aria-label="Цвет: ${esc(color.name)}" data-color="${esc(color.name)}" data-image="${esc(window.assetURL(colorImage(color)))}" data-description="${esc(colorDesc(color))}" title="${esc(color.name)}" style="${swatchStyle(color)}"></button>`
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

    const ready = window.catalogReady || Promise.resolve();

    // Ждём И данные, И полный разбор DOM. Модули-подписчики (color-swatches,
    // scroll-animations и др.) подключены тегами <script> ПОСЛЕ этого файла и
    // регистрируют слушатель 'catalog:rendered' лишь после своей загрузки.
    // Крошечный products.json на быстром (локальном) хостинге успевал
    // зарезолвиться и отправить событие РАНЬШЕ, чем эти скрипты догружались —
    // событие уходило в пустоту, переключение цвета не навешивалось.
    // DOMContentLoaded гарантирует, что все синхронные <script> уже выполнены
    // и подписка состоялась до диспатча (гонка publish-before-subscribe).
    const domReady = document.readyState === 'loading'
        ? new Promise((res) => document.addEventListener('DOMContentLoaded', res, { once: true }))
        : Promise.resolve();

    Promise.all([ready, domReady]).then(() => {
        const products = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];

        grid.innerHTML = products
            .filter((p) => p.published !== false)
            .map(cardHTML)
            .join('');

        // Карточки в DOM — оповестить зависимые модули (свотчи, анимации).
        document.dispatchEvent(new CustomEvent('catalog:rendered'));
    });
})();
