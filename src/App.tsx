import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  User,
  Warehouse,
  Ramp,
  Vehicle,
  ExpectedVehicle,
  AppNotification,
  ChatMessage,
  ChatPresence,
  ActiveTab,
  Customer,
  WhatsAppConfig,
  PushNotificationSettings,
  SlaSettings
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
  exportVehiclesToCsv,
  validateVehiclePhotos
} from './utils/helpers';
import { hasPermission } from './utils/permissions';
import { DEFAULT_SLA_SETTINGS } from './utils/slaHelpers';
import { LoginView } from './components/LoginView';
import { GuestPortal } from './components/GuestPortal';
import { DashboardView } from './components/DashboardView';
import { ExpectedVehiclesView } from './components/ExpectedVehiclesView';
import { LiveTrackingView } from './components/LiveTrackingView';
import { VehicleManagementView } from './components/VehicleManagementView';
import { RampManagementView } from './components/RampManagementView';
import { ReportsView } from './components/ReportsView';
import { ChatWidget, ChatSendPayload } from './components/ChatWidget';
import { CustomerManagementModal } from './components/CustomerManagementModal';
import { WhatsAppSettingsModal } from './components/WhatsAppSettingsModal';
import { PushNotificationSettingsModal } from './components/PushNotificationSettingsModal';
import { WhatsAppSharePromptModal } from './components/WhatsAppSharePromptModal';
import { InAppNotificationBanner, InAppAlert } from './components/InAppNotificationBanner';
import { PushNotificationPromptBanner } from './components/PushNotificationPromptBanner';
import { LogiPortalIcon } from './components/LogiPortalLogo';
import {
  loadWhatsAppConfig,
  saveWhatsAppConfig,
  sendVehicleToWhatsAppGroup,
  getWhatsAppDirectShareUrl,
  formatVehicleWhatsAppMessage,
  shareViaWebShareWithFiles,
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
  EditExpectedVehicleModal,
  SecurityActionModal,
  UserManagementModal,
  WarehouseManagementModal,
  DetailViewModal,
  RampAssignModal,
  NewVehicleModal,
  ExpectedVehicleArrivalModal,
  PhotoGalleryModal,
  EditVehicleModal,
  PasswordModal,
  ReleaseRampVehicleModal,
  ConfirmModal,
  SlaSettingsModal,
  RampConfigModal
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
  MessageSquare,
  Sun,
  Moon,
  SlidersHorizontal
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
  markNotificationAsReadInFirestore,
  saveChatMessageToFirestore,
  markChatMessageAsReadInFirestore,
  subscribeToChatPresence,
  upsertChatPresenceInFirestore,
  saveWarehouseToFirestore,
  subscribeToWhatsAppSettings,
  clearAllCustomersFromFirestore,
  deleteRampFromFirestore,
  saveRampsBatchToFirestore,
  subscribeToSlaSettings,
  saveSlaSettingsToFirestore,
  subscribeToFirestoreErrors
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
  // Panel sıralamasında 1. sıradaki Canlı İzleme (canli) sekmesiyle başlasın
  const [activeTab, setActiveTab] = useState<ActiveTab>('canli');
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
      const saved = localStorage.getItem('yms_vehicles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [expectedVehicles, setExpectedVehicles] = useState<ExpectedVehicle[]>(() => {
    try {
      const saved = localStorage.getItem('yms_expected_vehicles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
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
  const [chatPresences, setChatPresences] = useState<ChatPresence[]>([]);

  // Modal Visibility States
  const [showAddExpectedModal, setShowAddExpectedModal] = useState(false);
  const [showEditExpectedModal, setShowEditExpectedModal] = useState(false);
  const [selectedExpectedVehicleForEdit, setSelectedExpectedVehicleForEdit] = useState<ExpectedVehicle | null>(null);
  const [showSecurityActionModal, setShowSecurityActionModal] = useState(false);
  const [selectedSecurityNotification, setSelectedSecurityNotification] = useState<AppNotification | null>(null);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [showDetailViewModal, setShowDetailViewModal] = useState(false);
  const [selectedDetailVehicle, setSelectedDetailVehicle] = useState<Vehicle | null>(null);
  const [showRampAssignModal, setShowRampAssignModal] = useState(false);
  const [selectedRampForAssign, setSelectedRampForAssign] = useState<Ramp | null>(null);
  const [showExpectedArrivalModal, setShowExpectedArrivalModal] = useState(false);
  const [selectedExpectedVehicleForArrival, setSelectedExpectedVehicleForArrival] = useState<ExpectedVehicle | null>(null);
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
  const [slaSettings, setSlaSettings] = useState<SlaSettings>(DEFAULT_SLA_SETTINGS);
  const [showSlaSettingsModal, setShowSlaSettingsModal] = useState(false);
  const [showRampConfigModal, setShowRampConfigModal] = useState(false);
  const [rampConfigInitialWhId, setRampConfigInitialWhId] = useState<number | undefined>(undefined);
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      if (localStorage.getItem('yms_customers_cleared') === 'true') {
        const saved = localStorage.getItem('yms_customers');
        return saved ? JSON.parse(saved) : [];
      }
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
  const isFirstNotifLoadRef = useRef(true);
  const seenNotifIdsRef = useRef<Set<number>>(new Set());
  const handledDeepLinkRef = useRef(false);
  const currentUserRef = useRef<User | null>(currentUser);
  const selectedDepoIdRef = useRef<number>(selectedDepoId);
  const activeDepoIdsRef = useRef<Set<number>>(new Set(warehouses.filter((w) => w.aktif !== false).map((w) => w.id)));

  // Siyah (Karanlık) Mod / Normal Mod Tema Durumu
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('yms_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark'; // Varsayılan: Siyah Mod
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
      localStorage.setItem('yms_theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    setPushPermission(getNotificationPermission());
    const handleFocus = () => setPushPermission(getNotificationPermission());
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // WhatsApp linkinden gelen araç fotoğrafı veya detayını tek seferlik doğrudan aç
  useEffect(() => {
    if (typeof window === 'undefined' || vehicles.length === 0 || handledDeepLinkRef.current) return;
    try {
      const url = new URL(window.location.href);
      const aracId = url.searchParams.get('aracId') || url.searchParams.get('arac');
      if (aracId) {
        handledDeepLinkRef.current = true;
        const viewParam = url.searchParams.get('view');
        const found = vehicles.find((v) => v.id === Number(aracId));
        if (found) {
          if (viewParam === 'photos') {
            setSelectedVehicleForPhoto(found);
            setShowPhotoGalleryModal(true);
          } else {
            setSelectedDetailVehicle(found);
            setShowDetailViewModal(true);
          }
        }
        url.searchParams.delete('aracId');
        url.searchParams.delete('arac');
        url.searchParams.delete('view');
        const remainingQuery = url.searchParams.toString();
        window.history.replaceState({}, '', url.pathname + (remainingQuery ? '?' + remainingQuery : '') + url.hash);
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

  useEffect(() => {
    return subscribeToFirestoreErrors((msg) => {
      showToast(msg, 'warning');
    });
  }, [showToast]);

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
      const sanitizedForCache = vehicles.map((v) => ({
        ...v,
        fotograflar: Array.isArray(v.fotograflar)
          ? v.fotograflar.filter((src) => typeof src === 'string' && !src.startsWith('data:'))
          : []
      }));
      localStorage.setItem('yms_vehicles', JSON.stringify(sanitizedForCache));
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

  // Canlı Sohbet Çevrimiçi Durumu (Presence Heartbeat)
  useEffect(() => {
    if (!currentUser || currentUser.role === 'guest') return;
    const sendHeartbeat = () => {
      upsertChatPresenceInFirestore({
        username: currentUser.username,
        role: currentUser.role,
        depoId: currentUser.depoId,
        lastActiveAt: Date.now(),
        typingInChannel: null,
        typingAt: null
      });
    };
    sendHeartbeat();
    const hbInterval = setInterval(sendHeartbeat, 35000);
    return () => clearInterval(hbInterval);
  }, [currentUser?.username, currentUser?.role, currentUser?.depoId]);

  // Firebase Firestore Canlı Eşzamanlama (Real-time Subscriptions)
  useEffect(() => {
    const checkConnection = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsFirebaseConnected(false);
        return;
      }
      testFirebaseConnection()
        .then((connected) => {
          setIsFirebaseConnected(connected);
        })
        .catch(() => {
          setIsFirebaseConnected(false);
        });
    };

    checkConnection();

    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setIsFirebaseConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const pingInterval = setInterval(checkConnection, 30000);

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

        if (isFirstNotifLoadRef.current) {
          isFirstNotifLoadRef.current = false;
          remoteNotifs.forEach((n) => seenNotifIdsRef.current.add(n.id));
        } else {
          // Yeni gelen bekleyen bildirimleri depo kapsamına göre telefon ve tarayıcıya kayan bildirim olarak ilet
          remoteNotifs.forEach((n) => {
            if (!seenNotifIdsRef.current.has(n.id)) {
              seenNotifIdsRef.current.add(n.id);
              if (n.status === 'BEKLİYOR') {
                const u = currentUserRef.current;
                const selDepo = selectedDepoIdRef.current;
                const activeIds = activeDepoIdsRef.current;
                if (n.depoId) {
                  if (activeIds.size > 0 && !activeIds.has(n.depoId)) return;
                  if (u && u.role !== 'admin' && u.depoId > 0 && n.depoId !== u.depoId) return;
                  if (selDepo > 0 && n.depoId !== selDepo) return;
                }
                sendNativeNotification({
                  title: `🚨 ${n.plaka ? n.plaka + ' - ' : ''}Rampaya Çağrıldı!`,
                  body: n.text,
                  soundType: 'call',
                  tag: `notif-${n.id}`,
                  icon: '/pwa-192x192.png'
                });
                setInAppAlert({
                  id: `remote-notif-${n.id}`,
                  title: n.plaka ? `${n.plaka} - Rampa Çağrısı` : 'Yeni Operasyon Çağrısı',
                  body: n.text,
                  type: 'call',
                  onClick: () => {
                    setShowNotificationMenu(true);
                  }
                });
              }
            }
          });
        }
      }
    });

    const unsubChat = subscribeToChatMessages((remoteChat) => {
      if (remoteChat) {
        setChatMessages(remoteChat);
      }
    });

    const unsubPresence = subscribeToChatPresence((remotePresences) => {
      setChatPresences(remotePresences || []);
    });

    const unsubCustomers = subscribeToCustomers((remoteCustomers) => {
      if (remoteCustomers) {
        setCustomers(remoteCustomers);
        try {
          localStorage.setItem('yms_customers', JSON.stringify(remoteCustomers));
        } catch (e) {
          console.warn('Failed to cache customers:', e);
        }
      }
    });

    const unsubWhatsApp = subscribeToWhatsAppSettings((remoteConfig) => {
      if (remoteConfig) {
        setWhatsappConfig((prev) => ({ ...prev, ...remoteConfig }));
        saveWhatsAppConfig(remoteConfig);
      }
    });

    const unsubSla = subscribeToSlaSettings((remoteSla) => {
      if (remoteSla) {
        setSlaSettings(remoteSla);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(pingInterval);
      unsubUsers();
      unsubWarehouses();
      unsubVehicles();
      unsubRamps();
      unsubExpected();
      unsubNotifs();
      unsubChat();
      unsubPresence();
      unsubCustomers();
      unsubWhatsApp();
      unsubSla();
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

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    selectedDepoIdRef.current = selectedDepoId;
  }, [selectedDepoId]);

  useEffect(() => {
    activeDepoIdsRef.current = activeDepoIds;
  }, [activeDepoIds]);

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

  // Scoped Ramps per Warehouse
  const currentWarehouseRamps = useMemo(() => {
    if (selectedDepoId === 0) {
      return ramps.filter((r) => activeDepoIds.has(r.depoId || 1));
    }
    return ramps.filter((r) => (r.depoId || 1) === selectedDepoId);
  }, [ramps, selectedDepoId, activeDepoIds]);

  // Live synced detail modal vehicle
  const liveSelectedDetailVehicle = useMemo(() => {
    if (!selectedDetailVehicle) return null;
    return vehicles.find((v) => v.id === selectedDetailVehicle.id) || selectedDetailVehicle;
  }, [selectedDetailVehicle, vehicles]);

  const normalizePlate = useCallback((plate?: string | null) => {
    return (plate || '').replace(/\s+/g, '').toUpperCase();
  }, []);

  const findDuplicateActiveVehicle = useCallback(
    (dorsePlaka?: string | null, ignoreVehicleId?: number) => {
      const target = normalizePlate(dorsePlaka);
      if (!target) return null;
      return (
        vehicles.find(
          (v) =>
            v.durum !== 'ÇIKIŞ YAPTI' &&
            v.id !== ignoreVehicleId &&
            normalizePlate(v.dorsePlaka) === target
        ) || null
      );
    },
    [vehicles, normalizePlate]
  );

  // Counts (Filtered by active warehouses)
  const pendingExpectedVehiclesCount = useMemo(() => {
    let list = expectedVehicles.filter((e) => activeDepoIds.has(e.depoId || 1));
    if (selectedDepoId !== 0) {
      list = list.filter((e) => (e.depoId || 1) === selectedDepoId);
    }
    return list.filter((e) => e.durum === 'BEKLENİYOR').length;
  }, [expectedVehicles, selectedDepoId, activeDepoIds]);

  const resolveNotifDepoId = useCallback(
    (n: AppNotification) => {
      if (n.depoId && n.depoId > 0) return n.depoId;
      const v = vehicles.find((item) => item.id === n.vehicleId);
      return v?.depoId || 1;
    },
    [vehicles]
  );

  const scopedNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const dId = resolveNotifDepoId(n);
      if (activeDepoIds.size > 0 && !activeDepoIds.has(dId)) return false;
      if (currentUser && currentUser.role !== 'admin' && currentUser.depoId > 0 && dId !== currentUser.depoId) {
        return false;
      }
      if (selectedDepoId !== 0 && dId !== selectedDepoId) return false;
      return true;
    });
  }, [notifications, resolveNotifDepoId, activeDepoIds, currentUser, selectedDepoId]);

  // Kullanıcı bazlı okunmamış bildirim sayısı (giriş yapan kullanıcının henüz okumadığı bildirimler)
  const pendingNotificationsCount = useMemo(() => {
    if (!currentUser) return 0;
    const currentUsername = currentUser.username;
    return scopedNotifications.filter((n) => {
      if (n.status !== 'BEKLİYOR') return false;
      const readBy = Array.isArray(n.readBy) ? n.readBy : [];
      return !readBy.includes(currentUsername);
    }).length;
  }, [scopedNotifications, currentUser]);

  // Kullanıcı bazlı okunmamış sohbet mesajı sayısı (özel DM gizlilik filtresi dahil)
  const unreadChatCount = useMemo(() => {
    if (!currentUser) return 0;
    const myLower = currentUser.username.trim().toLowerCase();
    return chatMessages.filter((m) => {
      if (m.sender.trim().toLowerCase() === myLower) return false;
      const ch = m.channelId || 'genel';
      if (ch.startsWith('dm__')) {
        const parts = ch.split('__').slice(1);
        const isParticipant =
          (m.recipient && m.recipient.trim().toLowerCase() === myLower) ||
          parts.includes(myLower);
        if (!isParticipant) return false;
      }
      const readBy = Array.isArray(m.readBy) ? m.readBy : [];
      return !readBy.some((u) => u.trim().toLowerCase() === myLower);
    }).length;
  }, [chatMessages, currentUser]);

  const handleMarkNotificationsAsReadForMe = useCallback(() => {
    if (!currentUser) return;
    const currentUsername = currentUser.username;
    const unread = scopedNotifications.filter(
      (n) => n.status === 'BEKLİYOR' && !(Array.isArray(n.readBy) && n.readBy.includes(currentUsername))
    );
    if (unread.length === 0) return;

    const unreadIds = new Set(unread.map((u) => u.id));
    setNotifications((prev) =>
      prev.map((n) => {
        if (unreadIds.has(n.id) && n.status === 'BEKLİYOR') {
          const currentReadBy = Array.isArray(n.readBy) ? n.readBy : [];
          if (!currentReadBy.includes(currentUsername)) {
            return { ...n, readBy: [...currentReadBy, currentUsername] };
          }
        }
        return n;
      })
    );

    unread.forEach((n) => {
      markNotificationAsReadInFirestore(n.id, currentUsername);
    });
  }, [currentUser, scopedNotifications]);

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

  const handleSaveSlaSettings = useCallback((newSettings: SlaSettings) => {
    setSlaSettings(newSettings);
    saveSlaSettingsToFirestore(newSettings);
    showToast('SLA hedef süreleri güncellendi ve tüm cihazlara aktarıldı.', 'success');
  }, [showToast]);

  const handleAddRampForWarehouse = useCallback((depoId: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nextId = ramps.length > 0 ? Math.max(...ramps.map((r) => r.id)) + 1 : 1;
    const newRamp: Ramp = {
      id: nextId,
      ad: trimmed,
      durum: 'Boş',
      depoId
    };
    setRamps((prev) => [...prev, newRamp]);
    saveRampToFirestore(newRamp);
    showToast(`${getWarehouseNameById(depoId)} için "${trimmed}" eklendi.`, 'success');
  }, [ramps, getWarehouseNameById, showToast]);

  const handleSeedDefaultRampsForWarehouse = useCallback((depoId: number, count: number) => {
    const safeCount = Math.max(1, Math.min(30, Math.floor(count || 1)));
    const existingForDepo = ramps.filter((r) => (r.depoId || 1) === depoId);
    const baseId = ramps.length > 0 ? Math.max(...ramps.map((r) => r.id)) + 1 : 1;
    const startNumber = existingForDepo.length + 1;
    const newRamps: Ramp[] = Array.from({ length: safeCount }, (_, idx) => ({
      id: baseId + idx,
      ad: `Rampa ${startNumber + idx}`,
      durum: 'Boş',
      depoId
    }));
    setRamps((prev) => [...prev, ...newRamps]);
    saveRampsBatchToFirestore(newRamps);
    showToast(`${getWarehouseNameById(depoId)} için ${safeCount} adet yeni rampa oluşturuldu.`, 'success');
  }, [ramps, getWarehouseNameById, showToast]);

  const handleRenameRamp = useCallback((ramp: Ramp, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updated: Ramp = { ...ramp, ad: trimmed };
    setRamps((prev) => prev.map((r) => (r.id === ramp.id ? updated : r)));
    saveRampToFirestore(updated);
    showToast(`Rampa adı güncellendi: ${trimmed}`, 'success');
  }, [showToast]);

  const handleDeleteRamp = useCallback((ramp: Ramp) => {
    const occupied = vehicles.some((v) => v.rampaId === ramp.id && v.durum === 'RAMPADA');
    if (occupied || ramp.durum === 'Dolu') {
      showToast(`${ramp.ad} şu anda dolu olduğu için silinemez.`, 'warning');
      return;
    }
    askConfirm(
      'Rampayı Sil',
      `"${ramp.ad}" rampasını kalıcı olarak silmek istediğinize emin misiniz?`,
      () => {
        setRamps((prev) => prev.filter((r) => r.id !== ramp.id));
        deleteRampFromFirestore(ramp.id);
        showToast(`${ramp.ad} silindi.`, 'info');
      },
      'danger',
      'Evet, Rampayı Sil'
    );
  }, [vehicles, askConfirm, showToast]);

  const handleLoginSuccess = (user: User, depoId: number) => {
    setCurrentUser(user);
    setSelectedDepoId(depoId);
    setActiveTab('araclar');
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
    setActiveTab('araclar');
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
          const updated = prev.filter((c) => c.id !== customerId && c.name !== customerName);
          try {
            localStorage.setItem('yms_customers', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        await deleteCustomerFromFirestore(customerId, customerName);
        showToast(`"${customerName}" firması silindi.`, 'info');
      }
    );
  };

  const handleResetCustomers = () => {
    askConfirm(
      'Örnek Firmaları Sıfırla',
      'Tüm kayıtlı demo ve örnek firmalar sistemden ve bulut veritabanından kalıcı olarak silinecektir. Liste boşaldıktan sonra sıfırdan firma ekleme formu açılacaktır. Onaylıyor musunuz?',
      async () => {
        setCustomers([]);
        try {
          localStorage.setItem('yms_customers', '[]');
          localStorage.setItem('yms_customers_cleared', 'true');
        } catch (e) {}
        await clearAllCustomersFromFirestore();
        showToast('Tüm örnek firmalar temizlendi. Sıfırdan yeni firma ekleyebilirsiniz.', 'success');
      },
      'danger',
      'Evet, Örnekleri Sıfırla'
    );
  };

  const handleOpenNewVehicleDirectly = () => {
    const canCreate = currentUser?.role === 'admin' || hasPermission(currentUser, 'canCreateVehicle');
    if (!canCreate) {
      showToast('Yeni araç kaydı oluşturma yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
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

  // Beklenen Aracı Sahaya Al butonuna basıldığında: Bilgileri tekrar girmeden doğrudan onay modalını aç
  const handleProcessExpectedArrival = (exp: ExpectedVehicle) => {
    const canManage = currentUser?.role === 'admin' || hasPermission(currentUser, 'canManageExpected');
    if (!canManage) {
      showToast('Beklenen araçları sahaya alma yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
    setSelectedExpectedVehicleForArrival(exp);
    setShowExpectedArrivalModal(true);
  };

  // 1-Tıkla Doğrudan Sahaya Kabul Et (Zaten girilmiş bilgileri aynen aktarır, kullanıcıdan tekrar bilgi istemez)
  const handleDirectAdmitExpectedVehicle = (exp: ExpectedVehicle) => {
    const canManage = currentUser?.role === 'admin' || hasPermission(currentUser, 'canManageExpected');
    if (!canManage) {
      showToast('Beklenen araçları sahaya alma yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
    const dup = findDuplicateActiveVehicle(exp.dorsePlaka);
    if (dup) {
      showToast(
        `${exp.dorsePlaka} plakalı araç zaten sahada aktif görünüyor (${dup.durum}). Tekrar giriş yapılamaz!`,
        'warning'
      );
      return;
    }

    const nowTs = Date.now();
    const nowStr = new Date(nowTs).toLocaleString('tr-TR');
    const nowIso = new Date(nowTs).toISOString().slice(0, 10);

    const newRecord: Vehicle = {
      id: Date.now(),
      depoId: Number(exp.depoId || (selectedDepoId === 0 ? 1 : selectedDepoId)),
      cekiciPlaka: exp.cekiciPlaka || '',
      dorsePlaka: exp.dorsePlaka || '',
      konteynirNo: exp.konteynirNo || '',
      soforAd: exp.soforAd || '',
      soforTel: exp.soforTel || '',
      soforTc: exp.soforTc || '',
      nakliyeFirmasi: '',
      musteri: exp.musteri || '',
      depoTuru: (exp.depoTuru as 'Antrepo' | 'Serbest Depo') || 'Antrepo',
      islemTuru: (exp.islemTuru === 'Tahliye' ? 'Boşaltma' : exp.islemTuru as 'Boşaltma' | 'Yükleme') || 'Boşaltma',
      aciklama: exp.aciklama ? exp.aciklama : (exp.beklenenTarih ? `Beklenen Geliş: ${exp.beklenenTarih}` : ''),
      fotograflar: [],
      isAcik: false,
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

    // Beklenen araç kaydını 'GİRİŞ YAPILDI' olarak güncelle
    setExpectedVehicles((prev) =>
      prev.map((e) => {
        if (e.id === exp.id) {
          const updatedExp: ExpectedVehicle = { ...e, durum: 'GİRİŞ YAPILDI', kabulTarihi: nowStr };
          saveExpectedVehicleToFirestore(updatedExp);
          return updatedExp;
        }
        return e;
      })
    );

    setShowExpectedArrivalModal(false);
    setSelectedExpectedVehicleForArrival(null);

    playChime('success');
    showToast(`${newRecord.dorsePlaka} sahaya başarıyla kabul edildi!`, 'success');

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
  };

  // İstenirse bilgileri düzenleyerek / fotoğraflayarak açma
  const handleOpenEditExpectedForm = (exp: ExpectedVehicle) => {
    const canManage = currentUser?.role === 'admin' || hasPermission(currentUser, 'canManageExpected');
    if (!canManage) {
      showToast('Beklenen araçları sahaya alma yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
    setShowExpectedArrivalModal(false);
    setSelectedExpectedVehicleForArrival(null);
    setProcessingExpectedVehicleId(exp.id);
    setNewVehicleInitialValues({
      depoId: exp.depoId || (selectedDepoId === 0 ? 1 : selectedDepoId),
      cekiciPlaka: exp.cekiciPlaka || '',
      dorsePlaka: exp.dorsePlaka || '',
      konteynirNo: exp.konteynirNo || '',
      soforAd: exp.soforAd || '',
      soforTel: exp.soforTel || '',
      soforTc: exp.soforTc || '',
      musteri: exp.musteri || '',
      depoTuru: (exp.depoTuru as 'Antrepo' | 'Serbest Depo') || 'Antrepo',
      islemTuru: (exp.islemTuru === 'Tahliye' ? 'Boşaltma' : exp.islemTuru as 'Boşaltma' | 'Yükleme') || 'Boşaltma',
      aciklama: exp.aciklama ? exp.aciklama : (exp.beklenenTarih ? `Beklenen Geliş: ${exp.beklenenTarih}` : ''),
      fotograflar: [],
      isAcik: false
    });
    setShowNewVehicleModal(true);
  };

  const handleSaveNewVehicle = (vehicleData: Partial<Vehicle>): boolean => {
    const canCreate =
      currentUser?.role === 'admin' ||
      hasPermission(currentUser, 'canCreateVehicle') ||
      (Boolean(processingExpectedVehicleId) && hasPermission(currentUser, 'canManageExpected'));
    if (!canCreate) {
      showToast('Yeni araç kaydı oluşturma yetkiniz bulunmamaktadır.', 'warning');
      return false;
    }

    const photoCheck = validateVehiclePhotos(vehicleData.fotograflar);
    if (!photoCheck.valid) {
      showToast(photoCheck.message || 'Fotoğraf boyutu veya sayısı sınırı aşıldı.', 'warning');
      return false;
    }

    const dup = findDuplicateActiveVehicle(vehicleData.dorsePlaka);
    if (dup) {
      showToast(
        `${vehicleData.dorsePlaka} plakalı araç zaten sahada aktif görünüyor (${dup.durum}). Çıkış yapılmadan yeni kayıt açılamaz!`,
        'warning'
      );
      return false;
    }

    const canToggleUrgent = currentUser?.role === 'admin' || hasPermission(currentUser, 'canToggleAcil');
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
      soforTc: vehicleData.soforTc || '',
      nakliyeFirmasi: vehicleData.nakliyeFirmasi || '',
      musteri: vehicleData.musteri || '',
      depoTuru: vehicleData.depoTuru || 'Antrepo',
      islemTuru: (vehicleData.islemTuru === 'Tahliye' ? 'Boşaltma' : vehicleData.islemTuru as 'Boşaltma' | 'Yükleme') || 'Boşaltma',
      aciklama: vehicleData.aciklama || '',
      fotograflar: vehicleData.fotograflar || [],
      isAcik: canToggleUrgent ? Boolean(vehicleData.isAcik) : false,
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
    return true;
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

    const hasPhotos = vehicle.fotograflar && vehicle.fotograflar.length > 0;
    const isApiProvider =
      whatsappConfig.enabled &&
      ['greenapi', 'ultramsg', 'webhook', 'twilio'].includes(whatsappConfig.provider);

    // 1. Durum: Green API / UltraMsg / Webhook otomatik bot entegrasyonu aktifse doğrudan API'ye fotoğrafla birlikte ilet
    if (isApiProvider) {
      const res = await sendVehicleToWhatsAppGroup(shareOpts, whatsappConfig);
      setWhatsappApiStatus(res);
      if (res.success) {
        showToast(res.message || 'Fotoğraf ve araç bilgisi WhatsApp grubuna iletildi.', 'success');
        return;
      } else {
        showToast(res.message || 'WhatsApp API gönderimi başarısız oldu.', 'warning');
        setShowWhatsAppSharePrompt(true);
        return;
      }
    }

    // 2. Durum: Fotoğraf varsa ve tarayıcı Web Share dosya paylaşımını destekliyorsa (Mobil / Tablet / Destekleyen Masaüstü)
    // Doğrudan fotoğrafı ve altına araç bilgisini açıklama (caption) olarak WhatsApp'a aktarır!
    if (hasPhotos && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const textMessage = formatVehicleWhatsAppMessage(shareOpts);
        const shareResult = await shareViaWebShareWithFiles({
          title: `${vehicle.dorsePlaka} - ${vehicle.musteri}`,
          text: textMessage, // Bu açıklama WhatsApp'ta fotoğrafın altına doğrudan eklenir!
          photos: vehicle.fotograflar,
          vehiclePlate: vehicle.dorsePlaka
        });

        if (shareResult.shared) {
          showToast('Fotoğraf açıklamasıyla birlikte WhatsApp\'a aktarıldı.', 'success');
          return;
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Web Share hatası:', err);
        }
      }
    }

    // 3. Durum: Web Share desteklenmiyorsa (Masaüstü Web) veya fotoğraf yoksa
    // Kullanıcıya düzenleme, fotoğrafı panoya kopyalama ve doğrudan WhatsApp'a aktarma penceresini aç
    setShowWhatsAppSharePrompt(true);
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
    if (!(currentUser?.role === 'admin' || hasPermission(currentUser, 'canManageExpected'))) {
      showToast('Beklenen araç ekleme yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
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

  const handleUpdateExpectedVehicle = (updated: ExpectedVehicle) => {
    if (!(currentUser?.role === 'admin' || hasPermission(currentUser, 'canManageExpected'))) {
      showToast('Beklenen araç güncelleme yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
    if (updated.musteri && updated.musteri.trim()) {
      handleAddNewCustomerByName(updated.musteri.trim());
    }

    setExpectedVehicles((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
    saveExpectedVehicleToFirestore(updated);
    setShowEditExpectedModal(false);
    setSelectedExpectedVehicleForEdit(null);
    showToast(`${updated.dorsePlaka} beklenen araç bilgileri güncellendi.`, 'success');
  };

  const handleDeleteExpectedSingle = (exp: ExpectedVehicle) => {
    if (!(currentUser?.role === 'admin' || hasPermission(currentUser, 'canManageExpected'))) {
      showToast('Beklenen araç silme yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
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
    if (!(currentUser?.role === 'admin' || hasPermission(currentUser, 'canManageExpected'))) {
      showToast('Beklenen araçları toplu silme yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
    setExpectedVehicles((prev) => prev.filter((e) => !ids.includes(e.id)));
    ids.forEach((id) => deleteExpectedVehicleFromFirestore(id));
    showToast(`${ids.length} adet beklenen araç silindi.`, 'info');
  };

  const handleImportExcelExpected = (items: ExpectedVehicle[]) => {
    if (!(currentUser?.role === 'admin' || hasPermission(currentUser, 'canManageExpected'))) {
      showToast('Excel ile beklenen araç aktarma yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
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

    // EVRAK HAZIR yetkisi: Admin veya canMakeReady özel yetkisine sahip kullanıcılar (operasyon / personel)
    if (newStatus === 'EVRAK HAZIR') {
      const canMakeReady = currentUser?.role === 'admin' || hasPermission(currentUser, 'canMakeReady');
      if (!canMakeReady) {
        showToast("Araç durumunu 'EVRAK HAZIR' yapma yetkiniz bulunmamaktadır. Bu yetki Yönetici (Admin) tarafından 'Özel Yetki Alanı' üzerinden tanımlanır.", 'warning');
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

            // 2. Aracı EVRAK HAZIR durumuna al ve rampa/çağrı bağlarını temizle (orijinal Evrak Kayıt zamanını koru)
            const updatedVehicle: Vehicle = {
              ...vehicle,
              durum: 'EVRAK HAZIR',
              rampaId: null,
              isRampayaCagrildi: false,
              cagrildigiRampaId: null,
              evrakHazirTimestamp: vehicle.evrakHazirTimestamp || nowTs,
              evrakKayitTarihi: vehicle.evrakKayitTarihi || nowStr,
              rampadanCikisTarihi: vehicle.durum === 'RAMPADA' ? nowStr : vehicle.rampadanCikisTarihi,
              rampadanCikisTimestamp: vehicle.durum === 'RAMPADA' ? nowTs : vehicle.rampadanCikisTimestamp,
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
      const canPullBack =
        currentUser?.role === 'admin' ||
        hasPermission(currentUser, 'canReleaseRamp') ||
        hasPermission(currentUser, 'canEditVehicle');
      if (!canPullBack) {
        showToast("Rampadaki aracı 'BEKLEMEDE' durumuna geri çekme yetkiniz bulunmamaktadır.", 'warning');
        return;
      }
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
            rampadanCikisTarihi: vehicle.durum === 'RAMPADA' ? nowStr : vehicle.rampadanCikisTarihi,
            rampadanCikisTimestamp: vehicle.durum === 'RAMPADA' ? nowTs : vehicle.rampadanCikisTimestamp,
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

    if (newStatus === 'BEKLEMEDE' && vehicle.durum === 'ÇIKIŞ YAPTI') {
      const canAuthorizeExit =
        currentUser?.role === 'admin' || hasPermission(currentUser, 'canAuthorizeExit');
      if (!canAuthorizeExit) {
        showToast('Çıkış yapmış aracı tekrar sahaya alma yetkiniz bulunmamaktadır.', 'warning');
        return;
      }
    }

    if (newStatus === 'ÇIKIŞ YAPTI') {
      const canAuthorizeExit =
        currentUser?.role === 'admin' || hasPermission(currentUser, 'canAuthorizeExit');
      if (!canAuthorizeExit) {
        showToast('Araç çıkışı onaylama yetkiniz bulunmamaktadır.', 'warning');
        return;
      }
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
            rampadanCikisTarihi: vehicle.rampadanCikisTarihi || nowStr,
            rampadanCikisTimestamp: vehicle.rampadanCikisTimestamp || nowTs,
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
      if (newStatus === 'RAMPADA') {
        const canAssign =
          currentUser?.role === 'admin' ||
          currentUser?.role === 'security' ||
          hasPermission(currentUser, 'canAssignRamp');
        if (!canAssign) {
          showToast("Araç durumunu 'RAMPADA' yapma yetkiniz bulunmamaktadır.", 'warning');
          return;
        }
      }
      if (newStatus === 'RAMPADA' && !vehicle.rampaId) {
        showToast("Bir aracı 'RAMPADA' durumuna almak için lütfen yanındaki 'Rampa Atama' sütunundan boş bir rampa seçiniz.", 'warning');
        return;
      }

      let updatedVehicle: Vehicle | null = null;
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === vehicle.id) {
            updatedVehicle = {
              ...v,
              durum: newStatus,
              evrakHazirTimestamp:
                newStatus === 'EVRAK HAZIR'
                  ? v.evrakHazirTimestamp || nowTs
                  : newStatus === 'RAMPADA'
                  ? v.evrakHazirTimestamp || nowTs
                  : v.evrakHazirTimestamp,
              evrakKayitTarihi:
                newStatus === 'EVRAK HAZIR'
                  ? v.evrakKayitTarihi || nowStr
                  : newStatus === 'RAMPADA'
                  ? v.evrakKayitTarihi || nowStr
                  : v.evrakKayitTarihi,
              rampadaTimestamp: newStatus === 'RAMPADA' ? nowTs : v.rampadaTimestamp,
              rampayaGirisTarihi: newStatus === 'RAMPADA' ? nowStr : v.rampayaGirisTarihi,
              rampadanCikisTarihi: newStatus === 'RAMPADA' ? null : v.rampadanCikisTarihi,
              rampadanCikisTimestamp: newStatus === 'RAMPADA' ? null : v.rampadanCikisTimestamp,
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
    const canAssign =
      currentUser?.role === 'admin' ||
      currentUser?.role === 'security' ||
      hasPermission(currentUser, 'canAssignRamp');

    if (!canAssign) {
      showToast('Rampa değişiklikleri ve araç atamaları Yönetim ve yetkili personel yetkisine tabidir.', 'warning');
      return;
    }

    const nowTs = Date.now();
    const nowStr = new Date(nowTs).toLocaleString('tr-TR');
    const oldRampId = vehicle.rampaId;

    if (rampaId) {
      const targetRampObj = ramps.find((r) => r.id === rampaId);
      if (targetRampObj && (targetRampObj.depoId || 1) !== (vehicle.depoId || 1)) {
        showToast(`${targetRampObj.ad} farklı bir depoya ait! Lütfen aracın bulunduğu depodaki bir rampayı seçiniz.`, 'warning');
        return;
      }

      const occupiedByOther = vehicles.find(
        (v) => v.rampaId === rampaId && v.durum === 'RAMPADA' && v.id !== vehicle.id
      );
      if (occupiedByOther) {
        showToast(`Bu rampa şu anda ${occupiedByOther.dorsePlaka} plakalı araç tarafından kullanılmaktadır. Lütfen boş bir rampa seçiniz.`, 'warning');
        return;
      }

      const executeAssign = () => {
        const updatedVehicle: Vehicle = {
          ...vehicle,
          rampaId,
          durum: 'RAMPADA',
          rampadaTimestamp: nowTs,
          rampayaGirisTarihi: nowStr,
          rampadanCikisTarihi: null,
          rampadanCikisTimestamp: null,
          evrakHazirTimestamp: vehicle.evrakHazirTimestamp || nowTs,
          evrakKayitTarihi: vehicle.evrakKayitTarihi || nowStr,
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
        const canReleaseToReady = currentUser?.role === 'admin' || hasPermission(currentUser, 'canMakeReady') || hasPermission(currentUser, 'canReleaseRamp');
        if (!canReleaseToReady) {
          showToast("Rampadaki aracı rampa atamasından çıkarıp 'EVRAK HAZIR' durumuna geri alma yetkiniz bulunmamaktadır.", 'warning');
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
              evrakHazirTimestamp: vehicle.evrakHazirTimestamp || nowTs,
              evrakKayitTarihi: vehicle.evrakKayitTarihi || nowStr,
              rampadanCikisTarihi: nowStr,
              rampadanCikisTimestamp: nowTs
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
    const canCall = currentUser?.role === 'admin' || hasPermission(currentUser, 'canCallVehicle');
    if (!canCall) {
      showToast('Güvenliğe çağrı gönderme yetkiniz bulunmamaktadır.', 'warning');
      return;
    }

    if (vehicle.isRampayaCagrildi || vehicle.durum === 'RAMPADA') {
      showToast('Bu araç zaten çağrılmış veya rampadadır.', 'warning');
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
      depoId: vehicle.depoId || 1,
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
    showToast(`${vehicle.dorsePlaka} plakalı araç için Güvenlik ekranına çağrı isteği gönderildi.`, 'info');
  };

  const handleCancelRampCall = (vehicle: Vehicle) => {
    const canCall = currentUser?.role === 'admin' || hasPermission(currentUser, 'canCallVehicle');
    if (!canCall) {
      showToast('Rampa çağrısını iptal etme yetkiniz bulunmamaktadır.', 'warning');
      return;
    }

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
          depoId: vehicle.depoId || 1,
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
    const canToggle = currentUser?.role === 'admin' || hasPermission(currentUser, 'canToggleAcil');
    if (!canToggle) {
      showToast('Acil araç durumunu değiştirme yetkiniz bulunmamaktadır.', 'warning');
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

  const handleBulkMakeReady = (targetVehicles: Vehicle[]) => {
    const canReady = currentUser?.role === 'admin' || hasPermission(currentUser, 'canMakeReady');
    if (!canReady) {
      showToast("Araçları 'EVRAK HAZIR' durumuna getirme yetkiniz bulunmamaktadır.", 'warning');
      return;
    }

    const pendingVehicles = targetVehicles.filter((v) => v.durum === 'BEKLEMEDE');
    if (pendingVehicles.length === 0) {
      showToast("Seçili araçlar arasında 'BEKLEMEDE' durumunda araç bulunamadı.", 'info');
      return;
    }

    const previewPlates = pendingVehicles
      .slice(0, 6)
      .map((v) => v.dorsePlaka)
      .join(', ');
    const moreSuffix = pendingVehicles.length > 6 ? ` (+${pendingVehicles.length - 6} araç daha)` : '';

    askConfirm(
      'Toplu Evrak Hazır Onayı',
      `Seçilen ${pendingVehicles.length} adet BEKLEMEDE durumundaki aracı tek seferde 'EVRAK HAZIR' olarak onaylamak istediğinizden emin misiniz?\n\nAraçlar: ${previewPlates}${moreSuffix}`,
      () => {
        const nowTs = Date.now();
        const nowStr = new Date(nowTs).toLocaleString('tr-TR');
        const updatedMap = new Map<number, Vehicle>();

        pendingVehicles.forEach((v) => {
          updatedMap.set(v.id, {
            ...v,
            durum: 'EVRAK HAZIR',
            evrakHazirTimestamp: v.evrakHazirTimestamp || nowTs,
            evrakKayitTarihi: v.evrakKayitTarihi || nowStr,
            cikisTarihi: null,
            cikisTimestamp: null
          });
        });

        setVehicles((prev) =>
          prev.map((v) => {
            const updated = updatedMap.get(v.id);
            return updated && v.durum === 'BEKLEMEDE' ? updated : v;
          })
        );

        updatedMap.forEach((u) => {
          saveVehicleToFirestore(u);
        });

        showToast(`${pendingVehicles.length} araç 'EVRAK HAZIR' durumuna güncellendi.`, 'success');
      },
      'info',
      `Evet, ${pendingVehicles.length} Aracı Onayla`
    );
  };

  const handleRampStatusChange = (ramp: Ramp, newStatus: Ramp['durum'], arizaNotu?: string | null) => {
    const canManageRamps =
      currentUser?.role === 'admin' ||
      currentUser?.role === 'security' ||
      hasPermission(currentUser, 'canManageRampStatus');
    if (!canManageRamps) {
      showToast('Rampa durumunu değiştirme yetkiniz bulunmamaktadır.', 'warning');
      return;
    }

    const isMaintenance = newStatus === 'Arızalı' || newStatus === 'Bakımda';
    const updatedRamp: Ramp = {
      ...ramp,
      durum: newStatus,
      arizaNotu: isMaintenance ? (arizaNotu !== undefined ? arizaNotu : (ramp.arizaNotu ?? null)) : null,
      bakimBaslangic: isMaintenance ? (ramp.bakimBaslangic || new Date().toLocaleString('tr-TR').slice(0, 16)) : null
    };
    setRamps((prev) => prev.map((r) => (r.id === ramp.id ? updatedRamp : r)));
    saveRampToFirestore(updatedRamp);

    if (newStatus !== 'Dolu') {
      const v = vehicles.find((item) => item.rampaId === ramp.id && item.durum === 'RAMPADA');
      if (v) {
        const nowTs = Date.now();
        const nowStr = new Date(nowTs).toLocaleString('tr-TR');
        const updatedV: Vehicle = {
          ...v,
          rampaId: null,
          durum: 'EVRAK HAZIR',
          isRampayaCagrildi: false,
          evrakHazirTimestamp: v.evrakHazirTimestamp || nowTs,
          evrakKayitTarihi: v.evrakKayitTarihi || nowStr,
          rampadanCikisTarihi: nowStr,
          rampadanCikisTimestamp: nowTs
        };
        setVehicles((prev) =>
          prev.map((item) => (item.id === v.id ? updatedV : item))
        );
        saveVehicleToFirestore(updatedV);
        showToast(`${ramp.ad} '${newStatus}' durumuna alındığı için üzerindeki ${v.dorsePlaka} plakalı araç rampadan çıkarıldı.`, 'info');
      }
    }
  };

  const handleChangeVehicleRamp = (vehicle: Vehicle, targetRampId: number) => {
    const canAssign =
      currentUser?.role === 'admin' ||
      currentUser?.role === 'security' ||
      hasPermission(currentUser, 'canAssignRamp');
    if (!canAssign) {
      showToast('Rampa değiştirme yetkiniz bulunmamaktadır.', 'warning');
      return;
    }

    if (vehicle.rampaId === targetRampId) return;

    const targetRamp = ramps.find((r) => r.id === targetRampId);
    if (targetRamp && (targetRamp.depoId || 1) !== (vehicle.depoId || 1)) {
      showToast(`${targetRamp.ad} farklı bir depoya ait! Araç yalnızca kendi deposundaki rampaya taşınabilir.`, 'warning');
      return;
    }

    // Hedef rampa başka bir araç tarafından işgal edilmiş mi kontrol et
    const occupiedByOther = vehicles.find(
      (v) => v.rampaId === targetRampId && v.durum === 'RAMPADA' && v.id !== vehicle.id
    );
    if (occupiedByOther) {
      showToast(`Hedef rampa şu anda ${occupiedByOther.dorsePlaka} plakalı araç tarafından kullanılmaktadır.`, 'warning');
      return;
    }

    const currentRampName = getRampName(vehicle.rampaId);
    const targetRampName = targetRamp ? targetRamp.ad : `Rampa ${targetRampId}`;

    askConfirm(
      'Rampa Değişikliği Onayı',
      `Rampa değiştirmek istediğinizden emin misiniz?\n\n${vehicle.dorsePlaka} plakalı aracın rampasını ${currentRampName ? `${currentRampName} üzerinden ` : ''}${targetRampName} olarak değiştirmek üzeresiniz.`,
      () => {
        const nowTs = Date.now();
        const nowStr = new Date(nowTs).toLocaleString('tr-TR');
        const oldRampId = vehicle.rampaId;

        const updatedVehicle: Vehicle = {
          ...vehicle,
          rampaId: targetRampId,
          durum: 'RAMPADA',
          rampadaTimestamp: nowTs,
          rampayaGirisTarihi: nowStr,
          rampadanCikisTarihi: null,
          rampadanCikisTimestamp: null,
          evrakHazirTimestamp: vehicle.evrakHazirTimestamp || nowTs,
          evrakKayitTarihi: vehicle.evrakKayitTarihi || nowStr,
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
    const canAuthorizeExit =
      currentUser?.role === 'admin' || hasPermission(currentUser, 'canAuthorizeExit');
    if (!canAuthorizeExit) {
      showToast('Araç çıkışı onaylama yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
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
      cikisTimestamp: nowTs,
      rampadanCikisTarihi: vehicle.rampadanCikisTarihi || nowStr,
      rampadanCikisTimestamp: vehicle.rampadanCikisTimestamp || nowTs
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
    const canReleaseToReady = currentUser?.role === 'admin' || hasPermission(currentUser, 'canMakeReady') || hasPermission(currentUser, 'canReleaseRamp');
    if (!canReleaseToReady) {
      showToast("Rampadaki aracı 'EVRAK HAZIR' durumuna geri alma yetkiniz bulunmamaktadır.", 'warning');
      return;
    }

    const rampName = getRampName(vehicle.rampaId);
    askConfirm(
      "Rampadaki Aracı 'EVRAK HAZIR' Durumuna Geri Al",
      `${vehicle.dorsePlaka} plakalı araç şu anda ${rampName} üzerinde bulunmaktadır. Araç rampadan indirilip rampa 'Boş' durumuna getirilecek ve aracın durumu 'EVRAK HAZIR' olarak güncellenecektir. Onaylıyor musunuz?`,
      () => {
        const nowTs = Date.now();
        const nowStr = new Date(nowTs).toLocaleString('tr-TR');
        const oldRampId = vehicle.rampaId;

        const updatedVehicle: Vehicle = {
          ...vehicle,
          rampaId: null,
          durum: 'EVRAK HAZIR',
          isRampayaCagrildi: false,
          cagrildigiRampaId: null,
          evrakHazirTimestamp: vehicle.evrakHazirTimestamp || nowTs,
          evrakKayitTarihi: vehicle.evrakKayitTarihi || nowStr,
          rampadanCikisTarihi: nowStr,
          rampadanCikisTimestamp: nowTs
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
    const canCall = currentUser?.role === 'admin' || hasPermission(currentUser, 'canCallVehicle');
    if (!canCall) {
      showToast('Araç çağırma işlemi için yetkiniz bulunmamaktadır.', 'warning');
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
      depoId: vehicle.depoId || 1,
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
    const canAssign =
      currentUser?.role === 'admin' ||
      currentUser?.role === 'security' ||
      hasPermission(currentUser, 'canAssignRamp');
    if (!canAssign) {
      showToast('Doğrudan rampa atama yetkiniz bulunmamaktadır.', 'warning');
      return;
    }

    if ((ramp.depoId || 1) !== (vehicle.depoId || 1)) {
      showToast(`${ramp.ad} farklı bir depoya aittir. Lütfen aracın kendi deposundan rampa seçiniz.`, 'warning');
      return;
    }

    // Hedef rampa dolu mu kontrol et
    const occupiedByOther = vehicles.find(
      (v) => v.rampaId === ramp.id && v.durum === 'RAMPADA' && v.id !== vehicle.id
    );
    if (occupiedByOther) {
      showToast(`${ramp.ad} şu anda ${occupiedByOther.dorsePlaka} plakalı araç tarafından kullanılmaktadır.`, 'warning');
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
        const nowStr = new Date(nowTs).toLocaleString('tr-TR');
        const oldRampId = vehicle.rampaId;
        const updatedVehicle: Vehicle = {
          ...vehicle,
          rampaId: ramp.id,
          durum: 'RAMPADA',
          rampadaTimestamp: nowTs,
          rampayaGirisTarihi: nowStr,
          rampadanCikisTarihi: null,
          rampadanCikisTimestamp: null,
          evrakHazirTimestamp: vehicle.evrakHazirTimestamp || nowTs,
          evrakKayitTarihi: vehicle.evrakKayitTarihi || nowStr,
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
    const canApprove =
      currentUser?.role === 'admin' || hasPermission(currentUser, 'canApproveCall');
    if (!canApprove) {
      showToast('Güvenlik rampa yönlendirmesi ve çağrı onayı yapma yetkiniz bulunmamaktadır.', 'warning');
      return;
    }

    // Hedef rampa dolu mu kontrol et
    const occupiedByOther = vehicles.find(
      (v) => v.rampaId === rampId && v.durum === 'RAMPADA' && v.id !== notification.vehicleId
    );
    if (occupiedByOther) {
      showToast(`Seçilen rampa şu anda ${occupiedByOther.dorsePlaka} plakalı araç tarafından kullanılmaktadır.`, 'warning');
      return;
    }

    const nowTs = Date.now();
    const nowStr = new Date(nowTs).toLocaleString('tr-TR');
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
            rampayaGirisTarihi: nowStr,
            rampadanCikisTarihi: null,
            rampadanCikisTimestamp: null,
            evrakHazirTimestamp: v.evrakHazirTimestamp || nowTs,
            evrakKayitTarihi: v.evrakKayitTarihi || nowStr,
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
    const canApprove =
      currentUser?.role === 'admin' || hasPermission(currentUser, 'canApproveCall');
    if (!canApprove) {
      showToast('Güvenlik çağrısına not ekleme yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
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
      depoId: resolveNotifDepoId(notification),
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
    const canAuthorizeExit =
      currentUser?.role === 'admin' || hasPermission(currentUser, 'canAuthorizeExit');
    if (!canAuthorizeExit) {
      showToast('Çıkış işlemini geri alma yetkiniz bulunmamaktadır.', 'warning');
      return;
    }

    const dup = findDuplicateActiveVehicle(vehicle.dorsePlaka, vehicle.id);
    if (dup) {
      showToast(
        `${vehicle.dorsePlaka} plakalı başka bir aktif kayıt zaten sahada (${dup.durum}). Çakışmayı önlemek için geri alınamadı.`,
        'warning'
      );
      return;
    }

    askConfirm(
      'Çıkışı Geri Al',
      `${vehicle.dorsePlaka} plakalı aracın çıkış işlemini iptal edip sahaya (EVRAK HAZIR durumuna) geri almak istediğinizden emin misiniz?`,
      () => {
        const nowTs = Date.now();
        const nowStr = new Date(nowTs).toLocaleString('tr-TR');
        const updatedVehicle: Vehicle = {
          ...vehicle,
          durum: 'EVRAK HAZIR',
          rampaId: null,
          evrakHazirTimestamp: vehicle.evrakHazirTimestamp || nowTs,
          evrakKayitTarihi: vehicle.evrakKayitTarihi || nowStr,
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

  const handleSaveVehicleEdit = (updated: Vehicle): boolean => {
    const canEdit = currentUser?.role === 'admin' || hasPermission(currentUser, 'canEditVehicle');
    if (!canEdit) {
      showToast('Araç bilgilerini düzenleme yetkiniz bulunmamaktadır.', 'warning');
      return false;
    }

    const photoCheck = validateVehiclePhotos(updated.fotograflar);
    if (!photoCheck.valid) {
      showToast(photoCheck.message || 'Fotoğraf boyutu veya sayısı sınırı aşıldı.', 'warning');
      return false;
    }

    const nowStr = new Date().toLocaleString('tr-TR');
    const nowTs = Date.now();

    const originalVehicle = vehicles.find((v) => v.id === updated.id);

    if (
      originalVehicle &&
      originalVehicle.durum !== updated.durum &&
      (updated.durum === 'ÇIKIŞ YAPTI' || originalVehicle.durum === 'ÇIKIŞ YAPTI')
    ) {
      const canAuthorizeExit = currentUser?.role === 'admin' || hasPermission(currentUser, 'canAuthorizeExit');
      if (!canAuthorizeExit) {
        showToast('Araç çıkış / geri alma yetkiniz bulunmamaktadır.', 'warning');
        return false;
      }
    }

    if (originalVehicle && Boolean(updated.isAcik) !== Boolean(originalVehicle.isAcik)) {
      const canToggleUrgent = currentUser?.role === 'admin' || hasPermission(currentUser, 'canToggleAcil');
      if (!canToggleUrgent) {
        showToast('Acil araç durumunu değiştirme yetkiniz bulunmamaktadır.', 'warning');
        return false;
      }
    }

    // 0. Aktif araçlarda mükerrer dorse plaka kontrolü
    if (updated.durum !== 'ÇIKIŞ YAPTI') {
      const dup = findDuplicateActiveVehicle(updated.dorsePlaka, updated.id);
      if (dup) {
        showToast(
          `${updated.dorsePlaka} plakalı araç zaten sahada aktif görünüyor (${dup.durum}). Mükerrer aktif kayıt oluşturulamaz.`,
          'warning'
        );
        return false;
      }
    }

    // 1. Evrak hazır yetki kontrolü
    if (updated.durum === 'EVRAK HAZIR' && originalVehicle?.durum !== 'EVRAK HAZIR') {
      const canMakeReady = currentUser?.role === 'admin' || hasPermission(currentUser, 'canMakeReady');
      if (!canMakeReady) {
        showToast("Araç durumunu 'EVRAK HAZIR' yapma yetkiniz bulunmamaktadır.", 'warning');
        return false;
      }
    }

    // 2. Hedef rampa dolu mu veya yetki var mı kontrol et
    if (updated.rampaId && updated.rampaId !== originalVehicle?.rampaId) {
      const canAssign =
        currentUser?.role === 'admin' ||
        currentUser?.role === 'security' ||
        hasPermission(currentUser, 'canAssignRamp');
      if (!canAssign) {
        showToast('Rampa atama veya değiştirme yetkiniz bulunmamaktadır.', 'warning');
        return false;
      }
      const targetRampObj = ramps.find((r) => r.id === updated.rampaId);
      if (targetRampObj && (targetRampObj.depoId || 1) !== (updated.depoId || 1)) {
        showToast(`${targetRampObj.ad} seçili depoya ait değil. Lütfen aynı depodan rampa seçiniz.`, 'warning');
        return false;
      }
      const occupiedByOther = vehicles.find(
        (v) => v.rampaId === updated.rampaId && v.durum === 'RAMPADA' && v.id !== updated.id
      );
      if (occupiedByOther) {
        showToast(`Seçilen rampa şu anda ${occupiedByOther.dorsePlaka} plakalı araç tarafından kullanılmaktadır. Lütfen boş bir rampa seçiniz.`, 'warning');
        return false;
      }
    }

    const applySave = (vToSave: Vehicle) => {
      let finalVehicle = { ...vToSave };

      if (finalVehicle.durum === 'ÇIKIŞ YAPTI') {
        if (!finalVehicle.cikisTarihi) {
          finalVehicle.cikisTarihi = nowStr;
          finalVehicle.cikisTimestamp = nowTs;
        }
        if (!finalVehicle.rampadanCikisTarihi) {
          finalVehicle.rampadanCikisTarihi = nowStr;
          finalVehicle.rampadanCikisTimestamp = nowTs;
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
        const rampChanged = finalVehicle.rampaId !== originalVehicle?.rampaId || originalVehicle?.durum !== 'RAMPADA';
        if (finalVehicle.durum === 'EVRAK HAZIR' || finalVehicle.durum === 'BEKLEMEDE') {
          finalVehicle.durum = 'RAMPADA';
        }
        if (rampChanged) {
          finalVehicle.rampadaTimestamp = nowTs;
          finalVehicle.rampayaGirisTarihi = nowStr;
          finalVehicle.rampadanCikisTarihi = null;
          finalVehicle.rampadanCikisTimestamp = null;
        }
        if (!finalVehicle.evrakHazirTimestamp) {
          finalVehicle.evrakHazirTimestamp = nowTs;
          finalVehicle.evrakKayitTarihi = finalVehicle.evrakKayitTarihi || nowStr;
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

      if (finalVehicle.durum === 'EVRAK HAZIR') {
        finalVehicle.evrakHazirTimestamp = finalVehicle.evrakHazirTimestamp || nowTs;
        finalVehicle.evrakKayitTarihi = finalVehicle.evrakKayitTarihi || nowStr;
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
      const canReleaseToReady = currentUser?.role === 'admin' || hasPermission(currentUser, 'canMakeReady') || hasPermission(currentUser, 'canReleaseRamp');
      if (!canReleaseToReady) {
        showToast("Rampadaki aracı 'EVRAK HAZIR' durumuna alma yetkiniz bulunmamaktadır.", 'warning');
        return false;
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
            evrakHazirTimestamp: originalVehicle.evrakHazirTimestamp || nowTs,
            evrakKayitTarihi: originalVehicle.evrakKayitTarihi || nowStr,
            rampadanCikisTarihi: nowStr,
            rampadanCikisTimestamp: nowTs
          };
          applySave(vehicleToSave);
        },
        'warning',
        'Evet, EVRAK HAZIR Yap'
      );
      return true;
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
            cagrildigiRampaId: null,
            rampadanCikisTarihi: nowStr,
            rampadanCikisTimestamp: nowTs
          };
          applySave(vehicleToSave);
        },
        'warning',
        'Evet, BEKLEMEDE Yap'
      );
      return true;
    }

    // 5. Rampa Değişikliği / Ataması Onay Sorgusu
    if (originalVehicle && updated.rampaId && updated.rampaId !== originalVehicle.rampaId && updated.durum !== 'ÇIKIŞ YAPTI') {
      const oldRamp = originalVehicle.rampaId ? getRampName(originalVehicle.rampaId) : null;
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
      return true;
    }

    applySave(updated);
    return true;
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    const canEdit = currentUser?.role === 'admin' || hasPermission(currentUser, 'canEditVehicle');
    if (!canEdit) {
      showToast('Araç kaydını silme yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
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

  const handleEditChatMessage = (id: number, newText: string) => {
    const target = chatMessages.find((m) => m.id === id);
    if (!target) return;
    const nowTime = new Date().toLocaleTimeString('tr-TR').slice(0, 5);
    const updated: ChatMessage = {
      ...target,
      text: newText.trim(),
      isEdited: true,
      editedAt: nowTime
    };
    setChatMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
    saveChatMessageToFirestore(updated);
    showToast('Mesaj güncellendi.', 'success');
  };

  const handleToggleChatReaction = (id: number, emoji: string) => {
    if (!currentUser) return;
    const target = chatMessages.find((m) => m.id === id);
    if (!target) return;
    const username = currentUser.username;
    const currentReactions: Record<string, string[]> = { ...(target.reactions || {}) };
    const existingUsers = Array.isArray(currentReactions[emoji]) ? [...currentReactions[emoji]] : [];
    const alreadyReacted = existingUsers.some((u) => u.trim().toLowerCase() === username.trim().toLowerCase());
    if (alreadyReacted) {
      const nextUsers = existingUsers.filter((u) => u.trim().toLowerCase() !== username.trim().toLowerCase());
      if (nextUsers.length === 0) {
        delete currentReactions[emoji];
      } else {
        currentReactions[emoji] = nextUsers;
      }
    } else {
      currentReactions[emoji] = [...existingUsers, username];
    }
    const updated: ChatMessage = { ...target, reactions: currentReactions };
    setChatMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
    saveChatMessageToFirestore(updated);
  };

  const handleTogglePinChatMessage = (id: number) => {
    if (!currentUser) return;
    const target = chatMessages.find((m) => m.id === id);
    if (!target) return;
    const nextPinned = !target.isPinned;
    const updated: ChatMessage = {
      ...target,
      isPinned: nextPinned,
      pinnedBy: nextPinned ? currentUser.username : null
    };
    setChatMessages((prev) => prev.map((m) => (m.id === id ? updated : m)));
    saveChatMessageToFirestore(updated);
    showToast(nextPinned ? 'Mesaj kanala sabitlendi.' : 'Mesaj sabitlemesi kaldırıldı.', 'info');
  };

  const handleUpdateChatPresence = useCallback((typingInChannel: string | null) => {
    if (!currentUser || currentUser.role === 'guest') return;
    upsertChatPresenceInFirestore({
      username: currentUser.username,
      role: currentUser.role,
      depoId: currentUser.depoId,
      lastActiveAt: Date.now(),
      typingInChannel,
      typingAt: typingInChannel ? Date.now() : null
    });
  }, [currentUser]);

  const handleClearChatMessages = (channelId?: string) => {
    const isChannelClear = Boolean(channelId);
    askConfirm(
      isChannelClear ? 'Kanal Geçmişini Temizle' : 'Sohbet Geçmişini Temizle',
      isChannelClear
        ? 'Bu kanaldaki tüm mesajlaşma geçmişini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem tüm cihazlarda geçerli olacaktır.'
        : 'Tüm kanallardaki mesajlaşma geçmişini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem tüm cihazlarda geçerli olacaktır.',
      () => {
        setChatMessages((prev) => (channelId ? prev.filter((m) => (m.channelId || 'genel') !== channelId) : []));
        clearChatMessagesFromFirestore(channelId);
        showToast(isChannelClear ? 'Kanal geçmişi temizlendi.' : 'Tüm sohbet geçmişi temizlendi.', 'info');
      },
      'danger',
      isChannelClear ? 'Evet, Kanalı Temizle' : 'Evet, Tümünü Sil'
    );
  };

  const handleClearCompletedNotifications = () => {
    const toDelete = scopedNotifications.filter((n) => n.status !== 'BEKLİYOR');
    if (toDelete.length === 0) {
      showToast('Bu depoda temizlenecek tamamlanmış bildirim bulunmuyor.', 'info');
      return;
    }
    const toDeleteIds = new Set(toDelete.map((n) => n.id));
    toDelete.forEach((n) => deleteNotificationFromFirestore(n.id));
    setNotifications((prev) => prev.filter((n) => !toDeleteIds.has(n.id)));
    showToast(`${toDelete.length} adet tamamlanmış bildirim temizlendi.`, 'info');
  };

  const handleClearAllNotifications = () => {
    askConfirm(
      'Tüm Bildirimleri Temizle',
      'Seçili depo kapsamındaki tüm çağrı ve işlem bildirimlerini kalıcı olarak silmek istediğinizden emin misiniz?',
      () => {
        const toDeleteIds = new Set(scopedNotifications.map((n) => n.id));
        scopedNotifications.forEach((n) => deleteNotificationFromFirestore(n.id));
        setNotifications((prev) => prev.filter((n) => !toDeleteIds.has(n.id)));
        showToast('Seçili depo bildirimleri kalıcı olarak silindi.', 'info');
      }
    );
  };

  const handleSendChatMessage = (payload: ChatSendPayload) => {
    if (!currentUser) return;
    const nowTs = Date.now();
    const newMsg: ChatMessage = {
      id: nowTs,
      sender: currentUser.username,
      role: currentUser.role,
      text: payload.text || '',
      time: new Date(nowTs).toLocaleTimeString('tr-TR').slice(0, 5),
      channelId: payload.channelId || 'genel',
      recipient: payload.recipient || null,
      imageUrl: payload.imageUrl || null,
      entityCard: payload.entityCard || null,
      replyTo: payload.replyTo || null,
      mentions: payload.mentions && payload.mentions.length > 0 ? payload.mentions : [],
      reactions: {},
      isPinned: false,
      pinnedBy: null,
      readBy: [currentUser.username],
      timestamp: nowTs
    };
    setChatMessages((prev) => [...prev, newMsg]);
    saveChatMessageToFirestore(newMsg);
  };

  const handleMarkChatMessagesAsRead = useCallback((messageIds: number[]) => {
    if (!currentUser || messageIds.length === 0) return;
    const currentUsername = currentUser.username;

    setChatMessages((prev) => {
      let changed = false;
      const next = prev.map((msg) => {
        if (messageIds.includes(msg.id)) {
          const currentReadBy = Array.isArray(msg.readBy) ? msg.readBy : [];
          if (!currentReadBy.includes(currentUsername)) {
            changed = true;
            return { ...msg, readBy: [...currentReadBy, currentUsername] };
          }
        }
        return msg;
      });
      return changed ? next : prev;
    });

    messageIds.forEach((id) => {
      markChatMessageAsReadInFirestore(id, currentUsername);
    });
  }, [currentUser]);

  const handleExportCsv = (list: Vehicle[]) => {
    const canExport = currentUser?.role === 'admin' || hasPermission(currentUser, 'canExportReports');
    if (!canExport) {
      showToast('Rapor ve Excel/CSV dışa aktarma yetkiniz bulunmamaktadır.', 'warning');
      return;
    }
    exportVehiclesToCsv(list, getWarehouseNameById, getRampName, slaSettings, showToast);
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
    rampalar: 'Rampa Yönetimi',
    raporlar: 'Raporlar ve Geçmiş Kayıtlar'
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-100 dark:bg-slate-950 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* ================= Sol Sidebar Menu (Masaüstü) ================= */}
      <aside className="hidden md:flex w-64 bg-slate-900 dark:bg-black text-slate-300 flex-col justify-between shrink-0 shadow-xl no-print border-r border-slate-800 dark:border-slate-850">
        <div>
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center gap-3">
            <LogiPortalIcon className="w-10 h-10 shrink-0 drop-shadow-md rounded-xl" />
            <div className="truncate">
              <h1 className="font-black text-white text-base tracking-tight leading-tight font-sans">
                Logi<span className="text-purple-400">Portal</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-purple-300 font-bold tracking-wider uppercase">
                  Logistics
                </span>
                <span className="text-slate-600 text-[10px]">•</span>
                <span className="text-[10px] text-blue-400 font-semibold truncate max-w-[90px]">
                  {currentWarehouseName}
                </span>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {/* 1. Canlı İzleme */}
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

            {/* 2. Araç Yönetimi */}
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

            {/* 3. Rampa Yönetimi */}
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

            {/* 4. Raporlar */}
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

            {/* 5. Dashboard */}
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

            {/* Beklenen Araçlar */}
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
                onClick={() => {
                  setRampConfigInitialWhId(selectedDepoId > 0 ? selectedDepoId : activeWarehouses[0]?.id || 1);
                  setShowRampConfigModal(true);
                }}
                className="w-full py-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <WarehouseIcon className="w-3 h-3 text-sky-200" /> Depo Bazlı Rampalar
              </button>
              <button
                onClick={() => setShowSlaSettingsModal(true)}
                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3 text-amber-100" /> SLA Süre Ayarları
              </button>
              <button
                onClick={() => setShowWhatsAppModal(true)}
                className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                <MessageSquare className="w-3 h-3 text-emerald-200" /> WhatsApp Bildirim Ayarları
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-slate-400 border-t border-slate-800 flex justify-around items-center h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] z-40 shadow-2xl no-print px-2">
        {currentUser.role === 'security' ? (
          <>
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
          </>
        ) : (
          <>
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
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-1.5 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'text-blue-400 font-black bg-slate-800/90'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-[10px]">Dashboard</span>
            </button>
          </>
        )}
      </div>

      {/* ================= Sağ İçerik Alanı ================= */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 relative transition-colors duration-200">
        {/* Üst Header - iPhone Çentik / Dinamik Ada Güvenli Alanı Uyumlu */}
        <header className="header-safe bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 md:px-6 flex items-center justify-between shrink-0 shadow-sm no-print transition-colors duration-200">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Mobil Ekranlarda Temiz Alan: Başlık ve Depo İsmi Gizlenir, Sadece Kompakt Logo Gösterilir */}
            <div className="md:hidden flex items-center gap-1.5 shrink-0">
              <LogiPortalIcon className="w-6 h-6 shrink-0 drop-shadow-xs" />
            </div>

            {/* Panel İsmi Başlığı (Mobilde Gizli, Sadece Masaüstünde Gösterilir) */}
            <h2 className="hidden md:block text-base lg:text-lg font-bold text-slate-800 dark:text-slate-100 capitalize truncate">
              {tabTitles[activeTab]}
            </h2>

            {/* Depo Seçici (Mobilde Üst Başlıkta Gizli, Sadece Masaüstünde Gösterilir) */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 sm:p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <WarehouseIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ml-1 shrink-0" />
              <select
                value={selectedDepoId}
                onChange={(e) => setSelectedDepoId(Number(e.target.value))}
                className="bg-transparent font-bold text-xs text-slate-700 dark:text-slate-200 outline-none cursor-pointer truncate"
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
              className="px-2.5 py-1.5 md:py-2 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer relative shrink-0 h-9"
            >
              <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
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
                onClick={() => {
                  const nextState = !showNotificationMenu;
                  setShowNotificationMenu(nextState);
                  if (nextState) {
                    handleMarkNotificationsAsReadForMe();
                  }
                }}
                className="px-2.5 py-1.5 md:py-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800/70 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer relative shrink-0 h-9"
                title="Rampaya Çağrılan Araçlar"
              >
                <Megaphone
                  className={`w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 ${
                    pendingNotificationsCount > 0 ? 'animate-bounce text-amber-600 dark:text-amber-400' : ''
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
                <div className="fixed inset-x-2 top-16 md:absolute md:inset-x-auto md:right-0 md:top-full mt-2 w-auto md:w-[420px] max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3.5 bg-slate-900 dark:bg-black text-white font-bold flex justify-between items-center border-b border-slate-800">
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
                  <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 custom-scroll">
                    {scopedNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          const canApprove =
                            currentUser.role === 'admin' || hasPermission(currentUser, 'canApproveCall');
                          if (!canApprove) {
                            showToast('Çağrı onaylama ve yönlendirme yetkiniz bulunmamaktadır.', 'warning');
                            return;
                          }
                          setSelectedSecurityNotification(n);
                          setShowSecurityActionModal(true);
                          setShowNotificationMenu(false);
                        }}
                        className={`p-3.5 transition cursor-pointer ${
                          n.status === 'BEKLİYOR'
                            ? 'bg-amber-50/90 dark:bg-amber-950/30 hover:bg-amber-100/90 dark:hover:bg-amber-950/50 border-l-4 border-amber-500'
                            : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-relaxed flex-1">{n.text}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(n.id);
                            }}
                            title="Bildirimi Sil"
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 rounded transition cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {n.securityNote && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 rounded-lg text-[10px]">
                            <b>Güvenlik Notu:</b> {n.securityNote}
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span className="flex items-center gap-1">
                            <Clock3 className="w-3 h-3" /> Saat: {n.time}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-extrabold text-[9px] ${
                              n.status === 'BEKLİYOR'
                                ? 'bg-amber-500 text-slate-900'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60'
                            }`}
                          >
                            {n.status === 'BEKLİYOR' ? 'BEKLİYOR' : 'İŞLEM YAPILDI'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {scopedNotifications.length === 0 && (
                      <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                        Seçili depo için çağrı bildirimi bulunmuyor.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
                  : 'bg-amber-500 text-slate-950 font-black hover:bg-amber-400 border border-amber-400 shadow-sm animate-pulse'
              }`}
            >
              <Bell className="w-4 h-4 text-inherit" />
              <span className="hidden sm:inline">
                {pushPermission === 'granted' ? 'Bildirimler' : 'Bildirimleri Aç'}
              </span>
            </button>

            {/* Siyah Mod / Normal Mod Tema Butonu (Masaüstü & Mobil) */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Normal (Aydınlık) Moda Geç' : 'Siyah (Karanlık) Moda Geç'}
              className={`flex px-2 sm:px-2.5 md:px-3 py-1.5 md:py-2 text-xs font-bold rounded-xl transition items-center gap-1.5 cursor-pointer shrink-0 border shadow-2xs active:scale-95 ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
              }`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Aydınlık</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-purple-700" />
                  <span className="hidden sm:inline">Siyah Mod</span>
                </>
              )}
            </button>

            {/* Sesli Uyarı Aç/Kapat butonu (Masaüstü) */}
            <button
              onClick={toggleSound}
              title={isSoundEnabled ? 'Sesli Uyarılar Açık (Tıklayınca Sessize Alır)' : 'Sesli Uyarılar Kapalı (Tıklayınca Açar)'}
              className={`hidden md:flex px-2.5 md:px-3 py-2 text-xs font-semibold rounded-xl transition items-center gap-1.5 cursor-pointer ${
                isSoundEnabled
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden lg:inline">{isSoundEnabled ? 'Ses Açık' : 'Sessiz'}</span>
            </button>

            {/* Yenile butonu (Masaüstü) */}
            <button
              onClick={handleRefreshData}
              className="hidden md:flex px-2.5 md:px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">Yenile</span>
            </button>

            {/* Yeni Araç Kaydı butonu */}
            {currentUser.role !== 'guest' &&
              (currentUser.role === 'admin' || hasPermission(currentUser, 'canCreateVehicle')) && (
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
              className="md:hidden p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center justify-center cursor-pointer border border-slate-200 dark:border-slate-700"
              title="Yönetim & Hızlı İşlemler Menüsü"
            >
              <Menu className="w-4 h-4 text-slate-800 dark:text-slate-200" />
            </button>
          </div>
        </header>

        {/* Sekme İçerikleri */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6 custom-scroll">
          {/* İnternet veya Veritabanı Bağlantısı Kesildiğinde Anlık Canlı Uyarı Banner'ı */}
          {!isFirebaseConnected && (
            <div className="mb-3 p-3 bg-red-600 text-white rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs animate-pulse">
              <div className="flex items-center gap-2">
                <CloudOff className="w-5 h-5 shrink-0 text-white" />
                <div>
                  <p className="font-black text-sm">İnternet / Veritabanı Bağlantısı Kesildi!</p>
                  <p className="text-[11px] text-red-100">
                    Canlı sunucu bağlantısı bekleniyor. Veri çakışmasını önlemek için bağlantı yeniden sağlandığında canlı akış devam edecektir.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefreshData}
                className="px-3 py-1.5 bg-white text-red-700 font-extrabold rounded-xl hover:bg-red-50 transition cursor-pointer shrink-0 shadow-sm text-xs"
              >
                Yeniden Bağlan
              </button>
            </div>
          )}

          {/* Mobil & Web Push Bildirimlerini Aktif Etme Banner'ı (Notification.permission !== 'granted' olduğunda şık ve zorunlu olmayan uyarı) */}
          <PushNotificationPromptBanner
            permission={pushPermission}
            onPermissionChange={(newPerm) => setPushPermission(newPerm)}
            onOpenSettings={() => setShowPushSettingsModal(true)}
          />

          {activeTab === 'dashboard' && (
            <DashboardView
              vehicles={currentWarehouseVehicles}
              ramps={currentWarehouseRamps}
              pendingExpectedCount={pendingExpectedVehiclesCount}
              slaSettings={slaSettings}
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
              onNotify={showToast}
              onOpenAddModal={() => {
                if (!(currentUser.role === 'admin' || hasPermission(currentUser, 'canManageExpected'))) {
                  showToast('Beklenen araç ekleme yetkiniz bulunmamaktadır.', 'warning');
                  return;
                }
                setShowAddExpectedModal(true);
              }}
              onOpenEditModal={(exp) => {
                if (!(currentUser.role === 'admin' || hasPermission(currentUser, 'canManageExpected'))) {
                  showToast('Beklenen araç düzenleme yetkiniz bulunmamaktadır.', 'warning');
                  return;
                }
                setSelectedExpectedVehicleForEdit(exp);
                setShowEditExpectedModal(true);
              }}
              onProcessArrival={handleProcessExpectedArrival}
              onDeleteSingle={handleDeleteExpectedSingle}
              onDeleteBatch={handleDeleteExpectedBatch}
              onImportExcelSuccess={handleImportExcelExpected}
            />
          )}

          {activeTab === 'canli' && (
            <LiveTrackingView
              vehicles={currentWarehouseVehicles}
              currentUser={currentUser}
              slaSettings={slaSettings}
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
              slaSettings={slaSettings}
              selectedDepoId={selectedDepoId}
              getWarehouseNameById={getWarehouseNameById}
              onNotify={showToast}
              onOpenNewVehicleModal={handleOpenNewVehicleDirectly}
              onOpenEditModal={(v) => {
                if (!(currentUser.role === 'admin' || hasPermission(currentUser, 'canEditVehicle'))) {
                  showToast('Araç bilgilerini düzenleme yetkiniz bulunmamaktadır.', 'warning');
                  return;
                }
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
              onBulkMakeReady={handleBulkMakeReady}
              onExportCsv={handleExportCsv}
              onAssignRamp={handleAssignRamp}
              onSendAdminCallRequest={handleSendAdminCallRequest}
              onCancelRampCall={handleCancelRampCall}
              onToggleAcil={handleToggleAcil}
            />
          )}

          {activeTab === 'rampalar' && (
            <RampManagementView
              ramps={currentWarehouseRamps}
              vehicles={vehicles}
              warehouses={warehouses}
              selectedDepoId={selectedDepoId}
              slaSettings={slaSettings}
              currentUser={currentUser}
              onRampStatusChange={handleRampStatusChange}
              onChangeVehicleRamp={handleChangeVehicleRamp}
              onReleaseRampVehicle={handleReleaseRampVehicle}
              onAuthorizeExitVehicle={(v) => handleUpdateVehicleStatus(v, 'ÇIKIŞ YAPTI')}
              onOpenRampAssignModal={(r) => {
                setSelectedRampForAssign(r);
                setShowRampAssignModal(true);
              }}
              onOpenDetailModal={(v) => {
                setSelectedDetailVehicle(v);
                setShowDetailViewModal(true);
              }}
              onOpenPhotoGallery={(v) => {
                setSelectedVehicleForPhoto(v);
                setShowPhotoGalleryModal(true);
              }}
              onOpenRampManager={
                currentUser.role === 'admin'
                  ? () => {
                      setRampConfigInitialWhId(selectedDepoId > 0 ? selectedDepoId : activeWarehouses[0]?.id || 1);
                      setShowRampConfigModal(true);
                    }
                  : undefined
              }
              onOpenSlaSettings={
                currentUser.role === 'admin'
                  ? () => setShowSlaSettingsModal(true)
                  : undefined
              }
            />
          )}

          {activeTab === 'raporlar' && (
            <ReportsView
              vehicles={currentWarehouseVehicles}
              currentUser={currentUser}
              slaSettings={slaSettings}
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
        chatPresences={chatPresences}
        currentUser={currentUser}
        users={users}
        vehicles={vehicles}
        ramps={ramps}
        warehouses={warehouses}
        onSendMessage={handleSendChatMessage}
        onEditMessage={handleEditChatMessage}
        onDeleteMessage={handleDeleteChatMessage}
        onToggleReaction={handleToggleChatReaction}
        onTogglePinMessage={handleTogglePinChatMessage}
        onClearMessages={handleClearChatMessages}
        onMarkMessagesAsRead={handleMarkChatMessagesAsRead}
        onUpdatePresence={handleUpdateChatPresence}
        onNavigateToVehicle={(v) => {
          setSelectedDetailVehicle(v);
          setShowDetailViewModal(true);
        }}
        onNavigateToRamp={() => setActiveTab('rampalar')}
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
        onNotify={showToast}
        onSave={handleSaveExpectedVehicle}
      />

      {/* 1.1 Beklenen Araç Bilgilerini Düzenleme Modalı */}
      <EditExpectedVehicleModal
        isOpen={showEditExpectedModal}
        onClose={() => {
          setShowEditExpectedModal(false);
          setSelectedExpectedVehicleForEdit(null);
        }}
        expectedVehicle={selectedExpectedVehicleForEdit}
        warehouses={warehouses}
        customers={customers}
        onAddNewCustomer={handleAddNewCustomerByName}
        onNotify={showToast}
        onSave={handleUpdateExpectedVehicle}
      />

      {/* 2. Güvenlik Bildirim İşlem Modalı */}
      <SecurityActionModal
        notification={selectedSecurityNotification}
        ramps={ramps}
        vehicles={vehicles}
        currentUser={currentUser}
        onNotify={showToast}
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
        onNotify={showToast}
        onAddUser={handleAddUser}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
      />

      {/* 4. Detaylı Araç Bilgi & Fotoğraf İnceleme Modalı */}
      <DetailViewModal
        vehicle={liveSelectedDetailVehicle}
        rampName={getRampName(liveSelectedDetailVehicle?.rampaId)}
        warehouseName={liveSelectedDetailVehicle ? getWarehouseNameById(liveSelectedDetailVehicle.depoId) : undefined}
        slaSettings={slaSettings}
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

      {/* 5.1 Beklenen Aracı Sahaya Kabul Et Modalı (Tek Tıkla Giriş veya Düzenleme) */}
      <ExpectedVehicleArrivalModal
        isOpen={showExpectedArrivalModal}
        expectedVehicle={selectedExpectedVehicleForArrival}
        getWarehouseNameById={getWarehouseNameById}
        onClose={() => {
          setShowExpectedArrivalModal(false);
          setSelectedExpectedVehicleForArrival(null);
        }}
        onDirectAdmit={handleDirectAdmitExpectedVehicle}
        onOpenEditForm={handleOpenEditExpectedForm}
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
        onNotify={showToast}
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
          onNotify={showToast}
          onClose={() => {
            setSelectedVehicleForEdit(null);
            setShowEditVehicleModal(false);
          }}
          onSave={handleSaveVehicleEdit}
          onDelete={
            currentUser?.role === 'admin' || hasPermission(currentUser, 'canEditVehicle')
              ? handleDeleteVehicle
              : undefined
          }
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
        onResetCustomers={handleResetCustomers}
      />

      {/* 9. Şifre Değiştirme Modalı */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        users={users}
        onNotify={showToast}
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
        onManageWarehouseRamps={(whId) => {
          setShowWarehouseModal(false);
          setRampConfigInitialWhId(whId);
          setShowRampConfigModal(true);
        }}
      />

      {/* 12.1 Depo Bazlı Rampa Yönetimi Modalı (Admin) */}
      <RampConfigModal
        isOpen={showRampConfigModal}
        onClose={() => setShowRampConfigModal(false)}
        warehouses={warehouses}
        ramps={ramps}
        vehicles={vehicles}
        initialWarehouseId={rampConfigInitialWhId}
        onNotify={showToast}
        onAddRamp={handleAddRampForWarehouse}
        onSeedDefaultRamps={handleSeedDefaultRampsForWarehouse}
        onRenameRamp={handleRenameRamp}
        onDeleteRamp={handleDeleteRamp}
      />

      {/* 12.2 SLA Hedef Süre Ayarları Modalı (Admin) */}
      <SlaSettingsModal
        isOpen={showSlaSettingsModal}
        onClose={() => setShowSlaSettingsModal(false)}
        slaSettings={slaSettings}
        onNotify={showToast}
        onSave={handleSaveSlaSettings}
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
          <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Üst Bar / Kullanıcı Bilgisi */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-md">
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{currentUser.username}</h4>
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 capitalize flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{currentUser.role === 'admin' ? 'Yönetici (Admin)' : currentUser.role}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowMobileAdminMenu(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Yönetici Hızlı İşlemleri */}
            {currentUser.role === 'admin' && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Yönetici İşlemleri</p>
                
                {/* Siyah Mod / Normal Mod Hızlı Geçiş */}
                <div className="flex items-center justify-between p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    {theme === 'dark' ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block">
                        {theme === 'dark' ? 'Siyah Mod (Aktif)' : 'Normal Mod (Aktif)'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {theme === 'dark' ? 'Göz yorgunluğunu azaltan siyah tema' : 'Klasik aydınlık tema'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shadow-xs ${
                      theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {theme === 'dark' ? 'Siyah Mod' : 'Normal'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowCustomerModal(true);
                  }}
                  className="w-full p-3.5 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-900 dark:text-teal-200 rounded-2xl font-bold text-xs flex items-center justify-between border border-teal-200 dark:border-teal-800/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Firma / Müşteri Yönetimi</span>
                  </span>
                  <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-semibold">Tanımlamalar</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowUserManagementModal(true);
                  }}
                  className="w-full p-3.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded-2xl font-bold text-xs flex items-center justify-between border border-blue-200 dark:border-blue-800/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Kullanıcı & İzin Yönetimi</span>
                  </span>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">Kutucuklu İzinler</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    window.dispatchEvent(new CustomEvent('open-chat-widget'));
                  }}
                  className="w-full p-3.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-200 rounded-2xl font-bold text-xs flex items-center justify-between border border-blue-200 dark:border-blue-800/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Saha & Güvenlik Sohbeti</span>
                  </span>
                  {unreadChatCount > 0 ? (
                    <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black animate-bounce">
                      {unreadChatCount} Okunmamış
                    </span>
                  ) : (
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">Aç</span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowWarehouseModal(true);
                  }}
                  className="w-full p-3.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 rounded-2xl font-bold text-xs flex items-center justify-between border border-indigo-200 dark:border-indigo-800/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Depo & Saha Yönetimi</span>
                  </span>
                  <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">Aktif / Pasif</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setRampConfigInitialWhId(selectedDepoId > 0 ? selectedDepoId : activeWarehouses[0]?.id || 1);
                    setShowRampConfigModal(true);
                  }}
                  className="w-full p-3.5 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-900 dark:text-sky-200 rounded-2xl font-bold text-xs flex items-center justify-between border border-sky-200 dark:border-sky-800/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <WarehouseIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Depo Bazlı Rampalar</span>
                  </span>
                  <span className="text-[10px] bg-sky-600 text-white px-2 py-0.5 rounded-full font-semibold">{currentWarehouseRamps.length} Rampa</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowSlaSettingsModal(true);
                  }}
                  className="w-full p-3.5 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded-2xl font-bold text-xs flex items-center justify-between border border-amber-200 dark:border-amber-800/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>SLA Hedef Süre Ayarları</span>
                  </span>
                  <span className="text-[10px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-semibold">Ayarla</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileAdminMenu(false);
                    setShowWhatsAppModal(true);
                  }}
                  className="w-full p-3.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 rounded-2xl font-bold text-xs flex items-center justify-between border border-emerald-200 dark:border-emerald-800/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                  className="w-full p-3.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 rounded-2xl font-bold text-xs flex items-center justify-between border border-indigo-200 dark:border-indigo-800/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
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
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-xs flex items-center justify-between border border-slate-200 dark:border-slate-700 transition cursor-pointer"
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
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Depo / Saha Seçimi</p>
              <div className="relative">
                <WarehouseIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-blue-600 dark:text-blue-400 pointer-events-none" />
                <select
                  value={selectedDepoId}
                  onChange={(e) => {
                    setSelectedDepoId(Number(e.target.value));
                    setShowMobileAdminMenu(false);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
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
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sistem Ayarları</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    toggleSound();
                  }}
                  className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    isSoundEnabled
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isSoundEnabled ? <Volume2 className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <VolumeX className="w-4 h-4" />}
                  <span>{isSoundEnabled ? 'Ses Açık' : 'Sessiz'}</span>
                </button>

                <button
                  onClick={() => {
                    handleRefreshData();
                    setShowMobileAdminMenu(false);
                  }}
                  className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Verileri Yenile</span>
                </button>
              </div>

              {/* Bulut Bağlantı Durumu */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                  {isFirebaseConnected ? (
                    <Cloud className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <CloudOff className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Bulut Senkronizasyonu</span>
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                  isFirebaseConnected ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}>
                  {isFirebaseConnected ? 'Firebase Canlı' : 'Bağlanıyor...'}
                </span>
              </div>
            </div>

            {/* Çıkış Yap */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowMobileAdminMenu(false);
                  handleLogout();
                }}
                className="w-full py-3.5 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
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
        <div className="fixed top-4 right-4 z-[80] max-w-sm w-full transition-all">
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
