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
    "¡Exacto! 🎯", "¡Lo tienes!", "¡Eso es, sí señor!"
  ];
  const NUDGE = [
    "Casi… esa no es. Inténtalo de nuevo, tú puedes 🙂",
    "Mmm, prueba otra pieza. Si quieres, pulsa 💡 Pista.",
    "No pasa nada, vuelve a intentarlo. Te doy una pista con el botón 💡.",
    "Esa jugada no toca aún. ¿Probamos otra vez?"
  ];

  // ---- Estado global -------------------------------------------------------
  const state = {
    opening: null,      // apertura actual
    variation: null,    // variación (línea) actual
    courseIndex: 0,     // posición dentro del curso (índice de variación)
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
  const PROGRESS_KEY = "aperturas_progreso";
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function completedIds(openingId) {
    const p = loadProgress();
    return new Set(p[openingId] || []);
  }
  function markCompleted(openingId, variationId) {
    const p = loadProgress();
    const set = new Set(p[openingId] || []);
    set.add(variationId);
    p[openingId] = [...set];
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function progressCount(op) {
    const done = completedIds(op.id);
    let n = 0;
    op.variations.forEach((v) => { if (done.has(v.id)) n++; });
    return n;
  }
  // Primer índice de variación sin completar (o 0 si el curso ya está completo).
  function firstPending(op) {
    const done = completedIds(op.id);
    const idx = op.variations.findIndex((v) => !done.has(v.id));
    return idx === -1 ? 0 : idx;
  }

  // =========================================================================
  // PANTALLA DE INICIO
  // =========================================================================
  function renderHome() {
    el.openingsList.innerHTML = "";
    OPENINGS.forEach((op) => {
      const total = op.variations.length;
      const done = progressCount(op);
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
    startLesson(op, firstPending(op));
  }

  // Índice opcional: hoja con todas las variaciones (para saltar a una).
  function openVariations(op) {
    const done = completedIds(op.id);
    el.variationsTitle.textContent = `${op.emoji} ${op.name}`;
    el.variationsList.innerHTML = "";
    op.variations.forEach((v, idx) => {
      const isDone = done.has(v.id);
      const row = document.createElement("button");
      row.className = "variation-row" + (isDone ? " is-done" : "");
      row.innerHTML = `
        <span class="variation-check">${isDone ? "✓" : (idx + 1)}</span>
        <span class="variation-info">
          <span class="variation-name">${v.name}</span>
          <span class="variation-blurb">${v.blurb}</span>
        </span>
        <span class="variation-meta">›</span>`;
      row.addEventListener("click", () => {
        el.variationsSheet.classList.remove("is-open");
        startLesson(op, idx);
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
  function startLesson(opening, index) {
    index = Math.max(0, Math.min(index, opening.variations.length - 1));
    state.opening = opening;
    state.courseIndex = index;
    state.variation = opening.variations[index];
    state.board = initialBoard();
    state.step = 0;
    state.selected = null;
    state.lastMove = null;
    state.locked = false;
    state.flipped = opening.color === "black";
    state.aiHistory = [];
    el.lessonName.textContent =
      `Lección ${index + 1}/${opening.variations.length} · ${state.variation.name}`;
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
      cell.addEventListener("click", () => {
        const sq = cell.dataset.square;
        if (sq) onSquareTap(sq);
      });
      el.board.appendChild(cell);
    }
    el.piecesLayer = document.createElement("div");
    el.piecesLayer.className = "pieces-layer";
    el.board.appendChild(el.piecesLayer);
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
    setCoach(move.text, "talk");

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

  function setCoach(text, mood) {
    el.coachText.textContent = text;
    const faces = { talk: "♞", happy: "😊", think: "🤔", win: "🏆" };
    el.coachMood.textContent = faces[mood] || "♞";
    el.coachCard.classList.remove("flash");
    void el.coachCard.offsetWidth;
    el.coachCard.classList.add("flash");
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
    const { from, to } = moveSquares(move);
    state.hint = { from, to };
    paintSquares();
    setCoach(move.hint || "Mueve la pieza resaltada a la casilla iluminada.", "think");
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
      flashPraise();
      animateMove(move);   // desliza la pieza
      state.step++;
      state.locked = true;
      setTimeout(() => {
        state.locked = false;
        runStep();
      }, SLIDE_MS + 320);
    } else {
      wrongMove();
    }
  }

  function wrongMove() {
    state.selected = null;
    if (state.guided) highlightFrom(moves()[state.step]); else paintSquares();
    setCoach(pick(NUDGE), "think");
    el.coachCard.classList.add("shake");
    setTimeout(() => el.coachCard.classList.remove("shake"), 400);
  }
  function flashPraise() { setCoach(pick(PRAISE), "happy"); }

  function finishLesson() {
    el.progressFill.style.width = "100%";
    state.locked = true;
    markCompleted(state.opening.id, state.variation.id);

    const total = state.opening.variations.length;
    const done = progressCount(state.opening);
    const hasNext = state.courseIndex < total - 1;
    const title = $("#complete-title");
    const nextBtn = $("#complete-next");

    if (done >= total) {
      title.textContent = "🏆 ¡Curso completado!";
      el.completeText.textContent =
        `¡Has dominado las ${total} variaciones de ${state.opening.name}! Un trabajo enorme. 🎉`;
    } else {
      title.textContent = "¡Variación completada!";
      el.completeText.textContent =
        `«${state.variation.name}» aprendida. Llevas ${done} de ${total} en ${state.opening.name}. ¡Sigue así! 🚀`;
    }
    nextBtn.style.display = hasNext ? "block" : "none";
    el.completeOverlay.classList.add("is-open");
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

    $("#btn-mode").addEventListener("click", () => {
      state.guided = !state.guided;
      el.btnMode.textContent = state.guided ? "Guiado" : "Examen";
      el.btnMode.setAttribute("aria-pressed", String(!state.guided));
      clearHints();
      const m = moves()[state.step];
      if (state.guided && m && m.by === "user") highlightFrom(m);
      setCoach(
        state.guided
          ? "Modo Guiado: te marco la pieza a mover. ¡Tranquilo, aquí aprendemos juntos!"
          : "Modo Examen: ahora sin pistas automáticas. Si te atascas, el botón 💡 sigue ahí.",
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
      startLesson(state.opening, state.courseIndex);
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
      startLesson(state.opening, state.courseIndex + 1);
    });
    $("#complete-replay").addEventListener("click", () => {
      el.completeOverlay.classList.remove("is-open");
      startLesson(state.opening, state.courseIndex);
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
