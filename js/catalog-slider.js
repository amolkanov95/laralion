// ============================================
// CATALOG SLIDER
// Горизонтальный слайдер-лукбук каталога.
//
// Десктоп (>768px): transform-дорожка. В окне видно 3 карточки,
// стрелки листают по одной (упругая cubic-bezier задана в CSS).
// Мобильный (<=768px): нативный scroll-snap свайп (см. collections.css) —
// JS только прячет стрелки и не трогает transform.
//
// Карточки рендерятся асинхронно (catalog-render.js) и фильтруются
// (catalog-filter.js). Слайдер пересчитывается на событиях
// 'catalog:rendered' и 'catalog:filtered'.
// ============================================

(function catalogSlider() {
    const track = document.querySelector('.collections-grid');
    const prevBtn = document.querySelector('.catalog-arrow--prev');
    const nextBtn = document.querySelector('.catalog-arrow--next');
    if (!track || !prevBtn || !nextBtn) return;

    const PER_VIEW = 3;             // карточек в окне на десктопе
    const mqMobile = window.matchMedia('(max-width: 768px)');
    const prefersReduced = () =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let index = 0; // индекс крайней левой видимой карточки

    // Видимые карточки (не скрытые фильтром)
    const visibleCards = () =>
        Array.from(track.querySelectorAll('.collection-card'))
            .filter((c) => !c.classList.contains('is-hidden'));

    // Шаг сдвига = ширина карточки + gap (из реального layout)
    const stepWidth = (cards) => {
        if (cards.length < 2) {
            return cards.length ? cards[0].getBoundingClientRect().width : 0;
        }
        // Расстояние между левыми краями двух соседних карточек = ширина + gap
        return cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left;
    };

    const maxIndex = (count) => Math.max(0, count - PER_VIEW);

    // Применить позицию дорожки и состояние стрелок
    const update = () => {
        const cards = visibleCards();
        const count = cards.length;

        // Мобильный режим: рулит scroll-snap, transform сбрасываем
        if (mqMobile.matches) {
            track.style.transform = '';
            prevBtn.hidden = true;
            nextBtn.hidden = true;
            return;
        }

        // Десктоп: ≤3 карточек — листать нечего
        if (count <= PER_VIEW) {
            index = 0;
            track.style.transform = 'translateX(0)';
            prevBtn.hidden = true;
            nextBtn.hidden = true;
            return;
        }

        const max = maxIndex(count);
        if (index > max) index = max;
        if (index < 0) index = 0;

        const offset = index * stepWidth(cards);

        if (prefersReduced()) {
            const prev = track.style.transition;
            track.style.transition = 'none';
            track.style.transform = `translateX(${-offset}px)`;
            // Вернуть переход на следующий кадр
            requestAnimationFrame(() => { track.style.transition = prev; });
        } else {
            track.style.transform = `translateX(${-offset}px)`;
        }

        // Стрелка скрывается полностью, когда листать в эту сторону некуда
        prevBtn.hidden = index === 0;
        nextBtn.hidden = index === max;
    };

    const go = (delta) => {
        const count = visibleCards().length;
        const max = maxIndex(count);
        const next = Math.min(Math.max(index + delta, 0), max);
        if (next === index) return;
        index = next;
        update();
    };

    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));

    // Сброс на первую карточку (после смены категории)
    const reset = () => {
        index = 0;
        if (!mqMobile.matches) track.scrollLeft = 0;
        update();
    };

    // Пересчёт при ресайзе (debounce) и при смене десктоп/мобайл
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(update, 150);
    });
    if (mqMobile.addEventListener) {
        mqMobile.addEventListener('change', reset);
    } else if (mqMobile.addListener) {
        mqMobile.addListener(reset); // старые браузеры
    }

    document.addEventListener('catalog:rendered', update);
    document.addEventListener('catalog:filtered', reset);

    // Если каталог уже отрисован к моменту загрузки скрипта
    if (visibleCards().length) update();
})();