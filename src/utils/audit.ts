import * as XLSX from 'xlsx';
import type {
  AuditCategory,
  AuditChangeItem,
  AuditLog,
  AuditSeverity,
  ChatGroup,
  Customer,
  ExpectedVehicle,
  SlaSettings,
  User,
  UserRole,
  Vehicle,
  Warehouse,
  WhatsAppConfig
} from '../types';
import { PERMISSIONS_LIST, getDefaultPermissionsForRole } from './permissions';
import { WHATSAPP_SECRET_FIELDS } from './whatsapp';

let auditSeqCounter = 0;

export function generateAuditId(): number {
  auditSeqCounter = (auditSeqCounter + 1) % 100;
  return Date.now() * 100 + auditSeqCounter;
}

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  vehicle: 'Araç Operasyonları',
  ramp: 'Rampa Yönetimi',
  expected: 'Beklenen Araçlar',
  security: 'Güvenlik & Bildirim',
  auth: 'Oturum & Giriş',
  user: 'Kullanıcı & Yetki',
  warehouse: 'Depo & Saha',
  customer: 'Firma / Müşteri',
  settings: 'Sistem Ayarları',
  chat: 'Sohbet Grupları',
  export: 'Rapor & Aktarım',
  audit: 'Denetim & Arşiv'
};

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  info: 'Bilgi',
  warning: 'Uyarı',
  critical: 'Kritik'
};

export const AUDIT_ROLE_LABELS: Record<UserRole | 'system', string> = {
  admin: 'Admin',
  personel: 'Personel',
  security: 'Güvenlik',
  guest: 'Misafir',
  system: 'Sistem'
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  VEHICLE_CREATE: 'Yeni Araç Girişi',
  VEHICLE_EDIT: 'Araç Bilgi Güncelleme',
  VEHICLE_DELETE: 'Araç Kaydı Silme',
  STATUS_CHANGE: 'Araç Durum Değişikliği',
  BULK_MAKE_READY: 'Toplu Evrak Hazır Onayı',
  RAMP_ASSIGN: 'Rampa Atama / Taşıma',
  RAMP_RELEASE: 'Rampadan İndirme',
  VEHICLE_EXIT: 'Sahadan Çıkış Onayı',
  EXIT_UNDO: 'Çıkış İptali (Geri Alma)',
  ACIL_TOGGLE: 'Acil Öncelik Değişikliği',
  RAMP_CALL: 'Rampaya Araç Çağrısı',
  RAMP_CALL_CANCEL: 'Rampa Çağrısı İptali',
  EXPECTED_CREATE: 'Beklenen Araç Ekleme',
  EXPECTED_EDIT: 'Beklenen Araç Düzenleme',
  EXPECTED_ADMIT: 'Beklenen Aracı Sahaya Kabul',
  EXPECTED_DELETE: 'Beklenen Araç Silme',
  EXPECTED_IMPORT: 'Excel ile Beklenen Aktarım',
  RAMP_STATUS_CHANGE: 'Rampa Durum Güncelleme',
  RAMP_CREATE: 'Yeni Rampa Tanımlama',
  RAMP_SEED: 'Toplu Rampa Oluşturma',
  RAMP_RENAME: 'Rampa Yeniden Adlandırma',
  RAMP_DELETE: 'Rampa Silme',
  SECURITY_ORIENT: 'Güvenlik Rampa Yönlendirme',
  SECURITY_NOTE: 'Güvenlik Geri Bildirim Notu',
  NOTIFICATION_DELETE: 'Çağrı Bildirimi Silme',
  NOTIFICATION_CLEAR: 'Bildirim Listesi Temizleme',
  LOGIN_SUCCESS: 'Sisteme Giriş',
  LOGIN_FAILED: 'Hatalı Giriş Denemesi',
  LOGIN_GUEST: 'Misafir Portalı Girişi',
  LOGOUT: 'Güvenli Çıkış',
  USER_CREATE: 'Yeni Kullanıcı Ekleme',
  USER_EDIT: 'Kullanıcı & Yetki Güncelleme',
  USER_DELETE: 'Kullanıcı Silme',
  PASSWORD_CHANGE: 'Şifre Değişikliği',
  WAREHOUSE_CREATE: 'Yeni Depo Ekleme',
  WAREHOUSE_EDIT: 'Depo Bilgi Güncelleme',
  WAREHOUSE_TOGGLE: 'Depo Aktif / Pasif Değişimi',
  CUSTOMER_CREATE: 'Yeni Firma Ekleme',
  CUSTOMER_EDIT: 'Firma Bilgi Güncelleme',
  CUSTOMER_DELETE: 'Firma Silme',
  CUSTOMER_RESET: 'Firma Listesi Sıfırlama',
  SETTINGS_SLA: 'SLA Süre Ayarı Güncelleme',
  SETTINGS_WHATSAPP: 'WhatsApp Ayarı Güncelleme',
  SETTINGS_CHAT_QUICK: 'Hızlı Sohbet Şablonu Güncelleme',
  CHAT_GROUP_CREATE: 'Sohbet Grubu Oluşturma',
  CHAT_GROUP_APPROVE: 'Sohbet Grubu Onaylama',
  CHAT_GROUP_REJECT: 'Sohbet Grubu Reddetme',
  CHAT_GROUP_EDIT: 'Sohbet Grubu Güncelleme',
  CHAT_GROUP_MEMBER_APPROVE: 'Grup Üye Talebi Onaylama',
  CHAT_GROUP_MEMBER_REJECT: 'Grup Üye Talebi Reddetme',
  CHAT_GROUP_LEAVE: 'Sohbet Grubundan Ayrılma',
  CHAT_GROUP_DELETE: 'Sohbet Grubu Silme',
  EXPORT_VEHICLES: 'Araç Listesi Dışa Aktarımı',
  AUDIT_EXPORT: 'Denetim Kayıtları Dışa Aktarımı',
  AUDIT_ARCHIVE_CLEANUP: 'Eski Denetim Kaydı Arşiv & Temizlik'
};

