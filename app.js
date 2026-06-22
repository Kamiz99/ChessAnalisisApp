/* =========================================================================
 * Aprende Aperturas — lógica de la app
 * PWA móvil para aprender aperturas de ajedrez con un entrenador cordial.
 * ========================================================================= */

(function () {
  "use strict";

  // ---- Piezas (glifos Unicode). Se colorean con CSS según el color. --------
  const GLYPH = {
    K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟"
  };

  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

  // Frases de ánimo del entrenador (tono humano y cercano).
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
    board: {},          // mapa casilla -> {type, color}
    step: 0,            // índice de jugada actual
    flipped: false,     // orientación del tablero
    guided: true,       // modo guiado (muestra ayudas) vs examen
    selected: null,     // casilla seleccionada por el usuario
    lastMove: null,     // {from,to} última jugada para resaltar
    locked: false       // bloquea entrada mientras el rival mueve
  };

  // ---- Utilidades DOM ------------------------------------------------------
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
    el.btnHint = $("#btn-hint");
    el.btnMode = $("#btn-mode");
    el.settingsSheet = $("#settings-sheet");
    el.completeOverlay = $("#complete-overlay");
    el.completeText = $("#complete-text");
  }

  // ---- Posición inicial estándar ------------------------------------------
  function initialBoard() {
    const b = {};
    const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
    FILES.forEach((f, i) => {
      b[f + "1"] = { type: back[i], color: "white" };
      b[f + "2"] = { type: "P", color: "white" };
      b[f + "7"] = { type: "P", color: "black" };
      b[f + "8"] = { type: back[i], color: "black" };
    });
    return b;
  }

  // Devuelve las casillas implicadas en un enroque según el color del bando.
  function castleInfo(move) {
    const rank = move.color === "black" ? "8" : "1";
    if (move.castle === "O-O") {
      return { kingFrom: "e" + rank, kingTo: "g" + rank, rookFrom: "h" + rank, rookTo: "f" + rank };
    }
    return { kingFrom: "e" + rank, kingTo: "c" + rank, rookFrom: "a" + rank, rookTo: "d" + rank };
  }

  // Casillas de origen/destino "lógicas" de una jugada (sirve para el enroque).
  function moveSquares(move) {
    if (move.castle) {
      const c = castleInfo(move);
      return { from: c.kingFrom, to: c.kingTo };
    }
    return { from: move.from, to: move.to };
  }

  // ---- Aplicar una jugada al tablero --------------------------------------
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

  // =========================================================================
  // PANTALLA DE INICIO
  // =========================================================================
  function renderHome() {
    el.openingsList.innerHTML = "";
    OPENINGS.forEach((op) => {
      const card = document.createElement("button");
      card.className = "opening-card";
      card.innerHTML = `
        <span class="opening-emoji">${op.emoji}</span>
        <span class="opening-info">
          <span class="opening-name">${op.name}</span>
          <span class="opening-blurb">${op.blurb}</span>
          <span class="opening-meta">
            <span class="badge">${op.level}</span>
            <span class="badge badge-soft">${countUserMoves(op)} jugadas tuyas</span>
          </span>
        </span>
        <span class="opening-go">›</span>`;
      card.addEventListener("click", () => startLesson(op));
      el.openingsList.appendChild(card);
    });
  }

  function countUserMoves(op) {
    return op.moves.filter((m) => m.by === "user").length;
  }

  function showScreen(name) {
    el.screenHome.classList.toggle("is-active", name === "home");
    el.screenLesson.classList.toggle("is-active", name === "lesson");
    window.scrollTo(0, 0);
  }

  // =========================================================================
  // LECCIÓN
  // =========================================================================
  function startLesson(opening) {
    state.opening = opening;
    state.board = initialBoard();
    state.step = 0;
    state.selected = null;
    state.lastMove = null;
    state.locked = false;
    // El alumno siempre ve sus piezas abajo: si juega con negras, giramos.
    state.flipped = opening.color === "black";
    el.lessonName.textContent = opening.name;
    showScreen("lesson");
    buildBoardGrid();
    renderBoard();
    runStep();
  }

  // Construye las 64 casillas una sola vez.
  function buildBoardGrid() {
    el.board.innerHTML = "";
    for (let r = 8; r >= 1; r--) {
      for (let f = 0; f < 8; f++) {
        const sq = FILES[f] + r;
        const cell = document.createElement("div");
        const dark = (f + r) % 2 === 0;
        cell.className = "sq " + (dark ? "dark" : "light");
        cell.dataset.square = sq;
        // Coordenadas tenues como en apps reales.
        if (r === 1) cell.dataset.file = FILES[f];
        if (f === 0) cell.dataset.rank = r;
        cell.addEventListener("click", () => onSquareTap(sq));
        el.board.appendChild(cell);
      }
    }
  }

  // Dibuja piezas y resaltados sin recrear la rejilla.
  function renderBoard() {
    const cells = el.board.children;
    // Orden visual según orientación.
    const order = [];
    for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) order.push(FILES[f] + r);
    const view = state.flipped ? [...order].reverse() : order;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const sq = view[i];
      const f = sq[0], r = sq[1];
      const dark = (FILES.indexOf(f) + Number(r)) % 2 === 0;
      cell.dataset.square = sq;
      cell.className = "sq " + (dark ? "dark" : "light");
      cell.dataset.file = (state.flipped ? r === "8" : r === "1") ? f : "";
      cell.dataset.rank = (state.flipped ? f === "h" : f === "a") ? r : "";

      const piece = state.board[sq];
      cell.innerHTML = piece
        ? `<span class="piece ${piece.color}">${GLYPH[piece.type]}</span>`
        : "";

      if (state.lastMove && (sq === state.lastMove.from || sq === state.lastMove.to)) {
        cell.classList.add("last");
      }
      if (state.selected === sq) cell.classList.add("selected");
    }
  }

  // Avanza la lección: muestra el mensaje del paso actual.
  function runStep() {
    const moves = state.opening.moves;
    if (state.step >= moves.length) return finishLesson();

    const move = moves[state.step];
    updateHud();
    setCoach(move.text, "talk");

    if (move.by === "engine") {
      // El rival mueve solo tras una breve pausa.
      state.locked = true;
      clearHints();
      setTimeout(() => {
        applyMove(move);
        renderBoard();
        state.step++;
        state.locked = false;
        runStep();
      }, 950);
    } else {
      // Turno del alumno: prepara las ayudas según el modo.
      state.locked = false;
      state.selected = null;
      if (state.guided) highlightFrom(move);
      renderBoard();
    }
  }

  function updateHud() {
    const total = state.opening.moves.length;
    const done = state.step;
    el.progressFill.style.width = Math.round((done / total) * 100) + "%";
    el.lessonCounter.textContent = "#" + Math.min(state.step + 1, total);
  }

  // ---- Entrenador (mensajes) ----------------------------------------------
  function setCoach(text, mood) {
    el.coachText.textContent = text;
    const faces = { talk: "♞", happy: "😊", think: "🤔", win: "🏆" };
    el.coachMood.textContent = faces[mood] || "♞";
    el.coachCard.classList.remove("flash");
    // Reinicia la animación de aparición.
    void el.coachCard.offsetWidth;
    el.coachCard.classList.add("flash");
  }

  // ---- Resaltados de ayuda -------------------------------------------------
  function clearHints() {
    el.board.querySelectorAll(".hint-from, .hint-to, .selectable")
      .forEach((c) => c.classList.remove("hint-from", "hint-to", "selectable"));
  }

  function cellOf(sq) {
    return el.board.querySelector(`.sq[data-square="${sq}"]`);
  }

  // En modo guiado, marca suavemente la pieza que hay que mover.
  function highlightFrom(move) {
    clearHints();
    const { from } = moveSquares(move);
    const c = cellOf(from);
    if (c) c.classList.add("selectable");
  }

  // El botón 💡 revela origen y destino.
  function showHint() {
    const move = state.opening.moves[state.step];
    if (!move || move.by !== "user" || state.locked) return;
    const { from, to } = moveSquares(move);
    cellOf(from)?.classList.add("hint-from");
    cellOf(to)?.classList.add("hint-to");
    setCoach(move.hint || "Mueve la pieza resaltada a la casilla iluminada.", "think");
  }

  // ---- Interacción en el tablero ------------------------------------------
  function onSquareTap(sq) {
    if (state.locked) return;
    const move = state.opening.moves[state.step];
    if (!move || move.by !== "user") return;

    const { from: expectedFrom, to: expectedTo } = moveSquares(move);

    // Primer toque: seleccionar la pieza de origen correcta.
    if (!state.selected) {
      const piece = state.board[sq];
      if (!piece) return;
      if (sq === expectedFrom) {
        state.selected = sq;
        renderBoard();
        // Marca el destino esperado de forma sutil en modo guiado.
        if (state.guided) cellOf(expectedTo)?.classList.add("hint-to");
      } else {
        wrongMove();
      }
      return;
    }

    // Segundo toque: destino.
    if (sq === state.selected) {
      // Deseleccionar.
      state.selected = null;
      renderBoard();
      if (state.guided) highlightFrom(move);
      return;
    }

    if (sq === expectedTo) {
      // ¡Jugada correcta!
      applyMove(move);
      state.selected = null;
      clearHints();
      renderBoard();
      flashPraise();
      state.step++;
      // Pequeña pausa para que se lea el "¡bien!" antes del siguiente texto.
      state.locked = true;
      setTimeout(() => {
        state.locked = false;
        runStep();
      }, 650);
    } else {
      wrongMove();
    }
  }

  function wrongMove() {
    state.selected = null;
    renderBoard();
    if (state.guided) highlightFrom(state.opening.moves[state.step]);
    setCoach(pick(NUDGE), "think");
    el.coachCard.classList.add("shake");
    setTimeout(() => el.coachCard.classList.remove("shake"), 400);
  }

  function flashPraise() {
    setCoach(pick(PRAISE), "happy");
  }

  function finishLesson() {
    el.progressFill.style.width = "100%";
    state.locked = true;
    el.completeText.textContent =
      `Has aprendido la línea principal de ${state.opening.name}. ` +
      `¡Sigue así y serás imparable! 🚀`;
    el.completeOverlay.classList.add("is-open");
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // =========================================================================
  // NAVEGACIÓN ENTRE PASOS (flechas ‹ ›)
  // =========================================================================
  // Reconstruye el tablero ejecutando las primeras N jugadas (sin animación).
  function gotoStep(n) {
    const moves = state.opening.moves;
    n = Math.max(0, Math.min(n, moves.length));
    state.board = initialBoard();
    state.lastMove = null;
    for (let i = 0; i < n; i++) applyMove(moves[i]);
    state.step = n;
    state.selected = null;
    state.locked = false;
    el.completeOverlay.classList.remove("is-open");
    renderBoard();
    if (n >= moves.length) return finishLesson();
    runStep();
  }

  function nextStep() {
    const move = state.opening.moves[state.step];
    if (!move) return;
    // Avanzar manualmente "juega" el paso actual aunque sea del usuario.
    applyMove(move);
    state.step++;
    renderBoard();
    if (state.step >= state.opening.moves.length) return finishLesson();
    runStep();
  }

  function prevStep() {
    gotoStep(state.step - 1);
  }

  // =========================================================================
  // EVENTOS DE UI
  // =========================================================================
  function bindEvents() {
    $("#btn-back").addEventListener("click", () => showScreen("home"));
    $("#btn-hint").addEventListener("click", showHint);

    $("#btn-mode").addEventListener("click", () => {
      state.guided = !state.guided;
      el.btnMode.textContent = "Modo: " + (state.guided ? "Guiado" : "Examen");
      el.btnMode.setAttribute("aria-pressed", String(!state.guided));
      clearHints();
      const m = state.opening?.moves[state.step];
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
      n.addEventListener("click", () => el.settingsSheet.classList.remove("is-open")));
    $("#set-flip").addEventListener("click", () => {
      state.flipped = !state.flipped;
      renderBoard();
      el.settingsSheet.classList.remove("is-open");
    });
    $("#set-restart").addEventListener("click", () => {
      el.settingsSheet.classList.remove("is-open");
      startLesson(state.opening);
    });
    $("#set-home").addEventListener("click", () => {
      el.settingsSheet.classList.remove("is-open");
      showScreen("home");
    });

    // Felicitación final
    $("#complete-replay").addEventListener("click", () => {
      el.completeOverlay.classList.remove("is-open");
      startLesson(state.opening);
    });
    $("#complete-home").addEventListener("click", () => {
      el.completeOverlay.classList.remove("is-open");
      showScreen("home");
    });
  }

  // =========================================================================
  // ARRANQUE
  // =========================================================================
  function init() {
    cacheDom();
    renderHome();
    bindEvents();

    // Service worker para uso offline / instalación como app.
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
