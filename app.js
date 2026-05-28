// Chess Analysis App - Deep PGN Analysis
// Uses chess.js for game logic and Stockfish (WASM) for engine analysis.

// ---- Chess.js loader (UMD/ESM compat) ----
const Chess = (window.Chess || window.chess?.Chess || globalThis.Chess);
if (!Chess) {
  console.error("chess.js no se cargó correctamente");
}

// ---- Constants ----
const PIECE_UNICODE = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

// Stockfish CDN (single-threaded asm.js build, most compatible cross-browser/mobile)
const STOCKFISH_URLS = [
  "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js",
  "https://unpkg.com/stockfish.js@10.0.2/stockfish.js"
];

// ---- App state ----
const state = {
  chess: new Chess(),
  history: [],          // List of SAN moves
  fens: ["start"],      // FEN at each ply (index 0 = initial position)
  currentPly: 0,
  flipped: false,
  pgnHeaders: {},
  engine: null,
  engineReady: false,
  analyzing: false,
  analysisResults: [],  // Per-ply analysis
  depth: 16,
  multipv: 3,
  currentLines: [],
  abortAnalysis: false,
  playInterval: null,
};

state.fens[0] = state.chess.fen();

// ---- DOM ----
const $ = (id) => document.getElementById(id);
const boardEl = $("board");
const movesListEl = $("movesList");
const gameMetaEl = $("gameMeta");
const gameInfoCard = $("gameInfoCard");
const analysisCard = $("analysisCard");
const engineCard = $("engineCard");
const summaryCard = $("summaryCard");
const engineLinesEl = $("engineLines");
const engineStatusDot = $("engineStatusDot");
const engineStatusText = $("engineStatusText");
const evalBarWhite = $("evalBarWhite");
const evalBarText = $("evalBarText");
const boardStatus = $("boardStatus");
const summaryGrid = $("summaryGrid");
const progressBar = $("progressBar");
const progressFill = $("progressFill");
const progressText = $("progressText");

// ---- Board rendering ----
function buildBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = document.createElement("div");
      const isLight = (r + f) % 2 === 0;
      sq.className = `square ${isLight ? "light" : "dark"}`;
      const fileIdx = state.flipped ? 7 - f : f;
      const rankIdx = state.flipped ? 7 - r : r;
      sq.dataset.square = FILES[fileIdx] + RANKS[rankIdx];
      // Add coordinate labels
      if (r === 7) {
        const coord = document.createElement("span");
        coord.className = "coord file";
        coord.textContent = FILES[fileIdx];
        sq.appendChild(coord);
      }
      if (f === 0) {
        const coord = document.createElement("span");
        coord.className = "coord rank";
        coord.textContent = RANKS[rankIdx];
        sq.appendChild(coord);
      }
      boardEl.appendChild(sq);
    }
  }
}

function renderPosition() {
  // Clear pieces
  boardEl.querySelectorAll(".piece").forEach(p => p.remove());
  boardEl.querySelectorAll(".square").forEach(sq => {
    sq.classList.remove("highlight-from", "highlight-to", "check", "best-move");
  });

  const fen = state.fens[state.currentPly];
  const tempChess = new Chess();
  if (!tempChess.load(fen)) return;

  // Place pieces from board state
  const board = tempChess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      const squareName = FILES[f] + RANKS[r];
      const sq = boardEl.querySelector(`[data-square="${squareName}"]`);
      if (!sq) continue;
      const span = document.createElement("span");
      span.className = "piece";
      const key = (piece.color === "w" ? "w" : "b") + piece.type.toUpperCase();
      span.textContent = PIECE_UNICODE[key];
      sq.appendChild(span);
    }
  }

  // Highlight last move
  if (state.currentPly > 0) {
    const lastMove = getMoveAtPly(state.currentPly - 1);
    if (lastMove) {
      const from = boardEl.querySelector(`[data-square="${lastMove.from}"]`);
      const to = boardEl.querySelector(`[data-square="${lastMove.to}"]`);
      if (from) from.classList.add("highlight-from");
      if (to) to.classList.add("highlight-to");
    }
  }

  // Highlight king in check
  if (tempChess.in_check()) {
    const turn = tempChess.turn();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = board[r][f];
        if (p && p.type === "k" && p.color === turn) {
          const sqName = FILES[f] + RANKS[r];
          const el = boardEl.querySelector(`[data-square="${sqName}"]`);
          if (el) el.classList.add("check");
        }
      }
    }
  }

  // Update status
  let status = `Turno: ${tempChess.turn() === "w" ? "Blancas" : "Negras"}`;
  if (tempChess.in_checkmate()) status = "Jaque mate";
  else if (tempChess.in_stalemate()) status = "Tablas por ahogado";
  else if (tempChess.in_draw()) status = "Tablas";
  else if (tempChess.in_check()) status += " (jaque)";
  boardStatus.textContent = status;
}

