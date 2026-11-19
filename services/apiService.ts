
import { Task, SOPItem, MateriItem } from '../types';
import { SOP_DATA, MOCK_MATERI, MOCK_PESAN_MANAGER, MOCK_LOKASI, MOCK_TASKS } from '../constants';
import { safeSetItem, safeGetItem } from './storageHelper';

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycby7_TYAxQcEhY9qDb2MhtIWaigpzyG08FnYTuRvlzTLrn_H-2zNdDVqJljL403PxoBJOw/exec";
const BACKUP_GAS_URL = "https://script.google.com/macros/s/AKfycbzAv_xYB_2g1QTx7gPnQXwcd7QB1VclpWSIjtcXk9QTX_M65mnoxWZ2H_6AeGUBzN7l/exec";

const resolveBackendUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL;
  if (envUrl && String(envUrl).trim() !== "") return String(envUrl).trim();
  if (typeof window !== "undefined" && window.location && window.location.hostname === "app.flowsalon.id") {
    return "/absen/api/backend";
  }
  return DEFAULT_GAS_URL;
};

const GAS_URL: string = resolveBackendUrl();

const isConfigured = () => {
  return Boolean(GAS_URL && GAS_URL !== "" && (GAS_URL.startsWith("https://script.google.com") || GAS_URL.startsWith("/api/") || GAS_URL.startsWith("/absen/") || GAS_URL.startsWith("http")));
};

// Helper untuk fetch dengan timeout, error handling JSON, dan auto-fallback jika URL script uji coba belum di-set "Anyone"
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 35000, retries = 1, triedBackup = false): Promise<any> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      if (!triedBackup && url.includes(DEFAULT_GAS_URL)) {
        const fallbackUrl = url.replace(DEFAULT_GAS_URL, BACKUP_GAS_URL);
        return fetchWithTimeout(fallbackUrl, options, timeout, 1, true);
      }
      console.warn("Non-JSON response:", text);
      return { status: "error", message: "Server merespon dengan format yang salah (Mungkin error permission)." };
    }
  } catch (error: any) {
    clearTimeout(id);
    
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchWithTimeout(url, options, timeout, retries - 1, triedBackup);
    }

    if (!triedBackup && url.includes(DEFAULT_GAS_URL)) {
      const fallbackUrl = url.replace(DEFAULT_GAS_URL, BACKUP_GAS_URL);
      return fetchWithTimeout(fallbackUrl, options, timeout, 1, true);
    }

    if (error.name === 'AbortError') {
      return { status: "error", message: "Koneksi timeout (Server terlalu lama merespon)." };
    }
    return { status: "error", message: "Koneksi gagal." };
  }
};

export interface PendingAttendanceItem {
  id: string;
  nama: string;
  email: string;
  jenis: string;
  shift: string;
  cabang: string;
  lat: number;
  lng: number;
  accuracy: number;
  jarak: number;
  foto: string;
  statusLokasi: string;
  materi: string;
  timestamp: string;
  waktu: string;
  dateKey: string;
  isPendingOffline?: boolean;
}

