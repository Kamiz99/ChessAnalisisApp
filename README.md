# ♞ Aprende Aperturas de Ajedrez

App móvil (PWA) para **aprender aperturas de ajedrez y sus variaciones** con un
entrenador cercano que te explica cada jugada en lenguaje cordial y humano, y
que además puede **responder tus dudas con IA real (Claude)**.

Inspirada en apps tipo Chessly/Chessable: tablero interactivo, barra de
progreso, botón de pista y un asistente que te acompaña paso a paso.

## ✨ Características

- **Cursos por apertura.** Eliges una apertura y la app te guía en orden por
  **todas sus variaciones**, con el mínimo de decisiones: un solo botón
  «Siguiente». El progreso se guarda en tu dispositivo y cada curso muestra
  cuántas variaciones llevas (p. ej. 12/33).
- **Tablero con piezas SVG y movimientos animados.** Piezas vectoriales del
  set *cburnett* (el de Lichess), nítidas y consistentes, que **se deslizan**
  suavemente al moverse en lugar de aparecer de golpe.
- **Aprendizaje guiado jugada a jugada.** El rival mueve solo y tú vas
  encontrando la jugada correcta de la línea.
- **≥30 variaciones reales por apertura.** Combinan líneas explicadas a mano
  con variaciones del dataset ECO de
  [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings)
  (198 líneas en total, generadas y validadas automáticamente).
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

## ♟ Cursos incluidos (6 aperturas · 33 variaciones cada uno)

| Curso | Bando | Variaciones |
|---|---|---|
| Sistema Londres | Blancas | 33 |
| Apertura Italiana | Blancas | 33 |
| Ruy López | Blancas | 33 |
| Defensa Siciliana | Blancas | 33 |
| Gambito de Dama | Blancas | 33 |
| Defensa India de Rey | Negras | 33 |

Las 3 primeras variaciones de cada curso están explicadas a mano con texto
detallado; el resto provienen del dataset ECO real de Lichess.

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
assets/pieces/ Piezas SVG del set cburnett (wK.svg, bN.svg, …)
```

## 🎨 Créditos

Las piezas de ajedrez son el set **cburnett** de Colin M.L. Burnett,
distribuido por [Lichess](https://github.com/lichess-org/lila) bajo licencia
**GPLv2+**. Las aperturas provienen del dataset
[lichess-org/chess-openings](https://github.com/lichess-org/chess-openings).

## 🔧 Datos y generación

`openings.js` está **generado** por `tools/gen.js`, que:
1. conserva las variaciones curadas a mano (texto rico), y
2. descarga el dataset ECO de Lichess (`a..e.tsv`) y convierte su PGN
   (notación SAN) al formato del motor con un mini-motor de ajedrez propio
   (genera movimientos legales para resolver ambigüedades de SAN).

Para regenerarlo (necesita los TSV en `/tmp/`):
```bash
node tools/gen.js > openings.js
```

> Nota: la API del explorador de aperturas de Lichess
> (`explorer.lichess.ovh`, con frecuencias reales de partidas) está bloqueada
> por la política de red de este entorno. Si la habilitas, se podría filtrar
> por frecuencia de aparición (p. ej. >65%) en lugar de por nombre ECO.

## 💡 Ideas para más adelante

- Variaciones basadas en estadísticas reales (frecuencia de aparición) usando
  la API del explorador de aperturas de Lichess.
- Repaso espaciado y seguimiento de progreso por usuario.
- Streaming de las respuestas del entrenador IA.
