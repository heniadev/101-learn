---
change_id: terminal-panel
title: Terminal panel
status: reviewed
created: 2026-08-28
updated: 2026-08-28
archived_at:
---

## Notes

Wszystkie pozycje planu odhaczone. Pozycje `Manual` domknięte potwierdzeniem
człowieka („terminal chodzi jak złoto"); wcześniej każda z nich miała już
dowód maszynowy — probe po WebSockecie ttyd tą samą drogą przez proxy, której
używa ramka (wejście z klawiatury, `git status`, `vim`, `nano`), pomiary
układu w przeglądarce (dwa panele po 640 px przy oknie 1280, `tput cols`=78,
`lines`=52, brak przewijania w poziomie) oraz serwerowe sprawdzenie
`TERMINAL_URL`.

Znane kosmetyczne odchylenie spoza kryteriów: prompt w terminalu brzmi
`I have no name!@…`, bo gosu schodzi na UID hosta, którego nie ma w
`/etc/passwd` obrazu.
