import { useEffect, useRef, useState } from "react";

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
// Enlarge only. Below 1 the compensating `width: 100/zoom` makes the iframe
// wider and taller than the pane that holds it, and the terminal spills past
// the viewport on the right and the bottom. Shrinking also serves nobody: the
// control exists for the back row of a room, and 100% is already the size the
// pane was designed around.
const STEPS = [1, 1.15, 1.3, 1.5, 1.75, 2, 2.5];
const DEFAULT_STEP = STEPS.indexOf(1);
// v2: the step list changed, and a stored index from the old one would restore
// a different size than it named.
const STORE_KEY = "101-learn:terminal-zoom:v2";

export function TerminalPane({ src }: { src: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [step, setStep] = useState(DEFAULT_STEP);
  const [ready, setReady] = useState(false);

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

  // ttyd refits xterm on `window.resize` *inside* the frame. A frame resized by
  // our own layout or by the zoom controls above never fires that, so the
  // terminal keeps whatever size it measured on first paint -- before the
  // layout settled, that is xterm's 80x25 fallback, and every program
  // inheriting COLUMNS/LINES (ls, vim, claude) renders into a box far smaller
  // than the panel. Nudge it ourselves on load and on every later resize; the
  // frame is same-origin because /terminal is proxied under the app's origin.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;

    const refit = () => {
      try {
        el.contentWindow?.dispatchEvent(new Event("resize"));
      } catch {
        // TERMINAL_URL can point at another origin, and then the frame's
        // window is off limits. Nothing to do -- ttyd fits itself there.
      }
    };

    el.addEventListener("load", refit);
    const observer = new ResizeObserver(refit);
    observer.observe(el);
    // Zoom changes the frame's box, so the observer covers it -- but it can
    // fire before the browser has applied the new `zoom`, and xterm would then
    // measure the old geometry. One more pass on the next frame.
    const queued = requestAnimationFrame(refit);
    return () => {
      cancelAnimationFrame(queued);
      el.removeEventListener("load", refit);
      observer.disconnect();
    };
  }, [zoom]);

  return (
    // Grid, not flex: the iframe row needs a height the browser can resolve on
    // the first pass, or xterm measures an unsettled box and sticks with it.
    <section className="grid min-h-0 min-w-0 flex-1 grid-rows-[38px_minmax(0,1fr)] bg-term">
      <div className="flex items-center gap-2 border-b border-line bg-[#0c0e11] px-3.5">
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

      <div className="relative min-h-0 overflow-hidden">
        <iframe
          ref={frame}
          data-terminal=""
          src={src}
          title="Terminal kursu"
          onLoad={() => setReady(true)}
          className="absolute top-0 left-0 border-0 bg-term"
          style={{ zoom, width: `${100 / zoom}%`, height: `${100 / zoom}%` }}
          scrolling="no"
        />

        {/* Until the terminal page answers, the pane is an unexplained black
            rectangle — say what is happening instead. */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center gap-2.5 bg-term font-mono text-[13px] text-dim">
            <span className="h-2 w-2 animate-pulse rounded-full bg-mint" />
            łączę z terminalem…
          </div>
        )}
      </div>
    </section>
  );
}
