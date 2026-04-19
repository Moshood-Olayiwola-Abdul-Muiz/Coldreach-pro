import { google } from 'googleapis';

export const handler = async (event, context) => {
  const code = event.queryStringParameters?.code;
  const state = event.queryStringParameters?.state;

  if (!code) {
    return {
      statusCode: 400,
      body: 'No code provided',
    };
  }

  let redirectUri;
  if (state) {
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      if (decodedState.redirectUri) {
        redirectUri = decodedState.redirectUri;
      }
    } catch (e) {
      console.error('Failed to parse state', e);
    }
  }
  
  // Fallback to the origin of the request if state parsing fails or is missing
  if (!redirectUri) {
     const host = event.headers.host;
     const protocol = event.headers['x-forwarded-proto'] || 'https';
     redirectUri = `${protocol}://${host}/oauth2callback`;
  }

  const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "677843590105-u5icvnvdbo5vvuvrfr06gl5a8utti468.apps.googleusercontent.com";
  const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    return {
      statusCode: 500,
      body: 'CLIENT_ID must be set in environment variables.',
    };
  }

  const client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;

    if (!email) {
      throw new Error('Could not retrieve email address');
    }

    const accountData = {
      id: Date.now().toString(),
      email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      expiry_date: tokens.expiry_date || 0,
      stage: 1,
      reputation_score: 50,
      target_send: 5,
      sent_count: 0,
      spam_rate: 0,
      delivery_count: 0,
      inbox_rate: 0,
      reversed_count: 0,
      is_warming_up: false,
      send_interval_seconds: 300,
      daily_limit: 5,
      daily_sent: 0,
      reply_rate: 0,
      needsReauth: false
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
        <html><body>
          <script>
            const accountData = ${JSON.stringify(accountData)};
            try {
              const bc = new BroadcastChannel('oauth_channel');
              bc.postMessage({ type: 'OAUTH_AUTH_SUCCESS', account: accountData });
            } catch(e) {}
            
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', account: accountData }, '*');
            }
            
            setTimeout(() => {
              window.close();
              const msg = document.getElementById('msg');
              if (msg) msg.innerText = 'Authentication successful. You can now close this window and return to the app.';
            }, 500);
          </script>
          <p id="msg">Authentication successful. This window should close automatically...</p>
        </body></html>
      `,
    };
  } catch (error) {
    console.error('OAuth callback error:', error);
    return {
      statusCode: 500,
      body: 'Authentication failed: ' + error.message,
    };
  }
};
