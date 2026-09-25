import React, { useState, useMemo } from 'react';
import { Vehicle, User } from '../types';
import { getDurationText, getStatusBadgeClass, getDepoKayitTarihi, getRampaGirisTarihi, getRampaCikisTarihi } from '../utils/helpers';
import {
  FileSpreadsheet,
  Printer,
  FilterX,
  Search,
  Eye,
  RotateCcw,
  Clock,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Truck,
  CheckCircle2,
  Table,
  LogIn,
  LogOut
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

interface ReportsViewProps {
  vehicles: Vehicle[];
  currentUser?: User | null;
  getRampName: (id: number | null | undefined) => string;
  onExportCsv: (filteredVehicles: Vehicle[]) => void;
  onOpenDetailModal: (v: Vehicle) => void;
  onUndoExit: (v: Vehicle) => void;
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const ReportsView: React.FC<ReportsViewProps> = ({
  vehicles,
  currentUser,
  getRampName,
  onExportCsv,
  onOpenDetailModal,
  onUndoExit
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'charts' | 'table'>('both');
  const [filters, setFilters] = useState({
    search: '',
    startDate: '',
    endDate: ''
  });

  const handleClearFilters = () => {
    setFilters({ search: '', startDate: '', endDate: '' });
  };

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      const q = filters.search.trim().toLowerCase();
      const matchSearch =
        !q ||
        v.id.toString().includes(q) ||
        v.dorsePlaka.toLowerCase().includes(q) ||
        (v.cekiciPlaka && v.cekiciPlaka.toLowerCase().includes(q)) ||
        (v.konteynirNo && v.konteynirNo.toLowerCase().includes(q)) ||
        v.musteri.toLowerCase().includes(q) ||
        v.soforAd.toLowerCase().includes(q);

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
  }, [vehicles, filters]);

  const activeVehicles = useMemo(() => filtered.filter((v) => v.durum !== 'ÇIKIŞ YAPTI'), [filtered]);
  const exitedVehicles = useMemo(() => {
    const list = filtered.filter((v) => v.durum === 'ÇIKIŞ YAPTI');
    list.sort((a, b) => (b.cikisTimestamp || 0) - (a.cikisTimestamp || 0));
    return list;
  }, [filtered]);

  const sortedReports = useMemo(() => [...activeVehicles, ...exitedVehicles], [activeVehicles, exitedVehicles]);

  // KPI: Ortalama kalış süresi (dakika cinsinden)
  const averageYardStayMinutes = useMemo(() => {
    const exitedWithTimes = exitedVehicles.filter((v) => v.cikisTimestamp && v.girisTimestamp);
    if (!exitedWithTimes.length) return null;
    const totalMs = exitedWithTimes.reduce((acc, v) => acc + ((v.cikisTimestamp || 0) - (v.girisTimestamp || 0)), 0);
    return Math.round(totalMs / exitedWithTimes.length / 60000);
  }, [exitedVehicles]);

  const formatAvgTime = (minutes: number | null) => {
    if (minutes === null) return 'Veri Yok';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} dk`;
    return `${h} saat ${m} dk`;
  };

  // Grafik 1: İşlem Türü Dağılımı
  const operationTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((v) => {
      const type = v.islemTuru || 'Belirtilmedi';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Grafik 2: Rampa Kullanım Yoğunluğu
  const rampUsageData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((v) => {
      if (v.rampaId) {
        const rName = getRampName(v.rampaId);
        counts[rName] = (counts[rName] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    return sorted.slice(0, 8);
  }, [filtered, getRampName]);

  // Grafik 3: Saatlik Hareket Eğilimi (Giriş vs Çıkış)
  const hourlyActivityData = useMemo(() => {
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    const buckets: Record<string, { hour: string; giris: number; cikis: number }> = {};
    hours.forEach((h) => {
      buckets[h] = { hour: h, giris: 0, cikis: 0 };
    });

    filtered.forEach((v) => {
      if (v.girisTarihi) {
        const timePart = v.girisTarihi.split(' ')[1] || '';
        const h = parseInt(timePart.split(':')[0], 10);
        if (!isNaN(h)) {
          const roundedH = Math.min(20, Math.max(8, Math.floor(h / 2) * 2));
          const label = `${roundedH < 10 ? '0' : ''}${roundedH}:00`;
          if (buckets[label]) buckets[label].giris += 1;
        }
      }
      if (v.cikisTarihi) {
        const timePart = v.cikisTarihi.split(' ')[1] || '';
        const h = parseInt(timePart.split(':')[0], 10);
        if (!isNaN(h)) {
          const roundedH = Math.min(20, Math.max(8, Math.floor(h / 2) * 2));
          const label = `${roundedH < 10 ? '0' : ''}${roundedH}:00`;
          if (buckets[label]) buckets[label].cikis += 1;
        }
      }
    });
    return Object.values(buckets);
  }, [filtered]);

  const handlePrint = () => {
    window.print();
  };

  const canUndoExit = currentUser?.role === 'admin' || currentUser?.role === 'operasyon';

  return (
    <div className="space-y-4">
      {/* Üst Filtre ve Dışa Aktarma Başlığı */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Saha Analitik & Hareket Raporları
            </h3>
            <p className="text-xs text-slate-500">
              Giriş, rampa ve çıkış hareketleri ({sortedReports.length} kayıt filtrelendi)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Görünüm Geçişi */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setActiveTab('both')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  activeTab === 'both' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setActiveTab('charts')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'charts' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PieIcon className="w-3.5 h-3.5" /> Grafikler (KPI)
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                  activeTab === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" /> Tablo
              </button>
            </div>

            <button
              onClick={() => onExportCsv(sortedReports)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Excel (.CSV)
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Yazdır / PDF
            </button>
          </div>
        </div>

        {/* Filtre Barı */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600">Tarih Aralığı:</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={handleClearFilters}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" /> Filtreleri Temizle
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Genel Arama (Plaka, Müşteri)..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Toplam İşlem</div>
            <div className="text-lg font-extrabold text-slate-800">{filtered.length} Araç</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Sahada Aktif</div>
            <div className="text-lg font-extrabold text-amber-600">{activeVehicles.length} Araç</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Çıkış Yapan</div>
            <div className="text-lg font-extrabold text-emerald-600">{exitedVehicles.length} Araç</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Ortalama Sahada Kalış</div>
            <div className="text-base font-extrabold text-purple-700">{formatAvgTime(averageYardStayMinutes)}</div>
          </div>
        </div>
      </div>

      {/* Görsel Recharts Grafikleri */}
      {(activeTab === 'both' || activeTab === 'charts') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Grafik 1: İşlem Türü Dağılımı */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <PieIcon className="w-4 h-4 text-blue-600" />
              İşlem Türü Dağılımı
            </div>
            <div className="h-56">
              {operationTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={operationTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {operationTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">Veri yok</div>
              )}
            </div>
          </div>

          {/* Grafik 2: Rampa Yoğunluğu */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Rampa Kullanım Yoğunluğu (Araç Sayısı)
            </div>
            <div className="h-56">
              {rampUsageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rampUsageData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#e2e8f0' }} />
                    <Bar dataKey="count" name="Araç Sayısı" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">Veri yok</div>
              )}
            </div>
          </div>

          {/* Grafik 3: Saatlik Hareket Eğilimi */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Saatlik Giriş / Çıkış Hacmi
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="giris" name="Giriş" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cikis" name="Çıkış" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Detaylı Hareket Tablosu */}
      {(activeTab === 'both' || activeTab === 'table') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-3 md:p-0">
          {/* Mobil Görünüm: Kart Listesi (md:hidden) */}
          <div className="md:hidden space-y-3">
            {sortedReports.map((v) => {
              const isExited = v.durum === 'ÇIKIŞ YAPTI';
              return (
                <div
                  key={v.id}
                  className={`p-3.5 rounded-2xl border transition shadow-xs space-y-2.5 ${
                    isExited
                      ? 'bg-slate-900 text-white border-slate-800'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-400">#{v.id}</span>
                        <span className={`font-bold text-xs truncate ${isExited ? 'text-white' : 'text-slate-900'}`}>
                          {v.musteri}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs mt-0.5">
                        <Truck className="w-3.5 h-3.5 text-blue-500" />
                        <span>{v.dorsePlaka}</span>
                        {v.cekiciPlaka && <span className="text-[10px] opacity-70 font-normal">({v.cekiciPlaka})</span>}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold shrink-0 shadow-xs ${getStatusBadgeClass(v.durum)}`}>
                      {v.durum}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-semibold">{v.soforAd}</span>
                    <span className="text-[11px] opacity-70">{v.soforTel}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Depo / İşlem</span>
                      <span className="font-medium">{v.depoTuru} / {v.islemTuru}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Süre / Rampa</span>
                      <span className="font-bold text-blue-500">{getRampName(v.rampaId)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <div className="font-mono">
                      <div><b>G:</b> {v.girisTarihi}</div>
                      {v.cikisTarihi && <div><b>Ç:</b> {v.cikisTarihi}</div>}
                    </div>

                    <button
                      onClick={() => onOpenDetailModal(v)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> İncele
                    </button>
                  </div>
                </div>
              );
            })}

            {sortedReports.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Kriterlere uygun kayıt bulunamadı.
              </div>
            )}
          </div>

          {/* Masaüstü Tablo Görünümü (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto max-h-[600px] custom-scroll">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase shadow-sm">
                <tr>
                  <th className="p-2.5">ID</th>
                  <th className="p-2.5">Müşteri / Plaka</th>
                  <th className="p-2.5">Şoför</th>
                  <th className="p-2.5">Depo Türü</th>
                  <th className="p-2.5">İşlem Türü</th>
                  <th className="p-2.5">Depo Kayıt</th>
                  <th className="p-2.5">Rampa Giriş</th>
                  <th className="p-2.5">Rampa Çıkış</th>
                  <th className="p-2.5">Geçen Süre</th>
                  <th className="p-2.5">Rampa</th>
                  <th className="p-2.5">Son Durum</th>
                  <th className="p-2.5 text-center">İncele</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedReports.map((v) => {
                  const isExited = v.durum === 'ÇIKIŞ YAPTI';
                  return (
                    <tr
                      key={v.id}
                      className={
                        isExited
                          ? 'bg-slate-900 text-slate-200 font-medium'
                          : 'hover:bg-slate-50 text-slate-700'
                      }
                    >
                      <td className="p-3 font-mono text-slate-400">#{v.id}</td>
                      <td className="p-3">
                        <div className={`font-bold ${isExited ? 'text-white' : 'text-slate-800'}`}>
                          {v.musteri}
                        </div>
                        <div className="text-[11px] opacity-75">
                          <b>Dorse:</b> {v.dorsePlaka}
                        </div>
                      </td>
                      <td className="p-3">
                        {v.soforAd} <br />
                        <span className="opacity-60 text-[10px]">{v.soforTel}</span>
                      </td>
                      <td className="p-3 font-medium">{v.depoTuru}</td>
                      <td className="p-3 font-medium">{v.islemTuru}</td>
                      <td className="p-3 font-medium text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">
                        {getDepoKayitTarihi(v)}
                      </td>
                      <td className="p-3 font-medium text-purple-700 dark:text-purple-400 font-mono text-[11px]">
                        {getRampaGirisTarihi(v)}
                      </td>
                      <td className="p-3 font-medium text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {getRampaCikisTarihi(v)}
                      </td>
                      <td className={`p-3 font-bold ${isExited ? 'text-blue-300' : 'text-blue-700'}`}>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 opacity-70" />
                          {getDurationText(v)}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-blue-400">{getRampName(v.rampaId)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(v.durum)}`}>
                          {v.durum}
                        </span>
                      </td>

                      <td className="p-3 text-center space-y-1">
                        <button
                          onClick={() => onOpenDetailModal(v)}
                          className="px-2 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-[10px] rounded-lg font-semibold transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-blue-400" /> Detay ({v.fotograflar ? v.fotograflar.length : 0})
                        </button>
                        {isExited && canUndoExit && (
                          <button
                            onClick={() => onUndoExit(v)}
                            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white text-[9px] rounded font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                            title="Çıkış işlemini geri al (Yönetici & Operasyon)"
                          >
                            <RotateCcw className="w-3 h-3" /> Çıkışı Geri Al
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sortedReports.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      Süzgeç kriterlerine uygun araç kaydı bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