function getMoveAtPly(plyIndex) {
  // Reconstruct the move at given ply by replaying from start
  if (plyIndex < 0 || plyIndex >= state.history.length) return null;
  const tempChess = new Chess();
  // Apply initial FEN if present
  if (state.pgnHeaders && state.pgnHeaders.FEN) tempChess.load(state.pgnHeaders.FEN);
  for (let i = 0; i < plyIndex; i++) {
    if (!tempChess.move(state.history[i], { sloppy: true })) return null;
  }
  return tempChess.move(state.history[plyIndex], { sloppy: true }) || null;
}

// ---- PGN loading ----
function loadPgn(pgnText) {
  const chess = new Chess();
  const ok = chess.load_pgn(pgnText, { sloppy: true });
  if (!ok) {
    showToast("Error al parsear PGN. Verifica el formato.");
    return false;
  }

  // Extract headers
  const headers = chess.header();
  const sanHistory = chess.history();

  if (sanHistory.length === 0) {
    showToast("No se encontraron movimientos en el PGN");
    return false;
  }

  // Build FEN list
  const fens = [new Chess().fen()];
  const tempChess = new Chess();
  if (headers.FEN) {
    if (tempChess.load(headers.FEN)) fens[0] = tempChess.fen();
  }
  for (const san of sanHistory) {
    if (!tempChess.move(san, { sloppy: true })) break;
    fens.push(tempChess.fen());
  }

  state.chess = chess;
  state.history = sanHistory;
  state.fens = fens;
  state.currentPly = 0;
  state.pgnHeaders = headers;
  state.analysisResults = new Array(sanHistory.length).fill(null);

  renderGameMeta();
  renderMoves();
  renderPosition();
  gameInfoCard.hidden = false;
  analysisCard.hidden = false;
  engineCard.hidden = false;
  showToast(`Partida cargada: ${sanHistory.length} movimientos`);
  return true;
}

function renderGameMeta() {
  const fields = [
    ["White", "Blancas"], ["Black", "Negras"], ["Event", "Evento"],
    ["Site", "Sitio"], ["Date", "Fecha"], ["Result", "Resultado"],
    ["WhiteElo", "Elo Blancas"], ["BlackElo", "Elo Negras"], ["ECO", "ECO"], ["Opening", "Apertura"]
  ];
  let html = "";
  for (const [key, label] of fields) {
    if (state.pgnHeaders[key]) {
      html += `<dt>${label}</dt><dd>${escapeHtml(state.pgnHeaders[key])}</dd>`;
    }
  }
  gameMetaEl.innerHTML = html || "<dd>(Sin metadatos)</dd>";
}

function renderMoves() {
  if (state.history.length === 0) {
    movesListEl.innerHTML = '<p class="empty-state">Sin movimientos.</p>';
    return;
  }
  let html = "";
  for (let i = 0; i < state.history.length; i += 2) {
    const num = Math.floor(i / 2) + 1;
    const whiteMove = state.history[i];
    const blackMove = state.history[i + 1];
    html += `<div class="move-pair">
      <span class="move-num">${num}.</span>
      ${renderMoveItem(i, whiteMove)}
      ${blackMove !== undefined ? renderMoveItem(i + 1, blackMove) : '<span></span>'}
    </div>`;
  }
  movesListEl.innerHTML = html;
  movesListEl.querySelectorAll(".move-item").forEach(el => {
    el.addEventListener("click", () => {
      const ply = parseInt(el.dataset.ply, 10);
      goToPly(ply + 1);
    });
  });
  highlightCurrentMove();
}

