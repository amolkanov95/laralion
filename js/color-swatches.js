// ============================================
// ПЕРЕКЛЮЧЕНИЕ ЦВЕТОВ ТОВАРОВ
// Изменение главного фото при клике на кружок цвета
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Найти все кружки выбора цвета
    const colorSwatches = document.querySelectorAll('.color-swatch');

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', function() {
            // Получить родительскую карточку товара
            const card = this.closest('.collection-card');
            const image = card.querySelector('.collection-image');
            const allSwatches = card.querySelectorAll('.color-swatch');

            // Убрать активный класс со всех кружков
            allSwatches.forEach(s => s.classList.remove('active'));

            // Добавить активный класс к текущему кружку
            this.classList.add('active');

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
