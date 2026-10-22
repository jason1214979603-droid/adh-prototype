/* ===== ADH 核心：状态 / 权限 / 路由 / 组件 / 图表 ===== */
const ADH = {
  state: { role: "optimizer", env: "DEMO", route: "workbench", params: {} },
  pages: {}, actions: {}, tblState: {}, uiState: {}, seq: 0
};
ADH.data = ADH_DATA;

/* ---------- 权限 ---------- */
ADH.can = function (action) {
  const row = ADH_PERM[action];
  if (!row) return true;
  return !!row[ADH.state.role];
};
ADH.roleLabel = function () { return ADH_ROLES[ADH.state.role].label; };
ADH.rolePerson = function () { return ADH_ROLES[ADH.state.role].person; };
/* designer 的数据权限：仅素材维度 */
ADH.dimensionScope = function () { return ADH.state.role === "designer" ? "asset-only" : "all"; };

/* ---------- 工具 ---------- */
/* 端点标签仅在开发资料中保留，界面不再显示接口路径。 */
ADH.ep = function () { return ""; };
ADH.esc = function (s) {
  return String(s === null || s === undefined ? "" : s).replace(/[&<>"]/g, function (c) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
  });
};
ADH.cleanText = function (value) {
  let s = String(value === null || value === undefined ? "" : value);
  if (!s) return s;
  s = s.replace(/\b(?:FR|BR|AC|NFR)-(?:[A-Z]+-)?[0-9][0-9A-Za-z.]*(?:\s*[~/]\s*[0-9A-Za-z.-]+)*/g, "");
  s = s.replace(/\bPRD(?:\s*[0-9]+(?:\.[0-9]+)*)?/g, "");
  s = s.replace(/\/v(?:1|26\.0)\/[\w{}./:-]*/g, "");
  s = s.replace(/\b(?:POST|GET|PUT|PATCH|DELETE)\b\s*/g, "");
  s = s.replace(/本页为交互原型[，,]?\s*数据均为演示数据/g, "");
  s = s.replace(/交互原型/g, "");
  s = s.replace(/原型模拟/g, "模拟");
  s = s.replace(/演示数据/g, "数据");
  s = s.replace(/真实接口/g, "真实数据");
  s = s.replace(/接口/g, "能力");
  s = s.replace(/端点/g, "");
  s = s.replace(/契约/g, "规则");
  s = s.replace(/服务端/g, "系统");
  s = s.replace(/原型/g, "");
  s = s.replace(/validate_only/g, "参数校验");
  s = s.replace(/synchronous_ad_review/g, "同步审核");
  s = s.replace(/execution_options/g, "预检选项");
  s = s.replace(/tree\.pull/g, "渠道回查");
  s = s.replace(/issues_info/g, "拒审信息");
  s = s.replace(/Meta v26\.0/g, "Meta");
  s = s.replace(/v26\.0/g, "");
  s = s.replace(/API/g, "能力");
  s = s.replace(/Mock/gi, "数据");
  s = s.replace(/([（(])([^（）()]*?)\s*[·,，/;；\-]+\s*([）)])/g, "$1$2$3");
  s = s.replace(/([（(])\s*[·,，/;；\-]+\s*/g, "$1");
  s = s.replace(/\s*[·,，/;；\-]+\s*([）)])/g, "$1");
  s = s.replace(/（\s*）/g, "");
  s = s.replace(/\(\s*\)/g, "");
  s = s.replace(/\s*·\s*(?=[，。；：、）)]|$)/g, "");
  s = s.replace(/\s{2,}/g, " ");
  s = s.replace(/\s+([，。；：、])/g, "$1");
  s = s.replace(/([（(])\s+/g, "$1");
  s = s.replace(/\s+([）)])/g, "$1");
  return s;
};
ADH.scrubUI = function (root) {
  if (!root) return root;
  root.querySelectorAll(".ep-row,.ep-chip,.note.rule,.note.info").forEach(function (el) { el.remove(); });
  root.querySelectorAll("[title]").forEach(function (el) { el.setAttribute("title", ADH.cleanText(el.getAttribute("title"))); });
  root.querySelectorAll("[aria-label]").forEach(function (el) { el.setAttribute("aria-label", ADH.cleanText(el.getAttribute("aria-label"))); });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(function (n) {
    const cleaned = ADH.cleanText(n.nodeValue);
    if (cleaned !== n.nodeValue) n.nodeValue = cleaned;
  });
  root.querySelectorAll(".note").forEach(function (el) { if (!el.textContent.trim()) el.remove(); });
  return root;
};
ADH.fmt = {
  money: function (v, cur) { return (cur ? "" : "") + ADH.num(v, 2) + (cur ? " " + cur : ""); },
  int: function (v) { return ADH.num(v, 0); },
  pct: function (v, d) { return (v * 100).toFixed(d === undefined ? 2 : d) + "%"; },
  ratio: function (v) { return ADH.num(v, 2); },
  delta: function (v) { return (v >= 0 ? "+" : "") + (v * 100).toFixed(1) + "%"; }
};
ADH.num = function (v, d) {
  const n = Number(v || 0);
  return n.toLocaleString("en-US", { minimumFractionDigits: d === undefined ? 0 : d, maximumFractionDigits: d === undefined ? 0 : d });
};
ADH.short = function (v) {
  const n = Number(v || 0);
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + "亿";
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + "万";
  return ADH.num(n, 0);
};
ADH.pct = function (v, d) { return (Number(v) * 100).toFixed(d === undefined ? 2 : d) + "%"; };
ADH.roi = function (roas) { return Number(roas || 0) - 1; };
ADH.roiHtml = function (roas) {
  const v = ADH.roi(roas);
  return '<span class="mono xs" style="color:' + (v >= 0 ? "var(--ok)" : "var(--danger)") + '">' + ADH.pct(v, 1) + "</span>";
};
ADH.spendWarn = function (pct) { return pct > 0.5 ? "high" : (pct > 0.2 ? "" : ""); };

