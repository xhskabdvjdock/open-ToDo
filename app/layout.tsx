import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LocaleProvider } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n/locale";

export async function generateMetadata(): Promise<Metadata> {
  let locale: Locale = "ar";
  try {
    locale = (await cookies()).get("locale")?.value === "en" ? "en" : "ar";
  } catch {
    locale = "ar";
  }
  return {
    title: {
      default: locale === "ar" ? "open ToDo — إدارة المهام" : "open ToDo — Task Management",
      template: "%s · open ToDo",
    },
    description:
      locale === "ar"
        ? "open ToDo تطبيق هادئ وسريع لإدارة المهام: نظّم مهامك في مشاريع، وتابع تواريخ الاستحقاق والأولويات، وتقدّمك الحقيقي."
        : "open ToDo is a calm, fast task manager: organize tasks into projects, track due dates and priorities, and follow real progress.",
    applicationName: "open ToDo",
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let locale: Locale = "ar";
  try {
    locale = (await cookies()).get("locale")?.value === "en" ? "en" : "ar";
  } catch {
    locale = "ar";
  }
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} suppressHydrationWarning>
      <body className="bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
