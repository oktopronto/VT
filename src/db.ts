// Mini-wrapper na IndexedDB — zapis rysunków (PNG warstw) na urządzeniu.
const DB_NAME = 'vt';
const STORE = 'drawings';

export interface SavedDrawing {
  l1: Blob;
  l2: Blob;
  lf: Blob;
  updated: number;
}

let dbp: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const drawings = {
  get: (key: string) => tx<SavedDrawing | undefined>('readonly', (s) => s.get(key)).catch(() => undefined),
  put: (key: string, v: SavedDrawing) => tx('readwrite', (s) => s.put(v, key)).catch(() => undefined),
  del: (key: string) => tx('readwrite', (s) => s.delete(key)).catch(() => undefined),
  keys: () => tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).catch(() => [] as IDBValidKey[]),
};
