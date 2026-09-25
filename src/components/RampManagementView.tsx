import React, { useState } from 'react';
import { Ramp, Vehicle, User } from '../types';
import { getRampStatusClass, cleanPhone, cleanPhoneForWa } from '../utils/helpers';
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
      <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          {/* Arama */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rampa veya Araç Ara (Rampa Adı, Plaka, Müşteri)..."
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Boş Rampalar
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 font-extrabold">
              {emptyCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('Dolu')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'Dolu'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Dolu Rampalar
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-200 text-blue-900 font-extrabold">
              {fullCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('Bakım-Arıza')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'Bakım-Arıza'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Bakım / Arıza
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-extrabold">
              {maintenanceCount}
            </span>
          </button>
        </div>
      </div>

      {/* Rampa Kartları Grid Düzeni: Mobilde tek/çift sütun, masaüstünde 4-6 sütun */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {filteredRamps.map((r) => {
          const vehicle = getRampVehicle(r.id);

          return (
            <div
              key={r.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col justify-between transition hover:shadow-md ${
                r.durum === 'Dolu'
                  ? 'border-blue-300 ring-1 ring-blue-100'
                  : r.durum === 'Boş'
                  ? 'border-emerald-200'
                  : 'border-amber-200'
              }`}
            >
              {/* Rampa Başlık & Durum */}
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <WarehouseIcon className="w-4 h-4 text-blue-600" />
                  {r.ad}
                </h3>

                {canManageRamps ? (
                  <select
                    value={r.durum}
                    onChange={(e) => onRampStatusChange(r, e.target.value as Ramp['durum'])}
                    className={`text-xs font-bold border rounded-xl px-2 py-1 outline-none cursor-pointer shadow-2xs ${getRampStatusClass(
                      r.durum
                    )}`}
                  >
                    <option value="Boş">Boş</option>
                    <option value="Dolu">Dolu</option>
                    <option value="Arızalı">Arızalı</option>
                    <option value="Bakımda">Bakımda</option>
                  </select>
                ) : (
                  <span className={`text-xs font-bold border rounded-xl px-2 py-0.5 ${getRampStatusClass(r.durum)}`}>
                    {r.durum}
                  </span>
                )}
              </div>

              {/* Rampa İçeriği */}
              <div className="p-3 flex-1 flex flex-col justify-between text-xs space-y-3">
                {vehicle ? (
                  <div className="space-y-2.5">
                    {/* Araç Kartı */}
                    <div className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl relative overflow-hidden space-y-1.5">
                      {vehicle.isAcik && (
                        <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg shadow animate-pulse flex items-center gap-0.5">
                          <Zap className="w-3 h-3" /> ACİL
                        </div>
                      )}

                      {/* Türk Plaka Rozeti */}
                      <div className="inline-flex items-center border-2 border-slate-800 rounded-lg overflow-hidden font-mono font-black text-xs shadow-xs bg-white">
                        <span className="bg-blue-600 text-white px-1.5 py-0.5 text-[9px] font-bold">TR</span>
                        <span className="px-2 py-0.5 tracking-wider text-slate-900">{vehicle.dorsePlaka}</span>
                      </div>

                      <p className="text-xs font-bold text-blue-950 truncate pr-8">{vehicle.musteri}</p>

                      {vehicle.konteynirNo && (
                        <p className="text-[11px] text-slate-600 truncate flex items-center gap-1 font-mono">
                          <Box className="w-3 h-3 text-slate-400" /> {vehicle.konteynirNo}
                        </p>
                      )}

                      <div className="pt-1.5 border-t border-blue-200/60 flex justify-between text-[10px] text-slate-600">
                        <span>
                          <b>Depo:</b> {vehicle.depoTuru}
                        </span>
                        <span>
                          <b>İşlem:</b> {vehicle.islemTuru}
                        </span>
                      </div>

                      {/* Şoför İletişim (Telefon / WhatsApp) */}
                      {vehicle.soforTel && (
                        <div className="pt-1.5 border-t border-blue-200/60 flex items-center justify-between gap-1">
                          <span className="text-[10px] text-slate-600 truncate font-semibold">
                            {vehicle.soforAd || 'Şoför'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={`tel:${cleanPhone(vehicle.soforTel)}`}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-0.5 shadow-2xs active:scale-95"
                              title="Şoförü Ara"
                            >
                              <Phone className="w-2.5 h-2.5" /> Ara
                            </a>
                            <a
                              href={`https://wa.me/${cleanPhoneForWa(vehicle.soforTel)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] flex items-center justify-center border border-emerald-300 active:scale-95"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-700" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Araç Detaylarını İncele */}
                      {onOpenDetailModal && (
                        <button
                          type="button"
                          onClick={() => onOpenDetailModal(vehicle)}
                          className="w-full mt-2 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                          title="Araç Detaylarını ve Fotoğraflarını İncele"
                        >
                          <Eye className="w-3 h-3 text-blue-600" />
                          <span>Araç Detayını İncele</span>
                        </button>
                      )}
                    </div>

                    {/* Rampa Taşıma & Çıkış İşlemleri */}
                    <div className="space-y-1.5 pt-1">
                      {canAssignRamp && (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              onChangeVehicleRamp(vehicle, Number(e.target.value));
                              e.target.value = '';
                            }
                          }}
                          className="w-full text-xs font-bold border rounded-xl p-2 bg-slate-50 hover:bg-white border-slate-300 outline-none text-slate-700 cursor-pointer shadow-2xs"
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
                          className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Rampadan Çıkar & Çıkış Yap
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col justify-between py-2 text-slate-400 min-h-[140px]">
                    <div className="text-center py-4 space-y-1">
                      <Truck className="w-8 h-8 mx-auto opacity-20 text-slate-500" />
                      <p className="text-xs font-bold text-slate-500">Boş Rampa</p>
                      <p className="text-[10px] text-slate-400">Araç atamaya hazır</p>
                    </div>

                    {r.durum === 'Boş' && canAssignRamp && (
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => onOpenRampAssignModal(r)}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
                        >
                          <Search className="w-3.5 h-3.5" />
                          {currentUser?.role === 'admin' ? 'Araç Seç & Ata / Çağır' : 'Araç Seç & Rampa Ata'}
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
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
          <WarehouseIcon className="w-8 h-8 mx-auto opacity-30 text-blue-500" />
          <p className="text-xs font-semibold">Aradığınız kriterlere uygun rampa bulunamadı.</p>
        </div>
      )}
    </div>
  );
};
