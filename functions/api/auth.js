// ============================================
// Cloudflare Pages Function — старт входа GitHub OAuth для Decap CMS.
// Путь: /api/auth (Decap открывает его в всплывающем окне при нажатии «Login».)
//
// Заменяет вход через Netlify: токен выдаёт этот эндпоинт + /api/callback,
// поэтому админка работает на любом хостинге (Cloudflare Pages, GitHub Pages).
//
// Секреты задаются в настройках проекта Cloudflare Pages → Environment variables:
//   GITHUB_CLIENT_ID — Client ID из GitHub OAuth App.
// redirect_uri вычисляется из домена запроса, поэтому файл не привязан к домену.
// ============================================

export async function onRequest(context) {
    const { request, env } = context;
    try {
        const url = new URL(request.url);
        const redirectUri = `${url.origin}/api/callback`;

        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        // repo,user — права на запись в репозиторий (нужно, репозиторий приватный/любой).
        authUrl.searchParams.set('scope', 'repo,user');
        authUrl.searchParams.set('state', crypto.randomUUID());

        return Response.redirect(authUrl.toString(), 301);
    } catch (error) {
        return new Response(`Ошибка авторизации: ${error.message}`, { status: 500 });
    }
}