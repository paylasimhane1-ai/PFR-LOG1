import { Warehouse, User, Ramp, Vehicle, ExpectedVehicle, AppNotification, ChatMessage, Customer } from '../types';
import { DEFAULT_ADMIN_PERMISSIONS, DEFAULT_SECURITY_PERMISSIONS, DEFAULT_GUEST_PERMISSIONS } from '../utils/permissions';

export const initialCustomers: Customer[] = [
  { id: 'cust_1', name: 'Örnek Lojistik A.Ş.', vergiNo: '1234567890', yetkili: 'Ahmet Yılmaz', telefon: '0212 555 10 20' },
  { id: 'cust_2', name: 'Ekol Lojistik', vergiNo: '2345678901', yetkili: 'Mehmet Demir', telefon: '0216 444 20 30' },
  { id: 'cust_3', name: 'Mars Lojistik', vergiNo: '3456789012', yetkili: 'Ayşe Kaya', telefon: '0212 333 40 50' },
  { id: 'cust_4', name: 'Borusan Lojistik', vergiNo: '4567890123', yetkili: 'Caner Öz', telefon: '0216 222 50 60' },
  { id: 'cust_5', name: 'Netlog Lojistik', vergiNo: '5678901234', yetkili: 'Selin Şen', telefon: '0212 777 80 90' },
  { id: 'cust_6', name: 'Horoz Lojistik', vergiNo: '6789012345', yetkili: 'Burak Ak', telefon: '0216 888 90 01' },
  { id: 'cust_7', name: 'Trendyol Depolama', vergiNo: '7890123456', yetkili: 'Gökhan Çelik', telefon: '0850 333 00 11' },
  { id: 'cust_8', name: 'BİM Mağazacılık A.Ş.', vergiNo: '8901234567', yetkili: 'Serkan Yıldız', telefon: '0216 567 89 00' },
  { id: 'cust_9', name: 'Migros Ticaret A.Ş.', vergiNo: '9012345678', yetkili: 'Hakan Er', telefon: '0216 576 00 00' }
];

export const initialWarehouses: Warehouse[] = [
  { id: 1, ad: 'Depo 1 - Ana Depo', aktif: true },
  { id: 2, ad: 'Depo 2 - Lojistik Depo', aktif: true },
  { id: 3, ad: 'Depo 3 - Antrepo Saha', aktif: true }
];

export const initialUsers: User[] = [
  { username: 'admin', password: 'admin', role: 'admin', depoId: 0, permissions: DEFAULT_ADMIN_PERMISSIONS },
  { username: 'Güvenlik', password: 'Güvenlik123', role: 'security', depoId: 1, permissions: DEFAULT_SECURITY_PERMISSIONS },
  { username: 'Misafir', password: 'Misafir123', role: 'guest', depoId: 0, permissions: DEFAULT_GUEST_PERMISSIONS }
];

export const initialRamps: Ramp[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  ad: `Rampa ${i + 1}`,
  durum: 'Boş'
}));

// Sistem sıfırdan başlama: Araç listeleri boş başlatılır
export const initialVehicles: Vehicle[] = [];

export const initialExpectedVehicles: ExpectedVehicle[] = [];

export const initialNotifications: AppNotification[] = [];

export const initialChatMessages: ChatMessage[] = [];
