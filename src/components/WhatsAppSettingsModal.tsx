import React, { useState } from 'react';
import { WhatsAppConfig, WhatsAppProvider } from '../types';
import { saveWhatsAppConfig, sendTestWhatsAppMessage, DEFAULT_WHATSAPP_CONFIG } from '../utils/whatsapp';
import { saveWhatsAppSettingsToFirestore } from '../lib/firebase';
import { X, MessageSquare, Check, RefreshCw, AlertCircle, ExternalLink, Send, ShieldCheck, BookOpen, Smartphone, HelpCircle, ArrowRight, Edit3, RotateCcw } from 'lucide-react';

interface WhatsAppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: WhatsAppConfig;
  onConfigSaved: (newConfig: WhatsAppConfig) => void;
}

export const WhatsAppSettingsModal: React.FC<WhatsAppSettingsModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onConfigSaved
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'guide'>('settings');
  const [config, setConfig] = useState<WhatsAppConfig>(currentConfig || DEFAULT_WHATSAPP_CONFIG);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; urlFallback?: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customTestText, setCustomTestText] = useState("ABC Lojistik A.Ş.\nBoşaltma\n34 YMS 999 / 34 TEST 01");

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveWhatsAppConfig(config);
    try {
      await saveWhatsAppSettingsToFirestore(config);
    } catch (err) {
      console.warn('Could not sync WhatsApp settings to Firestore:', err);
    }
    onConfigSaved(config);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await sendTestWhatsAppMessage(config, customTestText);
      setTestResult(res);
      if (res.urlFallback && config.provider === 'sharelink') {
        window.open(res.urlFallback, '_blank');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Test başarısız oldu'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[92vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                WhatsApp Grubu & Business Entegrasyonu
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 border border-emerald-600">
                  Otomatik Bildirim
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100">
                Araç kayıtlarını (Müşteri, İşlem Türü, Plaka, Fotoğraflar) ve rampa yönlendirmelerini gruba iletin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-2.5 px-4 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Bağlantı & Bildirim Ayarları</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-2.5 px-4 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Entegrasyon Rehberi (Nasıl Yapılır?)</span>
          </button>
        </div>

        {activeTab === 'guide' ? (
          /* Entegrasyon Rehberi İçeriği */
          <div className="p-5 overflow-y-auto space-y-4 text-xs custom-scroll flex-1 text-slate-700">
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-900 space-y-2">
              <h4 className="font-bold text-sm flex items-center gap-1.5 text-emerald-800">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                WhatsApp Grubu Nasıl Entegre Edilir?
              </h4>
              <p className="text-xs leading-relaxed text-emerald-800/90">
                Operasyon ekibinizin veya güvenlik/saha amirlerinizin bulunduğu WhatsApp grubuna bildirim göndermenin <strong>2 farklı yöntemi</strong> vardır:
              </p>
            </div>

            {/* Yöntem 1: Sıfır Kurulum, 1 Tıkla Paylaşım */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px]">1</span>
                  Yöntem A: Hızlı 1-Tık Paylaşım (Sıfır Kurulum & Ücretsiz)
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">En Pratik</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Herhangi bir API veya teknik ayar yapmadan kullanabilirsiniz. Araç eklendiğinde veya rampa atandığında ekranda doğrudan <strong>"WhatsApp'ta Paylaş"</strong> butonu çıkar.
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                <li>Yukarıdaki sağlayıcıyı <strong>"Manuel / Hızlı WhatsApp Web Paylaşım Linki"</strong> olarak bırakın.</li>
                <li>Yeni araç eklendiğinde veya rampaya araç yönlendirildiğinde ekranda çıkan <strong>"WhatsApp'ta Paylaş"</strong> butonuna dokunun.</li>
                <li>WhatsApp otomatik açılır; listeden <strong>Operasyon WhatsApp Grubunuzu</strong> seçip Gönder tuşuna basın. Müşteri, işlem türü, plaka ve fotoğraflar anında gruba gider!</li>
              </ol>
            </div>

            {/* Yöntem 2: Arka Planda Tam Otomatik Gönderim (Green API / WhatsApp Business) */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">2</span>
                  Yöntem B: Arka Planda Tam Otomatik Bot Gönderimi (Green API)
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Tam Otomatik</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Kullanıcı hiçbir şeye basmadan, araç kaydedildiği saniyede arka planda operasyon grubuna mesaj gönderilmesini sağlar.
              </p>
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700">
                <div className="font-semibold text-slate-800">Adım Adım Kurulum:</div>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 shrink-0">1.</span>
                    <span><strong>green-api.com</strong> sitesine gidin ve ücretsiz bir hesap oluşturun.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 shrink-0">2.</span>
                    <span>Green API panelinde çıkan <strong>QR Kodu</strong>, şirket/operasyon WhatsApp veya WhatsApp Business telefonunuzla taratın (tıpkı WhatsApp Web'e bağlanır gibi).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 shrink-0">3.</span>
                    <span>Panelden <strong>idInstance</strong> ve <strong>apiTokenInstance</strong> anahtarlarını kopyalayın.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 shrink-0">4.</span>
                    <span>Hedef WhatsApp grubunun ID'sini alın (Örn: <code>120363023456789012@g.us</code>). Bu ID'yi Green API panelindeki 'Chats' bölümünden görebilirsiniz.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 shrink-0">5.</span>
                    <span>Bu bilgileri sistemimizdeki ayarlar sekmesinde ilgili kutulara yapıştırıp <strong>"Ayarları Kaydet"</strong>e basın.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Yöntem 3: Webhook (Zapier, Make, n8n) */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
              <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-[11px]">3</span>
                Yöntem C: Webhook (Make.com / Zapier / n8n)
              </span>
              <p className="text-slate-600 leading-relaxed">
                Kurumsal WhatsApp Cloud API hesabınız varsa; Make.com veya Zapier üzerinde bir <strong>Webhook URL</strong> oluşturup buraya yapıştırabilirsiniz. Sistem her araç kabulünde JSON formatında plaka, müşteri, işlem ve fotoğraf verilerini bu adrese iletir.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Ayarlar Sekmesine Dön</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Normal Ayarlar Formu */
          <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs custom-scroll flex-1">
            {/* Ana Etkinleştirme Anahtarı */}
            <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 text-sm block">WhatsApp Otomatik Bildirimi</span>
                <p className="text-slate-500 text-[11px]">
                  Etkinleştirildiğinde, seçilen operasyon olaylarında mesajlar otomatik olarak WhatsApp grubuna aktarılır.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Otomatik Tetikleyiciler */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Otomatik Bildirim Tetikleyicileri
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoShareOnVehicleAdd}
                    onChange={(e) => setConfig({ ...config, autoShareOnVehicleAdd: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">Yeni Araç Girişinde</span>
                    <span className="text-[10px] text-slate-500">Müşteri, işlem türü, araç plakası ve fotoğraflar</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoShareOnRampAssign}
                    onChange={(e) => setConfig({ ...config, autoShareOnRampAssign: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">Rampa Yönlendirmesinde</span>
                    <span className="text-[10px] text-slate-500">"Şu araç rampaya yönlendirildi" mesajı</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 cursor-pointer sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={config.alwaysShowPromptModal ?? true}
                    onChange={(e) => setConfig({ ...config, alwaysShowPromptModal: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-emerald-950 block text-xs">Göndermeden Önce Düzeltme & Önizleme Penceresini Aç</span>
                    <span className="text-[10px] text-emerald-700">Mesajı göndermeden önce ekranda gösterip metni dilediğiniz gibi düzeltmenize imkan tanır.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Entegrasyon Sağlayıcısı Seçimi */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="block">
                <span className="font-bold text-slate-700 block mb-1">WhatsApp API / Entegrasyon Yöntemi</span>
                <select
                  value={config.provider}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value as WhatsAppProvider })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                >
                  <option value="sharelink">Manuel / Hızlı 1-Tık Paylaşım Linki (Sıfır Kurulum - Ücretsiz)</option>
                  <option value="greenapi">Green API (WhatsApp Business Gateway - Arka Planda Otomatik)</option>
                  <option value="webhook">Webhook URL (Make.com, Zapier, n8n, Özel Bot)</option>
                  <option value="ultramsg">UltraMsg API</option>
                  <option value="twilio">Twilio WhatsApp API</option>
                </select>
              </label>

              {/* Grup Adı ve Alıcı ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                    Grup veya Kanal Adı (Görüntüleme için)
                  </label>
                  <input
                    type="text"
                    value={config.groupName || ''}
                    onChange={(e) => setConfig({ ...config, groupName: e.target.value })}
                    placeholder="Örn: Saha & Rampa Operasyon Grubu"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                    WhatsApp Grup ID veya Telefon Numarası
                  </label>
                  <input
                    type="text"
                    value={config.groupPhoneOrId || ''}
                    onChange={(e) => setConfig({ ...config, groupPhoneOrId: e.target.value })}
                    placeholder="Örn: 120363023456789012@g.us veya 905551234567"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    WhatsApp grupları genelde <code>...g.us</code> ile biter.
                  </span>
                </div>
              </div>

              {/* Sağlayıcıya Özel Alanlar */}
              {config.provider === 'webhook' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block">
                    <span className="font-semibold text-slate-700 block mb-1 text-[11px]">
                      Webhook / Bot URL Endpoint'i *
                    </span>
                    <input
                      type="url"
                      value={config.webhookUrl || ''}
                      onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                      placeholder="https://hooks.zapier.com/... veya https://hook.eu1.make.com/..."
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-slate-700 block mb-1 text-[11px]">
                      Bearer Token / Güvenlik Anahtarı (İsteğe Bağlı)
                    </span>
                    <input
                      type="password"
                      value={config.apiKey || ''}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="Gizli webhook token'ı"
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                  </label>
                </div>
              )}

              {(config.provider === 'greenapi' || config.provider === 'ultramsg') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                      Instance ID *
                    </label>
                    <input
                      type="text"
                      value={config.instanceId || ''}
                      onChange={(e) => setConfig({ ...config, instanceId: e.target.value })}
                      placeholder="Örn: 1101823456"
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                      API Token / Key *
                    </label>
                    <input
                      type="password"
                      value={config.apiKey || ''}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="Gizli API Token"
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {config.provider === 'twilio' && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                        Twilio Account SID *
                      </label>
                      <input
                        type="text"
                        value={config.twilioAccountSid || ''}
                        onChange={(e) => setConfig({ ...config, twilioAccountSid: e.target.value })}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                        Twilio Auth Token *
                      </label>
                      <input
                        type="password"
                        value={config.twilioAuthToken || ''}
                        onChange={(e) => setConfig({ ...config, twilioAuthToken: e.target.value })}
                        placeholder="Auth Token"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                      Twilio WhatsApp From Numarası
                    </label>
                    <input
                      type="text"
                      value={config.twilioFromNumber || 'whatsapp:+14155238886'}
                      onChange={(e) => setConfig({ ...config, twilioFromNumber: e.target.value })}
                      placeholder="whatsapp:+14155238886"
                      className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test Sonuç Kutusu */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <span className="font-bold block">
                    {testResult.success ? 'Bağlantı Başarılı!' : 'Bağlantı Hatası'}
                  </span>
                  <p className="text-[11px] mt-0.5">{testResult.message}</p>
                  {testResult.urlFallback && (
                    <a
                      href={testResult.urlFallback}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-1 font-semibold"
                    >
                      <span>Doğrudan WhatsApp'ta Açarak Gör</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Gruba İletilen Standart Mesaj Formatı (Başlıklar kaldırılmış temiz format) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 block">Gruba İletilen Standart Mesaj Formatı:</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-semibold">Başlıksız Sade Değerler</span>
              </div>
              <pre className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] font-mono overflow-x-auto text-slate-800 leading-relaxed font-semibold">
{`ABC Lojistik A.Ş.
Boşaltma
34 YMS 999 / 34 TEST 01`}
              </pre>
              <p className="text-[10px] text-slate-500">
                Mesajlar başlık olmadan doğrudan <strong>Firma</strong>, <strong>İşlem Türü</strong> ve <strong>Araç Plakası</strong> satırlarıyla iletilir. Fotoğraflar ise doğrudan dosya/medya eki olarak WhatsApp'a eklenir.
              </p>
            </div>

            {/* Canlı Mesaj Düzenleme & Test Alanı */}
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                  Örnek Mesajı Düzelt ve Test Et
                </span>
                <button
                  type="button"
                  onClick={() => setCustomTestText("ABC Lojistik A.Ş.\nBoşaltma\n34 YMS 999 / 34 TEST 01")}
                  className="text-[10px] text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Varsayılana Dön</span>
                </button>
              </div>
              <textarea
                value={customTestText}
                onChange={(e) => setCustomTestText(e.target.value)}
                rows={3}
                className="w-full bg-white border border-emerald-300 rounded-lg p-2.5 text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
                placeholder="Örnek mesaj metnini burada düzenleyebilirsiniz..."
              />
              <p className="text-[10px] text-emerald-800">
                Aşağıdaki "Bağlantıyı Test Et" butonuna bastığınızda bu kutucuktaki güncel metin gönderilecektir.
              </p>
            </div>

            {/* Alt Butonlar */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}</span>
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Kaydedildi</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Ayarları Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