/* ---------- 图标 ---------- */
const ADH_ICONS = {
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5", wallet: "M3 7.5h15a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm0 0V6a2 2 0 0 1 2-2h10M17 14h.01",
  plug: "M9 3v6M15 3v6M6 9h12v2a6 6 0 0 1-12 0zM12 17v4", folder: "M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  image: "M4 5h16v14H4zM8.5 10.5a1.5 1.5 0 1 0 0-.01M20 16l-5-5-6 6-2-2-3 3", layers: "M12 3 3 8l9 5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5",
  tag: "M20.5 13.5 13 21a2 2 0 0 1-2.8 0L3 13.8V4h9.8l7.7 7.7a2 2 0 0 1 0 2.8zM7.5 7.5h.01",
  wand: "M15 4V2M15 10V8M11.5 6h-2M20.5 6h-2M12 3l-9 18h18L12 3zM9 15h6", toggle: "M8 8h8a4 4 0 1 1 0 8H8a4 4 0 1 1 0-8zM12 12h.01",
  target: "M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6z", chart: "M4 20V10M10 20V4M16 20v-7M22 20H2", pie: "M12 3a9 9 0 1 0 9 9h-9z",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6", link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5",
  flow: "M6 4h5v5H6zM13 15h5v5h-5zM8.5 9v4a3 3 0 0 0 3 3H13", download: "M12 3v12M7 11l5 5 5-5M4 20h16",
  users: "M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-2a4 4 0 0 0-3-3.9M17 3.2a4 4 0 0 1 0 7.6",
  shield: "M12 3l8 3v6c0 5-3.4 8.2-8 9.5C7.4 20.2 4 17 4 12V6zM9.5 12l2 2 3.5-4", bell: "M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7M10.5 20.5a2 2 0 0 0 3 0",
  sliders: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2M14 4v4M8 10v4M14 16v4",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.5-4.5", close: "M6 6l12 12M18 6L6 18",
  chevron: "M9 6l6 6-6 6", down: "M6 9l6 6 6-6", plus: "M12 5v14M5 12h14", refresh: "M20 11A8 8 0 0 0 6.6 6.6L4 9M4 13a8 8 0 0 0 13.4 4.4L20 15M4 5v4h4M20 19v-4h-4",
  warn: "M12 3 2 20h20zM12 9v5M12 17.5h.01", info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01",
  check: "M4 12.5 9 17.5 20 6.5", lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  play: "M7 4l12 8-12 8z", pause: "M9 5v14M15 5v14", trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10.5 11v6M13.5 11v6",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1", edit: "M4 20h4l11-11-4-4L4 16zM14 5l4 4", eye: "M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  arrow: "M5 12h14M13 6l6 6-6 6", ext: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6", filter: "M3 5h18l-7 8v7l-4-2v-5z",
  upload: "M12 21V9M7 13l5-5 5 5M4 4h16", clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3.5 2", spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  cake: "M4 20h16V10l-8-5-8 5zM9 13h.01M15 13h.01", save: "M5 3h11l3 3v15H5zM8 3v6h7V3M8 21v-7h8v7", send: "M4 12l16-8-6 16-3-6z",
  split: "M6 3v6a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v6M3 6h6M15 18h6", grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
};
ADH.icon = function (name, size, cls) {
  const d = ADH_ICONS[name] || ADH_ICONS.info;
  return '<svg class="ico' + (cls ? " " + cls : "") + '" width="' + (size || 16) + '" height="' + (size || 16) +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
};

/* ---------- 导航 / 路由 ---------- */
ADH.routeTo = function (id, params) {
  ADH.state.route = id; ADH.state.params = params || {};
  location.hash = "#/" + id + (params && params.sub ? "?sub=" + params.sub : "");
  ADH.render();
  window.scrollTo(0, 0);
};
ADH.currentPage = function () { return ADH.pages[ADH.state.route] || { title: "未找到", render: function () { return ADH.empty("页面不存在"); } }; };
ADH.page = function (id, def) { ADH.pages[id] = def; };
ADH.act = function (name, el, ev) {
  const fn = ADH.actions[name];
  if (!fn) { ADH.toast("动作未实现：" + name, "warn"); return; }
  const payload = {};
  if (el && el.dataset) Object.keys(el.dataset).forEach(function (k) { payload[k] = el.dataset[k]; });
  fn(payload, el, ev);
};
/* 注册动作；若第二个参数不是函数，则视为「立即调用」入口（原型内部便捷写法） */
ADH.action = function (name, arg) {
  if (typeof arg === "function") { ADH.actions[name] = arg; return arg; }
  return ADH.act(name, { dataset: arg || {} });
};

