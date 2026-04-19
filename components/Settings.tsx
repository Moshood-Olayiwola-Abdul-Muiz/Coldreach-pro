import React, { useState, useEffect } from "react";
import { PlanStatus, User, OAuthProvider } from "../types.ts";

declare global {
  interface Window {
    PaystackPop: any;
  }
}

interface SettingsProps {
  plan: PlanStatus;
  setPlan: (plan: PlanStatus) => void;
  user: User;
  onRefresh: () => void;
  onUpdateUser: (updates: Partial<User>) => void;
}

const Settings: React.FC<SettingsProps> = ({
  plan,
  setPlan,
  user,
  onRefresh,
  onUpdateUser,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Modal Form State
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetchAccounts();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "coldreach_accounts") {
        fetchAccounts();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const fetchAccounts = async () => {
    try {
      const storedAccounts = localStorage.getItem("coldreach_accounts");
      if (storedAccounts) {
        const data = JSON.parse(storedAccounts);
        setAccounts(data);
        const providers = data.map((acc: any) => ({
          id: acc.id.toString(),
          name: acc.email,
          clientId: "",
          clientSecret: "",
          status: acc.is_warming_up ? "active" : "idle",
          needsReauth: !!acc.needs_reauth,
          createdAt: new Date().toISOString(),
        }));
        onUpdateUser({ authProviders: providers });
      } else {
        setAccounts([]);
        onUpdateUser({ authProviders: [] });
      }
    } catch (error) {
      console.error("Failed to fetch accounts from localStorage:", error);
    }
  };

  const saveAccount = (account: any) => {
    const stored = localStorage.getItem("coldreach_accounts");
    const accounts = stored ? JSON.parse(stored) : [];

    const existingIndex = accounts.findIndex(
      (a: any) => a.email === account.email
    );

    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }

    localStorage.setItem("coldreach_accounts", JSON.stringify(accounts));
    window.dispatchEvent(new Event("cr_accounts_updated"));

    setAccounts(accounts);
    fetchAccounts();
  };

  const handleConnectGmail = async () => {
    try {
      const redirectUri = `${window.location.origin}/oauth2callback`;
      const response = await fetch(
        `/api/auth/url?redirect_uri=${encodeURIComponent(redirectUri)}`,
      );

      if (!response.ok) {
        throw new Error("Failed to get auth URL");
      }

      const { url } = await response.json();
      const popup = window.open(
        url,
        "oauth_popup",
        "width=600,height=700",
      );

      if (!popup) {
        alert("Please allow popups for this site to connect your account.");
        return;
      }
      
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          fetchAccounts();
        }
      }, 1000);
    } catch (err) {
      console.error("OAuth error:", err);
      alert("Failed to connect Gmail.");
    }
  };

  // Listen for OAuth success message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== "OAUTH_AUTH_SUCCESS") return;
      if (!event.data?.account?.email) return;
      
      saveAccount(event.data.account);
    };
    window.addEventListener("message", handleMessage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("oauth_channel");
      bc.onmessage = (event) => {
        if (!event.data || event.data.type !== "OAUTH_AUTH_SUCCESS") return;
        if (!event.data?.account?.email) return;
        
        saveAccount(event.data.account);
      };
    } catch (e) {
      console.error("BroadcastChannel not supported", e);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      if (bc) bc.close();
    };
  }, []);

  const PAYSTACK_PUBLIC_KEY =
    "pk_test_d810687c8c01e0a7c4ec5e1e272ef55cbc9f93d9";

  const daysRemaining = user.subscriptionExpiry
    ? Math.max(
        0,
        Math.ceil(
          (new Date(user.subscriptionExpiry).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  const handleUpgradeToPro = () => {
    if (!window.PaystackPop) {
      alert("Billing gateway still loading. Please wait a moment.");
      return;
    }

    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: 700000,
        currency: "NGN",
        metadata: {
          user_id: user.id,
          plan: "PRO_ELITE",
          interval: "monthly",
        },
        callback: async (response: any) => {
          setIsVerifying(true);
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference: response.reference, userId: user.id }),
            });

            if (verifyRes.ok) {
              const data = await verifyRes.json();
              if (data.success) {
                // Update user in parent state and localStorage
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30);
                
                onUpdateUser({
                  subscriptionExpiry: expiryDate.toISOString()
                });
                setPlan(PlanStatus.PAID);
                setShowSuccess(true);
              } else {
                alert("Payment verification failed: " + (data.error || "Unknown error"));
              }
            } else {
              alert("Server error during payment verification.");
            }
          } catch (err) {
            console.error("Verification error:", err);
            alert("An error occurred while verifying your payment.");
          } finally {
            setIsVerifying(false);
          }
        },
        onClose: () => {},
      });
      handler.openIframe();
    } catch (err) {
      alert(
        "Failed to initiate payment. Please check your internet connection.",
      );
    }
  };

  return (
    <div className="space-y-12 pb-24">
      

      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center space-y-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
              ✨
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Payment Successful</h2>
              <p className="text-slate-500 font-bold">
                Welcome to Pro Elite! Your account has been upgraded and is now active for 30 days.
              </p>
            </div>
            <button 
              onClick={() => setShowSuccess(false)}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-100 hover:bg-blue-700 transition active:scale-95"
            >
              Enter Successful
            </button>
          </div>
        </div>
      )}

      {/* Inbox Management Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Connected Accounts
            </h2>
            <p className="text-slate-500 text-sm font-bold mt-1">
              Connect your Gmail accounts to enable automated sending and
              warm-up features. You can connect up to 2,000 accounts.
            </p>
          </div>
          <button
            onClick={handleConnectGmail}
            disabled={(user.authProviders?.length || 0) >= 2000}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition flex-shrink-0 ${
              (user.authProviders?.length || 0) >= 2000
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700"
            }`}
          >
            {(user.authProviders?.length || 0) >= 2000
              ? "Limit Reached (2000)"
              : "+ Connect Gmail"}
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-100/50 mt-8">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                  <th className="px-10 py-6">Email Address</th>
                  <th className="px-10 py-6">Status</th>
                  <th className="px-10 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-bold">
                {!user.authProviders || user.authProviders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-10 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]"
                    >
                      No Gmail accounts connected yet.
                    </td>
                  </tr>
                ) : (
                  user.authProviders.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-10 py-8 text-slate-900 font-medium">
                        {p.name}
                      </td>
                      <td className="px-10 py-8">
                        <span
                          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.needsReauth ? "bg-rose-50 text-rose-600" : p.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                        >
                          {p.needsReauth
                            ? "Needs Re-auth"
                            : p.status === "active"
                              ? "Warming Up"
                              : "Pending"}
                        </span>
                      </td>
                      <td className="px-10 py-8 text-right space-x-3">
                        {p.needsReauth ? (
                          <button
                            onClick={handleConnectGmail}
                            className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-200 transition"
                          >
                            Re-authenticate
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              // Toggle warmup status
                              const updatedProviders = user.authProviders?.map(
                                (provider) =>
                                  provider.id === p.id
                                    ? {
                                        ...provider,
                                        status:
                                          provider.status === "active"
                                            ? "pending"
                                            : "active",
                                      }
                                    : provider,
                              );
                              onUpdateUser({ authProviders: updatedProviders });

                              const stored =
                                localStorage.getItem("coldreach_accounts");
                              if (stored) {
                                const accounts = JSON.parse(stored);
                                const accIndex = accounts.findIndex(
                                  (a: any) => a.id === p.id,
                                );
                                if (accIndex >= 0) {
                                  accounts[accIndex].is_warming_up =
                                    p.status !== "active";
                                  localStorage.setItem(
                                    "coldreach_accounts",
                                    JSON.stringify(accounts),
                                  );
                                  fetchAccounts();
                                }
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${p.status === "active" ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                          >
                            {p.status === "active"
                              ? "Stop Warmup"
                              : "Start Warmup"}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // Remove account
                            const updatedProviders = user.authProviders?.filter(
                              (provider) => provider.id !== p.id,
                            );
                            onUpdateUser({ authProviders: updatedProviders });

                            const stored =
                              localStorage.getItem("coldreach_accounts");
                            if (stored) {
                              const accounts = JSON.parse(stored);
                              const filtered = accounts.filter(
                                (a: any) => a.id !== p.id,
                              );
                              localStorage.setItem(
                                "coldreach_accounts",
                                JSON.stringify(filtered),
                              );
                              fetchAccounts();
                            }
                          }}
                          className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition"
                        >
                          Sign Out
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
            {!user.authProviders || user.authProviders.length === 0 ? (
              <div className="text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] py-8">
                No Gmail accounts connected yet.
              </div>
            ) : (
              user.authProviders.map((p) => (
                <div
                  key={p.id}
                  className="border border-slate-100 p-5 rounded-2xl shadow-sm bg-slate-50 flex flex-col gap-4"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[11px] text-slate-900">
                      {p.name}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${p.needsReauth ? "bg-rose-50 text-rose-600" : p.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}
                    >
                      {p.needsReauth
                        ? "Needs Re-auth"
                        : p.status === "active"
                          ? "Warming Up"
                          : "Pending"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    {p.needsReauth ? (
                      <button
                        onClick={handleConnectGmail}
                        className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-200 transition text-center"
                      >
                        Re-auth
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          // Toggle warmup status
                          const updatedProviders = user.authProviders?.map(
                            (provider) =>
                              provider.id === p.id
                                ? {
                                    ...provider,
                                    status:
                                      provider.status === "active"
                                        ? "pending"
                                        : "active",
                                  }
                                : provider,
                          );
                          onUpdateUser({ authProviders: updatedProviders });

                          const stored =
                            localStorage.getItem("coldreach_accounts");
                          if (stored) {
                            const accounts = JSON.parse(stored);
                            const accIndex = accounts.findIndex(
                              (a: any) => a.id === p.id,
                            );
                            if (accIndex >= 0) {
                              accounts[accIndex].is_warming_up =
                                p.status !== "active";
                              localStorage.setItem(
                                "coldreach_accounts",
                                JSON.stringify(accounts),
                              );
                              fetchAccounts();
                            }
                          }
                        }}
                        className={`flex-1 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition text-center ${p.status === "active" ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                      >
                        {p.status === "active" ? "Stop Warmup" : "Start Warmup"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        // Remove account
                        const updatedProviders = user.authProviders?.filter(
                          (provider) => provider.id !== p.id,
                        );
                        onUpdateUser({ authProviders: updatedProviders });

                        const stored =
                          localStorage.getItem("coldreach_accounts");
                        if (stored) {
                          const accounts = JSON.parse(stored);
                          const filtered = accounts.filter(
                            (a: any) => a.id !== p.id,
                          );
                          localStorage.setItem(
                            "coldreach_accounts",
                            JSON.stringify(filtered),
                          );
                          fetchAccounts();
                        }
                      }}
                      className="flex-1 bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition text-center"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
