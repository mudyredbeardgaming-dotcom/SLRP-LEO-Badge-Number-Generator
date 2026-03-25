// ── API helpers ──────────────────────────────────────────────
async function api(method, url, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);
    return res.json();
  } catch {
    return { error: "Cannot reach server. Make sure you opened http://localhost:3000 — not the HTML file directly." };
  }
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("hidden");
  }, 3000);
}

// ── Result box ────────────────────────────────────────────────
function showResult(id, html, isError = false) {
  const el = document.getElementById(id);
  el.innerHTML = html;
  el.className = `result-box ${isError ? "error" : "success"}`;
}

// ── Rank pill HTML ─────────────────────────────────────────────
function rankPill(rank) {
  return `<span class="rank-pill rank-${rank}">${rank}</span>`;
}

// ── ASSIGN ────────────────────────────────────────────────────
document.getElementById("form-assign").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("assign-name").value.trim();
  const rank = document.getElementById("assign-rank").value;
  const res = await api("POST", "/api/assign", { name, rank });
  if (res.success) {
    const d = res.data;
    showResult("assign-result", `Assigned Badge <strong>#${d.badgeNumber}</strong> to <strong>${d.name}</strong> as ${rankPill(d.rank)}`);
    showToast(`Badge #${d.badgeNumber} assigned to ${d.name}`);
    document.getElementById("assign-name").value = "";
    loadRoster(currentFilter);
  } else {
    showResult("assign-result", res.error || "Unknown error.", true);
  }
});

// ── PROMOTE ───────────────────────────────────────────────────
document.getElementById("form-promote").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("promote-name").value.trim();
  const newRank = document.getElementById("promote-rank").value;
  const res = await api("POST", "/api/promote", { name, newRank });
  if (res.success) {
    const d = res.data;
    showResult(
      "promote-result",
      `<strong>${d.name}</strong> promoted to ${rankPill(d.rank)}<br>
       Badge changed: <strong>#${d.previousBadge}</strong> &rarr; <strong>#${d.badgeNumber}</strong>`
    );
    showToast(`${d.name} promoted to ${d.rank}`);
    document.getElementById("promote-name").value = "";
    loadRoster(currentFilter);
  } else {
    showResult("promote-result", res.error || "Unknown error.", true);
  }
});

// ── LOOKUP ────────────────────────────────────────────────────
async function doLookup() {
  const name = document.getElementById("lookup-name").value.trim();
  if (!name) return;
  const res = await api("GET", `/api/lookup/${encodeURIComponent(name)}`);
  if (res.success) {
    const d = res.data;
    showResult("lookup-result", `<strong>${d.name}</strong> &mdash; ${rankPill(d.rank)} &mdash; Badge <strong>#${d.badgeNumber}</strong>`);
  } else {
    showResult("lookup-result", res.error, true);
  }
}

// ── REMOVE ────────────────────────────────────────────────────
async function doRemove() {
  const name = document.getElementById("lookup-name").value.trim();
  if (!name) return;
  if (!confirm(`Remove "${name}" from the roster? Their badge number will be freed.`)) return;
  const res = await api("DELETE", `/api/remove/${encodeURIComponent(name)}`);
  if (res.success) {
    showResult("lookup-result", `<strong>${name}</strong> has been removed from the roster.`);
    showToast(`${name} removed`);
    document.getElementById("lookup-name").value = "";
    loadRoster(currentFilter);
  } else {
    showResult("lookup-result", res.error, true);
  }
}

// ── ROSTER ────────────────────────────────────────────────────
let currentFilter = "";

async function loadRoster(rank = "") {
  const url = rank ? `/api/list?rank=${rank}` : "/api/list";
  const res = await api("GET", url);
  const tbody = document.getElementById("roster-body");

  if (!res.success || res.data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">No personnel on record.</td></tr>`;
    return;
  }

  tbody.innerHTML = res.data.map((r) => `
    <tr>
      <td class="badge-num">#${r.badgeNumber}</td>
      <td>${rankPill(r.rank)}</td>
      <td>${r.name}</td>
      <td style="text-align:right">
        <button class="btn btn-red btn-sm" onclick="quickRemove('${r.name.replace(/'/g, "\\'")}')">Remove</button>
      </td>
    </tr>
  `).join("");
}

async function quickRemove(name) {
  if (!confirm(`Remove "${name}" from the roster?`)) return;
  const res = await api("DELETE", `/api/remove/${encodeURIComponent(name)}`);
  if (res.success) {
    showToast(`${name} removed`);
    loadRoster(currentFilter);
  } else {
    showToast(`Error: ${res.error}`);
  }
}

// ── Filter tabs ───────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.rank;
    loadRoster(currentFilter);
  });
});

// ── Lookup on Enter ───────────────────────────────────────────
document.getElementById("lookup-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLookup();
});

// ── Init ──────────────────────────────────────────────────────
loadRoster();
