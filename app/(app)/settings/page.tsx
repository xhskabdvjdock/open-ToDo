import type { Metadata } from "next";
import { currentUser } from "@/lib/current-user";
import { getDict } from "@/lib/i18n/server";
import { PageHeader } from "@/components/tasks/page-header";
import { DangerZone, LanguageSetting, PasswordForm, ProfileForm, ThemeSetting } from "@/components/settings/settings-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.settings.title };
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <p className="mb-4 mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">{description}</p>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const user = await currentUser();
  const { t } = await getDict();
  const s = t.settings;

  return (
    <div>
      <PageHeader title={s.title} description={s.desc} />
      <div className="space-y-3">
        <Card title={s.profile} description={s.profileDesc}>
          <ProfileForm
            initialName={user.name ?? ""}
            initialUsername={user.username ?? ""}
            initialTimezone={user.timezone}
          />
        </Card>
        <Card title={s.appearance} description={s.appearanceDesc}>
          <ThemeSetting />
        </Card>
        <Card title={s.language} description={s.languageDesc}>
          <LanguageSetting />
        </Card>
        <Card title={s.password} description={s.passwordDesc}>
          <PasswordForm />
        </Card>
        <Card title={s.account} description={s.signedInAs(user.email ?? "")}>
          <DangerZone />
        </Card>
      </div>
    </div>
  );
}
