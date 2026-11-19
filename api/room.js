export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: "Supabase ortam değişkenleri eksik." });

  const room = String(req.method === "GET" ? req.query.room || "" : req.body?.room || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,24}$/.test(room)) return res.status(400).json({ error: "Geçersiz oda kodu." });

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: req.method === "POST" ? "resolution=merge-duplicates,return=representation" : "return=representation"
  };
  const endpoint = `${url}/rest/v1/saha_rooms`;

  try {
    if (req.method === "GET") {
      const r = await fetch(`${endpoint}?room_code=eq.${encodeURIComponent(room)}&select=state,updated_at&limit=1`, { headers });
      if (!r.ok) throw new Error(await r.text());
      const rows = await r.json();
      return res.status(200).json(rows[0] || { state: null });
    }
    if (req.method === "POST") {
      const state = req.body?.state;
      if (!state || typeof state !== "object" || Array.isArray(state)) return res.status(400).json({ error: "Geçersiz sayaç verisi." });
      const r = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ room_code: room, state, updated_at: new Date().toISOString() })
      });
      if (!r.ok) throw new Error(await r.text());
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "Oda sunucusuna ulaşılamadı.", detail: String(e.message || e) });
  }
}
