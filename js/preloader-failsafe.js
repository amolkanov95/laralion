// ============================================
// Failsafe прелоадера: гарантированно снять вуаль не позже 2.5с,
// даже если awwwards-effects.js по какой-то причине не отработал.
// Вынесено из инлайна index.html ради строгой CSP (script-src 'self').
// ============================================
setTimeout(function () {
    var p = document.getElementById('preloader');
    if (p) p.classList.add('lift');
}, 2500);
