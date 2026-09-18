"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center rounded-xl border border-zinc-200 px-6 py-12 text-center dark:border-zinc-800">
      <TriangleAlert size={22} className="text-red-500" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold">{t.states.errorTitle}</h2>
      <p className="mt-1 max-w-sm text-[13px] text-zinc-500 dark:text-zinc-400">
        {error.message === "UNAUTHORIZED" ? t.states.errorAuth : t.states.errorGeneric}
      </p>
      <Button variant="primary" size="sm" className="mt-4" onClick={reset}>
        {t.common.retry}
      </Button>
    </div>
  );
}
