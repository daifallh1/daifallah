import { Attempt, MarkEvent } from "./schema";
import type { ExamSession } from "./session";

/**
 * Local-first persistence contract. The web app implements it with IndexedDB, the iOS app with
 * AsyncStorage. No account or network is required. Cross-device sync is NOT implemented.
 */
export interface StorageAdapter {
  listAttempts(): Promise<Attempt[]>;
  saveAttempt(a: Attempt): Promise<void>;
  getActiveSession(): Promise<ExamSession | null>;
  setActiveSession(s: ExamSession | null): Promise<void>;
  listMarks(): Promise<MarkEvent[]>;
  addMark(m: MarkEvent): Promise<void>;
}

/** Simple key-value backend so both platforms can share one implementation. */
export interface KeyValueBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const K = { attempts: "itil5.attempts.v1", session: "itil5.session.v1", marks: "itil5.marks.v1" };

function parseArray<T>(raw: string | null, item: { safeParse(x: unknown): { success: boolean; data?: T } }): T[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => item.safeParse(x)).filter((r) => r.success).map((r) => r.data as T);
  } catch {
    return [];
  }
}

export function createKeyValueStorage(kv: KeyValueBackend): StorageAdapter {
  return {
    async listAttempts() {
      return parseArray(await kv.get(K.attempts), Attempt);
    },
    async saveAttempt(a) {
      const all = parseArray(await kv.get(K.attempts), Attempt).filter((x) => x.attemptId !== a.attemptId);
      all.push(Attempt.parse(a));
      await kv.set(K.attempts, JSON.stringify(all));
    },
    async getActiveSession() {
      const raw = await kv.get(K.session);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as ExamSession;
      } catch {
        return null;
      }
    },
    async setActiveSession(s) {
      if (s) await kv.set(K.session, JSON.stringify(s));
      else await kv.remove(K.session);
    },
    async listMarks() {
      return parseArray(await kv.get(K.marks), MarkEvent);
    },
    async addMark(m) {
      const all = parseArray(await kv.get(K.marks), MarkEvent);
      all.push(MarkEvent.parse(m)); // append-only: full history is preserved
      await kv.set(K.marks, JSON.stringify(all));
    },
  };
}

export function createMemoryBackend(): KeyValueBackend & { dump(): Record<string, string> } {
  const m = new Map<string, string>();
  return {
    async get(k) {
      return m.get(k) ?? null;
    },
    async set(k, v) {
      m.set(k, v);
    },
    async remove(k) {
      m.delete(k);
    },
    dump: () => Object.fromEntries(m),
  };
}
