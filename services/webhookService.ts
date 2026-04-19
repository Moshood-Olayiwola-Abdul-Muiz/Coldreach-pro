import { Lead, User, PlanStatus } from "../types.ts";

/**
 * Standard Webhook Service
 * This is kept for general logging but no longer used for core authentication.
 */
const WEBHOOK_URL = ""; 

export const verifyUserInCloud = async (email: string): Promise<boolean> => {
  // Logic reversed to standard local-first approach
  return false;
};

export const logSignupToSheets = async (user: User, plan: PlanStatus): Promise<boolean> => {
  if (!WEBHOOK_URL) return true;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, plan, timestamp: new Date().toISOString() })
    });
    return true;
  } catch (e) {
    return false;
  }
};

export const logLeadToSheets = async (lead: Lead, userId: string): Promise<void> => {
  if (!WEBHOOK_URL) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ lead, userId })
    });
  } catch (e) {}
};
