import React, { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { getVehicleStageTimes, VehicleStageTimes } from '../utils/slaHelpers';
import { getDepoKayitTarihi, getEvrakHazirTarihi, getRampaGirisTarihi, getRampaCikisTarihi } from '../utils/helpers';
import { Clock, AlertTriangle, CheckCircle, Flame, ArrowRight, ShieldCheck, FileCheck, Warehouse, LogIn, LogOut, Calendar } from 'lucide-react';

interface RampSlaIndicatorProps {
  vehicle: Vehicle;
  compact?: boolean;
}

export const RampSlaIndicator: React.FC<RampSlaIndicatorProps> = ({ vehicle, compact = false }) => {
  // Canlı güncelleme: her 15 saniyede bir yeniden render olsun
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const stage = getVehicleStageTimes(vehicle, now);

  if (stage.rampaIslemMinutes === null) {
    return null;
  }

  // Kompakt görünüm (Örn: Tablo satırlarında veya dar kartlarda)
  if (compact) {
    if (stage.isOverdue) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[9px] font-black bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse shadow-xs"
          title={`Hedef: ${stage.targetText} | Aşılan Süre: ${stage.delayText} (İşlem: ${vehicle.islemTuru})`}
        >
          <Flame className="w-2.5 h-2.5 text-red-600 animate-bounce" />
          <span>GECİKME: {stage.delayText}</span>
          <span className="text-[8px] opacity-80">({stage.rampaIslemText})</span>
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold border ${
          stage.status === 'WARNING'
            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700'
            : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
        }`}
        title={`Hedef: ${stage.targetText} | Kalan: ${stage.remainingMinutes} Dk (İşlem: ${vehicle.islemTuru})`}
      >
        <Clock className="w-2.5 h-2.5" />
        <span>{stage.rampaIslemText}</span>
        <span className="text-[8px] opacity-75">/ {stage.targetText}</span>
      </span>
    );
  }

  // Minimize Edilmiş Kompakt Kart Görünümü (Rampa Yönetimi ve Mobil Kartlar için az yer kaplayan şık mikro-gösterge)
  return (
    <div
      className={`rounded px-1.5 py-1 border transition-all select-none ${
        stage.isOverdue
          ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 shadow-2xs'
          : stage.status === 'WARNING'
          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800'
          : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
      }`}
      title={`İşlem: ${vehicle.islemTuru} | Hedef: ${stage.targetText} | Evrak Süresi: ${stage.evrakHazirlikText} | Rampa Bekleme: ${stage.rampaBeklemeText}`}
    >
      <div className="flex items-center justify-between text-[9px] font-mono leading-tight">
        <span className="flex items-center gap-1 font-bold">
          {stage.isOverdue ? (
            <Flame className="w-2.5 h-2.5 text-red-600 animate-bounce shrink-0" />
          ) : (
            <Clock className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400 shrink-0" />
          )}
          <span className={stage.isOverdue ? 'text-red-700 dark:text-red-300 font-black' : 'text-slate-800 dark:text-slate-200'}>
            {stage.rampaIslemText}
          </span>
          <span className="text-[8px] text-slate-400 dark:text-slate-500">/{stage.targetText}</span>
        </span>

        <span className="font-extrabold text-[8px] uppercase tracking-tight">
          {stage.isOverdue ? (
            <span className="text-red-600 dark:text-red-400 font-black animate-pulse">
              +{stage.delayText}
            </span>
          ) : stage.status === 'WARNING' ? (
            <span className="text-amber-700 dark:text-amber-300">
              Kalan {stage.remainingMinutes}d
            </span>
          ) : (
            <span className="text-emerald-700 dark:text-emerald-300">
              %{Math.round(stage.progressPercent)}
            </span>
          )}
        </span>
      </div>

      {/* 1.5px Mikro İlerleme Çubuğu */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-0.5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            stage.isOverdue
              ? 'bg-red-600 animate-pulse'
              : stage.status === 'WARNING'
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${Math.min(100, stage.progressPercent)}%` }}
        />
      </div>
    </div>
  );
};

interface VehicleLifecycleTimelineProps {
  vehicle: Vehicle;
  rampName?: string;
}

