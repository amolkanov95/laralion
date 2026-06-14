// ============================================
// AWWWARDS-ЭФФЕКТЫ (приёмы 2, 4 + подсказка к приёму 3)
//   2 — магнитные кнопки (притяжение CTA к курсору)
//   4 — мягкий параллакс hero-фона и крупных фото
//   3* — разовая авто-демонстрация image-mask hover на первой карточке
//        (намёк пользователю, что вуаль поднимается при наведении)
//
// Самодостаточный модуль (IIFE). Подключается ПОСЛЕ main.js.
// Внешних зависимостей нет. Эффекты включаются только при выполнении
// медиа-условий: десктоп + наведение мышью + отсутствие prefers-reduced-motion.
// Анимируются только transform/opacity. Параметры — из demo-awwwards.html.
// ============================================

(function () {
    'use strict';

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = window.matchMedia('(hover: hover)').matches;
    const isDesktop = window.matchMedia('(min-width: 769px)').matches;

    // ---- ПРИЁМ 2: магнитные кнопки (только десктоп + мышь) ----
    if (canHover && isDesktop && !reduce) {
        document.querySelectorAll('[data-magnetic]').forEach((btn) => {
            const label = btn.querySelector('.m-label');
            const strength = 0.18;       // сила притяжения кнопки (смягчена с 0.4)
            const labelStrength = 0.10;  // сила сдвига подписи (параллакс-эффект)
            const maxShift = 14;         // потолок смещения, px (clamp по обеим осям)
            const clamp = (v) => Math.max(-maxShift, Math.min(maxShift, v));

            btn.addEventListener('mousemove', (ev) => {
                const r = btn.getBoundingClientRect();
                const x = ev.clientX - (r.left + r.width / 2);
                const y = ev.clientY - (r.top + r.height / 2);
                btn.style.transform = `translate(${clamp(x * strength)}px, ${clamp(y * strength)}px)`;
                if (label) {
                    label.style.transform = `translate(${clamp(x * labelStrength)}px, ${clamp(y * labelStrength)}px)`;
                }
            });

            btn.addEventListener('mouseleave', () => {
                btn.style.transform = '';
                if (label) label.style.transform = '';
            });
        });
    }

    // ---- ПРИЁМ 4: мягкий параллакс на requestAnimationFrame (только десктоп) ----
    if (isDesktop && !reduce) {
        const items = [...document.querySelectorAll('[data-px],[data-px-photo]')].map((el) => ({
            el,
            speed: parseFloat(el.dataset.px ?? el.dataset.pxPhoto),
            photo: el.hasAttribute('data-px-photo')
        }));

        if (items.length) {
            let ticking = false;

            const update = () => {
                const vh = window.innerHeight;
                items.forEach((it) => {
                    const r = it.el.getBoundingClientRect();
                    if (r.bottom < -200 || r.top > vh + 200) return; // вне зоны — пропуск
                    const center = r.top + r.height / 2;
                    const offset = (center - vh / 2) * it.speed;
                    const y = it.photo ? -offset * 0.6 : offset;
                    it.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
                });
                ticking = false;
            };

            const onScroll = () => {
                if (!ticking) {
                    window.requestAnimationFrame(update);
                    ticking = true;
                }
            };

            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll, { passive: true });
            update(); // стартовая раскладка (offset≈0 у hero → без CLS)
        }
    }

    // ---- ПРИЁМ 3* (подсказка): авто-демонстрация подъёма вуали ----
    // Один раз при первом появлении каталога первая видимая карточка сама
    // проигрывает hover-механику (вуаль вверх + фото в цвет) и плавно
    // возвращается — намёк, что эффект реагирует на курсор. Только десктоп
    // с мышью без reduced-motion; на мобайле/сенсоре не запускается.
    if (canHover && isDesktop && !reduce) {
        document.addEventListener('catalog:rendered', () => {
            const grid = document.querySelector('.collections-grid');
            if (!grid || !('IntersectionObserver' in window)) return;

            const firstCard = grid.querySelector('.collection-card:not(.is-hidden)');
            if (!firstCard) return;

            let done = false;       // подсказка проигрывается единожды за загрузку
            let cancelled = false;  // пользователь сам навёл курсор → подсказка не нужна

            grid.addEventListener('mouseover', () => { cancelled = true; }, { once: true });

            const play = () => {
                if (done || cancelled) return;
                done = true;
                // Раскрытие через те же transition (0.9s), что и hover (collections.css)
                firstCard.classList.add('is-hinting');
                // Держим раскрытым ~0.7s, затем плавный возврат (ещё 0.9s)
                window.setTimeout(() => firstCard.classList.remove('is-hinting'), 1600);
            };

            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        io.unobserve(entry.target);
                        // Пауза, чтобы взгляд успел переместиться на каталог
                        window.setTimeout(play, 500);
                    }
                });
            }, { threshold: 0.5 });

            io.observe(firstCard);
        }, { once: true });
    }
})();