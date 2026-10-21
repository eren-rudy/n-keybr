import { test } from "node:test";
import {
  type ComboSample,
  type ComboStats,
  makeComboStats,
  summarizeAll,
} from "@keybr/combo-history";
import { deepEqual } from "rich-assert";
import { defaultSort, filterStats, nextSort, sortStats } from "./sort.ts";

const stats = makeStats([
  // Typed twice, 200ms on average.
  sample("a", 100, 100),
  sample("a", 300, 300),
  // Typed three times with an error, 400ms on average.
  sample("ab", 200, 400),
  sample("ab", 200, 400),
  sample("ab", 200, 400, true),
  // Typed once with an error, so has no times.
  sample("b", 500, 500, true),
  // Typed once, 100ms.
  sample("c", 100, 100),
]);

const compare = (a: string, b: string) => a.localeCompare(b);

test("sort by the number of samples", () => {
  deepEqual(combos(sortStats(stats, defaultSort, compare)), [
    "ab",
    "a",
    "b",
    "c",
  ]);
  deepEqual(
    combos(sortStats(stats, { key: "count", descending: false }, compare)),
    ["b", "c", "a", "ab"],
  );
});

test("sort by combination", () => {
  deepEqual(
    combos(sortStats(stats, { key: "combo", descending: false }, compare)),
    ["a", "ab", "b", "c"],
  );
  deepEqual(
    combos(sortStats(stats, { key: "combo", descending: true }, compare)),
    ["c", "b", "ab", "a"],
  );
});

test("missing values go last in either order", () => {
  deepEqual(
    combos(sortStats(stats, { key: "speed", descending: true }, compare)),
    ["c", "a", "ab", "b"],
  );
  deepEqual(
    combos(sortStats(stats, { key: "speed", descending: false }, compare)),
    ["a", "ab", "c", "b"],
  );
  deepEqual(
    combos(sortStats(stats, { key: "timeToType", descending: false }, compare)),
    ["c", "a", "ab", "b"],
  );
});

test("next sort", () => {
  deepEqual(nextSort(defaultSort, "count"), {
    key: "count",
    descending: false,
  });
  deepEqual(nextSort(defaultSort, "speed"), { key: "speed", descending: true });
  deepEqual(nextSort(defaultSort, "combo"), {
    key: "combo",
    descending: false,
  });
});

test("filter combinations", () => {
  deepEqual(
    combos(filterStats(stats, { length: null, minCount: 1, query: "" })),
    ["a", "ab", "b", "c"],
  );
  deepEqual(combos(filterStats(stats, { length: 1, minCount: 1, query: "" })), [
    "a",
    "b",
    "c",
  ]);
  deepEqual(combos(filterStats(stats, { length: 2, minCount: 1, query: "" })), [
    "ab",
  ]);
  deepEqual(
    combos(filterStats(stats, { length: null, minCount: 2, query: "" })),
    ["a", "ab"],
  );
  deepEqual(
    combos(filterStats(stats, { length: null, minCount: 1, query: "b" })),
    ["ab", "b"],
  );
});

function makeStats(samples: readonly ComboSample[]): ComboStats[] {
  return summarizeAll(samples).map(makeComboStats);
}

function sample(
  combo: string,
  timeToInitiate: number,
  timeToType: number,
  miss = false,
): ComboSample {
  return {
    layout: "en-us",
    combo,
    completedAt: 1000,
    timeToInitiate,
    timeToType,
    miss,
  };
}

function combos(list: readonly ComboStats[]): string[] {
  return list.map(({ combo }) => combo);
}
