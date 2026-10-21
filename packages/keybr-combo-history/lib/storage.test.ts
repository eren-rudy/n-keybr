import { test } from "node:test";
import { deepEqual } from "rich-assert";
import { FakeComboStorage } from "./fake.ts";
import { type ComboSample } from "./sample.ts";
import { type ComboStorage, PersistentComboStorage } from "./storage.ts";
import { type ComboSummary, summarizeAll } from "./summary.ts";

for (const [name, storage] of [
  ["persistent", new PersistentComboStorage()],
  ["fake", new FakeComboStorage()],
] as [string, ComboStorage][]) {
  test(`append and load [${name}]`, async () => {
    const lesson1 = [
      sample("en-us", "b", 1100, 100, 100),
      sample("en-us", "c", 1300, 200, 200),
      sample("en-us", "bc", 1300, 100, 300),
    ];
    const lesson2 = [
      sample("en-us", "b", 2100, 120, 120, true),
      sample("en-us", "a", 2200, 100, 100),
      sample("en-us", "ba", 2200, 120, 220, true),
      sample("en-dvorak", "b", 2300, 90, 90),
    ];

    await storage.clear();

    // Read from the empty storage.
    deepEqual(await storage.loadSummaries(), []);
    deepEqual(await storage.loadSamples("en-us", "b"), []);

    // Add some samples.
    await storage.append(lesson1);
    await storage.append([]);

    deepEqual(
      sorted(await storage.loadSummaries()),
      sorted(summarizeAll(lesson1)),
    );

    // Add more samples, updating the existing summaries.
    await storage.append(lesson2);

    deepEqual(
      sorted(await storage.loadSummaries()),
      sorted(summarizeAll([...lesson1, ...lesson2])),
    );
    deepEqual(await storage.loadSamples("en-us", "b"), [
      lesson1[0],
      lesson2[0],
    ]);
    deepEqual(await storage.loadSamples("en-dvorak", "b"), [lesson2[3]]);
    deepEqual(await storage.loadSamples("en-us", "x"), []);

    // Clear the storage.
    await storage.clear();

    deepEqual(await storage.loadSummaries(), []);
    deepEqual(await storage.loadSamples("en-us", "b"), []);
  });

  test(`load samples oldest first [${name}]`, async () => {
    const s1 = sample("en-us", "a", 3000, 100, 100);
    const s2 = sample("en-us", "a", 1000, 100, 100);
    const s3 = sample("en-us", "a", 2000, 100, 100);

    await storage.clear();
    await storage.append([s1]);
    await storage.append([s2, s3]);

    deepEqual(await storage.loadSamples("en-us", "a"), [s2, s3, s1]);

    await storage.clear();
  });
}

function sample(
  layout: string,
  combo: string,
  completedAt: number,
  timeToInitiate: number,
  timeToType: number,
  miss = false,
): ComboSample {
  return { layout, combo, completedAt, timeToInitiate, timeToType, miss };
}

function sorted(summaries: readonly ComboSummary[]): ComboSummary[] {
  return [...summaries].sort(
    (a, b) =>
      a.layout.localeCompare(b.layout) || a.combo.localeCompare(b.combo),
  );
}
