/*
 * Datos de aperturas y lecciones.
 *
 * Cada apertura tiene una "línea principal" descrita como una lista de jugadas.
 * Cada jugada:
 *   by:   'user'  -> la juega el alumno (debe encontrarla)
 *         'engine'-> la juega el rival automáticamente
 *   from / to: casillas en notación algebraica ('e2', 'e4'...)
 *   castle: 'O-O' | 'O-O-O' (opcional, en lugar de from/to)
 *   text:  mensaje del entrenador, en tono cordial y humano
 *   hint:  pista corta para el botón 💡 (solo jugadas del usuario)
 *
 * El motor aplica las jugadas sobre la posición inicial estándar, así que
 * no hace falta validar legalidad: la línea ya es legal.
 */

const OPENINGS = [
  {
    id: "london",
    name: "Sistema Londres",
    emoji: "🏛️",
    color: "white",
    level: "Principiante",
    blurb: "Sólida, fácil de aprender y sirve contra casi todo. Ideal para empezar.",
    moves: [
      { by: "user",   from: "d2", to: "d4", hint: "Mueve el peón de dama dos casillas: d4.",
        text: "Empezamos con el peón de dama a d4. El Londres busca una estructura sólida y muy fácil de recordar. ¡Vamos paso a paso!" },
      { by: "engine", from: "d7", to: "d5",
        text: "Tu rival responde de forma simétrica con …d5, plantando bandera en el centro." },
      { by: "user",   from: "c1", to: "f4", hint: "Saca el alfil de c1 a f4, fuera de la cadena de peones.",
        text: "Aquí está la jugada estrella: sacamos el alfil a f4, ¡fuera de la cadena de peones! En el Londres nunca lo dejamos encerrado." },
      { by: "engine", from: "g8", to: "f6",
        text: "Las negras desarrollan el caballo a f6 y presionan el centro." },
      { by: "user",   from: "e2", to: "e3", hint: "Un pasito de peón: e3, para abrir tu otro alfil.",
        text: "Jugamos e3: refuerza d4 y abre la diagonal para el alfil de f1. Lento pero firme, así es el Londres." },
      { by: "engine", from: "e7", to: "e6",
        text: "El rival hace lo mismo para liberar su alfil de casillas negras." },
      { by: "user",   from: "g1", to: "f3", hint: "Desarrolla el caballo de rey a f3.",
        text: "Caballo a f3: controla las casillas e5 y g5 y sigue el desarrollo natural." },
      { by: "engine", from: "f8", to: "d6",
        text: "Las negras ponen el alfil en d6, justo enfrente del nuestro. Te quieren cambiar las piezas." },
      { by: "user",   from: "f4", to: "g3", hint: "Retira el alfil a g3 para conservarlo.",
        text: "Retiramos el alfil a g3 para evitar el cambio y conservar la pareja. ¡Tu estructura del Londres ya está lista para jugar!" }
    ]
  },

  {
    id: "italian",
    name: "Apertura Italiana",
    emoji: "🇮🇹",
    color: "white",
    level: "Principiante",
    blurb: "Desarrollo rápido y juego natural apuntando al punto débil f7.",
    moves: [
      { by: "user",   from: "e2", to: "e4", hint: "El clásico: peón de rey a e4.",
        text: "Abrimos con e4, la jugada más clásica de todas: libera al alfil y a la dama y reclama el centro." },
      { by: "engine", from: "e7", to: "e5",
        text: "Las negras aceptan el duelo central con …e5." },
      { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3, atacando el peón de e5.",
        text: "Caballo a f3 atacando el peón de e5. Desarrollo con amenaza, ¡siempre agradable!" },
      { by: "engine", from: "b8", to: "c6",
        text: "El rival defiende e5 desarrollando el caballo a c6." },
      { by: "user",   from: "f1", to: "c4", hint: "Alfil a c4, mirando hacia f7.",
        text: "Sacamos el alfil a c4 apuntando al punto más débil del rival: f7. Esto ya es la Apertura Italiana." },
      { by: "engine", from: "f8", to: "c5",
        text: "Las negras imitan con …Bc5. Posición tranquila y equilibrada: el famoso «Giuoco Piano»." },
      { by: "user",   from: "c2", to: "c3", hint: "Peón a c3, preparando d4.",
        text: "Jugamos c3 para preparar el avance d4 y construir un gran centro. Paciencia, vamos despacio." },
      { by: "engine", from: "g8", to: "f6",
        text: "El caballo negro salta a f6 y ataca tu peón de e4." },
      { by: "user",   from: "d2", to: "d3", hint: "Defiende e4 con d3.",
        text: "Defendemos e4 con d3 y dejamos todo sólido. ¡Apertura completada con buen desarrollo!" }
    ]
  },

  {
    id: "ruylopez",
    name: "Ruy López",
    emoji: "👑",
    color: "white",
    level: "Intermedio",
    blurb: "La «Española»: una de las aperturas más respetadas de la historia.",
    moves: [
      { by: "user",   from: "e2", to: "e4", hint: "Peón de rey a e4.",
        text: "De nuevo e4. La Española es una de las aperturas más profundas y respetadas que existen." },
      { by: "engine", from: "e7", to: "e5",
        text: "Las negras responden …e5, simétrico." },
      { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3, presionando e5.",
        text: "Caballo a f3 presionando el peón de e5." },
      { by: "engine", from: "b8", to: "c6",
        text: "El rival defiende con …Nc6." },
      { by: "user",   from: "f1", to: "b5", hint: "Alfil a b5: ¡la jugada de la Ruy López!",
        text: "El alfil va a b5 y presiona indirectamente al caballo que defiende e5. ¡Esta es la Ruy López!" },
      { by: "engine", from: "a7", to: "a6",
        text: "Las negras «preguntan» al alfil con …a6. Quieren saber qué planeas." },
      { by: "user",   from: "b5", to: "a4", hint: "Mantén la tensión: alfil a a4.",
        text: "Mantenemos la presión retirando el alfil a a4, sin soltar al caballo de c6." },
      { by: "engine", from: "g8", to: "f6",
        text: "El rival ataca tu peón de e4 con …Nf6." },
      { by: "user",   castle: "O-O", hint: "Enroca corto (toca el rey en e1 y luego g1).",
        text: "Enrocamos corto: el rey queda a salvo y la torre entra en juego. ¡Posición sana y con futuro!" }
    ]
  },

  {
    id: "sicilian",
    name: "Defensa Siciliana",
    emoji: "⚔️",
    color: "white",
    level: "Intermedio",
    blurb: "La respuesta más combativa a 1.e4. Aquí la afrontamos con la Siciliana Abierta.",
    moves: [
      { by: "user",   from: "e2", to: "e4", hint: "Peón de rey a e4.",
        text: "Abrimos con e4. A ver cómo responde el rival…" },
      { by: "engine", from: "c7", to: "c5",
        text: "¡La Siciliana! Las negras responden …c5, la defensa más combativa contra e4." },
      { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3.",
        text: "Desarrollamos el caballo a f3, con la idea de abrir el centro pronto." },
      { by: "engine", from: "d7", to: "d6",
        text: "El rival juega …d6, dando soporte a un futuro …e5 y abriendo su alfil de dama." },
      { by: "user",   from: "d2", to: "d4", hint: "¡Rompe el centro con d4!",
        text: "Golpeamos en el centro con d4. Vamos a abrir líneas: así nace la Siciliana Abierta." },
      { by: "engine", from: "c5", to: "d4",
        text: "Las negras capturan el peón en d4." },
      { by: "user",   from: "f3", to: "d4", hint: "Recaptura con el caballo: Cxd4.",
        text: "Recuperamos con el caballo, que queda fuerte y centralizado en d4." },
      { by: "engine", from: "g8", to: "f6",
        text: "…Nf6 ataca tu peón de e4. Toca defenderlo." },
      { by: "user",   from: "b1", to: "c3", hint: "Caballo a c3, defendiendo e4.",
        text: "Caballo a c3 defiende e4 y completa el desarrollo. ¡Posición típica de Siciliana Abierta lograda!" }
    ]
  },

  {
    id: "queensgambit",
    name: "Gambito de Dama",
    emoji: "♛",
    color: "white",
    level: "Intermedio",
    blurb: "Ofreces un peón para dominar el centro. Un clásico de los grandes campeones.",
    moves: [
      { by: "user",   from: "d2", to: "d4", hint: "Peón de dama a d4.",
        text: "Empezamos con d4, ocupando el centro con el peón de dama." },
      { by: "engine", from: "d7", to: "d5",
        text: "Las negras responden …d5, disputando el centro." },
      { by: "user",   from: "c2", to: "c4", hint: "Ofrece el gambito: peón a c4.",
        text: "Ofrecemos el Gambito de Dama con c4. Si lo capturan, recuperaremos el peón sin problema más adelante." },
      { by: "engine", from: "e7", to: "e6",
        text: "El rival declina el gambito y refuerza d5 con …e6." },
      { by: "user",   from: "b1", to: "c3", hint: "Caballo a c3, presionando d5.",
        text: "Desarrollamos el caballo a c3 y aumentamos la presión sobre d5." },
      { by: "engine", from: "g8", to: "f6",
        text: "Las negras desarrollan …Nf6 para defender el centro." },
      { by: "user",   from: "c1", to: "g5", hint: "Alfil a g5, clavando el caballo de f6.",
        text: "Alfil a g5 clava el caballo de f6 contra la dama. ¡Posición clásica del Gambito de Dama Declinado!" }
    ]
  },

  {
    id: "kingsindian",
    name: "Defensa India de Rey",
    emoji: "🛡️",
    color: "black",
    level: "Avanzado",
    blurb: "Juegas con negras: cedes el centro al rival para luego contraatacarlo con furia.",
    moves: [
      { by: "engine", from: "d2", to: "d4",
        text: "Aquí juegas con las negras. El rival abre con d4, ocupando el centro. ¡Tranquilo, tenemos un plan!" },
      { by: "user",   from: "g8", to: "f6", hint: "Caballo de rey a f6.",
        text: "Respondemos …Nf6, desarrollando y vigilando el centro sin comprometernos todavía." },
      { by: "engine", from: "c2", to: "c4",
        text: "Las blancas amplían su centro con c4. Les dejamos hacer… por ahora." },
      { by: "user",   from: "g7", to: "g6", hint: "Avanza el peón a g6 para preparar el fianchetto.",
        text: "Jugamos …g6 para preparar el fianchetto: nuestro alfil irá a g7 y será una bestia en la diagonal larga." },
      { by: "engine", from: "b1", to: "c3",
        text: "El rival desarrolla …Nc3, apoyando su centro." },
      { by: "user",   from: "f8", to: "g7", hint: "Alfil a g7: el fianchetto.",
        text: "¡Aquí está! Alfil a g7. Esta pieza presionará el centro y al rey rival durante toda la partida." },
      { by: "engine", from: "e2", to: "e4",
        text: "Las blancas construyen un centro enorme con e4. Parece intimidante… pero es justo lo que queremos atacar." },
      { by: "user",   from: "d7", to: "d6", hint: "Peón a d6, preparando …e5.",
        text: "Jugamos …d6: discreto pero clave. Prepara la ruptura …e5 con la que golpearemos ese centro." },
      { by: "engine", from: "g1", to: "f3",
        text: "El rival desarrolla …Nf3, defendiendo la futura casilla e5." },
      { by: "user",   castle: "O-O", color: "black", hint: "Enroca corto (toca tu rey en e8 y luego g8).",
        text: "Enrocamos corto: rey a buen recaudo antes de empezar la pelea. La seguridad primero." },
      { by: "engine", from: "f1", to: "e2",
        text: "Las blancas completan su desarrollo con Be2, listas para enrocar." },
      { by: "user",   from: "e7", to: "e5", hint: "¡La ruptura! Peón a e5.",
        text: "¡Y aquí llega el golpe característico: …e5! Desafiamos el centro de frente. Así nace la India de Rey: cedes espacio para contraatacar con todo. 🔥" }
    ]
  }
];

window.OPENINGS = OPENINGS;
