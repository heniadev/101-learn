<!-- PLAN-REVIEW-REPORT -->

# Terminal panel — Plan Review

- **Plan**: `context/changes/terminal-panel/plan.md`
- **Mode**: full
- **Date**: 2026-08-28
- **Verdict**: NEEDS RETHINKING → **SAFE TO EXECUTE** po triage'u (2026-08-28)
- **Findings**: 3 🔴 CRITICAL, 5 ⚠️ WARNING, 2 📝 OBSERVATION — wszystkie rozstrzygnięte

## Verdicts

| Wymiar                  | Przed triage'em | Po triage'u |
| ----------------------- | --------------- | ----------- |
| Osiągalność stanu docelowego | FAIL       | PASS        |
| Ekonomia wykonania      | WARNING         | PASS        |
| Dopasowanie architektoniczne | WARNING    | PASS        |
| Martwe pola             | FAIL            | PASS        |
| Kompletność dokumentu   | WARNING         | PASS        |

Werdykt wyjściowy wyprowadzony mechanicznie: dwa FAIL oraz trzy findingi 🔴 CRITICAL →
`NEEDS RETHINKING`. Po triage'u wszystkie dziesięć findingów jest rozstrzygniętych i wniesionych
do planu, żaden wymiar nie zostaje na WARNING ani FAIL → **`SAFE TO EXECUTE`**.

**Co się zmieniło w podejściu.** Dwie rzeczy, obie na wniosek użytkownika, obie odwracające
wcześniejszą decyzję planu:

1. **Terminal nie wychodzi na host.** Ruch idzie przez serwer aplikacji jako ścieżka
   `/terminal/` na tym samym origin (Vite `server.proxy`, `ws: true`). Plan odrzucał tę drogę
   jako „najdroższą"; wycena nie broniła się wobec kodu — `vite.config.ts` istnieje, a
   podniesienie połączenia Vite obsługuje sam. Efekt uboczny: znika cała klasa problemów
   z publikacją drugiego portu.
2. **Restart sesji dostał własną fazę.** Fazy jest teraz cztery; faza 1 kończy się na commicie,
   faza 2 zaczyna w nowym kontenerze.

