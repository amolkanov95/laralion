// ============================================
// МОДАЛЬНЫЕ ОКНА ТОВАРОВ
// Открытие, закрытие, слайдер фотографий
// ============================================

// Данные товаров — единый источник js/products.js (загружается асинхронно).
// Ищем товар по slug в момент вызова: к открытию модалки каталог уже загружен.
const getProduct = (slug) =>
    (window.PRODUCTS || []).find(p => p.slug === slug);

// Экранирование пользовательских строк, попадающих в HTML-атрибуты модалки.
const escModal = (str) => String(str).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));

// Стиль кружка: два цвета (hex + hex2) → диагональ, иначе сплошной.
const modalSwatchStyle = (color) => color.hex2
    ? `background: linear-gradient(135deg, ${escModal(color.hex)} 0 50%, ${escModal(color.hex2)} 50% 100%)`
    : `background-color: ${escModal(color.hex)}`;

// Краткое описание цвета с откатом на общее описание товара.
const colorShortDesc = (product, color) =>
    (color && color.shortDescription) || product.shortDescription || '';

// Человекочитаемая категория для авто-шаблона alt (как в catalog-render.js).
const MODAL_CATEGORY_LABEL = {
    bedding: 'постельное бельё',
    kitchen: 'кухонный текстиль',
    fabrics: 'ткань'
};

// SEO-alt фото в слайдере: вариант B (ручной product.seoAlt) с откатом на A
// (авто-шаблон из названия, категории и выбранного цвета). Единая логика с карточкой.
const modalAltText = (product, colorName) => {
    if (product.seoAlt && String(product.seoAlt).trim()) {
        return String(product.seoAlt).trim();
    }
    const parts = [product.name];
    const category = MODAL_CATEGORY_LABEL[product.category];
    if (category) parts.push(category);
    if (colorName) parts.push(String(colorName).toLowerCase());
    parts.push('варёный хлопок');
    return parts[0] + ' — ' + parts.slice(1).join(', ');
};

// Название выбранного цвета (для alt); у товара без цветов — пусто.
const colorNameAt = (product, colorIndex) => {
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const color = colors[colorIndex] || colors[0];
    return color ? color.name : '';
};

// Индекс активного цвета карточки на странице (что выбрал пользователь до клика
// «Смотреть»). Нет карточки/цветов — 0.
const getActiveColorIndex = (slug) => {
    const card = document.querySelector(`.collection-card[data-product="${CSS.escape(slug)}"]`);
    if (!card) return 0;
    const swatches = Array.from(card.querySelectorAll('.color-swatch'));
    const active = swatches.findIndex(s => s.classList.contains('active'));
    return active < 0 ? 0 : active;
};

// Галерея фотографий для показа в слайдере: у товара с цветами — фото выбранного
// цвета (свой набор), у товара без цветов — общий список product.images.
const colorImages = (product, colorIndex) => {
    const colors = Array.isArray(product.colors) ? product.colors : [];
    if (colors.length) {
        const color = colors[colorIndex] || colors[0];
        const imgs = Array.isArray(color && color.images) ? color.images : [];
        if (imgs.length) return imgs;
    }
    return Array.isArray(product.images) ? product.images : [];
};

// HTML кадров слайдера и точек-индикаторов для заданного набора фото.
// colorName — название показываемого цвета (для осмысленного SEO-alt).
const sliderImagesHTML = (product, images, colorName) => {
    const alt = modalAltText(product, colorName);
    return images.map((img, index) =>
        `<img src="${escModal(window.assetURL(img))}" alt="${escModal(alt)}" class="slider-image is-zoomable ${index === 0 ? 'active' : ''}">`
    ).join('');
};

const sliderDotsHTML = (images) => images.map((_, index) =>
    `<button type="button" class="slider-dot ${index === 0 ? 'active' : ''}" aria-label="Фото ${index + 1}" data-action="showSlide" data-index="${index}"></button>`
).join('');

// Текущий индекс слайда и текущий выбранный цвет для каждого товара
let currentSlideIndex = {};
let currentColorIndex = {};

