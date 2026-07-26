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

// Индекс активного цвета карточки на странице (что выбрал пользователь
// до открытия окна). Нет карточки/цветов — 0.
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

// HTML кадров слайдера для заданного набора фото.
// colorName — название показываемого цвета (для осмысленного SEO-alt).
const sliderImagesHTML = (product, images, colorName) => {
    const alt = modalAltText(product, colorName);
    return images.map((img, index) =>
        `<img src="${escModal(window.assetURL(img))}" alt="${escModal(alt)}" class="slider-image is-zoomable ${index === 0 ? 'active' : ''}">`
    ).join('');
};

// Миниатюры кадров — навигация по галерее на десктопе (вместо стрелок поверх
// фото и точек-индикаторов). alt пустой: миниатюра дублирует уже описанное
// большое фото, для скринридера это шум — кадр называет aria-label кнопки.
const sliderThumbsHTML = (images) => images.map((img, index) =>
    `<button type="button" class="slider-thumb ${index === 0 ? 'active' : ''}" aria-label="Фото ${index + 1}" data-action="showSlide" data-index="${index}"><img src="${escModal(window.assetURL(img))}" alt="" loading="lazy"></button>`
).join('');

// Иконки подсказки «фото открывается на весь экран»: рамка-разворот для вуали
// (десктоп, при наведении) и лупа для тач-устройств, где наведения нет.
const ICON_EXPAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H4v5M15 4h5v5M15 20h5v-5M9 20H4v-5"/></svg>';
const ICON_ZOOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6M11 8.4v5.2M8.4 11h5.2"/></svg>';

// Размеры приходят из CMS списком объектов { name, spec }. Старый формат
// (список строк) поддерживаем: товар, заполненный до появления состава
// комплекта, покажет одни названия размеров.
const normalizeSizes = (sizes) => (Array.isArray(sizes) ? sizes : [])
    .map(size => (typeof size === 'string' ? { name: size } : (size || {})))
    .filter(size => size.name);

// Состав комплекта переносится по строкам только между позициями: пара
// «размер ×количество» не разрывается, разделитель «·» не начинает строку,
// союз «и» её не заканчивает. Для этого позиции склеиваем в неразрывные
// группы — иначе на 390px строка рвётся между «50×70» и «×2».
const specHTML = (text) => {
    const chunks = String(text).split('·').map(chunk => chunk.trim()).filter(Boolean);
    return chunks.map((chunk, chunkIndex) => {
        const tail = chunkIndex < chunks.length - 1 ? ' ·' : '';
        const parts = chunk.split(/\s+и\s+/);
        return parts.map((part, partIndex) => {
            const isLast = partIndex === parts.length - 1;
            const text = partIndex ? `и ${part}` : part;
            return `<span class="size-nb">${escModal(text)}${isLast ? tail : ''}</span>`;
        }).join(' ');
    }).join(' ');
};

// Блок размеров — справка, а не выбор (кнопок здесь нет). Если у размеров
// заполнен состав, показываем таблицу «размер → сантиметры», иначе перечень.
const sizesBlockHTML = (product) => {
    const sizes = normalizeSizes(product.sizes);
    if (!sizes.length) return '';

    const hasSpecs = sizes.some(size => size.spec && String(size.spec).trim());
    if (!hasSpecs) {
        return `
                        <div class="modal-sizes">
                            <h3>Доступные размеры</h3>
                            <ul class="size-list">${sizes.map(size => `
                                <li>${escModal(size.name)}</li>`).join('')}
                            </ul>
                        </div>`;
    }

    // Подпись столбца поясняет порядок чисел в составе (задаётся в CMS)
    const legend = product.sizesLegend && String(product.sizesLegend).trim()
        ? `
                                <div class="size-row size-legend"><dt>Размер</dt><dd>${specHTML(product.sizesLegend)}</dd></div>`
        : '';

    return `
                        <div class="modal-sizes">
                            <h3>Размеры и состав комплекта</h3>
                            <dl class="size-specs">${legend}${sizes.map(size => `
                                <div class="size-row"><dt>${escModal(size.name)}</dt><dd>${specHTML(size.spec || '')}</dd></div>`).join('')}
                            </dl>
                        </div>`;
};

// Маркетплейсы в фиксированном порядке. Первая заполненная ссылка считается
// главной: она уходит в липкую панель покупки на телефоне.
const MARKETPLACES = [
    { key: 'ozon', label: 'Купить на Ozon →', soon: 'Ozon — Скоро в продаже' },
    { key: 'avito', label: 'Заказать на Avito →', soon: 'Avito — Скоро в продаже' },
    { key: 'vk', label: 'Обсудить в VK →', soon: 'VK — Скоро в продаже' }
];

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

