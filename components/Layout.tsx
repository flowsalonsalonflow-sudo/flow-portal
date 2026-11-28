
import React from 'react';
import { Page } from '../App';
import { User } from '../types';
import { HomeIcon, BriefcaseIcon, CalendarIcon, CheckCircleIcon, BookOpenIcon, WalletIcon, SettingsIcon, LogoutIcon, ChevronLeftIcon } from './Icons';

interface LayoutProps {
  children: React.ReactNode;
  activePage: Page;
  user: User;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  isFocusMode?: boolean;
  onBack?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, user, onNavigate, onLogout, isFocusMode = false, onBack }) => {
  return (
    <div className={`flex flex-col min-h-screen ${isFocusMode ? 'md:pl-0' : 'md:pl-64'}`}>
      {/* SIDEBAR - Desktop */}
      {!isFocusMode && (
        <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 glass-card border-none rounded-none bg-black/60 pt-safe z-50">
          <div className="p-8"><img src="https://flowsalon.id/absenku/logo.png" className="h-10 mx-auto filter brightness-200" /></div>
          <nav className="flex-1 px-4 space-y-1">
            <NavItem active={activePage === Page.Dashboard} onClick={() => onNavigate(Page.Dashboard)} icon={<HomeIcon />} label="Beranda" />
            <NavItem active={activePage === Page.Company} onClick={() => onNavigate(Page.Company)} icon={<BriefcaseIcon />} label="Company" />
            <NavItem active={activePage === Page.Attendance} onClick={() => onNavigate(Page.Attendance)} icon={<CalendarIcon />} label="Absensi" />
            <NavItem active={activePage === Page.Checklist} onClick={() => onNavigate(Page.Checklist)} icon={<CheckCircleIcon />} label="Tugas" />
            <NavItem active={activePage === Page.Knowledge} onClick={() => onNavigate(Page.Knowledge)} icon={<BookOpenIcon />} label="SOP" />
            <NavItem active={activePage === Page.Salary} onClick={() => onNavigate(Page.Salary)} icon={<WalletIcon />} label="Gaji" />
            <NavItem active={activePage === Page.HRHub} onClick={() => onNavigate(Page.HRHub)} icon={<BriefcaseIcon />} label="HR Hub" />
            <NavItem active={activePage === Page.Settings} onClick={() => onNavigate(Page.Settings)} icon={<SettingsIcon />} label="Setting" />
          </nav>
          <div className="p-6">
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-white/10 text-xs font-medium opacity-60 hover:opacity-100 transition-all hover:bg-red-500/10 text-white">
              <LogoutIcon size={16} />
              Keluar
            </button>
          </div>
        </aside>
      )}

      {/* MOBILE HEADER - Seamless */}
      {!isFocusMode && (
        <header className="md:hidden flex items-center justify-between px-6 sticky top-0 z-[100] glass-card !rounded-none !border-t-0 !border-x-0 !border-b-[0.5px] !border-white/5 !shadow-none !bg-black/20 pt-[calc(env(safe-area-inset-top)+14px)] pb-[14px]">
          <div className="flex items-center gap-3">
            {activePage !== Page.Dashboard && (
              <button 
                onClick={onBack || (() => onNavigate(Page.Dashboard))} 
                className="p-2 -ml-2 glass-card !rounded-lg active:scale-90 transition-transform"
              >
                <ChevronLeftIcon size={18} />
              </button>
            )}
            <img src="https://flowsalon.id/absenku/logo.png" className="h-7 filter brightness-200" />
          </div>
          <button onClick={onLogout} className="p-2 opacity-60 active:scale-90 transition-transform"><LogoutIcon size={20} /></button>
        </header>
      )}

      {/* AREA KONTEN UTAMA - Strictly retain padding so fixed-width children don't zoom on mode change */}
      <main className={`flex-1 w-full max-w-5xl mx-auto flex flex-col p-6 md:p-12 ${isFocusMode ? 'justify-center items-center h-screen' : ''}`}>
        {children}
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all ${active ? 'active-emerald-tab' : 'text-white/60 hover:text-white'}`}>
    {icon} <span className="text-sm font-medium">{label}</span>
  </button>
);
