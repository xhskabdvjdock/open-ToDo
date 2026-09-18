"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import ar, { type Dict } from "@/lib/i18n/ar";
import en from "@/lib/i18n/en";
import { setLocale } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/locale";

type LocaleCtx = {
  locale: Locale;
  t: Dict;
  setAppLocale: (next: Locale) => Promise<void>;
  switching: boolean;
};

const Ctx = React.createContext<LocaleCtx | null>(null);

export function LocaleProvider({
  locale: initial,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = React.useState<Locale>(initial);
  const [switching, setSwitching] = React.useState(false);

  // Follow server-driven locale (cookie) without an effect.
  const [lastInitial, setLastInitial] = React.useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setLocaleState(initial);
  }

  const value = React.useMemo<LocaleCtx>(
    () => ({
      locale,
      t: locale === "en" ? en : ar,
      switching,
      setAppLocale: async (next) => {
        if (next === locale) return;
        setSwitching(true);
        // Apply instantly for responsiveness, then persist + re-render.
        document.documentElement.lang = next;
        document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
        setLocaleState(next);
        await setLocale(next);
        setSwitching(false);
        router.refresh();
      },
    }),
    [locale, switching, router],
  );

  return (
    <Ctx.Provider value={value}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster
          position={locale === "ar" ? "bottom-left" : "bottom-right"}
          gap={8}
          closeButton
          toastOptions={{ style: { fontSize: 13 } }}
        />
      </ThemeProvider>
    </Ctx.Provider>
  );
}

export function useLocale(): LocaleCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used inside LocaleProvider");
  return ctx;
}
