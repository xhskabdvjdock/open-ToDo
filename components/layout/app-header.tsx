"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckSquare, Languages, LogOut, Menu, Moon, Plus, Search, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { logout } from "@/features/auth/actions";
import { Avatar } from "@/components/ui/feedback";
import { useLocale } from "@/components/locale-provider";
import { useTaskUI } from "@/components/tasks/task-ui-context";

function ThemeToggle() {
  const { t } = useLocale();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const dark = (theme === "system" ? resolvedTheme : theme) === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? t.header.toLight : t.header.toDark}
      title={dark ? t.header.lightMode : t.header.darkMode}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {mounted ? (dark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />) : null}
    </button>
  );
}

function LanguageToggle() {
  const { locale, t, setAppLocale, switching } = useLocale();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      onClick={() => setAppLocale(next)}
      disabled={switching}
      aria-label={t.header.switchLanguage}
      title={t.header.switchLanguage}
      className="flex h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      <Languages size={16} aria-hidden />
      {t.header.languageShort}
    </button>
  );
}

function GlobalSearch() {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = React.useState(params.get("q") ?? "");
  const timer = React.useRef<number | null>(null);

  // Reset the box when leaving the search page (render-time adjustment).
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (pathname !== "/search") setValue("");
  }

  function onChange(v: string) {
    setValue(v);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const q = v.trim();
      router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { scroll: false });
    }, 300);
  }

  return (
    <div className="relative hidden flex-1 sm:block sm:max-w-md">
      <Search
        size={15}
        aria-hidden
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-zinc-400"
      />
      <label htmlFor="global-search" className="sr-only">
        {t.header.searchLabel}
      </label>
      <input
        id="global-search"
        data-global-search
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.header.searchPlaceholder}
        maxLength={100}
        autoComplete="off"
        className="h-9 w-full rounded-lg border border-transparent bg-zinc-200/50 pe-3 ps-9 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white dark:bg-zinc-800/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-700 dark:focus:bg-zinc-900"
      />
    </div>
  );
}

export function AppHeader({
  user,
  onMenu,
}: {
  user: { name?: string | null; email?: string | null; username?: string | null };
  onMenu: () => void;
}) {
  const { t } = useLocale();
  const { openCreate } = useTaskUI();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white/90 px-3 backdrop-blur sm:px-5 dark:border-zinc-800 dark:bg-zinc-950/90">
      <button
        type="button"
        onClick={onMenu}
        aria-label={t.nav.openNavigation}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-200/60 lg:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Menu size={19} aria-hidden />
      </button>
      <Link href="/dashboard" className="flex items-center gap-2 lg:hidden" aria-label={t.brandHome}>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
          <CheckSquare size={16} aria-hidden />
        </span>
      </Link>

      <GlobalSearch />

      <div className="ms-auto flex items-center gap-1">
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          <Plus size={16} aria-hidden />
          <span className="hidden sm:inline">{t.header.addTask}</span>
          <kbd aria-hidden className="hidden rounded bg-white/20 px-1 text-[10px] md:inline dark:bg-zinc-900/10">
            N
          </kbd>
        </button>
        <LanguageToggle />
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t.header.accountMenu}
            className="rounded-full p-0.5"
          >
            <Avatar name={user.name} email={user.email} />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="anim-pop-in absolute end-0 top-10 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {user.name ?? t.header.account}
                </p>
                {user.username ? (
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" dir="ltr">
                    @{user.username}
                  </p>
                ) : null}
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400" dir="ltr">{user.email}</p>
              </div>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Settings size={15} aria-hidden />
                {t.header.settings}
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <LogOut size={15} aria-hidden />
                  {t.header.signOut}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
