# 101-learn

Interaktywny kurs w przeglądarce. Po lewej stronie 1–3 akapity treści
i przyciski nawigacji, po prawej **prawdziwy terminal** — nie symulacja.
Działa w nim `git`, działają zwykłe edytory, a agent odpowiada ze skryptu.
Scenariusz demo prowadzi przez pierwsze kroki toolkitu 101:
`/101-init` → `/101-shape` → `/101-prd`.

## Mockup

**<https://heniadev.github.io/101-learn/>** — statyczna makieta ekranu kursu,
źródło w [`mockup/index.html`](mockup/index.html), publikowana na gałąź
`gh-pages` (`git subtree push --prefix mockup origin gh-pages`).

Makieta pokazuje układ i przebieg: lewy panel z treścią kroku i bramką
„Dalej", prawy panel z sesją agenta — rozruch `claude`, potem trzy komendy
ścieżki. Terminal jest tu **odtwarzany ze skryptu**, w odróżnieniu od
prawdziwej aplikacji: można w nim wpisać cokolwiek, działają `ls`, `cd`,
`cat`, `less` i historia komend, a pliki pojawiają się dopiero wtedy, gdy
krok je utworzy. Odpowiedzi agenta odpowiadają temu, co skille w
`.claude/skills/` naprawdę robią.

## Odpalenie na szybko (hack-n-dirty)

Stan na dziś, bez upiększeń. Wszystko dzieje się **wewnątrz kontenera**;
na zewnątrz publikowany jest tylko port aplikacji.

```bash
devcontainer/run.sh                       # kontener + port 7888 na loopbacku hosta
```

`entrypoint.sh` zakłada przy starcie `/course` — pusty katalog z toolkitem,
na własność użytkownika kursu. To tam uczeń pracuje i tam powstaje jego
`context/`.

W kontenerze trzy procesy, każdy w osobnej powłoce:

```bash
npm run mock-llm                          # 1. odtwarzacz nagrań (port 7999, loopback)
TERMINAL_LLM_MOCK=1 npm run terminal      # 2. terminal ttyd (port 7681, loopback)
npm run dev                               # 3. aplikacja (port 7888)
```

Kolejność ma znaczenie tylko między 1 a 2: `start-terminal.sh` sprawdza, czy
mock odpowiada, i odmawia startu, jeśli nie.

Potem **<http://localhost:7888/>**. Po lewej krok kursu z przyciskami
„Wstaw”, po prawej żywa powłoka.

### Czego się spodziewać, a czego nie

- **Terminal jest prawdziwy.** `ls`, `cd`, `git`, `vim` działają. Można w nim
  robić rzeczy spoza scenariusza i nic się nie zepsuje.
- **Agent jest zarygowany.** Odpowiada wyłącznie z nagrań i tylko na ścieżce
  wypisanej w lewym panelu. Wpisanie czegoś innego do `claude` daje błąd 400
  z mocka — to zamierzone, nie awaria: demo nie dzwoni do prawdziwego API.
- **Trzymaj się panelu dosłownie**, łącznie z wyborami w oknach menu. Klucz
  odtwarzania obejmuje całą rozmowę, więc odejście od skryptu jest trwałe do
  końca sesji.
- **Reset:** przeładowanie strony cofa kurs do kroku 1. Świeże `/course`
  wymaga restartu kontenera.
- **Rozszerzenia przeglądarki** dopisujące atrybuty do `<body>` potrafiły
  psuć hydratację i przeładowywać terminal w pętli; jest na to obejście w
  `app/root.tsx`, ale w razie dziwnego zachowania panelu najszybszym testem
  jest tryb incognito.

## Jak instruktor przygotowuje kurs

Kurs nie jest pisany — jest **nagrywany**. Instruktor raz przechodzi ścieżkę
z prawdziwym agentem, a to, co agent wtedy odpowiedział, staje się treścią
kursu. Stąd bierze się obietnica z pierwszego akapitu: odpowiedzi w terminalu
nie są wymyślone, bo nikt ich nie wymyślał.

Trzy elementy, w kolejności, w której się ich używa.

### 1. Skrypt setupujący — `scripts/provision-course.sh`

`/course` to katalog, w którym uczeń zaczyna. Musi być **pusty poza
`.claude`** — bez gita, bez `context/` — bo pierwsza rzecz, jaką robi
`/101-init`, to `ls -la /course/`, a ten wynik wchodzi do klucza nagrania.