// Открыть полноэкранный просмотр текущей галереи (текущий цвет + текущий кадр).
// Галерея и индекс берутся из состояния модалки — данные не дублируются.
// Листание внутри просмотрщика синхронизируется обратно в модалку.
function openProductLightbox(productId) {
    if (typeof window.openLightbox !== 'function') return;
    const product = getProduct(productId);
    if (!product) return;
    const colorIndex = currentColorIndex[productId] || 0;
    const imgs = colorImages(product, colorIndex);
    if (!imgs.length) return;
    window.openLightbox({
        images: imgs.map((img) => window.assetURL(img)),
        startIndex: currentSlideIndex[productId] || 0,
        alt: modalAltText(product, colorNameAt(product, colorIndex)),
        onIndexChange: (i) => showSlide(productId, i)
    });
}

// Навесить открытие просмотрщика на фото слайдера (клик/тап).
// Делегирование на контейнере: переживает перестроение кадров при смене цвета.
function enableLightboxTrigger(productId) {
    const modal = document.getElementById(`modal-${productId}`);
    if (!modal) return;
    const sliderImages = modal.querySelector('.slider-images');
    if (!sliderImages) return;
    sliderImages.classList.add('lightbox-enabled');
    sliderImages.addEventListener('click', (e) => {
        if (e.target.classList.contains('slider-image')) {
            openProductLightbox(productId);
        }
    });
}

// Элемент, на который вернуть фокус после закрытия окна (триггер «Смотреть»).
let lastFocusedTrigger = null;

// Селектор фокусируемых элементов внутри модалки (для перевода фокуса и trap по Tab).
const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

// Удержание фокуса внутри открытой модалки (Tab/Shift+Tab по кругу).
function trapFocus(e) {
    if (e.key !== 'Tab') return;
    const modal = document.querySelector('.modal-overlay.active');
    if (!modal) return;
    const items = Array.from(modal.querySelectorAll(FOCUSABLE))
        .filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

// Делегированный клик внутри модального окна (вместо инлайн onclick — под строгую CSP).
// Навешивается на оверлей в openModal; productId берём из id оверлея
// (тот же приём, что в обработчике Escape ниже). Логика самих функций не меняется.
function handleModalClick(e) {
    const overlay = e.currentTarget;
    const productId = overlay.id.replace('modal-', '');
    const el = e.target.closest('[data-action]');
    if (el && overlay.contains(el)) {
        const action = el.dataset.action;
        if (action === 'closeModal') {
            closeModal(productId);
        } else if (action === 'showSlide') {
            showSlide(productId, Number(el.dataset.index));
        } else if (action === 'selectModalColor') {
            selectModalColor(productId, Number(el.dataset.index));
        } else if (action === 'changeSlide') {
            changeSlide(productId, Number(el.dataset.dir));
        }
        return;
    }
    // Клик мимо кнопок — возможно, по фону оверлея (закрытие).
    closeModalOnOverlay(e, productId);
}

// Открыть модальное окно. colorIndex опционален: если не передан — берётся
// активный цвет карточки (пользователь мог переключить кружок до «Смотреть»).
function openModal(productId, colorIndex) {
    const product = getProduct(productId);
    if (!product) return;

    // Запомнить элемент, вызвавший окно, чтобы вернуть на него фокус при закрытии
    lastFocusedTrigger = document.activeElement;

    const startColor = colorIndex == null ? getActiveColorIndex(productId) : colorIndex;

    // Создать модальное окно
    const modal = createModalHTML(productId, product, startColor);
    document.body.insertAdjacentHTML('beforeend', modal);

    // Запомнить выбранный цвет и показать первый кадр его галереи
    currentColorIndex[productId] = startColor;
    currentSlideIndex[productId] = 0;
    showSlide(productId, 0);

    // Клик/тап по фото открывает полноэкранный просмотр
    enableLightboxTrigger(productId);

    // Показать модальное окно с анимацией
    const overlay = document.getElementById(`modal-${productId}`);
    overlay.addEventListener('click', handleModalClick);
    setTimeout(() => {
        overlay.classList.add('active');
        // Перевести фокус в окно (на кнопку закрытия)
        const closeBtn = overlay.querySelector('.modal-close');
        if (closeBtn) closeBtn.focus();
    }, 10);

    // Удерживать фокус внутри окна
    document.addEventListener('keydown', trapFocus);

    // Заблокировать скролл body
    document.body.style.overflow = 'hidden';
}

// Закрыть модальное окно
function closeModal(productId) {
    const modal = document.getElementById(`modal-${productId}`);
    modal.classList.remove('active');

    // Снять удержание фокуса
    document.removeEventListener('keydown', trapFocus);

    // Удалить модальное окно после анимации
    setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
        // Вернуть фокус на триггер, открывший окно
        if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
            lastFocusedTrigger.focus();
        }
        lastFocusedTrigger = null;
    }, 300);
}

