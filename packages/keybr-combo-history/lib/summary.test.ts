import { test } from "node:test";
import { deepEqual, equal, isNull, throws } from "rich-assert";
import { type ComboSample } from "./sample.ts";
import {
  groupSamples,
  makeComboStats,
  summarize,
  summarizeAll,
} from "./summary.ts";

test("summarize samples", () => {
  const summary = summarize(null, [
    sample("en-us", "th", 3000, 100, 250),
    sample("en-us", "th", 1000, 120, 300, true),
    sample("en-us", "th", 2000, 80, 200),
  ]);

  deepEqual(summary, {
    layout: "en-us",
    combo: "th",
    count: 3,
    missCount: 1,
    timedCount: 2,
    timeToInitiateSum: 180,
    timeToTypeSum: 450,
    firstCompletedAt: 1000,
    lastCompletedAt: 3000,
  });

  deepEqual(summarize(summary, [sample("en-us", "th", 4000, 0, 0)]), {
    ...summary,
    count: 4,
    lastCompletedAt: 4000,
  });
});

test("summarize only samples of one combination", () => {
  throws(() => {
    summarize(null, []);
  });
  throws(() => {
    summarize(null, [
      sample("en-us", "th", 1000, 100, 200),
      sample("en-us", "he", 1000, 100, 200),
    ]);
  });
  throws(() => {
    summarize(null, [
      sample("en-us", "th", 1000, 100, 200),
      sample("en-dvorak", "th", 1000, 100, 200),
    ]);
  });
});

test("group samples by layout and combination", () => {
  const a = sample("en-us", "a", 1000, 100, 100);
  const b = sample("en-us", "b", 2000, 100, 100);
  const ab = sample("en-us", "ab", 2000, 100, 200);
  const a2 = sample("en-us", "a", 3000, 100, 100);
  const a3 = sample("en-dvorak", "a", 4000, 100, 100);

  deepEqual(groupSamples([a, b, ab, a2, a3]), [[a, a2], [b], [ab], [a3]]);
  deepEqual(
    summarizeAll([a, b, ab, a2, a3]).map(
      ({ layout, combo, count }) => `${layout}:${combo}:${count}`,
    ),
    ["en-us:a:2", "en-us:b:1", "en-us:ab:1", "en-dvorak:a:1"],
  );
});

test("calculate stats of a single key", () => {
  const stats = makeComboStats(
    summarize(null, [
      sample("en-us", "a", 1000, 150, 150),
      sample("en-us", "a", 2000, 250, 250),
      sample("en-us", "a", 3000, 900, 900, true),
      sample("en-us", "a", 4000, 0, 0),
    ]),
  );

  equal(stats.length, 1);
  equal(stats.count, 4);
  equal(stats.correctCount, 3);
  equal(stats.missCount, 1);
  equal(stats.accuracy, 0.75);
  equal(stats.timeToInitiate, 200);
  equal(stats.timeToType, 200);
  equal(stats.speed, 300); // 60 WPM.
  equal(stats.firstCompletedAt, 1000);
  equal(stats.lastCompletedAt, 4000);
});

test("calculate stats of a key pair", () => {
  const stats = makeComboStats(
    summarize(null, [
      sample("en-us", "th", 1000, 150, 350),
      sample("en-us", "th", 2000, 250, 450),
    ]),
  );

  equal(stats.length, 2);
  equal(stats.timeToInitiate, 200);
  equal(stats.timeToType, 400);
  equal(stats.speed, 300); // Two characters in 400ms.
});

test("calculate stats without timed samples", () => {
  const stats = makeComboStats(
    summarize(null, [sample("en-us", "a", 1000, 100, 100, true)]),
  );

  equal(stats.correctCount, 0);
  equal(stats.accuracy, 0);
  isNull(stats.timeToInitiate);
  isNull(stats.timeToType);
  isNull(stats.speed);
});

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
