/* =========================================================================
 * ai.js — Entrenador con IA real (Claude)
 *
 * La app es una PWA estática sin servidor. Para no exponer ninguna clave en
 * el repositorio, el alumno introduce SU PROPIA API key de Anthropic, que se
 * guarda solo en su dispositivo (localStorage) y se usa para llamar a la API
 * de Claude directamente desde el navegador.
 *
 * Aviso: usar la clave en el navegador la deja visible para quien tenga acceso
 * a este dispositivo. Es adecuado para uso personal; no publiques tu clave.
 * ========================================================================= */

(function () {
  "use strict";

  const KEY_STORAGE = "aperturas_anthropic_key";
  const API_URL = "https://api.anthropic.com/v1/messages";
  const MODEL = "claude-opus-4-8";

  function getKey() {
    return localStorage.getItem(KEY_STORAGE) || "";
  }
  function setKey(k) {
    if (k) localStorage.setItem(KEY_STORAGE, k.trim());
    else localStorage.removeItem(KEY_STORAGE);
  }
  function hasKey() {
    return !!getKey();
  }

  // Construye el "prompt de sistema": define la personalidad del entrenador
  // y le da el contexto de la apertura y la posición actual.
  function buildSystem(ctx) {
    const movesList = ctx.moves
      .map((m, i) => {
        const who = m.by === "user" ? "tú" : "rival";
        const mv = m.castle ? m.castle : `${m.from}-${m.to}`;
        return `${i + 1}. (${who}) ${mv}`;
      })
      .join("  ");

    return [
      "Eres un entrenador de ajedrez cercano, cordial y muy humano que ayuda a un alumno a aprender aperturas.",
      "",
      "ESTILO (imprescindible):",
      "- Habla SIEMPRE en español.",
      "- Usa la PRIMERA PERSONA DEL PLURAL, como un entrenador junto a su alumno: «jugamos…», «buscamos…», «nuestra dama va a…», «nos interesa…».",
      "- Explica primero la IDEA o el plan (el porqué), con naturalidad y de forma motivadora, y cuando menciones una jugada concreta termínala de forma clara, p. ej. «…así que jugamos peón a c4».",
      "- Sé breve y claro: 2 a 4 frases. Algún emoji ocasional, sin abusar.",
      "- Ejemplo del tono buscado: «Cuando las negras salen con la variante simétrica del alfil, siempre buscamos la ruptura con el peón a c4: nos permite desarrollar la dama a b3 y apuntar al débil peón de b7. ¡Peón a c4!»",
      "",
      `Apertura actual: ${ctx.openingName} — variante "${ctx.variationName}".`,
      `El alumno juega con ${ctx.color === "black" ? "negras" : "blancas"}.`,
      `Línea que está estudiando (notación origen-destino): ${movesList}`,
      `Va por la jugada número ${ctx.step + 1} de la línea.`,
      "",
      "Responde sus dudas sobre la apertura: ideas, planes, por qué de cada jugada, errores típicos y variaciones. Si pregunta algo que no es de ajedrez, redirígelo con amabilidad hacia la lección."
    ].join("\n");
  }

  // Llama a la API de Claude. `history` es una lista [{role, content}].
  async function ask(history, ctx) {
    const key = getKey();
    if (!key) throw new Error("NO_KEY");

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        // Permite llamar a la API directamente desde el navegador.
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: buildSystem(ctx),
        messages: history
      })
    });

    if (!res.ok) {
      let detail = "";
      try {
        const err = await res.json();
        detail = err?.error?.message || "";
      } catch (e) { /* respuesta no-JSON */ }
      const e = new Error(detail || `HTTP ${res.status}`);
      e.status = res.status;
      throw e;
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text || "(El entrenador se quedó pensando… inténtalo de nuevo.)";
  }

  window.CoachAI = { getKey, setKey, hasKey, ask };
})();