// Создать HTML модального окна
function createModalHTML(productId, product, startColor = 0) {
    // Поля могут отсутствовать, если товар заполнен в CMS частично:
    // Decap опускает пустые опциональные поля (например, links без ссылок).
    // Подставляем безопасные значения, чтобы окно открывалось в любом случае.
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const links = product.links || {};
    const colors = Array.isArray(product.colors) ? product.colors : [];

    // Слайдер строится из галереи стартового цвета (или общих фото для товара без цветов).
    const images = colorImages(product, startColor);
    const imagesHTML = sliderImagesHTML(product, images, colorNameAt(product, startColor));
    const dotsHTML = sliderDotsHTML(images);

    const sizesHTML = sizes.map(size =>
        `<button type="button" class="size-btn">${escModal(size)}</button>`
    ).join('');

    // Блок выбора цвета внутри окна (только если у товара есть цвета).
    // Клик по кружку перематывает слайдер на фото цвета и меняет строку описания.
    const swatchesHTML = colors.map((color, index) => `
                            <button type="button" class="color-swatch ${index === startColor ? 'active' : ''}" aria-label="Цвет: ${escModal(color.name)}" title="${escModal(color.name)}" style="${modalSwatchStyle(color)}" data-action="selectModalColor" data-index="${index}"></button>`
    ).join('');

    const colorsBlockHTML = colors.length ? `
                        <div class="modal-colors">
                            <div class="color-swatches">${swatchesHTML}
                            </div>
                            <p class="modal-color-description">${escModal(colorShortDesc(product, colors[startColor]))}</p>
                        </div>` : '';

    const ozonBtn = links.ozon
        ? `<a href="${escModal(links.ozon)}" target="_blank" rel="noopener" class="marketplace-btn">Купить на Ozon →</a>`
        : `<button type="button" class="marketplace-btn disabled" disabled>Ozon — Скоро в продаже</button>`;

    const avitoBtn = links.avito
        ? `<a href="${escModal(links.avito)}" target="_blank" rel="noopener" class="marketplace-btn">Заказать на Avito →</a>`
        : `<button type="button" class="marketplace-btn disabled" disabled>Avito — Скоро в продаже</button>`;

    const vkBtn = links.vk
        ? `<a href="${escModal(links.vk)}" target="_blank" rel="noopener" class="marketplace-btn">Обсудить в VK →</a>`
        : `<button type="button" class="marketplace-btn disabled" disabled>VK — Скоро в продаже</button>`;

    const pid = escModal(productId);
    return `
        <div class="modal-overlay" id="modal-${pid}" role="dialog" aria-modal="true" aria-labelledby="modal-title-${pid}">
            <div class="modal-container">
                <button type="button" class="modal-close" aria-label="Закрыть" data-action="closeModal">×</button>

                <div class="modal-content">
                    <!-- Левая колонка: Слайдер -->
                    <div class="modal-slider">
                        <div class="slider-images">
                            ${imagesHTML}
                            <button type="button" class="slider-arrow slider-arrow-left" aria-label="Предыдущее фото" data-action="changeSlide" data-dir="-1">‹</button>
                            <button type="button" class="slider-arrow slider-arrow-right" aria-label="Следующее фото" data-action="changeSlide" data-dir="1">›</button>
                        </div>
                        <div class="slider-dots">
                            ${dotsHTML}
                        </div>
                    </div>

                    <!-- Правая колонка: Информация -->
                    <div class="modal-info">
                        <h2 class="modal-title" id="modal-title-${pid}">${escModal(product.name)}</h2>
                        <p class="modal-price">${escModal(product.price)}</p>
${colorsBlockHTML}
                        <p class="modal-description">${escModal(product.fullDescription)}</p>

                        <!-- Выбор размеров -->
                        <div class="modal-sizes">
                            <h3>Выберите размер:</h3>
                            <div class="size-buttons">
                                ${sizesHTML}
                            </div>
                        </div>

                        <!-- Информация об упаковке -->
                        <div class="modal-gift-info">
                            Фирменная подарочная коробка и холщовый шопер включены в стоимость каждого комплекта
                        </div>

                        <!-- Кнопки маркетплейсов -->
                        <div class="modal-marketplace-buttons">
                            ${ozonBtn}
                            ${avitoBtn}
                            ${vkBtn}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Показать слайд
function showSlide(productId, index) {
    const modal = document.getElementById(`modal-${productId}`);
    if (!modal) return;
    const images = modal.querySelectorAll('.slider-image');
    const dots = modal.querySelectorAll('.slider-dot');
    if (!images.length) return; // у товара нет фото — слайдера нет

    // Убрать активный класс со всех
    images.forEach(img => img.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    // Добавить активный класс к текущему
    images[index].classList.add('active');
    dots[index].classList.add('active');

    currentSlideIndex[productId] = index;
}

// Переключить слайд
function changeSlide(productId, direction) {
    const product = getProduct(productId);
    if (!product) return;
    // Листаем в пределах галереи текущего выбранного цвета
    const totalSlides = colorImages(product, currentColorIndex[productId] || 0).length;
    if (totalSlides === 0) return; // нечего листать
    let newIndex = currentSlideIndex[productId] + direction;

    // Зацикливание слайдера
    if (newIndex < 0) newIndex = totalSlides - 1;
    if (newIndex >= totalSlides) newIndex = 0;

    showSlide(productId, newIndex);
}

// Выбор цвета внутри окна товара: перестраивает слайдер на галерею выбранного
// цвета (свой набор фото) и меняет строку краткого описания.
// Полное описание остаётся общим.
function selectModalColor(productId, index) {
    const product = getProduct(productId);
    if (!product) return;
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const color = colors[index];
    if (!color) return;

    const modal = document.getElementById(`modal-${productId}`);
    if (!modal) return;

    currentColorIndex[productId] = index;

    // Активный кружок
    const swatches = modal.querySelectorAll('.modal-colors .color-swatch');
    swatches.forEach((s, i) => s.classList.toggle('active', i === index));

    // Строка краткого описания цвета
    const desc = modal.querySelector('.modal-color-description');
    if (desc) desc.textContent = colorShortDesc(product, color);

    // Перестроить слайдер под галерею выбранного цвета
    const images = colorImages(product, index);
    const sliderImagesEl = modal.querySelector('.slider-images');
    const dotsEl = modal.querySelector('.slider-dots');
    if (sliderImagesEl) {
        // Удалить старые кадры, оставив стрелки навигации
        sliderImagesEl.querySelectorAll('.slider-image').forEach(n => n.remove());
        const arrowLeft = sliderImagesEl.querySelector('.slider-arrow-left');
        const alt = modalAltText(product, color.name);
        images.forEach((img, i) => {
            const el = document.createElement('img');
            el.src = window.assetURL(img);
            el.alt = alt;
            el.className = 'slider-image is-zoomable' + (i === 0 ? ' active' : '');
            sliderImagesEl.insertBefore(el, arrowLeft);
        });
    }
    if (dotsEl) dotsEl.innerHTML = sliderDotsHTML(images);

    // Слайдер на первый кадр новой галереи
    currentSlideIndex[productId] = 0;
    showSlide(productId, 0);
}

// Закрыть модальное окно при клике на оверлей
function closeModalOnOverlay(event, productId) {
    if (event.target.classList.contains('modal-overlay')) {
        closeModal(productId);
    }
}

// Закрыть модальное окно при нажатии Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
            const productId = activeModal.id.replace('modal-', '');
            closeModal(productId);
        }
    }
});
