import { createContext, type ReactNode, useContext, useState } from "react";
import {
  PersistentTypingLogStorage,
  type TypingLogStorage,
} from "./storage.ts";

export const TypingLogContext = createContext<TypingLogStorage>(null!);

export function useTypingLog(): TypingLogStorage {
  const value = useContext(TypingLogContext);
  if (value == null) {
    throw new Error(
      process.env.NODE_ENV !== "production"
        ? "TypingLogContext is missing"
        : undefined,
    );
  }
  return value;
}

/** Provides the log kept in the browser's IndexedDB. */
export function TypingLogProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode {
  const [storage] = useState(() => new PersistentTypingLogStorage());
  return (
    <TypingLogContext.Provider value={storage}>
      {children}
    </TypingLogContext.Provider>
  );
}
