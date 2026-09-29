import React from 'react';
import { Vehicle, Ramp, ActiveTab } from '../types';
import { getStatusBadgeClass } from '../utils/helpers';
import { Clock, FileCheck, Truck, Warehouse as WarehouseIcon, List, Eye } from 'lucide-react';

interface DashboardViewProps {
  vehicles: Vehicle[];
  ramps: Ramp[];
  pendingExpectedCount: number;
  onNavigateTab: (tab: ActiveTab) => void;
  getRampName: (id: number | null | undefined) => string;
  onOpenDetailModal?: (v: Vehicle) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  vehicles,
  ramps,
  pendingExpectedCount,
  onNavigateTab,
  getRampName,
  onOpenDetailModal
}) => {
  const bekleyenCount = vehicles.filter((v) => v.durum === 'BEKLEMEDE').length;
  const evrakHazirCount = vehicles.filter((v) => v.durum === 'EVRAK HAZIR').length;
  const rampadaCount = vehicles.filter((v) => v.durum === 'RAMPADA').length;
  const doluRampaCount = ramps.filter((r) => r.durum === 'Dolu').length;

  const recentVehicles = [...vehicles]
    .sort((a, b) => {
      if (a.isAcik && !b.isAcik) return -1;
      if (!a.isAcik && b.isAcik) return 1;
      return b.id - a.id;
    })
    .slice(0, 10);

  return (
    <div className="space-y-4 md:space-y-6 max-w-[2560px] mx-auto w-full">
      {/* Üst İstatistik Kutucukları (Mobilde küçültülmüş, az yer kaplayan kompakt tasarım) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-2.5 md:gap-4">
        <div
          onClick={() => onNavigateTab('beklenen')}
          className="bg-amber-500 text-slate-900 p-2.5 sm:p-3 md:p-4 rounded-xl md:rounded-2xl border border-amber-600 shadow-xs flex items-center justify-between cursor-pointer hover:bg-amber-400 transition"
        >
          <div className="min-w-0 pr-1">
            <p className="text-[9px] sm:text-[10px] md:text-[11px] font-extrabold text-slate-900 uppercase tracking-wide truncate">Beklenen</p>
            <h3 className="text-base sm:text-lg md:text-2xl font-black mt-0.5">{pendingExpectedCount}</h3>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-slate-900 text-amber-400 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div className="min-w-0 pr-1">
            <p className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">Bekleyenler</p>
            <h3 className="text-base sm:text-lg md:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{bekleyenCount}</h3>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div className="min-w-0 pr-1">
            <p className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">Evrak Hazır</p>
            <h3 className="text-base sm:text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">{evrakHazirCount}</h3>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors">
          <div className="min-w-0 pr-1">
            <p className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">Rampada</p>
            <h3 className="text-base sm:text-lg md:text-2xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">{rampadaCount}</h3>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between col-span-2 md:col-span-1 transition-colors">
          <div className="min-w-0 pr-1">
            <p className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">Dolu Rampa</p>
            <h3 className="text-base sm:text-lg md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {doluRampaCount} / {ramps.length}
            </h3>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
            <WarehouseIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-5 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
            <List className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Son Hareket Gören Araçlar
          </h3>
          <button
            onClick={() => onNavigateTab('araclar')}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition cursor-pointer"
          >
            Tümünü Gör →
          </button>
        </div>

        {/* Mobil Görünüm: Kompakt Kart Listesi (md:hidden) */}
        <div className="md:hidden space-y-2">
          {recentVehicles.map((v) => (
            <div
              key={v.id}
              onClick={() => onNavigateTab('araclar')}
              className={`p-2.5 rounded-xl border transition active:scale-[0.99] cursor-pointer space-y-1.5 shadow-2xs ${
                v.isAcik
                  ? 'border-red-300 dark:border-red-800/80 bg-red-50/40 dark:bg-red-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 hover:bg-slate-100/70 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px] truncate">{v.musteri}</span>
                    {v.isAcik && (
                      <span className="px-1 py-0.2 bg-red-600 text-white font-black text-[8px] rounded shadow animate-pulse shrink-0">
                        ACİL
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[10px]">{v.dorsePlaka}</span>
                    {v.konteynirNo && <span>• {v.konteynirNo}</span>}
                  </div>
                </div>

                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 shadow-2xs ${getStatusBadgeClass(v.durum)}`}>
                  {v.durum}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-200/70 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                <span className="text-[9px] text-slate-500 dark:text-slate-400">{v.depoTuru} / {v.islemTuru}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-[10px]">
                    {getRampName(v.rampaId) || 'Rampa Bekliyor'}
                  </span>
                  {onOpenDetailModal && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetailModal(v);
                      }}
                      className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[9px] rounded border border-blue-200 dark:border-blue-800 flex items-center gap-0.5 cursor-pointer transition active:scale-95"
                    >
                      <Eye className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" /> İncele
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {recentVehicles.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              Henüz araç kaydı bulunmamaktadır.
            </div>
          )}
        </div>

        {/* Masaüstü Görünüm: Tablo (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto custom-scroll">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-sm">
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <th className="py-3 px-3">Müşteri</th>
                <th className="py-3 px-3">Dorse / Konteynır</th>
                <th className="py-3 px-3">Depo / İşlem</th>
                <th className="py-3 px-3">Durum</th>
                <th className="py-3 px-3">Rampa</th>
                <th className="py-3 px-3">Giriş Tarihi</th>
                <th className="py-3 px-3 text-center">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <td className="py-3 px-3 font-semibold">
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{v.musteri}</span>
                    {v.isAcik && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-red-600 text-white font-extrabold text-[9px] rounded shadow animate-pulse">
                        ACİL
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <b className="text-slate-900 dark:text-slate-100">{v.dorsePlaka}</b>
                    <br />
                    <span className="text-slate-400 dark:text-slate-400 text-[11px]">{v.konteynirNo || '-'}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                    {v.depoTuru} / {v.islemTuru}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${getStatusBadgeClass(v.durum)}`}>
                      {v.durum}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">{getRampName(v.rampaId)}</td>
                  <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{v.girisTarihi}</td>
                  <td className="py-3 px-3 text-center">
                    {onOpenDetailModal && (
                      <button
                        onClick={() => onOpenDetailModal(v)}
                        className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-[10px] font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Araç Detaylarını İncele"
                      >
                        <Eye className="w-3 h-3 text-blue-600 dark:text-blue-400" /> İncele
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {recentVehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Henüz araç kaydı bulunmamaktadır.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
