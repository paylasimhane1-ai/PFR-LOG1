import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  User,
  Warehouse,
  Ramp,
  Vehicle,
  ExpectedVehicle,
  AppNotification,
  ChatMessage,
  ChatReply,
  ActiveTab,
  Customer,
  WhatsAppConfig,
  PushNotificationSettings
} from './types';
import {
  initialWarehouses,
  initialUsers,
  initialRamps,
  initialVehicles,
  initialExpectedVehicles,
  initialNotifications,
  initialChatMessages,
  initialCustomers
} from './data/initialData';
import {
  cleanPhone,
  exportVehiclesToCsv
} from './utils/helpers';
import { LoginView } from './components/LoginView';
import { GuestPortal } from './components/GuestPortal';
import { DashboardView } from './components/DashboardView';
import { ExpectedVehiclesView } from './components/ExpectedVehiclesView';
import { LiveTrackingView } from './components/LiveTrackingView';
import { VehicleManagementView } from './components/VehicleManagementView';
import { RampManagementView } from './components/RampManagementView';
import { ReportsView } from './components/ReportsView';
import { ChatWidget } from './components/ChatWidget';
import { CustomerManagementModal } from './components/CustomerManagementModal';
import { WhatsAppSettingsModal } from './components/WhatsAppSettingsModal';
import { PushNotificationSettingsModal } from './components/PushNotificationSettingsModal';
import { WhatsAppSharePromptModal } from './components/WhatsAppSharePromptModal';
import { InAppNotificationBanner, InAppAlert } from './components/InAppNotificationBanner';
import { PushNotificationPromptBanner } from './components/PushNotificationPromptBanner';
import {
  loadWhatsAppConfig,
  saveWhatsAppConfig,
  sendVehicleToWhatsAppGroup,
  getWhatsAppDirectShareUrl,
  FormatVehicleMessageOptions
} from './utils/whatsapp';
import {
  loadPushSettings,
  savePushSettings,
  sendNativeNotification,
  getNotificationPermission,
  requestNotificationPermission
} from './utils/notifications';
import {
  AddExpectedVehicleModal,
  SecurityActionModal,
  UserManagementModal,
  WarehouseManagementModal,
  DetailViewModal,
  RampAssignModal,
  NewVehicleModal,
  PhotoGalleryModal,
  EditVehicleModal,
  PasswordModal,
  ReleaseRampVehicleModal,
  ConfirmModal
} from './components/Modals';

import {
  Truck,
  RotateCw,
  Plus,
  Megaphone,
  Clock,
  Warehouse as WarehouseIcon,
  LayoutDashboard,
  Tv,
  FileText,
  Users,
  Key,
  LogOut,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Info as InfoIcon,
  X as XIcon,
  Volume2,
  VolumeX,
  Cloud,
  CloudOff,
  Trash2,
  Menu,
  Shield,
  Building,
  Briefcase,
  Bell,
  MessageSquare
} from 'lucide-react';
import { playChime } from './utils/audio';
import {
  testFirebaseConnection,
  subscribeToVehicles,
  subscribeToRamps,
  subscribeToExpectedVehicles,
  subscribeToNotifications,
  subscribeToChatMessages,
  subscribeToWarehouses,
  subscribeToUsers,
  subscribeToCustomers,
  saveCustomerToFirestore,
  deleteCustomerFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  deleteChatMessageFromFirestore,
  clearChatMessagesFromFirestore,
  saveVehicleToFirestore,
  deleteVehicleFromFirestore,
  clearAllVehiclesFromFirestore,
  clearAllExpectedVehiclesFromFirestore,
  resetAllRampsInFirestore,
  saveRampToFirestore,
  saveExpectedVehicleToFirestore,
  deleteExpectedVehicleFromFirestore,
  saveNotificationToFirestore,
  deleteNotificationFromFirestore,
  saveChatMessageToFirestore,
  saveWarehouseToFirestore
} from './lib/firebase';

