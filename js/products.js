// ============================================
// ЕДИНЫЙ ИСТОЧНИК ДАННЫХ КАТАЛОГА
// Все товары хранятся здесь. Каталог и модальные
// окна рендерятся из этого массива.
//
// Чтобы добавить товар — добавьте объект в массив.
// Порядок в массиве = порядок вывода на сайте.
// published: false — скрыть товар из каталога.
// ============================================

window.PRODUCTS = [
    {
        slug: 'klassika',
        name: 'Классика',
        category: 'bedding', // bedding | kitchen | fabrics
        price: 'от 7 400 ₽',
        shortDescription: 'Коричневый, 100% хлопок',
        fullDescription: 'Премиальный комплект постельного белья "Классика". Этот комплект создан для тех, кто ценит безупречный стиль, лаконичность и атмосферу уединенного пятизвездочного отеля в собственной спальне. Дизайн текстиля построен на утонченном сочетании благородных кофейно-бежевых оттенков и выверенной геометрии, что делает его идеальным элементом интерьеров в стиле «тихой роскоши» (Quiet Luxury) или скандинавского минимализма.',
        mainImage: './collections/klassika/1.jpg',
        colors: [
            { name: 'Коричневый', hex: '#8B4513', image: './collections/klassika/1.jpg' }
        ],
        images: [
            './collections/klassika/1.jpg',
            './collections/klassika/2.jpg',
            './collections/klassika/3.jpg',
            './collections/klassika/4.jpg',
            './collections/klassika/5.jpg'
        ],
        sizes: ['1,5-спальный', '2-спальный', 'Евро', 'Семейный'],
        links: {
            ozon: null, // Скоро в продаже
            avito: 'https://www.avito.ru/yaroslavl/mebel_i_interer/komplekt_postelnogo_belya_iz_varenogo_hlopka_evro_8022702183',
            vk: 'https://vk.ru/market/product/komplekt-postelnogo-belya-quotklassikaquot-193576979-12351867'
        },
        published: true
    },
    {
        slug: 'provans',
        name: 'Прованс',
        category: 'bedding',
        price: 'от 15 000 ₽',
        shortDescription: 'Голубой, белый, 100% хлопок',
        fullDescription: 'Романтичный комплект постельного белья "Прованс". Этот комплект создан для тех, кто хочет наполнить спальню атмосферой утонченного загородного уюта, тепла и французского шарма. Дизайн текстиля сочетает в себе классический пасторальный рисунок, нежную палитру и воздушные декоративные элементы, превращающие кровать в главное украшение интерьера. Комплект идеально вписывается в спальни в стиле прованс, классика, шебби-шик или скандинавский кантри.',
        mainImage: './collections/provans/1.jpg',
        colors: [
            { name: 'Голубой', hex: '#87CEEB', image: './collections/provans/1.jpg' },
            { name: 'Коричневый', hex: '#8B4513', image: './collections/provans/2.jpg' }
        ],
        images: [
            './collections/provans/1.jpg',
            './collections/provans/2.jpg',
            './collections/provans/3.jpg'
        ],
        sizes: ['1,5-спальный', '2-спальный', 'Евро', 'Семейный'],
        links: {
            ozon: null, // Скоро в продаже
            avito: null, // Скоро в продаже
            vk: 'https://vk.ru/market/product/komplekt-postelnogo-belya-quotprovansquot-193576979-12351886'
        },
        published: true
    },
    {
        slug: 'sharm',
        name: 'Шарм',
        category: 'bedding',
        price: 'от 14 600 ₽',
        shortDescription: 'Шалфей, зеленый, 100% хлопок',
        fullDescription: 'Дизайнерский комплект постельного белья "Шарм". Этот комплект создан для того, чтобы превратить спальню в оазис гармонии, загородного уюта и безупречного европейского стиля. Сочетание благородного оливково-зеленого оттенка, классической клетки и воздушных текстильных элементов наполняет интерьер природной свежестью, легкостью и особенным домашним теплом. Дизайн комплекта идеально дополнит интерьеры в стиле прованс, кантри, шебби-шик или скандинавский минимализм с акцентом на уют.',
        mainImage: './collections/sharm/1.jpg',
        colors: [
            { name: 'Зеленый', hex: '#8FBC8F', image: './collections/sharm/1.jpg' }
        ],
        images: [
            './collections/sharm/1.jpg',
            './collections/sharm/2.jpg',
            './collections/sharm/3.jpg',
            './collections/sharm/4.jpg'
        ],
        sizes: ['1,5-спальный', '2-спальный', 'Евро', 'Семейный'],
        links: {
            ozon: null, // Скоро в продаже
            avito: null, // Скоро в продаже
            vk: 'https://vk.ru/market/product/komplekt-postelnogo-belya-quotsharmquot-193576979-12230166'
        },
        published: true
    }
];