Normalnie nie trzeba nic robić: `devcontainer/entrypoint.sh` zakłada go przy
starcie kontenera, na własność użytkownika kursu. Skrypt przydaje się do
**resetu między próbami** bez restartu kontenera:

```bash
sudo scripts/provision-course.sh --force   # wymaga roota: rodzicem jest /
```

Ze ścieżki do klucza wchodzi **tylko ścieżka**. Właściciel, tryb, liczba
dowiązań i data z `ls -la` są normalizowane
(`scripts/mock-llm/server.mjs`, `keyForText`), więc nagrywać i odtwarzać
można jako różni użytkownicy i w różne dni. Nie było tak od początku — to
kosztowało pół dnia i opisane jest niżej, w retrospektywie.

### 2. Nagrywarka — `scripts/mock-llm/`

Proxy między `claude` a prawdziwym API. Zapisuje **surowy strumień SSE** wraz
z czasami nadejścia, więc odtworzenie wygląda jak pisanie, nie jak wklejenie
gotowej odpowiedzi.

```bash
npm run mock-llm:record     # wszystko idzie do API i jest zapisywane
npm run mock-llm:auto       # znane odtwarza, nowe dogrywa — tryb do budowania
npm run mock-llm            # replay: tryb demo, chybienie to głośne 400
```

Złe ujęcie usuwa się **kasując plik**, nie edytując go. Szczegóły i tabela
zmiennych: [`scripts/mock-llm/README.md`](scripts/mock-llm/README.md).

### 3. Agent — samo przejście

Z powłoką w `/course` i `ANTHROPIC_BASE_URL` wskazującym na nagrywarkę
instruktor przechodzi ścieżkę tak, jak ma ją przejść uczeń. Nic więcej:
pracuje normalnie, a nagrania powstają po drodze.

Potem przepisuje swoje wpisy do [`app/content/steps.tsx`](app/content/steps.tsx)
— **dosłownie**. Mock kluczuje odpowiedź na całej rozmowie, więc jedna
zmieniona litera przesuwa wszystkie późniejsze klucze i reszta ścieżki wraca
jako 400. Kliknięcia w oknach wyborów są równie wiążące jak tekst, dlatego
panele wypisują konkretne opcje.

Na koniec przełączenie na `npm run mock-llm` (replay) i próba generalna —
lista rzeczy, które muszą się zgadzać, jest w
[`docs/reference/rehearsal.md`](docs/reference/rehearsal.md).

## Ból: KAPŚT — Koalicja Agentów Przeciwko Ścianom Tekstu

Nauka pracy z agentami rozbija się o dokumentację. Ściana tekstu opisuje,
co narzędzie *robi*, a człowiek i tak nie wie, co *wpisać*. Czyta akapit
o `/101-shape`, zamyka kartę i nic z tego nie zostaje — bo nigdy tego nie
uruchomił. KAPŚT stawia sprawę odwrotnie: minimum tekstu po lewej, realna
powłoka po prawej, jeden krok naraz. Uczysz się, wykonując, a nie czytając
o wykonywaniu. Terminal musi być autentyczny właśnie dlatego — symulacja
sypie się przy pierwszej komendzie spoza scenariusza i wraca do bycia
kolejną ścianą tekstu, tylko udającą konsolę.

## Drugi cel: agenci pod presją czasu

Ten projekt jest jednocześnie eksperymentem na sobie samym. Powstaje w
jeden dzień, z twardym deadlinem, prowadzony w całości przez workflow
agentowy z toolkitu 101 — od `shape` przez `plan` i `plan-review` po
`implement`. Pytanie badawcze brzmi: co z tego procesu przeżywa presję
czasu. Które kroki naprawdę oszczędzają godziny, a które są ceremonią,
którą pod zegarem się porzuca. Ślad decyzji zostaje w `context/` i jest
częścią wyniku na równi z działającym demo.

### Co zadziałało

**Pamięć w plikach przeżyła awarię kontenera.** W trakcie dnia kontener
padł i zabrał ze sobą rozmowę oraz katalog `/course`. Wznowienie nie
wymagało odtwarzania kontekstu z pamięci człowieka: `context/foundation/`
i `context/changes/terminal-panel/` wystarczyły, żeby nowa sesja agenta
podjęła pracę od stanu faktycznego. To nie jest teza z prospektu toolkitu —
to się wydarzyło i zostało zmierzone tym, że nikt nie tłumaczył agentowi
projektu od nowa.

