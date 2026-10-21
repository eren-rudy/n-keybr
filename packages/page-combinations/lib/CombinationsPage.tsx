import {
  type ComboSummary,
  makeComboStats,
  useComboStorage,
} from "@keybr/combo-history";
import { catchError } from "@keybr/debug";
import { useCollator } from "@keybr/intl";
import { keyboardProps, Layout, useFormattedNames } from "@keybr/keyboard";
import { LoadingProgress, Screen } from "@keybr/pages-shared";
import { useSettings } from "@keybr/settings";
import {
  Button,
  Field,
  FieldList,
  OptionList,
  Para,
  TextField,
} from "@keybr/widget";
import { type ReactNode, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { ComboTable } from "./ComboTable.tsx";
import { defaultSort, filterStats, nextSort, sortStats } from "./sort.ts";

export function CombinationsPage(): ReactNode {
  const summaries = useSummaries();
  return (
    <Screen>
      <FormattedMessage
        id="page.combinations.content"
        defaultMessage={
          "<h1>Key Combinations</h1>" +
          "<p>Every single key and every pair of consecutive keys that you type in a completed practice lesson is saved in this browser. Both times are measured from the keystroke right before the combination: the time to initiate ends at its first key, and the time to type ends at its last key. The average times and the speed only count the times the combination was typed without errors.</p>" +
          "<p>Click a column to sort by it, and click a combination to see its complete history.</p>"
        }
      />
      {summaries == null ? (
        <LoadingProgress />
      ) : (
        <ComboBrowser summaries={summaries} />
      )}
    </Screen>
  );
}

function useSummaries(): readonly ComboSummary[] | null {
  const storage = useComboStorage();
  const [summaries, setSummaries] = useState<readonly ComboSummary[] | null>(
    null,
  );
  useEffect(() => {
    let didCancel = false;
    storage
      .loadSummaries()
      .then((summaries) => {
        if (!didCancel) {
          setSummaries(summaries);
        }
      })
      .catch(catchError);
    return () => {
      didCancel = true;
    };
  }, [storage]);
  return summaries;
}

const rowsPerPage = 200;

function ComboBrowser({
  summaries,
}: {
  readonly summaries: readonly ComboSummary[];
}): ReactNode {
  const { formatMessage } = useIntl();
  const { compare } = useCollator();
  const { settings } = useSettings();
  const layoutOptions = useLayoutOptions(summaries);
  const [layout, setLayout] = useState(() => {
    const { id } = settings.get(keyboardProps.layout);
    return layoutOptions.some(({ value }) => value === id)
      ? id
      : (layoutOptions[0]?.value ?? id);
  });
  const [keys, setKeys] = useState("all");
  const [minCount, setMinCount] = useState("1");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(defaultSort);
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(rowsPerPage);

  if (summaries.length === 0) {
    return (
      <Para>
        <FormattedMessage
          id="combinations.empty"
          defaultMessage="Nothing is recorded yet. Complete a practice lesson to start the history."
        />
      </Para>
    );
  }

  const all = summaries
    .filter((summary) => summary.layout === layout)
    .map(makeComboStats);
  const stats = sortStats(
    filterStats(all, {
      length: keys === "all" ? null : Number(keys),
      minCount: Number(minCount),
      query,
    }),
    sort,
    compare,
  );

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
            }}
          />
        </Field>
        <Field>
          <FormattedMessage
            id="combinations.filter.keys"
            defaultMessage="Keys:"
          />
        </Field>
        <Field>
          <OptionList
            options={[
              {
                value: "all",
                name: formatMessage({
                  id: "t_All_keys",
                  defaultMessage: "All keys",
                }),
              },
              {
                value: "1",
                name: formatMessage({
                  id: "combinations.filter.singleKeys",
                  defaultMessage: "Single keys",
                }),
              },
              {
                value: "2",
                name: formatMessage({
                  id: "combinations.filter.keyPairs",
                  defaultMessage: "Key pairs",
                }),
              },
            ]}
            size={10}
            value={keys}
            onSelect={(value) => {
              setKeys(value);
            }}
          />
        </Field>
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
      </FieldList>
      <ComboTable
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

function useLayoutOptions(summaries: readonly ComboSummary[]) {
  const { formatFullLayoutName } = useFormattedNames();
  const { compare } = useCollator();
  return [...new Set(summaries.map(({ layout }) => layout))]
    .map((id) => {
      const layout = Layout.ALL.get(id, null);
      return {
        value: id,
        name: layout != null ? formatFullLayoutName(layout) : id,
      };
    })
    .sort((a, b) => compare(a.name, b.name));
}
