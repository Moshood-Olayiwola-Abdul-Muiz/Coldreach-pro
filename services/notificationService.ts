export type AppNotificationType = "info" | "success" | "error" | "reply" | "warmup";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  createdAt: string;
  read: boolean;
}

const NOTIFICATION_STORAGE_KEY = "cr_notifications";

export const loadNotifications = (): AppNotification[] => {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export const pushNotification = (
  title: string,
  message: string,
  type: AppNotificationType = "info",
  showBrowserPopup = true
): AppNotification => {
  const item: AppNotification = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    message,
    type,
    createdAt: new Date().toISOString(),
    read: false,
  };

  const current = loadNotifications();
  const next = [item, ...current].slice(0, 200);
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("cr_notifications_updated"));

  if (showBrowserPopup) {
    showNotificationPopup(title, message);
  }

  return item;
};

export const markAllNotificationsAsRead = () => {
  const next = loadNotifications().map((n) => ({ ...n, read: true }));
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("cr_notifications_updated"));
};

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
};

function showNotificationPopup(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, {
    body,
    icon: "/icon.png",
    badge: "/icon.png",
  });
}