/* ---------- 通用组件 ---------- */
ADH.chip = function (tone, text, dot) {
  return '<span class="chip ' + tone + '">' + (dot ? '<i class="d"></i>' : "") + text + "</span>";
};
ADH.statusChip = function (status) {
  const m = {
    ACTIVE: ["ok", "投放中"], PAUSED: ["warn", "已暂停"], ARCHIVED: ["neutral", "已归档"], DELETED: ["danger", "已删除"],
    DISABLED: ["danger", "账户停用"], CONNECTED: ["ok", "已接入"], RESERVED: ["neutral", "架构预留"], EXPIRED: ["danger", "授权失效"],
    DRAFT: ["neutral", "草稿"], VALIDATING: ["info", "校验中"], QUEUED: ["info", "已入队"], RUNNING: ["brand", "执行中"],
    PARTIAL_FAILED: ["warn", "部分失败"], SUCCEEDED: ["ok", "全部成功"], FAILED: ["danger", "失败"],
    ROLLING_BACK: ["brand", "回滚中"], ROLLED_BACK: ["neutral", "已回滚"], ROLLBACK_FAILED: ["danger", "回滚受阻"],
    AUTO: ["ok", "自动执行"], OBSERVE: ["info", "观察模式"], FUSED: ["danger", "已熔断"], DRY_RUN: ["info", "演练"],
    DONE: ["ok", "已完成"], PENDING: ["neutral", "等待中"], SUCCESS: ["ok", "成功"], FAILED2: ["danger", "失败"],
    SKIPPED: ["neutral", "已跳过"], UNMAPPED: ["warn", "未映射"], OK: ["ok", "正常"], ENABLED: ["ok", "启用"], APPROVED: ["ok", "已批准"]
  };
  const c = m[status] || ["neutral", status];
  return ADH.chip(c[0], c[1]);
};
ADH.healthChip = function (h) { return ADH.chip(h.tone, h.label, 1); };
ADH.delta = function (v, invert) {
  if (v === null || v === undefined) return "";
  const good = invert ? v < 0 : v > 0;
  const cls = Math.abs(v) < 0.0005 ? "flat" : (good ? "up" : "down");
  const arrow = Math.abs(v) < 0.0005 ? "→" : (v > 0 ? "▲" : "▼");
  return '<span class="delta ' + cls + '">' + arrow + " " + (Math.abs(v) * 100).toFixed(1) + "%</span>";
};
ADH.bar = function (pct, tone, thin) {
  const p = Math.max(0, Math.min(100, pct));
  return '<div class="bar-line"><div class="bar ' + (tone || "") + (thin ? " thin" : "") + '"><i style="width:' + p + '%"></i></div><span class="pct">' + p.toFixed(0) + "%</span></div>";
};
ADH.note = function (tone, title, text) {
  if (tone === "rule" || tone === "info") return "";
  title = ADH.cleanText(title);
  text = ADH.cleanText(text);
  if (!title && !text) return "";
  return '<div class="note ' + tone + '">' + ADH.icon(tone === "danger" || tone === "warn" ? "warn" : (tone === "ok" ? "check" : "info"), 15) +
    "<div>" + (title ? "<b>" + title + "</b> " : "") + text + "</div></div>";
};
ADH.empty = function (text, sub) {
  return '<div class="empty"><div class="big">' + ADH.esc(text) + "</div>" + (sub ? "<div>" + sub + "</div>" : "") + "</div>";
};
ADH.kv = function (pairs) {
  return '<dl class="kv">' + pairs.map(function (p) { return "<dt>" + p[0] + "</dt><dd>" + p[1] + "</dd>"; }).join("") + "</dl>";
};
ADH.sec = function (t) { return '<div class="sec-title">' + t + '<i class="tick"></i></div>'; };
ADH.stat = function (o) {
  return '<div class="stat' + (o.dual ? " dual" : "") + '">' +
    '<div class="label">' + o.label + (o.def ? '<span class="tag-code" style="cursor:help" data-act="metric-def" data-key="' + o.def + '">口径</span>' : "") + "</div>" +
    (o.dual ? o.dual : '<div class="value">' + o.value + (o.unit ? '<span class="unit">' + o.unit + "</span>" : "") + "</div>") +
    '<div class="foot">' + (o.foot || "") + "</div>" + (o.spark || "") + "</div>";
};
ADH.ringPct = function (pct, tone, label) {
  const r = 18, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  const col = tone === "danger" ? "#d92d20" : tone === "warn" ? "#c2780a" : tone === "ok" ? "#0b9e6a" : "#3355ff";
  return '<div class="ring"><svg width="46" height="46"><circle cx="23" cy="23" r="18" fill="none" stroke="#eaeef6" stroke-width="5"/>' +
    '<circle cx="23" cy="23" r="18" fill="none" stroke="' + col + '" stroke-width="5" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" stroke-linecap="round"/></svg>' +
    '<div class="v">' + (label || pct.toFixed(0) + "%") + "</div></div>";
};

