import React, { useState } from 'react';
import { Vehicle } from '../types';
import {
  formatVehicleWhatsAppMessage,
  getWhatsAppDirectShareUrl,
  FormatVehicleMessageOptions,
  shareViaWebShareWithFiles,
  convertPhotosToFiles
} from '../utils/whatsapp';
import { MessageSquare, ExternalLink, Copy, Check, X, Camera, ArrowRight, ShieldCheck, Paperclip, Download } from 'lucide-react';

interface WhatsAppSharePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: FormatVehicleMessageOptions | null;
  apiSuccess?: boolean;
  apiMessage?: string;
}

export const WhatsAppSharePromptModal: React.FC<WhatsAppSharePromptModalProps> = ({
  isOpen,
  onClose,
  options,
  apiSuccess,
  apiMessage
}) => {
  const [copied, setCopied] = useState(false);
  const [isSharingFiles, setIsSharingFiles] = useState(false);

  if (!isOpen || !options) return null;

  const { vehicle, rampName, eventType } = options;
  const messageText = formatVehicleWhatsAppMessage(options);
  const shareUrl = getWhatsAppDirectShareUrl(messageText);
  const photos = vehicle.fotograflar || [];

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenWhatsAppText = () => {
    window.open(shareUrl, '_blank');
  };

  const handleShareWithAttachments = async () => {
    setIsSharingFiles(true);
    try {
      if (photos.length > 0) {
        const res = await shareViaWebShareWithFiles({
          title: `${vehicle.dorsePlaka} Araç Bilgisi`,
          text: messageText,
          photos,
          vehiclePlate: vehicle.dorsePlaka
        });

        if (res.shared) {
          onClose();
          return;
        }
      }
      // Desteklenmiyorsa standart link ile aç
      window.open(shareUrl, '_blank');
    } catch (err) {
      console.warn('Dosya eki paylaşımı başarısız:', err);
      window.open(shareUrl, '_blank');
    } finally {
      setIsSharingFiles(false);
    }
  };

  const handleDownloadPhotos = async () => {
    const files = await convertPhotosToFiles(photos, `arac_${vehicle.dorsePlaka}`);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const titleText =
    eventType === 'ramp_assigned'
      ? '🚪 Rampa Ataması WhatsApp Bildirimi'
      : eventType === 'ramp_called'
      ? '📢 Rampaya Çağrı WhatsApp Bildirimi'
      : '🚛 Yeni Araç Kabul WhatsApp Bildirimi';

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-600 px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">{titleText}</h3>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                {eventType === 'ramp_assigned'
                  ? `${vehicle.dorsePlaka} aracı ${rampName || 'Rampaya'} yönlendirildi.`
                  : `${vehicle.dorsePlaka} - ${vehicle.musteri} sisteme işlendi.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700/60 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto custom-scroll flex-1">
          {/* API Status Badge if exists */}
          {apiMessage && (
            <div
              className={`p-3 rounded-2xl flex items-center gap-2.5 border text-xs ${
                apiSuccess
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{apiMessage}</span>
            </div>
          )}

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Müşteri</span>
              <span className="font-bold text-slate-800 truncate block text-xs">{vehicle.musteri || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">İşlem Türü</span>
              <span className="font-bold text-blue-600 block text-xs">{vehicle.islemTuru}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Araç Plakası</span>
              <span className="font-black text-slate-900 block text-xs font-mono">{vehicle.dorsePlaka}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                {eventType === 'ramp_assigned' ? 'Yönlendirilen Rampa' : 'Ek Fotoğraflar'}
              </span>
              <span className="font-bold text-emerald-700 block text-xs">
                {eventType === 'ramp_assigned'
                  ? rampName || 'Rampa'
                  : photos.length > 0
                  ? `📎 ${photos.length} Adet Fotoğraf Ekte`
                  : 'Fotoğraf Yok'}
              </span>
            </div>
          </div>

          {/* Fotoğraf Eki Küçük Önizleme (Varsa) */}
          {photos.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-700" />
                  Eklenecek Fotoğraflar ({photos.length} Adet)
                </span>
                <button
                  type="button"
                  onClick={handleDownloadPhotos}
                  className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-300"
                >
                  <Download className="w-3 h-3" />
                  <span>İndir</span>
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 custom-scroll">
                {photos.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-emerald-300 shrink-0 shadow-xs">
                    <img src={p} alt={`Fotoğraf ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] font-mono px-1 rounded-tl">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-emerald-800">
                ✅ Fotoğraflar bağlantı olarak değil, doğrudan <strong>dosya/medya eki</strong> olarak iletilir.
              </p>
            </div>
          )}

          {/* WhatsApp Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-bold text-slate-600">WhatsApp Mesaj Metni Önizleme:</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Kopyalandı!' : 'Metni Kopyala'}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto custom-scroll border border-slate-800 selection:bg-emerald-600">
              {messageText}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer order-2 sm:order-1"
          >
            Kapat
          </button>

          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 order-1 sm:order-2 justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
              <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
            </button>

            {photos.length > 0 ? (
              <button
                type="button"
                onClick={handleShareWithAttachments}
                disabled={isSharingFiles}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                <Paperclip className="w-4 h-4" />
                <span>{isSharingFiles ? 'Hazırlanıyor...' : 'Fotoğrafları Ek Olarak Paylaş'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenWhatsAppText}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp'ta Paylaş</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
