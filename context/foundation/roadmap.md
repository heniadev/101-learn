---
project: 101-learn
version: 1
status: draft
created: 2026-08-28
updated: 2026-08-28
prd_version: 1
main_goal: speed
top_blocker: time
---

> Wygenerowane z `context/foundation/prd.md` (v1) oraz bloku
> `## Forward: technical-roadmap` z `context/foundation/shape-notes.md`.
> To dokument żywy — edytuj go na miejscu; identyfikatory `S-NN` i `F-NN`
> są stałe i nigdy nie są przenumerowywane.

## Vision recap

Deweloper, który słyszał o toolkicie 101, nie ma dziś jak zobaczyć, jak ten
toolkit faktycznie działa, zanim zainwestuje własny czas — droga do
pierwszego efektu jest na tyle długa, że większość odpada po drodze. Produkt
to interaktywny learner w przeglądarce: po lewej 1–3 akapity tekstu
i przyciski nawigacji, po prawej terminal z riggowanym agentem, `git`
i typowymi edytorami.

## North star

**S-04 — Uczący się przechodzi trzy kroki ścieżki i po każdym widzi realny
plik, który powstał.** Północna gwiazda to ten jeden plaster pionowy — jedna zdolność widoczna
dla użytkownika, przecięta przez wszystkie warstwy, których potrzebuje —
który dowodzi, że pomysł działa; wszystko inne istnieje po to, żeby go
umożliwić.

> Wybrana, bo jest dosłownym powtórzeniem kryterium głównego z PRD:
> „Uczący się przechodzi trzy kroki ścieżki (`/101-init`, `/101-shape`,
> `/101-prd`) w przeglądarce, bez instalacji, i na końcu widzi realny
> dokument, który sam wywołał". Jeśli ten plaster działa, produkt dowiódł
> swojej tezy; jeśli nie, reszta jest dekoracją.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
| --- | --- | --- | --- | --- | --- |
| F-01 | `runnable-environment` | (bez efektu widocznego dla użytkownika) aplikacja i terminal startują w jednym powtarzalnym środowisku | — | FR-010, FR-030 | blocked |
| S-01 | `course-first-step` | otworzyć link i zobaczyć pierwszy krok kursu: tekst i przyciski nawigacji | F-01 | FR-010, FR-020, US-01 | blocked |
| S-02 | `terminal-panel` | pracować w prawym panelu w prawdziwym terminalu, w którym `git` i edytor działają naprawdę | F-01 | FR-030, US-01 | proposed |
| S-03 | `rigged-agent` | wywołać agenta w terminalu i dostać odpowiedź przypisaną do kroku, wyraźnie oznaczoną jako pre-programowana | S-02 | FR-040, FR-045 | blocked |
| S-04 | `three-step-path` | przejść trzy kroki ścieżki i po każdym zobaczyć realny plik, który powstał | S-01, S-03 | FR-060, FR-070, US-01 | blocked |
| S-05 | `step-gate` | ruszyć naprzód dopiero wtedy, gdy krok został faktycznie wykonany | S-01, S-02 | FR-050, US-01 | proposed |
| S-06 | `fresh-session-reload` | zacząć kurs od nowa przeładowaniem strony | S-01 | FR-080, US-01 | proposed |

## Streams

Strumień to widok pomocniczy: grupa pozycji leżących na jednym łańcuchu
zależności, bez własnych identyfikatorów i bez mocy rozstrzygania — przy sprzeczności
wygrywa porządek topologiczny, czyli kolejność, w której każda pozycja stoi
po wszystkich swoich warunkach wstępnych.

| Stream | Theme | Chain | Note |
| --- | --- | --- | --- |
| A | Środowisko i tekst kursu | F-01 → S-01 → S-06 | Łańcuch, od którego zależy wszystko inne. |
| B | Terminal i agent | S-02 → S-03 → S-04 | Kończy się północną gwiazdą. |
| C | Bramka wykonania | S-05 | Jedyna pozycja, którą blok Forward wskazał jako odcinalną bez utraty przebiegu. |

## Baseline

