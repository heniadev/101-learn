import type { Move } from "~/content/steps";
import { CommandChip } from "./CommandChip";

/**
 * The step's moves, in order: what to put into the terminal and what to pick
 * when the agent opens a chooser.
 *
 * Two kinds, because the terminal offers two different things to do. A `type`
 * move has text, so it gets the paste button. A `pick` move has none -- the
 * agent has drawn a menu in the terminal and the learner answers it with the
 * keyboard, so the card can only say which option to take.
 *
 * Naming the options matters more than it looks. The replies come from
 * recordings keyed on the whole conversation, so a different pick walks off
 * the script exactly as surely as different typing would -- and unlike typing,
 * it takes no effort to do by accident.
 */
export function MoveList({ moves }: { moves: Move[] }) {
  return (
    <ol className="mt-[22px] flex flex-col gap-2.5">
      {moves.map((move, i) => (
        <li key={i} className="flex gap-2.5">
          <span
            className="mt-3.5 w-4 flex-none text-right font-mono text-[12px] text-dim"
            aria-hidden
          >
            {i + 1}
          </span>

          <div className="min-w-0 flex-1">
            {move.kind === "type" ? (
              <>
                <CommandChip command={move.text} sigil={move.sigil ?? "$"} />
                {move.hint ? (
                  <p className="mt-1.5 text-[12.5px] leading-[1.5] text-dim">
                    {move.hint}
                  </p>
                ) : null}
              </>
            ) : (
              <PickCard answers={move.answers} />
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * One AskUserQuestion screen. Deliberately not a button: there is nothing to
 * paste, and a button that did nothing would be worse than none.
 */
function PickCard({
  answers,
}: {
  answers: { question: string; answer: string }[];
}) {
  return (
    <div className="mt-[22px] rounded-[9px] border border-dashed border-line bg-panel2/50 px-3.5 py-3">
      <div className="mb-2 text-[11px] tracking-[0.08em] text-dim uppercase">
        {answers.length > 1
          ? `okno wyborów · ${answers.length} pytania`
          : "okno wyborów"}
      </div>
      <ul className="flex flex-col gap-1.5">
        {answers.map((a, i) => (
          <li key={i} className="text-[13px] leading-[1.45]">
            <span className="text-muted">{a.question}</span>
            <span className="mx-1.5 text-dim">→</span>
            <strong className="font-medium text-mint">{a.answer}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
