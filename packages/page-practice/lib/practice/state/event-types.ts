import { type Result } from "@keybr/result";

export type TopSpeedEvent = {
  readonly type: "top-speed";
  readonly speed: number;
  readonly previous: number;
};

export type TopScoreEvent = {
  readonly type: "top-score";
  readonly score: number;
  readonly previous: number;
};

export type DailyGoalEvent = {
  readonly type: "daily-goal";
};

export type LessonEvent = TopSpeedEvent | TopScoreEvent | DailyGoalEvent;

export type LessonEventListener = (event: LessonEvent) => void;

export type LessonEventSource = {
  append(result: Result, listener: LessonEventListener): void;
};
