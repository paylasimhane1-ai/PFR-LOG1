import React, { useState } from 'react';
import { PushNotificationSettings } from '../types';
import {
  loadPushSettings,
  savePushSettings,
  getNotificationPermission,
  requestNotificationPermission,
  sendNativeNotification,
  DEFAULT_PUSH_SETTINGS
} from '../utils/notifications';
import { X, Bell, Check, AlertCircle, ShieldAlert, Sparkles, Volume2 } from 'lucide-react';

interface PushNotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (newSettings: PushNotificationSettings) => void;
}

export const PushNotificationSettingsModal: React.FC<PushNotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved
}) => {
  const [settings, setSettings] = useState<PushNotificationSettings>(loadPushSettings());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(getNotificationPermission());
  const [isRequesting, setIsRequesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setTestFeedback(null);
    const newPerm = await requestNotificationPermission();
    setPermission(newPerm);
    setIsRequesting(false);
    if (newPerm === 'granted') {
      await sendNativeNotification({
        title: '🔔 Bildirimler Aktif!',
        body: 'Lojistik & Depo Yönetim Sistemi bildirimleri başarıyla etkinleştirildi.',
        soundType: 'success'
      });
      setTestFeedback('✅ Bildirim izni verildi ve test bildirimi telefonunuza gönderildi!');
    } else if (newPerm === 'denied') {
      setTestFeedback('❌ Bildirim izni tarayıcı ayarlarından engellenmiş. Adres çubuğundaki kilit simgesine basıp bildirimlere izin vermelisiniz.');
    }
  };

  const handleSendTest = async () => {
    setTestFeedback(null);
    if (permission !== 'granted') {
      await handleRequestPermission();
      return;
    }
    const success = await sendNativeNotification({
      title: '🚛 Test Bildirimi: Rampa 4 Atandı!',
      body: '34 AB 1234 - Örnek Lojistik aracı Rampa 4 için yönlendirildi.',
      soundType: 'call'
    });
    if (success) {
      setTestFeedback('✅ Test bildirimi telefonunuza gönderildi! Ekranın üstündeki bildirim çekmecesini kontrol edin.');
    } else {
      setTestFeedback('⚠️ Bildirim gönderilemedi. Lütfen bildirim iznini ve tarayıcı ayarlarınızı kontrol edin.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    savePushSettings(settings);
    onSettingsSaved?.(settings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                Web Push & Sistem Bildirimleri
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-800 text-indigo-100 border border-indigo-500">
                  Native
                </span>
              </h3>
              <p className="text-[11px] text-indigo-100">
                Kayan bildirimlerle rampa atamalarını ve çağrıları telefondan/tarayıcıdan anında yakalayın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs custom-scroll flex-1">
          {/* Tarayıcı İzin Durum Kutusu */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              permission === 'granted'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : permission === 'denied'
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {permission === 'granted' ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              <div>
                <span className="font-bold block text-xs">
                  {permission === 'granted'
                    ? 'Tarayıcı Bildirim İzni Aktif'
                    : permission === 'denied'
                    ? 'Bildirim İzni Engellenmiş'
                    : 'Bildirim İzni Bekleniyor'}
                </span>
                <span className="text-[10px] opacity-80 block">
                  {permission === 'granted'
                    ? 'Telefona ve masaüstüne sistem bildirimleri başarıyla gönderilebilir.'
                    : permission === 'denied'
                    ? 'Tarayıcı ayarlarından (kilit simgesi) bildirim iznini açmanız gerekir.'
                    : 'Kayan bildirimleri alabilmek için lütfen izin verin.'}
                </span>
              </div>
            </div>

            {permission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shrink-0 transition cursor-pointer shadow-sm"
              >
                {isRequesting ? 'İsteniyor...' : 'İzin Ver'}
              </button>
            )}
          </div>

          {/* Bildirim Aç/Kapat */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 block text-xs">Sistem Bildirimleri</span>
              <p className="text-[10px] text-slate-500">Uygulama arka plandayken yukarıdan kayan bildirim gösterilsin.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Olay Seçimleri */}
          <div className="space-y-2">
            <span className="font-bold text-slate-700 text-xs block">Bildirim Gönderilecek Durumlar:</span>

            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnRampAssign}
                onChange={(e) => setSettings({ ...settings, notifyOnRampAssign: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <span className="font-bold text-slate-800 block text-xs">Rampa Atamaları</span>
                <span className="text-[10px] text-slate-500">Bir araca rampa tahsis edildiğinde veya değiştirildiğinde</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnAdminCall}
                onChange={(e) => setSettings({ ...settings, notifyOnAdminCall: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <span className="font-bold text-slate-800 block text-xs">Admin & Güvenlik Rampaya Çağrıları</span>
                <span className="text-[10px] text-slate-500">Saha anonsu ve yönlendirme onay çağrısı yapıldığında</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnVehicleEntry}
                onChange={(e) => setSettings({ ...settings, notifyOnVehicleEntry: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <span className="font-bold text-slate-800 block text-xs">Yeni Araç Girişi</span>
                <span className="text-[10px] text-slate-500">Sahaya yeni bir çekici/dorse kabul kaydı yapıldığında</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyOnMention}
                onChange={(e) => setSettings({ ...settings, notifyOnMention: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <div>
                <span className="font-bold text-slate-800 block text-xs">Sohbette @ İle Bahsetmeler</span>
                <span className="text-[10px] text-slate-500">Biri mesajda adınızı (@kullanici_adi) etiketlediğinde</span>
              </div>
            </label>
          </div>

          {/* Test Geri Bildirim Mesajı */}
          {testFeedback && (
            <div className="p-3 rounded-xl bg-slate-900 text-white text-[11px] font-medium leading-relaxed flex items-center gap-2 animate-in fade-in duration-200">
              <span>{testFeedback}</span>
            </div>
          )}

          {/* Test Butonu */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSendTest}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Test Bildirimi Gönder</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Kaydedildi</span>
                  </>
                ) : (
                  <span>Ayarları Kaydet</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