export function getActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] || action;
}

export function sanitizeAuditText(val: unknown, maxLen = 300): string {
  if (val === null || val === undefined || val === '') return '-';
  const str = typeof val === 'string' ? val : typeof val === 'boolean' ? (val ? 'Evet' : 'Hayır') : String(val);
  const trimmed = str.trim();
  if (!trimmed) return '-';
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen - 3) + '...' : trimmed;
}

export function sanitizeAuditLogPayload(log: AuditLog): AuditLog {
  const safeChanges = Array.isArray(log.changes)
    ? log.changes.slice(0, 30).map((c) => ({
        field: sanitizeAuditText(c.field, 60),
        label: sanitizeAuditText(c.label, 80),
        before: sanitizeAuditText(c.before, 300),
        after: sanitizeAuditText(c.after, 300)
      }))
    : undefined;

  let safeMetadata: Record<string, string> | undefined;
  if (log.metadata && typeof log.metadata === 'object') {
    const entries = Object.entries(log.metadata).slice(0, 10);
    if (entries.length > 0) {
      safeMetadata = {};
      for (const [k, v] of entries) {
        safeMetadata[sanitizeAuditText(k, 50)] = sanitizeAuditText(v, 200);
      }
    }
  }

  return {
    id: log.id,
    timestamp: log.timestamp,
    dateStr: sanitizeAuditText(log.dateStr, 40),
    isoDate: sanitizeAuditText(log.isoDate, 20),
    actorUsername: sanitizeAuditText(log.actorUsername || 'Bilinmiyor', 120),
    actorRole: log.actorRole || 'system',
    category: log.category,
    action: sanitizeAuditText(log.action, 80),
    severity: log.severity || 'info',
    ...(log.targetType ? { targetType: sanitizeAuditText(log.targetType, 60) } : {}),
    ...(log.targetId ? { targetId: sanitizeAuditText(log.targetId, 120) } : {}),
    ...(log.targetLabel ? { targetLabel: sanitizeAuditText(log.targetLabel, 200) } : {}),
    ...(typeof log.depoId === 'number' ? { depoId: log.depoId } : {}),
    ...(log.depoName ? { depoName: sanitizeAuditText(log.depoName, 120) } : {}),
    summary: sanitizeAuditText(log.summary, 1000),
    ...(safeChanges && safeChanges.length > 0 ? { changes: safeChanges } : {}),
    ...(safeMetadata ? { metadata: safeMetadata } : {})
  };
}