Baseline to stan istniejącego kodu ustalony przez zbadanie repozytorium,
a nie przez pytanie — jest jedyną częścią tej roadmapy, która starzeje się
sama i przy regeneracji jest badana od nowa.

**as of 2026-08-28**

| Warstwa | Werdykt | Dowód |
| --- | --- | --- |
| Frontend | present | `react`, `react-router`, `tailwindcss` w `package.json`; `app/root.tsx`, `app/routes.ts`, `vite.config.ts`. Zadeklarowane również w `context/foundation/tech-stack.md`. |
| Backend / API | partial | `react-router.config.ts:6` ustawia `ssr: true`, więc warstwa serwerowa istnieje; jedyna trasa to `app/routes/home.tsx`, bez loadera i akcji. |
| Dane | absent | Brak katalogów migracji i brak biblioteki dostępu do danych w `package.json`. Baza stoi w `devcontainer/docker-compose.yml:11`, ale aplikacja niczego z nią nie łączy. |
| Tożsamość | absent | Brak bibliotek tożsamości w `package.json` i brak obsługi sesji w `app/`. Zgodne z `has_auth: false` w hand-offie. |
| Wdrożenie / infra | partial | `Dockerfile` i `.dockerignore` od startera, `devcontainer/docker-compose.yml`, `devcontainer/k8s/`. Brak katalogu `.github/`, mimo że hand-off deklaruje `ci_provider: github-actions`. |
| Obserwowalność | absent | Brak bibliotek logowania, śledzenia błędów i metryk w `package.json`. |

## Foundations

Fundament to przekrojowy warunek wstępny bez własnego efektu widocznego dla
użytkownika — wolno mu istnieć tylko wtedy, gdy da się nazwać, co odblokowuje.

W polach poniżej: blokada to rzecz, której zespół nie rozwiąże sam (cudza
decyzja, cudzy materiał), a niewiadoma to rzecz, którą rozwiąże własnymi
siłami — niewiadoma oznaczona jako blokująca podnosi status pozycji na
`blocked`.

### F-01: Aplikacja i terminal startują w jednym powtarzalnym środowisku

- **Outcome**: komendy uruchomieniowe projektu wykonują się i dają się powtórzyć; nie ma to efektu widocznego dla uczącego się.
- **Change ID**: `runnable-environment`
- **PRD refs**: FR-010, FR-030
- **Unlocks**: S-01 i S-02 — dopóki projekt nie wstaje, żadnego plastra nie da się ani zweryfikować, ani pokazać.
- **Prerequisites**: —
- **Parallel with**: —
- **Blockers**: —
- **Unknowns**: katalog roboczy leży na montowaniu sieciowym, na którym dowiązania w katalogu zależności są nieczytelne, więc skróty uruchomieniowe projektu kończą się błędem. Właściciel: zespół. Blokujące: tak.
- **Risk**: stoi pierwszy, bo dziś żadna komenda uruchomieniowa projektu nie działa — wszystko, co po nim, jest niesprawdzalne.
- **Status**: blocked

## Slices

Plaster pionowy to jedna zdolność widoczna dla użytkownika, przecięta przez
wszystkie warstwy, których potrzebuje — przeciwieństwo budowania całej
warstwy naraz.

### S-01: Pierwszy krok kursu w lewym panelu

- **Outcome**: uczący się otwiera link i widzi pierwszy krok kursu — tekst i przyciski nawigacji — bez logowania i bez instalacji.
- **Change ID**: `course-first-step`
- **PRD refs**: FR-010, FR-020, US-01
- **Prerequisites**: F-01
- **Parallel with**: S-02, S-03
- **Blockers**: —
- **Unknowns**: akapity opisujące pierwszy krok nie istnieją — to część blokującej luki `[GAP: treść kursu]` z PRD. Właściciel: właściciel produktu. Blokujące: tak.
- **Risk**: leży wcześnie, bo jest najtańszym dowodem, że środowisko z F-01 faktycznie coś pokazuje; jego treść jest jednak niewiadomą, a nie kodem.
- **Status**: blocked

### S-02: Prawdziwy terminal w prawym panelu

