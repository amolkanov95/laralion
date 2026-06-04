// ============================================
// CATALOG FILTER
// Фильтрация карточек каталога по категориям
// с плавным перестроением сетки (FLIP)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const filters = document.querySelectorAll('.catalog-filter');
    const grid = document.querySelector('.collections-grid');
    const emptyEl = document.querySelector('.catalog-empty');

    if (!filters.length || !grid) return;

    // Длительность согласована с --transition-normal (0.3s)
    const DURATION = 300;

    const prefersReduced = () =>
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cards = () => Array.from(grid.querySelectorAll('.collection-card'));

    const matches = (card, category) =>
        category === 'all' || card.dataset.category === category;

    // Показать заглушку «Скоро появится», если видимых карточек нет
    const updateEmpty = () => {
        if (!emptyEl) return;
        const anyVisible = cards().some(c => !c.classList.contains('is-hidden'));
        emptyEl.hidden = anyVisible;
    };

    // Снять временные классы анимации после её завершения
    const cleanup = (list) => {
        setTimeout(() => {
            list.forEach(c => {
                c.classList.remove('is-filtering', 'is-fading');
                c.style.transform = '';
            });
        }, DURATION + 50);
    };

    const applyFilter = (category) => {
        const all = cards();

        // Без анимации для пользователей с prefers-reduced-motion
        if (prefersReduced()) {
            all.forEach(c => c.classList.toggle('is-hidden', !matches(c, category)));
            updateEmpty();
            return;
        }

        const visibleNow = all.filter(c => !c.classList.contains('is-hidden'));
        const toHide = visibleNow.filter(c => !matches(c, category));
        const staying = visibleNow.filter(c => matches(c, category));
        const toShow = all.filter(c => matches(c, category) && c.classList.contains('is-hidden'));

        // FIRST: позиции остающихся карточек до перестроения
        const firstRects = new Map();
        staying.forEach(c => firstRects.set(c, c.getBoundingClientRect()));

        const reflow = () => {
            // Окончательно спрятать ушедшие карточки
            toHide.forEach(c => {
                c.classList.add('is-hidden');
                c.classList.remove('is-filtering', 'is-fading');
                c.style.transform = '';
            });

            // Подготовить появляющиеся (видимы, но прозрачны и уменьшены)
            toShow.forEach(c => {
                c.classList.remove('is-hidden');
                c.classList.add('is-filtering', 'is-fading');
            });

            // LAST + INVERT: сместить остающиеся в старые позиции
            staying.forEach(c => {
                const first = firstRects.get(c);
                const last = c.getBoundingClientRect();
                const dx = first.left - last.left;
                const dy = first.top - last.top;
                if (dx || dy) {
                    c.classList.add('is-filtering');
                    c.style.transform = `translate(${dx}px, ${dy}px)`;
                }
            });

            // PLAY: плавный переезд на места + проявление новых
            requestAnimationFrame(() => {
                staying.forEach(c => { c.style.transform = ''; });
                toShow.forEach(c => c.classList.remove('is-fading'));
            });

            updateEmpty();
            cleanup([...staying, ...toShow]);
        };

        if (toHide.length) {
            // Фаза 1: плавно растворить уходящие карточки
            toHide.forEach(c => c.classList.add('is-filtering', 'is-fading'));
            setTimeout(reflow, DURATION);
        } else {
            reflow();
        }
    };

    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('is-active')) return;

            filters.forEach(f => {
                f.classList.remove('is-active');
                f.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('is-active');
            btn.setAttribute('aria-selected', 'true');

            applyFilter(btn.dataset.filter);
        });
    });

    // Скрыть вкладки категорий, в которых нет ни одного товара
    // (вкладка «Все» остаётся всегда). Пересчёт по реальным данным каталога.
    const syncFilterVisibility = () => {
        const present = new Set(cards().map(c => c.dataset.category));
        filters.forEach(btn => {
            if (btn.dataset.filter === 'all') return;
            btn.hidden = !present.has(btn.dataset.filter);
        });
    };

    // Карточки рендерятся асинхронно (см. catalog-render.js). Ждём событие;
    // если каталог уже отрисован к этому моменту — синхронизируем сразу.
    document.addEventListener('catalog:rendered', syncFilterVisibility);
    if (cards().length) syncFilterVisibility();
});
