const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}/g;

const SOCIAL_REGEX = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[\w.-]+/gi,
  facebook: /https?:\/\/(?:www\.)?facebook\.com\/[\w./?=&-]+/gi,
  twitter: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[\w.-]+/gi,
};

export function detectPlatform(html = "") {
  const source = html.toLowerCase();
  if (source.includes("cdn.shopify.com")) return "Shopify";
  if (source.includes("wixstatic.com")) return "Wix";
  if (source.includes("wp-content")) return "WordPress";
  return "Unknown";
}

export function extractLeadSignals(html = "") {
  const emails = sanitizeEmails(html.match(EMAIL_REGEX) || []);
  const phones = sanitizePhones(html.match(PHONE_REGEX) || []);

  return {
    emails,
    phones,
    social_links: {
      instagram: uniq(html.match(SOCIAL_REGEX.instagram) || []),
      facebook: uniq(html.match(SOCIAL_REGEX.facebook) || []),
      twitter: uniq(html.match(SOCIAL_REGEX.twitter) || []),
    },
  };
}

function sanitizeEmails(items) {
  return uniq(
    items
      .map((email) => email.trim().toLowerCase())
      .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  );
}

function sanitizePhones(items) {
  return uniq(
    items
      .map((phone) => phone.replace(/[^\d+]/g, ""))
      .map((phone) => {
        if (phone.startsWith("00")) return `+${phone.slice(2)}`;
        if (!phone.startsWith("+") && phone.length >= 10) return `+${phone}`;
        return phone;
      })
      .filter((phone) => phone.length >= 8)
  );
}

function uniq(values) {
  return Array.from(new Set(values));
}
