
/**
 * Strictly validates a Gmail address according to the rules:
 * - Must end with @gmail.com
 * - Min 6 chars before @
 * - No special chars except dots
 * - No consecutive dots
 * - No dots at start or end
 */
export const validateGmailAddress = (email: string): boolean => {
  const lowercase = email.toLowerCase().trim();
  if (!lowercase.endsWith('@gmail.com')) return false;
  
  const username = lowercase.split('@')[0];
  
  // Rule: Min 6 characters
  if (username.length < 6) return false;
  
  // Rule: No consecutive dots
  if (username.includes('..')) return false;
  
  // Rule: No dots at start or end
  if (username.startsWith('.') || username.endsWith('.')) return false;
  
  // Rule: Only a-z, 0-9, and dots
  const allowedChars = /^[a-z0-9.]+$/;
  return allowedChars.test(username);
};

/**
 * Validates international phone numbers:
 * - Must start with +
 * - Only digits after +
 * - Length between 8 and 15 digits
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const clean = phone.trim();
  if (!clean.startsWith('+')) return false;
  
  const digits = clean.slice(1);
  if (digits.length < 8 || digits.length > 15) return false;
  
  return /^[0-9]+$/.test(digits);
};

/**
 * Formats a raw phone input into a readable international format:
 * Example: +14155552671 -> +1 415 555 2671
 */
export const formatInternationalPhone = (phone: string): string => {
  const clean = phone.trim();
  if (!clean.startsWith('+')) return clean;
  
  const digits = clean.slice(1);
  if (!/^\d+$/.test(digits)) return clean;

  // Simple grouping for international numbers
  // Groups: +[1-3 digits country] [3 digits] [3 digits] [remainder]
  if (digits.length <= 3) return `+${digits}`;
  if (digits.length <= 6) return `+${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  
  return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
};
