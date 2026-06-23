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

            // Изменить изображение.
            // Смена привязана к ЗАГРУЗКЕ нового кадра, а не к таймеру: фото
            // комплектов — webp 150–370 КБ, и при первом выборе цвета (lazy,
            // ещё не в кэше) кадр не успевал декодироваться за 150 мс — старый
            // src возвращался видимым и «фото не менялось». Preload гарантирует,
            // что новый кадр готов до показа, независимо от кэша и скорости сети.
            const newImageSrc = this.getAttribute('data-image');
            if (newImageSrc && image.getAttribute('src') !== newImageSrc) {
                // Токен против гонки быстрых переключений: применяем только
                // последний выбор (ранние preload завершатся вхолостую).
                const token = (card._swatchToken || 0) + 1;
                card._swatchToken = token;

                const reveal = () => {
                    if (card._swatchToken !== token) return; // был более поздний клик
                    image.src = newImageSrc;
                    image.style.opacity = '1';
                };

                image.style.opacity = '0';      // плавно гасим старый кадр (CSS opacity 0.3s)
                const pre = new Image();
                pre.onload = reveal;
                pre.onerror = reveal;           // на ошибке не оставляем фото невидимым
                pre.src = newImageSrc;
                if (pre.complete) reveal();      // уже в кэше — onload может не сработать
            }
        });
    });
});