export function buildVehicleDiff(
  prev: Vehicle,
  next: Vehicle,
  getWarehouseName: (id: number) => string,
  getRampName: (id: number | null | undefined) => string
): AuditChangeItem[] {
  const changes: AuditChangeItem[] = [];

  const compareStr = (field: string, label: string, a?: string | null, b?: string | null) => {
    const sa = (a || '').trim();
    const sb = (b || '').trim();
    if (sa !== sb) {
      changes.push({
        field,
        label,
        before: sanitizeAuditText(sa || '-'),
        after: sanitizeAuditText(sb || '-')
      });
    }
  };

  compareStr('dorsePlaka', 'Dorse Plaka', prev.dorsePlaka, next.dorsePlaka);
  compareStr('cekiciPlaka', 'Çekici Plaka', prev.cekiciPlaka, next.cekiciPlaka);
  compareStr('konteynirNo', 'Konteynır No', prev.konteynirNo, next.konteynirNo);
  compareStr('musteri', 'Müşteri / Firma', prev.musteri, next.musteri);
  compareStr('soforAd', 'Şoför Adı', prev.soforAd, next.soforAd);
  compareStr('soforTel', 'Şoför Telefonu', prev.soforTel, next.soforTel);
  compareStr('soforTc', 'Şoför TC No', prev.soforTc, next.soforTc);
  compareStr('nakliyeFirmasi', 'Nakliye Firması', prev.nakliyeFirmasi, next.nakliyeFirmasi);

  if ((prev.depoId || 1) !== (next.depoId || 1)) {
    changes.push({
      field: 'depoId',
      label: 'Depo / Tesis',
      before: sanitizeAuditText(getWarehouseName(prev.depoId || 1)),
      after: sanitizeAuditText(getWarehouseName(next.depoId || 1))
    });
  }

  compareStr('depoTuru', 'Depo Türü', prev.depoTuru, next.depoTuru);
  compareStr('islemTuru', 'İşlem Türü', prev.islemTuru, next.islemTuru);
  compareStr('durum', 'Durum', prev.durum, next.durum);

  if ((prev.rampaId || null) !== (next.rampaId || null)) {
    changes.push({
      field: 'rampaId',
      label: 'Rampa',
      before: prev.rampaId ? getRampName(prev.rampaId) : 'Atanmadı',
      after: next.rampaId ? getRampName(next.rampaId) : 'Atanmadı'
    });
  }

  if (Boolean(prev.isAcik) !== Boolean(next.isAcik)) {
    changes.push({
      field: 'isAcik',
      label: 'Öncelik / Acil',
      before: prev.isAcik ? 'ACİL ARAÇ' : 'Normal',
      after: next.isAcik ? 'ACİL ARAÇ' : 'Normal'
    });
  }

  if (Boolean(prev.isRampayaCagrildi) !== Boolean(next.isRampayaCagrildi)) {
    changes.push({
      field: 'isRampayaCagrildi',
      label: 'Rampa Çağrısı',
      before: prev.isRampayaCagrildi ? 'Çağrıldı' : 'Yok',
      after: next.isRampayaCagrildi ? 'Çağrıldı' : 'Yok'
    });
  }

  compareStr('aciklama', 'Açıklama / Not', prev.aciklama, next.aciklama);

  const prevPhotos = Array.isArray(prev.fotograflar) ? prev.fotograflar.length : 0;
  const nextPhotos = Array.isArray(next.fotograflar) ? next.fotograflar.length : 0;
  if (prevPhotos !== nextPhotos) {
    changes.push({
      field: 'fotograflar',
      label: 'Fotoğraf Sayısı',
      before: `${prevPhotos} adet`,
      after: `${nextPhotos} adet`
    });
  }

  return changes.slice(0, 30);
}

