import { getStore } from '@netlify/blobs';

export const handler = async (event, context) => {
  try {
    const store = getStore('user-data');

    if (event.httpMethod === 'POST') {
      const { email, type, data } = JSON.parse(event.body || '{}');
      if (!email || !type) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing email or type' }) };
      }

      await store.setJSON(`${email}_${type}`, data);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    }

    if (event.httpMethod === 'GET') {
      const { email, type } = event.queryStringParameters || {};
      if (!email || !type) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing email or type' }) };
      }

      const data = await store.get(`${email}_${type}`, { type: 'json' });
      return { statusCode: 200, body: JSON.stringify({ data: data || null }) };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (error) {
    console.error('Sync data error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};