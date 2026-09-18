"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { changePassword, deleteAccount, updateProfile } from "@/features/settings/actions";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import type { Locale } from "@/lib/i18n/locale";

export const TIMEZONES: { value: string; ar: string; en: string }[] = [
  { value: "UTC", ar: "التوقيت العالمي (UTC)", en: "UTC" },
  { value: "Asia/Riyadh", ar: "الرياض", en: "Riyadh" },
  { value: "Asia/Dubai", ar: "دبي", en: "Dubai" },
  { value: "Asia/Kuwait", ar: "الكويت", en: "Kuwait" },
  { value: "Asia/Qatar", ar: "الدوحة", en: "Doha" },
  { value: "Asia/Bahrain", ar: "المنامة", en: "Manama" },
  { value: "Asia/Muscat", ar: "مسقط", en: "Muscat" },
  { value: "Asia/Amman", ar: "عمّان", en: "Amman" },
  { value: "Asia/Beirut", ar: "بيروت", en: "Beirut" },
  { value: "Asia/Damascus", ar: "دمشق", en: "Damascus" },
  { value: "Asia/Jerusalem", ar: "القدس", en: "Jerusalem" },
  { value: "Asia/Baghdad", ar: "بغداد", en: "Baghdad" },
  { value: "Asia/Tehran", ar: "طهران", en: "Tehran" },
  { value: "Asia/Karachi", ar: "كراتشي", en: "Karachi" },
  { value: "Asia/Kolkata", ar: "كولكاتا", en: "Kolkata" },
  { value: "Asia/Dhaka", ar: "دكا", en: "Dhaka" },
  { value: "Asia/Jakarta", ar: "جاكرتا", en: "Jakarta" },
  { value: "Asia/Singapore", ar: "سنغافورة", en: "Singapore" },
  { value: "Asia/Tokyo", ar: "طوكيو", en: "Tokyo" },
  { value: "Asia/Seoul", ar: "سيول", en: "Seoul" },
  { value: "Asia/Shanghai", ar: "شنغهاي", en: "Shanghai" },
  { value: "Australia/Sydney", ar: "سيدني", en: "Sydney" },
  { value: "Pacific/Auckland", ar: "أوكلاند", en: "Auckland" },
  { value: "Europe/London", ar: "لندن", en: "London" },
  { value: "Europe/Paris", ar: "باريس", en: "Paris" },
  { value: "Europe/Berlin", ar: "برلين", en: "Berlin" },
  { value: "Europe/Moscow", ar: "موسكو", en: "Moscow" },
  { value: "Europe/Istanbul", ar: "إسطنبول", en: "Istanbul" },
  { value: "Africa/Cairo", ar: "القاهرة", en: "Cairo" },
  { value: "Africa/Tunis", ar: "تونس", en: "Tunis" },
  { value: "Africa/Algiers", ar: "الجزائر", en: "Algiers" },
  { value: "Africa/Casablanca", ar: "الدار البيضاء", en: "Casablanca" },
  { value: "America/New_York", ar: "نيويورك", en: "New York" },
  { value: "America/Chicago", ar: "شيكاغو", en: "Chicago" },
  { value: "America/Denver", ar: "دنفر", en: "Denver" },
  { value: "America/Los_Angeles", ar: "لوس أنجلوس", en: "Los Angeles" },
  { value: "America/Toronto", ar: "تورونتو", en: "Toronto" },
  { value: "America/Sao_Paulo", ar: "ساو باولو", en: "São Paulo" },
];

function tzLabel(tz: { value: string; ar: string; en: string }, locale: Locale): string {
  return locale === "en" ? tz.en : tz.ar;
}

const KNOWN = new Set(TIMEZONES.map((tz) => tz.value));

