import React from 'react';
import { Ramp } from '../types';

interface RampTrafficLightProps {
  status: Ramp['durum'];
  size?: 'sm' | 'md';
  showBadge?: boolean;
}

export const RampTrafficLight: React.FC<RampTrafficLightProps> = ({
  status,
  size = 'md',
  showBadge = true
}) => {
  const isDolu = status === 'Dolu';
  const isBos = status === 'Boş';
  const isArizali = status === 'Arızalı' || status === 'Bakımda';

  return (
    <div className="inline-flex items-center gap-1.5 shrink-0 select-none">
      {/* 3'lü Mini Trafik Işığı (Traffic Light Indicator) */}
      <div
        className="flex items-center gap-1 bg-slate-950 px-1.5 py-1 rounded-full border border-slate-800 shadow-inner"
        title={`Rampa Sinyali: ${status}`}
      >
        {/* Kırmızı Işık (Dolu için Yanar) */}
        <span
          className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
            isDolu
              ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.95)] ring-1 ring-red-300 animate-pulse'
              : 'bg-red-950/60 opacity-25'
          }`}
          title="Kırmızı: Rampa Dolu"
        />

        {/* Sarı/Turuncu Işık (Arızalı/Bakımda için Yanar) */}
        <span
          className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
            isArizali
              ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.95)] ring-1 ring-amber-200 animate-pulse'
              : 'bg-amber-950/60 opacity-25'
          }`}
          title="Sarı: Rampa Arızalı / Bakımda"
        />

        {/* Yeşil Işık (Boş için Yanar) */}
        <span
          className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
            isBos
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)] ring-1 ring-emerald-200'
              : 'bg-emerald-950/60 opacity-25'
          }`}
          title="Yeşil: Rampa Boş (Müsait)"
        />
      </div>

      {/* Renklendirilmiş Durum Rozeti */}
      {showBadge && (
        <span
          className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-lg border flex items-center gap-1 shadow-2xs ${
            isDolu
              ? 'bg-red-50 text-red-700 border-red-200'
              : isBos
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDolu
                ? 'bg-red-600 animate-ping'
                : isBos
                ? 'bg-emerald-600'
                : 'bg-amber-500 animate-bounce'
            }`}
          />
          {status}
        </span>
      )}
    </div>
  );
};