function renderMoveItem(plyIndex, san) {
  const analysis = state.analysisResults[plyIndex];
  let tag = "";
  if (analysis && analysis.classification) {
    const cls = analysis.classification;
    const labels = {
      blunder: "??", mistake: "?", inaccuracy: "?!", best: "★", book: "📖"
    };
    tag = `<span class="tag ${cls}">${labels[cls] || ""}</span>`;
  }
  return `<span class="move-item" data-ply="${plyIndex}">${escapeHtml(san)}${tag}</span>`;
}

function highlightCurrentMove() {
  movesListEl.querySelectorAll(".move-item").forEach(el => el.classList.remove("active"));
  if (state.currentPly > 0) {
    const el = movesListEl.querySelector(`[data-ply="${state.currentPly - 1}"]`);
    if (el) {
      el.classList.add("active");
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
}

function goToPly(ply) {
  if (ply < 0 || ply > state.history.length) return;
  state.currentPly = ply;
  renderPosition();
  highlightCurrentMove();
  updateEvalBarForPly(ply);
  // If we have engine analysis cached for this position, show it
  showCachedLinesForPly(ply);
  // Also kick off live analysis for the current position (skip while full-game analysis runs)
  if (state.engineReady && !state.analyzing) {
    requestLiveAnalysis(state.fens[ply]);
  }
}

function updateEvalBarForPly(ply) {
  // ply is index into fens (0 = start, after ply N moves)
  // The analysis cached is for moves played, so we want eval AFTER move (ply-1)
  let evalCp = 0;
  let isMate = false;
  if (ply > 0 && state.analysisResults[ply - 1]) {
    const a = state.analysisResults[ply - 1];
    if (a.evalAfter !== undefined) {
      if (a.evalAfter.mate !== null && a.evalAfter.mate !== undefined) {
        isMate = true;
        evalCp = a.evalAfter.mate > 0 ? 10000 : -10000;
      } else {
        evalCp = a.evalAfter.cp;
      }
    }
  }
  setEvalBar(evalCp, isMate, ply > 0 && state.analysisResults[ply - 1]?.evalAfter?.mate);
}

function setEvalBar(cp, isMate = false, mateValue = null) {
  // Always from white's perspective
  let pct;
  if (isMate) {
    pct = cp > 0 ? 100 : 0;
    evalBarText.textContent = "M" + Math.abs(mateValue);
  } else {
    // Sigmoid-like clamping
    const clamped = Math.max(-1000, Math.min(1000, cp));
    pct = 50 + (clamped / 1000) * 50;
    pct = Math.max(2, Math.min(98, pct));
    const sign = cp > 0 ? "+" : "";
    evalBarText.textContent = sign + (cp / 100).toFixed(1);
  }
  evalBarWhite.style.height = pct + "%";
}

// ---- Navigation ----
$("firstMoveBtn").addEventListener("click", () => goToPly(0));
$("prevMoveBtn").addEventListener("click", () => goToPly(Math.max(0, state.currentPly - 1)));
$("nextMoveBtn").addEventListener("click", () => goToPly(Math.min(state.history.length, state.currentPly + 1)));
$("lastMoveBtn").addEventListener("click", () => goToPly(state.history.length));
$("flipBtn").addEventListener("click", () => {
  state.flipped = !state.flipped;
  buildBoard();
  renderPosition();
});
$("playBtn").addEventListener("click", () => {
  if (state.playInterval) {
    clearInterval(state.playInterval);
    state.playInterval = null;
    $("playBtn").textContent = "▶";
    return;
  }
  $("playBtn").textContent = "⏸";
  state.playInterval = setInterval(() => {
    if (state.currentPly >= state.history.length) {
      clearInterval(state.playInterval);
      state.playInterval = null;
      $("playBtn").textContent = "▶";
      return;
    }
    goToPly(state.currentPly + 1);
  }, 900);
});

// Keyboard nav
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
  if (e.key === "ArrowLeft") { e.preventDefault(); goToPly(Math.max(0, state.currentPly - 1)); }
  else if (e.key === "ArrowRight") { e.preventDefault(); goToPly(Math.min(state.history.length, state.currentPly + 1)); }
  else if (e.key === "Home") { e.preventDefault(); goToPly(0); }
  else if (e.key === "End") { e.preventDefault(); goToPly(state.history.length); }
  else if (e.key === "f" || e.key === "F") { state.flipped = !state.flipped; buildBoard(); renderPosition(); }
});

