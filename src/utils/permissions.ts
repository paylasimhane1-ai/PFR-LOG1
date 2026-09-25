import { User, UserPermissions, UserRole } from '../types';

export const ALL_PERMISSIONS_KEYS: (keyof UserPermissions)[] = [
  'canCreateVehicle',
  'canEditVehicle',
  'canMakeReady',
  'canToggleAcil',
  'canAssignRamp',
  'canReleaseRamp',
  'canManageRampStatus',
  'canCallVehicle',
  'canApproveCall',
  'canAuthorizeExit',
  'canManageExpected',
  'canExportReports',
];

export interface PermissionMeta {
  key: keyof UserPermissions;
  title: string;
  label?: string;
  category: string;
  description: string;
}

export const PERMISSIONS_LIST: PermissionMeta[] = [
  // Araç İşlemleri
  {
    key: 'canCreateVehicle',
    title: 'Yeni Araç Kabul & Giriş Kaydı',
    category: 'Araç İşlemleri',
    description: 'Saha kapısından yeni araç girişi ve plaka kaydı açabilir.'
  },
  {
    key: 'canEditVehicle',
    title: 'Araç Bilgilerini Düzenleme & Silme',
    category: 'Araç İşlemleri',
    description: 'Mevcut araçların bilgilerini güncelleyebilir veya kaydını silebilir.'
  },
  {
    key: 'canMakeReady',
    title: "Evrak Durumunu 'EVRAK HAZIR' Yapma",
    category: 'Araç İşlemleri',
    description: 'Bekleme sahasındaki araçların evrak onayını verip rampaya hazır edebilir.'
  },
  {
    key: 'canToggleAcil',
    title: 'Acil Araç Durumu Belirleme',
    category: 'Araç İşlemleri',
    description: 'Araçlara öncelikli acil sevkiyat statüsü verebilir.'
  },

  // Rampa Operasyonları
  {
    key: 'canAssignRamp',
    title: 'Rampa Atama & Değiştirme',
    category: 'Rampa Operasyonları',
    description: 'Evrakı hazır olan araçları boş rampalara atayabilir veya rampa değiştirebilir.'
  },
  {
    key: 'canReleaseRamp',
    title: 'Rampadan İndirme / Boşaltma',
    category: 'Rampa Operasyonları',
    description: 'Rampadaki araçları rampadan indirip sahada beklemeye alabilir.'
  },
  {
    key: 'canManageRampStatus',
    title: 'Rampa Durumu Değiştirme',
    category: 'Rampa Operasyonları',
    description: 'Rampaları Boş, Dolu, Arızalı veya Bakımda durumlarına getirebilir.'
  },
  {
    key: 'canCallVehicle',
    title: 'Rampaya Araç Çağırma (Anons)',
    category: 'Rampa Operasyonları',
    description: 'Bekleme sahasından rampaya araç anonsu veya güvenlik yönlendirme bildirimi gönderebilir.'
  },

  // Güvenlik & Çıkış
  {
    key: 'canApproveCall',
    title: 'Güvenlik Çağrı Onayı & Yönlendirme',
    category: 'Güvenlik & Çıkış',
    description: 'Rampaya çağrılan araçların kontrol noktasından geçişini onaylayıp yönlendirebilir.'
  },
  {
    key: 'canAuthorizeExit',
    title: 'Sahadan Çıkış Onayı & İptali',
    category: 'Güvenlik & Çıkış',
    description: 'İşlemi tamamlanan araçlara saha çıkış onayı verebilir ve çıkışı geri alabilir.'
  },

  // Planlama & Raporlar
  {
    key: 'canManageExpected',
    title: 'Beklenen Araçları Yönetme',
    category: 'Planlama & Raporlar',
    description: 'Planlanan sevkiyat listesine araç ekleyebilir, düzenleyebilir ve sahaya alabilir.'
  },
  {
    key: 'canExportReports',
    title: 'Excel ve CSV Rapor İndirme',
    category: 'Planlama & Raporlar',
    description: 'Saha ve rampa hareket raporlarını Excel (.xlsx) ve CSV olarak indirebilir.'
  }
];

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  canCreateVehicle: true,
  canEditVehicle: true,
  canMakeReady: true,
  canToggleAcil: true,
  canAssignRamp: true,
  canReleaseRamp: true,
  canManageRampStatus: true,
  canCallVehicle: true,
  canApproveCall: true,
  canAuthorizeExit: true,
  canManageExpected: true,
  canExportReports: true,
};

export const DEFAULT_PERSONEL_PERMISSIONS: UserPermissions = {
  canCreateVehicle: true,
  canEditVehicle: true,
  canMakeReady: true,
  canToggleAcil: false,
  canAssignRamp: true,
  canReleaseRamp: true,
  canManageRampStatus: false,
  canCallVehicle: true,
  canApproveCall: false,
  canAuthorizeExit: false,
  canManageExpected: true,
  canExportReports: true,
};

export const DEFAULT_SECURITY_PERMISSIONS: UserPermissions = {
  canCreateVehicle: true,
  canEditVehicle: false,
  canMakeReady: false,
  canToggleAcil: false,
  canAssignRamp: false,
  canReleaseRamp: false,
  canManageRampStatus: false,
  canCallVehicle: false,
  canApproveCall: true,
  canAuthorizeExit: true,
  canManageExpected: true,
  canExportReports: false,
};

export const DEFAULT_GUEST_PERMISSIONS: UserPermissions = {
  canCreateVehicle: false,
  canEditVehicle: false,
  canMakeReady: false,
  canToggleAcil: false,
  canAssignRamp: false,
  canReleaseRamp: false,
  canManageRampStatus: false,
  canCallVehicle: false,
  canApproveCall: false,
  canAuthorizeExit: false,
  canManageExpected: false,
  canExportReports: false,
};

export function getDefaultPermissionsForRole(role: UserRole): UserPermissions {
  switch (role) {
    case 'admin':
      return { ...DEFAULT_ADMIN_PERMISSIONS };
    case 'personel':
      return { ...DEFAULT_PERSONEL_PERMISSIONS };
    case 'security':
      return { ...DEFAULT_SECURITY_PERMISSIONS };
    case 'guest':
    default:
      return { ...DEFAULT_GUEST_PERMISSIONS };
  }
}

export function hasPermission(user: User | null | undefined, permissionKey: keyof UserPermissions): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'guest') return false;

  if (user.permissions && typeof user.permissions[permissionKey] === 'boolean') {
    return user.permissions[permissionKey];
  }

  // Geriye dönük uyumluluk: permissions nesnesi olmayan eski kayıtlar için
  if (user.role === 'security') {
    return !!DEFAULT_SECURITY_PERMISSIONS[permissionKey];
  }
  if (user.role === 'personel') {
    return !!DEFAULT_PERSONEL_PERMISSIONS[permissionKey];
  }
  return false;
}
