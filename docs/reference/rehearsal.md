# Próba generalna — co musi być prawdą, żeby demo zagrało

Terminal kursu odtwarza nagrane odpowiedzi. Odtwarzanie jest dokładne i
dlatego kruche: mock kluczuje odpowiedź na **całej rozmowie**
(`scripts/mock-llm/server.mjs`, `keyFor`), więc jedno odstępstwo przesuwa
wszystkie późniejsze klucze i reszta ścieżki wraca jako HTTP 400.

Ta strona to lista rzeczy, które muszą się zgadzać, w kolejności od
najczęściej psującej się.

## 1. Katalog startowy to `/course`

Nagrania powstały z powłoką w `/course`. Ścieżki bezwzględne wchodzą do
klucza przez wyniki narzędzi — pierwsza komenda `/101-init` robi
`ls -la /course/` i cały ten wynik jest częścią rozmowy.

```bash
TERMINAL_LLM_MOCK=1 npm run terminal            # powłoki startują w /course
sudo scripts/provision-course.sh --force        # reset bez restartu kontenera
```

`entrypoint.sh` zakłada `/course` przy starcie kontenera, na własność
użytkownika kursu. `start-terminal.sh` wykrywa go sam; `TERMINAL_CWD`
nadpisuje wybór. Bez `/course` powłoka startuje w repo i **krok 1 chybi**.

Co musi się zgadzać: **ścieżka** i to, że wewnątrz jest wyłącznie `.claude`
(bez gita, bez `context/` z poprzedniego przejścia). Właściciel, tryb,
liczba dowiązań i data **nie mają znaczenia** — normalizator sprowadza linię
listingu do trybu, rozmiaru i nazwy. Uczeń musi mieć prawo zapisu, bo to on
tworzy tam `context/`.

## 2. Tryb `replay`, nie `auto`

```bash
npm run mock-llm        # replay — tryb demo
```

W `auto` chybienie **cicho** idzie do prawdziwego API — na próbie zadziała, a
na scenie, gdzie klucza nie ma, nie zadziała. Próbę generalną robi się w tym
trybie, w którym poleci demo.

Uwaga na zmianę: w `replay` chybienie **nie jest już** błędem na ekranie.
Uczeń dostaje zwykłą odpowiedź agenta („Podążaj za przykładami z panelu po
lewej"), bo 400 na scenie wygląda jak zepsute demo, a nikt na sali i tak nie
może na nie zareagować. To zdanie jest rozpoznawalnym sygnałem, nie podszywa
się pod prawdziwą odpowiedź — ale na próbie generalnej i tak jest złym
kompromisem: nie nazywa promptu do dogrania i nie zatrzymuje przejścia, więc
ścieżka idzie dalej i każda kolejna tura też chybia. Dlatego próbę robi się z:

```bash
MOCK_LLM_MISS=error MOCK_LLM_DEBUG=1 npm run mock-llm
```

Wtedy chybienie znowu krzyczy 400 z nazwą promptu, a hashowany tekst ląduje w
`scripts/mock-llm/misses/`. Niezależnie od trybu każde chybienie idzie do
logu jako `MISS <skrót>` — konsoli warto pilnować także na scenie.

## 3. Ścieżka idzie dokładnie tak, jak w panelach

`app/content/steps.tsx` zawiera wszystkie wpisy ucznia dosłownie z nagrania —
9 wpisów do wklejenia i 10 ekranów wyborów. Wybory w oknie `AskUserQuestion`
są równie wiążące jak tekst: kliknięcie innej opcji wypada ze skryptu bez
napisania ani jednego znaku. Dlatego panele wypisują konkretne opcje.

Zmiana `text` w `steps.tsx` bez ponownego nagrania psuje demo od tego miejsca
w dół.

## 4. Czego nagranie nie obejmuje

Jedno nagranie jest na modelu `claude-haiku-4-5` — to poboczne wywołania
samego Claude Code (podpowiedzi następnego wpisu, tytuł rozmowy), nie ścieżka
kursu. Jeśli podczas próby pojawi się ich więcej, w `replay` chybią 400.
Dogrywa się je jednym przejściem w `auto`, po czym wraca do `replay`.

## 5. Klient też się zmienia pod ręką

Najdroższa awaria próby generalnej nie była w tym repo. Katalog skilli i typów
agentów, który klient wstrzykuje do pierwszej wiadomości, przychodzi w czasie
działania — nie ma go ani w `/course`, ani w paczce npm klienta. Doszły do
niego cztery pozycje i **wszystkie 52 nagrania ścieżki chybiły naraz**, przy
nietkniętych nagraniach i poprawnym `/course`.

Objaw myli: wygląda jak zepsute `/course`, bo pada pierwsza komenda. Rozróżnia
się je zrzutem hashowanego tekstu — `MOCK_LLM_DEBUG=1`, potem
`scripts/mock-llm/misses/<skrót>.txt`. Jeśli wspólny prefiks z nagraniem
urywa się **za** listingiem `/course`, katalog ucznia jest w porządku i winny
jest klient.

Katalog i blok trybu uprawnień są od tej pory wycięte z klucza
(`keyForText`), więc ta konkretna awaria nie wróci. Reguła ogólna została ta
sama: kluczujemy po tym, co zrobił uczeń.

## Stan weryfikacji (2026-08-28, po restarcie kontenera)

Sprawdzone automatem, bez przejścia ścieżki:

| co | wynik |
|---|---|
| kompletność strumienia (`message_stop`) | 53/53 |
| zdarzenia `error` w nagraniach | 0 |
| sekrety (klucze API, `creds.yaml`, wzorce) | 0 trafień |
| odtwarzanie pierwszej tury w trybie `replay` | 2/2, także po przekluczeniu |
| `ls -la /course/` po znormalizowaniu vs tura 4 | identyczne |
| wersja toolkitu vs nagranie | 30 katalogów skilli, rozmiary zgodne |
| listing jako inny użytkownik i w inny dzień | ten sam digest |
| przekluczenie 53 nagrań | 50 zmienionych nazw, 0 kolizji |

**Sprawdzone po restarcie kontenera:**

| co | wynik |
|---|---|
| `/course` odtworzony, zapisywalny dla ucznia | tak, `total 12`, wyłącznie `.claude` |
| `ls -la /course/` po znormalizowaniu vs nagrania | identyczne |
| tura 1 w trybie `replay` przez terminal kursu | trafienie, odpowiedź z nagrania |
| przekluczenie po zmianie normalizatora | 52 zmienione nazwy, 0 kolizji |
| terminal przez proxy aplikacji | HTTP 200, upgrade WebSocket 101 |

**Niesprawdzone:** trafienie 51 tur środkowych. Ich klucz zależy od pełnej
historii z wynikami narzędzi, więc jedynym testem jest przejście ścieżki w
trybie `replay` w odtworzonym `/course`. To jest treść próby generalnej.

**Znane chybienia, nieblokujące:** `user: quota` i wywołanie tytułu rozmowy.
To wywołania poboczne samego klienta, nie ścieżka kursu — 400 na nich nie
pokazuje się uczniowi. Tytuł ma nagranie, ale pod modelem
`claude-haiku-4-5-20251001`, a klient liczy je teraz jako `claude-opus-5`;
model wchodzi do klucza celowo, więc dogrywa się je jednym przejściem w
`auto`.
