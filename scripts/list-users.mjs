// Lists registered users (email + created date + hash validity).
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const users = await db.user.findMany({
  select: { email: true, name: true, createdAt: true, passwordHash: true },
  orderBy: { createdAt: "desc" },
});
console.log("total users:", users.length);
for (const u of users) {
  const valid = /^\$2[aby]\$\d{2}\$.{53}$/.test(u.passwordHash);
  console.log("-", u.email, "|", u.name ?? "(no name)", "|", u.createdAt.toISOString(), "| hashOK:", valid);
}
await db.$disconnect();
