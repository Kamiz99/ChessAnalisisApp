/* =========================================================================
 * Aprende Aperturas — lógica de la app
 * PWA móvil para aprender aperturas de ajedrez con un entrenador cordial.
 * ========================================================================= */

(function () {
  "use strict";

  // ---- Piezas -------------------------------------------------------------
  // Imágenes SVG vectoriales (set "cburnett", el de Lichess). Mismo diseño
  // para todas, nítidas a cualquier tamaño y sin el bug de emoji que volvía
  // negras a las piezas blancas en el móvil.
  // Fichero: assets/pieces/{w|b}{K,Q,R,B,N,P}.svg
  function pieceFile(p) { return (p.color === "white" ? "w" : "b") + p.type + ".svg"; }
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

  const PRAISE = [
    "¡Genial! 👏", "¡Esa es! 💪", "¡Perfecto!", "¡Muy bien jugado!",
    "¡Exacto! 🎯", "¡Lo tenemos!", "¡Eso es, seguimos!"
  ];
  const NUDGE = [
    "Casi… esa no es. Volvemos a intentarlo, ¡tú puedes! 🙂",
    "Mmm, probamos con otra pieza. Si quieres, pulsa 💡 Pista.",
    "No pasa nada, lo intentamos de nuevo. El botón 💡 te da una pista.",
    "Esa jugada no toca aún. ¿La buscamos otra vez?"
  ];
  // Celebración cuando una repetición de memoria sale PERFECTA (sin fallos
  // ni ayuda): el refuerzo positivo también consolida el aprendizaje.
  const PERFECT = [
    "Toda la línea de memoria y sin un solo fallo, ¡impecable! 👏",
    "Ni un error, ni una pista: así trabajan los maestros. 🧠",
    "De memoria, del tirón y sin fallar ni una. ¡Enorme! 💜",
    "Bordada: cada jugada en su sitio, sin ayuda. ¡Qué nivel! 🔥"
  ];
  // En fase «de memoria» no revelamos la jugada: solo animamos a recordarla.
  const RECALL_PROMPTS = [
    "De memoria: ¿recuerdas la jugada? 🤔",
    "Sin ayuda esta vez. ¿Cuál es nuestro movimiento?",
    "Tu turno. Confía en lo que aprendimos 💪",
    "¿Qué jugamos aquí? Tú lo sabes."
  ];

  // ---- Estado global -------------------------------------------------------
  const state = {
    opening: null,      // apertura actual
    variation: null,    // variación (línea) actual
    courseIndex: 0,     // posición dentro del curso (índice de variación)
    phase: "learn",     // "learn" (con ayuda) | "recall" (de memoria)
    usedHelp: false,    // ¿se usó ayuda/falló en esta fase de memoria?
    onNext: null,       // acción del botón principal del overlay final
    board: {},          // mapa casilla -> {type, color}
    step: 0,
    flipped: false,
    guided: true,
    selected: null,
    lastMove: null,
    locked: false,
    pieceNodes: {},     // id de pieza -> elemento DOM (para animar)
    selectable: null,   // casilla a resaltar en turno guiado
    hint: null,         // {from?, to?} resaltado de pista
    missed: [],         // pasos fallados en fase de memoria (para reforzarlos)
    drill: null,        // práctica de refuerzo activa: { queue: [paso...], pos }
    flowTimer: null     // temporizador del flujo (rival/elogio); se cancela al navegar
  };

  // Programa el siguiente paso del flujo cancelando el anterior: evita que una
  // jugada del rival «en vuelo» se aplique dos veces si el alumno navega.
  function setFlow(fn, ms) {
    clearTimeout(state.flowTimer);
    state.flowTimer = setTimeout(fn, ms);
  }

  const $ = (sel) => document.querySelector(sel);
  const el = {};

  function cacheDom() {
    el.screenHome = $("#screen-home");
    el.screenLesson = $("#screen-lesson");
    el.openingsList = $("#openings-list");
    el.board = $("#board");
    el.coachText = $("#coach-text");
    el.coachMood = $("#coach-mood");
    el.coachCard = $("#coach-card");
    el.lessonName = $("#lesson-name");
    el.lessonCounter = $("#lesson-counter");
    el.progressFill = $("#progress-fill");
    el.btnMode = $("#btn-mode");
    el.settingsSheet = $("#settings-sheet");
    el.variationsSheet = $("#variations-sheet");
    el.variationsTitle = $("#variations-title");
    el.variationsList = $("#variations-list");
    el.completeOverlay = $("#complete-overlay");
    el.completeText = $("#complete-text");
    el.reviewCard = $("#review-card");
  }

  // ---- Posición inicial estándar ------------------------------------------
  let pieceSeq = 0;
  function initialBoard() {
    const b = {};
    const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
    const add = (sq, type, color) => { b[sq] = { type, color, id: "p" + (pieceSeq++) }; };
    FILES.forEach((f, i) => {
      add(f + "1", back[i], "white");
      add(f + "2", "P", "white");
      add(f + "7", "P", "black");
      add(f + "8", back[i], "black");
    });
    return b;
  }

  // Casillas implicadas en un enroque según el color del bando.
  function castleInfo(move) {
    const rank = move.color === "black" ? "8" : "1";
    if (move.castle === "O-O") {
      return { kingFrom: "e" + rank, kingTo: "g" + rank, rookFrom: "h" + rank, rookTo: "f" + rank };
    }
    return { kingFrom: "e" + rank, kingTo: "c" + rank, rookFrom: "a" + rank, rookTo: "d" + rank };
  }

  function moveSquares(move) {
    if (move.castle) {
      const c = castleInfo(move);
      return { from: c.kingFrom, to: c.kingTo };
    }
    return { from: move.from, to: move.to };
  }

  function applyMove(move) {
    if (move.castle) {
      const c = castleInfo(move);
      state.board[c.kingTo] = state.board[c.kingFrom];
      delete state.board[c.kingFrom];
      state.board[c.rookTo] = state.board[c.rookFrom];
      delete state.board[c.rookFrom];
      state.lastMove = { from: c.kingFrom, to: c.kingTo };
      return;
    }
    const piece = state.board[move.from];
    delete state.board[move.from];
    state.board[move.to] = piece; // sobreescribe si hay captura
    state.lastMove = { from: move.from, to: move.to };
  }

  // Atajo a las jugadas de la línea actual.
  function moves() { return state.variation.moves; }

  // ---- Progreso del curso (localStorage) ----------------------------------
  // Estado por variación: "" (sin ver) | "learned" (aprendida con ayuda) |
  // "memorized" (repetida de memoria, sin ayuda).
  const PROGRESS_KEY = "aperturas_progreso";
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function statusMap(openingId) {
    const p = loadProgress();
    let m = p[openingId] || {};
    if (Array.isArray(m)) { // migra formato antiguo (array = memorizadas)
      const o = {}; m.forEach((id) => { o[id] = "memorized"; }); m = o;
    }
    return m;
  }
  const STATUS_RANK = { "": 0, learned: 1, recalled1: 2, memorized: 3 };
  function getStatus(openingId, varId) { return statusMap(openingId)[varId] || ""; }
  function setStatus(openingId, varId, status) {
    const p = loadProgress();
    let m = p[openingId];
    if (Array.isArray(m)) { const o = {}; m.forEach((id) => { o[id] = "memorized"; }); m = o; }
    m = m || {};
    // No degradar el progreso (p. ej. memorizada nunca baja a aprendida).
    if (STATUS_RANK[status] < STATUS_RANK[m[varId] || ""]) return;
    m[varId] = status;
    p[openingId] = m;
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function memorizedCount(op) {
    const m = statusMap(op.id);
    return op.variations.filter((v) => m[v.id] === "memorized").length;
  }
  // Siguiente paso pendiente del curso: índice + fase con la que empezar.
  // Estados: "" → learn ; "learned"/"recalled1" → recall ; "memorized" → hecho.
  function firstPending(op) {
    const m = statusMap(op.id);
    for (let i = 0; i < op.variations.length; i++) {
      const st = m[op.variations[i].id] || "";
      if (st !== "memorized") {
        const phase = (st === "learned" || st === "recalled1") ? "recall" : "learn";
        return { index: i, phase };
      }
    }
    return { index: 0, phase: "learn" };
  }

  // ---- Repaso espaciado (localStorage) -------------------------------------
  // Cada variación memorizada entra en la agenda de repasos: 1 → 3 → 7 → 21
  // días. Repaso limpio: sube de caja (más intervalo). Con fallos o ayuda:
  // vuelve a la caja 1 (repaso mañana). Es el «spacing effect»: repasar justo
  // antes de olvidar convierte la memoria de corto plazo en permanente.
  const REVIEW_KEY = "aperturas_repasos";
  const REVIEW_DAYS = [1, 3, 7, 21];
  const DAY_MS = 86400000;
  function loadReviews() {
    try { return JSON.parse(localStorage.getItem(REVIEW_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveReviews(r) {
    try { localStorage.setItem(REVIEW_KEY, JSON.stringify(r)); } catch (e) {}
  }
  function scheduleFirstReview(opId, varId) {
    const r = loadReviews();
    const k = opId + ":" + varId;
    if (!r[k]) { r[k] = { box: 0, due: Date.now() + DAY_MS }; saveReviews(r); }
  }
  function updateReview(opId, varId, clean) {
    const r = loadReviews();
    const k = opId + ":" + varId;
    const box = clean ? Math.min(((r[k] && r[k].box) || 0) + 1, REVIEW_DAYS.length - 1) : 0;
    r[k] = { box, due: Date.now() + REVIEW_DAYS[box] * DAY_MS };
    saveReviews(r);
    return REVIEW_DAYS[box];
  }
  // Da agenda a lo que se memorizó antes de existir el repaso espaciado.
  function ensureReviewEntries() {
    const r = loadReviews();
    let changed = false;
    OPENINGS.forEach((op) => {
      const m = statusMap(op.id);
      op.variations.forEach((v) => {
        const k = op.id + ":" + v.id;
        if (m[v.id] === "memorized" && !r[k]) {
          r[k] = { box: 0, due: Date.now() + DAY_MS };
          changed = true;
        }
      });
    });
    if (changed) saveReviews(r);
  }
  // Variaciones con repaso vencido, las más atrasadas primero.
  function dueReviews() {
    const r = loadReviews();
    const out = [];
    OPENINGS.forEach((op) => {
      const m = statusMap(op.id);
      op.variations.forEach((v, i) => {
        const e = r[op.id + ":" + v.id];
        if (m[v.id] === "memorized" && e && e.due <= Date.now()) {
          out.push({ op, index: i, due: e.due });
        }
      });
    });
    return out.sort((a, b) => a.due - b.due);
  }
  function startReviewSession() {
    const due = dueReviews();
    if (due.length) startLesson(due[0].op, due[0].index, "review");
  }

  // Partida de repertorio: el rival elige al azar una línea memorizada y el
  // alumno responde de memoria SIN saber cuál es (práctica de transferencia:
  // reconocer la posición, como en una partida real).
  function startGame(op) {
    const m = statusMap(op.id);
    const pool = [];
    op.variations.forEach((v, i) => { if (m[v.id] === "memorized") pool.push(i); });
    if (!pool.length) return;
    startLesson(op, pool[Math.floor(Math.random() * pool.length)], "game");
  }

  // =========================================================================
  // PANTALLA DE INICIO
  // =========================================================================
  // Color propio de cada curso (azulejo + su sombra "3D"), estilo Duolingo.
  const COURSE_COLORS = {
    london:       ["#58cc02", "#46a302"],
    italian:      ["#1cb0f6", "#1899d6"],
    ruylopez:     ["#ff4b4b", "#d33a3a"],
    sicilian:     ["#ff9600", "#d17c00"],
    queensgambit: ["#ce82ff", "#a968d6"],
    kingsindian:  ["#2ec4b6", "#25a094"]
  };

  function renderHome() {
    // Tarjeta de repaso espaciado (solo si hay repasos vencidos).
    ensureReviewEntries();
    const due = dueReviews();
    el.reviewCard.hidden = due.length === 0;
    if (due.length) {
      $("#review-sub").textContent = due.length === 1
        ? "1 variación espera tu repaso de memoria"
        : `${due.length} variaciones esperan tu repaso de memoria`;
    }

    el.openingsList.innerHTML = "";
    OPENINGS.forEach((op, cardIdx) => {
      const total = op.variations.length;
      const done = memorizedCount(op);
      const pct = Math.round((done / total) * 100);
      const cta = done === 0 ? "Empezar curso"
        : done >= total ? "¡Curso completado! Repasar"
        : "Continuar curso";
      const card = document.createElement("button");
      card.className = "opening-card";
      card.style.animationDelay = (cardIdx * 55) + "ms"; // entrada escalonada
      const cc = COURSE_COLORS[op.id];
      if (cc) {
        card.style.setProperty("--tile", cc[0]);
        card.style.setProperty("--tile-sh", cc[1]);
      }
      card.innerHTML = `
        <span class="opening-emoji">${op.emoji}</span>
        <span class="opening-info">
          <span class="opening-name">${op.name}</span>
          ${op.tag ? `<span class="opening-tag">⭐ ${op.tag}</span>` : ""}
          <span class="opening-blurb">${op.blurb}</span>
          <span class="course-bar"><span class="course-bar-fill" style="width:${pct}%"></span></span>
          <span class="opening-meta">
            <span class="badge">${op.level}</span>
            <span class="badge badge-soft">${done}/${total}</span>
            <span class="course-cta">${cta}</span>
          </span>
        </span>
        <span class="opening-go">›</span>`;
      card.addEventListener("click", () => startCourse(op));
      el.openingsList.appendChild(card);

      // Con 2+ líneas memorizadas se desbloquea la partida de repertorio.
      if (done >= 2) {
        const gb = document.createElement("button");
        gb.className = "game-btn";
        gb.textContent = "⚔️ Partida de repertorio — el rival elige la línea";
        gb.addEventListener("click", () => startGame(op));
        el.openingsList.appendChild(gb);
      }
    });
  }

  // Empieza (o continúa) el curso de una apertura por la primera variación
  // pendiente. El usuario no tiene que elegir nada más.
  function startCourse(op) {
    const { index, phase } = firstPending(op);
    startLesson(op, index, phase);
  }

  // Índice opcional: hoja con todas las variaciones (para saltar a una).
  function openVariations(op) {
    const m = statusMap(op.id);
    el.variationsTitle.textContent = `${op.emoji} ${op.name}`;
    el.variationsList.innerHTML = "";
    op.variations.forEach((v, idx) => {
      const st = m[v.id] || "";
      const mark = st === "memorized" ? "✓" : (st === "learned" || st === "recalled1") ? "½" : (idx + 1);
      const row = document.createElement("button");
      row.className = "variation-row" + (st === "memorized" ? " is-done" : "");
      row.innerHTML = `
        <span class="variation-check">${mark}</span>
        <span class="variation-info">
          <span class="variation-name">${v.name}</span>
          <span class="variation-blurb">${v.blurb}</span>
        </span>
        <span class="variation-meta">›</span>`;
      row.addEventListener("click", () => {
        el.variationsSheet.classList.remove("is-open");
        // Si ya está aprendida o repetida una vez, salta a la fase de memoria.
        startLesson(op, idx, (st === "learned" || st === "recalled1") ? "recall" : "learn");
      });
      el.variationsList.appendChild(row);
    });
    el.variationsSheet.classList.add("is-open");
  }

  function showScreen(name) {
    el.screenHome.classList.toggle("is-active", name === "home");
    el.screenLesson.classList.toggle("is-active", name === "lesson");
    window.scrollTo(0, 0);
  }

  // Vuelve al inicio refrescando las barras de progreso de cada curso.
  function goHome() {
    el.completeOverlay.classList.remove("is-open");
    clearTimeout(state.flowTimer);
    clearTimeout(flashTimer);
    renderHome();
    showScreen("home");
  }

  // =========================================================================
  // LECCIÓN
  // =========================================================================
  // Fases: "learn" (con ayuda) | "recall" (memoria del curso) |
  // "review" (repaso espaciado) | "game" (partida de repertorio).
  function startLesson(opening, index, phase) {
    index = Math.max(0, Math.min(index, opening.variations.length - 1));
    phase = (phase === "recall" || phase === "review" || phase === "game") ? phase : "learn";
    state.opening = opening;
    state.courseIndex = index;
    state.variation = opening.variations[index];
    state.phase = phase;
    state.guided = phase === "learn";   // con ayuda al aprender, sin ayuda al memorizar
    state.usedHelp = false;
    state.board = initialBoard();
    state.step = 0;
    state.selected = null;
    state.selectable = null;
    state.hint = null;
    state.lastMove = null;
    state.locked = false;
    state.missed = [];
    state.drill = null;
    clearTimeout(state.flowTimer);
    state.flipped = opening.color === "black";
    el.btnMode.textContent = state.guided ? "Guiado" : "Memoria";
    let tag;
    if (phase === "learn") {
      tag = "🟢 Aprender";
    } else if (phase === "review") {
      tag = "📅 Repaso";
    } else if (phase === "game") {
      tag = "⚔️ Partida";
    } else {
      const passNo = getStatus(opening.id, state.variation.id) === "recalled1" ? 2 : 1;
      tag = `🧠 De memoria (${passNo}/2)`;
    }
    // En partida NO se revela qué línea eligió el rival: esa es la gracia.
    el.lessonName.textContent = phase === "game"
      ? `${tag} · ${opening.name}`
      : `${tag} · ${index + 1}/${opening.variations.length} · ${state.variation.name}`;
    showScreen("lesson");
    buildBoardGrid();
    renderBoard();
    runStep();
  }

  // Construye una sola vez: la rejilla de 64 casillas (fondo/resaltados/clic)
  // y una capa superior donde viven las piezas (para poder animarlas).
  function buildBoardGrid() {
    el.board.innerHTML = "";
    for (let i = 0; i < 64; i++) {
      const cell = document.createElement("div");
      cell.className = "sq";
      el.board.appendChild(cell);
    }
    el.piecesLayer = document.createElement("div");
    el.piecesLayer.className = "pieces-layer";
    el.board.appendChild(el.piecesLayer);
    // La entrada (toque y arrastre) se gestiona a nivel de tablero en bindEvents.
  }

  // Casilla bajo un punto de pantalla (para arrastrar/tocar).
  function squareFromPoint(clientX, clientY) {
    const rect = el.board.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    const col = Math.max(0, Math.min(7, Math.floor(x * 8)));
    const row = Math.max(0, Math.min(7, Math.floor(y * 8)));
    const fi = state.flipped ? 7 - col : col;
    const ri = state.flipped ? row : 7 - row;
    return FILES[fi] + (ri + 1);
  }

  // Columna/fila visual (0-7) de una casilla según la orientación del tablero.
  function colRow(sq) {
    const fi = FILES.indexOf(sq[0]);
    const ri = Number(sq[1]) - 1;
    return {
      col: state.flipped ? 7 - fi : fi,
      row: state.flipped ? ri : 7 - ri
    };
  }
  function setPiecePos(node, sq) {
    const { col, row } = colRow(sq);
    node.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
  }

  // Pinta el fondo de las casillas: color, coordenadas y resaltados.
  // No toca las piezas (van en su propia capa), así que es barato y no las
  // hace "teletransportarse".
  function paintSquares() {
    const cells = el.board.children;
    let i = 0;
    for (let r = 8; r >= 1; r--) {
      for (let f = 0; f < 8; f++) {
        const sq = state.flipped ? FILES[7 - f] + (9 - r) : FILES[f] + r;
        const cell = cells[i++];
        const fi = FILES.indexOf(sq[0]), ri = Number(sq[1]);
        const dark = (fi + ri) % 2 === 0;
        let cls = "sq " + (dark ? "dark" : "light");
        if (state.lastMove && (sq === state.lastMove.from || sq === state.lastMove.to)) cls += " last";
        if (state.selected === sq) cls += " selected";
        if (state.selectable === sq) cls += " selectable";
        if (state.hint && state.hint.from === sq) cls += " hint-from";
        if (state.hint && state.hint.to === sq) cls += " hint-to";
        cell.className = cls;
        cell.dataset.square = sq;
        const showFile = state.flipped ? sq[1] === "8" : sq[1] === "1";
        const showRank = state.flipped ? sq[0] === "h" : sq[0] === "a";
        cell.dataset.file = showFile ? sq[0] : "";
        cell.dataset.rank = showRank ? sq[1] : "";
      }
    }
    // Realza la pieza seleccionada y la que se debe mover (turno guiado).
    for (const id in state.pieceNodes) state.pieceNodes[id].classList.remove("sel", "movehint");
    if (state.selected && state.board[state.selected]) {
      const n = state.pieceNodes[state.board[state.selected].id];
      if (n) n.classList.add("sel");
    }
    if (state.selectable && state.board[state.selectable]) {
      const n = state.pieceNodes[state.board[state.selectable].id];
      if (n) n.classList.add("movehint");
    }
  }

  // Coloca TODAS las piezas desde cero (sin animación). Para inicio de lección,
  // navegación con flechas o giro de tablero.
  function placeAllPieces() {
    el.piecesLayer.innerHTML = "";
    state.pieceNodes = {};
    for (const sq in state.board) {
      const p = state.board[sq];
      const node = document.createElement("div");
      node.className = "pc " + p.color;
      node.style.backgroundImage = `url("assets/pieces/${pieceFile(p)}")`;
      setPiecePos(node, sq); // posición inicial antes de insertar: no anima
      el.piecesLayer.appendChild(node);
      state.pieceNodes[p.id] = node;
    }
  }

  // Redibujado completo (fondo + piezas sin animación).
  function renderBoard() {
    paintSquares();
    placeAllPieces();
  }

  // Anima una jugada: desliza la(s) pieza(s) y desvanece la capturada.
  function animateMove(move) {
    const steps = [];
    if (move.castle) {
      const c = castleInfo(move);
      steps.push({ from: c.kingFrom, to: c.kingTo });
      steps.push({ from: c.rookFrom, to: c.rookTo });
      state.lastMove = { from: c.kingFrom, to: c.kingTo };
    } else {
      steps.push({ from: move.from, to: move.to });
      state.lastMove = { from: move.from, to: move.to };
    }
    steps.forEach(({ from, to }) => {
      const moving = state.board[from];
      const captured = state.board[to];
      if (captured && (!moving || captured.id !== moving.id)) {
        const cnode = state.pieceNodes[captured.id];
        if (cnode) {
          cnode.classList.add("captured");
          cnode.style.transform += " scale(.55)"; // se encoge mientras se desvanece
          const id = captured.id;
          setTimeout(() => { cnode.remove(); delete state.pieceNodes[id]; }, 260);
        }
      }
      delete state.board[from];
      state.board[to] = moving;
      const node = moving && state.pieceNodes[moving.id];
      if (node) setPiecePos(node, to); // la transición CSS hace el deslizamiento
    });
    state.selected = null;
    state.selectable = null;
    state.hint = null;
    paintSquares();
  }

  // Duración del deslizamiento (debe coincidir con la transición CSS).
  const SLIDE_MS = 340;

  // Tiempo de lectura de un mensaje del entrenador: proporcional a su longitud
  // (~45 ms por carácter ≈ ritmo de lectura tranquilo), con mínimo y máximo.
  function readMs(text) {
    const len = text ? text.length : 0;
    return Math.max(1500, Math.min(6000, 600 + len * 45));
  }

  function runStep() {
    const ms = moves();
    if (state.step >= ms.length) return finishLesson();

    const move = ms[state.step];
    updateHud();

    if (move.by === "engine") {
      // El rival responde casi al instante y sin comentario alguno: su jugada
      // se ve en el tablero (deslizamiento + casillas resaltadas) y ya.
      state.locked = true;
      clearHints();
      setFlow(() => {
        animateMove(move);
        state.step++;
        setFlow(() => {
          state.locked = false;
          runStep();
        }, SLIDE_MS + 80);
      }, 200);
      return;
    }

    // Turno del alumno: la burbuja trae solo NUESTRA jugada (o el reto de
    // memoria). Única excepción: la entrada a la variación cuando la partida
    // la abre el rival, para no perder el nombre de la línea (salvo en
    // partida de repertorio, donde la línea es secreta).
    const prev = ms[state.step - 1];
    const intro = (state.phase !== "game" && prev && prev.by === "engine" &&
                   prev.text && prev.text.startsWith("Entramos"))
      ? prev.text.split(". ")[0] + ". "
      : "";
    const ahora = state.guided ? move.text : pick(RECALL_PROMPTS);
    setCoach(intro + ahora, "talk");
    state.locked = false;
    state.selected = null;
    if (state.guided) highlightFrom(move); else clearHints();
  }

  function updateHud() {
    const total = moves().length;
    el.progressFill.style.width = Math.round((state.step / total) * 100) + "%";
    el.lessonCounter.textContent = "#" + Math.min(state.step + 1, total);
  }

  let lastCoachText = "";
  function setCoach(text, mood) {
    const faces = { talk: "♞", happy: "😊", think: "🤔", win: "🏆" };
    el.coachMood.textContent = faces[mood] || "♞";
    if (mood === "happy" || mood === "win") {
      el.coachMood.classList.remove("bounce");
      void el.coachMood.offsetWidth;
      el.coachMood.classList.add("bounce");
    }
    if (text === lastCoachText) return; // misma burbuja: no repintar ni parpadear
    lastCoachText = text;
    el.coachText.textContent = text;
    // Fundido suave del texto en la MISMA burbuja (sin "pop" ni saltos).
    el.coachText.classList.remove("fade");
    void el.coachText.offsetWidth;
    el.coachText.classList.add("fade");
  }

  function clearHints() {
    state.selectable = null;
    state.hint = null;
    paintSquares();
  }
  function highlightFrom(move) {
    state.selectable = moveSquares(move).from;
    state.hint = null;
    paintSquares();
  }
  function showHint() {
    const move = moves()[state.step];
    if (!move || move.by !== "user" || state.locked) return;
    state.usedHelp = true; // en fase de memoria, pedir pista cuenta como ayuda
    const { from, to } = moveSquares(move);
    state.hint = { from, to };
    paintSquares();
    setCoach(move.hint || "Movemos la pieza resaltada a la casilla iluminada.", "think");
  }

  function onSquareTap(sq) {
    if (state.locked) return;
    const move = moves()[state.step];
    if (!move || move.by !== "user") return;

    const { from: expectedFrom, to: expectedTo } = moveSquares(move);

    if (!state.selected) {
      const piece = state.board[sq];
      if (!piece) return;
      if (sq === expectedFrom) {
        state.selected = sq;
        state.selectable = null;
        if (state.guided) state.hint = { to: expectedTo };
        paintSquares();
      } else {
        wrongMove();
      }
      return;
    }

    if (sq === state.selected) {
      state.selected = null;
      if (state.guided) highlightFrom(move); else paintSquares();
      return;
    }

    if (sq === expectedTo) {
      commitUserMove(move);
    } else {
      wrongMove();
    }
  }

  // El porqué de una jugada, sin el prefijo de entrada a la variación.
  function moveWhy(move) {
    return (move.text || "").replace(/^Entramos en «[^»]*»\.\s*/, "");
  }

  // Confirma la jugada correcta del alumno (toque o arrastre): anima y avanza.
  function commitUserMove(move) {
    // Al aprender, la explicación ya estaba en pantalla: basta el elogio.
    // De memoria, en repaso y en refuerzo, el porqué llega DESPUÉS de recordar
    // la jugada: feedback tras el esfuerzo de recuperación, que es cuando fija.
    // En partida de repertorio no: ritmo de partida, elogio corto y seguimos.
    const why = (state.drill || (!state.guided && state.phase !== "game")) ? moveWhy(move) : "";
    const msg = why ? pick(PRAISE) + " " + why : pick(PRAISE);
    setCoach(msg, "happy");
    animateMove(move);
    state.locked = true;
    const wait = why ? readMs(msg) : SLIDE_MS + 850;
    // En refuerzo no se sigue la línea: se pasa a la siguiente repetición.
    if (state.drill) {
      state.drill.pos++;
      setFlow(() => {
        state.locked = false;
        drillStep();
      }, wait);
      return;
    }
    state.step++;
    setFlow(() => {
      state.locked = false;
      runStep();
    }, wait);
  }

  // ---- Arrastre de piezas con el dedo (Pointer Events) --------------------
  let drag = null; // { from, node, startX, startY, moved, downSq }

  function onPointerDown(e) {
    if (state.locked) return;
    const move = moves()[state.step];
    if (!move || move.by !== "user") return;
    const sq = squareFromPoint(e.clientX, e.clientY);
    if (!sq) return;
    drag = { from: sq, downSq: sq, node: null, startX: e.clientX, startY: e.clientY, moved: false };
    const piece = state.board[sq];
    // Solo se puede arrastrar una pieza propia (del color del alumno).
    if (piece && piece.color === state.opening.color) {
      drag.node = state.pieceNodes[piece.id] || null;
      try { el.board.setPointerCapture(e.pointerId); } catch (err) {}
    }
  }

  function positionDragNode(clientX, clientY) {
    const rect = el.board.getBoundingClientRect();
    const size = rect.width / 8;
    const px = clientX - rect.left - size / 2;
    const py = clientY - rect.top - size / 2;
    drag.node.style.transform = `translate(${px}px, ${py}px) scale(1.12)`;
  }

  function onPointerMove(e) {
    if (!drag || !drag.node) return;
    if (!drag.moved) {
      const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
      if (Math.hypot(dx, dy) < 6) return; // umbral para distinguir toque de arrastre
      drag.moved = true;
      drag.node.classList.add("dragging");
      // selecciona visualmente la pieza y, si guiado, marca el destino
      const m = moves()[state.step];
      const exp = moveSquares(m);
      state.selected = drag.from;
      state.selectable = null;
      state.hint = (state.guided && drag.from === exp.from) ? { to: exp.to } : null;
      paintSquares();
    }
    positionDragNode(e.clientX, e.clientY);
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!drag) return;
    const d = drag; drag = null;
    try { el.board.releasePointerCapture(e.pointerId); } catch (err) {}

    if (!d.moved || !d.node) {
      // Fue un toque: comportamiento de toque sobre la casilla pulsada.
      onSquareTap(d.downSq);
      return;
    }

    // Fue un arrastre: soltar sobre la casilla destino.
    const to = squareFromPoint(e.clientX, e.clientY) || d.from;
    const move = moves()[state.step];
    const exp = move ? moveSquares(move) : {};
    d.node.classList.remove("dragging");
    if (move && d.from === exp.from && to === exp.to) {
      commitUserMove(move);            // correcto: animateMove coloca la pieza
    } else {
      setPiecePos(d.node, d.from);     // vuelve a su sitio
      if (to !== d.from) wrongMove();  // soltó en otra casilla incorrecta
      else { state.selected = null; if (state.guided && move) highlightFrom(move); else paintSquares(); }
    }
  }

  function wrongMove() {
    state.usedHelp = true; // un fallo rompe el "sin ayuda" de la fase de memoria
    state.selected = null;

    // En fase de memoria o repaso, apunta el paso fallado: al acabar la línea
    // se practicará aparte (refuerzo dirigido de la jugada concreta).
    if ((state.phase === "recall" || state.phase === "review") && !state.guided && !state.drill) {
      const mv = moves()[state.step];
      if (mv && mv.by === "user" && !state.missed.includes(state.step)) {
        state.missed.push(state.step);
      }
    }

    // Durante el refuerzo, el fallo recibe corrección inmediata: se enseña la
    // jugada y esa posición vuelve a la cola para salir otra vez sin ayuda.
    if (state.drill) {
      const m = moves()[state.step];
      state.hint = moveSquares(m);
      paintSquares();
      // La corrección llega con su porqué: ver el motivo ayuda a no repetir el fallo.
      setCoach("Esa no era. Fíjate 👇 " + moveWhy(m), "think");
      const times = state.drill.queue.filter((s) => s === state.step).length;
      if (times < 4) state.drill.queue.push(state.step);
      el.coachCard.classList.add("shake");
      setTimeout(() => el.coachCard.classList.remove("shake"), 400);
      return;
    }

    if (state.guided) highlightFrom(moves()[state.step]); else paintSquares();
    setCoach(pick(NUDGE), "think");
    el.coachCard.classList.add("shake");
    setTimeout(() => el.coachCard.classList.remove("shake"), 400);
  }

  // Overlay breve que se cierra solo y continúa (la app lleva las riendas:
  // el usuario no tiene que decidir si pasa de fase o de variación).
  let flashTimer = null;
  function flashThenAdvance(title, text, cb) {
    $("#complete-title").textContent = title;
    el.completeText.textContent = text;
    $("#complete-next").style.display = "none";
    const actions = document.querySelector(".overlay-actions");
    if (actions) actions.style.display = "none";
    el.completeOverlay.classList.add("is-open");
    clearTimeout(flashTimer);
    // Se muestra el tiempo necesario para leerlo con calma y sigue solo.
    flashTimer = setTimeout(() => {
      el.completeOverlay.classList.remove("is-open");
      cb();
    }, Math.max(2200, readMs(text)));
  }

  // ---- Refuerzo dirigido ---------------------------------------------------
  // Si en la fase de memoria hubo fallos, al terminar la línea se practican
  // APARTE esas jugadas concretas: dos rondas por jugada (todas una vez y
  // luego todas otra vez, para dar un poco de espaciado). Volver a recuperar
  // justo lo que falló es lo que mejor lo fija.
  function startDrill(queue) {
    state.drill = { queue, pos: 0 };
    el.lessonName.textContent = `🔁 Refuerzo · ${state.variation.name}`;
    drillStep();
  }

  function drillStep() {
    const d = state.drill;
    if (!d) return;
    if (d.pos >= d.queue.length) {
      // Refuerzo completado: retoma el cierre normal de la lección.
      state.drill = null;
      state.locked = true;
      flashThenAdvance(
        "¡Reforzada! 💪",
        "Esa jugada ya no se nos escapa. Seguimos donde íbamos.",
        () => finishLesson()
      );
      return;
    }
    // Coloca el tablero justo ANTES de la jugada fallada y pide recordarla.
    const stepIdx = d.queue[d.pos];
    const ms = moves();
    state.board = initialBoard();
    state.lastMove = null;
    for (let i = 0; i < stepIdx; i++) applyMove(ms[i]);
    state.step = stepIdx;
    state.selected = null;
    state.selectable = null;
    state.hint = null;
    state.locked = false;
    renderBoard();
    updateHud();
    setCoach(
      d.pos === 0
        ? "Refuerzo 🔁 Aquí fue donde nos equivocamos. ¿Recuerdas nuestra jugada?"
        : "Otra vez esta posición, para fijarla: ¿cuál es la jugada?",
      "think"
    );
  }

  function finishLesson() {
    el.progressFill.style.width = "100%";
    state.locked = true;

    // Antes de cerrar una fase de memoria o repaso con fallos: refuerzo
    // dirigido de las jugadas concretas donde nos equivocamos.
    if ((state.phase === "recall" || state.phase === "review") && state.missed.length) {
      const missed = state.missed.slice().sort((a, b) => a - b);
      state.missed = [];
      const queue = missed.concat(missed); // dos rondas por jugada fallada
      const what = missed.length === 1
        ? "la jugada en la que nos equivocamos"
        : `las ${missed.length} jugadas en las que nos equivocamos`;
      flashThenAdvance(
        "Vamos a reforzar 🔁",
        `Antes de seguir, practicamos aparte ${what}: repetir justo lo que falló es lo que mejor lo graba.`,
        () => startDrill(queue)
      );
      return;
    }

    const op = state.opening, v = state.variation;
    const total = op.variations.length;

    // Partida de repertorio: no toca el progreso del curso; se revela por fin
    // qué línea eligió el rival y se ofrece otra partida.
    if (state.phase === "game") {
      const limpia = !state.usedHelp;
      $("#complete-title").textContent = limpia ? "⚔️ ¡Partida impecable!" : "⚔️ Partida completada";
      el.completeText.textContent = `El rival eligió «${v.name}» y ` +
        (limpia
          ? "respondiste toda la línea de memoria, sin un solo fallo. 🏆"
          : "llegamos al final. Con un par de repasos saldrá sin ayudas.");
      const nextBtn = $("#complete-next");
      nextBtn.textContent = "Otra partida ▶";
      nextBtn.style.display = "block";
      const actions = document.querySelector(".overlay-actions");
      if (actions) actions.style.display = "flex";
      state.onNext = () => startGame(op);
      el.completeOverlay.classList.add("is-open");
      return;
    }

    // Repaso espaciado: actualiza la agenda y encadena el siguiente vencido.
    if (state.phase === "review") {
      const limpia = !state.usedHelp;
      const days = updateReview(op.id, v.id, limpia);
      const cuando = days === 1 ? "mañana" : `en ${days} días`;
      const msg = limpia
        ? `${pick(PERFECT)} Próximo repaso de esta línea: ${cuando}.`
        : "Hubo tropiezos, así que esta línea vuelve mañana para fijarla mejor.";
      const rest = dueReviews();
      if (rest.length) {
        flashThenAdvance(
          limpia ? "¡Repasada, perfecta! 🌟" : "¡Repasada! ✅",
          msg + ` Seguimos: ${rest.length === 1 ? "queda 1 repaso" : `quedan ${rest.length} repasos`} por hoy.`,
          () => startLesson(rest[0].op, rest[0].index, "review")
        );
      } else {
        $("#complete-title").textContent = "🎉 ¡Repasos al día!";
        el.completeText.textContent = msg + " No queda nada pendiente por hoy.";
        const nextBtn = $("#complete-next");
        nextBtn.textContent = "Volver al inicio";
        nextBtn.style.display = "block";
        const actions = document.querySelector(".overlay-actions");
        if (actions) actions.style.display = "none";
        state.onNext = () => goHome();
        el.completeOverlay.classList.add("is-open");
      }
      return;
    }

    if (state.phase === "learn") {
      // Aprendida con ayuda → la app pasa SOLA a la primera repetición de memoria.
      setStatus(op.id, v.id, "learned");
      flashThenAdvance(
        "¡Aprendida! 🙌",
        "Ahora la repetimos de memoria, sin ayuda: recordarla por ti mismo es lo que la fija de verdad 🧠.",
        () => startLesson(op, state.courseIndex, "recall")
      );
      return;
    }

    // Fase de memoria. Se repite DOS veces para fijarla mejor.
    // «Perfecta» = sin fallos y sin pedir ayuda: se celebra por todo lo alto.
    const clean = !state.usedHelp;
    const prev = getStatus(op.id, v.id);
    if (prev !== "recalled1") {
      // Completó la 1ª repetición → la app pasa SOLA a la 2ª.
      setStatus(op.id, v.id, "recalled1");
      flashThenAdvance(
        clean ? "¡Perfecta! 🌟" : "¡Una vez de memoria! 💪",
        clean
          ? pick(PERFECT) + " Una repetición más y queda grabada para siempre."
          : "Una más y queda grabada. La repetimos otra vez sin ayuda.",
        () => startLesson(op, state.courseIndex, "recall")
      );
      return;
    }

    // 2ª repetición superada → memorizada, y entra en la agenda de repasos.
    setStatus(op.id, v.id, "memorized");
    scheduleFirstReview(op.id, v.id);
    const done = memorizedCount(op);

    if (done >= total) {
      // Fin del curso: único punto donde se muestran botones.
      $("#complete-title").textContent = "🏆 ¡Curso completado!";
      el.completeText.textContent =
        (clean ? "¡Y esta última salió perfecta, sin un solo fallo! 🌟 " : "") +
        `Hemos memorizado las ${total} variaciones de ${op.name}. Un trabajo enorme. 🎉`;
      const nextBtn = $("#complete-next");
      nextBtn.textContent = "Volver al inicio";
      nextBtn.style.display = "block";
      const actions = document.querySelector(".overlay-actions");
      if (actions) actions.style.display = "flex";
      state.onNext = () => goHome();
      el.completeOverlay.classList.add("is-open");
      return;
    }

    // Sigue habiendo variaciones pendientes → la app avanza SOLA a la siguiente.
    const next = firstPending(op);
    flashThenAdvance(
      clean ? "¡Memorizada, perfecta! 🌟" : "¡Memorizada! ✅",
      (clean ? pick(PERFECT) + " " : "") +
        `Llevamos ${done} de ${total} en ${op.name}. Seguimos con la siguiente.`,
      () => startLesson(op, next.index, next.phase)
    );
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ---- Navegación entre pasos (flechas) -----------------------------------
  // Desactivada durante el refuerzo: allí se practica una posición concreta.
  function gotoStep(n) {
    if (state.drill) return;
    clearTimeout(state.flowTimer); // cancela jugadas del rival «en vuelo»
    const ms = moves();
    n = Math.max(0, Math.min(n, ms.length));
    state.board = initialBoard();
    state.lastMove = null;
    for (let i = 0; i < n; i++) applyMove(ms[i]);
    state.step = n;
    state.selected = null;
    state.selectable = null;
    state.hint = null;
    state.locked = false;
    el.completeOverlay.classList.remove("is-open");
    renderBoard();
    if (n >= ms.length) return finishLesson();
    runStep();
  }
  function nextStep() {
    if (state.drill) return;
    clearTimeout(state.flowTimer); // cancela jugadas del rival «en vuelo»
    const move = moves()[state.step];
    if (!move) return;
    applyMove(move);
    state.step++;
    renderBoard();
    if (state.step >= moves().length) return finishLesson();
    runStep();
  }
  function prevStep() { gotoStep(state.step - 1); }

  // =========================================================================
  // EVENTOS DE UI
  // =========================================================================
  function bindEvents() {
    $("#btn-back").addEventListener("click", goHome);
    $("#btn-hint").addEventListener("click", showHint);
    el.reviewCard.addEventListener("click", startReviewSession);

    // Entrada del tablero: toque y arrastre con el dedo (Pointer Events).
    el.board.addEventListener("pointerdown", onPointerDown);
    el.board.addEventListener("pointermove", onPointerMove);
    el.board.addEventListener("pointerup", onPointerUp);
    el.board.addEventListener("pointercancel", onPointerUp);

    $("#btn-mode").addEventListener("click", () => {
      state.guided = !state.guided;
      if (state.guided && state.phase !== "learn") state.usedHelp = true; // activar ayuda fuera de aprender cuenta
      el.btnMode.textContent = state.guided ? "Guiado" : "Memoria";
      el.btnMode.setAttribute("aria-pressed", String(!state.guided));
      clearHints();
      const m = moves()[state.step];
      if (state.guided && m && m.by === "user") highlightFrom(m);
      setCoach(
        state.guided
          ? "Modo Guiado: te marcamos la pieza a mover. Aquí aprendemos juntos."
          : "Modo Memoria: sin pistas automáticas. Si te atascas, el botón 💡 sigue ahí.",
        "talk"
      );
    });

    $("#btn-next").addEventListener("click", nextStep);
    $("#btn-prev").addEventListener("click", prevStep);

    // Ajustes
    $("#btn-settings").addEventListener("click", () => el.settingsSheet.classList.add("is-open"));
    document.querySelectorAll("[data-close-sheet]").forEach((n) =>
      n.addEventListener("click", (e) => {
        e.target.closest(".sheet").classList.remove("is-open");
      }));
    $("#set-flip").addEventListener("click", () => {
      state.flipped = !state.flipped;
      renderBoard();
      el.settingsSheet.classList.remove("is-open");
    });
    $("#set-restart").addEventListener("click", () => {
      el.settingsSheet.classList.remove("is-open");
      startLesson(state.opening, state.courseIndex, state.phase);
    });
    $("#set-index").addEventListener("click", () => {
      el.settingsSheet.classList.remove("is-open");
      openVariations(state.opening);
    });
    $("#set-home").addEventListener("click", () => {
      el.settingsSheet.classList.remove("is-open");
      goHome();
    });

    // Felicitación final
    $("#complete-next").addEventListener("click", () => {
      el.completeOverlay.classList.remove("is-open");
      if (state.onNext) state.onNext();
    });
    $("#complete-replay").addEventListener("click", () => {
      el.completeOverlay.classList.remove("is-open");
      startLesson(state.opening, state.courseIndex, state.phase);
    });
    $("#complete-home").addEventListener("click", () => {
      el.completeOverlay.classList.remove("is-open");
      goHome();
    });
  }

  // =========================================================================
  // ARRANQUE
  // =========================================================================
  function init() {
    cacheDom();
    renderHome();
    bindEvents();

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
