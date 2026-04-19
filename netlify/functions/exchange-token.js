export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code, redirectUri } = JSON.parse(event.body || '{}');

    if (!code || !redirectUri) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing code or redirectUri' }) };
    }

    const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "677843590105-u5icvnvdbo5vvuvrfr06gl5a8utti468.apps.googleusercontent.com";
    const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "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";

    if (!clientId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'OAuth credentials not configured' }) };
    }

    const params = {
      client_id: clientId,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    };

    if (clientSecret) {
      params.client_secret = clientSecret;
    }

    // 1. Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params)
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`);
    }

    const tokens = await tokenResponse.json();

    // 2. Fetch user email via Gmail API
    const userInfoResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to retrieve user info');
    }

    const userInfo = await userInfoResponse.json();
    const email = userInfo.emailAddress;

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Failed to retrieve email' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        expires_in: tokens.expires_in
      })
    };
  } catch (error) {
    console.error('Exchange token error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
