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

// ============================================
// STORY-СЕКЦИЯ — sticky-смена фото по шагам
// Десктоп: при входе шага в кадр активируется соответствующий кадр фото.
// Мобайл: фото внутри шагов (CSS), JS только подсвечивает шаги.
// reduce: первый кадр активен, все шаги показаны, без наблюдателя.
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('#story .story-step');
    if (!steps.length) return;

    const frames = document.querySelectorAll('#story .story-frame');
    const badge = document.getElementById('storyBadge');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setFrame = (idx) => {
        frames.forEach((f) => f.classList.toggle('is-active', +f.dataset.frame === idx));
        if (badge) badge.textContent = `Шаг ${idx + 1} / ${frames.length}`;
    };

    if (reduce) {
        steps.forEach((s) => s.classList.add('in'));
        if (frames.length) {
            frames.forEach((f, i) => f.classList.toggle('is-active', i === 0));
        }
        return;
    }

    const storyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                setFrame(+entry.target.dataset.step);
            }
        });
    }, { threshold: 0.6 });

    steps.forEach((s) => storyObserver.observe(s));
});

// ============================================
// ПРИЁМ 7 — ЗОЛОТЫЕ РАЗДЕЛИТЕЛИ «рисуют себя»
// Только элементы с классом .gold-divider--draw. Один раз (unobserve).
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const dividers = document.querySelectorAll('.gold-divider--draw');
    if (!dividers.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
        dividers.forEach((d) => d.classList.add('is-drawn'));
        return;
    }

    const dObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-drawn');
                dObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    dividers.forEach((d) => dObserver.observe(d));
});