/* ---------- 表格 ---------- */
ADH.tbl = function (id, cols, rows, opts) {
  opts = opts || {};
  const st = ADH.tblState[id] = ADH.tblState[id] || { page: 1, sortCol: -1, dir: 1 };
  let data = rows.slice();
  if (st.sortCol >= 0 && data.length && data[0].v) {
    data.sort(function (a, b) {
      const x = a.v[st.sortCol], y = b.v[st.sortCol];
      if (typeof x === "number" && typeof y === "number") return (x - y) * st.dir;
      return String(x).localeCompare(String(y)) * st.dir;
    });
  }
  const ps = opts.pageSize || Math.max(data.length, 1);
  const pages = Math.max(1, Math.ceil(data.length / ps));
  if (st.page > pages) st.page = pages;
  const view = ps === data.length ? data : data.slice((st.page - 1) * ps, st.page * ps);
  let h = '<div class="table-wrap"><table class="tbl' + (opts.zebra ? " zebra" : "") + (opts.tight ? " tight" : "") + '"><thead><tr>';
  cols.forEach(function (c, i) {
    h += '<th class="' + (c.cls || "") + (opts.sortable ? " sortable" : "") + '"' + (opts.sortable ? ' data-act="tbl-sort" data-id="' + id + '" data-col="' + i + '"' : "") + ">" + c.label +
      (opts.sortable && st.sortCol === i ? (st.dir > 0 ? " ↑" : " ↓") : "") + "</th>";
  });
  h += "</tr></thead><tbody>";
  if (!view.length) h += '<tr><td colspan="' + cols.length + '">' + ADH.emptyState({ icon: opts.emptyIcon || "search", title: opts.empty || "暂无数据", desc: opts.emptyDesc || "", action: opts.emptyAction || "" }) + "</td></tr>";
  view.forEach(function (r) {
    h += '<tr class="' + (r.cls || "") + '"' + (r.attrs || "") + ">";
    r.c.forEach(function (cell, i) { h += "<td" + (cols[i] && cols[i].cls === "num" ? ' class="num"' : "") + ">" + cell + "</td>"; });
    h += "</tr>";
  });
  h += "</tbody></table></div>";
  if (pages > 1) {
    h += '<div class="pager"><span>共 <b>' + data.length + "</b> 条记录 · 第 " + st.page + "/" + pages + " 页</span><span class=\"pages\">";
    h += '<button data-act="tbl-page" data-id="' + id + '" data-page="' + Math.max(1, st.page - 1) + '">‹</button>';
    for (let i = 1; i <= pages; i++) h += '<button class="' + (i === st.page ? "on" : "") + '" data-act="tbl-page" data-id="' + id + '" data-page="' + i + '">' + i + "</button>";
    h += '<button data-act="tbl-page" data-id="' + id + '" data-page="' + Math.min(pages, st.page + 1) + '">›</button></span></div>';
  }
  return h;
};
ADH.action("tbl-sort", function (p) {
  const st = ADH.tblState[p.id] = ADH.tblState[p.id] || { page: 1, sortCol: -1, dir: 1 };
  const col = Number(p.col);
  if (st.sortCol === col) st.dir = -st.dir; else { st.sortCol = col; st.dir = 1; }
  ADH.render();
});
ADH.action("tbl-page", function (p) {
  const st = ADH.tblState[p.id] = ADH.tblState[p.id] || { page: 1, sortCol: -1, dir: 1 };
  st.page = Number(p.page); ADH.render();
});
ADH.action("goto", function (p) { ADH.routeTo(p.page, p.sub ? { sub: p.sub } : null); });
ADH.action("metric-def", function (p) {
  const m = ADH_METRICS.filter(function (x) { return x.key === p.key; })[0];
  if (!m) return;
  ADH.toast(m.label + "：" + m.def, "info", "数据来源：" + m.src + " · 类型：" + m.type);
});
/* ---------- 图表 ---------- */
ADH.spark = function (vals, color, w, h) {
  w = w || 74; h = h || 26;
  const mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
  const sp = (mx - mn) || 1;
  const pts = vals.map(function (v, i) {
    return [(i / (vals.length - 1)) * w, h - ((v - mn) / sp) * (h - 4) - 2];
  });
  const d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
  return '<svg class="spark" width="' + w + '" height="' + h + '"><path d="' + d + '" fill="none" stroke="' + (color || "#3355ff") + '" stroke-width="1.6" stroke-linecap="round"/></svg>';
};
ADH.lineChart = function (labels, series, opts) {
  opts = opts || {};
  const W = opts.width || 900, H = opts.height || 200, PL = 46, PR = 12, PT = 12, PB = 22;
  const iw = W - PL - PR, ih = H - PT - PB;
  const all = series.reduce(function (a, s) { return a.concat(s.vals); }, []);
  const mx = Math.max.apply(null, all) * 1.12 || 1;
  const x = function (i) { return PL + (labels.length > 1 ? (i / (labels.length - 1)) * iw : iw / 2); };
  const y = function (v) { return PT + ih - (v / mx) * ih; };
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const yy = PT + (ih / 4) * i;
    g += '<line class="gridline" x1="' + PL + '" x2="' + (W - PR) + '" y1="' + yy + '" y2="' + yy + '"/>' +
      '<text class="axis" x="' + (PL - 6) + '" y="' + (yy + 3) + '" text-anchor="end">' + ADH.short(mx * (1 - i / 4)) + "</text>";
  }
  const step = Math.max(1, Math.ceil(labels.length / 8));
  let ax = "";
  labels.forEach(function (l, i) { if (i % step === 0) ax += '<text class="axis" x="' + x(i) + '" y="' + (H - 4) + '" text-anchor="middle">' + l.slice(5) + "</text>"; });
  let s = "";
  series.forEach(function (ser) {
    const d = ser.vals.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
    if (ser.fill) s += '<path d="' + d + " L " + x(series[0].vals.length - 1) + " " + (PT + ih) + " L " + PL + " " + (PT + ih) + ' Z" fill="' + ser.color + '" opacity=".12"/>';
    s += '<path class="ln" d="' + d + '" stroke="' + ser.color + '"/>';
    if (opts.dots) s += ser.vals.map(function (v, i) { return '<circle class="pt" cx="' + x(i) + '" cy="' + y(v) + '" r="2.6"/>'; }).join("");
  });
  return '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" style="height:' + H + 'px">' + g + s + ax + "</svg>";
};
ADH.barChart = function (labels, series, opts) {
  opts = opts || {};
  const W = opts.width || 900, H = opts.height || 200, PL = 46, PR = 12, PT = 12, PB = 22;
  const iw = W - PL - PR, ih = H - PT - PB;
  const mx = Math.max.apply(null, series.reduce(function (a, s) { return a.concat(s.vals); }, [])) * 1.12 || 1;
  const gw = iw / labels.length, bw = Math.min(18, (gw - 6) / series.length);
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const yy = PT + (ih / 4) * i;
    g += '<line class="gridline" x1="' + PL + '" x2="' + (W - PR) + '" y1="' + yy + '" y2="' + yy + '"/>' +
      '<text class="axis" x="' + (PL - 6) + '" y="' + (yy + 3) + '" text-anchor="end">' + ADH.short(mx * (1 - i / 4)) + "</text>";
  }
  let b = "";
  labels.forEach(function (l, i) {
    const cx = PL + gw * i + gw / 2;
    series.forEach(function (s2, j) {
      const v = s2.vals[i], hh = (v / mx) * ih;
      const bx = cx - (series.length * bw) / 2 + j * bw;
      b += '<rect x="' + bx.toFixed(1) + '" y="' + (PT + ih - hh).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + hh.toFixed(1) + '" rx="1.5" fill="' + s2.color + '"><title>' + l + " " + s2.name + "：" + ADH.num(v, 2) + "</title></rect>";
    });
    if (i % Math.max(1, Math.ceil(labels.length / 8)) === 0) b += '<text class="axis" x="' + cx + '" y="' + (H - 4) + '" text-anchor="middle">' + l.slice(5) + "</text>";
  });
  return '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" style="height:' + H + 'px">' + g + b + "</svg>";
};
ADH.donut = function (items, size) {
  size = size || 148; const r = size / 2 - 12, c = 2 * Math.PI * r;
  const total = items.reduce(function (a, b) { return a + b.v; }, 0) || 1;
  let off = 0, s = "";
  items.forEach(function (it) {
    const len = (it.v / total) * c;
    s += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + it.color + '" stroke-width="15" stroke-dasharray="' + len + " " + (c - len) + '" stroke-dashoffset="' + -off + '" transform="rotate(-90 ' + size / 2 + " " + size / 2 + ')"><title>' + it.label + "：" + ADH.num(it.v, 2) + "</title></circle>";
    off += len;
  });
  return '<svg width="' + size + '" height="' + size + '">' + s + '<text x="' + size / 2 + '" y="' + (size / 2 - 2) + '" text-anchor="middle" font-size="15" font-weight="700" font-family="monospace">' + ADH.short(total) + '</text><text x="' + size / 2 + '" y="' + (size / 2 + 14) + '" text-anchor="middle" font-size="10" fill="#7c8798">合计</text></svg>';
};
ADH.hbars = function (rows) {
  const mx = Math.max.apply(null, rows.map(function (r) { return r.total; })) || 1;
  return '<div class="hbars">' + rows.map(function (r) {
    return '<div class="hbar-row"><span class="nm" title="' + ADH.esc(r.name) + '">' + r.name + '</span><div class="hbar">' +
      (r.segs ? '<div class="multi">' + r.segs.map(function (s) { return '<span style="width:' + (s.v / mx * 100) + "%;background:" + s.color + '" title="' + s.label + "：" + ADH.num(s.v, 2) + '"></span>'; }).join("") + "</div>"
        : '<i style="width:' + (r.total / mx * 100) + "%;background:" + (r.color || "#3355ff") + '"></i>') +
      '</div><span class="val">' + (r.fmt || ADH.num(r.total, 2)) + "</span></div>";
  }).join("") + "</div>";
};

