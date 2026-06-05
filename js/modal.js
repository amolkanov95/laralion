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
const sliderImagesHTML = (product, images) => images.map((img, index) =>
    `<img src="${escModal(img)}" alt="${escModal(product.name)}" class="slider-image ${index === 0 ? 'active' : ''}">`
).join('');

const sliderDotsHTML = (productId, images) => images.map((_, index) =>
    `<div class="slider-dot ${index === 0 ? 'active' : ''}" onclick="showSlide('${productId}', ${index})"></div>`
).join('');

// Текущий индекс слайда и текущий выбранный цвет для каждого товара
let currentSlideIndex = {};
let currentColorIndex = {};

// Открыть модальное окно. colorIndex опционален: если не передан — берётся
// активный цвет карточки (пользователь мог переключить кружок до «Смотреть»).
function openModal(productId, colorIndex) {
    const product = getProduct(productId);
    if (!product) return;

    const startColor = colorIndex == null ? getActiveColorIndex(productId) : colorIndex;

    // Создать модальное окно
    const modal = createModalHTML(productId, product, startColor);
    document.body.insertAdjacentHTML('beforeend', modal);

    // Запомнить выбранный цвет и показать первый кадр его галереи
    currentColorIndex[productId] = startColor;
    currentSlideIndex[productId] = 0;
    showSlide(productId, 0);

    // Показать модальное окно с анимацией
    setTimeout(() => {
        document.getElementById(`modal-${productId}`).classList.add('active');
    }, 10);

    // Заблокировать скролл body
    document.body.style.overflow = 'hidden';
}

// Закрыть модальное окно
function closeModal(productId) {
    const modal = document.getElementById(`modal-${productId}`);
    modal.classList.remove('active');

    // Удалить модальное окно после анимации
    setTimeout(() => {
        modal.remove();
        document.body.style.overflow = '';
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
    const imagesHTML = sliderImagesHTML(product, images);
    const dotsHTML = sliderDotsHTML(productId, images);

    const sizesHTML = sizes.map(size =>
        `<button class="size-btn">${size}</button>`
    ).join('');

    // Блок выбора цвета внутри окна (только если у товара есть цвета).
    // Клик по кружку перематывает слайдер на фото цвета и меняет строку описания.
    const swatchesHTML = colors.map((color, index) => `
                            <div class="color-swatch ${index === startColor ? 'active' : ''}" title="${escModal(color.name)}" style="${modalSwatchStyle(color)}" onclick="selectModalColor('${productId}', ${index})"></div>`
    ).join('');

    const colorsBlockHTML = colors.length ? `
                        <div class="modal-colors">
                            <div class="color-swatches">${swatchesHTML}
                            </div>
                            <p class="modal-color-description">${escModal(colorShortDesc(product, colors[startColor]))}</p>
                        </div>` : '';

    const ozonBtn = links.ozon
        ? `<a href="${links.ozon}" target="_blank" class="marketplace-btn">Купить на Ozon →</a>`
        : `<button class="marketplace-btn disabled">Ozon — Скоро в продаже</button>`;

    const avitoBtn = links.avito
        ? `<a href="${links.avito}" target="_blank" class="marketplace-btn">Заказать на Avito →</a>`
        : `<button class="marketplace-btn disabled">Avito — Скоро в продаже</button>`;

    const vkBtn = links.vk
        ? `<a href="${links.vk}" target="_blank" class="marketplace-btn">Обсудить в VK →</a>`
        : `<button class="marketplace-btn disabled">VK — Скоро в продаже</button>`;

    return `
        <div class="modal-overlay" id="modal-${productId}" onclick="closeModalOnOverlay(event, '${productId}')">
            <div class="modal-container">
                <button class="modal-close" onclick="closeModal('${productId}')">×</button>

                <div class="modal-content">
                    <!-- Левая колонка: Слайдер -->
                    <div class="modal-slider">
                        <div class="slider-images">
                            ${imagesHTML}
                            <div class="slider-arrow slider-arrow-left" onclick="changeSlide('${productId}', -1)">‹</div>
                            <div class="slider-arrow slider-arrow-right" onclick="changeSlide('${productId}', 1)">›</div>
                        </div>
                        <div class="slider-dots">
                            ${dotsHTML}
                        </div>
                    </div>

                    <!-- Правая колонка: Информация -->
                    <div class="modal-info">
                        <h2 class="modal-title">${product.name}</h2>
                        <p class="modal-price">${product.price}</p>
${colorsBlockHTML}
                        <p class="modal-description">${product.fullDescription}</p>

                        <!-- Выбор размеров -->
                        <div class="modal-sizes">
                            <h4>Выберите размер:</h4>
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
        images.forEach((img, i) => {
            const el = document.createElement('img');
            el.src = img;
            el.alt = product.name;
            el.className = 'slider-image' + (i === 0 ? ' active' : '');
            sliderImagesEl.insertBefore(el, arrowLeft);
        });
    }
    if (dotsEl) dotsEl.innerHTML = sliderDotsHTML(productId, images);

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