- **Outcome**: uczący się pracuje w prawym panelu w terminalu, w którym `git` i edytor działają naprawdę.
- **Change ID**: `terminal-panel`
- **PRD refs**: FR-030, US-01
- **Prerequisites**: F-01
- **Parallel with**: S-01, S-06
- **Blockers**: —
- **Unknowns**: —
- **Risk**: blok `## Forward: technical-roadmap` w notatkach nazywa to wprost — „najpierw terminal w prawym panelu (bez niego nie ma demo)". To jedyny plaster bez niewiadomej i jedyny, który da się dziś oddać w całości.
- **Status**: proposed

### S-03: Agent odpowiadający w terminalu, oznaczony jako pre-programowany

- **Outcome**: uczący się wywołuje agenta i dostaje odpowiedź przypisaną do bieżącego kroku, a interfejs mówi wprost, że odpowiedzi są odtwarzane.
- **Change ID**: `rigged-agent`
- **PRD refs**: FR-040, FR-045
- **Prerequisites**: S-02
- **Parallel with**: S-01, S-05, S-06
- **Blockers**: —
- **Unknowns**: skrypt odpowiedzi agenta nie istnieje — druga połowa blokującej luki `[GAP: treść kursu]`. Właściciel: właściciel produktu. Blokujące: tak.
- **Risk**: to część, która na scenie wygląda jak magia, ale jej wartość jest wprost proporcjonalna do jakości napisanej treści — kod jest tu tańszy niż tekst.
- **Status**: blocked

### S-04: Pełna trzykrokowa ścieżka z widocznym plikiem

- **Outcome**: uczący się przechodzi trzy kroki ścieżki w kolejności i po każdym widzi realny plik, który w jego wyniku powstał.
- **Change ID**: `three-step-path`
- **PRD refs**: FR-060, FR-070, US-01
- **Prerequisites**: S-01, S-03
- **Parallel with**: S-05, S-06
- **Blockers**: —
- **Unknowns**: treść wszystkich trzech kroków musi być spójna z plikami, które po nich powstają — to najszersza część blokującej luki `[GAP: treść kursu]`. Właściciel: właściciel produktu. Blokujące: tak.
- **Risk**: to północna gwiazda, więc leży tak wcześnie, jak pozwalają jej warunki wstępne; nie da się jej postawić przed S-01 i S-03, bo składa się z ich wyników.
- **Status**: blocked

### S-05: Bramka wykonania kroku

- **Outcome**: uczący się rusza naprzód dopiero wtedy, gdy aplikacja potwierdzi, że bieżący krok został faktycznie wykonany w terminalu.
- **Change ID**: `step-gate`
- **PRD refs**: FR-050, US-01
- **Prerequisites**: S-01, S-02
- **Parallel with**: S-03, S-04, S-06
- **Blockers**: —
- **Unknowns**: sposób, w jaki lewy panel dowiaduje się o skutkach pracy w terminalu, nie został rozstrzygnięty — w kroku wyboru stacku padła decyzja o własnym kanale po stronie aplikacji, opisana tam jako największy nieplanowany kawałek pracy. Właściciel: zespół. Blokujące: nie.
- **Risk**: to jedyna pozycja, którą blok Forward wskazał jako odcinalną bez utraty przebiegu — jeśli zegar przyciśnie, przebieg działa bez niej, tylko bez własnej reguły produktu.
- **Status**: proposed

### S-06: Nowa sesja po przeładowaniu

- **Outcome**: uczący się zaczyna kurs od stanu początkowego, przeładowując stronę.
- **Change ID**: `fresh-session-reload`
- **PRD refs**: FR-080, US-01
- **Prerequisites**: S-01
- **Parallel with**: S-02, S-03, S-04, S-05
- **Blockers**: —
- **Unknowns**: —
- **Risk**: najtańsza pozycja w całym zestawieniu — w rundzie sokratejskiej ustalono, że reset nie wymaga osobnego mechanizmu. Leży późno wyłącznie dlatego, że potrzebuje istniejącego kursu, a nie dlatego, że jest trudna.
- **Status**: proposed

## Backlog Handoff

Przekazanie do backlogu to tabela tłumacząca pozycje tej roadmapy na
zadania, które `/101-new` przyjmie jako identyfikator zmiany.

