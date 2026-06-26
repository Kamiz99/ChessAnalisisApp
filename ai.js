/* =========================================================================
 * ai.js — Entrenador con IA real
 *
 * Dos formas de usarlo:
 *  1) GRATIS y sin clave: un modelo Llama que corre DENTRO del navegador
 *     (WebLLM). Se descarga una vez (~900 MB) y luego funciona offline.
 *     Requiere un navegador con WebGPU (Chrome/Edge actuales, Safari 18+).
 *  2) Con TU propia clave (se guarda solo en tu dispositivo). Detecta el
 *     proveedor por el formato de la clave:
 *       - sk-ant-… → Anthropic (Claude)
 *       - AIza…    → Google Gemini (nivel gratuito)
 *       - sk-…     → OpenAI (GPT)
 * ========================================================================= */

(function () {
  "use strict";

  const KEY_STORAGE = "aperturas_ai_key";
  const OLD_KEY = "aperturas_anthropic_key";
  const MODE_STORAGE = "aperturas_ai_mode"; // "local" | "key"

  // Modelo local (Llama 3.2 1B): pequeño para que cargue también en móvil.
  const LOCAL_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  const WEBLLM_URL = "https://esm.run/@mlc-ai/web-llm";

  function getKey() {
    return localStorage.getItem(KEY_STORAGE) || localStorage.getItem(OLD_KEY) || "";
  }
  function setKey(k) {
    if (k) { localStorage.setItem(KEY_STORAGE, k.trim()); localStorage.setItem(MODE_STORAGE, "key"); }
    else { localStorage.removeItem(KEY_STORAGE); localStorage.removeItem(OLD_KEY); }
  }
  function getMode() { return localStorage.getItem(MODE_STORAGE) || ""; }
  function setMode(m) { localStorage.setItem(MODE_STORAGE, m); }

  function webgpuOK() { return typeof navigator !== "undefined" && !!navigator.gpu; }
  function hasAI() { return getMode() === "local" ? true : !!getKey(); }

  function provider(key) {
    if (key.startsWith("sk-ant-")) return "anthropic";
    if (key.startsWith("AIza")) return "gemini";
    if (key.startsWith("sk-")) return "openai";
    return "anthropic";
  }
  function providerName() {
    if (getMode() === "local") return "Llama (local)";
    const p = provider(getKey());
    return p === "gemini" ? "Gemini" : p === "openai" ? "GPT" : "Claude";
  }

  // Prompt de sistema: personalidad del entrenador + contexto de la posición.
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
      "- Usa la PRIMERA PERSONA DEL PLURAL, como un entrenador junto a su alumno: «jugamos…», «buscamos…».",
      "- Explica primero la IDEA o el plan y, al mencionar una jugada concreta, termínala claramente, p. ej. «…así que jugamos peón a c4».",
      "- Sé breve y claro: 2 a 4 frases. Algún emoji ocasional, sin abusar.",
      "",
      `Apertura actual: ${ctx.openingName} — variante "${ctx.variationName}".`,
      `El alumno juega con ${ctx.color === "black" ? "negras" : "blancas"}.`,
      `Línea que está estudiando (notación origen-destino): ${movesList}`,
      `Va por la jugada número ${ctx.step + 1} de la línea.`,
      "",
      "Responde sus dudas sobre la apertura: ideas, planes, por qué de cada jugada, errores típicos y variaciones. Si pregunta algo que no es de ajedrez, redirígelo con amabilidad."
    ].join("\n");
  }

  async function readError(res) {
    try { const e = await res.json(); return (e.error && (e.error.message || e.error)) || ""; }
    catch (x) { return ""; }
  }

  // ---- IA LOCAL (WebLLM / Llama en el navegador) --------------------------
  let engine = null;
  let engineLoading = null;

  async function ensureLocal(onProgress) {
    if (engine) return engine;
    if (!webgpuOK()) { const e = new Error("NO_WEBGPU"); e.code = "NO_WEBGPU"; throw e; }
    if (!engineLoading) {
      engineLoading = (async () => {
        const webllm = await import(/* @vite-ignore */ WEBLLM_URL);
        const eng = await webllm.CreateMLCEngine(LOCAL_MODEL, {
          initProgressCallback: (r) => { if (onProgress) onProgress(r.text || ""); }
        });
        engine = eng;
        return eng;
      })();
    }
    return engineLoading;
  }

  async function askLocal(history, ctx, onProgress) {
    const eng = await ensureLocal(onProgress);
    if (onProgress) onProgress("Pensando…");
    const messages = [{ role: "system", content: buildSystem(ctx) }].concat(history);
    const r = await eng.chat.completions.create({ messages, max_tokens: 512, temperature: 0.7 });
    return (((r.choices || [])[0] || {}).message || {}).content || "";
  }

  // ---- Proveedores con clave ----------------------------------------------
  async function callAnthropic(key, system, history) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json", "x-api-key": key,
        "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({ model: "claude-opus-4-8", max_tokens: 600, system, messages: history })
    });
    if (!res.ok) { const e = new Error(await readError(res) || `HTTP ${res.status}`); e.status = res.status; throw e; }
    const data = await res.json();
    return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  }
  async function callGemini(key, system, history) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
    const contents = history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const res = await fetch(url, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: 600 } })
    });
    if (!res.ok) { const e = new Error(await readError(res) || `HTTP ${res.status}`); e.status = res.status; throw e; }
    const data = await res.json();
    const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    return parts.map((p) => p.text || "").join("\n").trim();
  }
  async function callOpenAI(key, system, history) {
    const messages = [{ role: "system", content: system }].concat(history);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "content-type": "application/json", "authorization": "Bearer " + key },
      body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 600, messages })
    });
    if (!res.ok) { const e = new Error(await readError(res) || `HTTP ${res.status}`); e.status = res.status; throw e; }
    const data = await res.json();
    return (((data.choices || [])[0] || {}).message || {}).content || "";
  }

  // history: [{role:'user'|'assistant', content}]
  // onProgress(msg): para mostrar el progreso de descarga del modelo local.
  async function ask(history, ctx, onProgress) {
    if (getMode() === "local") {
      const text = await askLocal(history, ctx, onProgress);
      return (text && text.trim()) || "(El entrenador se quedó pensando… inténtalo de nuevo.)";
    }
    const key = getKey();
    if (!key) throw new Error("NO_KEY");
    const system = buildSystem(ctx);
    const p = provider(key);
    let text;
    if (p === "gemini") text = await callGemini(key, system, history);
    else if (p === "openai") text = await callOpenAI(key, system, history);
    else text = await callAnthropic(key, system, history);
    return (text && text.trim()) || "(El entrenador se quedó pensando… inténtalo de nuevo.)";
  }

  window.CoachAI = {
    getKey, setKey, getMode, setMode, hasAI, hasKey: hasAI,
    provider, providerName, webgpuOK, ask
  };
})();
