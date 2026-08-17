// Fails when apps/app and apps/mobile disagree on which consumer routes exist.
//
// The two are not one app and its port: they are two hosts over the same
// packages/features screens, and nothing about adding a page to one of them
// makes the other fail to build. So a route added on the web and forgotten on
// the device is invisible until somebody opens the app and finds it missing —
// which is how /verificacao came to be two ~115-line copies before anyone
// noticed. This is the check that would have caught it.
//
// Route groups are part of the compared path on purpose: (shell) carries the
// tab chrome and (full) does not, so a screen moving between them is a real
// change of behaviour and should trip this.

import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const APP_ROOT = "apps/app/src/app";
const MOBILE_ROOT = "apps/mobile/src/app";

/**
 * Routes that differ by design, as `app route -> mobile route`.
 *
 * A static export has to know every dynamic segment at build time, and the set
 * of listings plainly is not known when the binary is built, so the device
 * reads the id from a query parameter instead. The web keeps the pretty URL
 * because that is what shared links point at and what carries the OpenGraph
 * tags.
 */
const KNOWN_DIVERGENCES = new Map([["(full)/pet/[id]", "(full)/pet"]]);

function routesOf(root) {
  const routes = new Set();

  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);

      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (entry === "page.tsx") {
        routes.add(relative(root, dir).split(sep).join("/"));
      }
    }
  })(root);

  return routes;
}

const app = routesOf(APP_ROOT);
const mobile = routesOf(MOBILE_ROOT);

// Collapse each known pair to one shared name, so it neither trips the check
// nor hides a route genuinely going missing on one side.
for (const [appRoute, mobileRoute] of KNOWN_DIVERGENCES) {
  const paired = `${appRoute} (mobile: ${mobileRoute})`;
  if (app.delete(appRoute)) app.add(paired);
  if (mobile.delete(mobileRoute)) mobile.add(paired);
}

const missingInMobile = [...app].filter((route) => !mobile.has(route)).sort();
const missingInApp = [...mobile].filter((route) => !app.has(route)).sort();

if (missingInMobile.length > 0 || missingInApp.length > 0) {
  for (const route of missingInMobile) {
    console.error(`route only in apps/app:    ${route || "/"}`);
  }
  for (const route of missingInApp) {
    console.error(`route only in apps/mobile: ${route || "/"}`);
  }
  console.error(
    "\nConsumer routes must mirror. Add the missing page, or record the pair " +
      "in KNOWN_DIVERGENCES in scripts/check-route-parity.mjs with the reason.",
  );
  process.exit(1);
}

console.log(`route parity OK (${app.size} consumer routes)`);
