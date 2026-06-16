// ============================================
// CATALOG FILTER
// Фильтрация карточек каталога по категориям.
// Слайдер-дорожка плавно гаснет (fade), карточки переключаются
// через .is-hidden, затем дорожка проявляется. После фильтрации
// диспатчится 'catalog:filtered' — слайдер сбрасывается на первую
// карточку и пересчитывает стрелки (см. catalog-slider.js).
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const filters = document.querySelectorAll('.catalog-filter');
    const grid = document.querySelector('.collections-grid');
    const emptyEl = document.querySelector('.catalog-empty');

    if (!filters.length || !grid) return;

    // Длительность согласована с opacity-переходом дорожки (0.25s в CSS)
    const DURATION = 250;

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

    // Переключить видимость карточек по категории и оповестить слайдер
    const apply = (category) => {
        cards().forEach(c => c.classList.toggle('is-hidden', !matches(c, category)));
        updateEmpty();
        document.dispatchEvent(new CustomEvent('catalog:filtered'));
    };

    const applyFilter = (category) => {
        // Без анимации для пользователей с prefers-reduced-motion
        if (prefersReduced()) {
            apply(category);
            return;
        }

        // Фаза 1: погасить дорожку → переключить карточки → проявить
        grid.classList.add('is-fading');
        setTimeout(() => {
            apply(category);
            requestAnimationFrame(() => grid.classList.remove('is-fading'));
        }, DURATION);
    };

    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('is-active')) return;

            filters.forEach(f => {
                f.classList.remove('is-active');
                f.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('is-active');
            btn.setAttribute('aria-pressed', 'true');

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