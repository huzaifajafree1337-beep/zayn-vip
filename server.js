import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const API = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json";

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/history", async (req, res) => {
  const pageNo = Math.max(1, Number.parseInt(req.query.pageNo || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(req.query.pageSize || "100", 10) || 100));
  const url = new URL(API);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("pageSize", String(pageSize));

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json, text/plain, */*", "User-Agent": "ZAYN-VIP-History-Dashboard/1.0" },
      signal: AbortSignal.timeout(12000)
    });
    const body = await upstream.text();
    if (!upstream.ok) {
      return res.status(502).json({ ok: false, error: `Upstream API returned HTTP ${upstream.status}`, upstreamStatus: upstream.status });
    }
    let data;
    try { data = JSON.parse(body); }
    catch { return res.status(502).json({ ok: false, error: "Upstream response was not valid JSON." }); }
    res.set("Cache-Control", "no-store");
    res.json({ ok: true, source: API, fetchedAt: new Date().toISOString(), data });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.name === "TimeoutError" ? "Upstream API timed out." : (error.message || "Could not reach upstream API.") });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`ZAYN VIP running on http://localhost:${PORT}`));
