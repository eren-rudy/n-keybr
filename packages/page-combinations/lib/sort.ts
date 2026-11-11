import { type ComboStats } from "@keybr/typing-log";

export type SortKey =
  | "combo"
  | "count"
  | "correctCount"
  | "missCount"
  | "accuracy"
  | "timeToInitiate"
  | "timeToType"
  | "speed"
  | "lastCompletedAt";

export type Sort = {
  readonly key: SortKey;
  readonly descending: boolean;
};

export const defaultSort: Sort = { key: "count", descending: true };

/**
 * Clicking the sorted column reverses its order. Any other column starts with
 * the largest values first, or in alphabetical order for the combinations.
 */
export function nextSort(sort: Sort, key: SortKey): Sort {
  if (sort.key === key) {
    return { key, descending: !sort.descending };
  } else {
    return { key, descending: key !== "combo" };
  }
}

export type Filter = {
  /** The smallest number of samples. */
  readonly minCount: number;
  /** The characters a combination must contain. */
  readonly query: string;
};

export function filterStats(
  list: readonly ComboStats[],
  { minCount, query }: Filter,
): ComboStats[] {
  return list.filter(
    (stats) => stats.count >= minCount && stats.combo.includes(query),
  );
}

/**
 * Sorts combinations by one of their metrics. Combinations without timed
 * samples have no times and speed, so they go last in either order.
 * Ties are broken by the combinations themselves.
 */
export function sortStats(
  list: readonly ComboStats[],
  { key, descending }: Sort,
  compare: (a: string, b: string) => number,
): ComboStats[] {
  return [...list].sort((a, b) => {
    if (key === "combo") {
      const d = compare(a.combo, b.combo);
      return descending ? -d : d;
    }
    const va = a[key];
    const vb = b[key];
    if (va == null || vb == null) {
      if (va != null) {
        return -1;
      }
      if (vb != null) {
        return 1;
      }
      return compare(a.combo, b.combo);
    }
    return (descending ? vb - va : va - vb) || compare(a.combo, b.combo);
  });
}
