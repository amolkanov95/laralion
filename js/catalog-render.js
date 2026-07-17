// ============================================
// РЕНДЕР КАТАЛОГА
// Строит карточки товаров из единого источника
// window.PRODUCTS и вставляет в .collections-grid.
//
// Данные загружаются асинхронно (см. products.js), поэтому рендер
// ждёт window.catalogReady. После построения карточек диспатчится
// событие 'catalog:rendered' — на него переинициализируются модули
// color-swatches и scroll-animations (карточек ещё нет на DOMContentLoaded).
// Разметка карточки — js/card-template.js (общий с пре-рендером шаблон).
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
            .map((p) => window.CardTemplate.cardHTML(p, window.assetURL))
            .join('');

        // Карточки в DOM — оповестить зависимые модули (свотчи, анимации).
        document.dispatchEvent(new CustomEvent('catalog:rendered'));
    });
})();
