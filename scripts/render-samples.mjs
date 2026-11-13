// Renders scripts/samples/*.html to public/samples/*.png, cropped to the
// page's own height. Needs Google Chrome. Run: node scripts/render-samples.mjs
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = new URL("./samples/", import.meta.url).pathname;
const out = new URL("../public/samples/", import.meta.url).pathname;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".html"))) {
  const url = `file://${join(dir, file)}`;
  // First pass: ask the page how tall it is.
  const dom = execFileSync(chrome, ["--headless=new", "--disable-gpu", "--window-size=850,800", "--virtual-time-budget=2000",
    `--run-all-compositor-stages-before-draw`, "--dump-dom", `${url}#measure`], { encoding: "utf8" });
  const height = Number(dom.match(/data-height="(\d+)"/)?.[1] ?? 1200);
  execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1.5",
    `--window-size=850,${height}`, `--screenshot=${join(out, file.replace(".html", ".png"))}`, url], { stdio: "ignore" });
  console.log(file, height);
}
