/* =========================================================================
 * tools/repertoire.js — Repertorio COHERENTE por apertura.
 *
 * Tus jugadas son fijas (tu "sistema"); las variaciones se diferencian solo
 * en las RESPUESTAS DEL RIVAL, con UNA réplica nuestra por cada una.
 * El constructor (buildrep.js) valida que NO haya contradicciones: misma
 * posición => misma jugada nuestra, siempre.
 *
 * Las líneas se escriben en notación SAN (con números de jugada, da igual).
 * ========================================================================= */

const REP = [
  {
    id: "london", name: "Sistema Londres", emoji: "🏛️", color: "white",
    level: "Principiante",
    blurb: "Tu sistema: d4, Bf4, e3, Nf3, c3, Bd3 y enroque. Sólido contra todo.",
    tag: "La más sólida",
    lines: [
      { name: "Respuesta …d5 con …Nf6 (simétrica)", blurb: "El rival juega …d5 y …Nf6.",
        san: "1. d4 d5 2. Bf4 Nf6 3. e3 e6 4. Nf3 Bd6 5. Bg3 O-O 6. Bd3" },
      { name: "Respuesta …d5 con …Bf5", blurb: "El rival saca pronto el alfil a f5.",
        san: "1. d4 d5 2. Bf4 Nf6 3. e3 Bf5 4. Nf3 e6 5. Bd3 Bxd3 6. Qxd3" },
      { name: "Respuesta …c5 con …Qb6", blurb: "El rival golpea con …c5 y presiona b2.",
        san: "1. d4 d5 2. Bf4 c5 3. e3 Nc6 4. c3 Qb6 5. Qb3" },
      { name: "Respuesta …e6 (cambio de alfiles)", blurb: "El rival ofrece cambiar en d6.",
        san: "1. d4 d5 2. Bf4 e6 3. e3 Bd6 4. Bg3 Nf6 5. Nf3 O-O 6. Bd3" },
      { name: "Contra el fianchetto (…g6)", blurb: "El rival monta un fianchetto tipo India.",
        san: "1. d4 Nf6 2. Bf4 g6 3. e3 Bg7 4. Nf3 d6 5. h3 O-O 6. Be2" },
      { name: "Contra 1…g6 inmediato", blurb: "El rival fianchetta desde la primera.",
        san: "1. d4 g6 2. Bf4 Bg7 3. e3 d6 4. Nf3 Nf6 5. h3 O-O 6. Be2" },
      { name: "Contra la Holandesa (1…f5)", blurb: "El rival juega …f5.",
        san: "1. d4 f5 2. Bf4 Nf6 3. e3 e6 4. Nf3 Be7 5. h3 O-O 6. Be2" }
    ]
  },

  {
    id: "italian", name: "Apertura Italiana", emoji: "🇮🇹", color: "white",
    level: "Principiante",
    blurb: "1.e4 e5 2.Nf3 Nc6 3.Bc4 y el plan tranquilo c3, d3, O-O, Re1.",
    tag: "La más fácil para empezar",
    lines: [
      { name: "Giuoco Pianissimo (…Bc5)", blurb: "El rival juega …Bc5.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1" },
      { name: "…Bc5 con …a6", blurb: "El rival prepara …Ba7 con …a6.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 a6 5. d3 d6 6. O-O Nf6 7. Re1" },
      { name: "Dos Caballos: ataque Ng5 (…Nf6)", blurb: "El rival juega …Nf6.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5 6. Bb5+ c6 7. dxc6 bxc6 8. Be2" },
      { name: "Defensa Húngara (…Be7)", blurb: "El rival se repliega con …Be7.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Be7 4. d4 exd4 5. Nxd4 Nf6 6. Nc3 O-O 7. O-O" },
      { name: "Defensa …d6", blurb: "El rival juega sólido con …d6.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. c3 Nf6 5. d4 Be7 6. O-O O-O" }
    ]
  },

  {
    id: "ruylopez", name: "Ruy López", emoji: "👑", color: "white",
    level: "Intermedio",
    blurb: "1.e4 e5 2.Nf3 Nc6 3.Bb5 y el plan O-O, Re1, c3, d4.",
    tag: "La más fuerte de todas",
    lines: [
      { name: "Cerrada (3…a6 4.Ba4 Nf6)", blurb: "La línea principal de la Española.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O" },
      { name: "…a6 con …b5 temprano", blurb: "El rival expande con …b5 antes de …Nf6.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 b5 5. Bb3 Nf6 6. O-O Be7 7. Re1 d6 8. c3 O-O" },
      { name: "Anti-Berlinés (3…Nf6 4.d3)", blurb: "Evitamos el final berlinés y mantenemos la presión.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. d3 Bc5 5. c3 O-O 6. O-O d6 7. Nbd2" },
      { name: "Defensa Steinitz (3…d6)", blurb: "El rival apoya e5 con …d6.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 d6 4. d4 Bd7 5. Nc3 Nf6 6. O-O Be7" },
      { name: "Clásica (3…Bc5)", blurb: "El rival desarrolla …Bc5.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 Bc5 4. O-O Nf6 5. c3 O-O 6. d4" }
    ]
  },

  {
    id: "sicilian", name: "Defensa Siciliana", emoji: "⚔️", color: "white",
    level: "Intermedio",
    blurb: "Abierta con el Ataque Inglés/Yugoslavo: Be3, f3, Qd2 y enroque largo.",
    tag: "La más agresiva",
    lines: [
      { name: "Najdorf — Ataque Inglés (…a6)", blurb: "La Najdorf, contra el plan más temido.",
        san: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O" },
      { name: "Dragón — Ataque Yugoslavo (…g6)", blurb: "Contra el Dragón, el ataque más agudo.",
        san: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O 8. Qd2 Nc6 9. O-O-O" },
      { name: "Clásica — Richter-Rauzer (…Nc6)", blurb: "La línea más crítica contra …Nc6.",
        san: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 Nc6 6. Bg5 e6 7. Qd2 Be7 8. O-O-O O-O" },
      { name: "Sveshnikov (…Nc6 …e5)", blurb: "El rival golpea con …e5.",
        san: "1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5 6. Ndb5 d6 7. Bg5 a6 8. Na3 b5" },
      { name: "Taimanov — Ataque Inglés (…e6 …Nc6)", blurb: "Presión con Be3, Qd2 y O-O-O.",
        san: "1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nc6 5. Nc3 Qc7 6. Be3 a6 7. Qd2 Nf6 8. O-O-O" },
      { name: "Kan — Ataque Inglés (…e6 …a6)", blurb: "El rival prepara …b5; respondemos con energía.",
        san: "1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 a6 5. Nc3 Qc7 6. Be3 b5 7. Qd2 Bb7 8. O-O-O" }
    ]
  },

  {
    id: "queensgambit", name: "Gambito de Dama", emoji: "♛", color: "white",
    level: "Intermedio",
    blurb: "1.d4 d5 2.c4 y, según el rival, Nc3/Nf3 con un centro fuerte.",
    tag: "La de los campeones",
    lines: [
      { name: "Declinado (…e6 …Nf6)", blurb: "El rival declina con …e6.",
        san: "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 b6" },
      { name: "Tarrasch (…e6 …c5)", blurb: "El rival contraataca con …c5.",
        san: "1. d4 d5 2. c4 e6 3. Nc3 c5 4. cxd5 exd5 5. Nf3 Nc6 6. g3 Nf6 7. Bg2" },
      { name: "Defensa Eslava (…c6)", blurb: "El rival sostiene d5 con …c6.",
        san: "1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 dxc4 5. a4 Bf5 6. e3 e6 7. Bxc4" },
      { name: "Aceptado (…dxc4)", blurb: "El rival captura en c4.",
        san: "1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. e3 e6 5. Bxc4 c5 6. O-O a6" },
      { name: "Defensa Chigorin (…Nc6)", blurb: "El rival desarrolla …Nc6.",
        san: "1. d4 d5 2. c4 Nc6 3. Nf3 Bg4 4. cxd5 Bxf3 5. gxf3 Qxd5 6. e3" },
      { name: "Contragambito Albin (…e5)", blurb: "El rival sacrifica con …e5.",
        san: "1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 Nc6 5. g3 Bg4 6. Bg2" }
    ]
  },

  {
    id: "kingsindian", name: "Defensa India de Rey", emoji: "🛡️", color: "black",
    level: "Avanzado",
    blurb: "Juegas con negras: Nf6, g6, Bg7, O-O, d6 y la ruptura …e5.",
    tag: "La más combativa (negras)",
    lines: [
      { name: "Clásica (blancas con Nf3)", blurb: "Setup clásico con e4 y Nf3.",
        san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6" },
      { name: "Sämisch (blancas con f3)", blurb: "Las blancas montan f3 y Be3.",
        san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3 O-O 6. Be3 e5 7. d5 Nh5" },
      { name: "Cuatro Peones (blancas con f4)", blurb: "Centro gigante con f4.",
        san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f4 O-O 6. Nf3 c5 7. d5 e6" },
      { name: "Averbakh (blancas con Be2 y Bg5)", blurb: "Las blancas clavan con Bg5.",
        san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Be2 O-O 6. Bg5 Na6" },
      { name: "Fianchetto (blancas con g3)", blurb: "Las blancas también fianchetan.",
        san: "1. d4 Nf6 2. c4 g6 3. Nf3 Bg7 4. g3 O-O 5. Bg2 d6 6. O-O Nbd7 7. Nc3 e5" }
    ]
  }
];

module.exports = REP;