export function ProfileForm({ initialName, initialTimezone }: { initialName: string; initialTimezone: string }) {
  const { locale, t } = useLocale();
  const s = t.settings;
  const [name, setName] = React.useState(initialName);
  const [timezone, setTimezone] = React.useState(
    KNOWN.has(initialTimezone) ? initialTimezone : "OTHER",
  );
  const [customTz, setCustomTz] = React.useState(
    KNOWN.has(initialTimezone) ? "" : initialTimezone,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const tz = timezone === "OTHER" ? customTz.trim() : timezone;
    const res = await updateProfile({ name: name.trim() === "" ? undefined : name.trim(), timezone: tz });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    toast.success(s.profileSaved);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={s.name} htmlFor="settings-name">
        <Input
          id="settings-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          placeholder={s.namePh}
          autoComplete="name"
        />
      </Field>
      <Field label={s.timezone} htmlFor="settings-tz" hint={s.timezoneHint}>
        <Select id="settings-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tzLabel(tz, locale)}
            </option>
          ))}
          {!KNOWN.has(initialTimezone) && customTz ? (
            <option value="OTHER">{customTz} ({s.current})</option>
          ) : null}
          <option value="OTHER">{s.other}</option>
        </Select>
      </Field>
      {timezone === "OTHER" ? (
        <Field label={s.customTz} htmlFor="settings-tz-custom" hint={s.customTzHint}>
          <Input
            id="settings-tz-custom"
            value={customTz}
            onChange={(e) => setCustomTz(e.target.value)}
            placeholder="Asia/Riyadh"
            dir="ltr"
          />
        </Field>
      ) : null}
      {error ? (
        <p role="alert" className="text-[13px] text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <Button variant="primary" type="submit" disabled={saving}>
        {saving ? t.common.saving : s.saveProfile}
      </Button>
    </form>
  );
}

export function ThemeSetting() {
  const { t } = useLocale();
  const s = t.settings;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const value = mounted ? (theme ?? "system") : "system";
  const options = [
    { v: "light", label: s.light },
    { v: "dark", label: s.dark },
    { v: "system", label: s.system },
  ];
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={s.appearanceLabel}>
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          onClick={() => {
            setTheme(o.v);
            toast.success(s.themeSet(o.label));
          }}
          className={
            value === o.v
              ? "rounded-lg border border-zinc-900 px-3.5 py-2 text-sm font-medium dark:border-zinc-100"
              : "rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-500 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PasswordForm() {
  const { t } = useLocale();
  const s = t.settings;
  const [currentPassword, setCurrent] = React.useState("");
  const [newPassword, setNew] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await changePassword({ currentPassword, newPassword });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCurrent("");
    setNew("");
    toast.success(s.pwChanged);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={s.currentPw} htmlFor="pw-current" required>
        <Input
          id="pw-current"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </Field>
      <Field label={s.newPw} htmlFor="pw-new" hint={s.newPwHint} required>
        <Input
          id="pw-new"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          required
          minLength={8}
          maxLength={128}
        />
      </Field>
      {error ? (
        <p role="alert" className="text-[13px] text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <Button variant="primary" type="submit" disabled={saving}>
        {saving ? s.updating : s.changePw}
      </Button>
    </form>
  );
}

export function DangerZone() {
  const { t } = useLocale();
  const s = t.settings;
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setError(null);
    const res = await deleteAccount({ password, confirmation });
    // On success the server signs out (redirect); if we are still here it failed.
    setDeleting(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20">
      <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">{s.dangerTitle}</h3>
      <p className="mt-1 text-[13px] text-red-600/90 dark:text-red-400/90">
        {s.dangerDesc}
      </p>
      <Button variant="danger" size="sm" className="mt-3" onClick={() => { setOpen(true); setError(null); }}>
        {s.deleteAccountBtn}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={s.deleteAccountTitle}>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {s.deleteAccountHint.split(s.deleteWord)[0]}
            <code className="rounded bg-zinc-200 px-1 font-mono text-[13px] dark:bg-zinc-800">{s.deleteWord}</code>
            {s.deleteAccountHint.split(s.deleteWord)[1] ?? ""}
          </p>
          <Field label={s.confirmation} htmlFor="del-confirm" required>
            <Input
              id="del-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={s.deleteWord}
              autoComplete="off"
              required
            />
          </Field>
          <Field label={t.auth.password} htmlFor="del-password" required>
            <Input
              id="del-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error ? (
            <p role="alert" className="text-[13px] text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>
              {t.common.cancel}
            </Button>
            <Button variant="danger" type="submit" disabled={deleting || confirmation !== s.deleteWord || password === ""}>
              {deleting ? s.deleting : s.deleteEverything}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function LanguageSetting() {
  const { locale, t, setAppLocale, switching } = useLocale();
  const s = t.settings;
  return (
    <div className="flex gap-2" role="radiogroup" aria-label={s.language}>
      {(
        [
          { v: "ar", label: s.arabic },
          { v: "en", label: s.english },
        ] as const
      ).map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={locale === o.v}
          disabled={switching}
          onClick={() => setAppLocale(o.v)}
          className={
            locale === o.v
              ? "rounded-lg border border-zinc-900 px-3.5 py-2 text-sm font-medium dark:border-zinc-100"
              : "rounded-lg border border-zinc-300 px-3.5 py-2 text-sm text-zinc-500 hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
