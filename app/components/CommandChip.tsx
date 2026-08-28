import { useState } from "react";

/**
 * The step's command, ready to run in the panel on the right.
 *
 * There is no "run it for me" button on purpose: the terminal is real, and
 * the learner running the command themselves is the whole point (FR-030).
 * Copying it is the one shortcut that does not take that away.
 */
export function CommandChip({
  command,
  done = false,
}: {
  command: string;
  done?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div
      className={`mt-[22px] flex items-center gap-3 rounded-[9px] border px-3.5 py-3 ${
        done ? "border-mint/30 bg-mint/5" : "border-line bg-panel2"
      }`}
    >
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13.5px] text-ink">
        <span className="mr-2 text-dim">$</span>
        {command}
      </code>

      {done ? (
        <span className="text-[12.5px] whitespace-nowrap text-mint">
          ✓ wykonane
        </span>
      ) : (
        <button
          type="button"
          onClick={copy}
          className="btn px-3 py-1.5 text-[12.5px]"
        >
          {copied ? "skopiowane" : "Kopiuj"}
        </button>
      )}
    </div>
  );
}
