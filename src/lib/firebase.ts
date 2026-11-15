import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  arrayUnion,
  onSnapshot,
  getDocs,
  getDocFromServer,
  writeBatch,
  query,
  where,
  type DocumentReference
} from 'firebase/firestore';
import type { Vehicle, Ramp, ExpectedVehicle, AppNotification, ChatMessage, ChatPresence, Warehouse, User, Customer, WhatsAppConfig, SlaSettings } from '../types';
import firebaseConfigData from '../../firebase-applet-config.json';

/**
 * Vercel veya diğer üretim platformlarından girilen ortam değişkenlerini temizler.
 * Tırnak işaretlerini (" veya ') ve boşlukları kırpar.
 */
export function cleanEnvVal(val: string | undefined): string {
  if (!val) return '';
  let str = String(val).trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

// Resolve configuration: Vercel/production environment variables take precedence,
// with graceful fallback to firebase-applet-config.json for local/AI Studio development.
const env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> })?.env || {};

export const firebaseConfig = {
  apiKey: cleanEnvVal(env.VITE_FIREBASE_API_KEY) || firebaseConfigData.apiKey || '',
  authDomain: cleanEnvVal(env.VITE_FIREBASE_AUTH_DOMAIN) || firebaseConfigData.authDomain || '',
  projectId: cleanEnvVal(env.VITE_FIREBASE_PROJECT_ID) || firebaseConfigData.projectId || '',
  storageBucket: cleanEnvVal(env.VITE_FIREBASE_STORAGE_BUCKET) || firebaseConfigData.storageBucket || '',
  messagingSenderId: cleanEnvVal(env.VITE_FIREBASE_MESSAGING_SENDER_ID) || firebaseConfigData.messagingSenderId || '',
  appId: cleanEnvVal(env.VITE_FIREBASE_APP_ID) || firebaseConfigData.appId || '',
};

const firestoreDbId =
  cleanEnvVal(env.VITE_FIREBASE_DATABASE_ID) ||
  cleanEnvVal(env.VITE_FIREBASE_FIRESTORE_DATABASE_ID) ||
  firebaseConfigData.firestoreDatabaseId ||
  '(default)';

// Initialize Firebase App
export const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

// Bind to configured database ID or default
export const db = getFirestore(app, firestoreDbId);

// Connection test (Server-authoritative check)
export async function testFirebaseConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('unavailable') || error.message.includes('network'))) {
      return false;
    }
    // If doc doesn't exist on server, it still successfully contacted Firestore server
    return true;
  }
}

// -------------------------------------------------------------
// Structured Firestore Error Handling & Broadcasting
// -------------------------------------------------------------

export enum FirestoreOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  code?: string;
  operationType: FirestoreOperationType;
  path: string | null;
}

type FirestoreErrorListener = (message: string, code?: string) => void;
const errorListeners = new Set<FirestoreErrorListener>();
let lastEmittedError = { message: '', timestamp: 0 };

