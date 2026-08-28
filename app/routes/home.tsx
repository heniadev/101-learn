import type { Route } from "./+types/home";
import { getTerminalUrl } from "~/lib/terminal-url.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "101 Learn — Course & Terminal" },
    {
      name: "description",
      content:
        "Work through the course on the left while running the commands in a live terminal on the right.",
    },
  ];
}

export function loader({}: Route.LoaderArgs) {
  return { terminalUrl: getTerminalUrl() };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { terminalUrl } = loaderData;

  return (
    <main className="flex h-screen w-full overflow-hidden">
      {/* Course text and navigation land here in a later slice. */}
      <section className="w-1/2 shrink-0 overflow-y-auto border-r border-gray-200 p-6 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Course content will appear here.
        </p>
      </section>

      <section className="w-1/2 shrink-0">
        <iframe
          src={terminalUrl}
          title="Course terminal"
          className="h-full w-full border-0"
          scrolling="no"
        />
      </section>
    </main>
  );
}
