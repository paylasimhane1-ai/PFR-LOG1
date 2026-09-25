import React, { useState } from 'react';
import { Vehicle } from '../types';
import { getStatusBadgeClass, getStatusDurationLabel, getSpecificStatusDuration } from '../utils/helpers';
import { Truck, LogOut, Search, Megaphone, ShieldAlert, Image, HelpCircle } from 'lucide-react';

interface GuestPortalProps {
  vehicles: Vehicle[];
  getRampName: (id: number | null | undefined) => string;
  onLogout: () => void;
  onOpenPhotoGallery: (v: Vehicle) => void;
}

export const GuestPortal: React.FC<GuestPortalProps> = ({
  vehicles,
  getRampName,
  onLogout,
  onOpenPhotoGallery
}) => {
  const [query, setQuery] = useState({ dorsePlaka: '', cekiciPlaka: '', konteynirNo: '' });
  const [searchResult, setSearchResult] = useState<Vehicle | null>(null);
  const [attempted, setAttempted] = useState(false);

  const handleSearch = () => {
    setAttempted(true);
    const dorse = query.dorsePlaka.trim().toLowerCase().replace(/\s+/g, '');
    const cekici = query.cekiciPlaka.trim().toLowerCase().replace(/\s+/g, '');
    const kont = query.konteynirNo.trim().toLowerCase().replace(/\s+/g, '');

    if (!dorse && !cekici && !kont) {
      alert('Lütfen sorgulama yapmak için en az bir alan doldurunuz.');
      return;
    }

    const found = vehicles.find((v) => {
      const vDorse = (v.dorsePlaka || '').toLowerCase().replace(/\s+/g, '');
      const vCekici = (v.cekiciPlaka || '').toLowerCase().replace(/\s+/g, '');
      const vKont = (v.konteynirNo || '').toLowerCase().replace(/\s+/g, '');

      const matchDorse = dorse ? vDorse.includes(dorse) : false;
      const matchCekici = cekici ? vCekici.includes(cekici) : false;
      const matchKont = kont ? vKont.includes(kont) : false;

      return matchDorse || matchCekici || matchKont;
    });

    setSearchResult(found || null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-bold text-sm">Misafir Araç Takip Portalı</h1>
        </div>
        <button
          onClick={onLogout}
          className="text-slate-400 hover:text-red-400 text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 rounded-lg cursor-pointer transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          Çıkış Yap
        </button>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-3xl w-full mx-auto space-y-6">
        <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-2xl shadow-2xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Araç Sorgulama
          </h2>
          <p className="text-xs text-slate-400">
            Aşağıdaki alanlardan herhangi birini doldurarak aracınızın sahadaki durumunu sorgulayabilirsiniz.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Dorse Plakası</label>
              <input
                type="text"
                value={query.dorsePlaka}
                onChange={(e) => setQuery({ ...query, dorsePlaka: e.target.value })}
                placeholder="Örn: 34 TR 123"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Çekici Plakası</label>
              <input
                type="text"
                value={query.cekiciPlaka}
                onChange={(e) => setQuery({ ...query, cekiciPlaka: e.target.value })}
                placeholder="Örn: 34 ABC 123"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Konteynır No</label>
              <input
                type="text"
                value={query.konteynirNo}
                onChange={(e) => setQuery({ ...query, konteynirNo: e.target.value })}
                placeholder="Örn: MSCU1234567"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 uppercase"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            Aracımı Sorgula
          </button>
        </div>

        {searchResult && (
          <div className="bg-white text-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  {searchResult.musteri}
                </span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <Truck className="w-5 h-5 text-slate-500" /> {searchResult.dorsePlaka}
                </h3>
                <p className="text-xs text-slate-500">
                  Çekici: {searchResult.cekiciPlaka || '-'} | Konteynır: {searchResult.konteynirNo || '-'}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-bold shadow-sm ${getStatusBadgeClass(searchResult.durum)}`}>
                {searchResult.durum}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">İşlem / Depo</span>
                <span className="font-bold text-slate-800">
                  {searchResult.depoTuru} - {searchResult.islemTuru}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Atanan Rampa</span>
                <span className="font-bold text-purple-700">{getRampName(searchResult.rampaId)}</span>
              </div>
              <div className="bg-blue-100/60 p-2 rounded-lg border border-blue-200">
                <span className="text-blue-900 font-bold block text-[10px]">
                  {getStatusDurationLabel(searchResult.durum)}
                </span>
                <span className="font-extrabold text-blue-700 text-sm">
                  ⏱ {getSpecificStatusDuration(searchResult)}
                </span>
              </div>
            </div>

            {searchResult.isRampayaCagrildi && (
              <div className="p-3 bg-amber-500 text-slate-900 rounded-xl font-bold text-xs flex items-center gap-2 animate-pulse shadow-md">
                <Megaphone className="w-5 h-5 shrink-0" />
                <span>
                  ARACINIZ RAMPAYA ÇAĞRILDI! Lütfen aracı{' '}
                  {getRampName(searchResult.cagrildigiRampaId || searchResult.rampaId)} numarasına yanaştırınız.
                </span>
              </div>
            )}

            {searchResult.guvenlikNotlari && searchResult.guvenlikNotlari.length > 0 && (
              <div className="space-y-1 pt-2">
                <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Güvenlik Geri Bildirim Notları
                </h4>
                <div className="space-y-1">
                  {searchResult.guvenlikNotlari.map((n, idx) => (
                    <div key={idx} className="p-2 bg-slate-100 rounded-lg text-[11px] text-slate-700">
                      <b>{n.time}:</b> {n.note} <span className="text-slate-400 text-[9px]">({n.author})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResult.fotograflar && searchResult.fotograflar.length > 0 && (
              <div className="pt-2">
                <h4 className="font-bold text-xs text-slate-700 mb-2 flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-blue-600" />
                  Yüklenen Fotoğraflar
                </h4>
                <div className="flex gap-2 overflow-x-auto">
                  {searchResult.fotograflar.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Araç fotoğrafı ${i + 1}`}
                      onClick={() => onOpenPhotoGallery(searchResult)}
                      className="w-16 h-16 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {attempted && !searchResult && (
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl text-center text-slate-400 text-xs">
            <HelpCircle className="w-8 h-8 text-amber-500 mb-2 mx-auto block" />
            Girdiğiniz bilgilere ait aktif bir araç kaydı bulunamadı. Lütfen bilgileri kontrol edip tekrar deneyiniz.
          </div>
        )}
      </main>
    </div>
  );
};
