import { test } from "node:test";
import { ComboStorageContext, FakeComboStorage } from "@keybr/combo-history";
import { FakeIntlProvider } from "@keybr/intl";
import { Layout } from "@keybr/keyboard";
import { lessonProps, LessonType } from "@keybr/lesson";
import { FakePhoneticModel } from "@keybr/phonetic-model";
import { PhoneticModelLoader } from "@keybr/phonetic-model-loader";
import { FakeResultContext, ResultFaker } from "@keybr/result";
import { FakeSettingsContext, Settings } from "@keybr/settings";
import { act, fireEvent, render } from "@testing-library/react";
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
          <ComboStorageContext.Provider value={new FakeComboStorage()}>
            <PracticeScreen />
          </ComboStorageContext.Provider>
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  isNotNull(await r.findByTitle("Change lesson settings", { exact: false }));
  includes(r.container.textContent!, "abcdefghij");

  r.unmount();
});

test("record key combinations of a completed lesson", async () => {
  PhoneticModelLoader.loader = FakePhoneticModel.loader;

  const storage = new FakeComboStorage();

  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext
        initialSettings={new Settings()
          .set(lessonProps.type, LessonType.CUSTOM)
          .set(lessonProps.customText.content, "abcdefghij")}
      >
        <FakeResultContext>
          <ComboStorageContext.Provider value={storage}>
            <PracticeScreen />
          </ComboStorageContext.Provider>
        </FakeResultContext>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  await r.findByTitle("Change lesson settings", { exact: false });

  // Type the whole lesson, one character every 200ms. The screen ignores
  // input until its text area gets a focus event.
  const input = r.container.querySelector("textarea")!;
  const text = input.parentElement!.nextElementSibling!.textContent!.replaceAll(
    "\uE000",
    " ",
  );
  isTrue(text.length > 10);
  fireEvent.focus(input);
  let timeStamp = 1000;
  for (const char of text) {
    act(() => {
      const event = new InputEvent("input", {
        inputType: "insertText",
        data: char,
      });
      Object.defineProperty(event, "timeStamp", { value: (timeStamp += 200) });
      input.dispatchEvent(event);
    });
  }

  const summaries = await storage.loadSummaries();
  const combos = summaries.map(({ combo }) => combo);
  includes(combos, "b");
  includes(combos, "ab");
  includes(combos, "j ");
  includes(combos, " a");
  deepEqual(
    new Set(summaries.map(({ layout }) => layout)),
    new Set([Layout.EN_US.id]),
  );
  const samples = await storage.loadSamples(Layout.EN_US.id, "ab");
  isTrue(samples.length > 0);
  for (const sample of samples) {
    equal(sample.timeToInitiate, 200);
    equal(sample.timeToType, 400);
  }

  r.unmount();
});
