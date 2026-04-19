import { Lead, PlanStatus, PersonalizationResult } from "../types.ts";

const PUBLIC_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 
  'icloud.com', 'aol.com', 'proton.me', 'zoho.com', 'yandex.com',
  'mail.com', 'live.com', 'me.com'
];

/**
 * Utility: Strip HTML for Compose
 * Converts rich text (<a> tags) into clean plain text for Gmail/Mailto URLs.
 * Example: <a href="X">Y</a> -> Y (X)
 */
const stripHtmlForCompose = (html: string): string => {
  if (!html) return '';
  
  // Create a temporary element to parse the HTML string
  const doc = new DOMParser().parseFromString(html, 'text/html');
  
  // Convert <a> tags to plain text format
  const links = doc.querySelectorAll('a');
  links.forEach(link => {
    const text = link.textContent || '';
    const href = link.getAttribute('href') || '';
    // If the text is the same as the URL, just keep the URL
    if (href && href !== text && !text.includes(href)) {
      link.replaceWith(`${text} (${href})`);
    } else {
      link.replaceWith(text || href);
    }
  });

  // InnerText handles line breaks (<p>, <div>, <br>) much better than textContent
  return doc.body.innerText || doc.body.textContent || '';
};

const capitalizeWords = (str: string): string => {
  return str
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const cleanString = (str: string): string => {
  return str.replace(/[0-9]/g, '').replace(/[._-]/g, ' ').trim();
};

export const deriveFieldsFromEmail = (lead: Lead): Partial<Lead> => {
  const email = lead.email.toLowerCase();
  if (!email.includes('@')) return {};

  const [username, domainPart] = email.split('@');
  const isPublic = PUBLIC_PROVIDERS.includes(domainPart);
  
  const derived: Partial<Lead> = {};

  if (!isPublic) {
    const domainName = domainPart.split('.')[0];
    const cleanedCompany = cleanString(domainName);
    if (cleanedCompany) {
      derived.companyName = capitalizeWords(cleanedCompany);
    }
  }

  const cleanedUsername = cleanString(username);
  const nameParts = cleanedUsername.split(/\s+/).filter(Boolean);

  if (nameParts.length > 0) {
    derived.firstName = capitalizeWords(nameParts[0]);
    if (nameParts.length > 1) {
      derived.lastName = capitalizeWords(nameParts[nameParts.length - 1]);
    }
  }

  return derived;
};

export const basicReplace = (template: string, lead: Lead): { result: string, replaced: string[], missing: string[] } => {
  if (!template || template.trim() === '') return { result: '', replaced: [], missing: [] };
  
  const derived = deriveFieldsFromEmail(lead);
  const isGeneric = (val: string) => !val || ['user', 'business', 'unknown'].includes(val.toLowerCase());

  const firstName = !isGeneric(lead.firstName) ? lead.firstName : (derived.firstName || lead.firstName);
  const lastName = !isGeneric(lead.lastName) ? lead.lastName : (derived.lastName || lead.lastName);
  const companyName = !isGeneric(lead.companyName) ? lead.companyName : (derived.companyName || lead.companyName);

  const variableMap: Record<string, string> = {
    'firstname': firstName,
    'first name': firstName,
    'lastname': lastName,
    'last name': lastName,
    'companyname': companyName,
    'company name': companyName,
    'company': companyName,
    'platform': lead.platform,
    'country': lead.country,
    'language': lead.language
  };

  let result = template;
  const replaced: string[] = [];
  const missing: string[] = [];

  result = result.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
    const key = p1.trim().toLowerCase();
    const value = variableMap[key];
    if (value && !isGeneric(value)) {
      replaced.push(match);
      return value;
    }
    missing.push(match);
    return match;
  });

  return { result, replaced, missing };
};

/**
 * Builds a device-optimized outreach link
 */
export const buildGmailComposeLink = (lead: Lead, subjectTemplate: string, bodyTemplate: string): string => {
  const finalSubjTemplate = subjectTemplate || '';
  
  // Replace variables first
  const { result: rawSubject } = basicReplace(finalSubjTemplate, lead);
  const { result: rawBody } = basicReplace(bodyTemplate || '', lead);

  // CRITICAL: Strip HTML tags before sending to Gmail/Mailto as they only support plain text
  const subject = stripHtmlForCompose(rawSubject);
  const body = stripHtmlForCompose(rawBody);

  // Industry standard device detection (UA + Touch capability)
  const isMobileOrTablet = 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    window.innerWidth <= 1024;

  if (isMobileOrTablet) {
    const encodedSubject = encodeURIComponent(subject).replace(/\+/g, '%20');
    const encodedBody = encodeURIComponent(body).replace(/\+/g, '%20');
    return `mailto:${lead.email}?subject=${encodedSubject}&body=${encodedBody}`;
  } else {
    const baseUrl = "https://mail.google.com/mail/?view=cm&fs=1";
    const params = new URLSearchParams({
      to: lead.email,
      su: subject,
      body: body
    });
    return `${baseUrl}&${params.toString()}`;
  }
};

export const personalizeEmail = async (
  subjectTemplate: string,
  bodyTemplate: string,
  lead: Lead,
  plan: PlanStatus
): Promise<PersonalizationResult> => {
  const subjRes = basicReplace(subjectTemplate, lead);
  const bodyRes = basicReplace(bodyTemplate, lead);

  return {
    finalSubject: subjRes.result,
    finalBody: bodyRes.result,
    personalizationLevel: 0,
    replacedVariables: [...subjRes.replaced, ...bodyRes.replaced],
    missingVariables: [...subjRes.missing, ...bodyRes.missing],
    accessLevel: plan
  };
};
