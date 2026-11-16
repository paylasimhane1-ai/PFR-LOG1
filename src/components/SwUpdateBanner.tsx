import React from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

interface SwUpdateBannerProps {
  visible: boolean;
  isUpdating: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const SwUpdateBanner: React.FC<SwUpdateBannerProps> = ({
  visible,
  isUpdating,
  onUpdate,
  onDismiss,
}) => {
  if (!visible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-5 left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] md:left-auto md:right-5 md:w-[390px] z-[75] rounded-2xl bg-slate-900 dark:bg-slate-900 text-white border border-emerald-500/50 shadow-2xl shadow-emerald-950/40 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold text-white">
            Yeni Uygulama Güncellemesi Hazır
          </p>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
            Yeni özellikler ve iyileştirmeler telefonunuza indirildi. Verileriniz korunarak hemen geçiş yapabilirsiniz.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onUpdate}
              disabled={isUpdating}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Güncelleniyor...' : 'Şimdi Güncelle'}</span>
            </button>
            <button
              type="button"
              onClick={onDismiss}
              disabled={isUpdating}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Sonra
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          disabled={isUpdating}
          aria-label="Güncelleme uyarısını kapat"
          className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
