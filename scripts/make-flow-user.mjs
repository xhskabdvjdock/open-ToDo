// Creates a Supabase test user for the HTTP flow check.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
const email = process.argv[2] || "supabase-flow@example.com";
await db.user.deleteMany({ where: { email } });
await db.user.create({
  data: {
    email,
    name: "Supabase Flow",
    passwordHash: await bcrypt.hash("flow-pass-123", 10),
    timezone: "Asia/Riyadh",
  },
});
console.log("flow user ready:", email);
await db.$disconnect();
