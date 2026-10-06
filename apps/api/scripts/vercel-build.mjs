import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(cmd, args, extraEnv) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

for (const ws of ["@ugclab/database", "@ugclab/i18n", "@ugclab/tenant", "@ugclab/api", "@ugclab/platform"]) {
  run(npm, ["run", "build", "-w", ws]);
}
run(npm, ["run", "build:web", "-w", "@ugclab/storefront"]);
run(npm, ["run", "build:web", "-w", "@ugclab/platform-admin"], {
  PLATFORM_ADMIN_BASE: "/platform/",
});
const copyScript = join(root, "apps/api/scripts/copy-platform-public.mjs");
const copy = spawnSync(process.execPath, [copyScript], { cwd: root, stdio: "inherit", shell: false });
if (copy.status !== 0) process.exit(copy.status ?? 1);
const copyStore = spawnSync(process.execPath, [join(root, "apps/api/scripts/copy-storefront-public.mjs")], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});
if (copyStore.status !== 0) process.exit(copyStore.status ?? 1);
const copyPlatformAdmin = spawnSync(
  process.execPath,
  [join(root, "apps/api/scripts/copy-platform-admin-public.mjs")],
  { cwd: root, stdio: "inherit", shell: false }
);
if (copyPlatformAdmin.status !== 0) process.exit(copyPlatformAdmin.status ?? 1);
