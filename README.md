# Chess Analysis - Análisis Profundo de Partidas

Aplicación web para análisis profundo de partidas de ajedrez a partir de archivos PGN, con motor Stockfish ejecutándose en el navegador (WebAssembly). Funciona en desktop y móvil — sin servidor, todo corre localmente.

## Características

- 📂 **Carga de PGN**: subida de archivo, drag & drop, o pegado manual.
- ♟️ **Tablero interactivo**: navegación con botones, teclado (← → Home End), o haciendo clic en cualquier movimiento de la lista.
- 🔬 **Análisis con Stockfish**: motor UCI corriendo como Web Worker, con profundidad y MultiPV configurables.
- 📊 **Clasificación de movimientos**: detecta jugadas mejores ★, imprecisiones ?!, errores ? y "capablancas" ?? (blunders).
- 📈 **Gráfica de evaluación**: curva de la partida con los blunders marcados.
- 🎯 **Barra de evaluación** en tiempo real al lado del tablero.
- 📱 **Diseño responsive**: layout adaptado a móvil, instalable como PWA.
- 🌗 **Tema claro/oscuro**.

## Cómo usar

1. Abre `index.html` en un navegador moderno (Chrome, Firefox, Edge, Safari).
2. Carga una partida (botón "Subir archivo PGN", drag & drop, o pega el PGN en el panel de la izquierda).
3. Navega con los controles bajo el tablero o las flechas del teclado.
4. Pulsa "🔬 Analizar partida completa" para que Stockfish revise cada jugada.
5. Los movimientos se anotarán con etiquetas (??, ?, ?!, ★) en la lista lateral.

## Servir localmente

Por restricciones de CORS al cargar Stockfish desde CDN, conviene servirlo con un servidor HTTP local:

```bash
# Python 3
python3 -m http.server 8000

# Node (npx)
npx serve .
```

Luego abre `http://localhost:8000`.

## Estructura

- `index.html` — Estructura de la app
- `styles.css` — Estilos responsivos (desktop + móvil)
- `app.js` — Lógica principal: parseo PGN, tablero, integración Stockfish
- `manifest.json` + `icon.svg` — Configuración PWA

## Tecnologías

- [chess.js](https://github.com/jhlywa/chess.js) — parseo PGN y reglas
- [Stockfish.js](https://github.com/nmrugg/stockfish.js) — motor de análisis (WASM)
- Vanilla JS — sin frameworks, sin build step

## Licencia

MIT
