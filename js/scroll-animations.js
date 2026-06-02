// ============================================
// SCROLL ANIMATIONS
// Fade-in + Blur Reveal при прокрутке
// ============================================

document.addEventListener('DOMContentLoaded', () => {
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
