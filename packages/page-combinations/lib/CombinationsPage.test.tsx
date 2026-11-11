import { test } from "node:test";
import { FakeIntlProvider } from "@keybr/intl";
import { FakeSettingsContext } from "@keybr/settings";
import {
  FakeTypingLogStorage,
  type LessonLog,
  TypingLogContext,
} from "@keybr/typing-log";
import { fireEvent, render } from "@testing-library/react";
import { deepEqual, equal, isNotNull } from "rich-assert";
import { CombinationsPage } from "./CombinationsPage.tsx";

const logs = [
  lesson("en-us", 0, "xthth", [0, 200, 350, 550, 650]),
  lesson("en-us", 10000, "xte", [0, 100, 500], [2]),
  lesson("en-dvorak", 20000, "xq", [0, 100]),
];

test("show combinations sorted by a metric", async () => {
  const r = renderPage(logs);

  await r.findByText("Combination");

  // Pairs by default, the most typed first, only for the selected layout.
  deepEqual(rows(r.container), ["th", "ht", "te"]);

  // Single characters.
  setLength(r.container, "1");
  deepEqual(rows(r.container), ["t", "h", "e"]);

  // The slowest combinations first, without times last.
  fireEvent.click(r.getByText("Time to type"));
  deepEqual(rows(r.container), ["t", "h", "e"]);

  // The fastest combinations first, without times still last.
  fireEvent.click(r.getByText("Time to type ▼"));
  deepEqual(rows(r.container), ["h", "t", "e"]);

  // Longer combinations.
  setLength(r.container, "3");
  deepEqual(rows(r.container), ["hth", "tht"]);
  setLength(r.container, "20");
  deepEqual(rows(r.container), []);

  // Only the combinations with the searched characters, still the fastest
  // first.
  setLength(r.container, "2");
  fireEvent.change(r.getByPlaceholderText("Find a combination"), {
    target: { value: "h" },
  });
  deepEqual(rows(r.container), ["th", "ht"]);

  r.unmount();
});

test("keep the last valid length", async () => {
  const r = renderPage(logs);

  await r.findByText("Combination");

  setLength(r.container, "1");
  deepEqual(rows(r.container), ["t", "h", "e"]);

  for (const value of ["0", "", "x", "101"]) {
    setLength(r.container, value);
    isNotNull(r.queryByText("Enter a whole number from 1 to 100."));
    deepEqual(rows(r.container), ["t", "h", "e"]);
  }

  setLength(r.container, "2");
  equal(r.queryByText("Enter a whole number from 1 to 100."), null);
  deepEqual(rows(r.container), ["th", "ht", "te"]);

  r.unmount();
});

test("show the history of a combination", async () => {
  const r = renderPage(logs);

  await r.findByText("Combination");
  setLength(r.container, "1");
  fireEvent.click(row(r.container, "t"));

  isNotNull(await r.findByText("the most recent first", { exact: false }));
  deepEqual(history(r.container), [
    ["1970-01-01 00:00:10.100", "100 ms", "100 ms", "Correct"],
    ["1970-01-01 00:00:00.550", "200 ms", "200 ms", "Correct"],
    ["1970-01-01 00:00:00.200", "200 ms", "200 ms", "Correct"],
  ]);

  // Clicking again hides the history.
  fireEvent.click(row(r.container, "t"));
  equal(r.container.querySelectorAll(".historyTable").length, 0);

  // The history of a longer combination.
  setLength(r.container, "2");
  fireEvent.click(row(r.container, "te"));
  deepEqual(history(r.container), [
    ["1970-01-01 00:00:10.500", "100 ms", "500 ms", "Miss"],
  ]);

  r.unmount();
});

test("show an empty history", async () => {
  const r = renderPage([]);

  isNotNull(await r.findByText("Nothing is recorded yet", { exact: false }));

  r.unmount();
});

function renderPage(logs: readonly LessonLog[]) {
  return render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <TypingLogContext.Provider value={new FakeTypingLogStorage(logs)}>
          <CombinationsPage />
        </TypingLogContext.Provider>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );
}

function setLength(container: HTMLElement, value: string): void {
  const input = container.querySelector(
    "[title='The number of consecutive characters in a combination.']",
  )!;
  fireEvent.change(input, { target: { value } });
}

function rows(container: HTMLElement): string[] {
  return [...container.querySelectorAll("tr.row .combo")].map(
    (button) => button.textContent!,
  );
}

function row(container: HTMLElement, combo: string): Element {
  return [...container.querySelectorAll("tr.row .combo")].find(
    (button) => button.textContent === combo,
  )!;
}

function history(container: HTMLElement): (string | null)[][] {
  return [...container.querySelectorAll(".historyTable tbody tr")].map((row) =>
    [...row.querySelectorAll("td")].map((cell) => cell.textContent),
  );
}

function lesson(
  layout: string,
  startedAt: number,
  text: string,
  times: readonly number[],
  typos: readonly number[] = [],
): LessonLog {
  const codePoints = [...text].map((c) => c.codePointAt(0)!);
  return {
    layout,
    startedAt,
    codePoints,
    times,
    typos: codePoints.map((_, i) => typos.includes(i)),
    events: [],
  };
}
