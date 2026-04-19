import { UserMetadata } from '../types.ts';

const generateFallbackUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getOrCreateDeviceId = (): string => {
  let deviceId = localStorage.getItem('cr_device_id');
  if (!deviceId) {
    deviceId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : generateFallbackUUID();
    localStorage.setItem('cr_device_id', deviceId);
  }
  return deviceId;
};

export const hashPassword = async (password: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `fallback-${Math.abs(hash).toString(16)}`;
};

export const collectMetadata = async (): Promise<UserMetadata> => {
  let ip = 'Protected';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      ip = data.ip;
    }
  } catch (e) {
    // Silent catch - no console log
  }

  const timezone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
  
  return {
    deviceId: getOrCreateDeviceId(),
    userAgent: navigator.userAgent,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: timezone,
    language: navigator.language,
    ip: ip,
    isProxy: timezone === 'UTC' && navigator.language !== 'en-US'
  };
};

export const isDeviceLinkedToAnotherAccount = (email: string): boolean => {
  const deviceId = getOrCreateDeviceId();
  const registryRaw = localStorage.getItem('cr_device_registry');
  const registry = registryRaw ? JSON.parse(registryRaw) : {};
  const linkedEmail = registry[deviceId];
  return linkedEmail && linkedEmail !== email.toLowerCase();
};

export const linkDeviceToAccount = (email: string) => {
  const deviceId = getOrCreateDeviceId();
  const registryRaw = localStorage.getItem('cr_device_registry');
  const registry = registryRaw ? JSON.parse(registryRaw) : {};
  registry[deviceId] = email.toLowerCase();
  localStorage.setItem('cr_device_registry', JSON.stringify(registry));
};
