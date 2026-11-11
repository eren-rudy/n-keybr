import { type LessonLog } from "@keybr/typing-log";

/**
 * Makes the contents of a file with the whole log. Times in the log are in
 * milliseconds: `startedAt` since the Unix epoch (UTC), and every other time
 * since the start of its lesson.
 */
export function formatLog(
  logs: readonly LessonLog[],
  exportedAt = new Date(),
): string {
  return JSON.stringify(
    { format: "typing-log", version: 1, exportedAt, lessons: logs },
    null,
    1,
  );
}

/** Lets the user save the whole log as a JSON file. */
export function downloadLog(logs: readonly LessonLog[]): void {
  const blob = new Blob([formatLog(logs)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = "typing-log.json";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
