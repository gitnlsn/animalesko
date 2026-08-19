/**
 * Side-effect imports of stylesheets.
 *
 * `alert-map.tsx` pulls in Leaflet's own CSS and the overrides beside it, which
 * is the documented way to use the library — the map renders as a stack of
 * unpositioned tiles without it, so the import is load-bearing rather than
 * cosmetic.
 *
 * TypeScript 6 reports a side-effect import with no declaration (TS2882) rather
 * than ignoring it as 5.x did. The two web apps never hit this because Next
 * ships `declare module "*.css"` through the `next-env.d.ts` it generates; this
 * package is a plain library with no such file, so it declares its own.
 *
 * Intentionally untyped: nothing imports a binding from these, and giving them
 * a shape would invite treating them as CSS modules, which they are not.
 */
declare module "*.css";