| Roadmap ID | Change ID | Suggested issue title | Ready for `/101-plan` | Notes |
| --- | --- | --- | --- | --- |
| F-01 | `runnable-environment` | Doprowadzić projekt do stanu, w którym jego komendy uruchomieniowe działają | nie | Blokujące: montowanie sieciowe uniemożliwia wykonywanie dowiązań w katalogu zależności. |
| S-01 | `course-first-step` | Pierwszy krok kursu w lewym panelu | nie | Blokujące: brak akapitów kroku. |
| S-02 | `terminal-panel` | Prawdziwy terminal w prawym panelu | tak, po F-01 | Jedyny plaster bez niewiadomej. |
| S-03 | `rigged-agent` | Agent odtwarzający odpowiedzi kroku, oznaczony w interfejsie | nie | Blokujące: brak skryptu odpowiedzi. |
| S-04 | `three-step-path` | Pełna trzykrokowa ścieżka z widocznym plikiem po każdym kroku | nie | Północna gwiazda. Blokujące: brak treści trzech kroków. |
| S-05 | `step-gate` | Bramka odblokowująca nawigację po wykonaniu kroku | tak, po S-01 i S-02 | Kandydat do odcięcia, jeśli zegar przyciśnie. |
| S-06 | `fresh-session-reload` | Nowa sesja kursu po przeładowaniu strony | tak, po S-01 | Bez własnego mechanizmu. |

## Open Roadmap Questions

Przeniesione z `## Open Questions` w PRD:

1. **[GAP: treść kursu]** — akapity trzech kroków i skrypt odpowiedzi agenta nie istnieją. Decyduje: właściciel produktu. Blokujące: tak. Blokuje S-01, S-03 i S-04, czyli także północną gwiazdę.
2. **[GAP: wielu równoczesnych uczących się]** — ani wykluczone z zakresu, ani zaplanowane. Decyduje: właściciel produktu. Blokujące: nie. Powiązane z pozycją w sekcji `## Parked` poniżej.
3. **[GAP: nazwa produktu]** — **rozstrzygnięte** w kroku wyboru stacku: `101-learn`, nazwa obecna już w wolumenie `devcontainer/docker-compose.yml`. Wpisana w nagłówek tej roadmapy; PRD wciąż niesie etykietę roboczą i wymaga wyrównania.

Podniesione przy pracy nad roadmapą:

4. **Uruchamialność na montowaniu sieciowym** — dowiązania w katalogu zależności są nieczytelne, więc skróty uruchomieniowe projektu padają. Decyduje: zespół. Blokujące: tak — to jedyna niewiadoma blokująca F-01, a więc cały graf.
5. **Wystawienie do internetu dla jury** — poza zakresem PRD; blokada zewnętrzna, bo tożsamość devcontainera ma do klastra dostęp wyłącznie do odczytu. Decyduje: właściciel produktu wspólnie z operatorem klastra. Blokujące: nie dla budowy, tak dla samej prezentacji.
6. **Własny kanał zdarzeń między terminalem a lewym panelem** — decyzja zapadła w kroku wyboru stacku i została tam opisana jako największy nieplanowany kawałek pracy, ale PRD nie ma dla niej wymagania. Decyduje: zespół. Blokujące: nie.

## Parked

Zaparkowane to rzeczy świadomie odłożone: nie wchodzą do kolejności, bo PRD
ich nie deklaruje, a roadmapa nigdy nie rozszerza PRD.

- **Izolacja sesji per uczestnik i dispatcher zarządzający kontenerami**. Why parked: to architektura docelowa nazwana w rozmowie o stacku, ale PRD nie ma dla niej ani wymagania, ani historyjki, a tożsamość devcontainera nie może niczego zaaplikować na klastrze. Droga powrotna prowadzi przez `/101-prd`, nie przez tę roadmapę.
- **Zapis czegokolwiek do bazy danych**. Why parked: baza stoi w compose, ale PRD nie ma dziś nic do zapisania — non-goal wprost wyklucza zapisywanie postępu i konta. Fundament bez odbiorcy byłby dryfem w stronę warstwy poziomej.

## Done

_(pusta — wypełnia ją wyłącznie `/101-archive`)_
