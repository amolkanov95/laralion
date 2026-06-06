// ============================================
// Cloudflare Pages Function — callback GitHub OAuth для Decap CMS.
// Путь: /api/callback (GitHub возвращает сюда code после входа пользователя.)
//
// Обменивает code на access_token и передаёт его обратно в окно Decap
// через postMessage по протоколу Decap: 'authorization:github:<status>:<json>'.
//
// Секреты в настройках проекта Cloudflare Pages → Environment variables:
//   GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET — из GitHub OAuth App.
// ============================================

// HTML, который отдаётся во всплывающее окно: устанавливает связь с открывшим
// окном (Decap) и передаёт результат авторизации по протоколу Decap.
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

export async function onRequest(context) {
    const { request, env } = context;
    try {
        const url = new URL(request.url);
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