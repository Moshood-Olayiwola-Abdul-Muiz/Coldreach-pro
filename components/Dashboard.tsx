import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PlanStatus, Lead, LeadStatus, User } from '../types.ts';

interface DashboardProps {
  plan: PlanStatus;
  leads: Lead[];
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ plan, leads, user }) => {
  // Use current month key to load persistent, decoupled velocity data
  const { monthlyData, totalSentThisMonth, hasHistory } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // 1. Prepare timeline
    const chartPoints = Array.from({ length: daysInMonth }, (_, i) => ({
      name: (i + 1).toString(),
      sent: 0
    }));

    // 2. Load persistent log
    const storageKey = `cr_velocity_${user.id}_${monthKey}`;
    const legacyStorageKey = `cr_velocity_${localStorage.getItem('cr_device_id') || 'default'}_${monthKey}`;
    
    let savedVelocityRaw = localStorage.getItem(storageKey);
    
    // Migrate legacy data if current user data is empty
    if (!savedVelocityRaw) {
      const legacyData = localStorage.getItem(legacyStorageKey);
      if (legacyData) {
        savedVelocityRaw = legacyData;
        localStorage.setItem(storageKey, legacyData); // Save to new key
      }
    }

    let totalSent = 0;
    let foundLogs = false;
    
    if (savedVelocityRaw) {
      try {
        const velocityLog = JSON.parse(savedVelocityRaw);
        foundLogs = Object.keys(velocityLog).length > 0;
        Object.entries(velocityLog).forEach(([day, count]) => {
          const dayNum = parseInt(day, 10);
          const countNum = count as number;
          if (chartPoints[dayNum - 1]) {
            chartPoints[dayNum - 1].sent = countNum;
            totalSent += countNum;
          }
        });
      } catch (e) {
        console.error("Dashboard: Velocity parsing failed.");
      }
    }

    return { 
      monthlyData: chartPoints, 
      totalSentThisMonth: totalSent,
      hasHistory: foundLogs
    };
  }, [leads, user.id]);

  const pendingOutreach = leads.filter(l => l.status === LeadStatus.TO_SEND).length;
  const totalReplies = leads.filter(l => l.status === LeadStatus.REPLIED).length;
  const replyRate = totalSentThisMonth > 0 ? ((totalReplies / totalSentThisMonth) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance Dashboard</h1>
          <p className="text-slate-500 font-medium">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} History</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${
            plan === PlanStatus.PAID ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${plan === PlanStatus.PAID ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`}></div>
            {plan === PlanStatus.PAID ? 'Pro Elite Membership' : 'Standard Access'}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Current Lead Pool" value={leads.length.toLocaleString()} trend="Active Database" color="bg-blue-600" />
        <StatCard title="Total Monthly Sent" value={totalSentThisMonth.toLocaleString()} trend={`${pendingOutreach} Pending`} color="bg-emerald-600" />
        <StatCard title="Monthly Reply Rate" value={`${replyRate}%`} trend="Engagement Ratio" color="bg-slate-900" />
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Outreach Velocity</h3>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking Daily Volume</span>
               {hasHistory ? (
                 <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-widest">History Verified</span>
               ) : (
                 <span className="bg-slate-50 text-slate-400 text-[8px] font-black px-2 py-0.5 rounded border border-slate-100 uppercase tracking-widest">Awaiting First Send</span>
               )}
            </div>
          </div>
        </div>
        
        <div className="w-full" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} fontFamily="Inter" fontWeight="700" />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} fontFamily="Inter" fontWeight="700" />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px', fontWeight: 'bold' }} />
              <Line type="monotone" dataKey="sent" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={1500} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
         <div className="flex items-center gap-3">
            <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
               </svg>
            </div>
            <div>
               <p className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Monthly Auto-Lock Enabled</p>
               <p className="text-[10px] text-slate-500 font-medium">History is permanently preserved for the current month and cannot be reset. Logs rotate automatically on the 1st of the next month.</p>
            </div>
         </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; trend: string; color: string }> = ({ title, value, trend, color }) => (
  <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
    <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-[0.03] rounded-bl-full transform translate-x-4 -translate-y-4`}></div>
    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">{title}</p>
    <p className="text-4xl font-black text-slate-900 mb-1">{value}</p>
    <p className="text-[10px] text-slate-400 font-black uppercase tracking-tight">{trend}</p>
  </div>
);

export default Dashboard;
