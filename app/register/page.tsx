"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { signIn } from "next-auth/react";
import { register } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useLocale } from "@/components/locale-provider";

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function RegisterPage() {
  const { t } = useLocale();
  const a = t.auth;
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await register({
      name: name.trim() === "" ? undefined : name.trim(),
      email: email.trim(),
      password,
      timezone: detectTimezone(),
    });
    if (!res.ok) {
      setPending(false);
      setError(res.error);
      return;
    }
    // Account created — sign the user in immediately.
    const login = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setPending(false);
    if (!login || login.error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <CheckSquare size={17} aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">{t.brand}</span>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-lg font-semibold">{a.registerTitle}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {a.registerSub}
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label={a.name} htmlFor="register-name" hint={a.nameHint}>
              <Input
                id="register-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={a.namePh}
                maxLength={50}
              />
            </Field>
            <Field label={a.email} htmlFor="register-email" required>
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                maxLength={254}
              />
            </Field>
            <Field label={a.password} htmlFor="register-password" hint={a.passwordHint} required>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={a.passwordChoosePh}
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
            <Button variant="primary" type="submit" disabled={pending} className="w-full">
              {pending ? a.creating : a.createAccount}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {a.haveAccount}{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100">
            {a.signInLink}
          </Link>
        </p>
      </div>
    </main>
  );
}
