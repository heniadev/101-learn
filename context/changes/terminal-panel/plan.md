# Terminal panel — Implementation Plan

## Overview

Prawy panel strony kursu ma dawać uczącemu się **prawdziwy** terminal, w
którym `git` i typowe edytory działają naprawdę — nie symulację. Zmiana
realizuje plaster S-02 z roadmapy (FR-030, US-01) i przy okazji zdejmuje
blokadę, która dziś uniemożliwia uruchomienie czegokolwiek: katalog
zależności leży na montowaniu sieciowym, na którym dowiązania są
nieczytelne.

Terminal jest osobnym, gotowym procesem osadzonym w stronie — aplikacja go
nie implementuje, tylko przekazuje do niego ruch pod własnym adresem, tak
że na host nie wychodzi żaden dodatkowy port. Riggowany będzie wyłącznie
agent, i to w osobnej zmianie.

## Current State Analysis

Szkielet aplikacji stoi, ale nie ma w nim nic z kursu:

- `app/routes.ts` deklaruje jedną trasę indeksową → `app/routes/home.tsx`,
  która renderuje powitalną stronę startera z `app/welcome/`.
- `react-router.config.ts:6` ma `ssr: true`, więc warstwa serwerowa
  istnieje i trasa może mieć loader — nie trzeba niczego dokładać.
- Serwer deweloperski **wstaje** i odpowiada 200, ale wyłącznie wywołany
  bezpośrednią ścieżką do narzędzia. Skróty `npm run *` kończą się kodem
  127, bo powłoka nie potrafi odczytać dowiązań w katalogu zależności —
  `/workspace` jest montowaniem sieciowym.
- `devcontainer/run.sh:154` montuje repozytorium jako `-v
  "${REPO_ROOT}:/workspace"`, więc katalog zależności dziedziczy to
  ograniczenie.
- `devcontainer/run.sh` publikuje porty z `DEVCONTAINER_PORTS` (domyślnie
  `5173`) i przekazuje do kontenera `DEVCONTAINER_PORT_MAP` z mapowaniem
  portów, bo proces w środku nie ma jak sam odczytać, na którym porcie
  hosta jest widoczny.
- `devcontainer/Dockerfile:12` instaluje `git`, `curl`, `vim`. Brakuje
  `nano`; brakuje też binarki terminala — w trakcie researchu została
  pobrana doraźnie i nie przetrwała.

## Desired End State

Uczący się otwiera stronę główną i widzi dwa panele. Prawy wypełnia
działający terminal: da się w nim kliknąć, pisać, uruchomić `git status`,
otworzyć i zamknąć plik w edytorze. Terminal żyje pod tym samym adresem co
strona — jako ścieżka na niej, nie jako osobny port — więc ta sama strona
działa lokalnie i po wystawieniu na zewnątrz, a poza kontener nie wychodzi
nic poza portem aplikacji. Lewy panel jest jeszcze pustym obszarem — treść
kursu i nawigacja należą do kolejnych plastrów.

Poza tym `npm run dev`, `npm run typecheck` i `npm run build` znów
działają jako zwykłe komendy.

### Key Discoveries:

- Warstwa serwerowa już istnieje (`react-router.config.ts:6`), więc adres
  terminala może przyjść loaderem trasy — bez dokładania czegokolwiek.
- Vite ma wbudowane przekazywanie ruchu (`server.proxy`) razem z obsługą
  podniesienia połączenia do WebSocketu (`ws: true`), a `vite.config.ts`
  ma dziś tylko dwie wtyczki i nic poza tym. To zmienia wycenę, na której
  opierało się odrzucenie tej drogi: kosztuje kilka linii konfiguracji,
  nie własną warstwę.
- Bez `-p` host nie dosięga kontenera w ogóle (`run.sh:168-173` mówi to
  wprost). Nieopublikowany port terminala jest więc niewidoczny dla
  wszystkiego poza samym kontenerem — i to jest tu cechą, nie ograniczeniem.
- `devcontainer/Dockerfile:286` nadaje `/home/agent` prawa `0777` zamiast
  właściciela — bo identyfikator użytkownika jest znany dopiero przy
  uruchomieniu. Ten sam wzorzec rozwiązuje własność wolumenu katalogu
  zależności.
- `devcontainer/cleanup.sh:80` kasuje wyłącznie wolumen domowy, po nazwie.
  Nowy wolumen musi tam trafić, inaczej zostanie sierotą.

## What We're NOT Doing

