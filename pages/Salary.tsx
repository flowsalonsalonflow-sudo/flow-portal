import React, { useState, useEffect, useRef } from "react";
import { User } from "../types";
import { api } from "../services/apiService";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import { getAllowedLibur, getStandardWorkDays, getPolicyForPeriod } from "../services/policyConfig";

interface SalaryProps {
  user?: User;
  joinDate?: string | null;
  hariKhusus?: any[];
  hariLibur?: any[];
  hariIzin?: any[];
  selectedPeriod?: string;
  onPeriodChange?: (period: string) => void;
  onNavigate?: (page: any) => void;
  onToggleFocus?: (focus: boolean) => void;
}

export const Salary: React.FC<SalaryProps> = ({
  user,
  joinDate,
  hariKhusus,
  hariLibur,
  hariIzin,
  selectedPeriod,
  onPeriodChange,
  onNavigate,
  onToggleFocus,
}) => {
  const [periode, setPeriode] = useState(() => {
    if (selectedPeriod) return selectedPeriod;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [availableMonths, setAvailableMonths] = useState<string[]>(() => {
    const d = new Date();
    const current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (selectedPeriod && selectedPeriod !== current) {
      return [selectedPeriod, current];
    }
    return [current];
  });
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isFetchingMonths, setIsFetchingMonths] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [commissionActiveTab, setCommissionActiveTab] = useState<'treatment' | 'produk' | 'tambahan'>('treatment');
  
  const [isDownloading, setIsDownloading] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!slipRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Slip_Gaji_${user?.nama?.replace(/\s+/g, '_') || 'Karyawan'}_${periode}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (showCommissionModal) {
      const isUserPKL = (user?.jabatan || "").toLowerCase().includes("pkl");
      if (isUserPKL) {
        setCommissionActiveTab('tambahan');
      } else {
        setCommissionActiveTab('treatment');
      }
    }
  }, [showCommissionModal, user?.jabatan]);

  useEffect(() => {
    onToggleFocus?.(showPointModal || showCommissionModal);
    return () => {
      onToggleFocus?.(false);
    };
  }, [showPointModal, showCommissionModal, onToggleFocus]);

  const parseDateHelper = (
    dateStr: any,
    targetMonthStr?: string,
  ): Date | null => {
    try {
      if (!dateStr) return null;
      if (dateStr instanceof Date)
        return isNaN(dateStr.getTime()) ? null : dateStr;
      const s = String(dateStr).trim();
      if (!s) return null;

      // 1. Try native Date
      let d_native = new Date(s);
      if (!isNaN(d_native.getTime())) return d_native;

      // 2. Custom parsing for MM/DD, DD/MM, month names
      const parts = s.split(/[ ,T/\\-]+/);
      if (parts.length < 2) return null;

      let day = -1,
        month = -1,
        year = -1;
      const monthMap: Record<string, number> = {
        jan: 0,
        feb: 1,
        mar: 2,
        apr: 3,
        mei: 4,
        may: 4,
        jun: 5,
        jul: 6,
        agu: 7,
        aug: 7,
        sep: 8,
        okt: 9,
        oct: 9,
        nov: 10,
        des: 11,
        dec: 11,
      };

      const getMonthFromStr = (str: string) => {
        const low = str.toLowerCase().substring(0, 3);
        return monthMap[low] !== undefined ? monthMap[low] : -1;
      };

      // Try to find year (4 digits)
      const yearIdx = parts.findIndex(
        (p) => p.length === 4 && !isNaN(parseInt(p)),
      );
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

            if (b0 > 12) {
              day = b0;
              month = b1 - 1;
            } else if (b1 > 12) {
              month = b0 - 1;
              day = b1;
            } else {
              // Ambiguous 05/01/2026. Use targetMonthStr if available
              if (targetMonthStr) {
                const tm = parseInt(targetMonthStr.split("-")[1]);
                if (b1 === tm) {
                  month = b1 - 1;
                  day = b0;
                } else {
                  month = b0 - 1;
                  day = b1;
                }
              } else {
                month = b0 - 1;
                day = b1; // Default MM/DD
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
            finalDate.setHours(
              parseInt(timeMatch[1], 10),
              parseInt(timeMatch[2], 10),
              parseInt(timeMatch[3] || "0", 10),
            );
          }
          return finalDate;
        }
      }

      const timestamp = Date.parse(s);
      return isNaN(timestamp) ? null : new Date(timestamp);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const fetchAvailableMonths = async () => {
      if (!user?.email) return;
      setIsFetchingMonths(true);
      try {
        const [periods, history] = await Promise.all([
          api.getAvailablePeriods(user.email),
          api.getAttendanceHistory(user.email),
        ]);

        let finalPeriods: string[] = [];

        if (periods && Array.isArray(periods)) {
          finalPeriods = [...periods];
        }

        if (history && Array.isArray(history)) {
          setAttendanceHistory(history);
          // Extract locally as well for robustness
          history.forEach((item: any) => {
            const timeStr =
              item.waktu ||
              item.Waktu ||
              item.timestamp ||
              item.Timestamp ||
              "";
            const d = parseDateHelper(timeStr);
            if (d && !isNaN(d.getTime())) {
              const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              if (!finalPeriods.includes(p)) finalPeriods.push(p);
            }
          });
        }

        // Always include current month, selectedPeriod, and current periode
        const now = new Date();
        const currentP = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        if (!finalPeriods.includes(currentP)) finalPeriods.push(currentP);
        if (selectedPeriod && !finalPeriods.includes(selectedPeriod)) finalPeriods.push(selectedPeriod);
        if (periode && !finalPeriods.includes(periode)) finalPeriods.push(periode);

        // Sort descending
        finalPeriods.sort().reverse();

        if (finalPeriods.length > 0) {
          setAvailableMonths(finalPeriods);
          if (!finalPeriods.includes(periode)) {
            setPeriode(finalPeriods[0]);
          }
        }
      } catch (err) {
        console.error("Gagal load months:", err);
      } finally {
        setIsFetchingMonths(false);
      }
    };
    fetchAvailableMonths();
  }, [user?.email]);

  useEffect(() => {
    if (selectedPeriod && selectedPeriod !== periode) {
      setPeriode(selectedPeriod);
    }
  }, [selectedPeriod, periode]);

  const [salaryData, setSalaryData] = useState({
    gajiPokok: 0,
    uangMakan: 0,
    bonusDisiplin: 0,
    target_omset: 0,
    jabatan: "",
    hadirDisiplin: 0,
    hadirTidakDisiplin: 0,
    hadirTelat: 0,
    liburWeekend: 0,
    setengahHariWeekday: 0,
    setengahHariWeekend: 0,
    listKomisi: [] as {
      tanggal: string;
      nominal: number;
      keterangan: string;
    }[],
    listKomisiTambahan: [] as {
      tanggal: string;
      nominal: number;
      keterangan: string;
    }[],
    listKasbon: [] as {
      tanggal: string;
      nominal: number;
      keterangan: string;
    }[],
    totalPoint: 0,
    importKomisi: [] as {
      tanggal: string;
      omset: number;
      komisi: number;
      point: number;
    }[],
    transaksiProd: [] as {
      tanggal: string;
      harga_item: number;
      jumlah?: number;
      sku?: string;
      item?: string;
    }[],
    pointProduk: [] as {
      produk: string;
      komisi: number;
      point: number;
    }[],
    joinDate: "",
    outDate: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [daysInMonth, setDaysInMonth] = useState(30);

  useEffect(() => {
    if (!periode) return;
    const [year, month] = periode.split("-");
    const days = new Date(parseInt(year), parseInt(month), 0).getDate();
    setDaysInMonth(days);

    let active = true;

    const fetchSalaryData = async () => {
      if (user?.email) {
        setIsLoading(true);
        try {
          const res = await api.getSalaryData(
            user.email,
            periode,
            (user as any)?.id_pegawai || (user as any)?.id_pos,
          );
          if (active && res && res.status !== "error") {
            setSalaryData({
              gajiPokok: Number(res.gaji_pokok || res.Gaji_Pokok) || 0,
              uangMakan: Number(res.uang_makan || res.Uang_Makan) || 0,
              bonusDisiplin:
                Number(res.bonus_disiplin || res.Bonus_Disiplin) || 0,
              target_omset: Number(res.target_omset || res.Target_Omset) || 0,
              jabatan: String(res.jabatan || res.Jabatan || ""),
              hadirDisiplin: Number(res.hadir_disiplin) || 0,
              hadirTidakDisiplin: Number(res.hadir_tidak_disiplin) || 0,
              hadirTelat: Number(res.hadir_telat) || 0,
              liburWeekend: Number(res.libur_weekend) || 0,
              setengahHariWeekday: Number(res.setengah_hari_weekday) || 0,
              setengahHariWeekend: Number(res.setengah_hari_weekend) || 0,
              listKomisi: res.komisi || [],
              listKomisiTambahan: res.komisi_tambahan || [],
              listKasbon: res.kasbon || [],
              totalPoint: Number(res.total_point) || 0,
              importKomisi: res.import_komisi || [],
              transaksiProd: res.transaksi_prod || [],
              pointProduk: res.point_produk || res.pointProduk || [],
              joinDate: String(
                res.join_date ||
                  res.Join_Date ||
                  res.joinDate ||
                  res.masuk_tgl ||
                  res.Masuk_Tgl ||
                  res.timestamp ||
                  res.Timestamp ||
                  "",
              ),
              outDate: String(
                res.keluar_tgl ||
                  res.Keluar_Tgl ||
                  res.resign_date ||
                  res.Resign_Date ||
                  "",
              ),
            });
          }
        } catch (e) {
          console.error("Gagal mengambil data gaji:", e);
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      } else {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchSalaryData();

    return () => {
      active = false;
    };
  }, [user, periode]);

  // PERHITUNGAN GAJI
  const holidayCount = React.useMemo(() => {
    if (!hariLibur || !Array.isArray(hariLibur) || !periode) return 0;
    const [yearStr, monthStr] = periode.split("-");
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;

    return hariLibur.filter((h) => {
      const hDate = parseDateHelper(h.tanggal || h.Tanggal, periode);
      return (
        hDate && hDate.getFullYear() === year && hDate.getMonth() === monthIndex
      );
    }).length;
  }, [hariLibur, periode]);

  const userJabatanLower = (user?.jabatan || "").toLowerCase();
  const isPKL = userJabatanLower.includes("pkl");

  const hariKerja = getStandardWorkDays(daysInMonth, isPKL, periode);
  const gajiHarian = React.useMemo(() => {
    return hariKerja > 0 ? salaryData.gajiPokok / hariKerja : 0;
  }, [hariKerja, salaryData.gajiPokok]);

  const userIzins = React.useMemo(() => {
    if (!hariIzin || !Array.isArray(hariIzin) || !user) return [];
    const uName = (user.nama || "").toLowerCase().trim();
    return hariIzin.filter(
      (iz) => (iz.nama || iz.Nama || "").toLowerCase().trim() === uName,
    );
  }, [hariIzin, user]);

  const effectiveJoinDate = React.useMemo(() => {
    const rawJoinStr =
      joinDate ||
      salaryData.joinDate ||
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
    if (rawJoinStr) {
      const parsed = parseDateHelper(rawJoinStr);
      if (parsed) return parsed;
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
      const timeStr =
        (firstRecord as any)?.waktu ||
        (firstRecord as any)?.Waktu ||
        (firstRecord as any)?.timestamp ||
        (firstRecord as any)?.Timestamp;
      const parsedHistoryDate = parseDateHelper(timeStr);
      if (parsedHistoryDate) {
        return new Date(parsedHistoryDate);
      }
    }
    return null;
  }, [joinDate, salaryData.joinDate, user, attendanceHistory]);

  const effectiveOutDate = React.useMemo(() => {
    const rawOutStr =
      salaryData.outDate ||
      (user as any)?.Keluar_Tgl ||
      (user as any)?.keluar_tgl ||
      (user as any)?.resign_date ||
      (user as any)?.Resign_Date ||
      "";
    if (rawOutStr) {
      const parsed = parseDateHelper(rawOutStr);
      if (parsed) return parsed;
    }
    return null;
  }, [salaryData.outDate, user]);

  const statsCalculated = React.useMemo(() => {
    if (!periode || attendanceHistory.length === 0)
      return {
        dHadirDisiplin: 0,
        dHadirTidakDisiplin: 0,
        dHadirTelat: 0,
        dSetengahHariWeekday: 0,
        dSetengahHariWeekend: 0,
        dLiburWeekend: 0,
        dHariLiburCount: 0,
      };

    const [yStr, mStr] = periode.split("-");
    const year = parseInt(yStr);
    const monthIndex = parseInt(mStr) - 1;

    const isDValid = (d: number) => {
      const checkTs = new Date(year, monthIndex, d).getTime();
      if (effectiveJoinDate) {
        const joinTs = new Date(
          effectiveJoinDate.getFullYear(),
          effectiveJoinDate.getMonth(),
          effectiveJoinDate.getDate(),
        ).getTime();
        if (checkTs < joinTs) return false;
      }
      if (effectiveOutDate) {
        const outTs = new Date(
          effectiveOutDate.getFullYear(),
          effectiveOutDate.getMonth(),
          effectiveOutDate.getDate(),
        ).getTime();
        if (checkTs >= outTs) return false;
      }
      return true;
    };

    const groups: { [key: string]: any } = {};

    const dayRawItems: { [key: string]: { item: any; date: Date; dDay: number }[] } = {};

    attendanceHistory.forEach((item) => {
      const timeStr = String(
        item.waktu || item.Waktu || item.timestamp || item.Timestamp || "",
      ).trim();
      if (!timeStr) return;
      let date = parseDateHelper(timeStr, periode);
      if (!date || isNaN(date.getTime())) return;

      const dYear = date.getFullYear();
      const dMonth = date.getMonth();
      const dDay = date.getDate();

      if (dYear !== year || dMonth !== monthIndex) return;
      if (!isDValid(dDay)) return;

      const key = `${dYear}-${dMonth}-${dDay}`;
      if (!dayRawItems[key]) {
        dayRawItems[key] = [];
      }
      dayRawItems[key].push({ item, date, dDay });
    });

    Object.entries(dayRawItems).forEach(([key, entries]) => {
      let effectiveShift = "pagi";
      const shifts = entries.map(e => (e.item.shift || e.item.Shift || "").toLowerCase());
      if (shifts.some(s => s.includes("full"))) {
        effectiveShift = "full";
      } else if (shifts.some(s => s.includes("siang"))) {
        effectiveShift = "siang";
      }

      const firstEntry = entries[0];
      const date = firstEntry.date;
      const dDay = firstEntry.dDay;

      let isHariKhusus = false;
      if (hariKhusus && Array.isArray(hariKhusus)) {
        const matching = hariKhusus.find((h: any) => {
          const hDate = parseDateHelper(h.tanggal || h.Tanggal, periode);
          return hDate && hDate.toDateString() === date.toDateString();
        });
        if (matching) isHariKhusus = true;
      }

      let isHoliday = false;
      if (hariLibur && Array.isArray(hariLibur)) {
        isHoliday = hariLibur.some((hl: any) => {
          const hlDate = parseDateHelper(hl.tanggal || hl.Tanggal, periode);
          return hlDate && hlDate.toDateString() === date.toDateString();
        });
      }

      groups[key] = {
        date,
        masuk: false,
        pulang: false,
        status: "",
        isHoliday,
        isWeekendOrAkhir:
          date.getDay() === 0 ||
          date.getDay() === 6 ||
          dDay >= 24 ||
          isHariKhusus,
      };

      let targetMasukPagi = 9 * 60,
        targetPulangPagi = 17 * 60;
      let targetMasukSiang = 13 * 60,
        targetPulangSiang = 21 * 60;
      let targetMasukFull = 9 * 60,
        targetPulangFull = 21 * 60;

      if (user?.jamKhusus) {
        const rules = user.jamKhusus.split(",");
        rules.forEach((rule) => {
          const parts = rule.split(":").map((s) => s.trim());
          if (parts.length >= 2) {
            const shiftName = parts[0].toLowerCase();
            const times = parts.slice(1).join(":");
            const [masukStr, pulangStr] = times.split("-").map((s) => s.trim());
            let masukMins = -1,
              pulangMins = -1;
            if (masukStr) {
              const mParts = masukStr
                .split(":")
                .map((val) => parseInt(val, 10));
              if (mParts.length >= 2 && !isNaN(mParts[0]) && !isNaN(mParts[1]))
                masukMins = mParts[0] * 60 + mParts[1];
            }
            if (pulangStr) {
              const pParts = pulangStr
                .split(":")
                .map((val) => parseInt(val, 10));
              if (pParts.length >= 2 && !isNaN(pParts[0]) && !isNaN(pParts[1]))
                pulangMins = pParts[0] * 60 + pParts[1];
            }
            if (shiftName === "pagi") {
              if (masukMins !== -1) targetMasukPagi = masukMins;
              if (pulangMins !== -1) targetPulangPagi = pulangMins;
            } else if (shiftName === "siang") {
              if (masukMins !== -1) targetMasukSiang = masukMins;
              if (pulangMins !== -1) targetPulangSiang = pulangMins;
            } else if (shiftName.includes("full")) {
              if (masukMins !== -1) targetMasukFull = masukMins;
              if (pulangMins !== -1) targetPulangFull = pulangMins;
            }
          }
        });
      }

      let jamMasukMins = 0;
      let jamPulangMins = 0;
      if (effectiveShift === "pagi") {
        jamMasukMins = targetMasukPagi;
        jamPulangMins = targetPulangPagi;
      } else if (effectiveShift === "siang") {
        jamMasukMins = targetMasukSiang;
        jamPulangMins = targetPulangSiang;
      } else if (effectiveShift === "full") {
        jamMasukMins = targetMasukFull;
        jamPulangMins = targetPulangFull;
      }

      const masukEntries = entries.filter(e => (e.item.jenis || e.item.Jenis || "").toLowerCase() === "masuk");
      const pulangEntries = entries.filter(e => (e.item.jenis || e.item.Jenis || "").toLowerCase() === "pulang");

      let isHalfDay = false;
      let isLate = false;
      let isOnTime = false;
      let isDisiplin = false;

      if (masukEntries.length > 0) {
        groups[key].masuk = true;
        const totalMins = masukEntries[0].date.getHours() * 60 + masukEntries[0].date.getMinutes();
        if (jamMasukMins > 0) {
          if (totalMins >= jamMasukMins + 180) {
            isHalfDay = true;
          } else if (totalMins > jamMasukMins) {
            isLate = true;
          } else if (totalMins <= jamMasukMins - 15) {
            if (isHoliday) {
              isOnTime = true;
            } else {
              isDisiplin = true;
            }
          } else {
            isOnTime = true;
          }
        }
      }

      if (pulangEntries.length > 0) {
        groups[key].pulang = true;
        const totalMins = pulangEntries[0].date.getHours() * 60 + pulangEntries[0].date.getMinutes();
        if (jamPulangMins > 0) {
          if (totalMins <= jamPulangMins - 180) {
            isHalfDay = true;
          }
        }
      }

      // Prioritas label: 1/2 hari, telat, tepat, disiplin
      if (isHalfDay) {
        groups[key].status = "1/2 Hari";
      } else if (isLate) {
        groups[key].status = "Telat";
      } else if (isOnTime) {
        groups[key].status = "Tepat";
      } else if (isDisiplin) {
        groups[key].status = "Disiplin";
      } else {
        groups[key].status = "";
      }
    });

    const logs = Object.values(groups);
    const normalLogs = logs.filter(l => !l.isHoliday);
    let hDisiplin = normalLogs.filter((l) => l.status === "Disiplin").length;
    let hTidakDisiplin = normalLogs.filter(
      (l) =>
        (l.status === "" ||
          l.status === "Tepat" ||
          l.status === "Tepat Waktu") &&
        (l.masuk || l.pulang),
    ).length;
    let hTelat = normalLogs.filter((l) => l.status === "Telat").length;
    let sHariWeekday = normalLogs.filter(
      (l) => l.status === "1/2 Hari" && !l.isWeekendOrAkhir,
    ).length;
    let sHariWeekend = normalLogs.filter(
      (l) => l.status === "1/2 Hari" && l.isWeekendOrAkhir,
    ).length;

    let lWeekday = 0;
    let lWeekend = 0;
    let hLiburCount = 0;

    const maxDays = new Date(year, monthIndex + 1, 0).getDate();
    const today = new Date();
    let maxDaysToCheck = maxDays;

    if (today.getFullYear() === year && today.getMonth() === monthIndex) {
      maxDaysToCheck = today.getDate();
    } else if (new Date(year, monthIndex, 1) > today) {
      maxDaysToCheck = 0;
    }

    for (let i = 1; i <= maxDaysToCheck; i++) {
      if (!isDValid(i)) continue;
      const key = `${year}-${monthIndex}-${i}`;
      const date = new Date(year, monthIndex, i);
      const day = date.getDay();
      const isWeekend = day === 0 || day === 6;
      const isAkhirBulan = i >= 24;

      let isSpecial = false;
      if (hariKhusus && Array.isArray(hariKhusus)) {
        isSpecial = hariKhusus.some((h: any) => {
          const hDate = parseDateHelper(h.tanggal || h.Tanggal, periode);
          return (
            hDate &&
            hDate.getFullYear() === year &&
            hDate.getMonth() === monthIndex &&
            hDate.getDate() === i
          );
        });
      }

      let isHoliday = false;
      if (hariLibur && Array.isArray(hariLibur)) {
        isHoliday = hariLibur.some((hl: any) => {
          const hlDate = parseDateHelper(hl.tanggal || hl.Tanggal, periode);
          return (
            hlDate &&
            hlDate.getFullYear() === year &&
            hlDate.getMonth() === monthIndex &&
            hlDate.getDate() === i
          );
        });
      }

      let isIzin = false;
      if (userIzins && userIzins.length > 0) {
        isIzin = userIzins.some((iz: any) => {
          const izDate = parseDateHelper(iz.tanggal || iz.Tanggal, periode);
          return (
            izDate &&
            izDate.getFullYear() === year &&
            izDate.getMonth() === monthIndex &&
            izDate.getDate() === i
          );
        });
      }

      const isCrucial = isWeekend || isAkhirBulan || isSpecial;

      if (isHoliday) {
        hLiburCount++;
      } else {
        const hasWork = groups[key] && (groups[key].masuk || groups[key].pulang);
        if (!hasWork) {
          const isTodayBefore9PM = today.getFullYear() === year && 
                                   today.getMonth() === monthIndex && 
                                   today.getDate() === i && 
                                   today.getHours() < 21;
          if (isTodayBefore9PM) {
            // Do not treat as missed day before 21:00 on today
          } else {
            if (isIzin) {
              // Izin sakit: tetap dihitung libur reguler, tidak ada potongan hari krusial
              lWeekday++;
            } else if (isCrucial) {
              lWeekend++;
            } else {
              lWeekday++;
            }
          }
        }
      }
    }

    return {
      dHadirDisiplin: hDisiplin,
      dHadirTidakDisiplin: hTidakDisiplin,
      dHadirTelat: hTelat,
      dSetengahHariWeekday: sHariWeekday,
      dSetengahHariWeekend: sHariWeekend,
      dLiburWeekend: lWeekend,
      dHariLiburCount: hLiburCount,
    };
  }, [
    periode,
    attendanceHistory,
    user?.jamKhusus,
    hariKhusus,
    hariLibur,
    hariIzin,
    userIzins,
    effectiveJoinDate,
    effectiveOutDate,
  ]);

  const {
    dHadirDisiplin,
    dHadirTidakDisiplin,
    dHadirTelat,
    dSetengahHariWeekday,
    dSetengahHariWeekend,
    dLiburWeekend,
    dHariLiburCount,
  } = statsCalculated;

  const isMonthFullInternal = React.useCallback(
    (year: number, monthIndex: number) => {
      const monthStrFormatted = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const maxDays = new Date(year, monthIndex + 1, 0).getDate();

      const isDValid = (d: number) => {
        const checkTs = new Date(year, monthIndex, d).getTime();
        if (effectiveJoinDate) {
          const joinTs = new Date(
            effectiveJoinDate.getFullYear(),
            effectiveJoinDate.getMonth(),
            effectiveJoinDate.getDate(),
          ).getTime();
          if (checkTs < joinTs) return false;
        }
        if (effectiveOutDate) {
          const outTs = new Date(
            effectiveOutDate.getFullYear(),
            effectiveOutDate.getMonth(),
            effectiveOutDate.getDate(),
          ).getTime();
          if (checkTs >= outTs) return false;
        }
        return true;
      };

      const groups: { [key: string]: any } = {};
      const dayRawItems: { [key: string]: { item: any; date: Date; dDay: number }[] } = {};

      attendanceHistory.forEach((item) => {
        const timeStr = String(
          item.waktu || item.Waktu || item.timestamp || item.Timestamp || "",
        ).trim();
        if (!timeStr) return;
        let date = parseDateHelper(timeStr, monthStrFormatted);
        if (!date || isNaN(date.getTime())) return;

        const dYear = date.getFullYear();
        const dMonth = date.getMonth();
        const dDay = date.getDate();

        if (dYear !== year || dMonth !== monthIndex) return;
        if (!isDValid(dDay)) return;

        const key = dDay.toString();
        if (!dayRawItems[key]) {
          dayRawItems[key] = [];
        }
        dayRawItems[key].push({ item, date, dDay });
      });

      Object.entries(dayRawItems).forEach(([key, entries]) => {
        let effectiveShift = "pagi";
        const shifts = entries.map(e => (e.item.shift || e.item.Shift || "").toLowerCase());
        if (shifts.some(s => s.includes("full"))) {
          effectiveShift = "full";
        } else if (shifts.some(s => s.includes("siang"))) {
          effectiveShift = "siang";
        }

        const firstEntry = entries[0];
        const date = firstEntry.date;
        const dDay = firstEntry.dDay;

        let isHariKhusus = false;
        if (hariKhusus && Array.isArray(hariKhusus)) {
          const matching = hariKhusus.find((h: any) => {
            const hDate = parseDateHelper(h.tanggal || h.Tanggal, monthStrFormatted);
            return hDate && hDate.toDateString() === date.toDateString();
          });
          if (matching) isHariKhusus = true;
        }

        groups[key] = {
          date,
          masuk: null,
          pulang: null,
          status: "",
          isWeekendOrAkhir:
            date.getDay() === 0 ||
            date.getDay() === 6 ||
            dDay >= 24 ||
            isHariKhusus,
        };

        let targetMasukPagi = 9 * 60, targetPulangPagi = 17 * 60;
        let targetMasukSiang = 13 * 60, targetPulangSiang = 21 * 60;
        let targetMasukFull = 9 * 60, targetPulangFull = 21 * 60;

        if (user?.jamKhusus) {
          const rules = user.jamKhusus.split(",");
          rules.forEach((rule) => {
            const parts = rule.split(":").map((s) => s.trim());
            if (parts.length >= 2) {
              const shiftName = parts[0].toLowerCase();
              const times = parts.slice(1).join(":");
              const [masukStr, pulangStr] = times.split("-").map((s) => s.trim());
              let masukMins = -1, pulangMins = -1;
              if (masukStr) {
                const mParts = masukStr.split(":").map((val) => parseInt(val, 10));
                if (mParts.length >= 2 && !isNaN(mParts[0]) && !isNaN(mParts[1]))
                  masukMins = mParts[0] * 60 + mParts[1];
              }
              if (pulangStr) {
                const pParts = pulangStr.split(":").map((val) => parseInt(val, 10));
                if (pParts.length >= 2 && !isNaN(pParts[0]) && !isNaN(pParts[1]))
                  pulangMins = pParts[0] * 60 + pParts[1];
              }
              if (shiftName === "pagi") {
                if (masukMins !== -1) targetMasukPagi = masukMins;
                if (pulangMins !== -1) targetPulangPagi = pulangMins;
              } else if (shiftName === "siang") {
                if (masukMins !== -1) targetMasukSiang = masukMins;
                if (pulangMins !== -1) targetPulangSiang = pulangMins;
              } else if (shiftName.includes("full")) {
                if (masukMins !== -1) targetMasukFull = masukMins;
                if (pulangMins !== -1) targetPulangFull = pulangMins;
              }
            }
          });
        }

        let jamMasukMins = 0;
        let jamPulangMins = 0;
        if (effectiveShift === "pagi") {
          jamMasukMins = targetMasukPagi;
          jamPulangMins = targetPulangPagi;
        } else if (effectiveShift === "siang") {
          jamMasukMins = targetMasukSiang;
          jamPulangMins = targetPulangSiang;
        } else if (effectiveShift === "full") {
          jamMasukMins = targetMasukFull;
          jamPulangMins = targetPulangFull;
        }

        const masukEntries = entries.filter(e => (e.item.jenis || e.item.Jenis || "").toLowerCase() === "masuk");
        const pulangEntries = entries.filter(e => (e.item.jenis || e.item.Jenis || "").toLowerCase() === "pulang");

        let isHalfDay = false;

        if (masukEntries.length > 0) {
          const totalMins = masukEntries[0].date.getHours() * 60 + masukEntries[0].date.getMinutes();
          groups[key].masuk = totalMins;
          if (jamMasukMins > 0) {
            if (totalMins >= jamMasukMins + 180) {
              isHalfDay = true;
            }
          }
        }

        if (pulangEntries.length > 0) {
          const totalMins = pulangEntries[0].date.getHours() * 60 + pulangEntries[0].date.getMinutes();
          groups[key].pulang = totalMins;
          if (jamPulangMins > 0) {
            if (totalMins <= jamPulangMins - 180) {
              isHalfDay = true;
            }
          }
        }

        if (isHalfDay) {
          groups[key].status = "1/2 Hari";
        }
      });

      let totalOffScore = 0;
      for (let i = 1; i <= maxDays; i++) {
        if (!isDValid(i)) continue;
        const key = i.toString();
        const date = new Date(year, monthIndex, i);
        const day = date.getDay();
        const isWeekend = day === 0 || day === 6;
        const isAkhirBulan = i >= 24;

        let isHariKhusus = false;
        if (hariKhusus && Array.isArray(hariKhusus)) {
          const matching = hariKhusus.find((h: any) => {
            const hDate = parseDateHelper(h.tanggal || h.Tanggal, monthStrFormatted);
            return hDate && hDate.toDateString() === date.toDateString();
          });
          if (matching) isHariKhusus = true;
        }

        const isCrucial = isWeekend || isAkhirBulan || isHariKhusus;

        let isHoliday = false;
        if (hariLibur && Array.isArray(hariLibur)) {
          isHoliday = hariLibur.some((hl: any) => {
            const hlDate = parseDateHelper(hl.tanggal || hl.Tanggal, monthStrFormatted);
            return hlDate && hlDate.toDateString() === date.toDateString();
          });
        }

        let isIzin = false;
        if (userIzins && userIzins.length > 0) {
          isIzin = userIzins.some((iz: any) => {
            const izDate = parseDateHelper(iz.tanggal || iz.Tanggal, monthStrFormatted);
            return izDate && izDate.toDateString() === date.toDateString();
          });
        }

        if (isHoliday) {
          // No deduction for public holidays
        } else {
          const dayGroup = groups[key];
          const hasWork = dayGroup && (dayGroup.masuk !== undefined || dayGroup.pulang !== undefined);
          if (hasWork) {
            if (dayGroup.status === "1/2 Hari") {
              if (isCrucial) {
                totalOffScore += 1.0; // 1/2 hari krusial = 1 point
              } else {
                totalOffScore += 0.5; // 1/2 hari biasa = 0.5 point
              }
            }
          } else {
            if (isIzin) {
              // Izin sakit: tetap dihitung libur (1 poin), bebas penalti hari krusial
              totalOffScore += 1.0;
            } else {
              if (isCrucial) {
                totalOffScore += 2.0; // libur krusial = 2 points
              } else {
                totalOffScore += 1.0; // libur biasa = 1 point
              }
            }
          }
        }
      }

      return totalOffScore <= getAllowedLibur(isPKL, monthStrFormatted);
    },
    [attendanceHistory, hariKhusus, hariLibur, hariIzin, userIzins, user, isPKL, effectiveJoinDate, effectiveOutDate],
  );

  const bonusGaji = React.useMemo(() => {
    if (!periode || attendanceHistory.length === 0) return 0;
    const [yearStr, monthStr] = periode.split("-");
    const year = parseInt(yearStr);
    const monthIndex = parseInt(monthStr) - 1;

    const checkEligibility = (y: number, m: number) => {
      const jd = effectiveJoinDate;
      const od = effectiveOutDate;

      if (jd) {
        if (jd.getFullYear() === y && jd.getMonth() === m) {
          if (jd.getDate() > 1) return false;
        }
        const firstDay = new Date(y, m, 1);
        if (jd.getTime() > firstDay.getTime()) return false;
      }

      if (od) {
        const lastDay = new Date(y, m + 1, 0);
        if (od.getFullYear() === y && od.getMonth() === m) {
          if (od.getDate() < lastDay.getDate()) return false;
        }
        if (od.getTime() < lastDay.getTime()) return false;
      }

      return true;
    };

    if (!checkEligibility(year, monthIndex)) return 0;
    if (!isMonthFullInternal(year, monthIndex)) return 0;

    const isEndOfQuarter = (monthIndex + 1) % 3 === 0;
    if (isEndOfQuarter) {
      const getPrevMonth = (y: number, m: number, offset: number) => {
        const d = new Date(y, m - offset, 1);
        return { y: d.getFullYear(), m: d.getMonth() };
      };
      const m1 = getPrevMonth(year, monthIndex, 1);
      const m2 = getPrevMonth(year, monthIndex, 2);

      if (
        checkEligibility(m1.y, m1.m) &&
        isMonthFullInternal(m1.y, m1.m) &&
        checkEligibility(m2.y, m2.m) &&
        isMonthFullInternal(m2.y, m2.m)
      ) {
        return getPolicyForPeriod(periode).bonusAbsenTriwulan;
      }
    }
    return getPolicyForPeriod(periode).bonusAbsenBulanan;
  }, [periode, attendanceHistory, isMonthFullInternal, effectiveJoinDate, effectiveOutDate]);

  // Pendapatan
  const totalSemuaKehadiran =
    dHadirDisiplin +
    dHadirTidakDisiplin +
    dHadirTelat +
    dSetengahHariWeekday +
    dSetengahHariWeekend +
    dHariLiburCount;
  const totalHariUangMakan = dHadirDisiplin + dHadirTidakDisiplin;

  const pendapatanKehadiran = totalSemuaKehadiran * gajiHarian;
  const pendapatanDisiplin = dHadirDisiplin * salaryData.bonusDisiplin;
  const pendapatanUangMakan = totalHariUangMakan * salaryData.uangMakan;

  const totalKomisi = 0;

  const totalKomisiTambahan = (salaryData.listKomisiTambahan || []).reduce(
    (acc, curr) => acc + Number(curr.nominal),
    0,
  );

  // Reference list for product commission and points:
  const DEFAULT_POINT_PRODUK = React.useMemo(() => [
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
  ], []);

  const pointProdukList = React.useMemo(() => {
    return salaryData.pointProduk && salaryData.pointProduk.length > 0 
      ? salaryData.pointProduk 
      : DEFAULT_POINT_PRODUK;
  }, [salaryData.pointProduk, DEFAULT_POINT_PRODUK]);

  const findProductInfo = React.useCallback((itemText: string, skuText: string) => {
    const normItem = (itemText || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    const normSku = (skuText || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    
    return pointProdukList.find(p => {
      const pName = (p.produk || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
      return pName && (normItem === pName || normItem.includes(pName) || pName.includes(normItem) || normSku === pName || normSku.includes(pName));
    });
  }, [pointProdukList]);

  const getProductPointAndKomisi = React.useCallback((entry: any) => {
    const info = findProductInfo(entry.item, entry.sku);
    if (info) {
      const pVal = Number(info.point || 0);
      const kVal = Number(info.komisi || 0);
      return { point: pVal, komisi: kVal };
    }
    
    // Fallback logic
    const cleanSku = (entry.sku || "").toLowerCase().trim();
    const isBeautyProduct = 
      cleanSku.startsWith("prd-clg") || 
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
    } else if (cleanSku.startsWith("prd-clg-s")) {
      fallbackKomisi = 5000;
      fallbackPoint = 0.5;
    } else if (cleanSku.startsWith("prd-clg-m")) {
      fallbackKomisi = 10000;
      fallbackPoint = 1;
    } else if (cleanSku.startsWith("prd-clg-l")) {
      fallbackKomisi = 15000;
      fallbackPoint = 1.5;
    } else if (cleanSku.startsWith("prd-clg-xl")) {
      fallbackKomisi = 20000;
      fallbackPoint = 2;
    } else if (cleanSku.startsWith("prd-clg-xxl")) {
      fallbackKomisi = 25000;
      fallbackPoint = 2.5;
    } else if (isBeautyProduct) {
      fallbackKomisi = Math.round((Number(entry.harga_item) || 0) * 0.10);
    }
    
    return { point: fallbackPoint, komisi: fallbackKomisi };
  }, [findProductInfo]);

  // Process the imported commissions and calculate points directly:
  // Rp 500.000 = 1 point and applies to multiples.
  // Group by date to aggregate omset if a user worked in multiple branches on the same day.
  const processedImportKomisiList = React.useMemo(() => {
    if ((!salaryData.importKomisi || salaryData.importKomisi.length === 0) && 
        (!salaryData.transaksiProd || salaryData.transaksiProd.length === 0)) {
      return [];
    }

    // Real data grouping by canonical date
    const groups: { [key: string]: { tanggal: string; rawEntries: any[]; rawProdEntries: any[] } } = {};
    
    if (salaryData.importKomisi && salaryData.importKomisi.length > 0) {
      salaryData.importKomisi.forEach((item) => {
        const d = parseDateHelper(item.tanggal, periode);
        const canonical = d 
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          : item.tanggal;
        
        if (!groups[canonical]) {
          groups[canonical] = {
            tanggal: item.tanggal,
            rawEntries: [],
            rawProdEntries: []
          };
        }
        groups[canonical].rawEntries.push(item);
      });
    }

    if (salaryData.transaksiProd && salaryData.transaksiProd.length > 0) {
      salaryData.transaksiProd.forEach((item) => {
        const d = parseDateHelper(item.tanggal, periode);
        const canonical = d 
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          : item.tanggal;
        
        if (groups[canonical]) {
          groups[canonical].rawProdEntries.push(item);
        } else {
          groups[canonical] = {
            tanggal: item.tanggal,
            rawEntries: [],
            rawProdEntries: [item]
          };
        }
      });
    }

    const list = Object.values(groups).map((group) => {
      const totalOmset = group.rawEntries.reduce((acc, curr) => acc + (Number(curr.omset) || 0), 0);
      const totalKomisi = group.rawEntries.reduce((acc, curr) => acc + (Number(curr.komisi) || 0), 0);
      const totalProd = group.rawProdEntries.reduce((acc, curr) => acc + (Number(curr.harga_item || 0) * Number(curr.jumlah || 1)), 0);
      
      const netLayanan = Math.max(0, totalOmset - totalProd);

       // Calculate product commission based on rules
      let komisiProduk = 0;
      group.rawProdEntries.forEach((entry) => {
        if (entry.komisi && Number(entry.komisi) > 0) {
          komisiProduk += Number(entry.komisi);
        } else {
          const info = getProductPointAndKomisi(entry);
          const qty = Number(entry.jumlah || 1);
          komisiProduk += info.komisi * qty;
        }
      });

      const komisiLayanan = Math.max(0, totalKomisi - komisiProduk);

      // RP 500.000 = 1 point and is relative/multiples of net Layanan Omset
      const calculatedPoint = Math.floor(netLayanan / 500000);

      return {
        tanggal: group.tanggal,
        omset: totalOmset,
        komisi: totalKomisi,
        komisiLayanan,
        komisiProduk,
        prod: totalProd,
        layanan: netLayanan,
        point: calculatedPoint,
        prodEntries: group.rawProdEntries,
      };
    });

    return list.sort((a, b) => {
      const dA = parseDateHelper(a.tanggal, periode);
      const dB = parseDateHelper(b.tanggal, periode);
      if (dA && dB) {
        return dA.getTime() - dB.getTime();
      }
      return a.tanggal.localeCompare(b.tanggal);
    });
  }, [salaryData.importKomisi, salaryData.transaksiProd, periode, daysInMonth, getProductPointAndKomisi]);

  // Point Bracket
  const tp = React.useMemo(() => {
    if (processedImportKomisiList.length > 0) {
      return processedImportKomisiList.reduce((acc, curr) => acc + curr.point, 0);
    }
    return salaryData.totalPoint || 0;
  }, [processedImportKomisiList, salaryData.totalPoint]);

  let pointMultiplier = 0;
  if (tp >= 1 && tp <= 10) pointMultiplier = 5000;
  else if (tp >= 11 && tp <= 20) pointMultiplier = 10000;
  else if (tp > 20) pointMultiplier = 15000;

  const totalPointRp = tp * pointMultiplier;

  const totalOmsetLayananMonth = React.useMemo(() => {
    return processedImportKomisiList.reduce((acc, curr) => acc + curr.layanan, 0);
  }, [processedImportKomisiList]);

  const totalProductsSold = React.useMemo(() => {
    return salaryData.transaksiProd.reduce((acc, curr) => acc + (Number(curr.jumlah) || 1), 0);
  }, [salaryData.transaksiProd]);

  const totalProductPointsSold = React.useMemo(() => {
    return salaryData.transaksiProd.reduce((acc, curr) => {
      const info = getProductPointAndKomisi(curr);
      const qty = Number(curr.jumlah || 1);
      return acc + (info.point * qty);
    }, 0);
  }, [salaryData.transaksiProd, getProductPointAndKomisi]);

  const targetLayananVal = React.useMemo(() => {
    const isPKL = salaryData.jabatan?.toLowerCase().includes('pkl');
    const baseTarget = salaryData.target_omset > 0 ? salaryData.target_omset : 0;
    
    if (isPKL || baseTarget === 0) return 0;
    return totalProductPointsSold >= 10 ? Math.min(6000000, baseTarget) : baseTarget;
  }, [salaryData.jabatan, salaryData.target_omset, totalProductPointsSold]);

  const hasReachedTarget = React.useMemo(() => {
    const isPKL = salaryData.jabatan?.toLowerCase().includes('pkl');
    const baseTarget = salaryData.target_omset > 0 ? salaryData.target_omset : 0;
    
    if (isPKL) return false;
    if (baseTarget === 0) return true;
    
    return (totalOmsetLayananMonth >= baseTarget) || (totalProductPointsSold >= 10 && totalOmsetLayananMonth >= 6000000);
  }, [salaryData.jabatan, salaryData.target_omset, totalOmsetLayananMonth, totalProductPointsSold]);

  const totalKomisiLayananMonth = React.useMemo(() => {
    return processedImportKomisiList.reduce((acc, curr) => acc + (curr.komisiLayanan || 0), 0);
  }, [processedImportKomisiList]);

  const totalKomisiProdukMonth = React.useMemo(() => {
    return processedImportKomisiList.reduce((acc, curr) => acc + (curr.komisiProduk || 0), 0);
  }, [processedImportKomisiList]);

  const [targetYear, targetMonth] = React.useMemo(() => {
    if (!periode || !periode.includes("-")) return [2026, 6];
    const [y, m] = periode.split("-");
    return [parseInt(y, 10), parseInt(m, 10)];
  }, [periode]);

  const isMonthPassed = React.useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    if (targetYear < currentYear) return true;
    if (targetYear === currentYear && targetMonth < currentMonth) return true;
    return false;
  }, [targetYear, targetMonth]);

  const monthNamesIndoSingkat = React.useMemo(() => ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"], []);

  const treatmentDailyList = React.useMemo(() => {
    const list = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const found = processedImportKomisiList.find((item) => {
        const d = parseDateHelper(item.tanggal, periode);
        return d && d.getDate() === day;
      });

      const displayDate = `${day} ${monthNamesIndoSingkat[targetMonth - 1] || ""}`;
      if (found) {
        list.push({
          day,
          tanggal: displayDate,
          layanan: found.layanan,
          komisiLayanan: found.komisiLayanan,
        });
      } else {
        list.push({
          day,
          tanggal: displayDate,
          layanan: 0,
          komisiLayanan: 0,
        });
      }
    }
    return list;
  }, [daysInMonth, targetMonth, processedImportKomisiList, periode, monthNamesIndoSingkat]);

  const productSalesList = React.useMemo(() => {
    return processedImportKomisiList.filter(item => item.prodEntries && item.prodEntries.length > 0);
  }, [processedImportKomisiList]);

  const payoutKomisiLayanan = hasReachedTarget ? totalKomisiLayananMonth : 0;
  const payoutKomisiProduk = totalKomisiProdukMonth;

  const totalPendapatan =
    pendapatanKehadiran +
    pendapatanDisiplin +
    pendapatanUangMakan +
    payoutKomisiLayanan +
    payoutKomisiProduk +
    totalKomisi +
    totalKomisiTambahan +
    totalPointRp +
    bonusGaji;

  // Potongan
  const potonganLiburWeekend = dLiburWeekend * gajiHarian;
  const potonganSetengahHariWeekday = dSetengahHariWeekday * (gajiHarian / 2);
  const potonganSetengahHariWeekend = dSetengahHariWeekend * gajiHarian;
  const totalKasbon = salaryData.listKasbon.reduce(
    (acc, curr) => acc + Number(curr.nominal),
    0,
  );

  const totalPotonganTanpaKasbon =
    potonganLiburWeekend +
    potonganSetengahHariWeekday +
    potonganSetengahHariWeekend;

  // Gaji Aktual
  const gajiAktual = totalPendapatan - totalPotonganTanpaKasbon;
  const sisaGaji = gajiAktual - totalKasbon;

  // Estimasi Maksimal
  const estimasiGajiMaksimal =
    hariKerja * (gajiHarian + salaryData.uangMakan + salaryData.bonusDisiplin) +
    100000;

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(angka);
  };

  const formatBulan = (periodeStr: string) => {
    if (!periodeStr || !periodeStr.includes("-")) return periodeStr || "";
    const [year, month] = periodeStr.split("-");
    const mIdx = parseInt(month, 10) - 1;
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    if (mIdx >= 0 && mIdx < 12) {
      return `${monthNames[mIdx]} ${year}`;
    }
    return periodeStr;
  };

  const formatTanggalIndo = (tglStr: string) => {
    if (!tglStr) return "-";
    const parts = tglStr.trim().split(/[-/]/);
    const indomonths = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    if (parts.length === 3) {
      const mid = parts[1].toLowerCase();
      const isMidNumeric = !isNaN(Number(parts[1]));
      
      if (!isMidNumeric) {
        const day = parseInt(parts[0], 10);
        const monthsShort = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];
        const monthsFull = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        
        let mIdx = monthsShort.findIndex((m) => mid.startsWith(m));
        if (mIdx === -1) {
          mIdx = monthsFull.findIndex((m) => mid.startsWith(m));
        }
        if (mIdx !== -1) {
          return `${day} ${indomonths[mIdx]}`;
        }
      }

      const mVal = parseInt(parts[0], 10);
      const dVal = parseInt(parts[1], 10);
      if (!isNaN(mVal) && !isNaN(dVal) && mVal >= 1 && mVal <= 12) {
        return `${dVal} ${indomonths[mVal - 1]}`;
      }
    }

    try {
      const d = new Date(tglStr);
      if (!isNaN(d.getTime())) {
        return `${d.getDate()} ${indomonths[d.getMonth()]}`;
      }
    } catch (e) {}

    return tglStr;
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in">
        <div className="w-16 h-16 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">
          Memuat Data Gaji...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-2xl mx-auto pb-24 px-2 text-left">
      {!showPointModal && !showCommissionModal && (
        <>
          <header className="px-2">
            <h2 className="text-3xl font-light text-white tracking-wide">
              Penghasilan
            </h2>
            <p className="text-emerald-glow text-[10px] tracking-[0.4em] uppercase mt-2 italic font-medium">
              Digital Slip System
            </p>
          </header>

      <div className="space-y-6">
        {/* FILTER PERIODE */}
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between">
            <label className="text-xs opacity-60 font-medium text-white ml-1">
              Filter Periode
            </label>
            {isFetchingMonths && (
              <div className="flex items-center gap-1.5 animate-pulse">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                <span className="text-[10px] text-emerald-glow font-bold uppercase tracking-widest">
                  Syncing Periods
                </span>
              </div>
            )}
          </div>
          <select
            value={periode}
            onChange={(e) => {
              const val = e.target.value;
              setPeriode(val);
              if (onPeriodChange) {
                onPeriodChange(val);
              }
            }}
            disabled={isFetchingMonths && availableMonths.length <= 1}
            className="glass-input !h-14 !rounded-2xl text-sm font-medium bg-black/60 border border-white/5 shadow-2xl w-full px-4 disabled:opacity-50"
          >
            {availableMonths.map((m, i) => (
              <option key={i} value={m}>
                {formatBulan(m)}
              </option>
            ))}
          </select>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("attendance-history")}
              className="mt-3 w-full glass-card p-4 !rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between hover:bg-emerald-500/20 active:scale-[0.98] transition-all text-left"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <p className="text-xs font-semibold text-emerald-glow">
                  Lihat Riwayat Absensi Periode Ini
                </p>
              </div>
              <span className="text-[10px] text-white/50 uppercase tracking-widest font-black">
                Buka Absen ➜
              </span>
            </button>
          )}
        </div>

        {/* SUMMARY CARD - ESTIMASI MAKSIMAL */}
        <div className="glass-card p-8 !rounded-[3rem] bg-emerald-500/10 border border-emerald-400/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 flex items-center justify-center">
            <span className="text-8xl font-light italic">Rp</span>
          </div>

          <div className="relative z-10 space-y-2">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] opacity-60 text-white italic">
              Estimasi Gaji Maksimal
            </h3>
            <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-400 mb-4">
              TANPA KOMISI & POINT
            </p>
            <h1 className="text-4xl font-light text-white tracking-normal">
              {formatRupiah(estimasiGajiMaksimal)}
            </h1>
            <p className="text-[9px] opacity-50 text-white mt-2 italic">
              *Jika hadir penuh & selalu disiplin
            </p>
          </div>
        </div>

        {/* SUMMARY CARD - GAJI AKTUAL */}
        <div className="glass-card p-8 !rounded-[3rem] bg-emerald-500/10 border border-emerald-400/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <svg
              width="100"
              height="100"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div className="relative z-10 space-y-2">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] opacity-60 text-white italic">
              Gaji Aktual Bulan Ini
            </h3>
            <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-400 mb-4">
              {formatBulan(periode).toUpperCase()}
            </p>
            <h1 className="text-4xl font-light text-white tracking-normal">
              {formatRupiah(gajiAktual)}
            </h1>

            <div className="mt-4 pt-4 border-t border-emerald-400/20 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-medium uppercase tracking-widest text-white/60">
                <span>Kasbon</span>
                <span className="text-orange-400 font-medium">
                  -{formatRupiah(totalKasbon)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold pt-1">
                <span className="text-white">Sisa Gaji</span>
                <span className="text-emerald-400 text-xl">
                  {formatRupiah(sisaGaji)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RINCIAN PENDAPATAN */}
        <div className="glass-card p-6 !rounded-[2rem] space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-white italic">
            Rincian Pendapatan Aktual
          </h3>

          <div className="space-y-4">
            <div className="border-b border-white/5 pb-3 space-y-1.5">
              <p className="text-sm font-bold text-white">
                Hadir (Semua Kehadiran)
              </p>
              <div className="flex justify-between items-center">
                <p className="text-[9px] opacity-60 uppercase tracking-widest">
                  {totalSemuaKehadiran} Hari × {formatRupiah(gajiHarian)}
                </p>
                <p className="text-sm font-bold text-emerald-400">
                  {formatRupiah(pendapatanKehadiran)}
                </p>
              </div>
            </div>

            <div className="border-b border-white/5 pb-3 space-y-1.5">
              <p className="text-sm font-bold text-white">
                Bonus Disiplin (15 mnt sebelum jam masuk)
              </p>
              <div className="flex justify-between items-center">
                <p className="text-[9px] opacity-60 uppercase tracking-widest">
                  {dHadirDisiplin} Hari ×{" "}
                  {formatRupiah(salaryData.bonusDisiplin)}
                </p>
                <p className="text-sm font-bold text-emerald-400">
                  {formatRupiah(pendapatanDisiplin)}
                </p>
              </div>
            </div>

            <div className="border-b border-white/5 pb-3 space-y-1.5">
              <p className="text-sm font-bold text-white">
                Uang Makan (Tidak telat atau 1/2 hari)
              </p>
              <div className="flex justify-between items-center">
                <p className="text-[9px] opacity-60 uppercase tracking-widest">
                  {totalHariUangMakan} Hari ×{" "}
                  {formatRupiah(salaryData.uangMakan)}
                </p>
                <p className="text-sm font-bold text-emerald-400">
                  {formatRupiah(pendapatanUangMakan)}
                </p>
              </div>
            </div>

            <div className="border-b border-white/5 pb-3 space-y-1.5">
              <p className="text-sm font-bold text-white">Bonus Absen</p>
              <div className="flex justify-between items-center">
                <p className="text-[9px] opacity-60 uppercase tracking-widest">
                  {bonusGaji === 300000 ? "ABSEN FULL 3 BULAN" : "ABSEN FULL"}
                </p>
                <p className="text-sm font-bold text-emerald-400">
                  {formatRupiah(bonusGaji)}
                </p>
              </div>
            </div>

            <div className="border-b border-white/5 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">Point Omset</p>
                </div>
                <button
                  onClick={() => setShowPointModal(true)}
                  className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 active:scale-95 transition-all px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Rincian
                </button>
              </div>
              {tp > 0 ? (
                <div className="flex justify-between items-center">
                  <p className="text-[9px] opacity-60 uppercase tracking-widest">
                    {tp} p × {formatRupiah(pointMultiplier)}
                  </p>
                  <p className="text-sm font-bold text-emerald-400">
                    {formatRupiah(totalPointRp)}
                  </p>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <p className="text-[9px] opacity-60 uppercase tracking-widest">
                    Belum ada point
                  </p>
                  <p className="text-sm font-bold text-emerald-400">
                    {formatRupiah(0)}
                  </p>
                </div>
              )}
            </div>

            {/* Simplified Komisi section */}
            <div className="border-b border-white/5 pb-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">Komisi</p>
                </div>
                <button
                  onClick={() => setShowCommissionModal(true)}
                  className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 active:scale-95 transition-all px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Rincian
                </button>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[9px] opacity-60 uppercase tracking-widest">
                  Total Komisi Bulan Ini
                </p>
                <p className="text-sm font-bold text-emerald-400">
                  {formatRupiah(payoutKomisiLayanan + payoutKomisiProduk + totalKomisiTambahan)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RINCIAN POTONGAN */}
        <div className="glass-card p-6 !rounded-[2rem] space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-white italic">
            Rincian Potongan
          </h3>

          <div className="space-y-4">
            <div className="border-b border-white/5 pb-3 space-y-1.5">
              <p className="text-sm font-bold text-white">Libur Hari Krusial</p>
              <div className="flex justify-between items-center">
                <p className="text-[9px] opacity-60 uppercase tracking-widest">
                  {dLiburWeekend} Hari × {formatRupiah(gajiHarian)}
                </p>
                <p className="text-sm font-bold text-orange-400">
                  -{formatRupiah(potonganLiburWeekend)}
                </p>
              </div>
            </div>

            <div className="border-b border-white/5 pb-3 space-y-1.5">
              <p className="text-sm font-bold text-white">1/2 Hari Weekday</p>
              <div className="flex justify-between items-center">
                <p className="text-[9px] opacity-60 uppercase tracking-widest">
                  {dSetengahHariWeekday} Hari × {formatRupiah(gajiHarian / 2)}
                </p>
                <p className="text-sm font-bold text-orange-400">
                  -{formatRupiah(potonganSetengahHariWeekday)}
                </p>
              </div>
            </div>

            <div className="border-b border-white/5 pb-3 space-y-1.5">
              <p className="text-sm font-bold text-white">1/2 Hari Krusial</p>
              <div className="flex justify-between items-center">
                <p className="text-[9px] opacity-60 uppercase tracking-widest">
                  {dSetengahHariWeekend} Hari × {formatRupiah(gajiHarian)}
                </p>
                <p className="text-sm font-bold text-orange-400">
                  -{formatRupiah(potonganSetengahHariWeekend)}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-white">Kasbon</p>
                <p className="text-sm font-bold text-orange-400">
                  -{formatRupiah(totalKasbon)}
                </p>
              </div>
              {salaryData.listKasbon.length > 0 && (
                <div className="bg-white/5 rounded-xl p-3 space-y-2">
                  {salaryData.listKasbon.map((k, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-start text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="text-white/80">{k.keterangan}</p>
                        <p className="text-[9px] text-white/40">{k.tanggal}</p>
                      </div>
                      <p className="text-orange-400/80 font-medium">
                        -{formatRupiah(k.nominal)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* INFO DASAR */}
        <div className="glass-card p-6 !rounded-[2rem] space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-white italic mb-6">
            Parameter Perhitungan
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[9px] opacity-60 uppercase tracking-widest">
                Gaji Pokok / Bulan
              </p>
              <p className="text-xs font-bold text-white">
                {formatRupiah(salaryData.gajiPokok)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] opacity-60 uppercase tracking-widest">
                Uang Makan / Hari
              </p>
              <p className="text-xs font-bold text-white">
                {formatRupiah(salaryData.uangMakan)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] opacity-60 uppercase tracking-widest">
                Bonus Disiplin / Hari
              </p>
              <p className="text-xs font-bold text-white">
                {formatRupiah(salaryData.bonusDisiplin)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] opacity-60 uppercase tracking-widest">
                Hari Kerja
              </p>
              <p className="text-xs font-bold text-white flex flex-col gap-0.5">
                <span>
                  {daysInMonth} - 3 = {hariKerja} Hari
                </span>
                <span className="text-[8px] font-normal text-white/50 leading-tight block normal-case">
                  Rumus: jumlah hari bulan ini - jatah libur
                </span>
              </p>
            </div>
            <div className="space-y-1 col-span-2 bg-white/5 p-3 rounded-xl mt-2">
              <p className="text-[9px] opacity-60 uppercase tracking-widest mb-1">
                Cara Hitung Gaji Harian
              </p>
              <p className="text-xs font-bold text-white tracking-widest leading-relaxed">
                {formatRupiah(salaryData.gajiPokok)} / {hariKerja} ={" "}
                <span className="text-emerald-400">
                  {formatRupiah(gajiHarian)}
                </span>
              </p>
            </div>
            <div className="space-y-2 col-span-2 bg-white/5 p-4 rounded-xl mt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 text-white mb-2 flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Nilai point omset
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-black/30 p-2 py-3 rounded-lg border border-white/5">
                  <p className="text-[9px] opacity-60 uppercase tracking-widest mb-1">
                    1 - 10
                  </p>
                  <p className="text-xs font-bold text-white">Rp 5.000 / Pt</p>
                </div>
                <div className="bg-black/30 p-2 py-3 rounded-lg border border-white/5">
                  <p className="text-[9px] opacity-60 uppercase tracking-widest mb-1">
                    11 - 20
                  </p>
                  <p className="text-xs font-bold text-white">Rp 10.000 / Pt</p>
                </div>
                <div className="bg-black/30 p-2 py-3 rounded-lg border border-white/5">
                  <p className="text-[9px] opacity-60 uppercase tracking-widest mb-1">
                    &gt; 20 PT
                  </p>
                  <p className="text-xs font-bold text-white">
                    Rp 15.000 / Pt 🚀
                  </p>
                </div>
              </div>
              <p className="text-[9px] opacity-50 mt-3 pt-2 border-t border-white/10 text-center">
                1 point didapatkan dari omset kelipatan Rp 500.000/hari
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 pb-2 flex justify-center w-full">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="glass-button !py-3.5 !px-8 flex items-center justify-center gap-2 text-sm text-white w-full rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 transition-all font-medium"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {isDownloading ? 'Memproses PDF...' : 'Download Slip Gaji'}
          </button>
        </div>

      </div>
        </>
      )}

      {/* MODAL POINT DETAIL */}
      {showPointModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card !rounded-[2rem] w-full max-w-md p-6 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl relative">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                className="text-emerald-400"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Rincian Point Omset Harian
            </h3>

            <div className="overflow-y-auto flex-1 my-3 pr-1 max-h-[45vh]">
              {processedImportKomisiList.length === 0 ? (
                <div className="py-8 text-center text-white/40 text-xs">
                  Tidak ada data rincian point.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 uppercase tracking-wider text-[9px]">
                      <th className="py-2 text-left font-medium">Tanggal / Rincian</th>
                      <th className="py-2 text-right font-medium">Omset Treatment</th>
                      <th className="py-2 text-right font-medium">Nilai Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {processedImportKomisiList.map((item, idx) => (
                      <tr
                        key={idx}
                        className="text-white/85 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 text-left font-medium">
                          <div>
                            <p className="font-semibold text-white/90">
                              {formatTanggalIndo(item.tanggal)}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono text-white/80">
                          {formatRupiah(item.layanan)}
                        </td>
                        <td className="py-3 text-right text-emerald-400 font-bold font-mono">
                          {item.point} Pt
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="border-t border-white/5 pt-4 mt-auto space-y-4">
              {/* Rules summary of points */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-[10px] space-y-1.5">
                <p className="font-extrabold text-white/40 uppercase tracking-widest text-[8px] text-center">
                  Aturan Nilai Point Omset:
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-center font-bold">
                  <div className="bg-black/20 p-1.5 rounded-lg border border-white/5">
                    <p className="text-white/40 text-[7px] tracking-wider">
                      1 - 10 PT
                    </p>
                    <p className="text-white text-[9px]">Rp 5.000 / Pt</p>
                  </div>
                  <div className="bg-black/20 p-1.5 rounded-lg border border-white/5">
                    <p className="text-white/40 text-[7px] tracking-wider">
                      11 - 20 PT
                    </p>
                    <p className="text-white text-[9px]">Rp 10.000 / Pt</p>
                  </div>
                  <div className="bg-black/20 p-1.5 rounded-lg border border-white/5">
                    <p className="text-white/40 text-[7px] tracking-wider">
                      &gt; 20 PT
                    </p>
                    <p className="text-white text-[9px]">Rp 15.000 / Pt</p>
                  </div>
                </div>
              </div>

              {/* Total calculations */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs text-white/60">
                  <span>Total Point Terkumpul</span>
                  <span className="text-emerald-400 font-bold">{tp} Point</span>
                </div>
                <div className="flex justify-between items-center text-xs text-white/60">
                  <span>Nilai per Point (Bracket)</span>
                  <span className="text-white font-medium">
                    {formatRupiah(pointMultiplier)} / Pt
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                  <span className="text-white font-semibold shrink-0">Total Point</span>
                  <span className="text-emerald-400 font-black text-right text-sm md:text-base ml-2">
                    {tp}pt x {formatRupiah(pointMultiplier)} = {formatRupiah(totalPointRp)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowPointModal(false)}
                className="w-full bg-white/5 border border-white/10 active:scale-95 text-white/80 transition-all font-bold py-3 px-4 rounded-xl text-xs flex justify-center items-center hover:bg-white/10"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KOMISI DETAIL */}
      {showCommissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-card !rounded-[2rem] w-full max-w-md p-6 overflow-hidden max-h-[90vh] flex flex-col shadow-2xl relative bg-[#0c0c0e] border border-white/10">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  className="text-emerald-400"
                >
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                Rincian Komisi
              </h3>
              <button
                type="button"
                onClick={() => setShowCommissionModal(false)}
                className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
                id="close-commission-modal-btn"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Scrollable Container for all modal body content */}
            <div className="overflow-y-auto flex-1 my-2 pr-1 space-y-4 relative scrollbar-thin">
              {/* Target Omset Treatment */}
              {!isPKL && (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white/90">Target Omset Treatment</p>
                      <span className={`inline-block text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full ${
                        hasReachedTarget 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                          : (isMonthPassed 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' 
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/20')
                      }`}>
                        {hasReachedTarget 
                          ? "Tercapai 🚀" 
                          : (isMonthPassed ? "Tak Tercapai" : "Berjalan")}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-white/80">
                      {targetLayananVal > 0 ? Math.round(((totalOmsetLayananMonth || 0) / targetLayananVal) * 100) : 100}%
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        hasReachedTarget 
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' 
                          : (isMonthPassed 
                              ? 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]' 
                              : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]')
                      }`}
                      style={{ width: `${targetLayananVal > 0 ? Math.min(100, Math.max(0, ((totalOmsetLayananMonth || 0) / targetLayananVal) * 100)) : 100}%` }}
                    />
                  </div>
                  
                  <div className="space-y-1 text-[10px] font-mono text-white/50">
                    <div className="flex justify-between">
                      <span>Omset Treatment:</span>
                      <span className="text-white/80 font-bold">{formatRupiah(totalOmsetLayananMonth)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Poin Produk Terjual:</span>
                      <span className={`font-bold ${totalProductPointsSold >= 10 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {totalProductPointsSold} / 10 Poin
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-1 mt-1 text-[11px]">
                      <span>Target Minimal:</span>
                      <span className="text-white/95 font-bold">
                        {salaryData.target_omset === 0 ? "Tanpa Target" : formatRupiah(targetLayananVal)}
                      </span>
                    </div>
                    <div className="text-[9px] text-white/35 italic pt-1 leading-relaxed">
                      {salaryData.target_omset === 0 
                        ? "* Karyawan ini tidak memiliki syarat target omset untuk komisi." 
                        : "* Target omset disesuaikan dari master data (Menjadi Rp 6.000.000 jika poin produk ≥ 10)"}
                    </div>
                  </div>
                </div>
              )}

              {/* Transparent Dual Tabs for Treatment, Produk vs Tambahan */}
              <div className="py-1">
                <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl">
                  <button
                    type="button"
                    onClick={() => !isPKL && setCommissionActiveTab('treatment')}
                    disabled={isPKL}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      commissionActiveTab === 'treatment'
                        ? 'bg-emerald-400/20 text-emerald-400 shadow-sm border border-emerald-400/20'
                        : isPKL
                          ? 'text-white/20 cursor-not-allowed opacity-50'
                          : 'text-white/60 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    Treatment
                  </button>
                  <button
                    type="button"
                    onClick={() => !isPKL && setCommissionActiveTab('produk')}
                    disabled={isPKL}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      commissionActiveTab === 'produk'
                        ? 'bg-emerald-400/20 text-emerald-400 shadow-sm border border-emerald-400/20'
                        : isPKL
                          ? 'text-white/20 cursor-not-allowed opacity-50'
                          : 'text-white/60 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    Produk
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommissionActiveTab('tambahan')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      commissionActiveTab === 'tambahan'
                        ? 'bg-emerald-400/20 text-emerald-400 shadow-sm border border-emerald-400/20'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.02]'
                    }`}
                  >
                    Tambahan
                  </button>
                </div>
              </div>

              {/* Tab Contents */}
              <div className="space-y-3">
                {isPKL && commissionActiveTab !== 'tambahan' ? (
                  <div className="py-12 text-center text-white/40 text-xs">
                    Karyawan PKL tidak memiliki komisi treatment/produk.
                  </div>
                ) : commissionActiveTab === 'treatment' ? (
                  /* Treatment Tab Content: full 1-30/31 days list */
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Daftar Treatment Tanggal 1-{daysInMonth}</p>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5">
                      <table className="w-full text-xs text-white/85 border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-white/40 text-[9px] uppercase tracking-wider font-bold">
                            <th className="py-2 text-left font-semibold">Tanggal</th>
                            <th className="py-2 text-right font-semibold">Omset</th>
                            <th className="py-2 text-right font-semibold">Komisi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-mono">
                          {treatmentDailyList.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-2 text-left font-sans text-white/70">{item.tanggal}</td>
                              <td className="py-2 text-right">
                                {item.layanan > 0 ? (
                                  <span className="text-white/90">{formatRupiah(item.layanan)}</span>
                                ) : (
                                  <span className="text-white/20">Rp 0</span>
                                )}
                              </td>
                              <td className="py-2 text-right">
                                {item.komisiLayanan > 0 ? (
                                  <span className="text-emerald-400 font-bold">{formatRupiah(item.komisiLayanan)}</span>
                                ) : (
                                  <span className="text-white/20">Rp 0</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : commissionActiveTab === 'produk' ? (
                  /* Produk Tab Content: show dates with product sales AND the reference table */
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Penjualan Produk</p>
                      {productSalesList.length === 0 ? (
                        <div className="py-12 text-center text-white/40 text-xs bg-white/5 border border-white/5 rounded-2xl">
                          Tidak ada penjualan produk pada periode ini.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {productSalesList.map((item, idx) => {
                            const totalDayPts = item.prodEntries.reduce((sum: number, p: any) => sum + (getProductPointAndKomisi(p).point * Number(p.jumlah || 1)), 0);
                            return (
                              <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                  <span className="font-bold text-white/95 text-xs">
                                    {formatTanggalIndo(item.tanggal)}
                                  </span>
                                  <span className="text-emerald-400 text-[10px] font-black bg-emerald-400/10 px-2 py-0.5 rounded-full">
                                    +{totalDayPts} Poin
                                  </span>
                                </div>

                                <div className="space-y-2.5 divide-y divide-white/5">
                                  {item.prodEntries.map((prod: any, pIdx: number) => {
                                    const info = getProductPointAndKomisi(prod);
                                    const qty = Number(prod.jumlah || 1);
                                    const pts = info.point * qty;
                                    const comm = (prod.komisi && Number(prod.komisi) > 0) ? Number(prod.komisi) : (info.komisi * qty);
                                    return (
                                      <div key={pIdx} className={`flex justify-between items-start text-xs ${pIdx > 0 ? "pt-2.5" : ""}`}>
                                        <div className="flex-1 min-w-0 pr-2">
                                          <span className="font-semibold text-white/90 truncate block text-[11px]">
                                            {prod.item || prod.sku || "Produk"}
                                          </span>
                                          <span className="text-[10px] text-white/40 block mt-0.5">
                                            {qty} pcs @ {formatRupiah(Number(prod.harga_item) || 0)}
                                          </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="text-white font-mono block font-medium">{formatRupiah(comm)}</span>
                                          <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
                                            {pts > 0 ? `+${pts} Pt` : "0 Pt"}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* REFERENSI POIN & KOMISI PRODUK */}
                    <div className="space-y-3 pt-2" id="referensi-poin-komisi">
                      <p className="text-[10px] font-bold text-[#a1a1aa] uppercase tracking-widest italic">
                        REFERENSI POIN & KOMISI PRODUK
                      </p>
                      <div className="bg-white/5 border border-white/5 rounded-3xl p-4">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/10 text-white/40 text-[9px] uppercase tracking-wider font-bold">
                              <th className="py-2 text-left font-semibold w-1/2">Nama Produk</th>
                              <th className="py-2 text-center font-semibold">Poin</th>
                              <th className="py-2 text-right font-semibold">Komisi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {pointProdukList.map((item, idx) => (
                              <tr key={idx} className="hover:bg-white/[0.02] transition-colors" id={`product-ref-row-${idx}`}>
                                <td className="py-3 text-left font-bold text-white/90 text-xs pr-2">
                                  {item.produk}
                                </td>
                                <td className="py-3 text-center font-mono font-bold text-[#10b981] text-xs">
                                  {item.point} Pt
                                </td>
                                <td className="py-3 text-right font-mono text-white/80 text-xs">
                                  {formatRupiah(item.komisi)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Tambahan Tab Content */
                  <div className="space-y-4">
                    {/* Komisi Tambahan Section */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Komisi Tambahan</p>
                      {salaryData.listKomisiTambahan && salaryData.listKomisiTambahan.length > 0 ? (
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 space-y-3 divide-y divide-white/5 max-h-[40vh] overflow-y-auto scrollbar-thin">
                          {salaryData.listKomisiTambahan.map((k, idx) => (
                            <div key={idx} className={`flex justify-between items-start text-xs ${idx > 0 ? "pt-3" : ""}`}>
                              <div className="space-y-1">
                                <p className="text-white/80 text-[11px] font-semibold leading-relaxed">{k.keterangan || "Komisi Tambahan"}</p>
                                <p className="text-[9px] text-white/40 font-mono">{formatTanggalIndo(k.tanggal)}</p>
                              </div>
                              <p className="text-emerald-400 font-bold font-mono text-xs shrink-0 whitespace-nowrap">
                                +{formatRupiah(k.nominal)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-white/40 text-xs bg-white/5 border border-white/5 rounded-2xl">
                          Tidak ada komisi tambahan pada periode ini.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 mt-auto space-y-4 shrink-0">
              {/* Summary calculations */}
              <div className="space-y-2">
                {!isPKL && (
                  <>
                    <div className="flex justify-between items-center text-xs text-white/60">
                      <div className="flex items-center gap-2">
                        <span>Total Komisi Treatment</span>
                        <span className={`text-[8px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded-full ${hasReachedTarget ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {hasReachedTarget ? 'Cair' : 'Tidak Cair'}
                        </span>
                      </div>
                      <span className="text-white font-medium">{formatRupiah(totalKomisiLayananMonth)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-white/60">
                      <div className="flex items-center gap-2">
                        <span>Total Komisi Produk</span>
                        <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded-full">
                          Selalu Cair
                        </span>
                      </div>
                      <span className="text-white font-medium">{formatRupiah(totalKomisiProdukMonth)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-white/60">
                      <div className="flex items-center gap-2">
                        <span>Total Point Produk</span>
                        <span className={`text-[8px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded-full ${totalProductPointsSold >= 10 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {totalProductPointsSold >= 10 ? '≥ 10 Poin' : 'Kurang'}
                        </span>
                      </div>
                      <span className="text-white font-medium font-mono">{totalProductPointsSold} Poin</span>
                    </div>
                  </>
                )}

                {(totalKomisiTambahan > 0 || isPKL) && (
                  <div className="flex justify-between items-center text-xs text-white/60">
                    <div className="flex items-center gap-2">
                      <span>Total Komisi Tambahan</span>
                      <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded-full">
                        Selalu Cair
                      </span>
                    </div>
                    <span className="text-white font-medium">{formatRupiah(totalKomisiTambahan)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm pt-2.5 border-t border-white/5">
                  <span className="text-white font-semibold">Total Komisi Cair</span>
                  <span className="text-emerald-400 font-bold text-sm md:text-base">
                    {formatRupiah(payoutKomisiLayanan + payoutKomisiProduk + totalKomisiTambahan)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Slip Template */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        <div 
          ref={slipRef} 
          style={{ 
            width: "700px", 
            padding: "40px", 
            backgroundColor: "#fff", 
            color: "#1f2937", 
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif" 
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", borderBottom: "2px solid #e5e7eb", paddingBottom: "20px" }}>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: "500", color: "#111827", margin: 0, letterSpacing: "-0.5px" }}>PT FLOW KOSMETIKA INDONESIA</h1>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: "4px 0 0 0", fontWeight: "500", textTransform: "uppercase", letterSpacing: "1px" }}>Digital Slip System</p>
            </div>
            <div style={{ textAlign: "right", backgroundColor: "#f3f4f6", padding: "10px 16px", borderRadius: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "500", color: "#111827" }}>SLIP GAJI</h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#4b5563", fontWeight: "500" }}>{formatBulan(periode).toUpperCase()}</p>
            </div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px", fontSize: "14px", backgroundColor: "#f9fafb", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
            <div style={{ width: "50%" }}>
              <table style={{ width: "100%", fontSize: "13px" }}>
                <tbody>
                  <tr><td style={{ padding: "4px 0", color: "#6b7280", width: "100px", verticalAlign: "top" }}>Nama</td><td style={{ padding: "4px 0", color: "#6b7280", width: "10px", verticalAlign: "top" }}>:</td><td style={{ padding: "4px 0", fontWeight: "500", color: "#111827", verticalAlign: "top" }}>{user?.nama || "Karyawan"}</td></tr>
                  <tr><td style={{ padding: "4px 0", color: "#6b7280", width: "100px", verticalAlign: "top" }}>Jabatan</td><td style={{ padding: "4px 0", color: "#6b7280", width: "10px", verticalAlign: "top" }}>:</td><td style={{ padding: "4px 0", fontWeight: "500", color: "#111827", verticalAlign: "top" }}>{salaryData.jabatan || "-"}</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ width: "50%" }}>
              <table style={{ width: "100%", fontSize: "13px" }}>
                <tbody>
                  <tr><td style={{ padding: "4px 0", color: "#6b7280", width: "100px", verticalAlign: "top" }}>Tanggal Cetak</td><td style={{ padding: "4px 0", color: "#6b7280", width: "10px", verticalAlign: "top" }}>:</td><td style={{ padding: "4px 0", fontWeight: "500", color: "#111827", verticalAlign: "top" }}>{new Date().toLocaleDateString('id-ID')}</td></tr>
                  <tr><td style={{ padding: "4px 0", color: "#6b7280", width: "100px", verticalAlign: "top" }}>Status</td><td style={{ padding: "4px 0", color: "#6b7280", width: "10px", verticalAlign: "top" }}>:</td><td style={{ padding: "4px 0", fontWeight: "500", color: "#059669", verticalAlign: "top" }}>CONFIDENTIAL</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", gap: "40px", marginBottom: "30px" }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "14px", fontWeight: "500", color: "#111827", borderBottom: "2px solid #111827", paddingBottom: "8px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rincian Pendapatan</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", color: "#374151" }}>Hadir ({totalSemuaKehadiran} Hari)</td>
                    <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500" }}>{formatRupiah(pendapatanKehadiran)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "#374151", borderTop: "1px dashed #e5e7eb" }}>Bonus Disiplin ({dHadirDisiplin} Hari)</td>
                    <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500", borderTop: "1px dashed #e5e7eb" }}>{formatRupiah(pendapatanDisiplin)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "#374151", borderTop: "1px dashed #e5e7eb" }}>Uang Makan ({totalHariUangMakan} Hari)</td>
                    <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500", borderTop: "1px dashed #e5e7eb" }}>{formatRupiah(pendapatanUangMakan)}</td>
                  </tr>
                  {totalPointRp > 0 && (
                    <tr>
                      <td style={{ padding: "8px 0", color: "#374151", borderTop: "1px dashed #e5e7eb" }}>Point Omset ({tp} Point)</td>
                      <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500", borderTop: "1px dashed #e5e7eb" }}>{formatRupiah(totalPointRp)}</td>
                    </tr>
                  )}
                  {(payoutKomisiLayanan + payoutKomisiProduk + totalKomisiTambahan) > 0 && (
                    <tr>
                      <td style={{ padding: "8px 0", color: "#374151", borderTop: "1px dashed #e5e7eb" }}>Komisi (Layanan & Produk)</td>
                      <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500", borderTop: "1px dashed #e5e7eb" }}>{formatRupiah(payoutKomisiLayanan + payoutKomisiProduk + totalKomisiTambahan)}</td>
                    </tr>
                  )}
                  {bonusGaji > 0 && (
                    <tr>
                      <td style={{ padding: "8px 0", color: "#374151", borderTop: "1px dashed #e5e7eb" }}>Bonus Absen</td>
                      <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500", borderTop: "1px dashed #e5e7eb" }}>{formatRupiah(bonusGaji)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "14px", fontWeight: "500", color: "#111827", borderBottom: "2px solid #111827", paddingBottom: "8px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Rincian Potongan</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <tbody>
                  {potonganLiburWeekend > 0 && (
                    <tr>
                      <td style={{ padding: "8px 0", color: "#374151" }}>Libur Hari Krusial ({dLiburWeekend} Hari)</td>
                      <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500", color: "#dc2626" }}>-{formatRupiah(potonganLiburWeekend)}</td>
                    </tr>
                  )}
                  {potonganSetengahHariWeekday > 0 && (
                    <tr>
                      <td style={{ padding: "8px 0", color: "#374151", borderTop: potonganLiburWeekend > 0 ? "1px dashed #e5e7eb" : "none" }}>1/2 Hari Weekday ({dSetengahHariWeekday} Hari)</td>
                      <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500", color: "#dc2626", borderTop: potonganLiburWeekend > 0 ? "1px dashed #e5e7eb" : "none" }}>-{formatRupiah(potonganSetengahHariWeekday)}</td>
                    </tr>
                  )}
                  {potonganSetengahHariWeekend > 0 && (
                    <tr>
                      <td style={{ padding: "8px 0", color: "#374151", borderTop: (potonganLiburWeekend > 0 || potonganSetengahHariWeekday > 0) ? "1px dashed #e5e7eb" : "none" }}>1/2 Hari Krusial ({dSetengahHariWeekend} Hari)</td>
                      <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500", color: "#dc2626", borderTop: (potonganLiburWeekend > 0 || potonganSetengahHariWeekday > 0) ? "1px dashed #e5e7eb" : "none" }}>-{formatRupiah(potonganSetengahHariWeekend)}</td>
                    </tr>
                  )}
                  {(potonganLiburWeekend === 0 && potonganSetengahHariWeekday === 0 && potonganSetengahHariWeekend === 0) && (
                    <tr>
                      <td style={{ padding: "8px 0", color: "#9ca3af", fontStyle: "italic" }}>Tidak ada potongan non-kasbon</td>
                      <td style={{ textAlign: "right", padding: "8px 0", color: "#9ca3af" }}>-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <div style={{ width: "50%", padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", fontWeight: "500", color: "#111827" }}>Total Gaji</td>
                    <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500", color: "#111827", fontSize: "16px" }}>{formatRupiah(gajiAktual)}</td>
                  </tr>
                  {totalKasbon > 0 && (
                    <tr>
                      <td style={{ padding: "8px 0", fontWeight: "500", color: "#374151", borderTop: "1px dashed #d1d5db" }}>Potongan Kasbon</td>
                      <td style={{ textAlign: "right", padding: "8px 0", fontWeight: "500", color: "#dc2626", borderTop: "1px dashed #d1d5db" }}>-{formatRupiah(totalKasbon)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ padding: "16px 0 8px 0", fontWeight: "500", color: "#111827", fontSize: "16px", borderTop: "2px solid #d1d5db" }}>Sisa Gaji</td>
                    <td style={{ textAlign: "right", padding: "16px 0 8px 0", fontWeight: "500", color: "#059669", fontSize: "20px", borderTop: "2px solid #d1d5db" }}>{formatRupiah(sisaGaji)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div style={{ marginTop: "60px", display: "flex", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center", width: "200px" }}>
              <p style={{ margin: "0 0 70px 0", fontSize: "13px", color: "#4b5563", fontWeight: "500" }}>Diterima Oleh,</p>
              <div style={{ borderBottom: "1px solid #111827", width: "100%", margin: "0 auto", paddingBottom: "4px" }}>
                <p style={{ margin: 0, fontWeight: "500", fontSize: "14px", color: "#111827" }}>{user?.nama || "Karyawan"}</p>
              </div>
            </div>
            <div style={{ textAlign: "center", width: "200px" }}>
              <p style={{ margin: "0 0 70px 0", fontSize: "13px", color: "#4b5563", fontWeight: "500" }}>Disetujui Oleh,</p>
              <div style={{ borderBottom: "1px solid #111827", width: "100%", margin: "0 auto", paddingBottom: "4px" }}>
                <p style={{ margin: 0, fontWeight: "500", fontSize: "14px", color: "#111827" }}>HR / Finance</p>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: "40px", fontSize: "11px", color: "#9ca3af", textAlign: "center", borderTop: "1px dashed #e5e7eb", paddingTop: "16px" }}>
            Dokumen ini diterbitkan secara otomatis oleh sistem digital PT Flow Kosmetika Indonesia dan sah tanpa stempel basah.
            <br />
            Harap simpan dengan baik sebagai bukti penerimaan gaji.
          </div>
        </div>
      </div>
    </div>
  );
};
