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
 * WHERE THIS TEXT COMES FROM: every move below is transcribed from the
 * recordings in scripts/mock-llm/recordings/ -- the single walk captured on
 * 2026-08-28 between 11:53 and 12:14. That is not a style choice, it is a
 * correctness requirement. The mock keys a reply on the WHOLE conversation
 * (scripts/mock-llm/server.mjs, keyFor), so a learner who types something the
 * recording does not contain moves the conversation off every later key at
 * once and gets HTTP 400 for the rest of the path. Changing a `text` here
 * without re-recording breaks the demo from that point on.
 *
 * The panel bodies describe what the agent actually did in that walk -- the
 * pushback on the persona, the contradiction it refused to bury, the gaps it
 * left visible. None of it is aspirational.
 */

/** One move the learner makes in the terminal. */
export type Move =
  /**
   * Text the learner puts in and runs: a shell command or a reply to the
   * agent. `sigil` picks which prompt it is shown behind -- `$` for the
   * shell, `>` for a message to the agent -- because pasting a sentence like
   * "według sumy głosów" behind a `$` reads as a command that does not exist.
   */
  | { kind: "type"; text: string; sigil?: "$" | ">"; hint?: string }
  /**
   * One AskUserQuestion screen. The agent opens a chooser in the terminal, so
   * there is nothing to paste -- the learner picks with the keyboard. The
   * options are listed because the recording holds the answer for THESE
   * choices; picking differently is the one way to walk off the script
   * without typing anything.
   */
  | { kind: "pick"; answers: { question: string; answer: string }[] };

export type Step = {
  /** Small line above the title, e.g. "Krok 1 z 3 · fundament". */
  kicker: string;
  title: string;
  body: ReactNode;
  /** The learner's moves, in the order the recording holds them (FR-030). */
  moves: Move[];
  /** What appears on disk once the step is done. */
  produces: string;
};

