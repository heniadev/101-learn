---
project: "interaktywny learner"
version: 1
status: draft
created: 2026-08-28
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 0
  hard_deadline: 2026-08-28
  after_hours_only: false
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

## Open Questions

Bramka jakości w `/101-shape` zakończyła się statusem `gaps-accepted`. Poniżej
odzwierciedlenie przyjętych luk, luka po luce.

- [GAP: treść kursu — dokładne akapity trzech kroków i skrypt odpowiedzi agenta] — Decide: właściciel produktu. Blocking: yes.
  Konsekwencja: to największa nienazwana pozycja pracy; bez niej terminal
  działa, ale nie ma czego pokazać.
- [GAP: wielu równoczesnych uczących się — ani wykluczone z zakresu, ani zaplanowane] — Decide: właściciel produktu. Blocking: no.
  Decyzja „przeładowanie otwiera nową sesję" sugeruje izolację sesji, a skala
  „do ~100" zakłada jeden kontener. Nieblokujące dla demo; blokujące dla
  użycia po hackatonie.
- [GAP: nazwa produktu] — Decide: właściciel produktu. Blocking: no.
  Dokument jedzie na etykiecie roboczej „interaktywny learner".
