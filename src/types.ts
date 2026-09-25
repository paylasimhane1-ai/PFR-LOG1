export interface Warehouse {
  id: number;
  ad: string;
  aktif?: boolean;
}

export interface UserPermissions {
  // Araç İşlemleri
  canCreateVehicle: boolean;       // Yeni Araç Kabul & Giriş Kaydı
  canEditVehicle: boolean;         // Araç Bilgilerini Düzenleme & Silme
  canMakeReady: boolean;           // Evrak Durumunu 'EVRAK HAZIR' Yapabilme
  canToggleAcil: boolean;          // Acil Araç Durumu Belirleme

  // Rampa Operasyonları
  canAssignRamp: boolean;          // Araçlara Rampa Atama & Değiştirme
  canReleaseRamp: boolean;         // Rampadan Araç İndirme / Boşaltma
  canManageRampStatus: boolean;    // Rampa Durumu Değiştirme (Boş / Dolu / Bakımda / Arızalı)
  canCallVehicle: boolean;         // Rampaya Araç Çağırma (Anons / Yönlendirme Bildirimi)

  // Güvenlik & Çıkış
  canApproveCall: boolean;         // Güvenlik Yönlendirme / Çağrı Onaylama
  canAuthorizeExit: boolean;       // Sahadan Çıkış Onayı Verme & Çıkış İptali

  // Planlama & Raporlar
  canManageExpected: boolean;      // Beklenen Araçları Yönetme
  canExportReports: boolean;       // Excel ve CSV Rapor İndirebilme
}

export type UserRole = 'admin' | 'personel' | 'security' | 'guest';

export interface User {
  username: string;
  password: string;
  role: UserRole;
  depoId: number;
  permissions?: UserPermissions;
}

export interface Ramp {
  id: number;
  ad: string;
  durum: 'Boş' | 'Dolu' | 'Arızalı' | 'Bakımda';
}

export interface Customer {
  id: string;
  name: string;
  vergiNo?: string;
  yetkili?: string;
  telefon?: string;
  adres?: string;
  notlar?: string;
  olusturmaTarihi?: string;
}

export interface SecurityNote {
  note: string;
  time: string;
  author: string;
}

export interface Vehicle {
  id: number;
  depoId: number;
  cekiciPlaka: string;
  dorsePlaka: string;
  konteynirNo?: string;
  soforAd: string;
  soforTel: string;
  nakliyeFirmasi?: string;
  musteri: string;
  depoTuru: 'Antrepo' | 'Serbest Depo';
  islemTuru: 'Boşaltma' | 'Yükleme' | 'Tahliye';
  aciklama?: string;
  fotograflar: string[];
  isAcik: boolean;
  durum: 'BEKLEMEDE' | 'EVRAK HAZIR' | 'RAMPADA' | 'ÇIKIŞ YAPTI';
  rampaId: number | null;
  isRampayaCagrildi?: boolean;
  cagrildigiRampaId?: number | null;
  girisTarihi: string; // Depoya giriş / kayıt tarihi
  girisTarihiIso: string;
  girisTimestamp: number;
  evrakHazirTimestamp?: number | null;
  rampadaTimestamp?: number | null;
  rampayaGirisTarihi?: string | null; // Rampaya giriş / yanaşma tarihi
  rampadanCikisTarihi?: string | null; // Rampadan çıkış tarihi
  rampadanCikisTimestamp?: number | null;
  cikisTarihi?: string | null; // Tesisten çıkış tarihi
  cikisTimestamp?: number | null;
  guvenlikNotlari?: SecurityNote[];
}

export interface ExpectedVehicle {
  id: number;
  depoId: number;
  cekiciPlaka?: string;
  dorsePlaka: string;
  konteynirNo?: string;
  soforAd?: string;
  soforTel?: string;
  musteri?: string;
  depoTuru?: string;
  islemTuru?: string;
  beklenenTarih?: string;
  durum: 'BEKLENİYOR' | 'GİRİŞ YAPILDI';
  kabulTarihi?: string | null;
}

export interface AppNotification {
  id: number;
  type?: string;
  vehicleId?: number;
  plaka?: string;
  musteri?: string;
  soforAd?: string;
  soforTel?: string;
  rampId?: number;
  rampName?: string;
  text: string;
  time: string;
  status: 'BEKLİYOR' | 'İŞLEM YAPILDI' | 'ONAYLANDI' | 'İPTAL' | 'OKUNDU';
  securityNote?: string;
}

export interface ChatReply {
  id: number;
  sender: string;
  role?: string;
  text: string;
}

export interface ChatMessage {
  id: number;
  sender: string;
  role: string;
  text: string;
  time: string;
  replyTo?: ChatReply | null;
  mentions?: string[];
}

export type WhatsAppProvider = 'webhook' | 'greenapi' | 'ultramsg' | 'twilio' | 'sharelink';

export interface WhatsAppConfig {
  enabled: boolean;
  provider: WhatsAppProvider;
  autoShareOnVehicleAdd: boolean;
  autoShareOnRampAssign: boolean;
  autoShareOnRampCall: boolean;
  groupName?: string;
  groupPhoneOrId?: string; // e.g. 1203630...@g.us or phone number
  webhookUrl?: string; // Custom webhook url (n8n, Make, Zapier, Custom Bot)
  apiKey?: string; // Token / Api key
  instanceId?: string; // GreenAPI / UltraMsg Instance Id
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  alwaysShowPromptModal?: boolean; // Göndermeden Önce Düzeltme & Önizleme Penceresini Aç
  customTemplate?: string; // Özelleştirilmiş mesaj şablonu
}

export interface PushNotificationSettings {
  enabled: boolean;
  notifyOnRampAssign: boolean;
  notifyOnAdminCall: boolean;
  notifyOnVehicleEntry: boolean;
  notifyOnMention: boolean;
}

export type ActiveTab = 'dashboard' | 'beklenen' | 'canli' | 'araclar' | 'rampalar' | 'raporlar';
