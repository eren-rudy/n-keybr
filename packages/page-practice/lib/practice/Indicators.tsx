import { DailyGoalRow, GaugeRow, names, StreakListRow } from "@keybr/lesson-ui";
import { memo, type ReactNode } from "react";
import * as styles from "./Indicators.module.less";
import { type LessonState } from "./state/index.ts";

export const Indicators = memo(function Indicators({
  state: { summaryStats, streakList, dailyGoal },
}: {
  readonly state: LessonState;
}): ReactNode {
  return (
    <div id={names.indicators} className={styles.indicators}>
      <GaugeRow summaryStats={summaryStats} names={names} />
      <StreakListRow streakList={streakList} names={names} />
      {dailyGoal.goal > 0 && (
        <DailyGoalRow dailyGoal={dailyGoal} names={names} />
      )}
    </div>
  );
});
