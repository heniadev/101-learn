# 101-learn

Interaktywny kurs w przeglądarce. Po lewej stronie 1–3 akapity treści
i przyciski nawigacji, po prawej **prawdziwy terminal** — nie symulacja.
Działa w nim `git`, działają zwykłe edytory, a agent odpowiada ze skryptu.
Scenariusz demo prowadzi przez pierwsze kroki toolkitu 101:
`/101-init` → `/101-shape` → `/101-prd`.

## Ból: KAPŚT — Koalicja Agentów Przeciw Ścianie Tekstu

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
