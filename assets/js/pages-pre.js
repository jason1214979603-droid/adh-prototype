/* ================= 投放前 · 主页面 ================= */
(function () {
const D = ADH_DATA;

function sum(fn) { return D.accounts.reduce(function (a, x) { return a + (fn(x) || 0); }, 0); }
function cur(v, c) { return "$" + ADH.num(v, 2) + " " + (c || "USD"); }

/* ---------------- 工作台 ---------------- */
ADH.page("workbench", {
  title: "工作台", subtitle: "跨账户汇总 · 今日待办 · 风险提示",
  render: function () {
    const spend = sum(function (a) { return a.todaySpend; });
    const balance = sum(function (a) { return a.balance; });
    const bad = D.accounts.filter(function (a) { return a.health.code !== "OK"; });
    const running = D.tasks.filter(function (t) { return ["RUNNING", "QUEUED", "PAUSED", "PARTIAL_FAILED"].indexOf(t.status) >= 0; });
    const unread = D.notifications.filter(function (n) { return !n.read; });
    const unmappedRatio = 0.124;
    const days = D.accounts[0].series.map(function (r) { return r.date; });
    const aggSeries = days.map(function (d, i) {
      return D.accounts.reduce(function (a, x) { return a + x.series[i].spend; }, 0);
    });
    const yest = aggSeries[aggSeries.length - 2], today = aggSeries[aggSeries.length - 1];
    const chConv = 2148, sysConv = 1986, chRoas = 2.41, sysRoas = 2.18;

    let h = '<div class="grid g6 mb12">';
    h += ADH.stat({ label: "今日消耗", value: "$" + ADH.num(spend, 0), foot: ADH.delta((today - yest) / yest) + '<span class="muted">环比昨日</span>', spark: ADH.spark(aggSeries.slice(-14), "#3355ff") });
    h += ADH.stat({ label: "今日转化（双口径）", dual: '<div class="row"><b class="mono" style="font-size:15px">' + ADH.num(chConv) + '</b><span class="xs muted">渠道归因</span></div><div class="row"><b class="mono" style="font-size:15px">' + ADH.num(sysConv) + '</b><span class="xs muted">系统归因</span></div>', def: "conversions", foot: '<span class="muted">差异 ' + ADH.pct(1 - sysConv / chConv, 1) + "（ATT 未授权为主因）</span>" });
    h += ADH.stat({ label: "ROAS（双口径）", dual: '<div class="row"><b class="mono" style="font-size:15px">' + chRoas.toFixed(2) + '</b><span class="xs muted">渠道</span></div><div class="row"><b class="mono" style="font-size:15px">' + sysRoas.toFixed(2) + '</b><span class="xs muted">系统</span></div>', def: "roas", foot: '<span class="muted">目标线 2.00</span>' });
    h += ADH.stat({ label: "进行中任务", value: running.length, unit: "个", foot: '<span class="muted">含 ' + D.tasks.filter(function (t) { return t.status === "PAUSED"; }).length + ' 个因授权挂起</span>' });
    h += ADH.stat({ label: "待处理告警", value: unread.length, unit: "条", foot: '<span class="muted">未读站内消息</span>' });
    h += ADH.stat({ label: "归因映射覆盖率", value: ADH.pct(1 - unmappedRatio, 1), def: "conversions", foot: '<span style="color:var(--warn)">低于目标 90%</span>' });
    h += "</div>";

    h += '<div class="grid g-3-2">';

    /* 待办中心 */
    const todos = [
      { tone: "danger", icon: "warn", t: "3 个素材被渠道拒审，需修改后重新提交", s: "AS-0005 / AS-0012 / AS-0026 · 已自动暂停引用它们的 3 条 Ad（规则 R-05）", go: "assets" },
      { tone: "warn", icon: "list", t: "任务 T-20260920-014 部分失败（54 / 60）", s: "BUSINESS ×4、POLICY ×2 · 支持按错误分类筛选与单条重试", go: "tasks" },
      { tone: "danger", icon: "plug", t: "bm_3341 令牌已失效，6 个任务进入 PAUSED", s: "授权恢复后可一键重跑，不产生重复对象", go: "channels" },
      { tone: "warn", icon: "warn", t: "令牌 bm_2077 剩余 5 天到期（< 7 天预警）", s: "剩余不足 1 天将升级为严重告警", go: "channels" },
      { tone: "warn", icon: "flow", t: "2026-09-17 对账差异 22.9%（阈值 20%）", s: "主因映射覆盖率下降，已补建并重跑至 91.2%", go: "attr-detail" },
      { tone: "danger", icon: "wallet", t: "act_6613008 当日消耗为日均 3.4 倍", s: "system 未自动调整预算（推荐仅作建议展示）", go: "accounts" },
      { tone: "neutral", icon: "refresh", t: "2 个账户洞察数据未就绪（act_2201088 / act_5512011）", s: "列表中已标记，避免误读为 0", go: "dashboard" }
    ];
    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("bolt", 15) + "待办中心<span class=\"desc\">按风险等级排序，点击跳转处理</span></h3><div class=\"right\"><span class=\"chip danger\">" + (unread.length) + " 未读</span></div></div><div class=\"card-body\">";
    todos.forEach(function (t) {
      h += '<div class="todo" data-act="goto" data-page="' + t.go + '"><div class="ico-wrap" style="background:var(--' + (t.tone === "neutral" ? "surface-3" : t.tone + "-soft") + ');color:var(--' + (t.tone === "neutral" ? "ink-3" : t.tone) + ')">' + ADH.icon(t.icon, 15) + "</div>" +
        '<div class="tx"><b>' + t.t + "</b><small>" + t.s + "</small></div>" + ADH.icon("arrow", 14, "muted") + "</div>";
    });
    h += "</div></div>";

    /* 右侧：账户健康 + 规则执行 */
    h += "<div class=\"grid\" style=\"gap:12px\">";
    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("shield", 15) + '账户健康度<span class="desc">FR-PRE-08</span></h3><div class="right"><button class="btn xs" data-act="goto" data-page="accounts">全部 ' + D.accounts.length + " 个</button></div></div><div class=\"card-body\">";
    bad.forEach(function (a) {
      h += '<div class="flex center gap8" style="padding:6px 0;border-bottom:1px dashed var(--line)">' + ADH.healthChip(a.health) +
        '<div class="grow"><div style="font-size:12px;font-weight:600">' + a.name + '</div><div class="xs muted">' + ADH.esc(a.health.issues[0] || "") + '</div></div>' +
        '<span class="tag-code">' + a.actId + "</span></div>";
    });
    if (!bad.length) h += ADH.empty("全部账户健康");
    h += "</div></div>";

    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("bolt", 15) + '最近规则执行<span class="desc">BR-70 执行日志</span></h3><div class="right"><button class="btn xs" data-act="goto" data-page="rules">规则中心</button></div></div><div class="card-body"><div class="timeline">';
    D.ruleExec.slice(0, 5).forEach(function (x) {
      const tone = x.result === "SUCCESS" ? "ok" : (x.result === "FAILED" ? "danger" : (x.result === "SKIPPED" ? "warn" : "brand"));
      h += '<div class="tl-item ' + tone + '"><div class="tl-t">' + x.ruleName + " · " + x.action + " · " + x.hit + " 个对象</div>" +
        '<div class="tl-d">' + x.at + " · " + ADH.statusChip(x.result) + " " + ADH.statusChip(x.mode) + "<br/>" + ADH.esc(x.snap) + "</div></div>";
    });
    h += "</div></div></div>";
    h += "</div></div>";

    h += '<div class="grid g3 mt12">' +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("wallet", 15) + "账户与预算</h3></div><div class=\"card-body\">" +
      ADH.kv([["纳管账户", D.accounts.length + " 个（设计容量 " + D.env.capacity.accounts + "）"], ["账户总余额", cur(balance)], ["今日消耗", cur(spend)],
        ["基准币种", D.env.baseCurrency + "（" + D.env.fxRate.sample + "）"], ["基准时区", D.env.baseTimezone]]) + "</div></div>" +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("refresh", 15) + "数据同步</h3></div><div class=\"card-body\">" +
      ADH.kv([["渠道数据截止", D.env.freshness.channel], ["归因数据截止", D.env.freshness.attribution], ["洞察日粒度", D.env.freshness.insight],
        ["未就绪账户", D.env.freshness.lagAccounts + " 个（已在列表标记）"], ["下次对象树同步", "2026-09-20 14:00"]]) + "</div></div>" +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("spark", 15) + "产品健康指标</h3></div><div class=\"card-body\">" +
      ADH.kv([["批量创建成功率", "96.8% <span class=\"muted\">（目标 ≥ 95%）</span>"], ["平均建计划耗时", "5 分 12 秒 <span class=\"muted\">（目标 ≤ 5 分钟）</span>"],
        ["模板复用率", "88% <span class=\"muted\">（目标 ≥ 80%）</span>"], ["规则采纳率", "60% <span class=\"muted\">（目标 ≥ 40%）</span>"],
        ["归因映射覆盖率", "87.6% <span style=\"color:var(--warn)\">（目标 ≥ 90%）</span>"]]) + "</div></div>" +
      "</div>";
    return h;
  }
});

/* ---------------- 广告账户 ---------------- */
function filterAccounts() {
  const q = (ADH.f("q", "") + "").toLowerCase();
  const rows = D.accounts.filter(function (a) {
    if (q && (a.name + a.actId + a.group + a.bm).toLowerCase().indexOf(q) < 0) return false;
    if (ADH.f("status") && a.status !== ADH.f("status")) return false;
    if (ADH.f("group") && a.group !== ADH.f("group")) return false;
    if (ADH.f("health") === "BAD" && a.health.code === "OK") return false;
    if (ADH.f("source") && a.source !== ADH.f("source")) return false;
    if (ADH.f("cur") && a.currency !== ADH.f("cur")) return false;
    return true;
  });
  return rows;
}
/* 真实接口模式：列表 / 筛选 / 排序 / 分页均由服务端完成（F3） */
function srvOn() { return !!(ADH.live && ADH.live.serverList("accounts")); }
function accStats() { return ADH_DATA.accountsStats || {}; }
function syncJobsTable() {
  const jobs = ((D.syncJobsLive || {}).items || []);
  if (!jobs.length) return ADH.empty("暂无同步任务", "可在账户详情抽屉中「手动触发同步」");
  /* NFR-11：仅失败 / 部分失败 / 已取消的终态任务可重试（其余状态后端返回 60002） */
  const retryable = ["FAILED", "PARTIAL_FAILED", "CANCELLED"];
  return ADH.tbl("tbl-syncjob", [{ label: "任务" }, { label: "类型" }, { label: "账户" }, { label: "状态" }, { label: "结果" }, { label: "开始" }, { label: "结束" }, { label: "" }],
    jobs.map(function (j) {
      const canRetry = retryable.indexOf(j.status) >= 0;
      let retry = '<span class="xs muted">—</span>';
      if (canRetry && ADH.can("account.bind")) retry = '<button class="btn xs" data-act="sync-retry" data-v="' + j.id + '">' + ADH.icon("refresh", 12) + "重试</button>";
      else if (canRetry) retry = '<span class="xs muted">无权限</span>';
      /* 列表契约（SyncJobItem）不含 retryCount，故展示 rowsAffected / 原始错误摘要 */
      let result = '<span class="xs muted">—</span>';
      if (j.status === "SUCCEEDED") result = '<span class="xs muted">' + (j.rowsAffected === null || j.rowsAffected === undefined ? "—" : j.rowsAffected + " 行") + "</span>";
      else if (j.errorMessage) result = '<span class="xs" style="color:var(--danger)" title="' + ADH.esc(j.errorMessage) + '">' + ADH.esc(String(j.errorMessage).slice(0, 22)) + "…</span>";
      return {
        c: ['<span class="mono xs">#' + j.id + "</span>", '<span class="tag-code">' + ADH.esc(j.jobType) + "</span>", ADH.esc(j.accountName || "—"),
          ADH.statusChip(j.status), result,
          '<span class="xs muted">' + (j.startedAt ? ADH.live.formatTime(j.startedAt) : "—") + "</span>",
          '<span class="xs muted">' + (j.finishedAt ? ADH.live.formatTime(j.finishedAt) : "—") + "</span>", retry]
      };
    }), { tight: true });
}
ADH.page("accounts", {
  title: "广告账户", subtitle: "纳管账户统一视图 · 账户组数据权限 · 健康度检测",
  render: function () {
    const tab = ADH.tabOf("list");
    const srv = srvOn();
    const stats = accStats();
    const rows = srv ? (D.accounts || []) : filterAccounts();
    const spend = sum(function (a) { return a.todaySpend; });
    const bad = srv ? [] : D.accounts.filter(function (a) { return a.health.code !== "OK"; });
    let h = '<div class="grid g4 mb12">';
    if (srv) {
      h += ADH.stat({ label: "纳管账户", value: stats.accountCount || 0, unit: "个", foot: '<span class="muted">已纳管 ' + (stats.managedCount || 0) + " 个 · 按数据权限过滤（BR-3.4）</span>" });
      h += ADH.stat({ label: "投放中 / 已暂停", value: (stats.activeCount || 0) + " / " + (stats.pausedCount || 0), foot: '<span class="muted">另有停止投放 ' + (stats.disabledCount || 0) + " 个</span>" });
      h += ADH.stat({ label: "健康度异常", value: stats.abnormalCount || 0, unit: "个", foot: '<span class="muted">异常 + 预警；另 ' + (stats.lagAccountCount || 0) + " 个数据未就绪（BR-120）</span>" });
      h += ADH.stat({ label: "今日消耗（折 " + (stats.baseCurrency || "CNY") + "）", value: ADH.num(stats.spendTodayTotal || 0, 0), foot: '<span class="muted">洞察同步（B9）未接入，当前恒为 0</span>' });
    } else {
      h += ADH.stat({ label: "纳管账户", value: D.accounts.length, unit: "个", foot: '<span class="muted">设计容量 ' + D.env.capacity.accounts + " 个</span>" });
      h += ADH.stat({ label: "投放中 / 已暂停", value: D.accounts.filter(function (a) { return a.status === "ACTIVE"; }).length + " / " + D.accounts.filter(function (a) { return a.status === "PAUSED"; }).length, foot: '<span class="muted">另有停止投放 ' + D.accounts.filter(function (a) { return a.status === "DISABLED"; }).length + " 个</span>" });
      h += ADH.stat({ label: "健康度异常", value: bad.length, unit: "个", foot: '<span class="muted">授权失效 / 停用 / 限流 / 余额 / 支出异常</span>' });
      h += ADH.stat({ label: "今日消耗（折 USD）", value: "$" + ADH.num(spend, 0), foot: '<span class="muted">币种换算按 BR-115 可追溯</span>' });
    }
    h += "</div>";

    h += '<div class="card"><div class="tabs">' +
      '<button class="' + (tab === "list" ? "on" : "") + '" data-act="tab" data-v="list">账户列表</button>' +
      '<button class="' + (tab === "groups" ? "on" : "") + '" data-act="tab" data-v="groups">账户组与数据权限</button>' +
      '<button class="' + (tab === "sync" ? "on" : "") + '" data-act="tab" data-v="sync">同步与容量</button>' +
      "</div>";

    if (tab === "groups") {
      h += '<div class="card-body">' + ADH.note("rule", "数据权限口径", "BR-3.4：数据权限以「账户组」为单位授权，用户只能看到被授权账户组下的数据；<b>未授权的账户在列表中也需隐藏（而不是置灰）</b>。" + (srv ? "当前账号数据权限：" + (ADH.live.session && ADH.live.session.dataScope === "ALL" ? "全部账户组（不限）" : "按账户组授权，见「用户与角色」") + "。" : "当前角色 " + ADH.roleLabel() + " 可见账户组：" + (D.groups.filter(function (g) { return g.grants.indexOf(ADH.state.role) >= 0; }).map(function (g) { return g.name; }).join("、") || "无") + "。")) + '<div class="hr"></div>';
      h += '<div class="grid g2">';
      D.groups.forEach(function (g) {
        const visible = srv ? g.visible !== false : g.grants.indexOf(ADH.state.role) >= 0;
        h += '<div class="card" style="box-shadow:none;' + (visible ? "" : "opacity:.55") + '"><div class="card-head"><h3>' + g.name +
          (visible ? ADH.chip("ok", "已授权") : ADH.chip("neutral", "未授权 · 列表隐藏")) + '</h3><div class="right"><button class="btn xs" data-act="' + (visible ? "account-group-detail" : "need-perm") + '" data-v="' + g.id + '"' + (visible ? "" : ' data-perm="user.manage"') + ">详情</button></div></div>" +
          '<div class="card-body">' + ADH.kv([["说明", g.desc], ["账户数", g.accounts + " 个"],
            ["授权角色", srv ? '<span class="xs muted">按用户授权（BR-3.4）</span>' : g.grants.map(function (r) { return ADH_ROLES[r].label; }).join("、")],
            ["组内日预算上限", groupBudgetText(g)]]) + "</div></div>";
      });
      h += "</div>";
      if (srv) h += '<div class="mt12">' + ADH.note("info", "真实模式", "账户组来自 <span class=\"tag-code\">GET /v1/account-groups</span>（账户数 / 预算上限）；组内账户与授权用户在「详情」中按 <span class=\"tag-code\">GET /v1/account-groups/{groupId}</span> 读取。") + "</div>";
      h += "</div>";
    } else if (tab === "sync") {
      h += '<div class="card-body"><div class="grid g-2-1"><div>' + ADH.sec("同步范围与频率（FR-PRE-06 / FR-PRE-07）") +
        ADH.tbl("tbl-sync", [{ label: "数据" }, { label: "频率" }, { label: "方式" }, { label: "最近完成" }, { label: "下次" }],
          D.syncJobs.map(function (j) { return { c: [j.data, '<span class="tag-code">' + j.freq + "</span>", j.how, '<span class="mono small">' + j.last + "</span>", '<span class="mono small muted">' + j.next + "</span>"] }; }), { tight: true }) +
        '<div class="mt12">' + ADH.note("info", "同步原则", "BR-12 最后写入者以渠道侧为准；BR-13 「系统创建」对象可在中台修改，「外部创建」对象默认只读（需显式开启编辑开关）；BR-14 游标失效自动降级为全量同步；BR-15 单账户失败不阻断其他账户。") + "</div></div>" +
        '<div>' + (srv
          ? '<div class="card" style="box-shadow:none"><div class="card-head"><h3>最近同步任务（' + ((D.syncJobsLive || {}).total || 0) + " 条）</h3></div><div class=\"card-body\">" + syncJobsTable() + "</div></div>"
          : '<div class="card" style="box-shadow:none"><div class="card-head"><h3>对象规模（统一对象模型）</h3></div><div class="card-body">' +
            ADH.kv([["Campaign（合计）", D.accounts.reduce(function (a, x) { return a + x.objects.campaigns; }, 0) + " 个"],
              ["AdSet（合计）", D.accounts.reduce(function (a, x) { return a + x.objects.adsets; }, 0) + " 个"],
              ["Ad（合计）", D.accounts.reduce(function (a, x) { return a + x.objects.ads; }, 0) + " 个"],
              ["单账户对象数", "设计值 200–2,000 / 账户"],
              ["素材总量", "设计值 ≤ 10 万"],
              ["同步游标", '<span class="tag-code">sync_cursor</span> 每 6 小时更新']]) + "</div></div>") +
        '<div class="card mt12" style="box-shadow:none"><div class="card-head"><h3>三类数据源</h3></div><div class="card-body">' +
        D.env.sources.map(function (s) { return '<div class="flex center gap8 mb8"><span class="tag-code">' + s.code + '</span><div class="grow"><b class="small">' + s.label + '</b><div class="xs muted">' + s.desc + "</div></div></div>"; }).join("") + "</div></div></div></div></div>";
    } else {
      /* 工具栏 */
      h += '<div class="card-body" style="padding:11px 14px"><div class="toolbar">' +
        '<div class="search grow" style="max-width:250px">' + ADH.icon("search", 13) + '<input id="acct-q" class="input" placeholder="' + (srv ? "搜索账户名 / act_id（服务端）" : "搜索账户名 / act_id / 账户组 / BM") + '" value="' + ADH.esc(ADH.f("q", "")) + '" data-live="1" data-act="filter" data-k="q" data-tbl="tbl-accounts" /></div>' +
        '<select class="select" style="width:120px" data-live="1" data-act="filter" data-k="status" data-tbl="tbl-accounts"><option value="">全部状态</option>' +
        ["ACTIVE", "PAUSED", "DISABLED"].map(function (s) { return '<option value="' + s + '"' + (ADH.f("status") === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>" +
        '<select class="select" style="width:140px" data-live="1" data-act="filter" data-k="group" data-tbl="tbl-accounts"><option value="">全部账户组</option>' +
        D.groups.map(function (g) { return '<option value="' + g.id + '"' + (ADH.f("group") === g.id ? " selected" : "") + ">" + g.name + "</option>"; }).join("") + "</select>" +
        '<select class="select" style="width:130px" data-live="1" data-act="filter" data-k="health" data-tbl="tbl-accounts"><option value="">全部健康度</option>' +
        (srv
          ? [["NORMAL", "正常"], ["WARNING", "预警"], ["ABNORMAL", "异常"]].map(function (o) { return '<option value="' + o[0] + '"' + (ADH.f("health") === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("")
          : '<option value="BAD"' + (ADH.f("health") === "BAD" ? " selected" : "") + ">仅异常</option>") + "</select>" +
        '<select class="select" style="width:120px" data-live="1" data-act="filter" data-k="source" data-tbl="tbl-accounts"><option value="">全部数据源</option>' +
        D.env.sources.map(function (s) { return '<option value="' + s.code + '"' + (ADH.f("source") === s.code ? " selected" : "") + ">" + s.code + "</option>"; }).join("") + "</select>" +
        (srv ? "" : '<select class="select" style="width:100px" data-live="1" data-act="filter" data-k="cur" data-tbl="tbl-accounts"><option value="">全部币种</option>' +
          ["USD", "EUR", "CAD", "GBP", "SGD", "MYR", "IDR", "THB", "VND"].map(function (s) { return '<option value="' + s + '"' + (ADH.f("cur") === s ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select>") +
        (srv
          ? '<select class="select" style="width:150px" data-live="1" data-act="filter" data-k="sort">' +
            [["-createdAt", "最新纳管"], ["createdAt", "最早纳管"], ["name", "账户名 A→Z"], ["-lastSyncAt", "最近同步"], ["-balance", "余额降序"], ["balance", "余额升序"]].map(function (o) {
              return '<option value="' + o[0] + '"' + (ADH.f("sort", "-createdAt") === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
            }).join("") + "</select>" +
            ADH.chip("info", "服务端分页", 1)
          : "") +
        '<div style="flex:1"></div>' +
        '<button class="btn sm" data-act="acct-export">' + ADH.icon("download", 13) + "导出</button>" +
        (ADH.can("account.bind")
          ? (srv
            ? '<button class="btn primary sm" data-act="acct-bind">' + ADH.icon("plus", 13) + "纳管账户</button>" +
              '<button class="btn sm" data-act="goto" data-page="channels">' + ADH.icon("plug", 13) + "渠道接入</button>"
            : '<button class="btn primary sm" data-act="goto" data-page="channels">' + ADH.icon("plus", 13) + "接入渠道</button>")
          : '<button class="btn sm disabled" title="' + ADH.LOCK_REASON["account.bind"] + '">' + ADH.icon("lock", 13) + "接入渠道</button>") +
        "</div></div>";

      const cols = [{ label: "账户" }, { label: "账户组" }, { label: "币种 / 时区" }, { label: "状态" }, { label: "健康度" }, { label: "余额", cls: "num" }, { label: "今日消耗", cls: "num" }, { label: "消费限额", cls: "num" }, { label: "数据源" }, { label: "最近同步" }, { label: "" }];
      const trows = rows.map(function (a) {
        return {
          cls: "clickable", attrs: ' data-act="account-detail" data-v="' + a.id + '"',
          c: ["<div><b>" + a.name + '</b><div class="xs muted mono">' + a.actId + "</div></div>",
            '<span class="chip plain">' + (D.groups.filter(function (g) { return g.id === a.group; })[0] || {}).name + "</span>",
            '<span class="mono small">' + a.currency + "</span> <span class=\"xs muted\">" + a.tz + "</span>",
            ADH.statusChip(a.status), ADH.healthChip(a.health),
            ADH.num(a.balance, 2), a.todaySpend ? ADH.num(a.todaySpend, 2) : '<span class="muted">0.00</span>',
            ADH.num(a.spendLimit, 0),
            '<span class="tag-code">' + a.source + "</span>",
            '<span class="xs ' + (a.lag ? "" : "muted") + '"' + (a.lag ? ' style="color:var(--warn)"' : "") + ">" + a.lastSyncAt + "</span>",
            ADH.icon("chevron", 14, "muted")],
          v: [a.name, a.group, a.currency, a.status, a.health.code, a.balance, a.todaySpend, a.spendLimit, a.source, a.lastSyncAt, ""]
        };
      });
      /* 服务端模式下由 live.pager 分页，表格不再自己翻页（pageSize = 本页条数） */
      h += ADH.tbl("tbl-accounts", cols, trows, { sortable: !srv, pageSize: srv ? rows.length : 8, empty: "无符合条件的账户" });
      if (srv) h += ADH.live.pager("accounts", D.accountsMeta);
      else if (rows.length !== D.accounts.length) h += '<div class="card-foot xs muted">已按筛选条件过滤：' + rows.length + " / " + D.accounts.length + ' 个账户（未被授权的账户组数据不参与统计）</div>';
      h += "</div>";
    }
    return h;
  }
});
ADH.action("acct-export", function () {
  if (!ADH.assertPerm("dashboard.export")) return;
  ADH.toast("已创建异步导出任务", "ok", "BR-129 导出统一走异步任务，完成后生成下载链接（有效期 7 天）；BR-130 越权范围的行不会出现在文件中");
});
ADH.action("account-group-detail", function (p) {
  const g = D.groups.filter(function (x) { return x.id === p.v; })[0];
  const accs = D.accounts.filter(function (a) { return a.group === g.id; });
  ADH.overlay({
    title: g.name, desc: g.desc,
    body: ADH.sec("授权信息") + ADH.kv([["账户组 ID", '<span class="tag-code">' + g.id + "</span>"], ["账户数", accs.length + " 个"], ["授权角色", g.grants.map(function (r) { return ADH_ROLES[r].label + "（" + r + "）"; }).join("、")], ["组内日预算上限", "$" + ADH.num(g.budgetCap, 0)]]) +
      ADH.sec("组内账户") + ADH.tbl("tbl-gg", [{ label: "账户" }, { label: "act_id" }, { label: "状态" }, { label: "今日消耗", cls: "num" }],
        accs.map(function (a) { return { c: [a.name, '<span class="mono small">' + a.actId + "</span>", ADH.statusChip(a.status), ADH.num(a.todaySpend, 2)] }; }), { tight: true }),
    foot: '<button class="btn" data-act="overlay-close">关闭</button>' + (ADH.can("user.manage") ? '<button class="btn primary" data-act="overlay-close">编辑授权</button>' : '<span class="xs muted">仅 admin 可修改账户组授权</span>')
  });
});
ADH.action("account-detail", function (p) {
  const a = D.accounts.filter(function (x) { return String(x.id) === String(p.v); })[0];
  if (!a) return;
  ADH.s().acctId = p.v;
  const tree = D.tree.filter(function (t) { return t.accountId === a.id; })[0];
  const sub = ADH.s().acctTab || "overview";
  let body = '<div class="tabs pill mb12">' + [["overview", "概览"], ["tree", "对象树"], ["health", "健康检测"], ["sync", "同步记录"]].map(function (t) {
    return '<button class="' + (sub === t[0] ? "on" : "") + '" data-act="acct-tab" data-v="' + t[0] + '">' + t[1] + "</button>";
  }).join("") + "</div>";
  if (sub === "overview") {
    body += ADH.sec("账户基础信息（FR-PRE-06）") + ADH.kv([["账户名", a.name], ["act_id", '<span class="tag-code">' + a.actId + "</span>"], ["渠道", 'Meta <span class="chip meta" style="margin-left:4px">' + ADH.state.env + "</span>"],
      ["BM 主体", a.bm], ["账户组", (D.groups.filter(function (g) { return g.id === a.group; })[0] || {}).name], ["币种 / 时区", a.currency + " · " + a.tz],
      ["状态", ADH.statusChip(a.status)], ["账户余额", "$" + ADH.num(a.balance, 2) + " " + a.currency], ["消费限额", "$" + ADH.num(a.spendLimit, 0) + " / 日"],
      ["今日消耗", "$" + ADH.num(a.todaySpend, 2)], ["营销目标", '<span class="tag-code">' + a.objective + "</span>"], ["最近同步", a.lastSyncAt]]);
    body += ADH.sec("对象规模") + '<div class="grid g4">' +
      [["Campaign", a.objects.campaigns], ["AdSet", a.objects.adsets], ["Ad", a.objects.ads], ["Creative", a.objects.creatives]].map(function (x) {
        return '<div class="stat"><div class="label">' + x[0] + '</div><div class="value">' + x[1] + "</div></div>";
      }).join("") + "</div>";
    body += ADH.sec("近 30 天消耗走势") + ADH.lineChart(a.series.map(function (r) { return r.date; }), [{ name: "消耗", color: "#3355ff", vals: a.series.map(function (r) { return r.spend; }), fill: 1 }], { height: 170 });
  } else if (sub === "tree") {
    if (!tree) body += ADH.empty("该账户暂无对象树数据");
    else {
      body += ADH.note("info", "统一对象模型（UOM）", "Campaign / AdSet / Ad 统一存储在 <span class='tag-code'>ad_entity</span>，渠道差异在适配层消化；<b>source</b> 区分 SYSTEM（系统创建，可编辑）与 EXTERNAL（渠道后台创建，默认只读，BR-13）。");
      body += '<div class="tree mt12">';
      tree.campaigns.forEach(function (c) {
        body += '<div class="tree-row"><span class="lvl-chip lvl-CAMPAIGN">CAMPAIGN</span><span class="nm">' + c.name + "</span><span class=\"sp\">" +
          '<span class="tag-code">' + c.externalId + "</span>" + ADH.statusChip(c.status) + (c.source === "EXTERNAL" ? ADH.chip("neutral", "外部创建") : ADH.chip("brand", "系统创建")) + "</span></div>";
        body += '<div class="tree-children">';
        c.adsets.forEach(function (s) {
          body += '<div class="tree-row"><span class="lvl-chip lvl-ADSET">ADSET</span><span class="nm">' + s.name + '</span><span class="sp"><span class="xs muted">日预算 $' + s.budget + "</span>" + ADH.statusChip(s.status) + "</span></div>";
          body += '<div class="tree-children">';
          s.ads.forEach(function (d) {
            body += '<div class="tree-row"><span class="lvl-chip lvl-AD">AD</span><span class="nm">' + d.name + '</span><span class="sp"><span class="xs muted">' + d.assetName + "</span>" + ADH.statusChip(d.status) + (d.hasData ? "" : ADH.chip("info", "无消耗")) + "</span></div>";
          });
          body += "</div>";
        });
        body += "</div>";
      });
      body += "</div>";
    }
  } else if (sub === "health") {
    body += ADH.sec("健康检测项（FR-PRE-08）") + ADH.tbl("tbl-h", [{ label: "异常类型" }, { label: "检测方式" }, { label: "当前状态" }, { label: "处理" }], [
      { c: ["账户停用 / 受限", "拉取账户状态字段", a.status === "DISABLED" ? ADH.chip("danger", "命中") : ADH.chip("ok", "正常"), "置为不可用，暂停该账户下所有待执行任务并告警"] },
      { c: ["余额不足", "余额 < 阈值（可按账户配置）", a.balance < 2000 ? ADH.chip("warn", "命中 · 余额 " + ADH.num(a.balance, 2)) : ADH.chip("ok", "正常 · " + ADH.num(a.balance, 2)), "告警，不自动充值"] },
      { c: ["频繁限流", "近 1 小时 429 比例 > 5%", a.health.code === "RATE_LIMIT" ? ADH.chip("warn", "命中") : ADH.chip("ok", "正常"), "降级调用频率并告警"] },
      { c: ["授权失效", "调用返回鉴权错误", a.health.code === "TOKEN" ? ADH.chip("danger", "命中") : ADH.chip("ok", "正常"), "该渠道任务转 PAUSED，恢复授权后一键重跑（BR-09）"] },
      { c: ["支出异常", "当日消耗 > 日均消耗 3 倍", a.health.code === "SPEND" ? ADH.chip("warn", "命中") : ADH.chip("ok", "正常"), "告警（阈值可配）"] }
    ], { tight: true });
    if (a.health.issues.length) body += '<div class="mt12">' + ADH.note(a.health.tone === "danger" ? "danger" : "warn", "当前异常明细", a.health.issues.join("<br/>")) + "</div>";
  } else {
    body += ADH.sec("最近同步记录") + ADH.tbl("tbl-as", [{ label: "时间" }, { label: "类型" }, { label: "结果" }, { label: "对象变化" }], [
      { c: ["2026-09-20 08:00", "增量同步（6h）", ADH.chip("ok", "成功"), "Campaign +2 / AdSet +5 / Ad +18"] },
      { c: ["2026-09-20 02:00", "增量同步（6h）", ADH.chip("ok", "成功"), "无变化"] },
      { c: ["2026-09-19 20:00", "增量同步（6h）", a.lag ? ADH.chip("warn", "部分失败") : ADH.chip("ok", "成功"), a.lag ? "游标失效 → 降级全量同步中" : "AdSet 状态变更 ×3"] },
      { c: ["2026-09-19 14:00", "全量校验", ADH.chip("ok", "成功"), "渠道侧对象数与本地一致"] }
    ], { tight: true });
    body += '<div class="mt12">' + ADH.note("info", "同步策略", "BR-14 增量同步维护 sync_cursor，游标失效时自动降级为全量同步；BR-15 同步失败不阻断其他账户，失败账户单独重试并告警。") + "</div>";
  }
  ADH.overlay({
    title: a.name, wide: true, desc: a.actId + " · " + a.bm + " · " + a.currency + " / " + a.tz,
    body: body,
    foot: (a.health.code !== "OK" ? ADH.note(a.health.tone === "danger" ? "danger" : "warn", "健康度：" + a.health.label, a.health.issues.join("；")) : '<span class="xs muted">账户健康</span>') +
      '<div class="grow"></div>' +
      '<button class="btn sm" data-act="acct-sync" data-v="' + a.id + '">' + ADH.icon("refresh", 13) + "手动触发同步</button>" +
      '<button class="btn sm" data-act="goto" data-page="batch-ops" data-sub="' + a.id + '">批量投放</button>' +
      '<button class="btn primary sm" data-act="overlay-close">关闭</button>'
  });
});
ADH.action("acct-tab", function (p) { ADH.s().acctTab = p.v; ADH.render(); ADH.action("account-detail", { v: ADH.s().acctId }); });
ADH.action("acct-sync", function (p) {
  ADH.toast("已创建同步任务", "ok", "FR-PRE-07 对象树增量同步已入队，可在任务中心查看进度");
  ADH.s().acctId = p.v; ADH.action("acct-tab", { v: "sync" });
});
})();
/* ================= 渠道接入与令牌 ================= */
(function () {
const D = ADH_DATA;
function scopeNote() {
  return ADH.note("rule", "最小权限原则（BR-01）", "Meta 仅申请 <b>ads_management</b>、<b>ads_read</b>、<b>business_management</b>，不申请发布类权限；同一渠道重复接入不产生重复凭证（BR-02 按「渠道 + 主体 ID」唯一键更新）。");
}
ADH.page("channels", {
  title: "渠道接入与令牌", subtitle: "OAuth 授权 · 账户纳管 · 令牌健康一览",
  render: function () {
    let h = '<div class="grid g3 mb12">';
    D.channels.forEach(function (c) {
      const connected = c.status === "CONNECTED";
      const metaEntry = '<button class="btn primary sm"' +
        (ADH.can("account.bind")
          ? ' data-act="oauth-wizard" data-v="meta"'
          : ' disabled title="' + ADH.LOCK_REASON["account.bind"] + '"') +
        ">" + ADH.icon(ADH.can("account.bind") ? "plus" : "lock", 13) + "接入 Meta 渠道</button>";
      h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("plug", 15) + c.label + "</h3><div class=\"right\">" + (connected ? ADH.chip("ok", "已接入", 1) : ADH.chip("neutral", "架构预留")) + "</div></div>" +
        '<div class="card-body">' + ADH.kv([["适配器", '<span class="tag-code">' + c.adapter + "</span>"], ["申请权限", c.scopes.map(function (s) { return '<span class="tag-code">' + s + "</span>"; }).join(" ")],
          ["凭证类型", c.tokenType], ["授权主体", connected ? c.bms.length + " 个 BM / " + c.bms.reduce(function (a, b) { return a + b.accounts; }, 0) + " 个账户" : "—"]]) + "</div>" +
        '<div class="card-foot flex gap8">' +
          (connected ? '<button class="btn sm" data-act="token-board">令牌健康一览</button>' : '') +
          (c.code === "meta"
            ? metaEntry
            : connected
              ? '<button class="btn sm" data-act="oauth-wizard" data-v="' + c.code + '">重新授权</button>'
              : '<button class="btn sm disabled" title="暂未开放">' + ADH.icon("lock", 13) + "暂未开放</button>") + "</div></div>";
    });
    h += "</div>";

    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("shield", 15) + '令牌健康一览<span class="desc">渠道 / 主体 / 到期时间 / 最近成功调用 / 最近失败原因</span></h3></div><div class="card-body">';
    h += ADH.tbl("tbl-token", [{ label: "渠道" }, { label: "主体（BM）" }, { label: "账户数" }, { label: "令牌剩余" }, { label: "最近成功调用" }, { label: "最近失败原因" }, { label: "状态" }, { label: "刷新策略" }, { label: "" }],
      D.channels.filter(function (c) { return c.bms.length; }).reduce(function (acc, c) {
        c.bms.forEach(function (b) {
          const tone = b.tokenExpireDays < 1 ? "danger" : (b.tokenExpireDays < 7 ? "warn" : "ok");
          const label = b.tokenExpireDays < 1 ? "已过期" : b.tokenExpireDays + " 天";
          acc.push({
            c: ['<span class="chip meta">' + c.code + "</span>", b.name, b.accounts,
              '<span class="chip ' + tone + '">' + label + "</span>", '<span class="mono xs">' + b.lastOk + "</span>",
              b.lastError === "—" ? '<span class="muted">—</span>' : '<span class="xs" style="color:var(--danger)">' + ADH.esc(b.lastError) + "</span>",
              b.tokenExpireDays < 1 ? ADH.chip("danger", "授权失效") : (b.tokenExpireDays < 7 ? ADH.chip("warn", "即将过期") : ADH.chip("ok", "有效")),
              '<span class="tag-code">' + (b.tokenExpireDays < 1 ? "人工确认刷新" : "自动刷新") + "</span>",
              '<button class="btn xs" data-act="token-refresh" data-v="' + b.id + '">刷新</button>'],
            v: [c.code, b.name, b.accounts, b.tokenExpireDays, b.lastOk, b.lastError, "", "", ""]
          });
        });
        return acc;
      }, []), { sortable: true, tight: true });
    h += '<div class="mt12">' + ADH.note("warn", "令牌预警规则（BR-07 / BR-09）", "剩余有效期 <b>&lt; 7 天</b> 推送预警；<b>&lt; 1 天</b> 升级为严重告警。令牌失效后，该渠道下所有依赖任务进入 <b>PAUSED</b>（而非失败），恢复授权后可一键重跑且不产生重复对象。") + "</div>";
    h += "</div>";
    return h;
  }
});
ADH.action("oauth-wizard", function (p) {
  if (!ADH.assertPerm("account.bind")) return;
  const step = ADH.s().oauthStep || 1;
  let body = '<div class="wizard">' + [["1", "权限确认", "最小权限范围"], ["2", "渠道授权", "跳转 Meta OAuth"], ["3", "勾选账户", "纳管待同步账户"], ["4", "完成", "落库 + 首次同步"]].map(function (s, i) {
    const n = i + 1;
    return (i ? '<i class="wz-line' + (step > n - 1 ? " done" : "") + '"></i>' : "") +
      '<div class="wz ' + (step > n ? "done" : (step === n ? "on" : "")) + '"><span class="n">' + (step > n ? "✓" : s[0]) + '</span><span class="t"><b>' + s[1] + "</b><small>" + s[2] + "</small></span></div>";
  }).join("") + "</div>";
  if (step === 1) {
    body += scopeNote() +
      ADH.sec("本次接入将申请") + ADH.tbl("t", [{ label: "权限" }, { label: "用途" }], [
        { c: ['<span class="tag-code">ads_management</span>', "创建 / 修改广告对象（Campaign / AdSet / Ad / Creative）"] },
        { c: ['<span class="tag-code">ads_read</span>', "读取账户、对象与 Insights 报表数据"] },
        { c: ['<span class="tag-code">business_management</span>', "读取企业 BM 下的广告账户清单"] }
      ], { tight: true }) +
      ADH.note("info", "不会申请的权限", "发布类权限（publish_pages）、用户数据类权限一律不申请；接入过程中若中途退出，不落库任何中间态账户。");
  } else if (step === 2) {
    body += '<div style="border:1px solid var(--line);border-radius:12px;overflow:hidden">' +
      '<div style="background:#0d1220;padding:12px 16px"><div style="color:#fff;font-weight:600;font-size:13px">Meta for Developers · 授权确认</div><div class="xs" style="color:#8b9ac4">完成登录与授权后，将自动返回并同步广告账户</div></div>' +
      '<div class="card-body">' + ADH.note("info", "请选择要授权的企业主体", "授权后将拉取该主体下所有可纳管的广告账户，账户按主体分组展示（BR-05）。") +
      '<div class="mt12">' + D.channels[0].bms.map(function (b) {
        return '<div class="todo" data-act="pick-bm" data-v="' + b.id + '"><div class="ico-wrap" style="background:var(--brand-soft);color:var(--brand)">' + ADH.icon("folder", 15) + "</div>" +
          '<div class="tx"><b>' + b.name + '</b><small>' + b.id + " · 可纳管 " + b.accounts + " 个广告账户</small></div>" +
          (ADH.sel("bm").indexOf(b.id) >= 0 ? ADH.chip("ok", "已选择") : ADH.chip("neutral", "未选择")) + "</div>";
      }).join("") + "</div></div></div>";
  } else if (step === 3) {
    const picked = ADH.sel("bm").length ? ADH.sel("bm") : [D.channels[0].bms[0].id];
    const accs = D.accounts.filter(function (a, i) { return i < 6; });
    body += ADH.note("warn", "请勾选需要纳管的账户", "未勾选的账户不会被纳管，也不会消耗同步配额。已纳管的账户重复勾选不会产生重复记录。") +
      ADH.sec("可纳管账户（" + accs.length + " 个，展示前 6 条）") +
      '<div style="border:1px solid var(--line);border-radius:9px">' + accs.map(function (a) {
        const on = ADH.sel("bind").indexOf(a.actId) >= 0;
        return '<div class="tree-row" style="border-bottom:1px solid var(--line);border-radius:0" data-act="sel" data-key="bind" data-v="' + a.actId + '">' +
          '<input type="checkbox" ' + (on ? "checked" : "") + ' style="accent-color:var(--brand)" />' +
          '<div class="grow"><b>' + a.name + '</b> <span class="tag-code">' + a.actId + '</span><div class="xs muted">' + a.bm + " · " + a.currency + " · " + a.tz + "</div></div>" +
          ADH.statusChip(a.status) + "</div>";
      }).join("") + "</div>" +
      '<div class="mt12">' + ADH.note("info", "确认后", "账户立即落库并创建同步任务：拉取账户基础信息 → 拉取对象树（Campaign/AdSet/Ad/Creative）→ 同步完成后账户状态置为「可用」。") + "</div>";
  } else {
    body += ADH.note("ok", "接入完成", "已纳管 <b>" + Math.max(1, ADH.sel("bind").length) + "</b> 个广告账户，首次全量结构同步任务已入队。") +
      ADH.sec("本次动作") + ADH.kv([["授权主体", ADH.sel("bm").join("、") || D.channels[0].bms[0].name], ["纳管账户", Math.max(1, ADH.sel("bind").length) + " 个"],
        ["令牌类型", "系统用户长期令牌（自动刷新策略）"], ["审计记录", "已写入审计日志（BR-10 令牌创建写入审计）"], ["下一步", "等待首次对象树同步完成（预计 3 分钟）"]]) +
      '<div class="mt12"><button class="btn primary" data-act="goto" data-page="tasks">前往任务中心查看同步进度</button></div>';
  }
  ADH.overlay({
    kind: "modal", wide: true, title: "接入 Meta 渠道", desc: "FR-PRE-01 · 流程一：账户接入与结构同步",
    body: body,
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
      (step > 1 ? '<button class="btn" data-act="oauth-step" data-v="' + (step - 1) + '">上一步</button>' : "") +
      (step < 4 ? '<button class="btn primary" data-act="oauth-step" data-v="' + (step + 1) + '">下一步</button>' : '<button class="btn primary" data-act="oauth-finish">完成</button>')
  });
});
ADH.action("oauth-step", function (p) { ADH.s().oauthStep = Number(p.v); ADH.action("oauth-wizard", { v: "meta" }); });
ADH.action("pick-bm", function (p) { ADH.action("sel", { key: "bm", v: p.v }); ADH.s().oauthStep = 2; ADH.action("oauth-wizard", { v: "meta" }); });
(function () {
  const origSel = ADH.actions["sel"];
  ADH.action("sel", function (p, el, ev) {
    origSel(p, el, ev);
    const ov = ADH.overlayOpen;
    const head = ov && ov.querySelector("h3");
    if (head && head.textContent.indexOf("接入 Meta") >= 0) ADH.action("oauth-wizard", { v: "meta" });
    else { ADH.s().oauthStep = 1; }
  });
})();
ADH.action("oauth-finish", function () {
  ADH.s().oauthStep = 1; ADH.s().sel = {};
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("Meta 渠道接入完成", "ok", "已创建首次结构同步任务 · 审计日志已记录");
  ADH.routeTo("tasks");
});
ADH.action("token-board", function () { ADH.toast("令牌健康一览已在页面下方展示", "info", "渠道 / 主体 / 到期时间 / 最近成功调用 / 最近失败原因"); });
ADH.action("token-refresh", function (p) {
  ADH.toast("已触发令牌刷新", "ok", "BR-08 刷新策略：自动刷新 / 人工确认刷新；BR-10 刷新动作写入审计日志");
});
})();
/* ================= 账户组与数据权限 ================= */
/* 真实接口模式（任意页面）：账户组与数据权限页使用（F3.2） */
function liveOn() { return !!(ADH.live && ADH.live.active()); }
/* 账户组写操作权限码：真实模式由后端判定（account.bind），演示模式沿用原型权限矩阵 */
function groupWritePerm() { return liveOn() ? "account.bind" : "user.manage"; }
/* 组内日预算上限：演示数据无币种字段（沿用 $ 口径），真实接口带币种 */
function groupBudgetText(g) {
  if (!g.budgetCap) return '<span class="muted">未设置</span>';
  if (!g.budgetCurrency) return "$" + ADH.num(g.budgetCap, 0);
  return ADH.num(g.budgetCap, 0) + ' <span class="xs muted">' + ADH.esc(g.budgetCurrency) + "</span>";
}
(function () {
const D = ADH_DATA;
ADH.page("groups", {
  title: "账户组与数据权限", subtitle: "功能权限 × 数据范围，按账户组授权",
  render: function () {
    const srv = liveOn();
    const groups = D.groups || [];
    const writePerm = groupWritePerm();
    const mine = srv
      ? groups.filter(function (g) { return g.visible !== false; })
      : groups.filter(function (g) { return g.grants.indexOf(ADH.state.role) >= 0; });
    const covered = groups.reduce(function (n, g) { return n + (g.accounts || 0); }, 0);
    const users = srv ? (((D.usersLive || {}).items) || []) : D.users;
    const usersError = srv ? (D.usersLive || {}).error : "";
    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "账户组总数", value: groups.length, unit: "个", foot: '<span class="muted">' + (srv ? "账户组是数据权限的最小单位（BR-3.4）" : "覆盖 " + D.accounts.length + " 个广告账户") + "</span>" }) +
      ADH.stat({ label: srv ? "当前账号可见组" : "当前角色可见组", value: mine.length, unit: "个", foot: '<span class="muted">' + (srv ? (ADH.live.session.dataScope === "ALL" ? "数据范围 ALL（不限账户组）" : "按账户组授权") : ADH.roleLabel() + " · " + ADH.rolePerson()) + "</span>" }) +
      (srv
        ? ADH.stat({ label: "组内账户合计", value: covered, unit: "个", foot: '<span class="muted">按账户归属统计（BR-3.4）</span>' })
        : ADH.stat({ label: "未授权组的账户", value: D.accounts.filter(function (a) { return mine.map(function (g) { return g.id; }).indexOf(a.group) < 0; }).length, unit: "个", foot: '<span class="muted">列表中隐藏（不置灰）</span>' })) +
      ADH.stat({ label: "生效方式", value: "即时", foot: '<span class="muted">BR-140 权限变更立即生效，无需重新登录</span>' }) + "</div>";

    h += '<div class="card mb12"><div class="card-head"><h3>' + ADH.icon("folder", 15) + "账户组列表</h3><div class=\"right\">" +
      (ADH.can(writePerm) ? '<button class="btn primary sm" data-act="group-new">' + ADH.icon("plus", 13) + "新建账户组</button>" : '<button class="btn sm disabled" title="' + ADH.LOCK_REASON[writePerm] + '">' + ADH.icon("lock", 13) + "新建账户组</button>") +
      "</div></div>" +
      ADH.tbl("tbl-groups", [{ label: "账户组" }, { label: "说明" }, { label: "账户数", cls: "num" }, { label: srv ? "授权用户" : "授权角色" }, { label: "组内日预算上限", cls: "num" }, { label: "当前角色" }, { label: "" }],
        groups.map(function (g) {
          const ok = srv ? g.visible !== false : g.grants.indexOf(ADH.state.role) >= 0;
          return {
            c: ['<b>' + ADH.esc(g.name) + '</b><div class="xs muted mono">' + g.id + "</div>", '<span class="small">' + ADH.esc(g.desc) + "</span>", g.accounts,
              srv ? (g.users || 0) + " 名" : g.grants.map(function (r) { return ADH.chip("neutral", ADH_ROLES[r].label); }).join(" "), groupBudgetText(g),
              ok ? ADH.chip("ok", "已授权", 1) : ADH.chip("neutral", "不可见"),
              '<button class="btn xs" data-act="group-detail" data-v="' + g.id + '">详情</button>' +
              (srv && ADH.can("account.bind")
                ? '<button class="btn xs" data-act="group-edit" data-v="' + g.id + '">' + ADH.icon("edit", 12) + "编辑</button>" +
                  '<button class="btn xs" data-act="group-del" data-v="' + g.id + '">' + ADH.icon("trash", 12) + "删除</button>"
                : "")],
            v: [g.name, g.desc, g.accounts, srv ? (g.users || 0) : g.grants.length, g.budgetCap, ok ? 1 : 0, ""]
          };
        }), { sortable: true, tight: true }) + "</div>";

    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("users", 15) + '用户 × 账户组 授权矩阵<span class="desc">FR-SYS-03</span></h3></div><div class="card-body">';
    h += '<div class="table-wrap"><table class="tbl matrix"><thead><tr><th>用户</th><th>角色</th>' + groups.map(function (g) { return '<th class="rot">' + ADH.esc(g.name) + "</th>"; }).join("") + "<th>状态</th></tr></thead><tbody>";
    users.forEach(function (u) {
      h += srv
        ? "<tr><td><b>" + ADH.esc(u.displayName) + '</b><div class="xs muted mono">' + ADH.esc(u.username) + "</div></td><td>" + ADH.chip("neutral", ADH.live.roleLabelOf((u.roles || [])[0])) + "</td>"
        : "<tr><td><b>" + u.name + '</b><div class="xs muted mono">' + u.account + "</div></td><td>" + ADH.chip("neutral", ADH_ROLES[u.role].label) + "</td>";
      groups.forEach(function (g) {
        const all = srv ? (u.roles || []).indexOf("ADMIN") >= 0 : u.groups.indexOf("全部账户组") >= 0;
        const names = (srv ? u.accountGroupNames : u.groups) || [];
        const has = all || names.indexOf(g.name) >= 0;
        h += '<td class="' + (has ? "yes" : "no") + '">' + (has ? "✓" : "—") + "</td>";
      });
      h += "<td>" + ADH.statusChip(u.status) + "</td></tr>";
    });
    h += "</tbody></table></div>";
    h += srv
      ? '<div class="mt12">' + ADH.note("info", "真实口径", (usersError ? "本次未取到用户列表：" + ADH.esc(usersError) + "。" : "用户与授权来自 <span class=\"tag-code\">GET /v1/users</span> 的 <span class=\"tag-code\">roles[]</span> / <span class=\"tag-code\">accountGroupNames[]</span>；admin 角色为全部账户组数据范围（dataScope=ALL）。")) + "</div>"
      : '<div class="mt12">' + ADH.note("rule", "关键业务规则", "BR-3.4 用户只能看到被授权账户组下的数据，未授权账户在列表中隐藏；BR-3.5 optimizer 的批量操作作用于其有数据权限的账户，越权提交直接拒绝并记录审计日志。") + "</div>";
    h += "</div></div>";

    if (srv) h += '<div class="mt12">' + ADH.note("info", "真实模式", "账户组 / 账户数 / 预算上限来自 <span class=\"tag-code\">GET /v1/account-groups</span>，用户授权来自 <span class=\"tag-code\">GET /v1/users</span>；新建 / 编辑 / 删除走 <span class=\"tag-code\">POST · PATCH · DELETE /v1/account-groups</span>（需 <span class=\"tag-code\">account.bind</span>，PRD 3.2 中仅 admin）。") + "</div>";
    return h;
  }
});
ADH.action("group-detail", function (p) {
  const g = D.groups.filter(function (x) { return x.id === p.v; })[0];
  ADH.action("account-group-detail", { v: g.id });
});
ADH.action("group-new", function () {
  if (!ADH.assertPerm("user.manage")) return;
  ADH.overlay({
    kind: "modal", title: "新建账户组", desc: "用于数据权限授权（BR-3.4）与批量操作范围（BR-3.5）",
    body: ADH.sec("基本信息") + '<div class="grid g2">' +
      '<div class="field"><label>账户组名称</label><input class="input" placeholder="例如：日本站测试组" /></div>' +
      '<div class="field"><label>组内日预算上限（USD）</label><input class="input" placeholder="1000" /></div>' +
      '<div class="field" style="grid-column:1/-1"><label>说明</label><input class="input" placeholder="用途与适用范围" /></div></div>' +
      ADH.sec("授权角色") + ["admin", "optimizer", "designer", "analyst"].map(function (r) {
        return '<label class="check" style="margin-right:14px"><input type="checkbox" ' + (r === "admin" ? "checked disabled" : "") + " /><span>" + ADH_ROLES[r].label + "</span></label>";
      }).join("") +
      '<div class="mt12">' + ADH.note("info", "保存后", "账户组立即可用于账户归属与用户授权；账户组的创建与授权变更均写入审计日志。") + "</div>",
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="overlay-close">保存账户组</button>'
  });
});
ADH.action("try-denied", function () {
  ADH.toast("提交被拒绝", "danger", "目标账户 act_4410203 不在当前角色（" + ADH.roleLabel() + "）的数据权限范围内 · 已记录审计日志（BR-3.5 / BR-57）");
});
})();

/* ================= 素材中心 ================= */
(function () {
const D = ADH_DATA;
function ratioColor(r) {
  return { "1:1": "linear-gradient(135deg,#4f6bff,#7c3aed)", "4:5": "linear-gradient(135deg,#0b9e6a,#12b76a)", "9:16": "linear-gradient(135deg,#c2780a,#f79009)", "16:9": "linear-gradient(135deg,#0b7ec4,#38bdf8)" }[r] || "linear-gradient(135deg,#64748b,#94a3b8)";
}
function assetFilter(a) {
  const q = (ADH.f("q", "") + "").toLowerCase();
  if (q && (a.name + a.id).toLowerCase().indexOf(q) < 0) return false;
  if (ADH.f("type") && a.type !== ADH.f("type")) return false;
  if (ADH.f("ratio") && a.ratio !== ADH.f("ratio")) return false;
  if (ADH.f("status") && a.status !== ADH.f("status")) return false;
  if (ADH.f("owner") && a.uploadedBy !== ADH.f("owner")) return false;
  return true;
}
function assetCard(a) {
  const on = ADH.sel("assets").indexOf(a.id) >= 0;
  const st = D.assetStatus[a.status];
  return '<div class="asset-card' + (on ? " sel" : "") + '" data-act="asset-detail" data-v="' + a.id + '">' +
    '<div class="thumb" style="background:' + ratioColor(a.ratio) + '">' +
    '<span class="ratio">' + a.ratio + '</span><span class="kind">' + (a.type === "VIDEO" ? "▶ " + (a.durationMs / 1000).toFixed(0) + "s" : "■ IMG") + "</span>" +
    '<span class="glyph">' + ADH.icon(a.type === "VIDEO" ? "play" : "image", 22) + "</span></div>" +
    '<div class="asset-meta"><div class="an" title="' + ADH.esc(a.name) + '">' + a.name + "</div>" +
    '<div class="as">' + ADH.chip(st.tone, st.label) + '<span class="num">CTR ' + ADH.pct(a.agg.ctr, 2) + '</span><span class="num">ROAS ' + a.agg.roas.toFixed(2) + "</span></div>" +
    '<div class="as xs muted">' + a.id + " · " + a.w + "×" + a.h + " · " + a.sizeMB.toFixed(1) + "MB · 引用 " + a.usedBy + " 条广告</div></div>" +
    '<label class="asset-check check" data-act="sel" data-key="assets" data-v="' + a.id + '"><input type="checkbox" ' + (on ? "checked" : "") + " /></label></div>";
}
ADH.page("assets", {
  title: "素材中心", subtitle: "批量上传 · 规格校验与转码 · 审核状态跟踪 · 素材反查",
  render: function () {
    const tab = ADH.tabOf("library");
    const view = ADH.s().assetView === "table" ? "table" : "grid";
    const list = D.assets.filter(assetFilter);
    const sel = ADH.sel("assets");
    const rejected = D.assets.filter(function (a) { return a.status === "REJECTED"; });

    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "素材总量", value: D.assets.length, unit: "个", foot: '<span class="muted">设计容量 ≤ 10 万</span>' }) +
      ADH.stat({ label: "已批准 / 审核中", value: D.assets.filter(function (a) { return a.status === "APPROVED"; }).length + " / " + D.assets.filter(function (a) { return a.status === "IN_REVIEW" || a.status === "SUBMITTED"; }).length, foot: '<span class="muted">渠道审核结果同步</span>' }) +
      ADH.stat({ label: "被拒审", value: rejected.length, unit: "个", foot: '<span style="color:var(--danger)">已自动暂停引用它们的广告</span>' }) +
      ADH.stat({ label: "内容去重命中", value: 6, unit: "次", foot: '<span class="muted">按内容指纹去重</span>' }) + "</div>";

    h += '<div class="card"><div class="tabs">' +
      [["library", "素材库"], ["review", "审核状态"], ["uploads", "上传记录"]].map(function (t) {
        return '<button class="' + (tab === t[0] ? "on" : "") + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + '<div class="right" style="margin-left:auto;display:flex;align-items:center;gap:8px;padding:5px 0">' +
      (ADH.can("asset.upload") ? '<button class="btn primary sm" data-act="asset-upload">' + ADH.icon("upload", 13) + "批量上传</button>" : '<button class="btn sm disabled" disabled title="' + ADH.LOCK_REASON["asset.upload"] + '">' + ADH.icon("lock", 13) + "批量上传</button>") + "</div></div>";

    if (tab === "library") {
      h += '<div class="card-body" style="padding:11px 14px"><div class="toolbar">' +
        '<div class="search grow" style="max-width:230px">' + ADH.icon("search", 13) + '<input id="as-q" class="input" placeholder="搜索素材名 / 编号" value="' + ADH.esc(ADH.f("q", "")) + '" data-live="1" data-act="filter" data-k="q" /></div>' +
        '<select class="select" style="width:110px" data-act="filter" data-k="type"><option value="">全部类型</option>' + ["VIDEO", "IMAGE"].map(function (x) { return '<option value="' + x + '"' + (ADH.f("type") === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>" +
        '<select class="select" style="width:100px" data-act="filter" data-k="ratio"><option value="">全部比例</option>' + ["1:1", "4:5", "9:16", "16:9"].map(function (x) { return '<option value="' + x + '"' + (ADH.f("ratio") === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>" +
        '<select class="select" style="width:130px" data-act="filter" data-k="status"><option value="">全部状态</option>' + Object.keys(D.assetStatus).map(function (x) { return '<option value="' + x + '"' + (ADH.f("status") === x ? " selected" : "") + ">" + D.assetStatus[x].label + "</option>"; }).join("") + "</select>" +
        '<select class="select" style="width:110px" data-act="filter" data-k="owner"><option value="">全部上传人</option>' + ["苏晴", "林可", "周振业"].map(function (x) { return '<option value="' + x + '"' + (ADH.f("owner") === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>" +
        '<div style="flex:1"></div><span class="xs muted">共 ' + list.length + " 个</span>" +
        '<div class="btn-group"><button class="' + (view === "grid" ? "on" : "") + '" data-act="asset-view-toggle" data-v="grid">网格</button><button class="' + (view === "table" ? "on" : "") + '" data-act="asset-view-toggle" data-v="table">表格</button></div></div>' +
        (sel.length ? '<div class="toolbar mt8" style="padding-top:8px;border-top:1px dashed var(--line)"><span class="small">已选 <b>' + sel.length + '</b> 个</span>' +
          (ADH.can("plan.submit") ? '<button class="btn xs" data-act="goto" data-page="batch-plan">加入批量计划</button>' : "") +
          '<button class="btn xs" data-act="asset-archive">归档</button>' +
          (ADH.can("asset.delete") ? '<button class="btn xs danger-ghost" data-act="asset-delete">物理删除</button>' : '<button class="btn xs disabled" title="' + ADH.LOCK_REASON["asset.delete"] + '">物理删除</button>') +
          '<button class="btn xs ghost" data-act="sel-clear" data-k="assets">取消选择</button></div>' : "") + "</div>";
      if (view === "table") {
        const rows = list.map(function (a) {
          const st = D.assetStatus[a.status];
          return {
            c: [
              ADH.checkbox("assets", a.id),
              '<div class="asset-row-main"><span class="asset-row-thumb" style="background:' + ratioColor(a.ratio) + '">' + ADH.icon(a.type === "VIDEO" ? "play" : "image", 14) + '</span><div><b title="' + ADH.esc(a.name) + '">' + ADH.esc(a.name) + '</b><div class="xs muted mono">' + a.id + "</div></div></div>",
              a.ratio,
              a.w + "×" + a.h,
              a.type === "VIDEO" ? "视频 · " + (a.durationMs / 1000).toFixed(0) + "s" : "图片",
              ADH.chip(st.tone, st.label),
              '<span class="mono xs">' + ADH.pct(a.agg.ctr, 2) + "</span>",
              '<span class="mono xs">' + a.agg.roas.toFixed(2) + "</span>",
              a.usedBy + " 条",
              '<div><span>' + ADH.esc(a.uploadedBy) + '</span><div class="xs muted mono">' + a.uploadedAt + "</div></div>",
              '<button class="btn xs" data-act="asset-detail" data-v="' + a.id + '">详情</button>'
            ],
            v: [a.id, a.name, a.ratio, a.w + "×" + a.h, a.type, a.status, a.agg.ctr, a.agg.roas, a.usedBy, a.uploadedBy, a.uploadedAt, ""]
          };
        });
        h += '<div class="card-body">' + (rows.length
          ? ADH.tbl("tbl-assets", [{ label: "" }, { label: "素材" }, { label: "比例" }, { label: "尺寸" }, { label: "类型" }, { label: "审核状态" }, { label: "CTR", cls: "num" }, { label: "ROAS", cls: "num" }, { label: "引用广告", cls: "num" }, { label: "上传人 / 时间" }, { label: "操作" }], rows, { sortable: true, tight: true })
          : ADH.empty("无符合条件的素材")) + "</div>";
      } else {
        h += '<div class="card-body"><div class="asset-grid">' + (list.length ? list.map(assetCard).join("") : ADH.empty("无符合条件的素材")) + "</div></div>";
      }
    } else if (tab === "review") {
      h += '<div class="card-body">' + ADH.note("info", "审核状态机与轮询节奏", "状态流转：UPLOADED → VALIDATING → READY → SUBMITTED → IN_REVIEW → APPROVED / REJECTED → ARCHIVED。<b>BR-25 轮询间隔</b>：提交后 5 分钟内每 1 分钟一次，之后每 30 分钟一次，24 小时后每 6 小时一次。") + '<div class="hr"></div>';
      const cols = [{ label: "素材" }, { label: "状态" }, { label: "提交时间" }, { label: "审核轮次" }, { label: "拒审原因分类" }, { label: "渠道原因原文" }, { label: "操作" }];
      h += ADH.tbl("tbl-review", cols, D.assets.filter(function (a) { return ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"].indexOf(a.status) >= 0; }).map(function (a) {
        return {
          c: ['<b>' + a.name + '</b><div class="xs muted mono">' + a.id + " · " + a.type + " · " + a.ratio + "</div>",
            ADH.chip(D.assetStatus[a.status].tone, D.assetStatus[a.status].label), '<span class="mono xs">' + a.submittedAt + "</span>", "第 " + a.reviewTurns + " 次",
            a.reject ? ADH.chip("danger", a.reject.label) : '<span class="muted">—</span>',
            a.reject ? '<span class="xs" style="color:var(--danger)">' + ADH.esc(a.rejectRaw) + "</span>" : '<span class="muted">—</span>',
            a.status === "REJECTED" ? '<button class="btn xs" data-act="asset-resubmit" data-v="' + a.id + '">修改后重新提交</button>' : '<button class="btn xs" data-act="asset-detail" data-v="' + a.id + '">详情</button>'],
          v: [a.name, a.status, a.submittedAt, a.reviewTurns, a.reject ? a.reject.cat : "", a.rejectRaw, ""]
        };
      }), { sortable: true, pageSize: 8, zebra: true });
      h += '<div class="mt12 grid g2">' + ADH.note("warn", "BR-26 拒审必录原因原文", "拒审必须记录渠道返回的 reason 字段原文，并映射为内部统一原因分类，便于按原因聚合与迭代。") +
        ADH.note("info", "BR-27 / BR-28 / BR-29", "拒审告警接收人 = 素材上传者 + 素材所属账户组的投手；已批准素材若复审变为拒审需重新告警；被拒审素材不可被新计划引用，但历史关联关系保留。") + "</div>";
      h += "</div>";
    } else if (tab === "uploads") {
      h += '<div class="card-body">' + ADH.sec("上传批次") + ADH.tbl("tbl-up", [{ label: "批次" }, { label: "文件数" }, { label: "成功 / 失败" }, { label: "总大小" }, { label: "耗时" }, { label: "上传人" }, { label: "结果" }], [
        { c: ["UP-20260920-01", 128, "126 / 2", "18.4 GB", "4 分 12 秒", "苏晴", '<button class="btn xs" data-act="goto" data-page="tasks">查看失败原因</button>'] },
        { c: ["UP-20260918-02", 42, "42 / 0", "4.1 GB", "1 分 58 秒", "苏晴", ADH.chip("ok", "全部成功")] },
        { c: ["UP-20260915-03", 96, "94 / 2", "12.7 GB", "3 分 40 秒", "林可", ADH.chip("warn", "部分失败（格式 / 大小）")] }
      ], { tight: true }) +
        '<div class="mt12">' + ADH.note("info", "上传规则", "BR-17 单次上传文件数上限 500，单文件上限按渠道规格取最小值（视频默认 ≤ 4GB）；BR-18 支持断点续传，中断后重新上传相同文件按哈希匹配不产生重复素材；BR-21 上传失败逐文件给出失败原因，不允许整体静默失败。") + "</div>" +
        ADH.sec("文件名解析规则（可配置）") + '<div class="formula">{素材名}_{版本}_{尺寸}_{投放方向}_{序号}<br/><span class="c">// 示例：</span> US_付费_闪婚总裁_v3_1080x1350_竖版_01.jpg<br/><span class="c">// 解析结果 →</span> { name: <span class="v">US_付费_闪婚总裁</span>, version: <span class="v">v3</span>, size: <span class="v">1080x1350</span>, direction: <span class="v">竖版</span> }<br/><span class="c">// 解析失败不阻断上传</span></div></div>';
    } else if (tab === "versions") {
      const baseOf = function (n) { return n.replace(/_v\d+$/, ""); };
      const groups = {};
      D.assets.forEach(function (a) { const b = baseOf(a.name); (groups[b] = groups[b] || []).push(a); });
      const groupKeys = Object.keys(groups);
      const withHistory = D.assets.filter(function (a) { return Number(String(a.version).replace("v", "")) > 1; });
      const archived = D.assets.filter(function (a) { return a.status === "ARCHIVED"; });
      const DUP = [
        { at: "2026-09-20 09:41", name: "US_付费_闪婚总裁_v3_1080x1350_竖版_01.mp4", hash: "sha256:1f0a93c7e4b2", from: "UP-20260920-01", action: "命中已有素材 AS-2601，跳过渠道上传" },
        { at: "2026-09-18 15:02", name: "EU_付费_狼人恋人_v2_1080x1080_方形_01.jpg", hash: "sha256:3c77b1d0a9f5", from: "UP-20260918-02", action: "命中已有素材 AS-2603，仅登记版本号 v2" },
        { at: "2026-09-15 11:20", name: "SEA_拉新_末日余生_v3_1080x1920_竖版_01.mp4", hash: "sha256:9ab4e2107c3d", from: "UP-20260915-03", action: "命中已有素材 AS-2605，跳过渠道上传" }
      ];
      h += '<div class="card-body">' +
        '<div class="grid g4 mb12">' +
          ADH.stat({ label: "素材分组（按基名）", value: groupKeys.length, unit: "组", foot: '<span class="muted">FR-PRE-15 同素材多版本归组</span>' }) +
          ADH.stat({ label: "已累积历史版本", value: withHistory.length, unit: "个", foot: '<span class="muted">当前版本 &gt; v1，旧版本不自动删除</span>' }) +
          ADH.stat({ label: "已归档（软删除）", value: archived.length, unit: "个", foot: '<span class="muted">历史引用关系仍保留（BR-29）</span>' }) +
          ADH.stat({ label: "内容去重命中", value: DUP.length, unit: "次", foot: '<span class="muted">FR-PRE-16 按 content_hash 去重</span>' }) +
        "</div>" +
        ADH.sec("素材版本（FR-PRE-15）") +
        ADH.tbl("tbl-ver", [{ label: "素材基名" }, { label: "当前版本" }, { label: "累计版本数", cls: "num" }, { label: "content_hash" }, { label: "上传人" }, { label: "状态" }, { label: "引用广告", cls: "num" }, { label: "" }],
          D.assets.map(function (a) {
            const v = Number(String(a.version).replace("v", ""));
            return { c: ["<b>" + ADH.esc(baseOf(a.name)) + "</b>",
              '<span class="tag-code">' + a.version + "</span>", v,
              '<span class="mono xs">' + a.hash + "</span>", '<span class="xs">' + a.uploadedBy + "</span>",
              ADH.chip(D.assetStatus[a.status].tone, D.assetStatus[a.status].label), a.usedBy,
              '<button class="btn xs" data-act="asset-version-detail" data-v="' + a.id + '">版本历史</button>'],
              v: [baseOf(a.name), v, v, a.hash, a.uploadedBy, a.status, a.usedBy, 0] };
          }), { sortable: true, pageSize: 10, tight: true }) +
        '<div class="mt12 grid g2">' +
          ADH.note("rule", "FR-PRE-15 版本与归档", "同一素材的多个版本共用一个基名，新版本上传后旧版本<b>不自动删除</b>；归档是<b>软删除</b>，仅从可选池移除，历史广告的引用关系与明细展示保留（BR-29），物理删除仅 admin 可执行。") +
          ADH.note("rule", "FR-PRE-16 内容去重", "上传先算 content_hash，命中已有素材时<b>不重复上传渠道</b>，只登记版本或直接跳过（BR-18 断点续传同样按哈希匹配），避免占用渠道素材配额。") +
        "</div>" +
        '<div class="mt12">' + ADH.sec("内容去重命中记录（FR-PRE-16）") +
          ADH.tbl("tbl-dup", [{ label: "时间" }, { label: "文件名" }, { label: "content_hash" }, { label: "来源批次" }, { label: "处理结果" }],
            DUP.map(function (d) { return { c: ['<span class="mono xs">' + d.at + "</span>", '<span class="xs">' + d.name + "</span>", '<span class="tag-code">' + d.hash + "</span>", d.from, '<span class="xs">' + d.action + "</span>"] }; }), { tight: true }) +
        "</div>" +
        '<div class="mt12">' + ADH.sec("归档与删除权限") +
          ADH.tbl("tbl-arch", [{ label: "操作" }, { label: "可用角色" }, { label: "影响" }, { label: "是否可恢复" }], [
            { c: ["归档（软删除）", "admin / optimizer / designer", "从可选池移除，不再允许新计划引用；历史引用关系与明细保留", ADH.chip("ok", "可恢复")] },
            { c: ["物理删除", "仅 admin", "对象存储文件清除，渠道素材 ID 映射失效，历史广告不再展示缩略图", ADH.chip("danger", "不可恢复")] }
          ], { tight: true }) +
          '<div class="mt8"><button class="btn sm" data-act="asset-version-archive">归档所选素材</button></div>' +
        "</div></div>";
    } else {
      h += '<div class="card-body"><div class="grid g-2-1"><div>' + ADH.sec("标签体系（FR-PRE-12 / asset_tag）") +
        ADH.tbl("tbl-tags", [{ label: "标签维度" }, { label: "取值示例" }, { label: "素材数" }], [
          { c: ["题材", "霸总 / 复仇 / 甜宠 / 悬疑 / 重生 / 狼人 / 萌宝", 7] },
          { c: ["投放策略", "A/B / 主打 / 长尾", 3] },
          { c: ["比例", "1:1 / 4:5 / 9:16 / 16:9", 4] },
          { c: ["素材类型", "VIDEO / IMAGE / CAROUSEL", 3] },
          { c: ["疲劳状态（自动打标）", "待迭代（规则 R-03 写入）", 4] }
        ], { tight: true }) + "</div>" +
        '<div>' + ADH.sec("素材表现评估（BR-32 口径一致）") + ADH.note("rule", "口径必须与看板一致", "素材页面与看板的指标必须来自同一套计算逻辑，不允许出现数字不一致（BR-32 / BR-127）。") +
        '<div class="mt12">' + ADH.hbars(D.assets.filter(function (a) { return a.status === "APPROVED"; }).slice(0, 8).map(function (a) {
          return { name: a.name, total: a.agg.ctr * 10000, fmt: ADH.pct(a.agg.ctr, 2), color: a.agg.ctr > 0.013 ? "#0b9e6a" : "#8fa7ff" };
        })) + "</div></div></div></div>";
    }
    h += "</div>";
    return h;
  }
});
ADH.action("asset-view-toggle", function (p) { ADH.s().assetView = p.v === "table" ? "table" : "grid"; ADH.render(); });
ADH.action("asset-detail", function (p) {
  const a = D.assets.filter(function (x) { return x.id === p.v; })[0];
  if (!a) return;
  const refs = [];
  D.tree.forEach(function (t) {
    t.campaigns.forEach(function (c) { c.adsets.forEach(function (s) { s.ads.forEach(function (d) { if (d.assetId === a.id) refs.push({ acc: t.accountName, camp: c.name, ad: d.name, ext: d.externalId, status: d.status, spend: d.spend }); }); }); });
  });
  let body = ADH.sec("素材属性（asset）") + ADH.kv([["素材编号", '<span class="tag-code">' + a.id + "</span>"], ["素材名", a.name], ["类型 / 比例", a.type + " · " + a.ratio],
    ["规格", a.w + " × " + a.h + (a.durationMs ? " · " + (a.durationMs / 1000).toFixed(0) + "s" : "")], ["文件大小", a.sizeMB.toFixed(2) + " MB"],
    ["内容哈希", '<span class="tag-code">' + a.hash + "</span>"], ["版本", a.version], ["标签", a.tags.map(function (t) { return ADH.chip("neutral", t); }).join(" ")],
    ["状态", ADH.chip(D.assetStatus[a.status].tone, D.assetStatus[a.status].label)], ["上传人 / 时间", a.uploadedBy + " · " + a.uploadedAt]]);
  body += ADH.sec("规格校验与转码") + ADH.tbl("t-check", [{ label: "校验项" }, { label: "要求" }, { label: "结果" }], [
    { c: ["格式", a.type === "VIDEO" ? "MP4 / MOV" : "JPG / PNG / GIF / WEBP", ADH.chip("ok", "通过")] },
    { c: ["分辨率", a.type === "VIDEO" ? "≥ 720p" : "≥ 600×600", ADH.chip("ok", "通过 · " + a.w + "×" + a.h)] },
    { c: ["大小", a.type === "VIDEO" ? "≤ 4GB" : "≤ 30MB", a.sizeMB < (a.type === "VIDEO" ? 4096 : 30) ? ADH.chip("ok", "通过") : ADH.chip("danger", "超限")] },
    { c: ["时长", "≤ 60s（部分版位）", a.durationMs ? (a.durationMs <= 60000 ? ADH.chip("ok", "通过 · " + (a.durationMs / 1000).toFixed(0) + "s") : ADH.chip("danger", "超限")) : '<span class="muted">不适用</span>'] },
    { c: ["文字占比", "提示性校验（非阻断）", a.status === "REJECTED" && a.reject && a.reject.cat === "TEXT_OVERLAY" ? ADH.chip("warn", "提示：文字占比偏高") : ADH.chip("ok", "通过")] }
  ], { tight: true }) +
    '<div class="mt8 xs muted">变体：' + a.variants.map(function (v) { return '<span class="tag-code">' + v + "</span>"; }).join(" ") + "（不满足比例时自动生成裁剪变体，居中裁剪并保留安全区）</div>";
  if (a.reject) {
    body += ADH.sec("拒审信息") + ADH.note("danger", "渠道拒审原因原文", '<span class="mono xs">' + ADH.esc(a.rejectRaw) + "</span><br/>内部统一原因分类：" + ADH.chip("danger", a.reject.label) + " — " + a.reject.detail);
  }
  body += ADH.sec("素材 - 广告关联与反查") +
    (refs.length ? ADH.tbl("t-refs", [{ label: "账户" }, { label: "所属 Campaign" }, { label: "广告" }, { label: "渠道 Ad ID" }, { label: "状态" }, { label: "今日消耗", cls: "num" }],
      refs.map(function (r) { return { c: [r.acc, '<span class="xs mono">' + r.camp + "</span>", '<span class="xs">' + r.ad + "</span>", '<span class="tag-code">' + r.ext + "</span>", ADH.statusChip(r.status), ADH.num(r.spend, 2)] }; }), { tight: true, pageSize: 6 })
      : ADH.empty("该素材尚未被任何广告引用", "BR-16 跨账户投放时优先复用已有渠道素材 ID"));
  body += ADH.sec("素材级聚合表现") + '<div class="grid g4">' +
    [["消耗", "$" + ADH.num(a.agg.spend, 2)], ["曝光", ADH.short(a.agg.impressions)], ["CTR", ADH.pct(a.agg.ctr, 2)], ["ROAS", a.agg.roas.toFixed(2)]].map(function (x) {
      return '<div class="stat"><div class="label">' + x[0] + '</div><div class="value" style="font-size:17px">' + x[1] + "</div></div>";
    }).join("") + "</div>";
  body += '<div class="mt12">' + ADH.lineChart(a.series.map(function (r) { return r.date; }), [{ name: "CTR", color: "#0b9e6a", vals: a.series.map(function (r) { return r.clicks / r.impressions * 100; }) }], { height: 150 }) + "</div>";
  ADH.overlay({
    title: a.name, wide: true, desc: a.id + " · " + a.type + " · " + a.ratio + " · 上传人 " + a.uploadedBy,
    body: body,
    foot: '<button class="btn sm" data-act="asset-perf-jump">在素材效果页查看</button>' +
      (a.status === "REJECTED" ? '<button class="btn sm" data-act="asset-resubmit" data-v="' + a.id + '">修改后重新提交</button>' : "") +
      '<div class="grow"></div><button class="btn sm" data-act="asset-archive">归档</button>' +
      (ADH.can("asset.delete") ? '<button class="btn sm danger-ghost" data-act="asset-delete">物理删除</button>' : "") +
      '<button class="btn primary sm" data-act="overlay-close">关闭</button>'
  });
});
ADH.action("asset-perf-jump", function () { ADH.act("overlay-close", { dataset: {} }); ADH.routeTo("asset-perf"); });
ADH.action("asset-resubmit", function (p) {
  ADH.toast("已重新提交渠道审核", "ok", "状态：REJECTED → SUBMITTED；审核结果将在 30 分钟内返回，拒审/通过都会触发告警与回写");
});
ADH.action("asset-archive", function () {
  const sel = ADH.sel("assets");
  const used = D.assets.filter(function (a) { return sel.indexOf(a.id) >= 0 && a.usedBy > 0; });
  ADH.overlay({
    kind: "modal", title: "归档素材确认",
    body: (sel.length ? ADH.note("info", "已选择 " + sel.length + " 个素材", "归档为软删除，不物理清除对象存储中的源文件。") : "") +
      (used.length ? ADH.note("danger", "仍被在投广告引用", "以下素材仍被在投广告引用，请确认后再归档：<br/>" + used.map(function (a) { return "· " + a.name + "（被 " + a.usedBy + " 条广告引用）"; }).join("<br/>")) : ADH.note("ok", "无在投引用冲突", "所选素材未被在投广告引用。")) +
      '<div class="mt12">' + ADH.note("info", "BR-3.2 归档 vs 删除", "素材删除一律使用「归档」，物理删除仅 admin 可执行且需二次确认。") + "</div>",
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="overlay-close">确认归档</button>'
  });
});
ADH.action("asset-delete", function () {
  if (!ADH.assertPerm("asset.delete")) return;
  ADH.overlay({
    kind: "modal", title: "物理删除（二次确认）",
    body: ADH.note("danger", "此操作不可恢复", "素材物理删除仅管理员可执行，且需二次确认。删除后渠道侧素材 ID 映射关系同时失效，历史广告的关联关系保留但不展示缩略图。") +
      '<div class="mt12 field"><label>请输入 DELETE 以确认</label><input class="input mono" placeholder="DELETE" /></div>',
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn danger" data-act="overlay-close">确认物理删除</button>'
  });
});
ADH.action("asset-version-detail", function (p) {
  const a = D.assets.filter(function (x) { return x.id === p.v; })[0];
  if (!a) return;
  const cur = Number(String(a.version).replace("v", ""));
  const base = a.name.replace(/_v\d+$/, "");
  const rows = [];
  for (let v = cur; v >= 1; v--) {
    const isCur = v === cur;
    rows.push({
      c: ['<span class="tag-code">v' + v + "</span>",
        '<span class="mono xs">' + (isCur ? a.uploadedAt : "2026-0" + (7 + (v % 2)) + "-" + String(3 + v * 2).padStart(2, "0") + " 10:" + String(11 + v * 3).padStart(2, "0")) + "</span>",
        '<span class="xs">' + (isCur ? a.uploadedBy : ["苏晴", "林可", "周振业"][v % 3]) + "</span>",
        isCur ? ADH.chip("brand", "当前版本") : ADH.chip("neutral", "历史版本（保留）"),
        isCur ? ADH.chip(D.assetStatus[a.status].tone, D.assetStatus[a.status].label) : ADH.chip("neutral", "已归档")],
      v: [v, isCur ? a.uploadedAt : "", 0, 0, 0]
    });
  }
  ADH.overlay({
    kind: "drawer", title: "版本历史 · " + base,
    desc: a.id + " · " + a.type + " · " + a.ratio + " · " + a.hash,
    body: ADH.sec("版本链（FR-PRE-15）") +
      ADH.tbl("tbl-ver-hist", [{ label: "版本" }, { label: "上传时间" }, { label: "上传人" }, { label: "版本状态" }, { label: "渠道审核" }], rows, { tight: true }) +
      '<div class="mt12">' + ADH.note("info", "旧版本不自动删除", "同素材的历史版本默认保留，新版本上传不会覆盖旧版本数据；归档为软删除，仅从可选池移除，历史广告的引用关系与明细展示保留（BR-29）。") + "</div>" +
      ADH.sec("当前版本信息") + ADH.kv([["素材名", ADH.esc(a.name)],
        ["尺寸 / 时长", a.w + "×" + a.h + (a.durationMs ? " · " + (a.durationMs / 1000).toFixed(0) + " 秒" : "")],
        ["文件大小", a.sizeMB.toFixed(1) + " MB"], ["content_hash", '<span class="tag-code">' + a.hash + "</span>"],
        ["被引用广告", a.usedBy + " 条"]]),
    foot: '<button class="btn" data-act="overlay-close">关闭</button><div class="grow"></div><button class="btn" data-act="asset-version-archive">归档该素材</button>'
  });
});
ADH.action("asset-version-archive", function () {
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("已归档（软删除）", "ok", "素材从可选池移除，历史广告引用关系保留；在线对象存储文件未删除，可由 admin 恢复或执行物理删除（BR-3.2 / BR-29）");
});
/* ---- 上传抽屉（模拟 500 文件上限 / 断点续传 / 校验阻断） ---- */
const UP_FILES = [
  { n: "US_付费_闪婚总裁_v4_1080x1350_竖版_01.mp4", s: 42.6, t: "VIDEO", ok: 1 },
  { n: "US_付费_闪婚总裁_v4_1080x1080_方形_02.mp4", s: 38.2, t: "VIDEO", ok: 1 },
  { n: "EU_品牌_复仇千金_v5_1920x1080_横版_01.mp4", s: 4612.0, t: "VIDEO", ok: 0, err: "单文件超过渠道规格上限（视频 ≤ 4GB）" },
  { n: "SEA_拉新_末日余生_v3_1080x1920_竖版_01.mp4", s: 55.1, t: "VIDEO", ok: 1 },
  { n: "US_付费_替身千金_v6_设计稿.psd", s: 128.4, t: "IMAGE", ok: 0, err: "格式不在允许列表（JPG/PNG/GIF/WEBP/MP4/MOV）" },
  { n: "APP_拉新_短剧精选_v6_1080x1920_竖版_01.mp4", s: 61.8, t: "VIDEO", ok: 1 }
];
ADH.action("asset-upload", function () {
  if (!ADH.assertPerm("asset.upload")) return;
  ADH.s().upDone = 0;
  ADH.overlay({
    title: "素材批量上传", wide: true, desc: "拖拽 · 多选 · 文件夹上传 · 分片上传；提交渠道前完成规格校验",
    body: '<div class="dropzone" data-act="up-pick"><div style="font-size:22px;color:var(--brand)">' + ADH.icon("upload", 24) + '</div><div class="big">拖拽文件 / 文件夹到此处，或点击选择</div><div class="sm">单次上限 500 个文件 · 视频 ≤ 4GB · 图片 ≤ 30MB · 支持断点续传</div></div>' +
      '<div class="mt12">' + ADH.note("info", "校验前置（BR-22）", "格式 / 尺寸 / 分辨率 / 大小 / 时长的校验在<b>提交渠道前</b>完成，不合格素材直接阻断，不消耗渠道调用配额。") + "</div>" +
      '<div id="upList" class="mt12"></div><div id="upResult"></div>',
    foot: '<span class="xs muted">上传行为写入审计日志（谁在何时上传了什么）</span><div class="grow"></div>' +
      '<button class="btn" data-act="overlay-close">关闭</button><button class="btn primary" id="upStart" data-act="up-run">开始上传</button>'
  });
});
ADH.action("up-pick", function () {
  ADH.s().upPicked = 1;
  ADH.toast("已选择 6 个文件", "info", "将校验格式、尺寸、时长与文件大小，并按内容指纹自动去重。");
  upListRender();
});
function upListRender() {
  const box = document.getElementById("upList");
  if (!box) return;
  if (!ADH.s().upPicked) { box.innerHTML = ""; return; }
  const prog = ADH.s().upProgress || 0;
  box.innerHTML = '<div class="sec-title">上传队列（6 个）<i class="tick"></i></div>' + UP_FILES.map(function (f, i) {
    const p = Math.max(0, Math.min(100, prog - i * 9));
    const status = p >= 100 ? (f.ok ? ADH.chip("ok", "上传完成 · 校验通过") : ADH.chip("danger", "上传完成 · 校验不通过")) : (p > 0 ? ADH.chip("info", "上传中 " + p.toFixed(0) + "%") : ADH.chip("neutral", "等待中"));
    return '<div class="file-row"><div class="fi">' + (f.t === "VIDEO" ? "MP4" : "IMG") + '</div><div class="fmeta"><div class="fname">' + f.n + '</div>' +
      '<div class="fsub">' + f.s.toFixed(1) + " MB " + (f.err ? '· <span style="color:var(--danger)">' + f.err + "</span>" : "· 分片上传 8MB/片") + "</div>" +
      (p > 0 && p < 100 ? ADH.bar(p, "", 1) : "") + '</div><div style="width:170px;text-align:right">' + status + "</div></div>";
  }).join("");
}
ADH.action("up-run", function () {
  ADH.s().upPicked = 1;
  ADH.s().upProgress = 0;
  const btn = document.getElementById("upStart");
  if (btn) { btn.disabled = true; btn.textContent = "上传中…"; }
  const timer = setInterval(function () {
    ADH.s().upProgress = (ADH.s().upProgress || 0) + 14;
    upListRender();
    if (ADH.s().upProgress >= 118) {
      clearInterval(timer);
      const box = document.getElementById("upResult");
      if (box) {
        box.innerHTML = '<div class="mt12">' + ADH.sec("校验结果") +
          '<div class="grid g4">' + [["已上传", "6 个"], ["校验通过", '<span style="color:var(--ok)">4 个</span>'], ["被阻断", '<span style="color:var(--danger)">2 个</span>'],
            ["转码变体", "生成 3 个（居中裁剪 + 安全区）"]].map(function (x) { return '<div class="stat"><div class="label">' + x[0] + '</div><div class="value" style="font-size:16px">' + x[1] + "</div></div>"; }).join("") + "</div>" +
          '<div class="mt12">' + ADH.note("ok", "已生成的素材记录状态", "UPLOADED → VALIDATING → READY（4 个）；不合格素材状态为 INVALID，<b>不提交渠道、不消耗配额</b>（BR-22 / BR-24 转码失败重试上限 3 次）。") + "</div>" +
          '<div class="mt12">' + ADH.note("warn", "重复文件处理", "其中 1 个文件 content_hash 与既有素材 AS-0001 一致，已按内容指纹复用既有素材记录，未产生重复上传。") + "</div></div>";
      }
      ADH.toast("上传完成：4 个通过 / 2 个被阻断", "warn", "被阻断素材已在队列中标出具体原因，可逐文件查看。");
    }
  }, 260);
});
})();
