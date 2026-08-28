/**
 * Three segments, one per step of the path. Filled = current, faded = done.
 * Deliberately not numbered inside the bar — the count lives in the nav, and
 * two counters would only disagree with each other later.
 */
export function StepProgress({
  total,
  current,
  done = [],
}: {
  total: number;
  current: number;
  done?: boolean[];
}) {
  return (
    <div className="mb-[22px] flex gap-[7px]" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={`h-[3px] flex-1 rounded-sm transition-colors ${
            i === current
              ? "bg-mint"
              : done[i]
                ? "bg-mint/40"
                : "bg-[#232a33]"
          }`}
        />
      ))}
    </div>
  );
}
