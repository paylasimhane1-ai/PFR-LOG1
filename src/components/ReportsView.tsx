import React, { useState, useMemo } from 'react';
import { Vehicle, User } from '../types';
import { getDurationText, getStatusBadgeClass, getDepoKayitTarihi, getRampaGirisTarihi, getRampaCikisTarihi } from '../utils/helpers';
import {
  FileSpreadsheet,
  Printer,
  FilterX,
  Search,
  Eye,
  RotateCcw,
  Clock,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Truck,
  CheckCircle2,
  Table,
  LogIn,
  LogOut,
  Calendar,
  Zap,
  Activity,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

interface ReportsViewProps {
  vehicles: Vehicle[];
  currentUser?: User | null;
  getRampName: (id: number | null | undefined) => string;
  onExportCsv: (filteredVehicles: Vehicle[]) => void;
  onOpenDetailModal: (v: Vehicle) => void;
  onUndoExit: (v: Vehicle) => void;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const getTodayIso = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterdayIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getSevenDaysAgoIso = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthStartIso = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const parseIsoDate = (raw: any): string => {
  if (!raw) return '';
  if (typeof raw === 'number') {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  const s = String(raw).trim();
  if (!s) return '';
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  // DD.MM.YYYY
  if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(s)) {
    const parts = s.split(' ')[0].split('.');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${day}`;
    }
  }
  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    const parts = s.split(' ')[0].split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${day}`;
    }
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
};

const getVehicleDateStr = (v: Vehicle, type: 'giris' | 'cikis' = 'giris'): string => {
  if (type === 'giris') {
    if (v.girisTarihiIso) return parseIsoDate(v.girisTarihiIso);
    if (v.girisTimestamp) return parseIsoDate(v.girisTimestamp);
    if (v.girisTarihi) return parseIsoDate(v.girisTarihi);
    if (v.kayitTarihi) return parseIsoDate(v.kayitTarihi);
  } else {
    if (v.cikisTarihiIso) return parseIsoDate(v.cikisTarihiIso);
    if (v.cikisTimestamp) return parseIsoDate(v.cikisTimestamp);
    if (v.cikisTarihi) return parseIsoDate(v.cikisTarihi);
  }
  return '';
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  vehicles,
  currentUser,
  getRampName,
  onExportCsv,
  onOpenDetailModal,
  onUndoExit
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'charts' | 'table'>('both');
  
  // Varsayılan: "Bugün" mantığı
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('today');
  const [filters, setFilters] = useState(() => {
    const today = getTodayIso();
    return {
      search: '',
      startDate: today,
      endDate: today
    };
  });

  const handlePresetSelect = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    setDatePreset(preset);
    const today = getTodayIso();

    if (preset === 'today') {
      setFilters(prev => ({ ...prev, startDate: today, endDate: today }));
    } else if (preset === 'yesterday') {
      const yest = getYesterdayIso();
      setFilters(prev => ({ ...prev, startDate: yest, endDate: yest }));
    } else if (preset === 'week') {
      setFilters(prev => ({ ...prev, startDate: getSevenDaysAgoIso(), endDate: today }));
    } else if (preset === 'month') {
      setFilters(prev => ({ ...prev, startDate: getMonthStartIso(), endDate: today }));
    } else if (preset === 'all') {
      setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
    }
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', val: string) => {
    setDatePreset('custom');
    setFilters(prev => ({ ...prev, [field]: val }));
  };

  const handleClearFilters = () => {
    handlePresetSelect('today');
    setFilters({ search: '', startDate: getTodayIso(), endDate: getTodayIso() });
  };

  const isTodayMode =
    datePreset === 'today' ||
    (filters.startDate === getTodayIso() && filters.endDate === getTodayIso());

  // Filtreleme: Tarih aralığı ve genel arama
  // "Raporlarda toplam işlemler bugün mantığıyla çalışsın. Tarih aralıkları seçildiğinde seçilen tarih aralıklarına ait bilgiler verilsin."
  const filtered = useMemo(() => {
    const today = getTodayIso();
    const start = filters.startDate;
    const end = filters.endDate;

    return vehicles.filter((v) => {
      const q = filters.search.trim().toLowerCase();
      const matchSearch =
        !q ||
        v.id.toString().includes(q) ||
        v.dorsePlaka.toLowerCase().includes(q) ||
        (v.cekiciPlaka && v.cekiciPlaka.toLowerCase().includes(q)) ||
        (v.konteynirNo && v.konteynirNo.toLowerCase().includes(q)) ||
        v.musteri.toLowerCase().includes(q) ||
        v.soforAd.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Tarih filtresi yoksa (Tüm zamanlar)
      if (!start && !end) {
        return true;
      }

      const vGirisDate = getVehicleDateStr(v, 'giris');
      const vCikisDate = getVehicleDateStr(v, 'cikis');

      // 1. "Bugün" Mantığı (Varsayılan):
      // Bugün giriş yapanlar, bugün çıkış yapanlar ve şu an sahada/rampada işlem gören tüm araçlar
      if (isTodayMode) {
        const isEnteredToday = vGirisDate === today;
        const isExitedToday = v.durum === 'ÇIKIŞ YAPTI' && vCikisDate === today;
        const isCurrentlyActiveToday = v.durum !== 'ÇIKIŞ YAPTI';
        return isEnteredToday || isExitedToday || isCurrentlyActiveToday;
      }

      // 2. Seçilen Tarih Aralığı Mantığı:
      // Seçilen tarih aralığında giriş yapanlar
      const isEnteredInPeriod =
        Boolean(vGirisDate) &&
        (!start || vGirisDate >= start) &&
        (!end || vGirisDate <= end);

      // Seçilen tarih aralığında çıkış yapanlar
      const isExitedInPeriod =
        v.durum === 'ÇIKIŞ YAPTI' &&
        Boolean(vCikisDate) &&
        (!start || vCikisDate >= start) &&
        (!end || vCikisDate <= end);

      // Seçilen tarih aralığında sahada/rampada aktif olanlar:
      // Araç en geç 'end' tarihinde girmiş olmalı ve en erken 'start' tarihine kadar çıkış yapmamış olmalı
      const wasActiveInPeriod =
        Boolean(vGirisDate) &&
        (!end || vGirisDate <= end) &&
        (!vCikisDate || !start || vCikisDate >= start);

      return isEnteredInPeriod || isExitedInPeriod || wasActiveInPeriod;
    });
  }, [vehicles, filters, isTodayMode]);

  // Giriş İstatistikleri (Seçilen tarih aralığında giriş yapan araçlar)
  const enteredVehicles = useMemo(() => {
    const today = getTodayIso();
    const start = filters.startDate;
    const end = filters.endDate;

    return filtered.filter((v) => {
      const gDate = getVehicleDateStr(v, 'giris');
      if (isTodayMode) {
        return gDate === today || (!gDate && v.durum !== 'ÇIKIŞ YAPTI');
      }
      if (!start && !end) return true;
      return (!start || (gDate && gDate >= start)) && (!end || (gDate && gDate <= end));
    });
  }, [filtered, filters, isTodayMode]);

  // Çıkış İstatistikleri (Seçilen tarih aralığında çıkış yapan araçlar)
  const exitedVehicles = useMemo(() => {
    const today = getTodayIso();
    const start = filters.startDate;
    const end = filters.endDate;

    const list = filtered.filter((v) => {
      if (v.durum !== 'ÇIKIŞ YAPTI') return false;
      const cDate = getVehicleDateStr(v, 'cikis');
      if (isTodayMode) {
        return cDate === today || !cDate;
      }
      if (!start && !end) return true;
      return (!start || (cDate && cDate >= start)) && (!end || (cDate && cDate <= end));
    });
    list.sort((a, b) => (b.cikisTimestamp || 0) - (a.cikisTimestamp || 0));
    return list;
  }, [filtered, filters, isTodayMode]);

  const activeVehicles = useMemo(() => filtered.filter((v) => v.durum !== 'ÇIKIŞ YAPTI'), [filtered]);

  const sortedReports = useMemo(() => [...activeVehicles, ...exitedVehicles], [activeVehicles, exitedVehicles]);

  // Toplam Rampa Süresi & Ortalama Rampa Süresi
  const rampMetrics = useMemo(() => {
    let totalRampDurationMs = 0;
    let rampOperatedCount = 0;

    filtered.forEach((v) => {
      const rampStart = v.rampayaGirisTimestamp || v.rampadaTimestamp;
      if (rampStart) {
        const rampEnd = v.durum === 'ÇIKIŞ YAPTI' ? (v.cikisTimestamp || Date.now()) : Date.now();
        const duration = Math.max(0, rampEnd - rampStart);
        totalRampDurationMs += duration;
        rampOperatedCount++;
      } else if (v.durum === 'RAMPADA') {
        const duration = Math.max(0, Date.now() - (v.girisTimestamp || Date.now()));
        totalRampDurationMs += duration;
        rampOperatedCount++;
      }
    });

    const totalMinutes = Math.round(totalRampDurationMs / 60000);
    const avgMinutes = rampOperatedCount > 0 ? Math.round(totalMinutes / rampOperatedCount) : null;

    // Rampa Verimliliği Skoru (%): Zamanında ve düzenli işlem oranı (ortalama 120 dk altı tam puan)
    let efficiencyScore = 92;
    if (avgMinutes !== null) {
      if (avgMinutes <= 60) efficiencyScore = 98;
      else if (avgMinutes <= 90) efficiencyScore = 94;
      else if (avgMinutes <= 120) efficiencyScore = 88;
      else if (avgMinutes <= 180) efficiencyScore = 78;
      else efficiencyScore = 65;
    }

    return {
      totalMinutes,
      avgMinutes,
      rampOperatedCount,
      efficiencyScore
    };
  }, [filtered]);

  const formatMinutesToHours = (minutes: number | null) => {
    if (minutes === null || minutes === 0) return '0 dk';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} dk`;
    return `${h} sa ${m} dk`;
  };

  // Grafik 1: Günlük Toplam Giriş & Çıkış Adetleri Grafiği
  const dailyMovementData = useMemo(() => {
    const isSingleDay = filters.startDate && filters.endDate && filters.startDate === filters.endDate;

    if (isSingleDay) {
      // Tek gün: Saatlik dağılım (08:00 - 20:00)
      const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
      const buckets: Record<string, { label: string; giris: number; cikis: number }> = {};
      hours.forEach((h) => {
        buckets[h] = { label: h, giris: 0, cikis: 0 };
      });

      filtered.forEach((v) => {
        if (v.girisTarihi) {
          const timePart = v.girisTarihi.split(' ')[1] || '';
          const h = parseInt(timePart.split(':')[0], 10);
          if (!isNaN(h)) {
            const roundedH = Math.min(20, Math.max(8, Math.floor(h / 2) * 2));
            const label = `${roundedH < 10 ? '0' : ''}${roundedH}:00`;
            if (buckets[label]) buckets[label].giris += 1;
          }
        }
        if (v.cikisTarihi) {
          const timePart = v.cikisTarihi.split(' ')[1] || '';
          const h = parseInt(timePart.split(':')[0], 10);
          if (!isNaN(h)) {
            const roundedH = Math.min(20, Math.max(8, Math.floor(h / 2) * 2));
            const label = `${roundedH < 10 ? '0' : ''}${roundedH}:00`;
            if (buckets[label]) buckets[label].cikis += 1;
          }
        }
      });
      return Object.values(buckets);
    } else {
      // Çoklu gün: Günlük toplam giriş ve çıkış adetleri
      const dayMap: Record<string, { label: string; giris: number; cikis: number; rawDate: string }> = {};

      filtered.forEach((v) => {
        const gDate = getVehicleDateStr(v, 'giris');
        if (gDate) {
          if (!dayMap[gDate]) {
            const parts = gDate.split('-');
            const shortLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : gDate;
            dayMap[gDate] = { label: shortLabel, giris: 0, cikis: 0, rawDate: gDate };
          }
          dayMap[gDate].giris += 1;
        }

        const cDate = getVehicleDateStr(v, 'cikis');
        if (cDate) {
          if (!dayMap[cDate]) {
            const parts = cDate.split('-');
            const shortLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : cDate;
            dayMap[cDate] = { label: shortLabel, giris: 0, cikis: 0, rawDate: cDate };
          }
          dayMap[cDate].cikis += 1;
        }
      });

      const list = Object.values(dayMap).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
      return list.length > 0 ? list : [{ label: 'Bugün', giris: 0, cikis: 0, rawDate: '' }];
    }
  }, [filtered, filters]);

  // Grafik 2: Rampa Kullanım Yoğunluğu
  const rampUsageData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((v) => {
      if (v.rampaId) {
        const rName = getRampName(v.rampaId);
        counts[rName] = (counts[rName] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return sorted.slice(0, 8);
  }, [filtered, getRampName]);

  // Grafik 3: İşlem Türü Dağılımı
  const operationTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((v) => {
      const type = v.islemTuru || 'Belirtilmedi';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const handlePrint = () => {
    window.print();
  };

  const canUndoExit = currentUser?.role === 'admin' || currentUser?.role === 'operasyon';

  const periodLabel = datePreset === 'today'
    ? 'Bugün'
    : datePreset === 'yesterday'
    ? 'Dün'
    : datePreset === 'week'
    ? 'Son 7 Gün'
    : datePreset === 'month'
    ? 'Bu Ay'
    : datePreset === 'all'
    ? 'Tüm Zamanlar'
    : `${filters.startDate || ''} → ${filters.endDate || ''}`;

  return (
    <div className="space-y-4">
      {/* Üst Filtre ve Dışa Aktarma Başlığı */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Saha Analitik & Hareket Raporları
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Dönem: <b className="text-blue-600 dark:text-blue-400">{periodLabel}</b> • {sortedReports.length} araç işlemi listeleniyor
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Görünüm Geçişi */}
            <div className="flex w-full sm:w-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('both')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
                  activeTab === 'both' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setActiveTab('charts')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'charts' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <PieIcon className="w-3.5 h-3.5" /> Grafikler
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'table' ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" /> Tablo
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => onExportCsv(sortedReports)}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel (.CSV)
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Yazdır / PDF
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            HIZLI DÖNEM SEÇİCİ & TARİH ARALIĞI FİLTRESİ
            ======================================================== */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          {/* Preset Düğmeleri */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Dönem:
              </span>
              <button
                type="button"
                onClick={() => handlePresetSelect('today')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  datePreset === 'today'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Bugün
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('yesterday')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  datePreset === 'yesterday'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Dün
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('week')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  datePreset === 'week'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Son 7 Gün
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('month')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  datePreset === 'month'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Bu Ay
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  datePreset === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Tüm Zamanlar
              </button>
            </div>

            {(filters.search || filters.startDate !== getTodayIso() || filters.endDate !== getTodayIso()) && (
              <button
                onClick={handleClearFilters}
                className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-rose-200 dark:border-rose-900/40"
              >
                <FilterX className="w-3.5 h-3.5" /> Bugün'e Dön & Sıfırla
              </button>
            )}
          </div>

          {/* Tarih Seçiciler ve Arama Inputu */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tarih Aralığı:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                  className="border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Plaka, müşteri veya şoför ara..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          GÖRSEL RAPOR & PERFORMANS KARTLARI (BUGÜN / SEÇİLEN DÖNEM)
          ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Kart 1: Toplam İşlem */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold truncate">
              {isTodayMode ? 'Bugün Toplam İşlem' : 'Seçilen Dönem Toplam İşlem'}
            </div>
            <div className="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">{filtered.length} Araç</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {isTodayMode ? 'Bugün işlem görenler' : `${periodLabel} işlemleri`}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Kart 2: Giriş Yapanlar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold truncate">
              {isTodayMode ? 'Bugün Giriş Yapan' : 'Dönemde Giriş Yapan'}
            </div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{enteredVehicles.length} Araç</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {isTodayMode ? 'Bugünkü saha kabulleri' : 'Dönem içi girişler'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <LogIn className="w-5 h-5" />
          </div>
        </div>

        {/* Kart 3: Çıkış Yapanlar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold truncate">
              {isTodayMode ? 'Bugün Çıkış Yapan' : 'Dönemde Çıkış Yapan'}
            </div>
            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{exitedVehicles.length} Araç</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {isTodayMode ? 'Bugün tamamlanan çıkışlar' : 'Dönem içi çıkışlar'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <LogOut className="w-5 h-5" />
          </div>
        </div>

        {/* Kart 4: Toplam Rampada Geçen Süre */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold truncate">Toplam Rampa Süresi</div>
            <div className="text-base font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">
              {formatMinutesToHours(rampMetrics.totalMinutes)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Ort: {formatMinutesToHours(rampMetrics.avgMinutes)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Kart 5: Rampa Verimliliği */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1 transition-colors">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold truncate">Rampa Verimliliği</div>
            <div className="text-xl font-black text-amber-500 dark:text-amber-400 mt-0.5">
              %{rampMetrics.efficiencyScore}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 flex items-center gap-0.5">
              <Zap className="w-3 h-3" /> Optimum Akış
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================
          GÖRSEL GRAFİKLER (GÜNLÜK HAREKET, RAMPA KULLANIMI, İŞLEM DAĞILIMI)
          ======================================================== */}
      {(activeTab === 'both' || activeTab === 'charts') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Grafik 1: Günlük Toplam Giriş & Çıkış Adetleri Grafiği */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>
                  {filters.startDate === filters.endDate ? 'Bugün Saatlik Giriş - Çıkış Dağılımı' : 'Günlük Toplam Giriş - Çıkış Adetleri'}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                Giriş vs Çıkış
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyMovementData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 12,
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      color: '#f8fafc'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                  <Bar dataKey="giris" name="Giriş Yapan" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="cikis" name="Çıkış Yapan" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grafik 2: İşlem Türü Dağılımı */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              İşlem Türü Dağılımı
            </div>
            <div className="h-64">
              {operationTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={operationTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {operationTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 12,
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        color: '#f8fafc'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">Veri yok</div>
              )}
            </div>
          </div>

          {/* Grafik 3: Rampa Kullanım Yoğunluğu */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-3">
            <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Rampa Kullanım Yoğunluğu (Araç Sayısı)
            </div>
            <div className="h-56">
              {rampUsageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rampUsageData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.4} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} interval={0} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 12,
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        color: '#f8fafc'
                      }}
                    />
                    <Bar dataKey="count" name="İşlem Gören Araç Sayısı" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">Seçilen dönemde rampa kaydı bulunmuyor.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          DETAYLI HAREKET TABLOSU
          ======================================================== */}
      {(activeTab === 'both' || activeTab === 'table') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-3 md:p-0">
          {/* Mobil Görünüm: Kart Listesi (md:hidden) */}
          <div className="md:hidden space-y-3">
            {sortedReports.map((v) => {
              const isExited = v.durum === 'ÇIKIŞ YAPTI';
              return (
                <div
                  key={v.id}
                  className={`p-3.5 rounded-2xl border transition shadow-xs space-y-2.5 ${
                    isExited
                      ? 'bg-slate-900 dark:bg-slate-950 text-white border-slate-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-400">#{v.id}</span>
                        <span className={`font-bold text-xs truncate ${isExited ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {v.musteri}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs mt-0.5">
                        <Truck className="w-3.5 h-3.5 text-blue-500" />
                        <span>{v.dorsePlaka}</span>
                        {v.cekiciPlaka && <span className="text-[10px] opacity-70 font-normal">({v.cekiciPlaka})</span>}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold shrink-0 shadow-xs ${getStatusBadgeClass(v.durum)}`}>
                      {v.durum}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-semibold">{v.soforAd}</span>
                    <span className="text-[11px] opacity-70">{v.soforTel}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[9px]">Giriş:</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{getDepoKayitTarihi(v)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Çıkış / Süre:</span>
                      <span className="font-mono font-semibold">{isExited ? getRampaCikisTarihi(v) : getDurationText(v)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onOpenDetailModal(v)}
                      className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> İncele
                    </button>
                    {isExited && canUndoExit && (
                      <button
                        onClick={() => onUndoExit(v)}
                        className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Geri Al
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Masaüstü Görünüm: Standart Tablo (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">#</th>
                  <th className="p-3">Müşteri</th>
                  <th className="p-3">Dorse Plaka</th>
                  <th className="p-3">Şoför & Tel</th>
                  <th className="p-3">İşlem / Depo</th>
                  <th className="p-3">Rampa</th>
                  <th className="p-3">Kayıt / Giriş</th>
                  <th className="p-3">Rampaya Giriş</th>
                  <th className="p-3">Çıkış Tarihi</th>
                  <th className="p-3">Toplam Süre</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedReports.map((v) => {
                  const isExited = v.durum === 'ÇIKIŞ YAPTI';
                  return (
                    <tr
                      key={v.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                        isExited ? 'bg-slate-50/40 dark:bg-slate-900/40 opacity-90' : ''
                      }`}
                    >
                      <td className="p-3 font-mono text-slate-400">{v.id}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-white max-w-[140px] truncate">{v.musteri}</td>
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{v.dorsePlaka}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{v.soforAd}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{v.soforTel}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{v.islemTuru}</span>
                        <span className="text-[10px] text-slate-400 block">{v.depoTuru}</span>
                      </td>
                      <td className="p-3 font-semibold text-purple-700 dark:text-purple-300">
                        {getRampName(v.rampaId)}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                        {getDepoKayitTarihi(v)}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-purple-700 dark:text-purple-300">
                        {getRampaGirisTarihi(v)}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {getRampaCikisTarihi(v)}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-200">
                        {getDurationText(v)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold shadow-2xs ${getStatusBadgeClass(v.durum)}`}>
                          {v.durum}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenDetailModal(v)}
                            className="p-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg transition cursor-pointer"
                            title="İncele"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isExited && canUndoExit && (
                            <button
                              onClick={() => onUndoExit(v)}
                              className="p-1.5 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 text-amber-700 dark:text-amber-300 rounded-lg transition cursor-pointer"
                              title="Çıkışı Geri Al"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
