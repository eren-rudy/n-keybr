import { type LessonLog, type LessonSteps } from "./log.ts";
import { type TypingLogStorage } from "./storage.ts";

/** Keeps the log in memory, for tests. */
export class FakeTypingLogStorage implements TypingLogStorage {
  readonly #logs: LessonLog[];

  constructor(logs: readonly LessonLog[] = []) {
    this.#logs = [...logs];
  }

  async append(log: LessonLog): Promise<void> {
    this.#logs.push(log);
  }

  async loadLessons(): Promise<LessonSteps[]> {
    return this.#logs.map(({ events, ...steps }) => steps);
  }

  async loadLogs(): Promise<LessonLog[]> {
    return [...this.#logs];
  }

  async clear(): Promise<void> {
    this.#logs.length = 0;
  }
}
