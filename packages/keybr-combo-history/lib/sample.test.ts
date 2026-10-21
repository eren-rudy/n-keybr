import { test } from "node:test";
import { type Step, TextInput } from "@keybr/textinput";
import { deepEqual, isFalse, isTrue } from "rich-assert";
import { isTimed, makeComboSamples } from "./sample.ts";

const layout = "en-us";
const timeOrigin = Date.UTC(2026, 9, 21, 12, 0, 0);

test("make samples of single keys and key pairs", () => {
  const steps = [
    step("a", 1000),
    step("b", 1200),
    step("c", 1500),
    step("d", 1900),
  ];

  deepEqual(makeComboSamples(steps, { layout, timeOrigin }), [
    sample("b", 1200, 200, 200),
    sample("c", 1500, 300, 300),
    sample("bc", 1500, 200, 500),
    sample("d", 1900, 400, 400),
    sample("cd", 1900, 300, 700),
  ]);
});

test("first step only starts the clock", () => {
  deepEqual(makeComboSamples([], { layout, timeOrigin }), []);
  deepEqual(makeComboSamples([step("a", 1000)], { layout, timeOrigin }), []);
  deepEqual(
    makeComboSamples([step("a", 1000), step("b", 1100)], {
      layout,
      timeOrigin,
    }),
    [sample("b", 1100, 100, 100)],
  );
});

test("a pair is missed when either key is mistyped", () => {
  const steps = [
    step("a", 1000),
    step("b", 1100),
    step("c", 1500, true),
    step("d", 1600),
    step("e", 1700),
  ];

  deepEqual(
    makeComboSamples(steps, { layout, timeOrigin }).map(
      ({ combo, miss }) => `${combo}:${miss}`,
    ),
    [
      "b:false",
      "c:true",
      "bc:true",
      "d:false",
      "cd:true",
      "e:false",
      "de:false",
    ],
  );
});

test("round times and keep spaces", () => {
  const steps = [step("a", 1000.4), step(" ", 1200.7), step("b", 1300.1)];

  deepEqual(makeComboSamples(steps, { layout, timeOrigin }), [
    sample(" ", 1201, 200, 200),
    sample("b", 1300, 99, 99),
    sample(" b", 1300, 200, 300),
  ]);
});

test("steps filled in by the text input are not timed", () => {
  const textInput = new TextInput("ab cd", {
    stopOnError: true,
    forgiveErrors: false,
    spaceSkipsWords: true,
  });
  textInput.appendChar(1000, codePoint("a"), 0);
  textInput.appendChar(1100, codePoint(" "), 100); // Skips "b" and " ".
  textInput.appendChar(1300, codePoint("c"), 200);
  textInput.appendChar(1450, codePoint("d"), 150);
  isTrue(textInput.completed);

  const samples = makeComboSamples(textInput.steps, { layout, timeOrigin });

  deepEqual(
    samples.map(
      (sample) =>
        `${sample.combo}:${sample.timeToInitiate}:${sample.timeToType}:` +
        `${sample.miss ? "miss" : "hit"}:${isTimed(sample) ? "timed" : "-"}`,
    ),
    [
      "b:100:100:miss:-",
      " :0:0:hit:-",
      "b :100:100:miss:-",
      "c:200:200:hit:timed",
      " c:0:200:hit:-",
      "d:150:150:hit:timed",
      "cd:200:350:hit:timed",
    ],
  );
});

test("timed samples", () => {
  isTrue(isTimed(sample("ab", 0, 100, 200)));
  isFalse(isTimed({ ...sample("ab", 0, 100, 200), miss: true }));
  isFalse(isTimed(sample("ab", 0, 0, 200)));
  isFalse(isTimed(sample("a", 0, 0, 0)));
});

function step(char: string, timeStamp: number, typo = false): Step {
  return { timeStamp, codePoint: codePoint(char), timeToType: 100, typo };
}

function sample(
  combo: string,
  timeStamp: number,
  timeToInitiate: number,
  timeToType: number,
) {
  return {
    layout,
    combo,
    completedAt: timeOrigin + timeStamp,
    timeToInitiate,
    timeToType,
    miss: false,
  };
}

function codePoint(char: string): number {
  return char.codePointAt(0)!;
}
