# Terminal panel — Plan Brief

> Full plan: `context/changes/terminal-panel/plan.md`

## What & Why

Prawy panel strony kursu ma dawać uczącemu się prawdziwy terminal, w którym
`git` i typowe edytory działają naprawdę. To plaster S-02 z roadmapy — w
notatkach opisany wprost jako ten, bez którego nie ma demo, i jedyny, który
nie niesie ani jednej niewiadomej blokującej.

Przy okazji zdejmujemy blokadę, która dziś uniemożliwia uruchomienie
czegokolwiek: katalog zależności leży na montowaniu sieciowym, na którym
dowiązania są nieczytelne.

## Starting Point

Szkielet aplikacji stoi i warstwa serwerowa jest włączona, ale trasa główna
pokazuje powitalną stronę startera. Serwer deweloperski wstaje i odpowiada
200 — ale tylko wywołany bezpośrednią ścieżką; skróty `npm run *` kończą
się kodem 127. Obraz devcontainera ma `git` i `vim`, nie ma `nano` ani
binarki terminala. Skrypt uruchomieniowy publikuje na host tylko port
aplikacji.

## Desired End State

Strona główna pokazuje dwa panele. Prawy wypełnia działający terminal: da
się w nim pisać, uruchomić `git status`, otworzyć i zamknąć plik w
edytorze. Adres terminala pochodzi ze środowiska, więc ta sama strona
działa lokalnie i po wystawieniu na zewnątrz. Lewy panel jest jeszcze
pustym obszarem. `npm run dev`, `typecheck` i `build` znów działają jako
zwykłe komendy.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego | Źródło |
| --- | --- | --- | --- |
| Terminal prawdziwy czy symulowany | Prawdziwy, gotowy proces osadzony w stronie | Symulacja sypie się przy pierwszym edytorze pełnoekranowym i przy komendzie spoza skryptu | shape-notes, blok Forward |
| Co jest riggowane | Wyłącznie agent, w osobnej zmianie | `git` i edytory mają być autentyczne — to jest guardrail z PRD | shape-notes, PRD |
| Skąd binarka terminala | Z obrazu devcontainera | Obraz i tak jest przebudowywany dla `nano`, a demo nie ma zależeć od sieci | to planowanie |
| Skąd strona zna adres terminala | Zmienna środowiskowa z domyślną z mapowania portów | Ten sam kod działa lokalnie i po wystawieniu dla jury | to planowanie |
| Naprawa uruchamialności | Wolumen kontenera pod katalogiem zależności, zmiany w `devcontainer/` | Leczy przyczynę, a nie objaw; `devcontainer/` jest w repozytorium | to planowanie |
| Brakujący edytor | `nano` dokładany do obrazu | Wymaganie mówi o typowych edytorach, a na scenie z nano widać jak wyjść | to planowanie |
| Przekazywanie ruchu przez serwer aplikacji | Odrzucone | Najdroższa z rozważanych dróg, a jej zysk dotyczy wystawienia, nie tej zmiany | memo z researchu |

## Scope

**In**

- Obraz devcontainera: `nano`, binarka terminala, katalog zależności z prawami umożliwiającymi zapis
- Skrypt uruchomieniowy: wolumen katalogu zależności, publikacja portu terminala
- Sprzątanie instancji: usuwanie nowego wolumenu
- Skrypty projektu niezależne od dowiązań
- Skrypt podnoszący terminal w trybie zapisu
- Trasa główna: układ dwupanelowy, adres terminala z loadera, osadzenie

**Out**

- Treść kursu i nawigacja w lewym panelu (S-01)
- Riggowany agent (S-03)
- Bramka blokująca przejście dalej (S-05)
- Wystawienie do internetu dla jury
- Baza danych i zapis stanu

## Architecture / Approach

Terminal jest obcym procesem, nie częścią aplikacji: aplikacja zna wyłącznie
jego adres i wstawia go w prawy panel. Granica przebiega dokładnie tam, bo
to najtańsza droga do prawdziwego terminala i jedyna, która mieści się w
dzisiejszym terminie.

Adres rozstrzyga jedna funkcja po stronie serwera, w kolejności: jawna
zmienna, potem port hosta odczytany z mapowania, które skrypt uruchomieniowy
już przekazuje do kontenera, na końcu wartość domyślna. Dzięki temu wystawienie
na zewnątrz nie wymaga zmiany kodu.

## Phases at a Glance

| Faza | Co dowozi | Główne ryzyko |
| --- | --- | --- |
| 1. Devcontainer: uruchamialność, edytor i port | Środowisko, w którym komendy projektu działają, a terminal i edytor istnieją | Wymaga restartu sesji — praca dzieli się na przed i po, a błąd w obrazie widać dopiero po przebudowie |
| 2. Proces terminala | Terminal odpowiadający samodzielnie, bez udziału strony | Tryb zapisu jest opcją, nie domyślną — pominięty daje terminal, który wygląda dobrze i ignoruje klawiaturę |
| 3. Prawy panel z osadzonym terminalem | Dwupanelowa strona z terminalem po prawej | Osadzenie obcego procesu w stronie; przy złym adresie panel jest pusty bez czytelnego błędu |

**Prerequisites:** dostęp do przebudowy obrazu devcontainera po stronie hosta
oraz zgoda na restart sesji między fazą 1 a 2. Obie potwierdzone.

**Estimated effort:** mieści się w dzisiejszym terminie; podział wymuszony
nie objętością pracy, tylko restartem sesji po fazie 1.

## Open Risks & Assumptions

- **Restart sesji jest twardym warunkiem** przejścia do fazy 2. Bez niego
  fazy 2 i 3 nie dają się zweryfikować.
- **Wolumen startuje pusty** — zależności trzeba zainstalować raz od nowa
  po restarcie. Jeśli to zaskoczy w trakcie, wygląda jak zepsute repozytorium.
- **Pobranie binarki dzieje się przy budowie obrazu**, więc host musi mieć
  wtedy sieć. Na scenie już nie musi.
- **Zakłada się architekturę procesora zgodną z jednym z dwóch wariantów**
  binarki; obraz kończy budowę czytelnym błędem dla innych.
- **Zmiana skryptów projektu jest obejściem** ograniczenia montowania, nie
  docelowym kształtem. Warto ją przejrzeć, gdy repozytorium trafi na
  zwykły system plików.
- Strona startera ładuje krój pisma z zewnętrznego serwisu, co kłóci się z
  kryterium pozafunkcjonalnym o działaniu bez sieci. Poza zakresem tej
  zmiany — odnotowane, żeby nie zginęło.

## Success Criteria (Summary)

Strona główna pokazuje dwa panele, a w prawym da się kliknąć, wpisać
`git status` i zobaczyć wynik oraz otworzyć i zamknąć plik w edytorze.
Kontrola typów i budowanie przechodzą zwykłymi komendami projektu.
Ustawienie zmiennej z adresem terminala przekierowuje panel bez zmiany kodu.
