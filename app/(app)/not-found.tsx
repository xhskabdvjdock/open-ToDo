"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

export default function AppNotFound() {
  const { t } = useLocale();
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
      <FileQuestion size={22} className="text-zinc-400" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold">{t.states.notFoundTitle}</h2>
      <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
        {t.states.notFoundDesc}
      </p>
      <Link href="/dashboard" className="mt-4">
        <Button variant="primary" size="sm">
          {t.common.backToDashboard}
        </Button>
      </Link>
    </div>
  );
}
