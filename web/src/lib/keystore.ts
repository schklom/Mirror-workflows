const DB_NAME = 'fmd-keystore';
const STORE_NAME = 'keys';
const DB_VERSION = 1;

interface KeyStoreRecord {
  v1?: CryptoKeysV1;
  v2?: CryptoKeysV2;
}

export interface CryptoKeysV1 {
  rsaEncKey: CryptoKey;
  rsaSigKey: CryptoKey;
}

export interface CryptoKeysV2 {
  // Don't store the masterKey, only the derived child keys
  cmdKek: CryptoKey;
  locationKek: CryptoKey;
  pictureKek: CryptoKey;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error(request.error?.message || 'Failed to open database'));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function putRecord(record: KeyStoreRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record, 'current');

    request.onerror = () => reject(new Error(request.error?.message || 'Failed to store keys'));
    request.onsuccess = () => resolve();
  });
}

async function getRecord(): Promise<KeyStoreRecord> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('current');

    request.onerror = () => reject(new Error(request.error?.message || 'Failed to get keys'));
    request.onsuccess = () => resolve((request.result as KeyStoreRecord | undefined) || {});
  });
}

// Separate getters/setters for v1/v2 for easier type conversion from undefined to null

export async function storeKeysV1(keys: CryptoKeysV1): Promise<void> {
  await putRecord({ v1: keys });
}

export async function storeKeysV2(keys: CryptoKeysV2): Promise<void> {
  await putRecord({ v2: keys });
}

export async function getKeysV1(): Promise<CryptoKeysV1 | null> {
  const record = await getRecord();
  return record.v1 ?? null;
}

export async function getKeysV2(): Promise<CryptoKeysV2 | null> {
  const record = await getRecord();
  return record.v2 ?? null;
}

export async function clearKeys(): Promise<void> {
  await putRecord({});
}
