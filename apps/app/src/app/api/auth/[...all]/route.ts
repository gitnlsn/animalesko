// Both apps mount the same Better Auth instance against the same database, so
// a session created here is valid on apps/plus too.
//
// OPTIONS is exported for the native app: sign-in is a preflighted POST, and
// without a handler the preflight never carries CORS headers and the WebView
// drops the request.
export { GET, POST, OPTIONS } from "@animalesko/auth/next";
