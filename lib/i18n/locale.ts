export type Locale = "ar" | "en";

export const LOCALES: Locale[] = ["ar", "en"];

export function isLocale(v: unknown): v is Locale {
  return v === "ar" || v === "en";
}
