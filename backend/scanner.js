import axios from "axios";

const PATHS_TO_SCAN = ["", "/contact", "/contact-us", "/about"];

function normalizeStoreUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("A valid URL is required.");
  }
  const trimmed = rawUrl.trim();
  const withProtocol = /^https?:\/\/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol).origin;
}

export async function scanWebsite(url) {
  const origin = normalizeStoreUrl(url);
  const pages = [];

  for (const path of PATHS_TO_SCAN) {
    const targetUrl = `${origin}${path}`;
    const html = await fetchPageHtml(targetUrl);
    if (html) {
      pages.push({ url: targetUrl, html });
    }
  }

  if (!pages.length) {
    throw new Error("Unable to read store pages. Please verify the URL is public.");
  }

  return {
    storeUrl: origin,
    pages,
    mergedHtml: pages.map((page) => page.html).join("\n\n"),
  };
}

async function fetchPageHtml(url) {
  try {
    const response = await axios.get(url, {
      timeout: 12000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "ColdReach-Pro-Scanner/1.0 (+https://coldreachpro.com)",
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (typeof response.data === "string" && response.data.length > 0) {
      return response.data;
    }
  } catch {
    // Fallback to browser automation below.
  }

  return fetchWithPlaywright(url);
}

async function fetchWithPlaywright(url) {
  let browser;
  try {
    const playwright = await import("playwright");
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage({
      userAgent: "ColdReach-Pro-Scanner/1.0 (+https://coldreachpro.com)",
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    const html = await page.content();
    return html;
  } catch {
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}