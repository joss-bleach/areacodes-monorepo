#!/usr/bin/env bun
// Provisions an admin user in better-auth via the seedAdminUser internal mutation.
// Usage: bun run add-admin --email foo@example.com --name "Foo Bar"
//        bun run add-admin <email> --name "Foo Bar" --prod

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

function readEnvFile(path: string): Record<string, string> {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const idx = l.indexOf("=");
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const email = getArg("--email") ?? args.find((a) => !a.startsWith("--") && a.includes("@"));
const name = getArg("--name");
const prod = args.includes("--prod");

if (!email || !name) {
  console.error("Usage: bun run add-admin --email <email> --name <name> [--prod]");
  console.error("       bun run add-admin <email> --name <name> [--prod]");
  process.exit(1);
}

// Pull CONVEX_DEPLOY_KEY from apps/admin/.env (dev) or .env.production (prod)
const root = resolve(import.meta.dir, "..");
const adminEnv = prod
  ? readEnvFile(resolve(root, "apps/admin/.env.production"))
  : readEnvFile(resolve(root, "apps/admin/.env"));

const deployKey = adminEnv.CONVEX_DEPLOY_KEY ?? process.env.CONVEX_DEPLOY_KEY;
if (!deployKey) {
  console.error("CONVEX_DEPLOY_KEY not found in apps/admin/.env - run `npx convex login` first");
  process.exit(1);
}

const payload = JSON.stringify({ email, name });
const prodFlag = prod ? " --prod" : "";

console.log(`Provisioning admin user: ${name} <${email}>${prod ? " (production)" : " (dev)"}...`);

try {
  const result = execSync(
    `npx convex run functions/seed:seedAdminUser '${payload}'${prodFlag}`,
    {
      cwd: resolve(root, "packages/convex"),
      stdio: "pipe",
      env: { ...process.env, CONVEX_DEPLOY_KEY: deployKey },
    },
  ).toString();

  const parsed = JSON.parse(result);
  if (parsed.skipped) {
    console.log(`Skipped - user already exists: ${email}`);
  } else {
    console.log(`Done - admin user created: ${email}`);
  }
} catch (err: unknown) {
  const error = err as { stderr?: Buffer; stdout?: Buffer };
  console.error("Failed:", error.stderr?.toString() ?? error.stdout?.toString() ?? err);
  process.exit(1);
}
