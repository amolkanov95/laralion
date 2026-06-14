// ============================================
// SCROLL ANIMATIONS
// Fade-in + Blur Reveal при прокрутке
//
// Слушаем 'catalog:rendered' (не DOMContentLoaded): карточки товаров
// строятся асинхронно после загрузки products.json. Секции страницы
// анимирует main.js на DOMContentLoaded — здесь добавляются карточки.
// ============================================

// ============================================
// ПРИЁМ 1 — KINETIC-ЗАГОЛОВКИ
// Построчный reveal масок при попадании во вьюпорт. Заголовки — статичный
// HTML (не зависят от каталога), поэтому наблюдаем на DOMContentLoaded.
// Анимация один раз: unobserve после срабатывания. CLS=0 (см. animations.css).
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const lines = document.querySelectorAll('.kinetic-title .line-mask');
    if (!lines.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
        // Сразу показать содержимое без анимации
        lines.forEach((line) => line.classList.add('is-in'));
        return;
    }

    const kineticObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-in');
                kineticObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.25 });

    lines.forEach((line) => kineticObserver.observe(line));
});

document.addEventListener('catalog:rendered', () => {
    // Найти все секции для анимации
    const sections = document.querySelectorAll('#quality, #collections, #about, #gifting, #contacts');

    // Создать Intersection Observer
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 // Триггер при 10% видимости
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Отключить наблюдение после появления (анимация один раз)
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Добавить класс fade-in-section ко всем секциям
    sections.forEach(section => {
        section.classList.add('fade-in-section');
        observer.observe(section);
    });

    // Анимация для карточек товаров с задержкой
    const collectionCards = document.querySelectorAll('.collection-card');
    collectionCards.forEach((card, index) => {
        card.classList.add('fade-in-section', `fade-in-delay-${index + 1}`);
        observer.observe(card);
    });

    // Анимация для карточек преимуществ с задержкой
    const qualityCards = document.querySelectorAll('.quality-card');
    qualityCards.forEach((card, index) => {
        card.classList.add('fade-in-section', `fade-in-delay-${index + 1}`);
        observer.observe(card);
    });
});
