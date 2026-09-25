import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ExpectedVehicle, User } from '../types';
import { cleanPhone, cleanPhoneForWa, formatExpectedDate, downloadExpectedTemplateCsv } from '../utils/helpers';
import {
  Clock,
  Filter,
  Trash2,
  Download,
  FileSpreadsheet,
  Plus,
  Phone,
  MessageSquare,
  LogIn,
  Warehouse as WarehouseIcon,
  CalendarCheck,
  Search,
  X
} from 'lucide-react';

interface ExpectedVehiclesViewProps {
  expectedVehicles: ExpectedVehicle[];
  selectedDepoId: number;
  currentUser: User | null;
  getWarehouseNameById: (id: number) => string;
  onOpenAddModal: () => void;
  onProcessArrival: (exp: ExpectedVehicle) => void;
  onDeleteSingle: (exp: ExpectedVehicle) => void;
  onDeleteBatch: (ids: number[]) => void;
  onImportExcelSuccess: (items: ExpectedVehicle[]) => void;
}

export const ExpectedVehiclesView: React.FC<ExpectedVehiclesViewProps> = ({
  expectedVehicles,
  selectedDepoId,
  currentUser,
  getWarehouseNameById,
  onOpenAddModal,
  onProcessArrival,
  onDeleteSingle,
  onDeleteBatch,
  onImportExcelSuccess
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  let filtered = expectedVehicles;
  if (selectedDepoId !== 0) {
    filtered = filtered.filter((e) => (e.depoId || 1) === selectedDepoId);
  }
  if (statusFilter) {
    filtered = filtered.filter((e) => e.durum === statusFilter);
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((e) =>
      (e.dorsePlaka && e.dorsePlaka.toLowerCase().includes(q)) ||
      (e.cekiciPlaka && e.cekiciPlaka.toLowerCase().includes(q)) ||
      (e.musteri && e.musteri.toLowerCase().includes(q)) ||
      (e.soforAd && e.soforAd.toLowerCase().includes(q)) ||
      (e.soforTel && e.soforTel.includes(q))
    );
  }

  const sortedList = [...filtered].sort((a, b) => {
    if (!a.beklenenTarih && !b.beklenenTarih) return b.id - a.id;
    if (!a.beklenenTarih) return 1;
    if (!b.beklenenTarih) return -1;
    const dateA = new Date(a.beklenenTarih).getTime();
    const dateB = new Date(b.beklenenTarih).getTime();
    if (isNaN(dateA) && isNaN(dateB)) return b.id - a.id;
    if (isNaN(dateA)) return 1;
    if (isNaN(dateB)) return -1;
    return dateA - dateB;
  });

  const isAllSelected = sortedList.length > 0 && selectedIds.length === sortedList.length;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedList.map((v) => v.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.length) return;
    onDeleteBatch(selectedIds);
    setSelectedIds([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

        if (!data || !data.length) {
          alert('Excel dosyasında veri bulunamadı.');
          return;
        }

        const newItems: ExpectedVehicle[] = [];
        data.forEach((row) => {
          const findVal = (...keys: string[]) => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find((rk) => rk.trim().toLowerCase() === k.toLowerCase());
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                return String(row[foundKey]).trim();
              }
            }
            return '';
          };

          const dorse = findVal('dorse plaka', 'dorse', 'plaka', 'dorseplaka');
          const cekici = findVal('çekici plaka', 'cekici plaka', 'çekici', 'cekici');
          const kont = findVal('konteynır no', 'konteynir no', 'konteynır', 'konteynir');
          const musteri = findVal('müşteri / firma', 'müşteri', 'musteri', 'firma');
          const sofor = findVal('şoför ad soyad', 'şoför', 'sofor', 'şoför adı');
          const tel = findVal('şoför telefon', 'telefon', 'tel', 'sofor tel');
          const depoTuru = findVal('depo türü', 'depo turu', 'depo') || 'Antrepo';
          const rawIslem = findVal('işlem türü', 'islem turu', 'işlem', 'islem') || 'Boşaltma';
          const islemTuru = rawIslem === 'Tahliye' ? 'Boşaltma' : rawIslem;
          const tarih = findVal('tahmini varış tarihi', 'beklenen tarih', 'tarih', 'not', 'açıklama');

          if (dorse || cekici || kont || musteri || sofor || tel || tarih) {
            newItems.push({
              id: Date.now() + Math.floor(Math.random() * 10000),
              depoId: selectedDepoId === 0 ? 1 : selectedDepoId,
              cekiciPlaka: cekici,
              dorsePlaka: dorse,
              konteynirNo: kont,
              soforAd: sofor,
              soforTel: tel,
              musteri: musteri,
              depoTuru: depoTuru as 'Antrepo' | 'Serbest Depo',
              islemTuru: (islemTuru === 'Tahliye' ? 'Boşaltma' : islemTuru) as 'Boşaltma' | 'Yükleme',
              beklenenTarih: tarih,
              durum: 'BEKLENİYOR'
            });
          }
        });

        if (newItems.length > 0) {
          onImportExcelSuccess(newItems);
        } else {
          alert('Excel sütun başlıkları eşleşmedi veya geçerli kayıt bulunamadı.');
        }
      } catch (err) {
        console.error('Excel parse error:', err);
        alert('Excel dosyası okunurken bir hata oluştu. Lütfen dosya formatını kontrol ediniz.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const pendingCount = expectedVehicles.filter(
    (e) => (selectedDepoId === 0 || e.depoId === selectedDepoId) && e.durum === 'BEKLENİYOR'
  ).length;

  const arrivedCount = expectedVehicles.filter(
    (e) => (selectedDepoId === 0 || e.depoId === selectedDepoId) && e.durum !== 'BEKLENİYOR'
  ).length;

  return (
    <div className="space-y-4">
      {/* Üst Arama & Filtre Paneli */}
      <div className="bg-white p-3.5 md:p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Arama Inputu */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Beklenen Araç Ara (Plaka, Şoför, Müşteri)..."
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

          {/* Eylem Butonları */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" /> Seçilenleri Sil ({selectedIds.length})
              </button>
            )}

            <button
              onClick={downloadExpectedTemplateCsv}
              className="hidden sm:inline-flex px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition items-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" /> Şablon
            </button>

            <label className="hidden sm:inline-flex px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition items-center gap-1.5 active:scale-95">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel Yükle
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {currentUser?.role !== 'guest' && (
              <button
                onClick={onOpenAddModal}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs md:text-sm rounded-xl transition flex items-center justify-center gap-1.5 shadow cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> Tekli Ekle
              </button>
            )}
          </div>
        </div>

        {/* Hızlı Filtre Butonları */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scroll text-xs">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === ''
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tümü
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {pendingCount + arrivedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('BEKLENİYOR')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'BEKLENİYOR'
                ? 'bg-amber-500 text-slate-900 shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Bekleyenler
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 font-extrabold">
              {pendingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('GİRİŞ YAPILDI')}
            className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'GİRİŞ YAPILDI'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Giriş Yapanlar
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 font-extrabold">
              {arrivedCount}
            </span>
          </button>
        </div>
      </div>

      {/* ================= TELEFON / MOBİL GÖRÜNÜM (KART DÜZENİ) ================= */}
      <div className="block md:hidden space-y-3">
        {sortedList.map((exp) => (
          <div
            key={exp.id}
            className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm space-y-3"
          >
            {/* Kart Üst Bilgisi: Plaka & Durum */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                {/* Türk Plaka Rozeti */}
                <div className="inline-flex items-center border-2 border-slate-800 rounded-lg overflow-hidden font-mono font-black text-xs shadow-xs bg-white">
                  <span className="bg-blue-600 text-white px-1.5 py-0.5 text-[9px] font-bold">TR</span>
                  <span className="px-2 py-0.5 tracking-wider text-slate-900">{exp.dorsePlaka || 'Plaka Yok'}</span>
                </div>

                {exp.cekiciPlaka && (
                  <div className="text-[10px] text-slate-500 font-medium">
                    Çekici: <span className="font-bold text-slate-700">{exp.cekiciPlaka}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${
                    exp.durum === 'BEKLENİYOR'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}
                >
                  {exp.durum}
                </span>

                <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1">
                  <WarehouseIcon className="w-3 h-3" />
                  {getWarehouseNameById(exp.depoId)}
                </span>
              </div>
            </div>

            {/* Müşteri, Tahmini Tarih & İşlem Bilgisi */}
            <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1 border border-slate-100">
              <div className="flex justify-between items-center font-bold text-slate-800">
                <span className="truncate">{exp.musteri || 'Müşteri Belirtilmedi'}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-600 pt-1 border-t border-slate-200/60">
                <span>
                  {exp.depoTuru || 'Antrepo'} / {exp.islemTuru === 'Tahliye' ? 'Boşaltma' : (exp.islemTuru || 'Boşaltma')}
                </span>
                <span className="font-bold text-purple-700 flex items-center gap-1">
                  <CalendarCheck className="w-3 h-3" />
                  {formatExpectedDate(exp.beklenenTarih)}
                </span>
              </div>
            </div>

            {/* Şoför & İletişim */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-800 truncate">{exp.soforAd || 'Şoför Belirtilmedi'}</p>
                <p className="text-[10px] text-slate-400 truncate">{exp.soforTel || 'Telefon Yok'}</p>
              </div>

              {exp.soforTel && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${cleanPhone(exp.soforTel)}`}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95"
                    title="Şoförü Ara"
                  >
                    <Phone className="w-3.5 h-3.5" /> Ara
                  </a>
                  <a
                    href={`https://wa.me/${cleanPhoneForWa(exp.soforTel)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition flex items-center justify-center border border-emerald-300 active:scale-95"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                  </a>
                </div>
              )}
            </div>

            {/* Güvenlik Aksiyon Butonu: Sahaya Al */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              {exp.durum === 'BEKLENİYOR' ? (
                <button
                  onClick={() => onProcessArrival(exp)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" /> Sahaya Al / Giriş Yap
                </button>
              ) : (
                <div className="flex-1 py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                  ✓ Sahaya Kabul Edildi
                </div>
              )}

              {currentUser?.role !== 'guest' && (
                <button
                  onClick={() => onDeleteSingle(exp)}
                  className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition active:scale-95 cursor-pointer border border-red-200 shrink-0"
                  title="Kaydı Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}

        {sortedList.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto opacity-30 text-amber-500" />
            <p className="text-xs font-semibold">Aradığınız kriterlere uygun beklenen araç kaydı bulunmamaktadır.</p>
          </div>
        )}
      </div>

      {/* ================= MASAÜSTÜ TABLO GÖRÜNÜMÜ ================= */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] custom-scroll">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 uppercase font-semibold shadow-sm">
              <tr>
                <th className="p-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded cursor-pointer accent-blue-600"
                  />
                </th>
                <th className="p-3">Beklenen Depo</th>
                <th className="p-3">Müşteri / Firma</th>
                <th className="p-3">Dorse & Çekici Plaka</th>
                <th className="p-3">Şoför Bilgisi & İletişim</th>
                <th className="p-3">Depo / İşlem Türü</th>
                <th className="p-3">Tahmini Geliş Tarihi</th>
                <th className="p-3">Durum</th>
                <th className="p-3 text-center">Güvenlik İşlemi</th>
                <th className="p-3 text-center">Sil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedList.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(exp.id)}
                      onChange={() => handleToggleSelect(exp.id)}
                      className="rounded cursor-pointer accent-blue-600"
                    />
                  </td>
                  <td className="p-3 font-bold text-blue-700">
                    <span className="inline-flex items-center gap-1">
                      <WarehouseIcon className="w-3.5 h-3.5" />
                      {getWarehouseNameById(exp.depoId)}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-slate-800">{exp.musteri || '-'}</td>
                  <td className="p-3">
                    <div className="font-extrabold text-slate-900">{exp.dorsePlaka || '-'}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{exp.cekiciPlaka || '-'}</div>
                  </td>

                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{exp.soforAd || '-'}</div>
                    {exp.soforTel ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a
                          href={`tel:${cleanPhone(exp.soforTel)}`}
                          className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                          title="Arama Yap"
                        >
                          <Phone className="w-3 h-3" /> {exp.soforTel}
                        </a>
                        <a
                          href={`https://wa.me/${cleanPhoneForWa(exp.soforTel)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-1.5 py-0.5 bg-emerald-500 text-white rounded font-bold text-[9px] hover:bg-emerald-600 transition flex items-center gap-0.5"
                          title="WhatsApp Mesaj Gönder"
                        >
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400">-</div>
                    )}
                  </td>

                  <td className="p-3">
                    {exp.depoTuru || '-'} / {exp.islemTuru || '-'}
                  </td>

                  <td className="p-3 font-bold text-purple-700">
                    <span className="inline-flex items-center gap-1">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      {formatExpectedDate(exp.beklenenTarih)}
                    </span>
                  </td>

                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold block w-fit ${
                        exp.durum === 'BEKLENİYOR'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {exp.durum}
                    </span>
                    {exp.kabulTarihi && (
                      <div className="text-[9px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-600" /> Giriş: {exp.kabulTarihi}
                      </div>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    {exp.durum === 'BEKLENİYOR' ? (
                      <button
                        onClick={() => onProcessArrival(exp)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl shadow transition flex items-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" /> Kayıt Ekle & Sahaya Al
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">Sahaya Kabul Edildi</span>
                    )}
                  </td>

                  <td className="p-3 text-center">
                    <button
                      onClick={() => onDeleteSingle(exp)}
                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition cursor-pointer"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {sortedList.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Aradığınız kriterlere uygun beklenen araç kaydı bulunmamaktadır.
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
