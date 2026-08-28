/**
 * Chrome around the terminal. The frame is decoration; everything inside it is
 * a genuine shell served by the terminal process (FR-030).
 */
export function TerminalPane({ src }: { src: string }) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-term">
      <div className="flex h-[38px] flex-none items-center gap-2 border-b border-line bg-[#0c0e11] px-3.5">
        <div className="mr-2 flex gap-1.5">
          <i className="h-2.5 w-2.5 rounded-full bg-[#2a313b]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#2a313b]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#2a313b]" />
        </div>
        <span className="font-mono text-xs text-dim">bash — /workspace</span>
        <span className="ml-auto text-[11.5px] text-dim max-sm:hidden">
          prawdziwa powłoka — <span className="font-mono">git</span> i edytory
          działają naprawdę
        </span>
      </div>

      <iframe
        src={src}
        title="Terminal kursu"
        className="min-h-0 w-full flex-1 border-0"
        scrolling="no"
      />
    </section>
  );
}
