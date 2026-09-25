import React, { useState } from 'react';
import { Vehicle } from '../types';
import { cleanPhone, cleanPhoneForWa, getStatusBadgeClass, getDurationText, getDepoKayitTarihi, getRampaGirisTarihi, getRampaCikisTarihi } from '../utils/helpers';
import { Search, Eye, RotateCcw, X, Megaphone, Phone, MessageSquare, Warehouse as WarehouseIcon, Clock, Truck, LogIn, LogOut } from 'lucide-react';

interface LiveTrackingViewProps {
  vehicles: Vehicle[];
  getRampName: (id: number | null | undefined) => string;
  onOpenDetailModal: (v: Vehicle) => void;
  onUndoExit: (v: Vehicle) => void;
  onCancelRampCall: (v: Vehicle) => void;
}

export const LiveTrackingView: React.FC<LiveTrackingViewProps> = ({
  vehicles,
  getRampName,
  onOpenDetailModal,
  onUndoExit,
  onCancelRampCall
}) => {
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: ''
  });

  const handleSetToday = () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    setFilters({ ...filters, startDate: todayIso, endDate: todayIso });
  };

  const handleClearFilters = () => {
    setFilters({ search: '', startDate: '', endDate: '' });
  };

  const filtered = vehicles.filter((v) => {
    const search = filters.search.trim().toLowerCase();
    const matchSearch =
      !search ||
      v.dorsePlaka.toLowerCase().includes(search) ||
      (v.cekiciPlaka && v.cekiciPlaka.toLowerCase().includes(search)) ||
      (v.konteynirNo && v.konteynirNo.toLowerCase().includes(search)) ||
      v.musteri.toLowerCase().includes(search) ||
      v.soforAd.toLowerCase().includes(search);

    let matchDate = true;
    if (filters.startDate || filters.endDate) {
      const vDateStr = v.girisTarihiIso;
      if (vDateStr) {
        if (filters.startDate && vDateStr < filters.startDate) matchDate = false;
        if (filters.endDate && vDateStr > filters.endDate) matchDate = false;
      }
    }

    return matchSearch && matchDate;
  });

  const activeVehicles = filtered.filter((v) => v.durum !== 'ÇIKIŞ YAPTI');
  const exitedVehicles = filtered.filter((v) => v.durum === 'ÇIKIŞ YAPTI');

  activeVehicles.sort((a, b) => {
    if (a.isAcik && !b.isAcik) return -1;
    if (!a.isAcik && b.isAcik) return 1;
    return b.id - a.id;
  });
  exitedVehicles.sort((a, b) => (b.cikisTimestamp || 0) - (a.cikisTimestamp || 0));

  const sortedList = [...activeVehicles, ...exitedVehicles];

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-700">Tarih Aralığı:</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleSetToday}
            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold transition cursor-pointer"
          >
            Today (Bugün)
          </button>
          <button
            onClick={handleClearFilters}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold transition cursor-pointer"
          >
            Sıfırla
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Genel Arama (Plaka, Müşteri)..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-3 md:p-0">
        {/* Mobil Kart Görünümü (md:hidden) */}
        <div className="md:hidden space-y-3">
          {sortedList.map((v) => {
            const isExited = v.durum === 'ÇIKIŞ YAPTI';
            return (
              <div
                key={v.id}
                className={`p-3.5 rounded-2xl border transition shadow-xs space-y-2.5 ${
                  isExited
                    ? 'bg-slate-900 text-white border-slate-800'
                    : v.isAcik
                    ? 'bg-red-50/50 border-red-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Üst Başlık: Müşteri & Durum */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`font-black text-xs truncate ${isExited ? 'text-white' : 'text-slate-900'}`}>
                        {v.musteri}
                      </span>
                      {v.isAcik && (
                        <span className="px-1.5 py-0.2 bg-red-600 text-white font-black text-[9px] rounded shadow animate-pulse">
                          ACİL
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] ${isExited ? 'text-slate-400' : 'text-slate-500'}`}>
                      {v.nakliyeFirmasi || 'Özel Nakliye'}
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold shrink-0 shadow-xs ${getStatusBadgeClass(v.durum)}`}>
                    {v.durum}
                  </span>
                </div>

                {/* Plaka & Konteynır */}
                <div className="flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <div>
                    <div className="flex items-center gap-1 font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
                      <Truck className="w-3.5 h-3.5 text-blue-500" />
                      {v.dorsePlaka}
                    </div>
                    {v.cekiciPlaka && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Çekici: {v.cekiciPlaka}
                      </div>
                    )}
                  </div>
                  {v.konteynirNo ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/50">
                      {v.konteynirNo}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Konteynır Yok</span>
                  )}
                </div>

                {/* Şoför & İletişim */}
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {v.soforAd}
                  </div>
                  {v.soforTel && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${cleanPhone(v.soforTel)}`}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-xs"
                      >
                        <Phone className="w-3 h-3" /> Ara
                      </a>
                      <a
                        href={`https://wa.me/${cleanPhoneForWa(v.soforTel)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-xs"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </a>
                    </div>
                  )}
                </div>

                {/* Rampa, Süre & Depo */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rampa</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {getRampName(v.rampaId) || 'Rampa Bekliyor'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Süre / İşlem</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-500" />
                      {getDurationText(v)}
                    </span>
                  </div>
                </div>

                {/* Rampaya Çağrıldı Uyarısı */}
                {v.isRampayaCagrildi && (
                  <div className="animate-pulse bg-amber-500 text-slate-900 font-black px-2.5 py-1.5 rounded-xl text-[10px] shadow flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5">
                      <Megaphone className="w-3.5 h-3.5" /> Rampaya Çağrıldı ({getRampName(v.cagrildigiRampaId || v.rampaId)})
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelRampCall(v);
                      }}
                      className="px-2 py-0.5 rounded-md bg-red-700 text-white font-bold text-[9px] cursor-pointer"
                    >
                      İptal Et
                    </button>
                  </div>
                )}

                {/* Alt Eylemler */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Giriş: {v.girisTarihi}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenDetailModal(v)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" /> İncele ({v.fotograflar?.length || 0})
                    </button>
                    {isExited && (
                      <button
                        onClick={() => onUndoExit(v)}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Geri Al
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {sortedList.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              Süzgeç kriterlerine uygun araç bulunamadı.
            </div>
          )}
        </div>

        {/* Masaüstü Tablo Görünümü (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto max-h-[600px] custom-scroll">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold shadow-sm">
              <tr>
                <th className="p-2.5">Müşteri / Nakliyeci</th>
                <th className="p-2.5">Plaka & Konteynır</th>
                <th className="p-2.5">Şoför Bilgisi</th>
                <th className="p-2.5">Depo Türü</th>
                <th className="p-2.5">İşlem Türü</th>
                <th className="p-2.5">Rampa</th>
                <th className="p-2.5">Süreç & Tarihler</th>
                <th className="p-2.5">Geçen Süre</th>
                <th className="p-2.5 text-center">Son Durum</th>
                <th className="p-2.5 text-center">İşlem & Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedList.map((v) => {
                const isExited = v.durum === 'ÇIKIŞ YAPTI';
                return (
                  <tr
                    key={v.id}
                    className={`transition ${
                      isExited
                        ? 'bg-slate-900 text-slate-200 font-medium'
                        : 'hover:bg-slate-50 text-slate-700'
                    } ${v.isAcik ? 'border-l-4 border-red-600 bg-red-50/50' : ''}`}
                  >
                    <td className="p-3">
                      <div
                        className={`font-bold flex items-center gap-1.5 ${
                          isExited ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {v.musteri}
                        {v.isAcik && (
                          <span className="animate-pulse bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow">
                            ACİL
                          </span>
                        )}
                      </div>
                      <div className={`text-[10px] ${isExited ? 'text-slate-400' : 'text-blue-600'}`}>
                        {v.nakliyeFirmasi || 'Özel Nakliye'}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-bold flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 opacity-60" />
                        {v.dorsePlaka}
                      </div>
                      <div className="text-[11px] opacity-75">
                        {v.konteynirNo ? `Kont: ${v.konteynirNo}` : 'Konteynır Yok'}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold">{v.soforAd}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a
                          href={`tel:${cleanPhone(v.soforTel)}`}
                          className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                          title="Arama Yap"
                        >
                          <Phone className="w-3 h-3" /> {v.soforTel}
                        </a>
                        <a
                          href={`https://wa.me/${cleanPhoneForWa(v.soforTel)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1.5 py-0.5 bg-emerald-500 text-white rounded font-bold text-[9px] hover:bg-emerald-600 transition flex items-center gap-0.5"
                          title="WhatsApp Mesaj Gönder"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </a>
                      </div>
                    </td>

                    <td className="p-3 font-medium">{v.depoTuru}</td>
                    <td className="p-3 font-medium">{v.islemTuru}</td>

                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-blue-300 font-extrabold text-[11px] rounded-xl border border-blue-500/30 shadow-md tracking-wide font-mono">
                        <WarehouseIcon className="w-3 h-3 text-blue-400" />
                        {getRampName(v.rampaId)}
                      </span>
                    </td>

                    <td className="p-3 text-[11px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5" title="1. Depo Kayıt Tarihi">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="text-[10px] text-slate-400 font-medium w-16">Depo Kayıt:</span>
                          <span className="font-mono font-bold text-[10px]">{getDepoKayitTarihi(v)}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="2. Rampa Giriş Tarihi">
                          <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0"></span>
                          <span className="text-[10px] text-purple-400 font-medium w-16">Rampa Giriş:</span>
                          <span className="font-mono font-bold text-[10px] text-purple-400">{getRampaGirisTarihi(v)}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="3. Rampa Çıkış Tarihi">
                          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                          <span className="text-[10px] text-slate-400 font-medium w-16">Rampa Çıkış:</span>
                          <span className="font-mono font-bold text-[10px] text-slate-300">{getRampaCikisTarihi(v)}</span>
                        </div>
                      </div>
                    </td>

                    <td className={`p-3 font-bold ${isExited ? 'text-blue-300' : 'text-blue-700'}`}>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 opacity-70" />
                        {getDurationText(v)}
                      </span>
                    </td>

                    <td className="p-3 text-center space-y-1">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold block ${getStatusBadgeClass(v.durum)}`}>
                        {v.durum}
                      </span>
                      {v.isRampayaCagrildi && (
                        <div className="animate-pulse bg-amber-500 text-slate-900 font-extrabold px-2 py-1 rounded text-[9px] shadow flex items-center justify-between gap-1">
                          <span className="flex items-center gap-1">
                            <Megaphone className="w-3 h-3" /> Rampaya Çağrıldı
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancelRampCall(v);
                            }}
                            className="w-4 h-4 rounded-full bg-red-700 hover:bg-red-800 text-white flex items-center justify-center text-[9px] cursor-pointer"
                            title="Çağrıyı İptal Et (X)"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-center space-y-1">
                      <button
                        onClick={() => onOpenDetailModal(v)}
                        className="px-2 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-[10px] rounded-lg font-semibold transition flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-blue-400" /> İncele ({v.fotograflar ? v.fotograflar.length : 0})
                      </button>
                      {isExited && (
                        <button
                          onClick={() => onUndoExit(v)}
                          className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-[9px] rounded font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                          title="Çıkış işlemini iptal edip sahaya geri al"
                        >
                          <RotateCcw className="w-3 h-3" /> Geri Al
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedList.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Süzgeç kriterlerine uygun araç bulunamadı.
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
