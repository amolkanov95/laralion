// ============================================
// AWWWARDS-ЭФФЕКТЫ (приёмы 2 и 4)
//   2 — магнитные кнопки (притяжение CTA к курсору)
//   4 — мягкий параллакс hero-фона и крупных фото
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
})();