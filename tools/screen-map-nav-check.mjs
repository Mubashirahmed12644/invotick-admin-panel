#!/usr/bin/env node
/**
 * Walks the Screen Map's navigation map and fails on any dead end.
 *
 * ## Why this exists
 *
 * The owner opened the Add Business logo sheet on the Screen Map and found "—" beside Gallery, Camera and the sheet's
 * ✕: the page only knew where a tap led when the NEXT screen_view arrived within 2 s. Closing a sheet sends no
 * screen_view for the screen underneath, and the phone's gallery is not our screen at all, so every backward point and
 * every trip outside the app read as "leads nowhere". The map (`features/screen-map/navmap.data.ts`) is read from the
 * app's code instead; this check proves it has no holes, with the same functions the page uses (`navmap.ts`).
 *
 * It asserts, for every screen in the map:
 * - every tappable control of its picture is covered by a point (a navigation point or a "stays here" control);
 * - every navigation point has a destination: one of our screens, the screen it returns to, or a named place outside
 *   the app; a conditional point names each branch;
 * - every destination is a screen in the map (a pictured one, or an `off:` screen the app has and the pipeline has not
 *   pictured yet — counted on its own line);
 * - every screen but the root has a way back, every screen can be reached by tapping from the root, and every screen
 *   can get back to the start.
 *
 * With `--out <dir>` (a screenshot-pipeline release folder, e.g. kaam/screen-map/out/113) it also re-reads that
 * release's bounds files and fails when a picture's controls differ from the ones the map was made against — the
 * signal that a new release needs its map brought up to date.
 *
 * Run: `npm run check:screen-map-nav` (add `-- --out ../kaam/screen-map/out/113` to compare with a release folder).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NAV } from "../features/screen-map/navmap.data.ts";
import { checkNav } from "../features/screen-map/navmap.ts";

const { counts, problems } = checkNav(NAV);

// Optional: the release folder the map should agree with.
const outAt = process.argv.indexOf("--out");
let drift = 0;
if (outAt > 0 && process.argv[outAt + 1]) {
  const dir = process.argv[outAt + 1];
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  if (manifest.versionCode !== NAV.versionCode) {
    console.log(`  note  the folder is release ${manifest.versionCode}; the map was made for ${NAV.versionCode}`);
  }
  for (const sc of manifest.screens) {
    const mapped = NAV.screens[sc.screen];
    if (!mapped || !mapped.pictured) {
      drift++;
      console.log(`  DRIFT ${sc.screen}: pictured in the release, not in the map`);
      continue;
    }
    const keys = new Set();
    for (const themes of Object.values(sc.states)) {
      const b = JSON.parse(readFileSync(join(dir, themes.light.bounds), "utf8"));
      const top = Math.max(0, ...b.controls.map((c) => c.window ?? 0));
      for (const c of b.controls) {
        if ((c.window ?? 0) !== top) continue;
        keys.add(c.event || (c.label && c.label.trim() ? `label:${c.label}` : `nolabel@${c.bounds.join(",")}`));
      }
    }
    const have = new Set(mapped.controls.map((c) => c.key));
    for (const k of keys) if (!have.has(k)) { drift++; console.log(`  DRIFT ${sc.screen}: control "${k}" is new`); }
    for (const k of have) if (!keys.has(k)) { drift++; console.log(`  DRIFT ${sc.screen}: control "${k}" is gone`); }
  }
  for (const [k, s] of Object.entries(NAV.screens)) {
    if (s.pictured && !manifest.screens.some((sc) => sc.screen === k)) { drift++; console.log(`  DRIFT ${k}: in the map as pictured, not in the release`); }
  }
}

for (const p of problems) console.log(`  FAIL  ${p.screen}: ${p.what}`);

console.log("");
console.log(`Screen Map navigation — release ${NAV.versionCode} (${NAV.appBranch}), root ${NAV.root}`);
console.log(`  screens      ${counts.screens}  (pictured ${counts.pictured}, off-manifest ${counts.offManifest})`);
console.log(`  controls     ${counts.controls}  (every tappable control of every picture)`);
console.log(`  points       ${counts.points}  navigation points (plus ${counts.stay} stays-here controls)`);
console.log(`    forward      ${counts.forward}`);
console.log(`    backward     ${counts.backward}`);
console.log(`    outside      ${counts.outside}`);
console.log(`    conditional  ${counts.conditional}`);
console.log(`    auto         ${counts.auto}`);
console.log(`  stays-here   ${counts.stay}  controls that act where they are`);
console.log(`  unresolved   ${counts.unresolved}`);
if (outAt > 0) console.log(`  drift        ${drift}`);

if (counts.unresolved > 0 || drift > 0) {
  console.log("\nFAILED");
  process.exit(1);
}
console.log("\nOK");
