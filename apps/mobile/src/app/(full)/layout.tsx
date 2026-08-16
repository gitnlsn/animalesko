/**
 * The secondary pages — favourites, history, Pet Alert, a listing — rendered
 * full-bleed with their own back-arrow header instead of the tab chrome.
 *
 * Unlike the web app's version this needs no session lookup: the session is
 * provided once, globally, in `MobileProviders`.
 */
export default function FullLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-background">{children}</div>;
}
