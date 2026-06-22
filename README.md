# ♞ Aprende Aperturas de Ajedrez

App móvil (PWA) para **aprender aperturas de ajedrez y sus variaciones** con un
entrenador cercano que te explica cada jugada en lenguaje cordial y humano.

Inspirada en apps tipo Chessly/Chessable: tablero interactivo, barra de
progreso, botón de pista y un asistente que te acompaña paso a paso.

## ✨ Características

- **Aprendizaje guiado jugada a jugada.** El rival mueve solo y tú vas
  encontrando la jugada correcta de la línea principal.
- **Entrenador cordial.** Mensajes humanos que explican *por qué* de cada
  jugada, con ánimos cuando aciertas y pistas suaves cuando fallas.
- **Modo Guiado / Examen.** En Guiado se resalta la pieza a mover; en Examen
  pruebas tu memoria (la pista del botón 💡 sigue disponible).
- **Tablero orientado a tu bando.** Si la apertura se juega con negras, el
  tablero se gira para que veas tus piezas abajo.
- **PWA instalable y offline.** Se puede "Añadir a la pantalla de inicio" en
  el móvil y funciona sin conexión.

## ♟ Aperturas incluidas

| Apertura | Bando | Nivel |
|---|---|---|
| Sistema Londres | Blancas | Principiante |
| Apertura Italiana | Blancas | Principiante |
| Ruy López (Española) | Blancas | Intermedio |
| Defensa Siciliana (Abierta) | Blancas | Intermedio |
| Gambito de Dama | Blancas | Intermedio |
| Defensa India de Rey | Negras | Avanzado |

## 🚀 Cómo probarla

No necesita compilación. Sirve la carpeta con cualquier servidor estático:

```bash
# Opción 1: Python
python3 -m http.server 8000

# Opción 2: Node
npx serve .
```

Luego abre `http://localhost:8000` en el navegador (idealmente en el móvil o en
el modo responsive del navegador).

## 🗂 Estructura

```
index.html     Estructura de las pantallas (inicio + lección)
styles.css     Estilos mobile-first, tema oscuro
app.js         Motor de la lección, tablero e interacción
openings.js    Datos de las aperturas (jugadas + textos del entrenador)
sw.js          Service worker (offline / instalación)
manifest.json  Manifiesto PWA
icon.svg       Icono de la app
```

## 🔧 Cómo añadir una apertura

Edita `openings.js` y añade un objeto al array `OPENINGS`. Cada jugada indica
quién la juega (`user` o `engine`), las casillas `from`/`to` (o `castle`) y el
texto del entrenador. No hace falta validar legalidad: la línea ya es legal.

```js
{
  id: "mi-apertura",
  name: "Mi Apertura",
  emoji: "♟",
  color: "white",            // bando del alumno
  level: "Principiante",
  blurb: "Breve descripción.",
  moves: [
    { by: "user", from: "e2", to: "e4", hint: "...", text: "..." },
    { by: "engine", from: "e7", to: "e5", text: "..." }
  ]
}
```

## 💡 Ideas para más adelante

- Variaciones múltiples por apertura (no solo la línea principal).
- Conectar el entrenador a una IA real para responder dudas libres.
- Repaso espaciado y seguimiento de progreso por usuario.
