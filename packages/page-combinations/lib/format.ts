import { useIntlNumbers } from "@keybr/intl";

/** Shows the spaces of a combination as visible symbols. */
export function formatCombo(combo: string): string {
  return combo.replaceAll(" ", "␣");
}

/**
 * Formats a time stamp as a UTC date and time, like `2026-10-21 14:03:22.517`.
 * @param timeStamp Milliseconds since the Unix epoch.
 * @param precision How much of the time to show.
 */
export function formatUtc(
  timeStamp: number,
  precision: "minutes" | "milliseconds",
): string {
  return new Date(timeStamp)
    .toISOString()
    .substring(0, precision === "minutes" ? 16 : 23)
    .replace("T", " ");
}

/** Formats a time in milliseconds, or a dash if there is none. */
export function useFormatMilliseconds(): (value: number | null) => string {
  const { formatNumber } = useIntlNumbers();
  return (value) =>
    value != null
      ? formatNumber(value, {
          style: "unit",
          unit: "millisecond",
          maximumFractionDigits: 0,
        })
      : "–";
}
