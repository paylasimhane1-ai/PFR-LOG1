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
 * Web Share API ile fotoğrafları WhatsApp veya hedef uygulamaya gerçek dosya eki olarak paylaşır
 */
export async function shareViaWebShareWithFiles(options: {
  title: string;
  text: string;
  photos: string[];
  vehiclePlate: string;
}): Promise<{ shared: boolean; method: 'web-share-files' | 'unsupported'; error?: string }> {
  const { title, text, photos, vehiclePlate } = options;

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      const files = await convertPhotosToFiles(photos, `arac_${vehiclePlate}`);
      if (files.length > 0 && typeof navigator.canShare === 'function' && navigator.canShare({ files })) {
        await navigator.share({
          title,
          text,
          files
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

      // Eğer fotoğraf varsa ve URL şeklindeyse ilk fotoğrafı dosya olarak da ilet
      const photoUrls = options.vehicle.fotograflar?.filter(p => p.startsWith('http')) || [];
      if (photoUrls.length > 0) {
        try {
          const sendFileUrl = `https://api.green-api.com/waInstance${config.instanceId}/sendFileByUrl/${config.apiKey}`;
          await fetch(sendFileUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId,
              urlFile: photoUrls[0],
              fileName: `arac_${options.vehicle.dorsePlaka}.jpg`,
              caption: `${options.vehicle.dorsePlaka} Araç Fotoğrafı`
            })
          });
        } catch (photoErr) {
          console.warn('Fotoğraf gönderimi ikincil adımda başarısız oldu:', photoErr);
        }
      }

      return {
        success: true,
        message: 'Green API ile WhatsApp grubuna başarıyla gönderildi',
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

      return {
        success: true,
        message: 'UltraMsg ile WhatsApp grubuna başarıyla gönderildi',
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

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;
      const bodyParams = new URLSearchParams();
      bodyParams.append('To', to);
      bodyParams.append('From', from);
      bodyParams.append('Body', textMessage);

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
