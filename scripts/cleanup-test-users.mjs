// Removes leftover manual test accounts (keeps the DB clean).
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const result = await db.user.deleteMany({
  where: { email: { in: ["http-test@example.com"] } },
});
console.log("removed:", result.count);
await db.$disconnect();
