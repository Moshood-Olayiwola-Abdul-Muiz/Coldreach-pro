export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { to, subject, body, access_token, refresh_token, expires_at } = JSON.parse(event.body || '{}');

  if (!access_token && !refresh_token) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing access_token or refresh_token' }) };
  }

  const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "677843590105-u5icvnvdbo5vvuvrfr06gl5a8utti468.apps.googleusercontent.com";
  const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId) {
    return { statusCode: 500, body: JSON.stringify({ error: 'CLIENT_ID/GOOGLE_CLIENT_ID must be set in environment variables.' }) };
  }

  let currentAccessToken = access_token;
  let newAccessToken = null;
  let newExpiresAt = null;

  // Check if token needs refresh
  if (refresh_token && (!expires_at || Date.now() > expires_at)) {
    try {
      const params = {
        client_id: clientId,
        refresh_token: refresh_token,
        grant_type: 'refresh_token'
      };
      if (clientSecret) {
        params.client_secret = clientSecret;
      }

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params)
      });

      if (tokenResponse.ok) {
        const tokens = await tokenResponse.json();
        currentAccessToken = tokens.access_token;
        newAccessToken = tokens.access_token;
        newExpiresAt = Date.now() + (tokens.expires_in * 1000);
      } else {
        const err = await tokenResponse.json();
        console.error('Failed to refresh token:', err);
        return { statusCode: 401, body: JSON.stringify({ error: 'Failed to refresh token', details: err }) };
      }
    } catch (err) {
      console.error('Error refreshing token:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Error refreshing token' }) };
    }
  }

  const rawMessage = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body
  ].join('\r\n');

  const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  try {
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json();
      
      // If 401 and we haven't refreshed yet, try refreshing once
      if (sendResponse.status === 401 && !newAccessToken && refresh_token) {
        const retryParams = {
          client_id: clientId,
          refresh_token: refresh_token,
          grant_type: 'refresh_token'
        };
        if (clientSecret) {
          retryParams.client_secret = clientSecret;
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(retryParams)
        });

        if (tokenResponse.ok) {
          const tokens = await tokenResponse.json();
          currentAccessToken = tokens.access_token;
          newAccessToken = tokens.access_token;
          newExpiresAt = Date.now() + (tokens.expires_in * 1000);
          
          // Retry send
          const retryResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${currentAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              raw: encodedMessage
            })
          });
          
          if (!retryResponse.ok) {
            const retryErr = await retryResponse.json();
            throw new Error(`Retry failed: ${retryErr.error?.message || 'Unknown error'}`);
          }
        } else {
          throw new Error('Token refresh failed during retry');
        }
      } else {
        throw new Error(`Gmail API error: ${errorData.error?.message || 'Unknown error'}`);
      }
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        success: true, 
        newAccessToken,
        newExpiresAt
      }) 
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
