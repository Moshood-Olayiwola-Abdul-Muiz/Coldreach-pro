import React, { useState, useEffect } from "react";
import { Lead, LeadStatus } from "../types.ts";
import { startCampaignWorker, stopCampaignWorker } from "../services/campaignWorker.ts";

interface Account {
  id: number | string;
  email: string;
  stage: number;
  reputation_score: number;
  target_send: number;
  sent_count: number;
  spam_rate: number;
  delivery_count: number;
  inbox_rate: number;
  reversed_count: number;
  reply_count: number;
  reply_rate: number;
  is_warming_up: boolean;
  send_interval_seconds: number;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

interface AutoSendViewProps {
  campaign: { subject: string; body: string };
  leads: Lead[];
  onStatusUpdate: (id: string, status: LeadStatus) => void;
}

const AutoSendView: React.FC<AutoSendViewProps> = ({
  campaign,
  leads,
  onStatusUpdate,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [globalInterval, setGlobalInterval] = useState(() => {
    const saved = localStorage.getItem("cr_global_interval");
    return saved ? parseInt(saved, 10) : 300;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(() => {
    const state = JSON.parse(localStorage.getItem('cr_campaign_state') || '{}');
    return !!state.running;
  });
  const [isCheckingReplies, setIsCheckingReplies] = useState(false);
  const [replies, setReplies] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('cr_new_replies') || '[]');
  });
  const [logs, setLogs] = useState<any[]>(() => {
    return JSON.parse(localStorage.getItem('cr_campaign_logs') || '[]');
  });
  const [selectedReply, setSelectedReply] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchAccounts();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "coldreach_accounts") {
        fetchAccounts();
      }
    };
    
    const handleCampaignStateChange = () => {
      const state = JSON.parse(localStorage.getItem('cr_campaign_state') || '{}');
      setIsSending(!!state.running);
    };

    const handleAccountsUpdated = () => {
      fetchAccounts();
    };

    const handleLogsUpdated = () => {
      setLogs(JSON.parse(localStorage.getItem('cr_campaign_logs') || '[]'));
    };

    const handleRepliesUpdated = () => {
      setReplies(JSON.parse(localStorage.getItem('cr_new_replies') || '[]'));
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cr_campaign_state_updated", handleCampaignStateChange);
    window.addEventListener("cr_accounts_updated", handleAccountsUpdated);
    window.addEventListener("cr_campaign_logs_updated", handleLogsUpdated);
    window.addEventListener("cr_new_replies_updated", handleRepliesUpdated);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cr_campaign_state_updated", handleCampaignStateChange);
      window.removeEventListener("cr_accounts_updated", handleAccountsUpdated);
      window.removeEventListener("cr_campaign_logs_updated", handleLogsUpdated);
      window.removeEventListener("cr_new_replies_updated", handleRepliesUpdated);
    };
  }, []);

  const fetchAccounts = async () => {
    try {
      const storedAccounts = localStorage.getItem("coldreach_accounts");
      if (storedAccounts) {
        const parsed = JSON.parse(storedAccounts);
        const sanitized = parsed.map((acc: any) => ({
          ...acc,
          sent_count: acc.sent_count || 0,
          delivery_count: acc.delivery_count || 0,
          reply_count: acc.reply_count || 0,
          reply_rate: acc.reply_rate || 0,
          spam_rate: acc.spam_rate || 0,
          inbox_rate: acc.inbox_rate || 0,
          reversed_count: acc.reversed_count || 0,
          target_send: acc.target_send || 50,
          send_interval_seconds: acc.send_interval_seconds || 300
        }));
        setAccounts(sanitized);
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error("Failed to fetch accounts from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAccount = async (
    id: number | string,
    field: keyof Account,
    value: number,
  ) => {
    const updatedAccounts = accounts.map((acc) =>
      acc.id === id ? { ...acc, [field]: value } : acc,
    );
    setAccounts(updatedAccounts);
    localStorage.setItem("coldreach_accounts", JSON.stringify(updatedAccounts));
  };

  const applyGlobalInterval = async () => {
    const updatedAccounts = accounts.map((acc) => ({
      ...acc,
      send_interval_seconds: globalInterval,
    }));
    setAccounts(updatedAccounts);
    localStorage.setItem("coldreach_accounts", JSON.stringify(updatedAccounts));
    
    const state = JSON.parse(localStorage.getItem('cr_campaign_state') || '{}');
    localStorage.setItem('cr_campaign_state', JSON.stringify({
      ...state,
      interval: globalInterval
    }));
    
    alert("Global interval applied to all accounts.");
  };

  const handleResetStats = (id: number | string) => {
    if (!confirm("Are you sure you want to reset stats for this account?")) return;
    const updatedAccounts = accounts.map((acc) =>
      acc.id === id ? { 
        ...acc, 
        sent_count: 0, 
        delivery_count: 0, 
        reply_count: 0, 
        reply_rate: 0,
        reversed_count: 0,
        spam_rate: 0,
        inbox_rate: 100
      } : acc,
    );
    setAccounts(updatedAccounts);
    localStorage.setItem("coldreach_accounts", JSON.stringify(updatedAccounts));
    window.dispatchEvent(new Event('cr_accounts_updated'));
  };

  const handleResetAllStats = () => {
    if (!confirm("Are you sure you want to reset stats for ALL accounts?")) return;
    const updatedAccounts = accounts.map((acc) => ({ 
      ...acc, 
      sent_count: 0, 
      delivery_count: 0, 
      reply_count: 0, 
      reply_rate: 0,
      reversed_count: 0,
      spam_rate: 0,
      inbox_rate: 100
    }));
    setAccounts(updatedAccounts);
    localStorage.setItem("coldreach_accounts", JSON.stringify(updatedAccounts));
    window.dispatchEvent(new Event('cr_accounts_updated'));
  };

  const getLifespanStatus = (acc: Account) => {
    const totalSent = acc.sent_count || 0;
    const replies = acc.reply_count || 0;
    
    let score = 50; // Base score
    
    if (totalSent > 0) {
      const replyPercentage = (replies / totalSent) * 100;
      if (replyPercentage > 15) score += 40;
      else if (replyPercentage > 8) score += 20;
      else if (replyPercentage < 2) score -= 15;
    }
    
    if (acc.is_warming_up) score -= 25;
    if (acc.spam_rate > 5) score -= 30;
    if (acc.inbox_rate < 80) score -= 20;

    if (score > 80) return { label: "Excellent", color: "bg-emerald-100 text-emerald-700" };
    if (score > 60) return { label: "Good", color: "bg-blue-100 text-blue-700" };
    if (score >= 35) return { label: "Average", color: "bg-amber-100 text-amber-700" };
    return { label: "Critical", color: "bg-rose-100 text-rose-700" };
  };

  const handleStartSending = async () => {
    if (!campaign.body) {
      alert("Please set up your campaign body first.");
      return;
    }

    const activeAccounts = accounts.filter(
      (acc) => !acc.is_warming_up && acc.access_token,
    );
    if (activeAccounts.length === 0) {
      alert(
        "No active accounts available for sending. Please connect an account and ensure it is not in warm-up mode.",
      );
      return;
    }

    const pendingLeads = leads.filter((l) => {
      if (l.status !== LeadStatus.TO_SEND || !l.email) return false;
      try {
        const sentLeads = JSON.parse(
          localStorage.getItem("coldreach_sent_leads") || "[]",
        );
        return !sentLeads.includes(l.id);
      } catch (e) {
        return true;
      }
    });

    if (pendingLeads.length === 0) {
      alert("No pending leads with email addresses found.");
      return;
    }

    if (isSending) {
      stopCampaignWorker();
      setIsSending(false);
    } else {
      const state = JSON.parse(localStorage.getItem('cr_campaign_state') || '{}');
      localStorage.setItem('cr_campaign_state', JSON.stringify({
        ...state,
        running: true,
        interval: globalInterval
      }));
      startCampaignWorker();
      setIsSending(true);
    }
  };

  const handleCheckReplies = async () => {
    setIsCheckingReplies(true);
    let totalRepliesFound = 0;
    let allReplies: any[] = [];

    try {
      const activeAccounts = accounts.filter((acc) => acc.access_token);
      let updatedAccounts = [...accounts];

      for (const acc of activeAccounts) {
        try {
          const response = await fetch("/.netlify/functions/check-replies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_token: acc.access_token,
              refresh_token: acc.refresh_token,
              expires_at: acc.expires_at,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.replyCount > 0) {
              totalRepliesFound += data.replyCount;
              if (data.replies) {
                allReplies = [...allReplies, ...data.replies.map((r: any) => ({ ...r, accountEmail: acc.email }))];
              }
            }
            // Always update tokens if new ones were returned
            updatedAccounts = updatedAccounts.map((a) => {
              if (a.id === acc.id) {
                const newReplyCount = (a.reply_count || 0) + (data.replyCount || 0);
                const sentCount = a.sent_count || 0;
                const newReplyRate = sentCount > 0 ? Math.round((newReplyCount / sentCount) * 100) : 0;

                return {
                  ...a,
                  reply_count: newReplyCount,
                  reply_rate: newReplyRate,
                  delivery_count: (a.delivery_count || 0) + (data.replyCount || 0),
                  access_token: data.newAccessToken || a.access_token,
                  expires_at: data.newExpiresAt || a.expires_at
                };
              }
              return a;
            });
          }
        } catch (err) {
          console.error(`Failed to check replies for ${acc.email}`, err);
        }
      }

      setAccounts(updatedAccounts);
      localStorage.setItem(
        "coldreach_accounts",
        JSON.stringify(updatedAccounts),
      );

      if (allReplies.length > 0) {
        const existingReplies = JSON.parse(localStorage.getItem('cr_new_replies') || '[]');
        const combinedReplies = [...existingReplies, ...allReplies];
        localStorage.setItem('cr_new_replies', JSON.stringify(combinedReplies));
        setReplies(combinedReplies);
        setSelectedReply(allReplies[0]);
        setIsModalOpen(true);
      } else {
        alert("Checked all accounts. No new replies found.");
      }
    } catch (error) {
      console.error("Failed to check replies:", error);
      alert("Failed to check replies.");
    } finally {
      setIsCheckingReplies(false);
    }
  };

  const clearReplies = () => {
    localStorage.setItem('cr_new_replies', '[]');
    setReplies([]);
    window.dispatchEvent(new Event('cr_new_replies_updated'));
  };

  const clearLogs = () => {
    localStorage.setItem('cr_campaign_logs', '[]');
    setLogs([]);
    window.dispatchEvent(new Event('cr_campaign_logs_updated'));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Auto-Send View
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            Manage your automated sending limits and monitor reputation metrics
            across all connected accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {replies.length > 0 && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="relative bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-200 transition flex items-center gap-2"
            >
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full animate-bounce">
                {replies.length}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              New Replies
            </button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Sent</div>
          <div className="text-2xl font-black text-slate-900">{accounts.reduce((sum, acc) => sum + (acc.sent_count || 0), 0)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Inbox Rate</div>
          <div className="text-2xl font-black text-emerald-600">
            {accounts.length > 0 ? Math.round(accounts.reduce((sum, acc) => sum + (acc.inbox_rate || 0), 0) / accounts.length) : 0}%
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Replies</div>
          <div className="text-2xl font-black text-blue-600">{accounts.reduce((sum, acc) => sum + (acc.reply_count || 0), 0)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Active Accounts</div>
          <div className="text-2xl font-black text-slate-900">{accounts.filter(a => !a.is_warming_up && a.access_token).length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Controls & Table */}
        <div className="lg:col-span-2 space-y-8">
          {/* Global Tools */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Global Sending Interval (Seconds)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={globalInterval}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setGlobalInterval(val);
                      localStorage.setItem("cr_global_interval", val.toString());
                      
                      const state = JSON.parse(localStorage.getItem('cr_campaign_state') || '{}');
                      if (state.running) {
                        localStorage.setItem('cr_campaign_state', JSON.stringify({
                          ...state,
                          interval: val
                        }));
                      }
                    }}
                    className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition"
                    min="60"
                  />
                  <button
                    onClick={applyGlobalInterval}
                    className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-md"
                  >
                    Apply to All
                  </button>
                </div>
              </div>
              <div className="w-full md:w-auto flex flex-col md:flex-row gap-3">
                <button
                  onClick={handleCheckReplies}
                  disabled={isCheckingReplies}
                  className="w-full md:w-auto bg-slate-100 text-slate-700 px-6 py-4 rounded-xl text-sm font-black hover:bg-slate-200 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 border border-slate-200"
                >
                  {isCheckingReplies ? "Checking..." : "Check Replies"}
                </button>
                <button
                  onClick={handleStartSending}
                  className={`w-full md:w-auto px-8 py-4 rounded-xl text-sm font-black transition shadow-lg flex items-center justify-center gap-2 ${
                    isSending 
                      ? "bg-rose-100 text-rose-600 hover:bg-rose-200 shadow-rose-500/10 border border-rose-200" 
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30"
                  }`}
                >
                  {isSending ? (
                    <>
                      <div className="flex items-center gap-1 mr-2">
                        <span className="w-2 h-2 bg-rose-600 rounded-full animate-pulse"></span>
                        <span className="text-rose-600">Working</span>
                        <span className="flex gap-0.5 ml-0.5">
                          <span className="animate-[bounce_1s_infinite_0ms] text-lg leading-none">.</span>
                          <span className="animate-[bounce_1s_infinite_200ms] text-lg leading-none">.</span>
                          <span className="animate-[bounce_1s_infinite_400ms] text-lg leading-none">.</span>
                        </span>
                      </div>
                      <span className="border-l border-rose-200 pl-3">Stop Campaign</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Start Sending Campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Connected Accounts</h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleResetAllStats}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition uppercase tracking-widest"
                >
                  Reset All Stats
                </button>
                <span className="text-[10px] font-bold text-slate-400">{accounts.length} Total</span>
              </div>
            </div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                    <th className="px-6 py-5">Gmail Account</th>
                    <th className="px-6 py-5">Target Send</th>
                    <th className="px-6 py-5">Sent</th>
                    <th className="px-6 py-5">Spam Rate</th>
                    <th className="px-6 py-5">Delivery</th>
                    <th className="px-6 py-5">Inbox Rate</th>
                    <th className="px-6 py-5">Replies</th>
                    <th className="px-6 py-5">Reply Rate</th>
                    <th className="px-6 py-5">Reversed</th>
                    <th className="px-6 py-5">Lifespan Status</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold">
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                        No accounts connected. Go to Settings to connect Gmail accounts.
                      </td>
                    </tr>
                  ) : (
                    accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4 text-slate-900 font-medium">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${acc.is_warming_up ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></div>
                            {acc.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={acc.target_send}
                            onChange={(e) => handleUpdateAccount(acc.id, "target_send", Number(e.target.value))}
                            className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition"
                            min="1"
                          />
                        </td>
                        <td className="px-6 py-4 text-blue-600">{acc.sent_count}</td>
                        <td className="px-6 py-4 text-rose-500">{acc.spam_rate}%</td>
                        <td className="px-6 py-4 text-emerald-600">{acc.delivery_count}</td>
                        <td className="px-6 py-4 text-emerald-600">{acc.inbox_rate}%</td>
                        <td className="px-6 py-4 text-blue-600">{acc.reply_count || 0}</td>
                        <td className="px-6 py-4 text-blue-600">{acc.reply_rate || 0}%</td>
                        <td className="px-6 py-4 text-amber-600">{acc.reversed_count}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getLifespanStatus(acc).color}`}>
                            {getLifespanStatus(acc).label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleResetStats(acc.id)}
                            className="text-rose-500 hover:text-rose-700 transition text-[10px] uppercase font-black tracking-widest"
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4">
              {accounts.map((acc) => (
                <div key={acc.id} className="border border-slate-100 p-5 rounded-2xl shadow-sm bg-slate-50 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${acc.is_warming_up ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></div>
                      <span className="font-bold text-[11px] text-slate-900">{acc.email}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${getLifespanStatus(acc).color}`}>
                      {getLifespanStatus(acc).label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div>
                      <span className="text-slate-400 uppercase tracking-widest block mb-1">Target Send</span>
                      <input
                        type="number"
                        value={acc.target_send}
                        onChange={(e) => handleUpdateAccount(acc.id, "target_send", Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none focus:border-blue-500 transition"
                        min="1"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-widest block mb-1">Sent</span>
                      <span className="font-bold text-blue-600 text-xs">{acc.sent_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-widest block mb-1">Replies</span>
                      <span className="font-bold text-emerald-600 text-xs">{acc.reply_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-widest block mb-1">Inbox Rate</span>
                      <span className="font-bold text-emerald-600 text-xs">{acc.inbox_rate}%</span>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button 
                      onClick={() => handleResetStats(acc.id)}
                      className="text-rose-500 text-[9px] font-black uppercase tracking-widest"
                    >
                      Reset Stats
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Activity Log */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm flex flex-col h-[600px]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Activity Log</h3>
              <button onClick={clearLogs} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No activity yet</p>
                  <p className="text-[10px] text-slate-300 mt-1">Start a campaign to see logs</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex gap-3 animate-in slide-in-from-right-2 duration-300">
                    <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      log.type === 'success' ? 'bg-emerald-500' : 
                      log.type === 'error' ? 'bg-rose-500' : 
                      log.type === 'reply' ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'
                    }`}></div>
                    <div className="space-y-1">
                      <div className={`text-[11px] font-bold leading-tight ${
                        log.type === 'success' ? 'text-emerald-700' : 
                        log.type === 'error' ? 'text-rose-700' : 
                        log.type === 'reply' ? 'text-amber-700' : 'text-slate-700'
                      }`}>
                        {log.msg}
                      </div>
                      <div className="text-[9px] font-medium text-slate-400">{log.time}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {isSending && (
              <div className="p-4 bg-blue-50 border-t border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Campaign Active</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden border border-white/20">
            {/* Left side: List of emails */}
            <div className="w-1/3 border-r border-slate-100 bg-slate-50/50 flex flex-col h-full">
              <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">New Replies</h3>
                  <p className="text-[10px] font-bold text-slate-400">{replies.length} Unread</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={clearReplies} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition">Clear All</button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-3">
                {replies.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No new replies</p>
                  </div>
                ) : (
                  replies.map((reply) => (
                    <div 
                      key={reply.id} 
                      onClick={() => setSelectedReply(reply)}
                      className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${selectedReply?.id === reply.id ? 'bg-white border-blue-500 shadow-lg shadow-blue-500/10 scale-[1.02]' : 'bg-white/50 border-slate-100 hover:border-blue-200 hover:bg-white'}`}
                    >
                      <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">To: {reply.accountEmail}</div>
                      <div className="font-black text-sm text-slate-900 truncate mb-1">{reply.from}</div>
                      <div className="text-xs font-bold text-slate-500 truncate">{reply.subject}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Right side: Preview */}
            <div className="w-2/3 bg-white flex flex-col h-full">
              <div className="p-4 flex justify-end">
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              {selectedReply ? (
                <>
                  <div className="px-10 pb-8 border-b border-slate-50">
                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight leading-tight">{selectedReply.subject}</h2>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                          {selectedReply.from.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-sm">{selectedReply.from}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedReply.date}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-10 overflow-y-auto flex-1 text-slate-700 text-base leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedReply.snippet}
                    <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-400 italic">
                      Note: This is a preview snippet. For the full message and to reply, please use the button below or your Gmail inbox.
                    </div>
                  </div>
                  <div className="p-8 border-t border-slate-50 bg-white flex justify-end gap-4">
                    <button 
                      onClick={() => window.open(`https://mail.google.com/mail/u/${selectedReply.accountEmail}/#inbox/${selectedReply.id}`, '_blank')}
                      className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm transition shadow-xl hover:bg-slate-800 flex items-center gap-2"
                    >
                      Open in Gmail
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                  <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  <p className="font-black uppercase tracking-[0.2em] text-xs">Select an email to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoSendView;
