import { useEffect, useState } from "react";

/**
 * Chrome around the terminal. The frame is decoration; everything inside it is
 * a genuine shell served by the terminal process (FR-030).
 *
 * The +/- buttons are for the projector: someone in the back row always says
 * they cannot read it. They scale the terminal only — the lesson text on the
 * left keeps its own size.
 *
 * Scaling is done with `zoom` on the iframe rather than by reloading it with a
 * font-size option: a reload would drop the websocket and take the running
 * shell down with it, mid-demo. `zoom` shrinks the CSS viewport the terminal
 * sees, so xterm reflows to fewer, larger columns and the session survives.
 * The iframe's own box is scaled too, hence the 100/zoom sizing that keeps it
 * filling the pane.
 */
const STEPS = [0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5];
const DEFAULT_STEP = STEPS.indexOf(1);
const STORE_KEY = "101-learn:terminal-zoom";

export function TerminalPane({ src }: { src: string }) {
  const [step, setStep] = useState(DEFAULT_STEP);

  // A presenter setting, not course progress — it survives the reload that
  // resets the course itself (FR-080).
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(STORE_KEY));
      if (Number.isInteger(saved) && STEPS[saved]) setStep(saved);
    } catch {
      // private mode, blocked storage — the default is fine
    }
  }, []);

  const to = (next: number) => {
    const clamped = Math.min(STEPS.length - 1, Math.max(0, next));
    setStep(clamped);
    try {
      localStorage.setItem(STORE_KEY, String(clamped));
    } catch {
      // nothing to do — the size still applies for this session
    }
  };

  const zoom = STEPS[step];

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-term">
      <div className="flex h-[38px] flex-none items-center gap-2 border-b border-line bg-[#0c0e11] px-3.5">
        <div className="mr-2 flex gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-[#2a313b]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#2a313b]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#2a313b]" />
        </div>
        <span className="font-mono text-xs text-dim">bash — /workspace</span>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 text-[11.5px] text-dim max-sm:hidden">
            rozmiar terminala
          </span>
          <button
            type="button"
            onClick={() => to(step - 1)}
            disabled={step === 0}
            aria-label="Zmniejsz czcionkę terminala"
            className="btn h-[22px] w-[26px] p-0 font-mono text-sm leading-none"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => to(DEFAULT_STEP)}
            aria-label="Przywróć domyślny rozmiar terminala"
            className="btn h-[22px] px-1.5 py-0 font-mono text-[11px] leading-none tabular-nums"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => to(step + 1)}
            disabled={step === STEPS.length - 1}
            aria-label="Powiększ czcionkę terminala"
            className="btn h-[22px] w-[26px] p-0 font-mono text-sm leading-none"
          >
            +
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <iframe
          src={src}
          title="Terminal kursu"
          className="absolute top-0 left-0 border-0 bg-term"
          style={{ zoom, width: `${100 / zoom}%`, height: `${100 / zoom}%` }}
          scrolling="no"
        />
      </div>
    </section>
  );
}