const getLocalDateKey = (isoOrDateStr: string): string => {
  try {
    const d = new Date(isoOrDateStr);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  } catch (_) {}
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const mergeHistoryWithOutbox = (serverHistory: any[], outbox: PendingAttendanceItem[]): any[] => {
  if (!outbox || outbox.length === 0) return serverHistory;
  const merged = [...serverHistory];
  outbox.forEach((pending) => {
    const alreadyInServer = serverHistory.some((h: any) => {
      const hWaktu = String(h.waktu || h.Waktu || h.timestamp || h.Timestamp || "");
      const hJenis = String(h.jenis || h.Jenis || "").toLowerCase().trim();
      const hDateKey = getLocalDateKey(hWaktu);
      return hDateKey === pending.dateKey && hJenis === pending.jenis.toLowerCase().trim();
    });
    if (!alreadyInServer) {
      merged.unshift({
        waktu: pending.timestamp,
        timestamp: pending.timestamp,
        nama: pending.nama,
        email: pending.email,
        jenis: pending.jenis,
        shift: pending.shift,
        cabang: pending.cabang,
        status_lokasi: pending.statusLokasi,
        progress_materi: pending.materi,
        isPendingOffline: true,
      });
    }
  });
  return merged;
};

let isSyncingAbsenOutbox = false;

// Temp cache in memory to avoid repetitive long fetch logs
let attendanceHistoryCache: Record<string, any[]> = {};

export const api = {
  clearAttendanceCache: (email: string) => {
    if (email) {
      delete attendanceHistoryCache[email.toLowerCase().trim()];
    }
  },

  getAttendanceOutbox: (email: string): PendingAttendanceItem[] => {
    if (!email) return [];
    const key = `absen_outbox_${email.toLowerCase().trim()}`;
    try {
      const raw = safeGetItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  enqueueAttendanceOutbox: (data: any): PendingAttendanceItem => {
    const emailKey = (data.email || "").toLowerCase().trim();
    const storageKey = `absen_outbox_${emailKey}`;
    const timestamp = data.timestamp || new Date().toISOString();
    const dateKey = getLocalDateKey(timestamp);

    const newItem: PendingAttendanceItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nama: data.nama || "",
      email: data.email || "",
      jenis: data.jenis || "Masuk",
      shift: data.shift || "",
      cabang: data.cabang || "",
      lat: Number(data.lat || 0),
      lng: Number(data.lng || 0),
      accuracy: Number(data.accuracy || 0),
      jarak: Number(data.jarak || 0),
      foto: data.foto || "",
      statusLokasi: data.statusLokasi || "",
      materi: data.materi || "Materi Umum",
      timestamp,
      waktu: timestamp,
      dateKey,
      isPendingOffline: true,
    };

    const current = api.getAttendanceOutbox(emailKey);
    // Deduplicate by same dateKey & jenis so double clicks offline keep the earliest timestamp
    const existingIdx = current.findIndex(
      (item) =>
        item.dateKey === dateKey &&
        item.jenis.toLowerCase().trim() === newItem.jenis.toLowerCase().trim()
    );

    if (existingIdx !== -1) {
      newItem.timestamp = current[existingIdx].timestamp;
      newItem.waktu = current[existingIdx].waktu;
      current[existingIdx] = newItem;
    } else {
      current.push(newItem);
    }

    safeSetItem(storageKey, JSON.stringify(current));
    api.clearAttendanceCache(emailKey);
    return newItem;
  },

  syncAttendanceOutbox: async (email: string): Promise<{ syncedCount: number; remainingCount: number }> => {
    if (!email || !isConfigured()) return { syncedCount: 0, remainingCount: 0 };
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { syncedCount: 0, remainingCount: api.getAttendanceOutbox(email).length };
    }
    if (isSyncingAbsenOutbox) {
      return { syncedCount: 0, remainingCount: api.getAttendanceOutbox(email).length };
    }

    const emailKey = email.toLowerCase().trim();
    const storageKey = `absen_outbox_${emailKey}`;
    const outbox = api.getAttendanceOutbox(emailKey);
    if (outbox.length === 0) return { syncedCount: 0, remainingCount: 0 };

    isSyncingAbsenOutbox = true;
    let syncedCount = 0;
    const remaining: PendingAttendanceItem[] = [];

    try {
      for (const item of outbox) {
        try {
          const res = await fetchWithTimeout(
            GAS_URL,
            {
              method: "POST",
              body: JSON.stringify({
                nama: item.nama,
                email: item.email,
                jenis: item.jenis,
                shift: item.shift,
                cabang: item.cabang,
                lat: item.lat,
                lng: item.lng,
                accuracy: item.accuracy,
                jarak: item.jarak,
                foto: item.foto,
                statusLokasi: item.statusLokasi,
                materi: item.materi,
                timestamp: item.timestamp,
                type: "absen",
              }),
            },
            65000,
            0
          );

          if (res && res.status === "sukses") {
            syncedCount++;
          } else {
            remaining.push(item);
          }
        } catch (err) {
          remaining.push(item);
        }
      }

      safeSetItem(storageKey, JSON.stringify(remaining));
      if (syncedCount > 0) {
        api.clearAttendanceCache(emailKey);
      }
    } finally {
      isSyncingAbsenOutbox = false;
    }

    return { syncedCount, remainingCount: remaining.length };
  },

  getInitialData: async (email?: string) => {
    if (!isConfigured()) return { sop: SOP_DATA, materiList: [MOCK_MATERI], lastLog: null, pesanManager: MOCK_PESAN_MANAGER, tugasDef: MOCK_TASKS, lokasi: MOCK_LOKASI, tips: [] };
    
    const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
    const key = email ? email.toLowerCase().trim() : '';
    
    try {
      const data = await fetchWithTimeout(`${GAS_URL}?action=get_initial_data${emailParam}&cb=${Date.now()}`, {}, 50000, 2);
      
      if (data && data.status !== "error") {
         const parsedSop = (data.sop || []).map((item: any) => ({
          ...item,
          id: item.id || Math.random().toString(36).substr(2, 9),
          // Mapping variasi nama kolom untuk SOP
          title: item.judul || item.title || item.judul_sop || item.nama_sop || "Tanpa Judul",
          category: item.kategori || item.category || item.divisi || "Umum",
          steps: typeof item.langkah === 'string' ? item.langkah.split('\n') : (typeof item.steps === 'string' ? item.steps.split('\n') : (item.steps || [])),
          tips: item.tips || item.catatan || ""
        }));

        // Parse daftar materi dengan mapping yang lebih kuat
        const parsedMateriList = Array.isArray(data.materiList) ? data.materiList.map((m: any) => ({
          judul: m.judul || m.title || m.judul_materi || m.nama_materi || m.topik || "Materi Tanpa Judul",
          sub_judul: m.sub_judul || m.subjudul || m.subtitle || m.keterangan || "", 
          bab: m.bab || m.chapter || m.kategori || "Edukasi",
          isi: m.isi || m.content || m.isi_materi || m.konten || m.materi || ""
        })) : (data.materi ? [{
          judul: data.materi.judul,
          sub_judul: data.materi.sub_judul, 
          bab: data.materi.bab,
          isi: data.materi.isi
        }] : []);

        // Parse tugasDef untuk menangani Google Sheet tanpa header (dimana baris pertama data menjadi header)
        let parsedTugasDef = data.tugasDef || MOCK_TASKS;
        if (Array.isArray(data.tugasDef) && data.tugasDef.length > 0) {
          const firstRow = data.tugasDef[0];
          const hasStandardHeaders = 
            ('jabatan' in firstRow || 'role' in firstRow || 'Jabatan' in firstRow) && 
            ('jenis' in firstRow || 'tipe' in firstRow || 'Jenis' in firstRow) && 
            ('tugas' in firstRow || 'task' in firstRow || 'Tugas' in firstRow);

          if (!hasStandardHeaders) {
            const keys = Object.keys(firstRow);
            const originalKeys: string[] = [];
            
            const isTransformation = (a: string, b: string) => {
                const norm = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                return norm(a) === norm(b);
            };

            for (const k of keys) {
                if (!originalKeys.some(ok => isTransformation(ok, k))) {
                    originalKeys.push(k);
                }
            }
            
            if (originalKeys.length >= 3) {
              const reconstructed: any[] = [];
              reconstructed.push({
                jabatan: originalKeys[0],
                jenis: originalKeys[1],
                tugas: originalKeys[2]
              });
              data.tugasDef.forEach((row: any) => {
                reconstructed.push({
                  jabatan: row[originalKeys[0]],
                  jenis: row[originalKeys[1]],
                  tugas: row[originalKeys[2]]
                });
              });
              parsedTugasDef = reconstructed;
            }
          }
        }

        const result = { 
          ...data, 
          sop: parsedSop, 
          materiList: parsedMateriList,
          tugasDef: parsedTugasDef,
          lastLog: data.lastLog,
          isOfflineFallback: false
        };

        if (key) {
          try {
            safeSetItem(`flow_initial_data_cache_${key}`, JSON.stringify(result));
          } catch (e) {
            console.warn("Gagal menyimpan cache initial data:", e);
          }
        }

        return result;
      } else {
        console.warn("Fetch initial data notice:", data?.message || "Mengalihkan ke offline cache");
      }
    } catch (err) {
      console.warn("Fetch initial data fallback notice:", err);
    }

    // Attempt cache fallback
    if (key) {
      try {
        const cached = safeGetItem(`flow_initial_data_cache_${key}`);
        if (cached) {
          console.warn("Menggunakan data cache offline untuk getInitialData.");
          return {
            ...JSON.parse(cached),
            isOfflineFallback: true
          };
        }
      } catch (err) {
        console.warn("Gagal mengambil cache initial data:", err);
      }
    }

    // Default Fallback
    console.warn("Menggunakan data default (MOCK) karena kegagalan koneksi.");
    return { 
      sop: SOP_DATA, 
      materiList: [MOCK_MATERI], 
      lastLog: null, 
      pesanManager: MOCK_PESAN_MANAGER, 
      tugasDef: MOCK_TASKS, 
      lokasi: MOCK_LOKASI, 
      tips: [],
      isOfflineFallback: true,
      isDefaultFallback: true
    };
  },

  getAttendanceHistory: async (email: string, forceRefresh = false) => {
    if (!isConfigured()) return [];
    
    const key = email.toLowerCase().trim();
    const outbox = api.getAttendanceOutbox(key);

    if (!forceRefresh && attendanceHistoryCache[key]) {
      return mergeHistoryWithOutbox(attendanceHistoryCache[key], outbox);
    }
    
    try {
      const res = await fetchWithTimeout(`${GAS_URL}?action=get_history&email=${encodeURIComponent(email)}&cb=${Date.now()}`);
      if (res && res.status === "error") {
        console.error("History Fetch Error:", res.message);
      } else if (Array.isArray(res)) {
        attendanceHistoryCache[key] = res;
        try {
          safeSetItem(`flow_history_cache_${key}`, JSON.stringify(res));
        } catch (e) {
          console.warn("Gagal menyimpan cache riwayat absen:", e);
        }
        // Clean up outbox items that are already confirmed in server history
        if (outbox.length > 0) {
          const stillPending = outbox.filter((pending) => {
            return !res.some((h: any) => {
              const hWaktu = String(h.waktu || h.Waktu || h.timestamp || h.Timestamp || "");
              const hJenis = String(h.jenis || h.Jenis || "").toLowerCase().trim();
              return getLocalDateKey(hWaktu) === pending.dateKey && hJenis === pending.jenis.toLowerCase().trim();
            });
          });
          if (stillPending.length !== outbox.length) {
            safeSetItem(`absen_outbox_${key}`, JSON.stringify(stillPending));
          }
          return mergeHistoryWithOutbox(res, stillPending);
        }
        return res;
      }
    } catch (err) {
      console.error("Gagal fetch riwayat absen:", err);
    }

    // Loading from cache fallback
    try {
      const cached = safeGetItem(`flow_history_cache_${key}`);
      if (cached) {
        console.warn("Menggunakan cache offline untuk riwayat absen.");
        const parsed = JSON.parse(cached);
        attendanceHistoryCache[key] = parsed;
        return mergeHistoryWithOutbox(parsed, outbox);
      }
    } catch (e) {
      console.warn("Gagal mengambil cache riwayat absen:", e);
    }
    
    return mergeHistoryWithOutbox([], outbox);
  },

  getChecklistHistory: async (email: string, nama: string) => {
    if (!isConfigured()) return [];
    const cacheKey = `flow_checklist_history_cache_${email.toLowerCase().trim()}_${nama.toLowerCase().trim()}`;
    
    try {
      const res = await fetchWithTimeout(`${GAS_URL}?action=get_checklist_history&email=${encodeURIComponent(email)}&nama=${encodeURIComponent(nama)}&cb=${Date.now()}`);
      if (Array.isArray(res)) {
        try {
          safeSetItem(cacheKey, JSON.stringify(res));
        } catch (e) {
          console.warn("Gagal menyimpan cache checklist history:", e);
        }
        return res;
      }
    } catch (err) {
      console.error("Gagal fetch checklist history:", err);
    }

    try {
      const cached = safeGetItem(cacheKey);
      if (cached) {
        console.warn("Menggunakan cache offline untuk riwayat checklist.");
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn("Gagal mengambil cache checklist history:", e);
    }
    return [];
  },

  getSalaryData: async (email: string, periode: string, id_pegawai?: string) => {
    if (!isConfigured()) return null;
    const cacheKey = `flow_salary_cache_${email.toLowerCase().trim()}_${periode}`;
    
    try {
      let url = `${GAS_URL}?action=get_salary_data&email=${encodeURIComponent(email)}&periode=${encodeURIComponent(periode)}&cb=${Date.now()}`;
      if (id_pegawai) {
        url += `&id_pegawai=${encodeURIComponent(id_pegawai)}`;
      }
      const res = await fetchWithTimeout(url);
      if (res && res.status !== "error") {
        // Jika database uji coba (FLOW DATABASE - TES VPS) tab Import Komisi-nya masih kosong / #REF! IMPORTRANGE,
        // ambil data import_komisi & point dari database utama agar Rincian Komisi & Point tetap tampil lengkap
        if (
          (!res.import_komisi || res.import_komisi.length === 0) &&
          (!res.debug_import_komisi || res.debug_import_komisi.length === 0) &&
          BACKUP_GAS_URL &&
          !url.includes(BACKUP_GAS_URL)
        ) {
          try {
            let backupUrl = `${BACKUP_GAS_URL}?action=get_salary_data&email=${encodeURIComponent(email)}&periode=${encodeURIComponent(periode)}&cb=${Date.now()}`;
            if (id_pegawai) backupUrl += `&id_pegawai=${encodeURIComponent(id_pegawai)}`;
            const backupRes = await fetchWithTimeout(backupUrl, {}, 25000, 0, true);
            if (backupRes && backupRes.status !== "error") {
              if (Array.isArray(backupRes.import_komisi) && backupRes.import_komisi.length > 0) {
                res.import_komisi = backupRes.import_komisi;
              }
              if (!res.total_point && backupRes.total_point) {
                res.total_point = backupRes.total_point;
              }
              if ((!res.transaksi_prod || res.transaksi_prod.length === 0) && Array.isArray(backupRes.transaksi_prod)) {
                res.transaksi_prod = backupRes.transaksi_prod;
              }
            }
          } catch (_) {}
        }

        try {
          safeSetItem(cacheKey, JSON.stringify(res));
        } catch (e) {
          console.warn("Gagal menyimpan cache data gaji:", e);
        }
        return res;
      }
    } catch (err) {
      console.error("Gagal fetch data gaji:", err);
    }

    try {
      const cached = safeGetItem(cacheKey);
      if (cached) {
        console.warn("Menggunakan cache offline untuk data gaji.");
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn("Gagal mengambil cache data gaji:", e);
    }
    return null;
  },

  getAllSalaryData: async (periode: string) => {
    if (!isConfigured()) return [];
    try {
      const res = await fetchWithTimeout(`${GAS_URL}?action=get_all_salary_data&periode=${encodeURIComponent(periode)}&cb=${Date.now()}`);
      if (res && res.status === 'sukses') return res.data || [];
    } catch (err) {
      console.error("Gagal fetch semua data gaji:", err);
    }
    return [];
  },

  getAvailablePeriods: async (email: string) => {
    if (!isConfigured()) return [];
    const cacheKey = `flow_periods_cache_${email.toLowerCase().trim()}`;
    
    try {
      const res = await fetchWithTimeout(`${GAS_URL}?action=get_available_periods&email=${encodeURIComponent(email)}&cb=${Date.now()}`);
      if (Array.isArray(res)) {
        try {
          safeSetItem(cacheKey, JSON.stringify(res));
        } catch (e) {
          console.warn("Gagal menyimpan cache periode gaji:", e);
        }
        return res;
      }
    } catch (err) {
      console.error("Gagal fetch periode gaji:", err);
    }

    try {
      const cached = safeGetItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn("Gagal mengambil cache periode:", e);
    }
    
    const d = new Date();
    return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`];
  },

  login: async (email: string, pass: string) => {
    return await fetchWithTimeout(`${GAS_URL}?action=login&email=${encodeURIComponent(email)}&pass=${encodeURIComponent(pass)}`);
  },

  signup: async (data: any) => {
    return await fetchWithTimeout(GAS_URL, { method: 'POST', body: JSON.stringify({ ...data, type: 'signup' }) });
  },

  updateProfile: async (data: any) => {
    return await fetchWithTimeout(GAS_URL, { method: 'POST', body: JSON.stringify({ ...data, type: 'update_profile' }) });
  },

  absen: async (data: any) => {
    if (data && data.email) {
      api.clearAttendanceCache(data.email);
    }
    const payload = {
      ...data,
      timestamp: data?.timestamp || new Date().toISOString(),
      type: 'absen',
    };
    // Set timeout to 65 detik dan 0 retries untuk absen agar HP menunggu proses cloud selesai di jam sibuk
    return await fetchWithTimeout(GAS_URL, { method: 'POST', body: JSON.stringify(payload) }, 65000, 0);
  },

  kirimTugas: async (data: any) => {
    return await fetchWithTimeout(GAS_URL, { method: 'POST', body: JSON.stringify({ ...data, type: 'tugas' }) });
  },
  
  forgotPassword: async (email: string) => {
    return await fetchWithTimeout(`${GAS_URL}?action=forgot_password&email=${encodeURIComponent(email)}`);
  }
};
