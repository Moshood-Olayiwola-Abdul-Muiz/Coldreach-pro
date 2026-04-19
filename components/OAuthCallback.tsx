import React, { useEffect, useState } from 'react';

const OAuthCallback: React.FC = () => {
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const processAuth = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');

        if (!code) {
          setStatus('Authentication failed: No code received.');
          return;
        }

        let accountData: any = null;

        // Exchange the authorization code for tokens via our Netlify function
        try {
          const redirectUri = `${window.location.origin}/oauth2callback`;
          const response = await fetch('/.netlify/functions/exchange-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, redirectUri })
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('Token exchange failed:', errData);
            throw new Error(`Failed to exchange token: ${errData.error || response.statusText}`);
          }

          const data = await response.json();
          
          if (!data.email) {
            throw new Error('Failed to retrieve email');
          }

          accountData = {
            id: String(Date.now()),
            email: data.email,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + (data.expires_in * 1000),
            stage: 1,
            reputation_score: 50,
            target_send: 5,
            sent_count: 0,
            spam_rate: 0,
            delivery_count: 0,
            inbox_rate: 0,
            reversed_count: 0,
            reply_rate: 0,
            is_warming_up: false,
            send_interval_seconds: 300
          };
        } catch (e: any) {
          console.error('Failed to exchange code for tokens', e);
          setStatus(`Authentication failed: ${e.message}`);
          return;
        }

        // Send the data back to the main window
        if (!accountData || !accountData.email) {
          setStatus("Authentication failed: Email not received.");
          return;
        }

        if (window.opener) {
          window.opener.postMessage(
            {
              type: "OAUTH_AUTH_SUCCESS",
              account: accountData,
            },
            window.location.origin
          );
        }

        // Also broadcast for good measure
        try {
          const bc = new BroadcastChannel('oauth_channel');
          bc.postMessage({ 
            type: 'OAUTH_AUTH_SUCCESS', 
            account: accountData 
          });
          bc.close();
        } catch (e) {
          console.error('BroadcastChannel not supported', e);
        }

        setStatus('Authentication successful! You can close this window.');
        
        // Auto-close after a short delay
        setTimeout(() => {
          window.close();
        }, 1500);

      } catch (error) {
        console.error('Error processing OAuth callback:', error);
        setStatus('An error occurred during authentication.');
      }
    };

    processAuth();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            {status.includes('successful') ? (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : status.includes('failed') || status.includes('error') ? (
              <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            )}
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Google Authentication</h2>
          <p className="text-slate-500 text-sm font-medium">{status}</p>
        </div>
        
        <button 
          onClick={() => window.close()}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition"
        >
          Close Window
        </button>
      </div>
    </div>
  );
};

export default OAuthCallback;
