import React, { useState, useEffect } from 'react';
import {
  Vehicle,
  ExpectedVehicle,
  Warehouse,
  Ramp,
  User,
  UserPermissions,
  UserRole,
  AppNotification,
  Customer
} from '../types';
import { CustomerAutocomplete } from './CustomerAutocomplete';
import {
  cleanPhone,
  getStatusBadgeClass,
  getStatusDurationLabel,
  getSpecificStatusDuration,
  getDurationText,
  getRampDurationText,
  getDepoKayitTarihi,
  getRampaGirisTarihi,
  getRampaCikisTarihi
} from '../utils/helpers';
import {
  PERMISSIONS_LIST,
  getDefaultPermissionsForRole,
  hasPermission,
  DEFAULT_ADMIN_PERMISSIONS,
  ALL_PERMISSIONS_KEYS
} from '../utils/permissions';
import {
  X,
  Plus,
  Phone,
  PhoneCall,
  CalendarPlus,
  ShieldAlert,
  Users,
  Info,
  Warehouse as WarehouseIcon,
  Truck,
  Camera,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Key,
  Trash2,
  Edit,
  Bolt,
  Building,
  UserCheck,
  LogOut,
  AlertTriangle,
  Check,
  Lock,
  Shield,
  Sliders,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Power,
  CheckCircle2,
  LogIn,
  Clock,
  ArrowRight,
  MessageSquare
} from 'lucide-react';

/* =========================================================
   1. BEKLENEN ARAÇ EKLEME MODALI
   ========================================================= */
interface AddExpectedVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  selectedDepoId: number;
  customers?: Customer[];
  onAddNewCustomer?: (name: string) => void;
  onSave: (vehicle: Omit<ExpectedVehicle, 'id' | 'durum' | 'kabulTarihi'>) => void;
}

