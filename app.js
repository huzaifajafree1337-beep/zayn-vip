const API_ROUTE = "/api/history";
const state = { records: [], page: 1, totalPages: 1, lastSuccess: null, lastError: null, loading: false };
const $ = id => document.getElementById(id);
const fmtTime = value => value ? new Date(value).toLocaleString() : "—";
const num = value => Number.parseInt(value, 10);
const classify = n => ({ size: n >= 5 ? "Big" : "Small", parity: n % 2 ? "Odd" : "Even" });
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

function extractRows(payload) {
  const root = payload?.data ?? payload;
  const candidates = [
    root?.list, root?.records, root?.history, root?.data?.list,
    root?.data?.records, root?.data?.history, Array.isArray(root) ? root : null
  ];
  const rows = candidates.find(Array.isArray) || [];
  return rows.map(row => {
    const n = num(row.number);
    if (!Number.isInteger(n) || n < 0 || n > 9 || row.issueNumber == null) return null;
    return {
      issueNumber: String(row.issueNumber),
      number: n,
      color: String(row.color ?? "Unknown"),
      premium: row.premium ?? null,
      sum: row.sum ?? null
    };
  }).filter(Boolean);
}
function mergeRecords(rows) {
  const map = new Map(state.records.map(r => [r.issueNumber, r]));
  for (const row of rows) if (!map.has(row.issueNumber)) map.set(row.issueNumber, row);
  state.records = [...map.values()].sort((a,b) => {
    const x = BigInt(a.issueNumber.replace(/\D/g,"") || "0");
    const y = BigInt(b.issueNumber.replace(/\D/g,"") || "0");
    return x > y ? -1 : x < y ? 1 : 0;
  });
}
async function fetchPage(page = 1) {
  if (state.loading) return;
  state.loading = true;
  $("refreshBtn").disabled = true;
  try {
    const response = await fetch(`${API_ROUTE}?pageNo=${page}&pageSize=100`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `Request failed (${response.status})`);
    const data = payload.data ?? {};
    const rows = extractRows(data);
    if (!rows.length) throw new Error("The API responded, but no recognized history rows were found. Check the upstream response schema.");
    mergeRecords(rows);
    const meta = data.data ?? data;
    state.totalPages = Number(meta.totalPage ?? data.totalPage ?? 1) || 1;
    state.lastSuccess = payload.fetchedAt || new Date().toISOString();
    state.lastError = null;
    localStorage.setItem("zayn_vip_history", JSON.stringify({ records: state.records.slice(0,500), savedAt: state.lastSuccess }));
    $("errorBox").hidden = true;
    render();
    setStatus(true, "Connected");
  } catch (err) {
    state.lastError = err.message || "Unknown API error";
    setStatus(false, "Disconnected");
    $("errorBox").hidden = false;
    $("errorBox").textContent = `API error: ${state.lastError}${state.records.length ? " Showing last successfully received history (stale)." : ""}`;
    $("tableStatus").textContent = state.records.length ? "Showing cached history — stale" : "No API data received";
    $("freshness").textContent = state.records.length ? "Cached data · stale" : "No successful sync yet";
  } finally {
    state.loading = false;
    $("refreshBtn").disabled = false;
  }
}
function setStatus(ok, label) {
  for (const id of ["topStatus","connectionBadge"]) {
    $(id).classList.toggle("offline", !ok);
    $(id).querySelector("span").textContent = label;
  }
  $("connectionState").textContent = ok ? "Connected" : "Disconnected";
  $("connectionState").style.color = ok ? "var(--green)" : "var(--red)";
  $("apiMessage").textContent = state.lastError || "OK";
  $("connectionUpdate").textContent = fmtTime(state.lastSuccess);
}
function render() {
  const rows = state.records;
  const latest = rows[0];
  $("recordCount").textContent = rows.length.toLocaleString();
  $("historyCount").textContent = `${rows.length} records`;
  $("lastUpdate").textContent = state.lastSuccess ? new Date(state.lastSuccess).toLocaleTimeString() : "—";
  $("freshness").textContent = state.lastSuccess ? "Latest successful sync" : "No successful sync yet";
  $("tableStatus").textContent = state.lastError ? "Cached history — stale" : "History synced successfully";
  $("connectionPeriod").textContent = latest?.issueNumber || "—";
  $("connectionUpdate").textContent = fmtTime(state.lastSuccess);
  if (latest) {
    const c = classify(latest.number);
    $("latestPeriod").textContent = latest.issueNumber;
    $("latestNumber").textContent = latest.number;
    $("latestSize").textContent = c.size;
    $("latestParity").textContent = c.parity;
    $("latestNumber").className = `result-ball ${colorClass(latest.color)}`;
  }
  renderTable();
  renderStats();
}
function colorClass(color) {
  const s = String(color).toLowerCase();
  if (s.includes("green")) return "green";
  if (s.includes("red")) return "red";
  if (s.includes("violet") || s.includes("purple")) return "violet";
  return "";
}
function renderTable() {
  const body = $("historyBody");
  if (!state.records.length) { body.innerHTML = '<tr><td colspan="6" class="empty">No actual API records available.</td></tr>'; return; }
  body.innerHTML = state.records.slice(0, Math.max(50, state.page * 100)).map(r => {
    const c = classify(r.number);
    return `<tr><td class="period">${escapeHtml(r.issueNumber)}</td><td><span class="number-chip ${colorClass(r.color)}">${r.number}</span></td><td>${escapeHtml(r.color)}</td><td><span class="tag ${c.size.toLowerCase()}">${c.size}</span></td><td><span class="tag ${c.parity.toLowerCase()}">${c.parity}</span></td><td>${escapeHtml(r.sum ?? "—")}</td></tr>`;
  }).join("");
}
function renderStats() {
  const count = Math.min(Number($("windowSelect").value), state.records.length);
  const sample = state.records.slice(0, count);
  $("sampleLabel").textContent = `${sample.length} records in sample`;
  const freq = Array(10).fill(0);
  sample.forEach(r => freq[r.number]++);
  const max = Math.max(1, ...freq);
  $("frequencyChart").innerHTML = freq.map((v,n) => `<div class="bar-item ${v === max && v > 0 ? "hot" : ""}"><span class="bar-count">${v}</span><div class="bar" style="height:${Math.max(2,v/max*100)}%"></div><span class="bar-label">${n}</span></div>`).join("");
  const big = sample.filter(r => r.number >= 5).length, small = sample.length - big;
  const odd = sample.filter(r => r.number % 2).length, even = sample.length - odd;
  const rows = [["Big",big],["Small",small],["Odd",odd],["Even",even]];
  $("breakdown").innerHTML = rows.map(([name,value]) => `<div class="break-row"><label>${name}</label><div class="track"><i style="width:${sample.length ? value/sample.length*100 : 0}%"></i></div><b>${sample.length ? (value/sample.length*100).toFixed(0) : 0}%</b></div>`).join("");
  const lastIndex = Array(10).fill(null);
  sample.forEach((r,i) => { if (lastIndex[r.number] === null) lastIndex[r.number] = i; });
  $("gaps").innerHTML = lastIndex.map((gap,n) => `<div class="gap-cell"><b>${gap === null ? "—" : gap}</b><small>Number ${n}</small></div>`).join("");
}
function loadCache() {
  try {
    const cached = JSON.parse(localStorage.getItem("zayn_vip_history") || "null");
    if (cached?.records?.length) {
      state.records = cached.records;
      state.lastSuccess = cached.savedAt || null;
      render();
      $("freshness").textContent = "Cached data · awaiting live sync";
      $("tableStatus").textContent = "Cached history — verifying live feed";
    }
  } catch { /* Ignore corrupt local cache and wait for API. */ }
}
function updateClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString();
  $("today").textContent = now.toLocaleDateString(undefined, { day:"2-digit", month:"short", year:"numeric" });
}
$("refreshBtn").addEventListener("click", () => fetchPage(1));
$("windowSelect").addEventListener("change", renderStats);
$("loadMore").addEventListener("click", async () => {
  if (state.page < state.totalPages) {
    state.page++;
    await fetchPage(state.page);
  } else {
    $("tableStatus").textContent = "No additional API pages reported.";
  }
});
$("copyEndpoint").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText("https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json");
    $("copyEndpoint").textContent = "✓";
    setTimeout(() => $("copyEndpoint").textContent = "▣", 1400);
  } catch { $("copyEndpoint").textContent = "Copy unavailable"; }
});
loadCache();
updateClock();
fetchPage(1);
setInterval(updateClock, 1000);
setInterval(() => fetchPage(1), 10000);