export function buildExpectedVehicleDiff(
  prev: ExpectedVehicle,
  next: ExpectedVehicle,
  getWarehouseName: (id: number) => string
): AuditChangeItem[] {
  const changes: AuditChangeItem[] = [];
  const cmp = (field: string, label: string, a?: string | null, b?: string | null) => {
    const sa = (a || '').trim();
    const sb = (b || '').trim();
    if (sa !== sb) {
      changes.push({
        field,
        label,
        before: sanitizeAuditText(sa || '-'),
        after: sanitizeAuditText(sb || '-')
      });
    }
  };
  cmp('dorsePlaka', 'Dorse Plaka', prev.dorsePlaka, next.dorsePlaka);
  cmp('cekiciPlaka', 'Çekici Plaka', prev.cekiciPlaka, next.cekiciPlaka);
  cmp('konteynirNo', 'Konteynır No', prev.konteynirNo, next.konteynirNo);
  cmp('musteri', 'Müşteri / Firma', prev.musteri, next.musteri);
  cmp('soforAd', 'Şoför Adı', prev.soforAd, next.soforAd);
  cmp('soforTel', 'Şoför Tel', prev.soforTel, next.soforTel);
  cmp('soforTc', 'Şoför TC', prev.soforTc, next.soforTc);
  if ((prev.depoId || 1) !== (next.depoId || 1)) {
    changes.push({
      field: 'depoId',
      label: 'Depo / Tesis',
      before: getWarehouseName(prev.depoId || 1),
      after: getWarehouseName(next.depoId || 1)
    });
  }
  cmp('depoTuru', 'Depo Türü', prev.depoTuru, next.depoTuru);
  cmp('islemTuru', 'İşlem Türü', prev.islemTuru, next.islemTuru);
  cmp('beklenenTarih', 'Tahmini Geliş', prev.beklenenTarih, next.beklenenTarih);
  cmp('durum', 'Durum', prev.durum, next.durum);
  cmp('aciklama', 'Açıklama', prev.aciklama, next.aciklama);
  return changes.slice(0, 30);
}

export function buildUserDiff(
  prev: User,
  next: User,
  getWarehouseName: (id: number) => string
): AuditChangeItem[] {
  const changes: AuditChangeItem[] = [];

  if (prev.role !== next.role) {
    changes.push({
      field: 'role',
      label: 'Kullanıcı Rolü',
      before: AUDIT_ROLE_LABELS[prev.role] || prev.role,
      after: AUDIT_ROLE_LABELS[next.role] || next.role
    });
  }

  if ((prev.depoId || 0) !== (next.depoId || 0)) {
    changes.push({
      field: 'depoId',
      label: 'Yetkili Depo',
      before: prev.depoId === 0 ? 'Tüm Depolar' : getWarehouseName(prev.depoId),
      after: next.depoId === 0 ? 'Tüm Depolar' : getWarehouseName(next.depoId)
    });
  }

  const prevPerms = prev.permissions || getDefaultPermissionsForRole(prev.role);
  const nextPerms = next.permissions || getDefaultPermissionsForRole(next.role);

  for (const meta of PERMISSIONS_LIST) {
    const oldVal = Boolean(prevPerms[meta.key]);
    const newVal = Boolean(nextPerms[meta.key]);
    if (oldVal !== newVal) {
      changes.push({
        field: `permissions.${meta.key}`,
        label: meta.title,
        before: oldVal ? 'Açık' : 'Kapalı',
        after: newVal ? 'Açık' : 'Kapalı'
      });
    }
  }

  return changes.slice(0, 30);
}

export function buildCustomerDiff(prev: Customer, next: Customer): AuditChangeItem[] {
  const changes: AuditChangeItem[] = [];
  const cmp = (field: string, label: string, a?: string, b?: string) => {
    const sa = (a || '').trim();
    const sb = (b || '').trim();
    if (sa !== sb) {
      changes.push({ field, label, before: sanitizeAuditText(sa || '-'), after: sanitizeAuditText(sb || '-') });
    }
  };
  cmp('name', 'Firma Adı', prev.name, next.name);
  cmp('vergiNo', 'Vergi No', prev.vergiNo, next.vergiNo);
  cmp('yetkili', 'Yetkili Kişi', prev.yetkili, next.yetkili);
  cmp('telefon', 'Telefon', prev.telefon, next.telefon);
  cmp('adres', 'Adres', prev.adres, next.adres);
  cmp('notlar', 'Notlar', prev.notlar, next.notlar);
  return changes.slice(0, 30);
}

