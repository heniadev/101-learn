---
project: "interaktywny learner"
context_type: greenfield
created: 2026-08-28
updated: 2026-08-28
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 0
  hard_deadline: 2026-08-28
  after_hours_only: false
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  frs_drafted: 9
  quality_check_status: gaps-accepted
  gray_areas_resolved:
    - topic: "persona"
      decision: "Deweloper oceniający toolkit 101 — chce zobaczyć, jak działa, zanim zainstaluje go u siebie."
    - topic: "koszt dzis"
      decision: "Ponad 30 minut od decyzji do pierwszego efektu: instalacja toolkitu plus własny projekt, zanim cokolwiek widać. Większość odpada po drodze."
    - topic: "moment uzycia"
      decision: "Klik wypróbuj z landingu/README toolkitu — zero instalacji, od razu w przeglądarce."
    - topic: "dostep"
      decision: "Bez logowania. Każdy z linkiem wchodzi i zaczyna od świeżej sesji; postęp znika po zamknięciu karty."
    - topic: "najmniejszy pelny przeplyw"
      decision: "Trzy kroki ścieżki z HOWTO: /101-init, /101-shape, /101-prd. Każdy krok to jeden ekran — tekst po lewej, komenda uruchamiana w terminalu po prawej."
    - topic: "regula biznesowa"
      decision: "Bramka wykonania: przycisk Dalej odblokowuje się dopiero, gdy aplikacja potwierdzi, że krok został faktycznie wykonany w terminalu."
    - topic: "skala"
      decision: "Do ~100 uczących się — demo, jurorzy, kilkunastu ciekawskich po hackatonie. Jeden kontener wystarczy."
    - topic: "poza zakresem"
      decision: "Odpada: zapisywanie postępu i konta, prawdziwy model AI w terminalu, więcej niż jeden scenariusz kursu. Wielu równoczesnych użytkowników NIE zostało wykluczone."
    - topic: "jawnosc riggowania"
      decision: "Interfejs oznacza wprost, że agent jest riggowany, a prezenter mówi to jednym zdaniem na scenie — wykrycie tego przez jurorów kosztowałoby więcej niż zysk z efektu."
    - topic: "reset kursu"
      decision: "Reset to zwykłe przeładowanie strony, które otwiera nową sesję — żaden osobny mechanizm nie jest potrzebny."
    - topic: "tryb pracy"
      decision: "Formuła hackatonu: start 9:00, oddanie działającego demo do 17:00 tego samego dnia, zespół jednoosobowy, 60 sekund na prezentację."
---

## Vision & Problem Statement

Deweloper, który słyszał o toolkicie 101, nie ma dziś jak zobaczyć, jak ten
toolkit faktycznie działa, zanim zainwestuje własny czas. Droga do pierwszego
efektu — instalacja toolkitu, założenie własnego projektu, przejście
pierwszych kroków — to ponad 30 minut, i większość odpada po drodze.

Produkt to interaktywny learner w przeglądarce: dwa panele obok siebie. Lewy
panel: 1–3 akapity tekstu i przyciski nawigacji. Prawy panel: terminal.
W terminalu działa agent (riggowany — odpowiadający pre-programowanymi
odpowiedziami), `git` i typowe edytory.

Moment użycia: klik „wypróbuj" z landingu toolkitu — bez instalacji.

## User & Persona

Deweloper oceniający toolkit 101 przed instalacją. Motywacja jest jasna, a
grupa najliczniejsza; ceną jest to, że scenariusz musi być wierny realnemu
przebiegowi — inaczej uczący się poczuje się oszukany.

## Success Criteria

### Primary
Uczący się przechodzi trzy kroki ścieżki (`/101-init`, `/101-shape`,
`/101-prd`) w przeglądarce, bez instalacji, i na końcu widzi realny dokument,
który sam wywołał.

### Secondary
Cały przebieg da się pokazać na scenie w 60 sekund.

### Guardrails
Terminal pozostaje prawdziwy — `git` i typowe edytory działają naprawdę;
riggowany jest wyłącznie agent, i jest to powiedziane wprost. Demo nie zależy
od sieci ani od modelu zewnętrznego.

