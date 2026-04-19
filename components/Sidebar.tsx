import React from 'react';
import { User } from '../types.ts';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onExit: () => void;
  user: User;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose, onExit, user }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'leads', label: 'Lead List', icon: '👥' },
    { id: 'campaigns', label: 'Campaigns', icon: '✉️' },
    { id: 'manual-send', label: 'Manual View', icon: '🖱️' },
    { id: 'auto-send', label: 'Auto-Send View', icon: '🚀' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-[100] w-[260px] bg-white flex flex-col h-screen transform transition-transform duration-300 ease-in-out border-r border-slate-100
      lg:translate-x-0 lg:static lg:flex shadow-2xl lg:shadow-none
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Header - Compact */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/Logo.png" alt="ColdReach Pro" className="w-8 h-8 rounded-lg object-contain shadow-sm" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%232563eb'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-family='sans-serif' font-size='16' font-weight='900' text-anchor='middle' dy='.35em'%3EC%3C/text%3E%3C/svg%3E"; }} />
          <span className="text-xl font-black text-slate-900 tracking-tight">ColdReach Pro</span>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      {/* Main Navigation - Optimized spacing */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      
      {/* Footer / Account Section - Fixed at bottom without scrolling */}
      <div className="px-4 py-4 space-y-4 border-t border-slate-50 mt-auto bg-slate-50/20">
        {/* Session indicator */}
        <div className="px-1">
          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            Session Active
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Syncing data to this device</p>
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
           <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-2">Active Profile</p>
           <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">
                {getInitials(user.fullName)}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-black text-slate-900 truncate leading-none mb-1">{user.fullName}</p>
                <p className="text-[9px] text-slate-400 font-bold truncate">{user.email}</p>
              </div>
           </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={(e) => { e.preventDefault(); onExit(); }}
          className="w-full bg-[#111827] text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-md active:scale-95 mb-4"
        >
          Sign Out & Exit
        </button>
        
        <div className="text-center">
          <a href="/privacy-policy" className="text-[10px] text-slate-400 hover:text-slate-600 font-bold transition-colors">Privacy Policy</a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
