import { PracticePage } from "@keybr/page-practice";
import { ResultLoader } from "@keybr/result-loader";
import { TypingLogProvider } from "@keybr/typing-log";

export default function Page() {
  return (
    <ResultLoader>
      <TypingLogProvider>
        <PracticePage />
      </TypingLogProvider>
    </ResultLoader>
  );
}
