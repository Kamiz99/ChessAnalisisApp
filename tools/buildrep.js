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

// "Ideas": el porqué de NUESTRAS jugadas clave, por apertura (clave = SAN).
// Si una jugada del alumno está aquí, su texto explica el plan; si no, se usa
// la descripción genérica. Solo se aplican a jugadas del alumno (no del rival).
const IDEAS = {
  london: {
    "d4": "Abrimos con el peón de dama a d4: ocupamos el centro y montamos una estructura sólida y fácil de jugar.",
    "Bf4": "¡La jugada estrella del Londres! El alfil sale a f4, fuera de la cadena de peones, para que nunca quede encerrado.",
    "e3": "Jugamos e3: damos apoyo a d4 y abrimos la diagonal del alfil de f1. Lento pero firme.",
    "Nf3": "Caballo a f3: controla e5 y g5 y sigue el desarrollo natural.",
    "c3": "c3 refuerza d4 y le da a la dama las casillas c2/b3. La base de hierro del Londres.",
    "Bd3": "Alfil a d3, apuntando al flanco de rey rival: pieza clave para un futuro ataque.",
    "Be2": "Alfil a e2, modesto pero sólido; preparamos el enroque.",
    "h3": "h3 da aire a nuestro alfil de f4 y evita el molesto …Nh5 que querría cambiarlo.",
    "Nbd2": "Caballo de dama a d2: irá a f3/e5 o apoyará un avance e4.",
    "Ngf3": "Llevamos el caballo de rey a f3, completando el desarrollo de los caballos.",
    "Ne5": "¡El caballo salta a e5! Pieza dominante en el centro; preparamos f4 y el ataque.",
    "Bg3": "Retiramos el alfil a g3 para conservarlo: en el Londres no lo cambiamos a la ligera.",
    "O-O": "Enrocamos: el rey a salvo y la torre lista para entrar en juego.",
    "Qb3": "Dama a b3: defendemos b2 y presionamos b7/d5, ofreciendo el cambio de damas.",
    "Qxb6": "Cambiamos damas en b6: hacia un final cómodo donde el rival tiene peones débiles.",
    "Bxd6": "Cambiamos el alfil en d6: sin su alfil de casillas negras, dominaremos esas casillas.",
    "f4": "Avanzamos f4 apoyando el caballo de e5 y ganando espacio en el flanco de rey.",
    "exd4": "Recapturamos en d4 con el peón, manteniendo un centro fuerte.",
    "Bxd3": "Recapturamos con el alfil; mantenemos la pareja y un desarrollo cómodo.",
    "Bh2": "Escondemos el alfil en h2: sigue en su diagonal, vivo e imposible de cazar.",
    "Nd2": "Caballo a d2: plantamos cara al caballo rival de e4 y reforzamos el centro.",
    "Qxd3": "Recapturamos en d3 con la dama, que queda mirando al flanco de rey rival.",
    "hxg3": "Recapturamos con el peón h: se abre la columna h para nuestra torre, un regalo para el ataque."
  },
  italian: {
    "e4": "Abrimos con e4, la jugada más clásica: liberamos alfil y dama y reclamamos el centro.",
    "Nf3": "Caballo a f3 atacando el peón de e5. Desarrollo con amenaza.",
    "Bc4": "Alfil a c4, apuntando al punto más débil del rival: f7. Esto es la Italiana.",
    "c3": "c3 prepara el avance d4 para construir un gran centro. Paciencia.",
    "d3": "d3 sostiene e4 y deja todo sólido: el moderno y resistente Giuoco Pianissimo.",
    "O-O": "Enrocamos: rey seguro antes de empezar maniobras.",
    "Re1": "Torre a e1, apoyando e4 y la futura ruptura d4.",
    "Nbd2": "Caballo a d2 rumbo a f1-g3: maniobra típica para atacar el flanco de rey.",
    "Nf1": "Caballo a f1: primer paso del reruteo hacia g3.",
    "Ng3": "Caballo a g3, bien situado para presionar f5/h5 y el flanco de rey.",
    "h3": "h3 evita clavadas con …Bg4 y da una casilla de retirada.",
    "a4": "a4 frena la expansión …b5 del rival en el flanco de dama.",
    "Ng5": "¡Caballo a g5! Atacamos f7 directamente, una jugada muy agresiva y temida.",
    "exd5": "Capturamos en d5, abriendo el centro a nuestro favor.",
    "Bb5+": "Jaque en b5 ganando un tiempo antes de recuperar el peón.",
    "dxc6": "Capturamos en c6 destrozando la estructura de peones rival.",
    "Be2": "Alfil a e2: vamos un paso atrás pero conservamos un peón de más y mejor estructura.",
    "Ne5": "Caballo a e5, dominante; el rival deberá demostrar su compensación por el peón.",
    "d4": "¡Golpeamos con d4! Abrimos el centro con un desarrollo superior.",
    "Nxd4": "Recapturamos con el caballo, centralizado y fuerte.",
    "Nc3": "Caballo a c3, presionando el centro y completando el desarrollo.",
    "Bb5": "Alfil a b5: presionamos al caballo que sostiene e5."
  },
  ruylopez: {
    "e4": "Abrimos con e4, reclamando el centro.",
    "Nf3": "Caballo a f3 presionando el peón de e5.",
    "Bb5": "¡La Ruy López! El alfil a b5 presiona el caballo que defiende e5.",
    "Ba4": "Mantenemos la presión retirando el alfil a a4, sin soltar al caballo.",
    "O-O": "Enrocamos sin miedo: aunque capturen e4, tenemos compensación de sobra.",
    "Re1": "Torre a e1 reforzando e4 y preparando d4.",
    "Bb3": "Alfil a b3, en la gran diagonal hacia f7, listo para el medio juego.",
    "c3": "c3 prepara d4 y le da retirada al alfil por c2.",
    "h3": "h3 evita …Bg4 antes de jugar d4.",
    "d4": "Por fin d4: rompemos en el centro con todas las piezas listas.",
    "Bc2": "Retiramos el alfil a c2: sigue apuntando al rey por la diagonal b1-h7.",
    "d3": "d3 (Anti-Berlinés): mantenemos las piezas y evitamos el igualador final berlinés.",
    "Nbd2": "Caballo a d2 rumbo a f1-g3, maniobra típica de la Española.",
    "Nc3": "Caballo a c3 completando el desarrollo.",
    "Nxd4": "Recapturamos con el caballo, bien centralizado."
  },
  sicilian: {
    "e4": "Abrimos con e4; veremos cómo responde el rival.",
    "Nf3": "Caballo a f3, con la idea de abrir el centro con d4.",
    "d4": "¡Golpe en el centro con d4! Así nace la Siciliana Abierta.",
    "Nxd4": "Recapturamos con el caballo, que queda centralizado y fuerte.",
    "Nc3": "Caballo a c3 defendiendo e4 y desarrollando.",
    "Be3": "Alfil a e3: piedra angular del Ataque Inglés. Prepara Qd2, f3 y el enroque largo.",
    "f3": "f3 sostiene e4 y prepara el avance g4 contra el rey rival.",
    "Qd2": "Dama a d2, conectando piezas para enrocar largo y apoyar el ataque.",
    "O-O-O": "¡Enroque largo! Llevamos el rey al flanco de dama para lanzar nuestros peones contra el suyo.",
    "g4": "Avanzamos g4: empieza la tormenta de peones contra el enroque rival.",
    "Bg5": "Clavamos el caballo de f6 con Bg5 (Richter-Rauzer), la línea más crítica.",
    "Nb3": "Retiramos el caballo a b3 para no ser molestado por …e5; seguimos con f3 y Qd2.",
    "Ndb5": "¡Caballo a b5 amenazando d6! Provocamos debilidades en el campo rival.",
    "Na3": "El caballo va a a3 rumbo a c4/d5, hacia los huecos que dejó …e5.",
    "Bxf6": "Cambiamos en f6 dañando la estructura: ahora el hueco d5 es nuestro.",
    "Nd5": "¡Caballo a d5! Casilla soñada en plena Siciliana; domina la posición.",
    "exd5": "Abrimos el centro capturando en d5.",
    "Nxc6": "Cambiamos en c6 rompiendo la estructura rival.",
    "Bd4": "Centralizamos el alfil en d4, neutralizando el fianchetto rival y apuntando a su rey.",
    "f4": "f4 gana espacio y prepara la ruptura e5 contra el rey rival.",
    "Qxd4": "Recapturamos con la dama, centralizada y activa."
  },
  queensgambit: {
    "d4": "Ocupamos el centro con el peón de dama.",
    "c4": "Ofrecemos el Gambito de Dama: si capturan, recuperaremos el peón y dominaremos el centro.",
    "Nc3": "Caballo a c3 presionando d5.",
    "Nf3": "Caballo a f3, desarrollo flexible.",
    "Bg5": "Clavamos el caballo de f6 con Bg5, aumentando la presión sobre d5.",
    "e3": "e3 abre el alfil de rey y deja todo sólido.",
    "cxd5": "Capturamos en d5 para dejar al rival con un peón aislado que asediar.",
    "Bxc4": "Recuperamos el peón con Bxc4, alfil activo apuntando a f7.",
    "g3": "g3 prepara el fianchetto: el alfil en g2 presionará el peón aislado de d5.",
    "Bg2": "Alfil a g2, en la gran diagonal contra d5.",
    "O-O": "Enrocamos, listos para presionar el centro.",
    "a4": "a4 impide que el rival sostenga el peón de c4 con …b5.",
    "Bh4": "Mantenemos la clavada retirando el alfil a h4.",
    "Bxe7": "Cambiamos en e7 simplificando hacia una posición cómoda.",
    "Nxd5": "Cambiamos en d5; el rival queda con un peón algo débil.",
    "Qd2": "Dama a d2, conectando las piezas.",
    "dxc5": "Capturamos en c5; el peón aislado de d5 será nuestro objetivo.",
    "Bd2": "Alfil a d2 neutralizando la clavada; conservamos la pareja de alfiles.",
    "gxf3": "Recapturamos con el peón: abrimos la columna g y conservamos la pareja de alfiles.",
    "Rxd1": "Recapturamos con la torre; el final es cómodo gracias a nuestro mejor desarrollo.",
    "Bd3": "Alfil a d3, apuntando a h7 y completando el desarrollo.",
    "dxe5": "Capturamos en e5: castigamos su avance y abrimos la posición a nuestro favor."
  },
  kingsindian: {
    "Nf6": "Caballo a f6, desarrollando y vigilando el centro sin comprometernos.",
    "g6": "…g6 prepara el fianchetto: nuestro alfil irá a g7, una bestia en la diagonal larga.",
    "Bg7": "¡El fianchetto! Alfil a g7: presionará el centro y al rey rival toda la partida.",
    "d6": "…d6 prepara la ruptura …e5, con la que golpearemos el centro blanco.",
    "O-O": "Enrocamos: el rey a salvo antes de empezar el contraataque.",
    "e5": "¡La ruptura …e5! Desafiamos el centro de frente. La esencia de la India de Rey.",
    "Nc6": "…Nc6 presiona d4 y prepara cerrar el centro para atacar con …f5.",
    "Ne7": "El caballo va a e7 para apoyar …f5 y el ataque al flanco de rey.",
    "Nd7": "…Nd7 reagrupa: el caballo apoyará …f5 y deja paso al alfil de g7.",
    "f5": "¡…f5! Empieza nuestro ataque en el flanco de rey, el plan estrella de la India.",
    "Nh5": "…Nh5 despeja el camino del peón f y apunta a f4.",
    "f4": "…f4 cierra el flanco y abre la puerta al ataque con …g5-…g4.",
    "c5": "…c5 golpea el gran centro blanco antes de que se consolide.",
    "exd5": "Capturamos en d5 para abrir líneas contra el centro rival.",
    "Bg4": "…Bg4 clava y presiona, ganando actividad.",
    "Re8": "Torre a e8, apoyando la ruptura …e5/…e4.",
    "Na6": "…Na6 rumbo a c5/c7, presionando el flanco de dama.",
    "Qe8": "La dama va a e8 para apoyar …f5 y trasladarse al ataque.",
    "Nbd7": "…Nbd7 reagrupa hacia …e5 sin tapar al alfil de g7.",
    "c6": "…c6 da soporte y prepara …Qb6 o …d5.",
    "Qb6": "…Qb6 presiona b2/d4 aprovechando nuestro fianchetto.",
    "e6": "…e6 desafía la punta de su cadena de peones: queremos abrir líneas en el centro."
  }
};