export function buildWarehouseDiff(prev: Warehouse, next: Warehouse): AuditChangeItem[] {
  const changes: AuditChangeItem[] = [];
  if (prev.ad.trim() !== next.ad.trim()) {
    changes.push({ field: 'ad', label: 'Depo Adı', before: prev.ad, after: next.ad });
  }
  if ((prev.aktif !== false) !== (next.aktif !== false)) {
    changes.push({
      field: 'aktif',
      label: 'Durum',
      before: prev.aktif !== false ? 'Aktif' : 'Pasif',
      after: next.aktif !== false ? 'Aktif' : 'Pasif'
    });
  }
  return changes;
}

export function buildSlaDiff(prev: SlaSettings, next: SlaSettings): AuditChangeItem[] {
  const changes: AuditChangeItem[] = [];
  if (prev.bosaltmaMinutes !== next.bosaltmaMinutes) {
    changes.push({
      field: 'bosaltmaMinutes',
      label: 'Boşaltma SLA Hedefi',
      before: `${prev.bosaltmaMinutes} dk`,
      after: `${next.bosaltmaMinutes} dk`
    });
  }
  if (prev.yuklemeMinutes !== next.yuklemeMinutes) {
    changes.push({
      field: 'yuklemeMinutes',
      label: 'Yükleme SLA Hedefi',
      before: `${prev.yuklemeMinutes} dk`,
      after: `${next.yuklemeMinutes} dk`
    });
  }
  if (prev.tahliyeMinutes !== next.tahliyeMinutes) {
    changes.push({
      field: 'tahliyeMinutes',
      label: 'Tahliye SLA Hedefi',
      before: `${prev.tahliyeMinutes} dk`,
      after: `${next.tahliyeMinutes} dk`
    });
  }
  if (prev.warningThresholdPercent !== next.warningThresholdPercent) {
    changes.push({
      field: 'warningThresholdPercent',
      label: 'Uyarı Eşiği',
      before: `%${prev.warningThresholdPercent}`,
      after: `%${next.warningThresholdPercent}`
    });
  }
  return changes;
}

export function buildWhatsAppConfigDiff(prev: WhatsAppConfig, next: WhatsAppConfig): AuditChangeItem[] {
  const changes: AuditChangeItem[] = [];
  const secretSet = new Set<string>(WHATSAPP_SECRET_FIELDS);

  const labels: Record<string, string> = {
    enabled: 'Entegrasyon Durumu',
    provider: 'Sağlayıcı Yöntemi',
    autoShareOnVehicleAdd: 'Araç Girişinde Otomatik Gönder',
    autoShareOnRampAssign: 'Rampa Atamasında Otomatik Gönder',
    autoShareOnRampCall: 'Rampa Çağrısında Otomatik Gönder',
    groupName: 'Grup Adı',
    alwaysShowPromptModal: 'Önizleme Penceresi Aç',
    customTemplate: 'Özel Mesaj Şablonu',
    groupPhoneOrId: 'Hedef Grup / Telefon ID',
    webhookUrl: 'Webhook URL',
    apiKey: 'API Anahtarı / Token',
    instanceId: 'Instance ID',
    twilioAccountSid: 'Twilio Account SID',
    twilioAuthToken: 'Twilio Auth Token',
    twilioFromNumber: 'Twilio Gönderici No'
  };

  for (const key of Object.keys(labels)) {
    const oldVal = (prev as unknown as Record<string, unknown>)[key];
    const newVal = (next as unknown as Record<string, unknown>)[key];

    if (typeof oldVal === 'boolean' || typeof newVal === 'boolean') {
      if (Boolean(oldVal) !== Boolean(newVal)) {
        changes.push({
          field: key,
          label: labels[key],
          before: oldVal ? 'Açık' : 'Kapalı',
          after: newVal ? 'Açık' : 'Kapalı'
        });
      }
      continue;
    }

    const sa = String(oldVal || '').trim();
    const sb = String(newVal || '').trim();
    if (sa !== sb) {
      if (secretSet.has(key)) {
        changes.push({
          field: key,
          label: labels[key],
          before: sa ? 'Tanımlı (Gizli)' : 'Boş',
          after: sb ? 'Güncellendi (Gizli)' : 'Temizlendi'
        });
      } else {
        changes.push({
          field: key,
          label: labels[key],
          before: sanitizeAuditText(sa || '-'),
          after: sanitizeAuditText(sb || '-')
        });
      }
    }
  }

  return changes.slice(0, 30);
}

