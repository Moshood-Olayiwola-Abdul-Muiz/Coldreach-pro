import { LeadStatus } from "../types.ts";
import { basicReplace } from "./emailService.ts";
import { pushNotification } from "./notificationService.ts";

let workerInterval: any = null;

const addActivity = (msg: string, type: "info" | "success" | "error" | "reply" | "warmup" = "info") => {
  const logs = JSON.parse(localStorage.getItem("cr_campaign_logs") || "[]");
  logs.unshift({ id: Date.now(), msg, type, time: new Date().toLocaleTimeString() });
  localStorage.setItem("cr_campaign_logs", JSON.stringify(logs.slice(0, 80)));
  window.dispatchEvent(new Event("cr_campaign_logs_updated"));
};

const updateLeadStatus = (userId: string, leadId: string, status: LeadStatus) => {
  const leads = JSON.parse(localStorage.getItem(`cr_leads_${userId}`) || "[]");
  const updated = leads.map((lead: any) =>
    lead.id === leadId
      ? { ...lead, status, sentAt: status === LeadStatus.SENT ? new Date().toISOString() : lead.sentAt }
      : lead
  );
  localStorage.setItem(`cr_leads_${userId}`, JSON.stringify(updated));
  window.dispatchEvent(new Event("cr_leads_updated"));
};

const withRetry = async (fn: () => Promise<Response>, retries = 2) => {
  let lastErr: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw lastErr;
};

const handleWarmup = async (accounts: any[]) => {
  const warmingAccounts = accounts.filter((acc) => acc.is_warming_up && acc.access_token);
  if (warmingAccounts.length < 2 || Math.random() > 0.1) return;

  const sender = warmingAccounts[Math.floor(Math.random() * warmingAccounts.length)];
  const recipientCandidates = warmingAccounts.filter((acc) => acc.id !== sender.id);
  if (!recipientCandidates.length) return;
  const recipient = recipientCandidates[Math.floor(Math.random() * recipientCandidates.length)];

  const subject = "Quick check-in";
  const body = `Hey, checking mailbox health for ${sender.email}.`;

  try {
    await withRetry(() =>
      fetch("/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: sender.access_token,
          refresh_token: sender.refresh_token,
          expires_at: sender.expires_at,
          to: recipient.email,
          subject,
          body,
        }),
      })
    );
    addActivity(`[Warmup] ${sender.email} → ${recipient.email}`, "warmup");
  } catch {
    addActivity(`[Warmup] Failed for ${sender.email}`, "error");
  }
};

const checkReplies = async (activeAccounts: any[]) => {
  for (const account of activeAccounts) {
    try {
      const res = await withRetry(() =>
        fetch("/.netlify/functions/check-replies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
          }),
        })
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.replyCount > 0) {
        addActivity(`Found ${data.replyCount} new replies for ${account.email}`, "reply");
        pushNotification("New email replies", `${data.replyCount} new replies for ${account.email}`, "reply", true);
      }
    } catch {
      addActivity(`Reply check failed for ${account.email}`, "error");
    }
  }
};

export const startCampaignWorker = () => {
  if (workerInterval) clearInterval(workerInterval);

  const runWorker = async () => {
    const state = JSON.parse(localStorage.getItem("cr_campaign_state") || "{}");
    if (!state.running) {
      stopCampaignWorker();
      return;
    }

    if (!navigator.onLine) {
      addActivity("Device is offline. Auto-send paused until connectivity returns.", "info");
      return;
    }

    const now = Date.now();
    const intervalMs = (state.interval || 300) * 1000;
    if (state.lastSent && now - state.lastSent < intervalMs) return;

    const accounts = JSON.parse(localStorage.getItem("coldreach_accounts") || "[]");
    const activeAccounts = accounts.filter((acc: any) => !acc.is_warming_up && acc.access_token);

    await handleWarmup(accounts);

    if (!activeAccounts.length) {
      addActivity("No connected sending accounts available.", "error");
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem("cr_pro_auth_user_v2") || "{}");
    if (!currentUser?.id) return;

    const leads = JSON.parse(localStorage.getItem(`cr_leads_${currentUser.id}`) || "[]");
    const sentLeadIds = new Set(JSON.parse(localStorage.getItem("coldreach_sent_leads") || "[]"));

    const lead = leads.find((l: any) => l.status === LeadStatus.TO_SEND && l.email && !sentLeadIds.has(l.id));
    if (!lead) {
      addActivity("No pending leads left. Campaign paused.", "info");
      stopCampaignWorker();
      return;
    }

    const sender = [...activeAccounts]
      .sort((a: any, b: any) => (a.sent_count || 0) - (b.sent_count || 0))
      .find((acc: any) => (acc.sent_count || 0) < (acc.target_send || 50));

    if (!sender) {
      addActivity("All accounts reached their target send limit.", "info");
      stopCampaignWorker();
      return;
    }

    const campaign = JSON.parse(localStorage.getItem(`cr_campaign_${currentUser.id}`) || "{}");
    const { result: subject } = basicReplace(campaign.subject || "Hello from ColdReach Pro", lead);
    const { result: body } = basicReplace(campaign.body || "", lead);

    updateLeadStatus(currentUser.id, lead.id, LeadStatus.SENDING);
    addActivity(`Sending to ${lead.email} with ${sender.email}...`, "info");

    try {
      const response = await withRetry(() =>
        fetch("/.netlify/functions/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: sender.access_token,
            refresh_token: sender.refresh_token,
            expires_at: sender.expires_at,
            to: lead.email,
            subject,
            body,
          }),
        })
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Unknown send error");
      }

      updateLeadStatus(currentUser.id, lead.id, LeadStatus.SENT);
      sentLeadIds.add(lead.id);
      localStorage.setItem("coldreach_sent_leads", JSON.stringify(Array.from(sentLeadIds)));

      const refreshedAccounts = accounts.map((acc: any) =>
        acc.id === sender.id
          ? { ...acc, sent_count: (acc.sent_count || 0) + 1, delivery_count: (acc.delivery_count || 0) + 1 }
          : acc
      );
      localStorage.setItem("coldreach_accounts", JSON.stringify(refreshedAccounts));
      window.dispatchEvent(new Event("cr_accounts_updated"));

      const nextState = { ...state, lastSent: Date.now() };
      localStorage.setItem("cr_campaign_state", JSON.stringify(nextState));
      window.dispatchEvent(new Event("cr_campaign_state_updated"));

      addActivity(`Successfully sent to ${lead.email}`, "success");
      pushNotification("Email sent", `Delivery sent to ${lead.email}`, "success", true);

      const sendCount = Number(localStorage.getItem("cr_total_sends") || "0") + 1;
      localStorage.setItem("cr_total_sends", String(sendCount));
      if (sendCount % 5 === 0) await checkReplies(activeAccounts);
    } catch (err: any) {
      updateLeadStatus(currentUser.id, lead.id, LeadStatus.TO_SEND);
      const message = err?.message || "Failed to send email";
      addActivity(message, "error");
      pushNotification("Send failed", `${lead.email}: ${message}`, "error", true);
    }
  };

  runWorker();
  workerInterval = setInterval(runWorker, 5000);
};

export const stopCampaignWorker = () => {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
  const state = JSON.parse(localStorage.getItem("cr_campaign_state") || "{}");
  localStorage.setItem("cr_campaign_state", JSON.stringify({ ...state, running: false }));
  window.dispatchEvent(new Event("cr_campaign_state_updated"));
};