// El porqué de las jugadas del RIVAL, por apertura (clave = SAN). Se añade a
// la descripción ("Las negras avanzan el peón a d5. Ocupan el centro…") para
// que TODAS las jugadas de la lección lleven su explicación.
const RIVAL = {
  london: {
    "d5": "Ocupan su parte del centro con una estructura clásica.",
    "Nf6": "Desarrollan y controlan la casilla e4.",
    "e6": "Refuerzan d5 y abren la salida de su alfil de rey.",
    "Bd6": "Ofrecen el cambio de nuestro alfil estrella de f4.",
    "O-O": "Ponen su rey a salvo.",
    "b6": "Preparan …Bb7 para pelear la diagonal larga.",
    "Bb7": "Su alfil presiona d5 y e4 desde la esquina.",
    "Nbd7": "Desarrollan el caballo apoyando …e5 o …c5.",
    "c5": "Golpean nuestro peón de d4 desde el flanco.",
    "Bxg3": "Cambian su alfil por el nuestro de casillas negras.",
    "Nc6": "Desarrollan presionando d4.",
    "Bf5": "Sacan el alfil activo antes de cerrar con …e6.",
    "Bxd3": "Cambian los alfiles de casillas blancas.",
    "Qb6": "Su dama ataca b2 y presiona nuestro flanco de dama.",
    "c4": "Ganan espacio, pero sueltan la presión sobre d4: el centro queda estable para nosotros.",
    "axb6": "Recapturan con el peón de torre: su columna a se abre pero sus peones quedan doblados.",
    "Qxd6": "Recapturan el alfil con la dama.",
    "g6": "Preparan el fianchetto de su alfil de rey.",
    "Bg7": "Su alfil llega a g7, apuntando por la diagonal larga.",
    "d6": "Sostienen el centro y preparan …e5.",
    "Re8": "Su torre apoya la futura ruptura …e5.",
    "e5": "Golpean en el centro: era su plan.",
    "Qe7": "Conectan las piezas y apoyan …e5.",
    "cxd4": "Cambian en d4 para abrir la columna c.",
    "f5": "La Holandesa: pelean e4 con el peón f, agresivo pero debilita a su rey.",
    "Be7": "Desarrollan el alfil con modestia y preparan el enroque.",
    "Ne4": "Su caballo salta a e4, la casilla que le abrió …f5."
  },
  italian: {
    "e5": "Responden simétrico, defendiendo su parte del centro.",
    "Nc6": "Defienden e5 desarrollando una pieza.",
    "Bc5": "Su alfil apunta a f2: la Italiana clásica por ambos bandos.",
    "Nf6": "Desarrollan atacando nuestro peón de e4.",
    "d6": "Sostienen e5 y abren paso a su alfil de dama.",
    "O-O": "Ponen su rey a salvo.",
    "a6": "Dan aire a su alfil (…Ba7) y controlan b5.",
    "Ba7": "Retiran el alfil conservándolo en la misma diagonal.",
    "h6": "Evitan que saltemos a g5.",
    "Ne7": "Reagrupan el caballo rumbo a g6.",
    "Ng6": "Su caballo llega a g6, vigilando f4 y e5.",
    "c6": "Preparan …d5 para liberarse en el centro.",
    "Bb6": "Retiran el alfil manteniéndolo activo.",
    "a5": "Ganan espacio buscando molestar en nuestro flanco de dama.",
    "d5": "Rompen en el centro buscando liberarse.",
    "Na5": "Su caballo va a cazar nuestro alfil de c4.",
    "bxc6": "Recapturan, pero su estructura queda dañada.",
    "e4": "Avanzan ganando espacio y echando a nuestro caballo.",
    "Bd6": "Defienden e5 con el alfil, algo pasivo.",
    "Be7": "Desarrollan el alfil con solidez.",
    "exd4": "Cambian en d4 abriendo el centro.",
    "Re8": "Su torre presiona por la columna e."
  },
  ruylopez: {
    "e5": "Defienden su parte del centro.",
    "Nc6": "Defienden e5 desarrollando.",
    "a6": "La Defensa Morphy: preguntan a nuestro alfil qué piensa hacer.",
    "Nf6": "Desarrollan atacando e4.",
    "Be7": "Preparan el enroque con solidez: la Española Cerrada.",
    "b5": "Echan a nuestro alfil ganando espacio en el flanco de dama.",
    "d6": "Sostienen e5 y liberan a su alfil de dama.",
    "O-O": "Ponen su rey a salvo.",
    "Na5": "La maniobra Chigorin: su caballo va a por nuestro alfil de b3.",
    "c5": "Ganan espacio en el flanco de dama.",
    "Nb8": "¡La Breyer! El caballo vuelve a casa para reaparecer mejor por d7.",
    "Nbd7": "Reagrupan el caballo hacia el centro.",
    "Bc5": "Su alfil sale activo apuntando a f2.",
    "Ba7": "Conservan el alfil en la diagonal.",
    "Ne7": "Reagrupan el caballo rumbo a g6.",
    "Bd7": "Desarrollan el alfil y conectan sus piezas.",
    "exd4": "Cambian en el centro.",
    "Bb6": "Retiran el alfil conservándolo."
  },
  sicilian: {
    "c5": "¡La Siciliana! Pelean el centro de forma asimétrica, buscando contrajuego en la columna c.",
    "d6": "Sostienen c5-e5 y preparan …Nf6.",
    "cxd4": "Cambian su peón c por nuestro peón central: la idea de su apertura.",
    "Nf6": "Desarrollan atacando e4.",
    "a6": "La Najdorf: controlan b5 y preparan …e5 o …b5.",
    "e5": "Echan a nuestro caballo y reclaman el centro… dejando débil la casilla d5.",
    "Be6": "Desarrollan el alfil vigilando d5.",
    "Be7": "Preparan el enroque.",
    "O-O": "Enrocan… justo donde apuntará nuestra tormenta de peones.",
    "Nbd7": "Reagrupan apoyando …b5 y al caballo de f6.",
    "e6": "La Scheveningen: centro pequeño pero elástico.",
    "b5": "Lanzan su contrajuego en el flanco de dama.",
    "Bb7": "Su alfil presiona e4 desde la esquina.",
    "g6": "El Dragón: su alfil irá a g7.",
    "Bg7": "El alfil dragón llega a g7; nuestro ataque irá por el otro lado.",
    "Nc6": "Desarrollan presionando d4.",
    "d5": "Rompen en el centro buscando liberarse.",
    "Nxd5": "Recapturan en d5.",
    "bxc6": "Recapturan, pero su estructura queda tocada.",
    "Nxd4": "Cambian caballos en d4.",
    "gxf6": "Recapturan con el peón g: su enroque queda dañado.",
    "f5": "Buscan contrajuego contra e4.",
    "Qc7": "Dama a c7, la casilla siciliana típica: vigila e5 y apoya …b5."
  },
  queensgambit: {
    "d5": "Ocupan el centro frente a frente.",
    "e6": "El Gambito Declinado: sostienen d5 con solidez.",
    "Nf6": "Desarrollan defendiendo d5.",
    "Be7": "Cortan la clavada y preparan el enroque.",
    "O-O": "Ponen su rey a salvo.",
    "h6": "Preguntan a nuestro alfil de g5 qué piensa hacer.",
    "b6": "Preparan …Bb7 para defender d5 a distancia.",
    "Nxd5": "Recapturan con el caballo.",
    "Qxe7": "Recapturan el alfil con la dama.",
    "exd5": "Recapturan sosteniendo el centro, pero ese peón queda fijo y será nuestro objetivo.",
    "Nbd7": "Desarrollan apoyando …c5 o …e5.",
    "c6": "Refuerzan d5: la sólida estructura Carlsbad.",
    "Qa5": "El Cambridge Springs: su dama salta con amenazas sobre nuestro caballo de c3.",
    "c5": "Golpean nuestro centro.",
    "Nc6": "Desarrollan presionando d4.",
    "Bxc5": "Recapturan el peón con el alfil, que queda activo.",
    "dxc4": "El Gambito Aceptado: se llevan el peón; demostraremos que el centro vale más.",
    "Bf5": "Sacan el alfil activo antes de cerrar con …e6.",
    "Bb4": "Clavan nuestro caballo de c3 para presionar d5 y e4.",
    "b5": "Intentan quedarse con el peón de c4.",
    "a6": "Apoyan …b5 para retener el peón extra.",
    "Qxd1": "Cambian damas: vamos a un final que conocemos mejor.",
    "Bg4": "Clavan nuestro caballo de f3.",
    "Bxf3": "Cambian su alfil por el caballo.",
    "Qxd5": "Recapturan con la dama, que queda expuesta en el centro.",
    "e5": "Avanzan en el centro con ambición.",
    "d4": "Pasan el peón por el centro: gana espacio, pero lo convertiremos en objetivo.",
    "Qd7": "Conectan sus torres.",
    "O-O-O": "Enrocan largo: reyes en flancos opuestos, habrá carrera de ataques."
  },
  kingsindian: {
    "d4": "Ocupan el centro con el peón de dama.",
    "c4": "Toman más centro; les cedemos espacio… de momento.",
    "Nc3": "Desarrollan apoyando los avances d5 y e4.",
    "e4": "Montan un gran centro: nuestro plan es golpearlo después con …e5 o …c5.",
    "Nf3": "Desarrollan defendiendo d4.",
    "Be2": "Preparan el enroque: la Variante Clásica.",
    "O-O": "Ponen su rey a salvo… justo donde iremos con …f5.",
    "d5": "Cierran el centro: la señal para lanzar nuestro ataque de flanco.",
    "Ne1": "Reagrupan el caballo para jugar f3 y correr con sus peones del flanco de dama.",
    "Nd3": "Su caballo apoya el avance c5 en su flanco.",
    "f3": "Refuerzan e4 y blindan a su rey: cada bando ataca en un flanco.",
    "Be3": "Desarrollan preparando Qd2: la agresiva Sämisch.",
    "Qd2": "Conectan piezas con idea de enroque largo.",
    "O-O-O": "Enrocan largo: los reyes en flancos opuestos, gana quien llegue antes.",
    "Bf2": "Retiran el alfil a f2, guardando la defensa de d4 sin estorbar.",
    "f4": "Cuatro peones en el centro: impresiona, pero deja huecos que explotaremos.",
    "cxd5": "Capturan en d5 definiendo el centro.",
    "Bg5": "Su alfil presiona molestando a nuestro caballo de f6.",
    "exd5": "Recapturan en d5.",
    "h3": "Controlan g4 y dan aire a su rey.",
    "g4": "Lanzan sus peones contra nuestro rey: habrá que ser precisos.",
    "g3": "El fianchetto: su alfil irá a g2 a sostener el centro y su rey.",
    "Bg2": "Su alfil llega a g2, defendiendo rey y centro a la vez."
  }
};

