import { test } from "node:test";
import {
  type ComboSample,
  ComboStorageContext,
  FakeComboStorage,
} from "@keybr/combo-history";
import { FakeIntlProvider } from "@keybr/intl";
import { FakeSettingsContext } from "@keybr/settings";
import { fireEvent, render } from "@testing-library/react";
import { deepEqual, equal, isNotNull } from "rich-assert";
import { CombinationsPage } from "./CombinationsPage.tsx";

const samples = [
  sample("en-us", "t", 1000, 200, 200),
  sample("en-us", "h", 2000, 150, 150),
  sample("en-us", "th", 2000, 200, 350),
  sample("en-us", "t", 3000, 300, 300, true),
  sample("en-us", "h", 4000, 250, 250),
  sample("en-us", "th", 4000, 300, 550),
  sample("en-us", "t", 5000, 100, 100),
  sample("en-us", "th", 6000, 100, 300),
  sample("en-us", "th", 7000, 100, 300),
  sample("en-us", "e ", 8000, 400, 400),
  sample("en-dvorak", "x", 9000, 100, 100),
];

test("show combinations sorted by a metric", async () => {
  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <ComboStorageContext.Provider value={new FakeComboStorage(samples)}>
          <CombinationsPage />
        </ComboStorageContext.Provider>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  await r.findByText("Combination");

  // The most typed combinations first, only for the selected layout.
  deepEqual(rows(r.container), ["th", "t", "h", "e␣"]);

  // The slowest combinations first.
  fireEvent.click(r.getByText("Time to type"));
  deepEqual(rows(r.container), ["e␣", "th", "h", "t"]);

  // The fastest combinations first.
  fireEvent.click(r.getByText("Time to type ▼"));
  deepEqual(rows(r.container), ["t", "h", "th", "e␣"]);

  // Only the combinations with the searched characters.
  fireEvent.change(r.getByPlaceholderText("Find a combination"), {
    target: { value: "h" },
  });
  deepEqual(rows(r.container), ["h", "th"]);

  r.unmount();
});

test("show the history of a combination", async () => {
  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <ComboStorageContext.Provider value={new FakeComboStorage(samples)}>
          <CombinationsPage />
        </ComboStorageContext.Provider>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  await r.findByText("Combination");
  fireEvent.click(row(r.container, "t"));

  isNotNull(await r.findByText("the most recent first", { exact: false }));
  const history = [
    ...r.container.querySelectorAll(".historyTable tbody tr"),
  ].map((row) =>
    [...row.querySelectorAll("td")].map((cell) => cell.textContent),
  );
  deepEqual(history, [
    ["1970-01-01 00:00:05.000", "100 ms", "100 ms", "Correct"],
    ["1970-01-01 00:00:03.000", "300 ms", "300 ms", "Miss"],
    ["1970-01-01 00:00:01.000", "200 ms", "200 ms", "Correct"],
  ]);

  // Clicking again hides the history.
  fireEvent.click(row(r.container, "t"));
  equal(r.container.querySelectorAll(".historyTable").length, 0);

  r.unmount();
});

test("show an empty history", async () => {
  const r = render(
    <FakeIntlProvider>
      <FakeSettingsContext>
        <ComboStorageContext.Provider value={new FakeComboStorage()}>
          <CombinationsPage />
        </ComboStorageContext.Provider>
      </FakeSettingsContext>
    </FakeIntlProvider>,
  );

  isNotNull(await r.findByText("Nothing is recorded yet", { exact: false }));

  r.unmount();
});

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
