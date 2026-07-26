// ============================================
// MAIN.JS
// Инициализация всех модулей
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Плавный скролл к якорям (единый источник — см. ниже)
    initSmoothScroll();

    // Мобильное меню
    initMobileMenu();
});

// Плавный скролл к якорям
function initSmoothScroll() {
    const menuLinks = document.querySelectorAll('.header-nav a, .mobile-menu-nav a, .hero-cta, .btn[href^="#"]');

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            if (href && href.startsWith('#')) {
                e.preventDefault();

                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

// Мобильное меню: открытие, закрытие, блокировка прокрутки
function initMobileMenu() {
    const burger = document.querySelector('.header-burger');
    const menu = document.getElementById('mobile-menu');
    const closeBtn = document.querySelector('.mobile-menu-close');

    if (!burger || !menu) return;

    const openMenu = () => {
        menu.classList.add('open');
        document.body.classList.add('menu-open');
        burger.setAttribute('aria-expanded', 'true');
        menu.setAttribute('aria-hidden', 'false');
    };

    const closeMenu = () => {
        menu.classList.remove('open');
        document.body.classList.remove('menu-open');
        burger.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
    };

    burger.addEventListener('click', openMenu);

    if (closeBtn) {
        closeBtn.addEventListener('click', closeMenu);
    }

    // Клик по ссылке: закрыть меню (плавный скролл уже навешен в initSmoothScroll)
    menu.querySelectorAll('.mobile-menu-nav a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Закрытие по клавише Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('open')) {
            closeMenu();
        }
    });
}

