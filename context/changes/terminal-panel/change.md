---
change_id: terminal-panel
title: Terminal panel
status: implemented
created: 2026-08-28
updated: 2026-08-28
archived_at:
---

## Notes

Zamknięte w trybie goal (bez człowieka przy klawiaturze), więc jedenaście
pozycji `Manual` w planie zostaje **nieodhaczonych** — automat ich nie
zaznacza, taki jest kontrakt. Nie znaczy to, że nie zostały sprawdzone:

- 3.2/3.3/3.4, 4.4/4.5 — zweryfikowane maszynowo po WebSockecie ttyd, tą samą
  drogą przez proxy, której używa ramka: wejście z klawiatury wraca wynikiem,
  `git status` pokazuje to repo, `vim` i `nano` otwierają i zamykają plik.
- 4.3 — zmierzone w przeglądarce: dwa panele po 640 px przy oknie 1280, iframe
  wypełnia prawą połowę co do piksela, brak przewijania w poziomie, canvas
  xterm w środku (`tput cols`=78, `lines`=52).
- 4.6 — serwerowo: przy `TERMINAL_URL` iframe wskazuje podany adres.
- 1.2, 2.3, 2.4, 2.5 — historia gita, pusty wolumen po restarcie, ścieżki
  `nano`/`ttyd`, `DEVCONTAINER_PORT_MAP=7888:7888`.

Zostaje oględziny człowieka na żywej stronie. Znane kosmetyczne odchylenie
spoza kryteriów: prompt w terminalu brzmi `I have no name!@…`, bo gosu schodzi
na UID hosta, którego nie ma w `/etc/passwd` obrazu.
