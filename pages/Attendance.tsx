
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/apiService';
import { User } from '../types';
import { 
  CheckCircle2, 
  Camera, 
  RefreshCw, 
  X, 
  ChevronRight, 
  Info,
  History,
  Calendar,
  Award,
  Zap,
  AlertTriangle,
  MinusCircle,
  Clock,
  MapPin
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../services/storageHelper';
import { getAllowedLibur } from '../services/policyConfig';

interface AttendanceProps {
  user: User;
  onAttendanceSuccess: () => void;
  lokasiData: any[];
  currentMateri: any; 
  joinDate?: string | null;
  hariKhusus?: any[];
  hariLibur?: any[];
  hariIzin?: any[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  onNavigate?: (page: any) => void;
  defaultActiveView?: 'absen' | 'laporan';
}

interface HistoryItem {
  waktu?: string;
  jenis?: string;
  cabang?: string;
  shift?: string;
  Waktu?: string;
  Jenis?: string;
  Cabang?: string;
  Shift?: string;
  timestamp?: string;
  Timestamp?: string;
}

interface GroupedHistory {
  dateKey: string;
  dateDisplay: string;
  shortDate: string;
  monthYear: string;
  cabang: string; 
  shift: string;
  masuk?: string;
  pulang?: string;
  status?: 'Disiplin' | 'Tepat' | 'Telat' | '1/2 Hari' | 'Libur' | 'Belum' | '';
  isWeekendOrAkhir?: boolean;
  keteranganKhusus?: string;
  isHariLibur?: boolean;
  liburKeterangan?: string;
  isHariIzin?: boolean;
  izinKeterangan?: string;
  hasPendingOffline?: boolean;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const parseDateHelper = (dateStr: any, targetMonthStr?: string): Date | null => {
  try {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
    const s = String(dateStr).trim();
    if (!s) return null;

    // 1. Try native Date
    let d_native = new Date(s);
    if (!isNaN(d_native.getTime())) return d_native;

    // 2. Custom parsing for MM/DD, DD/MM, month names
    const parts = s.split(/[ ,T/\\-]+/);
    if (parts.length < 2) return null;

    let day = -1, month = -1, year = -1;
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
    };

    const getMonthFromStr = (str: string) => {
      const low = str.toLowerCase().substring(0, 3);
      return monthMap[low] !== undefined ? monthMap[low] : -1;
    };

    // Try to find year (4 digits)
    const yearIdx = parts.findIndex(p => p.length === 4 && !isNaN(parseInt(p)));
    if (yearIdx !== -1) {
      year = parseInt(parts[yearIdx]);
      const otherParts = parts.filter((_, i) => i !== yearIdx);
      if (otherParts.length >= 2) {
        const m0 = getMonthFromStr(otherParts[0]);
        const m1 = getMonthFromStr(otherParts[1]);

        if (m0 !== -1) {
          month = m0;
          day = parseInt(otherParts[1]);
        } else if (m1 !== -1) {
          month = m1;
          day = parseInt(otherParts[0]);
        } else {
          // Both are numbers
          const b0 = parseInt(otherParts[0]);
          const b1 = parseInt(otherParts[1]);
          
          if (b0 > 12) { day = b0; month = b1 - 1; }
          else if (b1 > 12) { month = b0 - 1; day = b1; }
          else {
            // Ambiguous 05/01/2026. Use targetMonthStr if available
            if (targetMonthStr) {
              const tmParts = targetMonthStr.split('-');
              const tm = parseInt(tmParts[1] || tmParts[0]);
              if (b1 === tm) { month = b1 - 1; day = b0; }
              else { month = b0 - 1; day = b1; }
            } else {
              month = b0 - 1; day = b1; // Default MM/DD
            }
          }
        }
      }
    }

    if (day !== -1 && month !== -1 && year !== -1) {
      const finalDate = new Date(year, month, day);
      if (!isNaN(finalDate.getTime())) {
        // Handle time if exists
        const timeMatch = s.match(/(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?/);
        if (timeMatch) {
          finalDate.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), parseInt(timeMatch[3] || "0", 10));
        }
        return finalDate;
      }
    }
    
    const timestamp = Date.parse(s);
    return isNaN(timestamp) ? null : new Date(timestamp);
  } catch (e) { return null; }
};

const convertPeriodeToMonthYear = (pStr: string): string => {
  if (!pStr || !pStr.includes('-')) return '';
  const [year, month] = pStr.split('-');
  const mIdx = parseInt(month, 10) - 1;
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  if (mIdx >= 0 && mIdx < 12) {
    return `${months[mIdx]} ${year}`;
  }
  return '';
};

const convertMonthYearToPeriode = (myStr: string): string => {
  if (!myStr) return '';
  const parts = myStr.split(' ');
  if (parts.length < 2) return '';
  const mName = parts[0];
  const year = parts[1];
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const mIdx = months.findIndex(m => m.toLowerCase() === mName.toLowerCase());
  if (mIdx !== -1) {
    return `${year}-${String(mIdx + 1).padStart(2, '0')}`;
  }
  return '';
};

export const Attendance: React.FC<AttendanceProps> = ({ 
  user, 
  onAttendanceSuccess, 
  lokasiData, 
  currentMateri, 
  joinDate, 
  hariKhusus, 
  hariLibur, 
  hariIzin,
  selectedPeriod,
  onPeriodChange,
  onNavigate,
  defaultActiveView
}) => {
  const [activeView, setActiveView] = useState<'absen' | 'laporan'>(() => {
    const forceView = safeGetItem('force_attendance_view');
    if (forceView === 'laporan') {
      safeRemoveItem('force_attendance_view');
      return 'laporan';
    }
    return defaultActiveView || 'absen';
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [jenis, setJenis] = useState('Masuk');
  const [shift, setShift] = useState('');
  const [cabang, setCabang] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gps, setGps] = useState<{ lat: number, lng: number, accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<HistoryItem[]>([]);
  const [showSuccessView, setShowSuccessView] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [pendingOutbox, setPendingOutbox] = useState<any[]>(() => api.getAttendanceOutbox(user.email));
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);
  const now = new Date();
  const monthFullNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentMonthYearFilter = `${monthFullNames[now.getMonth()]} ${now.getFullYear()}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthYearFilter);
 
  useEffect(() => {
    if (selectedPeriod) {
      const parentMonthYear = convertPeriodeToMonthYear(selectedPeriod);
      if (parentMonthYear && parentMonthYear !== selectedMonth) {
        setSelectedMonth(parentMonthYear);
      }
    }
  }, [selectedPeriod]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [allowedRadius, setAllowedRadius] = useState<number>(100);
  const [isInsideRadius, setIsInsideRadius] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const syncOfflineQueue = async () => {
    const currentQueue = api.getAttendanceOutbox(user.email);
    setPendingOutbox(currentQueue);
    if (currentQueue.length === 0 || isSyncingOutbox) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    setIsSyncingOutbox(true);
    try {
      const res = await api.syncAttendanceOutbox(user.email);
      setPendingOutbox(api.getAttendanceOutbox(user.email));
      if (res.syncedCount > 0) {
        const history = await api.getAttendanceHistory(user.email, true);
        if (history && Array.isArray(history)) {
          const sorted = [...history].sort((a: any, b: any) => {
            const tA = a.waktu || a.Waktu || a.timestamp || a.Timestamp || "";
            const tB = b.waktu || b.Waktu || b.timestamp || b.Timestamp || "";
            return (parseDateHelper(tB)?.getTime() || 0) - (parseDateHelper(tA)?.getTime() || 0);
          });
          setAttendanceHistory(sorted);
        }
      }
    } catch (e) {
      console.warn("Gagal sinkronisasi antrean offline:", e);
    } finally {
      setIsSyncingOutbox(false);
    }
  };

  useEffect(() => {
    setPendingOutbox(api.getAttendanceOutbox(user.email));
    const handleOnline = () => {
      syncOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    const interval = setInterval(() => {
      if (api.getAttendanceOutbox(user.email).length > 0) {
        syncOfflineQueue();
      }
    }, 25000);
    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [user.email]);
 
  useEffect(() => {
    const forceView = safeGetItem('force_attendance_view');
    if (forceView === 'laporan') {
      setActiveView('laporan');
      safeRemoveItem('force_attendance_view');
    } else if (defaultActiveView) {
      setActiveView(defaultActiveView);
    }
  }, [defaultActiveView]);

  const handleForceRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncOfflineQueue();
      const history = await api.getAttendanceHistory(user.email, true);
      if (history && Array.isArray(history)) {
        const sorted = [...history].sort((a: any, b: any) => {
          const tA = a.waktu || a.Waktu || a.timestamp || a.Timestamp || "";
          const tB = b.waktu || b.Waktu || b.timestamp || b.Timestamp || "";
          const dateA = parseDateHelper(tA);
          const dateB = parseDateHelper(tB);
          const timeA = dateA?.getTime() || 0;
          const timeB = dateB?.getTime() || 0;
          return timeB - timeA;
        });
        setAttendanceHistory(sorted);
        
        const availableMonths = Array.from(new Set(sorted.map((item: any) => {
          const timeStr = item.waktu || item.Waktu || item.timestamp || item.Timestamp;
          const date = parseDateHelper(timeStr);
          if (!date) return "";
          return `${monthFullNames[date.getMonth()]} ${date.getFullYear()}`;
        }))).filter(m => m !== "");

        if (availableMonths.length > 0) {
          if (!availableMonths.includes(selectedMonth)) {
            if (selectedMonth === currentMonthYearFilter) {
               setSelectedMonth(availableMonths[0]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Gagal sinkronkan riwayat:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      // Only fetch if history is empty
      if (attendanceHistory.length > 0) return;
      
      setIsSyncing(true);
      try {
        const history = await api.getAttendanceHistory(user.email);
        if (history && Array.isArray(history)) {
          const sorted = [...history].sort((a: any, b: any) => {
            const tA = a.waktu || a.Waktu || a.timestamp || a.Timestamp || "";
            const tB = b.waktu || b.Waktu || b.timestamp || b.Timestamp || "";
            const dateA = parseDateHelper(tA);
            const dateB = parseDateHelper(tB);
            const timeA = dateA?.getTime() || 0;
            const timeB = dateB?.getTime() || 0;
            return timeB - timeA;
          });
          
          setAttendanceHistory(sorted);
          
          const availableMonths = Array.from(new Set(sorted.map((item: any) => {
            const timeStr = item.waktu || item.Waktu || item.timestamp || item.Timestamp;
            const date = parseDateHelper(timeStr);
            if (!date) return "";
            return `${monthFullNames[date.getMonth()]} ${date.getFullYear()}`;
          }))).filter(m => m !== "");

          if (availableMonths.length > 0) {
            if (!availableMonths.includes(selectedMonth)) {
                if (selectedMonth === currentMonthYearFilter) {
                   setSelectedMonth(availableMonths[0]);
                }
            }
          }
        }
      } catch (err) {
        console.error("Gagal ambil history:", err);
      } finally {
        setIsSyncing(false);
      }
    };
    fetchHistory();
  }, [user.email]);

  const effectiveOutDate = useMemo(() => {
    const outDateStr = (user as any)?.Keluar_Tgl || (user as any)?.keluar_tgl || (user as any)?.resign_date || (user as any)?.Resign_Date || "";
    if (outDateStr) {
       const parsed = parseDateHelper(outDateStr);
       if (parsed) return { date: parsed };
    }
    return null;
  }, [user]);

  const effectiveJoinDate = useMemo(() => {
    const rawJoin =
      joinDate ||
      (user as any)?.joinDate ||
      (user as any)?.Join_Date ||
      (user as any)?.join_date ||
      (user as any)?.Masuk_Tgl ||
      (user as any)?.masuk_tgl ||
      (user as any)?.timestamp ||
      (user as any)?.Timestamp ||
      (user as any)?.waktu ||
      (user as any)?.Waktu ||
      (user as any)?._colA ||
      "";
    if (rawJoin) {
      const parsed = parseDateHelper(rawJoin);
      if (parsed) return { date: parsed, source: 'Backend' };
    }
    if (attendanceHistory.length > 0) {
      const sortedAsc = [...attendanceHistory].sort((a: any, b: any) => {
        const tA = a.waktu || a.Waktu || a.timestamp || a.Timestamp || "";
        const tB = b.waktu || b.Waktu || b.timestamp || b.Timestamp || "";
        const dateA = parseDateHelper(tA);
        const dateB = parseDateHelper(tB);
        return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
      });
      const firstRecord = sortedAsc[0];
      const timeStr = (firstRecord as any).waktu || (firstRecord as any).Waktu || (firstRecord as any).timestamp || (firstRecord as any).Timestamp;
      const parsedHistoryDate = parseDateHelper(timeStr);
      if (parsedHistoryDate) {
        const adjustedDate = new Date(parsedHistoryDate);
        return { date: adjustedDate, source: 'History (Est.)' };
      }
    }
    return null;
  }, [joinDate, user, attendanceHistory]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (navigator.geolocation) {
      // Picu pengambilan lokasi instan
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
          setGpsError(null);
        },
        (err) => {
          console.error("GPS Error:", err);
          setGpsError("Gagal mendapatkan lokasi. Pastikan Izin Lokasi aktif.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );

      const watcher = navigator.geolocation.watchPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
          setGpsError(null);
        },
        (err) => {
          console.error("Watcher GPS Error:", err);
          if (err.code === 1) setGpsError("Tolong izinkan akses lokasi di pengaturan browser (Ikon Gembok di baris URL).");
          else if (err.code === 3) setGpsError("Waktu deteksi lokasi habis. Silakan coba klik tombol refresh lokasi.");
          else setGpsError("Gagal mendeteksi lokasi.");
        }, 
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
      return () => {
        navigator.geolocation.clearWatch(watcher);
        clearInterval(timer);
      };
    } else {
      setGpsError("Browser tidak mendukung lokasi.");
    }
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (gps && cabang && lokasiData.length > 0) {
      const targetCabang = lokasiData.find(l => {
        const nameInSheet = String(l?.nama_cabang || l?.namacabang || l?.nama || l?.Nama || "").toUpperCase().trim();
        const selectedTrim = cabang.toUpperCase().trim();
        return nameInSheet === selectedTrim || nameInSheet.includes(selectedTrim) || selectedTrim.includes(nameInSheet);
      });

      if (targetCabang) {
        const latTarget = parseFloat(targetCabang.latitude || targetCabang.lat || targetCabang.lat_target || targetCabang.lat_tujuan || 0);
        const lngTarget = parseFloat(targetCabang.longitude || targetCabang.lng || targetCabang.lng_target || targetCabang.lng_tujuan || 0);
        const radiusTarget = parseFloat(targetCabang.radius_meter || targetCabang.radiusmeter || targetCabang.radius || 100);
        
        if (!isNaN(latTarget) && !isNaN(lngTarget) && latTarget !== 0) {
          const dist = calculateDistance(gps.lat, gps.lng, latTarget, lngTarget);
          setDistance(dist);
          setAllowedRadius(radiusTarget);
          setIsInsideRadius(dist <= radiusTarget);
        } else {
          // Jika koordinat di sheet 0 atau tidak ada, anggap radius bebas (selalu di area)
          setDistance(null);
          setAllowedRadius(0);
          setIsInsideRadius(true);
        }
      } else {
        // Cabang tidak ditemukan di master data lokasi
        setDistance(null);
        setIsInsideRadius(null);
      }
    } else {
      // Belum ada data GPS atau Cabang belum dipilih
      setDistance(null);
      setIsInsideRadius(null);
    }
  }, [gps, cabang, lokasiData]);

  const lastTodayRecord = [...attendanceHistory].find(h => {
    const timeStr = (h as any).waktu || (h as any).Waktu || (h as any).timestamp || (h as any).Timestamp;
    const date = parseDateHelper(timeStr);
    return date && date.toDateString() === new Date().toDateString();
  });

  const isCurrentlyCheckedIn = lastTodayRecord?.jenis === 'Masuk';

  useEffect(() => {
    if (isCurrentlyCheckedIn) {
      setJenis('Pulang');
      setShift(lastTodayRecord?.shift || '');
      if (!cabang) setCabang(lastTodayRecord?.cabang || '');
    } else {
      setJenis('Masuk');
      setShift('');
    }
  }, [isCurrentlyCheckedIn, lastTodayRecord]);

  const handleAbsen = async () => {
    if (!photo || !shift || !cabang) return alert("Lengkapi data (Foto, Shift, dan Cabang).");
    
    // Jika GPS tidak ada, coba ambil sekali lagi
    if (!gps) {
      alert("Lokasi GPS belum terdeteksi. Pastikan Izin Lokasi aktif dan tunggu sebentar.");
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          (err) => alert("Gagal mendapatkan lokasi. Silakan cek pengaturan GPS HP Anda.")
        );
      }
      return;
    }

    if (isInsideRadius === false) {
      alert(`ABSENSI DITOLAK: Anda berada di luar radius lokasi salon.`);
      return;
    }

    setLoading(true);
    const clickTimestamp = new Date().toISOString();
    const materiToSend = currentMateri?.bab || currentMateri?.judul || "Materi Umum";
    const distVal = Math.round(distance || 0);
    const statusLokasiFix = `${distVal} Meter`;

    const absenPayload = {
      nama: user.nama,
      email: user.email,
      jenis,
      shift,
      cabang,
      lat: gps.lat,
      lng: gps.lng,
      accuracy: gps.accuracy,
      jarak: distVal,
      foto: photo,
      statusLokasi: statusLokasiFix,
      materi: materiToSend,
      timestamp: clickTimestamp
    };

    const saveToOfflineQueue = async () => {
      api.enqueueAttendanceOutbox(absenPayload);
      setPendingOutbox(api.getAttendanceOutbox(user.email));
      const updatedHistory = await api.getAttendanceHistory(user.email, false);
      if (Array.isArray(updatedHistory)) {
        const sorted = [...updatedHistory].sort((a: any, b: any) => {
          const tA = a.waktu || a.Waktu || a.timestamp || a.Timestamp || "";
          const tB = b.waktu || b.Waktu || b.timestamp || b.Timestamp || "";
          return (parseDateHelper(tB)?.getTime() || 0) - (parseDateHelper(tA)?.getTime() || 0);
        });
        setAttendanceHistory(sorted);
      }
      setIsSavedOffline(true);
      setShowSuccessView(true);
    };

    try {
      // Jika perangkat sedang offline saat tombol diklik, langsung simpan ke antrean lokal dengan waktu klik asli
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await saveToOfflineQueue();
        return;
      }

      const result = await api.absen(absenPayload);

      if (result.status === 'sukses') {
        setIsSavedOffline(false);
        setPendingOutbox(api.getAttendanceOutbox(user.email));
        const updatedHistory = await api.getAttendanceHistory(user.email, false);
        if (Array.isArray(updatedHistory)) {
          const sorted = [...updatedHistory].sort((a: any, b: any) => {
            const tA = a.waktu || a.Waktu || a.timestamp || a.Timestamp || "";
            const tB = b.waktu || b.Waktu || b.timestamp || b.Timestamp || "";
            return (parseDateHelper(tB)?.getTime() || 0) - (parseDateHelper(tA)?.getTime() || 0);
          });
          setAttendanceHistory(sorted);
        }
        setShowSuccessView(true);
      } else {
        const msgLower = String(result.message || "").toLowerCase();
        const isNetworkOrTimeoutError =
          msgLower.includes("timeout") ||
          msgLower.includes("terlalu lama") ||
          msgLower.includes("koneksi gagal") ||
          msgLower.includes("format yang salah") ||
          (typeof navigator !== 'undefined' && !navigator.onLine);

        if (isNetworkOrTimeoutError) {
          // Cek terlebih dahulu apakah server sebenarnya sudah mencatat absensi tersebut
          try {
            api.clearAttendanceCache(user.email);
            const checkHistory = await api.getAttendanceHistory(user.email, false);
            const todayStr = new Date().toISOString().split('T')[0];
            const hasRecorded = Array.isArray(checkHistory) && checkHistory.some((h: any) => {
              if (h.isPendingOffline) return false;
              const hWaktu = String(h.waktu || h.Waktu || h.timestamp || h.Timestamp || "");
              const hJenis = String(h.jenis || h.Jenis || "").toLowerCase().trim();
              return hWaktu.includes(todayStr) && hJenis === jenis.toLowerCase().trim();
            });
            if (hasRecorded) {
              setIsSavedOffline(false);
              setShowSuccessView(true);
              return;
            }
          } catch (_) {}

          // Simpan ke Antrean Offline dengan waktu klik asli agar otomatis dikirim ulang saat sinyal stabil
          await saveToOfflineQueue();
        } else {
          alert(result.message || "Gagal absen.");
        }
      }
    } catch (e) {
      await saveToOfflineQueue();
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    if (isCameraOpen || photo) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); } }, 100);
    } catch (e) { alert("Akses kamera ditolak."); }
  };

  const takePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Perkecil resolusi dan kualitas foto agar upload lebih ringan
        // Menggunakan 800px max dimension dan quality 0.5
        const MAX_DIM = 800;
        let w = canvas.width;
        let h = canvas.height;
        if (w > h) {
          if (w > MAX_DIM) { h *= MAX_DIM / w; w = MAX_DIM; }
        } else {
          if (h > MAX_DIM) { w *= MAX_DIM / h; h = MAX_DIM; }
        }
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx?.drawImage(canvas, 0, 0, w, h);
        
        setPhoto(tempCanvas.toDataURL('image/jpeg', 0.5));
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        setIsCameraOpen(false);
      }
    }
  };

  const resetPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhoto(null);
    setIsCameraOpen(false);
    startCamera();
  };

  const logs = useMemo(() => {
    const groups: Record<string, GroupedHistory> = {};
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    
    // Heuristic month hint for ambiguous dates
    let targetP = "";
    if (selectedMonth) {
      const parts = selectedMonth.split(' ');
      const mIdx = monthFullNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
      const mYear = parts[1];
      if (mIdx !== -1 && mYear) {
        targetP = `${mYear}-${String(mIdx + 1).padStart(2, '0')}`;
      }
    }

    const userIzins = (() => {
      if (!hariIzin || !Array.isArray(hariIzin)) return [];
      const uName = (user.nama || "").toLowerCase().trim();
      return hariIzin.filter(iz => (iz.nama || iz.Nama || "").toLowerCase().trim() === uName);
    })();

    attendanceHistory.forEach(item => {
      const timeStr = (item.waktu || item.Waktu || item.timestamp || item.Timestamp || "");
      const date = parseDateHelper(timeStr, targetP);
      if (!date) return;
      const dStr = date.getDate().toString().padStart(2, '0');
      const mStr = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      const mIdx = date.getMonth();
      const key = `${y}${mStr}${dStr}`; 

      const itemJenis = (item.jenis || item.Jenis || '').toLowerCase();
      const itemShift = (item.shift || item.Shift || '');
      const itemCabang = (item.cabang || item.Cabang || '');

      if (!groups[key]) {
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isAkhirBulan = date.getDate() >= 24;
        
        let ketKhusus = '';
        let isHariKhusus = false;
        if (hariKhusus && Array.isArray(hariKhusus)) {
          const matching = hariKhusus.find(h => {
            const hDate = parseDateHelper(h.tanggal || h.Tanggal, targetP);
            return hDate && hDate.getFullYear() === y && hDate.getMonth() === mIdx && hDate.getDate() === date.getDate();
          });
          if (matching) {
            ketKhusus = matching.keterangan || matching.Keterangan || '';
            isHariKhusus = true;
          }
        }

        let isHL = false;
        let hlKet = '';
        if (hariLibur && Array.isArray(hariLibur)) {
          const matchingHl = hariLibur.find(hl => {
            const hlDate = parseDateHelper(hl.tanggal || hl.Tanggal, targetP);
            return hlDate && hlDate.getFullYear() === y && hlDate.getMonth() === mIdx && hlDate.getDate() === date.getDate();
          });
          if (matchingHl) {
            isHL = true;
            hlKet = matchingHl.keterangan || matchingHl.Keterangan || '';
            if (!isHariKhusus) {
              ketKhusus = hlKet;
              isHariKhusus = true;
            }
          }
        }

        let isIzin = false;
        let izinKet = '';
        if (userIzins && userIzins.length > 0) {
          const matchingIz = userIzins.find(iz => {
            const izDate = parseDateHelper(iz.tanggal || iz.Tanggal, targetP);
            return izDate && izDate.getFullYear() === y && izDate.getMonth() === mIdx && izDate.getDate() === date.getDate();
          });
          if (matchingIz) {
            isIzin = true;
            izinKet = matchingIz.keterangan || matchingIz.Keterangan || '';
          }
        }

        groups[key] = {
          dateKey: key, 
          dateDisplay: `${dStr}/${mStr}/${y}`,
          shortDate: `${dayNames[date.getDay()]} ${dStr} ${monthNamesShort[mIdx]}`,
          monthYear: `${monthFullNames[mIdx]} ${y}`,
          cabang: itemCabang, shift: itemShift,
          isWeekendOrAkhir: isWeekend || isAkhirBulan || isHariKhusus,
          keteranganKhusus: ketKhusus,
          isHariLibur: isHL,
          liburKeterangan: hlKet,
          isHariIzin: isIzin,
          izinKeterangan: izinKet,
          hasPendingOffline: Boolean((item as any).isPendingOffline)
        };
      } else if ((item as any).isPendingOffline) {
        groups[key].hasPendingOffline = true;
      }

      const h = date.getHours();
      const m = date.getMinutes();
      const timeHM = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const totalMins = h * 60 + m;
      
      if (itemJenis === 'masuk' && !groups[key].masuk) {
        groups[key].masuk = timeHM;
        
        let targetMasukPagi = 9 * 60;
        let targetMasukSiang = 13 * 60;
        let targetMasukFull = 9 * 60;

        if (user.jamKhusus) {
            const rules = user.jamKhusus.split(',');
            rules.forEach(rule => {
                const parts = rule.split(':').map(s => s.trim());
                if (parts.length >= 2) {
                    const shiftName = parts[0].toLowerCase();
                    const times = parts.slice(1).join(':');
                    const [masukStr] = times.split('-').map(s => s.trim());
                    
                    let masukMins = -1;
                    if (masukStr) {
                        const mParts = masukStr.split(':').map(val => parseInt(val, 10));
                        if (mParts.length >= 2 && !isNaN(mParts[0]) && !isNaN(mParts[1])) masukMins = mParts[0] * 60 + mParts[1];
                    }

                    if (shiftName === 'pagi' && masukMins !== -1) targetMasukPagi = masukMins;
                    else if (shiftName === 'siang' && masukMins !== -1) targetMasukSiang = masukMins;
                    else if (shiftName.includes('full') && masukMins !== -1) targetMasukFull = masukMins;
                }
            });
        }

        let jamMasukMins = 0;
        const sLower = itemShift.toLowerCase();
        if (sLower === 'pagi') jamMasukMins = targetMasukPagi;
        else if (sLower === 'siang') jamMasukMins = targetMasukSiang;
        else if (sLower.includes('full')) jamMasukMins = targetMasukFull;

        if (jamMasukMins > 0) {
           if (totalMins >= jamMasukMins + 180) {
               groups[key].status = '1/2 Hari';
           } else {
               // Only set status if not already 1/2 Hari
               if (groups[key].status !== '1/2 Hari') {
                   if (totalMins > jamMasukMins) groups[key].status = 'Telat';
                   else if (totalMins <= jamMasukMins - 15) groups[key].status = 'Disiplin';
                   else groups[key].status = 'Tepat';
               }
           }
        }
      } else if (itemJenis === 'pulang' && !groups[key].pulang) {
        groups[key].pulang = timeHM;
        
        let targetPulangPagi = 17 * 60;
        let targetPulangSiang = 21 * 60;
        let targetPulangFull = 21 * 60;

        if (user.jamKhusus) {
            const rules = user.jamKhusus.split(',');
            rules.forEach(rule => {
                const parts = rule.split(':').map(s => s.trim());
                if (parts.length >= 2) {
                    const shiftName = parts[0].toLowerCase();
                    const times = parts.slice(1).join(':');
                    const [, pulangStr] = times.split('-').map(s => s.trim());
                    
                    let pulangMins = -1;
                    if (pulangStr) {
                        const pParts = pulangStr.split(':').map(val => parseInt(val, 10));
                        if (pParts.length >= 2 && !isNaN(pParts[0]) && !isNaN(pParts[1])) pulangMins = pParts[0] * 60 + pParts[1];
                    }
                    if (shiftName === 'pagi' && pulangMins !== -1) targetPulangPagi = pulangMins;
                    else if (shiftName === 'siang' && pulangMins !== -1) targetPulangSiang = pulangMins;
                    else if (shiftName.includes('full') && pulangMins !== -1) targetPulangFull = pulangMins;
                }
            });
        }

        let jamPulangMins = 0;
        const sLower = itemShift.toLowerCase();
        if (sLower === 'pagi') jamPulangMins = targetPulangPagi;
        else if (sLower === 'siang') jamPulangMins = targetPulangSiang;
        else if (sLower.includes('full')) jamPulangMins = targetPulangFull;
        
        if (jamPulangMins > 0 && totalMins <= jamPulangMins - 180) {
           groups[key].status = '1/2 Hari'; // Override apapun status masuknya
        }
      }
    });

    const all = Object.values(groups) as GroupedHistory[];
    const filtered = selectedMonth ? all.filter(d => d.monthYear === selectedMonth) : all;
    
    // FILL GAPS ONLY FOR FILTERED LOGS
    const finalLogs: GroupedHistory[] = [...filtered];
    
    if (selectedMonth) {
        const parts = selectedMonth.split(' ');
        const mIdx = monthFullNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
        const mYear = parseInt(parts[1]);

        if (mIdx !== -1 && !isNaN(mYear)) {
          const daysInMonth = new Date(mYear, mIdx + 1, 0).getDate();
          let startDay = 1;
          
          if (effectiveJoinDate) {
             const jYear = effectiveJoinDate.date.getFullYear();
             const jMonth = effectiveJoinDate.date.getMonth();
             if (jYear === mYear && jMonth === mIdx) startDay = effectiveJoinDate.date.getDate();
             else if (jYear > mYear || (jYear === mYear && jMonth > mIdx)) startDay = 999;
          }

          const nowReal = new Date();
          let effectiveEndDay = daysInMonth; 
          
          if (effectiveOutDate) {
             const oYear = effectiveOutDate.date.getFullYear();
             const oMonth = effectiveOutDate.date.getMonth();
             if (oYear === mYear && oMonth === mIdx) {
                effectiveEndDay = Math.min(effectiveEndDay, effectiveOutDate.date.getDate() - 1);
             } else if (oYear < mYear || (oYear === mYear && oMonth < mIdx)) {
                effectiveEndDay = 0;
             }
          }

          if (startDay <= effectiveEndDay) {
             const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
             const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
             
             for (let d = startDay; d <= effectiveEndDay; d++) {
                 const currentDate = new Date(mYear, mIdx, d);
                 const dStrFixed = String(d).padStart(2, '0');
                 const dateKey = `${mYear}${String(mIdx + 1).padStart(2, '0')}${dStrFixed}`;
                 
                 const hasLog = finalLogs.some(log => log.dateKey === dateKey);
                 if (!hasLog) {
                     const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                     const isAkhirBulan = d >= 24;
                     
                     // Tanggal yang belum dilalui di bulan sekarang dikosongkan (tanpa label Libur)
                     const isFuture = selectedMonth === currentMonthYearFilter && currentDate > nowReal;
                     const isToday = currentDate.getFullYear() === nowReal.getFullYear() &&
                                     currentDate.getMonth() === nowReal.getMonth() &&
                                     currentDate.getDate() === nowReal.getDate();
                     const isTodayBefore9PM = isToday && nowReal.getHours() < 21;

                     let ketKhusus = '';
                     let isHariKhusus = false;
                     if (hariKhusus && Array.isArray(hariKhusus)) {
                       const matching = hariKhusus.find(h => {
                         const hDate = parseDateHelper(h.tanggal || h.Tanggal, targetP);
                         return hDate && hDate.getFullYear() === mYear && hDate.getMonth() === mIdx && hDate.getDate() === d;
                       });
                       if (matching) {
                         ketKhusus = matching.keterangan || matching.Keterangan || '';
                         isHariKhusus = true;
                       }
                     }

                     finalLogs.push({
                         dateKey: dateKey,
                         dateDisplay: `${dStrFixed}/${String(mIdx + 1).padStart(2, '0')}/${mYear}`,
                         shortDate: `${dayNames[currentDate.getDay()]} ${dStrFixed} ${monthNamesShort[mIdx]}`,
                         monthYear: `${monthFullNames[mIdx]} ${mYear}`,
                         cabang: '', shift: '', status: isFuture ? '' : (isTodayBefore9PM ? 'Belum' : 'Libur'), 
                         isWeekendOrAkhir: isWeekend || isAkhirBulan || isHariKhusus,
                         keteranganKhusus: ketKhusus,
                         isHariIzin: (userIzins && userIzins.length > 0) ? userIzins.some(iz => {
                           const izDate = parseDateHelper(iz.tanggal || iz.Tanggal, targetP);
                           return izDate && izDate.getFullYear() === mYear && izDate.getMonth() === mIdx && izDate.getDate() === d;
                         }) : false,
                         izinKeterangan: (userIzins && userIzins.length > 0) ? (userIzins.find(iz => {
                           const izDate = parseDateHelper(iz.tanggal || iz.Tanggal, targetP);
                           return izDate && izDate.getFullYear() === mYear && izDate.getMonth() === mIdx && izDate.getDate() === d;
                         })?.keterangan || userIzins.find(iz => {
                           const izDate = parseDateHelper(iz.tanggal || iz.Tanggal, targetP);
                           return izDate && izDate.getFullYear() === mYear && izDate.getMonth() === mIdx && izDate.getDate() === d;
                         })?.Keterangan || '') : ''
                     });

                     if (hariLibur && Array.isArray(hariLibur)) {
                       const matchingHl = hariLibur.find(hl => {
                         const hlDate = parseDateHelper(hl.tanggal || hl.Tanggal, targetP);
                         return hlDate && hlDate.getFullYear() === mYear && hlDate.getMonth() === mIdx && hlDate.getDate() === d;
                       });
                       if (matchingHl) {
                         const lastLog = finalLogs[finalLogs.length - 1];
                         lastLog.isHariLibur = true;
                         lastLog.liburKeterangan = matchingHl.keterangan || matchingHl.Keterangan || '';
                         if (!lastLog.keteranganKhusus) {
                           lastLog.keteranganKhusus = lastLog.liburKeterangan;
                         }
                         lastLog.isWeekendOrAkhir = true;
                       }
                     }
                 }
             }
          }
        }
    }

    finalLogs.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return finalLogs;
  }, [attendanceHistory, selectedMonth, effectiveJoinDate, effectiveOutDate, user.jamKhusus, hariLibur, hariIzin]);

  const totalHadirUnique = useMemo(() => logs.filter(l => (l.status !== 'Libur' && (l.masuk || l.pulang)) || l.isHariLibur).length, [logs]);
  const totalDisiplin = useMemo(() => logs.filter(l => l.status === 'Disiplin').length, [logs]);
  const totalTepatWaktu = useMemo(() => logs.filter(l => l.status === 'Tepat').length, [logs]);
  const totalTelat = useMemo(() => logs.filter(l => l.status === 'Telat').length, [logs]);
  const totalHariLibur = useMemo(() => logs.filter(l => l.status === 'Libur' && l.isHariLibur).length, [logs]);
  const totalSetengahHariWeekday = useMemo(() => logs.filter(l => l.status === '1/2 Hari' && !l.isWeekendOrAkhir).length, [logs]);
  const totalSetengahHariWeekendAkhir = useMemo(() => logs.filter(l => l.status === '1/2 Hari' && l.isWeekendOrAkhir).length, [logs]);
  
  const stats = useMemo(() => {
     let totalLiburWeekday = logs.filter(l => l.status === 'Libur' && !l.isWeekendOrAkhir && !l.isHariLibur).length;
     let totalLiburWeekendAkhir = logs.filter(l => l.status === 'Libur' && l.isWeekendOrAkhir && !l.isHariLibur).length;
     let maxHadir = 0;
     let allowedOffs = 0;

     if (selectedMonth) {
        const parts = selectedMonth.split(' ');
        const mIdx = monthFullNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
        const mYear = parseInt(parts[1]);

        if (mIdx !== -1 && !isNaN(mYear)) {
          const daysInMonth = new Date(mYear, mIdx + 1, 0).getDate();
          
          let holidayCount = 0;
          if (hariLibur && Array.isArray(hariLibur)) {
             holidayCount = hariLibur.filter(hl => {
                const hlDate = parseDateHelper(hl.tanggal || hl.Tanggal, selectedMonth);
                return hlDate && hlDate.getFullYear() === mYear && hlDate.getMonth() === mIdx;
             }).length;
          }
          
          let startDay = 1;
          
          if (effectiveJoinDate) {
             const jYear = effectiveJoinDate.date.getFullYear();
             const jMonth = effectiveJoinDate.date.getMonth();
             if (jYear === mYear && jMonth === mIdx) startDay = effectiveJoinDate.date.getDate();
             else if (jYear > mYear || (jYear === mYear && jMonth > mIdx)) startDay = 999;
          }

          let effectiveEndDay = daysInMonth; 
          
          if (effectiveOutDate) {
             const oYear = effectiveOutDate.date.getFullYear();
             const oMonth = effectiveOutDate.date.getMonth();
             if (oYear === mYear && oMonth === mIdx) {
                effectiveEndDay = Math.min(effectiveEndDay, effectiveOutDate.date.getDate() - 1);
             } else if (oYear < mYear || (oYear === mYear && oMonth < mIdx)) {
                effectiveEndDay = 0;
             }
          }

          if (startDay <= effectiveEndDay) {
             const totalDaysPotential = effectiveEndDay - startDay + 1;
             if (totalDaysPotential > 0) {
                 if (user.jabatan && user.jabatan.toUpperCase() !== 'PKL') {
                     allowedOffs = 3;
                     maxHadir = Math.max(0, daysInMonth - 3);
                 } else {
                     const totalWeeks = totalDaysPotential / 7;
                     allowedOffs = Math.floor(totalWeeks); 
                     maxHadir = totalDaysPotential - allowedOffs;
                 }
             }
          }
        }
     }
     
     const totalLibur = totalLiburWeekday + totalLiburWeekendAkhir;
     const totalTrackedDays = totalHadirUnique + totalLibur;
     const attendanceProgress = maxHadir > 0 ? Math.round((totalHadirUnique / maxHadir) * 100) : 0;
     const hadirSegmentRatio = totalTrackedDays > 0 ? totalHadirUnique / totalTrackedDays : 0;
     const liburSegmentRatio = totalTrackedDays > 0 ? totalLibur / totalTrackedDays : 0;
     const hadirDashLength = hadirSegmentRatio * 263.89;
     const liburDashLength = liburSegmentRatio * 263.89;

     return {
        totalLiburWeekday, totalLiburWeekendAkhir, totalLibur, maxHadir, allowedOffs, 
        totalTrackedDays, attendanceProgress, hadirDashLength, liburDashLength
     };
  }, [logs, selectedMonth, effectiveJoinDate, effectiveOutDate, totalHadirUnique, user.jabatan, hariLibur]);

  const { totalLibur, maxHadir, attendanceProgress, hadirDashLength, liburDashLength } = stats;
  const totalLiburWeekendAkhir = stats.totalLiburWeekendAkhir;

  const scoringStats = useMemo(() => {
    let regPoint = 0;
    let kruPoint = 0;
    let counts = { disiplin: 0, tepat: 0, telatReg: 0, telatKru: 0, setengahHariReg: 0, setengahHariKru: 0, liburReg: 0, liburKru: 0, absen: 0, hariLibur: 0 };
    
    const isCurrentMonth = selectedMonth === currentMonthYearFilter;
    
    logs.forEach(log => {
      const isKrusial = log.isWeekendOrAkhir;
      let points = 0;
      
      if (log.status === 'Libur' && log.isHariLibur) {
        // Holiday counts as present, with 10 points
        counts.hariLibur++;
        points = 10;
      } else if (log.status === 'Libur') {
        counts.absen++;
        if (log.isHariIzin) {
          counts.liburReg++;
          points = 0;
        } else {
          if (isKrusial) counts.liburKru++;
          else counts.liburReg++;
          points = isKrusial ? -10 : 0;
        }
      } else if (log.status === 'Disiplin') {
        counts.disiplin++;
        points = 10;
      } else if (log.status === 'Tepat') {
        counts.tepat++;
        points = 8;
      } else if (log.status === 'Telat') {
        if (isKrusial) counts.telatKru++;
        else counts.telatReg++;
        points = isKrusial ? 1 : 3;
      } else if (log.status === '1/2 Hari') {
        if (isKrusial) counts.setengahHariKru++;
        else counts.setengahHariReg++;
        points = isKrusial ? -5 : 1;
      }
      
      // Jika bulan berjalan, abaikan poin negatif
      if (isCurrentMonth && points < 0) points = 0;

      if (isKrusial) kruPoint += points;
      else regPoint += points;
    });
    
    const totalPoint = regPoint + kruPoint;
    
    // Perhitungan Target Maksimal: (Jumlah hari di bulan - hari libur) * 10
    // Divisi PKL: 4 hari libur. Lainnya: 3 hari libur.
    const isPKL = user.jabatan?.toUpperCase() === 'PKL';
    
    // Get total days in the current selected month
    // Handle format "Mei 26" by finding the month index and extracting the year
    const monthsNames = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];
    const sLower = selectedMonth.toLowerCase();
    const monthIndex = monthsNames.findIndex(m => sLower.includes(m));
    const yearMatch = selectedMonth.match(/\d{2,4}/);
    
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    
    if (monthIndex !== -1) {
      month = monthIndex + 1;
    }
    if (yearMatch) {
      year = parseInt(yearMatch[0]);
      if (year < 100) year += 2000;
    }
    
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const targetPeriodeStr = `${year}-${String(month).padStart(2, '0')}`;
    const allowedLibur = getAllowedLibur(Boolean(isPKL), targetPeriodeStr);
    const targetDays = Math.max(0, totalDaysInMonth - allowedLibur);
    const targetMaksimal = targetDays * 10;

    // Handle both positive and negative scores for display
    const rawSkorAkhir = targetMaksimal > 0 ? (totalPoint / targetMaksimal) * 100 : 0;
    const skorAkhir = Math.round(rawSkorAkhir);
    
    // Data for Donut Chart with "Stacking" effect for > 100%
    // If score > 100, we show 100% in one color and the overflow in a darker/stacked color
    const chartData = [];
    if (skorAkhir <= 100) {
      chartData.push({ name: 'Score', value: Math.max(0, skorAkhir), color: '#10b981' });
      chartData.push({ name: 'Remaining', value: Math.max(0, 100 - skorAkhir), color: 'rgba(255,255,255,0.05)' });
    } else {
      // Stacking logic: 100% base + overflow
      chartData.push({ name: 'Base', value: 100, color: '#059669' }); // Darker emerald
      chartData.push({ name: 'Overflow', value: skorAkhir - 100, color: '#10b981' }); // Bright emerald
    }
    
    return { regPoint, kruPoint, totalPoint, targetMaksimal, skorAkhir, counts, chartData, targetDays, allowedLibur };
  }, [logs, user.jabatan, selectedMonth]);

  const months = useMemo(() => {
    const extracted = Array.from(new Set(attendanceHistory.map(item => {
      const timeStr = (item as any).waktu || (item as any).Waktu || (item as any).timestamp || (item as any).Timestamp;
      const date = parseDateHelper(timeStr);
      if (!date) return "";
      return `${monthFullNames[date.getMonth()]} ${date.getFullYear()}`;
    }))).filter(m => m !== "");
    
    // Pastikan bulan sekarang selalu ada
    if (!extracted.includes(currentMonthYearFilter)) {
      extracted.unshift(currentMonthYearFilter);
    }
    return extracted;
  }, [attendanceHistory, currentMonthYearFilter]);

  if (showSuccessView) {
    return (
      <div className="relative z-20 min-h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 max-w-lg mx-auto px-4">
           <div className={`glass-card p-10 !rounded-[3rem] w-full text-center space-y-8 bg-black/20 border-2 ${isSavedOffline ? 'border-amber-400/40 shadow-[0_0_50px_rgba(251,191,36,0.18)]' : 'border-emerald-500/30 shadow-[0_0_50px_rgba(52,211,153,0.2)]'}`}>
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 border ${isSavedOffline ? 'bg-amber-500/20 border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_30px_rgba(52,211,153,0.3)]'}`}>
                {isSavedOffline ? (
                  <Clock size={48} className="text-amber-300" />
                ) : (
                  <CheckCircle2 size={50} className="text-emerald-400" />
                )}
              </div>
              <div className="space-y-4">
                 <h3 className="text-3xl font-medium text-white leading-none">
                   {isSavedOffline ? 'Tersimpan di Antrean Offline' : 'Absensi Berhasil'}
                 </h3>
                 <p className={`text-sm font-medium ${isSavedOffline ? 'text-amber-300' : 'text-emerald-glow'}`}>
                   {isSavedOffline ? 'Waktu Klik & Foto Aman Tersimpan di HP' : 'Data Tersimpan di Server'}
                 </p>
                 <p className="text-white/60 text-sm font-normal leading-relaxed px-2">
                   {isSavedOffline
                     ? 'Koneksi internet sedang tidak stabil/sibuk. Jam absen asli saat Anda menekan tombol, lokasi GPS, dan foto selfie telah diamankan di HP dan akan dikirim otomatis ke server begitu sinyal stabil.'
                     : 'Terima kasih atas dedikasi Anda hari ini. Selamat bekerja dan berikan yang terbaik!'}
                 </p>
              </div>
              <button 
                onClick={() => {
                  setShowSuccessView(false);
                  setIsSavedOffline(false);
                  onAttendanceSuccess(); 
                }}
                className="glass-button w-full !rounded-2xl active-emerald-tab mt-2"
              >
                Lanjut ke Materi
              </button>
           </div>
      </div>
    );
  }

  return (
    <div className="relative z-20 space-y-8 animate-in fade-in duration-700 max-w-lg mx-auto pb-32 px-4">
      <div className="flex items-center glass-card p-1.5 !rounded-full h-14 bg-black/50 border border-white/5">
        <button onClick={() => setActiveView('absen')} className={`flex-1 h-full rounded-full text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${activeView === 'absen' ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-white/60 hover:text-white'}`}>
          <Camera size={14} /> Absensi
        </button>
        <button onClick={() => setActiveView('laporan')} className={`flex-1 h-full rounded-full text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${activeView === 'laporan' ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-white/60 hover:text-white'}`}>
          <History size={14} /> Riwayat
          {pendingOutbox.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-400 text-black font-black">
              {pendingOutbox.length}
            </span>
          )}
        </button>
      </div>

      {pendingOutbox.length > 0 && (
        <div className="glass-card p-4 !rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3 text-left">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 mt-0.5">
              <Clock size={15} className="text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300">
                {pendingOutbox.length} Absensi dalam Antrean Offline
              </p>
              <p className="text-[11px] text-white/70 leading-snug mt-0.5">
                Jam absen asli sudah tercatat. Otomatis terkirim saat sinyal stabil.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={syncOfflineQueue}
            disabled={isSyncingOutbox}
            className="shrink-0 px-3 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-200 text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <RefreshCw size={12} className={isSyncingOutbox ? 'animate-spin' : ''} />
            {isSyncingOutbox ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>
      )}

      {activeView === 'absen' ? (
        <div className="space-y-6 flex flex-col items-center">
          <header className="text-center w-full">
            <h2 className="text-3xl font-medium text-white">Presensi Digital</h2>
            <p className="text-emerald-glow text-sm font-medium mt-2">{currentTime.toLocaleTimeString('id-ID')}</p>
          </header>

          <div className="glass-card p-8 !rounded-[2.5rem] space-y-6 bg-black/20 w-full text-left">
            <div className="flex gap-2">
              <button disabled={isCurrentlyCheckedIn || loading} onClick={() => setJenis('Masuk')} className={`flex-1 py-4 rounded-xl text-xs font-medium ${jenis === 'Masuk' ? 'active-emerald-tab' : 'bg-white/5 opacity-60'}`}>Masuk {isCurrentlyCheckedIn && "✓"}</button>
              <button disabled={!isCurrentlyCheckedIn || loading} onClick={() => setJenis('Pulang')} className={`flex-1 py-4 rounded-xl text-xs font-medium ${jenis === 'Pulang' ? 'active-emerald-tab' : 'bg-white/5 opacity-60'}`}>Pulang</button>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2 w-full">
                <label className="text-xs opacity-60 ml-2 font-medium text-white">Shift Kerja</label>
                <select value={shift} onChange={(e) => setShift(e.target.value)} disabled={isCurrentlyCheckedIn} className="glass-input !h-14 !rounded-xl text-sm font-medium">
                  <option value="">-- Pilih Shift --</option>
                  {(() => {
                    let pagiText = "Pagi (09:00-17:00)";
                    let siangText = "Siang (13:00-21:00)";
                    let fullText = "Full Day (09:00-21:00)";

                    if (user.jamKhusus) {
                      const rules = user.jamKhusus.split(',');
                      rules.forEach(rule => {
                        const parts = rule.split(':').map(s => s.trim());
                        if (parts.length >= 2) {
                          const shiftName = parts[0].toLowerCase();
                          const times = parts.slice(1).join(':');
                          if (shiftName === 'pagi') pagiText = `Pagi (${times})`;
                          else if (shiftName === 'siang') siangText = `Siang (${times})`;
                          else if (shiftName.includes('full')) fullText = `Full Day (${times})`;
                        }
                      });
                    }

                    return (
                      <>
                        <option value="Pagi">{pagiText}</option>
                        <option value="Siang">{siangText}</option>
                        <option value="Full Day">{fullText}</option>
                      </>
                    );
                  })()}
                </select>
              </div>
              
              <div className="space-y-2 w-full">
                <label className="text-xs opacity-60 ml-2 font-medium text-white">Lokasi Cabang</label>
                <select value={cabang} onChange={(e) => setCabang(e.target.value)} className="glass-input !h-14 !rounded-xl text-sm font-medium">
                  <option value="">-- Pilih Lokasi --</option>
                  {lokasiData.map((l: any, i) => {
                    const n = String(l?.namacabang || l?.nama || l?.Nama || "Cabang Flow");
                    return <option key={i} value={n}>{n}</option>; // No Uppercase
                  })}
                </select>
              </div>
            </div>
            
            {cabang && (
              <div className="pt-2 flex flex-col gap-1 px-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium opacity-60 italic">Status GPS:</span>
                  <button 
                    onClick={() => {
                      setGps(null);
                      setGpsError(null);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
                        (err) => setGpsError(err.message),
                        { enableHighAccuracy: true }
                      );
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 active:scale-95 transition-transform ${gps ? 'text-emerald-400' : 'text-amber-400'}`}
                  >
                    {gps ? (gps.accuracy < 50 ? 'Akurasi Tinggi' : 'Akurasi Rendah') : gpsError ? 'Error GPS' : 'Mencari Lokasi...'}
                    {gps && <span className="ml-1 opacity-50">↻</span>}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium opacity-60 italic">Jarak Radius:</span>
                  <span className={`text-xs font-medium ${isInsideRadius === false ? 'text-red-500' : isInsideRadius === true ? 'text-emerald-400' : 'text-white/40'}`}>
                    {distance !== null ? `${Math.round(distance)} Meter` : (allowedRadius === 0 && cabang) ? 'Radius Bebas' : 'Mendeteksi...'} 
                    {isInsideRadius === true ? (allowedRadius > 0 ? ' (Di Area)' : '') : isInsideRadius === false ? ' (Diluar Radius)' : ''}
                  </span>
                </div>
                {gpsError && <p className="text-[10px] text-red-400 text-right font-light animate-pulse">! {gpsError}</p>}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center py-4 w-full relative">
            <div className="camera-circle-frame shadow-2xl relative mb-4" onClick={startCamera}>
              {isCameraOpen ? (
                <video ref={videoRef} autoPlay playsInline muted style={{ transform: 'scaleX(-1)' }} />
              ) : photo ? (
                <div className="relative w-full h-full">
                  <img src={photo} alt="Selfie" className="w-full h-full object-cover" />
                  <button onClick={resetPhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 glass-card !rounded-full flex items-center justify-center border border-white/20 active:scale-90 transition-transform bg-red-500/30 z-50 shadow-xl">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="text-center opacity-60 flex flex-col items-center">
                  <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                  <p className="text-xs font-medium">Klik Selfie</p>
                </div>
              )}
              {isCameraOpen && (
                <div className="absolute bottom-6 inset-x-0 flex justify-center z-10">
                  <button onClick={takePhoto} className="w-14 h-14 rounded-full border-[4px] border-emerald-400/50 bg-emerald-400/20 active:scale-95 transition-transform shadow-lg" />
                </div>
              )}
            </div>
            
            {isCameraOpen && (
              <p className="text-xs font-medium text-emerald-glow animate-breathing leading-tight drop-shadow-xl text-center">
                Pastikan wajah terlihat <br/> jelas di dalam salon
              </p>
            )}
          </div>

          <button 
            onClick={handleAbsen} 
            disabled={loading || !photo || isInsideRadius === false || (!gps && allowedRadius !== 0)} 
            className={`glass-button w-full !rounded-2xl ${(!photo || loading || isInsideRadius === false || (!gps && allowedRadius !== 0)) ? 'opacity-60' : 'active-emerald-tab'}`}
          >
            {loading ? "Menyimpan Absensi..." : 
             !photo ? "Ambil Foto Dulu" :
             isInsideRadius === false ? "Diluar Radius" : 
             (!gps && allowedRadius !== 0) ? "GPS Belum Aktif" :
             `Konfirmasi ${jenis}`}
          </button>
        </div>
      ) : (
        <div className="space-y-8 pt-2 text-left">
          <div className="space-y-2 px-1">
             <div className="flex items-center justify-between">
                <label className="text-xs opacity-60 font-medium text-white ml-2">Filter Periode</label>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleForceRefresh} 
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 text-[11px] bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition-all text-emerald-400 px-3 py-1 rounded-full font-bold shadow-sm"
                  >
                    <RefreshCw size={10} className={`${isSyncing ? 'animate-spin' : ''}`} /> Sinkronkan
                  </button>
                </div>
             </div>
             <select 
               value={selectedMonth} 
               onChange={(e) => {
                 const val = e.target.value;
                 setSelectedMonth(val);
                 if (onPeriodChange) {
                   const p = convertMonthYearToPeriode(val);
                   if (p) onPeriodChange(p);
                 }
               }} 
               className="glass-input !h-14 !rounded-2xl text-sm font-medium bg-black/60 border border-white/5 shadow-2xl"
             >
               {months.length > 0 ? months.map((m, i) => <option key={i} value={m}>{m}</option>) : <option value={selectedMonth}>{selectedMonth}</option>}
             </select>

             {onNavigate && (
               <button
                 type="button"
                 onClick={() => onNavigate('salary')}
                 className="mt-3 w-full glass-card p-4 !rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between hover:bg-emerald-500/20 active:scale-[0.98] transition-all text-left"
               >
                 <div className="flex items-center gap-2.5">
                   <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                   <p className="text-xs font-semibold text-emerald-glow">Lihat Rincian Slot Gaji Periode Ini</p>
                 </div>
                 <span className="text-[10px] text-white/50 uppercase tracking-widest font-black">
                   Buka Gaji ➜
                 </span>
               </button>
             )}
             
             <div className="flex justify-center pt-1">
               <span className="text-xs text-white/60 font-mono">
                 Join: {effectiveJoinDate ? `${effectiveJoinDate.date.getDate().toString().padStart(2, '0')}/${(effectiveJoinDate.date.getMonth()+1).toString().padStart(2, '0')}/${effectiveJoinDate.date.getFullYear()}` : "Tidak Terdeteksi"} 
               </span>
              </div>
          </div>

          <div className="glass-card p-6 !rounded-[2.5rem] bg-black/30 border border-white/5 space-y-6 shadow-2xl overflow-hidden px-4">
            {/* SCORE DASHBOARD */}
            <div className="space-y-6 pt-2">
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scoringStats.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={80}
                        paddingAngle={0}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                        cornerRadius={10}
                      >
                        {scoringStats.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">SKOR<br/>KEDISIPLINAN</p>
                    <p className="text-4xl font-black text-emerald-400 mt-1">{scoringStats.skorAkhir}</p>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-emerald-400/80 italic">
                    ({scoringStats.totalPoint} / {scoringStats.targetMaksimal}) x 100 = {scoringStats.skorAkhir}
                  </p>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] leading-tight">
                    FORMULA: (TOTAL POIN / TARGET MAKSIMAL) X 100
                  </p>
                </div>
              </div>

              <div className="bg-white/5 h-[1px] w-full mx-auto my-4"></div>

              <div className="flex justify-between items-start px-4">
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">REGULER</p>
                  <p className="text-xl font-bold text-white">{scoringStats.regPoint}</p>
                </div>
                <div className="w-[1px] h-8 bg-white/10 mt-1"></div>
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">KRUSIAL</p>
                  <p className="text-xl font-bold text-white">{scoringStats.kruPoint}</p>
                </div>
                <div className="w-[1px] h-8 bg-white/10 mt-1"></div>
                <div className="text-center flex-1">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">TOTAL</p>
                  <p className="text-xl font-bold text-emerald-400">{scoringStats.totalPoint}</p>
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY STATISTICS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">SUMMARY STATISTICS</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* TARGETS FIRST AS CARDS */}
              <div className="glass-card bg-black/30 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-1 border border-white/5">
                <p className="text-[10px] font-bold text-white/80 mb-2 uppercase tracking-widest text-center">TOTAL HADIR</p>
                <p className="text-3xl font-black text-white text-center">{totalHadirUnique}</p>
                <p className="text-[9px] text-white/40 text-center leading-tight">Target hadir: {scoringStats.targetDays}</p>
              </div>

              <div className="glass-card bg-emerald-500/10 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-1 border-2 border-emerald-500/30">
                <p className="text-[10px] font-bold text-emerald-400 mb-2 uppercase tracking-widest text-center">HARI LIBUR</p>
                <p className="text-3xl font-black text-emerald-400 text-center">{totalHariLibur}</p>
                <p className="text-[9px] text-emerald-400/60 text-center leading-tight">Tetap digaji dan skor +10</p>
              </div>

              <div className="glass-card bg-black/30 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-1 border border-white/5">
                <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-2 text-center">Disiplin</p>
                <p className="text-4xl font-bold text-white text-center">{scoringStats.counts.disiplin}</p>
                <p className="text-[9px] text-white/40 text-center leading-tight">Minimal 15 menit<br/>sebelum masuk</p>
              </div>
              <div className="glass-card bg-black/30 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-1 border border-white/5">
                <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-2 text-center">Tepat</p>
                <p className="text-4xl font-bold text-white text-center">{scoringStats.counts.tepat}</p>
                <p className="text-[9px] text-white/40 text-center leading-tight">14 mnt sebelum s/d<br/>tepat jam masuk</p>
              </div>
              
              <div className="glass-card bg-black/30 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-1 border border-white/5">
                <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-2 text-center">Telat</p>
                <p className="text-4xl font-bold text-white text-center">{scoringStats.counts.telatReg}</p>
                <p className="text-[9px] text-white/40 text-center leading-tight">Melewati jam<br/>masuk</p>
              </div>

              <div className="glass-card bg-black/30 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-1 border border-white/5">
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-2 text-center">Telat Krusial</p>
                <p className="text-4xl font-bold text-white text-center">{scoringStats.counts.telatKru}</p>
                <p className="text-[9px] text-white/40 text-center leading-tight">Sabtu/Minggu atau<br/>Tgl 24 ke atas</p>
              </div>

              <div className="glass-card bg-black/30 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-1 border border-white/5">
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-2 text-center">1/2 Hari</p>
                <p className="text-4xl font-bold text-white text-center">{scoringStats.counts.setengahHariReg}</p>
                <p className="text-[9px] text-white/40 text-center leading-tight">Hari biasa<br/>(Senin - Jumat)</p>
              </div>

              <div className="glass-card bg-black/30 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-1 border border-white/5">
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-2 text-center">1/2 Hari Krusial</p>
                <p className="text-4xl font-bold text-white text-center">{scoringStats.counts.setengahHariKru}</p>
                <p className="text-[9px] text-white/40 text-center leading-tight">Sabtu/Minggu atau<br/>Tgl 24 ke atas</p>
              </div>

              <div className="glass-card bg-black/30 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-1 border border-white/5">
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-2 text-center">Libur</p>
                <p className="text-4xl font-bold text-white text-center">{scoringStats.counts.liburReg}</p>
                <p className="text-[9px] text-white/40 text-center leading-tight">Senin s/d Jumat</p>
              </div>

              <div className="glass-card bg-black/30 p-6 rounded-[2rem] flex flex-col items-center justify-center space-y-1 border border-white/5">
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-2 text-center">Libur Krusial</p>
                <p className="text-4xl font-bold text-white text-center">{scoringStats.counts.liburKru}</p>
                <p className="text-[9px] text-white/40 text-center leading-tight">Sabtu/Minggu atau<br/>Tgl 24 ke atas</p>
              </div>
            </div>
          </div>

          {/* SCORING MATRIX */}
          <div className="space-y-4">
             <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">SCORING MATRIX</h3>
             <div className="glass-card p-6 !rounded-[2.5rem] bg-black/30 border border-white/5 shadow-2xl space-y-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      <th className="pb-4 font-bold">CATEGORY</th>
                      <th className="pb-4 font-bold text-center">REGULER</th>
                      <th className="pb-4 font-bold text-center">KRUSIAL</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold">
                    <tr>
                      <td className="py-3 text-emerald-400">Disiplin</td>
                      <td className="py-3 text-emerald-400 text-center">+10</td>
                      <td className="py-3 text-emerald-400 text-center">+10</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-white/80">Tepat</td>
                      <td className="py-3 text-white/80 text-center">+8</td>
                      <td className="py-3 text-white/80 text-center">+8</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-orange-400">Telat</td>
                      <td className="py-3 text-orange-400 text-center">+3</td>
                      <td className="py-3 text-orange-400 text-center">+1</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-[#ff9e8a] font-bold">1/2 Hari</td>
                      <td className="py-3 text-[#ff9e8a] text-center font-bold">+1</td>
                      <td className="py-3 text-[#ff9e8a] text-center font-bold">-5</td>
                    </tr>
                    <tr>
                      <td className="py-3 text-[#ff7a7a] font-bold">Libur</td>
                      <td className="py-3 text-[#ff7a7a] text-center font-bold">0</td>
                      <td className="py-3 text-[#ff7a7a] text-center font-bold">-10</td>
                    </tr>
                  </tbody>
                </table>
                <div className="pt-4 border-t border-white/5 space-y-2">
                   <p className="text-[10px] text-white/40 italic">* HARI KRUSIAL: SABTU, MINGGU, TANGGAL 24 S/D AKHIR BULAN, ATAU HARI KHUSUS.</p>
                   <p className="text-[10px] text-white/40 italic">* PARTIAL: TERLAMBAT {'>'} 3 JAM ATAU PULANG CEPAT {'>'} 3 JAM.</p>
                </div>
             </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">REKAP ABSENSI</h3>
            <div className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5 space-y-2">
              <div className="flex gap-2">
                <span className="text-[#ff9e8a] shrink-0 text-xs">•</span>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Tanggal yang backgroundnya gelap adalah <strong>hari krusial</strong> yang memiliki bobot 2x hari biasa. Libur di hari tersebut tidak digaji + potongan gaji 1 hari.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="text-[#ff9e8a] shrink-0 text-xs">•</span>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Hari krusial: <strong>Weekend, Tgl 24 - akhir bulan, Hari Khusus.</strong>
                </p>
              </div>
            </div>
            <div className="space-y-3">
               {logs.length > 0 ? logs.map((log, i) => (
                 <div key={i} className={`glass-card px-3 py-2.5 !rounded-2xl flex flex-col shadow-xl min-h-[70px] relative overflow-hidden ${log.isHariLibur ? 'border-2 border-emerald-400' : 'border border-white/5'}`}>
                    {log.isHariIzin ? (
                       <div className="absolute inset-0 bg-[#ff9e8a]/12 z-0"></div>
                    ) : log.isWeekendOrAkhir ? (
                       <div className="absolute inset-0 bg-black/40 z-0"></div>
                    ) : null}
                    
                    <div className="relative z-10 flex items-center justify-between w-full h-full">
                       {/* Kolom 1: Tanggal & Cabang */}
                       <div className="flex-1 text-left min-w-0 pr-2 flex flex-col justify-center">
                          {(() => {
                            const parts = log.shortDate.split(' ');
                            if (parts.length >= 3) {
                              const dayName = parts[0];
                              const dateAndMonth = `${parts[1]} ${parts[2]}`;
                              return (
                                <>
                                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-0.5">{dayName}</p>
                                  <p className="text-sm font-bold text-white leading-tight">{dateAndMonth}</p>
                                </>
                              );
                            }
                            return <p className="text-sm font-medium text-white leading-tight">{log.shortDate}</p>;
                          })()}
                          {!log.isHariLibur && !log.isHariIzin && log.status !== 'Libur' && log.status !== '' && (
                            <p className="text-xs font-normal text-white/60 truncate w-full capitalize mt-1">
                              {log.cabang ? log.cabang.toLowerCase() : 'Flow Salon'}
                            </p>
                          )}
                       </div>
                       
                       {/* Kolom 2: Shift & Status (Atas-Bawah) */}
                       <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                          {log.isHariLibur ? (<p className="text-sm font-bold text-emerald-400">Digaji</p>) : false ? (
                             <span className="text-white/20">-</span>
                          ) : (log.isHariIzin || log.status === 'Libur') ? (
                             <p className="text-sm font-bold text-[#ff7a7a]">{log.isHariIzin ? 'Izin' : 'Libur'}</p>
                          ) : log.status === 'Belum' ? (
                             <p className="text-sm font-bold text-yellow-400">Belum</p>
                          ) : log.status === '' ? (
                             <span className="text-white/20">-</span>
                          ) : (
                             <>
                               <p className="text-[10px] font-medium text-white/60 leading-none mb-1">
                                 {log.shift === 'Full Day' ? 'Full Day' : `Shift ${String(log.shift || '').toLowerCase()}`}
                               </p>
                               <p className={`text-[11px] font-bold ${
                                 log.status === 'Disiplin' ? 'text-emerald-400' :
                                 log.status === 'Tepat' ? 'text-white' :
                                 log.status === 'Telat' ? 'text-orange-400' : 
                                 log.status === '1/2 Hari' ? 'text-[#ff9e8a]' :
                                 'text-emerald-400'
                               }`}>
                                 {log.status}
                               </p>
                             </>
                          )}
                       </div>
                       
                       {/* Kolom 3: Jam Masuk/Pulang */}
                       <div className="flex-1 flex flex-col items-end justify-center text-right pl-2">
                           {(log.masuk || log.pulang) ? (
                             <>
                               <p className="text-sm font-medium text-white/60 italic tracking-tighter">{log.masuk || '--:--'}</p>
                               <p className="text-sm font-medium text-white/60 italic tracking-tighter">{log.pulang || '--:--'}</p>
                               {log.hasPendingOffline && (
                                 <span className="mt-0.5 text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 px-1.5 py-0.5 rounded-md">
                                   Antrean Offline
                                 </span>
                               )}
                             </>
                           ) : (
                             <span className="text-white/20">-</span>
                           )}
                        </div>
                     </div>

                     {/* Baris Bawah: Keterangan Hari Khusus / Hari Libur / Izin */}
                     {(log.isHariLibur || log.isHariIzin || log.keteranganKhusus) && (
                       <div className="relative z-10 w-full mt-2 pt-1.5 border-t border-white/5 text-center">
                          <p className={`text-[11px] font-black uppercase tracking-wider leading-normal ${log.isHariLibur ? 'text-emerald-400' : 'text-[#ff9e8a]'}`}>
                             {log.isHariLibur ? (log.liburKeterangan ? (log.liburKeterangan.toLowerCase().startsWith('libur') ? log.liburKeterangan : `Libur ${log.liburKeterangan}`) : 'Hari Libur') :
                              log.isHariIzin ? `${log.izinKeterangan || 'Tanpa Keterangan'}` :
                              log.keteranganKhusus}
                          </p>
                       </div>
                     )}

                     <div className="hidden flex-row w-0 h-0">
                       <div className="hidden">
                          {(log.masuk || log.pulang) ? (
                            <>
                              <p className="text-sm font-medium text-white/60 italic tracking-tighter">{log.masuk || '--:--'}</p>
                              <p className="text-sm font-medium text-white/60 italic tracking-tighter">{log.pulang || '--:--'}</p>
                            </>
                          ) : (
                            <span className="text-white/20">-</span>
                          )}
                       </div>
                    </div>


                 </div>
               )) : <div className="py-20 text-center opacity-60 text-xs font-medium">{isSyncing ? "Loading..." : "Riwayat Kosong"}</div>}
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