## User Stories

### US-01: Przejście trzech kroków ścieżki bez instalacji
- **Given** deweloper klika „wypróbuj" z landingu toolkitu i trafia na kurs
  bez logowania, w świeżej sesji,
- **When** wykonuje w prawym panelu komendę podaną w kroku, a aplikacja
  potwierdza, że krok został wykonany,
- **Then** przycisk „Dalej" się odblokowuje i uczący się przechodzi kolejno
  przez `/101-init`, `/101-shape` i `/101-prd`, po każdym kroku widząc realny
  plik, który w jego wyniku powstał.

#### Acceptance Criteria
- Wejście na link nie wymaga żadnego logowania ani instalacji.
- W terminalu działają naprawdę `git` i edytor.
- Wywołanie agenta zwraca odpowiedź przypisaną do bieżącego kroku.
- Przycisk „Dalej" jest nieaktywny, dopóki krok nie zostanie wykonany.
- Po trzecim kroku na dysku istnieje dokument wymagań.
- Przeładowanie strony otwiera nową sesję od zera.

## Functional Requirements

- FR-010: Uczący się otwiera link i trafia w pierwszy krok kursu bez logowania i bez instalacji. Priority: must-have
  > Socratic: No counter-argument raised; stands as written.
- FR-020: Lewy panel pokazuje 1–3 akapity tekstu dla bieżącego kroku oraz przyciski nawigacji. Priority: must-have
  > Socratic: No counter-argument raised; stands as written.
- FR-030: Prawy panel daje uczącemu się działający terminal, w którym `git` i typowe edytory działają naprawdę. Priority: must-have
  > Socratic: No counter-argument raised; stands as written.
- FR-040: Uczący się wywołuje w terminalu agenta i dostaje pre-programowaną odpowiedź przypisaną do bieżącego kroku. Priority: must-have
  > Socratic: Counter-argument considered: "Jeśli nie powiedzieć wprost, że agent jest riggowany, a ktoś to wykryje, koszt jest większy niż zysk z efektu". Resolution: riggowanie zostaje, ale przestaje być ukryte — patrz FR-045.
- FR-045: Interfejs oznacza wprost, że agent w terminalu odtwarza pre-programowane odpowiedzi. Priority: must-have
  > Socratic: Wymaganie powstało jako rozstrzygnięcie ataku na FR-040.
- FR-050: Przycisk „Dalej" pozostaje zablokowany, dopóki aplikacja nie potwierdzi, że krok został wykonany w terminalu. Priority: must-have
  > Socratic: No counter-argument raised; stands as written.
- FR-060: Uczący się przechodzi trzy kroki ścieżki w kolejności: `/101-init`, `/101-shape`, `/101-prd`. Priority: must-have
  > Socratic: No counter-argument raised; stands as written.
- FR-070: Po każdym kroku uczący się widzi realny plik, który powstał na dysku w wyniku tego kroku. Priority: must-have
  > Socratic: No counter-argument raised; stands as written.
- FR-080: Uczący się resetuje kurs przeładowaniem strony, które otwiera nową sesję od stanu początkowego. Priority: must-have
  > Socratic: Counter-argument considered: "Reset przy prawdziwym terminalu to nie jest nice-to-have, bo bez niego jedna pomyłka kończy pokaz". Resolution: reset nie wymaga osobnego mechanizmu — jest nim przeładowanie strony, które otwiera nową sesję.

## Non-Functional Requirements

- Uczący się widzi pierwszy krok kursu w ciągu kilku sekund od otwarcia linku.
- Cały pokazywany przebieg kończy się w 60 sekund.
- Przebieg działa bez dostępu do zewnętrznej sieci i bez wywołania modelu
  językowego.

## Business Logic

Przycisk „Dalej" odblokowuje się dopiero wtedy, gdy aplikacja potwierdzi, że
bieżący krok został faktycznie wykonany w terminalu.

