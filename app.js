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
    aiHistory: [],      // conversación con el entrenador IA [{role, content}]
    aiBusy: false
  };

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
    // IA
    el.aiSheet = $("#ai-sheet");
    el.aiSetup = $("#ai-setup");
    el.aiChat = $("#ai-chat");
    el.aiForm = $("#ai-form");
    el.aiInput = $("#ai-input");
    el.aiKeyInput = $("#ai-key-input");
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

  // =========================================================================
  // PANTALLA DE INICIO
  // =========================================================================
  function renderHome() {
    el.openingsList.innerHTML = "";
    OPENINGS.forEach((op) => {
      const total = op.variations.length;
      const done = memorizedCount(op);
      const pct = Math.round((done / total) * 100);
      const cta = done === 0 ? "Empezar curso"
        : done >= total ? "¡Curso completado! Repasar"
        : "Continuar curso";
      const card = document.createElement("button");
      card.className = "opening-card";
      card.innerHTML = `
        <span class="opening-emoji">${op.emoji}</span>
        <span class="opening-info">
          <span class="opening-name">${op.name}</span>
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
    renderHome();
    showScreen("home");
  }

  // =========================================================================
  // LECCIÓN
  // =========================================================================
  function startLesson(opening, index, phase) {
    index = Math.max(0, Math.min(index, opening.variations.length - 1));
    phase = phase === "recall" ? "recall" : "learn";
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
    state.flipped = opening.color === "black";
    state.aiHistory = [];
    el.btnMode.textContent = state.guided ? "Guiado" : "Memoria";
    let tag;
    if (phase === "learn") {
      tag = "🟢 Aprender";
    } else {
      const passNo = getStatus(opening.id, state.variation.id) === "recalled1" ? 2 : 1;
      tag = `🧠 De memoria (${passNo}/2)`;
    }
    el.lessonName.textContent =
      `${tag} · ${index + 1}/${opening.variations.length} · ${state.variation.name}`;
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
  const SLIDE_MS = 280;

  function runStep() {
    const ms = moves();
    if (state.step >= ms.length) return finishLesson();

    const move = ms[state.step];
    updateHud();
    // En fase «de memoria» no revelamos la jugada del alumno: solo le animamos.
    const coachText = (move.by === "user" && !state.guided) ? pick(RECALL_PROMPTS) : move.text;
    setCoach(coachText, "talk");

    if (move.by === "engine") {
      state.locked = true;
      clearHints();
      // Pausa para leer el mensaje, anima la jugada y avanza al terminar.
      setTimeout(() => {
        animateMove(move);
        state.step++;
        setTimeout(() => {
          state.locked = false;
          runStep();
        }, SLIDE_MS + 60);
      }, 700);
    } else {
      state.locked = false;
      state.selected = null;
      if (state.guided) highlightFrom(move); else { clearHints(); }
    }
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

  // Confirma la jugada correcta del alumno (toque o arrastre): anima y avanza.
  function commitUserMove(move) {
    flashPraise();
    animateMove(move);
    state.step++;
    state.locked = true;
    setTimeout(() => {
      state.locked = false;
      runStep();
    }, SLIDE_MS + 320);
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
    if (state.guided) highlightFrom(moves()[state.step]); else paintSquares();
    setCoach(pick(NUDGE), "think");
    el.coachCard.classList.add("shake");
    setTimeout(() => el.coachCard.classList.remove("shake"), 400);
  }
  function flashPraise() { setCoach(pick(PRAISE), "happy"); }

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
    flashTimer = setTimeout(() => {
      el.completeOverlay.classList.remove("is-open");
      cb();
    }, 1700);
  }

  function finishLesson() {
    el.progressFill.style.width = "100%";
    state.locked = true;

    const op = state.opening, v = state.variation;
    const total = op.variations.length;

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
    const prev = getStatus(op.id, v.id);
    if (prev !== "recalled1") {
      // Completó la 1ª repetición → la app pasa SOLA a la 2ª.
      setStatus(op.id, v.id, "recalled1");
      flashThenAdvance(
        "¡Una vez de memoria! 💪",
        "Una más y queda grabada. La repetimos otra vez sin ayuda.",
        () => startLesson(op, state.courseIndex, "recall")
      );
      return;
    }

    // 2ª repetición superada → memorizada.
    setStatus(op.id, v.id, "memorized");
    const done = memorizedCount(op);

    if (done >= total) {
      // Fin del curso: único punto donde se muestran botones.
      $("#complete-title").textContent = "🏆 ¡Curso completado!";
      el.completeText.textContent =
        `¡Hemos memorizado las ${total} variaciones de ${op.name}! Un trabajo enorme. 🎉`;
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
    const clean = !state.usedHelp;
    const next = firstPending(op);
    flashThenAdvance(
      clean ? "¡Memorizada, sin un fallo! ✅" : "¡Memorizada! ✅",
      `Llevamos ${done} de ${total} en ${op.name}. Seguimos con la siguiente.`,
      () => startLesson(op, next.index, next.phase)
    );
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ---- Navegación entre pasos (flechas) -----------------------------------
  function gotoStep(n) {
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
  // ENTRENADOR IA
  // =========================================================================
  function aiContext() {
    return {
      openingName: state.opening.name,
      variationName: state.variation.name,
      color: state.opening.color,
      moves: state.variation.moves,
      step: state.step
    };
  }

  function openAi() {
    refreshAiVisibility();
    renderChat();
    el.aiSheet.classList.add("is-open");
    if (window.CoachAI.hasKey()) setTimeout(() => el.aiInput.focus(), 200);
  }

  function refreshAiVisibility() {
    const hasKey = window.CoachAI.hasKey();
    el.aiSetup.style.display = hasKey ? "none" : "block";
    el.aiChat.style.display = hasKey ? "flex" : "none";
    el.aiForm.style.display = hasKey ? "flex" : "none";
  }

  function renderChat() {
    el.aiChat.innerHTML = "";
    addBubble("coach",
      `¡Hola! 😊 Soy tu entrenador. Pregúntame lo que quieras sobre «${state.variation.name}» ` +
      `de ${state.opening.name}: ideas, planes, por qué de cada jugada…`);
    state.aiHistory.forEach((m) => addBubble(m.role === "user" ? "me" : "coach", m.content));
    if (state.aiBusy) addBubble("coach", "…", true);
    el.aiChat.scrollTop = el.aiChat.scrollHeight;
  }

  function addBubble(who, text, typing) {
    const b = document.createElement("div");
    b.className = "bubble bubble-" + who + (typing ? " typing" : "");
    b.textContent = text;
    el.aiChat.appendChild(b);
  }

  async function sendAi(text) {
    if (state.aiBusy) return;
    state.aiHistory.push({ role: "user", content: text });
    state.aiBusy = true;
    renderChat();
    try {
      const reply = await window.CoachAI.ask(state.aiHistory, aiContext());
      state.aiHistory.push({ role: "assistant", content: reply });
    } catch (err) {
      let msg;
      if (err.message === "NO_KEY") msg = "Primero añade tu API key con el botón ⚙️ de arriba.";
      else if (err.status === 401) msg = "La clave no es válida. Revísala con el botón ⚙️.";
      else if (err.status === 429) msg = "Vamos rápido 😅 Espera un momento y prueba otra vez.";
      else msg = "Ups, no pude conectar: " + err.message;
      state.aiHistory.push({ role: "assistant", content: msg });
    } finally {
      state.aiBusy = false;
      renderChat();
    }
  }

  // =========================================================================
  // EVENTOS DE UI
  // =========================================================================
  function bindEvents() {
    $("#btn-back").addEventListener("click", goHome);
    $("#btn-hint").addEventListener("click", showHint);
    $("#btn-ai").addEventListener("click", openAi);

    // Entrada del tablero: toque y arrastre con el dedo (Pointer Events).
    el.board.addEventListener("pointerdown", onPointerDown);
    el.board.addEventListener("pointermove", onPointerMove);
    el.board.addEventListener("pointerup", onPointerUp);
    el.board.addEventListener("pointercancel", onPointerUp);

    $("#btn-mode").addEventListener("click", () => {
      state.guided = !state.guided;
      if (state.guided && state.phase === "recall") state.usedHelp = true; // activar ayuda en memoria cuenta
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

    // Entrenador IA
    $("#ai-config-btn").addEventListener("click", () => {
      el.aiSetup.style.display = el.aiSetup.style.display === "none" ? "block" : "none";
      el.aiKeyInput.value = window.CoachAI.getKey();
    });
    $("#ai-key-save").addEventListener("click", () => {
      const k = el.aiKeyInput.value.trim();
      window.CoachAI.setKey(k);
      el.aiKeyInput.value = "";
      refreshAiVisibility();
      renderChat();
      if (window.CoachAI.hasKey()) el.aiInput.focus();
    });
    el.aiForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = el.aiInput.value.trim();
      if (!text) return;
      el.aiInput.value = "";
      sendAi(text);
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
