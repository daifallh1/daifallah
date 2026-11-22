import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createKeyValueStorage, type Attempt, type ExamSession, type KeyValueBackend, type MarkEvent, type StorageAdapter } from "@itil5/core";

/** Persistent on-device storage (AsyncStorage → native storage on iOS). No account or network needed. */
const asyncStorageBackend: KeyValueBackend = {
  get: (k) => AsyncStorage.getItem(k),
  set: (k, v) => AsyncStorage.setItem(k, v),
  remove: (k) => AsyncStorage.removeItem(k),
};

interface Ctx {
  storage: StorageAdapter;
  attempts: Attempt[];
  marks: MarkEvent[];
  activeSession: ExamSession | null;
  ready: boolean;
  refresh: () => Promise<void>;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const storage = useMemo(() => createKeyValueStorage(asyncStorageBackend), []);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [marks, setMarks] = useState<MarkEvent[]>([]);
  const [activeSession, setActive] = useState<ExamSession | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    const [a, m, s] = await Promise.all([storage.listAttempts(), storage.listMarks(), storage.getActiveSession()]);
    setAttempts(a.sort((x, y) => y.submittedAt - x.submittedAt));
    setMarks(m);
    setActive(s);
    setReady(true);
  }, [storage]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <StoreCtx.Provider value={{ storage, attempts, marks, activeSession, ready, refresh }}>{children}</StoreCtx.Provider>;
}
export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}
