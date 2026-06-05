// ============================================
// ПЕРЕКЛЮЧЕНИЕ ЦВЕТОВ ТОВАРОВ
// Изменение главного фото при клике на кружок цвета
//
// Слушаем 'catalog:rendered' (не DOMContentLoaded): карточки строятся
// асинхронно после загрузки products.json, поэтому к DOMContentLoaded
// кружков .color-swatch в DOM ещё нет.
// ============================================

document.addEventListener('catalog:rendered', () => {
    // Найти все кружки выбора цвета
    const colorSwatches = document.querySelectorAll('.color-swatch');

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', function() {
            // Получить родительскую карточку товара
            const card = this.closest('.collection-card');
            const image = card.querySelector('.collection-image');
            const description = card.querySelector('.collection-description');
            const allSwatches = card.querySelectorAll('.color-swatch');

            // Убрать активный класс со всех кружков
            allSwatches.forEach(s => s.classList.remove('active'));

            // Добавить активный класс к текущему кружку
            this.classList.add('active');

            // Сменить краткое описание на текст выбранного цвета
            const newDescription = this.getAttribute('data-description');
            if (description && newDescription !== null) {
                description.textContent = newDescription;
            }

            // Изменить изображение
            const newImageSrc = this.getAttribute('data-image');
            image.src = newImageSrc;

            // Плавная анимация смены изображения
            image.style.opacity = '0';
            setTimeout(() => {
                image.style.opacity = '1';
            }, 150);
        });
    });
});
