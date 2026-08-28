/**
 * The one honest line in the chrome: the agent in the terminal replays a
 * script (FR-045), and the badge says so on every screen.
 */
export function TopBar() {
  return (
    <header className="flex h-[52px] flex-none items-center gap-4 border-b border-line bg-panel px-[18px]">
      <div className="flex items-center gap-[9px] font-semibold tracking-[-0.01em]">
        <span className="h-[9px] w-[9px] rounded-full bg-mint shadow-[0_0_0_4px_rgba(110,231,168,0.12)]" />
        101-learn
        <span className="ml-0.5 font-normal text-dim">
          · interaktywny learner
        </span>
      </div>

      <div className="flex-1" />

      <span className="pill pill-warn">
        <span aria-hidden>⚑</span>
        <span className="max-md:hidden">
          Agent w terminalu odtwarza pre-programowane odpowiedzi
        </span>
      </span>

      {/* Reloading is the reset (FR-080) — there is no session state to tear
          down, so a plain link does the whole job. */}
      <a href="/" className="pill pill-quiet">
        Zacznij od nowa
      </a>
    </header>
  );
}