- Nie budujemy lewego panelu z treścią kursu ani nawigacji — to S-01.
- Nie riggujemy agenta — to S-03.
- Nie budujemy bramki blokującej przejście dalej — to S-05.
- Nie wystawiamy niczego do internetu dla jury — to otwarta kwestia
  roadmapy, nie ta zmiana.
- Nie dotykamy bazy danych ani zapisu stanu — PRD nie ma dziś nic do
  zapisania.
- Nie publikujemy portu terminala na host i nie budujemy uwierzytelniania
  terminala. Jedno wynika z drugiego: terminal jest osiągalny wyłącznie
  przez stronę, więc nie ma czego chronić. Wystawienie go osobno — dla
  jury czy dla kogokolwiek — jest odrębną decyzją i wymaga wtedy
  uwierzytelnienia, bo `ttyd` w trybie zapisu daje pełną powłokę.

## Implementation Approach

Cztery fazy, każda weryfikowalna osobno, w kolejności rosnącego
uzależnienia: najpierw pliki środowiska, potem restart i sprawdzenie, że
środowisko działa, potem terminal odpowiadający sam z siebie, na końcu
strona, która go pokazuje. Jeśli zegar przyciśnie, zatrzymanie po dowolnej
fazie zostawia coś działającego.

Restart sesji na nowej instancji kontenera jest **osobną fazą**, a nie
przypisem. Powód jest mechaniczny: sesja, która edytuje obraz i skrypt
uruchomieniowy, ginie przy restarcie, więc nie może zweryfikować własnej
pracy. Faza 1 kończy się na commicie, faza 2 zaczyna się w nowym
kontenerze.

## Critical Implementation Details

**Własność wolumenu.** Świeży nazwany wolumen Dockera dziedziczy zawartość
i prawa z katalogu, który obraz ma pod punktem montowania. Kontener
uruchamia proces pod identyfikatorem użytkownika hosta, którego w obrazie
nie ma, więc `chown` w obrazie nic nie da — dokładnie dlatego
`Dockerfile:286` używa `chmod 0777`. Katalog zależności musi powstać w
obrazie tym samym wzorcem, inaczej wolumen będzie należał do administratora
i instalacja zależności padnie na prawach.

**Terminal nie wychodzi na host.** `ttyd` nasłuchuje wyłącznie na
`127.0.0.1` wewnątrz kontenera, a jedynym opublikowanym portem zostaje port
aplikacji. Inaczej wystawiamy nieuwierzytelnioną powłokę wszystkiemu, co
dosięgnie hosta — a w środowisku tej powłoki siedzą poświadczenia gita
i klucze API (`run.sh:213`, `:235`, `:269`, `:285`), całe repozytorium
i kubeconfig. Zapora z `entrypoint.sh` tego nie zatrzymuje: jej reguły
dotyczą wyłącznie łańcucha `OUTPUT` (`entrypoint.sh:26-27`).

**Przekazywanie ruchu musi obsłużyć podniesienie połączenia.** `ttyd` po
pobraniu strony przechodzi na WebSocket; przekazywanie samego HTTP daje
terminal, który się rysuje i zamiera — objaw łatwo pomylić ze złym adresem.
Vite załatwia to opcją `ws: true`, ale **tylko w trybie deweloperskim**:
serwowanie z `npm run build` + `npm start` potrzebowałoby własnego
przekazywania. Demo jedzie na `npm run dev` i świadomie przy tym zostajemy.

**Aplikacja musi słuchać tam, gdzie Docker publikuje.** Dwa niezależne
warunki, oba dziś niespełnione: Vite domyślnie wiąże się na pętlę zwrotną
(publikacja portu wtedy nie działa), a port kontenera bierze się z tego,
jak wywołano `run.sh` — w tej sesji `DEVCONTAINER_PORT_MAP=7888:7888`, więc
`5173` nie jest publikowany wcale. Port aplikacji czytamy więc ze
środowiska zamiast go zakładać.

**Tryb zapisu terminala jest opcją, nie domyślną.** Bez jawnego włączenia
zapisu terminal renderuje się poprawnie, ale ignoruje klawiaturę — objaw
łatwo pomylić z zepsutym osadzeniem.

**Wolumen startuje pusty.** Po restarcie zależności trzeba zainstalować raz
od nowa; dotychczasowa zawartość katalogu na montowaniu sieciowym zostanie
przesłonięta, nie usunięta.

## Phase 1: Devcontainer: zmiany w obrazie i skryptach

### Overview

