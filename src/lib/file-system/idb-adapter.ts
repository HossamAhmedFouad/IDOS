/**
 * IndexedDB adapter for the IDOS file system.
 * Uses a single object store keyed by file path.
 */

const DB_NAME = "idos-file-system";
const DB_VERSION = 1;
const STORE_NAME = "files";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in the browser"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "path" });
      }
    };
  });
  return dbPromise;
}

interface FileRecord {
  path: string;
  content: string;
  modified: number;
  size: number;
}

export async function get(path: string): Promise<FileRecord | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(path);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function set(path: string, content: string): Promise<void> {
  const db = await openDb();
  const record: FileRecord = {
    path,
    content,
    modified: Date.now(),
    size: new Blob([content]).size,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function remove(path: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(path);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function keys(prefix?: string): Promise<string[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      let paths = request.result as string[];
      if (prefix) {
        const dirPrefix = prefix.endsWith("/") ? prefix : prefix + "/";
        paths = paths.filter((p) => p === prefix || p.startsWith(dirPrefix));
      }
      resolve(paths);
    };
  });
}
