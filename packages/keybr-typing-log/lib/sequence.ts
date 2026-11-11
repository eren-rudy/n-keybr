import { type LessonSteps } from "./log.ts";

/**
 * One typing of a sequence of consecutive characters.
 *
 * Both times are measured from the keystroke right before the sequence,
 * so for a single character they are the same.
 */
export type ComboSample = {
  /** The id of the keyboard layout the sequence was typed on. */
  readonly layout: string;
  /** The typed characters. */
  readonly combo: string;
  /** When the last character was typed, in milliseconds since the Unix epoch (UTC). */
  readonly completedAt: number;
  /** Milliseconds from the previous keystroke to the first character. */
  readonly timeToInitiate: number;
  /** Milliseconds from the previous keystroke to the last character. */
  readonly timeToType: number;
  /** Whether a character of the sequence was mistyped or skipped. */
  readonly miss: boolean;
};

/**
 * Tells whether a sample's times can be averaged. The times of a miss include
 * the error and its correction. Characters that the text input fills in by
 * itself, for example when the space key skips a word, share one time stamp,
 * so their times are zero.
 */
export function isTimed({
  miss,
  timeToInitiate,
  timeToType,
}: ComboSample): boolean {
  return !miss && timeToInitiate > 0 && timeToType > 0;
}

/**
 * Calls back for every sequence of the given length in a lesson. The first
 * character of a lesson only starts the clock, so a sequence must start at
 * the second character or later.
 * @param lesson The lesson to scan.
 * @param length The number of characters in a sequence.
 * @param callback Receives the index of the first and of the last character.
 */
export function forEachSequence(
  { codePoints }: LessonSteps,
  length: number,
  callback: (first: number, last: number) => void,
): void {
  if (!(Number.isInteger(length) && length >= 1)) {
    throw new RangeError("Invalid sequence length");
  }
  for (let last = length; last < codePoints.length; last++) {
    callback(last - length + 1, last);
  }
}

function makeSample(
  { layout, startedAt, codePoints, times, typos }: LessonSteps,
  combo: string,
  first: number,
  last: number,
): ComboSample {
  const before = times[first - 1];
  let miss = false;
  for (let i = first; i <= last; i++) {
    if (typos[i]) {
      miss = true;
      break;
    }
  }
  return {
    layout,
    combo,
    completedAt: startedAt + times[last],
    timeToInitiate: times[first] - before,
    timeToType: times[last] - before,
    miss,
  };
}

function comboOf(codePoints: readonly number[], first: number, last: number) {
  return String.fromCodePoint(...codePoints.slice(first, last + 1));
}

/** Makes every sample of the given sequence length in a lesson. */
export function sequenceSamples(
  lesson: LessonSteps,
  length: number,
): ComboSample[] {
  const samples: ComboSample[] = [];
  forEachSequence(lesson, length, (first, last) => {
    samples.push(
      makeSample(lesson, comboOf(lesson.codePoints, first, last), first, last),
    );
  });
  return samples;
}

/**
 * Finds every typing of one sequence on one layout, the oldest first.
 */
export function findSamples(
  lessons: readonly LessonSteps[],
  layout: string,
  combo: string,
): ComboSample[] {
  const length = [...combo].length;
  const samples: ComboSample[] = [];
  for (const lesson of lessons) {
    if (lesson.layout === layout) {
      forEachSequence(lesson, length, (first, last) => {
        if (comboOf(lesson.codePoints, first, last) === combo) {
          samples.push(makeSample(lesson, combo, first, last));
        }
      });
    }
  }
  return samples.sort((a, b) => a.completedAt - b.completedAt);
}

/**
 * The metrics of one sequence, calculated from all its samples.
 */
export type ComboStats = {
  readonly layout: string;
  readonly combo: string;
  /** The number of characters in the sequence. */
  readonly length: number;
  /** The number of samples. */
  readonly count: number;
  /** The number of samples without errors. */
  readonly correctCount: number;
  /** The number of samples with a mistyped or skipped character. */
  readonly missCount: number;
  /** The share of samples without errors, from zero to one. */
  readonly accuracy: number;
  /** The average time to initiate in milliseconds, or null if no sample is timed. */
  readonly timeToInitiate: number | null;
  /** The average time to type in milliseconds, or null if no sample is timed. */
  readonly timeToType: number | null;
  /** The speed in characters per minute at the average time to type, or null if no sample is timed. */
  readonly speed: number | null;
  /** When the first sample was completed, in milliseconds since the Unix epoch (UTC). */
  readonly firstCompletedAt: number;
  /** When the last sample was completed, in milliseconds since the Unix epoch (UTC). */
  readonly lastCompletedAt: number;
};

type Totals = {
  count: number;
  missCount: number;
  timedCount: number;
  timeToInitiateSum: number;
  timeToTypeSum: number;
  firstCompletedAt: number;
  lastCompletedAt: number;
};

/**
 * Calculates the metrics of every sequence of the given length typed on one
 * layout.
 */
export function computeStats(
  lessons: readonly LessonSteps[],
  layout: string,
  length: number,
): ComboStats[] {
  const totals = new Map<string, Totals>();
  for (const lesson of lessons) {
    if (lesson.layout !== layout) {
      continue;
    }
    forEachSequence(lesson, length, (first, last) => {
      const combo = comboOf(lesson.codePoints, first, last);
      const sample = makeSample(lesson, combo, first, last);
      let item = totals.get(combo);
      if (item == null) {
        totals.set(
          combo,
          (item = {
            count: 0,
            missCount: 0,
            timedCount: 0,
            timeToInitiateSum: 0,
            timeToTypeSum: 0,
            firstCompletedAt: sample.completedAt,
            lastCompletedAt: sample.completedAt,
          }),
        );
      }
      item.count += 1;
      if (sample.miss) {
        item.missCount += 1;
      }
      if (isTimed(sample)) {
        item.timedCount += 1;
        item.timeToInitiateSum += sample.timeToInitiate;
        item.timeToTypeSum += sample.timeToType;
      }
      item.firstCompletedAt = Math.min(
        item.firstCompletedAt,
        sample.completedAt,
      );
      item.lastCompletedAt = Math.max(item.lastCompletedAt, sample.completedAt);
    });
  }
  return [...totals].map(([combo, item]) => {
    const correctCount = item.count - item.missCount;
    const timeToInitiate =
      item.timedCount > 0 ? item.timeToInitiateSum / item.timedCount : null;
    const timeToType =
      item.timedCount > 0 ? item.timeToTypeSum / item.timedCount : null;
    return {
      layout,
      combo,
      length,
      count: item.count,
      correctCount,
      missCount: item.missCount,
      accuracy: correctCount / item.count,
      timeToInitiate,
      timeToType,
      speed: timeToType != null ? (length * 60000) / timeToType : null,
      firstCompletedAt: item.firstCompletedAt,
      lastCompletedAt: item.lastCompletedAt,
    };
  });
}

/** Lists the layouts of the lessons, each once. */
export function listLayouts(lessons: readonly LessonSteps[]): string[] {
  return [...new Set(lessons.map(({ layout }) => layout))];
}
