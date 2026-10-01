import { Vehicle, WhatsAppConfig } from '../types';

export const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  enabled: true,
  provider: 'sharelink',
  autoShareOnVehicleAdd: true,
  autoShareOnRampAssign: true,
  autoShareOnRampCall: true,
  alwaysShowPromptModal: true,
  groupName: 'Lojistik Depo Operasyon',
  groupPhoneOrId: '',
  webhookUrl: '',
  apiKey: '',
  instanceId: '',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioFromNumber: 'whatsapp:+14155238886'
};

const STORAGE_KEY = 'yms_whatsapp_config';

export function loadWhatsAppConfig(): WhatsAppConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_WHATSAPP_CONFIG, ...JSON.parse(saved) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_WHATSAPP_CONFIG;
}

export function saveWhatsAppConfig(config: WhatsAppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export interface FormatVehicleMessageOptions {
  vehicle: Vehicle;
  rampName?: string;
  eventType: 'vehicle_added' | 'ramp_assigned' | 'ramp_called' | 'manual_share';
  warehouseName?: string;
  customText?: string;
}

/**
 * Kullanıcı isteğine uygun: Başlıksız (Müşteri:, İşlem Türü:, Plaka: vb. etiketler olmadan),
 * doğrudan değerleri içeren (Firma, İşlem, Plaka) sade ve net WhatsApp mesaj formatı
 */
export function formatVehicleWhatsAppMessage(options: FormatVehicleMessageOptions): string {
  if (options.customText !== undefined && options.customText.trim() !== '') {
    return options.customText;
  }

  const { vehicle, rampName, eventType } = options;

  // 1. Rampa Ataması Bildirimi
  if (eventType === 'ramp_assigned') {
    const lines = [
      vehicle.musteri || '',
      vehicle.islemTuru || '',
      `${vehicle.dorsePlaka} -> ${rampName || 'Rampa'}`
    ].filter(Boolean);
    return lines.join('\n');
  }

  // 2. Rampaya Çağrı Bildirimi
  if (eventType === 'ramp_called') {
    const lines = [
      vehicle.musteri || '',
      vehicle.islemTuru || '',
      `📢 ${vehicle.dorsePlaka} (${rampName || 'Rampa'})`
    ].filter(Boolean);
    return lines.join('\n');
  }

  // 3. Araç Kaydı Bildirimi (Başlıklar kaldırıldı: SADECE Firma, İşlem Türü ve Plaka)
  const plateText = vehicle.cekiciPlaka 
    ? `${vehicle.dorsePlaka} / ${vehicle.cekiciPlaka}` 
    : vehicle.dorsePlaka;

  const lines: string[] = [
    vehicle.musteri || '',
    vehicle.islemTuru || '',
    plateText,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Base64 veya URL fotoğrafları WhatsApp'a dosya eki olarak göndermek için File nesnelerine çevirir
 */
export async function convertPhotosToFiles(photos: string[], baseName: string = 'arac_foto'): Promise<File[]> {
  const files: File[] = [];
  if (!photos || photos.length === 0) return files;

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    try {
      if (photo.startsWith('data:')) {
        const arr = photo.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const ext = mime.split('/')[1] || 'jpg';
        const file = new File([u8arr], `${baseName}_${i + 1}.${ext}`, { type: mime });
        files.push(file);
      } else if (photo.startsWith('http')) {
        const res = await fetch(photo);
        const blob = await res.blob();
        const ext = blob.type.split('/')[1] || 'jpg';
        const file = new File([blob], `${baseName}_${i + 1}.${ext}`, { type: blob.type || 'image/jpeg' });
        files.push(file);
      }
    } catch (err) {
      console.warn('Fotoğraf File nesnesine dönüştürülemedi:', err);
    }
  }

  return files;
}

/**
 * iOS (iPhone / iPad) cihaz tespit fonksiyonu
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Birden fazla fotoğrafı tek bir görsel kolajında birleştirir.
 * WhatsApp iOS'ta birden fazla fotoğraf aynı anda paylaşıldığında açıklamayı (caption) fotoğraflardan ayırdığı veya
 * metni sildiği için, fotoğrafları tek bir şık görselde birleştirmek, açıklamanın görselin altına TEK BİR MESAJDA iliştirilmesini garanti eder.
 */
export async function mergePhotosIntoSingleImage(
  photos: string[],
  baseName: string = 'arac_gorsel'
): Promise<File | null> {
  if (!photos || photos.length === 0) return null;
  if (photos.length === 1) {
    const files = await convertPhotosToFiles(photos, baseName);
    return files[0] || null;
  }

  try {
    const loadedImages = await Promise.all(
      photos.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Görsel yüklenemedi'));
            img.src = src;
          })
      )
    );

    const count = loadedImages.length;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (count === 2) {
      // 2 fotoğraf: Yan yana (1200 x 675)
      const canvasW = 1200;
      const canvasH = 675;
      canvas.width = canvasW;
      canvas.height = canvasH;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvasW, canvasH);

      const colW = (canvasW - 8) / 2;
      loadedImages.forEach((img, idx) => {
        const x = idx * (colW + 8);
        const imgAspect = img.width / img.height;
        const targetAspect = colW / canvasH;
        let sW = img.width;
        let sH = img.height;
        let sX = 0;
        let sY = 0;
        if (imgAspect > targetAspect) {
          sW = img.height * targetAspect;
          sX = (img.width - sW) / 2;
        } else {
          sH = img.width / targetAspect;
          sY = (img.height - sH) / 2;
        }
        ctx.drawImage(img, sX, sY, sW, sH, x, 0, colW, canvasH);
      });
    } else {
      // 3 veya 4 fotoğraf: 2x2 grid (1200 x 1200)
      const canvasW = 1200;
      const canvasH = 1200;
      canvas.width = canvasW;
      canvas.height = canvasH;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvasW, canvasH);

      const cellW = (canvasW - 8) / 2;
      const cellH = (canvasH - 8) / 2;
      loadedImages.slice(0, 4).forEach((img, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = col * (cellW + 8);
        const y = row * (cellH + 8);

        const imgAspect = img.width / img.height;
        const targetAspect = cellW / cellH;
        let sW = img.width;
        let sH = img.height;
        let sX = 0;
        let sY = 0;
        if (imgAspect > targetAspect) {
          sW = img.height * targetAspect;
          sX = (img.width - sW) / 2;
        } else {
          sH = img.width / targetAspect;
          sY = (img.height - sH) / 2;
        }
        ctx.drawImage(img, sX, sY, sW, sH, x, y, cellW, cellH);
      });
    }

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, 'image/jpeg', 0.9)
    );
    if (!blob) return null;

    return new File([blob], `${baseName}_tek_kolaj.jpg`, { type: 'image/jpeg' });
  } catch (err) {
    console.warn('Fotoğraflar birleştirilemedi, ilk görsel kullanılacak:', err);
    const files = await convertPhotosToFiles(photos.slice(0, 1), baseName);
    return files[0] || null;
  }
}

