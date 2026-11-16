import React, { useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'login' | 'menu' | 'compact';
  onActionComplete?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  onActionComplete,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Uygulama zaten ana ekrana kurulmuş (standalone) modda çalışıyorsa gizle
  if (isInstalled) {
    return null;
  }

  // Kurulum tetiklenebilir değilse ve iOS değilse gösterme
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      onActionComplete?.();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const renderButton = () => {
    if (variant === 'menu') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full min-h-[44px] p-3.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 rounded-2xl font-bold text-xs flex items-center justify-between gap-2 border border-emerald-200 dark:border-emerald-800/70 transition cursor-pointer"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">
              {isInstallable ? 'Uygulamayı Telefona Yükle' : 'iPhone Ana Ekrana Ekle'}
            </span>
          </span>
          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-semibold shrink-0">
            {isInstallable ? 'Yükle' : 'Rehber'}
          </span>
        </button>
      );
    }

    if (variant === 'login') {
      return (
        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full min-h-[44px] py-2.5 mt-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 border border-emerald-200 dark:border-emerald-800/70 cursor-pointer active:scale-[0.99]"
        >
          {isInstallable ? (
            <>
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Telefon Uygulaması Olarak İndir</span>
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>iPhone / iPad Ana Ekrana Ekle</span>
            </>
          )}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{isInstallable ? 'Uygulamayı Yükle' : "iOS'a Ekle"}</span>
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 shadow-2xl text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    iPhone / iPad Kurulumu
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tam ekran uygulama deneyimi ve anlık güncellemeler
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="flex-1 leading-relaxed">
                  Safari alt araç çubuğundaki{' '}
                  <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                    Paylaş <Share className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </span>{' '}
                  simgesine dokunun.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="flex-1 leading-relaxed">
                  Aşağı kaydırıp{' '}
                  <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                    Ana Ekrana Ekle <PlusSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </span>{' '}
                  seçeneğine dokunun ve sağ üstten <strong>Ekle</strong> deyin.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSGuide(false);
                onActionComplete?.();
              }}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 py-2.5 text-xs font-bold text-white transition cursor-pointer"
            >
              Anladım
            </button>
          </div>
        </div>
      )}
    </>
  );
};
