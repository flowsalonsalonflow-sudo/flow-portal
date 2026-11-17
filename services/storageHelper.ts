/**
 * safeStorageHelper.ts
 * Utility to safely read, write, and delete localStorage keys.
 * Catches QuotaExceededError and other storage restrictions (like in iframes)
 * and tries to evict old, non-critical cache keys before retrying.
 */

export const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`[Storage] Gagal menyimpan cache untuk kunci ${key} (Quota Exceeded):`, e);
    
    try {
      // Temukan key yang aman untuk dihapus (hindari flow_user, outbox, dan draf draf aktif)
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (
          k &&
          (k.startsWith("flow_") || k.startsWith("flow_history_") || k.startsWith("flow_checklist_") || k.startsWith("flow_salary_") || k.startsWith("flow_periods_")) &&
          k !== "flow_user" &&
          !k.startsWith("checklist_outbox_") &&
          !k.startsWith("absen_outbox_") &&
          !k.startsWith("checklist_state_v2_")
        ) {
          keysToRemove.push(k);
        }
      }
      
      if (keysToRemove.length > 0) {
        console.warn(`[Storage] Mencoba menghapus ${keysToRemove.length} cache tidak kritis untuk membebaskan ruang...`);
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        
        // Coba lagi menyimpan item baru
        localStorage.setItem(key, value);
        console.info(`[Storage] Berhasil menyimpan cache ${key} setelah pembersihan.`);
        return;
      }
    } catch (cleanErr) {
      console.warn(`[Storage] Gagal melakukan pembersihan atau penyimpanan ulang untuk ${key}:`, cleanErr);
    }
  }
};

export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`[Storage] Gagal mengambil item dari localStorage untuk kunci ${key}:`, e);
    return null;
  }
};

export const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`[Storage] Gagal menghapus item dari localStorage untuk kunci ${key}:`, e);
  }
};
