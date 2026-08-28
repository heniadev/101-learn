import type { Route } from "./+types/home";
import { getTerminalUrl } from "~/lib/terminal-url.server";
import { KapstCard } from "~/components/KapstCard";
import { LessonNav, LessonPane } from "~/components/LessonPane";
import { TerminalPane } from "~/components/TerminalPane";
import { TopBar } from "~/components/TopBar";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "101-learn — kurs i terminal" },
    {
      name: "description",
      content:
        "Czytasz krok po lewej, uruchamiasz go w prawdziwym terminalu po prawej.",
    },
  ];
}

export function loader({}: Route.LoaderArgs) {
  return { terminalUrl: getTerminalUrl() };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { terminalUrl } = loaderData;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden max-lg:h-auto max-lg:min-h-screen max-lg:overflow-visible">
      <TopBar />

      <main className="flex min-h-0 flex-1 max-lg:flex-col">
        <LessonPane
          nav={<LessonNav status="krok 1 z 3" />}
        >
          <KapstCard />

          {/* Step text and the gate that unlocks "Dalej" land here in their
              own slices; this pane already carries their styling. */}
          <div className="kicker mb-2.5">Krok 1 z 3 · fundament</div>
          <h1 className="mb-[18px] text-[25px] font-semibold leading-[1.25] tracking-[-0.02em]">
            Treść kroku pojawi się tutaj
          </h1>
          <div className="lesson-prose">
            <p>
              Prawy panel jest już prawdziwy: działa w nim <code>git</code>,
              działają zwykłe edytory, a sesję resetujesz przeładowaniem strony.
            </p>
            <p>
              Lewy czeka na treść kursu — akapity kroku i bramkę, która odblokuje{" "}
              <em>Dalej</em> dopiero wtedy, gdy krok zostanie faktycznie
              wykonany.
            </p>
          </div>
        </LessonPane>

        <TerminalPane src={terminalUrl} />
      </main>
    </div>
  );
}
