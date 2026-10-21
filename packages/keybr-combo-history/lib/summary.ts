import { type ComboSample, isTimed } from "./sample.ts";

/**
 * The running totals of all samples of one combination on one keyboard layout.
 */
export type ComboSummary = {
  readonly layout: string;
  readonly combo: string;
  /** The number of samples. */
  readonly count: number;
  /** The number of samples with a mistyped or skipped key. */
  readonly missCount: number;
  /** The number of samples whose times can be averaged. */
  readonly timedCount: number;
  /** The sum of the times to initiate of the timed samples. */
  readonly timeToInitiateSum: number;
  /** The sum of the times to type of the timed samples. */
  readonly timeToTypeSum: number;
  /** When the first sample was completed, in milliseconds since the Unix epoch (UTC). */
  readonly firstCompletedAt: number;
  /** When the last sample was completed, in milliseconds since the Unix epoch (UTC). */
  readonly lastCompletedAt: number;
};

/**
 * Adds samples of one combination to its summary.
 * @param summary The summary to add to, or null to start a new one.
 * @param samples The samples of the same layout and combination.
 */
export function summarize(
  summary: ComboSummary | null,
  samples: readonly ComboSample[],
): ComboSummary {
  if (summary == null) {
    if (samples.length === 0) {
      throw new Error("No samples");
    }
    const { layout, combo, completedAt } = samples[0];
    summary = {
      layout,
      combo,
      count: 0,
      missCount: 0,
      timedCount: 0,
      timeToInitiateSum: 0,
      timeToTypeSum: 0,
      firstCompletedAt: completedAt,
      lastCompletedAt: completedAt,
    };
  }
  let {
    count,
    missCount,
    timedCount,
    timeToInitiateSum,
    timeToTypeSum,
    firstCompletedAt,
    lastCompletedAt,
  } = summary;
  for (const sample of samples) {
    if (sample.layout !== summary.layout || sample.combo !== summary.combo) {
      throw new Error("Sample of another combination");
    }
    count += 1;
    if (sample.miss) {
      missCount += 1;
    }
    if (isTimed(sample)) {
      timedCount += 1;
      timeToInitiateSum += sample.timeToInitiate;
      timeToTypeSum += sample.timeToType;
    }
    firstCompletedAt = Math.min(firstCompletedAt, sample.completedAt);
    lastCompletedAt = Math.max(lastCompletedAt, sample.completedAt);
  }
  return {
    layout: summary.layout,
    combo: summary.combo,
    count,
    missCount,
    timedCount,
    timeToInitiateSum,
    timeToTypeSum,
    firstCompletedAt,
    lastCompletedAt,
  };
}

/** Groups samples by layout and combination, keeping their order. */
export function groupSamples(samples: Iterable<ComboSample>): ComboSample[][] {
  const groups = new Map<string, ComboSample[]>();
  for (const sample of samples) {
    const key = `${sample.layout}\u0000${sample.combo}`;
    let group = groups.get(key);
    if (group == null) {
      groups.set(key, (group = []));
    }
    group.push(sample);
  }
  return [...groups.values()];
}

/** Summarizes samples of any layouts and combinations. */
export function summarizeAll(samples: Iterable<ComboSample>): ComboSummary[] {
  return groupSamples(samples).map((group) => summarize(null, group));
}

/**
 * The metrics of one combination, calculated from its summary.
 */
export type ComboStats = {
  readonly layout: string;
  readonly combo: string;
  /** The number of keys in the combination, one or two. */
  readonly length: number;
  /** The number of samples. */
  readonly count: number;
  /** The number of samples without errors. */
  readonly correctCount: number;
  /** The number of samples with a mistyped or skipped key. */
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

export function makeComboStats({
  layout,
  combo,
  count,
  missCount,
  timedCount,
  timeToInitiateSum,
  timeToTypeSum,
  firstCompletedAt,
  lastCompletedAt,
}: ComboSummary): ComboStats {
  const length = [...combo].length;
  const correctCount = count - missCount;
  const timeToInitiate = timedCount > 0 ? timeToInitiateSum / timedCount : null;
  const timeToType = timedCount > 0 ? timeToTypeSum / timedCount : null;
  return {
    layout,
    combo,
    length,
    count,
    correctCount,
    missCount,
    accuracy: count > 0 ? correctCount / count : 0,
    timeToInitiate,
    timeToType,
    speed: timeToType != null ? (length * 60000) / timeToType : null,
    firstCompletedAt,
    lastCompletedAt,
  };
}
