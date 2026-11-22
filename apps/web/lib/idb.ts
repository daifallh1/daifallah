import type { KeyValueBackend } from "@itil5/core";

/** Minimal IndexedDB key-value store (one object store). Falls back to localStorage if IDB is unavailable. */
const DB = "itil5-simulator";
const STORE = "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function createIdbBackend(): KeyValueBackend {
  const hasIdb = typeof indexedDB !== "undefined";
  if (!hasIdb) {
    return {
      async get(k) { try { return localStorage.getItem(k); } catch { return null; } },
      async set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
      async remove(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
    };
  }
  return {
    async get(k) { return ((await tx("readonly", (s) => s.get(k))) as string | undefined) ?? null; },
    async set(k, v) { await tx("readwrite", (s) => s.put(v, k)); },
    async remove(k) { await tx("readwrite", (s) => s.delete(k)); },
  };
}
