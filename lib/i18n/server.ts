"use server";

import { cookies } from "next/headers";
import ar, { type Dict } from "./ar";
import en from "./en";
import type { Locale } from "./locale";

export async function getLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    return store.get("locale")?.value === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

/** Dictionary for the current request locale (Server Components / Actions). */
export async function getDict(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale();
  return { locale, t: locale === "en" ? en : ar };
}

/** Locale for Server Actions (reads the real user cookie). */
export async function actionLocale(): Promise<Locale> {
  return getLocale();
}
