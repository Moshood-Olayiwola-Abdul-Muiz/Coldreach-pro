import express from "express";
import dotenv from "dotenv";
import { scanWebsite } from "./scanner.js";
import { detectPlatform, extractContacts } from "./extractor.js";
import { leadExists, saveLeadRecord } from "./database.js";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/discover", async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: "url is required" });
    }

    const scanResult = await scanWebsite(url);
    const platform = detectPlatform(scanResult.mergedHtml);
    const contacts = extractContacts(scanResult.mergedHtml);

    if (!(await leadExists(scanResult.storeUrl))) {
      await saveLeadRecord({
        store_url: scanResult.storeUrl,
        platform,
        email: contacts.emails[0] || null,
        phone: contacts.phones[0] || null,
        social_links: contacts.social_links,
      });
    }

    return res.status(200).json({
      platform,
      emails: contacts.emails,
      phones: contacts.phones,
      social_links: contacts.social_links,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected discovery error",
    });
  }
});

const port = Number(process.env.DISCOVERY_PORT || 8787);
app.listen(port, () => {
  console.log(`Discovery API listening on port ${port}`);
});
