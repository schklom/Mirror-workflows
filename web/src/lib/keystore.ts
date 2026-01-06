const DB_NAME = 'fmd-keystore';
const STORE_NAME = 'keys';
const DB_VERSION = 1;

interface KeyStore {
  rsaEncKey: CryptoKey;
  rsaSigKey: CryptoKey;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () =>
      reject(new Error(request.error?.message || 'Failed to open database'));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function storeKeys(keys: KeyStore): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(keys, 'current');

    request.onerror = () =>
      reject(new Error(request.error?.message || 'Failed to store keys'));
    request.onsuccess = () => resolve();
  });
}

export async function getKeys(): Promise<KeyStore | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('current');

    request.onerror = () =>
      reject(new Error(request.error?.message || 'Failed to get keys'));
    request.onsuccess = () =>
      resolve((request.result as KeyStore | undefined) || null);
  });
}

export async function clearKeys(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete('current');

    request.onerror = () =>
      reject(new Error(request.error?.message || 'Failed to clear keys'));
    request.onsuccess = () => resolve();
  });
}
