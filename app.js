/* =========================================================================
 * Aprende Aperturas — lógica de la app
 * PWA móvil para aprender aperturas de ajedrez con un entrenador cordial.
 * ========================================================================= */

(function () {
  "use strict";

  // ---- Piezas (glifos Unicode). Se colorean con CSS según el color. --------
  const GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
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

  function buildBoardGrid() {
    el.board.innerHTML = "";
    for (let r = 8; r >= 1; r--) {
      for (let f = 0; f < 8; f++) {
        const sq = FILES[f] + r;
        const cell = document.createElement("div");
        const dark = (f + r) % 2 === 0;
        cell.className = "sq " + (dark ? "dark" : "light");
        cell.dataset.square = sq;
        cell.addEventListener("click", () => onSquareTap(sq));
        el.board.appendChild(cell);
      }
    }
  }

  function renderBoard() {
    const cells = el.board.children;
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

  function runStep() {
    const ms = moves();
    if (state.step >= ms.length) return finishLesson();

    const move = ms[state.step];
    updateHud();
    setCoach(move.text, "talk");

    if (move.by === "engine") {
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
      state.locked = false;
      state.selected = null;
      if (state.guided) highlightFrom(move);
      renderBoard();
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
    el.board.querySelectorAll(".hint-from, .hint-to, .selectable")
      .forEach((c) => c.classList.remove("hint-from", "hint-to", "selectable"));
  }
  function cellOf(sq) {
    return el.board.querySelector(`.sq[data-square="${sq}"]`);
  }
  function highlightFrom(move) {
    clearHints();
    const { from } = moveSquares(move);
    const c = cellOf(from);
    if (c) c.classList.add("selectable");
  }
  function showHint() {
    const move = moves()[state.step];
    if (!move || move.by !== "user" || state.locked) return;
    const { from, to } = moveSquares(move);
    cellOf(from)?.classList.add("hint-from");
    cellOf(to)?.classList.add("hint-to");
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
        renderBoard();
        if (state.guided) cellOf(expectedTo)?.classList.add("hint-to");
      } else {
        wrongMove();
      }
      return;
    }

    if (sq === state.selected) {
      state.selected = null;
      renderBoard();
      if (state.guided) highlightFrom(move);
      return;
    }

    if (sq === expectedTo) {
      applyMove(move);
      state.selected = null;
      clearHints();
      renderBoard();
      flashPraise();
      state.step++;
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
    if (state.guided) highlightFrom(moves()[state.step]);
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