// ---- File upload ----
const uploadArea = $("uploadArea");
$("uploadBtn").addEventListener("click", () => $("fileInput").click());
$("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) readFile(file);
});
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});
uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("dragover"));
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) readFile(file);
});

function readFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => loadPgn(e.target.result);
  reader.onerror = () => showToast("Error al leer el archivo");
  reader.readAsText(file);
}

$("loadPgnBtn").addEventListener("click", () => {
  const text = $("pgnTextarea").value.trim();
  if (!text) return showToast("Pega un PGN primero");
  loadPgn(text);
});

$("loadSampleBtn").addEventListener("click", () => {
  loadPgn(SAMPLE_PGN);
});

// ---- Theme ----
$("themeToggle").addEventListener("click", () => {
  const cur = document.documentElement.dataset.theme || "light";
  const next = cur === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  $("themeToggle").textContent = next === "dark" ? "☀️" : "🌙";
  try { localStorage.setItem("chess-theme", next); } catch (e) {}
});

(function loadTheme() {
  try {
    const saved = localStorage.getItem("chess-theme");
    if (saved) {
      document.documentElement.dataset.theme = saved;
      $("themeToggle").textContent = saved === "dark" ? "☀️" : "🌙";
    }
  } catch (e) {}
})();

// ---- Mobile menu ----
$("menuToggle").addEventListener("click", () => {
  $("panelLeft").classList.toggle("open");
  $("panelRight").classList.toggle("open");
});

// ---- Stockfish engine ----
async function initEngine() {
  engineStatusText.textContent = "Descargando Stockfish...";
  engineStatusDot.className = "status-dot thinking";

  // Cross-origin Worker scripts must be loaded as a Blob.
  // Fetch the script (CORS-friendly CDN) and wrap it in a blob:URL.
  let workerUrl = null;
  let lastErr = null;
  for (const url of STOCKFISH_URLS) {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) { lastErr = new Error("HTTP " + res.status); continue; }
      const code = await res.text();
      const blob = new Blob([code], { type: "application/javascript" });
      workerUrl = URL.createObjectURL(blob);
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!workerUrl) {
    console.error("No se pudo descargar Stockfish:", lastErr);
    engineStatusText.textContent = "Stockfish no disponible (sin red)";
    engineStatusDot.className = "status-dot error";
    return;
  }

  try {
    state.engine = new Worker(workerUrl);
    engineStatusText.textContent = "Iniciando motor...";

    state.engine.onmessage = (e) => {
      const line = typeof e.data === "string" ? e.data : (e.data?.data || "");
      handleEngineMessage(line);
    };
    state.engine.onerror = (err) => {
      console.error("Engine error:", err);
      engineStatusText.textContent = "Error en motor";
      engineStatusDot.className = "status-dot error";
    };

    sendEngine("uci");
  } catch (e) {
    console.error(e);
    engineStatusText.textContent = "No se pudo crear el motor";
    engineStatusDot.className = "status-dot error";
  }
}

function sendEngine(cmd) {
  if (!state.engine) return;
  state.engine.postMessage(cmd);
}

const engineCallbacks = { onInfo: null, onBestMove: null };

