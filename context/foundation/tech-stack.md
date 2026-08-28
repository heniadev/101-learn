---
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
---

## Why this stack

React Router w trybie frameworkowym to jedyna karta w puli web-app x js,
której krok scaffoldu ten toolkit przebiegł od początku do końca, i jedyna
z kompletem czterech plusów na bramkach przyjazności dla agenta. Przeważyły
trzy rzeczy. Po pierwsze, starter daje React i własny serwer Node w jednym
pakiecie — bramka z FR-050 potrzebuje serwera już dziś, a dispatcher sesji
będzie go potrzebował docelowo, więc nie wprowadzamy drugiego środowiska
uruchomieniowego. Po drugie, jego cele wdrożenia to self-host i docker, bez
przywiązania do platformy — pasuje to do istniejącego compose i do k3s
z Argo CD, podczas gdy Next.js dokładałby tarcia self-hostu. Po trzecie,
przy jednoosobowym zespole i terminie tego samego dnia potwierdzone
przejście scaffoldu jest warte więcej niż lżejsza architektura.

Trzy ustalenia, których karta nie obejmuje, odnotowane świadomie. Strumień
czasu rzeczywistego: wybrany został własny kanał w aplikacji zamiast
oparcia się wyłącznie na osadzonym procesie terminala — to największy
nieplanowany kawałek pracy w tym zakresie, przyjęty z pełną świadomością
kosztu. Wystawienie na świat: self-host musi być osiągalny z internetu dla
jury, czego karta nie rozstrzyga — zadanie dla /101-infra-research.
Izolacja sesji: kontener na uczestnika zarządzany przez dispatcher na k8s
to architektura docelowa, nie robota na dziś, bo tożsamość devcontainera ma
do klastra dostęp wyłącznie do odczytu. Postgres stoi już w compose, ale
dziś nic nie wymaga zapisu.
