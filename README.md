# Baby Shower de Olivia Victoria ☀️

Invitación interactiva y animada: al tocar, el Solcito despierta, pinta el arcoíris y aparece la invitación.

- Sitio estático, sin dependencias ni paso de compilación (`index.html`, `css/`, `js/`).
- Todo el arte se dibuja con canvas y el sonido se sintetiza con Web Audio.
- Los datos del evento están en `index.html` (textos), `js/main.js` (`EVENT`, calendario) y `evento.ics`.

Para verlo en local: `python3 -m http.server 4173` y abrir <http://localhost:4173>.
Atajo: `?escena=invitacion` abre directo la invitación.
