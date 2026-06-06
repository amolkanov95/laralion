// ============================================
// Cloudflare Worker — точка входа сайта Lara Lion.
// Раздаёт статический сайт (через binding ASSETS) и обслуживает
// два OAuth-эндпоинта для входа в Decap CMS:
//   /api/auth     — старт входа через GitHub
//   /api/callback — обмен кода на токен и возврат его в окно Decap
// Заменяет вход через Netlify: админка работает на домене Worker.
//
// Секреты задаются в настройках Worker (Cloudflare → Settings →
// Variables and Secrets):
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET — из GitHub OAuth App.
// ============================================

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === '/api/auth') return handleAuth(request, env, url);
        if (url.pathname === '/api/callback') return handleCallback(request, env, url);
        // Всё остальное — статический сайт (HTML/CSS/JS/изображения).
        return env.ASSETS.fetch(request);
    },
};

// Старт GitHub OAuth: редирект на страницу авторизации GitHub.
// redirect_uri вычисляется из домена запроса, поэтому к домену не привязан.
async function handleAuth(request, env, url) {
    try {
        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
        // repo,user — права на запись в репозиторий (нужно Decap для коммитов).
        authUrl.searchParams.set('scope', 'repo,user');
        authUrl.searchParams.set('state', crypto.randomUUID());
        return Response.redirect(authUrl.toString(), 301);
    } catch (error) {
        return new Response(`Ошибка авторизации: ${error.message}`, { status: 500 });
    }
}

// Callback: обмен code на access_token и возврат его в окно Decap.
async function handleCallback(request, env, url) {
    try {
        const code = url.searchParams.get('code');
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'decap-cms-oauth',
            },
            body: JSON.stringify({
                client_id: env.GITHUB_CLIENT_ID,
                client_secret: env.GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const result = await response.json();

        if (result.error) {
            return new Response(renderBody('error', result), {
                status: 401,
                headers: { 'Content-Type': 'text/html' },
            });
        }

        const content = { token: result.access_token, provider: 'github' };
        return new Response(renderBody('success', content), {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
        });
    } catch (error) {
        return new Response(`Ошибка callback: ${error.message}`, { status: 500 });
    }
}

// HTML, который отдаётся во всплывающее окно: устанавливает связь с открывшим
// окном (Decap) и передаёт результат по протоколу Decap.
function renderBody(status, content) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><script>
  (function() {
    function receiveMessage(e) {
      window.opener.postMessage(
        'authorization:github:${status}:${JSON.stringify(content)}',
        e.origin
      );
      window.removeEventListener('message', receiveMessage, false);
    }
    window.addEventListener('message', receiveMessage, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
</script></head><body></body></html>`;
}