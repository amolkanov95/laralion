// ============================================
// MAIN.JS
// Инициализация всех модулей
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🦁 Lara Lion — сайт загружен');

    // Инициализация плавного скролла
    initSmoothScroll();

    // Инициализация мобильного меню
    initMobileMenu();

    // Инициализация анимаций при прокрутке
    initScrollAnimations();

    // Инициализация переключения цветов товаров
    initColorSwatches();

    // Добавить класс для колыхания декоративных элементов
    const floralDecor = document.querySelector('.about-decor');
    if (floralDecor) {
        floralDecor.classList.add('floral-decor');
    }
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

// Анимации при прокрутке
function initScrollAnimations() {
    const sections = document.querySelectorAll('#quality, #collections, #about, #gifting, #contacts');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        section.classList.add('fade-in-section');
        observer.observe(section);
    });

    // Анимация карточек с задержкой
    const cards = document.querySelectorAll('.collection-card, .quality-card');
    cards.forEach((card, index) => {
        card.classList.add('fade-in-section', `fade-in-delay-${(index % 4) + 1}`);
        observer.observe(card);
    });
}

// Переключение цветов товаров
function initColorSwatches() {
    const colorSwatches = document.querySelectorAll('.color-swatch');

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', function() {
            const card = this.closest('.collection-card');
            const image = card.querySelector('.collection-image');
            const allSwatches = card.querySelectorAll('.color-swatch');

            allSwatches.forEach(s => s.classList.remove('active'));
            this.classList.add('active');

            const newImageSrc = this.getAttribute('data-image');
            image.style.opacity = '0';

            setTimeout(() => {
                image.src = newImageSrc;
                image.style.opacity = '1';
            }, 150);
        });
    });
}

// Обработка кликов по кнопкам размеров в модальных окнах
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('size-btn')) {
        const modal = e.target.closest('.modal-container');
        const allSizeBtns = modal.querySelectorAll('.size-btn');

        allSizeBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    }
});
