import { catchError } from "@keybr/debug";
import { useCollator } from "@keybr/intl";
import { keyboardProps, Layout, useFormattedNames } from "@keybr/keyboard";
import { LoadingProgress, Screen } from "@keybr/pages-shared";
import { useSettings } from "@keybr/settings";
import {
  computeStats,
  type LessonSteps,
  listLayouts,
  useTypingLog,
} from "@keybr/typing-log";
import {
  Button,
  Field,
  FieldList,
  OptionList,
  Para,
  TextField,
} from "@keybr/widget";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import * as styles from "./ComboTable.module.less";
import { ComboTable } from "./ComboTable.tsx";
import { downloadLog } from "./download.ts";
import { parseLength } from "./length.ts";
import { defaultSort, filterStats, nextSort, sortStats } from "./sort.ts";

export function CombinationsPage(): ReactNode {
  const lessons = useLessons();
  return (
    <Screen>
      <FormattedMessage
        id="page.combinations.content"
        defaultMessage={
          "<h1>Key Combinations</h1>" +
          "<p>Every key press, key release and typed character of a completed practice lesson is logged in this browser. This page calculates the metrics of every combination of consecutive characters from that log, with any number of characters.</p>" +
          "<p>Both times are measured from the keystroke right before the combination: the time to initiate ends at its first character, and the time to type ends at its last character. The average times and the speed only count the times the combination was typed without errors.</p>" +
          "<p>Click a column to sort by it, and click a combination to see its complete history.</p>"
        }
      />
      {lessons == null ? (
        <LoadingProgress />
      ) : (
        <ComboBrowser lessons={lessons} />
      )}
    </Screen>
  );
}

function useLessons(): readonly LessonSteps[] | null {
  const storage = useTypingLog();
  const [lessons, setLessons] = useState<readonly LessonSteps[] | null>(null);
  useEffect(() => {
    let didCancel = false;
    storage
      .loadLessons()
      .then((lessons) => {
        if (!didCancel) {
          setLessons(lessons);
        }
      })
      .catch(catchError);
    return () => {
      didCancel = true;
    };
  }, [storage]);
  return lessons;
}

const rowsPerPage = 200;

function ComboBrowser({
  lessons,
}: {
  readonly lessons: readonly LessonSteps[];
}): ReactNode {
  const { formatMessage } = useIntl();
  const { compare } = useCollator();
  const { settings } = useSettings();
  const storage = useTypingLog();
  const layoutOptions = useLayoutOptions(lessons);
  const [layout, setLayout] = useState(() => {
    const { id } = settings.get(keyboardProps.layout);
    return layoutOptions.some(({ value }) => value === id)
      ? id
      : (layoutOptions[0]?.value ?? id);
  });
  const [lengthText, setLengthText] = useState("2");
  const [length, setLength] = useState(2);
  const [minCount, setMinCount] = useState("1");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(defaultSort);
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(rowsPerPage);
  const all = useMemo(
    () => computeStats(lessons, layout, length),
    [lessons, layout, length],
  );

  if (lessons.length === 0) {
    return (
      <Para>
        <FormattedMessage
          id="combinations.empty"
          defaultMessage="Nothing is recorded yet. Complete a practice lesson to start the history."
        />
      </Para>
    );
  }

  const stats = sortStats(
    filterStats(all, { minCount: Number(minCount), query }),
    sort,
    compare,
  );
  const lengthError =
    parseLength(lengthText) == null
      ? formatMessage({
          id: "combinations.length.invalid",
          defaultMessage: "Enter a whole number from 1 to 100.",
        })
      : null;

  return (
    <>
      <FieldList>
        <Field>
          <FormattedMessage id="t_Layout:" defaultMessage="Layout:" />
        </Field>
        <Field>
          <OptionList
            options={layoutOptions}
            size={16}
            value={layout}
            onSelect={(value) => {
              setLayout(value);
              setSelected(null);
              setLimit(rowsPerPage);
            }}
          />
        </Field>
        <Field>
          <FormattedMessage
            id="combinations.length.label"
            defaultMessage="Characters:"
          />
        </Field>
        <Field>
          <TextField
            title={formatMessage({
              id: "combinations.length.title",
              defaultMessage:
                "The number of consecutive characters in a combination.",
            })}
            size={6}
            value={lengthText}
            error={lengthError}
            onChange={(value) => {
              setLengthText(value);
              const length = parseLength(value);
              if (length != null) {
                setLength(length);
                setSelected(null);
                setLimit(rowsPerPage);
              }
            }}
          />
        </Field>
        {lengthError != null && (
          <Field>
            <span className={styles.error}>{lengthError}</span>
          </Field>
        )}
        <Field>
          <FormattedMessage
            id="combinations.filter.minCount"
            defaultMessage="Typed at least:"
          />
        </Field>
        <Field>
          <OptionList
            options={["1", "5", "10", "25", "50", "100"].map((value) => ({
              value,
              name: formatMessage(
                {
                  id: "combinations.filter.times",
                  defaultMessage:
                    "{count, plural, one {# time} other {# times}}",
                },
                { count: Number(value) },
              ),
            }))}
            size={10}
            value={minCount}
            onSelect={(value) => {
              setMinCount(value);
            }}
          />
        </Field>
      </FieldList>
      <FieldList>
        <Field>
          <FormattedMessage
            id="combinations.count"
            defaultMessage="Showing {shown, number} of {total, plural, one {# combination} other {# combinations}}."
            values={{ shown: Math.min(limit, stats.length), total: all.length }}
          />
        </Field>
        <Field.Filler />
        <Field>
          <TextField
            placeholder={formatMessage({
              id: "combinations.filter.find",
              defaultMessage: "Find a combination",
            })}
            size={16}
            value={query}
            onChange={(value) => {
              setQuery(value);
            }}
          />
        </Field>
        <Field>
          <Button
            label={formatMessage({
              id: "combinations.download.label",
              defaultMessage: "Download the log",
            })}
            title={formatMessage({
              id: "combinations.download.title",
              defaultMessage:
                "Save every logged lesson with all its key events as a JSON file.",
            })}
            onClick={() => {
              storage
                .loadLogs()
                .then((logs) => {
                  downloadLog(logs);
                })
                .catch(catchError);
            }}
          />
        </Field>
      </FieldList>
      <ComboTable
        lessons={lessons}
        stats={stats.slice(0, limit)}
        sort={sort}
        selected={selected}
        onSort={(key) => {
          setSort(nextSort(sort, key));
        }}
        onSelect={(combo) => {
          setSelected(combo);
        }}
      />
      {stats.length > limit && (
        <Button
          label={formatMessage({
            id: "combinations.showMore",
            defaultMessage: "Show more",
          })}
          onClick={() => {
            setLimit(limit + rowsPerPage);
          }}
        />
      )}
    </>
  );
}

function useLayoutOptions(lessons: readonly LessonSteps[]) {
  const { formatFullLayoutName } = useFormattedNames();
  const { compare } = useCollator();
  return listLayouts(lessons)
    .map((id) => {
      const layout = Layout.ALL.get(id, null);
      return {
        value: id,
        name: layout != null ? formatFullLayoutName(layout) : id,
      };
    })
    .sort((a, b) => compare(a.name, b.name));
}
