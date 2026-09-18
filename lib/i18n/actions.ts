"use server";

import { cookies } from "next/headers";
import { isLocale, type Locale } from "./locale";

/** Persist the interface language. Called from the header toggle. */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set("locale", locale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
    sameSite: "lax",
  });
}