export function buildChatGroupDiff(prev: ChatGroup, next: ChatGroup): AuditChangeItem[] {
  const changes: AuditChangeItem[] = [];
  if (prev.name !== next.name) {
    changes.push({ field: 'name', label: 'Grup Adı', before: prev.name, after: next.name });
  }
  if ((prev.description || '') !== (next.description || '')) {
    changes.push({
      field: 'description',
      label: 'Açıklama',
      before: sanitizeAuditText(prev.description || '-'),
      after: sanitizeAuditText(next.description || '-')
    });
  }
  if ((prev.status || 'approved') !== (next.status || 'approved')) {
    changes.push({
      field: 'status',
      label: 'Onay Durumu',
      before: prev.status || 'approved',
      after: next.status || 'approved'
    });
  }
  const prevMembers = prev.members.join(', ');
  const nextMembers = next.members.join(', ');
  if (prevMembers !== nextMembers) {
    changes.push({
      field: 'members',
      label: 'Grup Üyeleri',
      before: sanitizeAuditText(`${prev.members.length} kişi (${prevMembers})`),
      after: sanitizeAuditText(`${next.members.length} kişi (${nextMembers})`)
    });
  }
  return changes.slice(0, 30);
}

export function exportAuditLogsToExcel(logs: AuditLog[], filenamePrefix = 'denetim_kayitlari'): boolean {
  if (!logs.length) return false;

  const rows = logs.map((log) => ({
    'Kayıt ID': log.id,
    'Tarih / Saat': log.dateStr,
    'Kullanıcı': log.actorUsername,
    'Rol': AUDIT_ROLE_LABELS[log.actorRole] || log.actorRole,
    'Kategori': AUDIT_CATEGORY_LABELS[log.category] || log.category,
    'İşlem': getActionLabel(log.action),
    'Önem Düzeyi': AUDIT_SEVERITY_LABELS[log.severity] || log.severity,
    'Depo / Tesis': log.depoName || (log.depoId ? `Depo ${log.depoId}` : 'Genel'),
    'Hedef Kayıt': log.targetLabel || log.targetId || '-',
    'Özet Açıklama': log.summary,
    'Değişiklik Detayları':
      Array.isArray(log.changes) && log.changes.length > 0
        ? log.changes.map((c) => `${c.label}: ${c.before} -> ${c.after}`).join(' | ')
        : '-'
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 16 },
    { wch: 19 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
    { wch: 28 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 52 },
    { wch: 60 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Islem Gecmisi');
  const datePart = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}_${datePart}.xlsx`);
  return true;
}

export function exportAuditLogsToCsv(logs: AuditLog[], filenamePrefix = 'denetim_kayitlari'): boolean {
  if (!logs.length) return false;

  let csvContent = '\uFEFF';
  const headers = [
    'Kayıt ID',
    'Tarih / Saat',
    'Kullanıcı',
    'Rol',
    'Kategori',
    'İşlem',
    'Önem Düzeyi',
    'Depo / Tesis',
    'Hedef Kayıt',
    'Özet Açıklama',
    'Değişiklik Detayları'
  ];
  csvContent += headers.join(';') + '\n';

  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  for (const log of logs) {
    const diffStr =
      Array.isArray(log.changes) && log.changes.length > 0
        ? log.changes.map((c) => `${c.label}: ${c.before} -> ${c.after}`).join(' | ')
        : '-';
    csvContent +=
      [
        log.id,
        esc(log.dateStr),
        esc(log.actorUsername),
        esc(AUDIT_ROLE_LABELS[log.actorRole] || log.actorRole),
        esc(AUDIT_CATEGORY_LABELS[log.category] || log.category),
        esc(getActionLabel(log.action)),
        esc(AUDIT_SEVERITY_LABELS[log.severity] || log.severity),
        esc(log.depoName || (log.depoId ? `Depo ${log.depoId}` : 'Genel')),
        esc(log.targetLabel || log.targetId || '-'),
        esc(log.summary),
        esc(diffStr)
      ].join(';') + '\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const datePart = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${datePart}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
