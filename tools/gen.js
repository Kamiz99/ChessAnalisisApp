/* =========================================================================
 * tools/gen.js — Genera openings.js a partir de:
 *   1) Variaciones "destacadas" curadas a mano (textos ricos), y
 *   2) Variaciones reales del dataset ECO de lichess-org/chess-openings
 *      (ficheros /tmp/{a..e}.tsv ya descargados).
 *
 * Convierte el PGN (notación SAN) a jugadas {from,to} / {castle,color} con un
 * mini-motor de ajedrez con generación legal de movimientos (para resolver
 * ambigüedades de SAN correctamente).
 *
 * Uso:  node tools/gen.js > openings.js
 * ========================================================================= */

const fs = require("fs");

// ---- Curadas (textos ricos) ---------------------------------------------
global.window = {};
require("../openings.js"); // mantenemos las variaciones escritas a mano
const CURATED = window.OPENINGS;

// ---- Mini-motor de ajedrez (SAN -> from/to) -----------------------------
const FILES = "abcdefgh";
function sq(f, r) { return FILES[f] + (r + 1); }
function startBoard() {
  const b = {};
  const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  for (let f = 0; f < 8; f++) {
    b[sq(f, 0)] = { t: back[f], c: "w" };
    b[sq(f, 1)] = { t: "P", c: "w" };
    b[sq(f, 6)] = { t: "P", c: "b" };
    b[sq(f, 7)] = { t: back[f], c: "b" };
  }
  return b;
}
function clone(b) { const n = {}; for (const k in b) n[k] = b[k]; return n; }
function opp(c) { return c === "w" ? "b" : "w"; }

