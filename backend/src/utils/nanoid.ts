/**
 * Tiny inlined nanoid-like generator to avoid ESM/CJS interop friction.
 * The returned function accepts an optional size override to keep the API
 * ergonomic (matches nanoid's `customAlphabet(alphabet, defaultSize)`).
 */
import { randomBytes } from "crypto";

export function customAlphabet(alphabet: string, defaultSize: number): (size?: number) => string {
  const len = alphabet.length;
  return (size?: number): string => {
    const n = size ?? defaultSize;
    const bytes = randomBytes(n);
    let out = "";
    for (let i = 0; i < n; i++) {
      out += alphabet[bytes[i] % len];
    }
    return out;
  };
}
