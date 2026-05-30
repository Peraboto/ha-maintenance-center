function apiUrl(path) {
  const base = window.location.pathname.replace(/\/$/, "");
  return `${base}${path}`;
}

function fmt(bytes) {
  if (!bytes) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 ? 1 : 2)} ${u[i]}`;
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[c]));
}

function statusClass(p) {
  return p > 90 ? "status-danger" : p > 75 ? "status-warn" : "status-ok";
}

let treeRoot = null;
let currentNode = null;
let parentStack = [];

async function load() {
  try {
    setLoading(true);

    const [summaryResp, treeResp] = await Promise.all([
      fetch(apiUrl("/api/summary")),
      fetch(apiUrl("/api/treemap"))
    ]);

    if (!summaryResp.ok) throw new Error(`/api/summary HTTP ${summaryResp.status}`);
    if (!treeResp.ok) throw new Error(`/api/treemap HTTP ${treeResp.status}`);

    const summary = await summaryResp.json();
    const tree = await treeResp.json();

    treeRoot = tree;
    currentNode = tree;
    parentStack = [];

    renderSummary(summary);
    renderTree(currentNode);
  } catch (err) {
    showError(err);
  } finally {
    setLoading(false);
  }
}

function setLoading(active) {
  const btn = document.getElementById("refresh");
  if (btn) btn.textContent = active ? "Lade..." : "Aktualisieren";
}

function showError(err) {
  const cards = document.getElementById("cards");
  if (cards) {
    cards.innerHTML = `<div class="card error"><h3>Fehler</h3><p>${esc(err.message || err)}</p></div>`;
  }
}

document.getElementById("refresh").onclick = load;

function renderSummary(s) {
  const cards = document.getElementById("cards");
  const m = s.system?.memory || {};
  const sw = s.system?.swap || {};

  cards.innerHTML = `
    <div class="card"><h3>CPU</h3><div class="value">${esc(s.system?.cpu_percent ?? "?")}%</div></div>
    <div class="card"><h3>RAM</h3><div class="value ${statusClass(m.percent || 0)}">${esc(m.percent ?? "?")}%</div><small>${fmt(m.available)} verfügbar</small></div>
    <div class="card"><h3>SWAP</h3><div class="value ${statusClass(sw.percent || 0)}">${esc(sw.percent ?? "?")}%</div><small>${fmt(sw.used)} / ${fmt(sw.total)}</small></div>
    <div class="card"><h3>Backups</h3><div class="value">${s.backups?.length || 0}</div><small>${fmt((s.backups || []).reduce((a,b)=>a+(b.size||0),0))}</small></div>
    <div class="card"><h3>Datenbank</h3><div class="value">${fmt((s.database || []).reduce((a,b)=>a+(b.size||0),0))}</div></div>
  `;

  document.getElementById("backups").innerHTML =
    table(["Name", "Größe", "Alter"], (s.backups || []).slice(0, 30).map(b => [
      b.name, fmt(b.size), `${b.age_days ?? "?"} Tage`
    ]));

  document.getElementById("database").innerHTML =
    table(["Name", "Größe", "Pfad"], (s.database || []).map(d => [
      d.name, fmt(d.size), d.path
    ]));

  renderUsb(s.usb || {});
  renderContainers(s.containers || {});
}

function table(headers, rows) {
  if (!rows.length) return "<p class='muted'>Keine Daten gefunden.</p>";
  return `
    <table>
      <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function renderUsb(u) {
  let html = "<h3>lsusb</h3>";
  html += table(["Gerät"], (u.lsusb || []).map(x => [
    `${x.is_busch_jaeger_knx ? "KNX: " : ""}${x.is_realtek_rtl2832u ? "RTL2832U: " : ""}${x.raw || ""}`
  ]));

  html += "<h3>hidraw</h3>";
  html += table(["Dev", "Name", "VID:PID", "Hinweis"], (u.hidraw || []).map(h => [
    h.dev,
    h.name,
    `${h.vid || ""}:${h.pid || ""}`,
    h.is_busch_jaeger_knx ? "Busch-Jaeger KNX" : ""
  ]));

  document.getElementById("usb").innerHTML = html;
}