const KN = [[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
const DIAG = [[1,1],[1,-1],[-1,1],[-1,-1]];
const ORTH = [[1,0],[-1,0],[0,1],[0,-1]];

function pieceAt(b, f, r) { return b[sq(f, r)]; }

function isAttacked(b, tf, tr, by) {
  // peones
  const dr = by === "w" ? -1 : 1; // peón atacante está una fila "detrás"
  for (const dfp of [-1, 1]) {
    const f = tf + dfp, r = tr + dr;
    if (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const p = pieceAt(b, f, r);
      if (p && p.c === by && p.t === "P") return true;
    }
  }
  // caballo
  for (const [df, drr] of KN) {
    const f = tf + df, r = tr + drr;
    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const p = pieceAt(b, f, r);
    if (p && p.c === by && p.t === "N") return true;
  }
  // rey
  for (let df = -1; df <= 1; df++) for (let drr = -1; drr <= 1; drr++) {
    if (!df && !drr) continue;
    const f = tf + df, r = tr + drr;
    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const p = pieceAt(b, f, r);
    if (p && p.c === by && p.t === "K") return true;
  }
  // deslizantes
  const rays = [[DIAG, "BQ"], [ORTH, "RQ"]];
  for (const [dirs, types] of rays) {
    for (const [df, drr] of dirs) {
      let f = tf + df, r = tr + drr;
      while (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const p = pieceAt(b, f, r);
        if (p) { if (p.c === by && types.includes(p.t)) return true; break; }
        f += df; r += drr;
      }
    }
  }
  return false;
}

function kingSafeAfter(b, fromF, fromR, toF, toR, color) {
  const nb = clone(b);
  nb[sq(toF, toR)] = nb[sq(fromF, fromR)];
  delete nb[sq(fromF, fromR)];
  let kf, kr;
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const p = nb[sq(f, r)];
    if (p && p.c === color && p.t === "K") { kf = f; kr = r; }
  }
  return !isAttacked(nb, kf, kr, opp(color));
}

function pathClear(b, ff, fr, tf, tr) {
  const df = Math.sign(tf - ff), dr = Math.sign(tr - fr);
  let f = ff + df, r = fr + dr;
  while (f !== tf || r !== tr) {
    if (b[sq(f, r)]) return false;
    f += df; r += dr;
  }
  return true;
}

function reaches(b, type, ff, fr, tf, tr) {
  const df = tf - ff, dr = tr - fr, af = Math.abs(df), ar = Math.abs(dr);
  switch (type) {
    case "N": return (af === 1 && ar === 2) || (af === 2 && ar === 1);
    case "K": return Math.max(af, ar) === 1;
    case "B": return af === ar && af > 0 && pathClear(b, ff, fr, tf, tr);
    case "R": return (df === 0 || dr === 0) && (af + ar > 0) && pathClear(b, ff, fr, tf, tr);
    case "Q": return ((af === ar) || df === 0 || dr === 0) && (af + ar > 0) && pathClear(b, ff, fr, tf, tr);
  }
  return false;
}

// Aplica un movimiento SAN. Devuelve {from,to} o {castle,color}.
// Lanza una excepción si el movimiento incluye promoción o captura al paso
// (no soportadas por el motor simple de la app) o si no se puede resolver.
function applySan(b, sanRaw, color, ep) {
  let san = sanRaw.replace(/[+#!?]/g, "");
  if (san === "O-O" || san === "0-0" || san === "O-O-O" || san === "0-0-0") {
    const kside = san.length === 3;
    const rank = color === "w" ? 0 : 7;
    const kf = 4, rf = kside ? 7 : 0;
    const ktoF = kside ? 6 : 2, rtoF = kside ? 5 : 3;
    b[sq(ktoF, rank)] = b[sq(kf, rank)]; delete b[sq(kf, rank)];
    b[sq(rtoF, rank)] = b[sq(rf, rank)]; delete b[sq(rf, rank)];
    return { res: { castle: kside ? "O-O" : "O-O-O", color: color === "w" ? "white" : "black" }, ep: null };
  }
  const m = san.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(=([QRBN]))?$/);
  if (!m) throw new Error("SAN no parseable: " + sanRaw);
  if (m[6]) throw new Error("promoción no soportada");
  const type = m[1] || "P";
  const dHintF = m[2] ? FILES.indexOf(m[2]) : null;
  const dHintR = m[3] ? Number(m[3]) - 1 : null;
  const capture = !!m[4];
  const tf = FILES.indexOf(m[5][0]);
  const tr = Number(m[5][1]) - 1;

  if (type === "P") {
    const dir = color === "w" ? 1 : -1;
    if (capture || (dHintF !== null && dHintF !== tf)) {
      if (dHintF === null) throw new Error("captura de peón sin columna: " + sanRaw);
      const f = dHintF, fr = tr - dir;
      const src = b[sq(f, fr)];
      if (!src || src.t !== "P" || src.c !== color) throw new Error("peón origen inválido: " + sanRaw);
      const target = b[sq(tf, tr)];
      if (!target) throw new Error("captura al paso no soportada"); // ep -> saltar línea
      b[sq(tf, tr)] = b[sq(f, fr)]; delete b[sq(f, fr)];
      return { res: { from: sq(f, fr), to: sq(tf, tr) }, ep: null };
    }
    // empuje
    const oneR = tr - dir;
    let fromR = null;
    if (pieceAt(b, tf, oneR) && pieceAt(b, tf, oneR).t === "P" && pieceAt(b, tf, oneR).c === color) {
      fromR = oneR;
    } else {
      const twoR = tr - 2 * dir;
      const startRank = color === "w" ? 1 : 6;
      if (twoR === startRank && pieceAt(b, tf, twoR) && pieceAt(b, tf, twoR).t === "P" &&
          pieceAt(b, tf, twoR).c === color && !pieceAt(b, tf, oneR)) {
        fromR = twoR;
      }
    }
    if (fromR === null) throw new Error("empuje de peón no resuelto: " + sanRaw);
    b[sq(tf, tr)] = b[sq(tf, fromR)]; delete b[sq(tf, fromR)];
    const newEp = (Math.abs(tr - fromR) === 2) ? sq(tf, (tr + fromR) / 2) : null;
    return { res: { from: sq(tf, fromR), to: sq(tf, tr) }, ep: newEp };
  }

  // piezas
  const cands = [];
  for (let f = 0; f < 8; f++) for (let r = 0; r < 8; r++) {
    const p = b[sq(f, r)];
    if (!p || p.c !== color || p.t !== type) continue;
    if (dHintF !== null && f !== dHintF) continue;
    if (dHintR !== null && r !== dHintR) continue;
    if (!reaches(b, type, f, r, tf, tr)) continue;
    if (!kingSafeAfter(b, f, r, tf, tr, color)) continue;
    cands.push([f, r]);
  }
  if (cands.length === 0) throw new Error("origen no encontrado: " + sanRaw);
  const [ff, fr] = cands[0]; // con disambiguación correcta solo queda 1
  b[sq(tf, tr)] = b[sq(ff, fr)]; delete b[sq(ff, fr)];
  return { res: { from: sq(ff, fr), to: sq(tf, tr) }, ep: null };
}

// Convierte un PGN completo en una lista de jugadas {from,to}/{castle,color}.
function pgnToMoves(pgn) {
  const tokens = pgn.replace(/\d+\.(\.\.)?/g, " ").trim().split(/\s+/).filter(Boolean);
  const b = startBoard();
  let color = "w", ep = null;
  const out = [];
  for (const tok of tokens) {
    const { res, ep: nep } = applySan(b, tok, color, ep);
    out.push(res);
    ep = nep;
    color = opp(color);
  }
  return out;
}

// ---- Carga del dataset ECO ----------------------------------------------
function loadTSV() {
  const rows = [];
  for (const f of ["a", "b", "c", "d", "e"]) {
    const txt = fs.readFileSync(`/tmp/${f}.tsv`, "utf8");
    const lines = txt.split("\n");
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const [eco, name, pgn] = line.split("\t");
      if (eco && name && pgn) rows.push({ eco, name, pgn: pgn.trim() });
    }
  }
  return rows;
}
const ROWS = loadTSV();

// ---- Familias: filtro por nombre + prefijo de jugadas para completar -----
const FAMILIES = {
  london: {
    nameRe: /london/i,
    // completar con líneas 1.d4 con Bf4 temprano
    pgnRe: /^1\. d4\b.*\bBf4\b/,
  },
  italian: { nameRe: /(italian game|giuoco|two knights|evans gambit|hungarian defense)/i },
  ruylopez: { nameRe: /ruy lopez/i },
  sicilian: { nameRe: /sicilian/i },
  queensgambit: { nameRe: /(queen's gambit|slav defense|semi-slav)/i },
  kingsindian: { nameRe: /king's indian defense/i },
};

const TARGET_ECO = 30; // variaciones ECO mínimas por apertura

// ---- Generación de textos en español ------------------------------------
const PIECE_ES = { P: "Peón", N: "Caballo", B: "Alfil", R: "Torre", Q: "Dama", K: "Rey" };
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function describe(mv, board) {
  if (mv.castle) return mv.castle === "O-O" ? "enroque corto" : "enroque largo";
  const piece = board[mv.from];
  const name = PIECE_ES[piece.t];
  const isCap = !!board[mv.to];
  if (piece.t === "P") return isCap ? `peón captura en ${mv.to}` : `peón a ${mv.to}`;
  return isCap ? `${name.toLowerCase()} captura en ${mv.to}` : `${name.toLowerCase()} a ${mv.to}`;
}

// Reconstruye textos recorriendo el tablero (para saber capturas/piezas).
function buildLine(moves, userIsWhite, name) {
  const b = startBoard();
  const out = [];
  moves.forEach((mv, ply) => {
    const by = ((ply % 2 === 0) === userIsWhite) ? "user" : "engine";
    const desc = describe(mv, b);
    // aplicar al tablero de descripción
    if (mv.castle) {
      const rank = (mv.color === "white") ? "1" : "8";
      const ks = mv.castle === "O-O";
      b["e" + rank] && (b[(ks ? "g" : "c") + rank] = b["e" + rank]);
      delete b["e" + rank];
      const rf = ks ? "h" : "a", rt = ks ? "f" : "d";
      b[rt + rank] = b[rf + rank]; delete b[rf + rank];
    } else {
      b[mv.to] = b[mv.from]; delete b[mv.from];
    }
    const entry = by === "user"
      ? { by, ...mv, hint: `${cap(desc)} (desde ${mv.from || "el rey"}).`, text: `Te toca: ${desc}.` }
      : { by, ...mv, text: `El rival juega: ${desc}.` };
    if (ply === 0) entry.text = (by === "user")
      ? `Empezamos «${name}». Te toca: ${desc}.`
      : `Empezamos «${name}». El rival abre: ${desc}.`;
    out.push(entry);
  });
  // mensaje de cierre cálido en la última jugada del usuario
  return out;
}

function slug(s) {
  return s.toLowerCase().normalize("NFD")    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "var";
}
function shortName(full, opName) {
  // "Sicilian Defense: Najdorf Variation" -> "Najdorf Variation"
  const parts = full.split(":");
  let n = parts.length > 1 ? parts.slice(1).join(":").trim() : full;
  return n || full;
}

// ---- Construcción final ---------------------------------------------------
function moveKey(moves) {
  return moves.map((m) => m.castle ? m.castle : m.from + m.to).join(",");
}

const OUT = [];
for (const op of CURATED) {
  const fam = FAMILIES[op.id];
  const userIsWhite = op.color === "white";
  const variations = [];
  const seen = new Set();

  // 1) curadas primero (texto rico)
  for (const v of op.variations) {
    variations.push(v);
    seen.add(moveKey(v.moves));
  }

  // 2) ECO por nombre
  const pool = [];
  for (const row of ROWS) {
    const okName = fam.nameRe.test(row.name);
    const okPgn = fam.pgnRe ? fam.pgnRe.test(row.pgn) : false;
    if (!okName && !okPgn) continue;
    if (op.id === "kingsindian" && /attack/i.test(row.name)) continue;
    pool.push(row);
  }
  // ordenar por número de jugadas (líneas fundamentales primero), luego nombre
  pool.sort((a, b) => {
    const la = a.pgn.split(/\s+/).filter((t) => !/\d+\./.test(t)).length;
    const lb = b.pgn.split(/\s+/).filter((t) => !/\d+\./.test(t)).length;
    return la - lb || a.name.localeCompare(b.name);
  });

  let added = 0, skipped = 0;
  for (const row of pool) {
    if (added >= TARGET_ECO) break;
    let moves;
    try { moves = pgnToMoves(row.pgn); }
    catch (e) { skipped++; continue; }
    if (moves.length < 4) continue;       // demasiado corta para entrenar
    if (moves.length > 22) continue;      // demasiado larga
    const key = moveKey(moves);
    if (seen.has(key)) continue;
    seen.add(key);
    const nm = shortName(row.name, op.name);
    const plies = moves.length;
    variations.push({
      id: slug(row.eco + "-" + nm),
      name: nm,
      blurb: `ECO ${row.eco} · ${plies} jugadas`,
      moves: buildLine(moves, userIsWhite, nm),
    });
    added++;
  }

  OUT.push({
    id: op.id, name: op.name, emoji: op.emoji, color: op.color,
    level: op.level, blurb: op.blurb, variations,
  });
  process.stderr.write(`${op.id}: ${variations.length} variaciones (curadas ${op.variations.length} + ECO ${added}, descartadas ${skipped})\n`);
}

// ---- Emitir openings.js ---------------------------------------------------
const header = `/*
 * openings.js — GENERADO automáticamente por tools/gen.js
 *
 * Variaciones curadas (texto rico) + variaciones reales del dataset ECO
 * de lichess-org/chess-openings (https://github.com/lichess-org/chess-openings).
 * No editar a mano: regenerar con  node tools/gen.js > openings.js
 *
 * Cada apertura es un "curso" con varias variaciones ordenadas.
 */\n\n`;

process.stdout.write(header + "const OPENINGS = " + JSON.stringify(OUT, null, 0) + ";\n\nwindow.OPENINGS = OPENINGS;\n");
