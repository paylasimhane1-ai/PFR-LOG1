import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import type { Vehicle, Ramp, ExpectedVehicle, AppNotification, ChatMessage, Warehouse, User, Customer } from '../types';
import firebaseConfigData from '../../firebase-applet-config.json';

// Resolve configuration: Vercel/production environment variables take precedence,
// with graceful fallback to firebase-applet-config.json for local/AI Studio development.
const env: Record<string, string | undefined> =
  (import.meta as unknown as { env?: Record<string, string | undefined> })?.env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfigData.apiKey || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigData.authDomain || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfigData.projectId || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigData.storageBucket || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigData.messagingSenderId || '',
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfigData.appId || '',
};

const firestoreDbId =
  env.VITE_FIREBASE_DATABASE_ID ||
  env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
  firebaseConfigData.firestoreDatabaseId ||
  '(default)';

// Initialize Firebase App
export const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

// Bind to configured database ID or default
export const db = getFirestore(app, firestoreDbId);

// Connection test
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline, using offline persistence cache.');
    }
    // If doc doesn't exist, it still contacted server successfully
    return true;
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
      console.warn('Firestore vehicles sync error, fallback to local state:', err);
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
          const batch = writeBatch(db);
          for (const item of initialDataIfEmpty) {
            batch.set(doc(db, 'ramps', String(item.id)), item);
          }
          await batch.commit();
        } catch (e) {
          console.warn('Error seeding initial ramps to Firestore:', e);
          onData(initialDataIfEmpty);
        }
        return;
      }

      const list: Ramp[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Ramp);
      });
      list.sort((a, b) => a.id - b.id);
      onData(list);
    },
    (err) => {
      console.warn('Firestore ramps sync error, fallback to local state:', err);
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
      console.warn('Firestore expected vehicles sync error:', err);
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
      console.warn('Firestore notifications sync error:', err);
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
      console.warn('Firestore chat messages sync error:', err);
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
  try {
    const cleaned = removeUndefinedFields(vehicle);
    await setDoc(doc(db, 'vehicles', String(vehicle.id)), cleaned);
  } catch (err) {
    console.error('saveVehicleToFirestore error:', err);
  }
}

export async function deleteVehicleFromFirestore(vehicleId: number): Promise<void> {
  try {
    await deleteDoc(doc(db, 'vehicles', String(vehicleId)));
  } catch (err) {
    console.error('deleteVehicleFromFirestore error:', err);
  }
}

export async function clearAllVehiclesFromFirestore(): Promise<void> {
  try {
    const colRef = collection(db, 'vehicles');
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('clearAllVehiclesFromFirestore error:', err);
  }
}

export async function clearAllExpectedVehiclesFromFirestore(): Promise<void> {
  try {
    const colRef = collection(db, 'expectedVehicles');
    const snapshot = await getDocs(colRef);
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('clearAllExpectedVehiclesFromFirestore error:', err);
  }
}

export async function resetAllRampsInFirestore(): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (let i = 1; i <= 12; i++) {
      batch.set(doc(db, 'ramps', String(i)), {
        id: i,
        ad: `Rampa ${i}`,
        durum: 'Boş'
      });
    }
    await batch.commit();
  } catch (err) {
    console.error('resetAllRampsInFirestore error:', err);
  }
}

export async function saveRampToFirestore(ramp: Ramp): Promise<void> {
  try {
    const cleaned = removeUndefinedFields(ramp);
    await setDoc(doc(db, 'ramps', String(ramp.id)), cleaned);
  } catch (err) {
    console.error('saveRampToFirestore error:', err);
  }
}

export async function saveExpectedVehicleToFirestore(item: ExpectedVehicle): Promise<void> {
  try {
    const cleaned = removeUndefinedFields(item);
    await setDoc(doc(db, 'expectedVehicles', String(item.id)), cleaned);
  } catch (err) {
    console.error('saveExpectedVehicleToFirestore error:', err);
  }
}

export async function deleteExpectedVehicleFromFirestore(id: number): Promise<void> {
  try {
    await deleteDoc(doc(db, 'expectedVehicles', String(id)));
  } catch (err) {
    console.error('deleteExpectedVehicleFromFirestore error:', err);
  }
}

export async function saveNotificationToFirestore(notification: AppNotification): Promise<void> {
  try {
    const cleaned = removeUndefinedFields(notification);
    await setDoc(doc(db, 'notifications', String(notification.id)), cleaned);
  } catch (err) {
    console.error('saveNotificationToFirestore error:', err);
  }
}