export function subscribeToFirestoreErrors(listener: FirestoreErrorListener): () => void {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

function getTurkishFirestoreErrorMessage(err: unknown, actionLabel?: string): { message: string; code?: string } {
  const errObj = err as { code?: string; message?: string } | null;
  const code = errObj?.code || '';
  const rawMsg = errObj?.message || (err instanceof Error ? err.message : String(err));
  const lower = `${code} ${rawMsg}`.toLowerCase();
  const prefix = actionLabel ? `${actionLabel}: ` : 'Bulut veritabanı hatası: ';

  if (lower.includes('permission-denied') || lower.includes('insufficient permissions')) {
    return {
      code: code || 'permission-denied',
      message: `${prefix}Veri doğrulama veya erişim kuralı reddedildi. Lütfen girilen alanları/limitleri kontrol ediniz.`
    };
  }
  if (lower.includes('1048576') || lower.includes('maximum size') || lower.includes('resource-exhausted') || lower.includes('too large')) {
    return {
      code: code || 'resource-exhausted',
      message: `${prefix}Kayıt boyutu veritabanı sınırını (1 MB) aşıyor. Lütfen fotoğraf sayısını azaltınız.`
    };
  }
  if (lower.includes('invalid-argument')) {
    return {
      code: code || 'invalid-argument',
      message: `${prefix}Geçersiz veri formatı nedeniyle kayıt sunucuya yazılamadı.`
    };
  }
  if (lower.includes('unavailable') || lower.includes('deadline-exceeded') || lower.includes('network') || lower.includes('offline')) {
    return {
      code: code || 'unavailable',
      message: `${prefix}Sunucuya geçici olarak ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyiniz.`
    };
  }
  return {
    code: code || undefined,
    message: `${prefix}Değişiklik buluta kaydedilemedi. Lütfen tekrar deneyiniz.`
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: FirestoreOperationType,
  path: string | null,
  actionLabel?: string
): void {
  const errObj = error as { code?: string; message?: string } | null;
  const errInfo: FirestoreErrorInfo = {
    error: errObj?.message || (error instanceof Error ? error.message : String(error)),
    code: errObj?.code,
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  const { message, code } = getTurkishFirestoreErrorMessage(error, actionLabel);
  const now = Date.now();
  if (lastEmittedError.message === message && now - lastEmittedError.timestamp < 2500) {
    return;
  }
  lastEmittedError = { message, timestamp: now };
  errorListeners.forEach((listener) => {
    try {
      listener(message, code);
    } catch {
      // ignore listener errors
    }
  });
}

async function commitDeleteDocsInChunks(refs: DocumentReference[], chunkSize = 450): Promise<void> {
  for (let i = 0; i < refs.length; i += chunkSize) {
    const batch = writeBatch(db);
    const slice = refs.slice(i, i + chunkSize);
    for (const ref of slice) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}

async function commitSetDocsInChunks(
  items: Array<{ ref: DocumentReference; data: Record<string, any> }>,
  chunkSize = 450
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const batch = writeBatch(db);
    const slice = items.slice(i, i + chunkSize);
    for (const item of slice) {
      batch.set(item.ref, item.data);
    }
    await batch.commit();
  }
}

// -------------------------------------------------------------
// Real-time Sync Subscriptions
// -------------------------------------------------------------

export function subscribeToVehicles(
  onData: (vehicles: Vehicle[]) => void
): () => void {
  const colRef = collection(db, 'vehicles');

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }

      const list: Vehicle[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Vehicle);
      });
      // Sort descending by id
      list.sort((a, b) => b.id - a.id);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.LIST, 'vehicles', 'Araç listesi senkronizasyonu');
    }
  );

  return unsubscribe;
}

export function subscribeToRamps(
  onData: (ramps: Ramp[]) => void,
  initialDataIfEmpty?: Ramp[]
): () => void {
  const colRef = collection(db, 'ramps');

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty && initialDataIfEmpty && initialDataIfEmpty.length > 0) {
        try {
          await commitSetDocsInChunks(
            initialDataIfEmpty.map((item) => ({
              ref: doc(db, 'ramps', String(item.id)),
              data: removeUndefinedFields({
                ...item,
                depoId: typeof item.depoId === 'number' ? item.depoId : 1
              })
            }))
          );
        } catch (e) {
          handleFirestoreError(e, FirestoreOperationType.WRITE, 'ramps', 'Varsayılan rampalar oluşturulamadı');
          onData(initialDataIfEmpty);
        }
        return;
      }

      const list: Ramp[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Ramp;
        list.push({
          ...data,
          depoId: typeof data.depoId === 'number' ? data.depoId : 1
        });
      });
      list.sort((a, b) => a.id - b.id);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.LIST, 'ramps', 'Rampa listesi senkronizasyonu');
    }
  );

  return unsubscribe;
}

export function subscribeToExpectedVehicles(
  onData: (items: ExpectedVehicle[]) => void
): () => void {
  const colRef = collection(db, 'expectedVehicles');

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        onData([]);
        return;
      }

      const list: ExpectedVehicle[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ExpectedVehicle);
      });
      list.sort((a, b) => b.id - a.id);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.LIST, 'expectedVehicles', 'Beklenen araç listesi senkronizasyonu');
    }
  );

  return unsubscribe;
}

