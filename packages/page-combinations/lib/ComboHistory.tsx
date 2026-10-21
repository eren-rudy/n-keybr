import { type ComboSample, useComboStorage } from "@keybr/combo-history";
import { catchError } from "@keybr/debug";
import { LoadingProgress } from "@keybr/pages-shared";
import { Button } from "@keybr/widget";
import { type ReactNode, useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import * as styles from "./ComboTable.module.less";
import { formatCombo, formatUtc, useFormatMilliseconds } from "./format.ts";

const pageSize = 100;

/** Shows every sample of one combination, the most recent first. */
export function ComboHistory({
  layout,
  combo,
}: {
  readonly layout: string;
  readonly combo: string;
}): ReactNode {
  const { formatMessage } = useIntl();
  const formatTime = useFormatMilliseconds();
  const storage = useComboStorage();
  const [samples, setSamples] = useState<readonly ComboSample[] | null>(null);
  const [limit, setLimit] = useState(pageSize);
  useEffect(() => {
    let didCancel = false;
    storage
      .loadSamples(layout, combo)
      .then((samples) => {
        if (!didCancel) {
          setSamples([...samples].reverse());
        }
      })
      .catch(catchError);
    return () => {
      didCancel = true;
    };
  }, [storage, layout, combo]);
  if (samples == null) {
    return <LoadingProgress />;
  }
  return (
    <div className={styles.history}>
      <p>
        <FormattedMessage
          id="combinations.history.caption"
          defaultMessage="Every time {combo} was typed, the most recent first."
          values={{ combo: <strong>{formatCombo(combo)}</strong> }}
        />
      </p>
      <table className={styles.historyTable}>
        <thead>
          <tr>
            <th>
              <FormattedMessage
                id="combinations.history.column.completedAt"
                defaultMessage="Completed (UTC)"
              />
            </th>
            <th className={styles.numeric}>
              <FormattedMessage
                id="combinations.column.timeToInitiate"
                defaultMessage="Time to initiate"
              />
            </th>
            <th className={styles.numeric}>
              <FormattedMessage
                id="combinations.column.timeToType"
                defaultMessage="Time to type"
              />
            </th>
            <th>
              <FormattedMessage
                id="combinations.history.column.result"
                defaultMessage="Result"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {samples.slice(0, limit).map((sample, index) => (
            <tr key={index}>
              <td>{formatUtc(sample.completedAt, "milliseconds")}</td>
              <td className={styles.numeric}>
                {formatTime(sample.timeToInitiate)}
              </td>
              <td className={styles.numeric}>
                {formatTime(sample.timeToType)}
              </td>
              {sample.miss ? (
                <td className={styles.miss}>
                  <FormattedMessage
                    id="combinations.history.miss"
                    defaultMessage="Miss"
                  />
                </td>
              ) : (
                <td className={styles.hit}>
                  <FormattedMessage
                    id="combinations.history.correct"
                    defaultMessage="Correct"
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {samples.length > limit && (
        <Button
          label={formatMessage({
            id: "combinations.showMore",
            defaultMessage: "Show more",
          })}
          onClick={() => {
            setLimit(limit + pageSize);
          }}
        />
      )}
    </div>
  );
}