/**
 * Web Share API ile fotoğrafları WhatsApp veya hedef uygulamaya gerçek dosya eki olarak paylaşır
 */
export async function shareViaWebShareWithFiles(options: {
  title: string;
  text: string;
  photos: string[];
  vehiclePlate: string;
  mergePhotos?: boolean;
}): Promise<{ shared: boolean; method: 'web-share-files' | 'unsupported'; error?: string }> {
  const { title, text, photos, vehiclePlate, mergePhotos } = options;

  // Özellikle iPhone'larda WhatsApp metni veya fotoğrafları ayırabildiği için,
  // paylaşım öncesi metni panoya da her ihtimale karşı kopyalıyoruz
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      let filesToShare: File[] = [];
      if (mergePhotos && photos.length > 1) {
        const mergedFile = await mergePhotosIntoSingleImage(photos, `arac_${vehiclePlate}`);
        if (mergedFile) {
          filesToShare = [mergedFile];
        } else {
          filesToShare = await convertPhotosToFiles(photos, `arac_${vehiclePlate}`);
        }
      } else {
        filesToShare = await convertPhotosToFiles(photos, `arac_${vehiclePlate}`);
      }

      if (filesToShare.length > 0 && typeof navigator.canShare === 'function' && navigator.canShare({ files: filesToShare })) {
        await navigator.share({
          title,
          text,
          files: filesToShare
        });
        return { shared: true, method: 'web-share-files' };
      } else if (typeof navigator.canShare === 'function' && navigator.canShare({ text })) {
        await navigator.share({
          title,
          text
        });
        return { shared: true, method: 'web-share-files' };
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        return { shared: false, method: 'unsupported', error: err.message };
      }
      return { shared: false, method: 'unsupported' };
    }
  }

  return { shared: false, method: 'unsupported' };
}