Uczący się widzi to jako bramkę: dopóki nie uruchomi komendy z lewego panelu,
nawigacja naprzód pozostaje nieaktywna. Potwierdzeniem jest obserwowalny
skutek kroku — plik, który po tym kroku istnieje, a wcześniej nie istniał.

## Access Control

Bez logowania i bez tożsamości: każdy, kto ma link, wchodzi od razu i dostaje
świeżą sesję. Postęp nie jest zapisywany — znika po zamknięciu karty, a
przeładowanie strony zaczyna kurs od nowa. Brak podziału na role.

## Non-Goals

- Zapisywanie postępu i konta użytkownika — kurs zaczyna się od zera przy
  każdym wejściu.
- Prawdziwy model AI w terminalu — agent pozostaje riggowany.
- Więcej niż jeden scenariusz kursu — jeden przebieg, ten pokazywany na demo.

## Quality cross-check

Wszystkie wymagane elementy są obecne (wizja, persona, kryteria sukcesu,
historyjka z Given/When/Then, 9 wymagań w formie kanonicznej, jednozdaniowa
reguła biznesowa, kontrola dostępu, non-goals, budżet czasowy, odwołania do
realnych artefaktów projektu). Zapisane luki, przyjęte świadomie:

- [GAP: wielu równoczesnych uczących się] — nie zostało ani wykluczone z
  zakresu, ani zaplanowane, a decyzja „przeładowanie otwiera nową sesję"
  sugeruje izolację sesji. Konsekwencja: `/101-tech-stack-selector` i
  `/101-infra-research` dostaną sprzeczny sygnał, a jeden kontener nie
  obsłuży dwóch osób naraz. Decyduje: właściciel produktu. Blokujące: nie
  dla demo, tak dla użycia po hackatonie.
- [GAP: nazwa produktu] — nie została podana; plik używa roboczej etykiety
  „interaktywny learner". Konsekwencja: PRD i repo odziedziczą etykietę
  roboczą. Decyduje: właściciel produktu. Blokujące: nie.
- [GAP: treść kursu] — dokładne akapity trzech kroków i skrypt odpowiedzi
  agenta nie istnieją. Konsekwencja: to największa nienazwana pozycja pracy
  na dziś; bez niej terminal działa, ale nie ma czego pokazać.
  Decyduje: właściciel produktu. Blokujące: tak.

## Forward: tech-stack

Ustalenia z równoległego researchu (2026-08-28), poza schematem PRD — do
rozstrzygnięcia przez `/101-tech-stack-selector`:

- Terminal ma być prawdziwy, nie symulowany: `ttyd -W` uruchomiony w
  istniejącym `devcontainer/`, osadzony jako iframe w prawym panelu
  statycznej strony. Zweryfikowane w tym kontenerze (arm64): jedna
  samowystarczalna strona ~729 KB, bez zewnętrznych zasobów, bez nagłówka
  `X-Frame-Options` — osadza się wprost. Szacowany koszt: ~1h.
- Riggowany jest wyłącznie agent: ~20-liniowy skrypt `agent` na `$PATH`
  odtwarzający zapisane odpowiedzi. `git` i edytory pozostają prawdziwe.
- Znane luki do załatania: obraz ma `vim`, nie ma `nano`; `node-pty` nie
  zbuduje się tutaj (brak kompilatora C++), co wyklucza własny serwer
  xterm.js. Kontener startować z `DEVCONTAINER_PORTS="5173 7681"`.
- Fallback na scenę: nagranie asciinema przećwiczonego przebiegu.
- Pełne memo: `scratchpad/browser-terminal-options.md`.

## Forward: technical-roadmap

- Kolejność dowożenia narzucona przez ryzyko: najpierw terminal w prawym
  panelu (bez niego nie ma demo), potem skrypt agenta i treść trzech kroków,
  na końcu bramka z FR-050. Bramka jest jedyną częścią, którą da się odciąć
  bez utraty przebiegu, jeśli zegar przyciśnie.
- Po hackatonie: `/101-agents-md` na nowo (obecny plik pisany pod presją
  czasu) oraz rozstrzygnięcie luki o wielu równoczesnych sesjach.