const uncovered = new Set(); // "opId:san (user|rival)" sin porqué, para avisar

function buildLine(moves, sans, userIsWhite, name, ideas, rival, opId) {
  const b = startBoard();
  const side = userIsWhite ? "Las negras" : "Las blancas";
  const out = [];
  moves.forEach((mv, ply) => {
    const by = ((ply % 2 === 0) === userIsWhite) ? "user" : "engine";
    const sanClean = (sans[ply] || "").replace(/[+#!?]/g, "");
    let text;
    if (by === "user") {
      if (ideas && ideas[sanClean]) text = ideas[sanClean];
      else { text = userText(mv, b); uncovered.add(`${opId}: ${sanClean} (nuestra)`); }
    } else {
      // Descripción + porqué: TODAS las jugadas del rival llevan su intención.
      text = engineText(mv, b, side);
      if (rival && rival[sanClean]) text += " " + rival[sanClean];
      else uncovered.add(`${opId}: ${sanClean} (rival)`);
    }
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
    const toks = tokenize(line.san);
    try { moves = sanLineToMoves(toks); }
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
      moves: buildLine(moves, toks, userIsWhite, line.name, IDEAS[op.id], RIVAL[op.id], op.id),
    });
  });

  OUT.push({
    id: op.id, name: op.name, emoji: op.emoji, color: op.color,
    level: op.level, tag: op.tag || "", blurb: op.blurb, variations,
  });
  console.error(`${op.id}: ${variations.length} líneas`);
}

if (uncovered.size) {
  console.error(`\n⚠️  Jugadas SIN porqué (añádelas a IDEAS/RIVAL):`);
  [...uncovered].sort().forEach((u) => console.error("   " + u));
  problems += uncovered.size;
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
