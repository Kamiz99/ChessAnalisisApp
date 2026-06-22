# ♞ Aprende Aperturas de Ajedrez

App móvil (PWA) para **aprender aperturas de ajedrez y sus variaciones** con un
entrenador cercano que te explica cada jugada en lenguaje cordial y humano, y
que además puede **responder tus dudas con IA real (Claude)**.

Inspirada en apps tipo Chessly/Chessable: tablero interactivo, barra de
progreso, botón de pista y un asistente que te acompaña paso a paso.

## ✨ Características

- **Aprendizaje guiado jugada a jugada.** El rival mueve solo y tú vas
  encontrando la jugada correcta de la línea.
- **Variaciones por apertura.** Cada apertura incluye varias líneas para
  entrenar (línea principal + variaciones populares).
- **Entrenador cordial.** Mensajes humanos que explican *por qué* de cada
  jugada, con ánimos cuando aciertas y pistas suaves cuando fallas.
- **💬 Entrenador con IA real (opcional).** Pulsa 💬 y pregúntale libremente
  sobre planes, ideas o errores típicos. Usa la API de Claude
  (`claude-opus-4-8`). Tú pegas tu propia API key de Anthropic y se guarda
  **solo en tu dispositivo** (`localStorage`).
- **Modo Guiado / Examen.** En Guiado se resalta la pieza a mover; en Examen
  pruebas tu memoria (la pista 💡 sigue disponible).
- **Tablero orientado a tu bando.** Si la apertura se juega con negras, el
  tablero se gira para que veas tus piezas abajo.
- **PWA instalable y offline.** «Añadir a la pantalla de inicio» en el móvil;
  funciona sin conexión (salvo el entrenador IA, que necesita internet).

## ♟ Aperturas incluidas

| Apertura | Bando | Variaciones |
|---|---|---|
| Sistema Londres | Blancas | Principal · Contra fianchetto · Contra …c5 |
| Apertura Italiana | Blancas | Giuoco Piano · Ataque Ng5 · Gambito Evans |
| Ruy López | Blancas | Principal · Cambio · Berlinesa |
| Defensa Siciliana | Blancas | Abierta · Najdorf · Cerrada |
| Gambito de Dama | Blancas | Declinado · Aceptado · Eslava |
| Defensa India de Rey | Negras | Clásica · Cuatro Peones · Fianchetto |

## 🤖 Entrenador con IA

- En una lección, pulsa **💬** y, la primera vez, pega tu **API key de
  Anthropic** (`sk-ant-...`). Consíguela en `console.anthropic.com`.
- La clave se guarda en tu navegador y se usa para llamar a la API de Claude
  directamente. **Aviso de seguridad:** úsala solo en tu dispositivo personal;
  no publiques tu clave.
- El entrenador conoce la apertura y la posición en la que estás, así que
  puedes preguntarle cosas como *"¿por qué Bf4 y no Bg5?"* o *"¿qué plan tengo
  ahora?"*.

## 🚀 Cómo ejecutarla en tu teléfono

### Opción A — Vercel (recomendada, gratis)
Es un sitio estático, así que el deploy es inmediato:
1. Sube este repo a GitHub (ya está en `Kamiz99/ChessAnalisisApp`).
2. Entra en [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. Framework Preset: **Other**. Sin build command, output = raíz. Pulsa **Deploy**.
4. Vercel te da una URL `https://tu-proyecto.vercel.app`. Ábrela en el móvil.
5. En el móvil: menú del navegador → **«Añadir a pantalla de inicio»** para
   instalarla como app (PWA).

### Opción B — Probar en local
```bash
python3 -m http.server 8000
```
Abre `http://localhost:8000` (mejor en la vista móvil del navegador).

> Nota: el entrenador IA hace peticiones a `api.anthropic.com` desde el
> navegador; necesita conexión y una API key válida.

## 🗂 Estructura

```
index.html     Pantallas (inicio + lección) y hojas (variaciones, IA, ajustes)
styles.css     Estilos mobile-first, tema oscuro
app.js         Motor de la lección, tablero, navegación e IA (UI)
openings.js    Datos de aperturas, variaciones y textos del entrenador
ai.js          Integración con la API de Claude (entrenador IA)
sw.js          Service worker (offline / instalación)
manifest.json  Manifiesto PWA
icon.svg       Icono de la app
```

## 🔧 Cómo añadir una apertura o variación

Edita `openings.js`. Cada apertura tiene un array `variations`; cada variación
tiene `moves`. Cada jugada indica quién la juega (`user`/`engine`), las casillas
`from`/`to` (o `castle` + `color`) y el texto del entrenador.

```js
{
  id: "mi-apertura", name: "Mi Apertura", emoji: "♟",
  color: "white", level: "Principiante", blurb: "Descripción.",
  variations: [
    { id: "main", name: "Línea principal", blurb: "...", moves: [
      { by: "user", from: "e2", to: "e4", hint: "...", text: "..." },
      { by: "engine", from: "e7", to: "e5", text: "..." }
    ]}
  ]
}
```

## 💡 Ideas para más adelante

- Variaciones basadas en estadísticas reales (frecuencia de aparición) usando
  la API del explorador de aperturas de Lichess.
- Repaso espaciado y seguimiento de progreso por usuario.
- Streaming de las respuestas del entrenador IA.
