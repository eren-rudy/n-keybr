import { type ComboSample } from "./sample.ts";
import { type ComboStorage } from "./storage.ts";
import { type ComboSummary, summarizeAll } from "./summary.ts";

export class FakeComboStorage implements ComboStorage {
  readonly #samples: ComboSample[];

  constructor(samples: readonly ComboSample[] = []) {
    this.#samples = [...samples];
  }

  async append(samples: readonly ComboSample[]): Promise<void> {
    this.#samples.push(...samples);
  }

  async loadSummaries(): Promise<ComboSummary[]> {
    return summarizeAll(this.#samples);
  }

  async loadSamples(layout: string, combo: string): Promise<ComboSample[]> {
    return this.#samples
      .filter((sample) => sample.layout === layout && sample.combo === combo)
      .sort((a, b) => a.completedAt - b.completedAt);
  }

  async clear(): Promise<void> {
    this.#samples.length = 0;
  }
}
