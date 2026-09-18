// Removes HTTP flow test users from the database.
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const result = await db.user.deleteMany({
  where: { email: { in: ["supabase-flow@example.com", "supabase-check@example.com", "ar-flow@example.com", "lang-flow@example.com"] } },
});
console.log("removed:", result.count);
await db.$disconnect();
