import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "apps/merchant-web/src"
);

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (name.name.endsWith(".tsx") || name.name.endsWith(".ts")) {
      let t = fs.readFileSync(p, "utf8");
      const n = t
        .replace(/import Link from "next\/link";/g, 'import { Link } from "react-router-dom";')
        .replace(/import { usePathname } from "next\/navigation";/g, 'import { useLocation } from "react-router-dom";')
        .replace(/import { useRouter, useSearchParams } from "next\/navigation";/g, 'import { useNavigate, useSearchParams } from "react-router-dom";')
        .replace(/import { useRouter } from "next\/navigation";/g, 'import { useNavigate } from "react-router-dom";')
        .replace(/import { useSearchParams } from "next\/navigation";/g, 'import { useSearchParams } from "react-router-dom";')
        .replace(/const pathname = usePathname\(\);/g, "const { pathname } = useLocation();")
        .replace(/const router = useRouter\(\);/g, "const navigate = useNavigate();")
        .replace(/router\.push\(/g, "navigate(")
        .replace(/router\.refresh\(\)/g, "void 0")
        .replace(/from "@\/app\/actions\/[^"]+";/g, 'from "@/api/client";')
        .replace(/from "@\/auth";/g, 'from "@/api/client";')
        .replace(/from "@\/lib\/storefront";/g, 'from "@/lib/storefront";')
        .replace(/from "@\/lib\/dashboard-metrics";/g, 'from "@/api/types";')
        .replace(/<motion /g, "<div ")
        .replace(/<motion>/g, "<motion>")
        .replace(/<\/motion>/g, "</div>");
      if (n !== t) fs.writeFileSync(p, n);
    }
  }
}

walk(root);
console.log("patched merchant-web");
