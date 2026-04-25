import type { WorkOrder } from './types';

const DB_NAME = 'maximo-dashboard';
const DB_VERSION = 1;
const STORE_WEEKS = 'weeks';
const STORE_ORDERS = 'orders';

export interface WeekMeta {
  weekId: string;
  createdAt: number;
  baseFileName: string;
  baseRowCount: number;
  lastUpdateAt: number | null;
  lastUpdateFileName: string | null;
  updatedDays: string[];
}

export interface StoredOrder extends WorkOrder {
  weekId: string;
  estadoBase: string;
  estadoUpdates: { ts: number; estado: string }[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_WEEKS)) {
        db.createObjectStore(STORE_WEEKS, { keyPath: 'weekId' });
      }
      if (!db.objectStoreNames.contains(STORE_ORDERS)) {
        const store = db.createObjectStore(STORE_ORDERS, { keyPath: ['weekId', 'orden'] });
        store.createIndex('byWeek', 'weekId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, stores: string[], mode: IDBTransactionMode): IDBTransaction {
  return db.transaction(stores, mode);
}

function awaitTx(t: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onabort = () => reject(t.error ?? new Error('aborted'));
    t.onerror = () => reject(t.error);
  });
}

function reqAsync<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function inferWeekId(rows: WorkOrder[]): string | null {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.semana) continue;
    counts.set(r.semana, (counts.get(r.semana) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

export async function listWeeks(): Promise<WeekMeta[]> {
  const db = await openDB();
  const t = tx(db, [STORE_WEEKS], 'readonly');
  const all = await reqAsync(t.objectStore(STORE_WEEKS).getAll());
  return (all as WeekMeta[]).sort((a, b) => a.weekId.localeCompare(b.weekId));
}

export async function getWeek(weekId: string): Promise<WeekMeta | null> {
  const db = await openDB();
  const t = tx(db, [STORE_WEEKS], 'readonly');
  const r = await reqAsync(t.objectStore(STORE_WEEKS).get(weekId));
  return (r as WeekMeta | undefined) ?? null;
}

export async function getWeekOrders(weekId: string): Promise<WorkOrder[]> {
  const db = await openDB();
  const t = tx(db, [STORE_ORDERS], 'readonly');
  const idx = t.objectStore(STORE_ORDERS).index('byWeek');
  const all = await reqAsync(idx.getAll(weekId));
  return (all as StoredOrder[]).map(stripStoredFields);
}

function stripStoredFields(s: StoredOrder): WorkOrder {
  const { weekId: _w, estadoBase: _b, estadoUpdates: _u, ...rest } = s;
  void _w;
  void _b;
  void _u;
  return rest;
}

export interface SaveBaseResult {
  weekId: string;
  inserted: number;
}

export async function saveBase(
  fileName: string,
  rows: WorkOrder[],
  weekIdOverride?: string,
): Promise<SaveBaseResult> {
  const weekId = weekIdOverride ?? inferWeekId(rows);
  if (!weekId) {
    throw new Error('No se pudo inferir la semana del archivo (sin S{NN} en descripción ni en fechas).');
  }
  const filtered = rows.filter((r) => (r.semana ?? weekId) === weekId);
  const db = await openDB();
  const t = tx(db, [STORE_WEEKS, STORE_ORDERS], 'readwrite');

  const ordersStore = t.objectStore(STORE_ORDERS);
  const idx = ordersStore.index('byWeek');
  const existingKeys: IDBValidKey[] = await reqAsync(idx.getAllKeys(weekId));
  for (const k of existingKeys) ordersStore.delete(k);

  const ts = Date.now();
  for (const r of filtered) {
    const stored: StoredOrder = {
      ...r,
      weekId,
      estadoBase: r.estado,
      estadoUpdates: [{ ts, estado: r.estado }],
    };
    ordersStore.put(stored);
  }

  const meta: WeekMeta = {
    weekId,
    createdAt: ts,
    baseFileName: fileName,
    baseRowCount: filtered.length,
    lastUpdateAt: null,
    lastUpdateFileName: null,
    updatedDays: [],
  };
  t.objectStore(STORE_WEEKS).put(meta);

  await awaitTx(t);
  return { weekId, inserted: filtered.length };
}

export interface ApplyDailyResult {
  weekId: string;
  updated: number;
  added: number;
  ignored: number;
}

export async function applyDaily(
  weekId: string,
  fileName: string,
  rows: WorkOrder[],
  snapshotDay: string,
): Promise<ApplyDailyResult> {
  const db = await openDB();
  const t = tx(db, [STORE_WEEKS, STORE_ORDERS], 'readwrite');
  const ordersStore = t.objectStore(STORE_ORDERS);
  const weeksStore = t.objectStore(STORE_WEEKS);

  const meta = (await reqAsync(weeksStore.get(weekId))) as WeekMeta | undefined;
  if (!meta) {
    throw new Error(`No existe la semana ${weekId}. Carga primero la base.`);
  }

  let updated = 0;
  let added = 0;
  let ignored = 0;
  const ts = Date.now();

  for (const r of rows) {
    if (r.semana && r.semana !== weekId) {
      ignored++;
      continue;
    }
    const existing = (await reqAsync(ordersStore.get([weekId, r.orden]))) as StoredOrder | undefined;
    if (existing) {
      const changed = existing.estado !== r.estado;
      const next: StoredOrder = {
        ...existing,
        estado: r.estado,
        completada: r.completada,
        inicioPrevisto: r.inicioPrevisto,
        inicioProgramado: r.inicioProgramado,
        finalizacionPrevista: r.finalizacionPrevista,
        descripcion: r.descripcion || existing.descripcion,
        ubicacion: r.ubicacion || existing.ubicacion,
        grupoDueno: r.grupoDueno || existing.grupoDueno,
        disciplina: r.disciplina || existing.disciplina,
        area: r.area || existing.area,
        estadoUpdates: changed
          ? [...existing.estadoUpdates, { ts, estado: r.estado }]
          : existing.estadoUpdates,
      };
      ordersStore.put(next);
      if (changed) updated++;
    } else {
      const stored: StoredOrder = {
        ...r,
        weekId,
        estadoBase: r.estado,
        estadoUpdates: [{ ts, estado: r.estado }],
      };
      ordersStore.put(stored);
      added++;
    }
  }

  const days = new Set(meta.updatedDays);
  days.add(snapshotDay);
  const nextMeta: WeekMeta = {
    ...meta,
    lastUpdateAt: ts,
    lastUpdateFileName: fileName,
    updatedDays: Array.from(days).sort(),
  };
  weeksStore.put(nextMeta);

  await awaitTx(t);
  return { weekId, updated, added, ignored };
}

export async function deleteWeek(weekId: string): Promise<void> {
  const db = await openDB();
  const t = tx(db, [STORE_WEEKS, STORE_ORDERS], 'readwrite');
  const ordersStore = t.objectStore(STORE_ORDERS);
  const idx = ordersStore.index('byWeek');
  const keys: IDBValidKey[] = await reqAsync(idx.getAllKeys(weekId));
  for (const k of keys) ordersStore.delete(k);
  t.objectStore(STORE_WEEKS).delete(weekId);
  await awaitTx(t);
}
