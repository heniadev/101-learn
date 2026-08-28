---
bootstrapped_at: 2026-08-28T07:56:21Z
starter_id: react-router
starter_name: "React Router (framework mode, formerly Remix)"
project_name: 101-learn
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: react-router
package_manager: npm
project_name: 101-learn
hints:
  language_family: js
  team_size: solo
  deployment_target: self-host
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: standard
  quality_override: false
  has_auth: false
  has_payments: false
  has_realtime: true
  has_ai: false
  has_background_jobs: false
```

Odstępstwa od schematu: brak. Pole `self_check_answers` jest nieobecne
zgodnie z kontraktem — należy wyłącznie do ścieżki niestandardowej, a ten
run poszedł ścieżką standardową (`path_taken: standard`).

## Pre-scaffold verification

| Sygnał | Wartość | Próg | Uwagi |
| --- | --- | --- | --- |
| Rejestr pakietów (`create-react-router`) | 8.3.0, opublikowana 2026-08-27 | fresh | Publikacja dzień przed tym runem. |
| Repozytorium źródłowe | nie sprawdzono | — | Karta `react-router` nie ma pola `repo_url`, więc nie ma czego odpytać. Jawny brak, nie cisza. |

Progi kształtują wyłącznie treść komunikatu i nigdy nie blokują runu.

## Scaffold log

- Rozstrzygnięte wywołanie: `npx create-react-router@latest .bootstrap-scaffold --yes --package-manager npm`
- Strategia: scaffold do katalogu tymczasowego, następnie przeniesienie plików w górę.
- Kod wyjścia: 0.
- Przeniesione: `.agents/`, `.dockerignore`, `.gitignore`, `Dockerfile`, `app/`, `node_modules/`, `package-lock.json`, `package.json`, `public/`, `react-router.config.ts`, `tsconfig.json`, `vite.config.ts`.
- Kolizje: 1 — `README.md` istniał w katalogu docelowym, więc wygrał plik istniejący, a wersja startera leży obok jako `README.md.scaffold` (gotowy materiał do porównania).
- Scalanie plików ignorowania: nie było potrzebne — katalog docelowy nie miał ani `.gitignore`, ani `.dockerignore`, więc oba weszły bez zmian.
- Katalog tymczasowy: usunięty, bez resztek.
- Odstępstwo 1: narzędzie startera samo wykonało `git init` w katalogu tymczasowym. Jego `.git/` został odrzucony przy przenoszeniu — historia startera nie wchodzi do projektu, a repozytorium w katalogu docelowym pozostało nietknięte. Ten skill nigdy nie inicjuje ani nie modyfikuje repozytorium.
- Odstępstwo 2: starter przyniósł katalog `.agents/skills/react-router`. Wszedł bez kolizji, ale warto wiedzieć, że projekt ma teraz dwa miejsca z materiałem dla agentów: `.agents/` od startera i `.claude/skills/` z toolkitem 101. Żadnej akcji nie podjęto.

- Odstępstwo 3 (istotne): katalog docelowy leży na montowaniu sieciowym sshfs (`:/Users/kondi` na `/workspace`, typ `fuse.sshfs`). Zwykłe pliki czytają się poprawnie, ale 16 dowiązań symbolicznych w `node_modules/.bin` jest nieczytelnych — `readlink` zwraca pustkę, a uruchomienie kończy się `Operation not permitted`. Skutek: każdy skrót `npm run <skrypt>` pada z kodem 127. Sam scaffold jest zdrowy: `node node_modules/@react-router/dev/bin.cjs typegen` oraz `node node_modules/typescript/bin/tsc --noEmit` przechodzą z kodem 0. To ograniczenie środowiska, nie wada startera.

## Post-scaffold audit

Wykonano: `npm audit --json`, kod wyjścia 0. Wynik: **czysto** — narzędzie
przebiegło i nie zgłosiło nic.

| Próg | Liczba | Kategoria |
| --- | --- | --- |
| krytyczne | 0 | brak zgłoszeń |
| wysokie | 0 | brak zgłoszeń |
| średnie | 0 | brak zgłoszeń |
| niskie | 0 | brak zgłoszeń |

Podział na zależności bezpośrednie i przechodnie: nie ma czego dzielić —
zbiór zgłoszeń jest pusty. To wynik „sprawdzone i czyste", wyraźnie różny
od „pominięte".

## Hints recorded but not acted on

| Pole | Wartość | Dlaczego nieużyte w tej wersji |
| --- | --- | --- |
| `deployment_target` | self-host | Ten skill nie konfiguruje wdrożenia. |
| `ci_provider` | github-actions | Ten skill nie tworzy potoków CI. |
| `ci_default_flow` | auto-deploy-on-merge | Jak wyżej. |
| `team_size` | solo | Nie wpływa na scaffold. |
| `path_taken` | standard | Metadana decyzji, nie wejście do scaffoldu. |
| `quality_override` | false | Brak odstępstwa do odnotowania w projekcie. |
| `has_auth` | false | Ta wersja nie dokłada pakietów pod cechy. |
| `has_payments` | false | Jak wyżej. |
| `has_realtime` | true | Jak wyżej — kanał strumieniowy trzeba zbudować ręcznie; scaffold nic pod to nie przygotował. |
| `has_ai` | false | Jak wyżej. |
| `has_background_jobs` | false | Jak wyżej. |
| `project_name` | 101-learn | Przy tej strategii projekt ląduje w katalogu bieżącym, więc nazwa jest wyłącznie metadaną tego loga. |

## Next steps

- [ ] Porównaj `README.md.scaffold` ze swoim `README.md` i przenieś to, co warto (instrukcje uruchomienia i wdrożenia startera).
- [ ] **Rozstrzygnij sprawę sshfs, zanim cokolwiek zbudujesz.** `npm run dev` nie zadziała na tym montowaniu. Dwie drogi: uruchamiać aplikację w kontenerze, gdzie `node_modules` leży na wolumenie Dockera (compose już stoi, a terminal i tak musi żyć w kontenerze), albo wywoływać narzędzia wprost przez `node <ścieżka>/bin.cjs`, omijając `node_modules/.bin`.
- [ ] Sprawdź, że aplikacja wstaje (port 5173 jest już zarezerwowany w notatkach z researchu).
- [ ] Zdecyduj, czy `.agents/` od startera zostaje obok `.claude/skills/`, czy znika.
- [ ] `AGENTS.md` już istnieje i został napisany pod presją czasu — po hackatonie odśwież go przez `/101-agents-md`.

Rekomendowana następna komenda: `/101-roadmap`.
