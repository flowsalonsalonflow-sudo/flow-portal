import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  MapPin, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Wallet,
  ChevronRight,
  Search,
  Calendar,
  X,
  Pencil,
  Trash2,
  Plus,
  Info,
  Star
} from 'lucide-react';
import { 
  api 
} from '../services/apiService';

const SkeletonItem = ({ className = "" }: { className?: string }) => (
  <div className={`skeleton-shimmer rounded-xl ${className}`} />
);

export function getEmployeeRoles(jabatanStr: string) {
  if (!jabatanStr) return { isPKL: false, isStylist: false };
  const roles = String(jabatanStr).split(",").map(r => r.toLowerCase().trim());
  const isPKL = roles.some(r => r.indexOf("pkl") !== -1);
  const isStylist = roles.some(r => r === "stylist");
  return { isPKL, isStylist };
}

export const DEFAULT_POINT_PRODUK = [
  { produk: "Celana Dalam", komisi: 2000, point: 0.5 },
  { produk: "Sisir Bulu Mata", komisi: 5000, point: 0.5 },
  { produk: "Vitamin Kuku", komisi: 5000, point: 1 },
  { produk: "Mylea Hair Tonic", komisi: 15000, point: 1 },
  { produk: "Oshine", komisi: 10000, point: 2 },
  { produk: "Serum Eyelash Lashboost", komisi: 10000, point: 1 },
  { produk: "Morphosis Bundling Treatment", komisi: 100000, point: 10 },
  { produk: "Morphosis Sublimis Oil", komisi: 100000, point: 10 },
  { produk: "Morphosis Sublimis Shine", komisi: 100000, point: 10 },
  { produk: "Collagen S", komisi: 5000, point: 0.5 },
  { produk: "Collagen M", komisi: 10000, point: 1 },
  { produk: "Collagen L", komisi: 15000, point: 1.5 },
  { produk: "Collagen XL", komisi: 20000, point: 2 },
  { produk: "Collagen XXL", komisi: 25000, point: 2.5 }
];

