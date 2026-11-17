
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/apiService';
import { User } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ClipboardCheck, BarChart2, Calendar, TrendingUp, Clock, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../services/storageHelper';

interface TaskStatus {
  done: boolean;
  locked: boolean;
  time?: string;
  timestamp?: string;
}

const parseChecklistDate = (dateStr: any): Date | null => {
  try {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
    const s = String(dateStr).trim();
    const isoTry = new Date(s);
    if (!isNaN(isoTry.getTime()) && s.includes('T')) return isoTry;
    const datePart = s.split(/[ ,T]+/)[0]; 
    const bits = datePart.split(/[\/\-\.]/);
    if (bits.length === 3) {
      let d, m, y;
      const b0 = parseInt(bits[0]);
      const b1 = parseInt(bits[1]);
      const b2 = parseInt(bits[2]);
      if (bits[2].length === 4) {
        if (b0 > 12) { d = b0; m = b1; y = b2; } else { m = b0; d = b1; y = b2; }
      } else if (bits[0].length === 4) {
        y = b0; m = b1; d = b2;
      } else { return null; }
      const parsedDate = new Date(y, m - 1, d);
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }
    return null;
  } catch (e) { return null; }
};

const getWIBDate = (d = new Date()): Date => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
    const parts = formatter.formatToParts(d);
    const map: Record<string, number> = {};
    parts.forEach(p => {
      if (p.type !== 'literal') {
        map[p.type] = parseInt(p.value, 10);
      }
    });
    return new Date(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  } catch (e) {
    return new Date(d);
  }
};

const countDoneFromLog = (logItem: any): number => {
  if (logItem.data_laporan_json) {
    try {
      const data = JSON.parse(logItem.data_laporan_json);
      return Object.values(data).filter((s: any) => s.done).length;
    } catch (e) {}
  }
  if (logItem.ringkasan) {
    const match = String(logItem.ringkasan).match(/^(\d+)\s+dari\s+(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 0;
};

const countTotalFromLog = (logItem: any): number => {
  if (logItem.ringkasan) {
    const match = String(logItem.ringkasan).match(/^(\d+)\s+dari\s+(\d+)/i);
    if (match) {
      return parseInt(match[2], 10);
    }
  }
  if (logItem.data_laporan_json) {
    try {
      const data = JSON.parse(logItem.data_laporan_json);
      return Object.keys(data).length;
    } catch (e) {}
  }
  return 0;
};

const getPeriodKey = (date: Date, period: 'Harian' | 'Mingguan' | 'Bulanan'): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  if (period === 'Harian') {
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (period === 'Bulanan') {
    return `${y}-${m}`;
  }
  const getMonday = (d: Date) => {
    const temp = new Date(d);
    const day = temp.getDay();
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(temp.setDate(diff));
    mon.setHours(0,0,0,0);
    return mon;
  };
  const monday = getMonday(date);
  const monY = monday.getFullYear();
  const monM = (monday.getMonth() + 1).toString().padStart(2, '0');
  const monD = monday.getDate().toString().padStart(2, '0');
  return `W-${monY}-${monM}-${monD}`;
};

const getPastPeriodTimestamp = (periodKey: string, periodType: 'Harian' | 'Mingguan' | 'Bulanan'): string => {
  if (periodType === 'Harian') {
    const parts = periodKey.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const dy = parseInt(parts[2], 10);
      const d = new Date(yr, mo, dy, 23, 59, 59);
      return d.toISOString();
    }
  } else if (periodType === 'Bulanan') {
    const parts = periodKey.split('-');
    if (parts.length === 2) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10); 
      const d = new Date(yr, mo, 0, 23, 59, 59);
      return d.toISOString();
    }
  } else if (periodType === 'Mingguan') {
    const cleanKey = periodKey.replace('W-', '');
    const parts = cleanKey.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const dy = parseInt(parts[2], 10);
      const mondayDate = new Date(yr, mo, dy);
      const sundayDate = new Date(mondayDate.setDate(mondayDate.getDate() + 6));
      const d = new Date(sundayDate.getFullYear(), sundayDate.getMonth(), sundayDate.getDate(), 23, 59, 59);
      return d.toISOString();
    }
  }
  return getWIBDate().toISOString();
};

