import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning on <html> and <body> is load-bearing for the
    // terminal, not cosmetic. Browser extensions stamp their own attributes on
    // these two elements before React hydrates -- ColorZilla writes
    // cz-shortcut-listen, a VPN extension writes inject_vt_svd. React sees the
    // server HTML and the client DOM disagree, gives up on hydrating that tree
    // and re-renders it from scratch, which recreates every DOM node under it.
    // One of those nodes is the terminal <iframe>: recreating it reloads the
    // page inside, which drops ttyd's websocket and takes the running shell
    // down with it. On a machine with such an extension the panel then sits on
    // "łączę z terminalem…" and reconnects in a loop.
    //
    // The flag tells React to keep the server's markup for these elements and
    // stop treating a foreign attribute as a mismatch. It covers attributes
    // only, so it cannot hide a real content mismatch in the app's own markup.
    <html lang="pl" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-8 py-16">
      <div className="kicker mb-2.5">coś poszło nie tak</div>
      <h1 className="mb-3 text-[25px] leading-[1.25] font-semibold tracking-[-0.02em]">
        {message}
      </h1>
      <p className="lesson-prose">{details}</p>
      <p className="lesson-prose mt-4 text-[15px] text-dim">
        Kurs nie zapisuje postępu — przeładowanie strony zaczyna go od nowa.
      </p>
      <div className="mt-6">
        <a href="/" className="pill pill-quiet">
          Zacznij od nowa
        </a>
      </div>
      {stack && (
        <pre className="mt-8 overflow-x-auto rounded-[9px] border border-line bg-term p-4 font-mono text-[12.5px] leading-[1.6] text-muted">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
