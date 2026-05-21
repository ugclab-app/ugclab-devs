import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const D = "div";
const openTag = "<" + D;
const closeTag = "</" + D + ">";

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (["node_modules", ".next", ".git"].includes(name.name)) continue;
      walk(p);
    } else if (name.name.endsWith(".tsx")) {
      const t = fs.readFileSync(p, "utf8");
      const n = t
        .replace(/<motion /g, openTag + " ")
        .replace(/<motion>/g, openTag + ">")
        .replace(/<\/motion>/g, closeTag)
        .replace(/\nfunction motion\([\s\S]*?\n\}\n?/g, "\n");
      if (n !== t) {
        fs.writeFileSync(p, n);
        console.log("fixed", p);
      }
    }
  }
}

walk(path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