function handleEngineMessage(line) {
  if (typeof line !== "string") return;

  if (line === "uciok") {
    sendEngine(`setoption name MultiPV value ${state.multipv}`);
    sendEngine("isready");
    return;
  }
  if (line === "readyok") {
    state.engineReady = true;
    engineStatusText.textContent = "Stockfish listo";
    engineStatusDot.className = "status-dot ready";
    return;
  }

  if (line.startsWith("info")) {
    const parsed = parseInfoLine(line);
    if (parsed && engineCallbacks.onInfo) engineCallbacks.onInfo(parsed);
  } else if (line.startsWith("bestmove")) {
    const parts = line.split(/\s+/);
    if (engineCallbacks.onBestMove) engineCallbacks.onBestMove(parts[1]);
  }
}

function parseInfoLine(line) {
  const tokens = line.split(/\s+/);
  const info = { multipv: 1, depth: 0, score: null, pv: [] };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "depth") info.depth = parseInt(tokens[++i], 10);
    else if (t === "multipv") info.multipv = parseInt(tokens[++i], 10);
    else if (t === "score") {
      const type = tokens[++i];
      const val = parseInt(tokens[++i], 10);
      if (type === "cp") info.score = { cp: val, mate: null };
      else if (type === "mate") info.score = { cp: null, mate: val };
    } else if (t === "pv") {
      info.pv = tokens.slice(i + 1);
      break;
    }
  }
  return info;
}

// ---- Live analysis (current position) ----
let liveAnalysisAbort = false;

function requestLiveAnalysis(fen) {
  if (!state.engineReady) return;
  liveAnalysisAbort = true;
  sendEngine("stop");

  const lines = new Map(); // multipv -> { score, pv, depth }
  state.currentLines = [];

  setTimeout(() => {
    liveAnalysisAbort = false;
    sendEngine(`setoption name MultiPV value ${state.multipv}`);
    sendEngine(`position fen ${fen}`);
    engineCallbacks.onInfo = (info) => {
      if (liveAnalysisAbort) return;
      if (!info.score) return;
      lines.set(info.multipv, info);
      renderLiveLines(lines, fen);
    };
    engineCallbacks.onBestMove = () => {
      engineCallbacks.onInfo = null;
      engineCallbacks.onBestMove = null;
    };
    sendEngine(`go depth ${state.depth}`);
  }, 50);
}

function renderLiveLines(lines, fen) {
  const sorted = Array.from(lines.values()).sort((a, b) => a.multipv - b.multipv);
  const tempChess = new Chess();
  if (!tempChess.load(fen)) return;
  const whiteToMove = tempChess.turn() === "w";

  let html = "";
  for (const ln of sorted) {
    const scoreStr = formatScore(ln.score, whiteToMove);
    const scoreClass = scoreClassFromWhitePOV(ln.score, whiteToMove);
    // Convert UCI moves in PV to SAN for readability
    const sanPv = uciPvToSan(ln.pv, fen, 6);
    html += `<div class="engine-line">
      <span class="eval ${scoreClass}">${scoreStr}</span>
      <span class="pv">d${ln.depth} · ${escapeHtml(sanPv)}</span>
    </div>`;
  }
  engineLinesEl.innerHTML = html || '<p class="empty-state">Analizando...</p>';

  // Highlight best move on board
  if (sorted.length && sorted[0].pv.length) {
    const bestUci = sorted[0].pv[0];
    highlightBestMove(bestUci);
  }

  // Update eval bar with the top line
  if (sorted.length && sorted[0].score) {
    const sc = sorted[0].score;
    // Score from side-to-move perspective. Convert to white's POV.
    const fromWhite = whiteToMove ? sc : { cp: sc.cp !== null ? -sc.cp : null, mate: sc.mate !== null ? -sc.mate : null };
    if (fromWhite.mate !== null && fromWhite.mate !== undefined) {
      setEvalBar(fromWhite.mate > 0 ? 10000 : -10000, true, fromWhite.mate);
    } else if (fromWhite.cp !== null) {
      setEvalBar(fromWhite.cp);
    }
  }
}

