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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div
          onClick={() => onNavigateTab('beklenen')}
          className="bg-amber-500 text-slate-900 p-4 rounded-2xl border border-amber-600 shadow-sm flex items-center justify-between cursor-pointer hover:bg-amber-400 transition"
        >
          <div>
            <p className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wide">Beklenen Araçlar</p>
            <h3 className="text-xl md:text-2xl font-black mt-0.5">{pendingExpectedCount}</h3>
          </div>
          <div className="w-10 h-10 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center text-lg shadow">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Bekleyenler</p>
            <h3 className="text-xl md:text-2xl font-bold text-amber-600 mt-0.5">{bekleyenCount}</h3>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-lg">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Evrak Hazır</p>
            <h3 className="text-xl md:text-2xl font-bold text-blue-600 mt-0.5">{evrakHazirCount}</h3>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Rampada</p>
            <h3 className="text-xl md:text-2xl font-bold text-purple-600 mt-0.5">{rampadaCount}</h3>
          </div>
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-lg">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Dolu Rampa</p>
            <h3 className="text-xl md:text-2xl font-bold text-emerald-600 mt-0.5">
              {doluRampaCount} / {ramps.length}
            </h3>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg">
            <WarehouseIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <List className="w-4 h-4 text-blue-600" /> Son Hareket Gören Araçlar
          </h3>
          <button
            onClick={() => onNavigateTab('araclar')}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold transition cursor-pointer"
          >
            Tümünü Gör →
          </button>
        </div>

        {/* Mobil Görünüm: Kart Listesi (md:hidden) */}
        <div className="md:hidden space-y-3">
          {recentVehicles.map((v) => (
            <div
              key={v.id}
              onClick={() => onNavigateTab('araclar')}
              className={`p-3.5 rounded-xl border transition active:scale-[0.99] cursor-pointer ${
                v.isAcik
                  ? 'border-red-300 bg-red-50/40'
                  : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs truncate">{v.musteri}</span>
                    {v.isAcik && (
                      <span className="px-1.5 py-0.2 bg-red-600 text-white font-black text-[9px] rounded shadow animate-pulse shrink-0">
                        ACİL
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                    <span className="font-mono font-bold text-slate-800">{v.dorsePlaka}</span>
                    {v.konteynirNo && <span>• {v.konteynirNo}</span>}
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 shadow-xs ${getStatusBadgeClass(v.durum)}`}>
                  {v.durum}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/70 text-slate-600">
                <span className="text-[10px] text-slate-500">{v.depoTuru} / {v.islemTuru}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-600 text-[11px]">
                    {getRampName(v.rampaId) || 'Rampa Bekliyor'}
                  </span>
                  {onOpenDetailModal && (
                    <button
                      onClick={() => onOpenDetailModal(v)}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 flex items-center gap-1 cursor-pointer transition active:scale-95"
                    >
                      <Eye className="w-3 h-3 text-blue-600" /> İncele
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
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
              <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <th className="py-3 px-3">Müşteri</th>
                <th className="py-3 px-3">Dorse / Konteynır</th>
                <th className="py-3 px-3">Depo / İşlem</th>
                <th className="py-3 px-3">Durum</th>
                <th className="py-3 px-3">Rampa</th>
                <th className="py-3 px-3">Giriş Tarihi</th>
                <th className="py-3 px-3 text-center">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-semibold">
                    <span className="text-slate-800 font-bold">{v.musteri}</span>
                    {v.isAcik && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-red-600 text-white font-extrabold text-[9px] rounded shadow animate-pulse">
                        ACİL
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <b className="text-slate-900">{v.dorsePlaka}</b>
                    <br />
                    <span className="text-slate-400 text-[11px]">{v.konteynirNo || '-'}</span>
                  </td>
                  <td className="py-3 px-3">
                    {v.depoTuru} / {v.islemTuru}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${getStatusBadgeClass(v.durum)}`}>
                      {v.durum}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-blue-600">{getRampName(v.rampaId)}</td>
                  <td className="py-3 px-3 text-slate-400">{v.girisTarihi}</td>
                  <td className="py-3 px-3 text-center">
                    {onOpenDetailModal && (
                      <button
                        onClick={() => onOpenDetailModal(v)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[10px] font-bold rounded-lg transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Araç Detaylarını İncele"
                      >
                        <Eye className="w-3 h-3 text-blue-600" /> İncele
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
