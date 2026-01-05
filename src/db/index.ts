const DB_NAME = 'vocabloop';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Cards store
      if (!db.objectStoreNames.contains('cards')) {
        const cardsStore = db.createObjectStore('cards', { keyPath: 'id' });
        cardsStore.createIndex('dueAt', 'dueAt', { unique: false });
        cardsStore.createIndex('type', 'type', { unique: false });
        cardsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Review logs store
      if (!db.objectStoreNames.contains('reviews')) {
        const reviewsStore = db.createObjectStore('reviews', { keyPath: 'id' });
        reviewsStore.createIndex('cardId', 'cardId', { unique: false });
        reviewsStore.createIndex('reviewedAt', 'reviewedAt', { unique: false });
      }

      // Settings store (for streak, last backup, etc.)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

// Generic get by ID
export async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(new Error(`Failed to get ${storeName} by id`));
    request.onsuccess = () => resolve(request.result);
  });
}

// Generic get all
export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(new Error(`Failed to get all ${storeName}`));
    request.onsuccess = () => resolve(request.result);
  });
}

// Generic put (insert or update)
export async function put<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onerror = () => reject(new Error(`Failed to put ${storeName}`));
    request.onsuccess = () => resolve();
  });
}

// Generic delete
export async function remove(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(new Error(`Failed to delete from ${storeName}`));
    request.onsuccess = () => resolve();
  });
}

// Query by index with range
export async function queryByIndex<T>(
  storeName: string,
  indexName: string,
  range: IDBKeyRange | IDBValidKey
): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(range);

    request.onerror = () => reject(new Error(`Failed to query ${storeName} by ${indexName}`));
    request.onsuccess = () => resolve(request.result);
  });
}

// Count items in a store
export async function count(storeName: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onerror = () => reject(new Error(`Failed to count ${storeName}`));
    request.onsuccess = () => resolve(request.result);
  });
}

// Bulk put
export async function bulkPut<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    transaction.onerror = () => reject(new Error(`Failed to bulk put ${storeName}`));
    transaction.oncomplete = () => resolve();

    for (const item of items) {
      store.put(item);
    }
  });
}

// Clear all items from a store
export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
    request.onsuccess = () => resolve();
  });
}