export const AddExpectedVehicleModal: React.FC<AddExpectedVehicleModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  selectedDepoId,
  customers = [],
  onAddNewCustomer = () => {},
  onSave
}) => {
  const [form, setForm] = useState({
    depoId: selectedDepoId === 0 ? 1 : selectedDepoId,
    cekiciPlaka: '',
    dorsePlaka: '',
    konteynirNo: '',
    soforAd: '',
    soforTel: '',
    musteri: '',
    depoTuru: 'Antrepo',
    islemTuru: 'Boşaltma',
    beklenenTarih: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dorsePlaka.trim() && !form.musteri.trim()) {
      alert('Lütfen en az bir Plaka veya Müşteri bilgisi giriniz.');
      return;
    }
    onSave({
      depoId: Number(form.depoId),
      cekiciPlaka: form.cekiciPlaka.trim().toUpperCase(),
      dorsePlaka: form.dorsePlaka.trim().toUpperCase(),
      konteynirNo: form.konteynirNo.trim().toUpperCase(),
      soforAd: form.soforAd.trim(),
      soforTel: form.soforTel.trim(),
      musteri: form.musteri.trim(),
      depoTuru: form.depoTuru,
      islemTuru: form.islemTuru,
      beklenenTarih: form.beklenenTarih
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <CalendarPlus className="w-4 h-4 text-amber-400" /> Beklenen Araç Tanımla
            </h3>
            <p className="text-[10px] text-slate-400">Aşağıdaki alanları doldurarak beklenen araç oluşturabilirsiniz</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Hedef Depo / Tesis</label>
            <select
              value={form.depoId}
              onChange={(e) => setForm({ ...form, depoId: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-800 bg-slate-50 focus:bg-white"
            >
              {warehouses.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ad}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Dorse Plakası</label>
              <input
                type="text"
                value={form.dorsePlaka}
                onChange={(e) => setForm({ ...form, dorsePlaka: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2 outline-none uppercase font-bold"
                placeholder="34 TR 123"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Çekici Plakası</label>
              <input
                type="text"
                value={form.cekiciPlaka}
                onChange={(e) => setForm({ ...form, cekiciPlaka: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2 outline-none uppercase"
                placeholder="34 ABC 123"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Konteynır No</label>
              <input
                type="text"
                value={form.konteynirNo}
                onChange={(e) => setForm({ ...form, konteynirNo: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2 outline-none uppercase"
                placeholder="MSCU1234567"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Müşteri / Firma</label>
              <CustomerAutocomplete
                value={form.musteri}
                onChange={(val) => setForm({ ...form, musteri: val })}
                customers={customers}
                onAddNewCustomer={onAddNewCustomer}
                placeholder="Firma / Müşteri Ara veya Yaz..."
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Şoför Ad Soyad</label>
              <input
                type="text"
                value={form.soforAd}
                onChange={(e) => setForm({ ...form, soforAd: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2 outline-none"
                placeholder="Şoför İsim"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Şoför Telefon</label>
              <input
                type="text"
                value={form.soforTel}
                onChange={(e) => setForm({ ...form, soforTel: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2 outline-none"
                placeholder="05XX XXX XX XX"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Depo Türü</label>
              <select
                value={form.depoTuru}
                onChange={(e) => setForm({ ...form, depoTuru: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2 outline-none"
              >
                <option value="Antrepo">Antrepo</option>
                <option value="Serbest Depo">Serbest Depo</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">İşlem Türü</label>
              <select
                value={form.islemTuru}
                onChange={(e) => setForm({ ...form, islemTuru: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-2 outline-none"
              >
                <option value="Boşaltma">Boşaltma</option>
                <option value="Yükleme">Yükleme</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Tahmini Varış Tarihi ve Saati</label>
            <input
              type="datetime-local"
              value={form.beklenenTarih}
              onChange={(e) => setForm({ ...form, beklenenTarih: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-2 outline-none font-semibold text-slate-800"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold rounded-xl shadow cursor-pointer"
            >
              Beklenen Araç Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   2. GÜVENLİK BİLDİRİM İŞLEM MODALI
   ========================================================= */
interface SecurityActionModalProps {
  notification: AppNotification | null;
  ramps: Ramp[];
  vehicles?: Vehicle[];
  onClose: () => void;
  onConfirm: (notification: AppNotification, rampId: number, note: string) => void;
  onSaveNoteOnly: (notification: AppNotification, note: string) => void;
}

export const SecurityActionModal: React.FC<SecurityActionModalProps> = ({
  notification,
  ramps,
  vehicles,
  onClose,
  onConfirm,
  onSaveNoteOnly
}) => {
  const [selectedRampId, setSelectedRampId] = useState<number | null>(notification?.rampId || null);
  const [note, setNote] = useState('');

  if (!notification) return null;

  const targetVehicle = vehicles?.find((v) => v.id === notification.vehicleId);
  const vehicleDepoId = targetVehicle?.depoId;

  const freeRamps = ramps.filter(
    (r) =>
      (!vehicleDepoId || !r.depoId || r.depoId === vehicleDepoId) &&
      (r.durum === 'Boş' || r.id === notification.rampId)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Güvenlik Sürücü Yönlendirme
            </h3>
            <p className="text-[10px] text-slate-400">
              Çağrılan Araç: <b>{notification.plaka}</b>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-1">
            <p className="font-bold text-slate-800 text-sm flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-amber-600" /> {notification.musteri}
            </p>
            <p className="font-semibold text-slate-700">Şoför: {notification.soforAd || '-'}</p>
            <div className="font-semibold text-slate-700 flex items-center justify-between">
              <span>Tel: {notification.soforTel || '-'}</span>
              {notification.soforTel && (
                <a
                  href={`tel:${cleanPhone(notification.soforTel)}`}
                  className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px] flex items-center gap-1"
                >
                  <PhoneCall className="w-3 h-3" /> Şoförü Ara
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <WarehouseIcon className="w-3.5 h-3.5 text-blue-600" /> Yanaştırılacak Rampayı Seçin:
            </label>
            <select
              value={selectedRampId ?? ''}
              onChange={(e) => setSelectedRampId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-800 bg-slate-50 focus:bg-white"
            >
              <option value="">-- Uygun Boş Rampa Seçiniz --</option>
              {freeRamps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.ad} ({r.durum})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Güvenlik Geri Bildirim Notu Ekle:</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn: Şoför sahadaydı, yönlendirildi / Şoföre ulaşıldı..."
              className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                if (!selectedRampId) {
                  alert('Lütfen yanaştırılacak bir rampa seçiniz.');
                  return;
                }
                onConfirm(notification, selectedRampId, note);
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" /> Rampayı Seç & Yönlendirmeyi Onayla
            </button>
            <button
              onClick={() => {
                if (!note.trim()) {
                  alert('Lütfen bir not giriniz.');
                  return;
                }
                onSaveNoteOnly(notification, note);
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
            >
              Sadece Geri Bildirim Notunu Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   3. ADMIN KULLANICI YÖNETİMİ MODALI
   ========================================================= */
interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  warehouses: Warehouse[];
  currentUser: User | null;
  getWarehouseNameById: (id: number) => string;
  onAddUser: (newUser: User) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  warehouses,
  currentUser,
  getWarehouseNameById,
  onAddUser,
  onEditUser,
  onDeleteUser
}) => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<{
    username: string;
    password: string;
    role: UserRole;
    depoId: number;
    permissions: UserPermissions;
  }>({
    username: '',
    password: '',
    role: 'personel',
    depoId: 1,
    permissions: getDefaultPermissionsForRole('personel')
  });

  const [expandedUserPerms, setExpandedUserPerms] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: UserRole) => {
    setForm((prev) => ({
      ...prev,
      role: newRole,
      permissions: getDefaultPermissionsForRole(newRole)
    }));
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    if (form.role === 'admin' || form.role === 'guest') return;
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleSelectAll = () => {
    if (form.role === 'admin' || form.role === 'guest') return;
    const allTrue: Partial<UserPermissions> = {};
    ALL_PERMISSIONS_KEYS.forEach((k) => (allTrue[k] = true));
    setForm((prev) => ({ ...prev, permissions: allTrue as UserPermissions }));
  };

  const handleDeselectAll = () => {
    if (form.role === 'admin' || form.role === 'guest') return;
    const allFalse: Partial<UserPermissions> = {};
    ALL_PERMISSIONS_KEYS.forEach((k) => (allFalse[k] = false));
    setForm((prev) => ({ ...prev, permissions: allFalse as UserPermissions }));
  };

  const handleResetToRoleDefault = () => {
    if (form.role === 'admin' || form.role === 'guest') return;
    setForm((prev) => ({
      ...prev,
      permissions: getDefaultPermissionsForRole(prev.role)
    }));
  };

  const handleStartEdit = (u: User) => {
    setEditingUser(u);
    const userRole = (u.role || 'personel') as UserRole;
    const userPerms = u.permissions || getDefaultPermissionsForRole(userRole);
    setForm({
      username: u.username,
      password: u.password,
      role: userRole,
      depoId: u.depoId ?? 0,
      permissions: { ...userPerms }
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setForm({
      username: '',
      password: '',
      role: 'personel',
      depoId: 1,
      permissions: getDefaultPermissionsForRole('personel')
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const uname = form.username.trim();
    const pwd = form.password.trim();
    if (!uname || !pwd) {
      alert('Kullanıcı adı ve şifre zorunludur.');
      return;
    }

    const finalPermissions =
      form.role === 'admin'
        ? { ...DEFAULT_ADMIN_PERMISSIONS }
        : { ...form.permissions };

    if (editingUser) {
      onEditUser({
        username: uname,
        password: pwd,
        role: form.role,
        depoId: Number(form.depoId),
        permissions: finalPermissions
      });
      handleCancelEdit();
    } else {
      if (users.some((u) => u.username.toLowerCase() === uname.toLowerCase())) {
        alert('Bu kullanıcı adı zaten mevcut.');
        return;
      }
      onAddUser({
        username: uname,
        password: pwd,
        role: form.role,
        depoId: Number(form.depoId),
        permissions: finalPermissions
      });
      setForm({
        username: '',
        password: '',
        role: 'personel',
        depoId: 1,
        permissions: getDefaultPermissionsForRole('personel')
      });
    }
  };

  // Group permissions by category
  const categories = [
    {
      id: 'arac',
      title: 'Araç & Giriş İşlemleri',
      desc: 'Saha araç kabulü, düzenleme ve durum kontrolleri',
      icon: Truck,
      color: 'text-blue-600',
      keys: PERMISSIONS_LIST.filter((p) => p.category === 'Araç İşlemleri')
    },
    {
      id: 'rampa',
      title: 'Rampa & Saha Operasyonları',
      desc: 'Rampaya araç atama, boşaltma ve durum yönetimi',
      icon: WarehouseIcon,
      color: 'text-amber-600',
      keys: PERMISSIONS_LIST.filter((p) => p.category === 'Rampa Operasyonları')
    },
    {
      id: 'guvenlik',
      title: 'Güvenlik & Çıkış İşlemleri',
      desc: 'Nöbetçi güvenlik onayları ve sahadan çıkış izinleri',
      icon: ShieldAlert,
      color: 'text-emerald-600',
      keys: PERMISSIONS_LIST.filter((p) => p.category === 'Güvenlik & Çıkış')
    },
    {
      id: 'rapor',
      title: 'Planlama & Raporlama',
      desc: 'Beklenen sevkiyat yönetimi ve veri dışa aktarma',
      icon: Sliders,
      color: 'text-indigo-600',
      keys: PERMISSIONS_LIST.filter((p) => p.category === 'Planlama & Raporlar')
    }
  ];

  const countActivePermissions = (perms?: UserPermissions, role?: string) => {
    if (role === 'admin') return ALL_PERMISSIONS_KEYS.length;
    if (!perms) return 0;
    return ALL_PERMISSIONS_KEYS.filter((k) => !!perms[k]).length;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Kullanıcı & Kutucuklu İzin Yönetimi
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Granular RBAC
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Admin dışındaki kullanıcılara özel yetki kutucuklarını açıp kapatarak hassas yetkilendirme tanımlayabilirsiniz.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-6 custom-scroll text-xs">
          {/* User Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-slate-50/70 p-4 border border-slate-200 rounded-2xl space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between font-bold text-slate-800 pb-2 border-b border-slate-200">
              <span className="flex items-center gap-1.5 text-sm">
                {editingUser ? (
                  <>
                    <Edit className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-700">Kullanıcı Yetkilerini Düzenle:</span>
                    <span className="font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-xs">
                      {editingUser.username}
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-blue-600" />
                    Yeni Kullanıcı & Yetki Tanımla
                  </>
                )}
              </span>
              {editingUser && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-2.5 py-1 text-[11px] text-red-600 hover:bg-red-50 rounded-lg font-bold transition cursor-pointer"
                >
                  Düzenlemeden Vazgeç
                </button>
              )}
            </div>

            {/* Basic Info Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kullanıcı Adı *
                </label>
                <input
                  type="text"
                  placeholder="örn: ahmet.operasyon"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  className="w-full border border-slate-300 rounded-xl p-2 font-semibold bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Giriş Şifresi *
                </label>
                <input
                  type="text"
                  placeholder="Giriş Şifresi"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="w-full border border-slate-300 rounded-xl p-2 font-semibold bg-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kullanıcı Rolü *
                </label>
                <select
                  value={form.role}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full border border-slate-300 rounded-xl p-2 font-semibold bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Yönetici (Tüm Yetkiler Açık)</option>
                  <option value="personel">Operasyon / Personel (Özel Yetkili)</option>
                  <option value="security">Güvenlik Görevlisi</option>
                  <option value="guest">Misafir (Yalnızca İzleme)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Yetkili Saha / Depo
                </label>
                <select
                  value={form.depoId}
                  onChange={(e) => setForm({ ...form, depoId: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-xl p-2 font-semibold bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Tüm Sahalara / Depolara Yetkili</option>
                  {warehouses.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.ad}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkbox-based Permissions Section */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                    Kutucuklu Özel Yetki İzinleri
                    <span className="font-normal text-slate-500 text-[11px]">
                      ({form.role === 'admin' ? 'Yönetici Tüm Yetkilere Sahiptir' : `${countActivePermissions(form.permissions, form.role)} / ${ALL_PERMISSIONS_KEYS.length} Seçili`})
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Kullanıcının yapabileceği eylemleri kutucukları işaretleyerek veya kaldırarak belirleyiniz.
                  </p>
                </div>

                {form.role !== 'admin' && form.role !== 'guest' && (
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg transition border border-blue-200 cursor-pointer"
                    >
                      Tümünü Seç
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold rounded-lg transition border border-slate-200 cursor-pointer"
                    >
                      Tümünü Kaldır
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToRoleDefault}
                      className="px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold rounded-lg transition border border-amber-200 cursor-pointer"
                    >
                      Role Göre Varsayılan
                    </button>
                  </div>
                )}
              </div>

              {/* Role-specific Banners */}
              {form.role === 'admin' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3 text-purple-900 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs">Yönetici (Admin) Tam Erişim Modu</p>
                    <p className="text-[11px] text-purple-700">
                      Yöneticiler sistemdeki tüm araç girişleri, evrak onayları, rampa yönetimi, kullanıcı tanımlama ve anons işlemlerine sınırsız tam yetkilidir.
                    </p>
                  </div>
                </div>
              )}

              {form.role === 'guest' && (
                <div className="p-3 bg-slate-100 border border-slate-300 rounded-xl flex items-center gap-3 text-slate-800 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs">Misafir (Salt Okunur) Modu</p>
                    <p className="text-[11px] text-slate-600">
                      Misafir kullanıcılar panoları ve araç durumlarını sadece izleyebilir; veri ekleme, düzenleme veya silme yapamazlar.
                    </p>
                  </div>
                </div>
              )}

              {/* Categorized Permissions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <div
                      key={cat.id}
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
                        <CatIcon className={`w-4 h-4 ${cat.color} shrink-0`} />
                        <div>
                          <h5 className="font-bold text-slate-800 text-[11px]">{cat.title}</h5>
                          <p className="text-[9px] text-slate-400">{cat.desc}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {cat.keys.map((p) => {
                          const isChecked =
                            form.role === 'admin'
                              ? true
                              : form.role === 'guest'
                              ? false
                              : !!form.permissions[p.key];
                          const isDisabled = form.role === 'admin' || form.role === 'guest';

                          return (
                            <label
                              key={p.key}
                              onClick={() => handleTogglePermission(p.key)}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border transition select-none cursor-pointer ${
                                isDisabled
                                  ? 'opacity-70 bg-slate-50 border-slate-200 cursor-not-allowed'
                                  : isChecked
                                  ? 'bg-blue-50/70 border-blue-200 text-slate-900 shadow-xs'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                disabled={isDisabled}
                                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-[11px] flex items-center justify-between">
                                  <span>{p.title || p.label}</span>
                                  {isChecked && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 shrink-0">
                                      İzinli
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                  {p.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className={`w-full py-2.5 text-white font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  editingUser
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                }`}
              >
                {editingUser ? (
                  <>
                    <Edit className="w-4 h-4" />
                    Kullanıcı Bilgilerini & Kutucuk Yetkilerini Kaydet
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Sisteme Yetkilendirilmiş Kullanıcı Ekle
                  </>
                )}
              </button>
            </div>
          </form>

          {/* User List with Permissions Inspection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-600" />
                Mevcut Sistem Kullanıcıları & İzin Durumları ({users.length})
              </h4>
              <span className="text-[10px] text-slate-500">
                Her kullanıcının kutucuk yetkilerini inceleyebilirsiniz
              </span>
            </div>

            <div className="divide-y border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              {users.map((u) => {
                const isExpanded = expandedUserPerms === u.username;
                const activePermsCount = countActivePermissions(u.permissions, u.role);

                return (
                  <div key={u.username} className="bg-white hover:bg-slate-50/50 transition">
                    <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs">{u.username}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold capitalize ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : u.role === 'personel'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : u.role === 'security'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {u.role === 'personel'
                            ? 'Operasyon / Personel'
                            : u.role === 'admin'
                            ? 'Admin'
                            : u.role === 'security'
                            ? 'Güvenlik'
                            : 'Misafir'}
                        </span>

                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded border border-slate-200">
                          {getWarehouseNameById(u.depoId)}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedUserPerms(isExpanded ? null : u.username)
                          }
                          className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-blue-50 text-blue-700 font-bold rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                        >
                          <span>
                            {u.role === 'admin'
                              ? 'Tüm Yetkiler Açık'
                              : `${activePermsCount}/${ALL_PERMISSIONS_KEYS.length} Yetki`}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-slate-400 font-mono text-[10px] mr-1">
                          Şifre: {u.password}
                        </span>
                        <button
                          onClick={() => handleStartEdit(u)}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                          title="Kullanıcıyı ve Yetkilerini Düzenle"
                        >
                          <Edit className="w-3 h-3" /> Yetkileri Düzenle
                        </button>
                        <button
                          onClick={() => {
                            if (currentUser?.username === u.username) {
                              alert('Şu an oturum açmış olduğunuz kendi kullanıcınızı silemezsiniz.');
                              return;
                            }
                            onDeleteUser(u);
                          }}
                          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold text-[10px] transition cursor-pointer"
                          title="Kullanıcıyı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Permissions Overview */}
                    {isExpanded && (
                      <div className="p-3 bg-slate-50/80 border-t border-slate-200 text-[10px]">
                        <p className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          {u.username} Kullanıcısının Tanımlı İzin Durumu:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {PERMISSIONS_LIST.map((p) => {
                            const isPermitted =
                              u.role === 'admin'
                                ? true
                                : u.role === 'guest'
                                ? false
                                : u.permissions?.[p.key] ?? false;

                            return (
                              <div
                                key={p.key}
                                className={`p-1.5 rounded-lg border flex items-center gap-1.5 ${
                                  isPermitted
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                                    : 'bg-slate-100/70 border-slate-200 text-slate-400 line-through'
                                }`}
                              >
                                {isPermitted ? (
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <X className="w-3 h-3 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate">{p.title || p.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   4. DETAYLI ARAÇ BİLGİ & FOTOĞRAF İNCELEME MODALI
   ========================================================= */
interface DetailViewModalProps {
  vehicle: Vehicle | null;
  rampName?: string;
  onClose: () => void;
  onOpenPhotoGallery: (v: Vehicle) => void;
  onShareWhatsApp?: (v: Vehicle) => void;
}

export const DetailViewModal: React.FC<DetailViewModalProps> = ({
  vehicle,
  rampName,
  onClose,
  onOpenPhotoGallery,
  onShareWhatsApp
}) => {
  if (!vehicle) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden max-h-[92vh] flex flex-col border border-slate-200">
        {/* Modal Başlık */}
        <div className="px-4 sm:px-5 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Araç Detayı & Süreç Takibi</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {vehicle.dorsePlaka}
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Müşteri: <b>{vehicle.musteri}</b> {vehicle.cekiciPlaka ? `| Çekici: ${vehicle.cekiciPlaka}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal İçerik (Kaydırılabilir Alan) */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 text-xs custom-scroll">
          {/* Araç Temel Bilgi Kartı */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Müşteri Firması</span>
                <span className="font-bold text-slate-800 truncate block">{vehicle.musteri}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Dorse Plakası</span>
                <span className="font-bold text-blue-700 font-mono block">{vehicle.dorsePlaka}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Çekici Plakası</span>
                <span className="font-semibold text-slate-700 font-mono block">{vehicle.cekiciPlaka || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Konteynır No</span>
                <span className="font-semibold text-slate-700 font-mono block">{vehicle.konteynirNo || 'Yok'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Şoför Ad Soyad</span>
                <span className="font-semibold text-slate-700 block">{vehicle.soforAd}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Şoför Telefonu</span>
                <a
                  href={`tel:${cleanPhone(vehicle.soforTel)}`}
                  className="font-bold text-emerald-600 hover:underline inline-block"
                >
                  {vehicle.soforTel}
                </a>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Depo & İşlem</span>
                <span className="font-semibold text-slate-700 block">
                  {vehicle.depoTuru} / {vehicle.islemTuru}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px]">Nakliye Firması</span>
                <span className="font-semibold text-slate-700 truncate block">{vehicle.nakliyeFirmasi || '-'}</span>
              </div>
            </div>
          </div>

          {/* Güvenlik Notları (Varsa) */}
          {vehicle.guvenlikNotlari && vehicle.guvenlikNotlari.length > 0 && (
            <div className="space-y-1 p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
              <h4 className="font-bold text-[11px] text-amber-900 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Güvenlik & Operasyon Notları
              </h4>
              <div className="max-h-24 overflow-y-auto space-y-1 custom-scroll">
                {vehicle.guvenlikNotlari.map((n, idx) => (
                  <div key={idx} className="p-1.5 bg-white rounded-lg border border-amber-200/80 text-[10px] text-slate-700 flex justify-between gap-2">
                    <span><b>{n.time}:</b> {n.note}</span>
                    <span className="text-slate-400 shrink-0 font-medium">{n.author}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Açıklama (Varsa) */}
          {vehicle.aciklama && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11px]">
              <b>Açıklama:</b> {vehicle.aciklama}
            </div>
          )}

          {/* Fotoğraflar (Varsa) */}
          {vehicle.fotograflar && vehicle.fotograflar.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-700 mb-1.5 flex items-center gap-1.5 text-[11px]">
                <Camera className="w-3.5 h-3.5 text-blue-600" /> Kayıtlı Fotoğraflar ({vehicle.fotograflar.length})
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {vehicle.fotograflar.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Fotoğraf ${idx + 1}`}
                    onClick={() => onOpenPhotoGallery(vehicle)}
                    className="w-full h-20 object-cover rounded-lg border border-slate-200 hover:scale-105 transition cursor-pointer shadow-2xs"
                  />
                ))}
              </div>
            </div>
          )}

          {/* =========================================================
             3 AŞAMALI SÜREÇ & ZAMAN TAKİP PANELİ (EKRANA VE POP-UP'A TAM SIĞAN TASARIM)
             ========================================================= */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 sm:p-4 border border-slate-800 shadow-md space-y-3">
            {/* Süreç Başlık Çubuğu */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white flex items-center gap-2">
                    <span>Araç Süreç & Tarih Takibi</span>
                    <span className="text-[9px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                      Giriş → Rampa → Çıkış
                    </span>
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">Durum:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-black ${getStatusBadgeClass(vehicle.durum)}`}>
                  {vehicle.durum}
                </span>
              </div>
            </div>

            {/* 3 Aşamalı Süreç Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Aşama: Depo Kayıt Tarihi */}
              <div className="bg-slate-800/90 rounded-xl p-3 border border-emerald-500/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      <LogIn className="w-3 h-3 text-emerald-400" /> 1. Depo Kayıt
                    </span>
                    <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded">
                      Giriş Yapıldı
                    </span>
                  </div>

                  <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 text-center my-1">
                    <span className="text-[9px] text-slate-400 block">Tesis Kayıt Zamanı</span>
                    <span className="text-xs font-black font-mono text-emerald-300">
                      {getDepoKayitTarihi(vehicle)}
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-700/50 text-[10px] text-slate-400">
                  Güvenlik kapısından saha kabulü yapıldı.
                </div>
              </div>

              {/* 2. Aşama: Rampa Giriş Tarihi */}
              {(() => {
                const isRampada = vehicle.durum === 'RAMPADA';
                const isExited = vehicle.durum === 'ÇIKIŞ YAPTI';
                const hasRampHistory = isRampada || isExited || !!vehicle.rampayaGirisTarihi;
                const activeRampLabel = rampName || (vehicle.rampaId ? `Rampa ${vehicle.rampaId}` : 'Rampa');

                return (
                  <div className={`rounded-xl p-3 border flex flex-col justify-between ${
                    isRampada
                      ? 'bg-purple-950/50 border-purple-500 shadow-md shadow-purple-950/40'
                      : hasRampHistory
                      ? 'bg-slate-800/90 border-purple-500/40'
                      : 'bg-slate-800/40 border-slate-700/60 opacity-80'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          hasRampHistory
                            ? 'text-purple-300 bg-purple-500/10 border-purple-500/30'
                            : 'text-slate-400 bg-slate-800 border-slate-700'
                        }`}>
                          <Truck className="w-3 h-3 text-purple-400" /> 2. Rampa Giriş
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isRampada
                            ? 'bg-purple-600 text-white animate-pulse'
                            : hasRampHistory
                            ? 'bg-purple-950/80 text-purple-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isRampada ? 'Rampada' : hasRampHistory ? 'Tamamlandı' : 'Bekliyor'}
                        </span>
                      </div>

                      <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 text-center my-1">
                        <span className="text-[9px] text-slate-400 block">
                          {hasRampHistory ? `${activeRampLabel} Giriş Zamanı` : 'Rampa Giriş Zamanı'}
                        </span>
                        <span className={`text-xs font-black font-mono ${hasRampHistory ? 'text-purple-300' : 'text-slate-500'}`}>
                          {hasRampHistory ? getRampaGirisTarihi(vehicle) : 'Henüz Rampaya Alınmadı'}
                        </span>
                      </div>

                      {/* Rampada Geçen Süre Rozeti */}
                      <div className="mt-1 bg-purple-950/70 border border-purple-500/30 rounded-lg px-2 py-1 flex items-center justify-between text-[10px]">
                        <span className="text-purple-300 font-medium flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-purple-400" /> Rampada Geçen:
                        </span>
                        <span className="font-extrabold font-mono text-purple-200">
                          {getRampDurationText(vehicle)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-700/50 text-[10px] text-slate-400 flex items-center justify-between">
                      <span className="truncate">{hasRampHistory ? `${activeRampLabel} yanaşması yapıldı.` : 'Sıra bekleniyor.'}</span>
                      {vehicle.rampaId && (
                        <span className="font-bold text-[9px] text-purple-300 bg-purple-950 px-1 py-0.5 rounded border border-purple-800 shrink-0 ml-1">
                          {activeRampLabel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 3. Aşama: Rampa Çıkış Tarihi */}
              {(() => {
                const isExited = vehicle.durum === 'ÇIKIŞ YAPTI';

                return (
                  <div className={`rounded-xl p-3 border flex flex-col justify-between ${
                    isExited
                      ? 'bg-slate-900 border-rose-500/40'
                      : 'bg-slate-800/40 border-slate-700/60 opacity-80'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          isExited
                            ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                            : 'text-slate-400 bg-slate-800 border-slate-700'
                        }`}>
                          <LogOut className="w-3 h-3 text-rose-400" /> 3. Rampa Çıkış
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          isExited
                            ? 'bg-slate-800 text-rose-300'
                            : 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
                        }`}>
                          {isExited ? 'Çıkış Yapıldı' : 'Sahada Aktif'}
                        </span>
                      </div>

                      <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 text-center my-1">
                        <span className="text-[9px] text-slate-400 block">Saha Terk Zamanı</span>
                        <span className={`text-xs font-black font-mono ${isExited ? 'text-rose-300' : 'text-slate-500'}`}>
                          {isExited ? getRampaCikisTarihi(vehicle) : 'Henüz Çıkış Yapmadı'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-700/50 text-[10px] text-slate-400">
                      {isExited ? 'İrsaliye teslimi tamamlandı ve araç sahadan ayrıldı.' : 'Araç sahada operasyonel süreçtedir.'}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Operasyonel Özet Barı */}
            <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-slate-300">
                <div className="flex items-center gap-1 text-[11px]">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span className="text-slate-400">Tesiste Toplam:</span>
                  <span className="font-black text-blue-400 font-mono">
                    {getDurationText(vehicle)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <WarehouseIcon className="w-3 h-3 text-purple-400" />
                  <span className="text-slate-400">Rampada Süre:</span>
                  <span className="font-black text-purple-300 font-mono">
                    {getRampDurationText(vehicle)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>Depo: <b className="text-slate-200">{vehicle.depoTuru}</b></span>
                <span>•</span>
                <span>İşlem: <b className="text-slate-200">{vehicle.islemTuru}</b></span>
                <span>•</span>
                <span>Rampa: <b className="text-purple-300">{rampName || (vehicle.rampaId ? `Rampa ${vehicle.rampaId}` : 'Yok')}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Alt Kapat Çubuğu */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {onShareWhatsApp ? (
            <button
              onClick={() => onShareWhatsApp(vehicle)}
              className="px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-xs flex items-center gap-1.5 active:scale-95"
              title="Araç bilgilerini ve fotoğraflarını WhatsApp grubuna aktar"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Grubuna Paylaş</span>
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-xs"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   5. ARAMA DESTEKLİ RAMPA ARAÇ ATAMA MODALI
   ========================================================= */
interface RampAssignModalProps {
  ramp: Ramp | null;
  vehicles: Vehicle[];
  currentUser?: User | null;
  onClose: () => void;
  onAssign: (vehicle: Vehicle, ramp: Ramp) => void;
  onCall: (vehicle: Vehicle, ramp: Ramp) => void;
}

export const RampAssignModal: React.FC<RampAssignModalProps> = ({
  ramp,
  vehicles,
  currentUser,
  onClose,
  onAssign,
  onCall
}) => {
  const [search, setSearch] = useState('');

  if (!ramp) return null;

  const eligibleVehicles = vehicles.filter(
    (v) =>
      v.durum?.trim().toUpperCase() === 'EVRAK HAZIR' &&
      (!ramp.depoId || (v.depoId || 1) === ramp.depoId)
  );

  const filtered = eligibleVehicles.filter((v) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      v.dorsePlaka.toLowerCase().includes(q) ||
      v.musteri.toLowerCase().includes(q) ||
      v.soforAd.toLowerCase().includes(q) ||
      v.islemTuru.toLowerCase().includes(q)
    );
  });

  filtered.sort((a, b) => {
    if (a.isAcik && !b.isAcik) return -1;
    if (!a.isAcik && b.isAcik) return 1;
    return b.id - a.id;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <WarehouseIcon className="w-4 h-4 text-blue-400" /> {ramp.ad} - Araç Atama / Çağırma
            </h3>
            <p className="text-[10px] text-slate-400">
              Evrakı hazır aracı doğrudan atayabilir veya güvenlik için çağırabilirsiniz
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Plaka, Müşteri, Şoför veya İşlem Türü Ara..."
            className="w-full px-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          />
        </div>

        <div className="p-4 overflow-y-auto custom-scroll flex-1 space-y-2">
          {filtered.map((v) => (
            <div
              key={v.id}
              className={`p-3 border rounded-xl transition flex items-center justify-between shadow-sm ${
                v.isAcik
                  ? 'border-red-500 bg-red-50/60'
                  : 'bg-white border-slate-200 hover:border-blue-500 hover:bg-blue-50/50'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-800">{v.dorsePlaka}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded">
                    {v.islemTuru}
                  </span>
                  {v.isAcik && (
                    <span className="animate-pulse text-[9px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                      <Bolt className="w-2.5 h-2.5" /> ACİL ARAÇ
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">{v.musteri}</p>
                <p className="text-[10px] text-slate-400">
                  Şoför: {v.soforAd} ({v.soforTel})
                </p>
              </div>

              <div className="flex gap-1.5">
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => onCall(v, ramp)}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold text-[10px] rounded-lg transition shadow-sm flex items-center gap-1 cursor-pointer"
                    title="Güvenlik ve Sahaya Bildirim Düşer (Sadece Admin)"
                  >
                    Çağır
                  </button>
                )}
                <button
                  onClick={() => onAssign(v, ramp)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Ata
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-8 px-4 text-slate-400 text-xs space-y-2">
              <p className="font-semibold text-slate-600">
                {search.trim()
                  ? 'Arama kriterine uygun araç bulunamadı.'
                  : "Bu rampa için çağrılabilecek 'EVRAK HAZIR' durumunda araç bulunamadı."}
              </p>
              {!search.trim() && (
                <p className="text-[11px] text-slate-500">
                  Bekleme sahasındaki araçların evrakları tamamlandığında, Araç Yönetimi ekranından durumunu &apos;EVRAK HAZIR&apos; yaparak buraya atayabilirsiniz.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   6. GÜVENLİK ARAÇ KAYIT MODALI
   ========================================================= */
interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  selectedDepoId: number;
  currentUser: User | null;
  driverHistory: { ad: string; tel: string }[];
  initialValues?: Partial<Vehicle> | null;
  customers?: Customer[];
  onAddNewCustomer?: (name: string) => void;
  onSave: (vehicleData: Partial<Vehicle>) => void;
}

export const NewVehicleModal: React.FC<NewVehicleModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  selectedDepoId,
  currentUser,
  driverHistory,
  initialValues,
  customers = [],
  onAddNewCustomer = () => {},
  onSave
}) => {
  const [form, setForm] = useState({
    depoId: initialValues?.depoId || (selectedDepoId === 0 ? 1 : selectedDepoId),
    cekiciPlaka: initialValues?.cekiciPlaka || '',
    dorsePlaka: initialValues?.dorsePlaka || '',
    konteynirNo: initialValues?.konteynirNo || '',
    soforAd: initialValues?.soforAd || '',
    soforTel: initialValues?.soforTel || '',
    nakliyeFirmasi: initialValues?.nakliyeFirmasi || '',
    musteri: initialValues?.musteri || '',
    depoTuru: (initialValues?.depoTuru as 'Antrepo' | 'Serbest Depo') || 'Antrepo',
    islemTuru: (initialValues?.islemTuru === 'Tahliye' ? 'Boşaltma' : initialValues?.islemTuru as 'Boşaltma' | 'Yükleme') || 'Boşaltma',
    aciklama: initialValues?.aciklama || '',
    fotograflar: initialValues?.fotograflar || ([] as string[]),
    isAcik: initialValues?.isAcik || false
  });

  const [driverSuggestions, setDriverSuggestions] = useState<{ ad: string; tel: string }[]>([]);

  if (!isOpen) return null;

  const handleDriverInput = (val: string) => {
    setForm((prev) => ({ ...prev, soforAd: val }));
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) {
      setDriverSuggestions([]);
      return;
    }
    const matches = driverHistory.filter((d) => d.ad.toLowerCase().includes(trimmed));
    setDriverSuggestions(matches);
  };

  const handleSelectDriver = (driver: { ad: string; tel: string }) => {
    setForm((prev) => ({ ...prev, soforAd: driver.ad, soforTel: driver.tel }));
    setDriverSuggestions([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    (Array.from(files) as File[]).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 800;
          const scale = maxW / img.width;
          canvas.width = maxW;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setForm((prev) => ({
              ...prev,
              fotograflar: [...prev.fotograflar, compressedDataUrl]
            }));
          }
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      fotograflar: prev.fotograflar.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dorsePlaka.trim()) {
      alert('Dorse Plakası zorunludur.');
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-400" /> Güvenlik Araç Kayıt Ekranı
            </h3>
            <p className="text-[10px] text-slate-400">Aracın bilgilerini ve fotoğraflarını kaydederek sahaya alınız</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 custom-scroll text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Kayıt Yapılan Depo/Saha *</label>
              <select
                value={form.depoId}
                onChange={(e) => setForm({ ...form, depoId: Number(e.target.value) })}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-800 bg-slate-50"
              >
                {warehouses.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.ad}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Araç Çekici Plakası</label>
              <input
                type="text"
                value={form.cekiciPlaka}
                onChange={(e) => setForm({ ...form, cekiciPlaka: e.target.value.toUpperCase() })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="Örn: 34 ABC 123"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Araç Dorse Plakası <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.dorsePlaka}
                onChange={(e) => setForm({ ...form, dorsePlaka: e.target.value.toUpperCase() })}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-bold"
                placeholder="Örn: 34 TR 1234"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Araç Konteynır Numarası (Opsiyonel)</label>
              <input
                type="text"
                value={form.konteynirNo}
                onChange={(e) => setForm({ ...form, konteynirNo: e.target.value.toUpperCase() })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="Örn: MSCU1234567"
              />
            </div>

            <div className="relative">
              <label className="block font-semibold text-slate-600 mb-1">
                Şoför Adı Soyadı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.soforAd}
                onChange={(e) => handleDriverInput(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Şoför Adı Soyadı"
              />
              {driverSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-36 overflow-y-auto">
                  {driverSuggestions.map((d) => (
                    <div
                      key={d.ad}
                      onClick={() => handleSelectDriver(d)}
                      className="p-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 last:border-0"
                    >
                      <p className="font-bold text-slate-800">{d.ad}</p>
                      <p className="text-[10px] text-slate-500">{d.tel}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Şoför Telefon Numarası <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.soforTel}
                onChange={(e) => setForm({ ...form, soforTel: e.target.value })}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="05XX XXX XX XX"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Nakliye Firması</label>
              <input
                type="text"
                value={form.nakliyeFirmasi}
                onChange={(e) => setForm({ ...form, nakliyeFirmasi: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nakliye Firması"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Müşteri (Firma) <span className="text-red-500">*</span>
              </label>
              <CustomerAutocomplete
                value={form.musteri}
                onChange={(val) => setForm({ ...form, musteri: val })}
                customers={customers}
                onAddNewCustomer={onAddNewCustomer}
                required
                placeholder="Firma / Müşteri Ara veya Yaz..."
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Depo Türü</label>
              <select
                value={form.depoTuru}
                onChange={(e) => setForm({ ...form, depoTuru: e.target.value as 'Antrepo' | 'Serbest Depo' })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Antrepo">Antrepo</option>
                <option value="Serbest Depo">Serbest Depo</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                İşlem Türü <span className="text-red-500">*</span>
              </label>
              <select
                value={form.islemTuru}
                onChange={(e) =>
                  setForm({ ...form, islemTuru: e.target.value as 'Boşaltma' | 'Yükleme' })
                }
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Boşaltma">Boşaltma</option>
                <option value="Yükleme">Yükleme</option>
              </select>
            </div>

            {currentUser?.role === 'admin' && (
              <div className="flex items-center gap-2 pt-5">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isAcik}
                    onChange={(e) => setForm({ ...form, isAcik: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600" />
                  <span className="ml-2 text-xs font-bold text-red-600 flex items-center gap-1">
                    <Bolt className="w-3.5 h-3.5" /> ACİL ARAÇ
                  </span>
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Açıklama</label>
            <textarea
              rows={2}
              value={form.aciklama}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notlar veya özel talimatlar..."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-2">
              Fotoğraflar (Çekici, Dorse veya Mühür)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer transition flex items-center gap-2 shadow-md shadow-blue-500/20">
                <Camera className="w-4 h-4" /> Kamera Aç / Çek
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer transition flex items-center gap-2 border border-slate-200">
                <FolderOpen className="w-4 h-4" /> Galeriden Seç
                <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {form.fotograflar.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {form.fotograflar.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group shadow-sm"
                  >
                    <img src={img} alt={`Kayıt Fotoğraf ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Kaydet ve Beklemeye Al
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   7. FOTOĞRAF GALERİSİ MODALI
   ========================================================= */
interface PhotoGalleryModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
  onShareWhatsApp?: (vehicle: Vehicle) => void;
}

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({ vehicle, onClose, onShareWhatsApp }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!vehicle) return null;

  const photos = vehicle.fotograflar || [];

  const handlePrev = () => {
    if (!photos.length) return;
    setActiveIdx((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleNext = () => {
    if (!photos.length) return;
    setActiveIdx((prev) => (prev + 1) % photos.length);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-5 text-white flex flex-col justify-between relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-slate-200">Araç Fotoğrafları</h3>
              <span className="bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[11px] font-black font-mono">
                {vehicle.dorsePlaka}
              </span>
              {vehicle.cekiciPlaka && (
                <span className="text-slate-400 text-[10px]">Çekici: {vehicle.cekiciPlaka}</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
              <span>👤 <b>{vehicle.musteri || 'Müşteri'}</b></span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{vehicle.islemTuru}</span>
              {vehicle.soforAd && (
                <>
                  <span>•</span>
                  <span>Şoför: {vehicle.soforAd}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {onShareWhatsApp && (
              <button
                type="button"
                onClick={() => onShareWhatsApp(vehicle)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}
            <span className="text-xs font-mono bg-slate-800 px-3 py-1 rounded-full text-slate-300">
              {photos.length > 0 ? activeIdx + 1 : 0} / {photos.length}
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl cursor-pointer p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="my-6 flex items-center justify-center relative min-h-[300px]">
          {photos.length > 0 ? (
            <div className="w-full flex items-center justify-center relative">
              <img
                src={photos[activeIdx]}
                alt={`Önizleme ${activeIdx + 1}`}
                className="max-h-[60vh] max-w-full object-contain rounded-2xl border border-slate-800 shadow-2xl"
              />

              {photos.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-blue-600 text-white flex items-center justify-center transition shadow-lg cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-800/80 hover:bg-blue-600 text-white flex items-center justify-center transition shadow-lg cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-xs py-12">Bu araç için yüklenmiş fotoğraf bulunmamaktadır.</div>
          )}
        </div>

        {photos.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto pt-2 border-t border-slate-800">
            {photos.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setActiveIdx(idx)}
                className={`w-12 h-12 rounded-xl overflow-hidden cursor-pointer transition ${
                  activeIdx === idx ? 'ring-2 ring-blue-500 opacity-100 scale-105' : 'opacity-40 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Küçük ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   8. DETAY VE DÜZENLEME MODALI
   ========================================================= */
interface EditVehicleModalProps {
  vehicle: Vehicle | null;
  ramps: Ramp[];
  warehouses: Warehouse[];
  currentUser: User | null;
  customers?: Customer[];
  onAddNewCustomer?: (name: string) => void;
  onClose: () => void;
  onSave: (updated: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
}

export const EditVehicleModal: React.FC<EditVehicleModalProps> = ({
  vehicle,
  ramps,
  warehouses,
  currentUser,
  customers = [],
  onAddNewCustomer = () => {},
  onClose,
  onSave,
  onDelete
}) => {
  const [form, setForm] = useState<Vehicle | null>(() => {
    if (!vehicle) return null;
    return {
      ...vehicle,
      cekiciPlaka: vehicle.cekiciPlaka || '',
      dorsePlaka: vehicle.dorsePlaka || '',
      konteynirNo: vehicle.konteynirNo || '',
      soforAd: vehicle.soforAd || '',
      soforTel: vehicle.soforTel || '',
      musteri: vehicle.musteri || '',
      nakliyeFirmasi: vehicle.nakliyeFirmasi || '',
      depoTuru: vehicle.depoTuru || 'Antrepo',
      islemTuru: (vehicle.islemTuru === 'Tahliye' ? 'Boşaltma' : vehicle.islemTuru) || 'Boşaltma',
      durum: vehicle.durum || 'BEKLEMEDE',
      aciklama: vehicle.aciklama || '',
      fotograflar: vehicle.fotograflar ? [...vehicle.fotograflar] : [],
      depoId: vehicle.depoId || 1
    };
  });

  useEffect(() => {
    if (vehicle) {
      setForm({
        ...vehicle,
        cekiciPlaka: vehicle.cekiciPlaka || '',
        dorsePlaka: vehicle.dorsePlaka || '',
        konteynirNo: vehicle.konteynirNo || '',
        soforAd: vehicle.soforAd || '',
        soforTel: vehicle.soforTel || '',
        musteri: vehicle.musteri || '',
        nakliyeFirmasi: vehicle.nakliyeFirmasi || '',
        depoTuru: vehicle.depoTuru || 'Antrepo',
        islemTuru: (vehicle.islemTuru === 'Tahliye' ? 'Boşaltma' : vehicle.islemTuru) || 'Boşaltma',
        durum: vehicle.durum || 'BEKLEMEDE',
        aciklama: vehicle.aciklama || '',
        fotograflar: vehicle.fotograflar ? [...vehicle.fotograflar] : [],
        depoId: vehicle.depoId || 1
      });
    }
  }, [vehicle]);

  if (!vehicle || !form) return null;

  const getAvailableRampsForVehicle = (currentRampId: number | null = null) => {
    const vDepo = form?.depoId || 1;
    return ramps.filter(
      (r) => (!r.depoId || r.depoId === vDepo) && (r.durum === 'Boş' || r.id === currentRampId)
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    (Array.from(files) as File[]).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxW = 800;
          const scale = maxW / img.width;
          canvas.width = maxW;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setForm((prev) =>
              prev
                ? {
                    ...prev,
                    fotograflar: [...(prev.fotograflar || []), compressedDataUrl]
                  }
                : null
            );
          }
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (idx: number) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            fotograflar: (prev.fotograflar || []).filter((_, i) => i !== idx)
          }
        : null
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dorsePlaka.trim()) {
      alert('Dorse Plakası zorunludur.');
      return;
    }
    if (form.durum === 'EVRAK HAZIR' && vehicle.durum !== 'EVRAK HAZIR' && currentUser?.role !== 'admin') {
      alert("Bir aracın durumunu 'EVRAK HAZIR' yapma yetkisi sadece Yöneticiye (Admin) aittir.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Edit className="w-4 h-4 text-blue-400" /> Araç Detayı & Bilgileri Güncelle
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 custom-scroll text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Depo / Saha *</label>
              <select
                value={form.depoId}
                onChange={(e) => {
                  const newDepoId = Number(e.target.value);
                  setForm({
                    ...form,
                    depoId: newDepoId,
                    rampaId: form.depoId === newDepoId ? form.rampaId : null
                  });
                }}
                disabled={currentUser?.role !== 'admin'}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none font-bold text-slate-800 bg-slate-50"
              >
                {warehouses.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.ad}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Çekici Plakası</label>
              <input
                type="text"
                value={form.cekiciPlaka || ''}
                onChange={(e) => setForm({ ...form, cekiciPlaka: e.target.value.toUpperCase() })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="Örn: 34 ABC 123"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Dorse Plakası <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.dorsePlaka || ''}
                onChange={(e) => setForm({ ...form, dorsePlaka: e.target.value.toUpperCase() })}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 uppercase font-bold"
                placeholder="Örn: 34 TR 1234"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Konteynır No</label>
              <input
                type="text"
                value={form.konteynirNo || ''}
                onChange={(e) => setForm({ ...form, konteynirNo: e.target.value.toUpperCase() })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="Örn: MSCU1234567"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Şoför Adı Soyadı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.soforAd || ''}
                onChange={(e) => setForm({ ...form, soforAd: e.target.value })}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Şoför Adı Soyadı"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Şoför Telefonu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.soforTel || ''}
                onChange={(e) => setForm({ ...form, soforTel: e.target.value })}
                required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="05XX XXX XX XX"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Nakliye Firması</label>
              <input
                type="text"
                value={form.nakliyeFirmasi || ''}
                onChange={(e) => setForm({ ...form, nakliyeFirmasi: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nakliye Firması"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Müşteri Firması <span className="text-red-500">*</span>
              </label>
              <CustomerAutocomplete
                value={form.musteri || ''}
                onChange={(val) => setForm({ ...form, musteri: val })}
                customers={customers}
                onAddNewCustomer={onAddNewCustomer}
                required
                placeholder="Firma / Müşteri Ara veya Yaz..."
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Depo Türü</label>
              <select
                value={form.depoTuru}
                onChange={(e) => setForm({ ...form, depoTuru: e.target.value as 'Antrepo' | 'Serbest Depo' })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Antrepo">Antrepo</option>
                <option value="Serbest Depo">Serbest Depo</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">İşlem Türü</label>
              <select
                value={form.islemTuru === 'Tahliye' ? 'Boşaltma' : form.islemTuru}
                onChange={(e) =>
                  setForm({ ...form, islemTuru: e.target.value as 'Boşaltma' | 'Yükleme' })
                }
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Boşaltma">Boşaltma</option>
                <option value="Yükleme">Yükleme</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Araç Durumu</label>
              <select
                value={form.durum}
                onChange={(e) => setForm({ ...form, durum: e.target.value as Vehicle['durum'] })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                <option value="BEKLEMEDE">BEKLEMEDE</option>
                <option value="EVRAK HAZIR" disabled={currentUser?.role !== 'admin' && form.durum !== 'EVRAK HAZIR'}>
                  EVRAK HAZIR {currentUser?.role !== 'admin' && form.durum !== 'EVRAK HAZIR' ? '(Sadece Admin)' : ''}
                </option>
                <option value="RAMPADA">RAMPADA</option>
                <option value="ÇIKIŞ YAPTI">ÇIKIŞ YAPTI</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Rampa Ataması</label>
              <select
                value={form.rampaId ?? ''}
                onChange={(e) => {
                  const rId = e.target.value ? Number(e.target.value) : null;
                  setForm({
                    ...form,
                    rampaId: rId,
                    durum: rId && form.durum !== 'RAMPADA' ? 'RAMPADA' : form.durum
                  });
                }}
                disabled={form.durum !== 'EVRAK HAZIR' && form.durum !== 'RAMPADA'}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Rampa Atanmadı</option>
                {getAvailableRampsForVehicle(form.rampaId).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.ad}
                  </option>
                ))}
              </select>
            </div>

            {currentUser?.role === 'admin' && (
              <div className="flex items-center gap-2 pt-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isAcik || false}
                    onChange={(e) => setForm({ ...form, isAcik: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600" />
                  <span className="ml-2 text-xs font-bold text-red-600 flex items-center gap-1">
                    <Bolt className="w-3.5 h-3.5" /> ACİL ARAÇ
                  </span>
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Açıklama & Notlar</label>
            <textarea
              rows={2}
              value={form.aciklama || ''}
              onChange={(e) => setForm({ ...form, aciklama: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Araç veya yük ile ilgili notlar..."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-2">Fotoğraflar</label>
            <div className="flex items-center gap-3 mb-2">
              <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer transition text-xs border border-slate-200 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Yeni Fotoğraf Ekle
                <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {form.fotograflar && form.fotograflar.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {form.fotograflar.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border group">
                    <img src={img} alt={`Fotoğraf ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(vehicle)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Aracı Sil
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Değişiklikleri Kaydet
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   9. ŞİFRE DEĞİŞTİRME MODALI
   ========================================================= */
interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onChangePassword: (username: string, newPass: string) => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  users,
  onChangePassword
}) => {
  const [targetUser, setTargetUser] = useState(users[0]?.username || '');
  const [newPassword, setNewPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      alert('Lütfen geçerli bir şifre giriniz.');
      return;
    }
    onChangePassword(targetUser, newPassword.trim());
    setNewPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Key className="w-4 h-4 text-blue-600" /> Kullanıcı Şifresi Değiştir (Yönetici)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Kullanıcı Seçin</label>
            <select
              value={targetUser}
              onChange={(e) => setTargetUser(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none"
            >
              {users.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.username} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Yeni Şifre</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none"
              placeholder="Yeni şifre giriniz"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl cursor-pointer"
            >
              Güncelle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   10. RAMPA ARAÇ ÇIKARMA VE ÇIKIŞ YAPMA MODALI
   ========================================================= */
interface ReleaseRampVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  rampName: string;
  currentUser?: User | null;
  onReleaseAndExit: (vehicle: Vehicle) => void;
  onReleaseOnly: (vehicle: Vehicle) => void;
}

export const ReleaseRampVehicleModal: React.FC<ReleaseRampVehicleModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  rampName,
  currentUser,
  onReleaseAndExit,
  onReleaseOnly
}) => {
  if (!isOpen || !vehicle) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-100">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Rampa İşlemini Tamamla</h3>
              <p className="text-[11px] text-blue-600 font-semibold">{rampName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Araç Kart Özeti */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block">Dorse Plakası</span>
              <span className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                {vehicle.dorsePlaka}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold block">Müşteri / Firma</span>
              <span className="font-bold text-blue-700">{vehicle.musteri || '-'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
            <div>
              <span className="text-slate-400">Çekici: </span>
              <span className="font-semibold text-slate-700">{vehicle.cekiciPlaka || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400">Konteynır: </span>
              <span className="font-semibold text-slate-700">{vehicle.konteynirNo || 'Yok'}</span>
            </div>
            <div>
              <span className="text-slate-400">İşlem: </span>
              <span className="font-semibold text-slate-700">{vehicle.islemTuru} ({vehicle.depoTuru})</span>
            </div>
            <div>
              <span className="text-slate-400">Şoför: </span>
              <span className="font-semibold text-slate-700">{vehicle.soforAd || '-'}</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Bu aracın <b>{rampName}</b> üzerindeki yükleme/tahliye işlemi tamamlandı. Lütfen uygulamak istediğiniz işlemi seçiniz:
        </p>

        {/* Eylem Butonları */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onReleaseAndExit(vehicle)}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-2.5 shadow-md shadow-red-500/20 cursor-pointer transition active:scale-[0.99]"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <div>Rampadan Çıkar & Sahadan Çıkış Yap</div>
              <div className="text-[10px] font-normal text-red-100">Aracı rampadan indirir ve sahadan ÇIKIŞ YAPTI olarak işler</div>
            </div>
          </button>

          {currentUser?.role === 'admin' ? (
            <button
              type="button"
              onClick={() => onReleaseOnly(vehicle)}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-xs flex items-center gap-2.5 shadow-md shadow-amber-500/20 cursor-pointer transition active:scale-[0.99]"
            >
              <WarehouseIcon className="w-4 h-4 shrink-0" />
              <div className="text-left">
                <div>Sadece Rampadan Çıkar (Sahada Beklet)</div>
                <div className="text-[10px] font-medium text-slate-800">Rampayı hemen boşaltır, araç sahada EVRAK HAZIR olarak kalır</div>
              </div>
            </button>
          ) : (
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 text-center">
              ℹ️ Rampadaki aracı EVRAK HAZIR durumuna geri alma yetkisi sadece Yöneticidedir (Admin).
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer transition"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   11. GENEL ONAY MODALI (CONFIRM DIALOG)
   ========================================================= */
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Evet, Onayla',
  cancelText = 'Vazgeç',
  variant = 'danger',
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-3 border border-slate-100">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <AlertTriangle className={`w-4 h-4 ${variant === 'danger' ? 'text-red-600' : 'text-amber-500'}`} />
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs cursor-pointer transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 font-bold text-xs rounded-xl shadow cursor-pointer transition ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
                : variant === 'warning'
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 shadow-amber-500/20'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   12. ADMIN DEPO & SAHA YÖNETİMİ MODALI (AKTİF / PASİF)
   ========================================================= */
interface WarehouseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  onToggleStatus: (warehouseId: number) => void;
  onAddWarehouse: (name: string) => void;
  onEditWarehouse: (id: number, newName: string) => void;
}

export const WarehouseManagementModal: React.FC<WarehouseManagementModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  onToggleStatus,
  onAddWarehouse,
  onEditWarehouse
}) => {
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const activeCount = warehouses.filter((w) => w.aktif !== false).length;
  const passiveCount = warehouses.filter((w) => w.aktif === false).length;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouseName.trim()) return;
    onAddWarehouse(newWarehouseName.trim());
    setNewWarehouseName('');
  };

  const handleStartEdit = (w: Warehouse) => {
    setEditingId(w.id);
    setEditingName(w.ad);
  };

  const handleSaveEdit = (id: number) => {
    if (!editingName.trim()) return;
    onEditWarehouse(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Depo & Saha Yönetimi</h3>
              <p className="text-[11px] text-slate-300">Depoları aktif/pasif yapma ve tesis yönetimi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs custom-scroll">
          {/* Bilgi ve İstatistik Kutusu */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                Görünürlük Kuralları
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold text-[10px]">
                  {activeCount} Aktif Depo
                </span>
                {passiveCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full font-bold text-[10px]">
                    {passiveCount} Pasif Depo
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Pasif edilen depolar; şoför/misafir giriş ekranında, araç kabul formlarında, rapor filtrelerinde ve üst depo seçicilerinde <b>tamamen gizlenir</b>. Yalnızca <b>aktif</b> olan depolar listelenir.
            </p>
          </div>

          {/* Yeni Depo Ekleme Formu */}
          <form onSubmit={handleAddSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 space-y-2">
            <label className="font-bold text-slate-700 block text-xs">Yeni Depo / Tesis Ekle</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newWarehouseName}
                onChange={(e) => setNewWarehouseName(e.target.value)}
                placeholder="Örn: Depo 4 - Soğuk Hava Sahası..."
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 font-medium"
              />
              <button
                type="submit"
                disabled={!newWarehouseName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> Ekle
              </button>
            </div>
          </form>

          {/* Depo Listesi */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-700 text-xs flex items-center justify-between">
              <span>Mevcut Depolar ({warehouses.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Aktif/Pasif durumunu tek tıkla değiştirebilirsiniz</span>
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              {warehouses.map((w) => {
                const isAktif = w.aktif !== false;
                const isEditing = editingId === w.id;

                return (
                  <div
                    key={w.id}
                    className={`p-3 sm:p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isAktif ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/90 opacity-85'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-xs ${
                          isAktif
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600 border border-slate-300'
                        }`}
                      >
                        #{w.id}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 border border-blue-400 rounded-lg bg-white outline-none text-xs font-bold text-slate-800"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(w.id)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                          >
                            Kaydet
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] cursor-pointer"
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs truncate">{w.ad}</span>
                            {isAktif ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[9px] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Aktif (Görünür)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[9px] flex items-center gap-1">
                                <EyeOff className="w-3 h-3 text-rose-500" />
                                Pasif (Gizli)
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {isAktif
                              ? 'Bu depo sistem genelinde açık ve araç kabulüne uygundur.'
                              : 'Bu depo kullanıcılardan gizlenmiştir, işlem kabul etmez.'}
                          </p>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(w)}
                          title="Depo Adını Düzenle"
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition border border-slate-200 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleStatus(w.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                            isAktif
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          }`}
                        >
                          {isAktif ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                              <span>Pasif Et</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aktif Et</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow transition cursor-pointer"
          >
            Tamamlandı / Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
