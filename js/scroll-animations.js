// ============================================
// SCROLL ANIMATIONS
// Fade-in + Blur Reveal при прокрутке
//
// Единый источник анимаций появления (раньше дублировалось в main.js).
// Секции и карточки преимуществ — статичный HTML, наблюдаются на
// DOMContentLoaded (анимируются даже при сбое загрузки каталога).
// Карточки товаров рендерятся асинхронно (products.json) — подключаются
// на событие 'catalog:rendered'.
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

// Единый наблюдатель появления: добавляет .visible один раз и отписывается.
const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            fadeObserver.unobserve(entry.target);
        }
    });
}, { root: null, rootMargin: '0px', threshold: 0.1 });

// Подключить элемент к наблюдателю с каскадной задержкой.
// Цикл задержек 1→2→3→4 (в CSS определены .fade-in-delay-1..4),
// поэтому индекс берётся по модулю — корректно при любом числе элементов.
const observeWithDelay = (el, index) => {
    el.classList.add('fade-in-section', `fade-in-delay-${(index % 4) + 1}`);
    fadeObserver.observe(el);
};

// Секции и карточки преимуществ — статичный HTML: наблюдаем сразу,
// не дожидаясь каталога (анимируются даже при сбое загрузки products.json).
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#quality, #collections, #about, #gifting, #contacts')
        .forEach(section => {
            section.classList.add('fade-in-section');
            fadeObserver.observe(section);
        });

    document.querySelectorAll('.quality-card').forEach(observeWithDelay);
});

// Карточки товаров строятся асинхронно — подключаем после рендера каталога.
document.addEventListener('catalog:rendered', () => {
    document.querySelectorAll('.collection-card').forEach(observeWithDelay);
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
