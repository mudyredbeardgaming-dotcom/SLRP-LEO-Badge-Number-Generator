// ── Department config ─────────────────────────────────────────
const DEPT_CONFIG = {
  lapd: {
    title:    "LAPD Badge Number Generator",
    subtitle: "Los Angeles Police Department \u2014 GTA V RP",
    seal:     "Seal_of_Los_Angeles,_California.png",
    ranks: [
      { value: "lieutenant", label: "Lieutenant" },
      { value: "detective",  label: "Detective"  },
      { value: "sergeant",   label: "Sergeant"   },
      { value: "p3",         label: "P3"         },
      { value: "officer",    label: "Officer"    },
    ],
  },
  lasd: {
    title:    "LASD Badge Number Generator",
    subtitle: "Los Angeles Sheriff\u2019s Department \u2014 GTA V RP",
    seal:     "LASD logo.png?v=2",
    ranks: [
      { value: "lieutenant",     label: "Lieutenant"      },
      { value: "detective",      label: "Detective"       },
      { value: "watch_sergeant", label: "Watch Sergeant"  },
      { value: "field_sergeant", label: "Field Sergeant"  },
      { value: "sr_deputy",      label: "Sr. Deputy"      },
      { value: "deputy",         label: "Deputy"          },
    ],
  },
};

let currentDepartment = "lapd";
let currentFilter     = "";

// ── API helpers ───────────────────────────────────────────────
async function api(method, url, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);
    return res.json();
  } catch {
    return { error: "Cannot reach server. Make sure you opened http://localhost:3000 \u2014 not the HTML file directly." };
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

// ── Rank pill HTML ────────────────────────────────────────────
function rankPill(rank) {
  return `<span class="rank-pill rank-${rank}">${rank.replace("_", " ")}</span>`;
}

// ── Populate rank dropdowns ───────────────────────────────────
function populateRanks(dept) {
  const ranks = DEPT_CONFIG[dept].ranks;
  const html = ranks.map((r) => `<option value="${r.value}">${r.label}</option>`).join("");
  document.getElementById("assign-rank").innerHTML  = html;
  document.getElementById("promote-rank").innerHTML = html;
}

// ── Render roster filter tabs ─────────────────────────────────
function renderTabs(dept) {
  const ranks = DEPT_CONFIG[dept].ranks;
  const container = document.getElementById("filter-tabs");
  const allBtn = `<button class="tab ${currentFilter === "" ? "active" : ""}" data-rank="">All</button>`;
  const rankBtns = ranks.map((r) =>
    `<button class="tab ${currentFilter === r.value ? "active" : ""}" data-rank="${r.value}">${r.label}s</button>`
  ).join("");
  container.innerHTML = allBtn + rankBtns;

  container.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      currentFilter = tab.dataset.rank;
      renderTabs(currentDepartment);
      loadRoster();
    });
  });
}

// ── Switch department ─────────────────────────────────────────
function switchDepartment(dept) {
  currentDepartment = dept;
  currentFilter     = "";

  const cfg = DEPT_CONFIG[dept];
  document.getElementById("dept-title").textContent    = cfg.title;
  document.getElementById("dept-subtitle").textContent = cfg.subtitle;
  document.getElementById("dept-seal").src             = cfg.seal;
  document.getElementById("roster-title").textContent  = `${dept.toUpperCase()} Roster`;

  document.querySelectorAll(".dept-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.dept === dept);
  });

  document.body.dataset.dept = dept;
  populateRanks(dept);
  renderTabs(dept);
  loadRoster();

  // Clear result boxes on switch
  ["assign-result", "promote-result", "lookup-result"].forEach((id) => {
    const el = document.getElementById(id);
    el.className = "result-box hidden";
    el.innerHTML = "";
  });
}

// ── ASSIGN ────────────────────────────────────────────────────
document.getElementById("form-assign").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name        = document.getElementById("assign-name").value.trim();
  const rank        = document.getElementById("assign-rank").value;
  const manualInput = document.getElementById("assign-badge-number").value.trim();
  const body        = { name, rank, department: currentDepartment };
  if (manualInput) body.badgeNumber = parseInt(manualInput, 10);
  const res  = await api("POST", "/api/assign", body);
  if (res.success) {
    const d = res.data;
    showResult("assign-result", `Assigned Badge <strong>#${d.badgeNumber}</strong> to <strong>${d.name}</strong> as ${rankPill(d.rank)}`);
    showToast(`Badge #${d.badgeNumber} assigned to ${d.name}`);
    document.getElementById("assign-name").value = "";
    document.getElementById("assign-badge-number").value = "";
    loadRoster();
  } else {
    showResult("assign-result", res.error || "Unknown error.", true);
  }
});

// ── PROMOTE ───────────────────────────────────────────────────
document.getElementById("form-promote").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name    = document.getElementById("promote-name").value.trim();
  const newRank = document.getElementById("promote-rank").value;
  const res     = await api("POST", "/api/promote", { name, newRank, department: currentDepartment });
  if (res.success) {
    const d = res.data;
    showResult(
      "promote-result",
      `<strong>${d.name}</strong> promoted to ${rankPill(d.rank)}<br>
       Badge changed: <strong>#${d.previousBadge}</strong> &rarr; <strong>#${d.badgeNumber}</strong>`
    );
    showToast(`${d.name} promoted to ${d.rank}`);
    document.getElementById("promote-name").value = "";
    loadRoster();
  } else {
    showResult("promote-result", res.error || "Unknown error.", true);
  }
});

// ── LOOKUP ────────────────────────────────────────────────────
async function doLookup() {
  const name = document.getElementById("lookup-name").value.trim();
  if (!name) return;
  const res = await api("GET", `/api/lookup/${encodeURIComponent(name)}?department=${currentDepartment}`);
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
  if (!confirm(`Remove "${name}" from the ${currentDepartment.toUpperCase()} roster? Their badge number will be freed.`)) return;
  const res = await api("DELETE", `/api/remove/${encodeURIComponent(name)}?department=${currentDepartment}`);
  if (res.success) {
    showResult("lookup-result", `<strong>${name}</strong> has been removed from the ${currentDepartment.toUpperCase()} roster.`);
    showToast(`${name} removed`);
    document.getElementById("lookup-name").value = "";
    loadRoster();
  } else {
    showResult("lookup-result", res.error, true);
  }
}

// ── ROSTER ────────────────────────────────────────────────────
async function loadRoster() {
  const url   = `/api/list?department=${currentDepartment}${currentFilter ? `&rank=${currentFilter}` : ""}`;
  const res   = await api("GET", url);
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
  if (!confirm(`Remove "${name}" from the ${currentDepartment.toUpperCase()} roster?`)) return;
  const res = await api("DELETE", `/api/remove/${encodeURIComponent(name)}?department=${currentDepartment}`);
  if (res.success) {
    showToast(`${name} removed`);
    loadRoster();
  } else {
    showToast(`Error: ${res.error}`);
  }
}

// ── Department selector clicks ────────────────────────────────
document.querySelectorAll(".dept-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchDepartment(btn.dataset.dept));
});

// ── Lookup on Enter ───────────────────────────────────────────
document.getElementById("lookup-name").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLookup();
});

// ── Init ──────────────────────────────────────────────────────
switchDepartment("lapd");
