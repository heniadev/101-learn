import type { ReactNode } from "react";

/**
 * Left half of the screen: the step's text scrolls, the navigation stays put.
 *
 * The pane is a shell on purpose — step content and the gate that unlocks
 * "Dalej" (FR-020, FR-050) belong to their own slices. Whatever lands in
 * `children` inherits the typography from `.lesson-prose`.
 */
export function LessonPane({
  children,
  nav,
}: {
  children: ReactNode;
  nav?: ReactNode;
}) {
  return (
    <section className="flex w-[46%] min-w-[360px] flex-none flex-col border-r border-line bg-panel max-lg:w-full max-lg:min-w-0 max-lg:border-r-0 max-lg:border-b">
      <div className="relative min-h-0 flex-1">
        <div className="h-full overflow-y-auto px-[34px] pt-[30px] pb-[26px]">
          {children}
        </div>
        {/* A hint that the step continues below the fold — the pane is the one
            place where missing a paragraph means missing the command. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-panel to-transparent" />
      </div>
      {nav}
    </section>
  );
}

/**
 * Step navigation. `canAdvance` is the product's one rule made visible: until
 * the step is confirmed done, forward stays shut (FR-050).
 */
export function LessonNav({
  status,
  canAdvance = false,
  canGoBack = false,
  onBack,
  onNext,
}: {
  status: string;
  canAdvance?: boolean;
  canGoBack?: boolean;
  onBack?: () => void;
  onNext?: () => void;
}) {
  return (
    <div className="flex flex-none items-center gap-3 border-t border-line bg-panel px-[34px] py-3.5">
      <span className="flex-1 text-[12.5px] text-dim">{status}</span>
      <button
        type="button"
        className="btn"
        disabled={!canGoBack}
        onClick={onBack}
      >
        Wstecz
      </button>
      <button
        type="button"
        className="btn btn-primary"
        disabled={!canAdvance}
        onClick={onNext}
        title={
          canAdvance ? undefined : "To ostatni krok ścieżki"
        }
      >
        Dalej
      </button>
    </div>
  );
}
