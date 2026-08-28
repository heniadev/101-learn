import { useState } from "react";
import type { Route } from "./+types/home";
import { getTerminalUrl } from "~/lib/terminal-url.server";
import { CommandChip } from "~/components/CommandChip";
import { KapstCard } from "~/components/KapstCard";
import { LessonNav, LessonPane } from "~/components/LessonPane";
import { StepProgress } from "~/components/StepProgress";
import { TerminalPane } from "~/components/TerminalPane";
import { TopBar } from "~/components/TopBar";
import { STEPS } from "~/content/steps";

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

  // The current step is component state, not a URL segment or stored value, so
  // reloading the page starts the course over -- which is the entire mechanism
  // FR-080 asks for. A shareable per-step link would be nice and would break
  // that, so it is deliberately not here.
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden max-lg:h-auto max-lg:min-h-screen max-lg:overflow-visible">
      <TopBar />

      <main className="flex min-h-0 flex-1 max-lg:flex-col">
        <LessonPane
          nav={
            <LessonNav
              status={`krok ${index + 1} z ${STEPS.length}`}
              canGoBack={index > 0}
              // No gate yet: advancing is not conditioned on the step actually
              // having been run. That check is S-05 and lives in its own slice.
              canAdvance={!isLast}
              onBack={() => setIndex((i) => Math.max(0, i - 1))}
              onNext={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            />
          }
        >
          <StepProgress
            total={STEPS.length}
            current={index}
            done={STEPS.map((_, i) => i < index)}
          />
          <KapstCard />

          <div className="kicker mb-2.5">{step.kicker}</div>
          <h1 className="mb-[18px] text-[25px] leading-[1.25] font-semibold tracking-[-0.02em]">
            {step.title}
          </h1>
          <div className="lesson-prose">{step.body}</div>

          <CommandChip command={step.command} />

          <p className="mt-3 text-[12.5px] text-dim">
            Powstanie: <code className="font-mono">{step.produces}</code>
          </p>
        </LessonPane>

        <TerminalPane src={terminalUrl} />
      </main>
    </div>
  );
}
