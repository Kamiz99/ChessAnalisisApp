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
    "d4": "Abrimos con el peón de dama: controla e5 y c5 y, a diferencia de e4, nace ya defendido por la dama. Sobre esta base montamos siempre el mismo esquema: Bf4, e3, c3 y Bd3.",
    "Bf4": "Sacamos el alfil ANTES de cerrar con e3: si jugáramos e3 primero, quedaría encerrado en c1 toda la partida. Desde f4 controla e5, la casilla clave que luego ocupará nuestro caballo.",
    "e3": "Ahora sí, e3: apuntala d4, abre la diagonal al alfil de f1 y forma el triángulo c3-d4-e3, dificilísimo de atacar. El alfil de f4 ya está fuera: no pierde nada.",
    "Nf3": "El caballo va a su mejor casilla: controla e5 (nuestro futuro puesto avanzado) y g5, y no estorba a ningún peón. Desarrollo natural antes de decidir el plan.",
    "c3": "Tercer lado del triángulo: c3 refuerza d4 contra …c5 y …Nc6, y reserva c2/b3 para la dama. Con esto el centro queda blindado: el rival no tiene palancas fáciles.",
    "Bd3": "El alfil toma la diagonal b1-h7, la que mira al enroque rival. Si algún día desaparece el caballo de f6 o cae …h6, este alfil será el primero en cobrar.",
    "Be2": "Contra este esquema el alfil rinde más en e2: en d3 chocaría con …Bf5 o taparía la defensa de d4. Modesto pero útil: defiende, apoya y nos deja enrocar ya.",
    "h3": "Jugada pequeña con dos ideas: da al alfil de f4 el refugio h2 (por si viene …Nh5 a cambiarlo) y quita g4 a las piezas rivales. Conservar ese alfil es media partida.",
    "Nbd2": "Este caballo va por detrás: desde d2 apoya la ruptura e4, puede saltar a c4 o relevar al de f3 en e5. No tapa a nadie porque el alfil ya salió a f4.",
    "Ngf3": "Completamos los caballos: el de rey a f3, controlando e5 y g5. Con ambos conectados podemos elegir plan: Ne5 con f4, o preparar la ruptura e4.",
    "Ne5": "¡El salto soñado del Londres! El caballo se planta en e5 defendido por d4: si lo cambian, recapturamos y la casilla la hereda otra pieza. Desde ahí prepara f4 y el ataque al rey.",
    "Bg3": "Retirada importante: conservamos el alfil ante la amenaza de cambio. En g3 sigue en su diagonal y, si capturan, recapturamos con el peón h abriendo columna para la torre.",
    "O-O": "Rey a salvo antes del medio juego. La torre de f1 queda además lista para el plan: si luego saltamos a e5 y empujamos f4, esa torre apoyará el avance.",
    "Qb3": "La dama sale con doble idea: defiende b2 (que quedó sin alfil) y ataca b7 y d5 a la vez. Si el rival acepta el cambio de damas, vamos a un final mejor por su estructura.",
    "Qxb6": "Aceptamos el cambio de damas: tras …axb6 el rival queda con peones doblados y sin ataque posible. Un final tranquilo con mejor estructura es justo lo que busca el Londres.",
    "Bxd6": "Cambiamos porque su alfil de d6 era su mejor pieza y desafiaba la nuestra. Tras …Qxd6, las casillas negras (e5, f4) pasan a ser más nuestras que suyas.",
    "f4": "Fijamos el caballo de e5 con el peón: ya no se le puede echar con …f6 sin debilitar el rey. Ganamos espacio y preparamos g4 o la entrada de la torre según responda.",
    "exd4": "Recapturamos con el peón e: mantenemos un peón en d4 sosteniendo el centro y abrimos la columna e para la torre. El centro del Londres nunca se disuelve.",
    "Bxd3": "Recapturamos en d3 con el alfil: queda bien puesto en la diagonal atacante y no perdemos ni un tiempo. Cambio de piezas sin concesiones.",
    "Bh2": "El alfil se esconde en h2: parece pasivo, pero sigue vivo en la misma diagonal b8-h2 y ya nadie puede cambiárnoslo. Conservar este alfil es oro en el Londres.",
    "Nd2": "Desafiamos al caballo de e4: si lo cambia, desaparece su única pieza activa; si se retira, ha perdido dos tiempos. Nunca dejes un caballo rival plantado en tu campo.",
    "Qxd3": "Recapturamos con la dama, que queda activa mirando a h7 sin perder tiempo: el cambio de alfiles le costó al rival su defensor de las casillas blancas.",
    "hxg3": "Recapturamos con el peón h a propósito: la columna h se abre para nuestra torre y g3 refuerza el centro. Tomar con el peón f sería un error: dejaría el rey aireado."
  },
  italian: {
    "e4": "Abrimos con e4: libera alfil y dama de golpe y controla d5 y f5. Es la apertura que antes permite atacar, ideal para aprender a desarrollar con propósito.",
    "Nf3": "Desarrollo con amenaza: el caballo ataca e5 y obliga al rival a gastar su turno defendiendo. Cada jugada nuestra pide algo a cambio: así se gana la iniciativa.",
    "Bc4": "El alfil apunta a f7, el único punto que solo defiende su rey. Aún no amenaza nada, pero todas las tácticas futuras (Ng5, sacrificios en f7) nacen de esta diagonal.",
    "c3": "Preparamos d4: cuando rompamos en el centro, este peón recapturará y mantendremos un peón central. De paso, el alfil gana la retirada c2 por si viene …Na5.",
    "d3": "Renunciamos al d4 inmediato a cambio de solidez: e4 queda defendido y maniobramos sin darle nada que atacar. El plan largo: Nbd2-f1-g3 y entonces sí, d4.",
    "O-O": "Rey a salvo y torre conectada. En posiciones lentas como esta gana quien completa el desarrollo primero: podrá abrir el centro en el momento que más le convenga.",
    "Re1": "La torre se coloca tras el peón e: defiende e4 de una vez y, cuando el centro se abra, ya estará en la columna importante. Piezas bien puestas ANTES de que pase nada.",
    "Nbd2": "Empieza la gran maniobra: este caballo viajará d2→f1→g3. Parece lento, pero acabará en la mejor casilla de ataque sin haber estorbado a ninguna pieza propia.",
    "Nf1": "Segundo paso del viaje: en f1 el caballo no bloquea nada y elige destino, g3 (mirando f5 y h5) o e3 (mirando d5). El rival no puede impedir ninguno de los dos.",
    "Ng3": "Destino alcanzado: desde g3 el caballo vigila f5 y h5, las casillas de ataque contra el enroque. Junto al alfil de c4, la fase agresiva está lista.",
    "h3": "Control de g4: evitamos la clavada …Bg4, que ataría nuestro caballo justo cuando preparamos la ruptura d4. Un tiempo pequeño que compra mucha tranquilidad.",
    "a4": "Frenamos …b5 antes de que ocurra: el rival quería ganar espacio y echar a nuestro alfil. A veces seguiremos con a5, fijando sus peones como debilidades.",
    "Ng5": "¡Golpe directo a f7! Caballo y alfil atacan juntos el punto que solo defiende el rey. El rival está obligado a responder con precisión extrema o pierde material de salida.",
    "exd5": "Capturamos en el centro: su peón desaparece y nuestra ventaja de desarrollo se convierte en líneas abiertas. Con más piezas activas, cada apertura de la posición nos favorece.",
    "Bb5+": "Jaque intermedio que gana un tiempo entero: el rival debe tapar antes de poder recuperar nada, y la pieza que tape quedará clavada. Un jaque no admite réplica.",
    "dxc6": "Capturamos rompiendo su estructura: recapture con lo que recapture, sus peones del flanco de dama quedan doblados y débiles para todo el final.",
    "Be2": "Retirada sana: guardamos el alfil de los caballos rivales, mantenemos el peón de más y que sea el rival quien demuestre compensación. Con material extra, la solidez gana.",
    "Ne5": "El caballo ocupa el centro y ataca: desde e5 presiona c6 y f7 a la vez. El rival entregó un peón por actividad, y cada cambio de piezas se la va apagando.",
    "d4": "¡La ruptura preparada! Todo estaba listo: c3 recaptura, Re1 apoya y el rival aún no terminó el desarrollo. Abrimos el centro exactamente cuando más nos conviene.",
    "Nxd4": "Recapturamos centralizando: el caballo en d4 controla medio tablero y ningún peón puede echarlo. De aquí saldrán saltos a f5 o b5 en cuanto el rival se descuide.",
    "Nc3": "El caballo completa el desarrollo sumándose al control de d5: junto con e4 impedimos …d5, su única ruptura liberadora. Sin ella, el rival queda pasivo.",
    "Bb5": "El alfil presiona al caballo de c6, el defensor de e5 y d4: amenazamos cambiarlo y quedarnos el control del centro. Presión concreta sobre el punto que sostiene su posición."
  },
  ruylopez: {
    "e4": "Abrimos con el peón de rey: control de d5 y f5 y salida inmediata de alfil y dama. Toda la Española nace de esta jugada y de la presión constante sobre e5.",
    "Nf3": "Atacamos e5 de inmediato: el rival queda atado a defender ese peón desde la jugada dos. Esa pequeña obligación es la semilla de toda la presión española.",
    "Bb5": "¡La Española! El alfil ataca al caballo que defiende e5: amenaza indirecta de ganar el peón. No es amenaza inmediata todavía, pero condiciona todas sus jugadas desde ya.",
    "Ba4": "Mantenemos la presión: la retirada a a4 conserva el ataque sobre c6. Si algún día cambiamos en c6 para ganar e5, será cuando a NOSOTROS nos convenga.",
    "O-O": "Enrocamos aunque e4 parezca colgar: si el rival lo toma, Re1 y d4 recuperan el peón con ventaja de desarrollo. Está comprobado desde hace un siglo: no hay peligro.",
    "Re1": "La torre defiende e4 y se coloca en la columna que va a abrirse. A partir de ahora la amenaza Bxc6 seguida de Nxe5 es real, porque …Nxe4 ya no funciona.",
    "Bb3": "El alfil retrocede a su diagonal soñada: b3-f7, apuntando al talón de Aquiles del enroque. Ya nadie lo molesta más; desde aquí jugará toda la partida.",
    "c3": "Doble función: prepara la gran ruptura d4 (recapturando con peón) y da al alfil la casilla c2 por si viene …Na5. Todo el plan blanco pasa por ese d4.",
    "h3": "Profilaxis antes de d4: evitamos …Bg4, que clavaría el caballo y presionaría el centro justo cuando queremos avanzarlo. Ahora sí está todo listo.",
    "d4": "La ruptura central de la Española con todo preparado: c3 recaptura, Re1 apoya, h3 impidió la clavada. Del centro abierto saldrá nuestra ventaja de espacio.",
    "Bc2": "Retirada flexible: el alfil se guarda de …Na5 y …c4 sin abandonar la diagonal b1-h7. Reaparecerá con fuerza cuando la dama se le una mirando a h7.",
    "d3": "El Anti-Berlinés: renunciamos al famoso final berlinés y jugamos ajedrez de verdad: mantener piezas, maniobrar mejor y ganar la partida larga. Sólido y ambicioso.",
    "Nbd2": "La maniobra clásica española: d2→f1→g3. El caballo acabará atacando el enroque sin haber estorbado nunca a sus compañeras. La Española premia al que sabe esperar.",
    "Nc3": "Desarrollo natural sumando control sobre d5: con e4 y este caballo dominamos las casillas centrales blancas y preparamos saltos a d5 o f5.",
    "Nxd4": "Recapturamos con el caballo, centralizado y estable: desde d4 vigila c6, e6 y f5. El rival tendrá que gastar tiempos solo para echarlo de ahí."
  },
  sicilian: {
    "e4": "Abrimos con e4. Contra la Siciliana la lucha es asimétrica: nosotros atacamos al rey, el rival busca su juego en la columna c. Nos conviene: nuestro ataque llega antes.",
    "Nf3": "Desarrollamos preparando d4: cuando cambiemos ahí, el caballo recapturará centralizado. Vamos a la Siciliana Abierta: espacio y ataque a cambio de cederle la columna c.",
    "d4": "El golpe que define la Abierta: cambiamos nuestro peón d por su peón c. Ganamos centro y desarrollo; él gana su columna. La carrera está en marcha y vamos primeros.",
    "Nxd4": "Recapturamos centralizando: el caballo domina el tablero desde d4. Aguantará ahí hasta que …Nc6 o …e5 lo pregunten, y para entonces ya sabremos su siguiente casilla.",
    "Nc3": "Defendemos e4 y completamos la pareja de caballos: con el centro asegurado, podremos elegir el plan de ataque según lo que enseñe el rival.",
    "Be3": "La pieza clave del Ataque Inglés: desde e3 el alfil apoya d4, mira a b6 y deja paso a Qd2 con enroque largo. Luego, los peones g y h serán proyectiles contra su rey.",
    "f3": "Tres ideas en una: sostiene e4 (liberando al caballo de c3 para atacar), quita g4 a las piezas rivales y prepara el avance g4. Es el andamiaje de la tormenta.",
    "Qd2": "La dama conecta con el alfil de e3 (ambos miran ya a h6), permite el enroque largo y dirigirá el avance g4-h4-g5. Todo el ejército apunta al mismo objetivo.",
    "O-O-O": "Enroque largo: el rey queda a cubierto en el otro flanco y la torre cae directa a la columna d, presionando el centro. Ahora empujar los peones del flanco de rey sale gratis.",
    "g4": "¡Empieza la tormenta! g4-g5 echará al caballo de f6, el mejor defensor de su rey. Cada avance nuestro vale doble: ataca y no debilita nada, porque nuestro rey vive en el otro lado.",
    "Bg5": "El Richter-Rauzer: clavamos el caballo de f6, pilar de su defensa. Mientras esté clavado no pelea por d5 ni e4, y su desarrollo entero queda incómodo.",
    "Nb3": "Retiramos el caballo a tiempo: en d4 era blanco de …e5 y de cambios que alivian al rival. En b3 sigue útil (vigila a5 y c5) y nuestro ataque continúa sin pausas.",
    "Ndb5": "¡Salto agresivo! El caballo ataca d6 y el rival solo puede cubrirlo debilitándose. Le forzamos a definir su posición antes de tiempo sin conceder nada a cambio.",
    "Na3": "El caballo se recoloca: desde a3 irá a c4, donde muerde d6 y b6, exactamente los huecos que dejó su avance …e5. Cada debilidad rival ya tiene pieza asignada.",
    "Bxf6": "Entregamos la clavada a cambio de estructura: tras …gxf6 su enroque queda roto y, sobre todo, d5 se convierte en casa eterna para nuestro caballo. Cambio ganador.",
    "Nd5": "¡El caballo llega a d5, la casilla soñada de toda Siciliana! Ningún peón puede echarlo y desde ahí toca c7, e7 y f6. Una pieza así domina la partida entera.",
    "exd5": "Recapturamos abriendo el centro: nuestra columna e cobra vida y el cambio le costó al rival una pieza defensiva. La posición se abre justo donde estamos mejor.",
    "Nxc6": "Cambiamos en c6 con idea concreta: tras …bxc6 sus peones quedan doblados y su columna c, la del contrajuego siciliano, medio cerrada. Le quitamos el plan, no solo una pieza.",
    "Bd4": "Centralizamos el alfil frente al dragón: neutraliza la gran diagonal de su alfil de g7 y apunta a su rey. Sin esa diagonal, el dragón se queda sin dientes.",
    "f4": "Ganamos espacio y preparamos e5, la ruptura que abriría la posición delante de su rey. El rival debe vigilar dos amenazas a la vez; nosotros, ninguna.",
    "Qxd4": "Recapturamos con la dama centralizada: domina el tablero y nada la molesta (…Nc6 ya no existe para echarla). Dama activa más desarrollo es iniciativa duradera."
  },
  queensgambit: {
    "d4": "Abrimos con el peón de dama: nace ya protegido por la dama, así que nadie puede atacarlo con ganancia. El juego de dama es presión constante sin riesgos innecesarios.",
    "c4": "El Gambito de Dama: ofrecemos un peón lateral por el dominio del centro. No es un sacrificio real: si lo toman, siempre lo recuperamos, y con mejor centro y desarrollo.",
    "Nc3": "Sumamos otro atacante a d5: esa presión es el tema de toda la apertura. Cuando d5 caiga o se cambie, el centro completo pasará a ser nuestro.",
    "Nf3": "Desarrollo flexible: controla e5 y refuerza d4 sin comprometer ningún plan. En el Gambito de Dama, las jugadas naturales suelen ser también las mejores.",
    "Bg5": "Presión indirecta sobre d5: clavamos al caballo de f6, su defensor. No atacamos el peón otra vez: atacamos a quien lo defiende. Así se presiona de verdad.",
    "e3": "Consolidamos: e3 sostiene d4 y abre la diagonal del alfil de f1 hacia c4 o d3. La estructura queda lista para reaccionar a cualquier plan rival.",
    "cxd5": "El cambio que define la partida: tras …exd5 su peón queda fijo en d5 para siempre. Plan claro hasta el final: piezas contra ese peón y el ataque de minorías con b4-b5.",
    "Bxc4": "Recuperamos el peón del gambito, como estaba previsto. Y fíjate dónde queda el alfil: activo y apuntando a f7. El rival cedió el centro a cambio de nada duradero.",
    "g3": "Preparamos el fianchetto: el alfil en g2 presionará d5 toda la partida desde lejos, donde nadie puede cambiárselo. Contra un peón débil, presión de largo alcance.",
    "Bg2": "El alfil llega a la gran diagonal: cada cambio de piezas nos acerca al final donde su peón de d5 será una debilidad crónica y este alfil, su verdugo.",
    "O-O": "Rey a salvo y torres conectadas: con la seguridad resuelta, toda la energía va a aumentar la presión sobre el centro sin distracciones.",
    "a4": "Impedimos …b5: el rival pretendía sostener su peón extra de c4 con la cadena b5-c4. Sin ese recurso, el peón cae solo y su expansión queda congelada.",
    "Bh4": "Mantenemos la clavada: retirarse sí, soltarla jamás. El caballo de f6 sigue atado y d5 sigue sufriendo. La clavada, con paciencia, rinde intereses.",
    "Bxe7": "Cambiamos en e7 en el momento justo: simplificamos hacia una posición donde nuestra mejor estructura pesa cada vez más y su contrajuego no existe.",
    "Nxd5": "Cobramos en d5: el punto presionado durante toda la apertura por fin cede. Tras las recapturas, al rival le quedan debilidades y a nosotros, las columnas abiertas.",
    "Qd2": "La dama conecta las torres y apoya a sus piezas menores: todo coordinado. En posiciones de presión, la coordinación vale más que cualquier golpe brillante.",
    "dxc5": "Capturamos transformando la posición: le damos piezas activas a cambio de que su peón d5 quede aislado. Nuestras piezas ya saben su trabajo: rodearlo entre todas.",
    "Bd2": "Neutralizamos la clavada sin concesiones: cuando cambie en c3, recapturamos con este alfil y nos quedamos la pareja de alfiles para el final.",
    "gxf3": "Recapturamos con el peón g a propósito: se abre la columna g para las torres y conservamos la pareja de alfiles. El enroque parece aireado; con la pareja, es una fortaleza.",
    "Rxd1": "Recapturamos con la torre, que entra a la columna abierta: en el final deciden la torre activa y el desarrollo. Ventaja técnica: la más segura de convertir.",
    "Bd3": "El alfil toma la diagonal hacia h7: desarrollo completo y primer aviso al enroque rival. En cuanto el centro se abra, esta pieza cobra.",
    "dxe5": "Castigamos su avance capturando: su peón central desaparece y las líneas se abren para nuestras piezas, que están mejor desarrolladas. Avanzar antes de tiempo se paga."
  },
  kingsindian: {
    "Nf6": "Empezamos flexibles: el caballo controla e4 y d5 sin revelar todavía nuestro plan. La India de Rey cede el centro a propósito… para dinamitarlo después.",
    "g6": "Preparamos el fianchetto: nuestro alfil irá a g7 y disparará por la gran diagonal contra el centro que el rival está construyendo. Que edifique: la carga ya está puesta.",
    "Bg7": "El alfil de la India: desde g7 presiona d4 y e5, y de paso blinda nuestro futuro enroque. Toda la estrategia gira en torno a activar esta diagonal con …e5 o …c5.",
    "d6": "Apoyo imprescindible para la ruptura …e5 que viene, y apertura de la diagonal del alfil de c8. En la India cada peón prepara el contragolpe.",
    "O-O": "Rey a salvo ANTES de abrir hostilidades: cuando lancemos …e5 y …f5 el centro puede volar por los aires, y el rey debe estar ya resguardado tras su fianchetto.",
    "e5": "¡El contragolpe! Desafiamos su centro: si captura, la posición se abre para nuestro alfil de g7; si avanza d5, cierra el centro y nos regala el plan …f5 con ataque al rey.",
    "Nc6": "Presionamos d4 una vez más y forzamos al rival a definirse: si empuja d5, este caballo saltará a e7 para apoyar …f5. Todas nuestras piezas están conectadas al plan.",
    "Ne7": "El caballo se recoloca: desde e7 apoyará …f5, el avance de nuestra vida. En la India cerrada cada pieza tiene su casilla asignada en el ataque.",
    "Nd7": "Reagrupamos: el caballo deja libre el camino del peón f y sigue defendiendo e5. Parece un retroceso; es el paso previo obligado de …f5.",
    "f5": "¡Nuestro ataque en marcha! El peón f desafía e4 y abre la fábrica: …f4, …g5, …g4 contra su rey. Mientras el rival juega en la otra punta, aquí se decide la partida.",
    "Nh5": "El caballo despeja el camino del peón f y apunta a f4: si lo cambian, recapturamos abriendo aún más líneas. Todo empuja hacia su rey.",
    "f4": "Cerramos el flanco ganando espacio: ahora la palanca es …g5-…g4. Su alfil de c1 queda mordiendo granito y nuestro ataque tiene todas las llaves.",
    "c5": "Golpeamos su centro por el otro costado antes de que lo consolide: si cambia, su d4 desaparece y nuestro alfil respira; si avanza, fijamos el objetivo a batir.",
    "exd5": "Capturamos abriendo líneas: contra un gran centro, cada cambio de peones activa más nuestro alfil de g7. La diagonal se va despejando pieza a pieza.",
    "Bg4": "Clavamos al caballo que defiende d4: actividad inmediata mientras el rival todavía organiza su posición. La presión sobre su centro crece.",
    "Re8": "La torre se suma al plan central: apoya …e5 (y un futuro …e4) desde la columna que se va a abrir. Primero las piezas, después las aventuras.",
    "Na6": "Desarrollo por el borde con destino claro: c5 o c7, presionando el flanco de dama sin tapar ni al alfil ni al peón c. En la India nada es casual.",
    "Qe8": "Maniobra típica india: la dama se desliza a e8 para apoyar …f5 y luego asomar por g6 o h5 al ataque. Viaja al flanco de rey por el pasillo de atrás.",
    "Nbd7": "Reagrupamos apoyando …e5 sin tapar al alfil de g7: los caballos indios trabajan desde la segunda fila hasta que llega la hora del salto.",
    "c6": "Jugada elástica: sostiene d5 en unos planes y prepara …Qb6 o …d5 en otros. Guardamos todas las opciones mientras el rival se define primero.",
    "Qb6": "La dama presiona b2 y d4 a la vez, aprovechando la diagonal que abrió el fianchetto rival: defender las dos cosas ya le exige contorsiones.",
    "e6": "Desafiamos la punta de su cadena (d5): si cambia, abrimos la columna e a nuestro favor; si aguanta, seguiremos picando ahí. Las cadenas se atacan por la cabeza."
  },
  zukertort: {
    "d4": "Abrimos con el peón de dama, protegido desde el primer momento. El Zukertort es un SISTEMA: las mismas jugadas buenas casi juegue lo que juegue el rival.",
    "Nf3": "Caballo a f3: controla e5 (donde luego SALTARÁ) y no compromete nada. Segunda pieza del esquema, siempre igual.",
    "e3": "e3 abre la diagonal del alfil de f1 y apuntala d4. La cadena pequeña pero de hierro sobre la que se apoya todo el sistema.",
    "Bd3": "El alfil a la diagonal que mira al enroque rival (b1-h7): será la pieza estrella cuando llegue el ataque con Ne5 y f4.",
    "b3": "La firma del Zukertort: preparamos el fianchetto Bb2. Ese alfil vigilará e5 desde lejos y hará imparable el salto del caballo.",
    "Bb2": "El alfil a la gran diagonal: desde b2 sostiene el futuro caballo de e5 y apunta al rey rival a través de medio tablero.",
    "O-O": "Rey a salvo. Con el esquema montado y el rey seguro, llega la parte divertida: Ne5, f4 y el ataque.",
    "Nbd2": "El caballo de dama por detrás: apoya e4 si hace falta y, sobre todo, puede RELEVAR al de f3 en e5 si lo cambian. El puesto siempre queda ocupado.",
    "Ne5": "¡El salto del sistema! El caballo se planta en e5 sostenido por d4 y el alfil de b2: si lo cambian, recapturamos y el puesto lo hereda el otro caballo. Ahora vienen f4 y el ataque.",
    "exd4": "Recapturamos con el peón e: la columna e se abre para nuestra torre y d4 queda firme. El cambio le dio aire… a nuestras piezas.",
    "Qxd3": "Recapturamos con la dama, que queda en la diagonal atacante sin perder tiempo: el rival nos colocó la dama gratis.",
    "Be2": "Contra el fianchetto el alfil rinde mejor en e2: en d3 no muerde nada. El sistema se adapta sin cambiar de plan.",
    "c4": "Con su …e5 en el aire, golpeamos d5 por el flanco: obligamos a definir el centro justo cuando le pilla a medias.",
    "dxe5": "Capturamos en e5: castigamos su ruptura abriendo la posición con nuestras piezas mejor puestas.",
    "Nxe5": "Cambiamos en e5 sin miedo: cada cambio nos deja mejor estructura y la torre rival acabará expuesta en e5.",
    "Nd2": "El caballo reta a la torre plantada en e5: tendrá que retirarse con tiempo perdido, y el caballo irá luego a f3 o c4.",
    "f4": "¡Fijamos el caballo de e5 con el peón! Espacio, ataque y el plan de siempre: torre por f3 o g4 según responda. El Zukertort en pleno vuelo."
  },
  carokann: {
    "c6": "La Caro-Kann: preparamos …d5 con apoyo. Su gran secreto: nuestro alfil de c8 saldrá ANTES de cerrar con …e6 — la muralla, pero sin pieza mala.",
    "d5": "Golpeamos e4 con todo preparado: c6 sostiene d5. Que decida el rival: avanzar, cambiar o defender; tenemos respuesta cómoda para cada una.",
    "dxe4": "Capturamos en e4: obligamos al caballo a recapturar y ganaremos tiempos golpeándolo después. Nuestra estructura quedará sin una sola debilidad.",
    "Bf5": "¡La jugada que define la Caro! El alfil sale LIBRE antes de …e6, atacando de paso al caballo. En otras defensas este alfil muere en c8; aquí es una pieza feliz.",
    "Bg6": "Retiramos el alfil sin soltar la diagonal: en g6 sigue vigilando b1-h7. El rival gastó otro tiempo en molestarlo; nosotros no perdimos nada.",
    "h6": "Respondemos al avance del peón: abrimos h7 como refugio para el alfil y evitamos que g5 llegue con ganancia. Su plan de cazarlo se queda sin premio.",
    "Bh7": "El alfil se guarda en h7: intocable y aún apuntando por la misma diagonal. El rival invirtió tres tiempos en peones; nosotros desarrollamos mientras tanto.",
    "Bxd3": "Cambiamos alfiles encantados: era su pieza de ataque y la nuestra ya cumplió su misión. Sin alfiles de casillas blancas, nuestra muralla es inatacable.",
    "e6": "Ahora sí, …e6: la muralla queda completa con el alfil YA fuera. Esa es la diferencia con otras defensas: solidez total sin pieza encerrada.",
    "Nd7": "El caballo de dama a d7: apoya al hermano que irá a f6 (si lo cambian, recapturamos con pieza) y no estorba a nuestro alfil, que ya está fuera.",
    "Ngf6": "El caballo de rey a f6, su mejor casilla: controla e4 y d5 y prepara el enroque. El otro caballo ya apoya desde d7.",
    "Be7": "Alfil a e7 y a enrocar: desarrollo completo sin debilidades. El plan Caro: igualar con la mejor estructura y superar en el final.",
    "Ne7": "Con el centro cerrado, maniobramos por detrás: el caballo viaja por e7 hacia f5 o g6, las casillas buenas de esta estructura.",
    "cxd5": "Recapturamos con el peón c hacia el centro: estructura simétrica y sanísima. El Cambio no asusta a la Caro-Kann.",
    "Nc6": "Desarrollamos presionando d4: en esta estructura nuestro juego corre por la columna c y el control de las casillas centrales.",
    "Nf6": "Caballo a f6: controla e4, desarrolla y prepara el enroque. Pieza a su mejor casilla, sin inventos.",
    "Bg4": "El alfil sale ANTES de …e6 y de paso clava al caballo de f3: presión sobre d4 y, de nuevo, ni rastro de alfil malo.",
    "Na5": "¡Contraataque con tempo! El caballo toca a su dama: mientras ella huye, nosotros nos reorganizamos gratis.",
    "Bd7": "Bloqueamos el jaque sin perder nada: su dama tendrá que volver a moverse y el duelo de tiempos lo ganamos nosotros.",
    "Bb4": "Clavamos el caballo de c3 justo cuando quería empujar el centro: en el Panov el contrajuego rápido es obligatorio, y este alfil lo trae.",
    "Nxd5": "Recapturamos con el caballo, centralizado: el rival tiene actividad, pero su peón aislado de d4 será nuestra diana en el final.",
    "O-O": "Rey a salvo. Con la estructura sólida y las piezas fuera, cada cambio nos acerca a un final mejor: ese es el plan de la Caro.",
    "Bxf3": "Cambiamos alfil por caballo a propósito: su dama recaptura lejos de su sitio y d4 pierde un defensor. Estructura antes que pareja de alfiles.",
    "e5": "¡Reclamamos el centro entero! Con d5 y e5 tomamos lo que el rival cedió con su tímido d3. Contra sistemas pasivos, el castigo es ocupar.",
    "Bd6": "El alfil, a su diagonal más activa: apunta al flanco de rey y sostiene e5. Desarrollo con amenazas latentes.",
    "Re8": "La torre a la columna e: apoya e5 y estará lista cuando se abra. El rival juega sin espacio; nosotros, con todo el centro."
  },
  slav: {
    "d5": "Plantamos el peón de dama frente a frente: centro reclamado desde la primera jugada. La Eslava es la respuesta más sólida y ambiciosa al peón de dama.",
    "c6": "Sostenemos d5 con el peón c SIN encerrar al alfil de c8: la gran idea eslava. Y si toman en d5, recapturamos hacia el centro.",
    "Nf6": "Caballo a f6: desarrolla, controla e4 y prepara el enroque. Lo natural, que en la Eslava es también lo mejor.",
    "dxc4": "¡Ahora sí tomamos en c4! Con sus caballos ya comprometidos, recuperar el peón le costará tiempos… que usaremos para sacar el alfil libre con …Bf5.",
    "Bf5": "El alfil sale LIBRE antes de …e6: la razón de ser de la Eslava. Controla e4 y jamás habrá «alfil malo» en nuestra posición.",
    "e6": "Cerramos la muralla con el alfil ya fuera: estructura sin una sola debilidad y desarrollo cómodo.",
    "Bb4": "Clavamos el caballo de c3: presiona e4 y prepara el enroque. Pieza activa antes de cerrar la casa.",
    "O-O": "Rey a salvo. Nuestra posición no tiene debilidades: ahora, a jugar contra las suyas.",
    "Nbd7": "El caballo de dama a d7: apoya …c5 y …e5, las rupturas que activarán nuestra posición en el momento justo.",
    "b5": "¡Defendemos el peón de c4 con ambición! Recuperarlo le costará varios tiempos, y cada tiempo suyo es desarrollo nuestro.",
    "b4": "El peón sigue adelante echando al caballo: su pieza acaba en el rincón mientras nosotros conservamos el material un rato más.",
    "Be7": "Alfil a e7 y a enrocar, sin lujos: la ventaja de la Eslava es que las jugadas naturales son las buenas.",
    "Nd5": "El caballo esquiva el ataque centralizándose: en d5 está apoyado, molesta, y mira a c3, el punto débil de su expansión.",
    "Nxc3": "Cambiamos en c3 dañando su estructura: peones doblados para siempre y su gambito se queda sin compensación clara.",
    "cxb5": "Recapturamos y el recuento es claro: peón de más y estructura firme. Su iniciativa tendrá que demostrar demasiado.",
    "cxd5": "Recapturamos hacia el centro: simetría total y ni una debilidad. En el Cambio eslavo gana quien mejor coloque las piezas.",
    "Nc6": "Desarrollamos presionando d4: en la simetría, la actividad de las piezas es lo único que marca diferencias.",
    "Bxd3": "Cambiamos los alfiles de casillas blancas: su pieza más peligrosa desaparece y nuestra muralla queda intacta.",
    "dxe4": "Capturamos en e4 aceptando el duelo central con la estructura ya lista: tras el cambio, posición igualada y comodísima."
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
  },
  zukertort: {
    "d5": "Ocupan su parte del centro.",
    "Nf6": "Desarrollan controlando e4.",
    "e6": "Abren la salida de su alfil de rey.",
    "c5": "Golpean d4 desde el flanco.",
    "Nc6": "Desarrollan presionando d4.",
    "Bd6": "Su alfil apunta a nuestro flanco de rey.",
    "O-O": "Ponen su rey a salvo.",
    "Qe7": "Conectan piezas y preparan …e5.",
    "cxd4": "Cambian en d4 aliviando la tensión.",
    "Be7": "Desarrollo modesto del alfil.",
    "b6": "Preparan su propio fianchetto con …Bb7.",
    "Bb7": "Su alfil presiona por la diagonal larga.",
    "Bf5": "Sacan el alfil activo antes de …e6.",
    "Bxd3": "Cambian los alfiles de casillas blancas.",
    "Nbd7": "Desarrollan apoyando …e5 o …c5.",
    "e5": "Rompen en el centro: era su plan.",
    "Re8": "Su torre apoya la ruptura …e5.",
    "g6": "Preparan el fianchetto de su alfil de rey.",
    "Bg7": "Su alfil llega a g7, a la diagonal larga.",
    "d6": "Sostienen el centro y preparan …e5.",
    "Nxe5": "Recapturan en e5.",
    "Rxe5": "Recapturan con la torre… que queda expuesta en el centro.",
    "c6": "Refuerzan d5 con solidez."
  },
  carokann: {
    "e4": "Toman el centro; les responderemos con la muralla c6-d5.",
    "d4": "Montan el centro doble: perfecto, ahora lo golpeamos con …d5.",
    "Nc3": "Defienden e4 desarrollando.",
    "e5": "El Avance: ganan espacio, pero fijan el centro y nos dicen dónde jugar.",
    "exd5": "El Cambio: alivian la tensión y nos regalan una estructura sanísima.",
    "d3": "Sistema tímido: no pelean el centro, así que lo ocuparemos nosotros.",
    "Nd2": "Preparan un desarrollo lento, tipo India de Rey.",
    "Nxe4": "Recapturan con el caballo… que ahora será nuestro blanco de tiempos.",
    "Ng3": "Retiran el caballo atacando a nuestro alfil.",
    "h4": "Lanzan el peón a cazar al alfil: espacio a cambio de debilidades.",
    "Nf3": "Desarrollan el caballo de rey.",
    "h5": "Insisten con el peón: obligan al alfil a decidirse.",
    "Bd3": "Ofrecen el cambio de los alfiles de casillas blancas.",
    "Qxd3": "Recapturan con la dama.",
    "O-O": "Ponen su rey a salvo.",
    "Re1": "Torre a la columna e, presionando el centro.",
    "Be2": "Desarrollo modesto del alfil.",
    "Nbd2": "Reagrupan el caballo por detrás.",
    "c3": "Apuntalan d4.",
    "Bf4": "El alfil sale activo a f4.",
    "Qb3": "Su dama ataca b7 y d5 a la vez: respondemos con precisión.",
    "Qa4": "Jaque intermedio buscando descolocarnos.",
    "Qc2": "Su dama se retira: el duelo de tiempos lo hemos ganado nosotros.",
    "c4": "El Ataque Panov: juego activo a cambio de un peón aislado.",
    "cxd5": "Capturan en d5.",
    "Bd2": "Cortan la clavada con el alfil.",
    "h3": "Preguntan a nuestro alfil de g4 qué piensa hacer.",
    "Qxf3": "Recapturan con la dama, que queda algo expuesta.",
    "Ngf3": "Desarrollan el caballo de rey.",
    "g3": "Fianchetto: su alfil irá a g2.",
    "Bg2": "Su alfil llega a g2… mirando a un centro que ya es nuestro."
  },
  slav: {
    "d4": "Abren con el peón de dama.",
    "c4": "El Gambito de Dama: presionan d5 desde el flanco.",
    "Nf3": "Desarrollan el caballo de rey.",
    "Nc3": "Suman presión sobre d5.",
    "a4": "Frenan …b5 para poder recuperar el peón: a cambio debilitan b4.",
    "e3": "Abren la salida del alfil de f1 y sostienen d4.",
    "Bxc4": "Recuperan por fin su peón: nos pagó con tiempos de desarrollo.",
    "O-O": "Ponen su rey a salvo.",
    "Qe2": "Conectan piezas y preparan la expansión e4.",
    "e4": "Expansión central ambiciosa… quizá demasiado.",
    "e5": "Avanzan echando a nuestro caballo.",
    "axb5": "Capturan en b5 abriendo la columna a.",
    "bxc3": "Recapturan con peones doblados: cicatriz permanente.",
    "Na2": "Su caballo acaba en el rincón: mala señal para su gambito.",
    "cxd5": "El Cambio eslavo: simetría total.",
    "Bf4": "El alfil sale activo antes de cerrar.",
    "Qb3": "Su dama presiona b7 y nuestro alfil de b4.",
    "Bb5": "Clavan a nuestro caballo de c6.",
    "Bd3": "Ofrecen el cambio de alfiles.",
    "Qxd3": "Recapturan con la dama.",
    "Nxe4": "Recapturan en e4 con el caballo.",
    "g3": "Fianchetto: su alfil irá a g2 a presionar el centro.",
    "Bg2": "Su alfil llega a la gran diagonal.",
    "Qc2": "Su dama sale pronto a c2: esquiva la teoría, pero pierde tiempo.",
    "Qxc4": "Recuperan el peón con la dama, que queda expuesta."
  }
};

