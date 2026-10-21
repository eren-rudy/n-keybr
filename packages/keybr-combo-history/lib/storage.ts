import {
  type DBDatabase,
  DBNamedFactory,
  type DBTransaction,
} from "@keybr/indexeddb";
import { type ComboSample } from "./sample.ts";
import { type ComboSummary, groupSamples, summarize } from "./summary.ts";

/**
 * Keeps the complete history of every combination: one summary record per
 * combination with its running totals, and every sample of it.
 */
export type ComboStorage = {
  /** Adds samples to the history and updates their summaries. */
  append(samples: readonly ComboSample[]): Promise<void>;
  /** Loads the summaries of all combinations on all layouts. */
  loadSummaries(): Promise<ComboSummary[]>;
  /** Loads all samples of one combination, oldest first. */
  loadSamples(layout: string, combo: string): Promise<ComboSample[]>;
  /** Deletes the whole history. */
  clear(): Promise<void>;
};

const samplesStore = "samples";
const summariesStore = "summaries";
const comboIndex = "combo";

/**
 * Keeps the history in the browser's IndexedDB. Samples are stored one record
 * each, indexed by layout, combination and completion time. Summaries are
 * keyed by layout and combination and are updated in the same transaction.
 */
export class PersistentComboStorage implements ComboStorage {
  readonly #factory = new DBNamedFactory(indexedDB, "combo-history", 1);

  async append(samples: readonly ComboSample[]): Promise<void> {
    if (samples.length === 0) {
      return;
    }
    const db = await this.#factory.openDatabase(migration);
    try {
      const tx = db.transaction([samplesStore, summariesStore], "readwrite");
      const sampleStore = tx.objectStore(samplesStore);
      const summaryStore = tx.objectStore(summariesStore);
      for (const sample of samples) {
        await sampleStore.add(sample);
      }
      for (const group of groupSamples(samples)) {
        const { layout, combo } = group[0];
        const summary = (await summaryStore.get([layout, combo])) ?? null;
        await summaryStore.put(summarize(summary, group));
      }
      await tx.completed;
    } finally {
      db.close();
    }
  }

  async loadSummaries(): Promise<ComboSummary[]> {
    const db = await this.#factory.openDatabase(migration);
    try {
      const tx = db.transaction(summariesStore, "readonly");
      const summaries = await tx.objectStore(summariesStore).getAll();
      await tx.completed;
      return summaries;
    } finally {
      db.close();
    }
  }

  async loadSamples(layout: string, combo: string): Promise<ComboSample[]> {
    const db = await this.#factory.openDatabase(migration);
    try {
      const tx = db.transaction(samplesStore, "readonly");
      const samples = await tx
        .objectStore(samplesStore)
        .index(comboIndex)
        .getAll(
          IDBKeyRange.bound(
            [layout, combo, -Infinity],
            [layout, combo, Infinity],
          ),
        );
      await tx.completed;
      return samples;
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
    db.createObjectStore(samplesStore, { autoIncrement: true }).createIndex(
      comboIndex,
      ["layout", "combo", "completedAt"],
    );
    db.createObjectStore(summariesStore, { keyPath: ["layout", "combo"] });
  }
}
