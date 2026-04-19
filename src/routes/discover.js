import express from "express";
import { scanStore } from "../services/scanner.js";
import { detectPlatform, extractLeadSignals } from "../services/extractor.js";
import { requireUserSession, saveLeadViaRpc } from "../services/supabase.js";

export const discoverRouter = express.Router();

discoverRouter.post("/", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const userJwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  try {
    const { client } = await requireUserSession(userJwt);

    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: "url is required" });
    }

    const scanned = await scanStore(url);
    const platform = detectPlatform(scanned.mergedHtml);
    const extracted = extractLeadSignals(scanned.mergedHtml);

    await saveLeadViaRpc(client, {
      store_url: scanned.storeUrl,
      platform,
      email: extracted.emails[0] || null,
      phone: extracted.phones[0] || null,
      social_links: extracted.social_links,
      source: "manual_discovery",
    });

    return res.status(200).json({
      platform,
      emails: extracted.emails,
      phones: extracted.phones,
      social_links: extracted.social_links,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    const status = message.toLowerCase().includes("session") || message.toLowerCase().includes("token") ? 401 : 500;
    return res.status(status).json({ error: message });
  }
});