// Элемент, на который вернуть фокус после закрытия окна (обычно карточка товара).
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
        } else if (action === 'expandDesc') {
            expandDescription(overlay, el);
        }
        return;
    }
    // Клик мимо кнопок — возможно, по фону оверлея (закрытие).
    closeModalOnOverlay(e, productId);
}

// Открыть модальное окно. colorIndex опционален: если не передан — берётся
// активный цвет карточки (пользователь мог переключить кружок до открытия).
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

    // Телефон: свайп по ленте кадров
    enableTrackSync(productId);

    // Показать модальное окно с анимацией
    const overlay = document.getElementById(`modal-${productId}`);
    overlay.addEventListener('click', handleModalClick);
    setTimeout(() => {
        overlay.classList.add('active');
        // Перевести фокус в окно (на кнопку закрытия)
        const closeBtn = overlay.querySelector('.modal-close');
        if (closeBtn) closeBtn.focus();
        // Обрезку описания проверяем только теперь: до показа окна
        // (display: none) высоты нулевые и обрезку не измерить
        initDescriptionClamp(productId);
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
    const links = product.links || {};
    const colors = Array.isArray(product.colors) ? product.colors : [];

    // Слайдер строится из галереи стартового цвета (или общих фото для товара без цветов).
    const images = colorImages(product, startColor);
    const imagesHTML = sliderImagesHTML(product, images, colorNameAt(product, startColor));

    // Миниатюры и счётчик нужны только когда кадров больше одного
    const thumbsHTML = images.length > 1
        ? `
                        <div class="slider-thumbs">${sliderThumbsHTML(images)}
                        </div>`
        : '';
    const counterHTML = images.length > 1
        ? `<span class="slider-counter" aria-hidden="true">1 / ${images.length}</span>`
        : '';

    // Подсказка «фото раскрывается на весь экран»: вуаль при наведении на
    // десктопе, лупа на тач-устройствах (переключает CSS). pointer-events: none —
    // клик проходит на фото и открывает полноэкранный просмотр.
    const zoomHintHTML = images.length
        ? `
                            <span class="slider-zoom-veil" aria-hidden="true">${ICON_EXPAND}Увеличить</span>
                            <span class="slider-zoom-badge" aria-hidden="true">${ICON_ZOOM}</span>`
        : '';

    const sizesHTML = sizesBlockHTML(product);

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

    // Кнопки маркетплейсов. У главной (первой доступной) — метка data-primary:
    // на телефоне она скрыта из списка, потому что дублируется в липкой панели.
    const primary = MARKETPLACES.find(market => links[market.key]) || null;
    const marketplaceHTML = MARKETPLACES.map(market => links[market.key]
        ? `<a href="${escModal(links[market.key])}" target="_blank" rel="noopener" class="marketplace-btn"${primary && market.key === primary.key ? ' data-primary' : ''}>${market.label}</a>`
        : `<button type="button" class="marketplace-btn disabled" disabled>${market.soon}</button>`
    ).join(`
                            `);

    // Липкая панель покупки — видна только на телефоне (CSS)
    const buybarActionHTML = primary
        ? `<a href="${escModal(links[primary.key])}" target="_blank" rel="noopener" class="marketplace-btn buybar-btn">${primary.label}</a>`
        : `<button type="button" class="marketplace-btn disabled buybar-btn" disabled>Скоро в продаже</button>`;

    const pid = escModal(productId);
    return `
        <div class="modal-overlay" id="modal-${pid}" role="dialog" aria-modal="true" aria-labelledby="modal-title-${pid}">
            <div class="modal-container">
                <button type="button" class="modal-close" aria-label="Закрыть" data-action="closeModal">×</button>

                <div class="modal-content">
                    <!-- Левая колонка: Слайдер -->
                    <div class="modal-slider">
                        <div class="slider-frame">
                            <div class="slider-images">
                                ${imagesHTML}
                            </div>${zoomHintHTML}
                            ${counterHTML}
                        </div>${thumbsHTML}
                    </div>

                    <!-- Правая колонка: Информация -->
                    <div class="modal-info">
                        <h2 class="modal-title" id="modal-title-${pid}">${escModal(product.name)}</h2>
                        <p class="modal-price">${escModal(product.price)}</p>
${colorsBlockHTML}
                        <p class="modal-description">${escModal(product.fullDescription)}</p>
                        <button type="button" class="modal-description-more" data-action="expandDesc" hidden>Читать полностью</button>
${sizesHTML}

                        <!-- Информация об упаковке -->
                        <div class="modal-gift-info">
                            Фирменная подарочная коробка и холщовый шопер включены в стоимость каждого комплекта
                        </div>

                        <!-- Кнопки маркетплейсов -->
                        <div class="modal-marketplace-buttons">
                            ${marketplaceHTML}
                        </div>
                    </div>
                </div>

                <!-- Липкая панель покупки (телефон) -->
                <div class="modal-buybar">
                    <span class="buybar-price">${escModal(product.price)}</span>
                    ${buybarActionHTML}
                </div>
            </div>
        </div>
    `;
}

// Показать кадр: активное фото, активная миниатюра, счётчик.
// fromScroll — вызов пришёл от свайпа ленты, подводить её не нужно.
function showSlide(productId, index, fromScroll) {
    const modal = document.getElementById(`modal-${productId}`);
    if (!modal) return;
    const images = modal.querySelectorAll('.slider-image');
    const thumbs = modal.querySelectorAll('.slider-thumb');
    const counter = modal.querySelector('.slider-counter');
    if (!images.length) return;              // у товара нет фото — слайдера нет
    if (index < 0 || index >= images.length) return; // кадр из прошлой галереи

    // Убрать активный класс со всех
    images.forEach(img => img.classList.remove('active'));
    thumbs.forEach(thumb => thumb.classList.remove('active'));

    // Добавить активный класс к текущему
    images[index].classList.add('active');
    if (thumbs[index]) thumbs[index].classList.add('active');
    if (counter) counter.textContent = `${index + 1} / ${images.length}`;

    currentSlideIndex[productId] = index;

    if (!fromScroll) scrollTrackTo(modal, index);
}

// Телефон: подвести ленту кадров к нужному фото. На десктопе кадры наложены
// друг на друга (перекрёстное затухание) — прокручивать нечего.
function scrollTrackTo(modal, index) {
    const track = modal.querySelector('.slider-images');
    if (!track) return;
    if (track.scrollWidth <= track.clientWidth + 1) return;
    const target = index * track.clientWidth;
    if (Math.abs(track.scrollLeft - target) < 2) return;
    track.scrollTo({ left: target, behavior: 'smooth' });
}

// Телефон: фото листаются свайпом (лента scroll-snap). Активный кадр считаем
// по позиции прокрутки — счётчик и полноэкранный просмотр остаются в согласии.
function enableTrackSync(productId) {
    const modal = document.getElementById(`modal-${productId}`);
    if (!modal) return;
    const track = modal.querySelector('.slider-images');
    if (!track) return;
    track.addEventListener('scroll', () => {
        if (track.scrollWidth <= track.clientWidth + 1) return;
        const index = Math.round(track.scrollLeft / track.clientWidth);
        if (index !== currentSlideIndex[productId]) showSlide(productId, index, true);
    }, { passive: true });
}

// Телефон: описание обрезано четырьмя строками. Кнопку «Читать полностью»
// показываем только если текст действительно не поместился.
function initDescriptionClamp(productId) {
    const modal = document.getElementById(`modal-${productId}`);
    if (!modal) return;
    const desc = modal.querySelector('.modal-description');
    const more = modal.querySelector('.modal-description-more');
    if (!desc || !more) return;
    if (desc.scrollHeight - desc.clientHeight > 2) more.hidden = false;
}

// Раскрыть описание целиком (кнопка после этого не нужна)
function expandDescription(modal, button) {
    const desc = modal.querySelector('.modal-description');
    if (!desc) return;
    desc.classList.add('is-expanded');
    button.hidden = true;
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
    const trackEl = modal.querySelector('.slider-images');
    const thumbsEl = modal.querySelector('.slider-thumbs');
    if (trackEl) {
        trackEl.innerHTML = sliderImagesHTML(product, images, color.name);
        trackEl.scrollLeft = 0; // лента на телефоне — к первому кадру
    }
    if (thumbsEl) thumbsEl.innerHTML = sliderThumbsHTML(images);

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

// Закрыть модальное окно при нажатии Escape.
// Полноэкранный просмотр (lightbox.js) — верхний слой: Escape достаётся ему,
// карточка остаётся открытой. Оба обработчика висят на document, поэтому две
// проверки покрывают любой порядок их выполнения: метка — если просмотрщик уже
// отработал и снял свой класс, класс .active — если он ещё не отработал.
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (e.lightboxHandled || document.querySelector('.lightbox-overlay.active')) return;
    const activeModal = document.querySelector('.modal-overlay.active');
    if (activeModal) {
        closeModal(activeModal.id.replace('modal-', ''));
    }
});
