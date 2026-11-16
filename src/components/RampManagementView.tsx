import React, { useState, useEffect, useMemo } from 'react';
import { Ramp, Vehicle, User, Warehouse, SlaSettings } from '../types';
import { getRampStatusClass, cleanPhone, cleanPhoneForWa } from '../utils/helpers';
import { hasPermission } from '../utils/permissions';
import { RampSlaIndicator } from './RampSlaIndicator';
import { getVehicleStageTimes } from '../utils/slaHelpers';
import {
  Warehouse as WarehouseIcon,
  Truck,
  Box,
  Zap,
  Search,
  LogOut,
  ShieldAlert,
  Phone,
  MessageSquare,
  CheckCircle,
  Wrench,
  X,
  Eye,
  Flame,
  Plus,
  SlidersHorizontal,
  Camera,
  StickyNote,
  ArrowUpDown,
  LayoutGrid,
  Grid3x3,
  Clock,
  FileCheck2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface RampManagementViewProps {
  ramps: Ramp[];
  vehicles: Vehicle[];
  warehouses?: Warehouse[];
  selectedDepoId?: number;
  slaSettings?: SlaSettings;
  currentUser?: User | null;
  onRampStatusChange: (ramp: Ramp, newStatus: Ramp['durum'], arizaNotu?: string | null) => void;
  onChangeVehicleRamp: (vehicle: Vehicle, targetRampId: number) => void;
  onReleaseRampVehicle: (vehicle: Vehicle) => void;
  onAuthorizeExitVehicle?: (vehicle: Vehicle) => void;
  onOpenRampAssignModal: (ramp: Ramp) => void;
  onOpenDetailModal?: (v: Vehicle) => void;
  onOpenPhotoGallery?: (v: Vehicle) => void;
  onOpenRampManager?: () => void;
  onOpenSlaSettings?: () => void;
}

type RampSortOption = 'default' | 'sla_delay' | 'empty_first' | 'urgent_first';

const MAINTENANCE_PRESETS = [
  'Hidrolik / Rampa Körüğü Arızası',
  'Kapı / Kilit Mekanizması Bakımı',
  'Zemin Temizliği / Güvenlik Kontrolü',
  'Elektrik / Aydınlatma Arızası'
];

export const RampManagementView: React.FC<RampManagementViewProps> = ({
  ramps,
  vehicles,
  warehouses = [],
  selectedDepoId = 0,
  slaSettings,
  currentUser,
  onRampStatusChange,
  onChangeVehicleRamp,
  onReleaseRampVehicle,
  onAuthorizeExitVehicle,
  onOpenRampAssignModal,
  onOpenDetailModal,
  onOpenPhotoGallery,
  onOpenRampManager,
  onOpenSlaSettings
}) => {
  const [statusFilter, setStatusFilter] = useState<'Tümü' | 'Boş' | 'Dolu' | 'Gecikmede' | 'Bakım-Arıza'>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<RampSortOption>('default');
  const [gridDensity, setGridDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  const activeFilterCount = (statusFilter !== 'Tümü' ? 1 : 0) + (sortBy !== 'default' ? 1 : 0);

  // Arıza / Bakım Notu Modal Durumu
  const [noteModalState, setNoteModalState] = useState<{
    ramp: Ramp;
    targetStatus: 'Arızalı' | 'Bakımda';
    note: string;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const canManageRamps =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'security' ||
    hasPermission(currentUser, 'canManageRampStatus');

  const canAssignRamp =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'security' ||
    hasPermission(currentUser, 'canAssignRamp');

  const canReleaseRamp =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'security' ||
    hasPermission(currentUser, 'canReleaseRamp');

  const canAuthorizeExit =
    currentUser?.role === 'admin' || hasPermission(currentUser, 'canAuthorizeExit');

  const getRampVehicle = (rampaId: number) => {
    return vehicles.find((v) => v.rampaId === rampaId && v.durum === 'RAMPADA');
  };

  const getAvailableRampsForMove = (rampDepoId?: number) => {
    const targetDepo = rampDepoId || 1;
    return ramps.filter((r) => (r.depoId || 1) === targetDepo && r.durum === 'Boş');
  };

  const getWarehouseShortName = (depoId?: number) => {
    const id = depoId || 1;
    const found = warehouses.find((w) => w.id === id);
    if (!found) return `Depo ${id}`;
    return found.ad.split(' - ')[0] || found.ad;
  };

  const getReadyWaitingCountForDepo = (depoId?: number) => {
    const target = depoId || 1;
    return vehicles.filter((v) => v.durum === 'EVRAK HAZIR' && (v.depoId || 1) === target).length;
  };

  const totalReadyWaitingCount = useMemo(() => {
    if (selectedDepoId !== 0) {
      return vehicles.filter((v) => v.durum === 'EVRAK HAZIR' && (v.depoId || 1) === selectedDepoId).length;
    }
    const visibleDepoIds = new Set(ramps.map((r) => r.depoId || 1));
    return vehicles.filter((v) => v.durum === 'EVRAK HAZIR' && visibleDepoIds.has(v.depoId || 1)).length;
  }, [vehicles, ramps, selectedDepoId]);

  // İstatistikler & Doluluk Oranı
  const totalCount = ramps.length;
  const emptyCount = ramps.filter((r) => r.durum === 'Boş').length;
  const fullCount = ramps.filter((r) => r.durum === 'Dolu').length;
  const overdueCount = ramps.filter((r) => {
    const v = getRampVehicle(r.id);
    return v && getVehicleStageTimes(v, now, slaSettings).isOverdue;
  }).length;
  const maintenanceCount = ramps.filter((r) => r.durum === 'Arızalı' || r.durum === 'Bakımda').length;
  const usableCount = Math.max(0, totalCount - maintenanceCount);
  const occupancyPercent = usableCount > 0 ? Math.min(100, Math.round((fullCount / usableCount) * 100)) : 0;

  // Filtreleme & Sıralama
  const filteredRamps = useMemo(() => {
    let list = [...ramps];

    if (statusFilter === 'Boş') {
      list = list.filter((r) => r.durum === 'Boş');
    } else if (statusFilter === 'Dolu') {
      list = list.filter((r) => r.durum === 'Dolu');
    } else if (statusFilter === 'Gecikmede') {
      list = list.filter((r) => {
        const v = getRampVehicle(r.id);
        return v && getVehicleStageTimes(v, now, slaSettings).isOverdue;
      });
    } else if (statusFilter === 'Bakım-Arıza') {
      list = list.filter((r) => r.durum === 'Arızalı' || r.durum === 'Bakımda');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const matchRampName = r.ad.toLowerCase().includes(q) || (r.arizaNotu && r.arizaNotu.toLowerCase().includes(q));
        const vehicle = getRampVehicle(r.id);
        const matchVehicle =
          vehicle &&
          ((vehicle.dorsePlaka && vehicle.dorsePlaka.toLowerCase().includes(q)) ||
            (vehicle.cekiciPlaka && vehicle.cekiciPlaka.toLowerCase().includes(q)) ||
            (vehicle.konteynirNo && vehicle.konteynirNo.toLowerCase().includes(q)) ||
            (vehicle.musteri && vehicle.musteri.toLowerCase().includes(q)) ||
            (vehicle.soforAd && vehicle.soforAd.toLowerCase().includes(q)));
        return matchRampName || matchVehicle;
      });
    }

    list.sort((a, b) => {
      const va = getRampVehicle(a.id);
      const vb = getRampVehicle(b.id);
      const sa = va ? getVehicleStageTimes(va, now, slaSettings) : null;
      const sb = vb ? getVehicleStageTimes(vb, now, slaSettings) : null;

      if (sortBy === 'sla_delay') {
        const aOver = !!sa?.isOverdue;
        const bOver = !!sb?.isOverdue;
        if (aOver !== bOver) return aOver ? -1 : 1;
        if (aOver && bOver) {
          const dDiff = (sb?.delayMinutes || 0) - (sa?.delayMinutes || 0);
          if (dDiff !== 0) return dDiff;
        }
        const aWarn = sa?.status === 'WARNING';
        const bWarn = sb?.status === 'WARNING';
        if (aWarn !== bWarn) return aWarn ? -1 : 1;
        if ((a.durum === 'Dolu') !== (b.durum === 'Dolu')) return a.durum === 'Dolu' ? -1 : 1;
      } else if (sortBy === 'empty_first') {
        const rank = (d: Ramp['durum']) => (d === 'Boş' ? 0 : d === 'Dolu' ? 1 : 2);
        const rDiff = rank(a.durum) - rank(b.durum);
        if (rDiff !== 0) return rDiff;
      } else if (sortBy === 'urgent_first') {
        const aUrgent = !!va?.isAcik;
        const bUrgent = !!vb?.isAcik;
        if (aUrgent !== bUrgent) return aUrgent ? -1 : 1;
        const aOver = !!sa?.isOverdue;
        const bOver = !!sb?.isOverdue;
        if (aOver !== bOver) return aOver ? -1 : 1;
      }

      return a.id - b.id;
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ramps, vehicles, statusFilter, searchQuery, sortBy, now, slaSettings]);

  const handleStatusSelectChange = (ramp: Ramp, nextStatus: Ramp['durum']) => {
    if (nextStatus === 'Arızalı' || nextStatus === 'Bakımda') {
      setNoteModalState({
        ramp,
        targetStatus: nextStatus,
        note: ramp.arizaNotu || ''
      });
      return;
    }
    onRampStatusChange(ramp, nextStatus, null);
  };

  const handleSaveMaintenanceNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteModalState) return;
    onRampStatusChange(
      noteModalState.ramp,
      noteModalState.targetStatus,
      noteModalState.note.trim() || null
    );
    setNoteModalState(null);
  };

  return (
    <div className="space-y-4 max-w-[2560px] mx-auto w-full">
      {currentUser?.role === 'guest' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <b>İzleme Modu:</b> Rampa durum değişiklikleri ve araç atamaları Yönetici ve Güvenlik yetkisine tabidir.
          </span>
        </div>
      )}

      {/* Depo Rampa Kapasitesi & Hazır Araç Özet Bandı */}
      <div className="bg-white dark:bg-slate-900 p-3.5 md:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 min-w-0">
                <WarehouseIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">Rampa Kapasite & Doluluk Özeti</span>
              </div>
              <span className="font-mono tabular-nums font-black text-xs text-slate-800 dark:text-slate-100 shrink-0">
                %{occupancyPercent} Doluluk ({fullCount}/{usableCount} Aktif)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${totalCount > 0 ? Math.round(((fullCount - overdueCount) / totalCount) * 100) : 0}%` }}
              />
              <div
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${totalCount > 0 ? Math.round((overdueCount / totalCount) * 100) : 0}%` }}
              />
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${totalCount > 0 ? Math.round((maintenanceCount / totalCount) * 100) : 0}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 tabular-nums ${
                totalReadyWaitingCount > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="Sahada evrakları hazır olup rampa ataması bekleyen araç sayısı"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Rampa Bekleyen (Evrak Hazır):</span>
              <strong className="font-mono text-sm">{totalReadyWaitingCount}</strong>
            </div>
          </div>
        </div>

        {/* Üst Arama, Sıralama & Yönetim Araçları */}
        <div className="flex flex-col lg:flex-row gap-2.5 justify-between items-stretch lg:items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-2.5 md:top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rampa Adı, Plaka, Çekici, Müşteri veya Arıza Notu Ara..."
                className="w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  aria-label="Aramayı Temizle"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              aria-expanded={mobileFiltersOpen}
              className={`md:hidden shrink-0 min-h-[40px] px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                mobileFiltersOpen || activeFilterCount > 0
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtreler</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-extrabold tabular-nums">
                  {activeFilterCount}
                </span>
              )}
              {mobileFiltersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className={`${mobileFiltersOpen ? 'flex' : 'hidden md:flex'} flex-wrap items-center gap-2 shrink-0 min-w-0`}>
            <div className="flex items-center gap-1.5 w-full sm:w-auto min-w-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 min-h-[40px]">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as RampSortOption)}
                aria-label="Rampa Sıralaması"
                className="w-full sm:w-auto min-w-0 bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="default">Sırala: Rampa Sırası</option>
                <option value="sla_delay">Sırala: SLA Gecikme Öncelikli</option>
                <option value="urgent_first">Sırala: Acil Araçlar Üstte</option>
                <option value="empty_first">Sırala: Önce Boş Rampalar</option>
              </select>
            </div>

            <div className="hidden lg:inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setGridDensity('comfortable')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                  gridDensity === 'comfortable'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title="Ferah 4 Sütun Görünümü"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>4'lü</span>
              </button>
              <button
                type="button"
                onClick={() => setGridDensity('compact')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                  gridDensity === 'compact'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
                title="Kompakt 6 Sütun Görünümü"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
                <span>6'lı</span>
              </button>
            </div>

            {currentUser?.role === 'admin' && (onOpenRampManager || onOpenSlaSettings) && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {onOpenRampManager && (
                  <button
                    type="button"
                    onClick={onOpenRampManager}
                    className="flex-1 sm:flex-none min-h-[40px] px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Depo Rampalarını Yönet</span>
                  </button>
                )}
                {onOpenSlaSettings && (
                  <button
                    type="button"
                    onClick={onOpenSlaSettings}
                    className="flex-1 sm:flex-none min-h-[40px] px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap"
                    title="Boşaltma, Yükleme ve Tahliye SLA Hedef Sürelerini Ayarla"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>SLA Ayarları</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Durum Filtreleme Sekmeleri — Mobilde açılır panelde, masaüstünde her zaman görünür */}
        <div className={`${mobileFiltersOpen ? 'flex' : 'hidden md:flex'} items-center gap-1.5 overflow-x-auto pb-1 custom-scroll text-xs`}>
          <button
            type="button"
            onClick={() => setStatusFilter('Tümü')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums ${
              statusFilter === 'Tümü'
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tümü
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">{totalCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Boş')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums ${
              statusFilter === 'Boş'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Boş
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-extrabold">
              {emptyCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Dolu')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums ${
              statusFilter === 'Dolu'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Dolu
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 font-extrabold">
              {fullCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Gecikmede')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums ${
              statusFilter === 'Gecikmede'
                ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${overdueCount > 0 ? 'text-red-600 dark:text-red-400 animate-bounce' : 'text-red-500'}`} />
            Gecikmede
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                overdueCount > 0
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-red-200 dark:bg-red-900/60 text-red-900 dark:text-red-200'
              }`}
            >
              {overdueCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Bakım-Arıza')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums ${
              statusFilter === 'Bakım-Arıza'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Bakım / Arıza
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-extrabold">
              {maintenanceCount}
            </span>
          </button>
        </div>
      </div>

      {/* Rampa Kartları Grid Düzeni */}
      <div
        className={`grid gap-2.5 ${
          gridDensity === 'compact'
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        {filteredRamps.map((r) => {
          const vehicle = getRampVehicle(r.id);
          const stage = vehicle ? getVehicleStageTimes(vehicle, now, slaSettings) : null;
          const isOverdue = stage?.isOverdue;
          const isMaintenance = r.durum === 'Arızalı' || r.durum === 'Bakımda';
          const readyWaitingInThisDepo = getReadyWaitingCountForDepo(r.depoId);
          const notesCount = vehicle?.guvenlikNotlari?.length || 0;
          const photosCount = vehicle?.fotograflar?.length || 0;

          return (
            <div
              key={r.id}
              className={`ramp-item bg-white dark:bg-slate-900 rounded-xl border shadow-2xs overflow-hidden flex flex-col justify-between transition hover:shadow-sm ${
                isOverdue
                  ? 'border-red-500 dark:border-red-600 ring-2 ring-red-400/70'
                  : r.durum === 'Dolu'
                  ? 'border-blue-300 dark:border-blue-800'
                  : r.durum === 'Boş'
                  ? 'border-emerald-200 dark:border-emerald-800/80'
                  : 'border-amber-300 dark:border-amber-700'
              }`}
            >
              {/* Rampa Başlık & Durum */}
              <div
                className={`px-2.5 py-2 border-b flex items-center justify-between gap-1.5 ${
                  isOverdue
                    ? 'bg-red-50 dark:bg-red-950/70 border-red-300 dark:border-red-800'
                    : isMaintenance
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                    : 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80'
                }`}
              >
                <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded-md font-mono tabular-nums font-black text-xs shrink-0 tracking-tight shadow-xs whitespace-nowrap ${
                      isOverdue
                        ? 'bg-red-600 text-white ring-1 ring-red-400'
                        : r.durum === 'Dolu'
                        ? 'bg-blue-600 text-white ring-1 ring-blue-400'
                        : r.durum === 'Boş'
                        ? 'bg-emerald-600 text-white ring-1 ring-emerald-400'
                        : 'bg-amber-600 text-white ring-1 ring-amber-400'
                    }`}
                  >
                    {r.ad}
                  </span>
                  {selectedDepoId === 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 truncate max-w-[70px]">
                      {getWarehouseShortName(r.depoId)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {canManageRamps ? (
                    <select
                      value={r.durum}
                      onChange={(e) => handleStatusSelectChange(r, e.target.value as Ramp['durum'])}
                      aria-label={`${r.ad} Durumu`}
                      className={`text-[10px] font-bold border rounded-md px-1.5 py-1 outline-none cursor-pointer shadow-2xs ${getRampStatusClass(
                        r.durum
                      )}`}
                    >
                      <option value="Boş">Boş</option>
                      <option value="Dolu">Dolu</option>
                      <option value="Arızalı">Arızalı</option>
                      <option value="Bakımda">Bakımda</option>
                    </select>
                  ) : (
                    <span className={`text-[10px] font-bold border rounded-md px-1.5 py-0.5 ${getRampStatusClass(r.durum)}`}>
                      {r.durum}
                    </span>
                  )}
                </div>
              </div>

              {/* Rampa İçeriği */}
              <div className="p-2.5 flex-1 flex flex-col justify-between text-xs space-y-2">
                {vehicle ? (
                  <div className="space-y-2 flex-1 flex flex-col justify-between">
                    <div
                      className={`p-2 rounded-lg relative overflow-hidden space-y-1.5 border ${
                        isOverdue
                          ? 'bg-red-50/75 dark:bg-red-950/40 border-red-300 dark:border-red-800'
                          : 'bg-blue-50/60 dark:bg-blue-950/35 border-blue-200 dark:border-blue-800/80'
                      }`}
                    >
                      {vehicle.isAcik && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl-md shadow flex items-center gap-0.5 z-10">
                          <Zap className="w-2.5 h-2.5" /> ACİL
                        </div>
                      )}

                      {/* Dorse & Çekici Plakası */}
                      <div className="flex items-center gap-1.5 flex-wrap pr-10">
                        <div className="inline-flex items-center border border-slate-800 dark:border-slate-600 rounded overflow-hidden font-mono tabular-nums font-black text-[10px] shadow-2xs bg-white">
                          <span className="bg-blue-600 text-white px-1 py-0.5 text-[7px] font-bold">TR</span>
                          <span className="px-1.5 py-0.5 tracking-wider text-slate-900">{vehicle.dorsePlaka}</span>
                        </div>
                        {vehicle.cekiciPlaka && (
                          <span className="text-[10px] font-mono tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                            ({vehicle.cekiciPlaka})
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {vehicle.musteri}
                      </p>

                      {vehicle.konteynirNo && (
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate flex items-center gap-1 font-mono tabular-nums">
                          <Box className="w-3 h-3 text-slate-400 shrink-0" /> {vehicle.konteynirNo}
                        </p>
                      )}

                      <div className="pt-1 border-t border-slate-200/70 dark:border-slate-700/60 flex justify-between text-[10px] text-slate-700 dark:text-slate-300 font-medium">
                        <span>{vehicle.depoTuru}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{vehicle.islemTuru}</span>
                      </div>

                      {/* Canlı SLA Göstergesi */}
                      <RampSlaIndicator vehicle={vehicle} slaSettings={slaSettings} />

                      {/* Şoför İletişim */}
                      {vehicle.soforTel && (
                        <div className="pt-1 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-1.5">
                          <span className="text-[10px] text-slate-700 dark:text-slate-200 truncate font-semibold min-w-0">
                            {vehicle.soforAd || 'Şoför'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={`tel:${cleanPhone(vehicle.soforTel)}`}
                              className="min-h-[34px] px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[10px] flex items-center gap-1 shadow-2xs active:scale-95"
                              title="Şoförü Ara"
                            >
                              <Phone className="w-3 h-3" /> Ara
                            </a>
                            <a
                              href={`https://wa.me/${cleanPhoneForWa(vehicle.soforTel)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="min-w-[34px] min-h-[34px] p-1.5 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-md flex items-center justify-center border border-emerald-300 dark:border-emerald-800 active:scale-95"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* İncele, Fotoğraf Galerisi ve Güvenlik Notu Hızlı Erişim */}
                      <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                        {onOpenDetailModal && (
                          <button
                            type="button"
                            onClick={() => onOpenDetailModal(vehicle)}
                            className="flex-1 min-h-[38px] md:min-h-[32px] py-1 px-2 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                            title="Araç Detaylarını İncele"
                          >
                            <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>İncele</span>
                          </button>
                        )}

                        {onOpenPhotoGallery && (
                          <button
                            type="button"
                            onClick={() => onOpenPhotoGallery(vehicle)}
                            className="min-h-[38px] md:min-h-[32px] py-1 px-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer tabular-nums"
                            title="Araç Fotoğraflarını Görüntüle"
                          >
                            <Camera className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>({photosCount})</span>
                          </button>
                        )}

                        {notesCount > 0 && onOpenDetailModal && (
                          <button
                            type="button"
                            onClick={() => onOpenDetailModal(vehicle)}
                            className="min-h-[38px] md:min-h-[32px] py-1 px-2.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer tabular-nums"
                            title="Güvenlik Notlarını Gör"
                          >
                            <StickyNote className="w-3 h-3" />
                            <span>{notesCount}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Rampa Taşıma, Rampadan Çıkar & Hızlı Saha Çıkışı */}
                    <div className="space-y-1.5">
                      {canAssignRamp && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              onChangeVehicleRamp(vehicle, Number(e.target.value));
                              e.target.value = '';
                            }
                          }}
                          className="w-full min-h-[40px] md:min-h-[34px] text-[10px] font-bold border rounded-lg px-2 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 cursor-pointer shadow-2xs truncate"
                        >
                          <option value="">Rampa Değiştir...</option>
                          {getAvailableRampsForMove(r.depoId).map((targetR) => (
                            <option key={targetR.id} value={targetR.id}>
                              {targetR.ad} 'ye Taşı
                            </option>
                          ))}
                        </select>
                      )}

                      <div className="flex items-center gap-1.5">
                        {canReleaseRamp && (
                          <button
                            type="button"
                            onClick={() => onReleaseRampVehicle(vehicle)}
                            className="flex-1 min-h-[40px] md:min-h-[34px] py-1 px-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-extrabold rounded-lg transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-98"
                          >
                            <LogOut className="w-3 h-3" /> Rampadan Çıkar
                          </button>
                        )}

                        {canAuthorizeExit && onAuthorizeExitVehicle && (
                          <button
                            type="button"
                            onClick={() => onAuthorizeExitVehicle(vehicle)}
                            className="min-h-[40px] md:min-h-[34px] py-1 px-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-extrabold rounded-lg transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-98"
                            title="Araca doğrudan saha çıkış onayı ver"
                          >
                            <LogOut className="w-3 h-3" /> Çıkış
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : isMaintenance ? (
                  <div className="h-full flex flex-col justify-between py-1 space-y-2 min-h-[120px]">
                    <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200 font-bold text-[11px]">
                        <Wrench className="w-3.5 h-3.5 shrink-0" />
                        <span>{r.durum}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-snug">
                        {r.arizaNotu || 'Bakım/arıza nedeni henüz girilmedi.'}
                      </p>
                      {r.bakimBaslangic && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {r.bakimBaslangic}
                        </p>
                      )}
                    </div>

                    {canManageRamps && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setNoteModalState({
                              ramp: r,
                              targetStatus: r.durum === 'Arızalı' ? 'Arızalı' : 'Bakımda',
                              note: r.arizaNotu || ''
                            })
                          }
                          className="flex-1 min-h-[40px] md:min-h-[34px] py-1 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition"
                        >
                          Notu Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => onRampStatusChange(r, 'Boş', null)}
                          className="flex-1 min-h-[40px] md:min-h-[34px] py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition"
                        >
                          Boşa Al
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-between py-1 text-slate-400 min-h-[120px]">
                    <div className="text-center py-2 space-y-1">
                      <Truck className="w-5 h-5 mx-auto opacity-30 text-slate-500 dark:text-slate-400" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-200">Boş Rampa</p>
                      <p
                        className={`text-[10px] font-semibold tabular-nums ${
                          readyWaitingInThisDepo > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {readyWaitingInThisDepo > 0
                          ? `Sahada ${readyWaitingInThisDepo} Evrak Hazır araç bekliyor`
                          : 'Atamaya hazır'}
                      </p>
                    </div>

                    {r.durum === 'Boş' && canAssignRamp && (
                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => onOpenRampAssignModal(r)}
                          className="w-full min-h-[42px] md:min-h-[36px] py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>Araç Seç & Ata</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredRamps.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 space-y-3">
          <WarehouseIcon className="w-8 h-8 mx-auto opacity-40 text-blue-500" />
          <p className="text-xs font-semibold">
            {ramps.length === 0 && selectedDepoId !== 0
              ? 'Seçili depoya henüz rampa tanımlanmamış.'
              : 'Aradığınız kriterlere uygun rampa bulunamadı.'}
          </p>
          {ramps.length === 0 && currentUser?.role === 'admin' && onOpenRampManager && (
            <button
              type="button"
              onClick={onOpenRampManager}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Bu Depoya Rampa Tanımla
            </button>
          )}
        </div>
      )}

      {/* Arıza / Bakım Nedeni Giriş Modalı */}
      {noteModalState && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[calc(var(--vvh,100dvh)-env(safe-area-inset-top,0px)-0.5rem)] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {noteModalState.ramp.ad} — {noteModalState.targetStatus} Notu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNoteModalState(null)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenanceNote} className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 space-y-3 text-xs overflow-y-auto custom-scroll">
              <div className="space-y-1.5">
                <p className="font-semibold text-slate-600 dark:text-slate-300">Hazır Nedenler:</p>
                <div className="flex flex-wrap gap-1.5">
                  {MAINTENANCE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNoteModalState({ ...noteModalState, note: preset })}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold cursor-pointer transition text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-200 block">
                  Arıza / Bakım Açıklaması (İsteğe Bağlı)
                </label>
                <textarea
                  rows={3}
                  maxLength={280}
                  value={noteModalState.note}
                  onChange={(e) => setNoteModalState({ ...noteModalState, note: e.target.value })}
                  placeholder="Örn: Hidrolik körük bakımı nedeniyle kapalı..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-2.5 outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNoteModalState(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold cursor-pointer shadow-sm"
                >
                  Durumu ve Notu Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
