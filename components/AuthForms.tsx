import React, { useState, useMemo, useEffect } from 'react';
import { User, PlanStatus } from '../types.ts';
import { hashPassword, collectMetadata, linkDeviceToAccount } from '../utils/security.ts';
import { countries } from '../utils/countries.ts';
import { logSignupToSheets } from '../services/webhookService.ts';

interface AuthFormsProps {
  initialMode: 'login' | 'signup';
  onAuthSuccess: (user: User) => void;
  onNavigate: (path: string) => void;
}

const AuthForms: React.FC<AuthFormsProps> = ({ initialMode, onAuthSuccess, onNavigate }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    gmailAddress: '',
    country: 'United States of America',
    agreed: true 
  });

  const canSubmit = useMemo(() => {
    const emailValid = formData.email.includes('@') && formData.email.trim().length > 5;
    const passwordValid = formData.password.length >= 4;
    if (isLogin) return emailValid && passwordValid;
    return (
      formData.fullName.trim().length > 0 &&
      emailValid &&
      passwordValid &&
      formData.country
    );
  }, [isLogin, formData]);

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);

    const emailLower = formData.email.toLowerCase().trim();
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/1Er7tTy3vBPUV1-hLZ3VrD9qVLJoaWO2r9D5ieD0Q9eOzp54WfoIeR9aj/exec';

    try {
      const hashedInput = await hashPassword(formData.password);

      if (isLogin) {
        // Verify via App Script
        const res = await fetch(`${APP_SCRIPT_URL}?action=verify&email=${encodeURIComponent(emailLower)}`);
        const data = await res.json();
        
        if (data.exists) {
          // Fetch user details from Netlify Blobs
          const blobRes = await fetch(`/.netlify/functions/sync-data?email=${encodeURIComponent(emailLower)}&type=user`);
          const blobData = await blobRes.json();
          
          if (blobData.data) {
            const existingUser = blobData.data;
            if (existingUser.passwordHash === hashedInput) {
              linkDeviceToAccount(emailLower);
              onAuthSuccess(existingUser);
            } else {
              setError('INVALID PASSWORD. Please try again.');
            }
          } else {
            // User exists in App Script but not in blobs (maybe legacy or created externally)
            // Auto-create blob user
            const metadata = await collectMetadata();
            const newUser: User = {
              id: Math.random().toString(36).slice(2),
              fullName: emailLower.split('@')[0],
              email: emailLower,
              gmailAddress: emailLower,
              phoneNumber: '+234000000000',
              country: formData.country,
              passwordHash: hashedInput,
              createdAt: new Date().toISOString(),
              acceptedTerms: true,
              acceptedAt: new Date().toISOString(),
              metadata: metadata
            };
            await fetch('/.netlify/functions/sync-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: emailLower, type: 'user', data: newUser })
            });
            linkDeviceToAccount(emailLower);
            onAuthSuccess(newUser);
          }
        } else {
          setError('ACCOUNT NOT FOUND. Please sign up.');
        }
      } else {
        // STANDARD SIGNUP Logic
        // Verify first
        const verifyRes = await fetch(`${APP_SCRIPT_URL}?action=verify&email=${encodeURIComponent(emailLower)}`);
        const verifyData = await verifyRes.json();
        
        if (verifyData.exists) {
          setError('ACCOUNT ALREADY EXISTS. Please log in.');
          return;
        }

        // Post to App Script
        const params = new URLSearchParams();
        params.append('Full Name', formData.fullName);
        params.append('Email Address', emailLower);
        params.append('Country', formData.country);
        params.append('plan_type', 'Free');

        await fetch(APP_SCRIPT_URL, {
          method: 'POST',
          body: params
        });

        const metadata = await collectMetadata();
        const newUser: User = {
          id: Math.random().toString(36).slice(2),
          fullName: formData.fullName,
          email: emailLower,
          gmailAddress: formData.gmailAddress || emailLower,
          phoneNumber: formData.phoneNumber || '+234000000000',
          country: formData.country,
          passwordHash: hashedInput,
          createdAt: new Date().toISOString(),
          acceptedTerms: true,
          acceptedAt: new Date().toISOString(),
          metadata: metadata
        };
        
        // Save to Netlify Blobs
        await fetch('/.netlify/functions/sync-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailLower, type: 'user', data: newUser })
        });
        
        linkDeviceToAccount(newUser.email);
        await logSignupToSheets(newUser, PlanStatus.FREE);
        onAuthSuccess(newUser);
      }
    } catch (err) {
      console.error(err);
      setError('AUTHENTICATION ERROR. Please try again.');
    } finally {
      setLoading(false);
    }
  };
return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-20">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-10 pb-6">
          <div className="flex items-center gap-3 mb-10 justify-center">
            <img src="/Logo.png" alt="ColdReach Pro" className="w-16 h-16 rounded-2xl object-contain shadow-sm" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%232563eb'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-family='sans-serif' font-size='32' font-weight='900' text-anchor='middle' dy='.35em'%3EC%3C/text%3E%3C/svg%3E"; }} />
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 mb-2 text-center tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-500 text-sm mb-10 text-center font-medium">
            Access your secure outreach dashboard instantly.
          </p>

          {error && (
            <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase tracking-widest text-center">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                <input 
                  type="text" 
                  autoFocus
                  required 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300" 
                  placeholder="e.g. John Doe"
                  value={formData.fullName} 
                  onChange={e => setFormData({...formData, fullName: e.target.value})} 
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <input 
                type="email" 
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300" 
                placeholder="name@business.com"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input 
                type="password" 
                required 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-300" 
                placeholder="••••••••"
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})} 
              />
            </div>

            {!isLogin && (
              <div className="flex items-start gap-2 px-1">
                <input 
                  type="checkbox" 
                  id="agreed"
                  required
                  className="mt-1 w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500"
                  checked={formData.agreed}
                  onChange={e => setFormData({...formData, agreed: e.target.checked})}
                />
                <label htmlFor="agreed" className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  I agree to the <a href="/terms-of-service" className="text-blue-600 font-bold hover:underline">Terms of Service</a> and <a href="/privacy-policy" className="text-blue-600 font-bold hover:underline">Privacy Policy</a>.
                </label>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !canSubmit} 
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-100 hover:bg-blue-700 transition active:scale-95 disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
            >
              {loading ? 'Entering...' : (isLogin ? 'Enter Platform' : 'Start Free')}
            </button>
          </form>
        </div>
        <div className="p-10 pt-2 bg-slate-50/50 border-t border-slate-100 text-center">
          <p className="text-sm font-bold text-slate-500">
            {isLogin ? "New user?" : "Returning user?"}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }} 
              className="ml-2 text-blue-600 font-black hover:underline uppercase tracking-widest text-xs"
            >
              {isLogin ? 'Join now' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthForms;
