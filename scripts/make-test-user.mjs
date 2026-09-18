// Creates a deterministic local test user for the HTTP auth check.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
const email = "http-test@example.com";
await db.user.deleteMany({ where: { email } });
await db.user.create({
  data: {
    email,
    name: "HTTP Tester",
    passwordHash: await bcrypt.hash("test-pass-123", 10),
    timezone: "Asia/Riyadh",
  },
});
console.log("test user ready");
await db.$disconnect();