export function subscribeToNotifications(
  onData: (items: AppNotification[]) => void
): () => void {
  const colRef = collection(db, 'notifications');

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as AppNotification);
      });
      list.sort((a, b) => b.id - a.id);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.LIST, 'notifications', 'Bildirim senkronizasyonu');
    }
  );

  return unsubscribe;
}

export function subscribeToChatMessages(
  onData: (items: ChatMessage[]) => void
): () => void {
  const colRef = collection(db, 'chatMessages');

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ChatMessage);
      });
      list.sort((a, b) => a.id - b.id);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.LIST, 'chatMessages', 'Sohbet mesajları senkronizasyonu');
    }
  );

  return unsubscribe;
}

// -------------------------------------------------------------
// Firestore Helper & Write Mutators
// -------------------------------------------------------------

/**
 * Recursively removes any object keys with `undefined` values,
 * because Firestore setDoc / updateDoc rejects `undefined`.
 */
export function removeUndefinedFields<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = removeUndefinedFields(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((item) =>
        item !== null && typeof item === 'object' ? removeUndefinedFields(item) : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function saveVehicleToFirestore(vehicle: Vehicle): Promise<void> {
  const path = `vehicles/${vehicle.id}`;
  try {
    const cleaned = removeUndefinedFields(vehicle);
    await setDoc(doc(db, 'vehicles', String(vehicle.id)), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, path, `${vehicle.dorsePlaka || 'Araç'} kaydedilemedi`);
  }
}

export async function deleteVehicleFromFirestore(vehicleId: number): Promise<void> {
  const path = `vehicles/${vehicleId}`;
  try {
    await deleteDoc(doc(db, 'vehicles', String(vehicleId)));
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, path, 'Araç kaydı silinemedi');
  }
}

export async function clearAllVehiclesFromFirestore(): Promise<void> {
  try {
    const colRef = collection(db, 'vehicles');
    const snapshot = await getDocs(colRef);
    await commitDeleteDocsInChunks(snapshot.docs.map((d) => d.ref));
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, 'vehicles', 'Tüm araçlar temizlenemedi');
  }
}

export async function clearAllExpectedVehiclesFromFirestore(): Promise<void> {
  try {
    const colRef = collection(db, 'expectedVehicles');
    const snapshot = await getDocs(colRef);
    await commitDeleteDocsInChunks(snapshot.docs.map((d) => d.ref));
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, 'expectedVehicles', 'Beklenen araç listesi temizlenemedi');
  }
}

export async function resetAllRampsInFirestore(): Promise<void> {
  try {
    const colRef = collection(db, 'ramps');
    const existingSnap = await getDocs(colRef);
    if (!existingSnap.empty) {
      await commitDeleteDocsInChunks(existingSnap.docs.map((d) => d.ref));
    }
    const defaultRamps = Array.from({ length: 12 }, (_, idx) => {
      const i = idx + 1;
      return {
        ref: doc(db, 'ramps', String(i)),
        data: {
          id: i,
          depoId: 1,
          ad: `Rampa ${i}`,
          durum: 'Boş'
        }
      };
    });
    await commitSetDocsInChunks(defaultRamps);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, 'ramps', 'Rampalar sıfırlanamadı');
  }
}

export async function saveRampToFirestore(ramp: Ramp): Promise<void> {
  const path = `ramps/${ramp.id}`;
  try {
    const cleaned = removeUndefinedFields({
      ...ramp,
      depoId: typeof ramp.depoId === 'number' ? ramp.depoId : 1
    });
    await setDoc(doc(db, 'ramps', String(ramp.id)), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, path, `${ramp.ad || 'Rampa'} güncellenemedi`);
  }
}

export async function saveRampsBatchToFirestore(ramps: Ramp[]): Promise<void> {
  try {
    await commitSetDocsInChunks(
      ramps.map((ramp) => ({
        ref: doc(db, 'ramps', String(ramp.id)),
        data: removeUndefinedFields({
          ...ramp,
          depoId: typeof ramp.depoId === 'number' ? ramp.depoId : 1
        })
      }))
    );
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, 'ramps', 'Rampalar toplu kaydedilemedi');
  }
}