function renderContainers(c) {
  if (!c.available) {
    document.getElementById("containers").innerHTML =
      `<p class="muted">Docker nicht verfügbar: ${esc(c.error || "")}</p>`;
    return;
  }

  document.getElementById("containers").innerHTML =
    table(["Container", "CPU", "RAM", "RAM %"], (c.rows || []).map(r => [
      r.name, r.cpu, r.memory, r.mem_percent
    ]));
}

function color(type) {
  return {
    backup: "#7c3aed",
    database: "#dc2626",
    log: "#f97316",
    hacs: "#2563eb",
    media: "#059669",
    folder: "#334155",
    other: "#475569",
    error: "#991b1b"
  }[type] || "#475569";
}

function squarify(items, x, y, w, h) {
  const total = items.reduce((a, b) => a + (b.value || 0), 0) || 1;
  const area = w * h;

  const scaled = items
    .map(item => ({ item, area: ((item.value || 0) / total) * area }))
    .filter(d => d.area > 1);

  const out = [];

  function worst(row, side) {
    if (!row.length) return Infinity;
    const sum = row.reduce((a, b) => a + b.area, 0);
    const max = Math.max(...row.map(d => d.area));
    const min = Math.min(...row.map(d => d.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  }

  function layoutRow(row, rect) {
    const sum = row.reduce((a, b) => a + b.area, 0);

    if (rect.w >= rect.h) {
      const rh = sum / rect.w;
      let cx = rect.x;
      for (const r of row) {
        const rw = r.area / rh;
        out.push({ item: r.item, x: cx, y: rect.y, w: rw, h: rh });
        cx += rw;
      }
      rect.y += rh;
      rect.h -= rh;
    } else {
      const rw = sum / rect.h;
      let cy = rect.y;
      for (const r of row) {
        const rh = r.area / rw;
        out.push({ item: r.item, x: rect.x, y: cy, w: rw, h: rh });
        cy += rh;
      }
      rect.x += rw;
      rect.w -= rw;
    }
  }

  let rect = { x, y, w, h };
  let row = [];

  for (const item of scaled) {
    const side = Math.min(rect.w, rect.h);
    if (!row.length || worst([...row, item], side) <= worst(row, side)) {
      row.push(item);
    } else {
      layoutRow(row, rect);
      row = [item];
    }
  }

  if (row.length) layoutRow(row, rect);
  return out;
}

function renderTree(node) {
  currentNode = node;

  const breadcrumb = document.getElementById("breadcrumb");
  breadcrumb.innerHTML = `
    <span>${esc(node.path || node.name || "/")}</span>
    ${parentStack.length ? "<button id='upBtn'>Zurück</button>" : ""}
  `;

  const upBtn = document.getElementById("upBtn");
  if (upBtn) {
    upBtn.onclick = () => {
      currentNode = parentStack.pop() || treeRoot;
      renderTree(currentNode);
    };
  }

  const el = document.getElementById("treemap");
  el.innerHTML = "";

  const items = (node.children || [])
    .filter(c => (c.value || 0) > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 250);

  if (!items.length) {
    el.innerHTML = "<p class='muted treemap-empty'>Keine Dateien oder Ordner gefunden.</p>";
    return;
  }

  const boxes = squarify(items, 0, 0, el.clientWidth, el.clientHeight);

  for (const b of boxes) {
    if (b.w < 4 || b.h < 4) continue;

    const d = document.createElement("div");
    d.className = "tile";
    d.style.left = `${b.x}px`;
    d.style.top = `${b.y}px`;
    d.style.width = `${b.w}px`;
    d.style.height = `${b.h}px`;
    d.style.background = color(b.item.type);

    d.title = `${b.item.path || b.item.name}\n${fmt(b.item.value)}`;

    const showText = b.w > 70 && b.h > 35;
    d.innerHTML = showText
      ? `<strong>${esc(b.item.name)}</strong><small>${fmt(b.item.value)}</small>`
      : "";

    d.onclick = () => {
      if (b.item.children && b.item.children.length) {
        parentStack.push(currentNode);
        renderTree(b.item);
      }
    };

    el.appendChild(d);
  }
}

window.addEventListener("resize", () => {
  if (currentNode) renderTree(currentNode);
});

load();
