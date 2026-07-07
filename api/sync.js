/* =========================================================================
 * api/sync.js — Función serverless de Vercel para sincronizar el progreso.
 *
 * Guarda/lee un pequeño JSON {progress, reviews, updated} por clave personal
 * en Upstash Redis (integración gratuita del marketplace de Vercel).
 *
 * Configuración (una vez, en el panel de Vercel):
 *   Proyecto → Storage → Upstash for Redis (plan gratuito) → Connect.
 *   Eso añade las variables KV_REST_API_URL / KV_REST_API_TOKEN (o
 *   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) y con el siguiente
 *   deploy la sincronización queda operativa.
 * ========================================================================= */
"use strict";

const YEAR_S = 31536000; // los datos caducan al año de la última escritura

module.exports = async (req, res) => {
  const base = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) {
    res.status(503).json({ error: "sync-not-configured" });
    return;
  }

  const key = String((req.query && req.query.key) || "");
  if (!/^[a-z0-9-]{8,60}$/.test(key)) {
    res.status(400).json({ error: "bad-key" });
    return;
  }
  const rkey = "aperturas:" + key;
  const auth = { Authorization: "Bearer " + token };

  try {
    if (req.method === "GET") {
      const r = await fetch(`${base}/get/${encodeURIComponent(rkey)}`, { headers: auth });
      const j = await r.json();
      res.status(200).json(j && j.result ? JSON.parse(j.result) : null);
      return;
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const data = JSON.stringify({
        progress: body.progress || {},
        reviews: body.reviews || {},
        updated: Date.now()
      });
      if (data.length > 100000) {
        res.status(413).json({ error: "too-big" });
        return;
      }
      const r = await fetch(`${base}/set/${encodeURIComponent(rkey)}?EX=${YEAR_S}`, {
        method: "POST",
        headers: auth,
        body: data
      });
      if (!r.ok) throw new Error("kv-set-failed");
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "method-not-allowed" });
  } catch (e) {
    res.status(502).json({ error: "kv-error" });
  }
};
