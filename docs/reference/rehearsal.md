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

W `replay` chybienie krzyczy: HTTP 400 z nazwą promptu do dogrania. W `auto`
chybienie **cicho** idzie do prawdziwego API — na próbie zadziała, a na
scenie, gdzie klucza nie ma, nie zadziała. Próbę generalną robi się w tym
trybie, w którym poleci demo.

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

## Stan weryfikacji (2026-08-28)

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

**Niesprawdzone:** trafienie 51 tur środkowych. Ich klucz zależy od pełnej
historii z wynikami narzędzi, więc jedynym testem jest przejście ścieżki w
trybie `replay` w odtworzonym `/course`. To jest treść próby generalnej.
