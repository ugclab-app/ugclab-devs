/**
 * Windows: Prisma generate fails with EPERM if API/Vite still holds query_engine DLL.
 * Stops listeners on dev ports, then runs db:generate.
 *
 * Usage: npm run db:generate:safe
 */
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { platform } from "os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ports = [4000, 3001, 3002, 3003];

if (platform() === "win32") {
  console.log("Stopping dev servers on ports", ports.join(", "), "…");
  for (const port of ports) {
    try {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "ignore" }
      );
    } catch {
      /* port free */
    }
  }
  execSync('powershell -NoProfile -Command "Start-Sleep -Seconds 2"', {
    stdio: "ignore",
  });
}

console.log("Running prisma generate…");
execSync("npm run db:generate -w @ugclab/database", {
  cwd: root,
  stdio: "inherit",
});
