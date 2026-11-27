import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert } from "react-native";
import {
  buildMistakesExam, createFixedExamSession, createKeyValueStorage, createSession, generateExam, randomSeed,
  type Attempt, type ExamSession, type KeyValueBackend, type MarkEvent, type StorageAdapter,
} from "@itil5/core";
import { lb } from "./data";

/** Persistent on-device storage (AsyncStorage → native storage on iOS). No account or network needed. */
const asyncStorageBackend: KeyValueBackend = {
  get: (k) => AsyncStorage.getItem(k),
  set: (k, v) => AsyncStorage.setItem(k, v),
  remove: (k) => AsyncStorage.removeItem(k),
};
const SETTINGS_KEY = "itil5.settings.v1";
export interface Settings { timerWarnings: boolean }
const DEFAULT_SETTINGS: Settings = { timerWarnings: true };

export type StartKind = { kind: "random" } | { kind: "fixed"; examId: string } | { kind: "mistakes" };

interface Ctx {
  storage: StorageAdapter;
  attempts: Attempt[];
  marks: MarkEvent[];
  bookmarks: Set<string>;
  settings: Settings;
  activeSession: ExamSession | null;
  ready: boolean;
  refresh: () => Promise<void>;
  toggleBookmark: (questionId: string) => Promise<void>;
  setSettings: (s: Settings) => Promise<void>;
  /** Creates the exam session (asking first if another exam is in progress). Resolves true when one is active. */
  startExam: (k: StartKind) => Promise<boolean>;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const storage = useMemo(() => createKeyValueStorage(asyncStorageBackend), []);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [marks, setMarks] = useState<MarkEvent[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeSession, setActive] = useState<ExamSession | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    const [a, m, s, b, raw] = await Promise.all([storage.listAttempts(), storage.listMarks(), storage.getActiveSession(), storage.listBookmarks(), AsyncStorage.getItem(SETTINGS_KEY)]);
    setAttempts(a.sort((x, y) => y.submittedAt - x.submittedAt));
    setMarks(m);
    setActive(s && s.bankVersion === lb.bank.bankVersion ? s : s && s.questionIds.every((id) => lb.byId.get(id)?.audit.contentStatus === "approved") ? s : null);
    setBookmarks(new Set(b));
    try { setSettingsState({ ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) }); } catch { setSettingsState(DEFAULT_SETTINGS); }
    setReady(true);
  }, [storage]);
  useEffect(() => { void refresh(); }, [refresh]);

  const toggleBookmark = useCallback(async (id: string) => {
    await storage.setBookmark(id, !bookmarks.has(id));
    setBookmarks(new Set(await storage.listBookmarks()));
  }, [storage, bookmarks]);

  const setSettings = useCallback(async (s: Settings) => {
    setSettingsState(s);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }, []);

  const create = useCallback(async (k: StartKind): Promise<boolean> => {
    const now = Date.now();
    const seed = randomSeed();
    let s: ExamSession;
    if (k.kind === "fixed") s = createFixedExamSession(lb, k.examId, now, seed);
    else if (k.kind === "mistakes") {
      const plan = buildMistakesExam(lb, attempts, marks, seed);
      if (!plan.questionIds.length) return false;
      s = createSession({ lb, questionIds: plan.questionIds, mode: "mistakes", now, seed, blueprintCompliant: false, durationMs: plan.durationMs, passMark: plan.passMark });
    } else {
      const e = generateExam(lb, { seed });
      s = createSession({ lb, questionIds: e.questionIds, mode: "exam", now, seed, blueprintCompliant: e.blueprint.fullyCompliant });
    }
    await storage.setActiveSession(s);
    await refresh();
    return true;
  }, [attempts, marks, storage, refresh]);

  const startExam = useCallback((k: StartKind) => new Promise<boolean>((resolve) => {
    if (!activeSession) { void create(k).then(resolve); return; }
    const same = (k.kind === "fixed" && activeSession.mode === "fixed" && activeSession.examId === k.examId)
      || (k.kind === "random" && activeSession.mode === "exam") || (k.kind === "mistakes" && activeSession.mode === "mistakes");
    if (same) { resolve(true); return; }
    Alert.alert("An exam is in progress", "Resume it, or discard it and start the new exam?", [
      { text: "Resume", style: "cancel", onPress: () => resolve(true) },
      { text: "Discard and start", style: "destructive", onPress: () => { void create(k).then(resolve); } },
    ]);
  }), [activeSession, create]);

  return (
    <StoreCtx.Provider value={{ storage, attempts, marks, bookmarks, settings, activeSession, ready, refresh, toggleBookmark, setSettings, startExam }}>
      {children}
    </StoreCtx.Provider>
  );
}
export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}