Wszystkie edycje plików, które składają się na nowe środowisko. Faza kończy
się **przed** restartem i dlatego jej kryteria nie dotykają niczego, co
wymaga przebudowanego kontenera — sprawdzamy poprawność składni i to, że
zmiany są scommitowane. Port terminala **nie** jest publikowany na host;
ruch pójdzie przez stronę (faza 4).

### Changes Required:

#### 1. `devcontainer/Dockerfile`

**Intencja**: obraz niesie brakujący edytor oraz binarkę terminala i daje
punkt zaczepienia dla wolumenu katalogu zależności.

**Kontrakt**:
- `nano` dołączone do bloku `apt-get install` przy linii 12.
- Binarka terminala trafia do `/usr/local/bin/ttyd`, jest wykonywalna, a
  jej wersja jest przypięta w pliku (nie „latest").
- Pobranie jest weryfikowane **twardą sumą `sha256` per architektura**, tak
  jak każda inna binarka w tym pliku (wzorzec: `Dockerfile:90-102`). Suma
  bez weryfikacji byłaby tu jedynym wyjątkiem na osiem pozycji.
- `/workspace/node_modules` istnieje w obrazie z prawami `0777`.

Pobranie jest zależne od architektury, więc nie jest oczywiste:

```dockerfile
RUN TTYD_VERSION="1.7.7" \
    && case "$(dpkg --print-architecture)" in \
         amd64) TTYD_ASSET="ttyd.x86_64"; TTYD_SHA="<do wyznaczenia>" ;; \
         arm64) TTYD_ASSET="ttyd.aarch64"; TTYD_SHA="<do wyznaczenia>" ;; \
         *) echo "unsupported architecture for ttyd: $(dpkg --print-architecture)" >&2; exit 1 ;; \
       esac \
    && curl -fsSLo /usr/local/bin/ttyd \
       "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/${TTYD_ASSET}" \
    && echo "${TTYD_SHA}  /usr/local/bin/ttyd" | sha256sum -c - \
    && chmod 0755 /usr/local/bin/ttyd

RUN mkdir -p /workspace/node_modules && chmod 0777 /workspace/node_modules
```

#### 2. `devcontainer/run.sh`

**Intencja**: katalog zależności przenosi się na wolumen kontenera.

**Kontrakt**:
- Nowa nazwa wolumenu wyprowadzona tym samym wzorcem co `HOME_VOLUME`
  (linie 69–76): `101-learn-devcontainer-node-modules` w trybie prostym,
  z sufiksem `-${INSTANCE_NAME}` w trybie instancji.
- Wolumen dołączony do `RUN_ARGS` obok montowania `/home/agent`
  (linia 155) jako `-v "<nazwa>:/workspace/node_modules"`.
- Publikacja portów **zostaje bez zmian**. Port terminala nie jest
  publikowany — świadomie, patrz Critical Implementation Details.

#### 3. `devcontainer/cleanup.sh`

**Intencja**: sprzątanie instancji usuwa też nowy wolumen, zamiast
zostawiać go jako sierotę.

**Kontrakt**: obok wolumenu domowego (linia 80) skrypt usuwa wolumen
katalogu zależności tej samej instancji, z tym samym komunikatem o wyniku.

#### 4. `package.json` — **plan awaryjny, nie robimy z góry**

**Intencja**: przepisanie skryptów na ścieżki do plików wykonywalnych
omija dowiązania w `node_modules/.bin`.

**Kontrakt**: **nie wykonujemy tej zmiany w fazie 1.** Wolumen z punktu #2
zdejmuje przyczynę — dowiązania przestają leżeć na montowaniu sieciowym —
więc to obejście jest najpewniej zbędne, a zostawia w repozytorium ręcznie
wpisane ścieżki, które uczący się będzie czytał. Wykonujemy je **dopiero
wtedy**, gdy po restarcie (faza 2) `npm run typecheck` nadal nie działa.
Wówczas: skrypty `dev`, `build`, `start` i `typecheck` wywołują narzędzia
przez ścieżkę do pliku wykonywalnego pakietu; nazwy i zachowanie bez zmian.

### Success Criteria:

#### Automated Verification:

- `bash -n devcontainer/run.sh` oraz `bash -n devcontainer/cleanup.sh` kończą się kodem 0

#### Manual Verification:

- Zmiany w `Dockerfile`, `run.sh`, `cleanup.sh` i `package.json` są scommitowane przed restartem

## Phase 2: Restart sesji i weryfikacja środowiska

### Overview

Ta faza nie zmienia żadnego pliku. Jest granicą, na której człowiek
restartuje sesję na nowej instancji kontenera, instaluje zależności od nowa
na świeżym wolumenie i sprawdza, że środowisko rzeczywiście działa.
Wydzielona osobno właśnie dlatego, że przecina ją restart — sesja
wykonująca fazę 1 nie dożyje tych sprawdzeń.

### Changes Required:

Brak zmian w plikach. Kroki operatora:

1. Zamknąć bieżącą sesję i uruchomić `devcontainer/run.sh` ponownie
   (skrypt przebudowuje obraz sam, `run.sh:87`).
2. Wewnątrz nowego kontenera zainstalować zależności raz od nowa — wolumen
   `node_modules` startuje pusty.
3. Wznowić pracę nad tą zmianą; pozycje fazy 1 są już odhaczone, więc
   następnym krokiem jest weryfikacja poniżej.

### Success Criteria:

#### Automated Verification:

- `npm run typecheck` kończy się kodem 0
- `npm run dev` odpowiada kodem 200: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/`

#### Manual Verification:

- Sesja została zrestartowana na nowej instancji kontenera
- `command -v nano` oraz `command -v ttyd` zwracają ścieżki
- `DEVCONTAINER_PORT_MAP` jest ustawione i wskazuje port aplikacji

## Phase 3: Proces terminala

### Overview

Terminal ma dać się podnieść jedną komendą i odpowiadać samodzielnie,
zanim jakakolwiek strona spróbuje go pokazać. Dzięki temu awaria osadzenia
nie będzie mylona z awarią terminala.

### Changes Required:

#### 1. `scripts/start-terminal.sh` (nowy)

**Intencja**: jedna komenda podnosi terminal w trybie pozwalającym pisać,
na porcie ustalonym przez środowisko.

**Kontrakt**:
- Port pochodzi ze zmiennej `TERMINAL_PORT`, domyślnie `7681`.
- Terminal nasłuchuje **wyłącznie na `127.0.0.1`**, nigdy na wszystkich
  interfejsach. To jedyna rzecz, która trzyma powłokę wewnątrz kontenera.
- Terminal startuje z **jawnie włączonym trybem zapisu** — bez tego
  wejście jest ignorowane.
- Powłoka startuje w katalogu roboczym kursu, nie w katalogu skryptu.
- Skrypt kończy się czytelnym komunikatem, gdy binarki terminala nie ma —
  zamiast niejasnego błędu powłoki.

#### 2. `package.json`

**Intencja**: terminal podnosi się tak samo jak reszta projektu.

**Kontrakt**: nowy skrypt `terminal` uruchamiający powyższy plik.

### Success Criteria:

#### Automated Verification:

- Po `npm run terminal` terminal odpowiada kodem 200: `curl -s -o /dev/null -w '%{http_code}' http://localhost:7681/`

#### Manual Verification:

- W przeglądarce pod adresem terminala da się wpisać komendę i zobaczyć jej wynik
- `git status` w tym terminalu pokazuje stan tego repozytorium
- Plik da się otworzyć i zamknąć w `vim` oraz w `nano`

## Phase 4: Prawy panel z osadzonym terminalem

### Overview

Strona główna przestaje być powitalną stroną startera i staje się
dwupanelowym ekranem kursu, w którym prawy panel wypełnia terminal.

### Changes Required:

#### 1. `app/lib/terminal-url.server.ts` (nowy)

**Intencja**: jedno miejsce rozstrzyga adres, pod którym przeglądarka
zobaczy terminal.

**Kontrakt**: eksportuje funkcję zwracającą adres, rozstrzygany w
kolejności: jawna zmienna `TERMINAL_URL` → ścieżka względna `/terminal/`
obsługiwana przez przekazywanie ruchu poniżej. Dwie gałęzie, bez parsowania
czegokolwiek — adres domyślny jest tej samej domeny co strona, więc nie ma
tu portu ani hosta do odgadnięcia.

#### 2. `vite.config.ts`

**Intencja**: ruch spod `/terminal/` trafia do procesu terminala wewnątrz
kontenera bez wystawiania go na zewnątrz, a sam serwer deweloperski jest
osiągalny z hosta.

**Kontrakt**:
- `server.proxy` przekazuje `/terminal` na `http://127.0.0.1:${TERMINAL_PORT:-7681}`.
- Przekazywanie ma **włączone podniesienie połączenia** (`ws: true`) — bez
  tego terminal się narysuje i zamrze.
- Prefiks `/terminal` jest ścinany po drodze, bo `ttyd` serwuje z korzenia.
- `server.host` ustawione na `0.0.0.0`. Vite domyślnie słucha na pętli
  zwrotnej, a wtedy publikacja portu przez Dockera nic nie daje.
- `server.port` rozstrzygany w kolejności: zmienna `PORT` → port kontenera
  z pierwszej pary `DEVCONTAINER_PORT_MAP` → `5173`. Dzięki temu aplikacja
  sama trafia na port, który `run.sh` faktycznie opublikował, i nikt nie
  musi pamiętać o zgodności dwóch liczb.

#### 3. `app/routes/home.tsx`

**Intencja**: trasa główna dostarcza adres terminala i renderuje układ
dwupanelowy.

**Kontrakt**:
- `loader` zwraca `{ terminalUrl: string }` z powyższej funkcji.
- Lewy panel to obszar na tekst kursu i nawigację — na tym etapie pusty,
  z zachowaną szerokością.
- Prawy panel to `iframe` wskazujący `terminalUrl`, wypełniający swoją
  połowę bez własnego paska przewijania.
- Oba panele wypełniają wysokość okna; strona nie przewija się w poziomie.
- `Welcome` przestaje być importowany.

#### 4. `app/root.tsx`

**Intencja**: pierwszy render przestaje blokować się na sieci.

**Kontrakt**: `links` traci trzy wpisy kierujące do `fonts.googleapis.com`
i `fonts.gstatic.com` (`root.tsx:13-24`). Strona zostaje przy krojach
systemowych. Usunięcie `app/welcome/` samo tego nie robi — odwołanie siedzi
w `root.tsx`, nie w usuwanym katalogu.

#### 5. `app/welcome/`

**Intencja**: usunięcie martwego kodu powitalnej strony startera.

**Kontrakt**: katalog znika razem ze swoimi zasobami; nic go już nie
importuje.

### Success Criteria:

#### Automated Verification:

- `npm run typecheck` kończy się kodem 0
- Odpowiedź strony głównej zawiera `iframe` z adresem terminala: `curl -s http://localhost:5173/ | grep -q '<iframe'`

#### Manual Verification:

- Strona pokazuje dwa panele obok siebie, a prawy wypełnia terminal
- Kliknięcie w prawy panel i wpisanie `git status` daje widoczny wynik
- Plik da się otworzyć i zamknąć w edytorze wewnątrz osadzonego terminala
- Ustawienie `TERMINAL_URL` kieruje panel pod wskazany adres

## Testing Strategy

Ta zmiana jest w przeważającej części integracyjna: zestawia obcy proces,
granicę kontenera i osadzenie w stronie. **Świadomie nie dodajemy testów
jednostkowych ani runnera** — repozytorium żadnego dziś nie ma, a po
decyzji o przekazywaniu ruchu przez serwer aplikacji zniknęła jedyna
kandydatka: rozstrzyganie adresu to dwie gałęzie bez parsowania czegokolwiek.
Wszystko jest weryfikowane komendami i okiem, zgodnie z kryteriami faz.

Świadomie nie dokładamy testu przeglądarkowego: sprawdzałby, czy obcy
proces odpowiada w ramce, a to jest dokładnie ten rodzaj testu, który
najczęściej jest zielony przy zepsutej funkcji. Właściwym momentem na
testy przeglądarkowe będzie bramka wykonania kroku.

## Performance Considerations

Skala to najwyżej setka uczących się i jedna sesja terminala naraz, więc
przepustowość nie jest tu problemem. Jedyna wielkość, która ma znaczenie,
to czas do pierwszego widoku: kryterium pozafunkcjonalne z PRD mówi o
kilku sekundach od otwarcia linku. Osadzony terminal ładuje jedną
samowystarczalną stronę bez zewnętrznych zasobów, więc sam nie wnosi
opóźnienia sieciowego — pod warunkiem, że nie zostanie wstawiony przed
lewym panelem w kolejności renderowania.

Strona, która go opakowuje, wnosiła je do tej pory: `root.tsx:13-24` ciągnie
krój Inter z Google Fonts, przez co pierwszy render czeka na sieć. Faza 4
to zdejmuje (zmiana #4) — inaczej całe zdanie powyżej byłoby prawdziwe
o terminalu i nieprawdziwe o tym, co widzi uczący się.

## Migration Notes

- **Restart sesji jest obowiązkowy** i ma własną fazę (2): obraz i skrypt
  uruchomieniowy zmieniają się poza działającym kontenerem. Zmiany fazy 1
  muszą być scommitowane, zanim sesja zostanie zamknięta.
- Po restarcie katalog zależności jest **pusty** — wolumen startuje bez
  zawartości. Zależności trzeba zainstalować raz od nowa.
- Dotychczasowa zawartość katalogu zależności na montowaniu sieciowym
  zostaje przesłonięta, nie usunięta; wraca, gdy wolumen zostanie odjęty.
- **Jak odjąć wolumen trybu prostego**: `cleanup.sh` z założenia nie dotyka
  instancji prostej, więc po zatrzymaniu kontenera robi się to ręcznie —
  `docker volume rm 101-learn-devcontainer-node-modules`. Bez tego wolumen
  zostaje na stałe, także gdy repozytorium trafi na zwykły system plików
  i całe obejście przestanie być potrzebne.
- Zmiana skryptów w `package.json` jest obejściem ograniczenia montowania.
  Gdy repozytorium trafi na zwykły system plików, można ją cofnąć — warto
  wtedy sprawdzić, czy nadal jest potrzebna.

## References

- `context/foundation/prd.md` — FR-030, US-01, kryteria pozafunkcjonalne
- `context/foundation/roadmap.md` — S-02, warunki wstępne i kolejność
- `context/foundation/shape-notes.md` — blok `## Forward: tech-stack`
- `context/foundation/tech-stack.md` — decyzja o starterze i celu wdrożenia
- `devcontainer/Dockerfile:12`, `:286` — blok pakietów i wzorzec praw katalogu
- `devcontainer/run.sh:69-76`, `:154-155`, `:168-173` — nazwy wolumenów, montowania, dlaczego bez `-p` host nie widzi kontenera
- `devcontainer/entrypoint.sh:26-27` — zapora działa tylko na łańcuchu `OUTPUT`
- `vite.config.ts` — miejsce na przekazywanie ruchu
- `devcontainer/cleanup.sh:80` — usuwanie wolumenu instancji
- `react-router.config.ts:6` — warstwa serwerowa włączona

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Devcontainer: zmiany w obrazie i skryptach

#### Automated

- [x] 1.1 `bash -n devcontainer/run.sh` oraz `bash -n devcontainer/cleanup.sh` kończą się kodem 0 — e268c23

#### Manual

- [x] 1.2 Zmiany w `Dockerfile`, `run.sh`, `cleanup.sh` i `package.json` są scommitowane przed restartem — e268c23

### Phase 2: Restart sesji i weryfikacja środowiska

#### Automated

- [x] 2.1 `npm run typecheck` kończy się kodem 0
- [x] 2.2 `npm run dev` odpowiada kodem 200: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/`

#### Manual

- [x] 2.3 Sesja została zrestartowana na nowej instancji kontenera
- [x] 2.4 `command -v nano` oraz `command -v ttyd` zwracają ścieżki
- [x] 2.5 `DEVCONTAINER_PORT_MAP` jest ustawione i wskazuje port aplikacji

### Phase 3: Proces terminala

#### Automated

- [x] 3.1 Po `npm run terminal` terminal odpowiada kodem 200: `curl -s -o /dev/null -w '%{http_code}' http://localhost:7681/` — 1ec27ac

#### Manual

- [x] 3.2 W przeglądarce pod adresem terminala da się wpisać komendę i zobaczyć jej wynik — 1ec27ac
- [x] 3.3 `git status` w tym terminalu pokazuje stan tego repozytorium — 1ec27ac
- [x] 3.4 Plik da się otworzyć i zamknąć w `vim` oraz w `nano` — 1ec27ac

### Phase 4: Prawy panel z osadzonym terminalem

#### Automated

- [x] 4.1 `npm run typecheck` kończy się kodem 0 — 7113f39
- [x] 4.2 Odpowiedź strony głównej zawiera `iframe` z adresem terminala: `curl -s http://localhost:5173/ | grep -q '<iframe'` — 7113f39

#### Manual

- [x] 4.3 Strona pokazuje dwa panele obok siebie, a prawy wypełnia terminal — 7113f39
- [x] 4.4 Kliknięcie w prawy panel i wpisanie `git status` daje widoczny wynik — 7113f39
- [x] 4.5 Plik da się otworzyć i zamknąć w edytorze wewnątrz osadzonego terminala — 7113f39
- [x] 4.6 Ustawienie `TERMINAL_URL` kieruje panel pod wskazany adres — 7113f39
