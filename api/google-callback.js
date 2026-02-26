/**
 * Vercel Serverless Function: /api/google-callback
 *
 * Google OAuth 콜백을 처리합니다.
 * - 모바일 앱: HTTP 302로 앱 커스텀 스킴(polaris://)으로 리다이렉트
 *   → ASWebAuthenticationSession이 네이티브로 감지
 * - 웹 브라우저: SPA 라우트(/google-web-callback)로 리다이렉트
 */
module.exports = (req, res) => {
  const { code, state, error } = req.query;

  // state 파라미터 파싱
  let stateData = {};
  try {
    if (state) {
      stateData = JSON.parse(state);
    }
  } catch (e) {
    // state가 JSON이 아닌 경우 무시
  }

  // 모바일 앱에서 온 요청: 앱 스킴으로 302 리다이렉트
  if (stateData.mobile && stateData.callbackUrl) {
    const callbackUrl = stateData.callbackUrl;

    // 보안: polaris:// 또는 exp:// 스킴만 허용 (open redirect 방지)
    if (!callbackUrl.startsWith('polaris://') && !callbackUrl.startsWith('exp://')) {
      return res.status(400).json({ error: 'Invalid callback URL scheme' });
    }

    const separator = callbackUrl.includes('?') ? '&' : '?';

    if (code) {
      return res.redirect(302, `${callbackUrl}${separator}code=${encodeURIComponent(code)}`);
    } else if (error) {
      return res.redirect(302, `${callbackUrl}${separator}error=${encodeURIComponent(error)}`);
    }
    return res.redirect(302, `${callbackUrl}${separator}error=no_code`);
  }

  // 웹 브라우저: SPA 라우트로 리다이렉트
  const params = new URLSearchParams();
  if (code) params.set('code', String(code));
  if (error) params.set('error', String(error));
  if (state) params.set('state', String(state));
  const qs = params.toString();

  return res.redirect(302, `/google-web-callback${qs ? '?' + qs : ''}`);
};
