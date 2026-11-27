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
  /** Saved ("starred") question ids for later study. */
  listBookmarks(): Promise<string[]>;
  setBookmark(questionId: string, on: boolean): Promise<void>;
  /** Everything stored, as one JSON-serialisable object (for export to a file). */
  exportBackup(now: number): Promise<Backup>;
  /** Replace all stored progress with a previously exported backup. Validates before writing. */
  importBackup(raw: unknown): Promise<{ attempts: number; marks: number; bookmarks: number }>;
}

export const BACKUP_FORMAT = "itil5-progress-backup";
export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: number;
  attempts: Attempt[];
  marks: MarkEvent[];
  bookmarks: string[];
  activeSession: ExamSession | null;
}

/** Simple key-value backend so both platforms can share one implementation. */
export interface KeyValueBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

const K = { attempts: "itil5.attempts.v1", session: "itil5.session.v1", marks: "itil5.marks.v1", bookmarks: "itil5.bookmarks.v1" };

function parseStrings(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

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
    async listBookmarks() {
      return parseStrings(await kv.get(K.bookmarks));
    },
    async setBookmark(questionId, on) {
      const set = new Set(parseStrings(await kv.get(K.bookmarks)));
      if (on) set.add(questionId);
      else set.delete(questionId);
      await kv.set(K.bookmarks, JSON.stringify([...set]));
    },
    async exportBackup(now) {
      const raw = await kv.get(K.session);
      let activeSession: ExamSession | null = null;
      try { activeSession = raw ? (JSON.parse(raw) as ExamSession) : null; } catch { activeSession = null; }
      return {
        format: BACKUP_FORMAT,
        version: 1,
        exportedAt: now,
        attempts: parseArray(await kv.get(K.attempts), Attempt),
        marks: parseArray(await kv.get(K.marks), MarkEvent),
        bookmarks: parseStrings(await kv.get(K.bookmarks)),
        activeSession,
      };
    },
    async importBackup(raw) {
      const b = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<Backup> | null;
      if (!b || b.format !== BACKUP_FORMAT || b.version !== 1 || !Array.isArray(b.attempts) || !Array.isArray(b.marks)) {
        throw new Error("This file is not an ITIL 5 progress backup.");
      }
      const attempts = b.attempts.map((x) => Attempt.parse(x));
      const marks = b.marks.map((x) => MarkEvent.parse(x));
      const bookmarks = Array.isArray(b.bookmarks) ? b.bookmarks.filter((x): x is string => typeof x === "string") : [];
      await kv.set(K.attempts, JSON.stringify(attempts));
      await kv.set(K.marks, JSON.stringify(marks));
      await kv.set(K.bookmarks, JSON.stringify(bookmarks));
      if (b.activeSession) await kv.set(K.session, JSON.stringify(b.activeSession));
      else await kv.remove(K.session);
      return { attempts: attempts.length, marks: marks.length, bookmarks: bookmarks.length };
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
