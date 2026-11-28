import React from 'react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout?: () => void;
  hideHeader?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, hideHeader = false }) => {
  return (
    <div className="flex flex-col min-h-screen transition-all duration-500">
      {/* HEADER - Visible on all screens */}
      {!hideHeader && (
        <header className="flex items-center justify-between px-6 sticky top-0 z-[100] animate-in fade-in duration-500 glass-card !rounded-none !border-t-0 !border-x-0 !border-b-[0.5px] !border-white/10 !shadow-none !bg-white/[0.05] backdrop-blur-2xl pt-[calc(env(safe-area-inset-top)+14px)] pb-[14px]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shadow-inner">
               <img src="https://flowsalon.id/hrhub/logo.jpg" className="w-full h-full object-cover" onError={(e) => e.currentTarget.src = 'icon-192.png'} />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-[0.2em] uppercase leading-none italic">FLOW SALON</h1>
              <p className="text-[10px] font-bold text-emerald-400 tracking-widest uppercase mt-0.5">HR Dashboard</p>
            </div>
          </div>
        </header>
      )}

      {/* AREA KONTEN UTAMA */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8 transition-all duration-500">
        {children}
      </main>
    </div>
  );
};