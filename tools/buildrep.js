/* =========================================================================
 * tools/buildrep.js — Construye openings.js desde el repertorio coherente.
 *
 *  - Convierte cada línea SAN a jugadas {from,to} con el motor (tools/chess.js).
 *  - Genera textos de entrenador ("nosotros", explica y termina con la jugada).
 *  - VALIDA coherencia: misma posición => misma jugada nuestra (0 contradicciones).
 *
 * Uso:  node tools/buildrep.js > openings.js
 * ========================================================================= */
"use strict";

const { startBoard, sanLineToMoves } = require("./chess.js");
const REP = require("./repertoire.js");

// ---- Textos de entrenador (primera persona del plural) -------------------
const ART = { P: "el peón", N: "el caballo", B: "el alfil", R: "la torre", Q: "la dama", K: "el rey" };
const DEV = { N: "Desarrollamos", B: "Desarrollamos", R: "Activamos", Q: "Sacamos", K: "Llevamos", P: "" };
function ladoDe(mv) { return mv.castle === "O-O" ? "corto" : "largo"; }

function userText(mv, b) {
  if (mv.castle) return `Enrocamos ${ladoDe(mv)} y ponemos el rey a salvo.`;
  const t = b[mv.from].t, cap = !!b[mv.to];
  if (t === "P") return cap ? `Capturamos en ${mv.to} con el peón.` : `Avanzamos el peón a ${mv.to}.`;
  if (cap) return `Capturamos en ${mv.to} con ${ART[t]}.`;
  return `${DEV[t]} ${ART[t]} a ${mv.to}.`;
}
function engineText(mv, b, side) {
  if (mv.castle) return `${side} enrocan ${ladoDe(mv)}.`;
  const t = b[mv.from].t, cap = !!b[mv.to];
  if (t === "P") return cap ? `${side} capturan en ${mv.to} con el peón.` : `${side} avanzan el peón a ${mv.to}.`;
  if (cap) return `${side} capturan en ${mv.to} con ${ART[t]}.`;
  return `${side} desarrollan ${ART[t]} a ${mv.to}.`;
}
function hintText(mv, b) {
  if (mv.castle) return `Enrocamos ${ladoDe(mv)}: toca el rey y luego su casilla.`;
  return `Movemos ${ART[b[mv.from].t]} de ${mv.from} a ${mv.to}.`;
}
function applyToDesc(b, mv) {
  if (mv.castle) {
    const rank = (mv.color === "white") ? "1" : "8";
    const ks = mv.castle === "O-O";
    if (b["e" + rank]) b[(ks ? "g" : "c") + rank] = b["e" + rank];
    delete b["e" + rank];
    const rf = ks ? "h" : "a", rt = ks ? "f" : "d";
    b[rt + rank] = b[rf + rank]; delete b[rf + rank];
  } else {
    b[mv.to] = b[mv.from]; delete b[mv.from];
  }
}

function buildLine(moves, userIsWhite, name) {
  const b = startBoard();
  const side = userIsWhite ? "Las negras" : "Las blancas";
  const out = [];
  moves.forEach((mv, ply) => {
    const by = ((ply % 2 === 0) === userIsWhite) ? "user" : "engine";
    let text = by === "user" ? userText(mv, b) : engineText(mv, b, side);
    if (ply === 0) text = `Entramos en «${name}». ` + text;
    const hint = by === "user" ? hintText(mv, b) : undefined;
    applyToDesc(b, mv);
    out.push(by === "user" ? { by, ...mv, hint, text } : { by, ...mv, text });
  });
  return out;
}

function slug(s) {
  return s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 40) || "var";
}
function tokenize(san) {
  return san.replace(/\d+\.(\.\.)?/g, " ").trim().split(/\s+/).filter(Boolean);
}

// ---- Validación de coherencia (misma posición => misma jugada nuestra) ----
function serialize(board) { return Object.keys(board).sort().map(k => k + board[k]).join(""); }
function simKey(moves, userIsWhite, plies) {
  // Reconstruye un tablero simple {sq:code} aplicando `plies` jugadas.
  const b = {};
  const back = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  "abcdefgh".split("").forEach((f, i) => { b[f + "1"] = "w" + back[i]; b[f + "2"] = "wP"; b[f + "7"] = "bP"; b[f + "8"] = "b" + back[i]; });
  for (let i = 0; i < plies; i++) {
    const m = moves[i];
    if (m.castle) {
      const r = m.color === "black" ? "8" : "1", ks = m.castle === "O-O";
      b[(ks ? "g" : "c") + r] = b["e" + r]; delete b["e" + r];
      const rf = ks ? "h" : "a", rt = ks ? "f" : "d";
      b[rt + r] = b[rf + r]; delete b[rf + r];
    } else { b[m.to] = b[m.from]; delete b[m.from]; }
  }
  return serialize(b);
}

// ---- Construcción ---------------------------------------------------------
const OUT = [];
let problems = 0;

for (const op of REP) {
  const userIsWhite = op.color === "white";
  const variations = [];
  const posResponse = {}; // posKey -> { mv, lineName } (jugada NUESTRA)

  op.lines.forEach((line) => {
    let moves;
    try { moves = sanLineToMoves(tokenize(line.san)); }
    catch (e) { console.error(`ERROR legalidad [${op.id} / ${line.name}]: ${e.message}`); problems++; return; }

    // coherencia: antes de cada jugada nuestra, registra la respuesta
    moves.forEach((m, ply) => {
      const by = ((ply % 2 === 0) === userIsWhite) ? "user" : "engine";
      if (by !== "user") return;
      const key = simKey(moves, userIsWhite, ply);
      const mv = m.castle ? m.castle + (m.color || "") : (m.from + m.to);
      if (posResponse[key] && posResponse[key].mv !== mv) {
        console.error(`CONTRADICCIÓN [${op.id}] en jugada ${ply + 1}: ` +
          `"${posResponse[key].lineName}" juega ${posResponse[key].mv} pero ` +
          `"${line.name}" juega ${mv} en la misma posición.`);
        problems++;
      } else {
        posResponse[key] = { mv, lineName: line.name };
      }
    });

    variations.push({
      id: slug(line.name),
      name: line.name,
      blurb: line.blurb || `${moves.length} jugadas`,
      moves: buildLine(moves, userIsWhite, line.name),
    });
  });

  OUT.push({
    id: op.id, name: op.name, emoji: op.emoji, color: op.color,
    level: op.level, tag: op.tag || "", blurb: op.blurb, variations,
  });
  console.error(`${op.id}: ${variations.length} líneas`);
}

if (problems > 0) {
  console.error(`\n❌ ${problems} problema(s). No se escribe openings.js.`);
  process.exit(1);
}

const header = `/*
 * openings.js — GENERADO por tools/buildrep.js
 *
 * Repertorio COHERENTE: tus jugadas son fijas y cada variación se diferencia
 * solo en la respuesta del rival (una réplica por respuesta, sin contradicciones).
 * No editar a mano: regenerar con  node tools/buildrep.js > openings.js
 */\n\n`;
process.stdout.write(header + "const OPENINGS = " + JSON.stringify(OUT, null, 0) + ";\n\nwindow.OPENINGS = OPENINGS;\n");