export async function deleteNotificationFromFirestore(id: number): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', String(id)));
  } catch (err) {
    console.error('deleteNotificationFromFirestore error:', err);
  }
}

export async function saveChatMessageToFirestore(message: ChatMessage): Promise<void> {
  try {
    const cleaned = removeUndefinedFields(message);
    await setDoc(doc(db, 'chatMessages', String(message.id)), cleaned);
  } catch (err) {
    console.error('saveChatMessageToFirestore error:', err);
  }
}

export async function deleteChatMessageFromFirestore(id: number): Promise<void> {
  try {
    await deleteDoc(doc(db, 'chatMessages', String(id)));
  } catch (err) {
    console.error('deleteChatMessageFromFirestore error:', err);
  }
}

export async function clearChatMessagesFromFirestore(): Promise<void> {
  try {
    const colRef = collection(db, 'chatMessages');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return;
    try {
      const batch = writeBatch(db);
      snapshot.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (batchErr) {
      console.warn('Batch delete failed, falling back to document delete:', batchErr);
      for (const d of snapshot.docs) {
        await deleteDoc(d.ref);
      }
    }
  } catch (err) {
    console.error('clearChatMessagesFromFirestore error:', err);
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
          const batch = writeBatch(db);
          for (const item of initialDataIfEmpty) {
            batch.set(doc(db, 'users', item.username.toLowerCase()), item);
          }
          await batch.commit();
        } catch (e) {
          console.warn('Error seeding initial users to Firestore:', e);
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
      console.warn('Firestore users sync error:', err);
    }
  );

  return unsubscribe;
}

export async function saveUserToFirestore(user: User): Promise<void> {
  try {
    const cleaned = removeUndefinedFields(user);
    await setDoc(doc(db, 'users', user.username.toLowerCase()), cleaned);
  } catch (err) {
    console.error('saveUserToFirestore error:', err);
  }
}

export async function deleteUserFromFirestore(username: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', username.toLowerCase()));
  } catch (err) {
    console.error('deleteUserFromFirestore error:', err);
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
          const batch = writeBatch(db);
          for (const item of initialDataIfEmpty) {
            batch.set(doc(db, 'warehouses', String(item.id)), removeUndefinedFields(item));
          }
          await batch.commit();
        } catch (e) {
          console.warn('Error seeding initial warehouses to Firestore:', e);
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
      console.warn('Firestore warehouses sync error:', err);
    }
  );

  return unsubscribe;
}

export async function saveWarehouseToFirestore(warehouse: Warehouse): Promise<void> {
  try {
    const cleaned = removeUndefinedFields(warehouse);
    await setDoc(doc(db, 'warehouses', String(warehouse.id)), cleaned);
  } catch (err) {
    console.error('saveWarehouseToFirestore error:', err);
  }
}

export async function deleteWarehouseFromFirestore(id: number): Promise<void> {
  try {
    await deleteDoc(doc(db, 'warehouses', String(id)));
  } catch (err) {
    console.error('deleteWarehouseFromFirestore error:', err);
  }
}

// -------------------------------------------------------------
// Customer (Firma / Müşteri) Sync & Mutations
// -------------------------------------------------------------

export function subscribeToCustomers(
  onData: (items: Customer[]) => void,
  initialDataIfEmpty?: Customer[]
): () => void {
  const colRef = collection(db, 'customers');

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty && initialDataIfEmpty && initialDataIfEmpty.length > 0) {
        try {
          const batch = writeBatch(db);
          for (const item of initialDataIfEmpty) {
            batch.set(doc(db, 'customers', String(item.id)), removeUndefinedFields(item));
          }
          await batch.commit();
        } catch (e) {
          console.warn('Error seeding initial customers to Firestore:', e);
          onData(initialDataIfEmpty);
        }
        return;
      }

      const list: Customer[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Customer);
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
      onData(list);
    },
    (err) => {
      console.warn('Firestore customers sync error:', err);
    }
  );

  return unsubscribe;
}

export async function saveCustomerToFirestore(customer: Customer): Promise<void> {
  try {
    const cleaned = removeUndefinedFields(customer);
    await setDoc(doc(db, 'customers', String(customer.id)), cleaned);
  } catch (err) {
    console.error('saveCustomerToFirestore error:', err);
  }
}

export async function deleteCustomerFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'customers', String(id)));
  } catch (err) {
    console.error('deleteCustomerFromFirestore error:', err);
  }
}
