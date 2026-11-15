import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, Ramp, User, SlaSettings } from '../types';
import { cleanPhone, cleanPhoneForWa, getDurationText } from '../utils/helpers';
import { hasPermission } from '../utils/permissions';
import { getVehicleStageTimes, VehicleStageTimes } from '../utils/slaHelpers';
import { RampSlaIndicator } from './RampSlaIndicator';
import {
  Search,
  Plus,
  Phone,
  MessageSquare,
  Camera,
  Edit3,
  Megaphone,
  X,
  AlertTriangle,
  LogOut,
  Warehouse as WarehouseIcon,
  Clock,
  Truck,
  Zap,
  Eye,
  LogIn,
  Check,
  Flame,
  ArrowUpDown,
  Download,
  StickyNote,
  RotateCcw,
  CheckSquare,
  Square,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface VehicleManagementViewProps {
  vehicles: Vehicle[];
  ramps: Ramp[];
  currentUser: User | null;
  slaSettings?: SlaSettings;
  selectedDepoId?: number;
  getWarehouseNameById?: (id: number) => string;
  onNotify?: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  onOpenNewVehicleModal: () => void;
  onOpenEditModal: (v: Vehicle) => void;
  onOpenDetailModal: (v: Vehicle) => void;
  onOpenPhotoGallery: (v: Vehicle) => void;
  onUpdateStatus: (v: Vehicle, newStatus: Vehicle['durum']) => void;
  onBulkMakeReady?: (vehicles: Vehicle[]) => void;
  onExportCsv?: (vehicles: Vehicle[]) => void;
  onAssignRamp: (v: Vehicle, rampId: number | null) => void;
  onSendAdminCallRequest: (v: Vehicle) => void;
  onCancelRampCall: (v: Vehicle) => void;
  onToggleAcil: (v: Vehicle) => void;
}

type StatusFilter = 'TÜMÜ' | 'BEKLEMEDE' | 'EVRAK HAZIR' | 'RAMPADA';
type ProcessFilter = 'TÜMÜ' | 'Boşaltma' | 'Yükleme';
type DepoTypeFilter = 'TÜMÜ' | 'Antrepo' | 'Serbest Depo';
type SortOption = 'default' | 'oldest' | 'sla_delay' | 'plate_asc';

export const VehicleManagementView: React.FC<VehicleManagementViewProps> = ({
  vehicles,
  ramps,
  currentUser,
  slaSettings,
  selectedDepoId = 0,
  getWarehouseNameById,
  onNotify,
  onOpenNewVehicleModal,
  onOpenEditModal,
  onOpenDetailModal,
  onOpenPhotoGallery,
  onUpdateStatus,
  onBulkMakeReady,
  onExportCsv,
  onAssignRamp,
  onSendAdminCallRequest,
  onCancelRampCall,
  onToggleAcil
}) => {
  const [now, setNow] = useState<number>(Date.now());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TÜMÜ');
  const [islemFilter, setIslemFilter] = useState<ProcessFilter>('TÜMÜ');
  const [depoTuruFilter, setDepoTuruFilter] = useState<DepoTypeFilter>('TÜMÜ');
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const canCreateVehicle = currentUser?.role === 'admin' || hasPermission(currentUser, 'canCreateVehicle');
  const canEditVehicle = currentUser?.role === 'admin' || hasPermission(currentUser, 'canEditVehicle');
  const canAuthorizeExit = currentUser?.role === 'admin' || hasPermission(currentUser, 'canAuthorizeExit');
  const canMakeReady = currentUser?.role === 'admin' || hasPermission(currentUser, 'canMakeReady');
  const canAssignRamp =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'security' ||
    hasPermission(currentUser, 'canAssignRamp');
  const canCallVehicle = currentUser?.role === 'admin' || hasPermission(currentUser, 'canCallVehicle');
  const canCancelCall = canCallVehicle;
  const canToggleAcil = currentUser?.role === 'admin' || hasPermission(currentUser, 'canToggleAcil');
  const canExportReports = currentUser?.role === 'admin' || hasPermission(currentUser, 'canExportReports');

  const activeVehicles = useMemo(
    () => vehicles.filter((v) => v.durum !== 'ÇIKIŞ YAPTI'),
    [vehicles]
  );

  const stageByVehicleId = useMemo(() => {
    const map = new Map<number, VehicleStageTimes>();
    activeVehicles.forEach((v) => {
      map.set(v.id, getVehicleStageTimes(v, now, slaSettings));
    });
    return map;
  }, [activeVehicles, now, slaSettings]);

  const isVehicleOverdue = (v: Vehicle) => {
    const st = stageByVehicleId.get(v.id);
    return v.durum === 'RAMPADA' && !!st?.isOverdue;
  };

  const overdueCount = useMemo(
    () => activeVehicles.filter((v) => isVehicleOverdue(v)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeVehicles, stageByVehicleId]
  );

  const urgentCount = useMemo(
    () => activeVehicles.filter((v) => v.isAcik).length,
    [activeVehicles]
  );

  const isVehicleSerbestDepo = (v?: Vehicle | null) => {
    if (!v) return false;
    const dt = (v.depoTuru || '').toLowerCase().trim();
    return dt === 'serbest depo' || dt === 'serbest' || dt.includes('serbest');
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = activeVehicles.filter((v) => {
      if (statusFilter !== 'TÜMÜ' && v.durum !== statusFilter) return false;
      if (islemFilter !== 'TÜMÜ' && v.islemTuru !== islemFilter) return false;

      if (depoTuruFilter === 'Serbest Depo' && !isVehicleSerbestDepo(v)) return false;
      if (depoTuruFilter === 'Antrepo' && isVehicleSerbestDepo(v)) return false;

      if (onlyUrgent && !v.isAcik) return false;
      if (onlyOverdue && !isVehicleOverdue(v)) return false;

      if (!q) return true;
      return (
        v.dorsePlaka.toLowerCase().includes(q) ||
        (v.cekiciPlaka && v.cekiciPlaka.toLowerCase().includes(q)) ||
        (v.konteynirNo && v.konteynirNo.toLowerCase().includes(q)) ||
        (v.soforTel && v.soforTel.toLowerCase().includes(q)) ||
        (v.nakliyeFirmasi && v.nakliyeFirmasi.toLowerCase().includes(q)) ||
        v.musteri.toLowerCase().includes(q) ||
        v.soforAd.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortBy === 'oldest') {
        const aTs = a.girisTimestamp || a.id;
        const bTs = b.girisTimestamp || b.id;
        return aTs - bTs;
      }

      if (sortBy === 'plate_asc') {
        return a.dorsePlaka.localeCompare(b.dorsePlaka, 'tr');
      }

      if (sortBy === 'sla_delay') {
        const aStage = stageByVehicleId.get(a.id);
        const bStage = stageByVehicleId.get(b.id);
        const aOverdue = a.durum === 'RAMPADA' && !!aStage?.isOverdue;
        const bOverdue = b.durum === 'RAMPADA' && !!bStage?.isOverdue;

        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (aOverdue && bOverdue) {
          const delayDiff = (bStage?.delayMinutes || 0) - (aStage?.delayMinutes || 0);
          if (delayDiff !== 0) return delayDiff;
        }

        const aWarn = a.durum === 'RAMPADA' && aStage?.status === 'WARNING';
        const bWarn = b.durum === 'RAMPADA' && bStage?.status === 'WARNING';
        if (aWarn !== bWarn) return aWarn ? -1 : 1;

        if (a.isAcik !== b.isAcik) return a.isAcik ? -1 : 1;

        const aWait =
          a.durum === 'RAMPADA'
            ? aStage?.rampaIslemMinutes || 0
            : a.durum === 'EVRAK HAZIR'
            ? aStage?.rampaBeklemeMinutes || 0
            : aStage?.evrakHazirlikMinutes || 0;
        const bWait =
          b.durum === 'RAMPADA'
            ? bStage?.rampaIslemMinutes || 0
            : b.durum === 'EVRAK HAZIR'
            ? bStage?.rampaBeklemeMinutes || 0
            : bStage?.evrakHazirlikMinutes || 0;
        if (bWait !== aWait) return bWait - aWait;

        return b.id - a.id;
      }

      // Default: Acil + En Yeni
      if (a.isAcik && !b.isAcik) return -1;
      if (!a.isAcik && b.isAcik) return 1;
      return b.id - a.id;
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeVehicles,
    search,
    statusFilter,
    islemFilter,
    depoTuruFilter,
    onlyUrgent,
    onlyOverdue,
    sortBy,
    stageByVehicleId
  ]);

  // Keep selectedIds valid (only active BEKLEMEDE vehicles)
  useEffect(() => {
    const validPendingIds = new Set(
      activeVehicles.filter((v) => v.durum === 'BEKLEMEDE').map((v) => v.id)
    );
    setSelectedIds((prev) => {
      const next = prev.filter((id) => validPendingIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [activeVehicles]);

  const filteredPendingVehicles = useMemo(
    () => filtered.filter((v) => v.durum === 'BEKLEMEDE'),
    [filtered]
  );

  const selectedPendingVehicles = useMemo(
    () => activeVehicles.filter((v) => v.durum === 'BEKLEMEDE' && selectedIds.includes(v.id)),
    [activeVehicles, selectedIds]
  );

  const allFilteredPendingSelected =
    filteredPendingVehicles.length > 0 &&
    filteredPendingVehicles.every((v) => selectedIds.includes(v.id));

  const toggleSelectVehicle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFilteredPending = () => {
    if (filteredPendingVehicles.length === 0) return;
    if (allFilteredPendingSelected) {
      const filteredPendingSet = new Set(filteredPendingVehicles.map((v) => v.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredPendingSet.has(id)));
    } else {
      const next = new Set(selectedIds);
      filteredPendingVehicles.forEach((v) => next.add(v.id));
      setSelectedIds(Array.from(next));
    }
  };

  const activeFilterCount =
    (statusFilter !== 'TÜMÜ' ? 1 : 0) +
    (islemFilter !== 'TÜMÜ' ? 1 : 0) +
    (depoTuruFilter !== 'TÜMÜ' ? 1 : 0) +
    (onlyUrgent ? 1 : 0) +
    (onlyOverdue ? 1 : 0) +
    (sortBy !== 'default' ? 1 : 0);

  const hasActiveFilters = search.trim() !== '' || activeFilterCount > 0;

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('TÜMÜ');
    setIslemFilter('TÜMÜ');
    setDepoTuruFilter('TÜMÜ');
    setOnlyUrgent(false);
    setOnlyOverdue(false);
    setSortBy('default');
  };

  const getAvailableRampsForVehicle = (v: Vehicle) => {
    const vDepo = v.depoId || 1;
    return ramps.filter(
      (r) => (!r.depoId || r.depoId === vDepo) && (r.durum === 'Boş' || r.id === v.rampaId)
    );
  };

  const getRampName = (rampId: number | null | undefined) => {
    if (!rampId) return null;
    const r = ramps.find((item) => item.id === rampId);
    return r ? r.ad : `Rampa #${rampId}`;
  };

  const countByStatus = (st: 'BEKLEMEDE' | 'EVRAK HAZIR' | 'RAMPADA') => {
    return activeVehicles.filter((v) => v.durum === st).length;
  };

  const handleConfirmExit = (v: Vehicle) => {
    onUpdateStatus(v, 'ÇIKIŞ YAPTI');
  };

  const handleQuickAssignRamp = (v: Vehicle) => {
    if (!canAssignRamp) {
      onNotify?.('Rampa atama yetkiniz bulunmamaktadır.', 'warning');
      return;
    }

    const isSerbest = isVehicleSerbestDepo(v);
    const isSecurityOrAdmin = currentUser?.role === 'security' || currentUser?.role === 'admin';
    const canDirectToRamp = v.durum === 'EVRAK HAZIR' || (isSerbest && isSecurityOrAdmin);

    if (!canDirectToRamp) {
      onNotify?.(
        `Rampa ataması için araç durumu 'EVRAK HAZIR' olmalıdır. Mevcut Durum: ${v.durum}`,
        'warning'
      );
      return;
    }

    if (v.rampaId) {
      onAssignRamp(v, v.rampaId);
      return;
    }

    const vDepo = v.depoId || 1;
    const availableRamps = getAvailableRampsForVehicle(v);
    const emptyRamp =
      availableRamps.find((r) => {
        const isOccupied = vehicles.some(
          (o) => o.rampaId === r.id && o.durum === 'RAMPADA' && o.id !== v.id
        );
        return r.durum === 'Boş' && !isOccupied && (r.depoId || 1) === vDepo;
      }) || availableRamps.find((r) => r.durum === 'Boş');

    if (!emptyRamp) {
      onNotify?.('Bu depoda şu anda müsait boş bir rampa bulunamadı.', 'warning');
      return;
    }

    onAssignRamp(v, emptyRamp.id);
  };

  const renderStageSlaBadge = (v: Vehicle) => {
    const stage = stageByVehicleId.get(v.id);
    if (!stage) return null;

    if (v.durum === 'RAMPADA') {
      return <RampSlaIndicator vehicle={v} compact slaSettings={slaSettings} />;
    }

    if (v.durum === 'EVRAK HAZIR') {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono tabular-nums text-[9px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
          title="Evrak hazır onayından bu yana rampa bekleme süresi"
        >
          <Clock className="w-2.5 h-2.5 shrink-0" />
          <span>Rampa Bekleme: {stage.rampaBeklemeText}</span>
        </span>
      );
    }

    if (v.durum === 'BEKLEMEDE') {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono tabular-nums text-[9px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
          title="Tesis girişinden bu yana evrak bekleme süresi"
        >
          <Clock className="w-2.5 h-2.5 shrink-0" />
          <span>Evrak Bekleme: {stage.evrakHazirlikText}</span>
        </span>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4 max-w-[2560px] mx-auto w-full">
      {/* Üst Arama, Hızlı Özet & Filtre Paneli */}
      <div className="bg-white dark:bg-slate-900 p-3 md:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 md:space-y-3 transition-colors">
        <div className="flex flex-col md:flex-row gap-2 md:gap-2.5 justify-between items-stretch md:items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-2.5 md:top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Dorse, Çekici, Konteynır, Müşteri veya Şoför ara..."
                className="w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
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
              className={`md:hidden shrink-0 px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
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

          <div className="flex items-center gap-2 shrink-0">
            {canExportReports && onExportCsv && (
              <button
                type="button"
                onClick={() => onExportCsv(filtered)}
                disabled={filtered.length === 0}
                className="flex-1 md:flex-initial px-3 py-2 md:py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                title="Filtrelenmiş aktif araç listesini CSV/Excel olarak indir"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>CSV İndir ({filtered.length})</span>
              </button>
            )}

            {canCreateVehicle && (
              <button
                type="button"
                onClick={onOpenNewVehicleModal}
                className="flex-1 md:flex-initial px-4 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 active:scale-98 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" /> Yeni Araç Ekle
              </button>
            )}
          </div>
        </div>

        {/* Mobilde açılır/kapanır detay filtreler — masaüstünde her zaman açık */}
        <div className={`${mobileFiltersOpen ? 'block' : 'hidden md:block'} space-y-2.5 md:space-y-3`}>
        {/* Durum Sekmeleri + Canlı Acil / SLA Gecikme Filtreleri */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scroll text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('TÜMÜ')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums ${
              statusFilter === 'TÜMÜ'
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tümü
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {activeVehicles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('BEKLEMEDE')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums ${
              statusFilter === 'BEKLEMEDE'
                ? 'bg-amber-500 text-slate-900 shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800'
            }`}
          >
            Beklemede
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-extrabold">
              {countByStatus('BEKLEMEDE')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('EVRAK HAZIR')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums ${
              statusFilter === 'EVRAK HAZIR'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            Evrak Hazır
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-extrabold">
              {countByStatus('EVRAK HAZIR')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('RAMPADA')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums ${
              statusFilter === 'RAMPADA'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
            }`}
          >
            Rampada
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 font-extrabold">
              {countByStatus('RAMPADA')}
            </span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

          <button
            type="button"
            onClick={() => setOnlyUrgent((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums border ${
              onlyUrgent
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Sadece Acil</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${onlyUrgent ? 'bg-white/25 text-white' : 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100'}`}>
              {urgentCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyOverdue((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer tabular-nums border ${
              onlyOverdue
                ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                : overdueCount > 0
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${overdueCount > 0 && !onlyOverdue ? 'text-red-600 animate-pulse' : ''}`} />
            <span>SLA Gecikenler</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              onlyOverdue
                ? 'bg-white/25 text-white'
                : overdueCount > 0
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {overdueCount}
            </span>
          </button>
        </div>

        {/* İkincil Filtreler & Sıralama Çubuğu */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">İşlem:</span>
              <select
                value={islemFilter}
                onChange={(e) => setIslemFilter(e.target.value as ProcessFilter)}
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TÜMÜ">Tüm İşlemler</option>
                <option value="Boşaltma">Boşaltma</option>
                <option value="Yükleme">Yükleme</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Depo Türü:</span>
              <select
                value={depoTuruFilter}
                onChange={(e) => setDepoTuruFilter(e.target.value as DepoTypeFilter)}
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TÜMÜ">Tümü</option>
                <option value="Antrepo">Antrepo</option>
                <option value="Serbest Depo">Serbest Depo</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Sıralama Ölçütü"
              >
                <option value="default">Sırala: Acil ve En Yeni</option>
                <option value="oldest">Sırala: En Uzun Bekleyen</option>
                <option value="sla_delay">Sırala: SLA Gecikme Öncelikli</option>
                <option value="plate_asc">Sırala: Plaka (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {canMakeReady && onBulkMakeReady && filteredPendingVehicles.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllFilteredPending}
                className="md:hidden px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {allFilteredPendingSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Bekleyenleri Seç ({filteredPendingVehicles.length})</span>
              </button>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Filtreleri Sıfırla</span>
              </button>
            )}

            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
              Gösterilen: <strong className="text-slate-800 dark:text-slate-100">{filtered.length}</strong> / {activeVehicles.length}
            </span>
          </div>
        </div>
        </div>
      </div>

      {/* ================= TELEFON / MOBİL GÖRÜNÜM (KOMPAKT & TAM YETKİLİ KART DÜZENİ) ================= */}
      <div className="block md:hidden space-y-2.5">
        {filtered.map((v) => {
          const rampName = getRampName(v.rampaId);
          const isOverdue = isVehicleOverdue(v);
          const isSelected = selectedIds.includes(v.id);
          const notesCount = v.guvenlikNotlari?.length || 0;
          const warehouseName = selectedDepoId === 0 && getWarehouseNameById ? getWarehouseNameById(v.depoId || 1) : null;

          return (
            <div
              key={v.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border p-2.5 shadow-2xs space-y-2 transition-colors ${
                v.isAcik || isOverdue
                  ? 'border-red-400 dark:border-red-700 bg-red-50/40 dark:bg-red-950/20'
                  : isSelected
                  ? 'border-emerald-500 ring-1 ring-emerald-500/40'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Kart Başlığı: Seçim, Plakalar, Acil, Depo & Durum */}
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {canMakeReady && onBulkMakeReady && v.durum === 'BEKLEMEDE' && (
                    <button
                      type="button"
                      onClick={() => toggleSelectVehicle(v.id)}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                      aria-label={`${v.dorsePlaka} seç`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  )}

                  <div className="inline-flex items-center border border-slate-800 dark:border-slate-600 rounded overflow-hidden font-mono tabular-nums font-black text-[11px] bg-white shadow-2xs">
                    <span className="bg-blue-600 text-white px-1 py-0.5 text-[7px] font-bold">TR</span>
                    <span className="px-1.5 py-0.5 tracking-wider text-slate-900">{v.dorsePlaka}</span>
                  </div>

                  {v.cekiciPlaka && (
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono tabular-nums font-semibold">
                      Çekici: {v.cekiciPlaka}
                    </span>
                  )}

                  {v.isAcik && (
                    <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[8px] font-black shadow-2xs flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> ACİL
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  {warehouseName && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {warehouseName}
                    </span>
                  )}
                  {rampName && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-0.5">
                      <WarehouseIcon className="w-2.5 h-2.5" /> {rampName}
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border tracking-tight ${
                      v.durum === 'BEKLEMEDE'
                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                        : v.durum === 'EVRAK HAZIR'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                        : v.durum === 'RAMPADA'
                        ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {v.durum}
                  </span>
                </div>
              </div>

              {/* Müşteri, Nakliye, Şoför & Canlı SLA Bilgisi */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-2 rounded-lg text-[11px] space-y-1 border border-slate-100 dark:border-slate-700/50 leading-tight">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{v.musteri}</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 shrink-0 font-medium truncate max-w-[120px]">
                    {v.nakliyeFirmasi || 'Nakliye Yok'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300">
                  <span className="truncate">
                    <b className="text-slate-800 dark:text-slate-100 font-semibold">{v.soforAd}</b>{' '}
                    {v.soforTel && <span className="text-slate-400 tabular-nums">({v.soforTel})</span>}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`tel:${cleanPhone(v.soforTel)}`}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition"
                      title="Ara"
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                    <a
                      href={`https://wa.me/${cleanPhoneForWa(v.soforTel)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-md border border-emerald-300 dark:border-emerald-700 transition"
                      title="WhatsApp"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
                  <span className="truncate">
                    {v.depoTuru} • {v.islemTuru}
                    {v.konteynirNo ? ` • Kont: ${v.konteynirNo}` : ''}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums">{v.girisTarihi}</span>
                </div>

                {/* Canlı SLA & Güvenlik Notu Satırı */}
                <div className="flex items-center justify-between gap-1.5 pt-1 flex-wrap">
                  <div>{renderStageSlaBadge(v)}</div>
                  {notesCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenDetailModal(v)}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[9px] font-bold cursor-pointer tabular-nums"
                    >
                      <StickyNote className="w-2.5 h-2.5" /> {notesCount} Not
                    </button>
                  )}
                </div>
              </div>

              {/* Rampa Çağrısı Alarmı */}
              {v.isRampayaCagrildi && (
                <div className="bg-amber-500 text-slate-900 font-black px-2 py-1.5 rounded-lg text-[10px] flex items-center justify-between shadow-2xs">
                  <span className="flex items-center gap-1">
                    <Megaphone className="w-3 h-3" /> Rampaya Çağrıldı!
                  </span>
                  {canCancelCall && (
                    <button
                      type="button"
                      onClick={() => onCancelRampCall(v)}
                      className="px-2 py-0.5 bg-red-800 text-white text-[9px] font-bold rounded cursor-pointer"
                    >
                      İptal
                    </button>
                  )}
                </div>
              )}

              {/* Mobil Ana Aksiyon Butonları (Dokunmatik Dostu Yükseklik) */}
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => onOpenDetailModal(v)}
                  className="min-h-[36px] py-1 px-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                  title="Detay İncele"
                >
                  <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>İncele</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPhotoGallery(v)}
                  className="min-h-[36px] py-1 px-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer tabular-nums"
                  title="Fotoğraflar"
                >
                  <Camera className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Foto ({v.fotograflar?.length || 0})</span>
                </button>

                {canEditVehicle ? (
                  <button
                    type="button"
                    onClick={() => onOpenEditModal(v)}
                    className="min-h-[36px] py-1 px-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                    title="Düzenle"
                  >
                    <Edit3 className="w-3 h-3 shrink-0" />
                    <span>Düzenle</span>
                  </button>
                ) : (
                  <div />
                )}

                {canAuthorizeExit ? (
                  <button
                    type="button"
                    onClick={() => handleConfirmExit(v)}
                    className="min-h-[36px] py-1 px-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                    title="Çıkış Ver"
                  >
                    <LogOut className="w-3 h-3 shrink-0" />
                    <span>Çıkış</span>
                  </button>
                ) : (
                  <div />
                )}
              </div>

              {/* Evrak Durumu, Rampa Seçimi, Acil ve Çağrı Kontrolleri */}
              {currentUser?.role !== 'guest' && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={v.durum}
                      onChange={(e) => onUpdateStatus(v, e.target.value as Vehicle['durum'])}
                      className="w-full min-h-[36px] text-[11px] font-bold border border-slate-300 dark:border-slate-700 rounded-lg px-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="BEKLEMEDE">BEKLEMEDE</option>
                      <option value="EVRAK HAZIR" disabled={!canMakeReady && v.durum !== 'EVRAK HAZIR'}>
                        EVRAK HAZIR {!canMakeReady && v.durum !== 'EVRAK HAZIR' ? '(Yetki Gerekir)' : ''}
                      </option>
                      <option value="RAMPADA" disabled={!canAssignRamp && v.durum !== 'RAMPADA'}>
                        RAMPADA {!canAssignRamp && v.durum !== 'RAMPADA' ? '(Yetki Gerekir)' : ''}
                      </option>
                      <option value="ÇIKIŞ YAPTI" disabled={!canAuthorizeExit && v.durum !== 'ÇIKIŞ YAPTI'}>
                        ÇIKIŞ YAPTI {!canAuthorizeExit && v.durum !== 'ÇIKIŞ YAPTI' ? '(Yetki Gerekir)' : ''}
                      </option>
                    </select>

                    <div className="flex items-center gap-1">
                      {(() => {
                        const isSerbest = isVehicleSerbestDepo(v);
                        const isSecurityOrAdmin = currentUser?.role === 'security' || currentUser?.role === 'admin';
                        const canDirectToRamp = v.durum === 'EVRAK HAZIR' || v.durum === 'RAMPADA' || (isSerbest && isSecurityOrAdmin);

                        return (
                          <select
                            value={v.rampaId ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : null;
                              if (val !== null && !canDirectToRamp) {
                                onNotify?.(
                                  `Rampa ataması için aracın durumunun 'EVRAK HAZIR' olması gerekir. Mevcut Durum: ${v.durum}`,
                                  'warning'
                                );
                                return;
                              }
                              onAssignRamp(v, val);
                            }}
                            disabled={!canDirectToRamp || !canAssignRamp}
                            className={`w-full min-h-[36px] text-[11px] font-bold border rounded-lg px-2 outline-none focus:ring-1 focus:ring-purple-500 truncate ${
                              !canDirectToRamp || !canAssignRamp
                                ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                : isSerbest && v.durum !== 'EVRAK HAZIR' && v.durum !== 'RAMPADA'
                                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                                : 'border-purple-300 dark:border-purple-700 bg-purple-50/70 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                            }`}
                          >
                            <option value="">Rampa: {v.rampaId ? getRampName(v.rampaId) : 'Seçilmedi'}</option>
                            {getAvailableRampsForVehicle(v).map((r) => {
                              const isOccupiedByOther = vehicles.some(
                                (o) => o.rampaId === r.id && o.durum === 'RAMPADA' && o.id !== v.id
                              );
                              return (
                                <option
                                  key={r.id}
                                  value={r.id}
                                  disabled={isOccupiedByOther && r.durum === 'Dolu'}
                                >
                                  {r.ad} ({r.durum}){isOccupiedByOther ? ' [Dolu]' : ''}
                                </option>
                              );
                            })}
                          </select>
                        );
                      })()}
                      {v.rampaId && canAssignRamp && (
                        <button
                          type="button"
                          onClick={() => onAssignRamp(v, null)}
                          className="min-h-[36px] px-2 text-[10px] font-bold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg shrink-0 cursor-pointer"
                          title="Rampa Atamasını Kaldır"
                        >
                          X
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobil Ek Operasyon Butonları: Evrak Hazır, Hızlı Rampa, Güvenliğe Çağrı & Acil */}
                  <div className="flex flex-wrap gap-1.5">
                    {v.durum === 'BEKLEMEDE' && canMakeReady && (
                      <button
                        type="button"
                        onClick={() => onUpdateStatus(v, 'EVRAK HAZIR')}
                        className="flex-1 min-w-[140px] min-h-[36px] py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 shadow-2xs transition active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Evrak Hazır Onayı</span>
                      </button>
                    )}

                    {canAssignRamp &&
                      (v.durum === 'EVRAK HAZIR' ||
                        (isVehicleSerbestDepo(v) &&
                          (currentUser?.role === 'security' || currentUser?.role === 'admin') &&
                          v.durum === 'BEKLEMEDE')) &&
                      !v.rampaId && (
                        <button
                          type="button"
                          onClick={() => handleQuickAssignRamp(v)}
                          className={`flex-1 min-w-[140px] min-h-[36px] py-1.5 px-2.5 font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 transition active:scale-98 cursor-pointer shadow-2xs ${
                            isVehicleSerbestDepo(v) && v.durum !== 'EVRAK HAZIR'
                              ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white'
                              : 'bg-linear-to-r from-purple-600 to-indigo-600 text-white'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          <span>
                            {isVehicleSerbestDepo(v) && v.durum !== 'EVRAK HAZIR'
                              ? 'Serbest Depo: Rampa Ata'
                              : 'Boş Rampaya Hızlı Ata'}
                          </span>
                        </button>
                      )}

                    {v.durum === 'EVRAK HAZIR' && !v.isRampayaCagrildi && canCallVehicle && (
                      <button
                        type="button"
                        onClick={() => onSendAdminCallRequest(v)}
                        className="flex-1 min-w-[150px] min-h-[36px] py-1.5 px-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-[10px] rounded-lg transition flex items-center justify-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Güvenliğe Çağrı Gönder</span>
                      </button>
                    )}

                    {canToggleAcil && (
                      <button
                        type="button"
                        onClick={() => onToggleAcil(v)}
                        className={`min-h-[36px] py-1.5 px-3 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1 cursor-pointer ${
                          v.isAcik
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-2xs'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>{v.isAcik ? 'Acil Kaldır' : 'Acil Araç'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
            <Truck className="w-8 h-8 mx-auto opacity-30 text-slate-500" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Aradığınız kriterlere uygun sahada aktif araç bulunamadı.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Filtreleri Sıfırla
              </button>
            )}
          </div>
        )}
      </div>

      {/* ================= MASAÜSTÜ YÜKSEK YOĞUNLUKLU TABLO GÖRÜNÜMÜ ================= */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto max-h-[640px] custom-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase font-semibold shadow-sm">
              <tr>
                {canMakeReady && onBulkMakeReady && (
                  <th className="p-2.5 w-9 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAllFilteredPending}
                      disabled={filteredPendingVehicles.length === 0}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      title={
                        filteredPendingVehicles.length > 0
                          ? "Tüm 'BEKLEMEDE' araçları seç / kaldır"
                          : 'Seçilebilir BEKLEMEDE araç yok'
                      }
                    >
                      {allFilteredPendingSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="p-2.5">Müşteri Adı</th>
                <th className="p-2.5">Dorse, Çekici & Konteynır</th>
                <th className="p-2.5">Şoför Bilgisi</th>
                <th className="p-2.5">Depo / İşlem Türü</th>
                <th className="p-2.5">Araç Durumu & SLA</th>
                <th className="p-2.5">Rampa Numarası</th>
                <th className="p-2.5 text-center">Fotoğraf</th>
                <th className="p-2.5">Kayıt Tarihi</th>
                <th className="p-2.5 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((v) => {
                const isOverdue = isVehicleOverdue(v);
                const isSelected = selectedIds.includes(v.id);
                const notesCount = v.guvenlikNotlari?.length || 0;
                const warehouseName =
                  selectedDepoId === 0 && getWarehouseNameById ? getWarehouseNameById(v.depoId || 1) : null;

                return (
                  <tr
                    key={v.id}
                    className={`transition ${
                      v.isAcik || isOverdue
                        ? 'bg-red-50/75 dark:bg-red-950/25 hover:bg-red-100/70 dark:hover:bg-red-950/35'
                        : isSelected
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {canMakeReady && onBulkMakeReady && (
                      <td className="p-2.5 text-center align-middle">
                        {v.durum === 'BEKLEMEDE' ? (
                          <button
                            type="button"
                            onClick={() => toggleSelectVehicle(v.id)}
                            className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer"
                            aria-label={`${v.dorsePlaka} seç`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 text-[10px]">—</span>
                        )}
                      </td>
                    )}

                    <td className="p-3">
                      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span>{v.musteri}</span>
                        {v.isAcik && (
                          <span className="bg-red-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow-2xs inline-flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> ACİL ARAÇ
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {warehouseName && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {warehouseName}
                          </span>
                        )}
                        {notesCount > 0 && (
                          <button
                            type="button"
                            onClick={() => onOpenDetailModal(v)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[9px] font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition cursor-pointer tabular-nums"
                            title="Güvenlik notlarını görüntüle"
                          >
                            <StickyNote className="w-2.5 h-2.5" /> {notesCount} Not
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {v.dorsePlaka}
                      </div>
                      {v.cekiciPlaka && (
                        <div className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300 font-semibold">
                          Çekici: {v.cekiciPlaka}
                        </div>
                      )}
                      <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {v.konteynirNo || 'Konteynır Yok'}
                      </div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        {v.nakliyeFirmasi}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{v.soforAd}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <a
                          href={`tel:${cleanPhone(v.soforTel)}`}
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 font-mono tabular-nums"
                          title="Şoförü Ara"
                        >
                          <Phone className="w-3 h-3" /> {v.soforTel}
                        </a>
                        <a
                          href={`https://wa.me/${cleanPhoneForWa(v.soforTel)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1.5 py-0.5 bg-emerald-500 text-white rounded font-bold text-[9px] hover:bg-emerald-600 transition flex items-center gap-1"
                          title="WhatsApp Mesaj Gönder"
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-700 dark:text-slate-200">{v.depoTuru}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">{v.islemTuru}</div>
                    </td>

                    <td className="p-3 space-y-1.5">
                      <select
                        value={v.durum}
                        onChange={(e) => onUpdateStatus(v, e.target.value as Vehicle['durum'])}
                        disabled={currentUser?.role === 'guest'}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 w-full"
                      >
                        <option value="BEKLEMEDE">BEKLEMEDE</option>
                        <option value="EVRAK HAZIR" disabled={!canMakeReady && v.durum !== 'EVRAK HAZIR'}>
                          EVRAK HAZIR {!canMakeReady && v.durum !== 'EVRAK HAZIR' ? '(Yetki Gerekir)' : ''}
                        </option>
                        <option value="RAMPADA" disabled={!canAssignRamp && v.durum !== 'RAMPADA'}>
                          RAMPADA {!canAssignRamp && v.durum !== 'RAMPADA' ? '(Yetki Gerekir)' : ''}
                        </option>
                        <option value="ÇIKIŞ YAPTI" disabled={!canAuthorizeExit && v.durum !== 'ÇIKIŞ YAPTI'}>
                          ÇIKIŞ YAPTI {!canAuthorizeExit && v.durum !== 'ÇIKIŞ YAPTI' ? '(Yetki Gerekir)' : ''}
                        </option>
                      </select>

                      <div>{renderStageSlaBadge(v)}</div>

                      {v.durum === 'BEKLEMEDE' && canMakeReady && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(v, 'EVRAK HAZIR')}
                          className="w-full px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                          title="Aracı 'EVRAK HAZIR' durumuna getir"
                        >
                          <Check className="w-3 h-3" /> Evrak Hazır Yap
                        </button>
                      )}

                      {v.isRampayaCagrildi && (
                        <div className="bg-amber-500 text-slate-900 font-extrabold px-2 py-1 rounded text-[9px] shadow-sm flex items-center justify-between gap-1">
                          <span className="flex items-center gap-1">
                            <Megaphone className="w-3 h-3" /> Rampaya Çağrıldı
                          </span>
                          {canCancelCall && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCancelRampCall(v);
                              }}
                              className="w-4 h-4 rounded-full bg-red-700 hover:bg-red-800 text-white flex items-center justify-center text-[9px] cursor-pointer"
                              title="Çağrıyı İptal Et"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="relative space-y-1">
                        {(() => {
                          const isSerbest = isVehicleSerbestDepo(v);
                          const isSecurityOrAdmin = currentUser?.role === 'security' || currentUser?.role === 'admin';
                          const canDirectToRamp =
                            v.durum === 'EVRAK HAZIR' || v.durum === 'RAMPADA' || (isSerbest && isSecurityOrAdmin);

                          return (
                            <>
                              <select
                                value={v.rampaId ?? ''}
                                onChange={(e) => onAssignRamp(v, e.target.value ? Number(e.target.value) : null)}
                                disabled={!canDirectToRamp || !canAssignRamp || currentUser?.role === 'guest'}
                                title={
                                  !canAssignRamp || currentUser?.role === 'guest'
                                    ? 'Rampa atama yetkiniz bulunmamaktadır.'
                                    : isSerbest && v.durum === 'BEKLEMEDE'
                                    ? 'Serbest Depo Aracı: Güvenlik tarafından evrak hazır olmadan da doğrudan rampaya atanabilir.'
                                    : v.durum === 'BEKLEMEDE'
                                    ? "Rampa atayabilmek için aracın durumunu önce 'EVRAK HAZIR' yapınız. (Serbest Depo hariç)"
                                    : 'Rampa Seçiniz'
                                }
                                className={`border rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500 w-full ${
                                  !canDirectToRamp || !canAssignRamp || currentUser?.role === 'guest'
                                    ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-200 dark:border-slate-700'
                                    : isSerbest && v.durum !== 'EVRAK HAZIR' && v.durum !== 'RAMPADA'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 font-semibold text-emerald-900 dark:text-emerald-200'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                <option value="">Rampa Atanmadı</option>
                                {getAvailableRampsForVehicle(v).map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.ad}
                                  </option>
                                ))}
                              </select>

                              {canAssignRamp && currentUser?.role !== 'guest' && v.durum !== 'RAMPADA' && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickAssignRamp(v)}
                                  title={
                                    canDirectToRamp
                                      ? isSerbest && v.durum !== 'EVRAK HAZIR'
                                        ? 'Serbest Depo: Evrak hazır durumu aranmadan doğrudan boş rampaya yönlendirir'
                                        : 'Otomatik boş bir rampa atayıp aracı RAMPADA durumuna alır'
                                      : "Rampa ataması için araç durumu 'EVRAK HAZIR' olmalıdır (Serbest Depo hariç)"
                                  }
                                  className={`w-full py-1 px-2 border font-bold text-[9px] rounded-lg transition flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-98 ${
                                    canDirectToRamp
                                      ? isSerbest && v.durum !== 'EVRAK HAZIR'
                                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 hover:border-emerald-400 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700'
                                        : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-300 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-800 dark:text-slate-500 dark:border-slate-700 cursor-not-allowed'
                                  }`}
                                >
                                  <Zap
                                    className={`w-3 h-3 ${
                                      canDirectToRamp
                                        ? isSerbest && v.durum !== 'EVRAK HAZIR'
                                          ? 'text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400'
                                          : 'text-amber-500 fill-amber-500'
                                        : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                  />
                                  <span>{isSerbest && v.durum !== 'EVRAK HAZIR' ? 'Serbest Depo Rampa Ata' : 'Hızlı Rampa Ata'}</span>
                                </button>
                              )}
                            </>
                          );
                        })()}

                        {v.durum === 'EVRAK HAZIR' && !v.isRampayaCagrildi && canCallVehicle && (
                          <button
                            type="button"
                            onClick={() => onSendAdminCallRequest(v)}
                            className="w-full py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-[9px] rounded transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Megaphone className="w-3 h-3" /> Güvenliğe Çağrı Gönder
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => onOpenPhotoGallery(v)}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer tabular-nums"
                        title="Fotoğrafları İncele"
                      >
                        <Camera className="w-4 h-4 inline" />
                        {v.fotograflar && v.fotograflar.length > 0 && (
                          <span className="ml-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            ({v.fotograflar.length})
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="p-3 text-[11px]">
                      <div className="font-medium text-slate-700 dark:text-slate-200 font-mono tabular-nums flex items-center gap-1">
                        <LogIn className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{v.girisTarihi}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                        {getDurationText(v)}
                      </div>
                    </td>

                    <td className="p-3 text-center space-y-1 min-w-[96px]">
                      <button
                        type="button"
                        onClick={() => onOpenDetailModal(v)}
                        className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition flex items-center gap-1 mx-auto cursor-pointer shadow-2xs w-full justify-center"
                        title="Araç Detaylarını ve Fotoğraflarını İncele"
                      >
                        <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" /> İncele
                      </button>

                      {canEditVehicle && (
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(v)}
                          className="px-2.5 py-1 bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-medium rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 transition flex items-center gap-1 mx-auto cursor-pointer w-full justify-center"
                        >
                          <Edit3 className="w-3 h-3" /> Düzenle
                        </button>
                      )}

                      {canToggleAcil && (
                        <button
                          type="button"
                          onClick={() => onToggleAcil(v)}
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition block mx-auto cursor-pointer w-full ${
                            v.isAcik
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                              : 'bg-red-600 text-white hover:bg-red-700 shadow-xs'
                          }`}
                        >
                          {v.isAcik ? 'Acil Kaldır' : 'Acil Araç'}
                        </button>
                      )}

                      {canAuthorizeExit && (
                        <button
                          type="button"
                          onClick={() => handleConfirmExit(v)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[10px] font-bold rounded-lg transition flex items-center gap-1 mx-auto cursor-pointer w-full justify-center"
                          title="Sahadan Çıkış Ver"
                        >
                          <LogOut className="w-3 h-3" /> Çıkış
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canMakeReady && onBulkMakeReady ? 10 : 9} className="p-8 text-center text-slate-400">
                    <div className="space-y-2.5">
                      <Truck className="w-8 h-8 mx-auto opacity-30 text-slate-500" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Aradığınız kriterlere uygun sahada aktif araç bulunamadı.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Filtreleri Sıfırla
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= YAPIŞKAN TOPLU İŞLEM ÇUBUĞU (BEKLEMEDE ARAÇLAR) ================= */}
      {canMakeReady && onBulkMakeReady && selectedPendingVehicles.length > 0 && (
        <div className="sticky bottom-3 z-20 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-2xl border border-slate-700 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs">
              {selectedPendingVehicles.length}
            </span>
            <span>
              adet <strong>BEKLEMEDE</strong> araç seçildi
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              Seçimi Temizle
            </button>
            <button
              type="button"
              onClick={() => onBulkMakeReady(selectedPendingVehicles)}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Seçilenleri Evrak Hazır Yap</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
