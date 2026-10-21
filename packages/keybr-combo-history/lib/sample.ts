import { type Step } from "@keybr/textinput";

/**
 * One typing of a single key or of a pair of consecutive keys.
 *
 * Both times are measured from the keystroke right before the combination,
 * so for a single key they are the same.
 */
export type ComboSample = {
  /** The id of the keyboard layout the combination was typed on. */
  readonly layout: string;
  /** The typed characters, one or two of them. */
  readonly combo: string;
  /** When the last key of the combination was typed, in milliseconds since the Unix epoch (UTC). */
  readonly completedAt: number;
  /** Milliseconds from the previous keystroke to the first key of the combination. */
  readonly timeToInitiate: number;
  /** Milliseconds from the previous keystroke to the last key of the combination. */
  readonly timeToType: number;
  /** Whether a key of the combination was mistyped or skipped. */
  readonly miss: boolean;
};

/**
 * Makes the combination samples of a completed lesson.
 *
 * Every step completes one single key and one key pair. The first step only
 * starts the clock, so neither it nor the pair it starts has a sample.
 *
 * @param steps The steps of a completed text input.
 * @param layout The id of the keyboard layout.
 * @param timeOrigin The UTC time in milliseconds at which step time stamps are zero.
 */
export function makeComboSamples(
  steps: readonly Step[],
  {
    layout,
    timeOrigin,
  }: { readonly layout: string; readonly timeOrigin: number },
): ComboSample[] {
  const samples: ComboSample[] = [];
  for (let i = 1; i < steps.length; i++) {
    const prev = steps[i - 1];
    const last = steps[i];
    const completedAt = Math.round(timeOrigin + last.timeStamp);
    const timeToType = Math.round(last.timeStamp - prev.timeStamp);
    samples.push({
      layout,
      combo: String.fromCodePoint(last.codePoint),
      completedAt,
      timeToInitiate: timeToType,
      timeToType,
      miss: last.typo,
    });
    if (i >= 2) {
      const start = steps[i - 2];
      samples.push({
        layout,
        combo: String.fromCodePoint(prev.codePoint, last.codePoint),
        completedAt,
        timeToInitiate: Math.round(prev.timeStamp - start.timeStamp),
        timeToType: Math.round(last.timeStamp - start.timeStamp),
        miss: prev.typo || last.typo,
      });
    }
  }
  return samples;
}

/**
 * Tells whether a sample's times can be averaged. The times of a miss include
 * the error and its correction. Steps that the text input fills in by itself,
 * for example when the space key skips a word, share one time stamp, so their
 * times are zero.
 */
export function isTimed({
  miss,
  timeToInitiate,
  timeToType,
}: ComboSample): boolean {
  return !miss && timeToInitiate > 0 && timeToType > 0;
}
