/*
 * App — shared UI primitives (formatting, control bar, KPI band, tables,
 * funnel, charts) used across all 6 analytics prototypes. Kept intentionally
 * low-level so each prototype can compose its own layout on top.
 */
(function (global) {
  "use strict";
  const D = global.BenchData;

  // ---------------- formatting ----------------
  function formatNumber(n) { return Math.round(n).toLocaleString("en-US"); }
  function formatPercent(n, digits) { return (n == null || isNaN(n) ? "0" : n.toFixed(digits == null ? 1 : digits)) + "%"; }
  function formatCurrency(n) {
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
    return "$" + Math.round(n);
  }
  function formatDate(d) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  function deltaBlock(pct, opts) {
    opts = opts || {};
    const inverse = !!opts.inverse; // true if "down is good" (e.g. bench aging)
    const good = inverse ? pct <= 0 : pct >= 0;
    const cls = pct === 0 ? "" : good ? "up" : "down";
    const arrow = pct === 0 ? "→" : pct > 0 ? "↑" : "↓";
    const suffix = opts.suffix || "";
    const val = isFinite(pct) ? Math.abs(pct).toFixed(1) : "—";
    return `<span class="kpi-delta ${cls}">${arrow} ${val}${suffix} ${opts.label || ""}</span>`;
  }

  // ---------------- select helpers ----------------
  function el(tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => { if (k === "class") e.className = v; else e.setAttribute(k, v); });
    if (html != null) e.innerHTML = html;
    return e;
  }

  function buildControl(label, id, options, selected) {
    const wrap = el("div", { class: "control" });
    wrap.appendChild(el("label", {}, label));
    const sel = el("select", { id });
    options.forEach((opt) => {
      const o = el("option", { value: opt.value }, opt.label);
      if (opt.value === selected) o.selected = true;
      sel.appendChild(o);
    });
    wrap.appendChild(sel);
    return { wrap, sel };
  }

  const PERIOD_OPTIONS = [
    ["this-month", "This Month"], ["last-month", "Last Month"], ["this-week", "This Week"],
    ["last-week", "Last Week"], ["last-30", "Last 30 Days"], ["last-90", "Last 90 Days"],
    ["this-quarter", "This Quarter"], ["last-quarter", "Last Quarter"],
    ["this-year", "This Year"], ["last-year", "Last Year"],
  ];
  const COMPARE_OPTIONS = [
    ["previous-period", "Previous Period"], ["previous-year", "Same Period Last Year"], ["none", "No Comparison"],
  ];
  const GRANULARITY_OPTIONS = [["monthly", "Monthly"], ["weekly", "Weekly"], ["quarterly", "Quarterly"]];

  // ---------------- filter store ----------------
  function createStore(initial) {
    let state = Object.assign({
      periodKey: "this-month", compareMode: "previous-year", granularity: "monthly",
      recruiterId: "all", candidateId: "all", platformId: "all", roleId: "all", clientId: "all",
      location: "all", status: "all",
    }, initial || {});
    const subs = [];
    return {
      get: () => state,
      set(patch) { state = Object.assign({}, state, patch); subs.forEach((fn) => fn(state)); },
      subscribe(fn) { subs.push(fn); },
    };
  }

  // ---------------- control bar ----------------
  // fields: array subset of ['period','compare','granularity','recruiter','candidate','platform','role','client','filtersBtn']
  function renderControlBar(container, store, fields) {
    container.innerHTML = "";
    const bar = el("div", { class: "control-bar" });
    const s = store.get();

    if (fields.includes("period")) {
      const { sel } = buildControl("Period", "ctl-period", PERIOD_OPTIONS.map(([v, l]) => ({ value: v, label: l })), s.periodKey);
      sel.addEventListener("change", (e) => store.set({ periodKey: e.target.value }));
      bar.appendChild(sel.parentElement);
    }
    if (fields.includes("compare")) {
      const { sel } = buildControl("Compare", "ctl-compare", COMPARE_OPTIONS.map(([v, l]) => ({ value: v, label: l })), s.compareMode);
      sel.addEventListener("change", (e) => store.set({ compareMode: e.target.value }));
      bar.appendChild(sel.parentElement);
    }
    if (fields.includes("granularity")) {
      const { sel } = buildControl("Granularity", "ctl-gran", GRANULARITY_OPTIONS.map(([v, l]) => ({ value: v, label: l })), s.granularity);
      sel.addEventListener("change", (e) => store.set({ granularity: e.target.value }));
      bar.appendChild(sel.parentElement);
    }
    if (fields.includes("recruiter")) {
      const opts = [{ value: "all", label: "All Recruiters" }].concat(D.RECRUITERS.map((r) => ({ value: r.id, label: r.name })));
      const { sel } = buildControl("Recruiter", "ctl-recruiter", opts, s.recruiterId);
      sel.addEventListener("change", (e) => store.set({ recruiterId: e.target.value }));
      bar.appendChild(sel.parentElement);
    }
    if (fields.includes("candidate")) {
      const opts = [{ value: "all", label: "All Candidates" }].concat(D.CANDIDATES.map((c) => ({ value: c.id, label: c.name })));
      const { sel } = buildControl("Candidate", "ctl-candidate", opts, s.candidateId);
      sel.addEventListener("change", (e) => store.set({ candidateId: e.target.value }));
      bar.appendChild(sel.parentElement);
    }
    if (fields.includes("platform")) {
      const opts = [{ value: "all", label: "All Platforms" }].concat(D.PLATFORMS.map((p) => ({ value: p.id, label: p.name })));
      const { sel } = buildControl("Platform", "ctl-platform", opts, s.platformId);
      sel.addEventListener("change", (e) => store.set({ platformId: e.target.value }));
      bar.appendChild(sel.parentElement);
    }
    if (fields.includes("role")) {
      const opts = [{ value: "all", label: "All Roles" }].concat(D.ROLES.map((r) => ({ value: r.id, label: r.name })));
      const { sel } = buildControl("Role", "ctl-role", opts, s.roleId);
      sel.addEventListener("change", (e) => store.set({ roleId: e.target.value }));
      bar.appendChild(sel.parentElement);
    }
    if (fields.includes("client")) {
      const opts = [{ value: "all", label: "All Clients" }].concat(D.CLIENTS.map((c) => ({ value: c.id, label: c.name })));
      const { sel } = buildControl("Client", "ctl-client", opts, s.clientId);
      sel.addEventListener("change", (e) => store.set({ clientId: e.target.value }));
      bar.appendChild(sel.parentElement);
    }
    if (fields.includes("filtersBtn")) {
      const btn = el("button", { class: "filters-btn", id: "open-filters-btn" }, "+ Filters");
      bar.appendChild(btn);
    }
    container.appendChild(bar);
  }

  function activeFilterChips(container, store, excludeKeys) {
    const s = store.get();
    const labelMap = {
      recruiterId: (v) => "Recruiter: " + (D.RECRUITERS.find((r) => r.id === v) || {}).name,
      candidateId: (v) => "Candidate: " + (D.candidateById[v] || {}).name,
      platformId: (v) => "Platform: " + (D.PLATFORMS.find((p) => p.id === v) || {}).name,
      roleId: (v) => "Role: " + (D.ROLES.find((r) => r.id === v) || {}).name,
      clientId: (v) => "Client: " + (D.CLIENTS.find((c) => c.id === v) || {}).name,
      location: (v) => "Location: " + v,
      status: (v) => "Status: " + v,
    };
    container.innerHTML = "";
    let any = false;
    Object.entries(labelMap).forEach(([key, fmt]) => {
      if ((excludeKeys || []).includes(key)) return;
      if (s[key] && s[key] !== "all") {
        any = true;
        const chip = el("span", { class: "filter-chip" }, fmt(s[key]) + " ");
        const x = el("button", {}, "✕");
        x.addEventListener("click", () => store.set({ [key]: "all" }));
        chip.appendChild(x);
        container.appendChild(chip);
      }
    });
    container.style.display = any ? "flex" : "none";
  }

  // ---------------- KPI band ----------------
  function renderKPIBand(container, items) {
    container.innerHTML = "";
    const cols = items.length;
    const band = el("div", { class: "kpi-band cols-" + (cols >= 8 ? 8 : cols >= 6 ? 6 : cols >= 5 ? 5 : 4) });
    items.forEach((item) => {
      const k = el("div", { class: "kpi" });
      if (item.onClick) { k.style.cursor = "pointer"; k.addEventListener("click", item.onClick); }
      k.innerHTML = `<div class="kpi-label">${item.label}</div><div class="kpi-value">${item.value}</div>` +
        (item.deltaPct != null ? deltaBlock(item.deltaPct, item.deltaOpts) : (item.deltaHtml || ""));
      band.appendChild(k);
    });
    container.appendChild(band);
  }

  // ---------------- compare readout table ----------------
  function renderCompareReadout(container, title, rows) {
    // rows: [{label, cur, prev, fmt}]
    const table = el("table");
    table.innerHTML = `<thead><tr><th>${title}</th><th>${rows.__labels ? rows.__labels[0] : "Previous"}</th><th>${rows.__labels ? rows.__labels[1] : "Current"}</th><th>Change</th></tr></thead>`;
    const tbody = el("tbody");
    rows.forEach((r) => {
      const pct = D.pctDelta(r.cur, r.prev);
      const fmt = r.fmt || formatNumber;
      const tr = el("tr");
      tr.innerHTML = `<td>${r.label}</td><td>${fmt(r.prev)}</td><td>${fmt(r.cur)}</td><td class="${pct >= 0 ? "text-positive" : "text-negative"}">${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.innerHTML = "";
    container.appendChild(table);
  }

  // ---------------- funnel ----------------
  function renderFunnel(container, stages) {
    container.innerHTML = "";
    const wrap = el("div", { class: "funnel" });
    const max = Math.max(...stages.map((s) => s.value), 1);
    stages.forEach((s, i) => {
      const row = el("div", { class: "funnel-row" });
      const pct = Math.min(Math.max((s.value / max) * 100, 2), 100);
      // conversion vs. previous stage isn't meaningful for Available->Matched (stock vs. flow)
      const conv = i <= 1 ? "" : `${((s.value / stages[i - 1].value) * 100 || 0).toFixed(1)}% conv.`;
      row.innerHTML = `
        <div class="funnel-label">${s.stage}</div>
        <div class="funnel-bar-track"><div class="funnel-bar-fill" style="width:${pct}%"></div></div>
        <div class="funnel-value">${formatNumber(s.value)}</div>
        <div class="funnel-conv">${conv}</div>`;
      wrap.appendChild(row);
    });
    container.appendChild(wrap);
  }

  // ---------------- status stack ----------------
  const STATUS_COLORS = {
    "Available": "var(--accent)", "Submitted": "var(--warning)", "Interviewing": "#7a4fc7",
    "Offered": "var(--negative)", "Placed": "var(--positive)", "At Risk": "var(--warning)",
    "Inactive": "var(--text-tertiary)", "On Hold": "var(--text-tertiary)",
  };
  function renderStatusStack(container, statusMap) {
    container.innerHTML = "";
    const total = Array.from(statusMap.values()).reduce((a, b) => a + b, 0) || 1;
    const max = Math.max(...statusMap.values(), 1);
    Array.from(statusMap.entries()).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
      const row = el("div", { class: "stacked-row" });
      const pct = (count / max) * 100;
      row.innerHTML = `<div class="label">${status}</div><div class="bar-track"><div style="width:${pct}%;background:${STATUS_COLORS[status] || "var(--accent)"}"></div></div><div class="value">${count}</div>`;
      container.appendChild(row);
    });
  }

  // ---------------- tables ----------------
  function renderTable(container, columns, rows, opts) {
    opts = opts || {};
    container.innerHTML = "";
    const table = el("table", { class: "data-table" });
    const thead = el("thead");
    const trh = el("tr");
    columns.forEach((c) => trh.appendChild(el("th", { class: c.align === "right" ? "num" : "" }, c.label)));
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = el("tbody");
    rows.forEach((row) => {
      const tr = el("tr", { class: opts.onRowClick ? "clickable" : "" });
      columns.forEach((c) => {
        const val = typeof c.render === "function" ? c.render(row) : row[c.key];
        tr.appendChild(el("td", { class: c.align === "right" ? "num" : "" }, val));
      });
      if (opts.onRowClick) tr.addEventListener("click", () => opts.onRowClick(row));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
    if (!rows.length) container.appendChild(el("div", { class: "empty-note" }, opts.emptyText || "No matching records"));
  }

  // ---------------- charts (Chart.js) ----------------
  // Hardcoded per-theme palette so chart colors never depend on stylesheet
  // load timing (getComputedStyle can race an external <link>) and so
  // charts can be recolored on demand when the theme toggle fires.
  const PALETTE = {
    light: { "--text": "#1a1d24", "--text-secondary": "#5b6270", "--text-tertiary": "#8a909c", "--border": "#e2e5ea",
      "--accent": "#2554c7", "--positive": "#0f7a4b", "--negative": "#b4232c", "--warning": "#a56405",
      "--chart-1": "#2554c7", "--chart-2": "#0f7a4b", "--chart-3": "#a56405", "--chart-4": "#7a4fc7", "--chart-5": "#b4232c", "--chart-6": "#4a90a4" },
    dark: { "--text": "#e7e9ed", "--text-secondary": "#a3a9b5", "--text-tertiary": "#757c8a", "--border": "#2b2f38",
      "--accent": "#6f97e8", "--positive": "#4cbb87", "--negative": "#e5747c", "--warning": "#d9a441",
      "--chart-1": "#6f97e8", "--chart-2": "#4cbb87", "--chart-3": "#d9a441", "--chart-4": "#a98af0", "--chart-5": "#e5747c", "--chart-6": "#6db8cf" },
  };
  const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  function currentTheme() {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") return attr;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  function cssVar(name) {
    const pal = PALETTE[currentTheme()];
    if (pal && pal[name]) return pal[name];
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || name;
  }
  function applyChartDefaults() {
    Chart.defaults.font.family = FONT_STACK;
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = cssVar("--text-secondary");
    Chart.defaults.borderColor = cssVar("--border");
  }
  applyChartDefaults();

  function lineChart(canvas, labels, series, opts) {
    opts = opts || {};
    return new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: series.map((s) => ({
          label: s.label, data: s.data, borderColor: cssVar(s.color), backgroundColor: cssVar(s.color),
          borderWidth: 2, pointRadius: 2, pointHoverRadius: 4, tension: 0.3, fill: false,
          yAxisID: s.yAxisID || "y",
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: series.length > 1, position: "top", align: "end", labels: { boxWidth: 8, usePointStyle: true } } },
        scales: Object.assign({
          x: { grid: { display: false } },
          y: { grid: { color: cssVar("--border") }, beginAtZero: true },
        }, opts.scales || {}),
      },
    });
  }

  function barChart(canvas, labels, series, opts) {
    opts = opts || {};
    return new Chart(canvas, {
      type: "bar",
      data: { labels, datasets: series.map((s) => ({ label: s.label, data: s.data, backgroundColor: cssVar(s.color), borderRadius: 2, maxBarThickness: 34 })) },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: series.length > 1, position: "top", align: "end", labels: { boxWidth: 8, usePointStyle: true } } },
        scales: {
          x: { grid: { display: false }, stacked: !!opts.stacked },
          y: { grid: { color: cssVar("--border") }, beginAtZero: true, stacked: !!opts.stacked },
        },
        onClick: opts.onClick,
      },
    });
  }

  function horizontalBarChart(canvas, labels, data, opts) {
    opts = opts || {};
    return new Chart(canvas, {
      type: "bar",
      data: { labels, datasets: [{ data, backgroundColor: cssVar(opts.color || "--chart-1"), borderRadius: 2, maxBarThickness: 18 }] },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: cssVar("--border") }, beginAtZero: true }, y: { grid: { display: false } } },
        onClick: opts.onClick,
      },
    });
  }

  function scatterChart(canvas, points, opts) {
    opts = opts || {};
    return new Chart(canvas, {
      type: "bubble",
      data: { datasets: [{ label: opts.label || "", data: points, backgroundColor: cssVar(opts.color || "--chart-1") + "b3" }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ctx.raw.name ? `${ctx.raw.name}: ${opts.tooltip ? opts.tooltip(ctx.raw) : ""}` : "" } },
        },
        scales: {
          x: { title: { display: true, text: opts.xLabel || "" }, grid: { color: cssVar("--border") } },
          y: { title: { display: true, text: opts.yLabel || "" }, grid: { color: cssVar("--border") } },
        },
        onClick: opts.onClick,
      },
    });
  }

  function donutChart(canvas, labels, data, opts) {
    opts = opts || {};
    const colors = opts.colors || ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--chart-6"];
    return new Chart(canvas, {
      type: opts.pie ? "pie" : "doughnut",
      data: { labels, datasets: [{ data, backgroundColor: labels.map((_, i) => cssVar(colors[i % colors.length])), borderColor: cssVar("--surface"), borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: opts.pie ? 0 : "62%",
        plugins: { legend: { position: "right", labels: { boxWidth: 8, usePointStyle: true, padding: 10 } } },
        onClick: opts.onClick,
      },
    });
  }

  function radarChart(canvas, labels, series, opts) {
    opts = opts || {};
    return new Chart(canvas, {
      type: "radar",
      data: { labels, datasets: series.map((s) => ({ label: s.label, data: s.data, borderColor: cssVar(s.color), backgroundColor: cssVar(s.color) + "33", borderWidth: 2, pointRadius: 3 })) },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "top", align: "end", labels: { boxWidth: 8, usePointStyle: true } } },
        scales: { r: { grid: { color: cssVar("--border") }, angleLines: { color: cssVar("--border") }, pointLabels: { font: { size: 11 } }, ticks: { display: false } } },
      },
    });
  }

  function polarAreaChart(canvas, labels, data, opts) {
    opts = opts || {};
    const colors = opts.colors || ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--chart-6"];
    return new Chart(canvas, {
      type: "polarArea",
      data: { labels, datasets: [{ data, backgroundColor: labels.map((_, i) => cssVar(colors[i % colors.length]) + "b3"), borderColor: labels.map((_, i) => cssVar(colors[i % colors.length])) }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "right", labels: { boxWidth: 8, usePointStyle: true, padding: 10 } } },
        scales: { r: { grid: { color: cssVar("--border") }, ticks: { display: false } } },
        onClick: opts.onClick,
      },
    });
  }

  function areaChart(canvas, labels, series, opts) {
    opts = opts || {};
    return new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: series.map((s) => ({
          label: s.label, data: s.data, borderColor: cssVar(s.color), backgroundColor: cssVar(s.color) + "55",
          borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: opts.stacked ? (s.fillTo != null ? s.fillTo : true) : "origin",
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
        plugins: { legend: { display: series.length > 1, position: "top", align: "end", labels: { boxWidth: 8, usePointStyle: true } } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: cssVar("--border") }, beginAtZero: true, stacked: !!opts.stacked },
        },
      },
    });
  }

  // ---------------- sparkline (inline SVG, no Chart.js overhead) ----------------
  function sparklineSVG(data, opts) {
    opts = opts || {};
    const w = opts.width || 72, h = opts.height || 24, pad = 2;
    if (!data.length) return "";
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const stepX = (w - pad * 2) / Math.max(1, data.length - 1);
    const pts = data.map((v, i) => [pad + i * stepX, h - pad - ((v - min) / range) * (h - pad * 2)]);
    const path = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const color = cssVar(opts.color || "--accent");
    const last = pts[pts.length - 1];
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible;">
      <path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2" fill="${color}"/>
    </svg>`;
  }

  // ---------------- KPI band with inline sparklines ----------------
  function renderKPIBandSparkline(container, items) {
    container.innerHTML = "";
    const cols = items.length;
    const band = el("div", { class: "kpi-band cols-" + (cols >= 8 ? 8 : cols >= 6 ? 6 : cols >= 5 ? 5 : 4) });
    items.forEach((item) => {
      const k = el("div", { class: "kpi" });
      if (item.onClick) { k.style.cursor = "pointer"; k.addEventListener("click", item.onClick); }
      const spark = item.series && item.series.length > 1 ? `<div style="margin-top:6px;">${sparklineSVG(item.series, { color: item.deltaPct != null && item.deltaPct < 0 ? "--negative" : "--accent" })}</div>` : "";
      k.innerHTML = `<div class="kpi-label">${item.label}</div><div class="kpi-value">${item.value}</div>` +
        (item.deltaPct != null ? deltaBlock(item.deltaPct, item.deltaOpts) : (item.deltaHtml || "")) + spark;
      band.appendChild(k);
    });
    container.appendChild(band);
  }

  // ---------------- global search ----------------
  function buildSearchIndex() {
    const idx = [];
    D.CANDIDATES.forEach((c) => idx.push({ group: "Candidates", label: c.name, meta: c.role, type: "candidate", id: c.id }));
    D.RECRUITERS.forEach((r) => idx.push({ group: "Recruiters", label: r.name, meta: "Recruiter", type: "recruiter", id: r.id }));
    D.ROLES.forEach((r) => idx.push({ group: "Roles", label: r.name, meta: r.tech, type: "role", id: r.id }));
    D.CLIENTS.forEach((c) => idx.push({ group: "Clients", label: c.name, meta: "Client", type: "client", id: c.id }));
    D.PLATFORMS.forEach((p) => idx.push({ group: "Platforms", label: p.name, meta: "Platform", type: "platform", id: p.id }));
    return idx;
  }
  function wireGlobalSearch(inputEl, resultsEl, onSelect) {
    const index = buildSearchIndex();
    function render(q) {
      if (!q) { resultsEl.hidden = true; resultsEl.innerHTML = ""; return; }
      const matches = index.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())).slice(0, 24);
      if (!matches.length) { resultsEl.innerHTML = `<div class="search-item">No matches</div>`; resultsEl.hidden = false; return; }
      const groups = {};
      matches.forEach((m) => { (groups[m.group] = groups[m.group] || []).push(m); });
      resultsEl.innerHTML = "";
      Object.entries(groups).forEach(([g, items]) => {
        resultsEl.appendChild(el("div", { class: "search-group-label" }, g.toUpperCase()));
        items.forEach((item) => {
          const row = el("div", { class: "search-item" }, `<span>${item.label}</span><span class="meta">${item.meta}</span>`);
          row.addEventListener("click", () => { resultsEl.hidden = true; inputEl.value = ""; if (onSelect) onSelect(item); });
          resultsEl.appendChild(row);
        });
      });
      resultsEl.hidden = false;
    }
    inputEl.addEventListener("input", (e) => render(e.target.value.trim()));
    inputEl.addEventListener("focus", (e) => { if (e.target.value.trim()) render(e.target.value.trim()); });
    document.addEventListener("click", (e) => { if (!resultsEl.contains(e.target) && e.target !== inputEl) resultsEl.hidden = true; });
  }

  // ---------------- filter drawer (shared right-side panel) ----------------
  const CANDIDATE_STATUSES = ["Available", "Submitted", "Interviewing", "Offered", "Placed", "At Risk", "Inactive"];
  function openFilterDrawer(store, fields) {
    closeFilterDrawer();
    const s = store.get();
    const overlay = el("div", { class: "drawer-overlay", id: "drawer-overlay" });
    const drawer = el("div", { class: "drawer", id: "filter-drawer" });
    drawer.innerHTML = `<h3>Filters <span class="drawer-close" id="drawer-close">✕</span></h3>`;

    function section(title, key, items) {
      const sec = el("div", { class: "drawer-section" });
      sec.appendChild(el("div", { class: "drawer-section-title" }, title));
      const allRow = el("label", { class: "drawer-check" }, `<input type="radio" name="${key}" value="all" ${s[key] === "all" || !s[key] ? "checked" : ""}/> All`);
      sec.appendChild(allRow);
      items.forEach(({ value, label }) => {
        const row = el("label", { class: "drawer-check" }, `<input type="radio" name="${key}" value="${value}" ${s[key] === value ? "checked" : ""}/> ${label}`);
        sec.appendChild(row);
      });
      sec.addEventListener("change", (e) => { if (e.target.name === key) store.set({ [key]: e.target.value }); });
      return sec;
    }

    const map = {
      recruiter: () => section("Recruiter", "recruiterId", D.RECRUITERS.map((r) => ({ value: r.id, label: r.name }))),
      platform: () => section("Platform", "platformId", D.PLATFORMS.map((p) => ({ value: p.id, label: p.name }))),
      role: () => section("Role", "roleId", D.ROLES.map((r) => ({ value: r.id, label: r.name }))),
      client: () => section("Client", "clientId", D.CLIENTS.map((c) => ({ value: c.id, label: c.name }))),
      location: () => section("Location", "location", D.LOCATIONS.map((l) => ({ value: l, label: l }))),
      status: () => section("Status", "status", CANDIDATE_STATUSES.map((st) => ({ value: st, label: st }))),
    };
    fields.forEach((f) => { if (map[f]) drawer.appendChild(map[f]()); });

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    overlay.addEventListener("click", closeFilterDrawer);
    drawer.querySelector("#drawer-close").addEventListener("click", closeFilterDrawer);
  }
  function closeFilterDrawer() {
    const o = document.getElementById("drawer-overlay");
    const d = document.getElementById("filter-drawer");
    if (o) o.remove();
    if (d) d.remove();
  }

  // ---------------- sidebar (version switcher) ----------------
  const VERSIONS = [
    { id: "v1", file: "v1-executive-intelligence.html", label: "Executive Intelligence" },
    { id: "v2", file: "v2-power-analytics.html", label: "Power Analytics" },
    { id: "v3", file: "v3-sales-pipeline.html", label: "Sales Pipeline" },
    { id: "v4", file: "v4-candidate-intelligence.html", label: "Candidate Intelligence" },
    { id: "v5", file: "v5-operations-control.html", label: "Operations Control" },
    { id: "v6", file: "v6-strategic-business.html", label: "Strategic Business" },
    { id: "v7", file: "v7-visual-analytics.html", label: "Visual Analytics" },
    { id: "v8", file: "v8-simplified.html", label: "Simplified Analytics" },
  ];
  function renderSidebar(container, activeId) {
    container.innerHTML = "";
    container.appendChild(el("a", { class: "sidebar-back", href: "index.html" }, "← All prototypes"));
    container.appendChild(el("div", { class: "sidebar-brand" }, "ANALYTICS"));
    container.appendChild(el("div", { class: "sidebar-section-title" }, "Unified"));
    container.appendChild(el("a", { class: "sidebar-link" + (activeId === "best" ? " active" : ""), href: "best-of-all.html" },
      `<span class="num">★</span><span>Best of All</span>`));
    container.appendChild(el("div", { class: "sidebar-section-title" }, "Versions"));
    VERSIONS.forEach((v, i) => {
      const a = el("a", { class: "sidebar-link" + (v.id === activeId ? " active" : ""), href: v.file },
        `<span class="num">${String(i + 1).padStart(2, "0")}</span><span>Version ${i + 1} — ${v.label}</span>`);
      container.appendChild(a);
    });
  }

  // ---------------- theme toggle ----------------
  function wireThemeToggle(btn) {
    let saved = null;
    try { saved = localStorage.getItem("bs-theme"); } catch (e) {}
    let theme = saved || "light";
    function apply(isInitial) {
      document.documentElement.setAttribute("data-theme", theme);
      btn.innerHTML = theme === "dark" ? "☀ Light" : "🌙 Dark";
      try { localStorage.setItem("bs-theme", theme); } catch (e) {}
      applyChartDefaults();
      if (!isInitial) window.dispatchEvent(new CustomEvent("bs-theme-change", { detail: { theme } }));
    }
    apply(true);
    btn.addEventListener("click", () => { theme = theme === "dark" ? "light" : "dark"; apply(false); });
  }

  // ---------------- per-chart card menu (view data / export / etc.) ----------------
  function downloadCSV(filename, columns, rows) {
    const header = columns.map((c) => `"${c.label}"`).join(",");
    const lines = rows.map((r) => columns.map((c) => {
      const v = typeof c.render === "function" ? c.render(r) : r[c.key];
      const text = String(v).replace(/<[^>]*>/g, "");
      return `"${text.replace(/"/g, '""')}"`;
    }).join(","));
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderCardMenu(hostEl, columns, rows, opts) {
    opts = opts || {};
    hostEl.innerHTML = "";
    const wrap = el("div", { class: "card-menu-wrap" });
    const trigger = el("div", { class: "card-menu" }, "⋮");
    wrap.appendChild(trigger);
    let dropdown = null, dataShown = false;
    const dataHost = opts.dataHost;
    function closeDropdown() { if (dropdown) { dropdown.remove(); dropdown = null; } document.removeEventListener("click", onDocClick); }
    function onDocClick(e) { if (!wrap.contains(e.target)) closeDropdown(); }
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dropdown) { closeDropdown(); return; }
      dropdown = el("div", { class: "card-menu-dropdown" });
      const viewBtn = el("button", {}, dataShown ? "Hide data" : "View data");
      viewBtn.addEventListener("click", () => {
        dataShown = !dataShown;
        if (dataShown && dataHost) { renderTable(dataHost, columns, rows); }
        else if (dataHost) { dataHost.innerHTML = ""; }
        closeDropdown();
      });
      const exportBtn = el("button", {}, "Export CSV");
      exportBtn.addEventListener("click", () => { downloadCSV((opts.filename || "data") + ".csv", columns, rows); closeDropdown(); });
      dropdown.appendChild(viewBtn);
      dropdown.appendChild(exportBtn);
      if (opts.onDrill) {
        const drillBtn = el("button", {}, "Drill down");
        drillBtn.addEventListener("click", () => { opts.onDrill(); closeDropdown(); });
        dropdown.appendChild(drillBtn);
      }
      wrap.appendChild(dropdown);
      document.addEventListener("click", onDocClick);
    });
    hostEl.appendChild(wrap);
  }

  // ---------------- wide side panel (slide-over, e.g. candidate profile) ----------------
  function openSidePanel(title, buildFn) {
    closeSidePanel();
    const overlay = el("div", { class: "panel-overlay", id: "side-panel-overlay" });
    const panel = el("div", { class: "side-panel", id: "side-panel" });
    panel.innerHTML = `<div class="side-panel-header"><div class="card-title" style="font-size:14px;">${title}</div><button class="side-panel-close" id="side-panel-close" type="button">✕</button></div><div class="side-panel-body" id="side-panel-body"></div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(panel);
    overlay.addEventListener("click", closeSidePanel);
    panel.querySelector("#side-panel-close").addEventListener("click", closeSidePanel);
    buildFn(panel.querySelector("#side-panel-body"));
  }
  function closeSidePanel() {
    const o = document.getElementById("side-panel-overlay");
    const p = document.getElementById("side-panel");
    if (o) o.remove();
    if (p) p.remove();
  }

  global.App = {
    formatNumber, formatPercent, formatCurrency, formatDate, deltaBlock,
    createStore, renderControlBar, activeFilterChips,
    renderKPIBand, renderCompareReadout, renderFunnel, renderStatusStack, renderTable,
    lineChart, barChart, horizontalBarChart, scatterChart, cssVar, applyChartDefaults,
    donutChart, radarChart, polarAreaChart, areaChart, sparklineSVG, renderKPIBandSparkline,
    wireGlobalSearch, el,
    openFilterDrawer, closeFilterDrawer,
    renderSidebar, wireThemeToggle,
    renderCardMenu, downloadCSV,
    openSidePanel, closeSidePanel,
  };
})(window);
