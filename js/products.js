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
