
import React, { useState, useEffect, useRef } from 'react';
import { Company } from './pages/Company';
import { Dashboard } from './pages/Dashboard';
import { Attendance } from './pages/Attendance';
import { Checklist } from './pages/Checklist';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { Salary } from './pages/Salary';
import { Tips } from './pages/Tips';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { User } from './types';
import { api } from './services/apiService';
import { safeSetItem, safeGetItem, safeRemoveItem } from './services/storageHelper';

export enum Page { 
  Dashboard = 'dashboard', 
  Company = 'company',
  Attendance = 'attendance', 
  Checklist = 'checklist', 
  Knowledge = 'knowledge', 
  Salary = 'salary',
  Tips = 'tips',
  Settings = 'settings'
}

const toTitleCase = (str: string) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

const parseDateSafe = (dateStr: any): Date | null => {
  try {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
    const s = String(dateStr).trim();
    const isoDate = new Date(s);
    if (!isNaN(isoDate.getTime()) && s.includes('-') && s.includes('T')) return isoDate;
    const datePart = s.split(/[ ,T]+/)[0];
    const bits = datePart.split(/[\/\-\.]/);
    if (bits.length === 3) {
      let d, m, y;
      const b0 = parseInt(bits[0]);
      const b1 = parseInt(bits[1]);
      const b2 = parseInt(bits[2]);
      if (String(bits[2]).length === 4) {
        if (b0 > 12) { d = b0; m = b1; y = b2; } 
        else if (b1 > 12) { m = b0; d = b1; y = b2; }
        else { m = b0; d = b1; y = b2; }
      } else if (String(bits[0]).length === 4) {
        y = b0; m = b1; d = b2;
      } else {
        const fallback = new Date(s);
        return isNaN(fallback.getTime()) ? null : fallback;
      }
      const finalDate = new Date(y, m - 1, d);
      return isNaN(finalDate.getTime()) ? null : finalDate;
    }
    const finalFallback = new Date(s);
    return isNaN(finalFallback.getTime()) ? null : finalFallback;
  } catch (e) { return null; }
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>(Page.Dashboard);
  const companyBackRef = useRef<(() => boolean) | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showMateri, setShowMateri] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [dynamicData, setDynamicData] = useState<any>(null);
  const [bgUrl, setBgUrl] = useState('https://flowsalon.id/background/boat-1.jpg');
  const [materiOfTheDay, setMateriOfTheDay] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [attendanceActiveTab, setAttendanceActiveTab] = useState<'absen' | 'laporan'>('absen');

  const handleNavigate = (page: any) => {
    if (page === 'attendance-history') {
      setAttendanceActiveTab('laporan');
      setCurrentPage(Page.Attendance);
    } else if (page === Page.Attendance) {
      setAttendanceActiveTab('absen');
      setCurrentPage(Page.Attendance);
    } else {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    const saved = safeGetItem('flow_user');
    if (saved) {
      const u = JSON.parse(saved);
      setUser(u);
      fetchGlobalData(u.email);
    }
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    const handleOnline = () => {
      api.syncAttendanceOutbox(user.email).catch(() => {});
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user?.email]);

  useEffect(() => {
    if (showMateri) {
      setIsFocusMode(true);
    }
  }, [showMateri]);

  const fetchGlobalData = async (email: string) => {
    setIsInitialLoading(true);
    setFetchError(null);
    try {
      // Sinkronkan antrean absen offline di latar belakang bila ada
      api.syncAttendanceOutbox(email).catch(() => {});
      const data = await api.getInitialData(email);
      if (data) {
        if (data.userProfile) {
          setUser((prev) => {
            const u = prev ? { ...prev, ...data.userProfile } : data.userProfile;
            safeSetItem('flow_user', JSON.stringify(u));
            return u;
          });
        }
        setDynamicData(data);
        calculateMateriOfTheDay(data.materiList, data.lastLog);
      } else {
        setFetchError("Gagal memuat data dari server.");
      }
    } catch (err) {
      setFetchError("Terjadi kesalahan koneksi.");
      console.warn(err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const calculateMateriOfTheDay = (materiList: any[], lastLog: any) => {
    if (!materiList || materiList.length === 0) return;
    if (!lastLog) {
      setMateriOfTheDay(materiList[0]);
      return;
    }
    const lastDateObj = parseDateSafe(lastLog.waktu);
    if (!lastDateObj) {
      setMateriOfTheDay(materiList[0]);
      return;
    }
    const todayDateObj = new Date();
    const isSameDay = lastDateObj.toDateString() === todayDateObj.toDateString();
    const normalize = (s: string) => (s || "").toString().trim().toLowerCase();
    const lastMateriLog = normalize(lastLog.materi);
    const extractNumber = (str: string) => {
      const match = str.match(/(\d+)/);
      return match ? parseInt(match[1]) : null;
    };
    const lastLogNum = extractNumber(lastMateriLog);

    let lastIndex = materiList.findIndex(m => {
       const b = normalize(m.bab);
       const j = normalize(m.judul);
       if (b === lastMateriLog || j === lastMateriLog) return true;
       const babNum = extractNumber(m.bab);
       if (lastLogNum !== null && babNum !== null) {
         if (babNum === lastLogNum) return true;
       }
       if (lastMateriLog.includes(b) && b.length > 3) return true;
       return false;
    });
    
    if (lastIndex === -1) lastIndex = 0;

    if (isSameDay) {
      setMateriOfTheDay(materiList[lastIndex]);
    } else {
      let nextIndex = lastIndex + 1;
      if (nextIndex >= materiList.length) {
        nextIndex = 0; 
      }
      setMateriOfTheDay(materiList[nextIndex]);
    }
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    safeSetItem('flow_user', JSON.stringify(userData));
    fetchGlobalData(userData.email);
  };

  const handleLogout = () => {
    setUser(null);
    safeRemoveItem('flow_user');
    setCurrentPage(Page.Dashboard);
  };

  const handleAttendanceSuccess = () => {
    if (materiOfTheDay) {
      setShowMateri(true);
    } else {
      setCurrentPage(Page.Dashboard);
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const renderPage = () => {
    switch (currentPage) {
      case Page.Dashboard: return <Dashboard user={user} pesanManager={dynamicData?.pesanManager} isDataLoaded={!!dynamicData} isLoading={isInitialLoading} error={fetchError} onRetry={() => fetchGlobalData(user.email)} bgUrl={bgUrl} onNavigate={handleNavigate} onToggleFocus={setIsFocusMode} isOfflineFallback={dynamicData?.isOfflineFallback} />;
      case Page.Company: return <Company onRegisterBack={(handler) => { companyBackRef.current = handler; }} />;
      case Page.Attendance: 
          return <Attendance 
            user={user} 
            onAttendanceSuccess={handleAttendanceSuccess} 
            lokasiData={dynamicData?.lokasi || []} 
            currentMateri={materiOfTheDay} 
            joinDate={dynamicData?.joinDate || user?.joinDate || user?.timestamp || null} 
            hariKhusus={dynamicData?.hariKhusus || []}
            hariLibur={dynamicData?.hariLibur || []}
            hariIzin={dynamicData?.hariIzin || []}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            onNavigate={handleNavigate}
            defaultActiveView={attendanceActiveTab}
          />;
      case Page.Checklist: return <Checklist user={user} tugasMaster={dynamicData?.tugasDef || []} />;
      case Page.Knowledge: return <KnowledgeBase user={user} sopData={dynamicData?.sop || []} onToggleFocus={setIsFocusMode} />;
      case Page.Salary: return <Salary user={user} joinDate={dynamicData?.joinDate || user?.joinDate || user?.timestamp || null} hariKhusus={dynamicData?.hariKhusus || []} hariLibur={dynamicData?.hariLibur || []} hariIzin={dynamicData?.hariIzin || []} selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} onNavigate={handleNavigate} onToggleFocus={setIsFocusMode} />;
      case Page.Tips: return <Tips user={user} tipsData={dynamicData?.tips || []} onToggleFocus={setIsFocusMode} />;
      case Page.Settings: return <Settings user={user} currentBg={bgUrl} onUpdateBg={setBgUrl} />;
      default: return <Dashboard user={user} pesanManager={dynamicData?.pesanManager} isDataLoaded={!!dynamicData} isLoading={isInitialLoading} error={fetchError} onRetry={() => fetchGlobalData(user.email)} bgUrl={bgUrl} onNavigate={handleNavigate} onToggleFocus={setIsFocusMode} />;
    }
  };

  const cleanJudul = (materiOfTheDay?.judul || "Pelajaran Hari Ini").replace(/Modul\s*:\s*/gi, "");

  return (
    <div className="min-h-screen bg-transparent">
      <div 
        className="fixed-bg"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />
      
      <div className="relative z-10 min-h-screen bg-transparent">
        {!showMateri ? (
          <Layout 
            activePage={currentPage} 
            user={user} 
            onNavigate={handleNavigate} 
            onLogout={handleLogout}
            isFocusMode={isFocusMode}
            onBack={() => {
              if (currentPage === Page.Company && companyBackRef.current) {
                const handled = companyBackRef.current();
                if (handled) return;
              }
              handleNavigate(Page.Dashboard);
            }}
          >
            <div className="animate-in fade-in duration-700 bg-transparent w-full">
              {renderPage()}
            </div>
          </Layout>
        ) : (
          <div className="fixed inset-0 z-[2000] bg-black/5 overflow-y-auto px-6 animate-in fade-in duration-300 flex flex-col items-center">
            <div className="w-full max-w-lg space-y-6 py-12">
              <div className="glass-card !rounded-[3.5rem] shadow-2xl overflow-hidden text-left bg-black/20">
                <div className="p-10 border-b border-white/10">
                  <h3 className="text-3xl font-medium text-white leading-tight">
                    {toTitleCase(cleanJudul)}
                  </h3>
                  <p className="text-sm text-emerald-glow font-medium mt-3">{materiOfTheDay?.sub_judul}</p>
                </div>
                
                <div className="p-10 space-y-8">
                  <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
                    <span className="text-emerald-glow text-xs font-medium">
                      {materiOfTheDay?.bab || "Edukasi"}
                    </span>
                  </div>
                  <div className="text-lg leading-relaxed text-white font-normal whitespace-pre-line">
                    {materiOfTheDay?.isi}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => { 
                  safeSetItem('force_attendance_view', 'laporan');
                  setShowMateri(false); 
                  setIsFocusMode(false); 
                  setCurrentPage(Page.Attendance);
                }} 
                className="glass-button h-20 w-full shadow-2xl !bg-white/5 border border-white/10 text-xs font-medium active-emerald-tab"
              >
                Selesai Membaca
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