function highlightBestMove(uci) {
  boardEl.querySelectorAll(".best-move").forEach(el => el.classList.remove("best-move"));
  if (!uci || uci.length < 4) return;
  const from = uci.substring(0, 2);
  const to = uci.substring(2, 4);
  const fromEl = boardEl.querySelector(`[data-square="${from}"]`);
  const toEl = boardEl.querySelector(`[data-square="${to}"]`);
  if (toEl) toEl.classList.add("best-move");
}

function uciPvToSan(pvUci, fen, maxMoves = 8) {
  const tempChess = new Chess();
  if (!tempChess.load(fen)) return pvUci.slice(0, maxMoves).join(" ");
  const sanMoves = [];
  for (let i = 0; i < Math.min(pvUci.length, maxMoves); i++) {
    const uci = pvUci[i];
    const move = {
      from: uci.substring(0, 2),
      to: uci.substring(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined
    };
    const m = tempChess.move(move);
    if (!m) break;
    sanMoves.push(m.san);
  }
  return sanMoves.join(" ");
}

function formatScore(score, whiteToMove) {
  if (!score) return "?";
  if (score.mate !== null) {
    const m = whiteToMove ? score.mate : -score.mate;
    return (m > 0 ? "+M" : "-M") + Math.abs(m);
  }
  const cp = whiteToMove ? score.cp : -score.cp;
  const sign = cp >= 0 ? "+" : "";
  return sign + (cp / 100).toFixed(2);
}

function scoreClassFromWhitePOV(score, whiteToMove) {
  if (!score) return "";
  if (score.mate !== null) {
    const m = whiteToMove ? score.mate : -score.mate;
    return m > 0 ? "positive" : "negative";
  }
  const cp = whiteToMove ? score.cp : -score.cp;
  if (cp > 30) return "positive";
  if (cp < -30) return "negative";
  return "";
}

function showCachedLinesForPly(ply) {
  // Show analysis lines for the position at this ply (cached from full-game analysis)
  if (ply === 0) {
    engineLinesEl.innerHTML = '<p class="empty-state">Posición inicial</p>';
    return;
  }
  const cached = state.analysisResults[ply - 1];
  if (!cached || !cached.lines) return;
  const fen = state.fens[ply - 1];
  const tempChess = new Chess();
  if (!tempChess.load(fen)) return;
  const whiteToMove = tempChess.turn() === "w";

  let html = "";
  for (const ln of cached.lines) {
    const scoreStr = formatScore(ln.score, whiteToMove);
    const scoreClass = scoreClassFromWhitePOV(ln.score, whiteToMove);
    const sanPv = uciPvToSan(ln.pv, fen, 6);
    html += `<div class="engine-line">
      <span class="eval ${scoreClass}">${scoreStr}</span>
      <span class="pv">d${ln.depth} · ${escapeHtml(sanPv)}</span>
    </div>`;
  }
  engineLinesEl.innerHTML = html;
}

// ---- Full game analysis ----
$("depthSlider").addEventListener("input", (e) => {
  state.depth = parseInt(e.target.value, 10);
  $("depthValue").textContent = state.depth;
});
$("multipvSlider").addEventListener("input", (e) => {
  state.multipv = parseInt(e.target.value, 10);
  $("multipvValue").textContent = state.multipv;
});

$("analyzeBtn").addEventListener("click", analyzeFullGame);
$("stopAnalysisBtn").addEventListener("click", () => {
  state.abortAnalysis = true;
  sendEngine("stop");
});

async function analyzeFullGame() {
  if (!state.engineReady) {
    showToast("Stockfish aún no está listo");
    return;
  }
  if (state.history.length === 0) {
    showToast("Carga una partida primero");
    return;
  }
  state.analyzing = true;
  state.abortAnalysis = false;
  $("analyzeBtn").disabled = true;
  $("stopAnalysisBtn").disabled = false;
  progressBar.hidden = false;
  summaryCard.hidden = true;

  const total = state.history.length;
  sendEngine(`setoption name MultiPV value ${state.multipv}`);

  for (let ply = 0; ply < total; ply++) {
    if (state.abortAnalysis) break;
    const fenBefore = state.fens[ply];
    const fenAfter = state.fens[ply + 1];

    // Update progress
    const pct = Math.round((ply / total) * 100);
    progressFill.style.width = pct + "%";
    progressText.textContent = `${ply}/${total} (${pct}%)`;

    // Analyze position BEFORE the move (to find best moves available)
    const linesBefore = await analyzePositionAsync(fenBefore, state.depth);
    // Analyze position AFTER the move (to know resulting eval)
    const linesAfter = await analyzePositionAsync(fenAfter, Math.max(8, state.depth - 4));

    if (state.abortAnalysis) break;

    const playedSan = state.history[ply];
    const playedMove = getMoveAtPly(ply);
    const playedUci = playedMove ? (playedMove.from + playedMove.to + (playedMove.promotion || "")) : "";

    // Best line (from side-to-move perspective)
    const tempChess = new Chess();
    tempChess.load(fenBefore);
    const whiteToMove = tempChess.turn() === "w";

    // Convert eval to white's POV in centipawns
    const bestScoreSTM = linesBefore[0]?.score;
    const afterScoreSTM = linesAfter[0]?.score; // STM perspective AFTER move (other side)

    const bestCpWhite = toWhiteCp(bestScoreSTM, whiteToMove);
    const afterCpWhite = toWhiteCp(afterScoreSTM, !whiteToMove);

    // Loss is from the perspective of the player who just moved
    let loss = null;
    if (bestCpWhite !== null && afterCpWhite !== null) {
      const lossWhite = bestCpWhite - afterCpWhite; // positive if white lost evaluation
      loss = whiteToMove ? lossWhite : -lossWhite;
    }

    // Determine if the played move matches the best line's first move
    const bestUci = linesBefore[0]?.pv?.[0];
    const isBest = bestUci && playedUci.startsWith(bestUci.substring(0, 4));

    // Classify
    let classification = null;
    if (ply < 16 && isBest) {
      classification = "best";
    } else if (isBest) {
      classification = "best";
    } else if (loss !== null) {
      if (loss >= 300) classification = "blunder";
      else if (loss >= 150) classification = "mistake";
      else if (loss >= 75) classification = "inaccuracy";
    }

    state.analysisResults[ply] = {
      lines: linesBefore,
      evalBefore: bestScoreSTM ? scoreToWhite(bestScoreSTM, whiteToMove) : null,
      evalAfter: afterScoreSTM ? scoreToWhite(afterScoreSTM, !whiteToMove) : null,
      playedSan,
      playedUci,
      bestUci,
      loss,
      classification
    };

    // Update UI per move
    renderMoves();
    if (ply === state.currentPly - 1) {
      showCachedLinesForPly(state.currentPly);
      updateEvalBarForPly(state.currentPly);
    }
  }

  progressFill.style.width = "100%";
  progressText.textContent = state.abortAnalysis ? "Detenido" : "Completado";
  state.analyzing = false;
  $("analyzeBtn").disabled = false;
  $("stopAnalysisBtn").disabled = true;

  if (!state.abortAnalysis) {
    renderSummary();
    summaryCard.hidden = false;
    showToast("Análisis completado");
  }
}

function analyzePositionAsync(fen, depth) {
  return new Promise((resolve) => {
    const lines = new Map();
    engineCallbacks.onInfo = (info) => {
      if (!info.score) return;
      lines.set(info.multipv, info);
    };
    engineCallbacks.onBestMove = () => {
      engineCallbacks.onInfo = null;
      engineCallbacks.onBestMove = null;
      const sorted = Array.from(lines.values()).sort((a, b) => a.multipv - b.multipv);
      resolve(sorted);
    };
    sendEngine(`position fen ${fen}`);
    sendEngine(`go depth ${depth}`);
  });
}

function toWhiteCp(score, whiteToMove) {
  if (!score) return null;
  if (score.mate !== null) {
    const m = whiteToMove ? score.mate : -score.mate;
    return m > 0 ? 10000 - Math.abs(m) : -10000 + Math.abs(m);
  }
  const cp = whiteToMove ? score.cp : -score.cp;
  return cp;
}

function scoreToWhite(score, whiteToMove) {
  if (!score) return null;
  if (score.mate !== null) {
    return { cp: null, mate: whiteToMove ? score.mate : -score.mate };
  }
  return { cp: whiteToMove ? score.cp : -score.cp, mate: null };
}

function renderSummary() {
  const counts = { blunder: { w: 0, b: 0 }, mistake: { w: 0, b: 0 }, inaccuracy: { w: 0, b: 0 }, best: { w: 0, b: 0 } };
  for (let i = 0; i < state.analysisResults.length; i++) {
    const r = state.analysisResults[i];
    if (!r || !r.classification) continue;
    const side = i % 2 === 0 ? "w" : "b";
    if (counts[r.classification]) counts[r.classification][side]++;
  }
  summaryGrid.innerHTML = `
    <div class="summary-item best"><div class="count">${counts.best.w}/${counts.best.b}</div><div class="label">Mejores ★</div></div>
    <div class="summary-item inaccuracy"><div class="count">${counts.inaccuracy.w}/${counts.inaccuracy.b}</div><div class="label">Imprecisiones ?!</div></div>
    <div class="summary-item mistake"><div class="count">${counts.mistake.w}/${counts.mistake.b}</div><div class="label">Errores ?</div></div>
    <div class="summary-item blunder"><div class="count">${counts.blunder.w}/${counts.blunder.b}</div><div class="label">Capablancas ??</div></div>
  `;
  drawEvalChart();
}

function drawEvalChart() {
  const canvas = $("evalChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);

  // Build eval series (white POV) clamped to [-10, +10]
  const series = [0];
  for (const r of state.analysisResults) {
    if (!r || !r.evalAfter) { series.push(series[series.length - 1]); continue; }
    let val;
    if (r.evalAfter.mate !== null && r.evalAfter.mate !== undefined) {
      val = r.evalAfter.mate > 0 ? 10 : -10;
    } else {
      val = Math.max(-10, Math.min(10, r.evalAfter.cp / 100));
    }
    series.push(val);
  }
  if (series.length < 2) return;

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.04)";
  ctx.fillRect(0, h / 2, w, h / 2);

  // Center line
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  // Curve
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  for (let i = 0; i < series.length; i++) {
    const x = (i / (series.length - 1)) * w;
    const y = h / 2 - (series[i] / 10) * (h / 2 - 4);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h / 2);
  ctx.fillStyle = "rgba(79, 70, 229, 0.35)";
  ctx.fill();

  ctx.strokeStyle = "#4f46e5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < series.length; i++) {
    const x = (i / (series.length - 1)) * w;
    const y = h / 2 - (series[i] / 10) * (h / 2 - 4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Mark blunders
  for (let i = 0; i < state.analysisResults.length; i++) {
    const r = state.analysisResults[i];
    if (!r || !r.classification) continue;
    const x = ((i + 1) / (series.length - 1)) * w;
    const y = h / 2 - (series[i + 1] / 10) * (h / 2 - 4);
    const colors = { blunder: "#ef4444", mistake: "#f59e0b", inaccuracy: "#3b82f6" };
    const color = colors[r.classification];
    if (!color) continue;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- Helpers ----
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let toastTimer = null;
function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3000);
}

// ---- Sample PGN (Morphy "Opera Game", 1858) ----
const SAMPLE_PGN = `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[Round "?"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[ECO "C41"]
[Opening "Philidor Defense"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8
13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

// ---- Init ----
buildBoard();
renderPosition();
initEngine();

// On mobile, show the upload panel by default until a game is loaded
if (window.matchMedia("(max-width: 1100px)").matches) {
  $("panelLeft").classList.add("open");
}
