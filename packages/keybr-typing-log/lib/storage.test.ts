import { test } from "node:test";
import { deepEqual } from "rich-assert";
import { FakeTypingLogStorage } from "./fake.ts";
import { type LessonLog } from "./log.ts";
import {
  PersistentTypingLogStorage,
  type TypingLogStorage,
} from "./storage.ts";

for (const [name, storage] of [
  ["persistent", new PersistentTypingLogStorage()],
  ["fake", new FakeTypingLogStorage()],
] as [string, TypingLogStorage][]) {
  test(`append and load [${name}]`, async () => {
    const log1: LessonLog = {
      layout: "en-us",
      startedAt: 1000,
      codePoints: [0x61, 0x62],
      times: [5, 105.5],
      typos: [false, true],
      events: [
        {
          type: "keydown",
          time: 0,
          code: "KeyA",
          key: "a",
          modifiers: [],
        },
        { type: "input", time: 5, inputType: "appendChar", codePoint: 0x61 },
      ],
    };
    const log2: LessonLog = {
      layout: "en-dvorak",
      startedAt: 2000,
      codePoints: [0x63],
      times: [0],
      typos: [false],
      events: [],
    };

    await storage.clear();

    // Read from the empty storage.
    deepEqual(await storage.loadLessons(), []);
    deepEqual(await storage.loadLogs(), []);

    // Add some lessons.
    await storage.append(log1);
    await storage.append(log2);

    deepEqual(await storage.loadLessons(), [
      withoutEvents(log1),
      withoutEvents(log2),
    ]);
    deepEqual(await storage.loadLogs(), [log1, log2]);

    // Clear the storage.
    await storage.clear();

    deepEqual(await storage.loadLessons(), []);
    deepEqual(await storage.loadLogs(), []);
  });
}

function withoutEvents({ events, ...steps }: LessonLog) {
  return steps;
}
