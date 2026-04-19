import { getStore } from '@netlify/blobs';

export const handler = async (event, context) => {
  try {
    const store = getStore('user-accounts');

    if (event.httpMethod === 'POST') {
      const { userId, accounts } = JSON.parse(event.body || '{}');
      if (!userId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
      }

      await store.setJSON(userId, accounts);
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    }

    if (event.httpMethod === 'GET') {
      const userId = event.queryStringParameters.userId;
      if (!userId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };
      }

      const accounts = await store.get(userId, { type: 'json' });
      return {
        statusCode: 200,
        body: JSON.stringify({ accounts: accounts || [] })
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (error) {
    console.error('Sync accounts error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