export async function deleteRampFromFirestore(rampId: number): Promise<void> {
  const path = `ramps/${rampId}`;
  try {
    await deleteDoc(doc(db, 'ramps', String(rampId)));
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, path, 'Rampa silinemedi');
  }
}

export async function saveExpectedVehicleToFirestore(item: ExpectedVehicle): Promise<void> {
  const path = `expectedVehicles/${item.id}`;
  try {
    const cleaned = removeUndefinedFields(item);
    await setDoc(doc(db, 'expectedVehicles', String(item.id)), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, path, `${item.dorsePlaka || 'Beklenen araç'} kaydedilemedi`);
  }
}

export async function deleteExpectedVehicleFromFirestore(id: number): Promise<void> {
  const path = `expectedVehicles/${id}`;
  try {
    await deleteDoc(doc(db, 'expectedVehicles', String(id)));
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, path, 'Beklenen araç kaydı silinemedi');
  }
}

export async function saveNotificationToFirestore(notification: AppNotification): Promise<void> {
  const path = `notifications/${notification.id}`;
  try {
    const cleaned = removeUndefinedFields(notification);
    await setDoc(doc(db, 'notifications', String(notification.id)), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, path, 'Bildirim kaydedilemedi');
  }
}

export async function deleteNotificationFromFirestore(id: number): Promise<void> {
  const path = `notifications/${id}`;
  try {
    await deleteDoc(doc(db, 'notifications', String(id)));
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, path, 'Bildirim silinemedi');
  }
}

/**
 * Kullanıcı bazlı bildirim okundu kaydı (readBy listesine kullanıcı ekler)
 */
export async function markNotificationAsReadInFirestore(id: number, username: string): Promise<void> {
  if (!username) return;
  const path = `notifications/${id}`;
  try {
    const docRef = doc(db, 'notifications', String(id));
    await updateDoc(docRef, {
      readBy: arrayUnion(username)
    });
  } catch (err) {
    try {
      const snap = await getDoc(doc(db, 'notifications', String(id)));
      if (snap.exists()) {
        const data = snap.data();
        const currentReadBy = Array.isArray(data.readBy) ? data.readBy : [];
        if (!currentReadBy.includes(username)) {
          await setDoc(doc(db, 'notifications', String(id)), {
            ...data,
            readBy: [...currentReadBy, username]
          }, { merge: true });
        }
      }
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, FirestoreOperationType.UPDATE, path, 'Bildirim okundu bilgisi güncellenemedi');
    }
  }
}

export async function saveChatMessageToFirestore(message: ChatMessage): Promise<void> {
  const path = `chatMessages/${message.id}`;
  try {
    const cleaned = removeUndefinedFields(message);
    await setDoc(doc(db, 'chatMessages', String(message.id)), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, path, 'Sohbet mesajı gönderilemedi');
  }
}

/**
 * Kullanıcı bazlı mesaj okundu kaydı (readBy listesine kullanıcı ekler)
 */
export async function markChatMessageAsReadInFirestore(id: number, username: string): Promise<void> {
  if (!username) return;
  const path = `chatMessages/${id}`;
  try {
    const docRef = doc(db, 'chatMessages', String(id));
    await updateDoc(docRef, {
      readBy: arrayUnion(username)
    });
  } catch (err) {
    try {
      const snap = await getDoc(doc(db, 'chatMessages', String(id)));
      if (snap.exists()) {
        const data = snap.data();
        const currentReadBy = Array.isArray(data.readBy) ? data.readBy : [];
        if (!currentReadBy.includes(username)) {
          await setDoc(doc(db, 'chatMessages', String(id)), {
            ...data,
            readBy: [...currentReadBy, username]
          }, { merge: true });
        }
      }
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr, FirestoreOperationType.UPDATE, path, 'Mesaj okundu bilgisi güncellenemedi');
    }
  }
}

