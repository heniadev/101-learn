import type { ReactNode } from "react";

/**
 * The three steps of the path (FR-060, US-01).
 *
 * Content lives here rather than in the route so the pane stays a shell and
 * the steps can be read, reviewed and rewritten without touching layout. Each
 * step names the file it produces: that file appearing in the learner's own
 * repository is the proof the course is real, and the thing the whole demo is
 * built to show (FR-070).
 *
 * NOTE FOR THE PRODUCT OWNER: the text of steps 2 and 3 is a first draft
 * written to unblock the path. It follows the shape of step 1 and is accurate
 * about what the commands do, but it has not been through the same review.
 */
export type Step = {
  /** Small line above the title, e.g. "Krok 1 z 3 · fundament". */
  kicker: string;
  title: string;
  body: ReactNode;
  /** Typed into the terminal by the learner -- never run for them (FR-030). */
  command: string;
  /** What appears on disk once the step is done. */
  produces: string;
};

export const STEPS: Step[] = [
  {
    kicker: "Krok 1 z 3 · fundament",
    title: "Zrób miejsce na pamięć projektu",
    command: "/101-init",
    produces: "context/",
    body: (
      <>
        <p>
          Toolkit nie trzyma pamięci w rozmowie — trzyma ją w plikach. Możesz
          zamknąć laptopa w dowolnym momencie i wrócić jutro dokładnie tam,
          gdzie skończyłeś.
        </p>
        <p>
          <code>/101-init</code> zakłada drzewo <code>context/</code>:{" "}
          <code>foundation/</code> na dokumenty żyjące tyle co projekt,{" "}
          <code>changes/</code> na pracę w toku, <code>archive/</code> na
          zamknięte zmiany. Niczego nie nadpisuje.
        </p>
        <p>
          Wpisz komendę w terminalu po prawej. To prawdziwa powłoka — działa w
          niej <code>git</code> i zwykłe edytory.
        </p>
      </>
    ),
  },
  {
    kicker: "Krok 2 z 3 · rozmowa",
    title: "Opowiedz, co chcesz zbudować",
    command: "/101-shape",
    produces: "context/foundation/shape-notes.md",
    body: (
      <>
        <p>
          Masz katalog na pamięć, ale nie ma w nim jeszcze nic o twoim
          pomyśle. Ten krok to rozmowa: agent pyta, ty odpowiadasz, a z
          odpowiedzi powstaje notatka.
        </p>
        <p>
          <code>/101-shape</code> nie generuje dokumentu z jednego zdania.
          Prowadzi wywiad — dopytuje o problem, o to kto go ma i co dziś robi
          zamiast twojego rozwiązania. Odpowiadaj krótko; możesz powiedzieć
          „nie wiem", to też jest odpowiedź.
        </p>
        <p>
          Na końcu zobaczysz <code>shape-notes.md</code> — pierwszy plik, który
          napisałeś rozmawiając, a nie pisząc.
        </p>
      </>
    ),
  },
  {
    kicker: "Krok 3 z 3 · dokument",
    title: "Zamień notatki w wymagania",
    command: "/101-prd",
    produces: "context/foundation/prd.md",
    body: (
      <>
        <p>
          Notatki z rozmowy są surowe. Ten krok przekuwa je w dokument, który da
          się komuś podać: cele, wymagania funkcjonalne, jawne non-goals.
        </p>
        <p>
          <code>/101-prd</code> czyta <code>shape-notes.md</code> i wypełnia
          stały szablon. Tam, gdzie w rozmowie czegoś zabrakło, zostawia
          widoczną lukę <code>[GAP: …]</code> zamiast zmyślić — bo dziura,
          którą widać, jest tańsza niż wymaganie, którego nikt nie powiedział.
        </p>
        <p>
          To ostatni krok ścieżki. Po nim masz w repozytorium trzy pliki,
          których dziesięć minut temu nie było — i żadnego z nich nie napisałeś
          ręcznie.
        </p>
      </>
    ),
  },
];
