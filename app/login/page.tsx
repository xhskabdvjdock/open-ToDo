"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useLocale } from "@/components/locale-provider";

export default function LoginPage() {
  const { t } = useLocale();
  const a = t.auth;
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setPending(false);
    if (!res || res.error) {
      setError(a.invalidCreds);
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
          <h1 className="text-lg font-semibold">{a.loginTitle}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {a.loginSub}
          </p>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label={a.email} htmlFor="login-email" required>
              <Input
                id="login-email"
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
            <Field label={a.password} htmlFor="login-password" required>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={a.passwordPh}
                required
              />
            </Field>
            {error ? (
              <p role="alert" className="text-[13px] text-red-600 dark:text-red-400">
                {error}
              </p>
            ) : null}
            <Button variant="primary" type="submit" disabled={pending} className="w-full">
              {pending ? a.signingIn : a.signIn}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {a.noAccount}{" "}
          <Link href="/register" className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100">
            {a.createOne}
          </Link>
        </p>
      </div>
    </main>
  );
}
