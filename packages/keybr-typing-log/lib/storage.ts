import {
  type DBDatabase,
  DBNamedFactory,
  type DBTransaction,
} from "@keybr/indexeddb";
import {
  type KeyEventRecord,
  type LessonLog,
  type LessonSteps,
} from "./log.ts";

/**
 * Keeps the log of every completed lesson.
 */
export type TypingLogStorage = {
  /** Adds the log of a lesson. */
  append(log: LessonLog): Promise<void>;
  /** Loads the characters of all lessons on all layouts, the oldest first. */
  loadLessons(): Promise<LessonSteps[]>;
  /** Loads the complete logs of all lessons, the oldest first. */
  loadLogs(): Promise<LessonLog[]>;
  /** Deletes the whole log. */
  clear(): Promise<void>;
};

const lessonsStore = "lessons";
const eventsStore = "events";

/**
 * Keeps the log in the browser's IndexedDB. The characters of a lesson and
 * its key events are kept in separate stores under the same key, so that
 * the characters can be loaded without the larger list of events.
 */
export class PersistentTypingLogStorage implements TypingLogStorage {
  readonly #factory = new DBNamedFactory(indexedDB, "typing-log", 1);

  async append({ events, ...steps }: LessonLog): Promise<void> {
    const db = await this.#factory.openDatabase(migration);
    try {
      const tx = db.transaction([lessonsStore, eventsStore], "readwrite");
      const key = await tx.objectStore(lessonsStore).add(steps);
      await tx.objectStore(eventsStore).add(events, key);
      await tx.completed;
    } finally {
      db.close();
    }
  }

  async loadLessons(): Promise<LessonSteps[]> {
    const db = await this.#factory.openDatabase(migration);
    try {
      const tx = db.transaction(lessonsStore, "readonly");
      const lessons = await tx.objectStore(lessonsStore).getAll();
      await tx.completed;
      return lessons;
    } finally {
      db.close();
    }
  }

  async loadLogs(): Promise<LessonLog[]> {
    const db = await this.#factory.openDatabase(migration);
    try {
      const tx = db.transaction([lessonsStore, eventsStore], "readonly");
      const lessons = await tx
        .objectStore(lessonsStore)
        .readAll((key, value: LessonSteps) => ({ key, value }));
      const events = new Map(
        await tx
          .objectStore(eventsStore)
          .readAll((key, value: KeyEventRecord[]) => [key, value] as const),
      );
      await tx.completed;
      return lessons.map(({ key, value }) => ({
        ...value,
        events: events.get(key) ?? [],
      }));
    } finally {
      db.close();
    }
  }

  async clear(): Promise<void> {
    await this.#factory.deleteDatabase();
  }
}

async function migration(
  db: DBDatabase,
  tx: DBTransaction,
  oldVersion: number,
  newVersion: number | null,
): Promise<void> {
  if (oldVersion < 1) {
    db.createObjectStore(lessonsStore, { autoIncrement: true });
    db.createObjectStore(eventsStore);
  }
}