/**
 * Masaüstü tarayıcılarda fotoğrafı doğrudan sistem panosuna kopyalar (Ctrl+V ile WhatsApp'a yapıştırmak için)
 */
export async function copyPhotoToClipboard(photoDataUrlOrHttp: string): Promise<boolean> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = photoDataUrlOrHttp;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    if (blob && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    }
  } catch (err) {
    console.warn('Panoya fotoğraf kopyalama desteklenmiyor veya engellendi:', err);
  }
  return false;
}

/**
 * Doğrudan WhatsApp Paylaşım Linki Üretir (wa.me / web.whatsapp.com)
 */
export function getWhatsAppDirectShareUrl(messageText: string, phoneOrGroup?: string): string {
  const encoded = encodeURIComponent(messageText);
  if (phoneOrGroup && /^\+?[0-9]{10,15}$/.test(phoneOrGroup.replace(/[\s\-\(\)]/g, ''))) {
    const cleanNumber = phoneOrGroup.replace(/[^0-9]/g, '');
    return `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encoded}`;
  }
  return `https://api.whatsapp.com/send?text=${encoded}`;
}

export interface WhatsAppSendResult {
  success: boolean;
  message: string;
  urlFallback?: string;
}

/**
 * WhatsApp Grubuna API veya Webhook Üzerinden Mesaj İletir
 */
