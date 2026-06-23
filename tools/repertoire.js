/* =========================================================================
 * tools/repertoire.js — Repertorio COHERENTE y con profundidad.
 *
 * Tus jugadas son fijas (tu "sistema"); las variaciones se diferencian solo
 * en las RESPUESTAS DEL RIVAL, con UNA réplica nuestra por cada una.
 * buildrep.js valida que NO haya contradicciones (misma posición => misma
 * jugada nuestra) y que todo sea legal.
 * ========================================================================= */

const REP = [
  {
    id: "london", name: "Sistema Londres", emoji: "🏛️", color: "white",
    level: "Principiante",
    tag: "La más sólida",
    blurb: "Tu sistema: d4, Bf4, e3, Nf3, c3, Bd3 y enroque. Sólido contra todo.",
    lines: [
      { name: "…d5 …Nf6: plan Ne5", blurb: "Estructura simétrica; atacamos con Ne5 y f4.",
        san: "1. d4 d5 2. Bf4 Nf6 3. e3 e6 4. Nf3 Bd6 5. Bg3 O-O 6. Bd3 b6 7. Nbd2 Bb7 8. Ne5 Nbd7 9. f4 c5 10. c3" },
      { name: "…d5 …Nf6: cambio en g3", blurb: "El rival cambia el alfil; recapturamos con hxg3.",
        san: "1. d4 d5 2. Bf4 Nf6 3. e3 e6 4. Nf3 Bd6 5. Bg3 Bxg3 6. hxg3 Nbd7 7. Nbd2 c5 8. c3 b6 9. Bd3 Bb7 10. O-O" },
      { name: "…d5 …Nf6 …c5", blurb: "El rival golpea con …c5; reforzamos con c3.",
        san: "1. d4 d5 2. Bf4 Nf6 3. e3 c5 4. c3 Nc6 5. Nbd2 e6 6. Ngf3 Bd6 7. Bg3 O-O 8. Bd3 b6 9. O-O" },
      { name: "…d5 …Bf5", blurb: "El rival saca el alfil; lo cambiamos en d3.",
        san: "1. d4 d5 2. Bf4 Nf6 3. e3 Bf5 4. Nf3 e6 5. Bd3 Bxd3 6. Qxd3 Nbd7 7. Nbd2 Bd6 8. Bg3 O-O 9. O-O c5 10. c3" },
      { name: "…c5 con …Qb6", blurb: "El rival presiona b2; cambiamos damas con ventaja.",
        san: "1. d4 d5 2. Bf4 c5 3. e3 Nc6 4. c3 Qb6 5. Qb3 c4 6. Qxb6 axb6 7. Nd2 Nf6 8. Ngf3 Bf5 9. Be2" },
      { name: "…c5 con …Nf6", blurb: "El rival evita cambiar damas; seguimos el plan.",
        san: "1. d4 d5 2. Bf4 c5 3. e3 Nc6 4. c3 Nf6 5. Nbd2 e6 6. Ngf3 Bd6 7. Bg3 O-O 8. Bd3 b6 9. O-O Bb7 10. Ne5" },
      { name: "…d5 con …Bd6 y …Qe7", blurb: "El rival prepara la ruptura …e5; la frenamos.",
        san: "1. d4 d5 2. Bf4 e6 3. e3 Bd6 4. Bxd6 Qxd6 5. Nf3 Nf6 6. Bd3 O-O 7. Nbd2 Nbd7 8. O-O c5 9. c3" },
      { name: "Contra el fianchetto (…g6)", blurb: "Setup tipo India; jugamos h3, Be2 y O-O.",
        san: "1. d4 Nf6 2. Bf4 g6 3. e3 Bg7 4. Nf3 d6 5. h3 O-O 6. Be2 Nbd7 7. O-O Re8 8. c3 e5 9. Bh2 Qe7" },
      { name: "…g6 con ruptura …c5", blurb: "El rival rompe con …c5; abrimos con calma.",
        san: "1. d4 Nf6 2. Bf4 g6 3. e3 Bg7 4. Nf3 d6 5. h3 O-O 6. Be2 c5 7. c3 cxd4 8. exd4 Nc6 9. O-O" },
      { name: "Contra 1…g6 inmediato", blurb: "El rival fianchetta desde la primera jugada.",
        san: "1. d4 g6 2. Bf4 Bg7 3. e3 d6 4. Nf3 Nf6 5. h3 O-O 6. Be2 Nbd7 7. O-O e5 8. Bh2 Qe7 9. c3" },
      { name: "Contra la Holandesa (1…f5)", blurb: "El rival juega …f5; desarrollamos con solidez.",
        san: "1. d4 f5 2. Bf4 Nf6 3. e3 e6 4. Nf3 Be7 5. h3 O-O 6. Be2 d6 7. O-O Ne4 8. Nbd2" }
    ]
  },

  {
    id: "italian", name: "Apertura Italiana", emoji: "🇮🇹", color: "white",
    level: "Principiante",
    tag: "La más fácil para empezar",
    blurb: "1.e4 e5 2.Nf3 Nc6 3.Bc4 y el plan tranquilo c3, d3, O-O, Re1, Nbd2.",
    lines: [
      { name: "Giuoco Pianissimo (…Bc5)", blurb: "Maniobra lenta con Nbd2-f1-g3.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 8. Nbd2 Ba7 9. h3 h6 10. Nf1" },
      { name: "Pianissimo: reruteo …Ne7", blurb: "El rival reagrupa con …Ne7-g6.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 Ne7 8. Nbd2 Ng6 9. Nf1 c6 10. Ng3" },
      { name: "…Bc5 con …Bb6", blurb: "El rival repliega el alfil a b6.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Bb6 5. d3 Nf6 6. O-O d6 7. Re1 O-O 8. Nbd2 a5 9. a4" },
      { name: "Dos Caballos: ataque Ng5", blurb: "El rival juega …Nf6; saltamos a g5 sobre f7.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5 6. Bb5+ c6 7. dxc6 bxc6 8. Be2 h6 9. Nf3 e4 10. Ne5 Bd6" },
      { name: "Defensa Húngara (…Be7)", blurb: "El rival se repliega; tomamos el centro con d4.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Be7 4. d4 exd4 5. Nxd4 Nf6 6. Nc3 O-O 7. O-O d6 8. h3 Re8 9. Re1" },
      { name: "Defensa …d6", blurb: "El rival juega sólido con …d6; montamos d4.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. c3 Nf6 5. d4 Be7 6. O-O O-O 7. Re1 a6 8. h3" }
    ]
  },

  {
    id: "ruylopez", name: "Ruy López", emoji: "👑", color: "white",
    level: "Intermedio",
    tag: "La más fuerte de todas",
    blurb: "1.e4 e5 2.Nf3 Nc6 3.Bb5 y el plan O-O, Re1, c3, h3, d4.",
    lines: [
      { name: "Cerrada — Chigorin (…Na5)", blurb: "La gran línea principal; cerramos el centro.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Na5 10. Bc2 c5 11. d4" },
      { name: "Cerrada — Breyer (…Nb8)", blurb: "El caballo va a b8-d7; juego maniobrero.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7" },
      { name: "…a6 con …b5 temprano", blurb: "El rival expande con …b5 antes de …Nf6.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 b5 5. Bb3 Nf6 6. O-O Be7 7. Re1 d6 8. c3 O-O 9. h3 Na5 10. Bc2 c5 11. d4" },
      { name: "Anti-Berlinés (…Nf6 4.d3)", blurb: "Evitamos el final berlinés y mantenemos la presión.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. d3 Bc5 5. c3 O-O 6. O-O d6 7. Nbd2 a6 8. Ba4 Ba7 9. h3 Ne7" },
      { name: "Defensa Steinitz (…d6)", blurb: "El rival apoya e5 con …d6; abrimos con d4.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 d6 4. d4 Bd7 5. Nc3 Nf6 6. O-O Be7 7. Re1 exd4 8. Nxd4 O-O" },
      { name: "Clásica (…Bc5)", blurb: "El rival desarrolla …Bc5; golpeamos con d4.",
        san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 Bc5 4. O-O Nf6 5. c3 O-O 6. d4 Bb6 7. Re1 d6 8. h3" }
    ]
  },

  {
    id: "sicilian", name: "Defensa Siciliana", emoji: "⚔️", color: "white",
    level: "Intermedio",
    tag: "La más agresiva",
    blurb: "Abierta con el Ataque Inglés/Yugoslavo: Be3, f3, Qd2 y enroque largo.",
    lines: [
      { name: "Najdorf — Ataque Inglés (…e5)", blurb: "El plan más temido contra la Najdorf.",
        san: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O Nbd7 11. g4" },
      { name: "Najdorf — …e6 (Scheveningen)", blurb: "Estructura pequeña con …e6 y …b5.",
        san: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e6 7. f3 b5 8. Qd2 Bb7 9. O-O-O Nbd7 10. g4" },
      { name: "Dragón — Ataque Yugoslavo", blurb: "Enroques opuestos y carrera de peones.",
        san: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O 8. Qd2 Nc6 9. O-O-O d5 10. exd5 Nxd5 11. Nxc6 bxc6 12. Bd4" },
      { name: "Clásica — Richter-Rauzer (…Nc6)", blurb: "Clavamos con Bg5 y enrocamos largo.",
        san: "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 Nc6 6. Bg5 e6 7. Qd2 Be7 8. O-O-O O-O 9. f4 Nxd4 10. Qxd4" },
      { name: "Sveshnikov (…Nc6 …e5)", blurb: "El rival golpea …e5; ocupamos d5.",
        san: "1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5 6. Ndb5 d6 7. Bg5 a6 8. Na3 b5 9. Bxf6 gxf6 10. Nd5 f5" },
      { name: "Taimanov — Ataque Inglés", blurb: "Presión con Be3, Qd2 y O-O-O.",
        san: "1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nc6 5. Nc3 Qc7 6. Be3 a6 7. Qd2 Nf6 8. O-O-O Be7 9. f3 O-O 10. g4" },
      { name: "Kan — Ataque Inglés", blurb: "El rival prepara …b5; respondemos con energía.",
        san: "1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 a6 5. Nc3 Qc7 6. Be3 b5 7. Qd2 Bb7 8. O-O-O Nf6 9. f3 Nc6" }
    ]
  },

  {
    id: "queensgambit", name: "Gambito de Dama", emoji: "♛", color: "white",
    level: "Intermedio",
    tag: "La de los campeones",
    blurb: "1.d4 d5 2.c4 y, según el rival, Nc3/Nf3 con un centro fuerte.",
    lines: [
      { name: "Declinado — ortodoxo", blurb: "Clavamos con Bg5 y liquidamos el centro.",
        san: "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5" },
      { name: "Declinado — …Nbd7", blurb: "El rival prepara …c6 y …Qa5.",
        san: "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Nbd7 5. e3 c6 6. Nf3 Qa5 7. cxd5 Nxd5 8. Qd2" },
      { name: "Tarrasch (…c5)", blurb: "El rival juega …c5; le dejamos peón aislado.",
        san: "1. d4 d5 2. c4 e6 3. Nc3 c5 4. cxd5 exd5 5. Nf3 Nc6 6. g3 Nf6 7. Bg2 Be7 8. O-O O-O 9. dxc5 Bxc5 10. Bg5" },
      { name: "Defensa Eslava", blurb: "El rival sostiene d5 con …c6 y toma en c4.",
        san: "1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 dxc4 5. a4 Bf5 6. e3 e6 7. Bxc4 Bb4 8. O-O O-O" },
      { name: "Semi-Eslava", blurb: "El rival junta …c6 y …e6.",
        san: "1. d4 d5 2. c4 c6 3. Nf3 Nf6 4. Nc3 e6 5. e3 Nbd7 6. Bd3 dxc4 7. Bxc4 b5 8. Bd3 a6" },
      { name: "Aceptado (…dxc4)", blurb: "El rival captura en c4; lo recuperamos con Bxc4.",
        san: "1. d4 d5 2. c4 dxc4 3. Nf3 Nf6 4. e3 e6 5. Bxc4 c5 6. O-O a6 7. dxc5 Qxd1 8. Rxd1 Bxc5" },
      { name: "Defensa Chigorin (…Nc6)", blurb: "El rival desarrolla …Nc6; ganamos la pareja.",
        san: "1. d4 d5 2. c4 Nc6 3. Nf3 Bg4 4. cxd5 Bxf3 5. gxf3 Qxd5 6. e3 e5 7. Nc3 Bb4 8. Bd2" },
      { name: "Contragambito Albin (…e5)", blurb: "El rival sacrifica con …e5; devolvemos a tiempo.",
        san: "1. d4 d5 2. c4 e5 3. dxe5 d4 4. Nf3 Nc6 5. g3 Bg4 6. Bg2 Qd7 7. O-O O-O-O" }
    ]
  },

  {
    id: "kingsindian", name: "Defensa India de Rey", emoji: "🛡️", color: "black",
    level: "Avanzado",
    tag: "La más combativa (negras)",
    blurb: "Juegas con negras: Nf6, g6, Bg7, O-O, d6 y la ruptura …e5.",
    lines: [
      { name: "Clásica (blancas con Nf3)", blurb: "Mar del Plata: cerramos con …e5 y atacamos con …f5.",
        san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. O-O Nc6 8. d5 Ne7 9. Ne1 Nd7 10. Nd3 f5" },
      { name: "Sämisch (blancas con f3)", blurb: "Las blancas montan f3 y Be3; atacamos con …f5-f4.",
        san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3 O-O 6. Be3 e5 7. d5 Nh5 8. Qd2 f5 9. O-O-O f4 10. Bf2" },
      { name: "Cuatro Peones (blancas con f4)", blurb: "Centro gigante con f4; golpeamos con …c5 y …e6.",
        san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f4 O-O 6. Nf3 c5 7. d5 e6 8. Be2 exd5 9. cxd5 Bg4" },
      { name: "Averbakh (blancas con Be2 y Bg5)", blurb: "Las blancas clavan con Bg5; respondemos …c5.",
        san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Be2 O-O 6. Bg5 c5 7. d5 e6 8. Qd2 exd5 9. exd5 Re8" },
      { name: "Makogonov (blancas con h3)", blurb: "Las blancas frenan con h3; vamos al flanco con …Na6.",
        san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. h3 e5 7. d5 Na6 8. Bg5 Qe8 9. g4" },
      { name: "Variante del Fianchetto (blancas con g3)", blurb: "Las blancas fianchetan; maniobramos con …Nbd7 y …e5.",
        san: "1. d4 Nf6 2. c4 g6 3. Nf3 Bg7 4. g3 O-O 5. Bg2 d6 6. O-O Nbd7 7. Nc3 e5 8. e4 c6 9. h3 Qb6" }
    ]
  }
];

module.exports = REP;