// ---- Partidas de GM (reales y verificadas) --------------------------------
// SOLO clásicos cuyas jugadas están fuera de toda duda. Si una apertura no
// tiene partida verificada, la app muestra «próximamente» — nunca inventamos.
const GAMES = {
  italian: [
    { white: "Gioachino Greco", black: "NN", event: "Roma", year: 1620, result: "1-0",
      note: "El castigo clásico a la codicia: las negras comieron en c3 y a1 y el ataque blanco fue imparable tras 12.Bg5.",
      san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Nxc3 9. bxc3 Bxc3 10. Qb3 Bxa1 11. Bxf7+ Kf8 12. Bg5" }
  ],
  ruylopez: [
    { white: "Anatoly Karpov", black: "Wolfgang Unzicker", event: "Olimpiada de Niza", year: 1974, result: "1-0",
      note: "La Española Cerrada de manual: Karpov maniobró sin prisa (a4, Nbd2-f1-g3) y asfixió pieza a pieza. Modelo eterno del plan blanco.",
      san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Na5 10. Bc2 c5 11. d4 Qc7" }
  ],
  queensgambit: [
    { white: "Bobby Fischer", black: "Boris Spassky", event: "Mundial de Reikiavik (6ª partida)", year: 1972, result: "1-0",
      note: "Considerada una de las partidas más perfectas de Fischer: presión creciente sobre d5 hasta la victoria. Hasta Spassky aplaudió.",
      san: "1. c4 e6 2. Nf3 d5 3. d4 Nf6 4. Nc3 Be7 5. Bg5 O-O 6. e3 h6 7. Bh4 b6 8. cxd5 Nxd5 9. Bxe7 Qxe7 10. Nxd5 exd5 11. Rc1 Be6" }
  ],
  carokann: [
    { white: "Deep Blue", black: "Garry Kasparov", event: "Nueva York (6ª partida)", year: 1997, result: "1-0",
      note: "La máquina sacrificó el caballo en e6 y Kasparov se rindió en la jugada 19. Moraleja: en la variante …Nd7 (que NO jugamos), el orden importa.",
      san: "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Ng5 Ngf6 6. Bd3 e6 7. N1f3 h6 8. Nxe6" }
  ],
  sicilian: [
    { white: "Anatoly Karpov", black: "Garry Kasparov", event: "Mundial de Moscú (16ª partida)", year: 1985, result: "0-1",
      note: "El gambito de Kasparov: plantó un caballo eterno en d3 («el pulpo») y firmó una inmortal. La Siciliana en estado puro: actividad sobre material.",
      san: "1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nc6 5. Nb5 d6 6. c4 Nf6 7. N1c3 a6 8. Na3 d5" }
  ],
  kingsindian: [
    { white: "Milko Bobotsov", black: "Mihail Tal", event: "Varna", year: 1958, result: "0-1",
      note: "Tal entregó LA DAMA por caballo y alfil en plena Sämisch… y su iniciativa arrasó. El espíritu de la India de Rey en una miniatura.",
      san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. f3 O-O 6. Be3 e5 7. d5 Nh5 8. Qd2 Qh4+ 9. g3 Nxg3 10. Qf2 Nxf1 11. Qxh4 Nxe3" }
  ]
};

// ---- Trampas de apertura (líneas cortas y verificadas) --------------------
const TRAPS = {
  london: [
    { name: "La dama glotona (…Qxb2)",
      note: "Si la dama negra toma b2, Nb5 la deja sin casillas: amenaza Nc7+ y Rb1. Ganamos material o la dama entera.",
      san: "1. d4 d5 2. Bf4 c5 3. e3 Qb6 4. Nc3 Qxb2 5. Nb5" }
  ],
  italian: [
    { name: "El Mate de Legal",
      note: "La clavada de …Bg4 era mentira: sacrificamos la dama y damos mate con tres piezas menores. La trampa más bella del ajedrez.",
      san: "1. e4 e5 2. Nf3 Nc6 3. Bc4 d6 4. Nc3 Bg4 5. h3 Bh5 6. Nxe5 Bxd1 7. Bxf7+ Ke7 8. Nd5#" }
  ],
  ruylopez: [
    { name: "El Arca de Noé (la sufres tú: apréndela)",
      note: "Si tomamos e5 con avaricia tras …b5, la cadena a6-b5-c4 caza a nuestro alfil de b3. Por eso nuestro repertorio no se lanza a por e5.",
      san: "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 d6 5. d4 b5 6. Bb3 exd4 7. Nxd4 Nxd4 8. Qxd4 c5 9. Qd5 Be6 10. Qc6+ Bd7 11. Qd5 c4" }
  ],
  sicilian: [
    { name: "El salto a d6 (…e5 apresurado)",
      note: "Si las negras juegan …e5 y …a6 sin preparación, Nd6+ obliga a entregar el alfil: las casillas negras quedan nuestras para siempre.",
      san: "1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 e5 5. Nb5 a6 6. Nd6+ Bxd6 7. Qxd6" }
  ],
  queensgambit: [
    { name: "La Trampa del Elefante (la sufres tú)",
      note: "Si el caballo toma d5 fiándose de la clavada, …Bb4+ recupera la pieza con ventaja negra: la clavada de Bg5 no defiende d5. Por eso jugamos e3 a tiempo.",
      san: "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Nbd7 5. cxd5 exd5 6. Nxd5 Nxd5 7. Bxd8 Bb4+ 8. Qd2 Bxd2+ 9. Kxd2 Kxd8" }
  ],
  carokann: [
    { name: "El mate del caballo fantasma",
      note: "En la variante …Nd7 (que nosotros NO jugamos), 6.Nd6 es MATE: el peón de e7 está clavado por la dama. Conócela para tenderla con blancas.",
      san: "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nd7 5. Qe2 Ngf6 6. Nd6#" }
  ],
  kingsindian: [
    { name: "El salvavidas …Nxe4",
      note: "Tras el cambio de damas, si las blancas se lanzan a por e5, …Nxe4 lo recupera todo con mejor final. Truco táctico de manual indio.",
      san: "1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5 7. dxe5 dxe5 8. Qxd8 Rxd8 9. Nxe5 Nxe4 10. Nxe4 Bxe5" }
  ]
};

// Convierte partidas/trampas SAN a jugadas navegables (visor con ‹ ›).
function fmtSan(i, san) {
  return Math.floor(i / 2 + 1) + (i % 2 ? "… " : ". ") + san;
}
function buildReplaySet(list) {
  return (list || []).map((g) => {
    const toks = tokenize(g.san);
    let moves;
    try { moves = sanLineToMoves(toks); }
    catch (e) { console.error(`ERROR partida/trampa "${g.name || g.white}": ${e.message}`); problems++; return null; }
    return {
      name: g.name || `${g.white} – ${g.black}`,
      info: g.event ? `${g.event}, ${g.year} · ${g.result}` : "",
      note: g.note || "",
      moves: moves.map((mv, i) => ({ by: "engine", ...mv, text: fmtSan(i, toks[i]) }))
    };
  }).filter(Boolean);
}

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
const POSITIONS = {}; // posición serializada -> {o, v, p} para el explorador
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

    // Índice de posiciones para el explorador («¿qué apertura es esta?»):
    // cada posición de la línea apunta a su curso/variación (la 1ª gana).
    const vIdx = variations.length;
    for (let p = 1; p <= moves.length; p++) {
      const key = simKey(moves, userIsWhite, p);
      if (!POSITIONS[key]) POSITIONS[key] = { o: op.id, v: vIdx, p };
    }

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
    games: buildReplaySet(GAMES[op.id]),
    traps: buildReplaySet(TRAPS[op.id]),
  });
  console.error(`${op.id}: ${variations.length} líneas, ${(GAMES[op.id]||[]).length} partidas, ${(TRAPS[op.id]||[]).length} trampas`);
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
process.stdout.write(header + "const OPENINGS = " + JSON.stringify(OUT, null, 0) +
  ";\n\nconst POSITIONS = " + JSON.stringify(POSITIONS, null, 0) +
  ";\n\nwindow.OPENINGS = OPENINGS;\nwindow.POSITIONS = POSITIONS;\n");
