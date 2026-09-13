import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { z } from "zod";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

function hiddenPassword(prompt: string): Promise<string> {
  if (!stdin.isTTY) throw new Error("Set ADMIN_PASSWORD when running without an interactive terminal.");
  stdout.write(prompt);
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => { stdin.off("keypress", onKey); stdin.setRawMode(false); stdin.pause(); stdout.write("\n"); };
    function onKey(text: string, key: { name?: string; ctrl?: boolean; sequence?: string }) {
      if (key.ctrl && key.name === "c") { finish(); reject(new Error("Cancelled.")); }
      else if (key.name === "return" || key.name === "enter") { finish(); resolve(value); }
      else if (key.name === "backspace") value = value.slice(0, -1);
      else if (!key.ctrl && text && !/[\u0000-\u001f\u007f]/.test(text)) value += text;
    }
    stdin.on("keypress", onKey);
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log("npm run admin:create -- [--email <address>] [--update-password]\nSet DATABASE_URL in .env. Enter a password securely when prompted, or set ADMIN_PASSWORD.\nPasswords must contain 12–128 characters. Existing accounts require --update-password.");
    return;
  }
  if (!process.env.DATABASE_URL?.trim()) throw new Error("Add DATABASE_URL to .env, then run npm run db:migrate first.");
  const emailIndex = args.indexOf("--email");
  let email = emailIndex >= 0 ? args[emailIndex + 1] : process.env.ADMIN_EMAIL;
  if (!email && stdin.isTTY) {
    const terminal = createInterface({ input: stdin, output: stdout });
    email = await terminal.question("Admin email: ");
    terminal.close();
  }
  const normalizedEmail = z.email().max(254).parse(email?.trim().toLowerCase());
  const password = process.env.ADMIN_PASSWORD || await hiddenPassword("Admin password (input hidden): ");
  if (password.length < 12 || password.length > 128) throw new Error("Use a password containing 12–128 characters.");
  if (!process.env.ADMIN_PASSWORD && password !== await hiddenPassword("Confirm password: ")) throw new Error("Passwords do not match.");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, max: 1 }) });
  try {
    const existing = await db.admin.findUnique({ where: { email: normalizedEmail } });
    if (existing && !args.includes("--update-password")) throw new Error("That admin already exists. Use --update-password to rotate its password and revoke its sessions.");
    const passwordHash = await hashPassword(password);
    if (existing) {
      await db.$transaction([
        db.admin.update({ where: { id: existing.id }, data: { passwordHash } }),
        db.session.deleteMany({ where: { adminId: existing.id } })
      ]);
      console.log(`Password updated for ${normalizedEmail}. Existing sessions revoked.`);
    } else {
      await db.admin.create({ data: { email: normalizedEmail, passwordHash } });
      console.log(`Admin created: ${normalizedEmail}`);
    }
  } finally { await db.$disconnect(); }
}

main().catch(error => {
  console.error(error instanceof z.ZodError ? "Enter a valid admin email address." : error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL]") : "Unable to provision admin.");
  process.exitCode = 1;
});