export const Checklist: React.FC<{ user: User, tugasMaster: any[] }> = ({ user, tugasMaster }) => {
  const [activeView, setActiveView] = useState<'isi' | 'riwayat'>('isi');
  const [activeTab, setActiveTab] = useState<'Harian' | 'Mingguan' | 'Bulanan'>('Harian');
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [completed, setCompleted] = useState<Record<string, TaskStatus>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedFilterType, setSelectedFilterType] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [showAllTasksStats, setShowAllTasksStats] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const autoSaveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const userJabatanParts = useMemo(() => {
    return (user.jabatan || '').split(',').map(s => s.trim()).filter(Boolean);
  }, [user.jabatan]);

  const isSamePeriod = (timestamp: string, period: string) => {
    const d = parseChecklistDate(timestamp);
    if (!d) return false;
    const now = getWIBDate();
    const dZero = new Date(d); dZero.setHours(0,0,0,0);
    const nowZero = new Date(now); nowZero.setHours(0,0,0,0);

    if (period === 'Harian') return dZero.getTime() === nowZero.getTime();
    if (period === 'Bulanan') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'Mingguan') {
       const getMonday = (date: Date) => {
         const temp = new Date(date);
         const day = temp.getDay();
         const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
         const monday = new Date(temp.setDate(diff));
         monday.setHours(0,0,0,0);
         return monday.getTime();
       };
       return getMonday(d) === getMonday(now);
    }
    return false;
  };

  const monthFullNames = useMemo(() => [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ], []);

  const monthsList = useMemo(() => {
    const list = Array.from(new Set(historyLogs.map((row: any) => {
      const dateObj = parseChecklistDate(row.waktu);
      if (!dateObj) return "";
      return `${monthFullNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    }))).filter(Boolean) as string[];

    const now = getWIBDate();
    const currentMonthStr = `${monthFullNames[now.getMonth()]} ${now.getFullYear()}`;
    if (!list.includes(currentMonthStr)) {
      list.unshift(currentMonthStr);
    }
    return list;
  }, [historyLogs, monthFullNames]);

  useEffect(() => {
    if (monthsList.length > 0 && !selectedMonth) {
      setSelectedMonth(monthsList[0]);
    }
  }, [monthsList, selectedMonth]);

  const getQuarterName = (monthIndex: number): string => {
    if (monthIndex >= 0 && monthIndex <= 2) return 'Q1';
    if (monthIndex >= 3 && monthIndex <= 5) return 'Q2';
    if (monthIndex >= 6 && monthIndex <= 8) return 'Q3';
    return 'Q4';
  };

  const yearsList = useMemo(() => {
    const list = Array.from(new Set(historyLogs.map((row: any) => {
      const dateObj = parseChecklistDate(row.waktu);
      return dateObj ? `${dateObj.getFullYear()}` : "";
    }))).filter(Boolean) as string[];

    const currentYearStr = `${getWIBDate().getFullYear()}`;
    if (!list.includes(currentYearStr)) {
      list.unshift(currentYearStr);
    }
    return list.sort((a,b) => parseInt(b) - parseInt(a));
  }, [historyLogs]);

  const quartersList = useMemo(() => {
    const list: string[] = [];
    yearsList.forEach(yr => {
      list.push(`Q1 ${yr}`, `Q2 ${yr}`, `Q3 ${yr}`, `Q4 ${yr}`);
    });
    return list;
  }, [yearsList]);

  useEffect(() => {
    if (quartersList.length > 0 && !selectedQuarter) {
      const now = getWIBDate();
      const currentQ = getQuarterName(now.getMonth());
      const currentQStr = `${currentQ} ${now.getFullYear()}`;
      if (quartersList.includes(currentQStr)) {
        setSelectedQuarter(currentQStr);
      } else {
        setSelectedQuarter(quartersList[0]);
      }
    }
  }, [quartersList, selectedQuarter]);

  useEffect(() => {
    if (yearsList.length > 0 && !selectedYear) {
      const now = getWIBDate();
      setSelectedYear(`${now.getFullYear()}`);
    }
  }, [yearsList, selectedYear]);

  const filteredLogsForStatsAndChart = useMemo(() => {
    return historyLogs.filter((row: any) => {
      const d = parseChecklistDate(row.waktu);
      if (!d) return false;
      
      if (selectedFilterType === 'month') {
        if (!selectedMonth) return false;
        const parts = selectedMonth.split(' ');
        if (parts.length < 2) return false;
        const mIdx = monthFullNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
        const mYear = parseInt(parts[1], 10);
        return d.getMonth() === mIdx && d.getFullYear() === mYear;
      } else if (selectedFilterType === 'quarter') {
        if (!selectedQuarter) return false;
        const parts = selectedQuarter.split(' ');
        if (parts.length < 2) return false;
        const qNum = parts[0]; 
        const qYear = parseInt(parts[1], 10);
        const rowQuarter = getQuarterName(d.getMonth());
        return rowQuarter === qNum && d.getFullYear() === qYear;
      } else if (selectedFilterType === 'year') {
        if (!selectedYear) return false;
        const yVal = parseInt(selectedYear, 10);
        return d.getFullYear() === yVal;
      }
      return false;
    });
  }, [historyLogs, selectedFilterType, selectedMonth, selectedQuarter, selectedYear, monthFullNames]);

  const overallStats = useMemo(() => {
    let harianSelesai = 0, harianTotal = 0;
    let mingguanSelesai = 0, mingguanTotal = 0;
    let bulananSelesai = 0, bulananTotal = 0;

    filteredLogsForStatsAndChart.forEach((row: any) => {
      const done = countDoneFromLog(row);
      const total = countTotalFromLog(row);
      const type = (row.jenis_checklist || '').toLowerCase().trim();

      if (type === 'harian') {
        harianSelesai += done;
        harianTotal += total;
      } else if (type === 'mingguan') {
        mingguanSelesai += done;
        mingguanTotal += total;
      } else if (type === 'bulanan') {
        bulananSelesai += done;
        bulananTotal += total;
      }
    });

    const totalSelesai = harianSelesai + mingguanSelesai + bulananSelesai;
    const totalTugas = harianTotal + mingguanTotal + bulananTotal;
    const totalPercent = totalTugas > 0 ? Math.round((totalSelesai / totalTugas) * 100) : 0;

    return {
      harian: { done: harianSelesai, total: harianTotal, pct: harianTotal > 0 ? Math.round((harianSelesai / harianTotal) * 100) : 0 },
      mingguan: { done: mingguanSelesai, total: mingguanTotal, pct: mingguanTotal > 0 ? Math.round((mingguanSelesai / mingguanTotal) * 100) : 0 },
      bulanan: { done: bulananSelesai, total: bulananTotal, pct: bulananTotal > 0 ? Math.round((bulananSelesai / bulananTotal) * 100) : 0 },
      total: { done: totalSelesai, total: totalTugas, pct: totalPercent }
    };
  }, [filteredLogsForStatsAndChart]);

  const chartDataForRiwayat = useMemo(() => {
    if (selectedFilterType === 'month') {
      const dayScores: Record<number, { done: number, total: number }> = {};
      filteredLogsForStatsAndChart.forEach(row => {
        const d = parseChecklistDate(row.waktu);
        if (d) {
          const dateNum = d.getDate();
          const done = countDoneFromLog(row);
          const total = countTotalFromLog(row);
          if (total > 0) {
            if (!dayScores[dateNum]) {
              dayScores[dateNum] = { done: 0, total: 0 };
            }
            dayScores[dateNum].done += done;
            dayScores[dateNum].total += total;
          }
        }
      });

      const data: any[] = [];
      const sortedDays = Object.keys(dayScores).map(Number).sort((a, b) => a - b);
      sortedDays.forEach(day => {
        const val = dayScores[day];
        const percentage = val.total > 0 ? Math.round((val.done / val.total) * 100) : 0;
        data.push({
          label: `${day}`,
          percentage,
          totalTugas: val.total,
          totalSelesai: val.done,
        });
      });
      return data;
    } else {
      const monthScores: Record<number, { done: number, total: number }> = {};
      filteredLogsForStatsAndChart.forEach(row => {
        const d = parseChecklistDate(row.waktu);
        if (d) {
          const mIdx = d.getMonth();
          const done = countDoneFromLog(row);
          const total = countTotalFromLog(row);
          if (total > 0) {
            if (!monthScores[mIdx]) {
              monthScores[mIdx] = { done: 0, total: 0 };
            }
            monthScores[mIdx].done += done;
            monthScores[mIdx].total += total;
          }
        }
      });

      const data: any[] = [];
      const sortedMonths = Object.keys(monthScores).map(Number).sort((a, b) => a - b);
      sortedMonths.forEach(mIdx => {
        const val = monthScores[mIdx];
        const percentage = val.total > 0 ? Math.round((val.done / val.total) * 100) : 0;
        data.push({
          label: monthFullNames[mIdx] ? monthFullNames[mIdx].substring(0, 3) : `M${mIdx+1}`,
          percentage,
          totalTugas: val.total,
          totalSelesai: val.done,
        });
      });
      return data;
    }
  }, [filteredLogsForStatsAndChart, selectedFilterType, monthFullNames]);

  const filteredPeriodRange = useMemo(() => {
    let start = new Date();
    let end = new Date();
    
    if (selectedFilterType === 'month') {
      if (selectedMonth) {
        const parts = selectedMonth.split(' ');
        const mIdx = monthFullNames.findIndex(m => m.toLowerCase() === parts[0]?.toLowerCase());
        const year = parseInt(parts[1], 10);
        if (mIdx !== -1 && !isNaN(year)) {
          start = new Date(year, mIdx, 1);
          end = new Date(year, mIdx + 1, 0);
        }
      }
    } else if (selectedFilterType === 'quarter') {
      if (selectedQuarter) {
        const parts = selectedQuarter.split(' ');
        const qStr = parts[0]; 
        const year = parseInt(parts[1], 10);
        if (!isNaN(year)) {
          let startMonth = 0;
          if (qStr === 'Q2') startMonth = 3;
          else if (qStr === 'Q3') startMonth = 6;
          else if (qStr === 'Q4') startMonth = 9;
          start = new Date(year, startMonth, 1);
          end = new Date(year, startMonth + 3, 0);
        }
      }
    } else if (selectedFilterType === 'year') {
      if (selectedYear) {
        const year = parseInt(selectedYear, 10);
        if (!isNaN(year)) {
          start = new Date(year, 0, 1);
          end = new Date(year, 12, 0);
        }
      }
    }
    
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    
    return { start, end };
  }, [selectedFilterType, selectedMonth, selectedQuarter, selectedYear, monthFullNames]);

  const taskBreakdownStats = useMemo(() => {
    // 1. Get all tasks from tugasMaster that are relevant to this user's roles
    const masterTasks = (tugasMaster || []).filter(t => {
      const tJabatan = (t.jabatan || t.Jabatan || '').toLowerCase().trim();
      return userJabatanParts.map(r => r.toLowerCase()).includes(tJabatan);
    }).map(t => ({
      name: (t.tugas || t.Tugas || '').trim(),
      jenis: (t.jenis || t.Jenis || 'Harian').trim()
    })).filter(t => t.name !== '');

    // 2. Also check if there are any other task names in the history logs
    const seenTaskNames = new Set(masterTasks.map(t => t.name.toLowerCase()));
    const extraTasks: { name: string; jenis: string }[] = [];

    filteredLogsForStatsAndChart.forEach((row: any) => {
      const type = row.jenis_checklist || 'Harian';
      if (row.data_laporan_json) {
        try {
          const data = JSON.parse(row.data_laporan_json);
          Object.keys(data).forEach((taskName) => {
            const trimmed = taskName.trim();
            if (trimmed && !seenTaskNames.has(trimmed.toLowerCase())) {
              seenTaskNames.add(trimmed.toLowerCase());
              extraTasks.push({ name: trimmed, jenis: type });
            }
          });
        } catch (e) {}
      }
    });

    const allTasks = [...masterTasks, ...extraTasks];

    const today = getWIBDate();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // For each task, compute the list of expected dates and whether they were done or not
    return allTasks.map(task => {
      const taskNameLower = task.name.toLowerCase();
      
      // Determine expected period keys for this checklist type
      const expectedPeriods: { key: string; dateLabel: string; sortDate: Date; isTodayOrOngoing: boolean }[] = [];
      const { start, end } = filteredPeriodRange;
      const limitDate = end > todayMidnight ? todayMidnight : end;

      if (task.jenis === 'Harian') {
        const cur = new Date(start);
        while (cur <= limitDate) {
          const key = getPeriodKey(cur, 'Harian');
          const isToday = cur.getFullYear() === todayMidnight.getFullYear() &&
                          cur.getMonth() === todayMidnight.getMonth() &&
                          cur.getDate() === todayMidnight.getDate();
          
          // Check if there is a submission in historyLogs for this day
          const hasSubmission = historyLogs.some((row: any) => {
            const rowType = row.jenis_checklist || 'Harian';
            if (rowType.toLowerCase() !== 'harian') return false;
            const rDate = parseChecklistDate(row.waktu);
            if (!rDate) return false;
            return rDate.getFullYear() === cur.getFullYear() &&
                   rDate.getMonth() === cur.getMonth() &&
                   rDate.getDate() === cur.getDate();
          });
          
          const label = cur.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          
          if (!isToday || hasSubmission) {
            expectedPeriods.push({
              key,
              dateLabel: label,
              sortDate: new Date(cur),
              isTodayOrOngoing: isToday
            });
          }
          
          cur.setDate(cur.getDate() + 1);
        }
      } else if (task.jenis === 'Mingguan') {
        const cur = new Date(start);
        while (cur <= limitDate) {
          const key = getPeriodKey(cur, 'Mingguan');
          
          if (!expectedPeriods.some(k => k.key === key)) {
            const temp = new Date(cur);
            const day = temp.getDay();
            const diff = temp.getDate() - day + (day === 0 ? 0 : 7); // Sunday
            const sunday = new Date(temp.setDate(diff));
            sunday.setHours(23, 59, 59, 999);
            
            const isOngoingWeek = sunday >= todayMidnight;
            
            const hasSubmission = historyLogs.some((row: any) => {
              const rowType = row.jenis_checklist || 'Harian';
              if (rowType.toLowerCase() !== 'mingguan') return false;
              const rDate = parseChecklistDate(row.waktu);
              if (!rDate) return false;
              const getMonday = (d: Date) => {
                const t = new Date(d);
                const dy = t.getDay();
                const df = t.getDate() - dy + (dy === 0 ? -6 : 1);
                const m = new Date(t.setDate(df));
                m.setHours(0,0,0,0);
                return m.getTime();
              };
              return getMonday(rDate) === getMonday(cur);
            });
            
            const monLabel = cur.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            const sunLabel = sunday.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
            const label = `Minggu ${monLabel} - ${sunLabel}`;
            
            if (!isOngoingWeek || hasSubmission) {
              expectedPeriods.push({
                key,
                dateLabel: label,
                sortDate: new Date(cur),
                isTodayOrOngoing: isOngoingWeek
              });
            }
          }
          cur.setDate(cur.getDate() + 1);
        }
      } else if (task.jenis === 'Bulanan') {
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const limitYear = limitDate.getFullYear();
        const limitMonth = limitDate.getMonth();
        const limitComparison = new Date(limitYear, limitMonth, 1);
        
        while (cur <= limitComparison) {
          const key = getPeriodKey(cur, 'Bulanan');
          
          if (!expectedPeriods.some(k => k.key === key)) {
            const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
            lastDay.setHours(23, 59, 59, 999);
            
            const isOngoingMonth = lastDay >= todayMidnight;
            
            const hasSubmission = historyLogs.some((row: any) => {
              const rowType = row.jenis_checklist || 'Harian';
              if (rowType.toLowerCase() !== 'bulanan') return false;
              const rDate = parseChecklistDate(row.waktu);
              if (!rDate) return false;
              return rDate.getFullYear() === cur.getFullYear() && rDate.getMonth() === cur.getMonth();
            });
            
            const label = cur.toLocaleDateString('id-ID', {
              month: 'long',
              year: 'numeric'
            });
            
            if (!isOngoingMonth || hasSubmission) {
              expectedPeriods.push({
                key,
                dateLabel: label,
                sortDate: new Date(cur),
                isTodayOrOngoing: isOngoingMonth
              });
            }
          }
          cur.setMonth(cur.getMonth() + 1);
        }
      }

      // Map each expected period to status
      let doneCount = 0;
      const history = expectedPeriods.map(period => {
        let isDone = false;
        
        // Find matching submission in historyLogs
        const matchLog = historyLogs.find((row: any) => {
          const rowType = row.jenis_checklist || 'Harian';
          if (rowType.toLowerCase() !== task.jenis.toLowerCase()) return false;
          const rDate = parseChecklistDate(row.waktu);
          if (!rDate) return false;
          
          if (task.jenis === 'Harian') {
            return rDate.getFullYear() === period.sortDate.getFullYear() &&
                   rDate.getMonth() === period.sortDate.getMonth() &&
                   rDate.getDate() === period.sortDate.getDate();
          } else if (task.jenis === 'Mingguan') {
            const getMonday = (d: Date) => {
              const t = new Date(d);
              const dy = t.getDay();
              const df = t.getDate() - dy + (dy === 0 ? -6 : 1);
              const m = new Date(t.setDate(df));
              m.setHours(0,0,0,0);
              return m.getTime();
            };
            return getMonday(rDate) === getMonday(period.sortDate);
          } else {
            return rDate.getFullYear() === period.sortDate.getFullYear() &&
                   rDate.getMonth() === period.sortDate.getMonth();
          }
        });

        if (matchLog && matchLog.data_laporan_json) {
          try {
            const data = JSON.parse(matchLog.data_laporan_json);
            const foundKey = Object.keys(data).find(k => k.toLowerCase() === taskNameLower);
            if (foundKey && data[foundKey]?.done) {
              isDone = true;
            }
          } catch (e) {}
        }

        if (isDone) {
          doneCount++;
        }

        return {
          dateStr: period.dateLabel,
          done: isDone,
          rawDate: period.sortDate
        };
      }).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime()); // Newest first

      const totalExpected = expectedPeriods.length;
      const percentage = totalExpected > 0 ? Math.round((doneCount / totalExpected) * 100) : 0;

      return {
        name: task.name,
        jenis: task.jenis,
        done: doneCount,
        total: totalExpected,
        percentage,
        history
      };
    }).sort((a, b) => b.percentage - a.percentage || b.total - a.total);
  }, [tugasMaster, historyLogs, filteredLogsForStatsAndChart, userJabatanParts, filteredPeriodRange]);

  interface PendingSubmission {
    email: string;
    nama: string;
    jabatan: string;
    jenis: 'Harian' | 'Mingguan' | 'Bulanan';
    totalTugas: number;
    totalSelesai: number;
    checklist: Record<string, TaskStatus>;
    timestamp: string;
    periodKey: string;
  }

  const processOutbox = async () => {
    const email = user.email;
    const outboxStr = safeGetItem(`checklist_outbox_${email}`);
    if (!outboxStr) return;
    
    let outbox: PendingSubmission[] = [];
    try {
      outbox = JSON.parse(outboxStr);
    } catch (e) {
      return;
    }
    
    if (outbox.length === 0) return;
    
    const remaining: PendingSubmission[] = [];
    for (let i = 0; i < outbox.length; i++) {
      const item = outbox[i];
      try {
        const res = await api.kirimTugas({
          nama: item.nama,
          email: item.email,
          jabatan: item.jabatan,
          jenis: item.jenis,
          totalTugas: item.totalTugas,
          totalSelesai: item.totalSelesai,
          checklist: item.checklist,
          timestamp: item.timestamp
        });
        
        if (res && res.status === 'sukses') {
          console.log(`Auto-saved past checklist period ${item.periodKey} of type ${item.jenis} successfully.`);
        } else {
          remaining.push(item);
        }
      } catch (err) {
        console.warn(`Gagal kirim outbox item ${item.periodKey}:`, err);
        remaining.push(item);
      }
    }
    
    safeSetItem(`checklist_outbox_${email}`, JSON.stringify(remaining));
    
    try {
      const history = await api.getChecklistHistory(user.email, user.nama);
      setHistoryLogs(history || []);
    } catch (e) {}
  };

  const checkAndSubmitRollovers = async () => {
    const email = user.email;
    const tabs: ('Harian' | 'Mingguan' | 'Bulanan')[] = ['Harian', 'Mingguan', 'Bulanan'];
    const now = getWIBDate();
    
    let outboxStr = safeGetItem(`checklist_outbox_${email}`);
    let outbox: PendingSubmission[] = outboxStr ? JSON.parse(outboxStr) : [];
    
    let hasChangedOutbox = false;
    
    tabs.forEach(tab => {
      const localKeyV2 = `checklist_state_v2_${email}_${tab}`;
      const cached = safeGetItem(localKeyV2);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const currentKey = getPeriodKey(now, tab);
          if (parsed.periodKey && parsed.periodKey !== currentKey) {
            const items = parsed.items || {};
            const doneItems = Object.entries(items).filter(([_, status]: [string, any]) => status.done);
            
            if (doneItems.length > 0) {
              const rolesToMatch = userJabatanParts.map((r: string) => r.toLowerCase());
              const prevTasks = (tugasMaster || []).filter(t => {
                const tJabatan = (t.jabatan || t.Jabatan || '').toLowerCase().trim();
                const matchRole = rolesToMatch.includes(tJabatan);
                const matchType = (t.jenis || t.Jenis || '').toLowerCase() === tab.toLowerCase();
                return matchRole && matchType;
              });

              const ts = getPastPeriodTimestamp(parsed.periodKey, tab);
              const alreadyQueued = outbox.some(o => o.periodKey === parsed.periodKey && o.jenis === tab);
              if (!alreadyQueued) {
                const checkedChunk: Record<string, TaskStatus> = {};
                Object.entries(items).forEach(([name, status]: [string, any]) => {
                  if (status.done) {
                    checkedChunk[name] = { ...status, locked: true };
                  }
                });
                
                outbox.push({
                  email,
                  nama: user.nama,
                  jabatan: user.jabatan,
                  jenis: tab,
                  totalTugas: prevTasks.length,
                  totalSelesai: doneItems.length,
                  checklist: checkedChunk,
                  timestamp: ts,
                  periodKey: parsed.periodKey
                });
                hasChangedOutbox = true;
              }
            }
            
            safeSetItem(localKeyV2, JSON.stringify({
              periodKey: currentKey,
              items: {},
              submitted: false
            }));
            
            if (tab === activeTab) {
              setCompleted({});
              setLastSyncTime('');
            }
          }
        } catch (e) {
          console.warn("Gagal parse cached draft:", e);
        }
      } else {
        const currentKey = getPeriodKey(now, tab);
        safeSetItem(localKeyV2, JSON.stringify({
          periodKey: currentKey,
          items: {},
          submitted: false
        }));
      }
    });

    if (hasChangedOutbox) {
      safeSetItem(`checklist_outbox_${email}`, JSON.stringify(outbox));
    }

    await processOutbox();
  };

  useEffect(() => {
    const syncWithServerAndLoadDraft = async () => {
      setIsSyncing(true);
      await checkAndSubmitRollovers();
      
      const email = user.email;
      const now = getWIBDate();
      const currentKey = getPeriodKey(now, activeTab);
      const localKeyV2 = `checklist_state_v2_${email}_${activeTab}`;
      const cached = safeGetItem(localKeyV2);
      
      let draftData: Record<string, TaskStatus> = {};
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.periodKey === currentKey) {
            draftData = parsed.items || {};
          }
        } catch (e) {}
      }
      
      setCompleted(draftData);
      
      try {
        const history = await api.getChecklistHistory(user.email, user.nama);
        setHistoryLogs(history || []);
        
        const relevantHistory = (history || []).filter((row: any) => 
          (row.jenis_checklist || '').toLowerCase() === activeTab.toLowerCase() && 
          isSamePeriod(row.waktu, activeTab)
        );
        
        if (relevantHistory.length > 0) {
          const latestEntry = relevantHistory[0];
          const timeObj = parseChecklistDate(latestEntry.waktu);
          if (timeObj) {
            setLastSyncTime(timeObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
          }
        } else {
          setLastSyncTime('');
        }
      } catch (err) {
        console.error("Gagal sinkron riwayat logs:", err);
      } finally {
        setIsSyncing(false);
      }
    };
    
    syncWithServerAndLoadDraft();
  }, [activeTab, user.email, user.nama]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkAndSubmitRollovers();
    }, 20000); // Check for period rollover every 20s
    return () => clearInterval(interval);
  }, [tugasMaster, user.email, user.nama, activeTab]);

  const getCommitDescription = () => {
    if (activeTab === 'Harian') {
      return {
        title: "Penyimpanan Harian Mandiri Pasif",
        desc: "Centang tugas sepanjang hari. Sistem akan menyimpan progres secara otomatis ke Google Sheets setiap hari jam 24:00 malam, lalu mereset lembar kerja keesokan harinya.",
        timeLeft: "Hari Ini Jam 24:00"
      };
    } else if (activeTab === 'Mingguan') {
      return {
        title: "Penyimpanan Mingguan Mandiri Pasif",
        desc: "Centang tugas sepanjang minggu berjalan. Sistem akan menyimpan progres otomatis ke Google Sheets setiap hari Minggu jam 24:00 malam, lalu mereset dan memunculkan tugas baru di hari Senin.",
        timeLeft: "Hari Minggu Jam 24:00"
      };
    } else {
      return {
        title: "Penyimpanan Bulanan Mandiri Pasif",
        desc: "Centang tugas sepanjang bulan berjalan. Sistem akan menyimpan progres otomatis ke Google Sheets setiap akhir bulan jam 24:00 malam, lalu mereset dan memunculkan tugas baru di awal bulan baru.",
        timeLeft: "Akhir Bulan Jam 24:00"
      };
    }
  };

  const tasksToShow = useMemo(() => {
    const rolesToMatch = selectedRole === 'All' 
      ? userJabatanParts.map(r => r.toLowerCase()) 
      : [selectedRole.toLowerCase()];

    return (tugasMaster || []).filter(t => {
      const tJabatan = (t.jabatan || t.Jabatan || '').toLowerCase().trim();
      const matchRole = rolesToMatch.includes(tJabatan);
      const matchType = (t.jenis || t.Jenis || '').toLowerCase() === activeTab.toLowerCase();
      return matchRole && matchType;
    });
  }, [tugasMaster, userJabatanParts, selectedRole, activeTab]);

  const toggleTask = (taskName: string) => {
    const isDone = completed[taskName]?.done || false;
    const now = getWIBDate();
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    
    let newState: Record<string, TaskStatus>;
    if (isDone) {
      newState = { ...completed };
      delete newState[taskName];
    } else {
      newState = { ...completed, [taskName]: { done: true, locked: false, time: timeStr, timestamp: now.toISOString() } };
    }

    setCompleted(newState);
    
    const email = user.email;
    const currentKey = getPeriodKey(now, activeTab);
    const localKeyV2 = `checklist_state_v2_${email}_${activeTab}`;
    safeSetItem(localKeyV2, JSON.stringify({
      periodKey: currentKey,
      items: newState,
      submitted: false
    }));

    // Trigger background auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const totalDone = Object.values(newState).filter((s: TaskStatus) => s.done).length;
        const totalTasksNum = tasksToShow.length;
        
        const res = await api.kirimTugas({
          nama: user.nama,
          email: user.email,
          jabatan: user.jabatan,
          jenis: activeTab,
          totalTugas: totalTasksNum,
          totalSelesai: totalDone,
          checklist: newState,
          timestamp: now.toISOString()
        });
        
        if (res && res.status === 'sukses') {
          console.log(`Auto-saved checklist of type ${activeTab} successfully.`);
          
          // Refresh the checklist history list in UI
          const history = await api.getChecklistHistory(user.email, user.nama);
          if (history && Array.isArray(history)) {
            setHistoryLogs(history);
          }
          
          const updatedNow = getWIBDate();
          setLastSyncTime(updatedNow.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        } else {
          console.warn("Auto-save returned non-success status:", res?.message);
        }
      } catch (err) {
        console.warn("Failed to auto-save checklist in background:", err);
      } finally {
        setIsSyncing(false);
      }
    }, 1500); // 1.5 seconds debounce
  };

  const totalSelesai = Object.values(completed).filter((s: TaskStatus) => s.done).length;
  const totalTugas = tasksToShow.length;
  const progressPercent = totalTugas > 0 ? Math.round((totalSelesai / totalTugas) * 100) : 0;

  const chartData = useMemo(() => {
    if (!selectedMonth) return [];
    const parts = selectedMonth.split(' ');
    if (parts.length < 2) return [];
    const mIdx = monthFullNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
    const mYear = parseInt(parts[1], 10);
    if (mIdx === -1 || isNaN(mYear)) return [];

    const monthHistory = historyLogs.filter((row: any) => {
      const matchesTab = (row.jenis_checklist || '').toLowerCase() === activeTab.toLowerCase();
      if (!matchesTab) return false;
      const d = parseChecklistDate(row.waktu);
      if (!d) return false;
      return d.getMonth() === mIdx && d.getFullYear() === mYear;
    });

    const dayScores: Record<number, { done: number, total: number }> = {};
    monthHistory.forEach(row => {
      const d = parseChecklistDate(row.waktu);
      if (d) {
        const dateNum = d.getDate();
        const done = countDoneFromLog(row);
        const total = countTotalFromLog(row);
        if (total > 0) {
          if (!dayScores[dateNum]) {
            dayScores[dateNum] = { done: 0, total: 0 };
          }
          dayScores[dateNum].done += done;
          dayScores[dateNum].total += total;
        }
      }
    });

    const data: any[] = [];
    const sortedDays = Object.keys(dayScores).map(Number).sort((a, b) => a - b);
    
    sortedDays.forEach(day => {
      const val = dayScores[day];
      const percentage = val.total > 0 ? Math.round((val.done / val.total) * 100) : 0;
      data.push({
        day: `${day}`,
        percentage,
        totalTugas: val.total,
        totalSelesai: val.done,
      });
    });

    return data;
  }, [historyLogs, selectedMonth, activeTab, monthFullNames]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 w-full max-w-md mx-auto pb-32 px-2 text-left">
      {/* Menu Atas model Absensi: Checklist dan Riwayat */}
      <div className="flex items-center glass-card p-1.5 !rounded-full h-14 bg-black/50 border border-white/5 shadow-xl">
        <button 
          onClick={() => { setActiveView('isi'); setSelectedPoint(null); }} 
          className={`flex-1 h-full rounded-full text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
            activeView === 'isi' 
              ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          <ClipboardCheck size={14} /> Checklist
        </button>
        <button 
          onClick={() => { setActiveView('riwayat'); setSelectedPoint(null); }} 
          className={`flex-1 h-full rounded-full text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
            activeView === 'riwayat' 
              ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          <BarChart2 size={14} /> Riwayat
        </button>
      </div>

      {activeView === 'isi' ? (
        <div className="space-y-6">
          <header className="px-2">
            <h2 className="text-3xl font-medium text-white">Checklist Tugas</h2>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-emerald-glow text-sm font-medium italic">
                {user.jabatan} • {activeTab}
              </p>
              {lastSyncTime && (
                 <span className="text-xs text-white/60 font-medium border-l border-white/20 pl-2">
                   Updated {lastSyncTime}
                 </span>
              )}
            </div>
          </header>

          {/* Kartu Statistik */}
          <div className="glass-card p-6 !rounded-[2.5rem] bg-black/30 border border-white/5 space-y-6 shadow-2xl overflow-hidden px-8 relative z-10">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                 <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                    <circle 
                      cx="50" cy="50" r="42" stroke="#34d399" strokeWidth="10" fill="transparent" 
                      strokeDasharray="263.8" strokeDashoffset={263.8 * (1 - progressPercent/100)} 
                      strokeLinecap="round" className="transition-all duration-1000 ease-out"
                    />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-medium text-white italic tracking-tighter">{progressPercent}%</span>
                 </div>
              </div>
              <div className="flex-1 space-y-2">
                 <p className="text-xs font-medium text-white/60 italic leading-tight">Progres {activeTab}</p>
                 <p className="text-sm font-medium text-white/90 leading-tight">{totalSelesai} dari {totalTugas} tugas selesai.</p>
                 <div className="pt-2">
                   <span className={`text-xs font-medium px-3 py-1 rounded-full ${isSyncing ? 'bg-emerald-400/20 text-emerald-glow animate-pulse' : 'bg-white/5 text-white/60'}`}>
                     {isSyncing ? "Syncing..." : "Live Data"}
                   </span>
                 </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="space-y-4">
            {userJabatanParts.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {['All', ...userJabatanParts].map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-3 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest transition-all ${
                      selectedRole === role
                        ? 'bg-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                        : 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-glow'
                    }`}
                  >
                    {role === 'All' ? 'All' : role}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center p-1 !rounded-full h-14 bg-black/40 border border-white/5 backdrop-blur-md">
              {(['Harian', 'Mingguan', 'Bulanan'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 h-12 rounded-full text-xs font-medium transition-all ${activeTab === tab ? 'active-emerald-tab' : 'text-white/60'}`}>{tab}</button>
              ))}
            </div>

            {/* Info Card - Kapan disimpan otomatis permanen */}
            <div className="glass-card p-5 !rounded-2xl bg-black/20 border border-white/5 space-y-3 shadow-xl relative overflow-hidden text-left">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-glow border border-emerald-500/20 shrink-0 mt-0.5">
                  <Clock size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider">{getCommitDescription().title}</h4>
                  <p className="text-xs text-white/70 leading-relaxed">{getCommitDescription().desc}</p>
                </div>
              </div>
              <div className="pt-2.5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[10px] text-white/40 font-medium uppercase tracking-widest">Batas Final & Kunci Progress:</span>
                <span className="text-[10px] text-emerald-glow font-semibold uppercase tracking-widest bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/20 self-start sm:self-auto">{getCommitDescription().timeLeft}</span>
              </div>
            </div>
          </div>

          {/* Daftar Tugas */}
          <div className="space-y-4 px-2">
            <div className="space-y-3">
              {tasksToShow.length > 0 ? tasksToShow.map((t: any, i: number) => {
                const name = (t.tugas || t.Tugas || '').trim();
                const status = completed[name] || { done: false };
                return (
                  <button key={i} disabled={isSyncing} onClick={() => toggleTask(name)} className={`w-full glass-card p-6 !rounded-[2rem] flex items-center justify-between text-left transition-all bg-black/20 active:scale-[0.98]`}>
                    <div className="flex items-center gap-5 overflow-hidden w-full">
                      <div className={`w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${status.done ? 'bg-emerald-400 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]' : 'border-white/10'}`}>
                        {status.done && <span className="text-black font-semibold text-xs">✓</span>}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <p className={`font-normal text-sm leading-snug break-words whitespace-normal ${status.done ? 'text-white/40 line-through' : 'text-white'}`}>{name}</p>
                        <div className="flex items-center justify-between">
                          {status.done && status.time && <p className="text-xs font-medium text-white/60">{status.time}</p>}
                          {status.done && (
                            <span className="text-[10px] text-emerald-400/90 font-medium uppercase tracking-wider flex items-center gap-1 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Tersimpan Di HP
                            </span>
                          )}
                          {!status.done && (
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
                              Belum Selesai
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <div className="py-20 text-center opacity-60 text-xs font-medium">
                  {isSyncing ? "Memuat Data..." : "Tidak Ada Tugas"}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <header className="px-2 flex flex-col gap-1.5">
            <h2 className="text-3xl font-medium text-white">Riwayat Checklist</h2>
            <p className="text-emerald-glow text-xs font-semibold uppercase tracking-wider">Laporan Perkembangan Staf</p>
          </header>

          {/* Filter Section (Bulan, Kuartal, Tahun) */}
          <div className="glass-card px-4 py-5 sm:p-6 !rounded-[2.5rem] bg-black/30 border border-white/5 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center p-1 rounded-full h-11 bg-white/5 border border-white/5">
              {(['month', 'quarter', 'year'] as const).map(type => (
                <button 
                  key={type} 
                  onClick={() => { setSelectedFilterType(type); setSelectedPoint(null); }} 
                  className={`flex-1 h-9 rounded-full text-[11px] font-medium transition-all ${
                    selectedFilterType === type 
                      ? 'bg-emerald-500/20 text-emerald-glow border border-emerald-500/30' 
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {type === 'month' ? 'Bulan' : type === 'quarter' ? 'Kuartal' : 'Tahun'}
                </button>
              ))}
            </div>

            {/* Selector Dropdown based on choice with custom arrow and flat transparency */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/50 font-medium uppercase tracking-widest px-1">Pilih Periode</label>
              {selectedFilterType === 'month' && (
                <div className="relative w-full">
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => { setSelectedMonth(e.target.value); setSelectedPoint(null); }} 
                    className="appearance-none h-12 w-full rounded-2xl text-sm font-medium bg-white/5 border border-white/10 text-white pl-4 pr-10 focus:outline-none focus:border-emerald-500/30 transition-all cursor-pointer"
                  >
                    {monthsList.map((m, i) => (
                      <option key={i} value={m} className="bg-[#121214] text-white">{m}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-white/50">
                    <ChevronDown size={16} />
                  </div>
                </div>
              )}

              {selectedFilterType === 'quarter' && (
                <div className="relative w-full">
                  <select 
                    value={selectedQuarter} 
                    onChange={(e) => { setSelectedQuarter(e.target.value); setSelectedPoint(null); }} 
                    className="appearance-none h-12 w-full rounded-2xl text-sm font-medium bg-white/5 border border-white/10 text-white pl-4 pr-10 focus:outline-none focus:border-emerald-500/30 transition-all cursor-pointer"
                  >
                    {quartersList.map((q, i) => (
                      <option key={i} value={q} className="bg-[#121214] text-white">{q}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-white/50">
                    <ChevronDown size={16} />
                  </div>
                </div>
              )}

              {selectedFilterType === 'year' && (
                <div className="relative w-full">
                  <select 
                    value={selectedYear} 
                    onChange={(e) => { setSelectedYear(e.target.value); setSelectedPoint(null); }} 
                    className="appearance-none h-12 w-full rounded-2xl text-sm font-medium bg-white/5 border border-white/10 text-white pl-4 pr-10 focus:outline-none focus:border-emerald-500/30 transition-all cursor-pointer"
                  >
                    {yearsList.map((y, i) => (
                      <option key={i} value={y} className="bg-[#121214] text-white">Tahun {y}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-white/50">
                    <ChevronDown size={16} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ringkasan Total & Breakdown Card */}
          <div className="glass-card px-4 py-5 sm:p-6 !rounded-[2.5rem] bg-black/30 border border-white/5 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center gap-5 border-b border-white/5 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <TrendingUp className="text-emerald-glow" size={24} />
              </div>
              <div>
                <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider">Total Capaian Periode</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold text-white leading-none">{overallStats.total.pct}%</span>
                  <span className="text-xs text-white/40 font-medium">({overallStats.total.done}/{overallStats.total.total} Tugas)</span>
                </div>
              </div>
            </div>

            {/* Grid Breakdown: Harian, Mingguan, Bulanan with mobile-responsive spacing and size */}
            <div className="grid grid-cols-3 gap-2">
              {/* Harian */}
              <div className="bg-white/5 rounded-xl px-1.5 py-3 border border-white/5 flex flex-col items-center justify-center gap-1 min-w-0 text-center">
                <p className="text-[9px] text-white/40 font-medium uppercase tracking-widest truncate">Harian</p>
                <p className="text-base font-semibold text-white leading-none">{overallStats.harian.pct}%</p>
                <p className="text-[9px] text-white/60 font-medium truncate">({overallStats.harian.done}/{overallStats.harian.total})</p>
              </div>

              {/* Mingguan */}
              <div className="bg-white/5 rounded-xl px-1.5 py-3 border border-white/5 flex flex-col items-center justify-center gap-1 min-w-0 text-center">
                <p className="text-[9px] text-white/40 font-medium uppercase tracking-widest truncate">Mingguan</p>
                <p className="text-base font-semibold text-white leading-none">{overallStats.mingguan.pct}%</p>
                <p className="text-[9px] text-white/60 font-medium truncate">({overallStats.mingguan.done}/{overallStats.mingguan.total})</p>
              </div>

              {/* Bulanan */}
              <div className="bg-white/5 rounded-xl px-1.5 py-3 border border-white/5 flex flex-col items-center justify-center gap-1 min-w-0 text-center">
                <p className="text-[9px] text-white/40 font-medium uppercase tracking-widest truncate">Bulanan</p>
                <p className="text-base font-semibold text-white leading-none">{overallStats.bulanan.pct}%</p>
                <p className="text-[9px] text-white/60 font-medium truncate">({overallStats.bulanan.done}/{overallStats.bulanan.total})</p>
              </div>
            </div>
          </div>

          {/* Analisis per Tugas */}
          <div className="glass-card p-6 !rounded-[2.5rem] bg-black/30 border border-white/5 space-y-4 shadow-2xl relative">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <ClipboardCheck size={18} className="text-emerald-glow" /> Analisis per Tugas
              </h3>
              <p className="text-[10px] text-white/50 leading-snug">
                Persentase pengerjaan untuk setiap jenis tugas berdasarkan laporan riwayat yang dikirim.
              </p>
            </div>

            {taskBreakdownStats.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                  {(showAllTasksStats ? taskBreakdownStats : taskBreakdownStats.slice(0, 5)).map((task, idx) => {
                    const getBarColor = (pct: number) => {
                      if (pct < 50) return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
                      if (pct < 80) return "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]";
                      return "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]";
                    };

                    return (
                      <div 
                        key={idx} 
                        onClick={() => {
                          const isExpanded = !!expandedTasks[task.name];
                          setExpandedTasks({
                            ...expandedTasks,
                            [task.name]: !isExpanded
                          });
                        }}
                        className="bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl p-3.5 space-y-2 cursor-pointer hover:bg-white/10 active:scale-[0.99] transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded mr-2 ${
                              task.jenis.toLowerCase() === 'harian' ? 'bg-amber-400/10 text-amber-300' :
                              task.jenis.toLowerCase() === 'mingguan' ? 'bg-cyan-400/10 text-cyan-300' :
                              'bg-fuchsia-400/10 text-fuchsia-300'
                            }`}>
                              {task.jenis}
                            </span>
                            <span className="text-xs font-normal text-white/90 leading-tight break-words">{task.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-semibold text-white">{task.percentage}%</span>
                              <p className="text-[9px] text-white/40 font-medium">{task.done}/{task.total} kali</p>
                            </div>
                            <div className="text-white/40">
                              {expandedTasks[task.name] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </div>
                        </div>

                        {/* Beautiful Visual Progress Bar acting as horizontal bar graph */}
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${getBarColor(task.percentage)}`} 
                            style={{ width: `${task.percentage}%` }}
                          />
                        </div>

                        {/* Expandable History Details */}
                        {expandedTasks[task.name] && (
                          <div className="mt-3 pt-3 border-t border-white/5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between text-[9px] uppercase font-semibold text-white/40 tracking-wider">
                              <span>Detail Riwayat Tanggal</span>
                              <span className="text-emerald-glow">{task.done} Selesai / {task.total} Pengiriman</span>
                            </div>
                            {task.history.length > 0 ? (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {task.history.map((h, hIdx) => (
                                  <div key={hIdx} className="flex items-center justify-between bg-black/20 rounded-xl px-3 py-1.5 border border-white/5">
                                    <span className="text-[10px] font-medium text-white/70">{h.dateStr}</span>
                                    {h.done ? (
                                      <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 flex items-center gap-1">
                                        ✓ SELESAI
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/25 flex items-center gap-1">
                                        ✗ LEWAT
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-[10px] opacity-40 italic">
                                Tidak ada data pengiriman terperinci.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {taskBreakdownStats.length > 5 && (
                  <button
                    onClick={() => setShowAllTasksStats(!showAllTasksStats)}
                    className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-[11px] text-white/70 hover:text-white font-semibold uppercase tracking-wider transition-all bg-white/5 hover:bg-white/10"
                  >
                    {showAllTasksStats ? "Sembunyikan Tugas" : `Tampilkan Semua Tugas (${taskBreakdownStats.length})`}
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-xs opacity-50 italic border border-dashed border-white/10 rounded-2xl">
                Belum ada data tugas yang terperinci.
              </div>
            )}
          </div>

          {/* Grafik Perkembangan Mobile-Optimized Clickable */}
          <div className="glass-card p-6 !rounded-[2.5rem] bg-black/30 border border-white/5 space-y-4 shadow-2xl relative">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <BarChart2 size={18} className="text-emerald-glow" /> Perkembangan Progres
              </h3>
              <p className="text-[10px] text-white/50 leading-snug">
                *Ketuk titik grafik di bawah ini untuk melihat detail capaian tugas secara langsung.
              </p>
            </div>

            {chartDataForRiwayat.length > 0 ? (
              <div className="space-y-4">
                <div className="h-44 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={chartDataForRiwayat} 
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          setSelectedPoint(state.activePayload[0].payload);
                        }
                      }}
                    >
                      <defs>
                        <linearGradient id="colorChecklistPercentNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        stroke="rgba(255,255,255,0.4)" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.4)" 
                        fontSize={10}
                        domain={[0, 100]}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0,0,0,0.85)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '16px',
                          color: '#fff',
                          fontSize: '11px',
                          fontFamily: 'inherit'
                        }}
                        trigger="click"
                        formatter={(value, name, props) => [
                          `${value}% Selesai`,
                          'Tingkat Capaian'
                        ]}
                        labelFormatter={(lbl) => {
                          if (selectedFilterType === 'month') {
                            return `Tanggal ${lbl} ${selectedMonth}`;
                          } else if (selectedFilterType === 'quarter') {
                            return `Bulan ${lbl} (${selectedQuarter})`;
                          } else {
                            return `Bulan ${lbl} ${selectedYear}`;
                          }
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="percentage" 
                        stroke="#34d399" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#colorChecklistPercentNew)" 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#34d399' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Detail Titik Terpilih - Tampilan Mobile yang Sangat Elegan */}
                {selectedPoint ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center animate-in fade-in zoom-in-95 duration-200">
                    <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest mb-1">
                      {selectedFilterType === 'month' 
                        ? `Detail Tanggal ${selectedPoint.label} ${selectedMonth}` 
                        : `Detail Bulan ${selectedPoint.label}`}
                    </p>
                    <p className="text-2xl font-semibold text-emerald-glow mb-0.5">{selectedPoint.percentage}% Selesai</p>
                    <p className="text-xs text-white/70">
                      Selesai <strong className="text-white font-semibold">{selectedPoint.totalSelesai}</strong> dari <strong className="text-white font-semibold">{selectedPoint.totalTugas}</strong> tugas terkumpul
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-2.5 text-[10px] opacity-40 italic tracking-wide">
                    *Ketuk salah satu titik grafik di atas untuk melihat ringkasan instan.
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center opacity-50 text-[11px] font-medium border border-dashed border-white/10 rounded-2xl">
                Tidak ada laporan checklist disubmit dalam rentang ini.
              </div>
            )}
          </div>

          {/* Daftar Riwayat Log / Submission list */}
          <div className="space-y-3 px-1">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest px-1">Daftar Laporan Terkirim</h3>
            <div className="space-y-2.5">
              {filteredLogsForStatsAndChart.length > 0 ? (
                filteredLogsForStatsAndChart.slice(0, 15).map((log, idx) => {
                  const dateObj = parseChecklistDate(log.waktu);
                  const formattedDate = dateObj ? dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                  const formattedTime = dateObj ? dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
                  const done = countDoneFromLog(log);
                  const total = countTotalFromLog(log);
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const type = (log.jenis_checklist || 'Harian');

                  return (
                    <div key={idx} className="glass-card px-4 py-3 border border-white/5 flex items-center justify-between gap-4 bg-black/20 !rounded-2xl">
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                            type.toLowerCase() === 'harian' ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20' :
                            type.toLowerCase() === 'mingguan' ? 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/20' :
                            'bg-fuchsia-400/10 text-fuchsia-300 border border-fuchsia-400/20'
                          }`}>
                            {type}
                          </span>
                          <span className="text-[10px] text-white/40">{formattedTime} WIB</span>
                        </div>
                        <p className="text-xs font-semibold text-white/90 truncate">{formattedDate}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-emerald-glow">{pct}%</p>
                        <p className="text-[10px] text-white/40 font-medium">{done}/{total} Tugas</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs opacity-50 italic">
                  Belum ada riwayat aktivitas terdaftar.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
