import { NextResponse, type NextRequest } from "next/server";

/**
 * Forwards the requested path to the server components as `x-pathname`.
 *
 * The shell layout is where the auth gate lives, and a layout has no way to ask
 * which URL it is rendering — so its redirect could only ever send a signed-out
 * provider to a bare `/entrar`, losing wherever they were headed. The consumer
 * app avoids the problem by gating page-by-page with a literal path; doing that
 * here would mean eight call sites racing the layout's own redirect, so the
 * path is carried in instead.
 *
 * Deliberately no auth logic: this only reports the URL. Whether a session is
 * valid stays a single decision made in the layout, against the database — this
 * runs at the edge of the request and must not be the thing guarding anything.
 * `set` overwrites rather than appends, so a client cannot spoof the header by
 * sending its own, and the layout runs the value through `safeNext` regardless.
 *
 * `proxy.ts`, not `middleware.ts`: the middleware convention is deprecated in
 * Next 16 and renamed, with the export renamed to match.
 */
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-pathname", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Everything except the API routes and the build output — none of which
  // render a server component that reads the header.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
