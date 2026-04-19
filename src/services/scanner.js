import axios from "axios";

const PAGE_PATHS = ["", "/contact", "/about"];

export async function scanStore(url) {
  const origin = normalizeUrl(url);
  const pages = [];

  for (const path of PAGE_PATHS) {
    const pageUrl = `${origin}${path}`;
    const html = await fetchWithFallback(pageUrl);
    if (html) pages.push({ url: pageUrl, html });
  }

  if (!pages.length) {
    throw new Error("No readable pages found for this store.");
  }

  return {
    storeUrl: origin,
    pages,
    mergedHtml: pages.map((p) => p.html).join("\n\n"),
  };
}

function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") throw new Error("url is required");
  const withProtocol = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  return new URL(withProtocol).origin;
}

async function fetchWithFallback(url) {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        "User-Agent": "ColdReach-Pro-Scanner/2.0",
      },
    });
    if (typeof response.data === "string") return response.data;
  } catch {
    // Fallback below.
  }

  return fetchWithPlaywright(url);
}

async function fetchWithPlaywright(url) {
  let browser;
  try {
    const playwright = await import("playwright");
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    return await page.content();
  } catch {
    return null;
  } finally {
    if (browser) await browser.close();
  }
}
