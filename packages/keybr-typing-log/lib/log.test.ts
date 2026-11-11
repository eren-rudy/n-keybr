import { test } from "node:test";
import { type Step } from "@keybr/textinput";
import { type AnyEvent } from "@keybr/textinput-events";
import { deepEqual } from "rich-assert";
import { makeLessonLog } from "./log.ts";

test("make a lesson log", () => {
  const events: AnyEvent[] = [
    {
      type: "keydown",
      timeStamp: 100,
      code: "KeyA",
      key: "a",
      modifiers: [],
    },
    {
      type: "input",
      timeStamp: 101.25,
      inputType: "appendChar",
      codePoint: 0x61,
      timeToType: 0,
    },
    {
      type: "keyup",
      timeStamp: 150,
      code: "KeyA",
      key: "a",
      modifiers: ["Shift"],
    },
    {
      type: "input",
      timeStamp: 300.123456,
      inputType: "appendChar",
      codePoint: 0x62,
      timeToType: 199,
    },
  ];
  const steps: Step[] = [
    { timeStamp: 101.25, codePoint: 0x61, timeToType: 0, typo: false },
    { timeStamp: 300.123456, codePoint: 0x62, timeToType: 199, typo: true },
  ];

  deepEqual(
    makeLessonLog({ steps, events, layout: "en-us", timeOrigin: 1_000_000 }),
    {
      layout: "en-us",
      startedAt: 1_000_100,
      codePoints: [0x61, 0x62],
      times: [1.25, 200.123],
      typos: [false, true],
      events: [
        { type: "keydown", time: 0, code: "KeyA", key: "a", modifiers: [] },
        { type: "input", time: 1.25, inputType: "appendChar", codePoint: 0x61 },
        {
          type: "keyup",
          time: 50,
          code: "KeyA",
          key: "a",
          modifiers: ["Shift"],
        },
        {
          type: "input",
          time: 200.123,
          inputType: "appendChar",
          codePoint: 0x62,
        },
      ],
    },
  );
});

test("make an empty lesson log", () => {
  deepEqual(
    makeLessonLog({ steps: [], events: [], layout: "en-us", timeOrigin: 500 }),
    {
      layout: "en-us",
      startedAt: 500,
      codePoints: [],
      times: [],
      typos: [],
      events: [],
    },
  );
});
