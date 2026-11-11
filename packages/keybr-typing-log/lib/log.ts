import { type Step } from "@keybr/textinput";
import { type AnyEvent } from "@keybr/textinput-events";

/**
 * One key event of a lesson. Times are in milliseconds since the lesson
 * started, see {@link LessonLog.startedAt}.
 */
export type KeyEventRecord =
  | {
      /** A physical key was pressed or released. */
      readonly type: "keydown" | "keyup";
      readonly time: number;
      /** The physical key, like `KeyA` or `Space`. */
      readonly code: string;
      /** The character or the name of the key, like `a`, `A` or `Backspace`. */
      readonly key: string;
      /** The modifier keys that were active, like `Shift`. */
      readonly modifiers: readonly string[];
    }
  | {
      /** The text input received a character, a line break or a deletion. */
      readonly type: "input";
      readonly time: number;
      readonly inputType: string;
      /** The typed character, or zero for a deletion. */
      readonly codePoint: number;
    };

/**
 * The characters of a completed lesson, one entry per character of its text,
 * in the order they were typed. The arrays have the same length.
 */
export type LessonSteps = {
  /** The id of the keyboard layout the lesson was typed on. */
  readonly layout: string;
  /** When the lesson started, in milliseconds since the Unix epoch (UTC). */
  readonly startedAt: number;
  /** The characters of the text. */
  readonly codePoints: readonly number[];
  /** When each character was completed, in milliseconds since `startedAt`. */
  readonly times: readonly number[];
  /** Whether each character was mistyped before it was completed, or skipped. */
  readonly typos: readonly boolean[];
};

/** Everything that was recorded about a completed lesson. */
export type LessonLog = LessonSteps & {
  /** Every key press, key release and text input, in the order they happened. */
  readonly events: readonly KeyEventRecord[];
};

/**
 * Makes the log of a completed lesson.
 * @param steps The steps of the completed text input.
 * @param events The key events of the lesson, in the order they happened.
 * @param layout The id of the keyboard layout.
 * @param timeOrigin The UTC time in milliseconds at which event and step
 *                   time stamps are zero.
 */
export function makeLessonLog({
  steps,
  events,
  layout,
  timeOrigin,
}: {
  readonly steps: readonly Step[];
  readonly events: readonly AnyEvent[];
  readonly layout: string;
  readonly timeOrigin: number;
}): LessonLog {
  const start = Math.min(
    steps.length > 0 ? steps[0].timeStamp : Infinity,
    events.length > 0 ? events[0].timeStamp : Infinity,
  );
  const origin = Number.isFinite(start) ? start : 0;
  const time = (timeStamp: number) => roundTime(timeStamp - origin);
  return {
    layout,
    startedAt: roundTime(timeOrigin + origin),
    codePoints: steps.map(({ codePoint }) => codePoint),
    times: steps.map(({ timeStamp }) => time(timeStamp)),
    typos: steps.map(({ typo }) => typo),
    events: events.map((event) => {
      switch (event.type) {
        case "keydown":
        case "keyup":
          return {
            type: event.type,
            time: time(event.timeStamp),
            code: event.code,
            key: event.key,
            modifiers: [...event.modifiers],
          };
        case "input":
          return {
            type: event.type,
            time: time(event.timeStamp),
            inputType: event.inputType,
            codePoint: event.codePoint,
          };
      }
    }),
  };
}

/** Keeps times to a microsecond, which is finer than browsers measure them. */
function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}