**Czego ten przegląd NIE zweryfikował** (blind spot dopisany po triage'u): nowa droga —
przekazywanie ruchu WebSocket przez serwer deweloperski React Router/Vite do `ttyd` — nie została
sprawdzona w działaniu. Potwierdziłem tylko, że `vite.config.ts` istnieje i że Vite ma
`server.proxy` z `ws: true`. Jeśli wtyczka React Routera wchodzi w drogę podniesieniu połączenia,
wyjdzie to dopiero w fazie 4 i objawi się terminalem, który się rysuje i zamiera. Warto sprawdzić
to jako pierwszą rzecz w tej fazie, przed resztą układu.

## Grounding

Grounding: 9/9 ścieżek istnieje (`scripts/` i `app/lib/` to katalogi nowe, zgodnie z deklaracją planu);
wszystkie cytowane numery linii potwierdzone (`react-router.config.ts:6`, `Dockerfile:12`, `:286`,
`run.sh:69-76`, `:154-155`, `:197`, `:204`, `cleanup.sh:80`); symbol `Welcome` obecny i importowany
wyłącznie z `app/routes/home.tsx:2`. Diagnoza kodu 127 potwierdzona empirycznie: `npm run typecheck`
kończy się `sh: 1: react-router: Operation not permitted`, a `ls node_modules/.bin` zgłasza
`cannot read symbolic link ... Operation not permitted`.

Kontrola mechaniczna `## Progress`: **PASS** — dokładnie jeden nagłówek `## Progress` (linia 340),
na końcu dokumentu; wszystkie trzy fazy mają bloki o identycznych tytułach; liczba pozycji
zgadza się z liczbą kryteriów w każdej fazie (1.1–1.5, 2.1–2.4, 3.1–3.6); w treściach faz
nie ma ani jednego checkboxa.

Kontrola mechaniczna powtórzona po triage'u (Progress był przepisywany): **PASS** — jeden
`## Progress` na końcu, cztery fazy o zgodnych tytułach, liczby pozycji 2/5/4/6 równe liczbom
kryteriów, zero checkboxów poza sekcją.

Skan powierzchni kontraktowych: `docs/reference/contract-surfaces.md` istnieje, ale rejestr jest
pusty (`_(Brak zarejestrowanych powierzchni.)_`) — brak wzorców do dopasowania.

## Findings

### F1 — Opublikowany terminal to nieuwierzytelniona powłoka na porcie hosta

- **Severity**: 🔴 CRITICAL
- **Impact**: 🧠 HIGH — rozstrzygnięcie wymaga decyzji projektowej, nie samej poprawki.
- **Dimension**: Martwe pola
- **Location**: `plan.md` faza 1, zmiana #2 (`DEVCONTAINER_PORTS` → `5173 7681`); faza 2,
  `scripts/start-terminal.sh`; brak jakiejkolwiek wzmianki w sekcji planu o ryzykach.
- **Detail**: Cały model bezpieczeństwa devcontainera opiera się na tym, że tryb YOLO jest
  akceptowalny, bo *nic z zewnątrz nie wchodzi do środka* — `run.sh:319-323` wypisuje to wprost
  jako uzasadnienie. Plan przebija w tym modelu dziurę: `-p 7681:7681` wiąże się domyślnie na
  `0.0.0.0`, a `ttyd` z jawnie włączonym trybem zapisu i bez opcji poświadczeń daje **każdemu, kto
  dosięgnie portu hosta, interaktywną powłokę w kontenerze**. W środowisku tej powłoki siedzą
  `GIT_PASSWORD`, `ANTHROPIC_API_KEY`, opcjonalnie `SENTRY_ACCESS_TOKEN` i `EXA_API_KEY`
  (`run.sh:213`, `:235`, `:269`, `:285`), zamontowane jest całe repozytorium, a przy obecnym
  `kubeconfig.yaml` — także dostęp do klastra. Zapora z `entrypoint.sh` tego nie zatrzymuje:
  reguły dotyczą wyłącznie łańcucha `OUTPUT`, ruch przychodzący wraca jako `ESTABLISHED`
  (`entrypoint.sh:26-27`). Plan wymienia „Blind spots" w postaci ryzyk operacyjnych, ale
  granicy bezpieczeństwa nie dotyka ani jednym zdaniem — a Desired End State wprost zakłada,
  że ta sama strona ma działać „po wystawieniu na zewnątrz".
- **Fix**:
  - **Podejście**: dopisać do kontraktu fazy 1 wiązanie publikacji na pętlę zwrotną
    (`-p 127.0.0.1:<host>:<container>` dla portu terminala), a do kontraktu
    `scripts/start-terminal.sh` — nasłuch `ttyd` wyłącznie na interfejsie lokalnym kontenera.
    W sekcji „What We're NOT Doing" zamienić dzisiejsze „nie wystawiamy niczego do internetu"
    na jawny zapis: *wystawienie na zewnątrz wymaga uwierzytelnienia terminala i jest osobną
    decyzją*.
  - **Korzyść**: przywraca własność, na której stoi zgoda na tryb YOLO (`run.sh:319-323`),
    nie odbierając niczego z demo — przeglądarka i tak działa na hoście.
  - **Koszt**: dwie linie kontraktu w planie; w implementacji jeden argument w `run.sh`
    i jeden przy uruchomieniu `ttyd`.
  - **Pewność**: wysoka co do ekspozycji — domyślne wiązanie `-p` na `0.0.0.0` i brak reguł
    `INPUT` są potwierdzone w kodzie. **Martwe pole**: nie sprawdzałem, czy Twój host nie stoi
    już za zaporą, która odcina ten port od sieci lokalnej — jeśli tak, ryzyko jest mniejsze,
    ale nie znika przy wystawieniu dla jury, o którym mówi Desired End State.
- **Decision**: APPLY DIFFERENTLY — port terminala nie idzie na host w ogóle. `ttyd`
  nasłuchuje tylko na `127.0.0.1` w kontenerze, a ruch przechodzi przez serwer
  aplikacji jako ścieżka `/terminal/` na tym samym origin (Vite `server.proxy`,
  `ws: true`). Odwraca to decyzję planu „nie budujemy przekazywania ruchu" —
  uzasadnioną wyceną („najdroższa droga"), której kod nie potwierdza: `vite.config.ts`
  istnieje, a podniesienie połączenia Vite obsługuje sam. Zastrzeżenie wpisane do planu:
  działa to tylko w trybie deweloperskim; `npm run build` + `npm start` potrzebowałoby
  własnego przekazywania. Zmienione: Overview, Desired End State, Key Discoveries,
  What We're NOT Doing, Critical Implementation Details, faza 1 (#2 + Overview),
  faza 2 (kontrakt `ttyd`), faza 3 (#1 przepisane, nowy #2 `vite.config.ts`), References.

### F2 — Publikacja portu opiera się na domyślnej wartości, którą to środowisko nadpisuje

- **Severity**: 🔴 CRITICAL
- **Impact**: 🧠 HIGH
- **Dimension**: Osiągalność stanu docelowego
- **Location**: `plan.md` — Current State Analysis („publikuje porty z `DEVCONTAINER_PORTS`
  (domyślnie `5173`)"), faza 1 zmiana #2 bullet 3, kryteria 1.2, 1.5 oraz 3.3–3.6.
- **Detail**: Plan zmienia **domyślną** wartość `DEVCONTAINER_PORTS` w `run.sh:197` i `:204`
  i traktuje to jako wystarczające. Tymczasem kontener, w którym ta praca się toczy, ma
  `DEVCONTAINER_PORT_MAP=7888:7888` — czyli operator uruchamia `run.sh` z jawnie ustawionym
  `DEVCONTAINER_PORTS=7888`. W takim wywołaniu **nowa domyślna wartość nigdy się nie aktywuje**:
  port 7681 nie zostanie opublikowany, a port 5173 nie jest opublikowany już dziś. To wywraca
  kryterium 1.2 (`http://localhost:5173/` z hosta), całe kryterium 1.5 i wszystkie ręczne
  kryteria fazy 3, bo przeglądarka na hoście nie zobaczy ani aplikacji, ani terminala.
  Dodatkowo, w trybie prostym mapowanie jest sztywne 1:1 (`run.sh:205`) — bez sondowania wolnego
  portu, które istnieje tylko w trybie instancji (`:198`). Port 7681 to domyślny port `ttyd`,
  więc kolizja na hoście nie da łagodnej degradacji, tylko `docker run` kończący się błędem
  „port is already allocated" i **devcontainer, który w ogóle nie wstaje**.
- **Fix**:
  - **Podejście**: przenieść kontrakt z „zmień domyślną wartość" na „terminal jest publikowany
    niezależnie od `DEVCONTAINER_PORTS`" — port terminala dokładany do listy publikacji zawsze,
    obok tego, co poda operator, w obu trybach. Przy okazji dopisać do kontraktu, że w trybie
    prostym port terminala też przechodzi przez `find_free_host_port`, a wynik ląduje
    w `PORT_MAP` (co plan już zakłada w fazie 3).
  - **Korzyść**: usuwa cichą zależność od tego, jak akurat wywołano `run.sh`, i domyka pętlę
    z fazą 3, która i tak czyta port hosta z `DEVCONTAINER_PORT_MAP`. Dowód, że dzisiejsze
    założenie nie trzyma, jest twardy: `DEVCONTAINER_PORT_MAP=7888:7888` w tej sesji.
  - **Koszt**: jeden bullet kontraktu więcej w fazie 1; w implementacji kilka linii w obu
    gałęziach pętli publikującej.
  - **Pewność**: wysoka — nadpisanie jest zaobserwowane, nie wywnioskowane. **Martwe pole**:
    nie wiem, *dlaczego* operator używa 7888 ani czy to stała praktyka, czy jednorazowy wybór
    tej sesji; jeśli to jednorazowe, ostrość findingu spada, ale kruchość konstrukcji zostaje.
- **Decision**: APPLY DIFFERENTLY — połowa findingu odpadła wraz z decyzją F1 (portu
  terminala nie publikujemy w ogóle, więc domyślna `DEVCONTAINER_PORTS` znika z planu).
  Reszta rozwiązana od strony aplikacji, nie skryptu: `server.port` czytany z `PORT` →
  portu kontenera z `DEVCONTAINER_PORT_MAP` → `5173`. Przy okazji wyszedł drugi, nieopisany
  wcześniej warunek: Vite domyślnie wiąże się na pętlę zwrotną, więc publikacja portu
  Dockera i tak by nie zadziałała — `server.host: 0.0.0.0` dopisane do tego samego kontraktu.
  Zmienione: Critical Implementation Details (nowy akapit), faza 3 #2. Kryteria i `## Progress`
  bez zmian — 1.2 jest sprawdzane wewnątrz kontenera i pozostaje prawdziwe.

### F3 — Faza 1 jest weryfikowalna dopiero po restarcie, który plan umieszcza dopiero za nią

- **Severity**: 🔴 CRITICAL
- **Impact**: 🔎 MEDIUM — poprawka jest jasna, ale dotyka więcej niż jednego miejsca w dokumencie.
- **Dimension**: Osiągalność stanu docelowego
- **Location**: `plan.md` — Implementation Approach („warunek przejścia do fazy 2"),
  Migration Notes („Restart sesji jest obowiązkowy **po fazie 1**"), kryteria 1.1–1.5.
- **Detail**: Wewnętrzna sprzeczność. Plan dwa razy stawia restart *na granicy* faz 1 i 2, ale
  **wszystkie pięć kryteriów fazy 1 da się sprawdzić dopiero po restarcie**: 1.1 i 1.2 wymagają
  działającego `npm run` (czyli wolumenu i przeinstalowanych zależności), 1.4 wymaga przebudowanego
  obrazu, 1.5 wymaga nowej publikacji portów. Kryterium 1.3 mówi wprost „sesja została
  zrestartowana", więc restart w rzeczywistości leży *wewnątrz* fazy 1 — a to zderza się z rytuałem
  wykonania: sesja, która wprowadza zmiany, ginie przed weryfikacją i przed commitem fazy.
  Plan nie mówi ani słowa o tym, jak wznowić fazę 1 po restarcie: czy commitować przed restartem,
  czy zależności instaluje operator, czy nowa sesja ma wejść w `/101-implement` i zastać
  niezaznaczone pozycje 1.1–1.5. Kolejność w `## Progress` (Automated przed Manual) dodatkowo
  sugeruje wykonawcy, żeby zaczął od 1.1 — czyli od kroku, który przed restartem **musi** zawieść.
- **Fix**:
  - **Podejście**: rozciąć fazę 1 na dwie: „1. Zmiany w obrazie i skrypcie uruchomieniowym"
    (kryterium: diff istnieje, commit istnieje — sprawdzalne przed restartem) i „2. Restart
    i weryfikacja środowiska" (dzisiejsze 1.1–1.5). Granica restartu wypada wtedy między nimi,
    a nie w środku fazy. Do Migration Notes dopisać jawną procedurę wznowienia: co commitować
    przed restartem, kto instaluje zależności, czym wznowić pracę.
  - **Korzyść**: każda faza znów ma bramkę, którą da się przejść w jednej sesji — czyli
    dokładnie ta własność, którą Implementation Approach obiecuje zdaniem „zatrzymanie po
    dowolnej fazie zostawia coś działającego".
  - **Koszt**: podział jednej fazy i renumeracja pozycji `## Progress` — zabieg czysto
    dokumentowy, przed startem implementacji bezkosztowy.
  - **Pewność**: wysoka co do samej sprzeczności — obie strony są cytatami z planu, a
    nieuruchamialność `npm run` przed restartem potwierdziłem komendą. **Martwe pole**:
    nie wiem, jak Twój rytuał wykonania zachowuje się przy fazie przerwanej restartem —
    jeśli w praktyce wznawiacie to ręcznie i bez ceremonii, wystarczy sam akapit w Migration
    Notes zamiast podziału fazy.
- **Decision**: APPLY FIX — faza 1 rozcięta na dwie. Faza 1 to same edycje plików, kończy się
  na commicie i ma kryteria sprawdzalne przed restartem (`bash -n` na obu skryptach). Nowa faza 2
  „Restart sesji i weryfikacja środowiska" nie zmienia żadnego pliku: opisuje kroki operatora
  (restart, instalacja zależności od nowa, wznowienie) i przejmuje dawne kryteria 1.1–1.4.
  Dawne fazy 2 i 3 przenumerowane na 3 i 4. Za zgodą użytkownika przepisana została też sekcja
  `## Progress` (fazy 1–4, numeracja od nowa) — normalnie ten skill jej nie dotyka, ale
  pozostawienie jej niespójnej z fazami byłoby naruszeniem kontraktu o najwyższej wadze.
  Bezpieczne, bo żadna pozycja nie była odhaczona. Zmienione: Implementation Approach,
  faza 1 (nagłówek, Overview, kryteria), nowa faza 2, przenumerowanie faz 3–4,
  Migration Notes, `## Progress`.

### F4 — Kryterium 1.5 nie może przejść w fazie 1, bo nic jeszcze nie nasłuchuje

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — poprawka lokalna, do zrobienia od ręki.
- **Dimension**: Osiągalność stanu docelowego (zerwany kontrakt między krokami)
- **Location**: `plan.md` kryterium 1.5 / `## Progress` pozycja 1.5.
- **Detail**: „Na hoście port terminala jest opublikowany **i odpowiada**" — proces terminala
  powstaje dopiero w fazie 2 (`scripts/start-terminal.sh`). Po fazie 1 port jest opublikowany,
  ale połączenie dostaje odmowę. Krok wcześniejszy obiecuje to, co wytwarza dopiero krok późniejszy.
- **Fix**: rozbić na dwie pozycje — w fazie 1 zostaje sama publikacja (sprawdzalna przez
  `docker port` na hoście), a „odpowiada" przenieść do fazy 2 obok 2.1.
- **Decision**: ROZWIĄZANE PRZEZ F1 + F3 — kryterium zniknęło. Po decyzji F1 portu terminala
  nie publikujemy w ogóle, więc nie ma czego sprawdzać na hoście; po przebudowie z F3 jego
  miejsce w nowej fazie 2 zajęło kryterium 2.5 (`DEVCONTAINER_PORT_MAP` wskazuje port
  aplikacji), które jest prawdziwe w momencie sprawdzania.

### F5 — `ttyd` byłby jedyną binarką w tym obrazie pobieraną bez weryfikacji sumy

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM
- **Dimension**: Dopasowanie architektoniczne
- **Location**: `plan.md` faza 1, zmiana #1, blok `dockerfile` — vs. `devcontainer/Dockerfile:71-82`,
  `:90-102`, `:109-121`, `:129-142`, `:150-163`, `:187-204`, `:215-226`, `:240-252`.
- **Detail**: Ten Dockerfile ma ustalony i konsekwentnie stosowany wzorzec dla binarek spoza apt:
  przypięta wersja **plus** twarda suma `sha256` sprawdzana przez `sha256sum -c` — droast,
  kubeconform, kustomize, helm, age, ksops, Go i kubebuilder, osiem pozycji bez wyjątku. Komentarz
  przy droast (`:67-70`) uzasadnia to wprost jako świadomą decyzję, a nie nawyk. Propozycja planu
  przypina wersję (`ARG TTYD_VERSION=1.7.7`), ale sumy nie sprawdza — czyli wprowadza obok
  działającego wzorca wzorzec słabszy, w pliku, którego autor zadał sobie trud, żeby go opisać.
  Osobno: `curl -fsSL -o` w propozycji odbiega od `curl -fsSLo` używanego w całym pliku — drobiazg,
  ale ta sama kategoria.
- **Fix**:
  - **Podejście**: dopisać do kontraktu zmiany #1 twardą sumę per architektura, dokładnie
    w kształcie bloku kubeconform (`Dockerfile:90-102`) — case po `dpkg --print-architecture`,
    `KC_SHA`-odpowiednik, `sha256sum -c`.
  - **Korzyść**: zamyka jedyne wejście do obrazu bez weryfikacji, w projekcie, który wystawia
    z tego obrazu powłokę (patrz F1) — dwie rzeczy mnożą się przez siebie.
  - **Koszt**: dwie sumy do wyznaczenia raz, przy pisaniu planu lub przy implementacji.
  - **Pewność**: wysoka — wzorzec jest w pliku ośmiokrotnie i opisany komentarzem.
    **Martwe pole**: nie weryfikowałem, czy wydanie `1.7.7` publikuje `sha256sums.txt`; jeśli nie,
    sumę trzeba policzyć z pobranego artefaktu, jak zrobiono dla `age` (`:148-149`).
- **Decision**: APPLY FIX — kontrakt zmiany #1 dostał wymóg twardej sumy `sha256` per
  architektura, a przykładowy blok `dockerfile` przepisany w kształcie bloku kubeconform
  (`case` po `dpkg --print-architecture`, `sha256sum -c`, `curl -fsSLo`). Same wartości sum
  zostały jako `<do wyznaczenia>` — do policzenia przy implementacji, jak dla `age`.

### F6 — Przepisanie skryptów `package.json` jest w tej samej fazie zbędne wobec wolumenu

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM
- **Dimension**: Ekonomia wykonania
- **Location**: `plan.md` faza 1, zmiana #4; Migration Notes, ostatni punkt.
- **Detail**: Zmiana #2 przenosi `node_modules` na wolumen kontenera, czyli **zdejmuje przyczynę**:
  potwierdziłem, że objaw to `cannot read symbolic link ... Operation not permitted` na
  `node_modules/.bin/*`, a na wolumenie tych dowiązań nic nie ogranicza. Zmiana #4 leczy ten sam
  objaw drugą drogą — omijając `.bin` — i ląduje w **tej samej fazie**. Skutek: kryteria 1.1 i 1.2
  przejdą niezależnie od tego, która z dwóch napraw faktycznie zadziałała, więc nikt się nie
  dowie, czy #4 jest do czegokolwiek potrzebne. Plan sam to przeczuwa („warto wtedy sprawdzić,
  czy nadal jest potrzebna"), ale zostawia to na nieokreśloną przyszłość — a `package.json`
  z ręcznie wpisanymi ścieżkami do plików wykonywalnych zostaje w repozytorium, które uczący się
  będzie czytał.
- **Fix**:
  - **Podejście**: wyjąć zmianę #4 z fazy 1 i wpisać ją jako **plan awaryjny**: jeżeli po
    restarcie `npm run typecheck` nadal nie działa, dopiero wtedy przepisujemy skrypty.
  - **Korzyść**: repozytorium zostaje ze standardowymi skryptami, a decyzja opiera się na
    obserwacji zamiast na założeniu. Jeśli wolumen wystarczy — czego dowodzi charakter błędu —
    oszczędzamy trwały dług.
  - **Koszt**: zerowy przed restartem; po restarcie jedna komenda rozstrzyga.
  - **Pewność**: wysoka co do przyczyny (błąd cytuje dowiązania wprost). **Martwe pole**:
    nie sprawdzałem, czy `Operation not permitted` nie dotyczy także zwykłych plików na tym
    montowaniu przy innych operacjach — jeżeli ograniczenie jest szersze niż dowiązania,
    wolumen i tak je zdejmuje, ale mogą wyjść inne objawy, których ta zmiana nie przewiduje.
- **Decision**: APPLY FIX — zmiana #4 przestaje być robiona z góry. Została w fazie 1 jako
  jawnie oznaczony **plan awaryjny**: przepisujemy skrypty dopiero wtedy, gdy po restarcie
  (faza 2) `npm run typecheck` nadal nie działa. Repozytorium zostaje ze standardowymi
  skryptami, a decyzja opiera się na obserwacji zamiast na założeniu.

### F7 — Testing Strategy zapowiada test jednostkowy, którego nie realizuje żadna faza

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM
- **Dimension**: Kompletność dokumentu (luka obietnicy)
- **Location**: `plan.md` sekcja Testing Strategy vs. fazy 1–3 i `## Progress`.
- **Detail**: Plan nazywa dokładnie jedno miejsce warte testu jednostkowego — odczyt mapowania
  portów w `app/lib/terminal-url.server.ts`, „jedyna czysta funkcja z realną logiką i trzema
  gałęziami rozstrzygania". Po czym żadna faza tego testu nie tworzy i żadne kryterium go nie
  sprawdza. Co więcej, w repozytorium **nie ma czym go uruchomić**: `package.json` nie ma skryptu
  `test` ani żadnego runnera (brak `vitest`, `jest`). Wykonawca trafia więc albo na cichą lukę,
  albo na nieplanowaną instalację narzędzia w środku fazy 3. To akurat funkcja, w której pomyłka
  jest najbardziej prawdopodobna i najtrudniejsza do zauważenia okiem: przy złym odczycie panel
  jest po prostu pusty, co plan sam wymienia jako główne ryzyko fazy 3.
- **Fix**:
  - **Podejście**: rozstrzygnąć w jedną stronę i zapisać. Albo: dopisać do fazy 3 pozycję
    „runner testów + test parsowania `DEVCONTAINER_PORT_MAP` (trzy gałęzie)" wraz z kryterium
    automatycznym. Albo: przepisać Testing Strategy na „świadomie bez testów jednostkowych —
    parsowanie sprawdzamy kryterium 3.6". Dzisiejsze sformułowanie („miałyby jeden sensowny cel")
    nie jest ani jednym, ani drugim.
  - **Korzyść**: znika jedyna niezamknięta decyzja w dokumencie — a plan ma z założenia
    nie zostawiać wykonawcy niczego do zgadnięcia.
  - **Koszt**: wariant pierwszy to dodanie runnera do projektu, który go dziś nie ma
    (realna, choć niewielka praca); wariant drugi to jeden akapit.
  - **Pewność**: wysoka — brak runnera potwierdzony w `package.json`. **Martwe pole**:
    nie wiem, czy dołożenie runnera nie jest już zaplanowane w innym plastrze roadmapy;
    jeśli tak, wariant drugi jest wyraźnie właściwy.
- **Decision**: APPLY DIFFERENTLY — wybrany wariant drugi: Testing Strategy mówi teraz wprost,
  że świadomie nie dodajemy testów jednostkowych ani runnera. Decyzja F1 usunęła jedyną
  kandydatkę — po przejściu na adres `/terminal/` rozstrzyganie ma dwie gałęzie i nie parsuje
  niczego, więc nie ma czego testować.

### F8 — Wolumen `node_modules` w trybie prostym nie ma ścieżki usunięcia

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW
- **Dimension**: Martwe pola
- **Location**: `plan.md` faza 1 zmiana #3 vs. `devcontainer/cleanup.sh:1-4`, `:80`;
  Migration Notes punkt 3.
- **Detail**: Kontrakt zmiany #3 mówi o usuwaniu wolumenu „tej samej instancji", co jest zgodne
  z `cleanup.sh` — ale ten skrypt z założenia „nigdy nie dotyka" instancji prostej (komentarz
  `cleanup.sh:3-4`). Nazwa `101-learn-devcontainer-node-modules` z trybu prostego nie ma więc
  żadnej ścieżki usunięcia. To zderza się z obietnicą z Migration Notes: „zawartość […] zostaje
  przesłonięta, nie usunięta; **wraca, gdy wolumen zostanie odjęty**" — plan nie mówi, jak go odjąć.
  Wolumen zostaje na stałe, także wtedy, gdy repozytorium trafi na zwykły system plików
  i cały obejście przestanie być potrzebne.
- **Fix**: dopisać do Migration Notes jedną linię z komendą zdejmującą wolumen trybu prostego
  (`docker volume rm 101-learn-devcontainer-node-modules` po zatrzymaniu kontenera) — tak, żeby
  obietnica odwracalności miała mechanizm.
- **Decision**: APPLY FIX — Migration Notes dostały punkt z komendą
  `docker volume rm 101-learn-devcontainer-node-modules` i wyjaśnieniem, dlaczego `cleanup.sh`
  tego nie zrobi.

### F9 — Kryteria „automatyczne" 1.2, 2.1 i 3.2 opisują wynik, nie komendę

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Kompletność dokumentu
- **Location**: `plan.md` kryteria 1.2, 2.1, 3.2 i odpowiadające pozycje `## Progress`.
- **Detail**: 1.1 i 3.1 podają komendę wprost (`npm run typecheck`). Pozostałe trzy mówią
  „odpowiada kodem 200" i „zawiera element `iframe`" bez komendy, która to rozstrzyga —
  a to właśnie odróżnia kryterium automatyczne od ręcznego. Dwóch wykonawców sprawdzi je
  na dwa sposoby i mogą dojść do różnych wniosków.
- **Fix**: dopisać komendę do każdego z trzech (kształt `curl -s -o /dev/null -w '%{http_code}'`
  i `curl -s <adres> | grep -q iframe`), zachowując brzmienie tytułów pozycji `## Progress`.
- **Decision**: APPLY FIX — trzy kryteria dostały komendę wprost. Odstępstwo od tego, co
  zapowiedziałem przy pytaniu: zmiana poszła **po obu stronach** (kryterium i pozycja
  `## Progress`), a nie tylko w treści fazy — zamrożenie tytułów w Progress wyprodukowałoby
  dokładnie ten rozjazd, który ten skill zgłasza jako naruszenie o najwyższej wadze.

### F10 — Sekcja o wydajności zapewnia o braku zasobów zewnętrznych, których strona nadal ładuje

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Kompletność dokumentu
- **Location**: `plan.md` Performance Considerations vs. `app/root.tsx:13-24`.
- **Detail**: Plan uzasadnia dotrzymanie pozafunkcjonalnego kryterium „kilka sekund od otwarcia
  linku" tym, że terminal „ładuje jedną samowystarczalną stronę bez zewnętrznych zasobów".
  Zdanie jest prawdziwe o terminalu i nieprawdziwe o stronie, która go opakowuje: `app/root.tsx`
  robi `preconnect` do `fonts.googleapis.com` i `fonts.gstatic.com` oraz ładuje stąd arkusz
  z krojem Inter — czyli pierwszy render blokuje się na sieci. `plan-brief.md` odnotowuje to
  w Open Risks, ale `plan.md` nie wspomina o tym ani razu, mimo że faza 3 i tak przepisuje
  sąsiedztwo tego pliku i usuwa `app/welcome/` (usunięcie katalogu tego odwołania **nie** zdejmuje —
  siedzi ono w `root.tsx`, nie w `welcome/`).
- **Fix**: albo dopisać do „What We're NOT Doing" jedną linię przenoszącą to poza zakres wprost,
  albo — skoro to trzy linie w pliku, który faza 3 i tak otwiera — dołożyć usunięcie odwołania
  do kontraktu fazy 3.
- **Decision**: APPLY FIX — wybrany wariant pierwszy: faza 4 dostała zmianę #4
  (`app/root.tsx`), która usuwa trzy odwołania do Google Fonts. Performance Considerations
  sprostowane: zdanie o braku zasobów zewnętrznych dotyczyło terminala, nie strony, która go
  opakowuje.
