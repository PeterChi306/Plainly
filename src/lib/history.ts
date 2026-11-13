import type { Session } from "@/components/Workspace";

// Readings are kept in this browser's own database (IndexedDB), never on the
// server, so you can come back to them. Remove one, or clear them all, and
// they're gone for good. IndexedDB holds whole PDFs where localStorage can't.

const NAME = "plainly";
const STORE = "sessions";

let opening: Promise<IDBDatabase> | null = null;

function open() {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opening;
}

async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = act(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Everything read before in this browser, newest first. Empty if storage is blocked. */
export async function loadHistory(): Promise<Session[]> {
  try {
    const all = await run<Session[]>("readonly", (s) => s.getAll());
    return all.map((s) => ({ ...s, answering: false })).sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

// A full disk or a private window only means it isn't kept; the tab still works.
export async function keep(session: Session) {
  try {
    await run("readwrite", (s) => s.put({ ...session, answering: false }));
  } catch {}
}

export async function forget(id: string) {
  try {
    await run("readwrite", (s) => s.delete(id));
  } catch {}
}

export async function forgetAll() {
  try {
    await run("readwrite", (s) => s.clear());
  } catch {}
}
