import { createContext, type ReactNode, useContext, useState } from "react";
import { type ComboStorage, PersistentComboStorage } from "./storage.ts";

export const ComboStorageContext = createContext<ComboStorage>(null!);

export function useComboStorage(): ComboStorage {
  const value = useContext(ComboStorageContext);
  if (value == null) {
    throw new Error(
      process.env.NODE_ENV !== "production"
        ? "ComboStorageContext is missing"
        : undefined,
    );
  }
  return value;
}

/** Provides the history kept in the browser's IndexedDB. */
export function ComboStorageProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode {
  const [storage] = useState(() => new PersistentComboStorage());
  return (
    <ComboStorageContext.Provider value={storage}>
      {children}
    </ComboStorageContext.Provider>
  );
}
