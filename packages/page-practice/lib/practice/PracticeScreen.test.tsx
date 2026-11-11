import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { Layout } from "@keybr/keyboard";
import { lessonProps, LessonType } from "@keybr/lesson";
import { FakePhoneticModel } from "@keybr/phonetic-model";
import { PhoneticModelLoader } from "@keybr/phonetic-model-loader";
import { FakeResultContext, ResultFaker } from "@keybr/result";
import { FakeSettingsContext, Settings } from "@keybr/settings";
import {
  computeStats,
  FakeTypingLogStorage,
  TypingLogContext,
} from "@keybr/typing-log";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { deepEqual, equal, includes, isNotNull, isTrue } from "rich-assert";
import { PracticeScreen } from "./PracticeScreen.tsx";

const faker = new ResultFaker();

test("render", async () => {
  PhoneticModelLoader.loader = FakePhoneticModel.loader;

  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext
        initialSettings={new Settings()
          .set(lessonProps.type, LessonType.CUSTOM)
          .set(lessonProps.customText.content, "abcdefghij")}
      >
        <FakeResultContext initialResults={faker.nextResultList(100)}>
          <TypingLogContext.Provider value={new FakeTypingLogStorage()}>
            <PracticeScreen />
          </TypingLogContext.Provider>
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  isNotNull(await r.findByTitle("Change lesson settings", { exact: false }));
  includes(r.container.textContent!, "abcdefghij");

  r.unmount();
});

test("log every keystroke of a completed lesson", async () => {
  PhoneticModelLoader.loader = FakePhoneticModel.loader;

  const storage = new FakeTypingLogStorage();

  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext
        initialSettings={new Settings()
          .set(lessonProps.type, LessonType.CUSTOM)
          .set(lessonProps.customText.content, "abcdefghij")}
      >
        <FakeResultContext>
          <TypingLogContext.Provider value={storage}>
            <PracticeScreen />
          </TypingLogContext.Provider>
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  await r.findByTitle("Change lesson settings", { exact: false });
  await waitFor(() => {
    isNotNull(r.container.querySelector("textarea"));
  });
  // The text area listens to events once its effects have run.
  await act(async () => {});

  // Type the whole lesson, one character every 200ms, each one pressed 50ms
  // before it is input and released 50ms after. The screen ignores input
  // until its text area gets a focus event.
  const input = r.container.querySelector("textarea")!;
  const text = input.parentElement!.nextElementSibling!.textContent!.replaceAll(
    "\uE000",
    " ",
  );
  isTrue(text.length > 10);
  fireEvent.focus(input);
  let timeStamp = 1000;
  for (const char of text) {
    timeStamp += 200;
    const code = char === " " ? "Space" : `Key${char.toUpperCase()}`;
    act(() => {
      input.dispatchEvent(
        withTimeStamp(
          new KeyboardEvent("keydown", { code, key: char, bubbles: true }),
          timeStamp - 50,
        ),
      );
      input.dispatchEvent(
        withTimeStamp(
          new InputEvent("input", { inputType: "insertText", data: char }),
          timeStamp,
        ),
      );
      input.dispatchEvent(
        withTimeStamp(
          new KeyboardEvent("keyup", { code, key: char, bubbles: true }),
          timeStamp + 50,
        ),
      );
    });
  }

  const logs = await storage.loadLogs();
  equal(logs.length, 1);
  const [log] = logs;
  equal(log.layout, Layout.EN_US.id);
  equal(String.fromCodePoint(...log.codePoints), text);
  deepEqual(
    log.typos,
    [...text].map(() => false),
  );
  // The lesson starts with the first key press.
  equal(log.times[0], 50);
  for (let i = 1; i < log.times.length; i++) {
    equal(log.times[i] - log.times[i - 1], 200);
  }
  // Every key press, input and release is logged, even the release of the
  // last key, which comes after the lesson is complete.
  deepEqual(
    log.events.slice(0, 3).map(({ type, time }) => ({ type, time })),
    [
      { type: "keydown", time: 0 },
      { type: "input", time: 50 },
      { type: "keyup", time: 100 },
    ],
  );
  equal(
    log.events.filter(({ type }) => type === "keydown").length,
    text.length,
  );
  equal(log.events.filter(({ type }) => type === "input").length, text.length);
  equal(log.events.filter(({ type }) => type === "keyup").length, text.length);

  // Sequences of any length can be computed from the log.
  const [bcd] = computeStats(await storage.loadLessons(), log.layout, 3).filter(
    ({ combo }) => combo === "bcd",
  );
  equal(bcd.timeToInitiate, 200);
  equal(bcd.timeToType, 600);

  r.unmount();
});

function withTimeStamp<T extends Event>(event: T, timeStamp: number): T {
  Object.defineProperty(event, "timeStamp", { value: timeStamp });
  return event;
}
