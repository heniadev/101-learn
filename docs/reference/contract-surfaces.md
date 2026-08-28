# Powierzchnie kontraktowe

Rejestr nazw nośnych — identyfikatorów, na których stabilności polega inny
kod, inne narzędzie albo inny człowiek. Na start pusty; wypełnia się w
miarę, jak takie nazwy powstają.

## Co tu trafia

Jedna sekcja `##` na powierzchnię, a pod nią zdanie lub dwa o tym, kto od
niej zależy. Kwalifikują się:

- **struktury danych** — kształty, które ktoś czyta lub zapisuje,
- **trasy i punkty końcowe** — adresy, pod które ktoś się odwołuje,
- **formaty plików i komunikatów** — układ, na który ktoś parsuje,
- **zdarzenia** — nazwy, na które ktoś nasłuchuje.

## Jak to jest konsumowane

`/101-plan-review` skanuje treść planu pod kątem nagłówków `##` z tego
pliku i sygnalizuje plan, który rusza zarejestrowaną powierzchnię, nie
mówiąc o tym wprost. Gdy plik nie istnieje, ta kontrola jest **po cichu
pomijana** — dlatego pusty, ale obecny rejestr jest użyteczny już w dniu,
w którym dopiszesz pierwszą pozycję.

## Kto czym włada

Szkielet tego pliku — jego powstanie i ten nagłówek — należy do
`/101-init`. **Wpisy należą do Ciebie**: dowolny skill może dopisać
pozycję, ale wyłącznie na Twoją prośbę. `/101-plan-review` jest
konsumentem tylko do odczytu i nigdy tu nie pisze.

---

_(Brak zarejestrowanych powierzchni.)_
