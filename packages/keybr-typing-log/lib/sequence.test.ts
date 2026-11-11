import { test } from "node:test";
import { deepEqual, throws } from "rich-assert";
import { type LessonSteps } from "./log.ts";
import {
  computeStats,
  findSamples,
  isTimed,
  listLayouts,
  sequenceSamples,
} from "./sequence.ts";

// Typed "abcab" with an error on the second "b".
const lesson1 = lesson("en-us", 1000, "abcab", [0, 100, 300, 400, 600], [4]);
// Typed "ab" again.
const lesson2 = lesson("en-us", 5000, "xab", [0, 50, 200], []);
// The same letters on another layout.
const lesson3 = lesson("en-dvorak", 9000, "ab", [0, 70], []);

test("single characters", () => {
  deepEqual(sequenceSamples(lesson1, 1), [
    sample("b", 1100, 100, 100),
    sample("c", 1300, 200, 200),
    sample("a", 1400, 100, 100),
    sample("b", 1600, 200, 200, true),
  ]);
});

test("pairs", () => {
  deepEqual(sequenceSamples(lesson1, 2), [
    sample("bc", 1300, 100, 300),
    sample("ca", 1400, 200, 300),
    sample("ab", 1600, 100, 300, true),
  ]);
});

test("longer sequences", () => {
  deepEqual(sequenceSamples(lesson1, 4), [
    sample("bcab", 1600, 100, 600, true),
  ]);
  // The first character only starts the clock.
  deepEqual(sequenceSamples(lesson1, 5), []);
  deepEqual(sequenceSamples(lesson1, 10), []);
});

test("invalid length", () => {
  throws(() => sequenceSamples(lesson1, 0));
  throws(() => sequenceSamples(lesson1, 1.5));
});

test("timed samples", () => {
  const [bc, ca, ab] = sequenceSamples(lesson1, 2);
  deepEqual([isTimed(bc), isTimed(ca), isTimed(ab)], [true, true, false]);
  deepEqual(isTimed(sample("x", 0, 0, 0)), false);
});

test("find the samples of a sequence", () => {
  deepEqual(findSamples([lesson2, lesson1, lesson3], "en-us", "ab"), [
    sample("ab", 1600, 100, 300, true),
    sample("ab", 5200, 50, 200),
  ]);
  deepEqual(findSamples([lesson1], "en-us", "zz"), []);
});

test("compute the stats of sequences", () => {
  const stats = computeStats([lesson1, lesson2, lesson3], "en-us", 2);
  deepEqual(
    stats.find(({ combo }) => combo === "ab"),
    {
      layout: "en-us",
      combo: "ab",
      length: 2,
      count: 2,
      correctCount: 1,
      missCount: 1,
      accuracy: 0.5,
      timeToInitiate: 50,
      timeToType: 200,
      speed: 600,
      firstCompletedAt: 1600,
      lastCompletedAt: 5200,
    },
  );
  deepEqual(stats.map(({ combo }) => combo).sort(), ["ab", "bc", "ca"]);
  deepEqual(computeStats([lesson1], "en-dvorak", 2), []);
});

test("sequences without timed samples have no times", () => {
  const [stats] = computeStats([lesson1], "en-us", 4);
  deepEqual(stats.timeToInitiate, null);
  deepEqual(stats.timeToType, null);
  deepEqual(stats.speed, null);
});

test("list layouts", () => {
  deepEqual(listLayouts([lesson1, lesson2, lesson3]), ["en-us", "en-dvorak"]);
});

function lesson(
  layout: string,
  startedAt: number,
  text: string,
  times: readonly number[],
  typos: readonly number[],
): LessonSteps {
  const codePoints = [...text].map((c) => c.codePointAt(0)!);
  return {
    layout,
    startedAt,
    codePoints,
    times,
    typos: codePoints.map((_, i) => typos.includes(i)),
  };
}

function sample(
  combo: string,
  completedAt: number,
  timeToInitiate: number,
  timeToType: number,
  miss = false,
) {
  return {
    layout: "en-us",
    combo,
    completedAt,
    timeToInitiate,
    timeToType,
    miss,
  };
}
