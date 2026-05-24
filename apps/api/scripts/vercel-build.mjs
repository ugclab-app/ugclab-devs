import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

for (const ws of ["@ugclab/database", "@ugclab/i18n", "@ugclab/tenant", "@ugclab/api", "@ugclab/platform"]) {
  run(npm, ["run", "build", "-w", ws]);
}
run(process.execPath, [join(root, "apps/api/scripts/copy-platform-public.mjs")]);
