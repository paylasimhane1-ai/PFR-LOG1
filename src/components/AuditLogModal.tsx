import React, { useMemo, useState } from 'react';
import {
  AuditCategory,
  AuditLog,
  AuditSeverity,
  User,
  Warehouse
} from '../types';
import {
  AUDIT_CATEGORY_LABELS,
  AUDIT_ROLE_LABELS,
  AUDIT_SEVERITY_LABELS,
  exportAuditLogsToCsv,
  exportAuditLogsToExcel,
  getActionLabel
} from '../utils/audit';
import {
  AlertTriangle,
  Archive,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Filter,
  History,
  Info,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X
} from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLog[];
  currentUser: User | null;
  users: User[];
  warehouses: Warehouse[];
  isLoading?: boolean;
  onNotify?: (msg: string, type?: 'success' | 'info' | 'warning') => void;
  onAskConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void,
    variant?: 'danger' | 'warning' | 'primary',
    confirmText?: string
  ) => void;
  onDeleteOldLogs: (logIds: number[], retentionLabel: string, exportedArchive: boolean) => Promise<void>;
  onRecordExport?: (format: 'xlsx' | 'csv', count: number) => void;
}

type DatePreset = 'all' | 'today' | '7d' | '30d' | 'custom';

const PAGE_SIZE = 50;

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  currentUser,
  users,
  warehouses,
  isLoading = false,
  onNotify,
  onAskConfirm,
  onDeleteOldLogs,
  onRecordExport
}) => {
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
  const [visibleLimit, setVisibleLimit] = useState<number>(PAGE_SIZE);
  const [showArchivePanel, setShowArchivePanel] = useState<boolean>(false);
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);

  const actorOptions = useMemo(() => {
    const names = new Set<string>();
    users.forEach((u) => {
      if (u.username) names.add(u.username);
    });
    auditLogs.forEach((l) => {
      if (l.actorUsername) names.add(l.actorUsername);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  }, [users, auditLogs]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTs = startOfToday.getTime();
    const sevenDaysTs = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysTs = now - 30 * 24 * 60 * 60 * 1000;
    const q = searchQuery.trim().toLocaleLowerCase('tr-TR');

    return auditLogs.filter((log) => {
      if (datePreset === 'today' && log.timestamp < todayTs) return false;
      if (datePreset === '7d' && log.timestamp < sevenDaysTs) return false;
      if (datePreset === '30d' && log.timestamp < thirtyDaysTs) return false;
      if (datePreset === 'custom') {
        if (customStartDate && log.isoDate < customStartDate) return false;
        if (customEndDate && log.isoDate > customEndDate) return false;
      }

      if (actorFilter !== 'all' && log.actorUsername.toLowerCase() !== actorFilter.toLowerCase()) {
        return false;
      }
      if (roleFilter !== 'all' && log.actorRole !== roleFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && log.category !== categoryFilter) {
        return false;
      }
      if (severityFilter !== 'all' && log.severity !== severityFilter) {
        return false;
      }
      if (warehouseFilter !== 'all') {
        if (warehouseFilter === '0') {
          if (log.depoId && log.depoId !== 0) return false;
        } else if (String(log.depoId || '') !== warehouseFilter) {
          return false;
        }
      }

      if (q) {
        const haystack = [
          log.actorUsername,
          log.summary,
          log.targetLabel || '',
          log.targetId || '',
          log.depoName || '',
          getActionLabel(log.action),
          ...(log.changes || []).map((c) => `${c.label} ${c.before} ${c.after}`)
        ]
          .join(' ')
          .toLocaleLowerCase('tr-TR');
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    auditLogs,
    datePreset,
    customStartDate,
    customEndDate,
    actorFilter,
    roleFilter,
    categoryFilter,
    severityFilter,
    warehouseFilter,
    searchQuery
  ]);

  const stats = useMemo(() => {
    let todayCount = 0;
    let criticalOrFailedCount = 0;
    const uniqueActors = new Set<string>();

    for (const log of filteredLogs) {
      if (log.isoDate === todayIso) todayCount += 1;
      if (log.severity === 'critical' || log.action === 'LOGIN_FAILED') criticalOrFailedCount += 1;
      if (log.actorUsername) uniqueActors.add(log.actorUsername.toLowerCase());
    }

    return {
      totalCount: filteredLogs.length,
      allCount: auditLogs.length,
      todayCount,
      criticalOrFailedCount,
      uniqueActorCount: uniqueActors.size
    };
  }, [filteredLogs, auditLogs.length, todayIso]);

  const archiveCandidates = useMemo(() => {
    if (retentionDays === 0) return auditLogs;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    return auditLogs.filter((l) => l.timestamp < cutoff);
  }, [auditLogs, retentionDays]);

  const visibleLogs = useMemo(
    () => filteredLogs.slice(0, visibleLimit),
    [filteredLogs, visibleLimit]
  );

  const hasActiveFilters =
    datePreset !== 'all' ||
    actorFilter !== 'all' ||
    roleFilter !== 'all' ||
    categoryFilter !== 'all' ||
    severityFilter !== 'all' ||
    warehouseFilter !== 'all' ||
    searchQuery.trim() !== '';

  if (!isOpen || currentUser?.role !== 'admin') return null;

  const handleResetFilters = () => {
    setDatePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setActorFilter('all');
    setRoleFilter('all');
    setCategoryFilter('all');
    setSeverityFilter('all');
    setWarehouseFilter('all');
    setSearchQuery('');
    setVisibleLimit(PAGE_SIZE);
  };

  const toggleExpand = (id: number) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (filteredLogs.length === 0) {
      onNotify?.('Dışa aktarılacak denetim kaydı bulunmuyor.', 'warning');
      return;
    }
    const ok =
      format === 'xlsx'
        ? exportAuditLogsToExcel(filteredLogs, 'logiportal_denetim_kayitlari')
        : exportAuditLogsToCsv(filteredLogs, 'logiportal_denetim_kayitlari');
    if (ok) {
      onRecordExport?.(format, filteredLogs.length);
      onNotify?.(`${filteredLogs.length} adet denetim kaydı ${format.toUpperCase()} olarak indirildi.`, 'success');
    }
  };

  const handleTriggerCleanup = (exportFirst: boolean) => {
    if (archiveCandidates.length === 0) {
      onNotify?.('Seçili saklama süresinden eski temizlenecek kayıt bulunmuyor.', 'info');
      return;
    }
    const retentionLabel = retentionDays === 0 ? 'Tüm kayıtlar' : `${retentionDays} günden eski kayıtlar`;
    const runCleanup = async () => {
      setIsCleaning(true);
      try {
        if (exportFirst) {
          exportAuditLogsToExcel(archiveCandidates, `logiportal_arsiv_${retentionDays === 0 ? 'tum' : retentionDays + 'gun'}`);
        }
        const ids = archiveCandidates.map((l) => l.id);
        await onDeleteOldLogs(ids, retentionLabel, exportFirst);
      } finally {
        setIsCleaning(false);
      }
    };

    const msg = exportFirst
      ? `${retentionLabel} kapsamındaki ${archiveCandidates.length} adet denetim kaydı önce Excel yedeği olarak bilgisayarınıza indirilecek, ardından bulut veritabanından temizlenecektir. Bu temizlik işlemi yeni bir denetim kaydı olarak kalıcı kaydedilir. Onaylıyor musunuz?`
      : `${retentionLabel} kapsamındaki ${archiveCandidates.length} adet denetim kaydı yedek indirilmeden bulut veritabanından kalıcı olarak silinecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`;

    if (onAskConfirm) {
      onAskConfirm(
        exportFirst ? 'Arşiv İndir & Eski Kayıtları Temizle' : 'Eski Denetim Kayıtlarını Sil',
        msg,
        () => {
          void runCleanup();
        },
        exportFirst ? 'warning' : 'danger',
        exportFirst ? 'Evet, İndir ve Temizle' : 'Evet, Kalıcı Temizle'
      );
    } else {
      void runCleanup();
    }
  };

  const renderSeverityIndicator = (severity: AuditSeverity) => {
    if (severity === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>{AUDIT_SEVERITY_LABELS.critical}</span>
        </span>
      );
    }
    if (severity === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{AUDIT_SEVERITY_LABELS.warning}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>{AUDIT_SEVERITY_LABELS.info}</span>
      </span>
    );
  };

  const renderDiffDetail = (log: AuditLog) => {
    const hasChanges = Array.isArray(log.changes) && log.changes.length > 0;
    const metaEntries = log.metadata ? Object.entries(log.metadata) : [];
    if (!hasChanges && metaEntries.length === 0) return null;

    return (
      <div className="mt-2 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {hasChanges && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <th className="py-1.5 pr-3 font-semibold">Değişen Alan</th>
                  <th className="py-1.5 pr-3 font-semibold">Önceki Değer</th>
                  <th className="py-1.5 font-semibold">Yeni Değer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {log.changes!.map((ch, idx) => (
                  <tr key={`${log.id}-${ch.field}-${idx}`}>
                    <td className="py-1.5 pr-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {ch.label}
                    </td>
                    <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400 break-words max-w-[260px]">
                      {ch.before}
                    </td>
                    <td className="py-1.5 font-medium text-slate-900 dark:text-slate-100 break-words max-w-[260px]">
                      {ch.after}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {metaEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            {metaEntries.map(([k, v]) => (
              <span key={k}>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{k}:</span> {v}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full max-w-6xl h-[var(--vvh,100dvh)] sm:h-[92dvh] rounded-none sm:rounded-2xl border-0 sm:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Üst Başlık */}
        <div className="px-4 sm:px-6 py-3.5 pt-[max(0.875rem,env(safe-area-inset-top))] sm:py-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                İşlem Geçmişi ve Denetim Kayıtları
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Yalnızca Admin kontrolünde · Değiştirilemez denetim izi (Öncesi / Sonrası)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              title="Filtrelenmiş kayıtları Excel (.xlsx) olarak indir"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              title="Filtrelenmiş kayıtları CSV olarak indir"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setShowArchivePanel((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap border ${
                showArchivePanel
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Eski kayıtlar için arşiv ve temizlik kontrolü"
            >
              <Archive className="w-4 h-4" />
              <span className="hidden md:inline">Arşiv & Temizlik</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Özet Sayaç Şeridi */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 divide-x divide-y sm:divide-y-0 divide-slate-200 dark:divide-slate-800 shrink-0">
          <div className="px-4 py-2.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Görüntülenen / Toplam</span>
            <span className="text-sm sm:text-base font-bold tabular-nums font-mono text-slate-900 dark:text-white">
              {stats.totalCount} / {stats.allCount}
            </span>
          </div>
          <div className="px-4 py-2.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Bugünkü İşlemler</span>
            <span className="text-sm sm:text-base font-bold tabular-nums font-mono text-blue-700 dark:text-blue-400">
              {stats.todayCount}
            </span>
          </div>
          <div className="px-4 py-2.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Kritik & Hatalı Giriş</span>
            <span className="text-sm sm:text-base font-bold tabular-nums font-mono text-red-700 dark:text-red-400">
              {stats.criticalOrFailedCount}
            </span>
          </div>
          <div className="px-4 py-2.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">İşlem Yapan Kullanıcı</span>
            <span className="text-sm sm:text-base font-bold tabular-nums font-mono text-slate-900 dark:text-white">
              {stats.uniqueActorCount}
            </span>
          </div>
        </div>

        {/* Admin Arşiv & Temizlik Kontrol Paneli (Açılabilir) */}
        {showArchivePanel && (
          <div className="px-4 sm:px-6 py-3.5 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/60 shrink-0 space-y-2.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Admin Eski Kayıt Arşivleme ve Temizlik Kontrolü</span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Kayıtlar düzenlenemez (immutable). Veritabanı boyutunu yönetmek için eski kayıtları önce Excel olarak arşivleyip sonra silebilirsiniz.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                  disabled={isCleaning}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value={30}>30 Günden Eski Kayıtlar</option>
                  <option value={60}>60 Günden Eski Kayıtlar</option>
                  <option value={90}>90 Günden Eski Kayıtlar</option>
                  <option value={180}>180 Günden Eski Kayıtlar</option>
                  <option value={0}>Tüm Mevcut Kayıtlar</option>
                </select>

                <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200 px-2">
                  Etkilenen: {archiveCandidates.length} kayıt
                </span>

                <button
                  type="button"
                  disabled={isCleaning || archiveCandidates.length === 0}
                  onClick={() => handleTriggerCleanup(true)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Arşivi İndir ve Temizle</span>
                </button>

                <button
                  type="button"
                  disabled={isCleaning || archiveCandidates.length === 0}
                  onClick={() => handleTriggerCleanup(false)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yalnızca Temizle</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filtre Çubuğu */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Tarih Aralığı Seçiciler */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {([
                { id: 'all', label: 'Tümü' },
                { id: 'today', label: 'Bugün' },
                { id: '7d', label: 'Son 7 Gün' },
                { id: '30d', label: 'Son 30 Gün' },
                { id: 'custom', label: 'Özel Tarih' }
              ] as { id: DatePreset; label: string }[]).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setDatePreset(preset.id);
                    setVisibleLimit(PAGE_SIZE);
                  }}
                  className={`px-2.5 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    datePreset === preset.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => handleExport('xlsx')}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Filtreleri Sıfırla</span>
              </button>
            )}
          </div>

          {datePreset === 'custom' && (
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
                aria-label="Başlangıç tarihi"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
                aria-label="Bitiş tarihi"
              />
            </div>
          )}

          {/* Çoklu Filtreler & Arama */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div className="relative col-span-2 sm:col-span-3 lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleLimit(PAGE_SIZE);
                }}
                placeholder="Plaka, kullanıcı, hedef veya açıklama ara..."
                className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={actorFilter}
              onChange={(e) => {
                setActorFilter(e.target.value);
                setVisibleLimit(PAGE_SIZE);
              }}
              className="px-2.5 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
              aria-label="Kullanıcı filtresi"
            >
              <option value="all">Kullanıcı: Tümü</option>
              {actorOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setVisibleLimit(PAGE_SIZE);
              }}
              className="px-2.5 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
              aria-label="Kategori filtresi"
            >
              <option value="all">Modül: Tümü</option>
              {(Object.keys(AUDIT_CATEGORY_LABELS) as AuditCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {AUDIT_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setVisibleLimit(PAGE_SIZE);
              }}
              className="px-2.5 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
              aria-label="Önem düzeyi filtresi"
            >
              <option value="all">Önem: Tümü</option>
              <option value="info">Bilgi</option>
              <option value="warning">Uyarı</option>
              <option value="critical">Kritik</option>
            </select>

            <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setVisibleLimit(PAGE_SIZE);
                }}
                className="px-2 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
                aria-label="Rol filtresi"
              >
                <option value="all">Rol: Tümü</option>
                <option value="admin">Admin</option>
                <option value="personel">Personel</option>
                <option value="security">Güvenlik</option>
                <option value="guest">Misafir</option>
              </select>

              <select
                value={warehouseFilter}
                onChange={(e) => {
                  setWarehouseFilter(e.target.value);
                  setVisibleLimit(PAGE_SIZE);
                }}
                className="px-2 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
                aria-label="Depo filtresi"
              >
                <option value="all">Depo: Tümü</option>
                <option value="0">Genel</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.ad}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Kayıt Listesi Alanı */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll bg-slate-50 dark:bg-slate-950/60">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-12 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse"
                />
              ))}
            </div>
          ) : visibleLogs.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <Filter className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {auditLogs.length === 0
                    ? 'Henüz Denetim Kaydı Oluşmadı'
                    : 'Seçili Filtrelere Uygun Kayıt Bulunamadı'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {auditLogs.length === 0
                    ? 'Sistemde yapılan araç, rampa, kullanıcı, ayar ve oturum işlemleri burada otomatik olarak izlenecektir.'
                    : 'Tarih aralığını veya arama kriterlerini genişleterek kayıtları görüntüleyebilirsiniz.'}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition"
                >
                  Filtreleri Sıfırla
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Masaüstü Yüksek Yoğunluklu Denetim Tablosu */}
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold whitespace-nowrap">Zaman</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Kullanıcı</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Modül & İşlem</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Depo</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Hedef</th>
                      <th className="py-2.5 px-3 font-semibold">Özet Açıklama</th>
                      <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Önem</th>
                      <th className="py-2.5 px-4 font-semibold text-right whitespace-nowrap">Fark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {visibleLogs.map((log) => {
                      const hasDetails =
                        (Array.isArray(log.changes) && log.changes.length > 0) ||
                        (log.metadata && Object.keys(log.metadata).length > 0);
                      const isExpanded = expandedLogIds.has(log.id);
                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            onClick={() => hasDetails && toggleExpand(log.id)}
                            className={`transition-colors ${
                              hasDetails ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60' : ''
                            }`}
                          >
                            <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                              {log.dateStr}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap align-top">
                              <div className="font-semibold text-slate-900 dark:text-slate-100">
                                {log.actorUsername}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {AUDIT_ROLE_LABELS[log.actorRole] || log.actorRole}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <div className="font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                {getActionLabel(log.action)}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {AUDIT_CATEGORY_LABELS[log.category] || log.category}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                              {log.depoName || (log.depoId ? `Depo ${log.depoId}` : 'Genel')}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap align-top">
                              {log.targetLabel || log.targetId || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200 align-top max-w-md break-words">
                              {log.summary}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap align-top">
                              {renderSeverityIndicator(log.severity)}
                            </td>
                            <td className="py-2.5 px-4 text-right whitespace-nowrap align-top">
                              {hasDetails ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(log.id);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  <span>{log.changes?.length || 1} Detay</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 text-[11px]">-</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && hasDetails && (
                            <tr className="bg-slate-50/90 dark:bg-slate-950/70">
                              <td colSpan={8} className="px-6 py-3">
                                {renderDiffDetail(log)}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobil / iPhone Kart Görünümü */}
              <div className="md:hidden p-3 space-y-2.5">
                {visibleLogs.map((log) => {
                  const hasDetails =
                    (Array.isArray(log.changes) && log.changes.length > 0) ||
                    (log.metadata && Object.keys(log.metadata).length > 0);
                  const isExpanded = expandedLogIds.has(log.id);
                  return (
                    <div
                      key={log.id}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {getActionLabel(log.action)}
                          </h5>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{log.actorUsername}</span>
                            <span aria-hidden="true">·</span>
                            <span>{AUDIT_ROLE_LABELS[log.actorRole] || log.actorRole}</span>
                            <span aria-hidden="true">·</span>
                            <span>{log.depoName || 'Genel'}</span>
                          </div>
                        </div>
                        <div className="shrink-0">{renderSeverityIndicator(log.severity)}</div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed break-words">
                        {log.summary}
                      </p>

                      <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono tabular-nums">{log.dateStr}</span>
                          {log.targetLabel && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 truncate">
                                {log.targetLabel}
                              </span>
                            </>
                          )}
                        </div>
                        {hasDetails && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(log.id)}
                            className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <span>{isExpanded ? 'Gizle' : `${log.changes?.length || 1} Detay`}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {isExpanded && renderDiffDetail(log)}
                    </div>
                  );
                })}
              </div>

              {filteredLogs.length > visibleLimit && (
                <div className="p-4 flex justify-center border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
                    className="px-5 py-2.5 min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer transition tabular-nums"
                  >
                    Daha Fazla Göster ({visibleLogs.length} / {filteredLogs.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Alt Bilgi & Kapat */}
        <div className="px-4 sm:px-6 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Kayıtlar düzenlenemez · Yalnızca Admin görüntüleyebilir
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold cursor-pointer transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
