// ============================================
// МОДАЛЬНЫЕ ОКНА ТОВАРОВ
// Открытие, закрытие, слайдер фотографий
// ============================================

// Данные товаров — единый источник js/products.js (подключён раньше modal.js).
// Строим lookup по slug для быстрого доступа в openModal(slug).
const productsData = Object.fromEntries(
    (window.PRODUCTS || []).map(p => [p.slug, p])
);

// Текущий индекс слайда для каждого товара
let currentSlideIndex = {};

// Открыть модальное окно
function openModal(productId) {
    const product = productsData[productId];
    if (!product) return;

    // Создать модальное окно
    const modal = createModalHTML(productId, product);
    document.body.insertAdjacentHTML('beforeend', modal);

    // Инициализировать слайдер
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
function createModalHTML(productId, product) {
    const imagesHTML = product.images.map((img, index) =>
        `<img src="${img}" alt="${product.name}" class="slider-image ${index === 0 ? 'active' : ''}">`
    ).join('');

    const dotsHTML = product.images.map((_, index) =>
        `<div class="slider-dot ${index === 0 ? 'active' : ''}" onclick="showSlide('${productId}', ${index})"></div>`
    ).join('');

    const sizesHTML = product.sizes.map(size =>
        `<button class="size-btn">${size}</button>`
    ).join('');

    const ozonBtn = product.links.ozon
        ? `<a href="${product.links.ozon}" target="_blank" class="marketplace-btn">Купить на Ozon →</a>`
        : `<button class="marketplace-btn disabled">Ozon — Скоро в продаже</button>`;

    const avitoBtn = product.links.avito
        ? `<a href="${product.links.avito}" target="_blank" class="marketplace-btn">Заказать на Avito →</a>`
        : `<button class="marketplace-btn disabled">Avito — Скоро в продаже</button>`;

    const vkBtn = product.links.vk
        ? `<a href="${product.links.vk}" target="_blank" class="marketplace-btn">Обсудить в VK →</a>`
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
    const images = modal.querySelectorAll('.slider-image');
    const dots = modal.querySelectorAll('.slider-dot');

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
    const product = productsData[productId];
    const totalSlides = product.images.length;
    let newIndex = currentSlideIndex[productId] + direction;

    // Зацикливание слайдера
    if (newIndex < 0) newIndex = totalSlides - 1;
    if (newIndex >= totalSlides) newIndex = 0;

    showSlide(productId, newIndex);
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