export async function sendVehicleToWhatsAppGroup(
  options: FormatVehicleMessageOptions,
  customConfig?: WhatsAppConfig
): Promise<WhatsAppSendResult> {
  const config = customConfig || loadWhatsAppConfig();
  const textMessage = formatVehicleWhatsAppMessage(options);
  const fallbackUrl = getWhatsAppDirectShareUrl(textMessage, config.groupPhoneOrId);

  // Otomatik paylaşım kapalıysa ve manuel tetiklenmediyse çık
  if (!config.enabled && options.eventType !== 'manual_share') {
    return { success: false, message: 'WhatsApp entegrasyonu pasif', urlFallback: fallbackUrl };
  }

  try {
    // 1. Webhook (Zapier, Make, n8n, Custom Bot, Node.js proxy)
    if (config.provider === 'webhook') {
      if (!config.webhookUrl) {
        return { success: false, message: 'Webhook URL adresi tanımlanmamış', urlFallback: fallbackUrl };
      }

      const payload = {
        event: options.eventType,
        title: options.eventType === 'ramp_assigned' ? 'Rampa Ataması' : 'Yeni Araç Girişi',
        text: textMessage,
        group: config.groupName || 'Depo Grubu',
        targetChatId: config.groupPhoneOrId || undefined,
        warehouse: options.warehouseName || 'Ana Depo',
        vehicle: {
          id: options.vehicle.id,
          dorsePlaka: options.vehicle.dorsePlaka,
          cekiciPlaka: options.vehicle.cekiciPlaka,
          musteri: options.vehicle.musteri,
          islemTuru: options.vehicle.islemTuru,
          depoTuru: options.vehicle.depoTuru,
          soforAd: options.vehicle.soforAd,
          soforTel: options.vehicle.soforTel,
          durum: options.vehicle.durum,
          fotograflar: options.vehicle.fotograflar
        },
        rampName: options.rampName,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook yanıt kodu: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        message: 'WhatsApp webhook botuna başarıyla iletildi',
        urlFallback: fallbackUrl
      };
    }

    // 2. Green API (WhatsApp Business API Gateway)
    if (config.provider === 'greenapi') {
      if (!config.instanceId || !config.apiKey || !config.groupPhoneOrId) {
        return {
          success: false,
          message: 'Green API için Instance ID, API Token ve Grup/Numara ID gereklidir',
          urlFallback: fallbackUrl
        };
      }

      // Green API grup formatı: ...@g.us veya tekil numara ...@c.us
      let chatId = config.groupPhoneOrId.trim();
      if (!chatId.includes('@')) {
        chatId = chatId.length > 15 ? `${chatId}@g.us` : `${chatId.replace(/[^0-9]/g, '')}@c.us`;
      }

      const photos = options.vehicle.fotograflar || [];
      const firstPhoto = photos.length > 0 ? photos[0] : null;

      // Kullanıcı talebi: Fotoğraf varsa araç bilgileri ayrı bir mesaj olarak değil, fotoğrafın açıklaması (caption) olarak gönderilir
      if (firstPhoto) {
        if (firstPhoto.startsWith('data:')) {
          // Base64 fotoğraf: Green API sendFileByUpload ile doğrudan multipart form olarak gönderilir
          const base64Data = firstPhoto.split(',')[1] || '';
          const mime = firstPhoto.split(';')[0]?.split(':')[1] || 'image/jpeg';
          const byteChars = atob(base64Data);
          const byteNumbers = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          const blob = new Blob([byteNumbers], { type: mime });
          const formData = new FormData();
          formData.append('chatId', chatId);
          formData.append('file', blob, `arac_${options.vehicle.dorsePlaka}.jpg`);
          formData.append('fileName', `arac_${options.vehicle.dorsePlaka}.jpg`);
          formData.append('caption', textMessage);

          const sendUploadUrl = `https://api.green-api.com/waInstance${config.instanceId}/sendFileByUpload/${config.apiKey}`;
          const response = await fetch(sendUploadUrl, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Green API Hatası (${response.status}): ${errorData}`);
          }
        } else {
          // HTTP URL fotoğraf: Green API sendFileByUrl ile doğrudan url üzerinden iletilir
          const sendFileUrl = `https://api.green-api.com/waInstance${config.instanceId}/sendFileByUrl/${config.apiKey}`;
          const response = await fetch(sendFileUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId,
              urlFile: firstPhoto,
              fileName: `arac_${options.vehicle.dorsePlaka}.jpg`,
              caption: textMessage // Bilgiler fotoğrafın altına açıklama olarak eklenir
            })
          });

          if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Green API Hatası (${response.status}): ${errorData}`);
          }
        }
      } else {
        // Fotoğraf yoksa sadece metin mesajı ilet
        const greenApiUrl = `https://api.green-api.com/waInstance${config.instanceId}/sendMessage/${config.apiKey}`;
        const response = await fetch(greenApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId,
            message: textMessage
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Green API Hatası (${response.status}): ${errorData}`);
        }
      }

      return {
        success: true,
        message: firstPhoto
          ? 'Green API ile fotoğraf ve açıklaması WhatsApp grubuna başarıyla gönderildi'
          : 'Green API ile WhatsApp grubuna başarıyla gönderildi',
        urlFallback: fallbackUrl
      };
    }

    // 3. UltraMsg API
    if (config.provider === 'ultramsg') {
      if (!config.instanceId || !config.apiKey || !config.groupPhoneOrId) {
        return {
          success: false,
          message: 'UltraMsg için Instance ID, Token ve Hedef Grup ID gereklidir',
          urlFallback: fallbackUrl
        };
      }

      const photos = options.vehicle.fotograflar || [];
      const firstPhoto = photos.length > 0 ? photos[0] : null;

      if (firstPhoto) {
        // Fotoğraflı gönderim: Bilgiler fotoğraf açıklaması (caption) olarak tek parça iletilir (HTTP URL veya Data URL base64)
        const ultraMsgUrl = `https://api.ultramsg.com/${config.instanceId}/messages/image`;
        const params = new URLSearchParams();
        params.append('token', config.apiKey);
        params.append('to', config.groupPhoneOrId.trim());
        params.append('image', firstPhoto);
        params.append('caption', textMessage);

        const response = await fetch(ultraMsgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`UltraMsg Hatası: ${errText}`);
        }
      } else {
        const ultraMsgUrl = `https://api.ultramsg.com/${config.instanceId}/messages/chat`;
        const params = new URLSearchParams();
        params.append('token', config.apiKey);
        params.append('to', config.groupPhoneOrId.trim());
        params.append('body', textMessage);

        const response = await fetch(ultraMsgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`UltraMsg Hatası: ${errText}`);
        }
      }

      return {
        success: true,
        message: firstPhoto
          ? 'UltraMsg ile fotoğraf ve açıklaması WhatsApp grubuna başarıyla gönderildi'
          : 'UltraMsg ile WhatsApp grubuna başarıyla gönderildi',
        urlFallback: fallbackUrl
      };
    }

    // 4. Twilio WhatsApp API
    if (config.provider === 'twilio') {
      if (!config.twilioAccountSid || !config.twilioAuthToken || !config.groupPhoneOrId) {
        return {
          success: false,
          message: 'Twilio Account SID, Auth Token ve Alıcı Grup/Numara gereklidir',
          urlFallback: fallbackUrl
        };
      }

      const to = config.groupPhoneOrId.startsWith('whatsapp:')
        ? config.groupPhoneOrId
        : `whatsapp:${config.groupPhoneOrId}`;
      const from = config.twilioFromNumber || 'whatsapp:+14155238886';

      const photoUrls = options.vehicle.fotograflar?.filter(p => p.startsWith('http')) || [];

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;
      const bodyParams = new URLSearchParams();
      bodyParams.append('To', to);
      bodyParams.append('From', from);
      bodyParams.append('Body', textMessage); // Twilio'da MediaUrl ile Body birlikte gidince fotoğraf açıklaması olur
      if (photoUrls.length > 0) {
        bodyParams.append('MediaUrl', photoUrls[0]);
      }

      const credentials = btoa(`${config.twilioAccountSid}:${config.twilioAuthToken}`);
      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`Twilio Hatası: ${errData}`);
      }

      return {
        success: true,
        message: 'Twilio üzerinden WhatsApp grubuna mesaj iletildi',
        urlFallback: fallbackUrl
      };
    }

    // 5. Doğrudan Paylaşım Linki (sharelink)
    return {
      success: true,
      message: 'WhatsApp paylaşım linki hazırlandı',
      urlFallback: fallbackUrl
    };
  } catch (err: any) {
    console.error('WhatsApp API gönderim hatası:', err);
    return {
      success: false,
      message: `WhatsApp API Hatası: ${err.message || 'Bilinmeyen hata'}`,
      urlFallback: fallbackUrl
    };
  }
}

