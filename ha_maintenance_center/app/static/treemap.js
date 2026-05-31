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
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  if (!items.length) {
    el.innerHTML = "<p class='muted treemap-empty'>Keine Dateien oder Ordner gefunden.</p>";
    return;
  }

  drawNestedTreemap(items, 0, 0, el.clientWidth, el.clientHeight, 0, el);
}

function drawNestedTreemap(items, x, y, w, h, depth, el) {
  if (!items || !items.length || w < 6 || h < 6 || depth > 4) return;

  const visible = items
    .filter(c => (c.value || 0) > 0)
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, depth === 0 ? 120 : 80);

  const boxes = squarify(visible, x, y, w, h);

  for (const b of boxes) {
    if (b.w < 3 || b.h < 3) continue;

    const item = b.item;
    const tile = document.createElement("div");

    tile.className = `tile tile-depth-${Math.min(depth, 3)}`;
    tile.style.left = `${b.x}px`;
    tile.style.top = `${b.y}px`;
    tile.style.width = `${b.w}px`;
    tile.style.height = `${b.h}px`;
    tile.style.background = cushionColor(item.type, depth);

    tile.title = `${item.path || item.name}\n${fmt(item.value)}`;

    const showText = b.w > 75 && b.h > 35;
    tile.innerHTML = showText
      ? `<strong>${esc(item.name)}</strong><small>${fmt(item.value)}</small>`
      : "";

    tile.onclick = (ev) => {
      ev.stopPropagation();
      if (item.children && item.children.length) {
        parentStack.push(currentNode);
        renderTree(item);
      }
    };

    el.appendChild(tile);

    if (item.children && item.children.length && b.w > 90 && b.h > 70) {
      const pad = 8;
      drawNestedTreemap(
        item.children,
        b.x + pad,
        b.y + 24,
        Math.max(0, b.w - pad * 2),
        Math.max(0, b.h - 30),
        depth + 1,
        el
      );
    }
  }
}

function cushionColor(type, depth) {
  const base = {
    backup: [124, 58, 237],
    database: [220, 38, 38],
    log: [249, 115, 22],
    hacs: [37, 99, 235],
    media: [5, 150, 105],
    folder: [71, 85, 105],
    other: [100, 116, 139],
    error: [153, 27, 27]
  }[type] || [100, 116, 139];

  const factor = Math.max(0.55, 1 - depth * 0.12);
  return `rgb(${Math.round(base[0] * factor)}, ${Math.round(base[1] * factor)}, ${Math.round(base[2] * factor)})`;
}