**Nagrywanie zamiast pisania odpowiedzi.** Treść kursu jest transkrypcją
prawdziwego przejścia, nie wyobrażeniem o tym, jak agent by odpowiedział.
Efekt uboczny okazał się cenniejszy od zamierzonego: panele opisują rzeczy,
których autor kursu by nie wymyślił — na przykład że `/101-shape` odbija
„osoba: wszyscy” jako *brak* persony i sam wskazuje sprzeczność między
pomysłem a pytaniem o wgrywanie zdjęć.

**Rozdzielenie UI/UX od logiki przez osobny worktree.** Makieta
`mockup/index.html` powstała i została opublikowana na `gh-pages` **przed**
tym, jak aplikacja dostała swój wygląd — commit stylujący nazywa się wprost
„Style the app to match the published mockup”. Makieta była więc kontraktem
wizualnym, nie ilustracją po fakcie. Dalej praca szła dwoma torami
równolegle:
agent od wyglądu w osobnym worktree (`.claude/worktrees/style-app`, gałąź
`worktree-style-app`), agent od logiki na `main`. Liczby z historii:

| tor | commity |
|---|---|
| warstwa wizualna (`mockup/`, `app.css`, `app/components/`) | 20 |
| logika i infrastruktura (`scripts/`, `devcontainer/`, `vite.config.ts`, `app/lib/`) | 25 |
| commity dotykające obu naraz | 4 |

Tylko cztery commity dotknęły obu torów naraz — rozdział trzymał się
dlatego, że stykiem był **komponent, nie plik**. Restyling przeniósł terminal z
inline'owego `<iframe>` w trasie do `app/components/TerminalPane.tsx`, a
kontrakt „prawy panel jest ramką z terminalem” przetrwał. Zapis tego jest w
[`reviews/impl-review.md`](context/changes/terminal-panel/reviews/impl-review.md):
przegląd został przerwany rebasem na pracę drugiego agenta i przeliczony
ponownie na nowym drzewie, z tym samym wynikiem.

### Największy bloker: dopasowywanie nagrań

Nie terminal, nie UI, nie deadline. **Klucz, po którym mock szuka nagrania.**
Dziesięć commitów w `scripts/mock-llm/` i dwie przeciwstawne decyzje:
najpierw kluczowanie po ostatniej wiadomości użytkownika (`d096830`), potem
po całej rozmowie (`f0f8063`). Każda z nich naprawiała realną awarię i
tworzyła nową:

- po ostatniej wiadomości — tura agenta po wywołaniu narzędzia nie ma bloku
  tekstowego, więc wszystkie takie tury zlewały się w jeden „pusty” klucz i
  agent zapętlał się na jednej odpowiedzi;
- po całej rozmowie — działa, ale klucz obejmuje teraz **wszystko**, co jest
  w historii, w tym ścieżki bezwzględne, właścicieli i tryby plików z
  wyników `ls`.

Drugi wariant sprawił, że demo przestało być kwestią kodu, a stało się
kwestią **odtworzenia środowiska**: `/course` musi wrócić z tym samym
właścicielem, trybem i liczbą dowiązań, bo inaczej pierwsza komenda kursu
zwraca 400. Koszt ujawnił się z opóźnieniem — po awarii kontenera, gdy
katalog trzeba było postawić od nowa.

Lekcja, gdyby robić to drugi raz: normalizator klucza to najważniejsza
decyzja projektowa w całym demie i należało ją podjąć raz, świadomie, przed
pierwszym nagraniem — a nie odkrywać jej konsekwencje przez awarie.

### Co zapłaciliśmy za tempo

- **Paleta terminala jest zduplikowana** — te same tokeny w `app/app.css` i w
  `scripts/start-terminal.sh` (ttyd dostaje motyw po websockecie, nie z CSS).
  Komentarz w skrypcie mówi wprost: zmieniasz jedno, zmień drugie. To szew,
  który zrobił równoległy podział pracy.
- **`AGENTS.md` powstał pod zegarem** i sam się do tego przyznaje, odsyłając
  do `/101-agents-md` po hackathonie.
- **Przegląd implementacji zamknął się na `REWORK REQUIRED`** z jednym
  znaleziskiem krytycznym. Pod deadlinem to świadomy wybór, nie przeoczenie —
  ale zostaje w `context/` jako dług, nie jako sukces.