/**
 * WhatsApp Bağlantısını Test Eder
 */
export async function sendTestWhatsAppMessage(config: WhatsAppConfig, customText?: string): Promise<WhatsAppSendResult> {
  const dummyVehicle: Vehicle = {
    id: 9999,
    depoId: 1,
    cekiciPlaka: '34 TEST 01',
    dorsePlaka: '34 YMS 999',
    konteynirNo: 'TEST-123456',
    soforAd: 'Test Şoför',
    soforTel: '0555 123 45 67',
    musteri: 'ABC Lojistik A.Ş.',
    depoTuru: 'Antrepo',
    islemTuru: 'Boşaltma',
    aciklama: 'Bu bir sistem WhatsApp entegrasyonu bağlantı test mesajıdır.',
    fotograflar: [],
    isAcik: false,
    durum: 'EVRAK HAZIR',
    rampaId: 1,
    girisTarihi: new Date().toLocaleString('tr-TR'),
    girisTarihiIso: new Date().toISOString(),
    girisTimestamp: Date.now()
  };

  return sendVehicleToWhatsAppGroup(
    {
      vehicle: dummyVehicle,
      rampName: 'Rampa 1 (Test)',
      eventType: 'manual_share',
      warehouseName: 'Ana Depo (Test)',
      customText: customText
    },
    config
  );
}
