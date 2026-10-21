import { ComboStorageProvider } from "@keybr/combo-history";
import { CombinationsPage } from "@keybr/page-combinations";

export default function Page() {
  return (
    <ComboStorageProvider>
      <CombinationsPage />
    </ComboStorageProvider>
  );
}
