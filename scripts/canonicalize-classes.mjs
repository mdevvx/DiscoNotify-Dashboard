// Rewrites Tailwind class strings to their canonical (current) form, using Tailwind's own design-system API:
// the same engine behind the editor hint "The class X can be written as Y".
//   node scripts/canonicalize-classes.mjs          fix files in place
//   node scripts/canonicalize-classes.mjs --check  only report (exit 1 when something would change)
import fs from "node:fs";
import path from "node:path";
import { __unstable__loadDesignSystem } from "tailwindcss";

const check = process.argv.includes("--check");
const root = process.cwd();
const css = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const ds = await __unstable__loadDesignSystem(css, {
  base: root,
  loadStylesheet: async (id, base) => ({
    path: id,
    base,
    content: id === "tailwindcss" ? fs.readFileSync(path.join(root, "node_modules/tailwindcss/index.css"), "utf8") : "",
  }),
});

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name === ".next" ? [] : walk(p);
    return /\.(tsx|ts)$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

// Whole template literals are matched (so a closing backtick is never mistaken for an opening one); ones that interpolate are skipped below.
const STRING = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
let changes = 0;

for (const file of walk(path.join(root, "src"))) {
  const src = fs.readFileSync(file, "utf8");
  const out = src.replace(STRING, (whole, d, sq, t, offset) => {
    const body = d ?? sq ?? t;
    if (body === undefined || !/\S/.test(body)) return whole;
    // import / export specifiers are not class lists
    const before = src.slice(Math.max(0, offset - 12), offset);
    if (/from\s*$/.test(before) || /import\s*$/.test(before)) return whole;
    const tokens = body.split(/\s+/).filter(Boolean);
    if (tokens.length === 0 || tokens.length > 80) return whole;
    if (t !== undefined && body.includes("${")) return whole;
    // Only class lists: every word must be a valid Tailwind utility/variant combination (so prose and code are never touched).
    if (!tokens.every((tok) => { try { return ds.parseCandidate(tok).length > 0; } catch { return false; } })) return whole;
    let next;
    try {
      next = ds.canonicalizeCandidates(tokens, { collapse: true, rem: 16 });
    } catch {
      return whole;
    }
    const same = next.length === tokens.length && next.every((x, i) => x === tokens[i]);
    if (same) return whole;
    // Only accept when each output token is either an input token or a rewrite of class-looking text.
    const joined = next.join(" ");
    changes++;
    console.log(`${path.relative(root, file)}\n  - ${body}\n  + ${joined}`);
    const q = d !== undefined ? '"' : sq !== undefined ? "'" : "`";
    return q + joined + q;
  });
  if (!check && out !== src) fs.writeFileSync(file, out, "utf8");
}

console.log(changes === 0 ? "All classes are already canonical." : `${changes} class string(s) ${check ? "need" : "were"} updating.`);
if (check && changes > 0) process.exit(1);