/* ---------- 覆盖层：抽屉 / 弹窗 ---------- */
ADH.overlay = function (o) {
  const root = document.getElementById("overlay");
  root.innerHTML = "";
  const scrim = document.createElement("div");
  scrim.className = "scrim"; scrim.dataset.act = "overlay-close";
  root.appendChild(scrim);
  const box = document.createElement("div");
  box.className = o.kind === "modal" ? ("modal" + (o.wide ? " wide" : "")) : ("drawer" + (o.wide ? " wide" : ""));
  box.innerHTML =
    '<div class="' + (o.kind === "modal" ? "" : "drawer-head") + (o.kind === "modal" ? " drawer-head" : "") + '">' +
      "<div><h3>" + o.title + "</h3>" + (o.desc ? '<div class="desc">' + o.desc + "</div>" : "") + "</div>" +
      '<button class="icon-btn x" data-act="overlay-close" title="关闭（Esc）">' + ADH.icon("close", 16) + "</button>" +
    "</div>" +
    '<div class="' + (o.kind === "modal" ? "modal-body" : "drawer-body" + (o.flush ? " flush" : "")) + '">' + o.body + "</div>" +
    (o.foot ? '<div class="drawer-foot">' + o.foot + "</div>" : "");
  root.appendChild(box);
  ADH.scrubUI(box);
  root.style.pointerEvents = "auto";
  requestAnimationFrame(function () { scrim.classList.add("on"); box.classList.add("on"); });
  ADH.overlayOpen = box;
  root.dataset.kind = o.kind || "drawer";
};
ADH.action("overlay-close", function () {
  const root = document.getElementById("overlay");
  const box = root.querySelector(".modal,.drawer"), scrim = root.querySelector(".scrim");
  if (box) box.classList.remove("on");
  if (scrim) scrim.classList.remove("on");
  root.style.pointerEvents = "none";
  setTimeout(function () { root.innerHTML = ""; }, 210);
  ADH.overlayOpen = null;
});
ADH.modal = function (o) { o.kind = "modal"; ADH.overlay(o); };
ADH.toast = function (msg, tone, sub) {
  msg = ADH.cleanText(msg);
  sub = ADH.cleanText(sub);
  ADH.seq++;
  const root = document.getElementById("toasts");
  if (!root) return;
  const t = document.createElement("div");
  t.className = "toast " + (tone || "ok");
  t.innerHTML = ADH.icon(tone === "danger" || tone === "warn" ? "warn" : "check", 15) + "<div>" + msg + (sub ? "<small>" + sub + "</small>" : "") + "</div>";
  root.appendChild(t);
  setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(function () { t.remove(); }, 320); }, 4600);
};

