// ============================================
// AWWWARDS-ЭФФЕКТЫ (приёмы 2, 4)
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

    // ---- ПРИЁМ 12: прелоадер-вуаль ----
    // В начале IIFE — до остального кода, чтобы вуаль снималась даже если
    // последующие эффекты упадут. Запуск на первом кадре (rAF), не ждём
    // window.load. Вуаль уходит, когда выполнены ОБА условия: прошёл минимум
    // показа бренда (HOLD) И готов первый экран (hero-изображение + шрифты),
    // но в любом случае не позже жёсткого потолка (CAP). Inline-failsafe
    // в <body> (2.5с) подстрахует, если этот модуль не загрузится.
    const pre = document.getElementById('preloader');
    if (pre) {
        if (reduce) {
            pre.remove();                       // без анимации — сразу убрать
        } else {
            const HOLD = 500;                   // минимум показа бренда
            const CAP = 2000;                   // потолок ожидания готовности
            let lifted = false;

            const lift = () => {
                if (lifted) return;
                lifted = true;
                pre.classList.add('lift');      // вуаль уходит вверх
                window.setTimeout(() => pre.remove(), 800); // после CSS-transition (.8s)
            };

            // Готовность первого экрана: hero-изображение + шрифты бренда/заголовка.
            const heroImg = document.querySelector('#hero .hero-bg img');
            const imgReady = (heroImg && !heroImg.complete)
                ? new Promise((res) => {
                    heroImg.addEventListener('load', res, { once: true });
                    heroImg.addEventListener('error', res, { once: true });
                })
                : Promise.resolve();
            const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

            window.requestAnimationFrame(() => {
                pre.classList.add('reveal');    // проявить бренд
                const held = new Promise((res) => window.setTimeout(res, HOLD));
                // Уйти, когда показали минимум И первый экран готов…
                Promise.all([held, imgReady, fontsReady]).then(lift);
                // …но не позже жёсткого потолка, что бы ни случилось.
                window.setTimeout(lift, CAP);
            });
        }
    }

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
                    /* Фото движется в ту же сторону, что hero (data-px),
                       только мягче (0.6) — единое направление параллакса */
                    const y = it.photo ? offset * 0.6 : offset;
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

    // ---- ПРИЁМ 15: кнопка «вверх» с кольцом прогресса (все устройства) ----
    // Собственный rAF-throttled слушатель scroll (не связан с параллаксом
    // приёма 4). Кольцо — единственный индикатор прогресса прокрутки.
    const toTop = document.getElementById('toTop');
    const ring = document.getElementById('ringFill');
    if (toTop && ring) {
        const C = 2 * Math.PI * 25;            // длина окружности r=25 ≈ 157.1
        ring.style.strokeDasharray = C.toFixed(1);
        ring.style.strokeDashoffset = C.toFixed(1);

        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                const h = document.documentElement;
                const max = h.scrollHeight - h.clientHeight;
                const p = max > 0 ? h.scrollTop / max : 0;
                ring.style.strokeDashoffset = (C * (1 - p)).toFixed(1);   // заполнение кольца
                toTop.classList.toggle('show', h.scrollTop > h.clientHeight * 0.6);
                ticking = false;
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        onScroll();

        toTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        });
    }
})();