export async function deleteChatMessageFromFirestore(id: number): Promise<void> {
  const path = `chatMessages/${id}`;
  try {
    await deleteDoc(doc(db, 'chatMessages', String(id)));
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, path, 'Sohbet mesajı silinemedi');
  }
}

export async function clearChatMessagesFromFirestore(channelId?: string): Promise<void> {
  try {
    const colRef = collection(db, 'chatMessages');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return;
    if (!channelId) {
      await commitDeleteDocsInChunks(snapshot.docs.map((d) => d.ref));
      return;
    }
    const targetRefs = snapshot.docs
      .filter((d) => ((d.data() as ChatMessage).channelId || 'genel') === channelId)
      .map((d) => d.ref);
    if (targetRefs.length > 0) {
      await commitDeleteDocsInChunks(targetRefs);
    }
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, 'chatMessages', 'Sohbet geçmişi temizlenemedi');
  }
}

export function subscribeToChatPresence(
  onData: (items: ChatPresence[]) => void
): () => void {
  const colRef = collection(db, 'chatPresence');

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: ChatPresence[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ChatPresence);
      });
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.LIST, 'chatPresence', 'Aktif kullanıcı durumu senkronizasyonu');
    }
  );

  return unsubscribe;
}

export async function upsertChatPresenceInFirestore(presence: ChatPresence): Promise<void> {
  if (!presence.username) return;
  const docId = presence.username.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const path = `chatPresence/${docId}`;
  try {
    const cleaned = removeUndefinedFields(presence);
    await setDoc(doc(db, 'chatPresence', docId), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, path, 'Kullanıcı çevrimiçi durumu güncellenemedi');
  }
}

// -------------------------------------------------------------
// User Sync & Mutations (Cross-Device Global Synchronization)
// -------------------------------------------------------------

export function subscribeToUsers(
  onData: (users: User[]) => void,
  initialDataIfEmpty?: User[]
): () => void {
  const colRef = collection(db, 'users');

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty && initialDataIfEmpty && initialDataIfEmpty.length > 0) {
        try {
          await commitSetDocsInChunks(
            initialDataIfEmpty.map((item) => ({
              ref: doc(db, 'users', item.username.toLowerCase()),
              data: removeUndefinedFields(item)
            }))
          );
        } catch (e) {
          handleFirestoreError(e, FirestoreOperationType.WRITE, 'users', 'Varsayılan kullanıcılar oluşturulamadı');
          onData(initialDataIfEmpty);
        }
        return;
      }

      const list: User[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as User);
      });
      // Sort alphabetically by username
      list.sort((a, b) => a.username.localeCompare(b.username));
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.LIST, 'users', 'Kullanıcı listesi senkronizasyonu');
    }
  );

  return unsubscribe;
}

export async function saveUserToFirestore(user: User): Promise<void> {
  const path = `users/${user.username.toLowerCase()}`;
  try {
    const cleaned = removeUndefinedFields(user);
    await setDoc(doc(db, 'users', user.username.toLowerCase()), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, path, `${user.username} kullanıcısı kaydedilemedi`);
  }
}

export async function deleteUserFromFirestore(username: string): Promise<void> {
  const path = `users/${username.toLowerCase()}`;
  try {
    await deleteDoc(doc(db, 'users', username.toLowerCase()));
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, path, `${username} kullanıcısı silinemedi`);
  }
}

// -------------------------------------------------------------
// Warehouse Sync & Mutations
// -------------------------------------------------------------

export function subscribeToWarehouses(
  onData: (items: Warehouse[]) => void,
  initialDataIfEmpty?: Warehouse[]
): () => void {
  const colRef = collection(db, 'warehouses');

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty && initialDataIfEmpty && initialDataIfEmpty.length > 0) {
        try {
          await commitSetDocsInChunks(
            initialDataIfEmpty.map((item) => ({
              ref: doc(db, 'warehouses', String(item.id)),
              data: removeUndefinedFields(item)
            }))
          );
        } catch (e) {
          handleFirestoreError(e, FirestoreOperationType.WRITE, 'warehouses', 'Varsayılan depolar oluşturulamadı');
          onData(initialDataIfEmpty);
        }
        return;
      }

      const list: Warehouse[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Warehouse);
      });
      list.sort((a, b) => a.id - b.id);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.LIST, 'warehouses', 'Depo listesi senkronizasyonu');
    }
  );

  return unsubscribe;
}

