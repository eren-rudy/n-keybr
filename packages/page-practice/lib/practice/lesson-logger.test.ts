import { test } from "node:test";
import { type Result } from "@keybr/result";
import { type Step } from "@keybr/textinput";
import {
  type AnyEvent,
  type IInputEvent,
  type IKeyboardEvent,
} from "@keybr/textinput-events";
import { deepEqual, equal } from "rich-assert";
import {
  type CompletedLesson,
  KeyEventRecorder,
  LessonLogger,
  releaseTimeout,
} from "./lesson-logger.ts";

const result = {} as Result;
const steps: Step[] = [];

test("record key events", () => {
  const recorder = new KeyEventRecorder();

  // A release without a press is ignored.
  equal(recorder.keyUp(up("KeyA", 1)), false);
  recorder.keyDown(down("KeyB", 2));
  recorder.input(input(3));
  equal(recorder.pressedKeys, 1);
  equal(recorder.keyUp(up("KeyB", 4)), true);
  equal(recorder.pressedKeys, 0);
  // A key can be released only once.
  equal(recorder.keyUp(up("KeyB", 5)), false);
  deepEqual(times(recorder.events), [2, 3, 4]);

  recorder.reset();
  deepEqual(recorder.events, []);
  equal(recorder.pressedKeys, 0);
});

test("deliver a lesson right away if no keys are pressed", () => {
  const { logger, lessons } = makeLogger();

  logger.keyDown(down("KeyA", 1));
  logger.input(input(2));
  logger.keyUp(up("KeyA", 3));
  logger.complete(result, steps);

  equal(lessons.length, 1);
  deepEqual(times(lessons[0].events), [1, 2, 3]);
});

test("wait for the last keys to be released", () => {
  const { logger, lessons } = makeLogger();

  logger.keyDown(down("KeyA", 1));
  logger.keyDown(down("KeyB", 2));
  logger.input(input(3));
  logger.complete(result, steps);
  equal(lessons.length, 0);

  // The next lesson starts while the keys of the last one are pressed.
  logger.keyDown(down("KeyC", 4));
  logger.keyUp(up("KeyA", 5));
  equal(lessons.length, 0);
  logger.keyUp(up("KeyB", 6));
  equal(lessons.length, 1);
  deepEqual(times(lessons[0].events), [1, 2, 3, 5, 6]);

  logger.input(input(7));
  logger.keyUp(up("KeyC", 8));
  logger.complete(result, steps);
  equal(lessons.length, 2);
  deepEqual(times(lessons[1].events), [4, 7, 8]);
});

test("stop waiting after a timeout", () => {
  const { logger, lessons, timers } = makeLogger();

  logger.keyDown(down("KeyA", 1));
  logger.input(input(2));
  logger.complete(result, steps);
  equal(lessons.length, 0);
  deepEqual(
    timers.map(({ delay }) => delay),
    [releaseTimeout],
  );

  timers[0].callback();
  equal(lessons.length, 1);
  deepEqual(times(lessons[0].events), [1, 2]);

  // The late release goes nowhere.
  logger.keyUp(up("KeyA", 3));
  logger.complete(result, steps);
  equal(lessons.length, 2);
  deepEqual(lessons[1].events, []);
});

test("deliver the waiting lesson before the next one", () => {
  const { logger, lessons, cleared } = makeLogger();

  logger.keyDown(down("KeyA", 1));
  logger.input(input(2));
  logger.complete(result, steps);
  logger.input(input(3));
  logger.complete(result, steps);

  equal(lessons.length, 2);
  deepEqual(times(lessons[0].events), [1, 2]);
  deepEqual(times(lessons[1].events), [3]);
  equal(cleared.length, 1);
});

test("flush the waiting lesson", () => {
  const { logger, lessons } = makeLogger();

  logger.keyDown(down("KeyA", 1));
  logger.input(input(2));
  logger.complete(result, steps);
  equal(lessons.length, 0);
  logger.flush();
  equal(lessons.length, 1);
  logger.flush();
  equal(lessons.length, 1);
});

test("reset the current lesson only", () => {
  const { logger, lessons } = makeLogger();

  logger.keyDown(down("KeyA", 1));
  logger.input(input(2));
  logger.complete(result, steps);
  logger.keyDown(down("KeyB", 3));
  logger.reset();
  logger.keyUp(up("KeyA", 4));

  equal(lessons.length, 1);
  deepEqual(times(lessons[0].events), [1, 2, 4]);
});

test("use the real timers by default", async () => {
  const logger = new LessonLogger();
  const lessons: CompletedLesson[] = [];
  logger.setListener((lesson) => {
    lessons.push(lesson);
  });
  logger.keyDown(down("KeyA", 1));
  logger.complete(result, steps);
  logger.flush();
  equal(lessons.length, 1);
});

function makeLogger() {
  const lessons: CompletedLesson[] = [];
  const timers: { callback: () => void; delay: number }[] = [];
  const cleared: unknown[] = [];
  const logger = new LessonLogger({
    setTimeout: (callback, delay) => {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout: (id) => {
      cleared.push(id);
    },
  });
  logger.setListener((lesson) => {
    lessons.push(lesson);
  });
  return { logger, lessons, timers, cleared };
}

function down(code: string, timeStamp: number): IKeyboardEvent {
  return { type: "keydown", timeStamp, code, key: "", modifiers: [] };
}

function up(code: string, timeStamp: number): IKeyboardEvent {
  return { type: "keyup", timeStamp, code, key: "", modifiers: [] };
}

function input(timeStamp: number): IInputEvent {
  return {
    type: "input",
    timeStamp,
    inputType: "appendChar",
    codePoint: 0x61,
    timeToType: 0,
  };
}

function times(events: readonly AnyEvent[]): number[] {
  return events.map(({ timeStamp }) => timeStamp);
}
