import { type ComboStats } from "@keybr/combo-history";
import { useIntlNumbers } from "@keybr/intl";
import { useFormatter } from "@keybr/lesson-ui";
import { clsx } from "clsx";
import { Fragment, type ReactNode } from "react";
import { defineMessage, type MessageDescriptor, useIntl } from "react-intl";
import { ComboHistory } from "./ComboHistory.tsx";
import * as styles from "./ComboTable.module.less";
import { formatCombo, formatUtc, useFormatMilliseconds } from "./format.ts";
import { type Sort, type SortKey } from "./sort.ts";

type Column = {
  readonly key: SortKey;
  readonly label: MessageDescriptor;
  readonly title: MessageDescriptor;
  readonly numeric: boolean;
};

const columns: readonly Column[] = [
  {
    key: "combo",
    label: defineMessage({
      id: "combinations.column.combination",
      defaultMessage: "Combination",
    }),
    title: defineMessage({
      id: "combinations.column.combination.title",
      defaultMessage: "A single key or a pair of consecutive keys.",
    }),
    numeric: false,
  },
  {
    key: "count",
    label: defineMessage({
      id: "combinations.column.total",
      defaultMessage: "Total",
    }),
    title: defineMessage({
      id: "combinations.column.total.title",
      defaultMessage: "How many times the combination was typed.",
    }),
    numeric: true,
  },
  {
    key: "correctCount",
    label: defineMessage({
      id: "combinations.column.correct",
      defaultMessage: "Correct",
    }),
    title: defineMessage({
      id: "combinations.column.correct.title",
      defaultMessage: "How many times it was typed without errors.",
    }),
    numeric: true,
  },
  {
    key: "missCount",
    label: defineMessage({
      id: "combinations.column.misses",
      defaultMessage: "Misses",
    }),
    title: defineMessage({
      id: "combinations.column.misses.title",
      defaultMessage: "How many times one of its keys was mistyped or skipped.",
    }),
    numeric: true,
  },
  {
    key: "accuracy",
    label: defineMessage({
      id: "t_Accuracy",
      defaultMessage: "Accuracy",
    }),
    title: defineMessage({
      id: "combinations.column.accuracy.title",
      defaultMessage: "The share of times it was typed without errors.",
    }),
    numeric: true,
  },
  {
    key: "timeToInitiate",
    label: defineMessage({
      id: "combinations.column.timeToInitiate",
      defaultMessage: "Time to initiate",
    }),
    title: defineMessage({
      id: "combinations.column.timeToInitiate.title",
      defaultMessage:
        "The average time from the previous keystroke to the first key of the combination.",
    }),
    numeric: true,
  },
  {
    key: "timeToType",
    label: defineMessage({
      id: "combinations.column.timeToType",
      defaultMessage: "Time to type",
    }),
    title: defineMessage({
      id: "combinations.column.timeToType.title",
      defaultMessage:
        "The average time from the previous keystroke to the last key of the combination.",
    }),
    numeric: true,
  },
  {
    key: "speed",
    label: defineMessage({
      id: "t_Speed",
      defaultMessage: "Speed",
    }),
    title: defineMessage({
      id: "combinations.column.speed.title",
      defaultMessage: "The typing speed at the average time to type.",
    }),
    numeric: true,
  },
  {
    key: "lastCompletedAt",
    label: defineMessage({
      id: "combinations.column.lastTyped",
      defaultMessage: "Last typed (UTC)",
    }),
    title: defineMessage({
      id: "combinations.column.lastTyped.title",
      defaultMessage: "When the combination was typed for the last time.",
    }),
    numeric: true,
  },
];

export function ComboTable({
  stats,
  sort,
  selected,
  onSort,
  onSelect,
}: {
  readonly stats: readonly ComboStats[];
  readonly sort: Sort;
  readonly selected: string | null;
  readonly onSort: (key: SortKey) => void;
  readonly onSelect: (combo: string | null) => void;
}): ReactNode {
  const { formatMessage } = useIntl();
  const { formatInteger, formatPercents } = useIntlNumbers();
  const { formatSpeed } = useFormatter();
  const formatTime = useFormatMilliseconds();
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          {columns.map(({ key, label, title, numeric }) => (
            <th
              key={key}
              className={clsx(numeric && styles.numeric)}
              aria-sort={
                sort.key === key
                  ? sort.descending
                    ? "descending"
                    : "ascending"
                  : undefined
              }
            >
              <button
                type="button"
                className={styles.sortButton}
                title={formatMessage(title)}
                onClick={() => {
                  onSort(key);
                }}
              >
                {formatMessage(label)}
                {sort.key === key && (sort.descending ? " ▼" : " ▲")}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stats.map((item) => {
          const isSelected = item.combo === selected;
          return (
            <Fragment key={item.combo}>
              <tr
                className={clsx(styles.row, isSelected && styles.selected)}
                onClick={() => {
                  onSelect(isSelected ? null : item.combo);
                }}
              >
                <td>
                  <button
                    type="button"
                    className={styles.combo}
                    aria-expanded={isSelected}
                  >
                    {formatCombo(item.combo)}
                  </button>
                </td>
                <td className={styles.numeric}>{formatInteger(item.count)}</td>
                <td className={styles.numeric}>
                  {formatInteger(item.correctCount)}
                </td>
                <td className={styles.numeric}>
                  {formatInteger(item.missCount)}
                </td>
                <td className={styles.numeric}>
                  {formatPercents(item.accuracy, 1)}
                </td>
                <td className={styles.numeric}>
                  {formatTime(item.timeToInitiate)}
                </td>
                <td className={styles.numeric}>
                  {formatTime(item.timeToType)}
                </td>
                <td className={styles.numeric}>
                  {item.speed != null ? formatSpeed(item.speed) : "–"}
                </td>
                <td className={styles.numeric}>
                  {formatUtc(item.lastCompletedAt, "minutes")}
                </td>
              </tr>
              {isSelected && (
                <tr className={styles.historyRow}>
                  <td colSpan={columns.length}>
                    <ComboHistory layout={item.layout} combo={item.combo} />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
