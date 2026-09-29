import React, { useState } from 'react';
import { Ramp, Vehicle, User } from '../types';
import { getRampStatusClass, cleanPhone, cleanPhoneForWa } from '../utils/helpers';
import { RampTrafficLight } from './RampTrafficLight';
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
  Filter,
  CheckCircle,
  AlertTriangle,
  Wrench,
  X,
  Eye
} from 'lucide-react';

interface RampManagementViewProps {
  ramps: Ramp[];
  vehicles: Vehicle[];
  currentUser?: User | null;
  onRampStatusChange: (ramp: Ramp, newStatus: Ramp['durum']) => void;
  onChangeVehicleRamp: (vehicle: Vehicle, targetRampId: number) => void;
  onReleaseRampVehicle: (vehicle: Vehicle) => void;
  onOpenRampAssignModal: (ramp: Ramp) => void;
  onOpenDetailModal?: (v: Vehicle) => void;
}

export const RampManagementView: React.FC<RampManagementViewProps> = ({
  ramps,
  vehicles,
  currentUser,
  onRampStatusChange,
  onChangeVehicleRamp,
  onReleaseRampVehicle,
  onOpenRampAssignModal,
  onOpenDetailModal
}) => {
  const [statusFilter, setStatusFilter] = useState<'Tümü' | 'Boş' | 'Dolu' | 'Bakım-Arıza'>('Tümü');
  const [searchQuery, setSearchQuery] = useState('');

  const canManageRamps =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'security' ||
    Boolean(currentUser?.permissions?.canManageRampStatus);

  const canAssignRamp =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'security' ||
    Boolean(currentUser?.permissions?.canAssignRamp);

  const canReleaseRamp =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'security' ||
    Boolean(currentUser?.permissions?.canReleaseRamp);

  const getRampVehicle = (rampaId: number) => {
    return vehicles.find((v) => v.rampaId === rampaId && v.durum === 'RAMPADA');
  };

  const getAvailableRamps = () => {
    return ramps.filter((r) => r.durum === 'Boş');
  };

  // İstatistikler
  const totalCount = ramps.length;
  const emptyCount = ramps.filter((r) => r.durum === 'Boş').length;
  const fullCount = ramps.filter((r) => r.durum === 'Dolu').length;
  const maintenanceCount = ramps.filter((r) => r.durum === 'Arızalı' || r.durum === 'Bakımda').length;

  // Filtreleme
  let filteredRamps = ramps;

  if (statusFilter === 'Boş') {
    filteredRamps = filteredRamps.filter((r) => r.durum === 'Boş');
  } else if (statusFilter === 'Dolu') {
    filteredRamps = filteredRamps.filter((r) => r.durum === 'Dolu');
  } else if (statusFilter === 'Bakım-Arıza') {
    filteredRamps = filteredRamps.filter((r) => r.durum === 'Arızalı' || r.durum === 'Bakımda');
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    filteredRamps = filteredRamps.filter((r) => {
      const matchRampName = r.ad.toLowerCase().includes(q);
      const vehicle = getRampVehicle(r.id);
      const matchVehicle =
        vehicle &&
        ((vehicle.dorsePlaka && vehicle.dorsePlaka.toLowerCase().includes(q)) ||
          (vehicle.cekiciPlaka && vehicle.cekiciPlaka.toLowerCase().includes(q)) ||
          (vehicle.musteri && vehicle.musteri.toLowerCase().includes(q)) ||
          (vehicle.soforAd && vehicle.soforAd.toLowerCase().includes(q)));
      return matchRampName || matchVehicle;
    });
  }

  return (
    <div className="space-y-4">
      {currentUser?.role === 'guest' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <b>İzleme Modu:</b> Rampa durum değişiklikleri ve araç atamaları Yönetici ve Güvenlik yetkisine tabidir.
          </span>
        </div>
      )}

      {/* Üst Arama & Hızlı Filtre Paneli (Mobil ve Masaüstü Uyumlu) */}
      <div className="bg-white dark:bg-slate-900 p-3.5 md:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          {/* Arama */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rampa veya Araç Ara (Rampa Adı, Plaka, Müşteri)..."
              className="w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Durum Filtreleme Sekmeleri */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scroll text-xs">
          <button
            onClick={() => setStatusFilter('Tümü')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'Tümü'
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tümü
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">{totalCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter('Boş')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
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
            onClick={() => setStatusFilter('Dolu')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
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
            onClick={() => setStatusFilter('Bakım-Arıza')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'Bakım-Arıza'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Arızalı
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-extrabold">
              {maintenanceCount}
            </span>
          </button>
        </div>
      </div>

      {/* Rampa Kartları Grid Düzeni: Mobilde küçültülmüş kompakt düzen, PC'lerde (Desktop) tam 2 satırda 6'şar rampa */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 gap-1.5 sm:gap-2 md:gap-2.5">
        {filteredRamps.map((r) => {
          const vehicle = getRampVehicle(r.id);

          return (
            <div
              key={r.id}
              className={`ramp-item bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border shadow-2xs overflow-hidden flex flex-col justify-between transition hover:shadow-xs ${
                r.durum === 'Dolu'
                  ? 'border-blue-300 dark:border-blue-800 ring-1 ring-blue-100 dark:ring-blue-900/40'
                  : r.durum === 'Boş'
                  ? 'border-emerald-200 dark:border-emerald-800/80'
                  : 'border-amber-200 dark:border-amber-800/80'
              }`}
            >
              {/* Rampa Başlık & Durum (Kompakt Trafik Işığı ve Durum Seçici) */}
              <div className="p-1.5 sm:p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 gap-1">
                <div className="flex items-center gap-1 min-w-0">
                  <WarehouseIcon className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-[11px] sm:text-xs truncate">
                    {r.ad}
                  </h3>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {/* Trafik Işığı Göstergesi */}
                  <RampTrafficLight status={r.durum} showBadge={false} />

                  {canManageRamps ? (
                    <select
                      value={r.durum}
                      onChange={(e) => onRampStatusChange(r, e.target.value as Ramp['durum'])}
                      className={`text-[8px] sm:text-[9px] font-bold border rounded px-1 py-0.2 outline-none cursor-pointer shadow-2xs ${getRampStatusClass(
                        r.durum
                      )}`}
                    >
                      <option value="Boş">Boş</option>
                      <option value="Dolu">Dolu</option>
                      <option value="Arızalı">Arızalı</option>
                      <option value="Bakımda">Bakımda</option>
                    </select>
                  ) : (
                    <span className={`text-[8px] sm:text-[9px] font-bold border rounded px-1 py-0.2 ${getRampStatusClass(r.durum)}`}>
                      {r.durum}
                    </span>
                  )}
                </div>
              </div>

              {/* Rampa İçeriği (Küçültülmüş, Ferah Tipografi) */}
              <div className="p-1.5 sm:p-2 flex-1 flex flex-col justify-between text-xs space-y-1">
                {vehicle ? (
                  <div className="space-y-1">
                    {/* Araç Kartı */}
                    <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/80 p-1.5 rounded-md relative overflow-hidden space-y-0.5">
                      {vehicle.isAcik && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[7px] font-black px-1 py-0.2 rounded-bl shadow animate-pulse flex items-center gap-0.5">
                          <Zap className="w-2 h-2" /> ACİL
                        </div>
                      )}

                      {/* Türk Plaka Rozeti */}
                      <div className="inline-flex items-center border border-slate-800 rounded overflow-hidden font-mono font-black text-[9px] shadow-2xs bg-white">
                        <span className="bg-blue-600 text-white px-0.5 py-0.2 text-[6px] font-bold">TR</span>
                        <span className="px-1 py-0.2 tracking-wider text-slate-900">{vehicle.dorsePlaka}</span>
                      </div>

                      <p className="text-[10px] font-bold text-blue-950 dark:text-blue-200 truncate pr-5">{vehicle.musteri}</p>

                      {vehicle.konteynirNo && (
                        <p className="text-[8px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-0.5 font-mono">
                          <Box className="w-2 h-2 text-slate-400" /> {vehicle.konteynirNo}
                        </p>
                      )}

                      <div className="pt-0.5 border-t border-blue-200/60 dark:border-blue-800/60 flex justify-between text-[8px] text-slate-600 dark:text-slate-400">
                        <span>{vehicle.depoTuru}</span>
                        <span>{vehicle.islemTuru}</span>
                      </div>

                      {/* Şoför İletişim (Telefon / WhatsApp) */}
                      {vehicle.soforTel && (
                        <div className="pt-0.5 border-t border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between gap-1">
                          <span className="text-[8px] text-slate-600 dark:text-slate-300 truncate font-semibold">
                            {vehicle.soforAd || 'Şoför'}
                          </span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <a
                              href={`tel:${cleanPhone(vehicle.soforTel)}`}
                              className="px-1 py-0.2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[8px] flex items-center gap-0.5 shadow-2xs active:scale-95"
                              title="Şoförü Ara"
                            >
                              <Phone className="w-2 h-2" /> Ara
                            </a>
                            <a
                              href={`https://wa.me/${cleanPhoneForWa(vehicle.soforTel)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-0.5 bg-emerald-100 dark:bg-emerald-950/50 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 rounded text-[8px] flex items-center justify-center border border-emerald-300 dark:border-emerald-800 active:scale-95"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-2 h-2 text-emerald-700 dark:text-emerald-400" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Araç Detaylarını İncele */}
                      {onOpenDetailModal && (
                        <button
                          type="button"
                          onClick={() => onOpenDetailModal(vehicle)}
                          className="w-full mt-0.5 h-5 py-0.5 px-1 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[8px] font-bold rounded transition flex items-center justify-center gap-0.5 cursor-pointer shadow-2xs active:scale-95"
                          title="Araç Detaylarını ve Fotoğraflarını İncele"
                        >
                          <Eye className="w-2 h-2 text-blue-600 dark:text-blue-400" />
                          <span>İncele</span>
                        </button>
                      )}
                    </div>

                    {/* Rampa Taşıma & Çıkış İşlemleri */}
                    <div className="space-y-0.5 pt-0.5">
                      {canAssignRamp && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              onChangeVehicleRamp(vehicle, Number(e.target.value));
                              e.target.value = '';
                            }
                          }}
                          className="w-full h-6 text-[8px] sm:text-[9px] font-bold border rounded px-1 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700 outline-none text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs truncate"
                        >
                          <option value="">Rampa Değiştir...</option>
                          {getAvailableRamps().map((targetR) => (
                            <option key={targetR.id} value={targetR.id}>
                              {targetR.ad} 'ye Taşı
                            </option>
                          ))}
                        </select>
                      )}

                      {canReleaseRamp && (
                        <button
                          onClick={() => onReleaseRampVehicle(vehicle)}
                          className="w-full h-6 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[8px] sm:text-[9px] font-black rounded transition flex items-center justify-center gap-0.5 shadow-2xs cursor-pointer active:scale-98"
                        >
                          <LogOut className="w-2.5 h-2.5" /> Rampadan Çıkar
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-between py-1 text-slate-400 min-h-[65px] sm:min-h-[85px]">
                    <div className="text-center py-1 space-y-0.5">
                      <Truck className="w-4 h-4 mx-auto opacity-25 text-slate-500" />
                      <p className="text-[10px] font-bold text-slate-500">Boş Rampa</p>
                      <p className="text-[8px] text-slate-400">Atamaya hazır</p>
                    </div>

                    {r.durum === 'Boş' && canAssignRamp && (
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => onOpenRampAssignModal(r)}
                          className="w-full h-6 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-[8px] sm:text-[9px] font-bold rounded transition flex items-center justify-center gap-0.5 shadow-2xs cursor-pointer active:scale-98"
                        >
                          <Search className="w-2.5 h-2.5" />
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
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
          <WarehouseIcon className="w-8 h-8 mx-auto opacity-30 text-blue-500" />
          <p className="text-xs font-semibold">Aradığınız kriterlere uygun rampa bulunamadı.</p>
        </div>
      )}
    </div>
  );
};
