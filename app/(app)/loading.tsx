import { getDict } from "@/lib/i18n/server";
import { ListSkeleton } from "@/components/ui/feedback";

export default async function AppLoading() {
  const { t } = await getDict();
  return <ListSkeleton rows={6} label={t.common.loading} />;
}
