import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

/** Server-side current user (id + timezone), or redirect to login. */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, timezone: true },
  });
  if (!user) redirect("/login");
  return { ...user, timezone: user.timezone || "UTC" };
}
