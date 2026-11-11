import { test } from "node:test";
import { type ComboStats } from "@keybr/typing-log";
import { deepEqual } from "rich-assert";
import { defaultSort, filterStats, nextSort, sortStats } from "./sort.ts";

const stats = [
  // Typed twice, 200ms on average.
  stats1("a", 2, 0, 200),
  // Typed three times with an error, 400ms on average.
  stats1("ab", 3, 1, 400),
  // Typed once with an error, so has no times.
  stats1("b", 1, 1, null),
  // Typed once, 100ms.
  stats1("c", 1, 0, 100),
];

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
  deepEqual(combos(filterStats(stats, { minCount: 1, query: "" })), [
    "a",
    "ab",
    "b",
    "c",
  ]);
  deepEqual(combos(filterStats(stats, { minCount: 2, query: "" })), [
    "a",
    "ab",
  ]);
  deepEqual(combos(filterStats(stats, { minCount: 1, query: "b" })), [
    "ab",
    "b",
  ]);
});

function stats1(
  combo: string,
  count: number,
  missCount: number,
  timeToType: number | null,
): ComboStats {
  const length = [...combo].length;
  return {
    layout: "en-us",
    combo,
    length,
    count,
    correctCount: count - missCount,
    missCount,
    accuracy: (count - missCount) / count,
    timeToInitiate: timeToType != null ? timeToType / 2 : null,
    timeToType,
    speed: timeToType != null ? (length * 60000) / timeToType : null,
    firstCompletedAt: 1000,
    lastCompletedAt: 1000,
  };
}

function combos(list: readonly ComboStats[]): string[] {
  return list.map(({ combo }) => combo);
}
