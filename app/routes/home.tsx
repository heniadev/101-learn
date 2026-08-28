import type { Route } from "./+types/home";
import { getTerminalUrl } from "~/lib/terminal-url.server";
import { CommandChip } from "~/components/CommandChip";
import { KapstCard } from "~/components/KapstCard";
import { LessonNav, LessonPane } from "~/components/LessonPane";
import { StepProgress } from "~/components/StepProgress";
import { TerminalPane } from "~/components/TerminalPane";
import { TopBar } from "~/components/TopBar";

const TITLE = "101-learn — kurs i terminal";
const DESCRIPTION =
  "Czytasz krok po lewej, uruchamiasz go w prawdziwym terminalu po prawej.";

export function meta({}: Route.MetaArgs) {
  return [
    { title: TITLE },
    { name: "description", content: DESCRIPTION },
    // Someone will paste this link into a chat before the demo; a bare URL
    // there says nothing about what is on the other side.
    { property: "og:title", content: TITLE },
    { property: "og:description", content: DESCRIPTION },
    { property: "og:type", content: "website" },
    { property: "og:image", content: "/kapst.jpeg" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "theme-color", content: "#0b0d10" },
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
        <LessonPane nav={<LessonNav status="krok 1 z 3" />}>
          <StepProgress total={3} current={0} />
          <KapstCard />

          {/* Placeholder for the course-content slice: the first step's text
              wired through the styled pieces, so whatever replaces it lands in
              a pane that already looks right. The gate that unlocks "Dalej"
              (FR-050) belongs to its own slice and is off here. */}
          <div className="kicker mb-2.5">Krok 1 z 3 · fundament</div>
          <h1 className="mb-[18px] text-[25px] leading-[1.25] font-semibold tracking-[-0.02em]">
            Zrób miejsce na pamięć projektu
          </h1>
          <div className="lesson-prose">
            <p>
              Toolkit nie trzyma pamięci w rozmowie — trzyma ją w plikach.
              Możesz zamknąć laptopa w dowolnym momencie i wrócić jutro
              dokładnie tam, gdzie skończyłeś.
            </p>
            <p>
              <code>/101-init</code> zakłada drzewo <code>context/</code>:{" "}
              <code>foundation/</code> na dokumenty żyjące tyle co projekt,{" "}
              <code>changes/</code> na pracę w toku, <code>archive/</code> na
              zamknięte zmiany. Niczego nie nadpisuje.
            </p>
            <p>
              Wpisz komendę w terminalu po prawej. To prawdziwa powłoka —
              działa w niej <code>git</code> i zwykłe edytory.
            </p>
          </div>

          <CommandChip command="/101-init" />
        </LessonPane>

        <TerminalPane src={terminalUrl} />
      </main>
    </div>
  );
}
