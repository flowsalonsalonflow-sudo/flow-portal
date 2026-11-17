/**
 * PUSAT ATURAN & RUMUS FLOW SALON (SINGLE SOURCE OF TRUTH)
 * Digunakan bersama oleh:
 * - Flow Port (Absensi & Slip Gaji Karyawan)
 * - HR Hub (Rekap Payroll & Absensi Cabang)
 * - Guru Hub (Monitoring Siswa PKL)
 * - Flow Challenge (Leaderboard & Target)
 *
 * Jika di masa depan kebijakan berubah (misal: jatah libur reguler dari 3 hari menjadi 4 hari),
 * cukup ubah di file ini saja maka seluruh aplikasi otomatis mengikuti aturan terbaru.
 */

export interface PolicyRuleOverride {
  /** Format YYYY-MM mulai berlakunya aturan baru, misal "2027-01" */
  effectiveFromPeriode: string;
  jatahLiburReguler?: number;
  jatahLiburPKL?: number;
  bonusAbsenBulanan?: number;
  bonusAbsenTriwulan?: number;
}

export const FLOW_POLICY = {
  /** Jatah libur bulanan standar saat ini */
  JATAH_LIBUR_REGULER: 3,
  JATAH_LIBUR_PKL: 4,

  /** Tanggal mulai hari krusial akhir bulan (24 s/d akhir bulan) */
  CRUCIAL_MONTH_END_START_DAY: 24,

  /** Toleransi waktu presensi (dalam menit) */
  DISIPLIN_LEAD_MINUTES: 15,
  HALF_DAY_THRESHOLD_MINUTES: 180,

  /** Bonus kerajinan absen penuh */
  BONUS_ABSEN_BULANAN: 100000,
  BONUS_ABSEN_TRIWULAN: 300000,

  /** Target omset & poin layanan/produk */
  PRODUCT_POINTS_DISCOUNT_THRESHOLD: 10,
  DISCOUNTED_TARGET_OMSET: 6000000,
  SERVICE_POINT_STEP_RP: 500000,

  /**
   * Daftar riwayat perubahan kebijakan per periode (opsional).
   * Contoh jika nanti mulai bulan tertentu jatah libur reguler diubah jadi 4 hari
   * tanpa mengubah histori gaji bulan-bulan sebelumnya:
   * { effectiveFromPeriode: "2027-01", jatahLiburReguler: 4 }
   */
  PERIOD_OVERRIDES: [] as PolicyRuleOverride[],
};

export function getPolicyForPeriod(periode?: string) {
  let jatahLiburReguler = FLOW_POLICY.JATAH_LIBUR_REGULER;
  let jatahLiburPKL = FLOW_POLICY.JATAH_LIBUR_PKL;
  let bonusAbsenBulanan = FLOW_POLICY.BONUS_ABSEN_BULANAN;
  let bonusAbsenTriwulan = FLOW_POLICY.BONUS_ABSEN_TRIWULAN;

  if (periode && FLOW_POLICY.PERIOD_OVERRIDES.length > 0) {
    const sorted = [...FLOW_POLICY.PERIOD_OVERRIDES].sort((a, b) =>
      a.effectiveFromPeriode.localeCompare(b.effectiveFromPeriode)
    );
    for (const rule of sorted) {
      if (periode >= rule.effectiveFromPeriode) {
        if (rule.jatahLiburReguler !== undefined) jatahLiburReguler = rule.jatahLiburReguler;
        if (rule.jatahLiburPKL !== undefined) jatahLiburPKL = rule.jatahLiburPKL;
        if (rule.bonusAbsenBulanan !== undefined) bonusAbsenBulanan = rule.bonusAbsenBulanan;
        if (rule.bonusAbsenTriwulan !== undefined) bonusAbsenTriwulan = rule.bonusAbsenTriwulan;
      }
    }
  }

  return {
    jatahLiburReguler,
    jatahLiburPKL,
    bonusAbsenBulanan,
    bonusAbsenTriwulan,
  };
}

export function getAllowedLibur(isPKL: boolean, periode?: string): number {
  const policy = getPolicyForPeriod(periode);
  return isPKL ? policy.jatahLiburPKL : policy.jatahLiburReguler;
}

export function getStandardWorkDays(daysInMonth: number, isPKL = false, periode?: string): number {
  const policy = getPolicyForPeriod(periode);
  const liburDeduction = isPKL ? policy.jatahLiburPKL : policy.jatahLiburReguler;
  return Math.max(1, daysInMonth - liburDeduction);
}

export function calculatePointTierBonusRp(totalPoints: number): number {
  if (totalPoints >= 1 && totalPoints <= 10) return totalPoints * 5000;
  if (totalPoints >= 11 && totalPoints <= 20) return totalPoints * 10000;
  if (totalPoints > 20) return totalPoints * 15000;
  return 0;
}
