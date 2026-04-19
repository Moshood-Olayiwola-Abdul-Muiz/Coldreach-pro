import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In Netlify, the database file might need to be in a persistent location
// but for this environment we'll use the one in the project root.
const dbPath = path.join(process.cwd(), "coldreach.db");
const db = new Database(dbPath);

export const handler = async (event, context) => {
  const path = event.path.replace('/api/', '');
  const method = event.httpMethod;

  // GET /api/accounts
  if (path === 'accounts' && method === 'GET') {
    try {
      const accounts = db.prepare("SELECT * FROM accounts").all();
      return { statusCode: 200, body: JSON.stringify(accounts) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  // POST /api/accounts/:id/warmup
  if (path.match(/^accounts\/[^/]+\/warmup$/) && method === 'POST') {
    const id = path.split('/')[1];
    const { is_warming_up } = JSON.parse(event.body || '{}');
    try {
      db.prepare("UPDATE accounts SET is_warming_up = ? WHERE id = ?").run(is_warming_up ? 1 : 0, id);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  // POST /api/accounts/:id/settings
  if (path.match(/^accounts\/[^/]+\/settings$/) && method === 'POST') {
    const id = path.split('/')[1];
    const { target_send, send_interval_seconds } = JSON.parse(event.body || '{}');
    try {
      db.prepare("UPDATE accounts SET target_send = ?, send_interval_seconds = ? WHERE id = ?").run(target_send, send_interval_seconds, id);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  // DELETE /api/accounts/:id
  if (path.match(/^accounts\/[^/]+$/) && method === 'DELETE') {
    const id = path.split('/')[1];
    try {
      db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (error) {
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  // POST /api/verify-payment
  if (path === 'verify-payment' && method === 'POST') {
    const { reference, userId } = JSON.parse(event.body || '{}');
    const secretKey = process.env.PAYSTACK_SECRET_KEY || "sk_test_77e370b00d7e564c517ef0c89dfae236f55c773d";

    if (!secretKey) {
      // For development/demo if key is missing, we can mock success
      // but in production we should require it.
      console.warn("PAYSTACK_SECRET_KEY is missing. Mocking success for reference:", reference);
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          success: true, 
          message: "Mocked success (PAYSTACK_SECRET_KEY missing)" 
        }) 
      };
    }

    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });

      if (response.data.status && response.data.data.status === 'success') {
        // Here you could also update the user in the database if you had a users table
        return { statusCode: 200, body: JSON.stringify({ success: true, data: response.data.data }) };
      } else {
        return { statusCode: 400, body: JSON.stringify({ success: false, error: "Transaction not successful" }) };
      }
    } catch (error) {
      console.error("Paystack verification error:", error.response?.data || error.message);
      return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
  }

  return { statusCode: 404, body: 'Not Found' };
};
