import React, { useState } from 'react';
import { Vehicle, Ramp, User } from '../types';
import { cleanPhone, cleanPhoneForWa, getDurationText, getDepoKayitTarihi, getRampaGirisTarihi, getRampaCikisTarihi } from '../utils/helpers';
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
  CheckCircle2,
  Truck,
  Zap,
  Eye,
  LogIn
} from 'lucide-react';

interface VehicleManagementViewProps {
  vehicles: Vehicle[];
  ramps: Ramp[];
  currentUser: User | null;
  onOpenNewVehicleModal: () => void;
  onOpenEditModal: (v: Vehicle) => void;
  onOpenDetailModal: (v: Vehicle) => void;
  onOpenPhotoGallery: (v: Vehicle) => void;
  onUpdateStatus: (v: Vehicle, newStatus: Vehicle['durum']) => void;
  onAssignRamp: (v: Vehicle, rampId: number | null) => void;
  onSendAdminCallRequest: (v: Vehicle) => void;
  onCancelRampCall: (v: Vehicle) => void;
  onToggleAcil: (v: Vehicle) => void;
}

export const VehicleManagementView: React.FC<VehicleManagementViewProps> = ({
  vehicles,
  ramps,
  currentUser,
  onOpenNewVehicleModal,
  onOpenEditModal,
  onOpenDetailModal,
  onOpenPhotoGallery,
  onUpdateStatus,
  onAssignRamp,
  onSendAdminCallRequest,
  onCancelRampCall,
  onToggleAcil
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TÜMÜ' | 'BEKLEMEDE' | 'EVRAK HAZIR' | 'RAMPADA'>('TÜMÜ');

  const activeVehicles = vehicles.filter((v) => v.durum !== 'ÇIKIŞ YAPTI');

  const filtered = activeVehicles.filter((v) => {
    if (statusFilter !== 'TÜMÜ' && v.durum !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    return (
      !q ||
      v.dorsePlaka.toLowerCase().includes(q) ||
      (v.cekiciPlaka && v.cekiciPlaka.toLowerCase().includes(q)) ||
      (v.konteynirNo && v.konteynirNo.toLowerCase().includes(q)) ||
      (v.soforTel && v.soforTel.includes(q)) ||
      (v.nakliyeFirmasi && v.nakliyeFirmasi.toLowerCase().includes(q)) ||
      v.musteri.toLowerCase().includes(q) ||
      v.soforAd.toLowerCase().includes(q)
    );
  });

  filtered.sort((a, b) => {
    if (a.isAcik && !b.isAcik) return -1;
    if (!a.isAcik && b.isAcik) return 1;
    return b.id - a.id;
  });

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
    if (window.confirm(`${v.dorsePlaka} plakalı aracın sahadan çıkışını onaylıyor musunuz?`)) {
      onUpdateStatus(v, 'ÇIKIŞ YAPTI');
    }
  };

  const handleQuickAssignRamp = (v: Vehicle) => {
    // Rampa ataması yapılabilmesi için araç durumu 'EVRAK HAZIR' olmalıdır
    if (v.durum !== 'EVRAK HAZIR') {
      alert(`Rampa ataması yapılabilmesi için aracın durumunun 'EVRAK HAZIR' olması gerekmektedir.\n\nMevcut Durum: ${v.durum}\nLütfen önce evrak onayını tamamlayınız.`);
      return;
    }

    // If vehicle already has a rampaId selected in dropdown
    if (v.rampaId) {
      onAssignRamp(v, v.rampaId);
      return;
    }

    // Find the first available empty ramp for this vehicle
    const availableRamps = getAvailableRampsForVehicle(v);
    const emptyRamp =
      availableRamps.find((r) => r.durum === 'Boş') ||
      ramps.find((r) => {
        const isOccupied = vehicles.some(
          (o) => o.rampaId === r.id && o.durum === 'RAMPADA' && o.id !== v.id
        );
        return r.durum === 'Boş' && !isOccupied;
      });

    if (!emptyRamp) {
      alert('Şu anda müsait boş bir rampa bulunamadı. Lütfen rampa listesini kontrol ediniz.');
      return;
    }

    onAssignRamp(v, emptyRamp.id);
  };

  return (
    <div className="space-y-4">
      {/* Üst Arama & Filtre Paneli */}
      <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Plaka, Müşteri veya Şoför ara..."
                className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0"
              >
                Temizle
              </button>
            )}
          </div>

          {currentUser?.role !== 'guest' && (
            <button
              onClick={onOpenNewVehicleModal}
              className="w-full md:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 active:scale-98"
            >
              <Plus className="w-4 h-4" /> Yeni Araç Ekle
            </button>
          )}
        </div>

        {/* Mobil & Hızlı Durum Filtre Butonları */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scroll text-xs">
          <button
            onClick={() => setStatusFilter('TÜMÜ')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'TÜMÜ'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tümü
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {activeVehicles.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('BEKLEMEDE')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'BEKLEMEDE'
                ? 'bg-amber-500 text-slate-900 shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Beklemede
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-extrabold">
              {countByStatus('BEKLEMEDE')}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('EVRAK HAZIR')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'EVRAK HAZIR'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Evrak Hazır
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 font-extrabold">
              {countByStatus('EVRAK HAZIR')}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('RAMPADA')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'RAMPADA'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            Rampada
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-200 text-blue-900 font-extrabold">
              {countByStatus('RAMPADA')}
            </span>
          </button>
        </div>
      </div>

      {/* ================= TELEFON / MOBİL GÖRÜNÜM (KART DÜZENİ) ================= */}
      <div className="block md:hidden space-y-3">
        {filtered.map((v) => {
          const rampName = getRampName(v.rampaId);
          return (
            <div
              key={v.id}
              className={`bg-white rounded-2xl border p-3.5 shadow-sm space-y-3 transition ${
                v.isAcik
                  ? 'border-red-500 bg-red-50/40 ring-1 ring-red-400'
                  : 'border-slate-200 hover:border-blue-200'
              }`}
            >
              {/* Kart Başlığı: Plaka & Durum */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  {/* Türk Plaka Rozeti */}
                  <div className="inline-flex items-center border-2 border-slate-800 rounded-lg overflow-hidden font-mono font-black text-xs shadow-xs bg-white">
                    <span className="bg-blue-600 text-white px-1.5 py-0.5 text-[9px] font-bold">TR</span>
                    <span className="px-2 py-0.5 tracking-wider text-slate-900">{v.dorsePlaka}</span>
                  </div>

                  {v.cekiciPlaka && (
                    <div className="text-[10px] text-slate-500 font-medium">
                      Çekici: <span className="font-bold text-slate-700">{v.cekiciPlaka}</span>
                    </div>
                  )}

                  {v.isAcik && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black animate-pulse shadow-xs">
                      <AlertTriangle className="w-2.5 h-2.5" /> ACİL ARAÇ
                    </div>
                  )}
                </div>

                {/* Durum Rozeti */}
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${
                      v.durum === 'BEKLEMEDE'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : v.durum === 'EVRAK HAZIR'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : v.durum === 'RAMPADA'
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {v.durum}
                  </span>

                  {rampName && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                      <WarehouseIcon className="w-3 h-3" /> {rampName}
                    </span>
                  )}
                </div>
              </div>

              {/* Müşteri & Yük Detayı */}
              <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1.5 border border-slate-100">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span className="truncate pr-2">{v.musteri}</span>
                  <span className="text-[10px] text-blue-600 shrink-0 font-semibold">{v.nakliyeFirmasi || 'Nakliye Belirtilmedi'}</span>
                </div>
                {v.konteynirNo && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    Konteynır: <b>{v.konteynirNo}</b>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>Depo: <b className="text-slate-700">{v.depoTuru}</b> ({v.islemTuru})</span>
                  <span className="font-mono text-slate-500">Giriş: {v.girisTarihi}</span>
                </div>
              </div>

              {/* Şoför & İletişim */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-800 truncate">{v.soforAd}</p>
                  <p className="text-[10px] text-slate-400 truncate">{v.soforTel}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${cleanPhone(v.soforTel)}`}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95"
                    title="Şoförü Ara"
                  >
                    <Phone className="w-3.5 h-3.5" /> Ara
                  </a>
                  <a
                    href={`https://wa.me/${cleanPhoneForWa(v.soforTel)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition flex items-center justify-center border border-emerald-300 active:scale-95"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                  </a>
                </div>
              </div>

              {/* Rampa Çağrısı Notu / Alarmı */}
              {v.isRampayaCagrildi && (
                <div className="bg-amber-500 text-slate-900 font-black p-2 rounded-xl text-xs flex items-center justify-between shadow-xs animate-pulse">
                  <span className="flex items-center gap-1.5">
                    <Megaphone className="w-4 h-4" /> Rampaya Çağrıldı!
                  </span>
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => onCancelRampCall(v)}
                      className="px-2 py-0.5 bg-red-800 text-white text-[10px] font-bold rounded cursor-pointer"
                    >
                      İptal
                    </button>
                  )}
                </div>
              )}

              {/* Telefon Dokunmatik Aksiyon Butonları (İncele, Çıkış, Foto, Düzenle) */}
              <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
                {/* İncele Butonu */}
                <button
                  onClick={() => onOpenDetailModal(v)}
                  className="py-2 px-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer col-span-1 shadow-2xs"
                  title="Araç Detaylarını ve Fotoğraflarını İncele"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>İncele</span>
                </button>

                {/* Güvenlik İçin Doğrudan Çıkış Onayı */}
                {currentUser?.role !== 'guest' ? (
                  <button
                    onClick={() => handleConfirmExit(v)}
                    className="py-2 px-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer col-span-1"
                    title="Aracın Sahadan Çıkışını Onayla"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Çıkış Ver
                  </button>
                ) : <div className="col-span-1" />}

                {/* Fotoğraf Görüntüle */}
                <button
                  onClick={() => onOpenPhotoGallery(v)}
                  className="py-2 px-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer col-span-1"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>Foto ({v.fotograflar?.length || 0})</span>
                </button>

                {/* Düzenle Butonu */}
                {currentUser?.role !== 'guest' ? (
                  <button
                    onClick={() => onOpenEditModal(v)}
                    className="py-2 px-1 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer col-span-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Düzenle
                  </button>
                ) : <div className="col-span-1" />}
              </div>

              {/* Durum Değiştirici (Mobilde Dokunmatik Seçici) */}
              {currentUser?.role !== 'guest' && (
                <div className="pt-1">
                  <select
                    value={v.durum}
                    onChange={(e) => onUpdateStatus(v, e.target.value as Vehicle['durum'])}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2 bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BEKLEMEDE">Durum: BEKLEMEDE</option>
                    <option
                      value="EVRAK HAZIR"
                      disabled={currentUser?.role !== 'admin' && v.durum !== 'EVRAK HAZIR'}
                    >
                      Durum: EVRAK HAZIR {currentUser?.role !== 'admin' && v.durum !== 'EVRAK HAZIR' ? '(Sadece Admin)' : ''}
                    </option>
                    <option value="RAMPADA">Durum: RAMPADA</option>
                    <option value="ÇIKIŞ YAPTI">Durum: ÇIKIŞ YAPTI</option>
                  </select>
                </div>
              )}

              {/* Rampa Atama & Hızlı Rampa Ata (Araç Durumunun Hemen Altında) */}
              {currentUser?.role !== 'guest' && (
                <div className="pt-2 space-y-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <select
                        value={v.rampaId ?? ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          if (val !== null && v.durum !== 'EVRAK HAZIR' && v.durum !== 'RAMPADA') {
                            alert(`Rampa ataması yapılabilmesi için aracın durumunun 'EVRAK HAZIR' olması gerekmektedir.\n\nMevcut Durum: ${v.durum}\nLütfen önce evrak onayını tamamlayınız.`);
                            return;
                          }
                          onAssignRamp(v, val);
                        }}
                        disabled={(v.durum !== 'EVRAK HAZIR' && v.durum !== 'RAMPADA')}
                        className={`w-full text-xs font-bold border rounded-xl p-2 outline-none focus:ring-2 focus:ring-purple-500 shadow-xs ${
                          v.durum !== 'EVRAK HAZIR' && v.durum !== 'RAMPADA'
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'border-purple-300 bg-purple-50/70 text-purple-900'
                        }`}
                      >
                        <option value="">Rampa Ata / Seç: {v.rampaId ? `(${getRampName(v.rampaId)})` : '(Seçilmedi)'}</option>
                        {ramps.map((r) => {
                          const isOccupiedByOther = vehicles.some(
                            (o) => o.rampaId === r.id && o.durum === 'RAMPADA' && o.id !== v.id
                          );
                          return (
                            <option
                              key={r.id}
                              value={r.id}
                              disabled={isOccupiedByOther && r.durum === 'Dolu'}
                            >
                              {r.ad} ({r.durum}){isOccupiedByOther ? ' - Dolu' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {v.rampaId && (
                      <button
                        type="button"
                        onClick={() => onAssignRamp(v, null)}
                        className="px-2.5 py-2 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl shrink-0 cursor-pointer transition active:scale-95"
                        title="Rampa Atamasını Kaldır"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>

                  {/* Rampa Atama Düğmesinin Hemen Altında 'Hızlı Rampa Ata' Butonu */}
                  <button
                    type="button"
                    onClick={() => handleQuickAssignRamp(v)}
                    className={`w-full py-2 px-3 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer ${
                      v.durum === 'EVRAK HAZIR'
                        ? 'bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200'
                    }`}
                    title={v.durum === 'EVRAK HAZIR' ? 'Boş bir rampaya hızlı ata' : 'Rampa ataması için durum EVRAK HAZIR olmalıdır'}
                  >
                    <Zap className={`w-3.5 h-3.5 ${v.durum === 'EVRAK HAZIR' ? 'text-amber-300 fill-amber-300' : 'text-slate-400'}`} />
                    <span>Hızlı Rampa Ata {v.durum !== 'EVRAK HAZIR' ? '(Önce Evrak Hazır Olmalı)' : ''}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
            <Truck className="w-8 h-8 mx-auto opacity-30 text-slate-500" />
            <p className="text-xs font-semibold">Aradığınız kriterlere uygun sahada aktif araç bulunamadı.</p>
          </div>
        )}
      </div>

      {/* ================= MASAÜSTÜ TABLO GÖRÜNÜMÜ ================= */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] custom-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold shadow-sm">
              <tr>
                <th className="p-2.5">Müşteri Adı</th>
                <th className="p-2.5">Dorse & Konteynır No</th>
                <th className="p-2.5">Şoför Bilgisi</th>
                <th className="p-2.5">Depo / İşlem Türü</th>
                <th className="p-2.5">Araç Durumu</th>
                <th className="p-2.5">Rampa Numarası</th>
                <th className="p-2.5 text-center">Fotoğraf</th>
                <th className="p-2.5">Kayıt Tarihi</th>
                <th className="p-2.5 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  className={`transition ${v.isAcik ? 'bg-red-50 border-l-4 border-red-600' : 'hover:bg-slate-50/80'}`}
                >
                  <td className="p-3">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      {v.musteri}
                      {v.isAcik && (
                        <span className="animate-pulse bg-red-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" /> ACİL ARAÇ
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="font-bold text-slate-800">{v.dorsePlaka}</div>
                    <div className="text-[11px] text-slate-500">{v.konteynirNo || 'Konteynır Yok'}</div>
                    <div className="text-[10px] text-blue-600 font-medium">{v.nakliyeFirmasi}</div>
                  </td>

                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{v.soforAd}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <a
                        href={`tel:${cleanPhone(v.soforTel)}`}
                        className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
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
                    <div className="font-semibold text-slate-700">{v.depoTuru}</div>
                    <div className="text-slate-500 text-[11px]">{v.islemTuru}</div>
                  </td>

                  <td className="p-3 space-y-1">
                    <select
                      value={v.durum}
                      onChange={(e) => onUpdateStatus(v, e.target.value as Vehicle['durum'])}
                      disabled={currentUser?.role === 'guest'}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="BEKLEMEDE">BEKLEMEDE</option>
                      <option value="EVRAK HAZIR" disabled={currentUser?.role !== 'admin' && v.durum !== 'EVRAK HAZIR'}>
                        EVRAK HAZIR {currentUser?.role !== 'admin' && v.durum !== 'EVRAK HAZIR' ? '(Sadece Admin)' : ''}
                      </option>
                      <option value="RAMPADA">RAMPADA</option>
                      <option value="ÇIKIŞ YAPTI">ÇIKIŞ YAPTI</option>
                    </select>

                    {v.isRampayaCagrildi && (
                      <div className="animate-pulse bg-amber-500 text-slate-900 font-extrabold px-2 py-1 rounded text-[9px] shadow-sm flex items-center justify-between gap-1">
                        <span className="flex items-center gap-1">
                          <Megaphone className="w-3 h-3" /> Rampaya Çağrıldı
                        </span>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancelRampCall(v);
                            }}
                            className="w-4 h-4 rounded-full bg-red-700 hover:bg-red-800 text-white flex items-center justify-center text-[9px] cursor-pointer"
                            title="Çağrıyı İptal Et (Sadece Admin)"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="p-3">
                    <div className="relative space-y-1">
                      <select
                        value={v.rampaId ?? ''}
                        onChange={(e) => onAssignRamp(v, e.target.value ? Number(e.target.value) : null)}
                        disabled={(v.durum !== 'EVRAK HAZIR' && v.durum !== 'RAMPADA') || currentUser?.role === 'guest'}
                        title={
                          currentUser?.role === 'guest'
                            ? 'Misafir kullanıcılar rampa ataması yapamaz.'
                            : v.durum === 'BEKLEMEDE'
                            ? "Rampa atayabilmek için aracın durumunu önce 'EVRAK HAZIR' yapınız."
                            : 'Rampa Seçiniz'
                        }
                        className={`border rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500 w-full ${
                          (v.durum !== 'EVRAK HAZIR' && v.durum !== 'RAMPADA') || currentUser?.role === 'guest'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                            : 'bg-white border-slate-200 font-semibold text-slate-700'
                        }`}
                      >
                        <option value="">Rampa Atanmadı</option>
                        {getAvailableRampsForVehicle(v).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.ad}
                          </option>
                        ))}
                      </select>

                      {/* Masaüstü Hızlı Rampa Ata Butonu */}
                      {currentUser?.role !== 'guest' && v.durum !== 'RAMPADA' && (
                        <button
                          type="button"
                          onClick={() => handleQuickAssignRamp(v)}
                          title={v.durum === 'EVRAK HAZIR' ? "Otomatik boş bir rampa atayıp aracı RAMPADA durumuna alır" : "Rampa ataması için araç durumu 'EVRAK HAZIR' olmalıdır"}
                          className={`w-full py-1 px-2 border font-bold text-[9px] rounded-lg transition flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-98 ${
                            v.durum === 'EVRAK HAZIR'
                              ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border-slate-200'
                          }`}
                        >
                          <Zap className={`w-3 h-3 ${v.durum === 'EVRAK HAZIR' ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                          <span>Hızlı Rampa Ata</span>
                        </button>
                      )}

                      {v.durum === 'EVRAK HAZIR' && !v.isRampayaCagrildi && currentUser?.role === 'admin' && (
                        <button
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
                      onClick={() => onOpenPhotoGallery(v)}
                      className="p-2 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Fotoğrafları İncele"
                    >
                      <Camera className="w-4 h-4 inline" />
                      {v.fotograflar && v.fotograflar.length > 0 && (
                        <span className="ml-1 text-[10px] font-bold text-blue-600">({v.fotograflar.length})</span>
                      )}
                    </button>
                  </td>

                  <td className="p-3 text-[11px]">
                    <div className="font-medium text-slate-700 font-mono flex items-center gap-1">
                      <LogIn className="w-3 h-3 text-emerald-600" />
                      <span>{v.girisTarihi}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {getDurationText(v)}
                    </div>
                  </td>

                  <td className="p-3 text-center space-y-1">
                    <button
                      onClick={() => onOpenDetailModal(v)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-lg hover:bg-blue-100 transition flex items-center gap-1 mx-auto cursor-pointer shadow-2xs w-full justify-center"
                      title="Araç Detaylarını ve Fotoğraflarını İncele"
                    >
                      <Eye className="w-3 h-3 text-blue-600" /> İncele
                    </button>

                    {currentUser?.role !== 'guest' && (
                      <button
                        onClick={() => onOpenEditModal(v)}
                        className="px-2.5 py-1 bg-slate-800 text-white text-[10px] font-medium rounded-lg hover:bg-slate-700 transition flex items-center gap-1 mx-auto cursor-pointer w-full justify-center"
                      >
                        <Edit3 className="w-3 h-3" /> Düzenle
                      </button>
                    )}

                    {currentUser?.role === 'admin' && (
                      <button
                        onClick={() => onToggleAcil(v)}
                        className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition block mx-auto cursor-pointer w-full ${
                          v.isAcik
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-xs'
                        }`}
                      >
                        {v.isAcik ? 'Acil Kaldır' : 'Acil Araç'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Aradığınız kriterlere uygun sahada aktif araç bulunamadı.
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