/* ---------- 外壳 ---------- */
ADH.LOCK_REASON = {
  "plan.submit": "当前角色不可创建或提交投放计划",
  "plan.approve": "批量计划审核仅管理员可用",
  "rule.edit": "自动化规则的创建、启停与回滚仅管理员和投放优化师可用",
  "user.manage": "用户与角色管理仅管理员可用",
  "audit.view": "审计日志查看仅管理员可用",
  "ops.execute": "批量投放操作仅管理员和投放优化师可用",
  "asset.upload": "素材批量上传仅素材设计师和管理员可用",
  "asset.delete": "素材物理删除仅管理员可执行，其余角色可使用归档",
  "attr.view": "归因明细与对账仅管理员、投放优化师和数据分析师可见",
  "attr.edit": "归因配置仅管理员和投放优化师可编辑",
  "account.bind": "渠道接入与账户绑定仅管理员可用"
};
ADH.badgeCount = function (key) {
  if (key === "taskFail") return ADH_DATA.tasks.filter(function (t) { return t.status === "PARTIAL_FAILED" || t.status === "FAILED" || t.status === "PAUSED"; }).length;
  if (key === "unmapped") return ADH_DATA.unmapped.length;
  return 0;
};
ADH.renderSidebar = function () {
  const prevNav = document.querySelector("#sidebar .nav");
  const sig = ADH.state.role + "|" + ADH.state.env + "|" + ADH.state.route + "|" + ADH.badgeCount("taskFail");
  if (prevNav && ADH.state._sidebarSig === sig) return;
  const prevScroll = prevNav ? prevNav.scrollTop : 0;
  const prevRoute = ADH.state._sidebarRoute;
  let h = '<div class="brand"><div class="brand-logo">ADH</div><div class="brand-text"><span class="brand-name">广告投放中台</span><span class="brand-sub">Ad Delivery Hub</span></div></div><nav class="nav">';
  ADH_DATA.nav.forEach(function (g) {
    h += '<div class="nav-group"><div class="nav-group-title">' + g.group + '<i class="tick"></i></div>';
    g.items.forEach(function (it) {
      const ok = !it.perm || ADH.can(it.perm);
      const active = ADH.state.route === it.id;
      let badge = "";
      if (ok && it.badgeKey) { const n = ADH.badgeCount(it.badgeKey); if (n) badge = '<span class="tag ' + (it.badgeKey === "taskFail" ? "warn" : "warn") + '">' + n + "</span>"; }
      else if (ok && it.badge) badge = '<span class="tag">' + it.badge + "</span>";
      else if (!ok) badge = '<span class="tag">' + "受限" + "</span>";
      h += '<div class="nav-item' + (active ? " active" : "") + (ok ? "" : " locked") + '"' +
        (ok ? ' data-act="goto" data-page="' + it.id + '"' : ' title="' + ADH.esc(ADH.LOCK_REASON[it.perm] || "当前角色无此功能权限") + '"') +
        '>' + ADH.icon(it.icon, 15) + "<span>" + it.title + "</span>" + badge + "</div>";
    });
    h += "</div>";
  });
  h += '</nav><div class="sidebar-foot"><div class="env-note">当前角色 <b>' + ADH.roleLabel() + "</b> · " + ADH.rolePerson() + "</div></div>";
  document.getElementById("sidebar").innerHTML = h;
  ADH.state._sidebarSig = sig;
  const nav = document.querySelector("#sidebar .nav");
  if (!nav) return;
  if (ADH.state.route !== prevRoute) {
    ADH.state._sidebarRoute = ADH.state.route;
    ADH.centerSidebarActive(nav);
  } else {
    nav.scrollTop = prevScroll;
  }
};
ADH.centerSidebarActive = function (nav) {
  nav = nav || document.querySelector("#sidebar .nav");
  if (!nav) return;
  const active = nav.querySelector(".nav-item.active");
  if (!active) return;
  if (nav.scrollHeight <= nav.clientHeight + 1) return;
  const nr = nav.getBoundingClientRect();
  const ar = active.getBoundingClientRect();
  const delta = ar.top - nr.top - (nav.clientHeight - ar.height) / 2;
  const max = nav.scrollHeight - nav.clientHeight;
  nav.scrollTop = Math.max(0, Math.min(max, nav.scrollTop + delta));
};
ADH.renderTopbar = function () {
  const p = ADH.currentPage();
  const f = ADH_DATA.env.freshness;
  const unread = ADH_DATA.notifications.filter(function (n) { return !n.read; }).length;
  let h = '<div class="tb-title"><h1>' + p.title + "</h1>" + (p.subtitle ? '<span class="sub">' + p.subtitle + "</span>" : "") + "</div>";
  h += '<div class="freshness" title="渠道数据与归因数据分别展示更新时间"><i class="dot"></i>渠道数据 ' + f.channel +
    '<i class="sep"></i><i class="dot' + (ADH_DATA.env.freshness.lagAccounts ? " lag" : "") + '"></i>归因数据 ' + f.attribution +
    (f.lagAccounts ? '<i class="sep"></i><span style="color:var(--warn)">' + f.lagAccounts + " 账户未就绪</span>" : "") + "</div>";
  h += '<div class="tb-spacer"></div>';
  h += '<div class="btn-group" title="切换数据源">' +
    ADH_DATA.env.sources.map(function (s) {
      return '<button class="' + (ADH.state.env === s.code ? "on" : "") + '" data-act="set-env" data-env="' + s.code + '" title="' + ADH.esc(s.desc) + '">' + s.label + "</button>";
    }).join("") + "</div>";
  h += '<button class="icon-btn" data-act="goto" data-page="notifications" title="通知中心">' + ADH.icon("bell", 17) + (unread ? '<span class="badge">' + unread + "</span>" : "") + "</button>";
  h += '<div class="user-chip" data-act="role-menu" title="切换角色"><div class="avatar">' + ADH.rolePerson().slice(0, 1) + '</div><div class="user-meta"><span class="n">' + ADH.rolePerson() + '</span><span class="r">' + ADH.roleLabel() + "</span></div>" + ADH.icon("down", 13) + "</div>";
  document.getElementById("topbar").innerHTML = h;
};
ADH.render = function () {
  ADH.renderSidebar();
  ADH.renderTopbar();
  const p = ADH.currentPage();
  const pageEl = document.getElementById("page");
  pageEl.innerHTML = ADH.crumbBar() + p.render(ADH.state.params);
  ADH.scrubUI(pageEl);
  ADH.scrubUI(document.getElementById("sidebar"));
  ADH.scrubUI(document.getElementById("topbar"));
  document.title = p.title + " · 广告投放中台 ADH";
};
/* ---------- 空态组件（统一空数据说明） ---------- */
ADH.emptyState = function (o) {
  o = o || {};
  const ico = o.icon === "none" ? "" : '<div class="es-ico">' + ADH.icon(o.icon || "search", 18) + "</div>";
  return '<div class="empty-state">' + ico +
    '<div class="es-t">' + ADH.esc(o.title || "暂无数据") + "</div>" +
    (o.desc ? '<div class="es-d">' + o.desc + "</div>" : "") +
    (o.action ? '<div class="flex center gap8">' + o.action + "</div>" : "") + "</div>";
};