export default function App() {
  // State Initialization
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('yms_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() => {
    try {
      const saved = localStorage.getItem('yms_warehouses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      return initialWarehouses;
    }
    return initialWarehouses;
  });
  const [selectedDepoId, setSelectedDepoId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('yms_selected_depo_id');
      if (saved !== null && !isNaN(Number(saved))) return Number(saved);
    } catch {
      // fallback
    }
    return 1;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('yms_sound_enabled') !== 'false';
  });
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  // Core Data Lists
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('yms_users');
      return saved ? JSON.parse(saved) : initialUsers;
    } catch {
      return initialUsers;
    }
  });

  const [ramps, setRamps] = useState<Ramp[]>(initialRamps);

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      if (localStorage.getItem('yms_data_reset_v1') !== 'true') {
        return [];
      }
      const saved = localStorage.getItem('yms_vehicles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [expectedVehicles, setExpectedVehicles] = useState<ExpectedVehicle[]>(() => {
    try {
      if (localStorage.getItem('yms_data_reset_v1') !== 'true') {
        return [];
      }
      const saved = localStorage.getItem('yms_expected_vehicles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      if (localStorage.getItem('yms_data_reset_v1') !== 'true') {
        return [];
      }
      const saved = localStorage.getItem('yms_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('yms_chat_messages');
      return saved ? JSON.parse(saved) : initialChatMessages;
    } catch {
      return initialChatMessages;
    }
  });

  // Modal Visibility States
  const [showAddExpectedModal, setShowAddExpectedModal] = useState(false);
  const [showSecurityActionModal, setShowSecurityActionModal] = useState(false);
  const [selectedSecurityNotification, setSelectedSecurityNotification] = useState<AppNotification | null>(null);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [showDetailViewModal, setShowDetailViewModal] = useState(false);
  const [selectedDetailVehicle, setSelectedDetailVehicle] = useState<Vehicle | null>(null);
  const [showRampAssignModal, setShowRampAssignModal] = useState(false);
  const [selectedRampForAssign, setSelectedRampForAssign] = useState<Ramp | null>(null);
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [newVehicleInitialValues, setNewVehicleInitialValues] = useState<Partial<Vehicle> | null>(null);
  const [processingExpectedVehicleId, setProcessingExpectedVehicleId] = useState<number | null>(null);
  const [showPhotoGalleryModal, setShowPhotoGalleryModal] = useState(false);
  const [selectedVehicleForPhoto, setSelectedVehicleForPhoto] = useState<Vehicle | null>(null);
  const [showEditVehicleModal, setShowEditVehicleModal] = useState(false);
  const [selectedVehicleForEdit, setSelectedVehicleForEdit] = useState<Vehicle | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('yms_customers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse cached customers:', e);
    }
    return initialCustomers;
  });

  // WhatsApp ve Web Push Bildirim State'leri
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showPushSettingsModal, setShowPushSettingsModal] = useState(false);
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>(() => loadWhatsAppConfig());
  const [pushSettings, setPushSettings] = useState<PushNotificationSettings>(() => loadPushSettings());
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermission());
  const [whatsappShareOptions, setWhatsappShareOptions] = useState<FormatVehicleMessageOptions | null>(null);
  const [showWhatsAppSharePrompt, setShowWhatsAppSharePrompt] = useState(false);
  const [whatsappApiStatus, setWhatsappApiStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [inAppAlert, setInAppAlert] = useState<InAppAlert | null>(null);

  useEffect(() => {
    setPushPermission(getNotificationPermission());
    const handleFocus = () => setPushPermission(getNotificationPermission());
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // WhatsApp linkinden gelen araç fotoğrafı veya detayını doğrudan aç
  useEffect(() => {
    if (typeof window === 'undefined' || vehicles.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const aracId = params.get('aracId') || params.get('arac');
      if (aracId) {
        const found = vehicles.find((v) => v.id === Number(aracId));
        if (found) {
          if (params.get('view') === 'photos') {
            setSelectedVehicleForPhoto(found);
            setShowPhotoGalleryModal(true);
          } else {
            setSelectedDetailVehicle(found);
            setShowDetailViewModal(true);
          }
        }
      }
    } catch {
      // ignore
    }
  }, [vehicles]);

  const [showMobileAdminMenu, setShowMobileAdminMenu] = useState(false);

  // Rampa Araç Çıkarma & Çıkış Modalı State
  const [showReleaseRampModal, setShowReleaseRampModal] = useState(false);
  const [selectedVehicleForRampRelease, setSelectedVehicleForRampRelease] = useState<Vehicle | null>(null);

  // Toast Bildirim Sistemi
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  // Genel Onay Modalı State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const askConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'primary' = 'danger',
    confirmText = 'Evet, Onayla'
  ) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      variant,
      onConfirm
    });
  }, []);

  // Storage Synching
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('yms_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('yms_current_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('yms_selected_depo_id', String(selectedDepoId));
    } catch (e) {
      console.error(e);
    }
  }, [selectedDepoId]);

  useEffect(() => {
    try {
      localStorage.setItem('yms_users', JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('yms_vehicles', JSON.stringify(vehicles));
    } catch (e) {
      console.error(e);
    }
  }, [vehicles]);

  useEffect(() => {
    try {
      localStorage.setItem('yms_expected_vehicles', JSON.stringify(expectedVehicles));
    } catch (e) {
      console.error(e);
    }
  }, [expectedVehicles]);

  useEffect(() => {
    try {
      localStorage.setItem('yms_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.error(e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem('yms_chat_messages', JSON.stringify(chatMessages));
    } catch (e) {
      console.error(e);
    }
  }, [chatMessages]);

  useEffect(() => {
    try {
      localStorage.setItem('yms_warehouses', JSON.stringify(warehouses));
    } catch (e) {
      console.error(e);
    }
  }, [warehouses]);

  // Initial startup clean: Reset dummy records if requested or if flag is not set
  useEffect(() => {
    try {
      if (localStorage.getItem('yms_data_reset_v1') !== 'true') {
        localStorage.setItem('yms_data_reset_v1', 'true');
        localStorage.removeItem('yms_vehicles');
        localStorage.removeItem('yms_expected_vehicles');
        localStorage.removeItem('yms_notifications');
        setVehicles([]);
        setExpectedVehicles([]);
        setNotifications([]);
        setRamps(initialRamps);
        // Clear remote Firestore collections
        clearAllVehiclesFromFirestore();
        clearAllExpectedVehiclesFromFirestore();
        resetAllRampsInFirestore();
      }
    } catch (e) {
      console.error('Error executing initial vehicle reset:', e);
    }
  }, []);

  // Firebase Firestore Canlı Eşzamanlama (Real-time Subscriptions)
  useEffect(() => {
    testFirebaseConnection()
      .then((connected) => {
        setIsFirebaseConnected(connected);
      })
      .catch(() => {
        setIsFirebaseConnected(false);
      });

    const unsubUsers = subscribeToUsers((remoteUsers) => {
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
        // Oturum açmış olan kullanıcının şifresi veya yetkisi başka cihazdan güncellenirse canlı senkronize et
        setCurrentUser((curr) => {
          if (!curr) return null;
          const found = remoteUsers.find((u) => u.username.toLowerCase() === curr.username.toLowerCase());
          return found || curr;
        });
      }
    }, initialUsers);

    const unsubWarehouses = subscribeToWarehouses((remoteWarehouses) => {
      if (remoteWarehouses && remoteWarehouses.length > 0) {
        setWarehouses(remoteWarehouses);
      }
    }, initialWarehouses);

    const unsubVehicles = subscribeToVehicles((remoteVehicles) => {
      setVehicles(remoteVehicles || []);
    });

    const unsubRamps = subscribeToRamps((remoteRamps) => {
      if (remoteRamps && remoteRamps.length > 0) {
        setRamps(remoteRamps);
      }
    }, initialRamps);

    const unsubExpected = subscribeToExpectedVehicles((remoteExpected) => {
      setExpectedVehicles(remoteExpected || []);
    });

    const unsubNotifs = subscribeToNotifications((remoteNotifs) => {
      if (remoteNotifs) {
        setNotifications(remoteNotifs);
      }
    });

    const unsubChat = subscribeToChatMessages((remoteChat) => {
      if (remoteChat) {
        setChatMessages(remoteChat);
      }
    });

    const unsubCustomers = subscribeToCustomers((remoteCustomers) => {
      if (remoteCustomers && remoteCustomers.length > 0) {
        setCustomers(remoteCustomers);
        try {
          localStorage.setItem('yms_customers', JSON.stringify(remoteCustomers));
        } catch (e) {
          console.warn('Failed to cache customers:', e);
        }
      }
    }, initialCustomers);

    return () => {
      unsubUsers();
      unsubWarehouses();
      unsubVehicles();
      unsubRamps();
      unsubExpected();
      unsubNotifs();
      unsubChat();
      unsubCustomers();
    };
  }, []);

  // Synchronize Ramps with Vehicles
  const syncAllRamps = useCallback(() => {
    setRamps((prevRamps) => {
      return prevRamps.map((ramp) => {
        const rampVehicles = vehicles.filter(
          (v) =>
            v.rampaId === ramp.id &&
            v.durum === 'RAMPADA'
        );

        if (ramp.durum !== 'Arızalı' && ramp.durum !== 'Bakımda') {
          return {
            ...ramp,
            durum: rampVehicles.length > 0 ? 'Dolu' : 'Boş'
          };
        }
        return ramp;
      });
    });
  }, [vehicles]);

  useEffect(() => {
    syncAllRamps();
  }, [syncAllRamps]);

  // Warehouse Helpers
  const getWarehouseNameById = useCallback(
    (id: number) => {
      if (!id || id === 0) return 'Tüm Depolar (Genel)';
      const w = warehouses.find((x) => x.id === id);
      return w ? w.ad : 'Depo 1';
    },
    [warehouses]
  );

  const getRampName = useCallback(
    (id: number | null | undefined) => {
      if (!id) return 'Atanmadı';
      const r = ramps.find((x) => x.id === id);
      return r ? r.ad : 'Atanmadı';
    },
    [ramps]
  );

  const activeWarehouses = useMemo(() => {
    return warehouses.filter((w) => w.aktif !== false);
  }, [warehouses]);

  const activeDepoIds = useMemo(() => {
    return new Set(activeWarehouses.map((w) => w.id));
  }, [activeWarehouses]);

  const currentWarehouseName = useMemo(() => {
    return getWarehouseNameById(selectedDepoId);
  }, [getWarehouseNameById, selectedDepoId]);

  const userAllowedWarehouses = useMemo(() => {
    if (!currentUser) return activeWarehouses;
    if (currentUser.role === 'admin' || currentUser.depoId === 0) return activeWarehouses;
    return activeWarehouses.filter((d) => d.id === currentUser.depoId);
  }, [currentUser, activeWarehouses]);

  // If currently selected warehouse was deactivated, fallback to an active warehouse or 0
  useEffect(() => {
    if (selectedDepoId !== 0 && !activeWarehouses.some((w) => w.id === selectedDepoId)) {
      if (activeWarehouses.length > 0) {
        setSelectedDepoId(currentUser?.role === 'admin' ? 0 : activeWarehouses[0].id);
      }
    }
  }, [activeWarehouses, selectedDepoId, currentUser]);

  // Scoped Vehicles (Only from active warehouses)
  const currentWarehouseVehicles = useMemo(() => {
    if (selectedDepoId === 0) {
      return vehicles.filter((v) => activeDepoIds.has(v.depoId || 1));
    }
    return vehicles.filter((v) => (v.depoId || 1) === selectedDepoId);
  }, [vehicles, selectedDepoId, activeDepoIds]);

  // Counts (Filtered by active warehouses)
  const pendingExpectedVehiclesCount = useMemo(() => {
    let list = expectedVehicles.filter((e) => activeDepoIds.has(e.depoId || 1));
    if (selectedDepoId !== 0) {
      list = list.filter((e) => (e.depoId || 1) === selectedDepoId);
    }
    return list.filter((e) => e.durum === 'BEKLENİYOR').length;
  }, [expectedVehicles, selectedDepoId, activeDepoIds]);

  const pendingNotificationsCount = useMemo(() => {
    return notifications.filter((n) => n.status === 'BEKLİYOR').length;
  }, [notifications]);

  const driverHistory = useMemo(() => {
    const map = new Map<string, { ad: string; tel: string }>();
    vehicles.forEach((v) => {
      if (v.soforAd) {
        map.set(v.soforAd.toLowerCase(), { ad: v.soforAd, tel: v.soforTel });
      }
    });
    return Array.from(map.values());
  }, [vehicles]);

  // Handlers
  const handleToggleWarehouseStatus = useCallback((warehouseId: number) => {
    const target = warehouses.find((w) => w.id === warehouseId);
    if (!target) return;

    const isCurrentlyActive = target.aktif !== false;
    if (isCurrentlyActive && activeWarehouses.length <= 1) {
      showToast('En az bir aktif depo bulunmalıdır! Son depoyu pasif yapamazsınız.', 'warning');
      return;
    }

    const updatedWarehouse: Warehouse = {
      ...target,
      aktif: !isCurrentlyActive
    };

    setWarehouses((prev) =>
      prev.map((w) => (w.id === warehouseId ? updatedWarehouse : w))
    );
    saveWarehouseToFirestore(updatedWarehouse);
    showToast(
      `${updatedWarehouse.ad} ${updatedWarehouse.aktif ? 'aktif edildi (sistemde görünür).' : 'pasif edildi (gizlendi).'}`,
      updatedWarehouse.aktif ? 'success' : 'info'
    );
  }, [warehouses, activeWarehouses, showToast]);

  const handleAddWarehouse = useCallback((name: string) => {
    const nextId = warehouses.length > 0 ? Math.max(...warehouses.map((w) => w.id)) + 1 : 1;
    const newWarehouse: Warehouse = {
      id: nextId,
      ad: name.trim(),
      aktif: true
    };
    setWarehouses((prev) => [...prev, newWarehouse]);
    saveWarehouseToFirestore(newWarehouse);
    showToast(`${newWarehouse.ad} başarıyla eklendi ve aktif edildi.`);
  }, [warehouses, showToast]);

  const handleEditWarehouse = useCallback((id: number, newName: string) => {
    const target = warehouses.find((w) => w.id === id);
    if (!target) return;
    const updatedWarehouse: Warehouse = {
      ...target,
      ad: newName.trim()
    };
    setWarehouses((prev) =>
      prev.map((w) => (w.id === id ? updatedWarehouse : w))
    );
    saveWarehouseToFirestore(updatedWarehouse);
    showToast(`Depo güncellendi: ${updatedWarehouse.ad}`);
  }, [warehouses, showToast]);

  const handleLoginSuccess = (user: User, depoId: number) => {
    setCurrentUser(user);
    setSelectedDepoId(depoId);
    if (user.role === 'security') {
      setActiveTab('araclar');
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'security') {
      if (activeTab !== 'beklenen' && activeTab !== 'canli' && activeTab !== 'araclar' && activeTab !== 'rampalar') {
        setActiveTab('araclar');
      }
    }
  }, [currentUser, activeTab]);

  const handleLoginAsGuest = () => {
    setCurrentUser({ username: 'Misafir', password: '', role: 'guest', depoId: 0 });
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('yms_current_user');
      localStorage.removeItem('yms_selected_depo_id');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    syncAllRamps();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // Customer Management Handlers
  const handleSaveCustomer = async (cust: Customer) => {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === cust.id);
      let updated: Customer[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = cust;
      } else {
        updated = [...prev, cust];
      }
      try {
        localStorage.setItem('yms_customers', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to cache customers:', e);
      }
      return updated;
    });
    await saveCustomerToFirestore(cust);
    showToast(`"${cust.name}" firması kaydedildi.`, 'success');
  };

  const handleAddNewCustomerByName = async (customerName: string) => {
    const trimmed = customerName.trim();
    if (!trimmed) return;
    const exists = customers.some(
      (c) => c.name.toLocaleLowerCase('tr-TR') === trimmed.toLocaleLowerCase('tr-TR')
    );
    if (exists) return;

    const newCust: Customer = {
      id: `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: trimmed,
      olusturmaTarihi: new Date().toLocaleString('tr-TR')
    };
    await handleSaveCustomer(newCust);
  };

  const handleDeleteCustomer = (customerId: string, customerName: string) => {
    askConfirm(
      'Firmayı Sil',
      `"${customerName}" firmasını sistemden silmek istediğinize emin misiniz?`,
      async () => {
        setCustomers((prev) => {
          const updated = prev.filter((c) => c.id !== customerId);
          try {
            localStorage.setItem('yms_customers', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        await deleteCustomerFromFirestore(customerId);
        showToast(`"${customerName}" firması silindi.`, 'info');
      }
    );
  };

  const handleOpenNewVehicleDirectly = () => {
    setProcessingExpectedVehicleId(null);
    setNewVehicleInitialValues({
      depoId: selectedDepoId === 0 ? 1 : selectedDepoId,
      cekiciPlaka: '',
      dorsePlaka: '',
      konteynirNo: '',
      soforAd: '',
      soforTel: '',
      nakliyeFirmasi: '',
      musteri: '',
      depoTuru: 'Antrepo',
      islemTuru: 'Boşaltma',
      aciklama: '',
      fotograflar: [],
      isAcik: false
    });
    setShowNewVehicleModal(true);
  };

  const handleProcessExpectedArrival = (exp: ExpectedVehicle) => {
    setProcessingExpectedVehicleId(exp.id);
    setNewVehicleInitialValues({
      depoId: exp.depoId || (selectedDepoId === 0 ? 1 : selectedDepoId),
      cekiciPlaka: exp.cekiciPlaka || '',
      dorsePlaka: exp.dorsePlaka || '',
      konteynirNo: exp.konteynirNo || '',
      soforAd: exp.soforAd || '',
      soforTel: exp.soforTel || '',
      musteri: exp.musteri || '',
      depoTuru: (exp.depoTuru as 'Antrepo' | 'Serbest Depo') || 'Antrepo',
      islemTuru: (exp.islemTuru === 'Tahliye' ? 'Boşaltma' : exp.islemTuru as 'Boşaltma' | 'Yükleme') || 'Boşaltma',
      aciklama: exp.beklenenTarih ? `Beklenen Geliş: ${exp.beklenenTarih}` : '',
      fotograflar: [],
      isAcik: false
    });
    setShowNewVehicleModal(true);
  };

  const handleSaveNewVehicle = (vehicleData: Partial<Vehicle>) => {
    const nowTs = Date.now();
    const nowStr = new Date(nowTs).toLocaleString('tr-TR');
    const nowIso = new Date(nowTs).toISOString().slice(0, 10);

    const newRecord: Vehicle = {
      id: Date.now(),
      depoId: Number(vehicleData.depoId || (selectedDepoId === 0 ? 1 : selectedDepoId)),
      cekiciPlaka: vehicleData.cekiciPlaka || '',
      dorsePlaka: vehicleData.dorsePlaka || '',
      konteynirNo: vehicleData.konteynirNo || '',
      soforAd: vehicleData.soforAd || '',
      soforTel: vehicleData.soforTel || '',
      nakliyeFirmasi: vehicleData.nakliyeFirmasi || '',
      musteri: vehicleData.musteri || '',
      depoTuru: vehicleData.depoTuru || 'Antrepo',
      islemTuru: (vehicleData.islemTuru === 'Tahliye' ? 'Boşaltma' : vehicleData.islemTuru as 'Boşaltma' | 'Yükleme') || 'Boşaltma',
      aciklama: vehicleData.aciklama || '',
      fotograflar: vehicleData.fotograflar || [],
      isAcik: Boolean(vehicleData.isAcik),
      durum: 'BEKLEMEDE',
      rampaId: null,
      isRampayaCagrildi: false,
      girisTarihi: nowStr,
      girisTarihiIso: nowIso,
      girisTimestamp: nowTs,
      evrakHazirTimestamp: null,
      rampadaTimestamp: null,
      cikisTarihi: null,
      cikisTimestamp: null,
      guvenlikNotlari: []
    };

    if (newRecord.musteri && newRecord.musteri.trim()) {
      handleAddNewCustomerByName(newRecord.musteri.trim());
    }

    setVehicles((prev) => [newRecord, ...prev]);
    saveVehicleToFirestore(newRecord);

    if (processingExpectedVehicleId) {
      setExpectedVehicles((prev) =>
        prev.map((e) => {
          if (e.id === processingExpectedVehicleId) {
            const updatedExp: ExpectedVehicle = { ...e, durum: 'GİRİŞ YAPILDI', kabulTarihi: nowStr };
            saveExpectedVehicleToFirestore(updatedExp);
            return updatedExp;
          }
          return e;
        })
      );
      setProcessingExpectedVehicleId(null);
    }

    playChime('success');
    showToast('Yeni araç kaydedildi ve sahaya girişi yapıldı.', 'success');

    // WhatsApp Grubu Bildirimi
    const shareOpts: FormatVehicleMessageOptions = {
      vehicle: newRecord,
      eventType: 'vehicle_added',
      warehouseName: getWarehouseNameById(newRecord.depoId)
    };
    setWhatsappShareOptions(shareOpts);
    setShowWhatsAppSharePrompt(true);

    if (whatsappConfig.enabled && whatsappConfig.autoShareOnVehicleAdd) {
      sendVehicleToWhatsAppGroup(shareOpts, whatsappConfig).then((res) => {
        setWhatsappApiStatus(res);
        if (res.success) {
          showToast(`WhatsApp Grubuna Bildirildi: ${newRecord.dorsePlaka}`, 'info');
        }
      }).catch(console.error);
    }

    // Web Push / Mobil Sistem Bildirimi & Kayan In-App Bildirim
    if (pushSettings.enabled && pushSettings.notifyOnVehicleEntry) {
      sendNativeNotification({
        title: '🚛 Yeni Araç Girişi Yapıldı',
        body: `${newRecord.dorsePlaka} - ${newRecord.musteri} (${newRecord.islemTuru}) sahaya giriş yaptı.`,
        soundType: 'success',
        tag: `vehicle-entry-${newRecord.id}`
      });
      setInAppAlert({
        id: `vehicle-entry-${newRecord.id}`,
        title: `${newRecord.dorsePlaka} - Yeni Araç Girişi`,
        body: `${newRecord.musteri} (${newRecord.islemTuru}) sahaya giriş yaptı. Ekli Fotoğraf: ${newRecord.fotograflar?.length || 0} adet`,
        type: 'entry',
        onClick: () => {
          setSelectedDetailVehicle(newRecord);
          setShowDetailViewModal(true);
        },
        onShareWhatsApp: () => {
          setWhatsappShareOptions(shareOpts);
          setShowWhatsAppSharePrompt(true);
        }
      });
    }
  };

  const handleShareVehicleToWhatsApp = async (vehicle: Vehicle) => {
    const rampName = getRampName(vehicle.rampaId);
    const warehouseName = getWarehouseNameById(vehicle.depoId);
    const shareOpts: FormatVehicleMessageOptions = {
      vehicle,
      rampName,
      eventType: vehicle.rampaId ? 'ramp_assigned' : 'manual_share',
      warehouseName
    };
    setWhatsappShareOptions(shareOpts);
    setShowWhatsAppSharePrompt(true);

    const res = await sendVehicleToWhatsAppGroup(shareOpts, whatsappConfig);
    setWhatsappApiStatus(res);

    if (res.success) {
      showToast(res.message || 'Araç bilgileri WhatsApp grubuna iletildi.', 'success');
    } else {
      showToast(res.message || 'WhatsApp gönderimi tamamlanamadı.', 'warning');
    }

    if (res.urlFallback && (whatsappConfig.provider === 'sharelink' || !whatsappConfig.enabled)) {
      window.open(res.urlFallback, '_blank');
    }
  };

  const toggleSound = () => {
    const nextState = !isSoundEnabled;
    setIsSoundEnabled(nextState);
    localStorage.setItem('yms_sound_enabled', String(nextState));
    if (nextState) {
      playChime('call');
      showToast('Sesli uyarılar ve çağrı anonsları aktif edildi.', 'info');
    } else {
      showToast('Sesli uyarılar sessize alındı.', 'info');
    }
  };

  const handleSaveExpectedVehicle = (data: Omit<ExpectedVehicle, 'id' | 'durum' | 'kabulTarihi'>) => {
    const newExp: ExpectedVehicle = {
      id: Date.now(),
      ...data,
      islemTuru: (data.islemTuru === 'Tahliye' ? 'Boşaltma' : data.islemTuru) || 'Boşaltma',
      durum: 'BEKLENİYOR',
      kabulTarihi: null
    };

    if (newExp.musteri && newExp.musteri.trim()) {
      handleAddNewCustomerByName(newExp.musteri.trim());
    }

    setExpectedVehicles((prev) => [newExp, ...prev]);
    saveExpectedVehicleToFirestore(newExp);
    playChime('success');
    showToast('Beklenen araç kaydı başarıyla oluşturuldu.', 'success');
  };

  const handleDeleteExpectedSingle = (exp: ExpectedVehicle) => {
    askConfirm(
      'Beklenen Aracı Sil',
      `${exp.dorsePlaka || 'Seçili'} beklenen araç kaydını silmek istediğinizden emin misiniz?`,
      () => {
        setExpectedVehicles((prev) => prev.filter((e) => e.id !== exp.id));
        deleteExpectedVehicleFromFirestore(exp.id);
        showToast('Beklenen araç kaydı silindi.', 'info');
      }
    );
  };

  const handleDeleteExpectedBatch = (ids: number[]) => {
    setExpectedVehicles((prev) => prev.filter((e) => !ids.includes(e.id)));
    ids.forEach((id) => deleteExpectedVehicleFromFirestore(id));
    showToast(`${ids.length} adet beklenen araç silindi.`, 'info');
  };

  const handleImportExcelExpected = (items: ExpectedVehicle[]) => {
    setExpectedVehicles((prev) => [...items, ...prev]);
    items.forEach((item) => saveExpectedVehicleToFirestore(item));
    showToast(`${items.length} adet beklenen araç içe aktarıldı.`);
  };

  // Bildirim temizleme ve Firestore senkronizasyonu
  // Kural: "Rampaya çağrılan araçlarda işlem yapılmayan bildirim silinmesin"
  const removeVehicleCallNotifications = (vehicleId: number, dorsePlaka?: string, forceAll = false) => {
    setNotifications((prev) => {
      const remaining: AppNotification[] = [];
      prev.forEach((n) => {
        const matches = n.vehicleId === vehicleId || (dorsePlaka && n.plaka === dorsePlaka);
        // İşlem yapılmayan (BEKLİYOR) çağrı bildirimleri korunmalı, silinmemelidir!
        if (matches && (forceAll || n.status !== 'BEKLİYOR')) {
          deleteNotificationFromFirestore(n.id);
        } else {
          remaining.push(n);
        }
      });
      return remaining;
    });
  };

  const handleDeleteNotification = (notificationId: number) => {
    const target = notifications.find((n) => n.id === notificationId);
    if (target && target.status === 'BEKLİYOR') {
      askConfirm(
        'Bekleyen Çağrı Bildirimini Sil',
        'Bu araç rampaya çağrılmış ancak henüz sahada işlem/yanaşma tamamlanmamıştır. İşlem yapılmayan bu bildirimi silmek istediğinizden emin misiniz?',
        () => {
          deleteNotificationFromFirestore(notificationId);
          setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
          showToast('Bekleyen bildirim silindi.', 'info');
        },
        'warning',
        'Evet, Sil'
      );
      return;
    }
    deleteNotificationFromFirestore(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    showToast('Bildirim silindi.', 'info');
  };

  const handleUpdateVehicleStatus = (vehicle: Vehicle, newStatus: Vehicle['durum']) => {
    const nowTs = Date.now();
    const nowStr = new Date(nowTs).toLocaleString('tr-TR');

    // EVRAK HAZIR yetkisi sadece Admin'dedir
    if (newStatus === 'EVRAK HAZIR') {
      if (currentUser?.role !== 'admin') {
        alert("Bir aracın durumunu 'EVRAK HAZIR' yapma yetkisi sadece Yöneticiye (Admin) aittir.");
        return;
      }

      // Araç rampada ise EVRAK HAZIR durumuna geri dönüş için onay sorgulaması yapılır
      if (vehicle.durum === 'RAMPADA' || vehicle.rampaId) {
        const currentRamp = ramps.find((r) => r.id === vehicle.rampaId);
        const rampName = currentRamp ? currentRamp.ad : (vehicle.rampaId ? `Rampa ${vehicle.rampaId}` : 'Rampa');

        askConfirm(
          "Rampadaki Aracı 'EVRAK HAZIR' Durumuna Geri Al",
          `${vehicle.dorsePlaka} plakalı araç şu anda ${rampName} üzerinde bulunmaktadır. Araç rampadan indirilip rampa 'Boş' durumuna getirilecek ve aracın durumu 'EVRAK HAZIR' olarak güncellenecektir. Onaylıyor musunuz?`,
          () => {
            // 1. Rampayı Boş durumuna getir
            if (vehicle.rampaId) {
              setRamps((prev) =>
                prev.map((r) => {
                  if (r.id === vehicle.rampaId) {
                    const updatedR: Ramp = { ...r, durum: 'Boş' };
                    saveRampToFirestore(updatedR);
                    return updatedR;
                  }
                  return r;
                })
              );
            }

            // 2. Aracı EVRAK HAZIR durumuna al ve rampa/çağrı bağlarını temizle
            const updatedVehicle: Vehicle = {
              ...vehicle,
              durum: 'EVRAK HAZIR',
              rampaId: null,
              isRampayaCagrildi: false,
              cagrildigiRampaId: null,
              evrakHazirTimestamp: nowTs,
              cikisTarihi: null,
              cikisTimestamp: null
            };
            setVehicles((prev) =>
              prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
            );
            saveVehicleToFirestore(updatedVehicle);

            // 3. Bekleyen çağrı bildirimi varsa sonlandır
            setNotifications((prev) =>
              prev.map((n) => {
                if (n.vehicleId === vehicle.id && n.status === 'BEKLİYOR') {
                  const updatedN: AppNotification = {
                    ...n,
                    status: 'İPTAL',
                    text: `${n.text} (Admin tarafından rampadan EVRAK HAZIR durumuna geri alındı)`
                  };
                  saveNotificationToFirestore(updatedN);
                  return updatedN;
                }
                return n;
              })
            );

            showToast(`${vehicle.dorsePlaka} plakalı araç ${rampName} üzerinden indirildi ve 'EVRAK HAZIR' durumuna alındı. Rampa boşaltıldı.`, 'success');
          },
          'warning',
          'Evet, EVRAK HAZIR Yap'
        );
        return;
      }
    }

    // BEKLEMEDE durumuna geçişte araç rampada ise onay sorgusu ve rampayı boşaltma
    if (newStatus === 'BEKLEMEDE' && (vehicle.durum === 'RAMPADA' || vehicle.rampaId)) {
      const currentRamp = ramps.find((r) => r.id === vehicle.rampaId);
      const rampName = currentRamp ? currentRamp.ad : (vehicle.rampaId ? `Rampa ${vehicle.rampaId}` : 'Rampa');

      askConfirm(
        "Rampadaki Aracı 'BEKLEMEDE' Durumuna Geri Çek",
        `${vehicle.dorsePlaka} plakalı araç şu anda ${rampName} üzerinde bulunmaktadır. Aracı 'BEKLEMEDE' (bekleme sahası) durumuna almak, rampadan indirilmesini ve rampanın 'Boş' duruma getirilmesini sağlayacaktır. Operasyonu durdurup aracı bekleme sahasına çekmek istediğinizden emin misiniz?`,
        () => {
          // 1. Rampayı Boş durumuna getir
          if (vehicle.rampaId) {
            setRamps((prev) =>
              prev.map((r) => {
                if (r.id === vehicle.rampaId) {
                  const updatedR: Ramp = { ...r, durum: 'Boş' };
                  saveRampToFirestore(updatedR);
                  return updatedR;
                }
                return r;
              })
            );
          }

          // 2. Aracı BEKLEMEDE durumuna al ve rampa/çağrı bağlarını temizle
          const updatedVehicle: Vehicle = {
            ...vehicle,
            durum: 'BEKLEMEDE',
            rampaId: null,
            isRampayaCagrildi: false,
            cagrildigiRampaId: null,
            cikisTarihi: null,
            cikisTimestamp: null
          };
          setVehicles((prev) =>
            prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
          );
          saveVehicleToFirestore(updatedVehicle);

          // 3. Bekleyen çağrı bildirimi varsa iptal et
          setNotifications((prev) =>
            prev.map((n) => {
              if (n.vehicleId === vehicle.id && n.status === 'BEKLİYOR') {
                const updatedN: AppNotification = {
                  ...n,
                  status: 'İPTAL',
                  text: `${n.text} (Operasyon durduruldu, araç bekleme sahasına çekildi)`
                };
                saveNotificationToFirestore(updatedN);
                return updatedN;
              }
              return n;
            })
          );

          showToast(`${vehicle.dorsePlaka} plakalı araç ${rampName} üzerinden indirildi ve bekleme sahasına ('BEKLEMEDE') alındı. Rampa boşaltıldı.`, 'info');
        },
        'warning',
        'Evet, BEKLEMEDE Yap'
      );
      return;
    }

    if (newStatus === 'ÇIKIŞ YAPTI') {
      askConfirm(
        'Araç Çıkışı Onayı',
        `${vehicle.dorsePlaka} plakalı aracı ÇIKIŞ YAPTI durumuna getirmek ve sahadan çıkışını kaydetmek istediğinizden emin misiniz?`,
        () => {
          const oldRampId = vehicle.rampaId;
          const updatedVehicle: Vehicle = {
            ...vehicle,
            durum: 'ÇIKIŞ YAPTI',
            cikisTarihi: nowStr,
            cikisTimestamp: nowTs,
            rampaId: null,
            isRampayaCagrildi: false
          };
          setVehicles((prev) =>
            prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
          );
          saveVehicleToFirestore(updatedVehicle);

          if (oldRampId) {
            setRamps((prev) =>
              prev.map((r) => {
                if (r.id === oldRampId && r.durum === 'Dolu') {
                  const updatedR: Ramp = { ...r, durum: 'Boş' };
                  saveRampToFirestore(updatedR);
                  return updatedR;
                }
                return r;
              })
            );
          }
          removeVehicleCallNotifications(vehicle.id, vehicle.dorsePlaka);
          showToast(`${vehicle.dorsePlaka} plakalı aracın çıkışı yapıldı.`, 'success');
        }
      );
    } else {
      if (newStatus === 'RAMPADA' && !vehicle.rampaId) {
        alert("Bir aracı 'RAMPADA' durumuna almak için lütfen yanındaki 'Rampa Atama' sütunundan boş bir rampa seçiniz. Rampa seçildiğinde aracın durumu otomatik olarak RAMPADA yapılacaktır.");
        return;
      }

      let updatedVehicle: Vehicle | null = null;
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === vehicle.id) {
            updatedVehicle = {
              ...v,
              durum: newStatus,
              evrakHazirTimestamp: newStatus === 'EVRAK HAZIR' ? nowTs : v.evrakHazirTimestamp,
              rampadaTimestamp: newStatus === 'RAMPADA' ? nowTs : v.rampadaTimestamp,
              cikisTarihi: null,
              cikisTimestamp: null
            };
            return updatedVehicle;
          }
          return v;
        })
      );
      if (updatedVehicle) {
        saveVehicleToFirestore(updatedVehicle);
      }
      if (newStatus === 'RAMPADA' && vehicle.rampaId) {
        setRamps((prev) =>
          prev.map((r) => {
            if (r.id === vehicle.rampaId) {
              const updatedR: Ramp = { ...r, durum: 'Dolu' };
              saveRampToFirestore(updatedR);
              return updatedR;
            }
            return r;
          })
        );
      }
      showToast(`${vehicle.dorsePlaka} durumu '${newStatus}' olarak güncellendi.`, 'info');
    }
  };

  const handleAssignRamp = (vehicle: Vehicle, rampaId: number | null) => {
    if (currentUser?.role !== 'admin' && currentUser?.role !== 'security' && currentUser?.role !== 'operasyon') {
      alert('Rampa değişiklikleri ve araç atamaları Yönetim ve Güvenlik yetkisine tabidir.');
      return;
    }

    const nowTs = Date.now();
    const oldRampId = vehicle.rampaId;

    if (rampaId) {
      const occupiedByOther = vehicles.find(
        (v) => v.rampaId === rampaId && v.durum === 'RAMPADA' && v.id !== vehicle.id
      );
      if (occupiedByOther) {
        alert(`Bu rampa şu anda ${occupiedByOther.dorsePlaka} plakalı araç tarafından kullanılmaktadır. Lütfen boş bir rampa seçiniz.`);
        return;
      }

      const executeAssign = () => {
        const updatedVehicle: Vehicle = {
          ...vehicle,
          rampaId,
          durum: 'RAMPADA',
          rampadaTimestamp: nowTs,
          isRampayaCagrildi: false,
          cagrildigiRampaId: null
        };
        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
        );
        saveVehicleToFirestore(updatedVehicle);

        setRamps((prev) =>
          prev.map((r) => {
            if (r.id === rampaId) {
              const updatedR: Ramp = { ...r, durum: 'Dolu' };
              saveRampToFirestore(updatedR);
              return updatedR;
            }
            if (oldRampId && r.id === oldRampId) {
              const updatedOldR: Ramp = { ...r, durum: 'Boş' };
              saveRampToFirestore(updatedOldR);
              return updatedOldR;
            }
            return r;
          })
        );

        removeVehicleCallNotifications(vehicle.id, vehicle.dorsePlaka);

        const targetRamp = ramps.find((r) => r.id === rampaId);
        const targetRampName = targetRamp ? targetRamp.ad : `Rampa ${rampaId}`;
        showToast(`${vehicle.dorsePlaka} plakalı araç ${targetRampName} üzerine atandı ve bildirim temizlendi.`, 'success');

        // WhatsApp Grubu Bildirimi
        const shareOpts: FormatVehicleMessageOptions = {
          vehicle: updatedVehicle,
          rampName: targetRampName,
          eventType: 'ramp_assigned',
          warehouseName: getWarehouseNameById(updatedVehicle.depoId)
        };
        setWhatsappShareOptions(shareOpts);
        setShowWhatsAppSharePrompt(true);

        if (whatsappConfig.enabled && whatsappConfig.autoShareOnRampAssign) {
          sendVehicleToWhatsAppGroup(shareOpts, whatsappConfig).then((res) => {
            setWhatsappApiStatus(res);
            if (res.success) {
              showToast(`WhatsApp Grubuna Bildirildi: ${updatedVehicle.dorsePlaka} -> ${targetRampName}`, 'info');
            }
          }).catch(console.error);
        }

        // Web Push / Mobil Sistem Bildirimi & Kayan In-App Bildirim
        if (pushSettings.enabled && pushSettings.notifyOnRampAssign) {
          sendNativeNotification({
            title: '🚪 Rampa Ataması Yapıldı!',
            body: `${updatedVehicle.dorsePlaka} (${updatedVehicle.musteri}) -> ${targetRampName} rampasına yönlendirildi!`,
            soundType: 'call',
            tag: `ramp-assign-${updatedVehicle.id}`
          });
          setInAppAlert({
            id: `assign-${updatedVehicle.id}`,
            title: `Rampa Atandı: ${targetRampName}`,
            body: `${updatedVehicle.dorsePlaka} (${updatedVehicle.musteri}) -> ${targetRampName} rampasına yönlendirildi!`,
            type: 'assign',
            onClick: () => {
              setSelectedDetailVehicle(updatedVehicle);
              setShowDetailViewModal(true);
            },
            onShareWhatsApp: () => {
              setWhatsappShareOptions(shareOpts);
              setShowWhatsAppSharePrompt(true);
            }
          });
        }
      };

      if (oldRampId && oldRampId !== rampaId) {
        const currentRampName = getRampName(oldRampId);
        const targetRamp = ramps.find((r) => r.id === rampaId);
        const targetRampName = targetRamp ? targetRamp.ad : `Rampa ${rampaId}`;
        askConfirm(
          'Rampa Değişikliği Onayı',
          `Rampa değiştirmek istediğinizden emin misiniz?\n\n${vehicle.dorsePlaka} plakalı aracın rampasını ${currentRampName}'den ${targetRampName}'ye taşımak üzeresiniz.`,
          executeAssign,
          'warning',
          'Evet, Rampa Değiştir'
        );
      } else if (!oldRampId) {
        const targetRamp = ramps.find((r) => r.id === rampaId);
        const targetRampName = targetRamp ? targetRamp.ad : `Rampa ${rampaId}`;
        askConfirm(
          'Rampa Atama Onayı',
          `Rampa ataması yapmak istediğinizden emin misiniz?\n\n${vehicle.dorsePlaka} plakalı aracı ${targetRampName} üzerine atamak üzeresiniz.`,
          executeAssign,
          'warning',
          'Evet, Rampaya Ata'
        );
      } else {
        executeAssign();
      }
    } else {
      // Araç rampadan çıkarılıp EVRAK HAZIR durumuna getirilmek isteniyorsa
      if (vehicle.durum === 'RAMPADA' || oldRampId) {
        if (currentUser?.role !== 'admin') {
          alert("Rampadaki aracı rampa atamasından çıkarıp 'EVRAK HAZIR' durumuna geri alma yetkisi sadece Yöneticidedir (Admin).");
          return;
        }

        const rampName = getRampName(oldRampId);
        askConfirm(
          "Rampadaki Aracı 'EVRAK HAZIR' Durumuna Geri Al",
          `${vehicle.dorsePlaka} plakalı araç şu anda ${rampName} üzerinde bulunmaktadır. Araç rampadan indirilip rampa 'Boş' durumuna getirilecek ve aracın durumu 'EVRAK HAZIR' olarak güncellenecektir. Onaylıyor musunuz?`,
          () => {
            const updatedVehicle: Vehicle = {
              ...vehicle,
              rampaId: null,
              durum: 'EVRAK HAZIR',
              isRampayaCagrildi: false,
              cagrildigiRampaId: null,
              evrakHazirTimestamp: nowTs
            };
            setVehicles((prev) =>
              prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
            );
            saveVehicleToFirestore(updatedVehicle);

            if (oldRampId) {
              setRamps((prev) =>
                prev.map((r) => {
                  if (r.id === oldRampId) {
                    const updatedR: Ramp = { ...r, durum: 'Boş' };
                    saveRampToFirestore(updatedR);
                    return updatedR;
                  }
                  return r;
                })
              );
            }
            removeVehicleCallNotifications(vehicle.id, vehicle.dorsePlaka);
            showToast(`${vehicle.dorsePlaka} plakalı araç ${rampName} üzerinden boşaltıldı ve 'EVRAK HAZIR' durumuna alındı.`, 'success');
          },
          'warning',
          'Evet, EVRAK HAZIR Yap'
        );
      } else {
        const updatedVehicle: Vehicle = {
          ...vehicle,
          rampaId: null,
          durum: 'EVRAK HAZIR',
          isRampayaCagrildi: false
        };
        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
        );
        saveVehicleToFirestore(updatedVehicle);
        removeVehicleCallNotifications(vehicle.id, vehicle.dorsePlaka);
      }
    }
  };

  const handleSendAdminCallRequest = (vehicle: Vehicle) => {
    if (currentUser?.role !== 'admin') {
      alert('Güvenliğe çağrı gönderme yetkisi sadece Yöneticiye (Admin) aittir.');
      return;
    }

    if (vehicle.isRampayaCagrildi || vehicle.durum === 'RAMPADA') {
      alert('Bu araç zaten çağrılmış veya rampadadır.');
      return;
    }

    const updatedVehicle: Vehicle = { ...vehicle, isRampayaCagrildi: true };
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
    );
    saveVehicleToFirestore(updatedVehicle);

    const newNotif: AppNotification = {
      id: Date.now(),
      type: 'ADMIN_CAGRI_ISTEGI',
      vehicleId: vehicle.id,
      plaka: vehicle.dorsePlaka,
      musteri: vehicle.musteri,
      soforAd: vehicle.soforAd,
      soforTel: vehicle.soforTel,
      text: `📢 YÖNETİCİ ÇAĞRI TALEBİ: ${vehicle.dorsePlaka} (${vehicle.musteri}) aracının sahaya çağrılması isteniyor! Lütfen rampa seçip şoförü yönlendirin.`,
      time: new Date().toLocaleTimeString('tr-TR').slice(0, 5),
      status: 'BEKLİYOR'
    };

    setNotifications((prev) => [newNotif, ...prev]);
    saveNotificationToFirestore(newNotif);
    alert(`${vehicle.dorsePlaka} plakalı araç için Güvenlik ekranına çağrı isteği gönderildi. Rampayı Güvenlik seçecektir.`);
  };

  const handleCancelRampCall = (vehicle: Vehicle) => {
    const notif = notifications.find((n) => n.vehicleId === vehicle.id && n.status === 'BEKLİYOR');

    if (vehicle.durum === 'RAMPADA' || (!notif && vehicle.rampaId)) {
      showToast(
        `🚨 DİKKAT: Güvenlik bu araç için yönlendirme işlemini yapmıştır / aracı rampaya almıştır! Lütfen Güvenlik birimi ile iletişime geçiniz.`,
        'warning'
      );
      return;
    }

    askConfirm(
      'Rampa Çağrısını İptal Et',
      `${vehicle.dorsePlaka} plakalı aracın rampaya çağrı işlemini İPTAL etmek istediğinizden emin misiniz?`,
      () => {
        const updatedVehicle: Vehicle = { ...vehicle, isRampayaCagrildi: false, cagrildigiRampaId: null };
        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
        );
        saveVehicleToFirestore(updatedVehicle);

        if (notif) {
          const updatedNotif: AppNotification = {
            ...notif,
            status: 'İPTAL',
            text: `❌ İPTAL EDİLDİ: ${vehicle.dorsePlaka} araç çağrısı iptal edildi. Şoförü yönlendirmeyiniz!`
          };
          setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? updatedNotif : n))
          );
          saveNotificationToFirestore(updatedNotif);
        }

        const cancelNotif: AppNotification = {
          id: Date.now(),
          type: 'CAGRI_IPTALI',
          vehicleId: vehicle.id,
          plaka: vehicle.dorsePlaka,
          text: `🚨 ÇAĞRI İPTALİ: ${vehicle.dorsePlaka} (${vehicle.musteri}) araç çağrısı İPTAL EDİLDİ. Lütfen şoförü yönlendirmeyiniz!`,
          time: new Date().toLocaleTimeString('tr-TR').slice(0, 5),
          status: 'OKUNDU'
        };
        setNotifications((prev) => [cancelNotif, ...prev]);
        saveNotificationToFirestore(cancelNotif);

        playChime('cancel');
        showToast(`${vehicle.dorsePlaka} plakalı aracın çağrısı iptal edildi.`, 'info');
      }
    );
  };

  const handleToggleAcil = (vehicle: Vehicle) => {
    if (currentUser?.role !== 'admin') {
      alert('Bu işlemi sadece Yetkili Admin kullanıcısı yapabilir.');
      return;
    }
    const updatedStatus = !vehicle.isAcik;
    const updatedVehicle: Vehicle = { ...vehicle, isAcik: updatedStatus };
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
    );
    saveVehicleToFirestore(updatedVehicle);
    showToast(`${vehicle.dorsePlaka} plakalı araç durumu ${updatedStatus ? 'ACİL ARAÇ' : 'Normal Araç'} olarak güncellendi.`, 'info');
  };

  const handleRampStatusChange = (ramp: Ramp, newStatus: Ramp['durum']) => {
    const updatedRamp: Ramp = { ...ramp, durum: newStatus };
    setRamps((prev) => prev.map((r) => (r.id === ramp.id ? updatedRamp : r)));
    saveRampToFirestore(updatedRamp);

    if (newStatus !== 'Dolu') {
      const v = vehicles.find((item) => item.rampaId === ramp.id && item.durum === 'RAMPADA');
      if (v) {
        const updatedV: Vehicle = { ...v, rampaId: null, durum: 'EVRAK HAZIR', isRampayaCagrildi: false };
        setVehicles((prev) =>
          prev.map((item) => (item.id === v.id ? updatedV : item))
        );
        saveVehicleToFirestore(updatedV);
        showToast(`${ramp.ad} '${newStatus}' durumuna alındığı için üzerindeki ${v.dorsePlaka} plakalı araç rampadan çıkarıldı.`, 'info');
      }
    }
  };

  const handleChangeVehicleRamp = (vehicle: Vehicle, targetRampId: number) => {
    if (vehicle.rampaId === targetRampId) return;

    // Hedef rampa başka bir araç tarafından işgal edilmiş mi kontrol et
    const occupiedByOther = vehicles.find(
      (v) => v.rampaId === targetRampId && v.durum === 'RAMPADA' && v.id !== vehicle.id
    );
    if (occupiedByOther) {
      alert(`Hedef rampa şu anda ${occupiedByOther.dorsePlaka} plakalı araç tarafından kullanılmaktadır.`);
      return;
    }

    const currentRampName = getRampName(vehicle.rampaId);
    const targetRamp = ramps.find((r) => r.id === targetRampId);
    const targetRampName = targetRamp ? targetRamp.ad : `Rampa ${targetRampId}`;

    askConfirm(
      'Rampa Değişikliği Onayı',
      `Rampa değiştirmek istediğinizden emin misiniz?\n\n${vehicle.dorsePlaka} plakalı aracın rampasını ${currentRampName ? `${currentRampName} üzerinden ` : ''}${targetRampName} olarak değiştirmek üzeresiniz.`,
      () => {
        const nowTs = Date.now();
        const oldRampId = vehicle.rampaId;

        const updatedVehicle: Vehicle = {
          ...vehicle,
          rampaId: targetRampId,
          durum: 'RAMPADA',
          rampadaTimestamp: nowTs,
          isRampayaCagrildi: false,
          cagrildigiRampaId: null
        };
        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
        );
        saveVehicleToFirestore(updatedVehicle);

        setRamps((prev) =>
          prev.map((r) => {
            if (r.id === targetRampId) {
              const updatedR: Ramp = { ...r, durum: 'Dolu' };
              saveRampToFirestore(updatedR);
              return updatedR;
            }
            if (oldRampId && r.id === oldRampId) {
              const updatedOldR: Ramp = { ...r, durum: 'Boş' };
              saveRampToFirestore(updatedOldR);
              return updatedOldR;
            }
            return r;
          })
        );

        removeVehicleCallNotifications(vehicle.id, vehicle.dorsePlaka);
        showToast(`${vehicle.dorsePlaka} plakalı araç ${targetRampName} numarasına aktarıldı.`, 'success');
      },
      'warning',
      'Evet, Rampa Değiştir'
    );
  };

  // Rampa Çıkar & Çıkış Yap modalını aç
  const handleReleaseRampVehicle = (vehicle: Vehicle) => {
    setSelectedVehicleForRampRelease(vehicle);
    setShowReleaseRampModal(true);
  };

  // Rampadan çıkar ve sahadan ÇIKIŞ YAPTI olarak işle
  const handleConfirmRampReleaseAndExit = (vehicle: Vehicle) => {
    const nowTs = Date.now();
    const nowStr = new Date(nowTs).toLocaleString('tr-TR');
    const oldRampId = vehicle.rampaId;

    const updatedVehicle: Vehicle = {
      ...vehicle,
      rampaId: null,
      durum: 'ÇIKIŞ YAPTI',
      isRampayaCagrildi: false,
      cagrildigiRampaId: null,
      cikisTarihi: nowStr,
      cikisTimestamp: nowTs
    };

    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
    );
    saveVehicleToFirestore(updatedVehicle);

    if (oldRampId) {
      setRamps((prev) =>
        prev.map((r) => {
          if (r.id === oldRampId && r.durum === 'Dolu') {
            const updatedR = { ...r, durum: 'Boş' as const };
            saveRampToFirestore(updatedR);
            return updatedR;
          }
          return r;
        })
      );
    }

    removeVehicleCallNotifications(vehicle.id, vehicle.dorsePlaka);

    setShowReleaseRampModal(false);
    setSelectedVehicleForRampRelease(null);
    playChime('success');
    showToast(`${vehicle.dorsePlaka} plakalı araç rampadan çıkarıldı ve ÇIKIŞ YAPTI olarak kaydedildi.`, 'success');
  };

  // Sadece rampadan çıkar, sahada EVRAK HAZIR durumunda beklet
  const handleConfirmRampReleaseOnly = (vehicle: Vehicle) => {
    if (currentUser?.role !== 'admin') {
      alert("Rampadaki aracı 'EVRAK HAZIR' durumuna geri alma yetkisi sadece Yöneticidedir (Admin).");
      return;
    }

    const rampName = getRampName(vehicle.rampaId);
    askConfirm(
      "Rampadaki Aracı 'EVRAK HAZIR' Durumuna Geri Al",
      `${vehicle.dorsePlaka} plakalı araç şu anda ${rampName} üzerinde bulunmaktadır. Araç rampadan indirilip rampa 'Boş' durumuna getirilecek ve aracın durumu 'EVRAK HAZIR' olarak güncellenecektir. Onaylıyor musunuz?`,
      () => {
        const oldRampId = vehicle.rampaId;

        const updatedVehicle: Vehicle = {
          ...vehicle,
          rampaId: null,
          durum: 'EVRAK HAZIR',
          isRampayaCagrildi: false,
          cagrildigiRampaId: null,
          evrakHazirTimestamp: Date.now()
        };

        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
        );
        saveVehicleToFirestore(updatedVehicle);

        if (oldRampId) {
          setRamps((prev) =>
            prev.map((r) => {
              if (r.id === oldRampId && r.durum === 'Dolu') {
                const updatedR = { ...r, durum: 'Boş' as const };
                saveRampToFirestore(updatedR);
                return updatedR;
              }
              return r;
            })
          );
        }

        setShowReleaseRampModal(false);
        setSelectedVehicleForRampRelease(null);
        playChime('alert');
        showToast(`${vehicle.dorsePlaka} plakalı araç ${rampName} üzerinden indirildi ve sahada EVRAK HAZIR olarak beklemeye alındı.`, 'info');
      },
      'warning',
      'Evet, EVRAK HAZIR Yap'
    );
  };

  const handleCallVehicleToRamp = (vehicle: Vehicle, ramp: Ramp) => {
    if (currentUser?.role !== 'admin') {
      alert('Araç çağırma işlemi sadece Yönetici (Admin) tarafından yapılabilir.');
      return;
    }

    if (vehicle.durum === 'RAMPADA') {
      showToast(`UYARI: ${vehicle.dorsePlaka} plakalı araç zaten ${getRampName(vehicle.rampaId)} üzerinde rampadadır!`, 'warning');
      return;
    }
    if (vehicle.isRampayaCagrildi) {
      showToast(`UYARI: ${vehicle.dorsePlaka} plakalı araç zaten ${getRampName(vehicle.cagrildigiRampaId)} için çağrılmıştır!`, 'warning');
      return;
    }

    const updatedVehicle: Vehicle = { ...vehicle, isRampayaCagrildi: true, cagrildigiRampaId: ramp.id };
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
    );
    saveVehicleToFirestore(updatedVehicle);

    const notif: AppNotification = {
      id: Date.now(),
      vehicleId: vehicle.id,
      plaka: vehicle.dorsePlaka,
      musteri: vehicle.musteri,
      soforAd: vehicle.soforAd,
      soforTel: vehicle.soforTel,
      rampId: ramp.id,
      rampName: ramp.ad,
      text: `🚨 ${vehicle.dorsePlaka} (${vehicle.musteri}) plakalı araç ${ramp.ad} için RAMPAYA ÇAĞRILDI!`,
      time: new Date().toLocaleTimeString('tr-TR').slice(0, 5),
      status: 'BEKLİYOR'
    };

    setNotifications((prev) => [notif, ...prev]);
    saveNotificationToFirestore(notif);

    setShowRampAssignModal(false);
    playChime('call');
    showToast(`Çağrı Başarılı! ${vehicle.dorsePlaka} plakalı araç ${ramp.ad} için çağrıldı.`, 'success');

    // Web Push / Mobil Sistem Bildirimi & Kayan In-App Bildirim
    const shareOpts: FormatVehicleMessageOptions = {
      vehicle: updatedVehicle,
      rampName: ramp.ad,
      eventType: 'ramp_called',
      warehouseName: getWarehouseNameById(updatedVehicle.depoId)
    };
    setWhatsappShareOptions(shareOpts);
    setShowWhatsAppSharePrompt(true);

    if (whatsappConfig.enabled && whatsappConfig.autoShareOnRampCall) {
      sendVehicleToWhatsAppGroup(shareOpts, whatsappConfig).then((res) => {
        setWhatsappApiStatus(res);
        if (res.success) {
          showToast(`WhatsApp Grubuna Bildirildi: ${updatedVehicle.dorsePlaka} çağrısı`, 'info');
        }
      }).catch(console.error);
    }

    if (pushSettings.enabled && pushSettings.notifyOnAdminCall) {
      sendNativeNotification({
        title: '🚨 RAMPAYA ARAÇ ÇAĞRILDI!',
        body: `${vehicle.dorsePlaka} (${vehicle.musteri}) -> ${ramp.ad} için çağrıldı.`,
        soundType: 'call',
        tag: `ramp-call-${vehicle.id}`
      });
      setInAppAlert({
        id: `call-${vehicle.id}`,
        title: 'Rampaya Araç Çağrıldı!',
        body: `${vehicle.dorsePlaka} (${vehicle.musteri}) -> ${ramp.ad} için çağrıldı.`,
        type: 'call',
        onClick: () => {
          setSelectedDetailVehicle(updatedVehicle);
          setShowDetailViewModal(true);
        },
        onShareWhatsApp: () => {
          setWhatsappShareOptions(shareOpts);
          setShowWhatsAppSharePrompt(true);
        }
      });
    }
  };

  const handleAssignVehicleDirectlyToRamp = (vehicle: Vehicle, ramp: Ramp) => {
    // Hedef rampa dolu mu kontrol et
    const occupiedByOther = vehicles.find(
      (v) => v.rampaId === ramp.id && v.durum === 'RAMPADA' && v.id !== vehicle.id
    );
    if (occupiedByOther) {
      alert(`${ramp.ad} şu anda ${occupiedByOther.dorsePlaka} plakalı araç tarafından kullanılmaktadır.`);
      return;
    }

    const currentRampName = vehicle.rampaId ? getRampName(vehicle.rampaId) : null;
    const confirmMessage = currentRampName
      ? `Rampa değiştirmek istediğinizden emin misiniz?\n\n${vehicle.dorsePlaka} plakalı aracın rampasını ${currentRampName}'den ${ramp.ad}'ye değiştirmek üzeresiniz.`
      : `Rampa ataması yapmak istediğinizden emin misiniz?\n\n${vehicle.dorsePlaka} plakalı aracı ${ramp.ad} numaralı rampaya atamak üzeresiniz.`;

    askConfirm(
      'Rampa Atama / Değişiklik Onayı',
      confirmMessage,
      () => {
        const nowTs = Date.now();
        const oldRampId = vehicle.rampaId;
        const updatedVehicle: Vehicle = {
          ...vehicle,
          rampaId: ramp.id,
          durum: 'RAMPADA',
          rampadaTimestamp: nowTs,
          isRampayaCagrildi: false,
          cagrildigiRampaId: null
        };
        const updatedRamp: Ramp = { ...ramp, durum: 'Dolu' };

        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
        );
        setRamps((prev) =>
          prev.map((r) => {
            if (r.id === ramp.id) {
              return updatedRamp;
            }
            if (oldRampId && r.id === oldRampId) {
              const updatedOldR: Ramp = { ...r, durum: 'Boş' };
              saveRampToFirestore(updatedOldR);
              return updatedOldR;
            }
            return r;
          })
        );
        saveVehicleToFirestore(updatedVehicle);
        saveRampToFirestore(updatedRamp);

        // Bildirimi tamamen sil ve temizle
        removeVehicleCallNotifications(vehicle.id, vehicle.dorsePlaka);

        setShowRampAssignModal(false);
        setSelectedRampForAssign(null);
        playChime('success');
        showToast(`${vehicle.dorsePlaka} plakalı araç ${ramp.ad} numarasına atandı ve çağrı bildirimi silindi.`, 'success');

        // WhatsApp Grubu Bildirimi
        const directShareOpts: FormatVehicleMessageOptions = {
          vehicle: updatedVehicle,
          rampName: ramp.ad,
          eventType: 'ramp_assigned',
          warehouseName: getWarehouseNameById(updatedVehicle.depoId)
        };
        setWhatsappShareOptions(directShareOpts);
        setShowWhatsAppSharePrompt(true);

        if (whatsappConfig.enabled && whatsappConfig.autoShareOnRampAssign) {
          sendVehicleToWhatsAppGroup(directShareOpts, whatsappConfig).then((res) => {
            setWhatsappApiStatus(res);
            if (res.success) {
              showToast(`WhatsApp Grubuna Bildirildi: ${updatedVehicle.dorsePlaka} -> ${ramp.ad}`, 'info');
            }
          }).catch(console.error);
        }

        // Web Push / Mobil Sistem Bildirimi & Kayan In-App Bildirim
        if (pushSettings.enabled && pushSettings.notifyOnRampAssign) {
          sendNativeNotification({
            title: '🚪 Rampa Ataması Yapıldı!',
            body: `${updatedVehicle.dorsePlaka} (${updatedVehicle.musteri}) -> ${ramp.ad} üzerine atandı.`,
            soundType: 'call',
            tag: `ramp-assign-${updatedVehicle.id}`
          });
          setInAppAlert({
            id: `assign-direct-${updatedVehicle.id}`,
            title: `Rampa Atandı: ${ramp.ad}`,
            body: `${updatedVehicle.dorsePlaka} (${updatedVehicle.musteri}) -> ${ramp.ad} rampasına yönlendirildi!`,
            type: 'assign',
            onClick: () => {
              setSelectedDetailVehicle(updatedVehicle);
              setShowDetailViewModal(true);
            },
            onShareWhatsApp: () => {
              setWhatsappShareOptions(directShareOpts);
              setShowWhatsAppSharePrompt(true);
            }
          });
        }
      },
      'warning',
      'Evet, Rampaya Ata'
    );
  };

  const handleConfirmSecurityOrientation = (notification: AppNotification, rampId: number, note: string) => {
    // Hedef rampa dolu mu kontrol et
    const occupiedByOther = vehicles.find(
      (v) => v.rampaId === rampId && v.durum === 'RAMPADA' && v.id !== notification.vehicleId
    );
    if (occupiedByOther) {
      alert(`Seçilen rampa şu anda ${occupiedByOther.dorsePlaka} plakalı araç tarafından kullanılmaktadır.`);
      return;
    }

    const nowTs = Date.now();
    let updatedVehicleRecord: Vehicle | null = null;
    let oldRampId: number | null = null;

    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === notification.vehicleId) {
          oldRampId = v.rampaId;
          const updatedNotes = v.guvenlikNotlari ? [...v.guvenlikNotlari] : [];
          if (note.trim()) {
            updatedNotes.unshift({
              note: note.trim(),
              time: new Date(nowTs).toLocaleString('tr-TR'),
              author: currentUser?.username || 'Güvenlik'
            });
          }
          updatedVehicleRecord = {
            ...v,
            rampaId: rampId,
            durum: 'RAMPADA',
            rampadaTimestamp: nowTs,
            isRampayaCagrildi: false,
            cagrildigiRampaId: null,
            guvenlikNotlari: updatedNotes
          };
          return updatedVehicleRecord;
        }
        return v;
      })
    );

    if (updatedVehicleRecord) {
      saveVehicleToFirestore(updatedVehicleRecord);
    }

    // Rampaları güncelle ve Firestore'a kaydet
    setRamps((prev) =>
      prev.map((r) => {
        if (r.id === rampId) {
          const updatedR: Ramp = { ...r, durum: 'Dolu' };
          saveRampToFirestore(updatedR);
          return updatedR;
        }
        if (oldRampId && r.id === oldRampId) {
          const updatedOldR: Ramp = { ...r, durum: 'Boş' };
          saveRampToFirestore(updatedOldR);
          return updatedOldR;
        }
        return r;
      })
    );

    // Bildirimi Firestore'dan ve yerel durumdan kalıcı olarak sil
    deleteNotificationFromFirestore(notification.id);
    removeVehicleCallNotifications(notification.vehicleId, notification.plaka);

    setShowSecurityActionModal(false);
    playChime('success');
    showToast(`${notification.plaka} plakalı araç ${getRampName(rampId)} numarasına yanaştırıldı ve bildirim silindi.`, 'success');

    if (updatedVehicleRecord) {
      const vRec = updatedVehicleRecord as Vehicle;
      const targetRampName = getRampName(rampId);
      const shareOpts: FormatVehicleMessageOptions = {
        vehicle: vRec,
        rampName: targetRampName,
        eventType: 'ramp_assigned',
        warehouseName: getWarehouseNameById(vRec.depoId)
      };
      setWhatsappShareOptions(shareOpts);
      setShowWhatsAppSharePrompt(true);

      if (whatsappConfig.enabled && whatsappConfig.autoShareOnRampAssign) {
        sendVehicleToWhatsAppGroup(shareOpts, whatsappConfig).then((res) => {
          setWhatsappApiStatus(res);
        }).catch(console.error);
      }

      if (pushSettings.enabled && pushSettings.notifyOnRampAssign) {
        sendNativeNotification({
          title: '🚪 Rampa Yönlendirmesi Tamamlandı!',
          body: `${vRec.dorsePlaka} (${vRec.musteri}) -> ${targetRampName} rampasına yanaştırıldı.`,
          soundType: 'call',
          tag: `ramp-docked-${vRec.id}`
        });
        setInAppAlert({
          id: `docked-${vRec.id}`,
          title: `Rampaya Yanaştırıldı: ${targetRampName}`,
          body: `${vRec.dorsePlaka} (${vRec.musteri}) -> ${targetRampName} rampasına yanaştırıldı.`,
          type: 'assign',
          onClick: () => {
            setSelectedDetailVehicle(vRec);
            setShowDetailViewModal(true);
          },
          onShareWhatsApp: () => {
            setWhatsappShareOptions(shareOpts);
            setShowWhatsAppSharePrompt(true);
          }
        });
      }
    }
  };

  const handleSaveSecurityNoteOnly = (notification: AppNotification, note: string) => {
    const nowTs = Date.now();
    let updatedVehicleRecord: Vehicle | null = null;

    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === notification.vehicleId) {
          const updatedNotes = v.guvenlikNotlari ? [...v.guvenlikNotlari] : [];
          updatedNotes.unshift({
            note: note.trim(),
            time: new Date(nowTs).toLocaleString('tr-TR'),
            author: currentUser?.username || 'Güvenlik'
          });
          updatedVehicleRecord = { ...v, guvenlikNotlari: updatedNotes };
          return updatedVehicleRecord;
        }
        return v;
      })
    );

    if (updatedVehicleRecord) {
      saveVehicleToFirestore(updatedVehicleRecord);
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, securityNote: note.trim() } : n))
    );

    const feedbackNotif: AppNotification = {
      id: Date.now(),
      type: 'FEEDBACK_TO_ADMIN',
      vehicleId: notification.vehicleId,
      plaka: notification.plaka,
      text: `💬 GÜVENLİK NOTU (${notification.plaka}): "${note.trim()}"`,
      time: new Date().toLocaleTimeString('tr-TR').slice(0, 5),
      status: 'OKUNDU',
      securityNote: note.trim()
    };
    setNotifications((prev) => [feedbackNotif, ...prev]);
    saveNotificationToFirestore(feedbackNotif);

    setShowSecurityActionModal(false);
    showToast('Geri bildirim notu araca ve sisteme başarıyla eklendi.', 'info');
  };

  const handleUndoExit = (vehicle: Vehicle) => {
    askConfirm(
      'Çıkışı Geri Al',
      `${vehicle.dorsePlaka} plakalı aracın çıkış işlemini iptal edip sahaya (EVRAK HAZIR durumuna) geri almak istediğinizden emin misiniz?`,
      () => {
        const updatedVehicle: Vehicle = {
          ...vehicle,
          durum: 'EVRAK HAZIR',
          rampaId: null,
          cikisTarihi: null,
          cikisTimestamp: null
        };
        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicle.id ? updatedVehicle : v))
        );
        saveVehicleToFirestore(updatedVehicle);
        showToast(`${vehicle.dorsePlaka} plakalı araç başarıyla sahaya geri alındı.`, 'success');
      }
    );
  };

  const handleSaveVehicleEdit = (updated: Vehicle) => {
    const nowStr = new Date().toLocaleString('tr-TR');
    const nowTs = Date.now();

    const originalVehicle = vehicles.find((v) => v.id === updated.id);

    // 1. Evrak hazır yetki kontrolü
    if (updated.durum === 'EVRAK HAZIR' && originalVehicle?.durum !== 'EVRAK HAZIR') {
      if (currentUser?.role !== 'admin') {
        alert("Bir aracın durumunu 'EVRAK HAZIR' yapma yetkisi sadece Yöneticiye (Admin) aittir.");
        return;
      }
    }

    // 2. Hedef rampa dolu mu kontrol et
    if (updated.rampaId && updated.rampaId !== originalVehicle?.rampaId) {
      const occupiedByOther = vehicles.find(
        (v) => v.rampaId === updated.rampaId && v.durum === 'RAMPADA' && v.id !== updated.id
      );
      if (occupiedByOther) {
        alert(`Seçilen rampa şu anda ${occupiedByOther.dorsePlaka} plakalı araç tarafından kullanılmaktadır. Lütfen boş bir rampa seçiniz.`);
        return;
      }
    }

    const applySave = (vToSave: Vehicle) => {
      let finalVehicle = { ...vToSave };

      if (finalVehicle.durum === 'ÇIKIŞ YAPTI') {
        if (!finalVehicle.cikisTarihi) {
          finalVehicle.cikisTarihi = nowStr;
          finalVehicle.cikisTimestamp = nowTs;
        }
        finalVehicle.rampaId = null;
        finalVehicle.isRampayaCagrildi = false;
        finalVehicle.cagrildigiRampaId = null;

        if (originalVehicle?.rampaId) {
          setRamps((prev) =>
            prev.map((r) => {
              if (r.id === originalVehicle.rampaId) {
                const updatedR: Ramp = { ...r, durum: 'Boş' };
                saveRampToFirestore(updatedR);
                return updatedR;
              }
              return r;
            })
          );
        }
        removeVehicleCallNotifications(finalVehicle.id, finalVehicle.dorsePlaka);
      } else {
        finalVehicle.cikisTarihi = null;
        finalVehicle.cikisTimestamp = null;
      }

      // Rampa atandıysa veya rampa değiştiyse
      if (finalVehicle.rampaId) {
        if (finalVehicle.durum === 'EVRAK HAZIR' || finalVehicle.durum === 'BEKLEMEDE') {
          finalVehicle.durum = 'RAMPADA';
          finalVehicle.rampadaTimestamp = nowTs;
        }
        finalVehicle.isRampayaCagrildi = false;
        finalVehicle.cagrildigiRampaId = null;

        setRamps((prev) =>
          prev.map((r) => {
            if (r.id === finalVehicle.rampaId) {
              const updatedR: Ramp = { ...r, durum: 'Dolu' };
              saveRampToFirestore(updatedR);
              return updatedR;
            }
            if (originalVehicle?.rampaId && r.id === originalVehicle.rampaId && r.id !== finalVehicle.rampaId) {
              const updatedOldR: Ramp = { ...r, durum: 'Boş' };
              saveRampToFirestore(updatedOldR);
              return updatedOldR;
            }
            return r;
          })
        );
        removeVehicleCallNotifications(finalVehicle.id, finalVehicle.dorsePlaka);
      } else if (originalVehicle?.rampaId && !finalVehicle.rampaId) {
        // Rampası kaldırıldıysa eski rampayı boşa çıkar
        setRamps((prev) =>
          prev.map((r) => {
            if (r.id === originalVehicle.rampaId) {
              const updatedR: Ramp = { ...r, durum: 'Boş' };
              saveRampToFirestore(updatedR);
              return updatedR;
            }
            return r;
          })
        );
        removeVehicleCallNotifications(finalVehicle.id, finalVehicle.dorsePlaka);
      }

      if (finalVehicle.islemTuru === 'Tahliye') {
        finalVehicle.islemTuru = 'Boşaltma';
      }

      if (finalVehicle.musteri && finalVehicle.musteri.trim()) {
        handleAddNewCustomerByName(finalVehicle.musteri.trim());
      }

      setVehicles((prev) => prev.map((v) => (v.id === finalVehicle.id ? finalVehicle : v)));
      saveVehicleToFirestore(finalVehicle);
      setShowEditVehicleModal(false);
      setSelectedVehicleForEdit(null);
      showToast('Araç bilgileri başarıyla güncellendi.', 'success');
    };

    // 3. Rampadaki aracı EVRAK HAZIR durumuna getirme onay sorgusu
    if (originalVehicle && (originalVehicle.durum === 'RAMPADA' || originalVehicle.rampaId) && updated.durum === 'EVRAK HAZIR') {
      if (currentUser?.role !== 'admin') {
        alert("Rampadaki aracı 'EVRAK HAZIR' durumuna alma yetkisi sadece Yöneticidedir (Admin).");
        return;
      }
      const rampName = getRampName(originalVehicle.rampaId);
      askConfirm(
        "Rampadaki Aracı 'EVRAK HAZIR' Durumuna Geri Al",
        `${originalVehicle.dorsePlaka} plakalı araç şu anda ${rampName} üzerinde bulunmaktadır. Araç rampadan indirilip rampa 'Boş' durumuna getirilecek ve aracın durumu 'EVRAK HAZIR' olarak güncellenecektir. Onaylıyor musunuz?`,
        () => {
          const vehicleToSave: Vehicle = {
            ...updated,
            rampaId: null,
            durum: 'EVRAK HAZIR',
            isRampayaCagrildi: false,
            cagrildigiRampaId: null,
            evrakHazirTimestamp: nowTs
          };
          applySave(vehicleToSave);
        },
        'warning',
        'Evet, EVRAK HAZIR Yap'
      );
      return;
    }

    // 4. Rampadaki aracı BEKLEMEDE durumuna geri alma onay sorgusu
    if (originalVehicle && (originalVehicle.durum === 'RAMPADA' || originalVehicle.rampaId) && updated.durum === 'BEKLEMEDE') {
      const rampName = getRampName(originalVehicle.rampaId);
      askConfirm(
        "Rampadaki Aracı 'BEKLEMEDE' Durumuna Geri Çek",
        `${originalVehicle.dorsePlaka} plakalı araç şu anda ${rampName} üzerinde bulunmaktadır. Araç rampadan indirilip rampa 'Boş' durumuna getirilecek ve aracın durumu 'BEKLEMEDE' (bekleme sahası) olarak güncellenecektir. Onaylıyor musunuz?`,
        () => {
          const vehicleToSave: Vehicle = {
            ...updated,
            rampaId: null,
            durum: 'BEKLEMEDE',
            isRampayaCagrildi: false,
            cagrildigiRampaId: null
          };
          applySave(vehicleToSave);
        },
        'warning',
        'Evet, BEKLEMEDE Yap'
      );
      return;
    }

    // 5. Rampa Değişikliği / Ataması Onay Sorgusu
    if (originalVehicle && updated.rampaId && updated.rampaId !== originalVehicle.rampaId && updated.durum !== 'ÇIKIŞ YAPTI') {
      const oldRamp = getRampName(originalVehicle.rampaId);
      const newRamp = getRampName(updated.rampaId);
      const msg = oldRamp
        ? `Rampa değiştirmek istediğinizden emin misiniz?\n\n${updated.dorsePlaka} plakalı aracın rampasını ${oldRamp}'den ${newRamp}'ye taşımak istediğinizden emin misiniz?`
        : `Rampa ataması yapmak istediğinizden emin misiniz?\n\n${updated.dorsePlaka} plakalı aracı ${newRamp} üzerine atamak istediğinizden emin misiniz?`;

      askConfirm(
        'Rampa Değişikliği Onayı',
        msg,
        () => {
          applySave(updated);
        },
        'warning',
        'Evet, Rampa Değiştir'
      );
      return;
    }

    applySave(updated);
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    askConfirm(
      'Aracı Kalıcı Olarak Sil',
      `${vehicle.dorsePlaka} plakalı aracı sistemden tamamen silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      () => {
        const oldRampId = vehicle.rampaId;
        setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
        deleteVehicleFromFirestore(vehicle.id);
        if (oldRampId) {
          setRamps((prev) =>
            prev.map((r) => {
              if (r.id === oldRampId) {
                const updatedR: Ramp = { ...r, durum: 'Boş' };
                saveRampToFirestore(updatedR);
                return updatedR;
              }
              return r;
            })
          );
        }
        removeVehicleCallNotifications(vehicle.id, vehicle.dorsePlaka, true);
        setShowEditVehicleModal(false);
        setSelectedVehicleForEdit(null);
        showToast(`${vehicle.dorsePlaka} plakalı araç kalıcı olarak silindi.`, 'info');
      },
      'danger',
      'Evet, Sil'
    );
  };

  const handleAddUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
    saveUserToFirestore(newUser);
    showToast(`Yeni kullanıcı eklendi ve tüm cihazlarla eşitlendi: ${newUser.username}`, 'success');
  };

  const handleEditUser = (user: User) => {
    setUsers((prev) => prev.map((u) => (u.username === user.username ? user : u)));
    saveUserToFirestore(user);
    if (currentUser?.username === user.username) {
      setCurrentUser(user);
    }
    showToast(`${user.username} kullanıcısının yetkileri tüm cihazlarda güncellendi.`, 'success');
  };

  const handleDeleteUser = (user: User) => {
    setUsers((prev) => prev.filter((u) => u.username !== user.username));
    deleteUserFromFirestore(user.username);
    showToast(`${user.username} kullanıcısı tüm sistemden silindi.`, 'info');
  };

  const handleChangePassword = (username: string, newPass: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.username === username) {
          const updated = { ...u, password: newPass };
          saveUserToFirestore(updated);
          if (currentUser?.username === username) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
    showToast(`${username} kullanıcısının şifresi başarıyla güncellendi ve tüm cihazlara aktarıldı.`, 'success');
  };

  const handleDeleteChatMessage = (id: number) => {
    setChatMessages((prev) => prev.filter((m) => m.id !== id));
    deleteChatMessageFromFirestore(id);
    showToast('Mesaj silindi.', 'info');
  };

  const handleClearChatMessages = () => {
    askConfirm(
      'Sohbet Geçmişini Temizle',
      'Tüm mesajlaşma geçmişini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem tüm cihazlarda geçerli olacaktır.',
      () => {
        setChatMessages([]);
        clearChatMessagesFromFirestore();
        showToast('Sohbet geçmişi tüm cihazlarda temizlendi.', 'info');
      },
      'danger',
      'Evet, Tümünü Sil'
    );
  };

  const handleClearCompletedNotifications = () => {
    const toDelete = notifications.filter((n) => n.status !== 'BEKLİYOR');
    toDelete.forEach((n) => deleteNotificationFromFirestore(n.id));
    setNotifications((prev) => prev.filter((n) => n.status === 'BEKLİYOR'));
    showToast(`${toDelete.length} adet tamamlanmış bildirim temizlendi.`, 'info');
  };

  const handleClearAllNotifications = () => {
    askConfirm(
      'Tüm Bildirimleri Temizle',
      'Tüm çağrı ve işlem bildirimlerini kalıcı olarak silmek istediğinizden emin misiniz?',
      () => {
        notifications.forEach((n) => deleteNotificationFromFirestore(n.id));
        setNotifications([]);
        showToast('Tüm bildirimler kalıcı olarak silindi.', 'info');
      }
    );
  };

  const handleSendChatMessage = (msgText: string, replyTo?: ChatReply | null, mentions?: string[]) => {
    if (!currentUser) return;
    const newMsg: ChatMessage = {
      id: Date.now(),
      sender: currentUser.username,
      role: currentUser.role,
      text: msgText,
      time: new Date().toLocaleTimeString('tr-TR').slice(0, 5),
      replyTo: replyTo || null,
      mentions: mentions && mentions.length > 0 ? mentions : []
    };
    setChatMessages((prev) => [...prev, newMsg]);
    saveChatMessageToFirestore(newMsg);
  };

  const handleExportCsv = (list: Vehicle[]) => {
    exportVehiclesToCsv(list, getWarehouseNameById, getRampName);
  };

  // 1. Render Login Screen if no user logged in
  if (!currentUser) {
    return (
      <LoginView
        warehouses={warehouses}
        users={users}
        onLoginSuccess={handleLoginSuccess}
        onLoginAsGuest={handleLoginAsGuest}
      />
    );
  }

  // 2. Render Guest Portal if role is 'guest'
  if (currentUser.role === 'guest') {
    return (
      <GuestPortal
        vehicles={vehicles}
        getRampName={getRampName}
        onLogout={handleLogout}
        onOpenPhotoGallery={(v) => {
          setSelectedVehicleForPhoto(v);
          setShowPhotoGalleryModal(true);
        }}
      />
    );
  }

  // 3. Render Admin / Security Yard Management System (YMS)
  const tabTitles: Record<ActiveTab, string> = {
    dashboard: 'Genel Bakış Dashboard',
    beklenen: 'Beklenen Araçlar Portalı',
    canli: 'Canlı Saha İzleme',
    araclar: 'Araç Yönetimi Listesi',
    rampalar: '12 Rampa Yönetimi',
    raporlar: 'Raporlar ve Geçmiş Kayıtlar'
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 pb-16 md:pb-0 font-sans text-slate-800">
      {/* ================= Sol Sidebar Menu (Masaüstü) ================= */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col justify-between shrink-0 shadow-xl no-print">
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-white text-sm leading-tight">YMS PANEL</h1>
              <span className="text-[10px] text-blue-400 font-semibold block truncate max-w-[140px]">
                <WarehouseIcon className="w-3 h-3 inline mr-1" />
                {currentWarehouseName}
              </span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {currentUser.role !== 'security' && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 shrink-0" /> Dashboard
              </button>
            )}

            <button
              onClick={() => setActiveTab('beklenen')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
                activeTab === 'beklenen'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" /> Beklenen Araçlar
              </span>
              {pendingExpectedVehiclesCount > 0 && (
                <span className="bg-amber-500 text-slate-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  {pendingExpectedVehiclesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('canli')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
                activeTab === 'canli'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-5 h-5 shrink-0" /> Canlı İzleme
            </button>

            <button
              onClick={() => setActiveTab('araclar')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
                activeTab === 'araclar'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Truck className="w-5 h-5 shrink-0" /> Araç Yönetimi
            </button>

            <button
              onClick={() => setActiveTab('rampalar')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
                activeTab === 'rampalar'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <WarehouseIcon className="w-5 h-5 shrink-0" /> Rampa Yönetimi
            </button>

            {currentUser.role !== 'security' && (
              <button
                onClick={() => setActiveTab('raporlar')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition cursor-pointer ${
                  activeTab === 'raporlar'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-5 h-5 shrink-0" /> Raporlar
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {currentUser.username[0]?.toUpperCase() || 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{currentUser.username}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-blue-400 capitalize">{currentUser.role}</span>
                  <span className="text-slate-600">•</span>
                  <span
                    className="inline-flex items-center gap-1 text-[9px]"
                    title={isFirebaseConnected ? 'Firebase Canlı Veritabanı Aktif' : 'Bulut veritabanına bağlanıyor...'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isFirebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className={isFirebaseConnected ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                      {isFirebaseConnected ? 'Canlı' : 'Bağlanıyor'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 text-sm p-1 cursor-pointer transition"
              title="Çıkış Yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="w-full py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Briefcase className="w-3 h-3 text-teal-200" /> Firma / Müşteri Yönetimi
              </button>
              <button
                onClick={() => setShowUserManagementModal(true)}
                className="w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Users className="w-3 h-3" /> Kullanıcı Yönetimi
              </button>
              <button
                onClick={() => setShowWarehouseModal(true)}
                className="w-full py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <Building className="w-3 h-3 text-indigo-200" /> Depo Yönetimi (Aktif/Pasif)
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3 h-3" /> Şifre Değiştir
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ================= Mobil Alt Navigasyon Barı ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-slate-400 border-t border-slate-800 flex justify-around items-center h-16 z-40 shadow-2xl no-print px-2">
        {currentUser.role === 'security' ? (
          <>
            <button
              onClick={() => setActiveTab('beklenen')}
              className={`flex-1 py-2 flex flex-col items-center gap-1 text-[11px] relative cursor-pointer transition ${
                activeTab === 'beklenen' ? 'text-amber-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span>Beklenen</span>
              {pendingExpectedVehiclesCount > 0 && (
                <span className="absolute top-1.5 right-6 bg-amber-500 text-slate-900 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {pendingExpectedVehiclesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('canli')}
              className={`flex-1 py-2 flex flex-col items-center gap-1 text-[11px] cursor-pointer transition ${
                activeTab === 'canli' ? 'text-blue-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tv className="w-5 h-5" />
              <span>Canlı İzle</span>
            </button>

            <button
              onClick={() => setActiveTab('araclar')}
              className={`flex-1 py-2 flex flex-col items-center gap-1 text-[11px] cursor-pointer transition ${
                activeTab === 'araclar' ? 'text-blue-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-5 h-5" />
              <span>Araç Yönetimi</span>
            </button>

            <button
              onClick={() => setActiveTab('rampalar')}
              className={`flex-1 py-2 flex flex-col items-center gap-1 text-[11px] cursor-pointer transition ${
                activeTab === 'rampalar' ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <WarehouseIcon className="w-5 h-5" />
              <span>Rampa Yönetimi</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-1.5 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-blue-400 font-black bg-slate-800/90'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-[10px]">Özet</span>
            </button>
            <button
              onClick={() => setActiveTab('beklenen')}
              className={`flex-1 py-1.5 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl relative transition cursor-pointer ${
                activeTab === 'beklenen'
                  ? 'text-amber-400 font-black bg-slate-800/90'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-[10px]">Beklenen</span>
              {pendingExpectedVehiclesCount > 0 && (
                <span className="absolute top-1 right-2 bg-amber-500 text-slate-900 font-extrabold text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center shadow">
                  {pendingExpectedVehiclesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('canli')}
              className={`flex-1 py-1.5 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition cursor-pointer ${
                activeTab === 'canli'
                  ? 'text-blue-400 font-black bg-slate-800/90'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span className="text-[10px]">Canlı</span>
            </button>
            <button
              onClick={() => setActiveTab('araclar')}
              className={`flex-1 py-1.5 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition cursor-pointer ${
                activeTab === 'araclar'
                  ? 'text-blue-400 font-black bg-slate-800/90'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span className="text-[10px]">Araçlar</span>
            </button>
            <button
              onClick={() => setActiveTab('rampalar')}
              className={`flex-1 py-1.5 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition cursor-pointer ${
                activeTab === 'rampalar'
                  ? 'text-blue-400 font-black bg-slate-800/90'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <WarehouseIcon className="w-4 h-4" />
              <span className="text-[10px]">Rampalar</span>
            </button>
            <button
              onClick={() => setActiveTab('raporlar')}
              className={`flex-1 py-1.5 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition cursor-pointer ${
                activeTab === 'raporlar'
                  ? 'text-blue-400 font-black bg-slate-800/90'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-[10px]">Rapor</span>
            </button>
          </>
        )}
      </div>

      {/* ================= Sağ İçerik Alanı ================= */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 relative">
        {/* Üst Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-3 md:px-6 flex items-center justify-between shrink-0 shadow-sm no-print">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
            <h2 className="text-sm md:text-lg font-bold text-slate-800 capitalize truncate">
              {tabTitles[activeTab]}
            </h2>

            <div className="flex items-center gap-1 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 max-w-[130px] sm:max-w-none">
              <WarehouseIcon className="w-3.5 h-3.5 text-blue-600 ml-1 shrink-0" />
              <select
                value={selectedDepoId}
                onChange={(e) => setSelectedDepoId(Number(e.target.value))}
                className="bg-transparent font-bold text-xs text-slate-700 outline-none cursor-pointer truncate max-w-[100px] sm:max-w-none"
              >
                {currentUser.role === 'admin' && (
                  <option value={0}>🌐 Tüm Depolar</option>
                )}
                {userAllowedWarehouses.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.ad}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 relative shrink-0">
            {/* BEKLENEN ARAÇ HIZLI BUTON (Mobil ve Masaüstü Optimize) */}
            <button
              onClick={() => setActiveTab('beklenen')}
              title="Beklenen Araçlar"
              className="px-2.5 py-1.5 md:py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer relative shrink-0 h-9"
            >
              <Truck className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="hidden lg:inline">Beklenen Araçlar</span>
              {pendingExpectedVehiclesCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {pendingExpectedVehiclesCount}
                </span>
              )}
            </button>

            {/* RAMPAYA ÇAĞRILAN ARAÇLAR BİLDİRİM BUTONU (Mobil ve Masaüstü Optimize) */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className="px-2.5 py-1.5 md:py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer relative shrink-0 h-9"
                title="Rampaya Çağrılan Araçlar"
              >
                <Megaphone
                  className={`w-4 h-4 text-purple-600 shrink-0 ${
                    pendingNotificationsCount > 0 ? 'animate-bounce text-amber-600' : ''
                  }`}
                />
                <span className="hidden lg:inline">Rampaya Çağrılan Araçlar</span>
                {pendingNotificationsCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                    {pendingNotificationsCount}
                  </span>
                )}
              </button>

              {/* Mobil Arka Plan Karartması */}
              {showNotificationMenu && (
                <div
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] z-40 md:hidden"
                  onClick={() => setShowNotificationMenu(false)}
                />
              )}

              {showNotificationMenu && (
                <div className="fixed inset-x-2 top-16 md:absolute md:inset-x-auto md:right-0 md:top-full mt-2 w-auto md:w-[420px] max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3.5 bg-slate-900 text-white font-bold flex justify-between items-center border-b border-slate-800">
                    <span className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-amber-400" /> Rampaya Çağrılan Araçlar
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleClearCompletedNotifications}
                        title="İşlem yapılanları temizle"
                        className="text-[10px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition cursor-pointer"
                      >
                        Tamamlananları Sil
                      </button>
                      <button
                        onClick={() => setShowNotificationMenu(false)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer md:hidden"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 custom-scroll">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setSelectedSecurityNotification(n);
                          setShowSecurityActionModal(true);
                          setShowNotificationMenu(false);
                        }}
                        className={`p-3.5 transition cursor-pointer ${
                          n.status === 'BEKLİYOR'
                            ? 'bg-amber-50/90 hover:bg-amber-100/90 border-l-4 border-amber-500'
                            : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold text-slate-900 text-xs leading-relaxed flex-1">{n.text}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(n.id);
                            }}
                            title="Bildirimi Sil"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded transition cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {n.securityNote && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[10px]">
                            <b>Güvenlik Notu:</b> {n.securityNote}
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 mt-2 flex justify-between items-center pt-1 border-t border-slate-200/50">
                          <span className="flex items-center gap-1">
                            <Clock3 className="w-3 h-3" /> Saat: {n.time}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-extrabold text-[9px] ${
                              n.status === 'BEKLİYOR'
                                ? 'bg-amber-500 text-slate-900'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {n.status === 'BEKLİYOR' ? 'BEKLİYOR' : 'İŞLEM YAPILDI'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Henüz yeni çağrı bildirimi bulunmuyor.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* WhatsApp Entegrasyon butonu (Mobil & Masaüstü) */}
            <button
              onClick={() => setShowWhatsAppModal(true)}
              title="WhatsApp Grubu API ve Otomasyon Ayarları"
              className={`flex px-2 sm:px-2.5 md:px-3 py-1.5 md:py-2 text-xs font-bold rounded-xl transition items-center gap-1.5 cursor-pointer relative shrink-0 ${
                whatsappConfig.enabled
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">WhatsApp</span>
              {whatsappConfig.enabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            {/* Web Push & Sistem Bildirimleri butonu (Mobil & Masaüstü) */}
            <button
              onClick={() => {
                if (pushPermission !== 'granted') {
                  requestNotificationPermission().then((p) => {
                    setPushPermission(p);
                    if (p === 'granted') {
                      sendNativeNotification({
                        title: '🔔 Bildirimler Aktif!',
                        body: 'Lojistik & Depo bildirimleri telefonunuzda başarıyla etkinleştirildi.',
                        soundType: 'success'
                      });
                      showToast('Bildirimler telefonunuzda etkinleştirildi!', 'success');
                    } else {
                      setShowPushSettingsModal(true);
                    }
                  });
                } else {
                  setShowPushSettingsModal(true);
                }
              }}
              title={
                pushPermission === 'granted'
                  ? 'Tarayıcı Sistem Bildirimleri Aktif'
                  : 'Tarayıcı Bildirimlerini Etkinleştir'
              }
              className={`flex px-2 sm:px-2.5 md:px-3 py-1.5 md:py-2 text-xs font-bold rounded-xl transition items-center gap-1.5 cursor-pointer shrink-0 ${
                pushPermission === 'granted'
                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                  : 'bg-amber-500 text-slate-950 font-black hover:bg-amber-400 border border-amber-400 shadow-sm animate-pulse'
              }`}
            >
              <Bell className="w-4 h-4 text-inherit" />
              <span className="hidden sm:inline">
                {pushPermission === 'granted' ? 'Bildirimler' : 'Bildirimleri Aç'}
              </span>
            </button>

            {/* Sesli Uyarı Aç/Kapat butonu (Masaüstü) */}
            <button
              onClick={toggleSound}
              title={isSoundEnabled ? 'Sesli Uyarılar Açık (Tıklayınca Sessize Alır)' : 'Sesli Uyarılar Kapalı (Tıklayınca Açar)'}
              className={`hidden md:flex px-2.5 md:px-3 py-2 text-xs font-semibold rounded-xl transition items-center gap-1.5 cursor-pointer ${
                isSoundEnabled
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden lg:inline">{isSoundEnabled ? 'Ses Açık' : 'Sessiz'}</span>
            </button>

            {/* Yenile butonu (Masaüstü) */}
            <button
              onClick={handleRefreshData}
              className="hidden md:flex px-2.5 md:px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">Yenile</span>
            </button>

            {/* Yeni Araç Kaydı butonu */}
            {currentUser.role !== 'guest' && (
              <button
                onClick={handleOpenNewVehicleDirectly}
                className="px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-semibold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Yeni Araç</span>
              </button>
            )}

            {/* Mobil Menü Butonu (Yönetici İşlemleri, Ayarlar & Çıkış) */}
            <button
              onClick={() => setShowMobileAdminMenu(true)}
              className="md:hidden p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex items-center justify-center cursor-pointer border border-slate-200"
              title="Yönetim & Hızlı İşlemler Menüsü"
            >
              <Menu className="w-4 h-4 text-slate-800" />
            </button>
          </div>
        </header>

        {/* Sekme İçerikleri */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6 custom-scroll">
          {/* Mobil & Web Push Bildirimlerini Aktif Etme Banner'ı (Notification.permission !== 'granted' olduğunda şık ve zorunlu olmayan uyarı) */}
          <PushNotificationPromptBanner
            permission={pushPermission}
            onPermissionChange={(newPerm) => setPushPermission(newPerm)}
            onOpenSettings={() => setShowPushSettingsModal(true)}
          />

          {activeTab === 'dashboard' && (
            <DashboardView
              vehicles={currentWarehouseVehicles}
              ramps={ramps}
              pendingExpectedCount={pendingExpectedVehiclesCount}
              onNavigateTab={(tab) => setActiveTab(tab)}
              getRampName={getRampName}
              onOpenDetailModal={(v) => {
                setSelectedDetailVehicle(v);
                setShowDetailViewModal(true);
              }}
            />
          )}

          {activeTab === 'beklenen' && (
            <ExpectedVehiclesView
              expectedVehicles={expectedVehicles}
              selectedDepoId={selectedDepoId}
              currentUser={currentUser}
              getWarehouseNameById={getWarehouseNameById}
              onOpenAddModal={() => setShowAddExpectedModal(true)}
              onProcessArrival={handleProcessExpectedArrival}
              onDeleteSingle={handleDeleteExpectedSingle}
              onDeleteBatch={handleDeleteExpectedBatch}
              onImportExcelSuccess={handleImportExcelExpected}
            />
          )}

          {activeTab === 'canli' && (
            <LiveTrackingView
              vehicles={currentWarehouseVehicles}
              getRampName={getRampName}
              onOpenDetailModal={(v) => {
                setSelectedDetailVehicle(v);
                setShowDetailViewModal(true);
              }}
              onUndoExit={handleUndoExit}
              onCancelRampCall={handleCancelRampCall}
            />
          )}

          {activeTab === 'araclar' && (
            <VehicleManagementView
              vehicles={currentWarehouseVehicles}
              ramps={ramps}
              currentUser={currentUser}
              onOpenNewVehicleModal={handleOpenNewVehicleDirectly}
              onOpenEditModal={(v) => {
                setSelectedVehicleForEdit(v);
                setShowEditVehicleModal(true);
              }}
              onOpenDetailModal={(v) => {
                setSelectedDetailVehicle(v);
                setShowDetailViewModal(true);
              }}
              onOpenPhotoGallery={(v) => {
                setSelectedVehicleForPhoto(v);
                setShowPhotoGalleryModal(true);
              }}
              onUpdateStatus={handleUpdateVehicleStatus}
              onAssignRamp={handleAssignRamp}
              onSendAdminCallRequest={handleSendAdminCallRequest}
              onCancelRampCall={handleCancelRampCall}
              onToggleAcil={handleToggleAcil}
            />
          )}

          {activeTab === 'rampalar' && (
            <RampManagementView
              ramps={ramps}
              vehicles={vehicles}
              currentUser={currentUser}
              onRampStatusChange={handleRampStatusChange}
              onChangeVehicleRamp={handleChangeVehicleRamp}
              onReleaseRampVehicle={handleReleaseRampVehicle}
              onOpenRampAssignModal={(r) => {
                setSelectedRampForAssign(r);
                setShowRampAssignModal(true);
              }}
              onOpenDetailModal={(v) => {
                setSelectedDetailVehicle(v);
                setShowDetailViewModal(true);
              }}
            />
          )}

          {activeTab === 'raporlar' && (
            <ReportsView
              vehicles={currentWarehouseVehicles}
              currentUser={currentUser}
              getRampName={getRampName}
              onExportCsv={handleExportCsv}
              onOpenDetailModal={(v) => {
                setSelectedDetailVehicle(v);
                setShowDetailViewModal(true);
              }}
              onUndoExit={handleUndoExit}
            />
          )}
        </div>
      </main>

      {/* Canlı Saha Sohbeti Widget'ı */}
      <ChatWidget
        chatMessages={chatMessages}
        currentUser={currentUser}
        users={users}
        onSendMessage={handleSendChatMessage}
        onDeleteMessage={handleDeleteChatMessage}
        onClearMessages={handleClearChatMessages}
      />

      {/* ================= MODALLAR ================= */}
      {/* 1. Beklenen Araç Ekleme Modalı */}
      <AddExpectedVehicleModal
        isOpen={showAddExpectedModal}
        onClose={() => setShowAddExpectedModal(false)}
        warehouses={warehouses}
        selectedDepoId={selectedDepoId}
        customers={customers}
        onAddNewCustomer={handleAddNewCustomerByName}
        onSave={handleSaveExpectedVehicle}
      />

      {/* 2. Güvenlik Bildirim İşlem Modalı */}
      <SecurityActionModal
        notification={selectedSecurityNotification}
        ramps={ramps}
        vehicles={vehicles}
        onClose={() => {
          setSelectedSecurityNotification(null);
          setShowSecurityActionModal(false);
        }}
        onConfirm={handleConfirmSecurityOrientation}
        onSaveNoteOnly={handleSaveSecurityNoteOnly}
      />

      {/* 3. Admin Kullanıcı Yönetimi Modalı */}
      <UserManagementModal
        isOpen={showUserManagementModal}
        onClose={() => setShowUserManagementModal(false)}
        users={users}
        warehouses={warehouses}
        currentUser={currentUser}
        getWarehouseNameById={getWarehouseNameById}
        onAddUser={handleAddUser}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
      />

      {/* 4. Detaylı Araç Bilgi & Fotoğraf İnceleme Modalı */}
      <DetailViewModal
        vehicle={selectedDetailVehicle}
        rampName={getRampName(selectedDetailVehicle?.rampaId)}
        onClose={() => {
          setSelectedDetailVehicle(null);
          setShowDetailViewModal(false);
        }}
        onOpenPhotoGallery={(v) => {
          setSelectedVehicleForPhoto(v);
          setShowPhotoGalleryModal(true);
        }}
        onShareWhatsApp={handleShareVehicleToWhatsApp}
      />

      {/* 5. Arama Destekli Rampa Araç Atama Modalı */}
      <RampAssignModal
        ramp={selectedRampForAssign}
        vehicles={selectedDepoId === 0 ? vehicles : currentWarehouseVehicles}
        currentUser={currentUser}
        onClose={() => {
          setSelectedRampForAssign(null);
          setShowRampAssignModal(false);
        }}
        onAssign={handleAssignVehicleDirectlyToRamp}
        onCall={handleCallVehicleToRamp}
      />

      {/* 6. Güvenlik Araç Kayıt Ekranı Modalı */}
      <NewVehicleModal
        isOpen={showNewVehicleModal}
        onClose={() => {
          setShowNewVehicleModal(false);
          setProcessingExpectedVehicleId(null);
        }}
        warehouses={activeWarehouses}
        selectedDepoId={selectedDepoId}
        currentUser={currentUser}
        driverHistory={driverHistory}
        initialValues={newVehicleInitialValues}
        customers={customers}
        onAddNewCustomer={handleAddNewCustomerByName}
        onSave={handleSaveNewVehicle}
      />

      {/* 7. Fotoğraf Galerisi Modalı */}
      <PhotoGalleryModal
        vehicle={selectedVehicleForPhoto}
        onClose={() => {
          setSelectedVehicleForPhoto(null);
          setShowPhotoGalleryModal(false);
        }}
        onShareWhatsApp={handleShareVehicleToWhatsApp}
      />

      {/* 8. Araç Detayı & Düzenleme Modalı */}
      {showEditVehicleModal && selectedVehicleForEdit && (
        <EditVehicleModal
          key={`${selectedVehicleForEdit.id}-${selectedVehicleForEdit.durum}-${selectedVehicleForEdit.rampaId}`}
          vehicle={selectedVehicleForEdit}
          ramps={ramps}
          warehouses={activeWarehouses}
          currentUser={currentUser}
          customers={customers}
          onAddNewCustomer={handleAddNewCustomerByName}
          onClose={() => {
            setSelectedVehicleForEdit(null);
            setShowEditVehicleModal(false);
          }}
          onSave={handleSaveVehicleEdit}
          onDelete={currentUser?.role === 'admin' ? handleDeleteVehicle : undefined}
        />
      )}

      {/* Müşteri / Firma Yönetimi Modalı */}
      <CustomerManagementModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customers={customers}
        onAddCustomer={handleSaveCustomer}
        onUpdateCustomer={handleSaveCustomer}
        onDeleteCustomer={handleDeleteCustomer}
      />

      {/* 9. Şifre Değiştirme Modalı */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        users={users}
        onChangePassword={handleChangePassword}
      />

      {/* 10. Rampa Araç Çıkarma & Çıkış Yapma Modalı */}
      <ReleaseRampVehicleModal
        isOpen={showReleaseRampModal}
        onClose={() => {
          setShowReleaseRampModal(false);
          setSelectedVehicleForRampRelease(null);
        }}
        vehicle={selectedVehicleForRampRelease}
        rampName={getRampName(selectedVehicleForRampRelease?.rampaId)}
        currentUser={currentUser}
        onReleaseAndExit={handleConfirmRampReleaseAndExit}
        onReleaseOnly={handleConfirmRampReleaseOnly}
      />

      {/* 11. Genel Onay Modalı */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
      />

      {/* 12. Depo & Saha Yönetimi Modalı (Admin - Aktif/Pasif) */}
      <WarehouseManagementModal
        isOpen={showWarehouseModal}
        onClose={() => setShowWarehouseModal(false)}
        warehouses={warehouses}
        onToggleStatus={handleToggleWarehouseStatus}
        onAddWarehouse={handleAddWarehouse}
        onEditWarehouse={handleEditWarehouse}
      />

      {/* 13. WhatsApp Grubu Entegrasyon Ayarları Modalı */}
      <WhatsAppSettingsModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        currentConfig={whatsappConfig}
        onConfigSaved={(newCfg) => {
          setWhatsappConfig(newCfg);
          showToast('WhatsApp entegrasyon ayarları güncellendi.', 'success');
        }}
      />

      {/* 14. Web Push & Sistem Bildirim Ayarları Modalı */}
      <PushNotificationSettingsModal
        isOpen={showPushSettingsModal}
        onClose={() => setShowPushSettingsModal(false)}
        onSettingsSaved={(newCfg) => {
          setPushSettings(newCfg);
          setPushPermission(getNotificationPermission());
          showToast('Sistem bildirim ayarları kaydedildi.', 'success');
        }}
      />

      {/* 15. WhatsApp Hızlı Paylaşım & Önizleme Modalı */}
      <WhatsAppSharePromptModal
        isOpen={showWhatsAppSharePrompt}
        onClose={() => setShowWhatsAppSharePrompt(false)}
        options={whatsappShareOptions}
        apiSuccess={whatsappApiStatus?.success}
        apiMessage={whatsappApiStatus?.message}
      />

      {/* 16. Kayan Sistem Bildirimi (In-App Push Banner) */}
      <InAppNotificationBanner
        alert={inAppAlert}
        onDismiss={() => setInAppAlert(null)}
      />

      {/* 13. Mobil Yönetici & Ayarlar Menüsü (Alt Sayfa / Drawer) */}
      {showMobileAdminMenu && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 no-print animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setShowMobileAdminMenu(false)}
          />
          <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Üst Bar / Kullanıcı Bilgisi */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{currentUser.username}</h4>
                  <span className="text-[11px] font-semibold text-blue-600 capitalize flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{currentUser.role === 'admin' ? 'Yönetici (Admin)' : currentUser.role}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowMobileAdminMenu(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Yönetici Hızlı İşlemleri */}
            {currentUser.role === 'admin' && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Yönetici İşlemleri</p>
                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowCustomerModal(true);
                  }}
                  className="w-full p-3.5 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded-2xl font-bold text-xs flex items-center justify-between border border-teal-200 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-teal-600" />
                    <span>Firma / Müşteri Yönetimi</span>
                  </span>
                  <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-semibold">Tanımlamalar</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowUserManagementModal(true);
                  }}
                  className="w-full p-3.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-2xl font-bold text-xs flex items-center justify-between border border-blue-200 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Kullanıcı & İzin Yönetimi</span>
                  </span>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">Kutucuklu İzinler</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowWarehouseModal(true);
                  }}
                  className="w-full p-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-2xl font-bold text-xs flex items-center justify-between border border-indigo-200 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Building className="w-4 h-4 text-indigo-600" />
                    <span>Depo & Saha Yönetimi</span>
                  </span>
                  <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">Aktif / Pasif</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowWhatsAppModal(true);
                  }}
                  className="w-full p-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-2xl font-bold text-xs flex items-center justify-between border border-emerald-200 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp Grubu API Entegrasyonu</span>
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-semibold">
                    {whatsappConfig.enabled ? 'Aktif' : 'Ayarla'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowPushSettingsModal(true);
                  }}
                  className="w-full p-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-2xl font-bold text-xs flex items-center justify-between border border-indigo-200 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span>Web Push / Kayan Bildirimler</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    pushPermission === 'granted' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {pushPermission === 'granted' ? 'Açık' : 'İzin Ver'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowPasswordModal(true);
                  }}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-between border border-slate-200 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Key className="w-4 h-4 text-amber-500" />
                    <span>Şifre Değiştir</span>
                  </span>
                  <span className="text-slate-400">→</span>
                </button>
              </div>
            )}

            {/* Depo / Saha Görünümü */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Depo / Saha Seçimi</p>
              <div className="relative">
                <WarehouseIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-blue-600 pointer-events-none" />
                <select
                  value={selectedDepoId}
                  onChange={(e) => {
                    setSelectedDepoId(Number(e.target.value));
                    setShowMobileAdminMenu(false);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none"
                >
                  {currentUser.role === 'admin' && (
                    <option value={0}>🌐 Tüm Depolar (Genel Görünüm)</option>
                  )}
                  {userAllowedWarehouses.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.ad}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sistem Kontrolleri */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sistem Ayarları</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    toggleSound();
                  }}
                  className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    isSoundEnabled
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  {isSoundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4" />}
                  <span>{isSoundEnabled ? 'Ses Açık' : 'Sessiz'}</span>
                </button>

                <button
                  onClick={() => {
                    handleRefreshData();
                    setShowMobileAdminMenu(false);
                  }}
                  className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Verileri Yenile</span>
                </button>
              </div>

              {/* Bulut Bağlantı Durumu */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  {isFirebaseConnected ? (
                    <Cloud className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <CloudOff className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Bulut Senkronizasyonu</span>
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                  isFirebaseConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isFirebaseConnected ? 'Firebase Canlı' : 'Bağlanıyor...'}
                </span>
              </div>
            </div>

            {/* Çıkış Yap */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowMobileAdminMenu(false);
                  handleLogout();
                }}
                className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Güvenli Çıkış Yap</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. Floating Toast Bildirimi */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full transition-all">
          <div
            className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-emerald-500/50 shadow-emerald-950/30'
                : toast.type === 'warning'
                ? 'bg-slate-900 text-white border-amber-500/50 shadow-amber-950/30'
                : 'bg-slate-900 text-white border-blue-500/50 shadow-blue-950/30'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <InfoIcon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
            <span className="flex-1 leading-relaxed">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white cursor-pointer p-0.5 rounded transition"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