export function getProductPointAndKomisi(entry: any, pointProdukList?: any[]) {
  const listToUse = (pointProdukList && pointProdukList.length > 0) ? pointProdukList : DEFAULT_POINT_PRODUK;
  
  const itemText = entry.item || entry.Item || entry.produk || entry.Produk || "";
  const skuText = entry.sku || entry.SKU || "";
  
  const normItem = itemText.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const normSku = skuText.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  
  const info = listToUse.find((p: any) => {
    const pName = (p.produk || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    return pName && (
      (normItem && normItem === pName) || 
      (normItem && normItem.indexOf(pName) !== -1) || 
      (normItem && pName.indexOf(normItem) !== -1) || 
      (normSku && normSku === pName) || 
      (normSku && normSku.indexOf(pName) !== -1)
    );
  });
  
  if (info) {
    return { point: Number(info.point || 0), komisi: Number(info.komisi || 0) };
  }
  
  const cleanSku = skuText.toLowerCase().trim();
  const isBeautyProduct = 
    cleanSku.indexOf("prd-clg") === 0 || 
    cleanSku === "prd-osh" ||         
    cleanSku === "prd-selb" ||        
    cleanSku === "prd-vtk" ||         
    cleanSku === "prd-ssal" ||        
    cleanSku === "prd-cd";
  
  let fallbackKomisi = 0;
  let fallbackPoint = 1;
  
  if (cleanSku === "prd-osh") {
    fallbackKomisi = 10000;
    fallbackPoint = 2;
  } else if (cleanSku === "prd-cd") {
    fallbackKomisi = 2000;
    fallbackPoint = 0.5;
  } else if (cleanSku === "prd-ssal") {
    fallbackKomisi = 5000;
    fallbackPoint = 0.5;
  } else if (cleanSku === "prd-vtk") {
    fallbackKomisi = 5000;
    fallbackPoint = 1;
  } else if (cleanSku === "prd-selb") {
    fallbackKomisi = 10000;
    fallbackPoint = 1;
  } else if (cleanSku.indexOf("prd-clg-s") === 0) {
    fallbackKomisi = 5000;
    fallbackPoint = 0.5;
  } else if (cleanSku.indexOf("prd-clg-m") === 0) {
    fallbackKomisi = 10000;
    fallbackPoint = 1;
  } else if (cleanSku.indexOf("prd-clg-l") === 0) {
    fallbackKomisi = 15000;
    fallbackPoint = 1.5;
  } else if (cleanSku.indexOf("prd-clg-xl") === 0) {
    fallbackKomisi = 20000;
    fallbackPoint = 2;
  } else if (cleanSku.indexOf("prd-clg-xxl") === 0) {
    fallbackKomisi = 25000;
    fallbackPoint = 2.5;
  } else if (isBeautyProduct) {
    fallbackKomisi = Math.round((Number(entry.harga_item || entry.Harga_Item || entry.harga || 0)) * 0.10);
  }
  
  return { point: fallbackPoint, komisi: fallbackKomisi };
}

interface StudentPerformance {
  nama: string;
  totalHadir: number;
  totalTelat: number;
  totalAbsen: number;
  quotaLibur: number;
  isBolos: boolean;
  kepatuhan: number;
}

interface EmployeeProfile {
  nama: string;
  divisi: string;
  jabatan?: string;
  cabang: string;
  gaji_akhir: number;
  kasbon: number;
}

interface StudentStatus {
  nama: string;
  status: string;
  time: string;
  isLate: boolean;
  isHalfDay: boolean;
  cabang: string;
}

interface DashboardData {
  summary: {
    totalKaryawan: number;
    hadirHariIni: number;
    telatHariIni: number;
    liburHariIni: number;
  };
  stats: StudentPerformance[];
  dailyStatus: StudentStatus[];
  analytics: {
    topDisiplin: { nama: string; kepatuhan: number }[];
    topTelat: { nama: string; totalTelat: number }[];
    topBolos: { nama: string; totalAbsen: number; quotaLibur: number }[];
  };
  gajiStats: (EmployeeProfile & { 
    sisa_gaji: number;
    gaji_aktual: number;
    total_kasbon: number;
    bonus_absen: number;
    total_komisi: number;
    total_point: number;
    point_rp: number;
    email: string;
    libur_points: number;
    total_transferred: number;
    hariLibur?: number;
    gaji_harian_precise?: number;
    komisi_tambahan?: number;
    komisi_tambahan_list?: any[];
  })[];
}

export const Attendance: React.FC<{ externalSelectedStat?: any, onExternalSelect?: (val: any) => void, onSalaryDetailToggle?: (isOpen: boolean) => void }> = ({ externalSelectedStat, onExternalSelect, onSalaryDetailToggle }) => {
  const [activeTab, setActiveTab] = useState<'harian' | 'performa' | 'gaji'>('harian');
  
  // Safe LocalStorage Wrapper
  const safeSetItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`LocalStorage write failed for ${key}:`, e);
      // If it fails, we just don't cache it. 
      // We could try clearing other keys but that's risky.
    }
  };

  const [attendanceData, setAttendanceData] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('glow_attendance_cache');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [employeeData, setEmployeeData] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('glow_employee_cache');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [hariKhusus, setHariKhusus] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('glow_hari_khusus_cache');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [hariLibur, setHariLibur] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('glow_hari_libur_cache');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [hariIzin, setHariIzin] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('glow_hari_izin_cache');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(!attendanceData.length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dailyFilter, setDailyFilter] = useState<'Hadir' | 'Libur' | 'Telat' | null>(null);
  const [reportSort, setReportSort] = useState<'skor' | 'hadir' | 'telat' | 'bolos'>('skor');
  const [gajiSort, setGajiSort] = useState<'total' | 'komisi' | 'point' | 'absen'>('total');
  const [isMockData, setIsMockData] = useState(false);
  const [localSelectedStat, setLocalSelectedStat] = useState<StudentPerformance | null>(null);
  
  const [salaryDetails, setSalaryDetails] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('glow_salary_details_cache');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const salaryMonthCacheRef = useRef<Record<string, any[]>>({});
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  
  const [selectedSalaryStat, setSelectedSalaryStat] = useState<any | null>(null);
  const [loadingDetailPayload, setLoadingDetailPayload] = useState<boolean>(false);
  const [showPointDetails, setShowPointDetails] = useState<boolean>(false);
  const [showCommissionDetails, setShowCommissionDetails] = useState<boolean>(false);
  const [commissionTab, setCommissionTab] = useState<'treatment' | 'produk' | 'tambahan'>('treatment');
  const [transferInput, setTransferInput] = useState<{empEmail: string, month: string} | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));

  const [transfers, setTransfers] = useState<Record<string, {amount: number, date: string}[]>>(() => {
    try {
      const saved = localStorage.getItem('glow_salary_transfers');
      return saved ? JSON.parse(saved) : {};
    } catch (e) { return {}; }
  });

  const [kasbonDialog, setKasbonDialog] = useState<{
    show: boolean;
    isEdit: boolean;
    data: {
      tanggal: string;
      item: string;
      nominal: string;
      email: string;
      nama: string;
      oldData?: any;
    };
  }>({
    show: false,
    isEdit: false,
    data: { tanggal: new Date().toISOString().slice(0, 10), item: "", nominal: "", email: "", nama: "" }
  });

  const [isSubmittingKasbon, setIsSubmittingKasbon] = useState(false);

  useEffect(() => {
    safeSetItem('glow_salary_transfers', JSON.stringify(transfers));
  }, [transfers]);

  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const addTransfer = async () => {
    if (!transferInput || !transferAmount) return;
    const amount = parseInt(transferAmount.replace(/[^\d]/g, ''));
    if (isNaN(amount)) return;

    const emp = dashboardData.gajiStats.find(e => e.email === transferInput.empEmail);
    if (!emp) return;

    try {
      setIsSubmittingTransfer(true);
      const res = await api.submitTransfer({
        email: transferInput.empEmail,
        nama: emp.nama,
        periode: transferInput.month,
        nominal: amount,
        tanggal: transferDate
      });
      if (res.status === 'sukses') {
        const key = `${transferInput.empEmail.toLowerCase().trim()}_${transferInput.month}`;
        setTransfers(prev => {
          const updated = { ...prev };
          if (!updated[key]) updated[key] = [];
          updated[key] = [...updated[key], { amount, date: transferDate }];
          return updated;
        });
        setTransferInput(null);
        setTransferAmount("");
        alert("Input transfer telah disimpan");
      } else {
        alert(res.message || "Gagal menyimpan transfer");
      }
    } catch (e) {
      alert("Terjadi kesalahan.");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleKasbonSubmit = async () => {
    if (!kasbonDialog.data.item || !kasbonDialog.data.nominal) {
      alert("Harap isi semua data kasbon.");
      return;
    }

    try {
      setIsSubmittingKasbon(true);
      const res = await api.submitKasbon({
        ...kasbonDialog.data,
        isEdit: kasbonDialog.isEdit
      });

      if (res.status === 'sukses') {
        setKasbonDialog(prev => ({ ...prev, show: false }));
        setRefreshKey(prev => prev + 1); // Refresh data
      } else {
        alert(res.message || "Gagal menyimpan kasbon");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setIsSubmittingKasbon(false);
    }
  };

  const handleKasbonDelete = async (kasbonItem: any) => {
    if (!confirm(`Hapus kasbon "${kasbonItem.item}" senilai Rp ${parseFloat(kasbonItem.nominal).toLocaleString('id-ID')}?`)) return;

    try {
      setIsSyncing(true);
      const res = await api.deleteKasbon({
        email: selectedSalaryStat?.email || '',
        tanggal: kasbonItem.tanggal,
        item: kasbonItem.item,
        nominal: kasbonItem.nominal
      });

      if (res.status === 'sukses') {
        setRefreshKey(prev => prev + 1);
      } else {
        alert(res.message || "Gagal menghapus kasbon");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const selectedStat = externalSelectedStat || localSelectedStat;
  const setSelectedStat = (val: any) => {
    setLocalSelectedStat(val);
    if (onExternalSelect) onExternalSelect(val);
  };
  const [editingEntry, setEditingEntry] = useState<{nama: string, waktu: string, jenis: string, current: string, email?: string, existingCabang?: string} | null>(null);
  const [newTimeVal, setNewTimeVal] = useState("");
  const [selectedEditCabang, setSelectedEditCabang] = useState("");
  
  // Filters
  const [selectedDivisions, setSelectedDivisions] = useState<Set<string>>(new Set(['Semua']));
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set(['Semua']));
  const [filterMonths, setFilterMonths] = useState<Set<string>>(new Set([new Date().toISOString().slice(0, 7)]));
  const [searchTerm, setSearchTerm] = useState("");

  // Format dates gracefully to Indonesian (e.g., "1 Mei")
  const formatIndoDate = (dateVal: string | number): string => {
    if (!dateVal) return '';
    let valStr = String(dateVal);
    // If it is in YYYY-MM-DD format, replace '-' with '/' to force local time parsing and avoid timezone shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(valStr)) {
      valStr = valStr.replace(/-/g, '/');
    }
    const d = new Date(valStr);
    if (isNaN(d.getTime())) return String(dateVal);
    const indonesianMonths = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${d.getDate()} ${indonesianMonths[d.getMonth()]}`;
  };

  const formatIndoDateShort = (dateVal: string | number): string => {
    if (!dateVal) return '';
    let valStr = String(dateVal);
    if (/^\d{4}-\d{2}-\d{2}$/.test(valStr)) {
      valStr = valStr.replace(/-/g, '/');
    }
    const d = new Date(valStr);
    if (isNaN(d.getTime())) return String(dateVal);
    const indonesianMonthsShort = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];
    return `${d.getDate()} ${indonesianMonthsShort[d.getMonth()]}`;
  };

  // Utility for robust date parsing from sheet formats (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, Month/DD/YYYY, with timestamps & full ID/EN support)
  const parseSheetDate = (dateStr: any, targetMonthStr?: string): string => {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    if (!trimmed) return '';

    // 1. Direct ISO date or ISO timestamp prefix: YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Indonesian & English Month list (with abbreviations)
    const monthMap: Record<string, string> = {
      'jan': '01', 'januari': '01', 'january': '01',
      'feb': '02', 'februari': '02', 'february': '02',
      'mar': '03', 'maret': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'mei': '05', 'may': '05',
      'jun': '06', 'juni': '06', 'june': '06',
      'jul': '07', 'juli': '07', 'july': '07',
      'agu': '08', 'agt': '08', 'agustus': '08', 'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'okt': '10', 'oktober': '10', 'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'des': '12', 'desember': '12', 'dec': '12', 'december': '12'
    };

    // Strip trailing time part (e.g., "14:23:10", "T08:30:00.000Z", "09.15") so time digits aren't mistaken for date tokens
    const dateOnly = trimmed
      .replace(/T\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z?$/i, '')
      .replace(/\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?(?:\s*[ap]m)?$/i, '')
      .trim();

    // Replace all slashes, dashes, commas, dots with space
    const cleaned = dateOnly.replace(/[/|,.T\-]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
    const tokens = cleaned.split(' ').filter(Boolean);

    if (tokens.length >= 3) {
      // Find year, which is a 4-digit number (or 2-digit fallback at end)
      const yIdx = tokens.findIndex(t => /^\d{4}$/.test(t));
      let y = '';
      const remaining = [...tokens];
      if (yIdx !== -1) {
        y = tokens[yIdx];
        remaining.splice(yIdx, 1);
      } else {
        const last = tokens[tokens.length - 1];
        if (/^\d{2,4}$/.test(last)) {
          y = last.length === 2 ? `20${last}` : last;
          remaining.pop();
        }
      }

      if (y) {
        let m = '';
        let d = '';

        // Check if there is an alphabetical month name
        const mIdx = remaining.findIndex(t => monthMap[t] !== undefined || monthMap[t.slice(0, 3)] !== undefined);
        if (mIdx !== -1) {
          m = monthMap[remaining[mIdx]] || monthMap[remaining[mIdx].slice(0, 3)];
          remaining.splice(mIdx, 1);
          const dToken = remaining.find(t => /^\d{1,2}$/.test(t));
          if (dToken) {
            d = dToken.padStart(2, '0');
          }
        } else {
          // Both are numbers. E.g. ["5", "29"] or ["29", "5"] or ["08", "11"]
          const numTokens = remaining.filter(t => /^\d{1,2}$/.test(t));
          if (numTokens.length >= 2) {
            const first = parseInt(numTokens[0], 10);
            const second = parseInt(numTokens[1], 10);

            if (first > 12) {
              d = String(first).padStart(2, '0');
              m = String(second).padStart(2, '0');
            } else if (second > 12) {
              m = String(first).padStart(2, '0');
              d = String(second).padStart(2, '0');
            } else if (targetMonthStr && /^\d{4}-\d{2}$/.test(targetMonthStr)) {
              const targetM = parseInt(targetMonthStr.split('-')[1], 10);
              if (first === targetM && second !== targetM) {
                m = String(first).padStart(2, '0');
                d = String(second).padStart(2, '0');
              } else if (second === targetM && first !== targetM) {
                d = String(first).padStart(2, '0');
                m = String(second).padStart(2, '0');
              } else {
                // Default to DD/MM when targetMonth matches both or neither
                d = String(first).padStart(2, '0');
                m = String(second).padStart(2, '0');
              }
            } else {
              // Default to MM/DD when no targetMonthStr is provided
              m = String(first).padStart(2, '0');
              d = String(second).padStart(2, '0');
            }
          }
        }

        if (y && m && d) {
          return `${y}-${m}-${d}`;
        }
      }
    }

    // Fallback to standard JS Date parser
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(parsedDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }

    return trimmed;
  };

  // Extract raw registration/join date from employee object (prioritizing Column A of "Karyawan" tab)
  const getEmpJoinDateRaw = (emp: any): string => {
    if (!emp) return '';
    const candidates = [
      emp._colA_iso,
      emp.masuk_tgl_iso,
      emp.join_date_iso,
      emp.timestamp_iso,
      emp.daftar_iso,
      emp.waktu_iso,
      emp.tanggal_iso,
      emp.JoinDateRaw,
      emp.masuk_tgl,
      emp.Masuk_Tgl,
      emp.join_date,
      emp.Join_Date,
      emp.joinDate,
      emp.JoinDate,
      emp['Join Date'],
      emp['Tgl Masuk'],
      emp['Tanggal Bergabung'],
      emp.timestamp,
      emp.Timestamp,
      emp.waktu,
      emp.Waktu,
      emp.daftar,
      emp.Daftar,
      emp.tanggal,
      emp.Tanggal,
      emp._colA
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null && String(c).trim() !== '') {
        return String(c).trim();
      }
    }
    // Fallback: in getSheetData("Karyawan"), the first key after "rowId" is Column A (registration timestamp)
    const keys = Object.keys(emp).filter(k => k !== 'rowId');
    if (keys.length > 0) {
      const firstVal = emp[keys[0]];
      if (firstVal !== undefined && firstVal !== null) {
        const s = String(firstVal).trim();
        if (s && /\d{4}/.test(s) && (/[-/.]/.test(s) || /\b(?:jan|feb|mar|apr|mei|may|jun|jul|agu|agt|aug|sep|okt|oct|nov|des|dec)/i.test(s))) {
          return s;
        }
      }
    }
    return '';
  };

  const getEmpJoinDateStr = (emp: any, targetMonthStr?: string): string => {
    const raw = getEmpJoinDateRaw(emp);
    if (!raw) return '';
    return parseSheetDate(raw, targetMonthStr);
  };

  const getEmpOutDateStr = (emp: any, targetMonthStr?: string): string => {
    if (!emp) return '';
    const raw =
      emp.keluar_tgl_iso ||
      emp.resign_date_iso ||
      emp.OutDateRaw ||
      emp.OutDate ||
      emp.outDate ||
      emp.keluar_tgl ||
      emp.Keluar_Tgl ||
      emp.resign_date ||
      emp.Resign_Date ||
      '';
    if (!raw) return '';
    return parseSheetDate(raw, targetMonthStr);
  };

  const isEmployeeRegisteredInFilter = (emp: any, filterMonthsSet: Set<string>): boolean => {
    const raw = getEmpJoinDateRaw(emp);
    if (!raw) return true;

    for (const m of Array.from(filterMonthsSet)) {
      const regDateParsed = parseSheetDate(raw, m);
      if (!regDateParsed || !/^\d{4}-\d{2}-\d{2}$/.test(regDateParsed)) return true;
      const regMonth = regDateParsed.slice(0, 7); // "YYYY-MM"
      if (regMonth <= m) {
        return true;
      }
    }
    return false;
  };

  const getTimeMinutes = (timeStr: any): number => {
    if (!timeStr) return 0;
    const strVal = String(timeStr);
    const [h, m] = strVal.split(/[:.]/).map(n => parseInt(n, 10) || 0);
    return h * 60 + m;
  };

  const getShiftTargets = (shiftName: string, jamKhususStr: string) => {
    let t_m_p = 9 * 60,   t_p_p = 17 * 60;
    let t_m_s = 13 * 60,  t_p_s = 21 * 60;
    let t_m_f = 9 * 60,   t_p_f = 21 * 60;

    if (jamKhususStr) {
      jamKhususStr.split(',').forEach(rule => {
        const ruleTrim = rule.trim();
        if (!ruleTrim) return;
        const parts = ruleTrim.split(':').map(s => s.trim());
        const isShiftRule = parts.length >= 2 && isNaN(Number(parts[0]));
        if (isShiftRule) {
          const sName = parts[0].toLowerCase();
          const timeRangeStr = parts.slice(1).join(':');
          const rangeParts = timeRangeStr.split('-').map(s => s.trim());
          if (rangeParts.length >= 2) {
            const mStr = rangeParts[0];
            const pStr = rangeParts[1];
            const toMins = (s: string) => {
              if (!s) return -1;
              const b = s.split(/[:.]/).map(v => parseInt(v, 10));
              return b.length >= 2 ? b[0] * 60 + b[1] : -1;
            };
            const mM = toMins(mStr);
            const pM = toMins(pStr);
            if (sName === 'pagi') { 
              if (mM !== -1) t_m_p = mM; 
              if (pM !== -1) t_p_p = pM; 
            } else if (sName === 'siang') { 
              if (mM !== -1) t_m_s = mM; 
              if (pM !== -1) t_p_s = pM; 
            } else if (sName.includes('full')) { 
              if (mM !== -1) t_m_f = mM; 
              if (pM !== -1) t_p_f = pM; 
            }
          }
        } else {
          const matchRange = ruleTrim.match(/^(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})$/);
          if (matchRange) {
            const m = parseInt(matchRange[1], 10) * 60 + parseInt(matchRange[2], 10);
            const p = parseInt(matchRange[3], 10) * 60 + parseInt(matchRange[4], 10);
            t_m_p = m; t_p_p = p;
            t_m_s = m; t_p_s = p;
            t_m_f = m; t_p_f = p;
          } else {
            const matchSingle = ruleTrim.match(/^(\d{1,2})[:.](\d{2})$/);
            if (matchSingle) {
              const m = parseInt(matchSingle[1], 10) * 60 + parseInt(matchSingle[2], 10);
              t_m_p = m; t_m_s = m; t_m_f = m;
            }
          }
        }
      });
    }

    const sL = (shiftName || '').toLowerCase().trim();
    let jM = 9 * 60;
    let jP = 17 * 60;
    if (sL === 'pagi') {
      jM = t_m_p;
      jP = t_p_p;
    } else if (sL === 'siang') {
      jM = t_m_s;
      jP = t_p_s;
    } else if (sL.includes('full')) {
      jM = t_m_f;
      jP = t_p_f;
    } else {
      jM = t_m_p;
      jP = t_p_p;
    }

    return { jM, jP };
  };

// Removed paidEmployees state

// Removed clearPaid

  const parseCurrency = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    // Remove symbols like Rp, dots, and spaces
    const cleaned = String(val).replace(/[^\d]/g, '');
    return parseFloat(cleaned) || 0;
  };

  useEffect(() => {
    const fetchData = async (force = false) => {
      // Simple cache check: only re-fetch if forced or > 5 minutes since last fetch
      const now = Date.now();
      if (!force && lastFetchTime > 0 && (now - lastFetchTime) < 300000) {
        return;
      }

      // Only show full-screen blocking loader if we have no cached data yet
      if (attendanceData.length === 0 && employeeData.length === 0) {
        setLoading(true);
      }
      setIsSyncing(true);
      setErrorMessage(null);
      try {
        const response = await api.getAllHistory();
        console.log("Portal Data Response:", response);
        
        if (response && !response.error) {
          const rawHistory = response.history || [];
          const rawEmployees = response.employees || [];

          setLastFetchTime(now);

          const normalizedEmp = rawEmployees.map((emp: any) => {
            const rawJoin = getEmpJoinDateRaw(emp);
            const parsedJoin = parseSheetDate(rawJoin);
            return {
              ...emp,
              Nama: (emp.Nama || emp.nama || '').trim(),
              Divisi: emp.Divisi || emp.divisi || emp.Jabatan || emp.jabatan || 'Stylist',
              Cabang: emp.Cabang || emp.cabang || 'Utama',
              JoinDateRaw: rawJoin,
              JoinDate: parsedJoin,
              Daftar: parsedJoin,
              OutDateRaw: emp.keluar_tgl_iso || emp.keluar_tgl || emp.Keluar_Tgl || emp.resign_date || emp.Resign_Date || '',
              OutDate: getEmpOutDateStr(emp),
              JamKhusus: emp.Jam_Khusus || emp.jam_khusus || emp['Jam Khusus'] || '',
              gaji_akhir: parseCurrency(emp.gaji_akhir || emp.gaji || 0),
              kasbon: parseCurrency(emp.kasbon || 0)
            };
          });

          // Normalisasi History
          const normalizedAtt = rawHistory.map((att: any) => {
            const timeVal = att.Waktu || att.waktu || att.timestamp || '';
            const jenisVal = att.Jenis || att.jenis || '';
            let dateStr = att.Tanggal || att.tanggal || '';
            let clockStr = att.Jam || att.jam || '';

            if (timeVal) {
              const d = new Date(timeVal);
              if (!isNaN(d.getTime())) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                dateStr = `${y}-${m}-${dd}`;
                if (!clockStr) clockStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
              }
            }
            
            // Final check and robust parsing for dateStr to ensure it becomes YYYY-MM-DD
            dateStr = parseSheetDate(dateStr);

            return {
              ...att,
              Nama: (att.Nama || att.nama || '').trim(),
              Tanggal: dateStr,
              Jam: clockStr,
              Jenis: jenisVal,
              Status: att.Status || (jenisVal.toLowerCase() === 'masuk' ? 'Hadir' : 'Pulang')
            };
          });

          setAttendanceData(normalizedAtt);
          setEmployeeData(normalizedEmp);
          setHariKhusus(response.hariKhusus || []);
          setHariLibur(response.hariLibur || []);
          setHariIzin(response.hariIzin || []);
          
          if (response.transfers && Array.isArray(response.transfers)) {
            const parsedTransfers: Record<string, {amount: number, date: string}[]> = {};
            response.transfers.forEach((t: any) => {
               const email = (t.email || "").toString().toLowerCase().trim();
               const periode = (t.periode || "").toString().trim();
               if(!email || !periode) return;
               const key = `${email}_${periode}`;
               if(!parsedTransfers[key]) parsedTransfers[key] = [];
               parsedTransfers[key].push({
                   amount: Number(t.nominal || 0),
                   date: t.tanggal || t.waktu || t.date || new Date().toISOString()
               });
            });
            setTransfers(parsedTransfers);
            safeSetItem('glow_salary_transfers', JSON.stringify(parsedTransfers));
          }

          safeSetItem('glow_attendance_cache', JSON.stringify(normalizedAtt));
          safeSetItem('glow_employee_cache', JSON.stringify(normalizedEmp));
          safeSetItem('glow_hari_khusus_cache', JSON.stringify(response.hariKhusus || []));
          safeSetItem('glow_hari_libur_cache', JSON.stringify(response.hariLibur || []));
          safeSetItem('glow_hari_izin_cache', JSON.stringify(response.hariIzin || []));
          setIsMockData(response._isMock || false);
          
          console.log("Portal Connected. Employees:", normalizedEmp.length, "History:", normalizedAtt.length);
          
          if (normalizedEmp.length === 0) {
            console.warn("Sheet Karyawan kosong atau tidak ditemukan.");
          }
        } else if (response && response.error) {
           setErrorMessage(response.error);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal terhubung ke server');
      } finally {
        setLoading(false);
        setIsSyncing(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  useEffect(() => {
    const fetchSalary = async () => {
      if (filterMonths.size === 0) return;

      const months = Array.from(filterMonths);
      const missingMonths = months.filter(m => !salaryMonthCacheRef.current[`${m}_${refreshKey}`]);

      // If all selected months are already cached in memory for this refreshKey, assemble immediately without network fetch
      if (missingMonths.length === 0) {
        const cachedCombined: any[] = [];
        months.forEach(m => {
          const entries = salaryMonthCacheRef.current[`${m}_${refreshKey}`] || [];
          cachedCombined.push(...entries);
        });
        setSalaryDetails(cachedCombined);
        return;
      }

      if (activeTab === 'gaji') {
        setLoadingSalary(true);
      }

      try {
        const fetchedRes = await Promise.all(missingMonths.map(m => api.getAllSalaryData(m)));
        fetchedRes.forEach((res, idx) => {
          const monthStr = missingMonths[idx];
          if (res && res.status === 'sukses' && Array.isArray(res.data)) {
            const dataWithMonth = res.data.map((item: any) => ({
              ...item,
              sourceMonth: monthStr
            }));
            salaryMonthCacheRef.current[`${monthStr}_${refreshKey}`] = dataWithMonth;
          }
        });

        const combined: any[] = [];
        months.forEach(m => {
          const entries = salaryMonthCacheRef.current[`${m}_${refreshKey}`];
          if (entries) {
            combined.push(...entries);
          }
        });

        if (combined.length > 0) {
          setSalaryDetails(combined);
          safeSetItem('glow_salary_details_cache', JSON.stringify(combined));
        }
      } catch (e) {
        console.error("Error fetching salary details:", e);
      } finally {
        setLoadingSalary(false);
      }
    };
    fetchSalary();
  }, [activeTab, filterMonths, refreshKey]);

  useEffect(() => {
    const fetchIndividualDetails = async () => {
      if (!selectedSalaryStat) return;
      // If full details were already loaded from getAllSalaryData, skip the redundant network call
      if (selectedSalaryStat._hasFullDetails) {
        setLoadingDetailPayload(false);
        return;
      }
      const email = selectedSalaryStat.email;
      const periode = selectedSalaryStat.month || selectedSalaryStat.periode || Array.from(filterMonths)[0] || '';
      
      if (email && periode) {
        setLoadingDetailPayload(true);
        try {
          const res = await api.getSalaryData(email, periode);
          if (res && res.status === 'sukses') {
            const extraData = res;
            setSelectedSalaryStat((prev: any) => {
              if (!prev || prev.email !== email) return prev;
              
              const pointProdukList = extraData.point_produk || [];
              const userImportKomisi = extraData.import_komisi || [];
              const userTransaksiProd = extraData.transaksi_prod || [];
              
              const parseToDateKey = (dateStr: any): string => {
                if (!dateStr) return '';
                return parseSheetDate(dateStr, periode);
              };
              
              const dailyGroups: { [key: string]: any } = {};
              userImportKomisi.forEach((item: any) => {
                const rawDate = item.tanggal || item.dateKey || '';
                const dateKey = parseToDateKey(rawDate);
                if (!dateKey) return;
                
                if (!dailyGroups[dateKey]) {
                  dailyGroups[dateKey] = {
                    tanggal: item.tanggal || dateKey,
                    omset: 0,
                    komisi: 0,
                    prod: 0,
                    prodEntries: []
                  };
                }
                dailyGroups[dateKey].omset += Number(item.omset || 0);
                dailyGroups[dateKey].komisi += Number(item.komisi || 0);
              });
              
              userTransaksiProd.forEach((item: any) => {
                const rawDate = item.tanggal || item.dateKey || '';
                const dateKey = parseToDateKey(rawDate);
                if (!dateKey) return;
                
                if (!dailyGroups[dateKey]) {
                  dailyGroups[dateKey] = {
                    tanggal: item.tanggal || dateKey,
                    omset: 0,
                    komisi: 0,
                    prod: 0,
                    prodEntries: []
                  };
                }
                const price = Number(item.harga_item || item.harga || 0);
                const qty = Number(item.jumlah || item.qty || 1);
                dailyGroups[dateKey].prod += (price * qty);
                dailyGroups[dateKey].prodEntries.push({
                  sku: item.sku || item.SKU || '',
                  item: item.item || item.Item || item.produk || item.Produk || '',
                  harga: price,
                  qty: qty,
                  komisi: Number(item.komisi || 0)
                });
              });
              
              const computedList = Object.keys(dailyGroups).sort().map(key => {
                const group = dailyGroups[key];
                const netLayanan = Math.max(0, group.omset - group.prod);
                const p = Math.floor(netLayanan / 500000);
                
                let dailyKomisiProduk = 0;
                group.prodEntries.forEach((entry: any) => {
                  if (entry.komisi && entry.komisi > 0) {
                    dailyKomisiProduk += entry.komisi;
                  } else {
                    const info = getProductPointAndKomisi(entry, pointProdukList);
                    dailyKomisiProduk += info.komisi * entry.qty;
                  }
                });
                
                const komisiLayanan = Math.max(0, group.komisi - dailyKomisiProduk);
                return {
                  tanggal: group.tanggal,
                  dateKey: key,
                  omset: group.omset,
                  prod_omset: group.prod,
                  net_layanan: netLayanan,
                  komisi: group.komisi,
                  komisi_produk: dailyKomisiProduk,
                  komisi_layanan: komisiLayanan,
                  point: p
                };
              });

              let totalOmsetLayananMonth = 0;
              let totalKomisiLayananMonth = 0;
              let totalKomisiProdukMonth = 0;

              computedList.forEach(item => {
                totalOmsetLayananMonth += item.net_layanan;
                totalKomisiLayananMonth += item.komisi_layanan;
                totalKomisiProdukMonth += item.komisi_produk;
              });

              let totalProductPointsSold = 0;
              userTransaksiProd.forEach((item: any) => {
                const info = getProductPointAndKomisi(item, pointProdukList);
                const qty = Number(item.jumlah || item.qty || 1);
                totalProductPointsSold += (info.point * qty);
              });

              const rolesInfo = getEmployeeRoles(prev.jabatan || prev.divisi);
              const isPKL = rolesInfo.isPKL;
              const isStylist = rolesInfo.isStylist;

              const targetOmsetMaster = prev.target_omset_master || 0;
              let targetLayananVal = 0;
              let hasReachedTarget = false;
              
              if (!isPKL) {
                if (targetOmsetMaster === 0) {
                   hasReachedTarget = true;
                   targetLayananVal = 0;
                } else {
                   targetLayananVal = totalProductPointsSold >= 10 ? Math.min(6000000, targetOmsetMaster) : targetOmsetMaster;
                   hasReachedTarget = (totalOmsetLayananMonth >= targetOmsetMaster) || (totalProductPointsSold >= 10 && totalOmsetLayananMonth >= 6000000);
                }
              }

              const finalKomisiLayanan = hasReachedTarget ? totalKomisiLayananMonth : 0;
              const finalKomisiProduk = isPKL ? 0 : totalKomisiProdukMonth;
              
              const komisiTambahanRawList = extraData.komisi_tambahan_list || extraData.komisi_tambahan || [];
              const komisiTambahanList = Array.isArray(komisiTambahanRawList) ? komisiTambahanRawList : [];
              const totalKomisiTambahan = typeof extraData.komisi_tambahan === 'number'
                ? extraData.komisi_tambahan
                : komisiTambahanList.reduce((sum: number, item: any) => sum + Number(item.nominal || 0), 0);

              const finalKomisi = finalKomisiLayanan + finalKomisiProduk + totalKomisiTambahan;

              return {
                ...prev,
                total_omset_layanan: totalOmsetLayananMonth,
                total_products_sold: totalProductPointsSold,
                has_reached_target: hasReachedTarget,
                target_layanan_val: targetLayananVal,
                is_stylist: isStylist,
                is_pkl: isPKL,
                komisi_layanan: finalKomisiLayanan,
                komisi_produk: finalKomisiProduk,
                komisi_tambahan: totalKomisiTambahan,
                komisi_tambahan_list: komisiTambahanList,
                total_komisi: finalKomisi,
                import_komisi: computedList,
                transaksi_prod: userTransaksiProd,
                point_produk: pointProdukList,
                point_list: extraData.point_list || prev.point_list || []
              };
            });
          }
        } catch (e) {
          console.error("Error loading extra salary breakdown:", e);
        } finally {
          setLoadingDetailPayload(false);
        }
      }
    };
    
    fetchIndividualDetails();
  }, [selectedSalaryStat?.email, selectedSalaryStat?.month, selectedSalaryStat?.periode]);

  const handleTimeUpdate = async () => {
    if (!editingEntry || !newTimeVal) return;
    
    // Check if branch selection is needed for new entry
    if (editingEntry.current === '--:--' && !editingEntry.existingCabang && !selectedEditCabang) {
      alert("Silakan pilih cabang terlebih dahulu.");
      return;
    }

    try {
      setIsSyncing(true);
      const res = await api.updateAbsen({
        nama: editingEntry.nama,
        email: editingEntry.email || '',
        waktu: editingEntry.waktu,
        jenis: editingEntry.jenis,
        newTime: newTimeVal,
        cabang: editingEntry.existingCabang || selectedEditCabang
      });

      if (res.status === 'sukses') {
        // Optimistic update
        setAttendanceData(prev => prev.map(a => {
          const isTarget = (a.Nama || '').toLowerCase().trim() === editingEntry.nama.toLowerCase().trim() && 
                           (a.Waktu === editingEntry.waktu || a.waktu === editingEntry.waktu || a.timestamp === editingEntry.waktu) &&
                           ((a.Jenis || a.jenis || '').toLowerCase() === editingEntry.jenis.toLowerCase());
          
          if (isTarget) {
            return {
              ...a,
              Jam: newTimeVal
            };
          }
          return a;
        }));
        
        setRefreshKey(p => p + 1);
        setEditingEntry(null);
      } else {
        alert("Gagal: " + res.message);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const attendanceByUser = useMemo(() => {
    const map = new Map<string, any[]>();
    attendanceData.forEach(att => {
      const name = (att.Nama || '').toLowerCase().trim();
      if (!name) return;
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(att);
    });
    return map;
  }, [attendanceData]);

  // Helper for consistent stats calculation
  const getDetailedStats = (empNama: string, monthStrings: string[]) => {
    let totalStats = {
        hadir: 0, libur: 0, elite: 0, standard: 0, warning: 0, partial: 0, 
        partialWeekday: 0, partialKrusial: 0,
        telatReguler: 0, telatKrusial: 0,
        liburReguler: 0, liburKrusial: 0,
        absenPenalty: 0,
        totalPointsReg: 0, totalPointsKrusial: 0, workedDays: 0,
        liburWeekend: 0, liburWeekday: 0,
        liburPoints: 0,
        hariLiburCount: 0,
        hariIzinCount: 0
    };

    const normalizedTargetName = empNama.toLowerCase().trim();
    const empInfo = employeeData.find(e => (e.Nama || '').toLowerCase().trim() === normalizedTargetName);
    const isPKL = (empInfo?.Divisi || '').toUpperCase().includes('PKL');
    
    // Jam Khusus Parsing (e.g. "Full:11:00-21:00" or "11:00")
    let targetMinutes = 10 * 60; // 10:00
    if (empInfo?.JamKhusus) {
        const match = String(empInfo.JamKhusus).match(/(\d{1,2})[:.](\d{2})/);
        if (match) {
            targetMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        }
    }

    const userHistory = attendanceByUser.get(normalizedTargetName) || [];

    monthStrings.forEach(monthStr => {
        const year = parseInt(monthStr.split('-')[0]);
        const month = parseInt(monthStr.split('-')[1]) - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0,0,0,0);

        const salMatch = salaryDetails.find(s => (s.nama || s.Nama || '').toLowerCase().trim() === normalizedTargetName);
        const joinDateParsed = getEmpJoinDateStr(empInfo, monthStr) || getEmpJoinDateStr(salMatch, monthStr);
        let joinDate: Date | null = null;
        if (joinDateParsed && /^\d{4}-\d{2}-\d{2}$/.test(joinDateParsed)) {
            const [y, m, d] = joinDateParsed.split('-').map(Number);
            joinDate = new Date(y, m - 1, d);
        }
        if (joinDate && !isNaN(joinDate.getTime())) {
            joinDate.setHours(0, 0, 0, 0);
        } else {
            joinDate = null;
        }

        const outDateParsed = getEmpOutDateStr(empInfo, monthStr) || getEmpOutDateStr(salMatch, monthStr);
        let outDate: Date | null = null;
        if (outDateParsed && /^\d{4}-\d{2}-\d{2}$/.test(outDateParsed)) {
            const [y, m, d] = outDateParsed.split('-').map(Number);
            outDate = new Date(y, m - 1, d);
        }
        if (outDate && !isNaN(outDate.getTime())) {
            outDate.setHours(0, 0, 0, 0);
        } else {
            outDate = null;
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dateObj = new Date(year, month, i);
            dateObj.setHours(0, 0, 0, 0);
            // Skip dates before the employee's registration/join timestamp (Column A of "Karyawan")
            // and dates on or after their resign/out date.
            if (joinDate && dateObj < joinDate) continue;
            if (outDate && dateObj >= outDate) continue;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dayOfWeek = dateObj.getDay(); // 0: Sun, 6: Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isLateMonth = i >= 24;
            
            const isHK = hariKhusus.some(hk => {
                const hkDate = parseSheetDate(hk.tanggal || hk.Tanggal);
                return hkDate === dateStr;
            });

            const isHL = hariLibur.some(hl => {
                const hlDate = parseSheetDate(hl.tanggal || hl.Tanggal);
                return hlDate === dateStr;
            });

            const isIzin = hariIzin.some(hi => {
                const hiName = (hi.Nama || hi.nama || '').toLowerCase().trim();
                const hiDate = parseSheetDate(hi.tanggal || hi.Tanggal);
                return hiName === normalizedTargetName && hiDate === dateStr;
            });

            if (isIzin) {
                totalStats.hariIzinCount++;
            }

            const isKrusial = isWeekend || isLateMonth || isHK || isHL;

            const dayAtt = userHistory.filter(a => a.Tanggal === dateStr);
            const checkIn = dayAtt.find(a => (a.Jenis || a.jenis || '').toLowerCase() === 'masuk');
            const checkOut = dayAtt.find(a => (a.Jenis || a.jenis || '').toLowerCase() === 'pulang');
            
            if (isHL) {
                totalStats.hadir++;
                totalStats.workedDays++;
                if (isKrusial) {
                    totalStats.totalPointsKrusial += 10;
                } else {
                    totalStats.totalPointsReg += 10;
                }
                totalStats.hariLiburCount++;
            } else if (checkIn) {
                totalStats.hadir++;
                totalStats.workedDays++;
                const checkInMinutes = getTimeMinutes(checkIn.Jam);
                const { jM, jP } = getShiftTargets(checkIn.Shift || checkIn.shift || '', empInfo?.JamKhusus || '');
                const entryMinutes = jM;
                const targetExitMinutes = jP;
                
                let isEarlyOut = false;
                if (checkOut) {
                    const outMinutes = getTimeMinutes(checkOut.Jam);
                    if (targetExitMinutes - outMinutes >= 180) isEarlyOut = true; 
                }

                const hoursLate = (checkInMinutes - entryMinutes) / 60;
                const isLateNormal = checkInMinutes > entryMinutes;
                const diff = entryMinutes - checkInMinutes;

                // 1/2 Hari Priority Check (Universal)
                if (isEarlyOut || (isLateNormal && hoursLate >= 3)) {
                    // Partial / 1/2 Hari
                    if (isKrusial) {
                        totalStats.totalPointsKrusial -= 5;
                        totalStats.partialKrusial++;
                        totalStats.liburPoints += 1.0; // 1/2 hari krusial = 1 point
                    } else {
                        totalStats.totalPointsReg += 1;
                        totalStats.partialWeekday++;
                        totalStats.liburPoints += 0.5; // 1/2 hari biasa = 0.5 point
                    }
                    totalStats.partial++;
                } else if (isPKL) {
                    const hour = parseInt(checkIn.Jam?.split(':')[0] || '0');
                    const isAfternoon = hour >= 12;
                    const isLatePKL = isAfternoon ? (checkInMinutes > 12 * 60 + 30) : (checkInMinutes > 8 * 60 + 30);
                    
                    if (isKrusial) totalStats.totalPointsKrusial += isLatePKL ? 5 : 10;
                    else totalStats.totalPointsReg += isLatePKL ? 5 : 10;
                    
                    if (isLatePKL) {
                        totalStats.warning++;
                        if (isKrusial) {
                            totalStats.telatKrusial++;
                        } else {
                            totalStats.telatReguler++;
                        }
                    }
                    else totalStats.standard++;
                } else {
                    if (isLateNormal && hoursLate < 3) {
                        // Warning / Telat
                        if (isKrusial) {
                            totalStats.totalPointsKrusial += 1;
                            totalStats.telatKrusial++;
                        } else {
                            totalStats.totalPointsReg += 3;
                            totalStats.telatReguler++;
                        }
                        totalStats.warning++;
                    } else if (!isLateNormal && diff >= 15) {
                        // Elite / Disiplin
                        if (isKrusial) totalStats.totalPointsKrusial += 10;
                        else totalStats.totalPointsReg += 10;
                        totalStats.elite++;
                    } else if (!isLateNormal && diff < 15) {
                        // Standard / Tepat
                        if (isKrusial) totalStats.totalPointsKrusial += 8;
                        else totalStats.totalPointsReg += 8;
                        totalStats.standard++;
                    }
                }
            } else if (dateObj < today) {
                // Only apply penalty if the date has passed
                if (isIzin) {
                    // Approved leave - no penalty or deduction, synced with backend calculateStatsBackend
                    totalStats.liburWeekday++;
                    totalStats.liburReguler++;
                    totalStats.liburPoints += 1;
                } else {
                    totalStats.libur++;
                    if (isKrusial) {
                        totalStats.liburWeekend++;
                        totalStats.liburKrusial++;
                        totalStats.totalPointsKrusial -= 10;
                        totalStats.absenPenalty++;
                        totalStats.liburPoints += 2;
                    } else {
                        totalStats.liburWeekday++;
                        totalStats.liburReguler++;
                        totalStats.liburPoints += 1;
                    }
                }
            }
        }
    });
    
    const maxFreeLibur = (isPKL ? 4 : 3) * monthStrings.length;
    const actualLiburWorkdays = totalStats.liburWeekday;
    const bolosCount = Math.max(0, actualLiburWorkdays - maxFreeLibur);
    
    let totalHariKerja = 0;
    const jatahLibur = isPKL ? 4 : 3;
    monthStrings.forEach(ms => {
      const [y, m] = ms.split('-').map(Number);
      const days = new Date(y, m, 0).getDate();
      totalHariKerja += Math.max(1, days - jatahLibur);
    });
    const hariKerja = totalHariKerja;
    const benchmark = hariKerja * 10; 
    
    const totalActualPoints = totalStats.totalPointsReg + totalStats.totalPointsKrusial;
    const finalScore = benchmark > 0 ? Math.round((totalActualPoints / benchmark) * 100) : 100;

    return { 
      ...totalStats, 
      totalPoints: totalActualPoints,
      targetDays: hariKerja, 
      kepatuhan: finalScore,
      breakdown: `${totalActualPoints} / (${hariKerja} x 10) x 100`,
      telat: totalStats.warning, 
      tepat: totalStats.standard, 
      disiplin: totalStats.elite,
      telatKrusial: totalStats.telatKrusial,
      telatReguler: totalStats.telatReguler,
      partialKrusial: totalStats.partialKrusial,
      partialReguler: totalStats.partialWeekday,
      liburKrusial: totalStats.liburKrusial,
      liburReguler: totalStats.liburReguler
    };
  };

  const dashboardData = useMemo(() => {
    const getValSafe = (val: any, fallback: number): number => {
      if (val === undefined || val === null || String(val).trim() === '') return fallback;
      const cleaned = String(val).replace(/[^\d.-]/g, '');
      const num = Number(cleaned);
      return isNaN(num) ? fallback : num;
    };

    const data: DashboardData = {
      summary: { totalKaryawan: 0, hadirHariIni: 0, telatHariIni: 0, liburHariIni: 0 },
      stats: [],
      dailyStatus: [],
      analytics: { topDisiplin: [], topTelat: [], topBolos: [] },
      gajiStats: []
    };

    if (!employeeData.length) return data;

    // 1. Process Employees and Filters
    const filteredEmployees = employeeData.filter(emp => {
      if (!emp) return false;
      const empName = emp.Nama || emp.nama || '';
      if (!empName) return false;
      const empDivisions = (emp.Divisi || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      const matchDivisi = selectedDivisions.has('Semua') || empDivisions.some(d => selectedDivisions.has(d));
      const matchCabang = selectedBranches.has('Semua') || selectedBranches.has(emp.Cabang);
      const matchSearch = !searchTerm || empName.toLowerCase().includes(searchTerm.toLowerCase());
      const isRegistered = activeTab === 'harian' || isEmployeeRegisteredInFilter(emp, filterMonths);
      return matchDivisi && matchCabang && matchSearch && isRegistered;
    });

    data.summary.totalKaryawan = filteredEmployees.length;

    const employeeMap = new Map<string, EmployeeProfile>();
    filteredEmployees.forEach(emp => {
      // Robust lookup for salary and kasbon
      const getVal = (obj: any, keys: string[]) => {
        for (const k of keys) {
           if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
        }
        return 0;
      };

      const gaji = getVal(emp, ['gaji_akhir', 'Gaji Akhir', 'Gaji Pokok', 'gaji', 'Gaji', 'Total Gaji', 'total_gaji']);
      const kasbonValue = getVal(emp, ['kasbon', 'Kasbon', 'Kasbon Karyawan', 'Potongan Kasbon']);
      
      employeeMap.set(emp.Nama, {
        nama: emp.Nama,
        divisi: emp.Divisi,
        jabatan: emp.Jabatan || emp.jabatan || emp.Divisi || '',
        cabang: emp.Cabang,
        gaji_akhir: parseCurrency(gaji),
        kasbon: parseCurrency(kasbonValue)
      });
    });

    // 2. Process Attendance for Daily Status
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const todayAtt = attendanceData.filter(att => att.Tanggal === todayStr);

    filteredEmployees.forEach(emp => {
      const att = todayAtt.find(a => (a.Nama || '').toLowerCase().trim() === emp.Nama.toLowerCase().trim());
      
      let entryMin = 10 * 60;
      if (emp.JamKhusus) {
          const match = String(emp.JamKhusus).match(/(\d{1,2})[:.](\d{2})/);
          if (match) entryMin = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      }

      if (att) {
        const { jM } = getShiftTargets(att.Shift || att.shift || '', emp.JamKhusus || '');
        entryMin = jM;
        const checkInMin = getTimeMinutes(att.Jam);
        const isLate = checkInMin > entryMin;
        const isHalfDay = checkInMin >= (entryMin + 180);
        
        data.dailyStatus.push({
          nama: emp.Nama,
          status: isHalfDay ? 'Setengah Hari' : (isLate ? 'Terlambat' : 'Hadir'),
          time: att.Jam || '-:-',
          isLate,
          isHalfDay,
          cabang: emp.Cabang
        });
        
        data.summary.hadirHariIni++;
        if (isLate) data.summary.telatHariIni++;
      } else {
        data.summary.liburHariIni++;
        data.dailyStatus.push({
          nama: emp.Nama,
          status: 'Belum Hadir',
          time: '-:-',
          isLate: false,
          isHalfDay: false,
          cabang: emp.Cabang
        });
      }
    });

    // 3. Process Performance Stats (Monthly)
    const performanceStats: StudentPerformance[] = filteredEmployees.map(emp => {
      const stats = getDetailedStats(emp.Nama, Array.from(filterMonths));
      const isPKL = (emp.Divisi || '').toUpperCase().includes('PKL');
      
      return {
        nama: emp.Nama,
        totalHadir: stats.hadir,
        totalTelat: stats.telat,
        totalAbsen: stats.libur,
        quotaLibur: (isPKL ? 4 : 3) * filterMonths.size,
        isBolos: stats.liburWeekday > ((isPKL ? 4 : 3) * filterMonths.size), 
        kepatuhan: stats.kepatuhan
      };
    });

    data.stats = performanceStats.sort((a, b) => {
      if (reportSort === 'skor') return b.kepatuhan - a.kepatuhan;
      if (reportSort === 'hadir') return b.totalHadir - a.totalHadir;
      if (reportSort === 'telat') return b.totalTelat - a.totalTelat;
      if (reportSort === 'bolos') return b.totalAbsen - a.totalAbsen;
      return 0;
    });
    
    // Analytics
    data.analytics.topDisiplin = [...performanceStats].sort((a,b) => b.kepatuhan - a.kepatuhan).slice(0, 3).map(s => ({ nama: s.nama, kepatuhan: s.kepatuhan }));
    data.analytics.topTelat = [...performanceStats]
      .filter(s => s.totalTelat > 0)
      .sort((a, b) => b.totalTelat - a.totalTelat)
      .slice(0, 3)
      .map(s => ({ nama: s.nama, totalTelat: s.totalTelat }));
    data.analytics.topBolos = [...performanceStats]
      .filter(s => s.isBolos)
      .sort((a, b) => b.totalAbsen - a.totalAbsen)
      .slice(0, 3)
      .map(s => ({ nama: s.nama, totalAbsen: s.totalAbsen, quotaLibur: s.quotaLibur }));

    // 4. Salary Stats
    data.gajiStats = Array.from(employeeMap.values())
      .map(emp => {
        const normalizedEmpName = emp.nama.toLowerCase().trim();
        const empSource = employeeData.find(e => (e.Nama || '').toLowerCase().trim() === normalizedEmpName);
        const empEmail = (empSource?.email || emp.nama).toLowerCase().trim();
        
        const isEligibleForBonus = (monthStr: string): boolean => {
          const joinDateStr = getEmpJoinDateStr(empSource, monthStr);
          if (joinDateStr && /^\d{4}-\d{2}-\d{2}$/.test(joinDateStr)) {
            if (joinDateStr.slice(0, 7) > monthStr) return false;
            if (joinDateStr.slice(0, 7) === monthStr) {
              const day = parseInt(joinDateStr.split('-')[2], 10);
              if (day > 1) return false;
            }
          }
          const outDateStr = getEmpOutDateStr(empSource, monthStr);
          if (outDateStr && /^\d{4}-\d{2}-\d{2}$/.test(outDateStr)) {
            if (outDateStr.slice(0, 7) < monthStr) return false;
            if (outDateStr.slice(0, 7) === monthStr) {
              const [y, m] = monthStr.split('-').map(Number);
              const lastDay = new Date(y, m, 0).getDate();
              const outDay = parseInt(outDateStr.split('-')[2], 10);
              if (outDay < lastDay) return false;
            }
          }
          return true;
        };

        const monthsArr = Array.from(filterMonths);
        const monthSummaries = monthsArr.map(currentMonthStr => {
          const stats = getDetailedStats(emp.nama, [currentMonthStr]);
          
          // Find in salaryDetails (synced from sheet) for THIS month
          const monthDetails = salaryDetails.filter(s => {
            const nameMatch = ((s.nama || s.Nama || '').toLowerCase().trim() === normalizedEmpName) || 
                              ((s.email || s.Email || '').toLowerCase().trim() === empEmail);
            // If sourceMonth was attached, we use it. Otherwise we assume it might be from a single-month fetch or matching logic
            const monthMatch = !s.sourceMonth || s.sourceMonth === currentMonthStr;
            return nameMatch && monthMatch;
          });
          
          // Use the most specific one if multiple matches (though there should ideally be one per month)
          const sheetDetail = monthDetails[0];

          // Bonus Absen Logic (Fallback if not in sheet)
          const [year, month] = currentMonthStr.split('-').map(Number);
          const daysInMonth = new Date(year, month, 0).getDate();
          const todayMonthStr = new Date().toISOString().slice(0, 7);
          const isCurrentMonth = currentMonthStr === todayMonthStr;
          const jabatanStr = empSource?.Jabatan || empSource?.jabatan || emp.divisi || '';
          const rolesInfo = getEmployeeRoles(jabatanStr);
          const isPKL = rolesInfo.isPKL;
          const jatahLibur = isPKL ? 4 : 3;

          const ptsThisMonth = stats.liburPoints;
          let bonus_absen = 0;
          
          const todayDate = new Date();
          const isMonthEnded = (year < todayDate.getFullYear()) || 
                               (year === todayDate.getFullYear() && month < todayDate.getMonth() + 1) || 
                               (year === todayDate.getFullYear() && month === todayDate.getMonth() + 1 && todayDate.getDate() === daysInMonth);

          if (isEligibleForBonus(currentMonthStr) && ptsThisMonth <= jatahLibur && isMonthEnded) {
              const isEndOfQuarter = month % 3 === 0;
              if (isEndOfQuarter) {
                  const m1 = month - 1;
                  const m2 = month - 2;
                  const m1Str = `${year}-${String(m1).padStart(2, '0')}`;
                  const m2Str = `${year}-${String(m2).padStart(2, '0')}`;
                  const ptsM1 = getDetailedStats(emp.nama, [m1Str]).liburPoints;
                  const ptsM2 = getDetailedStats(emp.nama, [m2Str]).liburPoints;
                  
                  const qualifiedM1 = isEligibleForBonus(m1Str) && ptsM1 <= jatahLibur;
                  const qualifiedM2 = isEligibleForBonus(m2Str) && ptsM2 <= jatahLibur;
                  
                  bonus_absen = (qualifiedM1 && qualifiedM2) ? 300000 : 100000;
              } else {
                  bonus_absen = 100000;
              }
          }
          
          const getSheetVal = (detail: any, keys: string[]) => {
            if (!detail) return undefined;
            for (const key of keys) {
              if (detail[key] !== undefined && detail[key] !== null && detail[key] !== '') {
                const val = String(detail[key]).replace(/[^\d.-]/g, '');
                const numVal = Number(val);
                return isNaN(numVal) ? detail[key] : numVal;
              }
            }
            return undefined;
          };

          const sheetBonus = getSheetVal(sheetDetail, ['bonus_absen', 'Bonus', 'Bonus Absen', 'Bonus_Absen']);
          const final_bonus = !isEligibleForBonus(currentMonthStr) ? 0 : (sheetBonus !== undefined ? Number(sheetBonus) : bonus_absen);

          const sheetKomisi = getSheetVal(sheetDetail, ['total_komisi', 'Komisi', 'Total Komisi']);
          
          // Point and Komisi calculations based directly on daily net omset in import_komisi and transaksi_prod:
          const userImportKomisi = sheetDetail?.import_komisi || [];
          const userTransaksiProd = sheetDetail?.transaksi_prod || sheetDetail?.transaksiProd || [];

          const pointProdukList = sheetDetail?.point_produk || [];
          const parseToDateKey = (dateStr: any): string => {
            if (!dateStr) return '';
            return parseSheetDate(dateStr, currentMonthStr);
          };

          let computed_points = 0;
          let computed_import_komisi_list: any[] = [];
          let computed_komisi = 0;
          let computed_komisi_layanan = 0;
          let computed_komisi_produk = 0;
          let totalRawKomisiMonth = 0;

          const dailyGroups: { 
            [key: string]: { 
              tanggal: string; 
              omset: number; 
              komisi: number; 
              prod: number; 
              prodEntries: any[] 
            } 
          } = {};

          if (Array.isArray(userImportKomisi)) {
            userImportKomisi.forEach((item: any) => {
              const rawDate = item.dateKey || item.tanggal || '';
              const dateKey = parseToDateKey(rawDate);
              if (!dateKey || !dateKey.startsWith(currentMonthStr)) return;
              
              if (!dailyGroups[dateKey]) {
                dailyGroups[dateKey] = {
                  tanggal: item.tanggal || dateKey,
                  omset: 0,
                  komisi: 0,
                  prod: 0,
                  prodEntries: []
                };
              }
              
              const omsetVal = Number(item.omset || 0);
              const komisiVal = Number(item.komisi || 0);
              
              dailyGroups[dateKey].omset += omsetVal;
              dailyGroups[dateKey].komisi += komisiVal;
              totalRawKomisiMonth += komisiVal;
            });
          }

          if (Array.isArray(userTransaksiProd)) {
            userTransaksiProd.forEach((item: any) => {
              const rawDate = item.dateKey || item.tanggal || '';
              const dateKey = parseToDateKey(rawDate);
              if (!dateKey || !dateKey.startsWith(currentMonthStr)) return;
              
              if (!dailyGroups[dateKey]) {
                dailyGroups[dateKey] = {
                  tanggal: item.tanggal || dateKey,
                  omset: 0,
                  komisi: 0,
                  prod: 0,
                  prodEntries: []
                };
              }
              
              const price = Number(item.harga_item || item.Harga_Item || item.harga || item.total_harga || item.total || 0);
              const qty = Number(item.jumlah || item.Jumlah || item.qty || item.Qty || 1);
              const komisiOverride = item.komisi !== undefined && item.komisi !== null ? Number(item.komisi) : 0;
              
              dailyGroups[dateKey].prod += (price * qty);
              dailyGroups[dateKey].prodEntries.push({
                sku: item.sku || item.SKU || '',
                item: item.item || item.Item || item.produk || item.Produk || '',
                harga: price,
                qty: qty,
                komisi: komisiOverride
              });
            });
          }

          let totalOmsetLayananMonth = 0;
          let totalProductsSold = 0;
          let totalKomisiLayananMonth = 0;
          let totalKomisiProdukMonth = 0;

          const daysKeys = Object.keys(dailyGroups).sort();
          
          if (daysKeys.length > 0) {
            computed_import_komisi_list = daysKeys.map(key => {
              const group = dailyGroups[key];
              const netLayanan = Math.max(0, group.omset - group.prod);
              const p = Math.floor(netLayanan / 500000);
              computed_points += p;
              
              totalOmsetLayananMonth += netLayanan;
              
              let dailyKomisiProduk = 0;
              if (group.prodEntries && group.prodEntries.length > 0) {
                group.prodEntries.forEach(entry => {
                  if (entry.komisi && entry.komisi > 0) {
                    dailyKomisiProduk += entry.komisi;
                  } else {
                    const info = getProductPointAndKomisi(entry, pointProdukList);
                    dailyKomisiProduk += info.komisi * entry.qty;
                  }
                });
              }
              
              const komisiLayanan = Math.max(0, group.komisi - dailyKomisiProduk);
              
              totalKomisiLayananMonth += komisiLayanan;
              totalKomisiProdukMonth += dailyKomisiProduk;
              
              return {
                tanggal: group.tanggal,
                dateKey: key,
                omset: group.omset,
                prod_omset: group.prod,
                net_layanan: netLayanan,
                komisi: group.komisi,
                komisi_produk: dailyKomisiProduk,
                komisi_layanan: komisiLayanan,
                point: p
              };
            });
          }

          let totalProductPointsSold = 0;
          if (Array.isArray(userTransaksiProd)) {
            userTransaksiProd.forEach((item: any) => {
              const rawDate = item.dateKey || item.tanggal || '';
              const dateKey = parseToDateKey(rawDate);
              if (!dateKey || !dateKey.startsWith(currentMonthStr)) return;
              const info = getProductPointAndKomisi(item, pointProdukList);
              const qty = Number(item.jumlah || item.Jumlah || item.qty || item.Qty || 1);
              totalProductPointsSold += (info.point * qty);
              totalProductsSold += qty;
            });
          }

          const isStylist = rolesInfo.isStylist;
          const isTherapist = jabatanStr.toLowerCase().includes('therapist');

          const sheetTargetOmset = getSheetVal(sheetDetail, ['target_omset', 'Target_Omset', 'Target Omset', 'target omset']);
          const targetOmsetMaster = sheetTargetOmset !== undefined ? Number(sheetTargetOmset) : 0;

          let targetLayananVal = 0;
          let hasReachedTarget = false;

          if (!isPKL) {
            if (targetOmsetMaster === 0) {
               hasReachedTarget = true;
               targetLayananVal = 0;
            } else {
               targetLayananVal = totalProductPointsSold >= 10 ? Math.min(6000000, targetOmsetMaster) : targetOmsetMaster;
               hasReachedTarget = (totalOmsetLayananMonth >= targetOmsetMaster) || (totalProductPointsSold >= 10 && totalOmsetLayananMonth >= 6000000);
            }
          }

          computed_komisi_layanan = hasReachedTarget ? totalKomisiLayananMonth : 0;
          computed_komisi_produk = isPKL ? 0 : totalKomisiProdukMonth;
          const computed_komisi_tambahan = sheetDetail?.komisi_tambahan !== undefined ? Number(sheetDetail.komisi_tambahan) : 0;
          computed_komisi = computed_komisi_layanan + computed_komisi_produk + computed_komisi_tambahan;

          const final_points = sheetDetail?.total_point !== undefined ? Number(sheetDetail.total_point) : computed_points;

          const getPointRpVal = (pts: number) => {
            if (pts >= 1 && pts <= 10) return pts * 5000;
            if (pts >= 11 && pts <= 20) return pts * 10000;
            if (pts > 20) return pts * 15000;
            return 0;
          };

          const final_point_rp = sheetDetail?.point_rp !== undefined ? Number(sheetDetail.point_rp) : getPointRpVal(final_points);

          const final_komisi = sheetKomisi !== undefined ? Number(sheetKomisi) : computed_komisi;

          const sheetGajiPokok = getSheetVal(sheetDetail, ['gaji_pokok', 'Gaji Pokok', 'Gaji']);
          const final_gaji_pokok = sheetGajiPokok !== undefined ? Number(sheetGajiPokok) : emp.gaji_akhir;

          const sheetKasbon = getSheetVal(sheetDetail, ['total_kasbon', 'kasbon', 'Kasbon', 'Potongan Kasbon']);
          const final_kasbon = sheetKasbon !== undefined ? Number(sheetKasbon) : emp.kasbon;

          const fallback_hari_kerja = Math.max(1, daysInMonth - jatahLibur);
          const computed_hari_kerja = (sheetDetail?.hari_kerja !== undefined && sheetDetail?.hari_kerja !== null && sheetDetail?.hari_kerja !== '') ? Number(sheetDetail.hari_kerja) : fallback_hari_kerja;

          const cal_gaji_harian_precise = final_gaji_pokok / computed_hari_kerja;
          const cal_gaji_harian = Math.round(cal_gaji_harian_precise);
          const cal_hadir_over = stats.hadir || 0;
          const cal_disiplin_over = stats.disiplin || 0;
          const cal_telat_over = stats.telat || 0;
          const cal_hariLibur_over = stats.hariLiburCount || 0;
          const cal_uang_makan_val = (sheetDetail?.uang_makan !== undefined && sheetDetail?.uang_makan !== null && sheetDetail?.uang_makan !== '') ? Number(sheetDetail.uang_makan) : 20000;
          const cal_bonus_disiplin_val = (sheetDetail?.bonus_disiplin !== undefined && sheetDetail?.bonus_disiplin !== null && sheetDetail?.bonus_disiplin !== '') ? Number(sheetDetail.bonus_disiplin) : 5000;

          const cal_partial_weekday_over = stats.partialReguler || 0;
          const cal_partial_weekend_over = stats.partialKrusial || 0;
          const total_partial_days = cal_partial_weekday_over + cal_partial_weekend_over;

          // Menghitung seluruh komponen pendapatan dan potongan menggunakan angka desimal presisi agar tidak terjadi selisih pembulatan tengah
          const cal_pendapatanKehadiran_precise = cal_hadir_over === computed_hari_kerja ? final_gaji_pokok : (cal_hadir_over * cal_gaji_harian_precise);
          const cal_pendapatanDisiplin_precise = cal_disiplin_over * cal_bonus_disiplin_val;
          const cal_pendapatanUangMakan_precise = Math.max(0, cal_hadir_over - cal_telat_over - cal_hariLibur_over - total_partial_days) * cal_uang_makan_val;
          const cal_potonganWeekend_precise = (stats.liburWeekend || 0) * cal_gaji_harian_precise;
          const cal_potongan12Weekday_precise = (stats.partialWeekday || 0) * (cal_gaji_harian_precise / 2);
          const cal_potongan12Weekend_precise = (stats.partialKrusial || 0) * cal_gaji_harian_precise;

          // Hitung nilai akhir gaji aktual secara presisi sebelum dilakukan pembulatan tunggal di akhir
          const cal_gaji_aktual_precise = (cal_pendapatanKehadiran_precise + cal_pendapatanDisiplin_precise + cal_pendapatanUangMakan_precise + final_komisi + final_point_rp + final_bonus) - (cal_potonganWeekend_precise + cal_potongan12Weekday_precise + cal_potongan12Weekend_precise);
          const cal_gaji_aktual = Math.round(cal_gaji_aktual_precise);

          // Gaji aktual is always calculated dynamically from the attendance-based components to ensure it strictly follows the active attendance data and formula
          const final_gaji_aktual = cal_gaji_aktual;
          const final_sisa_gaji = final_gaji_aktual - final_kasbon;

          // Calculate transfers for this month
          const transferKey = `${empEmail}_${currentMonthStr}`;
          const monthTransfers = transfers[transferKey] || [];
          const totalTransferred = monthTransfers.reduce((sum, t) => sum + t.amount, 0);

          return {
            month: currentMonthStr,
            sheetDetail,
            totalTransferred,
            final_gaji_pokok,
            final_bonus_absen: final_bonus,
            final_points: final_points,
            final_point_rp: final_point_rp,
            final_komisi: final_komisi,
            komisi_manual: sheetDetail?.komisi_manual !== undefined ? Number(sheetDetail.komisi_manual) : totalRawKomisiMonth,
            komisi_layanan: sheetDetail?.komisi_layanan !== undefined ? Number(sheetDetail.komisi_layanan) : computed_komisi_layanan,
            komisi_produk: sheetDetail?.komisi_produk !== undefined ? Number(sheetDetail.komisi_produk) : computed_komisi_produk,
            komisi_tambahan: sheetDetail?.komisi_tambahan !== undefined ? Number(sheetDetail.komisi_tambahan) : computed_komisi_tambahan,
            komisi_tambahan_list: sheetDetail?.komisi_tambahan_list || [],
            total_omset_layanan: totalOmsetLayananMonth,
            total_products_sold: totalProductsSold,
            has_reached_target: hasReachedTarget,
            target_layanan_val: targetLayananVal,
            target_omset_master: targetOmsetMaster,
            is_stylist: isStylist,
            is_therapist: isTherapist,
            total_komisi_layanan_raw: totalKomisiLayananMonth,
            final_gaji_aktual: final_gaji_aktual,
            final_kasbon: final_kasbon,
            gaji_harian_precise: cal_gaji_harian_precise,
            final_sisa_gaji_calculated: final_sisa_gaji - totalTransferred,
            final_sisa_gaji: final_sisa_gaji - totalTransferred,
            libur_points: ptsThisMonth,
            hariLiburCount: stats.hariLiburCount,
            stats,
            hari_kerja: computed_hari_kerja,
            import_komisi: (Array.isArray(userImportKomisi) && userImportKomisi.length > 0) ? computed_import_komisi_list : (sheetDetail?.import_komisi || []),
            point_list: sheetDetail?.point_list || []
          };
        });

        // Sum up or pick from first month (if multi-month)
        const total_gaji_pokok = monthSummaries.reduce((sum, m) => sum + m.final_gaji_pokok, 0);
        const total_bonus_absen = monthSummaries.reduce((sum, m) => sum + m.final_bonus_absen, 0);
        const total_points = monthSummaries.reduce((sum, m) => sum + m.final_points, 0);
        const total_point_rp = monthSummaries.reduce((sum, m) => sum + m.final_point_rp, 0);
        const total_komisi = monthSummaries.reduce((sum, m) => sum + m.final_komisi, 0);
        const total_gaji_aktual = monthSummaries.reduce((sum, m) => sum + m.final_gaji_aktual, 0);
        const total_kasbon = monthSummaries.reduce((sum, m) => sum + m.final_kasbon, 0);
        const total_sisa_gaji = monthSummaries.reduce((sum, m) => sum + m.final_sisa_gaji, 0);
        const total_sisa_gaji_calculated = monthSummaries.reduce((sum, m) => sum + m.final_sisa_gaji_calculated, 0);
        const total_transferred = monthSummaries.reduce((sum, m) => sum + m.totalTransferred, 0);
        const total_libur_points = monthSummaries.reduce((sum, m) => sum + m.libur_points, 0);

        // Details from first selected month for breakdown display
        const firstM = monthSummaries[0];
        const detail = firstM?.sheetDetail || {};

        return {
          ...emp,
          gaji_pokok: total_gaji_pokok,
          bonus_absen: total_bonus_absen,
          total_point: total_points,
          point_rp: total_point_rp,
          total_komisi: total_komisi,
          gaji_aktual: total_gaji_aktual,
          total_kasbon: total_kasbon,
          sisa_gaji: total_sisa_gaji,
          sisa_gaji_calculated: total_sisa_gaji_calculated,
          total_transferred: total_transferred,
          email: empSource?.email || emp.nama,
          libur_points: total_libur_points,
          
          // Additional detailed info for modal
          hadir: firstM?.stats?.hadir || 0,
          gaji_harian: getValSafe(detail.gaji_harian, Math.round((firstM?.final_gaji_pokok || 1500000) / (firstM?.hari_kerja || 28))),
          gaji_harian_precise: firstM?.gaji_harian_precise || getValSafe(detail.gaji_harian, (firstM?.final_gaji_pokok || 1500000) / (firstM?.hari_kerja || 28)),
          bonus_disiplin: getValSafe(detail.bonus_disiplin, 5000),
          uang_makan: getValSafe(detail.uang_makan, 20000),
          disiplin: firstM?.stats?.disiplin || 0,
          telat: firstM?.stats?.telat || 0,
          libur_krusial: firstM?.stats?.liburWeekend || 0,
          setengah_hari_weekday: firstM?.stats?.partialReguler || 0,
          setengah_hari_weekend: firstM?.stats?.partialKrusial || 0,
          hariLibur: firstM?.hariLiburCount || 0,
          hariIzinCount: firstM?.stats?.hariIzinCount || 0,
          komisi_list: detail.komisi_list || [],
          komisi_tambahan_list: firstM?.komisi_tambahan_list || detail.komisi_tambahan_list || [],
          kasbon_list: detail.kasbon_list || [],
          komisi_manual: firstM?.komisi_manual !== undefined ? firstM.komisi_manual : (detail.komisi_manual || 0),
          komisi_layanan: firstM?.komisi_layanan !== undefined ? firstM.komisi_layanan : (detail.komisi_layanan || 0),
          komisi_produk: firstM?.komisi_produk !== undefined ? firstM.komisi_produk : (detail.komisi_produk || 0),
          komisi_tambahan: firstM?.komisi_tambahan !== undefined ? firstM.komisi_tambahan : (detail.komisi_tambahan || 0),
          total_omset_layanan: firstM?.total_omset_layanan || 0,
          total_products_sold: firstM?.total_products_sold || 0,
          has_reached_target: firstM?.has_reached_target || false,
          target_layanan_val: firstM?.target_layanan_val || 0,
          target_omset_master: firstM?.target_omset_master || 0,
          is_stylist: firstM?.is_stylist || false,
          is_therapist: firstM?.is_therapist || false,
          total_komisi_layanan_raw: firstM?.total_komisi_layanan_raw || 0,
          import_komisi: firstM?.import_komisi || [],
          transaksi_prod: detail.transaksi_prod || [],
          point_produk: detail.point_produk || [],
          _hasFullDetails: !!detail._hasFullDetails,
          point_list: detail.point_list || firstM?.point_list || [],
          hari_kerja: (detail.hari_kerja !== undefined && detail.hari_kerja !== null && detail.hari_kerja !== '') ? Number(detail.hari_kerja) : (firstM?.hari_kerja || 28),
          periode_label: detail.periode || monthsArr[0],
          month: firstM?.month || monthsArr[0],
          periode: firstM?.month || monthsArr[0]
        };
      })
      .sort((a, b) => {
        if (gajiSort === 'total') return b.gaji_aktual - a.gaji_aktual;
        if (gajiSort === 'komisi') return b.total_komisi - a.total_komisi;
        if (gajiSort === 'point') return b.total_point - a.total_point;
        if (gajiSort === 'absen') return b.bonus_absen - a.bonus_absen;
        return b.gaji_aktual - a.gaji_aktual;
      });

    return data;
  }, [attendanceData, employeeData, selectedDivisions, selectedBranches, filterMonths, reportSort, gajiSort, salaryDetails, searchTerm, transfers, activeTab]);

  const availableDivisions = useMemo(() => {
    const divisions = new Set<string>();
    employeeData.forEach(emp => {
      if (emp.Divisi) {
        emp.Divisi.split(',').forEach((s: string) => {
          const trimmed = s.trim();
          if (trimmed) divisions.add(trimmed);
        });
      }
    });
    return Array.from(divisions).sort();
  }, [employeeData]);

  const availableCabang = useMemo(() => {
    return Array.from(new Set(employeeData.map(emp => emp.Cabang))).filter(Boolean);
  }, [employeeData]);

  const availableMonths = useMemo(() => {
    const months = new Set(attendanceData.filter(att => att.Tanggal && typeof att.Tanggal === 'string').map(att => att.Tanggal.slice(0, 7)));
    return Array.from(months).sort().reverse();
  }, [attendanceData]);

  const getMonthLabel = (isoDate: string) => {
    if (!isoDate || typeof isoDate !== 'string' || !isoDate.includes('-')) return isoDate;
    const [year, month] = isoDate.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthIdx = parseInt(month) - 1;
    if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return isoDate;
    return `${names[monthIdx]} ${year}`;
  };

  const toggleFilter = (set: Set<string>, val: string, setter: (s: Set<string>) => void, allOptions: string[]) => {
    const next = new Set(set);
    if (val === 'Semua') {
      // If "Semua" was selected, unselecting it kills all labels
      if (next.has('Semua')) {
        setter(new Set());
      } else {
        // If "Semua" was not selected, selecting it selects all
        setter(new Set(['Semua', ...allOptions]));
      }
      return;
    }
    
    if (next.has(val)) {
      next.delete(val);
      next.delete('Semua'); // Unselect "Semua" if any category is unselected
    } else {
      next.add(val);
      // If all options are now selected, also select "Semua"
      if (allOptions.every(opt => next.has(opt))) {
        next.add('Semua');
      }
    }
    setter(next);
  };

  useEffect(() => {
    if (employeeData.length > 0) {
      if (selectedDivisions.size === 1 && selectedDivisions.has('Semua')) {
        setSelectedDivisions(new Set(['Semua', ...availableDivisions]));
      }
      if (selectedBranches.size === 1 && selectedBranches.has('Semua')) {
        setSelectedBranches(new Set(['Semua', ...availableCabang]));
      }
    }
  }, [employeeData, availableDivisions, availableCabang, selectedDivisions.size, selectedBranches.size]);

  const isAnyModalOpen = !!(selectedStat || selectedSalaryStat);

  useEffect(() => {
    if (onSalaryDetailToggle) {
      onSalaryDetailToggle(!!selectedSalaryStat);
    }
  }, [selectedSalaryStat, onSalaryDetailToggle]);

  if (loading && !attendanceData.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full mb-4"
        />
        <p className="text-white/40 text-[10px] font-medium uppercase tracking-[0.3em]">Connecting Portal...</p>
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-col gap-5 pb-24 transition-opacity duration-300 ${isAnyModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* NAVIGATION TABS */}
        {!selectedStat && (
        <div className="px-1">
          <div className="flex p-1.5 bg-white/[0.03] backdrop-blur-3xl rounded-[28px] border border-white/5">
             <button 
                onClick={() => setActiveTab('harian')}
                className={`flex-1 py-3 rounded-[22px] text-[10px] font-medium uppercase tracking-widest transition-all ${activeTab === 'harian' ? 'bg-white/10 text-white shadow-xl border border-white/10' : 'text-white/30 hover:text-white/50'}`}
             >
                Daily
             </button>
             <button 
                onClick={() => setActiveTab('performa')}
                className={`flex-1 py-3 rounded-[22px] text-[10px] font-medium uppercase tracking-widest transition-all ${activeTab === 'performa' ? 'bg-white/10 text-white shadow-xl border border-white/10' : 'text-white/30 hover:text-white/50'}`}
             >
                Report
             </button>
             <button 
                onClick={() => setActiveTab('gaji')}
                className={`flex-1 py-3 rounded-[22px] text-[10px] font-medium uppercase tracking-widest transition-all ${activeTab === 'gaji' ? 'bg-white/10 text-white shadow-xl border border-white/10' : 'text-white/30 hover:text-white/50'}`}
             >
                Salary
             </button>
          </div>
        </div>
      )}

      {/* FILTER AREA */}
      {!selectedStat && (
        <div className="px-1">
            <div className="relative bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[40px] p-6 shadow-2xl space-y-6 after:absolute after:inset-0 after:bg-white/[0.01] after:translate-x-1.5 after:translate-y-1.5 after:-z-10 after:rounded-[40px]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-emerald-400" />
                        <span className="text-[11px] font-medium text-white uppercase tracking-[0.2em]">Filter System</span>
                    </div>
                </div>

                {/* Divisi Filter */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest">Jabatan</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {['Semua', ...availableDivisions].map(div => (
                            <button
                                key={div}
                                onClick={() => toggleFilter(selectedDivisions, div, setSelectedDivisions, availableDivisions)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest whitespace-nowrap transition-all border ${selectedDivisions.has(div) ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                            >
                                {div}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cabang Filter */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest">Cabang</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {['Semua', ...availableCabang].map(cab => (
                            <button
                                key={cab}
                                onClick={() => toggleFilter(selectedBranches, cab, setSelectedBranches, availableCabang)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest whitespace-nowrap transition-all border ${selectedBranches.has(cab) ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                            >
                                {cab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Periode Filter */}
                {activeTab !== 'harian' && (
                  <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                          <span className="text-[10px] font-medium text-white/30 uppercase tracking-widest">Periode</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {availableMonths.map(m => (
                              <button
                                  key={m}
                                  onClick={() => {
                                      const next = new Set(filterMonths);
                                      if (next.has(m) && next.size > 1) next.delete(m);
                                      else next.add(m);
                                      setFilterMonths(next);
                                  }}
                                  className={`px-5 py-2.5 rounded-xl text-[10px] font-medium uppercase tracking-widest whitespace-nowrap transition-all border ${filterMonths.has(m) ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400 shadow-lg' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                              >
                                  {getMonthLabel(m)}
                              </button>
                          ))}
                      </div>
                  </div>
                )}

                {/* Search Bar - Back to Bottom with Backdrop Blur */}
                <div className="pt-4 border-t border-white/5">
                    <div className="relative group">
                        <input 
                            id="team-search-input"
                            type="text"
                            placeholder="Cari nama team..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent hover:bg-white/5 border border-white/20 focus:border-emerald-500/40 rounded-[20px] py-4 pl-12 pr-12 text-[13px] font-medium text-white placeholder:text-white/50 outline-none focus:bg-black/20 transition-all appearance-none"
                            style={{ backgroundColor: 'transparent', color: '#ffffff', WebkitAppearance: 'none', appearance: 'none' }}
                        />
                        <div className="absolute inset-y-0 left-4 flex items-center text-emerald-400 transition-colors pointer-events-none z-20">
                            <Search size={18} strokeWidth={3} className="text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                        </div>
                        {searchTerm && (
                          <button 
                            onClick={() => setSearchTerm("")}
                            className="absolute inset-y-0 right-4 flex items-center text-white/60 hover:text-white transition-colors z-20"
                          >
                             <X className="w-5 h-5 bg-white/20 rounded-full p-1" />
                          </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* MESSAGES */}
      {!selectedStat && (
        <AnimatePresence>
          {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 p-4 rounded-2xl flex flex-col gap-3 mb-2"
          >
             <div className="flex items-start gap-3">
                 <AlertTriangle size={20} className="text-red-500 mt-0.5" />
                 <div>
                   <p className="text-sm font-medium text-red-100 uppercase tracking-tight">Koneksi Bermasalah</p>
                   <p className="text-xs text-white/60 font-medium leading-relaxed">{errorMessage}</p>
                 </div>
             </div>
             <button 
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="w-full py-2.5 bg-red-600/20 text-red-400 text-[10px] font-medium uppercase tracking-widest rounded-xl hover:bg-red-600/40 transition-colors border border-red-500/20"
             >
                Coba Hubungkan Lagi
             </button>
          </motion.div>
        )}

        {isMockData && !errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-500/10 backdrop-blur-xl border border-orange-500/30 p-4 rounded-2xl flex items-start gap-3"
          >
             <AlertTriangle size={20} className="text-orange-400 mt-0.5" />
             <div>
               <p className="text-sm font-medium text-orange-100 uppercase tracking-tight">Demo Mode</p>
               <p className="text-xs text-white/50 leading-relaxed font-medium">Deploy backend 'New Version' untuk melihat data real-time.</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    )}

      {/* DASHBOARD SUMMARY HIDDEN - RELOCATED TO TABS */}

    {/* CONTENT AREA */}
      {!selectedStat && (
        <AnimatePresence mode="wait">
          {activeTab === 'harian' && (
            <motion.div 
              key="harian"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
               <div className="flex flex-col gap-2 pl-1 mb-2">
                   <h2 className="text-xl font-medium uppercase text-white tracking-widest">Kehadiran</h2>
                    <div className="flex items-center justify-between mt-1">
                       <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/50">Status Tracking</span>
                       <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-400">
                           {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                       </span>
                    </div>
               </div>

               {/* RE-LOCATED SQUARE SUMMARY CARDS */}
               <div className="grid grid-cols-4 gap-2 px-1">
                 { (loading || isSyncing) ? 
                   [...Array(4)].map((_, i) => (
                     <div key={i} className="aspect-square bg-white/[0.03] border border-white/10 rounded-[20px] p-4 flex flex-col items-center justify-center opacity-60">
                        <SkeletonItem className="w-8 h-6 mb-2" />
                        <SkeletonItem className="w-10 h-3" />
                     </div>
                   ))
                  : 
                   <>
                    <div 
                      onClick={() => setDailyFilter(null)}
                      className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${dailyFilter === null ? 'bg-white/10 border-white/30 ring-1 ring-white/20' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                    >
                      <span className="text-lg font-medium text-white leading-none">{dashboardData.summary.totalKaryawan}</span>
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] mt-2 text-center scale-90">Team</span>
                      {dailyFilter === null && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                    </div>
                    <div 
                      onClick={() => setDailyFilter('Hadir')}
                      className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${dailyFilter === 'Hadir' ? 'bg-emerald-500/20 border-emerald-500/40 ring-1 ring-emerald-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                    >
                      <span className="text-lg font-medium text-white leading-none">{dashboardData.summary.hadirHariIni}</span>
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] mt-2 text-center scale-90">Hadir</span>
                      {dailyFilter === 'Hadir' && <div className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                    </div>
                     <div 
                      onClick={() => setDailyFilter('Telat')}
                      className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${dailyFilter === 'Telat' ? 'bg-orange-500/20 border-orange-500/40 ring-1 ring-orange-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                    >
                      <span className="text-lg font-medium text-white leading-none">{dashboardData.summary.telatHariIni}</span>
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-[0.2em] mt-2 text-center scale-90">Telat</span>
                      {dailyFilter === 'Telat' && <div className="absolute -bottom-1 w-1 h-1 bg-orange-400 rounded-full shadow-[0_0_8px_rgba(251,146,60,0.8)]" />}
                    </div>
                    <div 
                      onClick={() => setDailyFilter('Libur')}
                      className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${dailyFilter === 'Libur' ? 'bg-red-500/20 border-red-500/40 ring-1 ring-red-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                    >
                      <span className="text-lg font-medium text-white leading-none">{dashboardData.summary.liburHariIni}</span>
                      <span className="text-[10px] font-medium text-white/40 uppercase tracking-[0.4em] mt-2 text-center scale-90">Libur</span>
                      {dailyFilter === 'Libur' && <div className="absolute -bottom-1 w-1 h-1 bg-red-400 rounded-full shadow-[0_0_8px_rgba(248,113,113,0.8)]" />}
                    </div>
                  </>
                 }
               </div>
               
               <div className="space-y-4">
                   { (loading || isSyncing) ? 
                     [...Array(6)].map((_, i) => (
                       <div key={i} className="bg-white/[0.03] p-4 rounded-[24px] flex items-center gap-4 border border-white/[0.05]">
                          <SkeletonItem className="w-12 h-12 rounded-2xl shrink-0" />
                          <div className="flex-1 space-y-2">
                             <SkeletonItem className="w-32 h-4" />
                             <SkeletonItem className="w-20 h-2" />
                          </div>
                          <SkeletonItem className="w-12 h-6" />
                       </div>
                     ))
                   : 
                    dashboardData.dailyStatus
                      .filter(student => {
                        if (!dailyFilter) return true;
                        if (dailyFilter === 'Hadir') return student.status !== 'Belum Hadir' && student.status !== 'OFF';
                        if (dailyFilter === 'Libur') return student.status === 'Belum Hadir' || student.status === 'OFF';
                        if (dailyFilter === 'Telat') return student.isLate;
                        return true;
                      })
                      .map((student, idx) => {
                       let statusColor = 'text-gray-400';
                       let icon = <Clock size={16} />;
                       
                       if (student.status === 'Belum Hadir') {
                           statusColor = 'text-white/30';
                           icon = <AlertTriangle size={16} />;
                       } else if (student.isHalfDay) {
                           statusColor = 'text-white/60';
                           icon = <Clock size={16} />;
                       } else if (student.isLate) {
                           statusColor = 'text-white/50';
                           icon = <Clock size={16} />;
                       } else {
                           statusColor = 'text-white';
                           icon = <CheckCircle2 size={16} />;
                       }

                       return (
                           <motion.div 
                             key={idx} 
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             transition={{ delay: idx * 0.05 }}
                             className="relative bg-white/[0.03] backdrop-blur-2xl p-4 rounded-[24px] flex items-center gap-4 border border-white/[0.05] shadow-2xl group active:scale-[0.98] transition-all after:absolute after:inset-0 after:bg-white/[0.01] after:translate-x-1 after:translate-y-1 after:-z-10 after:rounded-[24px]"
                           >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white/5 border border-white/10 ${statusColor}`}>
                                    {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[13px] font-medium text-white truncate uppercase tracking-tight">{student.nama}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[9px] text-white/40 uppercase font-medium tracking-widest truncate">{student.cabang}</p>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <span className={`text-[10px] font-medium uppercase tracking-widest ${student.isLate ? 'text-white/50' : 'text-white/20'}`}>
                                            {student.status !== 'Belum Hadir' ? student.time : '-:-'}
                                        </span>
                                    </div>
                                </div>
                               <div className="text-right shrink-0">
                                   <div className={`px-2 py-1 rounded-lg text-[8px] font-medium uppercase tracking-widest border border-white/5 bg-white/5 ${statusColor}`}>
                                       {student.status}
                                   </div>
                               </div>
                           </motion.div>
                       );
                   })
                  }
               </div>
            </motion.div>
          )}

           {activeTab === 'performa' && (
            <motion.div 
              key="performa"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
               <div className="flex flex-col gap-2 pl-1 mb-2">
                   <h2 className="text-xl font-medium uppercase text-white tracking-widest">Performa</h2>
                   <div className="flex items-center justify-between mt-1">
                       <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/50">Performance Tracking</span>
                       <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-400">{filterMonths.size > 1 ? `${filterMonths.size} Bulan` : getMonthLabel(Array.from(filterMonths)[0])}</span>
                   </div>
               </div>

                 {/* RE-LOCATED REPORT SUMMARY CARDS - Interactive */}
                <div className="grid grid-cols-4 gap-2 px-1">
                  { (loading || isSyncing) ? 
                     [...Array(4)].map((_, i) => (
                       <div key={i} className="aspect-square bg-white/[0.03] border border-white/10 rounded-[20px] p-4 flex flex-col items-center justify-center opacity-60">
                          <SkeletonItem className="w-8 h-6 mb-2" />
                          <SkeletonItem className="w-10 h-3" />
                       </div>
                     ))
                  : 
                    <>
                      <motion.div 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setReportSort('skor')}
                        className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${reportSort === 'skor' ? 'bg-emerald-500/20 border-emerald-500/40 ring-1 ring-emerald-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                      >
                        <span className={`text-lg font-medium leading-none ${reportSort === 'skor' ? 'text-emerald-400' : 'text-white'}`}>
                          {Math.max(...dashboardData.stats.map(s => s.kepatuhan), 0)}
                        </span>
                        <span className={`text-[10px] font-medium uppercase tracking-[0.2em] mt-1.5 text-center scale-90 ${reportSort === 'skor' ? 'text-emerald-400' : 'text-white/40'}`}>Score</span>
                        {reportSort === 'skor' && <div className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full" />}
                      </motion.div>
                      <motion.div 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setReportSort('hadir')}
                        className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${reportSort === 'hadir' ? 'bg-emerald-500/20 border-emerald-500/40 ring-1 ring-emerald-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                      >
                        <span className={`text-lg font-medium leading-none ${reportSort === 'hadir' ? 'text-emerald-400' : 'text-white'}`}>
                          {Math.max(...dashboardData.stats.map(s => s.totalHadir), 0)}
                        </span>
                        <span className={`text-[10px] font-medium uppercase tracking-[0.2em] mt-1.5 text-center scale-90 ${reportSort === 'hadir' ? 'text-emerald-400' : 'text-white/40'}`}>Hadir</span>
                        {reportSort === 'hadir' && <div className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full" />}
                      </motion.div>
                      <motion.div 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setReportSort('telat')}
                        className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${reportSort === 'telat' ? 'bg-orange-500/20 border-orange-500/40 ring-1 ring-orange-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                      >
                        <span className={`text-lg font-medium leading-none ${reportSort === 'telat' ? 'text-orange-400' : 'text-white'}`}>
                          {Math.max(...dashboardData.stats.map(s => s.totalTelat), 0)}
                        </span>
                        <span className={`text-[10px] font-medium uppercase tracking-[0.2em] mt-1.5 text-center scale-90 ${reportSort === 'telat' ? 'text-orange-400' : 'text-white/40'}`}>Telat</span>
                        {reportSort === 'telat' && <div className="absolute -bottom-1 w-1 h-1 bg-orange-400 rounded-full" />}
                      </motion.div>
                      <motion.div 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setReportSort('bolos')}
                        className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${reportSort === 'bolos' ? 'bg-red-500/20 border-red-500/40 ring-1 ring-red-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                      >
                        <span className={`text-lg font-medium leading-none ${reportSort === 'bolos' ? 'text-red-400' : 'text-white'}`}>
                          {Math.max(...dashboardData.stats.map(s => s.totalAbsen), 0)}
                        </span>
                        <span className={`text-[10px] font-medium uppercase tracking-[0.2em] mt-1.5 text-center scale-90 ${reportSort === 'bolos' ? 'text-red-400' : 'text-white/40'}`}>Libur</span>
                        {reportSort === 'bolos' && <div className="absolute -bottom-1 w-1 h-1 bg-red-400 rounded-full" />}
                      </motion.div>
                    </>
                  }
               </div>

               <div className="space-y-4">
                   { (loading || isSyncing) ? 
                     [...Array(5)].map((_, i) => (
                       <div key={i} className="bg-white/[0.03] p-4 rounded-[24px] border border-white/[0.05] space-y-4">
                          <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                <SkeletonItem className="w-8 h-8 rounded-lg" />
                                <SkeletonItem className="w-32 h-4" />
                             </div>
                             <SkeletonItem className="w-10 h-6" />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                             <SkeletonItem className="h-10 rounded-xl" />
                             <SkeletonItem className="h-10 rounded-xl" />
                             <SkeletonItem className="h-10 rounded-xl" />
                          </div>
                          <SkeletonItem className="w-full h-1.5 rounded-full" />
                       </div>
                     ))
                   : 
                    dashboardData.stats.map((stat, idx) => (
                       <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => setSelectedStat(stat)}
                        className="relative bg-white/[0.03] backdrop-blur-2xl p-4 rounded-[24px] border border-white/[0.05] shadow-2xl active:scale-[0.98] transition-all cursor-pointer after:absolute after:inset-0 after:bg-white/[0.01] after:translate-x-1 after:translate-y-1 after:-z-10 after:rounded-[24px]"
                       >
                           <div className="flex justify-between items-center mb-3">
                               <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-mono text-[10px] font-medium text-white/30 border border-white/10">
                                       {idx + 1}
                                   </div>
                                   <div>
                                       <h4 className="text-[13px] font-medium text-white uppercase tracking-tight">{stat.nama}</h4>
                                       <p className="text-[8px] text-white/30 uppercase font-medium tracking-widest mt-0.5">SCORE: {stat.kepatuhan}</p>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <span className={`text-lg font-medium tracking-tighter ${stat.kepatuhan > 80 ? 'text-emerald-400' : stat.kepatuhan > 50 ? 'text-orange-400' : 'text-red-400'}`}>
                                       {stat.kepatuhan}
                                   </span>
                               </div>
                           </div>
                           <div className="grid grid-cols-3 gap-2">
                               <div className="bg-white/5 rounded-xl p-2 text-center border-none">
                                   <p className="text-[7px] text-white/30 uppercase font-medium tracking-widest mb-1">Hadir</p>
                                   <p className="text-xs font-medium text-white">{stat.totalHadir}</p>
                               </div>
                               <div className="bg-white/5 rounded-xl p-2 text-center border-none">
                                   <p className="text-[7px] text-white/30 uppercase font-medium tracking-widest mb-1">Telat</p>
                                   <p className="text-xs font-medium text-white">{stat.totalTelat}</p>
                               </div>
                               <div className="bg-white/5 rounded-xl p-2 text-center border-none">
                                   <p className="text-[7px] text-white/30 uppercase font-medium tracking-widest mb-1">Libur</p>
                                   <p className="text-xs font-medium text-white">{stat.totalAbsen}</p>
                               </div>
                           </div>
                           <div className="w-full h-1.5 bg-white/5 rounded-full mt-3 overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${stat.kepatuhan}%` }}
                                 className={`h-full rounded-full ${stat.kepatuhan > 80 ? 'bg-emerald-500' : stat.kepatuhan > 50 ? 'bg-orange-500' : 'bg-red-500'}`}
                               />
                           </div>
                       </motion.div>
                   ))}
               </div>
            </motion.div>
          )}
          {activeTab === 'gaji' && (
            <motion.div 
              key="gaji"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
               <div className="flex flex-col gap-2 pl-1 mb-4">
                   <div className="flex items-center justify-between">
                       <h2 className="text-xl font-medium uppercase text-white tracking-widest">Gaji</h2>

                   </div>
                   
                   <div className="flex items-center justify-between mt-1">
                       <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/50">Salary Distribution</span>
                       <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-400">{filterMonths.size > 1 ? `${filterMonths.size} Bulan` : getMonthLabel(Array.from(filterMonths)[0])}</span>
                   </div>
               </div>

                {/* NEW SUMMARY TOTALS FOR GAJI PAGE */}
                <div className="grid grid-cols-2 gap-3 px-1 mb-6">
                    { (loading || isSyncing || loadingSalary) ? 
                      <>
                        <div className="bg-white/[0.03] border border-white/5 rounded-[24px] p-4 flex flex-col items-center">
                           <SkeletonItem className="w-12 h-2 mb-2" />
                           <SkeletonItem className="w-24 h-6" />
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-[24px] p-4 flex flex-col items-center">
                           <SkeletonItem className="w-16 h-2 mb-2" />
                           <SkeletonItem className="w-24 h-6" />
                        </div>
                      </>
                    : 
                      <>
                        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/5 rounded-[24px] p-4 flex flex-col items-center">
                            <span className="text-[7px] font-medium text-white/40 uppercase tracking-[0.2em] mb-1">Total Gaji</span>
                            <span className="text-lg font-medium text-white italic leading-tight">
                                Rp {dashboardData.gajiStats.reduce((sum, e) => sum + e.gaji_aktual, 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                        <div className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-[24px] p-4 flex flex-col items-center">
                            <span className="text-[7px] font-medium text-emerald-400 uppercase tracking-[0.2em] mb-1">Total Sisa Gaji</span>
                            <span className="text-lg font-medium text-emerald-400 italic leading-tight">
                                Rp {dashboardData.gajiStats.reduce((sum, e) => sum + e.sisa_gaji, 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                      </>
                    }
                </div>

                {/* RELOCATED SQUARE SUMMARY CARDS FOR GAJI */}
                <div className="grid grid-cols-4 gap-2 px-1 mb-8">
                  { (loading || isSyncing || loadingSalary) ? 
                     [...Array(4)].map((_, i) => (
                       <div key={i} className="aspect-square bg-white/[0.03] border border-white/10 rounded-[20px] p-4 flex flex-col items-center justify-center opacity-60">
                          <SkeletonItem className="w-10 h-4 mb-2" />
                          <SkeletonItem className="w-12 h-2" />
                       </div>
                     ))
                  : 
                    <>
                      <motion.div 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setGajiSort('total')}
                        className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${gajiSort === 'total' ? 'bg-emerald-500/20 border-emerald-500/40 ring-1 ring-emerald-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                      >
                        <span className={`text-[12px] font-medium leading-none truncate w-full px-1 text-center ${gajiSort === 'total' ? 'text-emerald-400' : 'text-white'}`}>
                          {Math.max(...dashboardData.gajiStats.map(s => s.gaji_aktual), 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                        </span>
                        <span className={`text-[10px] font-medium uppercase tracking-[0.1em] mt-1.5 text-center scale-90 ${gajiSort === 'total' ? 'text-emerald-400' : 'text-white/40'}`}>Top Gaji</span>
                        {gajiSort === 'total' && <div className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                      </motion.div>
                      <motion.div 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setGajiSort('komisi')}
                        className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${gajiSort === 'komisi' ? 'bg-orange-500/20 border-orange-500/40 ring-1 ring-orange-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                      >
                        <span className={`text-[12px] font-medium leading-none truncate w-full px-1 text-center ${gajiSort === 'komisi' ? 'text-orange-400' : 'text-white'}`}>
                          {Math.max(...dashboardData.gajiStats.map(s => s.total_komisi), 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                        </span>
                        <span className={`text-[10px] font-medium uppercase tracking-[0.1em] mt-1.5 text-center scale-90 ${gajiSort === 'komisi' ? 'text-orange-400' : 'text-white/40'}`}>Top Komisi</span>
                        {gajiSort === 'komisi' && <div className="absolute -bottom-1 w-1 h-1 bg-orange-400 rounded-full shadow-[0_0_8px_rgba(251,146,60,0.8)]" />}
                      </motion.div>
                      <motion.div 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setGajiSort('point')}
                        className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${gajiSort === 'point' ? 'bg-blue-500/20 border-blue-500/40 ring-1 ring-blue-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                      >
                        <span className={`text-[12px] font-medium leading-none truncate w-full px-1 text-center ${gajiSort === 'point' ? 'text-blue-400' : 'text-white'}`}>
                          {Math.max(...dashboardData.gajiStats.map(s => s.total_point), 0)}
                        </span>
                        <span className={`text-[10px] font-medium uppercase tracking-[0.1em] mt-1.5 text-center scale-90 ${gajiSort === 'point' ? 'text-blue-400' : 'text-white/40'}`}>Top PO</span>
                        {gajiSort === 'point' && <div className="absolute -bottom-1 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" />}
                      </motion.div>
                      <motion.div 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setGajiSort('absen')}
                        className={`aspect-square backdrop-blur-3xl border rounded-[20px] flex flex-col items-center justify-center shadow-2xl relative transition-all cursor-pointer ${gajiSort === 'absen' ? 'bg-emerald-500/20 border-emerald-500/40 ring-1 ring-emerald-500/30' : 'bg-white/[0.03] border-white/10 opacity-60'}`}
                      >
                        <span className={`text-[12px] font-medium leading-none truncate w-full px-1 text-center ${gajiSort === 'absen' ? 'text-emerald-400' : 'text-white'}`}>
                          {Math.max(...dashboardData.gajiStats.map(s => s.bonus_absen), 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                        </span>
                        <span className={`text-[10px] font-medium uppercase tracking-[0.1em] mt-1.5 text-center scale-90 ${gajiSort === 'absen' ? 'text-emerald-400' : 'text-white/40'}`}>Top +Absen</span>
                        {gajiSort === 'absen' && <div className="absolute -bottom-1 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                      </motion.div>
                    </>
                  }
                </div>
                
               <div className="grid grid-cols-2 gap-3 pb-8 px-1">
                   { (loading || isSyncing || loadingSalary) ? 
                      [...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white/[0.03] p-5 rounded-[28px] border border-white/[0.08] space-y-4">
                           <div className="flex justify-between items-start">
                              <SkeletonItem className="w-24 h-5" />
                              <SkeletonItem className="w-10 h-10 rounded-2xl" />
                           </div>
                           <div className="space-y-2">
                              <SkeletonItem className="w-20 h-2" />
                              <SkeletonItem className="w-32 h-4" />
                           </div>
                           <SkeletonItem className="w-full h-16 rounded-2xl" />
                        </div>
                      ))
                    : 
                     dashboardData.gajiStats
                       .map((emp, idx) => {
                         const isPaid = emp.sisa_gaji <= 0;
                       return (
                         <motion.div 
                           key={idx}
                           onClick={() => setSelectedSalaryStat(emp)}
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           transition={{ delay: idx * 0.05 }}
                           className="relative bg-white/[0.03] backdrop-blur-3xl p-5 rounded-[28px] border border-white/[0.08] shadow-2xl transition-all cursor-pointer active:scale-[0.98] group overflow-hidden"
                         >
                           <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-colors" />
                           
                            <div className="relative">
                              <div className="flex justify-between items-start mb-6">
                                <div className="text-left">
                                   <div className="flex flex-col gap-1.5 text-left">
                                      <h4 className="text-[14px] font-medium text-white uppercase tracking-tight leading-tight mb-0.5 break-words">{emp.nama}</h4>
                                      <span className="text-[8px] font-medium text-emerald-400 uppercase tracking-[0.3em]">{emp.cabang}</span>
                                   </div>
                                </div>
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isPaid ? 'bg-emerald-500 text-zinc-950 scale-110 shadow-lg shadow-emerald-400/20 ring-4 ring-emerald-500/10' : 'bg-white/5 text-white/10 border border-white/5'}`}>
                                  <CheckCircle2 size={18} />
                                </div>
                              </div>

                              <div className="flex flex-col gap-2.5 mb-6 py-4 border-y border-white/[0.05] -mx-5 px-5 bg-white/[0.01]">
                                {emp.total_komisi > 0 && (
                                  <div className="flex justify-between items-center w-full">
                                    <span className="text-[7.5px] font-medium text-white/30 uppercase tracking-[0.15em] leading-none">Komisi</span>
                                    <span className="text-[10px] font-medium text-orange-400 leading-none">Rp {emp.total_komisi.toLocaleString('id-ID')}</span>
                                  </div>
                                )}
                                {emp.total_point > 0 && (
                                  <div className="flex justify-between items-center w-full">
                                    <span className="text-[7.5px] font-medium text-white/30 uppercase tracking-[0.15em] leading-none">Point</span>
                                    <span className="text-[10px] font-medium text-blue-400 leading-none">{emp.total_point}</span>
                                  </div>
                                )}
                                {emp.bonus_absen > 0 && (
                                  <div className="flex justify-between items-center w-full">
                                    <span className="text-[7.5px] font-medium text-white/30 uppercase tracking-[0.15em] leading-none">Absen</span>
                                    <span className="text-[10px] font-medium text-emerald-400 leading-none">Rp {emp.bonus_absen.toLocaleString('id-ID')}</span>
                                  </div>
                                )}
                              </div>

                               <div className="flex justify-between items-end mb-6">
                                <span className="text-[8px] font-medium text-white/30 uppercase tracking-[0.3em]">Gaji Total</span>
                                <div className="flex items-baseline gap-1 text-right">
                                   <span className="text-[10px] font-medium text-white/40 uppercase italic">Rp</span>
                                   <span className="text-[15px] font-medium text-white tracking-tighter leading-none italic">
                                     {emp.gaji_aktual.toLocaleString('id-ID')}
                                   </span>
                                </div>
                              </div>

                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransferInput({ empEmail: emp.email, month: Array.from(filterMonths)[0] });
                                }}
                                className="bg-black/20 -mx-5 px-5 py-4 space-y-2.5 rounded-b-[24px]"
                              >
                                <div className="flex justify-between items-center cursor-pointer group" onClick={(e) => { e.stopPropagation(); setKasbonDialog({show: true, isEdit: false, data: {email: emp.email, nama: emp.nama, tanggal: new Date().toISOString().slice(0,10), nominal: '', item: ''}}); }}>
                                  <span className="text-[7.5px] font-medium text-white/20 uppercase tracking-[0.2em] flex items-center gap-1 group-hover:text-emerald-400 transition-colors">Kasbon <Plus size={10} /></span>
                                  <span className="text-[11px] font-medium text-red-500">Rp {emp.total_kasbon.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between items-center cursor-pointer group" onClick={(e) => { e.stopPropagation(); setTransferInput({ empEmail: emp.email, month: Array.from(filterMonths)[0] }); }}>
                                  <span className="text-[7.5px] font-medium text-white/20 uppercase tracking-[0.2em] flex items-center gap-1 group-hover:text-emerald-400 transition-colors">Sudah TF <Plus size={10} /></span>
                                  <span className="text-[11px] font-medium text-white/90">Rp {emp.total_transferred.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="h-[2px] bg-white/[0.05] w-full my-1" />
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-medium text-emerald-400 uppercase tracking-[0.4em]">Sisa Gaji</span>
                                  <span className="text-[13px] font-medium text-emerald-400 italic">Rp {emp.sisa_gaji.toLocaleString('id-ID')}</span>
                                </div>
                              </div>
                           </div>
                         </motion.div>
                       );
                     })
                   }
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
      </div>

      <AnimatePresence>
        {selectedStat && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end justify-center px-4 pb-0"
            onClick={() => setSelectedStat(null)}
          >
              <motion.div 
               drag="y"
               dragConstraints={{ top: 0, bottom: 0 }}
               dragElastic={0.7}
               onDragEnd={(_, info) => {
                 if (info.offset.y > 150) setSelectedStat(null);
               }}
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               transition={{ type: 'spring', damping: 30, stiffness: 350 }}
               className="w-full max-w-sm md:max-w-md bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-t-[48px] max-h-[95vh] flex flex-col overflow-hidden shadow-2xl"
               onClick={e => e.stopPropagation()}
             >
                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto no-scrollbar overscroll-contain relative pt-0">
                    {/* Visual indicator for drag */}
                    <div className="shrink-0 pt-6 pb-2 sticky top-0 z-[70] flex justify-center items-center pointer-events-none">
                        <div className="w-12 h-1.5 bg-white/10 rounded-full opacity-40 backdrop-blur-md" />
                    </div>

                    {/* Header Section */}
                    <div className="px-6 pt-2 pb-6">
                        <div className="p-8 relative overflow-hidden bg-white/[0.03] rounded-[32px] border border-white/5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16" />
                            <div className="flex flex-wrap justify-between items-start gap-y-4 relative z-10">
                                <div className="max-w-[70%]">
                                    <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tighter uppercase leading-none break-words">
                                        {selectedStat.nama}
                                    </h2>
                                    <p className="text-[10px] text-emerald-400 font-medium uppercase tracking-[0.4em] mt-3">
                                        {employeeData.find(e => (e.Nama || '').toLowerCase().trim() === selectedStat.nama.toLowerCase().trim())?.Cabang || 'Flow Salon'}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-5xl sm:text-6xl font-light text-emerald-400 tracking-tighter leading-none">
                                        {getDetailedStats(selectedStat.nama, Array.from(filterMonths)).kepatuhan}
                                    </span>
                                    <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest mt-1">Score Progress</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STICKY NAME SUB-HEADER */}
                    <div 
                        className="sticky top-0 z-[60] px-8 py-3 flex justify-between items-center bg-black/40 border-b border-white/5"
                        style={{ height: '70px' }}
                    >
                        <div className="flex flex-col">
                            <span className="text-[12px] font-medium text-white uppercase tracking-tighter">{selectedStat.nama}</span>
                            <span className="text-[8px] text-white/40 font-medium uppercase tracking-widest leading-none">Attendance Log</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex flex-col items-end">
                              <span className="text-[16px] font-medium text-emerald-400 leading-none">
                                 {getDetailedStats(selectedStat.nama, Array.from(filterMonths)).kepatuhan}
                              </span>
                              <span className="text-[7px] text-white/20 font-medium uppercase tracking-widest">Score</span>
                           </div>
                           <div className="w-px h-6 bg-white/10" />
                           <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest font-mono">
                             {filterMonths.size > 1 ? `${filterMonths.size} Bulan` : getMonthLabel(Array.from(filterMonths)[0])}
                           </span>
                        </div>
                    </div>

                    <div className="p-6 space-y-8">
                    {/* PRESENCE SUMMARY */}
                    {(() => {
                        const stats = getDetailedStats(selectedStat.nama, Array.from(filterMonths));
                        const matchedGaji = dashboardData.gajiStats.find(g => (g.nama || '').toLowerCase().trim() === selectedStat.nama.toLowerCase().trim());
                        const sheetHariLibur = matchedGaji !== undefined && matchedGaji.hariLibur !== undefined ? matchedGaji.hariLibur : stats.hariLiburCount;

                        return (
                            <div className="space-y-4">
                                <div className="px-2 flex justify-between items-center opacity-40">
                                    <span className="text-[9px] font-medium uppercase tracking-[0.2em]">Summary Statistics</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2 bg-white/[0.01] rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[90px] border border-white/5 shadow-lg">
                                        <p className="text-[9px] text-white/80 font-medium uppercase tracking-widest mb-1">TOTAL HADIR</p>
                                        <p className="text-3xl font-light text-white">{stats.hadir}</p>
                                    </div>
                                    
                                    <div className="bg-emerald-500/[0.01] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-emerald-500/10 shadow-lg">
                                        <p className="text-[7.5px] text-emerald-400 font-medium uppercase tracking-widest mb-1">DISIPLIN (+10)</p>
                                        <p className="text-2xl font-light text-emerald-400">{stats.elite}</p>
                                    </div>
                                    <div className="bg-white/[0.02] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-white/10 shadow-lg">
                                        <p className="text-[7.5px] text-white/40 font-medium uppercase tracking-widest mb-1">TEPAT (+8)</p>
                                        <p className="text-2xl font-light text-white/60">{stats.standard}</p>
                                    </div>
                                    <div className="bg-orange-500/[0.01] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-orange-500/10 shadow-lg">
                                        <p className="text-[7.5px] text-orange-400 font-medium uppercase tracking-widest mb-1">TELAT (+3)</p>
                                        <p className="text-2xl font-light text-orange-400">{stats.telatReguler}</p>
                                    </div>
                                    <div className="bg-orange-600/[0.02] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-orange-500/15 shadow-lg">
                                        <p className="text-[7.5px] text-orange-500 font-medium uppercase tracking-widest mb-1">TELAT KRUSIAL (+1)</p>
                                        <p className="text-2xl font-light text-orange-500">{stats.telatKrusial}</p>
                                    </div>
                                    <div className="bg-red-500/[0.01] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-red-500/10 shadow-lg">
                                        <p className="text-[7.5px] text-red-400 font-medium uppercase tracking-widest mb-1">1/2 HARI (+1)</p>
                                        <p className="text-2xl font-light text-red-400">{stats.partialReguler}</p>
                                    </div>
                                    <div className="bg-red-600/[0.02] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-red-500/20 shadow-lg">
                                        <p className="text-[7.5px] text-red-500 font-medium uppercase tracking-widest mb-1">1/2 HARI KRUSIAL (-5)</p>
                                        <p className="text-2xl font-light text-red-500">{stats.partialKrusial}</p>
                                    </div>
                                    <div className="bg-rose-500/[0.01] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-rose-500/10 shadow-lg">
                                        <p className="text-[7.5px] text-rose-400 font-medium uppercase tracking-widest mb-1">LIBUR (0)</p>
                                        <p className="text-2xl font-light text-rose-400/60">{stats.liburReguler}</p>
                                    </div>
                                    <div className="bg-rose-600/[0.02] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-rose-500/20 shadow-lg">
                                        <p className="text-[7.5px] text-rose-500 font-medium uppercase tracking-widest mb-1">LIBUR KRUSIAL (-10)</p>
                                        <p className="text-2xl font-light text-rose-500">{stats.liburKrusial}</p>
                                    </div>
                                    <div className="col-span-2 bg-rose-500/[0.03] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-rose-400/20 shadow-lg select-none">
                                        <p className="text-[7.5px] text-rose-400 font-medium uppercase tracking-widest mb-1">HARI LIBUR (BONUS)</p>
                                        <p className="text-2xl font-light text-rose-400">{sheetHariLibur}</p>
                                    </div>
                                

                                     <div className="col-span-2 bg-white/[0.01] rounded-[32px] p-6 flex flex-col items-center justify-center text-center border border-white/5 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                                        
                                        <div className="flex w-full justify-between items-center mb-8 px-2">
                                            <div className="flex flex-col items-center flex-1">
                                                <p className="text-[7px] text-white/20 font-medium uppercase tracking-[0.2em] mb-1">REGULER</p>
                                                <p className="text-lg font-medium text-white italic tracking-tighter">{stats.totalPointsReg}</p>
                                            </div>
                                            <div className="w-px h-8 bg-white/5 mx-2" />
                                            <div className="flex flex-col items-center flex-1">
                                                <p className="text-[7px] text-white/20 font-medium uppercase tracking-[0.2em] mb-1">KRUSIAL</p>
                                                <p className="text-lg font-medium text-white italic tracking-tighter">{stats.totalPointsKrusial}</p>
                                            </div>
                                            <div className="w-px h-8 bg-white/5 mx-2" />
                                            <div className="flex flex-col items-center flex-1">
                                                <p className="text-[7px] text-emerald-400/40 font-medium uppercase tracking-[0.2em] mb-1">TOTAL POINT</p>
                                                <p className="text-xl font-medium text-emerald-400 italic tracking-tighter">{stats.totalPoints}</p>
                                            </div>
                                        </div>

                                        <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="80"
                                                    cy="80"
                                                    r="70"
                                                    stroke="currentColor"
                                                    strokeWidth="10"
                                                    fill="transparent"
                                                    className="text-white/[0.03]"
                                                />
                                                <circle
                                                    cx="80"
                                                    cy="80"
                                                    r="70"
                                                    stroke="currentColor"
                                                    strokeWidth="10"
                                                    fill="transparent"
                                                    strokeDasharray={2 * Math.PI * 70}
                                                    strokeDashoffset={2 * Math.PI * 70 * (1 - Math.min(100, Math.max(0, stats.kepatuhan)) / 100)}
                                                    strokeLinecap="round"
                                                    className="text-emerald-400 transition-all duration-1000 ease-out drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                                                />
                                            </svg>
                                            <div className="absolute flex flex-col items-center justify-center">
                                                <span className="text-4xl font-light text-white tracking-tighter italic leading-none">{stats.kepatuhan}%</span>
                                                <span className="text-[8px] text-white/30 font-medium uppercase tracking-[0.2em] mt-1">SKOR AKHIR</span>
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-emerald-400/60 font-medium italic mb-2 tracking-tighter">
                                           ({stats.totalPoints} / {stats.targetDays * 10}) x 100
                                        </p>
                                        <p className="text-[6px] text-white/10 font-medium uppercase tracking-[0.3em]">Rumus: (Total Poin / Target Maksimal) x 100</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                        {/* ATTENDANCE SCORING LEGEND */}
                        <div className="space-y-4">
                            <div className="px-2 flex justify-between items-center opacity-40">
                                <span className="text-[9px] font-medium uppercase tracking-[0.2em]">Scoring Matrix</span>
                            </div>
                            <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 space-y-4">
                                <div className="grid grid-cols-3 gap-2 text-[7px] font-medium uppercase tracking-widest text-white/20 pb-2 border-b border-white/5">
                                    <span className="col-span-1">Category</span>
                                    <span className="text-center">Reguler</span>
                                    <span className="text-center">Krusial</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-2 items-center">
                                        <span className="text-[8px] font-medium text-emerald-400">Disiplin</span>
                                        <span className="text-[10px] font-medium text-center" style={{ color: '#34d399' }}>+10</span>
                                        <span className="text-[10px] font-medium text-center" style={{ color: '#34d399' }}>+10</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 items-center">
                                        <span className="text-[8px] font-medium" style={{ color: '#cbcbcb' }}>Tepat</span>
                                        <span className="text-[10px] font-medium text-center" style={{ color: '#cbcbcb' }}>+8</span>
                                        <span className="text-[10px] font-medium text-center" style={{ color: '#cbcbcb' }}>+8</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 items-center">
                                        <span className="text-[8px] font-medium" style={{ color: '#fb923c' }}>Telat</span>
                                        <span className="text-[10px] font-medium text-center" style={{ color: '#fb923c' }}>+3</span>
                                        <span className="text-[10px] font-medium text-center" style={{ color: '#fb923c' }}>+1</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 items-center">
                                        <span className="text-[8px] font-medium" style={{ color: '#bf7b7b' }}>1/2 Hari</span>
                                        <span className="text-[10px] font-medium text-center" style={{ color: '#bf7b7b' }}>+1</span>
                                        <span className="text-[10px] font-medium text-center" style={{ color: '#bf7b7b' }}>-5</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 items-center">
                                        <span className="text-[8px] font-medium" style={{ color: '#d25151' }}>Libur</span>
                                        <span className="text-[10px] font-medium text-center" style={{ color: '#d25151' }}>0</span>
                                        <span className="text-[10px] font-medium text-center" style={{ color: '#d25151' }}>-10</span>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-[7px] text-white/20 leading-relaxed uppercase tracking-widest">
                                        * Hari Krusial: Sabtu, Minggu, atau Tanggal 24 s/d Akhir Bulan.<br/>
                                        * 1/2 Hari: Terlambat &gt; 3 Jam atau Pulang Cepat &gt; 3 Jam.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* LIST ATTENDANCE */}
                        <div className="space-y-2">
                            <div className="px-3 flex justify-between items-center opacity-40 mb-3">
                                <span className="text-[9px] font-medium uppercase tracking-[0.3em]">Log Aktivitas</span>
                                <span className="text-[9px] font-medium uppercase tracking-[0.3em] font-mono">
                                  {filterMonths.size > 1 ? `${filterMonths.size} Bulan` : getMonthLabel(Array.from(filterMonths)[0])}
                                </span>
                            </div>
                            
                            <div className="space-y-3 px-1 pb-10">
                                {(() => {
                                    const selectedMonthStr = Array.from(filterMonths)[0];
                                    const year = parseInt(selectedMonthStr.split('-')[0]);
                                    const month = parseInt(selectedMonthStr.split('-')[1]) - 1;
                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                    const days = [];
                                    
                                    const normalizedSelectedName = selectedStat.nama.toLowerCase().trim();
                                    const empInfo = employeeData.find(e => (e.Nama || '').toLowerCase().trim() === normalizedSelectedName);
                                    const salMatch = salaryDetails.find(s => (s.nama || s.Nama || '').toLowerCase().trim() === normalizedSelectedName);
                                    const joinDateParsed = getEmpJoinDateStr(empInfo, selectedMonthStr) || getEmpJoinDateStr(salMatch, selectedMonthStr);
                                    let joinDate: Date | null = null;
                                    if (joinDateParsed && /^\d{4}-\d{2}-\d{2}$/.test(joinDateParsed)) {
                                        const [jy, jm, jd] = joinDateParsed.split('-').map(Number);
                                        joinDate = new Date(jy, jm - 1, jd);
                                        joinDate.setHours(0, 0, 0, 0);
                                    }
                                    const outDateParsed = getEmpOutDateStr(empInfo, selectedMonthStr) || getEmpOutDateStr(salMatch, selectedMonthStr);
                                    let outDate: Date | null = null;
                                    if (outDateParsed && /^\d{4}-\d{2}-\d{2}$/.test(outDateParsed)) {
                                        const [oy, om, od] = outDateParsed.split('-').map(Number);
                                        outDate = new Date(oy, om - 1, od);
                                        outDate.setHours(0, 0, 0, 0);
                                    }

                                    let targetMinutes = 10 * 60; 
                                    if (empInfo?.JamKhusus) {
                                        const matchArr = String(empInfo.JamKhusus).match(/(\d{1,2})[:.](\d{2})/);
                                        if (matchArr) {
                                            targetMinutes = parseInt(matchArr[1], 10) * 60 + parseInt(matchArr[2], 10);
                                        }
                                    }

                                    for (let i = 1; i <= daysInMonth; i++) {
                                        const dateObj = new Date(year, month, i);
                                        dateObj.setHours(0, 0, 0, 0);
                                        if (joinDate && dateObj < joinDate) continue;
                                        if (outDate && dateObj >= outDate) continue;
                                        const dateStr = dateObj.toLocaleDateString('en-CA');
                                        const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
                                        const dateLabel = `${dayName} ${String(i).padStart(2, '0')} ${dateObj.toLocaleDateString('id-ID', { month: 'short' })}`;
                                        
                                        const dayAtt = attendanceData.filter(a => (a.Nama || '').toLowerCase().trim() === normalizedSelectedName && a.Tanggal === dateStr);
                                        const checkIn = dayAtt.find(a => (a.Jenis || '').toLowerCase() === 'masuk');
                                        const checkOut = dayAtt.find(a => (a.Jenis || '').toLowerCase() === 'pulang');

                                        const hk = hariKhusus.find(h => parseSheetDate(h.tanggal || h.Tanggal) === dateStr);
                                        const isHK = !!hk;

                                        const hl = hariLibur.find(h => parseSheetDate(h.tanggal || h.Tanggal) === dateStr);
                                        const isHL = !!hl;
                                        const izRow = hariIzin.find(hi => {
                                            const hiName = (hi.Nama || hi.nama || '').toLowerCase().trim();
                                            const hiDate = parseSheetDate(hi.tanggal || hi.Tanggal);
                                            return hiName === normalizedSelectedName && hiDate === dateStr;
                                        });
                                        const isIzin = !!izRow;

                                        const today = new Date();
                                        today.setHours(0,0,0,0);
                                        
                                        let status = 'Libur';
                                        let statusColor = 'text-red-400';
                                        
                                        if (dateObj > today) {
                                            status = isHK ? 'KHUSUS' : '';
                                            statusColor = isHK ? 'text-yellow-400' : '';
                                        }
                                        
                                        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                                        const isLateMonth = i >= 24;
                                        const isKrusial = isWeekend || isLateMonth || isHK || isHL;
                                        let entryMinutes = targetMinutes;

                                        if (checkIn) {
                                            const actualMinutes = getTimeMinutes(checkIn.Jam);
                                             const { jM, jP } = getShiftTargets(checkIn.Shift || checkIn.shift || '', empInfo?.JamKhusus || '');
                                             entryMinutes = jM;
                                             const targetExitMinutes = jP;
                                            let isEarlyOutDetail = false;
                                            if (checkOut) {
                                                const outMinutes = getTimeMinutes(checkOut.Jam);
                                                if (targetExitMinutes - outMinutes >= 180) isEarlyOutDetail = true; 
                                            }
                                            const isLateLong = actualMinutes >= (entryMinutes + 180);

                                            if (isEarlyOutDetail || isLateLong) { 
                                                status = '1/2 Hari'; 
                                                statusColor = 'text-purple-400'; 
                                            }
                                            else if (actualMinutes > entryMinutes) { status = 'Telat'; statusColor = 'text-orange-400'; }
                                            else if (actualMinutes <= entryMinutes - 15) { status = 'Disiplin'; statusColor = 'text-emerald-400'; }
                                            else { status = 'Tepat'; statusColor = 'text-white'; }
                                        }

                                        if (isIzin) {
                                            status = 'IZIN';
                                            statusColor = 'text-amber-400';
                                        }

                                        const recCabang = checkIn?.Cabang || checkIn?.cabang || checkOut?.Cabang || checkOut?.cabang || employeeData.find(e => (e.Nama || '').toLowerCase().trim() === normalizedSelectedName)?.Cabang || 'Flow Salon';

                                        const isNaturalKrusial = isWeekend || isLateMonth || isHK;

                                        let cardBorderClass = "border border-white/5 shadow-sm";
                                        let cardBgClass = "bg-white/[0.01] hover:bg-white/5";

                                        if (isHL) {
                                            cardBorderClass = "border-[3px] border-rose-500";
                                        } else if (isIzin || status === 'IZIN') {
                                            cardBorderClass = "border border-amber-500/10 shadow-sm";
                                        } else if (isKrusial) {
                                            cardBorderClass = "border border-white/10 shadow-md";
                                        }

                                        if (isIzin || status === 'IZIN') {
                                            cardBgClass = "bg-amber-500/[0.02] hover:bg-amber-500/5";
                                        } else if (isNaturalKrusial) {
                                            cardBgClass = "bg-black/35 hover:bg-black/55 shadow-md";
                                        } else if (isHL) {
                                            cardBgClass = "bg-rose-500/[0.01] hover:bg-rose-500/5";
                                        }

                                          days.push(
                                            <div 
                                                key={i} 
                                                className={`transition-all duration-300 rounded-[28px] p-6 flex flex-col group overflow-hidden relative ${cardBgClass} ${cardBorderClass}`}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    {/* Left side: Date */}
                                                    <div className="flex flex-col gap-1 w-1/4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[13px] font-medium text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{dateLabel}</span>
                                                        </div>
                                                        <span className="text-[8px] font-medium text-white/10 uppercase tracking-widest truncate">{recCabang}</span>
                                                    </div>

                                                    {/* Center side: Shift & Status */}
                                                    <div className="flex-1 flex flex-col items-center justify-center border-x border-white/5 px-2">
                                                        {!isHL ? (
                                                            <>
                                                                <span className="text-[7px] font-medium text-white/20 uppercase tracking-widest mb-1">{checkIn?.Shift || (status === 'Libur' || status === 'IZIN' ? 'OFF' : (status === '' ? '' : 'Full'))}</span>
                                                                {status && (
                                                                    <div className={`px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-[9px] font-medium uppercase tracking-widest ${statusColor} drop-shadow-sm`}>
                                                                        {status}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="text-[7px] font-medium text-white/20 uppercase tracking-widest mb-1">OFF</span>
                                                                <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-medium uppercase tracking-widest text-emerald-400 drop-shadow-sm font-medium">
                                                                    Digaji
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Right side: Time */}
                                                        <div className="w-1/4 flex flex-col items-end gap-1.5 pl-4">
                                                            <button 
                                                                onClick={() => {
                                                                    const empInfo = employeeData.find(e => (e.Nama || '').toLowerCase().trim() === normalizedSelectedName);
                                                                    const existingWaktu = checkIn?.Waktu || checkIn?.waktu || checkIn?.timestamp;
                                                                    const dayCabang = checkIn?.Cabang || checkOut?.Cabang;
                                                                    
                                                                    setEditingEntry({ 
                                                                        nama: selectedStat.nama, 
                                                                        email: empInfo?.email || '',
                                                                        waktu: existingWaktu || `${dateStr}T10:00:00`, 
                                                                        jenis: 'Masuk', 
                                                                        current: checkIn?.Jam || '-:-',
                                                                        existingCabang: dayCabang
                                                                    });
                                                                    setNewTimeVal(checkIn?.Jam || "10:00");
                                                                    setSelectedEditCabang(dayCabang || "");
                                                                }}
                                                                className="text-[12px] font-mono font-medium text-white/60 italic tracking-tighter hover:text-white transition-colors bg-white/5 px-2 py-0.5 rounded-lg border border-white/5"
                                                            >
                                                                {checkIn?.Jam || '-:-'}
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    const empInfo = employeeData.find(e => e.Nama === selectedStat.nama);
                                                                    const existingWaktu = checkOut?.Waktu || checkOut?.waktu || checkOut?.timestamp;
                                                                    const dayCabang = checkIn?.Cabang || checkOut?.Cabang;

                                                                    setEditingEntry({ 
                                                                        nama: selectedStat.nama, 
                                                                        email: empInfo?.email || '',
                                                                        waktu: existingWaktu || `${dateStr}T17:00:00`, 
                                                                        jenis: 'Pulang', 
                                                                        current: checkOut?.Jam || '-:-',
                                                                        existingCabang: dayCabang
                                                                    });
                                                                    setNewTimeVal(checkOut?.Jam || "17:00");
                                                                    setSelectedEditCabang(dayCabang || "");
                                                                }}
                                                                className="text-[12px] font-mono font-medium text-white/60 italic tracking-tighter hover:text-white transition-colors bg-white/5 px-2 py-0.5 rounded-lg border border-white/5"
                                                            >
                                                                {checkOut?.Jam || '-:-'}
                                                            </button>
                                                        </div>
                                                </div>
                                                {(isHK || isHL || isIzin) && (
                                                    <div className="w-full mt-4 pt-4 border-t border-white/5 text-center">
                                                        <span className="text-[10px] font-medium uppercase tracking-[0.2em] block">
                                                            {isHL ? (
                                                                <span className="text-rose-400">Libur {hl?.keterangan || hl?.Keterangan || ''}</span>
                                                            ) : isIzin ? (
                                                                <span className="text-amber-400">Izin: {izRow?.keterangan || izRow?.Keterangan || izRow?.item || ''}</span>
                                                            ) : (
                                                                <span className="text-rose-400">{hk?.keterangan || hk?.Keterangan || ''}</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                         );
                                    }
                                    return days;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Bottom Close Button to avoid swipe reliance */}
                <div className="p-4 bg-transparent border-t border-white/5 shrink-0">
                    <button 
                        onClick={() => setSelectedStat(null)}
                        className="w-full py-4 text-xs font-medium uppercase tracking-[0.2em] text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-[20px] border border-white/10 duration-150 shadow-lg cursor-pointer text-center"
                    >
                        Tutup Rincian Absen
                    </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* SALARY DETAIL MODAL */}
      <AnimatePresence>
        {selectedSalaryStat && !showPointDetails && !showCommissionDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[125] flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedSalaryStat(null)}
          >
              <motion.div 
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.7}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 150) setSelectedSalaryStat(null);
                }}
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 30 }}
               className="w-full max-w-lg bg-white/[0.03] backdrop-blur-3xl p-6 sm:p-8 rounded-[36px] sm:rounded-[48px] shadow-2xl relative border border-white/5 max-h-[90vh] overflow-y-auto no-scrollbar scroll-smooth"
               onClick={e => e.stopPropagation()}
             >
                {(() => {
                  const harianPrecise = (selectedSalaryStat.gaji_pokok || 2500000) / (selectedSalaryStat.hari_kerja || 28);
                  const displayGajiHarian = Math.round(harianPrecise);
                  const isPaid = selectedSalaryStat.sisa_gaji <= 0;
                  return (
                    <>
                      {/* Absolute Top-Right Close Button */}
                <button
                  onClick={() => setSelectedSalaryStat(null)}
                  className="absolute top-6 right-6 p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all z-[80] cursor-pointer"
                  id="close-salary-modal-btn"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Visual indicator for drag */}
                <div className="shrink-0 pt-2 pb-6 flex justify-center items-center pointer-events-none sticky top-0 z-[70]">
                    <div className="w-12 h-1.5 bg-white/10 rounded-full opacity-40 backdrop-blur-md" />
                </div>
                {/* BACKGROUND DECOR */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[120px] -mr-32 -mt-32 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[120px] -ml-32 -mb-32 pointer-events-none" />
                
                {/* HEADER SECTION - GAJI AKTUAL */}
                <div className="mb-6 sm:mb-10 text-white">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-[9px] font-medium uppercase tracking-[0.3em] text-white/40 mb-2 italic">Gaji Aktual Bulan Ini</h4>
                      <h5 className="text-[10px] font-medium uppercase tracking-widest text-emerald-400 mb-2 sm:mb-4">{selectedSalaryStat.periode_label || "MARET 2026"}</h5>
                      <h2 className="text-3xl sm:text-4xl font-light tracking-tighter leading-none">
                        Rp {Math.round(selectedSalaryStat.gaji_aktual || 0).toLocaleString('id-ID')}
                      </h2>
                    </div>
                    <div 
                      className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full border-4 sm:border-8 flex items-center justify-center transition-all ${ isPaid ? 'border-emerald-500/20 bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-400/10' : 'border-white/5 bg-white/5 text-white/20' }`}
                      title={isPaid ? "Lunas" : "Belum Lunas"}
                    >
                      <CheckCircle2 size={24} />
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-white/10 mb-6" />

                  <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <div>
                      <h4 className="text-[12px] font-medium uppercase tracking-[0.3em] text-white/40 mb-1 italic">Kasbon</h4>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-[#d25151] italic">
                      -Rp {(selectedSalaryStat.total_kasbon || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-medium italic tracking-tighter text-white/80">Sisa Gaji</h3>
                      {isPaid && (
                        <div className="mt-1">
                          <span className="text-[9px] font-medium uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full tracking-wider italic">
                            LUNAS
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-light text-emerald-400 tracking-tighter italic leading-none">
                        Rp {Math.round(selectedSalaryStat.sisa_gaji || 0).toLocaleString('id-ID')}
                      </span>
                      {isPaid && (
                        <div className="text-[10px] text-white/40 mt-1 italic">
                          Nominal Dibayar: Rp {Math.round(selectedSalaryStat.sisa_gaji_calculated || 0).toLocaleString('id-ID')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RINCIAN PENDAPATAN AKTUAL */}
                <div className="mb-12 space-y-8">
                  <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40 italic border-b border-white/5 pb-4">Rincian Pendapatan Aktual</h4>
                  
                  <div className="flex justify-between items-center group">
                    <div>
                      <h5 className="text-sm font-medium text-white mb-1">Hadir (Semua Kehadiran)</h5>
                      <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">{selectedSalaryStat.hadir || 0} HARI × RP {displayGajiHarian.toLocaleString('id-ID')}</p>
                    </div>
                    <span className="text-sm font-medium text-emerald-400 italic">Rp {((selectedSalaryStat.hadir || 0) === (selectedSalaryStat.hari_kerja || 28) ? (selectedSalaryStat.gaji_pokok || 2500000) : Math.round((selectedSalaryStat.hadir || 0) * harianPrecise)).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center group">
                    <div>
                      <h5 className="text-sm font-medium text-white mb-1">Bonus Disiplin (15 mnt sebelum jam masuk)</h5>
                      <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">{selectedSalaryStat.disiplin || 0} HARI × RP {(selectedSalaryStat.bonus_disiplin ?? 5000).toLocaleString('id-ID')}</p>
                    </div>
                    <span className="text-sm font-medium text-emerald-400 italic">Rp {((selectedSalaryStat.disiplin || 0) * (selectedSalaryStat.bonus_disiplin ?? 5000)).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center group">
                    <div>
                      <h5 className="text-sm font-medium text-white mb-1">Uang Makan (Tidak telat / setengah hari)</h5>
                      <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">{Math.max(0, (selectedSalaryStat.hadir || 0) - (selectedSalaryStat.telat || 0) - (selectedSalaryStat.hariLibur || 0) - ((selectedSalaryStat.setengah_hari_weekday || 0) + (selectedSalaryStat.setengah_hari_weekend || 0)))} HARI × RP {(selectedSalaryStat.uang_makan ?? 20000).toLocaleString('id-ID')}</p>
                    </div>
                    <span className="text-sm font-medium text-emerald-400 italic">Rp {(Math.max(0, (selectedSalaryStat.hadir || 0) - (selectedSalaryStat.telat || 0) - (selectedSalaryStat.hariLibur || 0) - ((selectedSalaryStat.setengah_hari_weekday || 0) + (selectedSalaryStat.setengah_hari_weekend || 0))) * (selectedSalaryStat.uang_makan ?? 20000)).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center group">
                    <div>
                      <h5 className="text-sm font-medium text-white mb-1">Bonus Absen</h5>
                      <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">{selectedSalaryStat.bonus_absen > 0 ? 'ABSEN FULL' : 'BELUM FULL'}</p>
                    </div>
                    <span className="text-sm font-medium text-emerald-400 italic">Rp {(selectedSalaryStat.bonus_absen || 0).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-start group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-medium text-white">Point Omset</h5>
                      </div>
                      <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">
                        {selectedSalaryStat.total_point > 0 
                          ? `${selectedSalaryStat.total_point} P × RP ${((selectedSalaryStat.point_rp || 0) / (selectedSalaryStat.total_point || 1)).toLocaleString('id-ID')}` 
                          : 'BELUM ADA POINT'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 text-right">
                      {selectedSalaryStat.total_point > 0 && (
                        <button
                          onClick={() => setShowPointDetails(true)}
                          className="inline-flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/10 px-3 py-1 rounded-full text-[10px] font-medium transition-all shadow-sm active:scale-95 duration-100 cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                          <span>Rincian</span>
                        </button>
                      )}
                      <span className="text-sm font-medium text-emerald-400 italic">
                        Rp {(selectedSalaryStat.point_rp || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-start group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="text-sm font-medium text-white">Komisi</h5>
                      </div>
                      <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">
                        Total Komisi Bulan Ini
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 text-right">
                      <button
                        onClick={() => setShowCommissionDetails(true)}
                        className="inline-flex items-center gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/10 px-3 py-1 rounded-full text-[10px] font-medium transition-all shadow-sm active:scale-95 duration-100 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Rincian</span>
                      </button>
                      <span className="text-sm font-medium text-emerald-400 italic">
                        Rp {(selectedSalaryStat.total_komisi || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* POTONGAN */}
                <div className="mb-12 space-y-8">
                  <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40 italic border-b border-white/5 pb-4">Rincian Potongan Aktual</h4>
                                  <div className="flex justify-between items-center group">
                    <div>
                      <h5 className="text-sm font-medium text-white mb-1">Libur Hari Krusial</h5>
                      <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">{selectedSalaryStat.libur_krusial || 0} HARI × RP {displayGajiHarian.toLocaleString('id-ID')}</p>
                    </div>
                    <span className="text-sm font-medium text-[#d25151] italic">-Rp {Math.round((selectedSalaryStat.libur_krusial || 0) * harianPrecise).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center group">
                    <div>
                      <h5 className="text-sm font-medium text-white mb-1">1/2 Hari Weekday</h5>
                      <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">{selectedSalaryStat.setengah_hari_weekday || 0} HARI × RP {Math.round(displayGajiHarian / 2).toLocaleString('id-ID')}</p>
                    </div>
                    <span className="text-sm font-medium text-[#d25151] italic">-Rp {Math.round((selectedSalaryStat.setengah_hari_weekday || 0) * (harianPrecise / 2)).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center group">
                    <div>
                      <h5 className="text-sm font-medium text-white mb-1">1/2 Hari Krusial</h5>
                      <p className="text-[10px] text-white/30 font-medium tracking-widest uppercase">{selectedSalaryStat.setengah_hari_weekend || 0} HARI × RP {displayGajiHarian.toLocaleString('id-ID')}</p>
                    </div>
                    <span className="text-sm font-medium text-[#d25151] italic">-Rp {Math.round((selectedSalaryStat.setengah_hari_weekend || 0) * harianPrecise).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <h5 className="text-sm font-medium text-white font-medium uppercase text-white/60 tracking-widest">Kasbon</h5>
                        <button 
                          onClick={() => setKasbonDialog({
                            show: true,
                            isEdit: false,
                            data: {
                              tanggal: new Date().toISOString().slice(0, 10),
                              item: "",
                              nominal: "",
                              email: selectedSalaryStat?.email || "",
                              nama: selectedSalaryStat?.nama || ""
                            }
                          })}
                          className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-full hover:bg-emerald-500/30 transition-all border border-emerald-500/20"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm font-medium text-[#d25151] italic">-Rp {(selectedSalaryStat.total_kasbon || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="space-y-2">
                        {(selectedSalaryStat.kasbon_list || []).length > 0 ? (
                           selectedSalaryStat.kasbon_list.map((item: any, i: number) => (
                              <button 
                                key={i} 
                                onClick={() => setKasbonDialog({
                                  show: true,
                                  isEdit: true,
                                  data: {
                                    tanggal: item.tanggal ? new Date(item.tanggal).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                                    item: item.item,
                                    nominal: String(item.nominal),
                                    email: selectedSalaryStat?.email || "",
                                    nama: selectedSalaryStat?.nama || "",
                                    oldData: item
                                  }
                                })}
                                className="w-full flex justify-between items-center bg-white/5 p-3 rounded-xl group hover:bg-white/10 transition-all border border-white/5 active:scale-[0.98] text-left"
                              >
                                 <div className="flex flex-col">
                                    <p className="text-[11px] font-medium text-white/90 group-hover:text-white transition-colors">{item.item}</p>
                                    <p className="text-[8px] text-white/30 font-medium tracking-widest uppercase mt-0.5">{item.tanggal ? new Date(item.tanggal).toLocaleDateString('en-GB') : ""}</p>
                                 </div>
                                 <span className="text-xs font-medium text-[#fca5a5] italic tracking-tighter leading-none">-Rp {(item.nominal || 0).toLocaleString('id-ID')}</span>
                              </button>
                           ))
                        ) : null}
                    </div>
                  </div>
                </div>

                {/* PARAMETER PERHITUNGAN */}
                <div className="mb-12 space-y-8">
                  <h4 className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40 italic border-b border-white/5 pb-4">Parameter Perhitungan</h4>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h5 className="text-[10px] font-medium uppercase text-white/20 tracking-widest mb-2">Gaji Pokok / Bulan</h5>
                      <p className="text-md sm:text-lg font-medium text-white italic tracking-tighter">Rp {(selectedSalaryStat.gaji_pokok || 2500000).toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-medium uppercase text-white/20 tracking-widest mb-2">Uang Makan / Hari</h5>
                      <p className="text-md sm:text-lg font-medium text-white italic tracking-tighter">Rp {(selectedSalaryStat.uang_makan ?? 20000).toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-medium uppercase text-white/20 tracking-widest mb-2">Bonus Disiplin / Hari</h5>
                      <p className="text-md sm:text-lg font-medium text-white italic tracking-tighter">Rp {(selectedSalaryStat.bonus_disiplin ?? 5000).toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-medium uppercase text-white/20 tracking-widest mb-2">Hari Kerja</h5>
                      <p className="text-md sm:text-lg font-medium text-white italic tracking-tighter">{selectedSalaryStat.hari_kerja || 28} Hari</p>
                      <p className="text-[8px] font-medium text-emerald-400/80 uppercase tracking-wider mt-1.5 leading-normal max-w-[120px]">
                        Rumus: {(() => {
                          const isPKL = (selectedSalaryStat.divisi || selectedSalaryStat.Divisi || '').toUpperCase().includes('PKL');
                          const jatah = isPKL ? 4 : 3;
                          let daysInMonth = 30;
                          const periodStr = selectedSalaryStat.month || selectedSalaryStat.periode || selectedSalaryStat.periode_label || '';
                          const parts = periodStr.split('-');
                          if (parts.length >= 2) {
                            const y = parseInt(parts[0], 10);
                            const m = parseInt(parts[1], 10);
                            if (!isNaN(y) && !isNaN(m)) {
                              daysInMonth = new Date(y, m, 0).getDate();
                            }
                          }
                          return `${daysInMonth} Hari - ${jatah} Hari Jatah Libur`;
                        })()}
                      </p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-medium uppercase text-amber-400/40 tracking-widest mb-2">Hari Izin</h5>
                      <p className="text-md sm:text-lg font-medium text-amber-400 italic tracking-tighter">{selectedSalaryStat.hariIzinCount || 0} Hari</p>
                    </div>
                  </div>

                  <div className="bg-white/5 p-6 rounded-[32px] border border-white/5">
                    <h5 className="text-[10px] font-medium uppercase text-white/20 tracking-widest mb-3 text-center">Cara Hitung Gaji Harian</h5>
                    <p className="text-md sm:text-lg font-medium text-white text-center italic tracking-tighter">
                       Rp {(selectedSalaryStat.gaji_pokok || 2500000).toLocaleString('id-ID')} / {selectedSalaryStat.hari_kerja || 28} = <span className="text-emerald-400">Rp {displayGajiHarian.toLocaleString('id-ID')}</span>
                    </p>
                  </div>
                </div>

                {/* NILAI POINT OMSET */}
                <div className="mb-12 space-y-4">
                   <div className="flex items-center gap-2 mb-4">
                      <TrendingUp size={14} className="text-emerald-400" />
                      <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-400 italic">Nilai Point Omset</h4>
                   </div>
                   
                   <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white/5 p-4 rounded-2xl flex flex-col items-center border border-white/5">
                         <span className="text-[8px] font-medium text-white/20 mb-2 uppercase">1 - 10</span>
                         <span className="text-xs font-medium text-white italic tracking-tighter">Rp 5rb/Pt</span>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl flex flex-col items-center border border-white/5">
                         <span className="text-[8px] font-medium text-white/20 mb-2 uppercase">11 - 20</span>
                         <span className="text-xs font-medium text-white italic tracking-tighter">Rp 10rb/Pt</span>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl flex flex-col items-center border border-white/5">
                         <span className="text-[8px] font-medium text-white/20 mb-2 uppercase tracking-widest">&gt; 20 PT</span>
                         <span className="text-xs font-medium text-white italic tracking-tighter">Rp 15rb/Pt 🚀</span>
                      </div>
                   </div>
                   <p className="text-[8px] text-white/20 text-center font-medium tracking-widest uppercase mt-4 italic">1 point didapatkan dari omset kelipatan Rp 500.000/hari</p>
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-6 space-y-4">
                   <div 
                      onClick={(e) => {
                          e.stopPropagation();
                          setTransferInput({ empEmail: selectedSalaryStat.email, month: selectedSalaryStat.month || Array.from(filterMonths)[0] });
                      }}
                      className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] space-y-2 hover:bg-emerald-500/20 transition-all cursor-pointer group"
                   >
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-medium text-emerald-400 group-hover:text-emerald-300 uppercase tracking-widest transition-colors italic">Tambah Bukti Transfer</span>
                           <ChevronRight size={16} className="text-emerald-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <p className="text-[8px] text-white/20 uppercase font-medium tracking-widest mb-1 italic">Total Transferred: Rp {selectedSalaryStat.total_transferred?.toLocaleString('id-ID') || 0}</p>
                   </div>

                   <button 
                     onClick={() => setSelectedSalaryStat(null)}
                     className="w-full py-4 text-xs font-medium uppercase tracking-[0.2em] text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-[20px] border border-white/10 duration-150 shadow-lg cursor-pointer animate-in fade-in"
                   >
                     Tutup Rincian Gaji
                   </button>
                </div>
                    </>
                  );
                })()}
             </motion.div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* POINT DETAILS OVERLAY MODAL */}
      <AnimatePresence>
        {showPointDetails && selectedSalaryStat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-transparent"
            onClick={() => setShowPointDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-lg bg-white/[0.03] backdrop-blur-3xl rounded-[32px] p-6 shadow-[0_30px_70px_rgba(0,0,0,0.9)] border border-white/10 relative text-left max-h-[90vh] overflow-y-auto no-scrollbar scroll-smooth"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                  <h3 className="text-md font-medium text-white uppercase tracking-tight">Rincian Point Omset Harian</h3>
                </div>
                <button
                  onClick={() => setShowPointDetails(false)}
                  className="p-1 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Employee Meta Info */}
              <div className="bg-white/[0.03] p-4 rounded-2xl mb-6 border border-white/5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[12px] font-medium text-white uppercase tracking-tight">{selectedSalaryStat.nama}</p>
                    <p className="text-[8px] text-white/30 font-medium uppercase tracking-widest mt-0.5">{selectedSalaryStat.jabatan || selectedSalaryStat.divisi || 'KARYAWAN'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-mono font-medium text-emerald-400 uppercase tracking-tight">
                      {selectedSalaryStat.periode_label ? getMonthLabel(selectedSalaryStat.periode_label) : ''}
                    </p>
                    <p className="text-[8px] text-white/30 font-medium uppercase tracking-widest mt-0.5">PERIODE</p>
                  </div>
                </div>
              </div>

              {/* Table / Breakdown list */}
              <div className="max-h-[250px] overflow-y-auto space-y-2 mb-6 scrollbar-thin scrollbar-thumb-white/10 pr-1">
                {(() => {
                  const hasImportKomisi = Array.isArray(selectedSalaryStat.import_komisi) && selectedSalaryStat.import_komisi.length > 0;
                  const hasPointList = Array.isArray(selectedSalaryStat.point_list) && selectedSalaryStat.point_list.length > 0;

                  if (hasImportKomisi) {
                    const sortedList = [...selectedSalaryStat.import_komisi].sort((a: any, b: any) => {
                      const da = a.dateKey || '';
                      const db = b.dateKey || '';
                      return da.localeCompare(db);
                    });

                    return (
                      <>
                        {/* Headers */}
                        <div className="grid grid-cols-3 text-center text-[8px] font-medium uppercase tracking-widest text-white/20 pb-2 border-b border-white/5 px-2">
                          <span className="text-left py-0.5">Tanggal</span>
                          <span className="py-0.5">Omset Harian</span>
                          <span className="text-right py-0.5">Nilai Point</span>
                        </div>

                        {sortedList.map((item: any, idx: number) => (
                          <div
                            key={`komisi-${idx}`}
                            className="grid grid-cols-3 items-center text-center bg-white/[0.02] border border-white/5 rounded-xl p-3 hover:bg-white/[0.05] transition-all"
                          >
                            <span className="text-[11px] font-medium text-white/80 text-left">
                              {formatIndoDate(item.dateKey || item.tanggal)}
                            </span>
                            <span className="text-[11px] font-mono text-white/60">
                              Rp {(item.omset || 0).toLocaleString('id-ID')}
                            </span>
                            <span className="text-[11px] font-medium text-emerald-400 text-right italic font-medium">
                              {item.point || 0} Pt
                            </span>
                          </div>
                        ))}
                      </>
                    );
                  } else if (hasPointList) {
                    const sortedList = [...selectedSalaryStat.point_list].sort((a: any, b: any) => {
                      const da = a.tanggal ? new Date(a.tanggal).getTime() : 0;
                      const db = b.tanggal ? new Date(b.tanggal).getTime() : 0;
                      return da - db;
                    });

                    return (
                      <>
                        {/* Headers */}
                        <div className="grid grid-cols-3 text-center text-[8px] font-medium uppercase tracking-widest text-white/20 pb-2 border-b border-white/5 px-2">
                          <span className="text-left py-0.5">Tanggal</span>
                          <span className="py-0.5">Keterangan / Sumber</span>
                          <span className="text-right py-0.5">Nilai Point</span>
                        </div>

                        {sortedList.map((item: any, idx: number) => (
                          <div
                            key={`point-${idx}`}
                            className="grid grid-cols-3 items-center text-center bg-white/[0.02] border border-white/5 rounded-xl p-3 hover:bg-white/[0.05] transition-all"
                          >
                            <span className="text-[11px] font-medium text-white/80 text-left">
                              {formatIndoDate(item.tanggal)}
                            </span>
                            <span className="text-[11px] font-medium text-white/60">
                              {item.item || "Input Poin"}
                            </span>
                            <span className="text-[11px] font-medium text-emerald-400 text-right italic font-medium">
                              {item.point || 0} Pt
                            </span>
                          </div>
                        ))}
                      </>
                    );
                  } else {
                    return (
                      <>
                        {/* Headers */}
                        <div className="grid grid-cols-3 text-center text-[8px] font-medium uppercase tracking-widest text-white/20 pb-2 border-b border-white/5 px-2">
                          <span className="text-left py-0.5">Tanggal</span>
                          <span className="py-0.5">Keterangan</span>
                          <span className="text-right py-0.5">Nilai Point</span>
                        </div>

                        <div className="grid grid-cols-3 items-center text-center bg-white/[0.02] border border-white/5 rounded-xl p-3 hover:bg-white/[0.05] transition-all">
                          <span className="text-[11px] font-medium text-white/80 text-left">
                            Bulan ini
                          </span>
                          <span className="text-[11px] font-medium text-white/60 text-center">
                            Akumulasi Poin / Input Manual
                          </span>
                          <span className="text-[11px] font-medium text-emerald-400 text-right italic font-medium">
                            {selectedSalaryStat.total_point || 0} Pt
                          </span>
                        </div>
                      </>
                    );
                  }
                })()}
              </div>

              {/* Aturan Point */}
              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 mb-6">
                <span className="text-[8px] font-medium text-emerald-400 uppercase tracking-widest block mb-2">ATURAN NILAI POINT OMSET:</span>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-white/60 font-medium">
                  <div className="border-r border-white/5 pr-1">
                    <span className="block text-white/40 text-[8px] font-medium uppercase">1 - 10 PT</span>
                    <span className="font-medium text-emerald-400">Rp 5.000 / Pt</span>
                  </div>
                  <div className="border-r border-white/5 px-1">
                    <span className="block text-white/40 text-[8px] font-medium uppercase">11 - 20 PT</span>
                    <span className="font-medium text-emerald-400">Rp 10.000 / Pt</span>
                  </div>
                  <div className="pl-1">
                    <span className="block text-white/40 text-[8px] font-medium uppercase">&gt; 20 PT</span>
                    <span className="font-medium text-emerald-400">Rp 15.000 / Pt</span>
                  </div>
                </div>
              </div>

              {/* Summary Calculations */}
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 space-y-2 mb-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40 font-medium uppercase text-[9px]">Total Point Terkumpul:</span>
                  <span className="text-white font-mono font-medium">{selectedSalaryStat.total_point || 0} Point</span>
                </div>
                {selectedSalaryStat.total_point > 0 && (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/40 font-medium uppercase text-[9px]">Nilai Bracket Rate:</span>
                      <span className="text-white font-mono font-medium">
                        Rp {((selectedSalaryStat.point_rp || 0) / (selectedSalaryStat.total_point || 1)).toLocaleString('id-ID')} / Pt
                      </span>
                    </div>
                    <div className="border-t border-white/5 my-2 pt-2 flex justify-between items-center">
                      <span className="text-emerald-400 font-medium uppercase text-[10px] tracking-tight">Kalkulasi:</span>
                      <span className="text-md font-medium text-emerald-400 font-medium">
                        {selectedSalaryStat.total_point} Pt × Rp {((selectedSalaryStat.point_rp || 0) / (selectedSalaryStat.total_point || 1)).toLocaleString('id-ID')} = Rp {(selectedSalaryStat.point_rp || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowPointDetails(false)}
                className="w-full py-4 text-xs font-medium uppercase tracking-[0.2em] text-white bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg transition-all rounded-2xl border border-emerald-500/10 active:scale-95 duration-150"
              >
                Tutup & Kembali ke Gaji
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* COMMISSION DETAILS OVERLAY MODAL */}
      <AnimatePresence>
        {showCommissionDetails && selectedSalaryStat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-transparent"
            onClick={() => setShowCommissionDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-lg bg-[#0e2723]/95 backdrop-blur-3xl rounded-[32px] border border-emerald-500/20 relative text-left h-[90vh] max-h-[800px] flex flex-col text-white shadow-[0_30px_70px_rgba(0,0,0,0.9)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background gradient decor */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 blur-[100px] -ml-32 -mb-32 pointer-events-none" />

              {/* Header - Non Scrollable with Integrated Tab Switcher */}
              <div className="p-6 pb-4 border-b border-white/5 relative z-10 shrink-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-md font-medium text-white uppercase tracking-tight">Rincian Komisi</h3>
                  </div>
                  <button
                    onClick={() => setShowCommissionDetails(false)}
                    className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tab Switcher - Pill design */}
                <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-2xl">
                  <button
                    onClick={() => setCommissionTab('treatment')}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${
                      commissionTab === 'treatment'
                        ? 'bg-[#0e4b3e] text-emerald-400 border border-emerald-500/20 shadow-md'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Treatment
                  </button>
                  <button
                    onClick={() => setCommissionTab('produk')}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${
                      commissionTab === 'produk'
                        ? 'bg-[#0e4b3e] text-emerald-400 border border-emerald-500/20 shadow-md'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Produk
                  </button>
                  <button
                    onClick={() => setCommissionTab('tambahan')}
                    className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${
                      commissionTab === 'tambahan'
                        ? 'bg-[#0e4b3e] text-emerald-400 border border-emerald-500/20 shadow-md'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Tambahan
                  </button>
                </div>
              </div>

              {/* Scrollable Body Container */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 relative z-10">
                {commissionTab === 'treatment' && (
                  <>
                    {/* Tab Treatment Content */}
                    {(() => {
                      const targetVal = selectedSalaryStat.target_layanan_val || 0;
                      const omsetLayanan = selectedSalaryStat.total_omset_layanan || 0;
                      const pct = targetVal > 0 ? Math.round((omsetLayanan / targetVal) * 100) : 100;
                      const hasReached = selectedSalaryStat.has_reached_target || false;
                      const isStylist = selectedSalaryStat.is_stylist || false;
                      const isTherapist = selectedSalaryStat.is_therapist || false;

                      return (
                        <div className="bg-white/[0.03] p-5 rounded-[24px] border border-white/5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-medium uppercase tracking-wider text-white/90">Target Omset Treatment</h4>
                              <p className="text-[10px] text-white/40 font-medium mt-1">Status Pencapaian</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasReached ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/10">
                                  Mencapai Target 🚀
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/10">
                                  Berjalan ⏳
                                </span>
                              )}
                              <span className="text-sm font-medium text-white font-mono">{pct}%</span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, pct)}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className="h-full rounded-full bg-emerald-400"
                            />
                          </div>

                          {/* Details Row */}
                          <div className="space-y-2 pt-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-white/50 font-medium">Omset Treatment Saat Ini:</span>
                              <span className="font-mono font-medium text-white">Rp {omsetLayanan.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/50 font-medium">Target Minimal:</span>
                              <span className="font-mono font-medium text-white">Rp {targetVal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/50 font-medium">Poin Produk Terjual:</span>
                              <span className="font-mono font-medium text-white">
                                {selectedSalaryStat.total_products_sold || 0} poin
                              </span>
                            </div>
                          </div>

                          {/* Syarat Aturan Text */}
                          <div className="text-[10px] text-white/40 italic font-medium pt-2 border-t border-white/5">
                            {selectedSalaryStat.is_pkl ? (
                              "* Status PKL: Target omset treatment adalah Rp 0 (tidak mendapatkan komisi)."
                            ) : (
                              `* Aturan Target: Jika total poin produk ≥ 10 poin, target omset otomatis turun menjadi maksimal Rp 6.000.000. Jika di bawah 10 poin, target normal: Rp ${(selectedSalaryStat.target_omset_master || 0).toLocaleString('id-ID')}.`
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Komisi Lainnya (Manual / Sheet) */}
                    {(selectedSalaryStat.komisi_list || []).length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 italic">Komisi Lainnya</h4>
                        <div className="bg-white/[0.03] p-4 rounded-[24px] border border-white/5 space-y-2.5">
                          {(selectedSalaryStat.komisi_list || []).map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium text-white">{item.item}</span>
                                {item.tanggal && (
                                  <span className="text-[8px] text-white/30 font-medium uppercase tracking-wider mt-0.5">
                                    {formatIndoDate(item.tanggal)}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-medium text-white font-mono">
                                +Rp {(item.nominal || 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}



                    {/* Rincian Komisi Harian - Table Format */}
                    <div className="space-y-3">
                      {(() => {
                        const list = selectedSalaryStat.import_komisi || [];
                        const daysInMonth = (() => {
                          let dim = 30;
                          const periodStr = selectedSalaryStat.month || selectedSalaryStat.periode || selectedSalaryStat.periode_label || '';
                          const parts = periodStr.split('-');
                          if (parts.length >= 2) {
                            const y = parseInt(parts[0], 10);
                            const m = parseInt(parts[1], 10);
                            if (!isNaN(y) && !isNaN(m)) {
                              dim = new Date(y, m, 0).getDate();
                            }
                          }
                          return dim;
                        })();

                        if (loadingDetailPayload && list.length === 0) {
                          return (
                            <div className="text-center py-8 text-white/50 text-xs font-medium flex flex-col items-center gap-2">
                              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              <span>Memuat rincian komisi harian...</span>
                            </div>
                          );
                        }
                        if (list.length === 0) {
                          return (
                            <div className="text-center py-8 text-white/30 text-xs font-medium bg-white/[0.01] border border-white/5 rounded-3xl">
                              Tidak ada data rincian komisi harian.
                            </div>
                          );
                        }

                        const sortedList = [...list].sort((a: any, b: any) => {
                          const da = a.dateKey || '';
                          const db = b.dateKey || '';
                          return da.localeCompare(db);
                        });

                        return (
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 italic">
                              DAFTAR TREATMENT TANGGAL 1-{daysInMonth}
                            </h4>
                            
                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden p-4">
                              <div className="grid grid-cols-3 text-[10px] font-medium uppercase tracking-wider text-white/30 pb-2.5 border-b border-white/5 px-2 font-mono">
                                <span>TANGGAL</span>
                                <span className="text-center">OMSET</span>
                                <span className="text-right">KOMISI</span>
                              </div>
                              
                              <div className="divide-y divide-white/[0.03] max-h-[480px] overflow-y-auto no-scrollbar pr-1 mt-1">
                                {sortedList.map((item: any, idx: number) => {
                                  const formattedDate = formatIndoDateShort(item.dateKey || item.tanggal);
                                  return (
                                    <div
                                      key={`treatment-day-${idx}`}
                                      className="grid grid-cols-3 items-center py-3 px-2 hover:bg-white/[0.02] transition-all"
                                    >
                                      <span className="text-xs font-semibold text-white/95">{formattedDate}</span>
                                      <span className="text-xs font-mono text-center text-white/60">
                                        Rp {(item.net_layanan || 0).toLocaleString('id-ID')}
                                      </span>
                                      <span className="text-xs font-mono text-right text-emerald-400 font-semibold">
                                        Rp {(item.komisi_layanan || 0).toLocaleString('id-ID')}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                {commissionTab === 'produk' && (
                  <>
                    {/* Tab Penjualan Produk Content */}
                    <div className="bg-white/[0.03] p-5 rounded-[24px] border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-medium uppercase tracking-wider text-white/90">Poin Produk Terjual</h4>
                          <p className="text-[10px] text-white/40 font-medium mt-1">Total Poin yang Dikumpulkan</p>
                        </div>
                        <span className="text-xl font-bold text-emerald-400 font-mono">
                          {selectedSalaryStat.total_products_sold || 0} Poin
                        </span>
                      </div>
                      <div className="text-[10px] text-white/40 italic font-medium pt-2 border-t border-white/5">
                        * Tiap produk memiliki nilai poin tertentu. Jika total poin ≥ 10, target omset treatment turun menjadi maksimal Rp 6.000.000.
                      </div>
                    </div>

                    {/* Product Sales Lists */}
                    {(() => {
                      const localParseToDateKey = (dateStr: any): string => {
                        if (!dateStr) return '';
                        const trimDate = String(dateStr).trim();
                        if (/^\d{4}-\d{2}-\d{2}/.test(trimDate)) return trimDate.substring(0, 10);
                        return trimDate;
                      };

                      const productGrouped = (() => {
                        const groups: { [date: string]: { date: string; dateKey: string; totalPoints: number; items: any[] } } = {};
                        const list = selectedSalaryStat.transaksi_prod || [];
                        const ptsList = selectedSalaryStat.point_produk || [];
                        
                        list.forEach((item: any) => {
                          const rawDate = item.tanggal || item.dateKey || '';
                          const dateKey = localParseToDateKey(rawDate);
                          if (!dateKey) return;
                          
                          const info = getProductPointAndKomisi(item, ptsList);
                          const qty = Number(item.jumlah || item.qty || 1);
                          const pts = info.point * qty;
                          const price = Number(item.harga_item || item.harga || 0);
                          const komisiVal = info.komisi * qty;
                          
                          if (!groups[dateKey]) {
                            groups[dateKey] = {
                              date: item.tanggal || dateKey,
                              dateKey: dateKey,
                              totalPoints: 0,
                              items: []
                            };
                          }
                          
                          groups[dateKey].totalPoints += pts;
                          groups[dateKey].items.push({
                            name: item.item || item.produk || "Produk",
                            qty: qty,
                            price: price,
                            points: pts,
                            komisi: komisiVal
                          });
                        });
                        
                        return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
                      })();

                      return (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 italic">
                            PENJUALAN PRODUK
                          </h4>
                          
                          <div className="space-y-3 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
                            {productGrouped.length === 0 ? (
                              <div className="text-center py-12 text-white/30 text-xs font-medium bg-white/[0.01] border border-white/5 rounded-3xl">
                                Tidak ada transaksi penjualan produk bulan ini.
                              </div>
                            ) : (
                              productGrouped.map((group, gIdx) => (
                                <div key={`group-${gIdx}`} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 space-y-3.5">
                                  {/* Header */}
                                  <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
                                    <span className="text-xs font-semibold text-white/95">{formatIndoDate(group.dateKey || group.date)}</span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                                      +{group.totalPoints} Poin
                                    </span>
                                  </div>
                                  
                                  {/* Items */}
                                  <div className="space-y-3.5">
                                    {group.items.map((it: any, iIdx: number) => (
                                      <div key={`it-${iIdx}`} className="flex justify-between items-start">
                                        <div className="space-y-1">
                                          <span className="text-xs font-semibold text-white/90 block">{it.name}</span>
                                          <span className="text-[10px] text-white/40 font-medium font-mono">
                                            {it.qty} pcs @ Rp {it.price.toLocaleString('id-ID')}
                                          </span>
                                        </div>
                                        <div className="text-right space-y-1">
                                          <span className="text-xs font-mono font-semibold text-white block">
                                            Rp {it.komisi.toLocaleString('id-ID')}
                                          </span>
                                          <span className="text-[10px] text-emerald-400 font-medium font-mono block">
                                            +{it.points} Pt
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Referensi Poin Produk Card */}
                    {(() => {
                      const ptsList = selectedSalaryStat.point_produk || [];
                      const listToUse = ptsList.length > 0 ? ptsList : DEFAULT_POINT_PRODUK;
                      return (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 italic">
                            REFERENSI POIN & KOMISI PRODUK
                          </h4>
                          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-4 space-y-2">
                            <div className="grid grid-cols-3 text-[9px] font-medium uppercase tracking-wider text-white/30 pb-2 border-b border-white/5 px-1 font-mono">
                              <span>NAMA PRODUK</span>
                              <span className="text-center">POIN</span>
                              <span className="text-right">KOMISI</span>
                            </div>
                            <div className="divide-y divide-white/[0.03] max-h-[220px] overflow-y-auto no-scrollbar pr-1">
                              {listToUse.map((p: any, idx: number) => (
                                <div key={`ref-prod-${idx}`} className="grid grid-cols-3 items-center py-2.5 px-1 hover:bg-white/[0.01] transition-all">
                                  <span className="text-xs font-semibold text-white/80">{p.produk}</span>
                                  <span className="text-xs font-mono text-center text-emerald-400 font-semibold">{p.point} Pt</span>
                                  <span className="text-xs font-mono text-right text-white/60">Rp {(p.komisi || 0).toLocaleString('id-ID')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {commissionTab === 'tambahan' && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 italic">
                      KOMISI TAMBAHAN
                    </h4>
                    
                    <div className="space-y-3 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
                      {(selectedSalaryStat.komisi_tambahan_list || []).length === 0 ? (
                        <div className="text-center py-12 text-white/30 text-xs font-medium bg-white/[0.01] border border-white/5 rounded-3xl">
                          Tidak ada data komisi tambahan bulan ini.
                        </div>
                      ) : (
                        (selectedSalaryStat.komisi_tambahan_list || []).map((item: any, idx: number) => (
                          <div
                            key={`tambahan-${idx}`}
                            className="bg-white/[0.02] border border-white/5 rounded-[24px] p-5 flex justify-between items-center hover:bg-white/[0.03] transition-all"
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-white/95">
                                {item.item || item.keterangan || "Komisi Tambahan"}
                              </p>
                              <p className="text-[10px] text-white/40 font-medium">
                                {formatIndoDate(item.tanggal)}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-emerald-400 font-mono">
                              +Rp {(item.nominal || 0).toLocaleString('id-ID')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky/Freeze Footer Summary Box */}
              <div className="p-6 border-t border-white/10 bg-black/45 rounded-b-[32px] space-y-4 relative z-20">
                <div className="space-y-3">
                  {/* Baris 1: Total Komisi Treatment */}
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 font-medium">Total Komisi Treatment</span>
                      {selectedSalaryStat.has_reached_target ? (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/10">
                          Cair
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-medium bg-red-500/20 text-red-400 border border-red-500/10">
                          Tidak Cair
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-medium text-white">
                      Rp {Math.max(selectedSalaryStat.total_komisi_layanan_raw || 0, selectedSalaryStat.komisi_layanan || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Baris 2: Total Komisi Produk */}
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 font-medium">Total Komisi Produk</span>
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/10">
                        Selalu Cair
                      </span>
                    </div>
                    <span className="font-mono font-medium text-white">
                      Rp {(selectedSalaryStat.komisi_produk || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Baris 2b: Total Point Produk */}
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 font-medium">Total Point Produk</span>
                    </div>
                    <span className="font-mono font-medium text-emerald-400">
                      {(selectedSalaryStat.total_products_sold || 0)} Pt
                    </span>
                  </div>

                  {/* Baris 3: Total Komisi Tambahan */}
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 font-medium">Total Komisi Tambahan</span>
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/10">
                        Selalu Cair
                      </span>
                    </div>
                    <span className="font-mono font-medium text-white">
                      Rp {(selectedSalaryStat.komisi_tambahan || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Baris 3: Gaji Komisi Cair */}
                  <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                    <span className="text-emerald-400 font-medium uppercase text-[10px] tracking-wider">Gaji Komisi Cair:</span>
                    <span className="text-lg font-medium text-emerald-400 font-mono">
                      Rp {(selectedSalaryStat.total_komisi || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT TIME MODAL */}
      <AnimatePresence>
        {editingEntry && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[135] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setEditingEntry(null)}
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="w-full max-w-sm bg-white/[0.03] backdrop-blur-3xl rounded-[32px] p-8 shadow-2xl border border-white/5"
               onClick={e => e.stopPropagation()}
             >
                <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-8 opacity-50" />
                <h3 className="text-white font-medium uppercase text-[10px] mb-6 tracking-[0.3em] text-center border-b border-white/5 pb-4">Update Jam {editingEntry.jenis}</h3>
                
                <div className="flex flex-col gap-6">
                   {editingEntry.current === '-:-' && !editingEntry.existingCabang && (
                       <div className="flex flex-col gap-3">
                          <label className="text-[8px] font-medium text-emerald-400 uppercase tracking-[0.3em] ml-1">Pilih Cabang</label>
                          <select 
                            value={selectedEditCabang}
                            onChange={(e) => setSelectedEditCabang(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium text-white outline-none focus:border-emerald-500/50 transition-all"
                          >
                             <option value="" disabled>-- Pilih Cabang --</option>
                             {availableCabang.map(c => (
                               <option key={c} value={c} className="bg-zinc-900">{c}</option>
                             ))}
                          </select>
                       </div>
                    )}
                   <div className="flex flex-col gap-3">
                      <label className="text-[8px] font-medium text-emerald-400 uppercase tracking-[0.3em] ml-1">Jam Baru (24h format)</label>
                      <input 
                        type="time" 
                        value={newTimeVal}
                        onChange={(e) => setNewTimeVal(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xl font-mono text-white outline-none focus:border-emerald-500/50 transition-all text-center"
                      />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3 mt-2">
                      <button 
                        onClick={() => setEditingEntry(null)}
                        className="py-4 text-[9px] font-medium uppercase tracking-widest text-white/30 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={handleTimeUpdate}
                        disabled={isSyncing}
                        className="py-4 text-[9px] font-medium uppercase tracking-widest bg-emerald-500 text-zinc-950 rounded-2xl shadow-xl shadow-emerald-500/20 disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {isSyncing ? "Saving..." : "Simpan"}
                      </button>
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* TRANSFER INPUT MODAL */}
      <AnimatePresence>
        {transferInput && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
            onClick={() => setTransferInput(null)}
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="w-full max-w-xs bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[32px] p-8 shadow-2xl"
               onClick={e => e.stopPropagation()}
             >
                <div className="flex items-center gap-3 mb-8">
                   <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <Wallet size={18} className="text-emerald-400" />
                   </div>
                   <div>
                      <h3 className="text-white font-medium uppercase text-[10px] tracking-widest">Input Transfer</h3>
                      <p className="text-[8px] text-white/30 uppercase font-medium">{transferInput?.month}</p>
                   </div>
                </div>
                
                <div className="space-y-6">
                   {(() => {
                      const sisaGaji = dashboardData.gajiStats.find(e => e.email === transferInput?.empEmail)?.sisa_gaji || 0;
                      return (
                        <div 
                           className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl cursor-pointer hover:bg-emerald-500/20 active:scale-95 transition-all"
                           onClick={() => {
                              setTransferAmount(sisaGaji.toString());
                           }}
                        >
                           <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-widest">Sisa Gaji (Klik Kopas)</span>
                           <span className="text-sm font-bold text-emerald-400">Rp {sisaGaji.toLocaleString('id-ID')}</span>
                        </div>
                      );
                   })()}
                   <div className="space-y-2">
                       <label className="text-[8px] font-medium text-white/30 uppercase tracking-[0.2em] ml-1">Nominal (Rp)</label>
                       <input 
                         type="number"
                         placeholder="0"
                         value={transferAmount}
                         onChange={(e) => setTransferAmount(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xl font-medium text-white outline-none focus:border-emerald-500/50 transition-all text-center"
                       />
                   </div>
                   
                   <div className="space-y-2">
                       <label className="text-[8px] font-medium text-white/30 uppercase tracking-[0.2em] ml-1">Tanggal Transfer</label>
                       <input 
                         type="date"
                         value={transferDate}
                         onChange={(e) => setTransferDate(e.target.value)}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium text-white outline-none focus:border-emerald-500/50 transition-all text-center"
                       />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3 mt-4">
                      <button 
                        onClick={() => setTransferInput(null)}
                        className="py-4 text-[9px] font-medium uppercase tracking-widest text-white/30 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                      >
                        Batal
                      </button>
                      <button 
                         onClick={addTransfer} disabled={isSubmittingTransfer}
                         className="py-4 text-[9px] font-medium uppercase tracking-widest bg-emerald-500 text-zinc-950 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isSubmittingTransfer ? 'Menyimpan...' : 'Simpan'}
                      </button>
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KASBON MODAL */}
      <AnimatePresence>
        {kasbonDialog.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setKasbonDialog(prev => ({ ...prev, show: false }))}
          >
             <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="w-full max-w-sm !bg-white/[0.03] !backdrop-blur-3xl !rounded-[24px] p-6 shadow-2xl border border-white/5"
               onClick={e => e.stopPropagation()}
             >
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6 opacity-50" />
                <h3 className="text-white font-medium uppercase text-[8px] mb-4 tracking-[0.3em] text-center border-b border-white/10 pb-3 font-medium italic">
                   {kasbonDialog.isEdit ? "Edit Kasbon" : "Tambah Kasbon Baru"}
                </h3>
                
                <div className="flex flex-col gap-4">
                   <div className="flex flex-col gap-1.5">
                      <label className="text-[7px] font-medium text-emerald-400 uppercase tracking-[0.3em] ml-1">Keterangan / Uraian</label>
                      <input 
                        type="text" 
                        value={kasbonDialog.data.item}
                        onChange={(e) => setKasbonDialog(prev => ({ ...prev, data: { ...prev.data, item: e.target.value } }))}
                        placeholder="Contoh: Kasbon perbaikan motor"
                        className="bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-xs font-medium text-white outline-none focus:border-emerald-500/50 transition-all font-medium italic"
                      />
                   </div>

                   <div className="flex flex-col gap-1.5">
                      <label className="text-[7px] font-medium text-emerald-400 uppercase tracking-[0.3em] ml-1">Nominal (Rp)</label>
                      <input 
                        type="number" 
                        value={kasbonDialog.data.nominal}
                        onChange={(e) => setKasbonDialog(prev => ({ ...prev, data: { ...prev.data, nominal: e.target.value } }))}
                        placeholder="Masukkan nominal"
                        className="bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-sm font-mono text-white outline-none focus:border-emerald-500/50 transition-all font-medium italic"
                      />
                   </div>

                   <div className="flex flex-col gap-1.5">
                      <label className="text-[7px] font-medium text-emerald-400 uppercase tracking-[0.3em] ml-1">Tanggal</label>
                      <input 
                        type="date" 
                        value={kasbonDialog.data.tanggal}
                        onChange={(e) => setKasbonDialog(prev => ({ ...prev, data: { ...prev.data, tanggal: e.target.value } }))}
                        className="bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-xs font-medium text-white outline-none focus:border-emerald-500/50 transition-all font-medium italic"
                      />
                   </div>

                   <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setKasbonDialog(prev => ({ ...prev, show: false }))}
                          className="flex-1 py-3 text-[9px] font-medium uppercase tracking-widest text-white/40 hover:text-white transition-all bg-white/5 rounded-xl border border-white/10 font-medium italic"
                        >
                          Batal
                        </button>
                        <button 
                          onClick={handleKasbonSubmit}
                          disabled={isSubmittingKasbon}
                          className="flex-[2] py-3 text-[9px] font-medium uppercase tracking-widest text-zinc-900 bg-emerald-400 hover:bg-emerald-300 transition-all rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 font-medium italic"
                        >
                          {isSubmittingKasbon ? "Proses..." : (kasbonDialog.isEdit ? "Update" : "Simpan")}
                        </button>
                      </div>
                      
                      {kasbonDialog.isEdit && (
                        <button 
                          onClick={() => {
                             if(confirm("Hapus kasbon ini?")) {
                               handleKasbonDelete(kasbonDialog.data.oldData);
                               setKasbonDialog(prev => ({ ...prev, show: false }));
                             }
                          }}
                          className="w-full py-2.5 text-[8px] font-medium uppercase tracking-[0.2em] text-red-500 hover:text-red-400 transition-all border border-red-500/20 rounded-xl mt-1 font-medium italic bg-red-500/5"
                        >
                          Hapus Kasbon Ini
                        </button>
                      )}
                   </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
