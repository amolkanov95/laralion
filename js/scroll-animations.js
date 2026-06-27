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
// Десктоп: активен кадр шага, чей центр ближе всего к линии активации.
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

    // Активный кадр = шаг, чей центр ближе всего к «линии активации» (доля высоты
    // вьюпорта). Сравнение по центру, а не по площади: когда два шага помещаются на
    // экране целиком, их ratio равны (1.0) и max-ratio залипал бы на раннем шаге,
    // переключая кадр лишь когда предыдущий шаг уползёт за верх экрана — отсюда
    // «последний кадр срабатывает поздно». Линия даёт ровный тайминг и симметрию
    // (вниз/вверх); пересчёт на каждом коллбэке устойчив к пакетной доставке событий.
    let currentFrame = 0;                       // совпадает с .is-active кадром 0 в HTML
    // Доля высоты вьюпорта. Чем ниже линия (больше значение), тем раньше при
    // прокрутке вниз кадр шага успевает оказаться ближе всего к ней — кадры
    // (в т.ч. последний, №3) сменяются раньше, не дожидаясь, пока раздел
    // почти полностью прокручен.
    const ACTIVATE_LINE = 0.62;

    // Дробный список порогов — частые коллбэки наблюдателя для плавного пересчёта.
    const thresholds = [];
    for (let i = 0; i <= 20; i++) thresholds.push(i / 20);

    const pickFrame = () => {
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const line = vh * ACTIVATE_LINE;
        let best = -1;
        let bestDist = Infinity;
        steps.forEach((s) => {
            const r = s.getBoundingClientRect();
            if (r.bottom <= 0 || r.top >= vh) return;      // шаг вне экрана — пропускаем
            const dist = Math.abs((r.top + r.bottom) / 2 - line);
            if (dist < bestDist) {
                bestDist = dist;
                best = +s.dataset.step;
            }
        });
        if (best !== -1 && best !== currentFrame) {
            currentFrame = best;
            setFrame(best);
        }
    };

    const storyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('in'); // текст проявляется и остаётся
        });
        pickFrame();
    }, { threshold: thresholds });

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
