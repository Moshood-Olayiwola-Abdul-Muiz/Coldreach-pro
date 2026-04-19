export enum LeadStatus {
  TO_SEND = 'to_send',
  SENDING = 'sending',
  SENT = 'sent',
  REPLIED = 'replied',
  BOUNCED = 'bounced'
}

export enum SendingMode {
  MANUAL = 'manual',
  AUTOMATED = 'automated'
}

export enum PlanStatus {
  FREE = 'free',
  PAID = 'paid'
}

export interface OAuthProvider {
  id: string;
  name: string; // e.g., 'Google'
  clientId: string;
  clientSecret: string;
  status: 'active' | 'error' | 'pending';
  needsReauth?: boolean;
  createdAt: string;
}

export interface SocialLinks {
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  pinterest?: string;
  x?: string;
  tiktok?: string;
  snapchat?: string;
  discord?: string;
  whatsapp?: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  platform: string;
  country: string;
  language: string;
  socialLinks: SocialLinks;
  status: LeadStatus;
  createdAt: string;
  sentAt?: string;
  website?: string;
}

export interface UserMetadata {
  deviceId: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  ip?: string;
  isProxy?: boolean;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  gmailAddress: string;
  phoneNumber: string;
  country: string;
  passwordHash: string;
  createdAt: string;
  acceptedTerms: boolean;
  acceptedAt: string;
  metadata: UserMetadata;
  subscriptionExpiry?: string;
  authProviders?: OAuthProvider[];
}

export interface PersonalizationResult {
  finalSubject: string;
  finalBody: string;
  personalizationLevel: number;
  replacedVariables: string[];
  missingVariables: string[];
  accessLevel: PlanStatus;
}
