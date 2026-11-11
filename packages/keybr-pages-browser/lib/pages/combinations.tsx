import { CombinationsPage } from "@keybr/page-combinations";
import { TypingLogProvider } from "@keybr/typing-log";

export default function Page() {
  return (
    <TypingLogProvider>
      <CombinationsPage />
    </TypingLogProvider>
  );
}
