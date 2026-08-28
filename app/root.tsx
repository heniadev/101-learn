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
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
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