export const VehicleLifecycleTimeline: React.FC<VehicleLifecycleTimelineProps> = ({ vehicle, rampName }) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const stage = getVehicleStageTimes(vehicle, now);
  const activeRampLabel = rampName || (vehicle.rampaId ? `Rampa ${vehicle.rampaId}` : 'Rampa');
  const isExited = vehicle.durum === 'ÇIKIŞ YAPTI';
  const isRampada = vehicle.durum === 'RAMPADA';
  const hasRampHistory = isRampada || isExited || !!vehicle.rampayaGirisTarihi;

  return (
    <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3">
      {/* Başlık ve Toplam Süre */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
              <span>Süreç ve Yaşam Döngüsü Zaman Çizelgesi</span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Kayıttan çıkışa kadar tüm kritik aşamaların kesin tarih ve süre analizi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl font-bold flex items-center gap-1 shadow-2xs">
            <Calendar className="w-3 h-3 text-blue-400" /> Toplam Süre: <strong className="text-blue-300">{stage.toplamTesisText}</strong>
          </span>
        </div>
      </div>

      {/* 4 Aşamalı Tam Zaman & Süreç Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        {/* 1. Aşama: Depo Giriş / Kayıt */}
        <div className="bg-slate-800/90 rounded-xl p-3 border border-emerald-500/40 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                <LogIn className="w-3 h-3 text-emerald-400" /> 1. Depo Kayıt
              </span>
              <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/40">
                Giriş Yapıldı
              </span>
            </div>

            {/* Tarih & Saat */}
            <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 text-center my-1.5">
              <span className="text-[9px] text-slate-400 block font-semibold">Tesis Giriş Tarihi & Saati</span>
              <span className="text-xs font-black font-mono text-emerald-300 block tracking-tight">
                {getDepoKayitTarihi(vehicle)}
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-700/50 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Güvenlik Saha Kabulü</span>
            <span className="text-emerald-400 font-bold">Tamam</span>
          </div>
        </div>

        {/* 2. Aşama: Evrak Hazırlığı */}
        <div className="bg-slate-800/90 rounded-xl p-3 border border-blue-500/40 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/30">
                <FileCheck className="w-3 h-3 text-blue-400" /> 2. Evrak Hazırlık
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                vehicle.evrakHazirTimestamp
                  ? 'text-blue-300 bg-blue-950/80 border-blue-800/40'
                  : 'text-amber-300 bg-amber-950/80 border-amber-800/40'
              }`}>
                {vehicle.evrakHazirTimestamp ? 'Evrak Hazır' : 'Hazırlanıyor'}
              </span>
            </div>

            {/* Tarih & Saat */}
            <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 text-center my-1.5">
              <span className="text-[9px] text-slate-400 block font-semibold">Evrak Hazır Onay Tarihi</span>
              <span className="text-xs font-black font-mono text-blue-300 block tracking-tight">
                {getEvrakHazirTarihi(vehicle)}
              </span>
            </div>

            {/* Kayıt → Evrak Süresi */}
            <div className="bg-blue-950/60 border border-blue-500/30 rounded-lg px-2 py-1 flex items-center justify-between text-[10px]">
              <span className="text-blue-300 font-medium flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-blue-400" /> Evrak Süresi:
              </span>
              <span className="font-extrabold font-mono text-blue-200">
                {stage.evrakHazirlikText}
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-700/50 text-[10px] text-slate-400">
            Kayıttan evrak onayına geçen süre
          </div>
        </div>

        {/* 3. Aşama: Rampa Giriş & İşlem */}
        <div className={`rounded-xl p-3 border flex flex-col justify-between space-y-2 ${
          stage.isOverdue
            ? 'bg-red-950/60 border-red-500 shadow-md shadow-red-950/50 ring-1 ring-red-500/50'
            : isRampada
            ? 'bg-purple-950/50 border-purple-500 shadow-md shadow-purple-950/40'
            : hasRampHistory
            ? 'bg-slate-800/90 border-purple-500/40'
            : 'bg-slate-800/40 border-slate-700/60 opacity-80'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                stage.isOverdue
                  ? 'text-red-300 bg-red-500/20 border-red-500/40'
                  : hasRampHistory
                  ? 'text-purple-300 bg-purple-500/10 border-purple-500/30'
                  : 'text-slate-400 bg-slate-800 border-slate-700'
              }`}>
                <Warehouse className="w-3 h-3 text-purple-400" /> 3. Rampa Giriş
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                stage.isOverdue
                  ? 'bg-red-600 text-white animate-pulse'
                  : isRampada
                  ? 'bg-purple-600 text-white animate-pulse'
                  : hasRampHistory
                  ? 'bg-purple-950/80 text-purple-300'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {stage.isOverdue ? 'Gecikmede' : isRampada ? 'Rampada' : hasRampHistory ? 'Tamamlandı' : 'Bekliyor'}
              </span>
            </div>

            {/* Tarih & Saat */}
            <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 text-center my-1.5">
              <span className="text-[9px] text-slate-400 block font-semibold">
                {hasRampHistory ? `${activeRampLabel} Giriş Tarihi` : 'Rampa Giriş Tarihi'}
              </span>
              <span className={`text-xs font-black font-mono block tracking-tight ${
                hasRampHistory ? 'text-purple-300' : 'text-slate-500'
              }`}>
                {hasRampHistory ? getRampaGirisTarihi(vehicle) : 'Henüz Rampaya Alınmadı'}
              </span>
            </div>

            {/* Bekleme ve Rampada Geçen Süre */}
            <div className="space-y-1">
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-0.5 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-medium">Rampa Bekleme:</span>
                <span className="font-extrabold font-mono text-slate-300">{stage.rampaBeklemeText}</span>
              </div>
              <div className={`rounded-lg px-2 py-0.5 flex items-center justify-between text-[10px] border ${
                stage.isOverdue
                  ? 'bg-red-950/80 border-red-500/50 text-red-200'
                  : 'bg-purple-950/70 border-purple-500/30 text-purple-200'
              }`}>
                <span className="font-medium flex items-center gap-1">
                  {stage.isOverdue ? <Flame className="w-2.5 h-2.5 text-red-400 animate-bounce" /> : <Clock className="w-2.5 h-2.5 text-purple-400" />}
                  Rampa Süresi:
                </span>
                <span className="font-extrabold font-mono">
                  {stage.rampaIslemText} {stage.isOverdue && `(${stage.delayText})`}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-700/50 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Hedef: {stage.targetText} ({vehicle.islemTuru})</span>
            {vehicle.rampaId && (
              <span className="font-bold text-[9px] text-purple-300 bg-purple-950 px-1.5 py-0.2 rounded border border-purple-800">
                {activeRampLabel}
              </span>
            )}
          </div>
        </div>

        {/* 4. Aşama: Saha Çıkış Tarihi */}
        <div className={`rounded-xl p-3 border flex flex-col justify-between space-y-2 ${
          isExited
            ? 'bg-slate-800/90 border-rose-500/40'
            : 'bg-slate-800/40 border-slate-700/60 opacity-80'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                isExited
                  ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                  : 'text-slate-400 bg-slate-800 border-slate-700'
              }`}>
                <LogOut className="w-3 h-3 text-rose-400" /> 4. Tesis Çıkış
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                isExited
                  ? 'bg-slate-800 text-rose-300 border border-rose-800/40'
                  : 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
              }`}>
                {isExited ? 'Çıkış Yapıldı' : 'Sahada Aktif'}
              </span>
            </div>

            {/* Tarih & Saat */}
            <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 text-center my-1.5">
              <span className="text-[9px] text-slate-400 block font-semibold">Tesis Çıkış Tarihi & Saati</span>
              <span className={`text-xs font-black font-mono block tracking-tight ${
                isExited ? 'text-rose-300' : 'text-slate-500'
              }`}>
                {getRampaCikisTarihi(vehicle)}
              </span>
            </div>

            {/* Toplam Sahada Geçen Süre */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-slate-400" /> Toplam Süre:
              </span>
              <span className="font-extrabold font-mono text-slate-200">
                {stage.toplamTesisText}
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-700/50 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Saha Terki & Güvenlik</span>
            <span className={isExited ? 'text-rose-400 font-bold' : 'text-slate-500'}>
              {isExited ? 'Çıkış Onaylandı' : 'İşlem Sürüyor'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
