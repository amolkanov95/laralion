// ============================================
// SMOOTH SCROLL (LENIS)
// Плавная прокрутка с инерцией
// ============================================

// Инициализация Lenis будет добавлена после подключения библиотеки через CDN
// Пока оставляем нативный smooth scroll через CSS (scroll-behavior: smooth в base.css)

// Плавная прокрутка к якорям при клике на меню
document.addEventListener('DOMContentLoaded', () => {
    const menuLinks = document.querySelectorAll('.header-nav a, .hero-cta, .btn[href^="#"]');

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            // Проверить, является ли ссылка якорем
            if (href && href.startsWith('#')) {
                e.preventDefault();

                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    // Плавная прокрутка к элементу
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
});

// TODO: Подключить библиотеку Lenis для более продвинутого плавного скролла
// <script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@latest/dist/lenis.min.js"></script>
//
// const lenis = new Lenis({
//     duration: 1.2,
//     easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
//     smooth: true
// });
//
// function raf(time) {
//     lenis.raf(time);
//     requestAnimationFrame(raf);
// }
//
// requestAnimationFrame(raf);