/* ---------- 页面地标：面包屑导航 ---------- */
ADH.navGroupOf = function (route) {
  let out = null;
  (ADH_DATA.nav || []).forEach(function (g) { (g.items || []).forEach(function (it) { if (it.id === route) out = g.group; }); });
  return out;
};
ADH.crumbBar = function () {
  const p = ADH.currentPage();
  const group = ADH.navGroupOf(ADH.state.route);
  if (!group) return "";
  const sub = ADH.s().crumbSub;
  let h = '<div class="crumb-bar" role="navigation" aria-label="位置导航">' +
    '<span class="lv">' + ADH.esc(group) + '</span><span class="sepc">/</span>' +
    '<span class="' + (sub ? "lv" : "cur") + '">' + ADH.esc(p.title) + "</span>";
  if (sub) h += '<span class="sepc">/</span><span class="cur">' + ADH.esc(sub) + "</span>";
  return h + "</div>";
};

ADH.action("role-menu", function () {
  const items = Object.keys(ADH_ROLES).map(function (k) {
    const r = ADH_ROLES[k];
    return '<div class="nav-item' + (ADH.state.role === k ? " active" : "") + '" style="color:' + (ADH.state.role === k ? "#fff" : "#aeb9d2") + '" data-act="set-role" data-role="' + k + '">' +
      ADH.icon(k === "admin" ? "shield" : k === "optimizer" ? "wand" : k === "designer" ? "image" : "chart", 14) +
      "<span>" + r.label + " · " + r.person + '</span><span class="tag">' + k + "</span></div>";
  }).join("");
  ADH.overlay({
    kind: "modal", title: "切换角色", desc: "切换后，导航与操作权限将即时更新。",
    body: '<div style="background:#0d1220;border-radius:10px;padding:6px">' + items + "</div>",
    foot: '<button class="btn" data-act="overlay-close">关闭</button>'
  });
});
ADH.action("set-role", function (p) {
  ADH.state.role = p.role;
  ADH.act("overlay-close", { dataset: {} });
  ADH.render();
  ADH.toast("已切换为 " + ADH.roleLabel() + "（" + ADH.rolePerson() + "）", "ok", "导航与操作权限已重新计算");
});
ADH.action("set-env", function (p) {
  ADH.state.env = p.env;
  ADH.render();
  ADH.toast("数据源已切换", "info", (ADH_DATA.env.sources.filter(function (s) { return s.code === p.env; })[0] || {}).desc);
});