export const STEPS: Step[] = [
  {
    kicker: "Krok 1 z 3 · fundament",
    title: "Zrób miejsce na pamięć projektu",
    produces: "context/ · docs/reference/contract-surfaces.md",
    moves: [
      {
        kind: "type",
        text: "claude",
        sigil: "$",
        hint: "Katalog jest pusty — jest w nim tylko toolkit. Wszystko poniżej powstanie na twoich oczach.",
      },
      {
        kind: "type",
        text: "mówimy po polsku",
        sigil: ">",
        hint: "Odpowie „Jasne, mówimy po polsku”. To zwykła wiadomość, nie komenda — sprawdzasz, że po drugiej stronie ktoś jest.",
      },
      { kind: "type", text: "/101-init", sigil: ">" },
    ],
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
          zamknięte zmiany. Do każdego wkłada <code>README.md</code> z
          konwencją, dokłada{" "}
          <code>docs/reference/contract-surfaces.md</code> — i niczego nie
          nadpisuje.
        </p>
        <p>
          Zwróć uwagę, co robi <em>najpierw</em>: zagląda do katalogu, zanim
          cokolwiek utworzy. To ta sama ostrożność, którą zobaczysz w każdym
          kolejnym kroku.
        </p>
      </>
    ),
  },
  {
    kicker: "Krok 2 z 3 · rozmowa",
    title: "Opowiedz, co chcesz zbudować",
    produces: "context/foundation/shape-notes.md",
    moves: [
      {
        kind: "type",
        sigil: ">",
        text:
          "/101-shape aplikacja webowa oceniająca kotki. dwa kotki, jeden po lewej, " +
          "jeden po prawej. kliknięcie jednego to preferencja (+1). po kliknięciu " +
          "wyświetlają się dwa kolejne kotki. po 10 rundach wyniki (globalne hall of cat fame).",
        hint: "Pomysł jednym akapitem, twoimi słowami. Agent zapisze go dosłownie — bez przeredagowania.",
      },
      {
        kind: "type",
        sigil: ">",
        text:
          "ból - nudzi nam się po godzinach; osoba - wszyscy którzy kochają kotki " +
          "(czyli wszyscy!); moment - kiedy chcemy poprokastynować; dzisiejszy koszt - nuda",
        hint: "Odpowiedz byle jak — celowo. Na „osoba: wszyscy” usłyszysz, że to nie persona, tylko jej brak.",
      },
      {
        kind: "pick",
        answers: [
          { question: "Jedna grupa, którą potrafisz wskazać palcem", answer: "Właściciele kotów" },
          { question: "Co uznasz za sukces jednej sesji", answer: "Dochodzi do 10 rundy i ogląda wynik" },
          { question: "Hall of cat fame — sedno czy ekran końcowy", answer: "Sedno — po to się gra" },
        ],
      },
      {
        kind: "pick",
        answers: [
          { question: "Właściciel wgrywa swojego kota czy głosuje na cudze", answer: "Głosuje na gotową pulę" },
        ],
      },
      {
        kind: "pick",
        answers: [
          { question: "Czy w ogóle jest jakaś tożsamość", answer: "Bez logowania, anonimowo" },
        ],
      },
      {
        kind: "type",
        sigil: ">",
        text: "po 10 rundzie ranking i koniec, zdjęcia z zewnętrznego API",
        hint: "Tu agent oddzieli decyzję technologiczną od produktowej: „zewnętrzne API” odłoży do bloku tech-stack, a w wymaganiach zostawi sam fakt — pula jest gotowa, użytkownik nic nie wgrywa.",
      },
      {
        kind: "pick",
        answers: [
          { question: "Jak wygląda pula", answer: "Stała pula, pobrana raz" },
          { question: "Co widać na ekranie wyniku", answer: "Globalny top N" },
          { question: "Po wyniku koniec czy droga dalej", answer: "Koniec, bez przycisku" },
          { question: "Ile czasu na pierwszą wersję", answer: "Do tygodnia" },
        ],
      },
      {
        kind: "type",
        sigil: ">",
        text: "lista kompletna, licznik rund tak, top 10, brak zdjęć nieważne",
        hint: "Domyka listę wymagań. Po tym wchodzi runda sokratejska: każde wymaganie dostaje jedno kontrpytanie.",
      },
      {
        kind: "pick",
        answers: [
          { question: "FR-010 start bez logowania — kiedy zaszkodzi", answer: "Brak kontrargumentu" },
          { question: "FR-020 dwa kotki ze stałej puli", answer: "Brak kontrargumentu" },
          { question: "FR-030 kliknięcie = +1", answer: "Brak kontrargumentu" },
          { question: "FR-040 natychmiast kolejna para", answer: "Brak kontrargumentu" },
        ],
      },
      {
        kind: "pick",
        answers: [
          { question: "FR-050 licznik rund", answer: "Brak kontrargumentu" },
          { question: "FR-060 globalny top 10", answer: "Brak kontrargumentu" },
          { question: "FR-070 głosy do wspólnego rankingu", answer: "Brak kontrargumentu" },
        ],
      },
      {
        kind: "type",
        sigil: ">",
        text: "według sumy głosów",
        hint: "Reguła biznesowa w jednym zdaniu — coś, co aplikacja rozstrzyga sama. „Można dodać, obejrzeć, zmienić i skasować” regułą nie jest.",
      },
      {
        kind: "pick",
        answers: [
          { question: "Ilu ludzi w pierwszych miesiącach", answer: "Garstka — do stu osób" },
          { question: "W jakich warunkach powstaje wersja", answer: "Po godzinach, bez twardego terminu" },
        ],
      },
      {
        kind: "pick",
        answers: [
          { question: "Gdyby zobaczyło to 10 000 osób — reguła się broni", answer: "Tak, suma zostaje" },
          {
            question: "Co świadomie NIE powstaje (kilka)",
            answer:
              "Komentarze i reakcje, Przycisk udostępniania, Kategorie i filtry, Ranking poza końcem sesji",
          },
        ],
      },
      {
        kind: "pick",
        answers: [{ question: "Co robimy z pięcioma lukami", answer: "Zamknij tylko lukę nr 4" }],
      },
      {
        kind: "pick",
        answers: [
          { question: "Luka nr 4 — jak dobieramy parę", answer: "Równa ekspozycja — każdy podobnie często" },
        ],
      },
    ],
    body: (
      <>
        <p>
          Masz katalog na pamięć, ale nie ma w nim jeszcze nic o twoim
          pomyśle. Ten krok to rozmowa: agent pyta, ty odpowiadasz, a z
          odpowiedzi powstaje notatka. To najdłuższy krok ścieżki i
          jedyny, w którym agent ci się <em>sprzeciwi</em>.
        </p>
        <p>
          <code>/101-shape</code> nie generuje dokumentu z jednego zdania.
          Prowadzi wywiad i odbija każdą miękką odpowiedź: „wszyscy, którzy
          kochają kotki” usłyszysz z powrotem jako <em>brak</em> persony — bo
          jeśli odbiorcą są wszyscy, żadnej decyzji projektowej nie da się
          odrzucić. Sprzeczności też nie przemilczy: twój pomysł nie mówi nic
          o wgrywaniu zdjęć, a pytanie o „swojego kota” je zakłada.
        </p>
        <p>
          Czego tu <em>nie</em> zobaczysz: wymagań, których nie powiedziałeś.
          Tam, gdzie w rozmowie zabrakło decyzji, zostaje widoczna luka{" "}
          <code>[GAP: …]</code> — na końcu agent pokaże ich listę i spyta,
          które domknąć.
        </p>
      </>
    ),
  },
  {
    kicker: "Krok 3 z 3 · dokument",
    title: "Zamień notatki w wymagania",
    produces: "context/foundation/prd.md",
    moves: [
      {
        kind: "type",
        sigil: ">",
        text: "/101-prd",
        hint: "Bez argumentów — wszystko, czego potrzebuje, jest już w shape-notes.md.",
      },
    ],
    body: (
      <>
        <p>
          Notatki z rozmowy są surowe. Ten krok przekuwa je w dokument, który
          da się komuś podać: wizja, persona, wymagania w formie kanonicznej,
          reguła biznesowa, jawny zakres wykluczony.
        </p>
        <p>
          <code>/101-prd</code> najpierw <em>ocenia wejście</em> — sprawdza
          blok checkpoint, formę wymagań, historyjkę Given/When/Then i regułę
          biznesową. Za notatki z kroku 2 wystawi <strong>4/4</strong>, a
          próg to 2, więc generuje bez ani jednego pytania. Zła jakość
          notatek nie daje złego PRD po cichu — daje pytania.
        </p>
        <p>
          Po zapisie robi samokontrolę: czy nie wyciekła nazwa dostawcy,
          notacja schematu, decyzja implementacyjna. To ostatni krok ścieżki.
          Masz w repozytorium trzy pliki, których dziesięć minut temu nie
          było — i żadnego nie napisałeś ręcznie. Agent sam podpowie, co
          dalej: <code>/101-tech-stack-selector</code>.
        </p>
      </>
    ),
  },
];
