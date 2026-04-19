import { scanWebsite } from "../../backend/scanner.js";
import { detectPlatform, extractContacts } from "../../backend/extractor.js";
import { leadExists, saveLeadRecord } from "../../backend/database.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const inputUrl = body.url || extractUrlFromQuery(body.query);

    if (!inputUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Please provide a store URL. Example: { \"url\": \"https://examplestore.com\" }",
        }),
      };
    }

    const scanResult = await scanWebsite(inputUrl);
    const platform = detectPlatform(scanResult.mergedHtml);
    const contacts = extractContacts(scanResult.mergedHtml);

    const exists = await leadExists(scanResult.storeUrl);
    if (!exists) {
      await saveLeadRecord({
        store_url: scanResult.storeUrl,
        platform,
        email: contacts.emails[0] || null,
        phone: contacts.phones[0] || null,
        social_links: contacts.social_links,
        created_at: new Date().toISOString(),
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        platform,
        emails: contacts.emails,
        phones: contacts.phones,
        social_links: contacts.social_links,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : "Discovery failed" }),
    };
  }
};

function extractUrlFromQuery(query) {
  if (!query || typeof query !== "string") return "";
  const match = query.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : "";
}
