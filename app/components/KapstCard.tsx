import { ProgressiveImage } from "~/components/ProgressiveImage";

/**
 * The course opens with the premise it is built on, so the learner knows why
 * there is so little to read before the first command.
 */
export function KapstCard() {
  return (
    <div className="mb-[22px] overflow-hidden rounded-[10px] border border-mint/25 bg-linear-to-b from-mint/10 to-mint/[0.03]">
      <ProgressiveImage
        src="/kapst.jpeg"
        width={1408}
        height={768}
        alt="KAPŚT! — Koalicja Agentów Przeciwko Ścianom Tekstu. Aktywny learning skilli agentic AI, bez czytania suchego bla bla bla."
        className="block h-auto w-full border-b border-mint/20"
      />
      <p className="lesson-prose px-4 py-3.5 text-[15px] leading-[1.6]">
        <em>Uczymy się przez robienie, nie przez czytanie.</em> Po ścianie
        tekstu zostaje w głowie szum — po komendzie, którą sam uruchomiłeś,
        zostaje plik na dysku. Trzy akapity, jedna komenda, widoczny skutek.
        Tyle.
      </p>
    </div>
  );
}
