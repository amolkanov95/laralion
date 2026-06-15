// ============================================
// ПОЛНОЭКРАННЫЙ ПРОСМОТР ФОТО ТОВАРА (LIGHTBOX)
// Только тач-устройства. Открывается из modal.js тапом по фото.
//
// Точка входа: window.openLightbox({ images, startIndex, alt, onIndexChange })
//   images       — массив готовых URL (уже прошли через assetURL)
//   startIndex   — кадр, с которого открыть
//   alt          — alt-текст (SEO/доступность)
//   onIndexChange(i) — колбэк синхронизации: модалка остаётся на том же кадре
//
// Жесты: свайп ←/→ листать, pinch и двойной тап — зум,
// палец по увеличенному фото — панорамирование, свайп вниз — закрыть.
// Запасной выход — кнопка ×. Логика галереи берётся из modal.js (не дублируется).
// ============================================

(function lightboxModule() {
    const MAX_SCALE = 4;          // предел увеличения
    const DOUBLE_TAP_SCALE = 2.5; // зум по двойному тапу
    const SWIPE_COMMIT = 60;      // порог листания, px
    const CLOSE_COMMIT = 110;     // порог закрытия свайпом вниз, px
    const DIR_LOCK = 10;          // порог фиксации оси жеста, px
    const DOUBLE_TAP_MS = 300;    // окно двойного тапа
    const DOUBLE_TAP_DIST = 30;   // максимум смещения между тапами, px

    // --- Состояние сеанса ---
    let overlay, stage, imgEl, closeBtn, counterEl, dotsEl;
    let images = [];
    let index = 0;
    let altText = '';
    let onIndexChange = null;

    // Трансформа фото
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let renderedW = 0; // размер фото при scale=1 (после object-fit: contain)
    let renderedH = 0;

    // Жест
    let gesture = null; // { mode, ... }
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    let isAnimatingSlide = false;

    // --- Построение DOM (один раз, переиспользуется) ---
    function build() {
        overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.innerHTML = `
            <button class="lightbox-close" type="button" aria-label="Закрыть просмотр">×</button>
            <div class="lightbox-counter" aria-hidden="true"></div>
            <div class="lightbox-stage">
                <img class="lightbox-image" alt="">
            </div>
            <div class="lightbox-dots" aria-hidden="true"></div>
        `;
        document.body.appendChild(overlay);

        stage = overlay.querySelector('.lightbox-stage');
        imgEl = overlay.querySelector('.lightbox-image');
        closeBtn = overlay.querySelector('.lightbox-close');
        counterEl = overlay.querySelector('.lightbox-counter');
        dotsEl = overlay.querySelector('.lightbox-dots');

        closeBtn.addEventListener('click', close);

        // Жесты вешаем на оверлей (фото — pointer-events:none)
        overlay.addEventListener('touchstart', onTouchStart, { passive: false });
        overlay.addEventListener('touchmove', onTouchMove, { passive: false });
        overlay.addEventListener('touchend', onTouchEnd, { passive: false });
        overlay.addEventListener('touchcancel', onTouchEnd, { passive: false });

        // Кадр по размеру фото — пересчёт границ панорамирования
        imgEl.addEventListener('load', measureImage);
    }

    // --- Открытие / закрытие ---
    function open(opts) {
        if (!overlay) build();
        images = Array.isArray(opts.images) ? opts.images : [];
        if (!images.length) return;
        index = Math.min(Math.max(opts.startIndex || 0, 0), images.length - 1);
        altText = opts.alt || '';
        onIndexChange = typeof opts.onIndexChange === 'function' ? opts.onIndexChange : null;

        resetTransform(false);
        render();
        document.body.style.overflow = 'hidden';

        // Показ с анимацией прозрачности
        overlay.style.display = 'block';
        requestAnimationFrame(() => overlay.classList.add('active'));
    }

    function close() {
        if (!overlay) return;
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
            stage.style.transform = '';
            stage.classList.remove('animating');
            resetTransform(false);
            // Скролл body вернёт modal.js, если модалка ещё открыта; иначе снимаем сами
            if (!document.querySelector('.modal-overlay.active')) {
                document.body.style.overflow = '';
            }
        }, 300);
    }

    // --- Отрисовка кадра и индикаторов ---
    function render() {
        imgEl.src = images[index];
        imgEl.alt = altText;
        counterEl.textContent = `${index + 1} / ${images.length}`;
        counterEl.style.display = images.length > 1 ? '' : 'none';
        dotsEl.innerHTML = images.length > 1
            ? images.map((_, i) => `<span class="lightbox-dot${i === index ? ' active' : ''}"></span>`).join('')
            : '';
    }

    function measureImage() {
        // Реальный размер фото при scale=1 (object-fit: contain вписал в кадр)
        const r = imgEl.getBoundingClientRect();
        // При активной трансформе делим на текущий масштаб, чтобы получить базовый
        renderedW = r.width / (scale || 1);
        renderedH = r.height / (scale || 1);
    }

    // --- Трансформа фото ---
    function applyTransform(animate) {
        imgEl.classList.toggle('animating', !!animate);
        imgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
        overlay.classList.toggle('zoomed', scale > 1.01);
    }

    function resetTransform(animate) {
        scale = 1;
        panX = 0;
        panY = 0;
        applyTransform(animate);
    }

    // Границы панорамирования: фото нельзя увести за свои края
    function clampPan() {
        const stageW = stage.clientWidth;
        const stageH = stage.clientHeight;
        const maxX = Math.max(0, (renderedW * scale - stageW) / 2);
        const maxY = Math.max(0, (renderedH * scale - stageH) / 2);
        panX = Math.min(maxX, Math.max(-maxX, panX));
        panY = Math.min(maxY, Math.max(-maxY, panY));
    }

    // Зум вокруг точки экрана (focal) от текущего масштаба к target
    function zoomTo(target, focalX, focalY) {
        const stageW = stage.clientWidth;
        const stageH = stage.clientHeight;
        const cx = stageW / 2;
        const cy = stageH / 2;
        const newScale = Math.min(MAX_SCALE, Math.max(1, target));
        // Точка фото (от центра), оказавшаяся под пальцем, должна остаться на месте
        const imgX = (focalX - cx - panX) / scale;
        const imgY = (focalY - cy - panY) / scale;
        panX = focalX - cx - imgX * newScale;
        panY = focalY - cy - imgY * newScale;
        scale = newScale;
        if (scale <= 1.01) { scale = 1; panX = 0; panY = 0; }
        clampPan();
    }

    // --- Листание со сдвигом кадра ---
    function goTo(newIndex, dir) {
        if (images.length < 2) { snapStageBack(); return; }
        const W = stage.clientWidth;
        index = (newIndex + images.length) % images.length;
        if (onIndexChange) onIndexChange(index);

        isAnimatingSlide = true;
        // Текущий кадр уезжает в сторону свайпа
        stage.classList.add('animating');
        stage.style.transform = `translateX(${-dir * W}px)`;

        const onDone = () => {
            stage.removeEventListener('transitionend', onDone);
            stage.classList.remove('animating');
            // Подменяем фото и заводим новый кадр с противоположной стороны
            render();
            resetTransform(false);
            stage.style.transform = `translateX(${dir * W}px)`;
            // reflow перед анимацией въезда
            void stage.offsetWidth;
            stage.classList.add('animating');
            stage.style.transform = 'translateX(0)';
            const onIn = () => {
                stage.removeEventListener('transitionend', onIn);
                stage.classList.remove('animating');
                stage.style.transform = '';
                isAnimatingSlide = false;
            };
            stage.addEventListener('transitionend', onIn);
        };
        stage.addEventListener('transitionend', onDone);
    }

    function snapStageBack() {
        stage.classList.add('animating');
        stage.style.transform = 'translateX(0)';
        const onDone = () => {
            stage.removeEventListener('transitionend', onDone);
            stage.classList.remove('animating');
            stage.style.transform = '';
        };
        stage.addEventListener('transitionend', onDone);
    }

    // --- Обработка касаний ---
    function dist(t1, t2) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.hypot(dx, dy);
    }
    function mid(t1, t2) {
        return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
    }

    function onTouchStart(e) {
        if (e.target === closeBtn) return; // кнопке × не мешаем
        if (isAnimatingSlide) return;

        if (e.touches.length === 2) {
            // Старт pinch-зума
            const m = mid(e.touches[0], e.touches[1]);
            gesture = {
                mode: 'pinch',
                startDist: dist(e.touches[0], e.touches[1]),
                startScale: scale,
                focalX: m.x,
                focalY: m.y
            };
            imgEl.classList.remove('animating');
        } else if (e.touches.length === 1) {
            const t = e.touches[0];
            gesture = {
                mode: scale > 1 ? 'pan' : 'undecided', // при зуме сразу панорамируем
                startX: t.clientX,
                startY: t.clientY,
                startPanX: panX,
                startPanY: panY,
                startTime: Date.now()
            };
            imgEl.classList.remove('animating');
        }
    }

    function onTouchMove(e) {
        if (!gesture || isAnimatingSlide) return;
        e.preventDefault();

        if (gesture.mode === 'pinch' && e.touches.length === 2) {
            const d = dist(e.touches[0], e.touches[1]);
            const factor = d / (gesture.startDist || d);
            zoomTo(gesture.startScale * factor, gesture.focalX, gesture.focalY);
            applyTransform(false);
            return;
        }

        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = t.clientX - gesture.startX;
        const dy = t.clientY - gesture.startY;

        // Фиксация оси для одиночного пальца при scale=1
        if (gesture.mode === 'undecided') {
            if (Math.abs(dx) < DIR_LOCK && Math.abs(dy) < DIR_LOCK) return;
            gesture.mode = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        }

        if (gesture.mode === 'pan') {
            panX = gesture.startPanX + dx;
            panY = gesture.startPanY + dy;
            clampPan();
            applyTransform(false);
        } else if (gesture.mode === 'horizontal') {
            // Тянем кадр за пальцем
            stage.style.transform = `translateX(${dx}px)`;
        } else if (gesture.mode === 'vertical') {
            // Свайп вниз к закрытию: фото оттягивается, фон гаснет
            const down = Math.max(0, dy);
            stage.style.transform = `translateY(${dy}px)`;
            overlay.style.opacity = String(Math.max(0.3, 1 - down / (CLOSE_COMMIT * 3)));
        }
    }

    function onTouchEnd(e) {
        if (!gesture || isAnimatingSlide) {
            gesture = null;
            return;
        }
        // Пальцы ещё на экране (например, отпустили один из двух) — переинициализируем
        if (e.touches.length > 0) {
            if (e.touches.length === 1) {
                const t = e.touches[0];
                gesture = {
                    mode: scale > 1 ? 'pan' : 'undecided',
                    startX: t.clientX,
                    startY: t.clientY,
                    startPanX: panX,
                    startPanY: panY,
                    startTime: Date.now()
                };
            }
            return;
        }

        const mode = gesture.mode;
        const elapsed = Date.now() - gesture.startTime;

        if (mode === 'pinch' || mode === 'pan') {
            // По завершении пинча/панорамирования сглаживаем границы
            if (scale <= 1.01) resetTransform(true);
            else { clampPan(); applyTransform(true); }
            gesture = null;
            return;
        }

        if (mode === 'horizontal') {
            const dx = (e.changedTouches[0].clientX) - gesture.startX;
            if (Math.abs(dx) > SWIPE_COMMIT) {
                const dir = dx < 0 ? 1 : -1; // влево → следующий
                goTo(index + dir, dir);
            } else {
                snapStageBack();
            }
            gesture = null;
            return;
        }

        if (mode === 'vertical') {
            const dy = (e.changedTouches[0].clientY) - gesture.startY;
            if (dy > CLOSE_COMMIT) {
                close();
            } else {
                // Возврат на место
                stage.classList.add('animating');
                stage.style.transform = 'translateY(0)';
                overlay.style.opacity = '1';
                const onDone = () => {
                    stage.removeEventListener('transitionend', onDone);
                    stage.classList.remove('animating');
                    stage.style.transform = '';
                };
                stage.addEventListener('transitionend', onDone);
            }
            gesture = null;
            return;
        }

        // Не было заметного движения → это тап. Проверяем двойной тап (зум).
        if (mode === 'undecided' && elapsed < DOUBLE_TAP_MS) {
            const t = e.changedTouches[0];
            const now = Date.now();
            const near = Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < DOUBLE_TAP_DIST;
            if (now - lastTapTime < DOUBLE_TAP_MS && near) {
                // Двойной тап: переключаем зум
                if (scale > 1) resetTransform(true);
                else { zoomTo(DOUBLE_TAP_SCALE, t.clientX, t.clientY); applyTransform(true); }
                lastTapTime = 0;
            } else {
                lastTapTime = now;
                lastTapX = t.clientX;
                lastTapY = t.clientY;
            }
        }
        gesture = null;
    }

    // Закрытие по Escape (на случай тач-ноутбуков с клавиатурой)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) {
            close();
        }
    });

    // Экспорт точки входа
    window.openLightbox = open;
})();