import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  CheckCircle2,
  X,
  AlertTriangle,
  Smartphone,
  Volume2,
  ChevronRight,
  Info,
  ShieldCheck,
  Share2
} from 'lucide-react';
import {
  requestNotificationPermission,
  sendNativeNotification,
  isMobileDevice,
  isIOSDevice,
  isStandalonePWA,
  isNotificationSupported,
  checkPushNotificationReadiness
} from '../utils/notifications';

interface PushNotificationPromptBannerProps {
  permission: NotificationPermission | 'unsupported';
  onPermissionChange: (newPermission: NotificationPermission | 'unsupported') => void;
  onOpenSettings?: () => void;
}

const DISMISSED_SESSION_KEY = 'yms_push_banner_dismissed';

export const PushNotificationPromptBanner: React.FC<PushNotificationPromptBannerProps> = ({
  permission,
  onPermissionChange,
  onOpenSettings
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISSED_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isRequesting, setIsRequesting] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [showDeniedGuide, setShowDeniedGuide] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  const isMobile = isMobileDevice();
  const isIOS = isIOSDevice();
  const isPWA = isStandalonePWA();
  const isSupported = isNotificationSupported();

  // Eğer zaten izin verilmişse veya kullanıcı bu oturumda kapattıysa banner gösterme
  if (permission === 'granted' || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_SESSION_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      const res = await requestNotificationPermission();
      onPermissionChange(res);

      if (res === 'granted') {
        setSuccessToast(true);
        // Telefon veya masaüstünde hemen test bildirimi gönder
        await sendNativeNotification({
          title: '🔔 Bildirimler Başarıyla Aktif!',
          body: 'Lojistik & Saha operasyon bildirimleri bu cihazda anında ses ve titreşimle iletilecektir.',
          soundType: 'success'
        });
        setTimeout(() => {
          setIsDismissed(true);
        }, 1800);
      } else if (res === 'denied') {
        setShowDeniedGuide(true);
      }
    } catch (err) {
      console.warn('Bildirim izni hatası:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  // İzin tarayıcıda engellenmişse (denied)
  if (permission === 'denied') {
    return (
      <div className="mb-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-300 rounded-2xl p-3.5 sm:p-4 shadow-sm text-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                  Tarayıcı Bildirimleri Engellenmiş
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  Tarayıcı Ayarı
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Rampa yönlendirmeleri ve yeni araç girişlerini anlık alabilmek için bildirimleri tarayıcı ayarlarınızdan açmanız gerekir.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeniedGuide(!showDeniedGuide)}
                  className="text-[11px] font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>{showDeniedGuide ? 'Rehberi Gizle' : 'Nasıl Açılır?'}</span>
                </button>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    Bildirim Ayarları
                  </button>
                )}
              </div>

              {showDeniedGuide && (
                <div className="mt-2.5 p-3 bg-white rounded-xl border border-amber-200 text-[11px] text-slate-700 space-y-1.5 animate-in fade-in duration-150">
                  <div className="font-bold text-slate-800">Tarayıcıda İzin Vermek İçin:</div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-0.5">
                    <li>Tarayıcının üst adres çubuğundaki kilit 🔒 veya site ayarları simgesine dokunun.</li>
                    <li><strong>"İzinler"</strong> veya <strong>"Bildirimler"</strong> seçeneğini bulun.</li>
                    <li>Engellendi durumunu <strong>"İzin Ver / Açık"</strong> olarak değiştirin ve sayfayı yenileyin.</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            title="Kapat"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // İzin henüz verilmemişse (default / prompt aşaması)
  return (
    <div className="mb-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white rounded-2xl p-3.5 sm:p-4 shadow-md shadow-emerald-900/10 border border-emerald-500/30 animate-in fade-in slide-in-from-top-2 duration-200 relative overflow-hidden">
      {/* Arka plan süs efekti */}
      <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        {/* Sol İkon ve Metin */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
            <BellRing className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-xs sm:text-sm text-white flex items-center gap-1.5">
                <span>Mobil & Saha Bildirimlerini Aktif Edin</span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 border border-emerald-400/40">
                {isMobile ? 'Mobil Uyumlu' : 'Anlık Takip'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-100 leading-snug max-w-xl">
              Rampa yönlendirmeleri, araç kabulleri ve amir çağrılarını anında <strong>sesli ve titreşimli</strong> bildirim olarak alın.
            </p>
          </div>
        </div>

        {/* Sağ Butonlar */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold transition cursor-pointer"
          >
            Daha Sonra
          </button>

          <button
            type="button"
            onClick={handleEnableNotifications}
            disabled={isRequesting}
            className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 text-xs font-black rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isRequesting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" />
                <span>İzin Bekleniyor...</span>
              </>
            ) : successToast ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Etkinleştirildi!</span>
              </>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5 text-emerald-700" />
                <span>Bildirimleri Aç</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            title="Kapat"
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer hidden sm:flex shrink-0 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Özel Bilgilendirme Notu */}
      {isIOS && !isPWA && (
        <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-emerald-100">
          <span className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-emerald-200" />
            <span>iPhone / iPad kullanıcıları: Safari Paylaş 📤 butonundan <strong>"Ana Ekrana Ekle"</strong> yaparak bildirimleri kalıcı aktif edebilir.</span>
          </span>
        </div>
      )}
    </div>
  );
};
