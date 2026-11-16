import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-4 left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] md:right-auto z-[70] flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-xl border border-amber-400/80 md:max-w-sm"
    >
      <WifiOff className="w-4 h-4 shrink-0 text-slate-950" />
      <span className="h-2 w-2 rounded-full bg-slate-950 animate-pulse shrink-0" />
      <span className="leading-snug">
        Çevrimdışı Mod — Son önbellek gösteriliyor, bağlantı gelince veriler eşitlenecek.
      </span>
    </div>
  );
};