/* ---------- 事件代理 / 启动 ---------- */
ADH.bindGlobal = function () {
  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    if (el.classList.contains("locked")) return;
    /* 表单控件由 input / change 驱动，避免点击时用旧值触发一次 */
    if (el.dataset.live && (el.tagName === "SELECT" || el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
    e.preventDefault();
    ADH.act(el.dataset.act, el, e);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.getElementById("overlay").innerHTML) ADH.act("overlay-close", { dataset: {} });
  });
};
ADH.boot = function () {
  ADH.bindGlobal();
  const h = (location.hash || "").replace(/^#\/?/, "");
  const route = h.split("?")[0];
  if (route) ADH.state.route = route;
  window.addEventListener("hashchange", function () {
    const r = (location.hash || "").replace(/^#\/?/, "").split("?")[0];
    if (r && r !== ADH.state.route) { ADH.state.route = r; ADH.render(); }
  });
  ADH.render();
};
/* ---------- 页面级通用状态：筛选 / 标签页 / 多选 ---------- */
ADH.s = function () { return ADH.uiState[ADH.state.route] = ADH.uiState[ADH.state.route] || {}; };
ADH.f = function (k, def) { const v = ADH.s()[k]; return v === undefined || v === "" ? (def === undefined ? "" : def) : v; };
ADH.tabOf = function (def) { return ADH.s().tab || def; };
ADH.wizardStep = function (def) { return ADH.s().step || def; };
ADH.sel = function (key) { const s = ADH.s(); s.sel = s.sel || {}; s.sel[key] = s.sel[key] || []; return s.sel[key]; };
ADH.set = function (k, v) { ADH.s()[k] = v; };
ADH.action("filter", function (p, el) {
  const v = (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) ? el.value : p.v;
  ADH.s()[p.k] = v;
  if (p.tbl) ADH.tblState[p.tbl] = { page: 1, sortCol: -1, dir: 1 };
  if (el && el.id) ADH.state.focusId = el.id;
  ADH.render();
});
ADH.action("tab", function (p) { ADH.s().tab = p.v; ADH.render(); });
ADH.action("wizard", function (p) {
  if (p.v === "next") ADH.s().step = Math.min(Number(p.max), ADH.wizardStep(1) + 1);
  else if (p.v === "prev") ADH.s().step = Math.max(1, ADH.wizardStep(1) - 1);
  else ADH.s().step = Number(p.v);
  ADH.render();
});
ADH.action("sel", function (p) {
  const arr = ADH.sel(p.key), i = arr.indexOf(p.v);
  if (i >= 0) arr.splice(i, 1); else arr.push(p.v);
  ADH.render();
});
ADH.action("sel-all", function (p) {
  const s = ADH.s(); s.sel = s.sel || {};
  const all = String(p.values || "").split(",").filter(Boolean);
  const cur = s.sel[p.key] || [];
  s.sel[p.key] = cur.length >= all.length ? [] : all.slice();
  ADH.render();
});
ADH.action("sel-clear", function (p) { ADH.s().sel = {}; ADH.s()[p.k + "Reset"] = 1; ADH.render(); });
ADH.checkbox = function (key, val, label, extra) {
  const on = ADH.sel(key).indexOf(val) >= 0;
  return '<label class="check"' + (extra || "") + '><input type="checkbox"' + (on ? " checked" : "") +
    ' data-act="sel" data-key="' + key + '" data-v="' + ADH.esc(val) + '" /><span>' + (label || "") + "</span></label>";
};
ADH.filterChip = function (key) {
  const v = ADH.s()[key];
  if (!v) return "";
  return ' <button class="btn xs" data-act="filter" data-k="' + key + '" data-v="">清除</button>';
};
ADH.assertPerm = function (action, el) {
  if (ADH.can(action)) return true;
  ADH.toast("无权限执行该操作", "warn", ADH.LOCK_REASON[action] || "当前角色（" + ADH.roleLabel() + "）缺少该功能权限");
  return false;
};
ADH.action("need-perm", function (p) {
  ADH.toast("操作被阻止", "warn", ADH.LOCK_REASON[p.perm] || ("当前角色（" + ADH.roleLabel() + "）缺少 " + p.perm + " 权限"));
});
/* 渲染后恢复输入焦点 */
const __adhRender = ADH.render;
ADH.render = function () {
  __adhRender();
  if (ADH.state.focusId) {
    const el = document.getElementById(ADH.state.focusId);
    if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
    ADH.state.focusId = null;
  }
};
ADH.bindLive = function () {
  document.addEventListener("input", function (e) {
    const el = e.target.closest("[data-live]");
    if (!el) return;
    if (el.tagName === "SELECT") return;
    ADH.state.focusId = el.id;
    ADH.act(el.dataset.act, el);
  });
  document.addEventListener("change", function (e) {
    const el = e.target.closest("[data-live]");
    if (!el || el.tagName !== "SELECT") return;
    ADH.state.focusId = el.id;
    ADH.act(el.dataset.act, el);
  });
};