export async function saveWarehouseToFirestore(warehouse: Warehouse): Promise<void> {
  const path = `warehouses/${warehouse.id}`;
  try {
    const cleaned = removeUndefinedFields(warehouse);
    await setDoc(doc(db, 'warehouses', String(warehouse.id)), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, path, `${warehouse.ad || 'Depo'} kaydedilemedi`);
  }
}

export async function deleteWarehouseFromFirestore(id: number): Promise<void> {
  const path = `warehouses/${id}`;
  try {
    await deleteDoc(doc(db, 'warehouses', String(id)));
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, path, 'Depo silinemedi');
  }
}

// -------------------------------------------------------------
// Customer (Firma / Müşteri) Sync & Mutations
// -------------------------------------------------------------

export function subscribeToCustomers(
  onData: (items: Customer[]) => void
): () => void {
  const colRef = collection(db, 'customers');

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const list: Customer[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Customer);
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.LIST, 'customers', 'Müşteri listesi senkronizasyonu');
    }
  );

  return unsubscribe;
}

export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  const path = `customers/${customer.id}`;
  try {
    const cleaned = removeUndefinedFields(customer);
    await setDoc(doc(db, 'customers', String(customer.id)), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, path, `${customer.name || 'Firma'} kaydedilemedi`);
  }
}

export async function deleteCustomerFromFirestore(id: string, name?: string): Promise<void> {
  const path = `customers/${id || name || ''}`;
  try {
    if (id) {
      await deleteDoc(doc(db, 'customers', String(id)));
    }
    if (name && name.trim()) {
      const q = query(collection(db, 'customers'), where('name', '==', name.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await commitDeleteDocsInChunks(snap.docs.map((d) => d.ref));
      }
    }
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, path, 'Firma kaydı silinemedi');
  }
}

export async function clearAllCustomersFromFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'customers'));
    if (!snap.empty) {
      await commitDeleteDocsInChunks(snap.docs.map((d) => d.ref));
    }
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.DELETE, 'customers', 'Müşteri listesi temizlenemedi');
  }
}

// -------------------------------------------------------------
// WhatsApp Configuration Sync & Mutations (Cross-Device Global Settings)
// -------------------------------------------------------------

export function subscribeToWhatsAppSettings(
  onData: (cfg: WhatsAppConfig) => void
): () => void {
  const docRef = doc(db, 'settings', 'whatsapp');
  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as WhatsAppConfig);
      }
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.GET, 'settings/whatsapp', 'WhatsApp ayarları senkronizasyonu');
    }
  );
  return unsubscribe;
}

export async function saveWhatsAppSettingsToFirestore(config: WhatsAppConfig): Promise<void> {
  try {
    const cleaned = removeUndefinedFields(config);
    await setDoc(doc(db, 'settings', 'whatsapp'), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, 'settings/whatsapp', 'WhatsApp ayarları kaydedilemedi');
  }
}

// -------------------------------------------------------------
// SLA Settings Sync & Mutations (Cross-Device Global Settings)
// -------------------------------------------------------------

export function subscribeToSlaSettings(
  onData: (settings: SlaSettings) => void
): () => void {
  const docRef = doc(db, 'settings', 'sla');
  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as SlaSettings);
      }
    },
    (err) => {
      handleFirestoreError(err, FirestoreOperationType.GET, 'settings/sla', 'SLA ayarları senkronizasyonu');
    }
  );
  return unsubscribe;
}

export async function saveSlaSettingsToFirestore(settings: SlaSettings): Promise<void> {
  try {
    const cleaned = removeUndefinedFields(settings);
    await setDoc(doc(db, 'settings', 'sla'), cleaned);
  } catch (err) {
    handleFirestoreError(err, FirestoreOperationType.WRITE, 'settings/sla', 'SLA ayarları kaydedilemedi');
  }
}
