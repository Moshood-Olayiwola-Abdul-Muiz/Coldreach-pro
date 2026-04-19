import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { google } from "googleapis";
import Database from "better-sqlite3";
import cron from "node-cron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Database Setup ---
const db = new Database("coldreach.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expiry_date INTEGER NOT NULL,
    stage INTEGER DEFAULT 1,
    reputation_score INTEGER DEFAULT 50,
    target_send INTEGER DEFAULT 5,
    sent_count INTEGER DEFAULT 0,
    spam_rate INTEGER DEFAULT 0,
    delivery_count INTEGER DEFAULT 0,
    inbox_rate INTEGER DEFAULT 0,
    reversed_count INTEGER DEFAULT 0,
    is_warming_up BOOLEAN DEFAULT 0,
    send_interval_seconds INTEGER DEFAULT 300,
    last_sent_at INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 5,
    daily_sent INTEGER DEFAULT 0,
    last_reset_date TEXT DEFAULT ''
  );
`);

// Add new columns to existing table if they don't exist
try {
  db.exec("ALTER TABLE accounts ADD COLUMN needs_reauth BOOLEAN DEFAULT 0");
} catch (e) { /* Ignore if column exists */ }
try {
  db.exec("ALTER TABLE accounts ADD COLUMN last_sent_at INTEGER DEFAULT 0");
} catch (e) { /* Ignore if column exists */ }
try {
  db.exec("ALTER TABLE accounts ADD COLUMN daily_limit INTEGER DEFAULT 5");
} catch (e) { /* Ignore if column exists */ }
try {
  db.exec("ALTER TABLE accounts ADD COLUMN daily_sent INTEGER DEFAULT 0");
} catch (e) { /* Ignore if column exists */ }
try {
  db.exec("ALTER TABLE accounts ADD COLUMN last_reset_date TEXT DEFAULT ''");
} catch (e) { /* Ignore if column exists */ }
try {
  db.exec("ALTER TABLE accounts ADD COLUMN reply_rate INTEGER DEFAULT 0");
} catch (e) { /* Ignore if column exists */ }

// --- OAuth Setup ---
function getOAuth2Client(redirectUri?: string) {
  const clientId = process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId) {
    throw new Error('CLIENT_ID/GOOGLE_CLIENT_ID must be set in environment variables.');
  }
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
];

// --- Netlify Functions Proxy Helper ---
async function proxyToNetlifyFunction(name: string, req: express.Request, res: express.Response) {
  const functionPath = path.resolve(__dirname, 'netlify', 'functions', `${name}.js`);
  try {
    if (!fs.existsSync(functionPath)) {
      console.error(`Function ${name} not found at ${functionPath}`);
      return res.status(404).json({ error: `Function ${name} not found` });
    }
    const module = await import(functionPath);
    const event = {
      httpMethod: req.method,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
      queryStringParameters: req.query,
      headers: req.headers,
      path: req.path
    };
    const result = await module.handler(event, {});
    if (result.headers) {
      for (const [key, value] of Object.entries(result.headers)) {
        res.setHeader(key, value as string);
      }
    }
    res.status(result.statusCode || 200).send(result.body);
  } catch (e: any) {
    console.error(`Error executing Netlify function ${name}:`, e);
    res.status(500).json({ error: e.message });
  }
}

// --- Netlify Functions Proxy Routes ---
app.all('/api/auth/url', (req, res) => proxyToNetlifyFunction('api-auth-url', req, res));
app.all('/api/send-email', (req, res) => proxyToNetlifyFunction('send-email', req, res));
app.all('/api/check-replies', (req, res) => proxyToNetlifyFunction('check-replies', req, res));
app.all('/api/exchange-token', (req, res) => proxyToNetlifyFunction('exchange-token', req, res));
app.all('/api/discover-leads', (req, res) => proxyToNetlifyFunction('discover-leads', req, res));
app.all('/api/verify-payment', (req, res) => proxyToNetlifyFunction('api', req, res));
app.all('/api/accounts', (req, res) => proxyToNetlifyFunction('api', req, res));
app.all('/api/accounts/*', (req, res) => proxyToNetlifyFunction('api', req, res));

app.all('/.netlify/functions/:name', (req, res) => {
  const name = req.params.name;
  proxyToNetlifyFunction(name, req, res);
});

// --- API Routes (Legacy SQLite Backend) ---
// Removed conflicting routes to allow frontend to handle OAuth and use Netlify functions

// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*all', (req, res) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
