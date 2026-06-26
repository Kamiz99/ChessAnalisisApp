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
  cuántas variaciones llevas (p. ej. 4/7).
- **Memorización por práctica de recuperación.** Cada variación se entrena en
  fases que la app encadena sola: **Aprender** (con ayuda y explicaciones) y
  luego **De memoria ×2** (dos repeticiones sin ayuda; el entrenador no revela
  la jugada). Solo cuenta como «memorizada» tras repetirla dos veces sin ayuda.
  Es el *testing effect*, de los métodos mejor respaldados por la ciencia.
- **Tono de entrenador.** La app habla en primera persona del plural
  («jugamos…», «buscamos…»), explicando la idea de cada jugada y terminando con
  el movimiento.
- **Tablero con piezas SVG y movimientos animados.** Piezas vectoriales del
  set *cburnett* (el de Lichess), nítidas y consistentes, que **se deslizan**
  suavemente al moverse en lugar de aparecer de golpe.
- **Aprendizaje guiado jugada a jugada.** El rival mueve solo y tú vas
  encontrando la jugada correcta de la línea.
- **Repertorio coherente por apertura.** Tus jugadas son fijas y cada
  variación responde a una jugada concreta del rival con una única réplica
  (sin contradicciones). 34 líneas en total, validadas automáticamente.
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

## ♟ Cursos incluidos (6 aperturas · repertorio coherente)

| Curso | Bando | Variaciones |
|---|---|---|
| Sistema Londres | Blancas | 7 |
| Apertura Italiana | Blancas | 5 |
| Ruy López | Blancas | 5 |
| Defensa Siciliana | Blancas | 6 |
| Gambito de Dama | Blancas | 6 |
| Defensa India de Rey | Negras | 5 |

Cada curso es un repertorio: tus jugadas fijas y una respuesta concreta para
cada réplica del rival. El número de líneas es el de respuestas distintas que
puede plantear el rival (sin variaciones que se contradigan entre sí).

## 🤖 Entrenador integrado (sin descargar ni configurar nada)

El entrenador vive en la **misma burbuja** de la lección:

- **Explica el porqué de cada jugada automáticamente.** Cada jugada del sistema
  lleva su explicación predefinida (la idea y el plan), al instante y offline.
  No hay que descargar ni configurar nada.
- **Le puedes preguntar** en el campo bajo la burbuja y responde ahí mismo. Las
  preguntas comunes (*"¿por qué esta jugada?"*, *"¿qué plan tengo?"*, *"¿y si el
  rival juega otra cosa?"*, *"¿qué juego ahora?"*) se responden con el
  conocimiento ya incluido, sin IA externa.

### IA opcional para preguntas libres
Para chatear libremente puedes activar una IA real en **Ajustes → 🤖 Entrenador
IA** (no es necesaria para la experiencia normal):
- **Gratis, sin clave:** modelo **Llama** que corre dentro del navegador
  (WebLLM); se descarga una vez (~900 MB). Necesita WebGPU.
- **Con tu clave** (más calidad): se detecta el proveedor por el formato —
  `sk-ant-…` → Claude, `AIza…` → Gemini (gratis), `sk-…` → OpenAI. Se guarda
  solo en tu dispositivo.

> Nota honesta: una IA de chat “de verdad” no puede ir embebida sin descarga ni
> servidor (el modelo pesa cientos de MB). Por eso el entrenador integrado usa
> explicaciones predefinidas (instantáneas), y la IA generativa es un extra.

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

## 🔧 Datos y generación (repertorio coherente)

Cada apertura es un **repertorio coherente**: tus jugadas son fijas (tu
"sistema") y las variaciones se diferencian **solo en la respuesta del rival**,
con **una** réplica nuestra por cada una. No hay dos variaciones que, en la
misma posición, te hagan jugar cosas distintas.

`openings.js` está **generado** desde:
- `tools/repertoire.js` — el repertorio escrito en notación SAN (las líneas).
- `tools/chess.js` — mini-motor que convierte SAN → jugadas `{from,to}` con
  generación legal de movimientos.
- `tools/buildrep.js` — construye `openings.js`, genera los textos del
  entrenador y **valida que no haya contradicciones** (misma posición ⇒ misma
  jugada nuestra). Aborta si encuentra alguna.

Para regenerarlo:
```bash
node tools/buildrep.js > openings.js
```

Para añadir una respuesta a una jugada del rival, edita `tools/repertoire.js`
y vuelve a generar; si introduces una contradicción, el constructor te dice
exactamente en qué posición y no escribe el archivo.

## 💡 Ideas para más adelante

- Variaciones basadas en estadísticas reales (frecuencia de aparición) usando
  la API del explorador de aperturas de Lichess.
- Repaso espaciado y seguimiento de progreso por usuario.
- Streaming de las respuestas del entrenador IA.
