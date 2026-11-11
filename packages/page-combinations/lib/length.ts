/** The longest sequence that can be browsed. */
export const maxLength = 100;

/**
 * Parses a sequence length typed by the user.
 * @returns The length, or null if it is not a whole number from 1 to {@link maxLength}.
 */
export function parseLength(value: string): number | null {
  const text = value.trim();
  if (!/^[0-9]+$/.test(text)) {
    return null;
  }
  const length = Number(text);
  return length >= 1 && length <= maxLength ? length : null;
}
