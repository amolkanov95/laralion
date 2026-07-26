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
        // Заголовки безопасности (Слой 2) добавляем только к статике;
        // ответы /api/* не трогаем — у callback свой инлайн-скрипт.
        const response = await env.ASSETS.fetch(request);
        return withSecurityHeaders(response, url);
    },
};

// Заголовки безопасности для статических ответов (Слой 2: настоящие HTTP-заголовки
// для Cloudflare/будущего laralion.ru; на GitHub Pages их аналог — CSP-мета в HTML).
function withSecurityHeaders(response, url) {
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Строгую CSP НЕ применяем к /admin: Decap CMS (инлайн-стили, blob:, web workers,
    // запросы к api.github.com, внешний скрипт unpkg) под ней сломается.
    // Админка защищается SRI + noindex + входом через GitHub OAuth.
    if (!url.pathname.startsWith('/admin')) {
        headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

// Старт GitHub OAuth: редирект на страницу авторизации GitHub.
// redirect_uri вычисляется из домена запроса, поэтому к домену не привязан.
async function handleAuth(request, env, url) {
    try {
        const state = crypto.randomUUID();
        const authUrl = new URL('https://github.com/login/oauth/authorize');
        authUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
        // repo,user — права на запись в репозиторий (нужно Decap для коммитов).
        authUrl.searchParams.set('scope', 'repo,user');
        authUrl.searchParams.set('state', state);
        // CSRF-защита: тот же state кладём в HttpOnly-cookie и сверяем в callback.
        // 302 (не 301): редирект не должен кэшироваться, иначе cookie не переустановится.
        return new Response(null, {
            status: 302,
            headers: {
                'Location': authUrl.toString(),
                'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
            },
        });
    } catch (error) {
        return new Response(`Ошибка авторизации: ${error.message}`, { status: 500 });
    }
}

// Callback: обмен code на access_token и возврат его в окно Decap.
async function handleCallback(request, env, url) {
    try {
        // CSRF-проверка: state из query (его вернул GitHub) должен совпасть с cookie.
        const stateParam = url.searchParams.get('state');
        const cookieState = readCookie(request, 'oauth_state');
        if (!stateParam || !cookieState || stateParam !== cookieState) {
            return new Response('Ошибка авторизации: неверный state (CSRF).', { status: 400 });
        }

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

        // Очистить state-cookie независимо от исхода обмена.
        const clearCookie = 'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';

        if (result.error) {
            return new Response(renderBody('error', result), {
                status: 401,
                headers: { 'Content-Type': 'text/html', 'Set-Cookie': clearCookie },
            });
        }

        const content = { token: result.access_token, provider: 'github' };
        return new Response(renderBody('success', content), {
            status: 200,
            headers: { 'Content-Type': 'text/html', 'Set-Cookie': clearCookie },
        });
    } catch (error) {
        return new Response(`Ошибка callback: ${error.message}`, { status: 500 });
    }
}

// Прочитать значение cookie из заголовка запроса.
function readCookie(request, name) {
    const header = request.headers.get('Cookie') || '';
    const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? match[1] : null;
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