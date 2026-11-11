import { test } from "node:test";
import { deepEqual } from "rich-assert";
import { formatLog } from "./download.ts";

test("format the log", () => {
  const log = {
    layout: "en-us",
    startedAt: 1000,
    codePoints: [0x61],
    times: [5],
    typos: [false],
    events: [
      {
        type: "input",
        time: 5,
        inputType: "appendChar",
        codePoint: 0x61,
      } as const,
    ],
  };
  deepEqual(JSON.parse(formatLog([log], new Date(2000))), {
    format: "typing-log",
    version: 1,
    exportedAt: "1970-01-01T00:00:02.000Z",
    lessons: [log],
  });
});
