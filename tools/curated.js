/*
 * Datos de aperturas, variaciones y lecciones.
 *
 * Estructura:
 *   opening = { id, name, emoji, color, level, blurb, variations: [ ... ] }
 *   variation = { id, name, blurb, moves: [ ... ] }
 *
 * Cada jugada:
 *   by:   'user'  -> la juega el alumno (debe encontrarla)
 *         'engine'-> la juega el rival automáticamente
 *   from / to: casillas en notación algebraica ('e2', 'e4'...)
 *   castle: 'O-O' | 'O-O-O' (opcional, en lugar de from/to)
 *   color:  'white' | 'black' (solo en enroques; por defecto 'white')
 *   text:  mensaje del entrenador, en tono cordial y humano
 *   hint:  pista corta para el botón 💡 (solo jugadas del usuario)
 *
 * El motor aplica las jugadas sobre la posición inicial estándar; las líneas
 * ya son legales, así que no hace falta validar legalidad.
 */

const OPENINGS = [
  {
    id: "london",
    name: "Sistema Londres",
    emoji: "🏛️",
    color: "white",
    level: "Principiante",
    blurb: "Sólida, fácil de aprender y sirve contra casi todo. Ideal para empezar.",
    variations: [
      {
        id: "main",
        name: "Línea principal",
        blurb: "El montaje clásico con Bf4.",
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
        id: "fianchetto",
        name: "Contra el fianchetto",
        blurb: "Cuando el rival sale con …g6 y …Bg7.",
        moves: [
          { by: "user",   from: "d2", to: "d4", hint: "Peón de dama a d4.",
            text: "Arrancamos el Londres con d4." },
          { by: "engine", from: "g8", to: "f6",
            text: "Las negras juegan …Nf6, flexibles." },
          { by: "user",   from: "c1", to: "f4", hint: "Alfil a f4, la jugada clave del Londres.",
            text: "Sacamos el alfil a f4 cuanto antes, como siempre en el Londres." },
          { by: "engine", from: "g7", to: "g6",
            text: "El rival prepara el fianchetto con …g6." },
          { by: "user",   from: "e2", to: "e3", hint: "Peón a e3, abre tu otro alfil.",
            text: "e3 sostiene d4 y abre el alfil de f1." },
          { by: "engine", from: "f8", to: "g7",
            text: "…Bg7: el alfil rival mira a tu centro por la diagonal larga." },
          { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3.",
            text: "Caballo a f3, desarrollo natural." },
          { by: "engine", from: "e8", to: "g8", castle: "O-O", color: "black",
            text: "El rival enroca y pone su rey a salvo." },
          { by: "user",   from: "h2", to: "h3", hint: "Avanza el peón a h3.",
            text: "h3 da aire a tu alfil de f4 y evita el molesto …Nh5. Pequeño detalle, gran diferencia." },
          { by: "engine", from: "d7", to: "d6",
            text: "…d6, el rival va liberando su juego." },
          { by: "user",   from: "f1", to: "e2", hint: "Alfil a e2, listo para enrocar.",
            text: "Be2 y a punto de enrocar. ¡Tu estructura del Londres está montada y es muy sólida!" }
        ]
      },
      {
        id: "c5",
        name: "Contra …c5",
        blurb: "El rival golpea el centro con …c5.",
        moves: [
          { by: "user",   from: "d2", to: "d4", hint: "Peón de dama a d4.",
            text: "Empezamos con d4." },
          { by: "engine", from: "d7", to: "d5",
            text: "Las negras responden …d5." },
          { by: "user",   from: "c1", to: "f4", hint: "Alfil a f4.",
            text: "El alfil sale a f4, fiel al Londres." },
          { by: "engine", from: "c7", to: "c5",
            text: "El rival golpea tu centro con …c5." },
          { by: "user",   from: "e2", to: "e3", hint: "Peón a e3, sostén de d4.",
            text: "e3 sostiene el peón de d4 con calma." },
          { by: "engine", from: "b8", to: "c6",
            text: "…Nc6 aumenta la presión sobre d4." },
          { by: "user",   from: "c2", to: "c3", hint: "Peón a c3, refuerza d4.",
            text: "c3 refuerza d4: la base de hierro del Londres." },
          { by: "engine", from: "d8", to: "b6",
            text: "La dama salta a b6 atacando b2 y d4." },
          { by: "user",   from: "d1", to: "b3", hint: "Dama a b3, defiende y ofrece cambio.",
            text: "Dama a b3: defiendes b2 y ofreces el cambio de damas. Sin riesgos." },
          { by: "engine", from: "b6", to: "b3",
            text: "Las negras cambian damas en b3." },
          { by: "user",   from: "a2", to: "b3", hint: "Recaptura con el peón: axb3.",
            text: "Recapturas con el peón y abres la columna 'a'. Posición cómoda y muy sana." }
        ]
      }
    ]
  },

  {
    id: "italian",
    name: "Apertura Italiana",
    emoji: "🇮🇹",
    color: "white",
    level: "Principiante",
    blurb: "Desarrollo rápido y juego natural apuntando al punto débil f7.",
    variations: [
      {
        id: "main",
        name: "Giuoco Piano",
        blurb: "La 'partida tranquila', equilibrada y posicional.",
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
        id: "twoknights",
        name: "Ataque al caballo (Ng5)",
        blurb: "Contra las Dos Caballos, el agresivo Ng5.",
        moves: [
          { by: "user",   from: "e2", to: "e4", hint: "Peón de rey a e4.",
            text: "Abrimos con e4." },
          { by: "engine", from: "e7", to: "e5",
            text: "…e5." },
          { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3.",
            text: "Caballo a f3, atacando e5." },
          { by: "engine", from: "b8", to: "c6",
            text: "…Nc6 defiende." },
          { by: "user",   from: "f1", to: "c4", hint: "Alfil a c4, apuntando a f7.",
            text: "Bc4 mira a f7." },
          { by: "engine", from: "g8", to: "f6",
            text: "…Nf6: la Defensa de los Dos Caballos." },
          { by: "user",   from: "f3", to: "g5", hint: "¡Caballo a g5, ataca f7!",
            text: "¡Ng5! Atacas el punto f7 directamente. Una jugada agresiva y muy temida por los principiantes." },
          { by: "engine", from: "d7", to: "d5",
            text: "El rival defiende con …d5, abriendo el centro." },
          { by: "user",   from: "e4", to: "d5", hint: "Captura en el centro: exd5.",
            text: "exd5, capturamos en el centro." },
          { by: "engine", from: "f6", to: "d5",
            text: "El rival recaptura con el caballo, …Nxd5." },
          { by: "user",   from: "d1", to: "f3", hint: "Dama a f3, doble presión.",
            text: "Dama a f3: presionas a la vez el caballo de d5 y el débil f7. ¡Iniciativa peligrosa!" }
        ]
      },
      {
        id: "evans",
        name: "Gambito Evans",
        blurb: "Sacrificas un peón por iniciativa salvaje.",
        moves: [
          { by: "user",   from: "e2", to: "e4", hint: "Peón de rey a e4.",
            text: "Abrimos con e4." },
          { by: "engine", from: "e7", to: "e5",
            text: "…e5." },
          { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3.",
            text: "Caballo a f3." },
          { by: "engine", from: "b8", to: "c6",
            text: "…Nc6." },
          { by: "user",   from: "f1", to: "c4", hint: "Alfil a c4.",
            text: "Bc4, la Italiana." },
          { by: "engine", from: "f8", to: "c5",
            text: "…Bc5, llegamos al Giuoco Piano." },
          { by: "user",   from: "b2", to: "b4", hint: "¡Avanza b4! El Gambito Evans.",
            text: "¡b4! El Gambito Evans: ofreces un peón para ganar tiempo y abrir líneas hacia el rey rival." },
          { by: "engine", from: "c5", to: "b4",
            text: "El rival acepta el regalo: …Bxb4." },
          { by: "user",   from: "c2", to: "c3", hint: "Peón a c3, ataca el alfil.",
            text: "c3 ataca el alfil con tempo y prepara el avance d4." },
          { by: "engine", from: "b4", to: "a5",
            text: "El alfil se retira a a5." },
          { by: "user",   from: "d2", to: "d4", hint: "¡Avanza d4! Abre el centro.",
            text: "d4 abre el centro con un desarrollo arrollador. ¡Has cambiado un peón por una iniciativa tremenda!" }
        ]
      }
    ]
  },

  {
    id: "ruylopez",
    name: "Ruy López",
    emoji: "👑",
    color: "white",
    level: "Intermedio",
    blurb: "La «Española»: una de las aperturas más respetadas de la historia.",
    variations: [
      {
        id: "main",
        name: "Línea principal (Morphy)",
        blurb: "…a6, Ba4 y enroque corto.",
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
          { by: "user",   castle: "O-O", color: "white", hint: "Enroca corto (toca el rey en e1 y luego g1).",
            text: "Enrocamos corto: el rey queda a salvo y la torre entra en juego. ¡Posición sana y con futuro!" }
        ]
      },
      {
        id: "exchange",
        name: "Variante del Cambio",
        blurb: "Bxc6 daña la estructura rival.",
        moves: [
          { by: "user",   from: "e2", to: "e4", hint: "Peón de rey a e4.",
            text: "e4." },
          { by: "engine", from: "e7", to: "e5",
            text: "…e5." },
          { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3.",
            text: "Caballo a f3, presiona e5." },
          { by: "engine", from: "b8", to: "c6",
            text: "…Nc6." },
          { by: "user",   from: "f1", to: "b5", hint: "Alfil a b5, la Española.",
            text: "Bb5, la Ruy López." },
          { by: "engine", from: "a7", to: "a6",
            text: "…a6 pregunta al alfil." },
          { by: "user",   from: "b5", to: "c6", hint: "Captura el caballo: Bxc6.",
            text: "Bxc6: cambias el alfil para dañar la estructura de peones negra (le doblas los peones)." },
          { by: "engine", from: "d7", to: "c6",
            text: "El rival recaptura …dxc6, con peones doblados en la columna c." },
          { by: "user",   castle: "O-O", color: "white", hint: "Enroca corto.",
            text: "Enrocamos. Tu plan a largo plazo es el final: tienes una mayoría de peones más sana en el flanco de rey." }
        ]
      },
      {
        id: "berlin",
        name: "Defensa Berlinesa",
        blurb: "…Nf6, la muralla sólida de las negras.",
        moves: [
          { by: "user",   from: "e2", to: "e4", hint: "Peón de rey a e4.",
            text: "e4." },
          { by: "engine", from: "e7", to: "e5",
            text: "…e5." },
          { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3.",
            text: "Caballo a f3." },
          { by: "engine", from: "b8", to: "c6",
            text: "…Nc6." },
          { by: "user",   from: "f1", to: "b5", hint: "Alfil a b5.",
            text: "Bb5, la Española." },
          { by: "engine", from: "g8", to: "f6",
            text: "…Nf6: la sólida Defensa Berlinesa, famosa por ser durísima de romper." },
          { by: "user",   castle: "O-O", color: "white", hint: "Enroca corto con tranquilidad.",
            text: "Enrocamos con calma, sin miedo a que capturen en e4." },
          { by: "engine", from: "f6", to: "e4",
            text: "El rival toma el peón: …Nxe4." },
          { by: "user",   from: "d2", to: "d4", hint: "¡Avanza d4! Abre el centro.",
            text: "d4 abre el centro y recuperarás el peón con buen juego. Así se afronta la Berlinesa." }
        ]
      }
    ]
  },

  {
    id: "sicilian",
    name: "Defensa Siciliana",
    emoji: "⚔️",
    color: "white",
    level: "Intermedio",
    blurb: "La respuesta más combativa a 1.e4. La afrontamos con blancas.",
    variations: [
      {
        id: "main",
        name: "Siciliana Abierta",
        blurb: "d4 abre el centro: la línea principal.",
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
        id: "najdorf",
        name: "Najdorf (…a6)",
        blurb: "La Siciliana más famosa del mundo.",
        moves: [
          { by: "user",   from: "e2", to: "e4", hint: "Peón de rey a e4.",
            text: "e4." },
          { by: "engine", from: "c7", to: "c5",
            text: "…c5, la Siciliana." },
          { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3.",
            text: "Caballo a f3." },
          { by: "engine", from: "d7", to: "d6",
            text: "…d6." },
          { by: "user",   from: "d2", to: "d4", hint: "Rompe con d4.",
            text: "d4 abre el centro." },
          { by: "engine", from: "c5", to: "d4",
            text: "…cxd4." },
          { by: "user",   from: "f3", to: "d4", hint: "Recaptura con el caballo.",
            text: "Nxd4, caballo centralizado." },
          { by: "engine", from: "g8", to: "f6",
            text: "…Nf6 ataca e4." },
          { by: "user",   from: "b1", to: "c3", hint: "Caballo a c3.",
            text: "Nc3 defiende e4." },
          { by: "engine", from: "a7", to: "a6",
            text: "…a6: ¡la Najdorf! Prepara …e5 o …b5 y es la Siciliana favorita de campeones como Fischer y Kasparov." },
          { by: "user",   from: "f1", to: "e2", hint: "Alfil a e2, flexible.",
            text: "Be2: un desarrollo flexible y seguro contra la temida Najdorf." }
        ]
      },
      {
        id: "closed",
        name: "Siciliana Cerrada",
        blurb: "Sin teoría: Nc3, g3 y ataque al rey.",
        moves: [
          { by: "user",   from: "e2", to: "e4", hint: "Peón de rey a e4.",
            text: "e4." },
          { by: "engine", from: "c7", to: "c5",
            text: "…c5, la Siciliana." },
          { by: "user",   from: "b1", to: "c3", hint: "Caballo a c3 (¡no d4!).",
            text: "Nc3: evitamos toda la teoría de la Abierta y jugamos la Siciliana Cerrada." },
          { by: "engine", from: "b8", to: "c6",
            text: "…Nc6." },
          { by: "user",   from: "g2", to: "g3", hint: "Peón a g3, prepara el fianchetto.",
            text: "g3 prepara el fianchetto de tu alfil de rey." },
          { by: "engine", from: "g7", to: "g6",
            text: "El rival hace lo mismo con …g6." },
          { by: "user",   from: "f1", to: "g2", hint: "Alfil a g2.",
            text: "Bg2: el alfil domina la diagonal larga." },
          { by: "engine", from: "f8", to: "g7",
            text: "…Bg7." },
          { by: "user",   from: "d2", to: "d3", hint: "Peón a d3, estructura sólida.",
            text: "d3 cierra una estructura sólida. Tu plan: enrocar y lanzar f4-f5 contra el rey rival." }
        ]
      }
    ]
  },

  {
    id: "queensgambit",
    name: "Gambito de Dama",
    emoji: "♛",
    color: "white",
    level: "Intermedio",
    blurb: "Ofreces un peón para dominar el centro. Clásico de los campeones.",
    variations: [
      {
        id: "main",
        name: "Gambito de Dama Declinado",
        blurb: "El rival declina con …e6.",
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
        id: "accepted",
        name: "Gambito Aceptado",
        blurb: "El rival toma en c4… y se lo recuperas.",
        moves: [
          { by: "user",   from: "d2", to: "d4", hint: "Peón de dama a d4.",
            text: "d4." },
          { by: "engine", from: "d7", to: "d5",
            text: "…d5." },
          { by: "user",   from: "c2", to: "c4", hint: "Ofrece el gambito con c4.",
            text: "c4, ofrecemos el gambito." },
          { by: "engine", from: "d5", to: "c4",
            text: "El rival acepta: …dxc4 se queda con el peón." },
          { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3 (sin prisa por el peón).",
            text: "Nf3: no hay prisa por recuperar el peón. Primero desarrollamos y controlamos el centro." },
          { by: "engine", from: "g8", to: "f6",
            text: "…Nf6." },
          { by: "user",   from: "e2", to: "e3", hint: "Peón a e3, abre el alfil hacia c4.",
            text: "e3 abre la diagonal de tu alfil de rey justo hacia c4." },
          { by: "engine", from: "e7", to: "e6",
            text: "…e6, el rival desarrolla." },
          { by: "user",   from: "f1", to: "c4", hint: "Recupera el peón: Bxc4.",
            text: "Bxc4: recuperas el peón con un alfil bien colocado y mejor desarrollo. ¡Plan cumplido!" }
        ]
      },
      {
        id: "slav",
        name: "Defensa Eslava",
        blurb: "El rival sostiene d5 con …c6.",
        moves: [
          { by: "user",   from: "d2", to: "d4", hint: "Peón de dama a d4.",
            text: "d4." },
          { by: "engine", from: "d7", to: "d5",
            text: "…d5." },
          { by: "user",   from: "c2", to: "c4", hint: "Ofrece el gambito con c4.",
            text: "c4, el Gambito de Dama." },
          { by: "engine", from: "c7", to: "c6",
            text: "…c6: la sólida Defensa Eslava, sostiene d5 sin encerrar el alfil de c8." },
          { by: "user",   from: "g1", to: "f3", hint: "Caballo a f3.",
            text: "Nf3, desarrollo natural." },
          { by: "engine", from: "g8", to: "f6",
            text: "…Nf6." },
          { by: "user",   from: "b1", to: "c3", hint: "Caballo a c3, presiona d5.",
            text: "Nc3 aumenta la presión sobre d5." },
          { by: "engine", from: "d5", to: "c4",
            text: "El rival toma el peón: …dxc4." },
          { by: "user",   from: "a2", to: "a4", hint: "Peón a a4, frena …b5.",
            text: "a4 impide que las negras sostengan el peón de c4 con …b5. Lo recuperarás cómodamente." }
        ]
      }
    ]
  },

  {
    id: "kingsindian",
    name: "Defensa India de Rey",
    emoji: "🛡️",
    color: "black",
    level: "Avanzado",
    blurb: "Juegas con negras: cedes el centro para luego contraatacarlo con furia.",
    variations: [
      {
        id: "main",
        name: "Variante Clásica",
        blurb: "Fianchetto, enroque y la ruptura …e5.",
        moves: [
          { by: "engine", from: "d2", to: "d4",
            text: "Aquí juegas con las negras. El rival abre con d4, ocupando el centro. ¡Tranquilo, tenemos un plan!" },
          { by: "user",   from: "g8", to: "f6", hint: "Caballo de rey a f6.",
            text: "Respondemos …Nf6, desarrollando y vigilando el centro sin comprometernos todavía." },
          { by: "engine", from: "c2", to: "c4",
            text: "Las blancas amplían su centro con c4. Les dejamos hacer… por ahora." },
          { by: "user",   from: "g7", to: "g6", hint: "Avanza el peón a g6 para el fianchetto.",
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
      },
      {
        id: "fourpawns",
        name: "Ataque de los Cuatro Peones",
        blurb: "El rival monta un centro gigante con f4.",
        moves: [
          { by: "engine", from: "d2", to: "d4",
            text: "Juegas con negras. Las blancas abren con d4." },
          { by: "user",   from: "g8", to: "f6", hint: "Caballo a f6.",
            text: "…Nf6, flexibles." },
          { by: "engine", from: "c2", to: "c4",
            text: "c4, las blancas ganan espacio." },
          { by: "user",   from: "g7", to: "g6", hint: "Peón a g6, prepara el fianchetto.",
            text: "…g6 prepara nuestro alfil estrella." },
          { by: "engine", from: "b1", to: "c3",
            text: "…Nc3." },
          { by: "user",   from: "f8", to: "g7", hint: "Alfil a g7.",
            text: "…Bg7, el fianchetto." },
          { by: "engine", from: "e2", to: "e4",
            text: "Las blancas avanzan e4." },
          { by: "user",   from: "d7", to: "d6", hint: "Peón a d6, sostiene tu juego.",
            text: "…d6 prepara la futura ruptura." },
          { by: "engine", from: "f2", to: "f4",
            text: "¡f4! El Ataque de los Cuatro Peones: un centro gigantesco. Imponente… pero también un gran blanco para nosotros." },
          { by: "user",   castle: "O-O", color: "black", hint: "Enroca corto.",
            text: "Enrocamos primero: rey seguro antes de la tormenta." },
          { by: "engine", from: "g1", to: "f3",
            text: "Las blancas desarrollan …Nf3." },
          { by: "user",   from: "c7", to: "c5", hint: "¡Golpea con …c5!",
            text: "¡…c5! Golpeamos el centro de inmediato. Cuanto más grande es el centro, más fuerte es nuestro contraataque." }
        ]
      },
      {
        id: "fianchetto",
        name: "Variante del Fianchetto",
        blurb: "Las blancas también fianchetan: juego maniobrero.",
        moves: [
          { by: "engine", from: "d2", to: "d4",
            text: "Juegas con negras. d4 de las blancas." },
          { by: "user",   from: "g8", to: "f6", hint: "Caballo a f6.",
            text: "…Nf6." },
          { by: "engine", from: "c2", to: "c4",
            text: "c4." },
          { by: "user",   from: "g7", to: "g6", hint: "Peón a g6.",
            text: "…g6, hacia el fianchetto." },
          { by: "engine", from: "g1", to: "f3",
            text: "Las blancas desarrollan …Nf3." },
          { by: "user",   from: "f8", to: "g7", hint: "Alfil a g7.",
            text: "…Bg7." },
          { by: "engine", from: "g2", to: "g3",
            text: "g3: las blancas también fianchetan. Es la Variante del Fianchetto, tranquila y maniobrera." },
          { by: "user",   castle: "O-O", color: "black", hint: "Enroca corto.",
            text: "Enrocamos." },
          { by: "engine", from: "f1", to: "g2",
            text: "Las blancas completan su fianchetto con Bg2." },
          { by: "user",   from: "d7", to: "d6", hint: "Peón a d6, prepara …Nbd7 y …e5.",
            text: "…d6 prepara …Nbd7 y la ruptura …e5. Paciencia: en esta línea se maniobra antes de atacar." }
        ]
      }
    ]
  }
];

window.OPENINGS = OPENINGS;
