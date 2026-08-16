/**
 * Where the API lives, as an absolute URL.
 *
 * The two web apps derive this from `window.location.origin`, because the API
 * is served by the very deployment the page came from. Nothing like that is
 * true here: the bundle is served from `capacitor://localhost` (iOS) or
 * `http://localhost` (Android), and the API is a Vercel deployment somewhere
 * else entirely. So it has to be baked in at build time, and a build that
 * forgets it produces an app that cannot talk to anything.
 *
 * Inlined by Next at build time, which is why it is read as a whole expression
 * rather than through a variable.
 */
const configured = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

if (!configured) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required to build the mobile app — it is the absolute URL of the apps/app deployment (e.g. https://app.animalesko.org).",
  );
}

export const API_URL: string = configured;

/**
 * The public web origin used for links that leave the app.
 *
 * A shared pet URL has to open the website, not `capacitor://localhost/pet/x`,
 * and the website is also what serves the OpenGraph tags a WhatsApp preview
 * reads. Defaults to the API host because in this deployment they are the same
 * origin.
 */
export const WEB_URL: string =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") || configured;
