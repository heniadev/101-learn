import { useState } from "react";
import { pasteIntoTerminal } from "~/lib/terminal-input";

/**
 * The step's command, ready to run in the panel on the right.
 *
 * The button puts the command into the terminal and runs it.
 *
 * It used to stop short of Enter, on the reasoning that running the command
 * should stay the learner's move. On a projector that reads as a dead button:
 * the text appears, nothing happens, and the room waits while someone works
 * out they have to reach for the keyboard. Pressing Enter is not the lesson --
 * the panel is the script, and following it should take one click.
 *
 * When the terminal cannot be reached (TERMINAL_URL pointing at another
 * origin) it falls back to the clipboard, which cannot submit anything, so the
 * button still does something -- just less.
 */
export function CommandChip({
  command,
  done = false,
  sigil = "$",
}: {
  command: string;
  done?: boolean;
  /**
   * Which prompt the text is shown behind. `$` is the shell; `>` is a message
   * to the agent. Step 2 pastes whole sentences ("według sumy głosów") and
   * behind a `$` those read as a command that does not exist.
   */
  sigil?: "$" | ">";
}) {
  const [feedback, setFeedback] = useState<"inserted" | "copied" | null>(null);

  const flash = (what: "inserted" | "copied") => {
    setFeedback(what);
    setTimeout(() => setFeedback(null), 1600);
  };

  const insert = () => {
    if (pasteIntoTerminal(command)) {
      flash("inserted");
      return;
    }
    navigator.clipboard?.writeText(command).then(() => flash("copied"));
  };

  const label =
    feedback === "inserted"
      ? "wstawione"
      : feedback === "copied"
        ? "skopiowane"
        : "Wstaw";

  return (
    <div
      className={`mt-[22px] flex items-center gap-3 rounded-[9px] border px-3.5 py-3 ${
        done ? "border-mint/30 bg-mint/5" : "border-line bg-panel2"
      }`}
    >
      {/* Short commands stay on one line; the long pasted answers of step 2
          wrap instead, because a sentence scrolled sideways cannot be read
          before deciding to paste it. */}
      <code
        className={`flex-1 font-mono text-[13.5px] text-ink ${
          command.length > 56
            ? "break-words whitespace-pre-wrap"
            : "overflow-x-auto whitespace-nowrap"
        }`}
      >
        <span className="mr-2 select-none text-dim">{sigil}</span>
        {command}
      </code>

      {done ? (
        <span className="text-[12.5px] whitespace-nowrap text-mint">
          ✓ wykonane
        </span>
      ) : (
        <button
          type="button"
          onClick={insert}
          className="btn px-3 py-1.5 text-[12.5px]"
        >
          {label}
        </button>
      )}
    </div>
  );
}
