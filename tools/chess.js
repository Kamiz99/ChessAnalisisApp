/* =========================================================================
 * tools/chess.js — mini-motor de ajedrez para convertir SAN -> {from,to}.
 * Generación legal de movimientos para resolver ambigüedades de SAN.
 * No soporta promoción ni captura al paso (lanza excepción: la línea se salta).
 * ========================================================================= */
"use strict";

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
  const dr = by === "w" ? -1 : 1;
  for (const dfp of [-1, 1]) {
    const f = tf + dfp, r = tr + dr;
    if (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const p = pieceAt(b, f, r);
      if (p && p.c === by && p.t === "P") return true;
    }
  }
  for (const [df, drr] of KN) {
    const f = tf + df, r = tr + drr;
    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const p = pieceAt(b, f, r);
    if (p && p.c === by && p.t === "N") return true;
  }
  for (let df = -1; df <= 1; df++) for (let drr = -1; drr <= 1; drr++) {
    if (!df && !drr) continue;
    const f = tf + df, r = tr + drr;
    if (f < 0 || f > 7 || r < 0 || r > 7) continue;
    const p = pieceAt(b, f, r);
    if (p && p.c === by && p.t === "K") return true;
  }
  for (const [dirs, types] of [[DIAG, "BQ"], [ORTH, "RQ"]]) {
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
  while (f !== tf || r !== tr) { if (b[sq(f, r)]) return false; f += df; r += dr; }
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
function applySan(b, sanRaw, color) {
  const san = sanRaw.replace(/[+#!?]/g, "");
  if (san === "O-O" || san === "0-0" || san === "O-O-O" || san === "0-0-0") {
    const kside = san.length === 3;
    const rank = color === "w" ? 0 : 7;
    const kf = 4, rf = kside ? 7 : 0;
    const ktoF = kside ? 6 : 2, rtoF = kside ? 5 : 3;
    b[sq(ktoF, rank)] = b[sq(kf, rank)]; delete b[sq(kf, rank)];
    b[sq(rtoF, rank)] = b[sq(rf, rank)]; delete b[sq(rf, rank)];
    return { castle: kside ? "O-O" : "O-O-O", color: color === "w" ? "white" : "black" };
  }
  const m = san.match(/^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(=([QRBN]))?$/);
  if (!m) throw new Error("SAN no parseable: " + sanRaw);
  if (m[6]) throw new Error("promoción no soportada: " + sanRaw);
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
      if (!b[sq(tf, tr)]) throw new Error("captura al paso no soportada: " + sanRaw);
      b[sq(tf, tr)] = b[sq(f, fr)]; delete b[sq(f, fr)];
      return { from: sq(f, fr), to: sq(tf, tr) };
    }
    const oneR = tr - dir;
    let fromR = null;
    if (pieceAt(b, tf, oneR) && pieceAt(b, tf, oneR).t === "P" && pieceAt(b, tf, oneR).c === color) {
      fromR = oneR;
    } else {
      const twoR = tr - 2 * dir;
      const startRank = color === "w" ? 1 : 6;
      if (twoR === startRank && pieceAt(b, tf, twoR) && pieceAt(b, tf, twoR).t === "P" &&
          pieceAt(b, tf, twoR).c === color && !pieceAt(b, tf, oneR)) fromR = twoR;
    }
    if (fromR === null) throw new Error("empuje de peón no resuelto: " + sanRaw);
    b[sq(tf, tr)] = b[sq(tf, fromR)]; delete b[sq(tf, fromR)];
    return { from: sq(tf, fromR), to: sq(tf, tr) };
  }

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
  if (cands.length > 1) throw new Error("SAN ambiguo: " + sanRaw);
  const [ff, fr] = cands[0];
  b[sq(tf, tr)] = b[sq(ff, fr)]; delete b[sq(ff, fr)];
  return { from: sq(ff, fr), to: sq(tf, tr) };
}

// Convierte una lista de jugadas SAN en jugadas {from,to}/{castle,color}.
function sanLineToMoves(sans) {
  const b = startBoard();
  let color = "w";
  const out = [];
  for (const s of sans) {
    out.push(applySan(b, s, color));
    color = opp(color);
  }
  return out;
}

module.exports = { startBoard, applySan, sanLineToMoves, FILES };
