/* ================= 系统管理 · 主页面 ================= */

/* ---------------- 用户与角色（8.1） ---------------- */
(function () {
const D = ADH_DATA;
const ROLE_ORDER = ["admin", "optimizer", "designer", "analyst"];
const ROLE_TONE = { admin: "danger", optimizer: "brand", designer: "violet", analyst: "info" };
const OPEN_STATUS = ["RUNNING", "QUEUED", "PARTIAL_FAILED", "PAUSED", "VALIDATING"];

function pick(v) {
  return D.users.filter(function (x) { return String(x.id) === String(v); })[0];
}
function list() {
  const q = String(ADH.f("q", "")).toLowerCase();
  const role = ADH.f("role", "");
  const status = ADH.f("status", "");
  return D.users.filter(function (u) {
    if (q && (u.name + " " + u.account + " " + u.ip).toLowerCase().indexOf(q) < 0) return false;
    if (role && u.role !== role) return false;
    if (status && u.status !== status) return false;
    return true;
  });
}
function openTasks(name) {
  return D.tasks.filter(function (t) { return t.createdBy === name && OPEN_STATUS.indexOf(t.status) >= 0; });
}
function enabledAdmins() {
  return D.users.filter(function (x) { return x.role === "admin" && x.status === "ENABLED"; });
}
/* 真实接口模式（F4）：列表 / 筛选 / 排序 / 分页均由服务端完成 */
function srvOn() { return !!(ADH.live && ADH.live.serverList("users")); }
function usersStats() { return ADH_DATA.usersStats || {}; }
/* 启用中的管理员数：服务端模式取全量统计（当前页只有一页数据，不能按页统计） */
function adminCount() { return srvOn() ? Number(usersStats().activeAdmins || 0) : enabledAdmins().length; }
function roleLabel(code) {
  if (srvOn() && ADH.live.roleLabelLive) return ADH.live.roleLabelLive(code);
  return (ADH_ROLES[code] || {}).label || code;
}
function roleMatrix() {
  let h = '<div class="table-wrap"><table class="tbl matrix"><thead><tr><th>功能权限项</th>';
  ROLE_ORDER.forEach(function (r) {
    h += '<th class="rot">' + ADH_ROLES[r].label + '<div class="xs muted">' + ADH_ROLES[r].person + "</div></th>";
  });
  h += "<th>约束 / 说明</th></tr></thead><tbody>";
  Object.keys(ADH_PERM).forEach(function (k) {
    const row = ADH_PERM[k];
    h += '<tr><td><span class="tag-code">' + k + "</span></td>";
    ROLE_ORDER.forEach(function (r) {
      h += '<td class="' + (row[r] ? "yes" : "no") + '">' + (row[r] ? "✓" : "—") + "</td>";
    });
    h += '<td class="xs muted">' + (ADH.LOCK_REASON[k] || "常规权限") + "</td></tr>";
  });
  h += "</tbody></table></div>";
  return h;
}
function scopeTable() {
  let h = '<div class="table-wrap"><table class="tbl"><thead><tr><th>角色</th><th>账户组可见范围</th><th>数据维度</th><th>特殊约束</th></tr></thead><tbody>';
  ROLE_ORDER.forEach(function (r) {
    const gs = r === "admin" ? D.groups : D.groups.filter(function (g) { return g.grants.indexOf(r) >= 0; });
    const dim = r === "designer" ? "仅素材维度" : "账户 / Campaign / AdSet / Ad / 素材";
    const extra = r === "admin" ? "含系统管理与审计"
      : (r === "designer" ? "BR-3.3：线索类数据不可见"
      : (r === "analyst" ? "只读，导出受数据权限校验（BR-130）"
      : "可创建与执行投放"));
    h += "<tr><td>" + ADH.chip(ROLE_TONE[r], ADH_ROLES[r].label) + '<div class="xs muted">' + ADH_ROLES[r].person + "</div></td>" +
      "<td>" + gs.map(function (g) { return '<span class="tag-code">' + g.name + "</span>"; }).join(" ") + "</td>" +
      '<td class="xs">' + dim + '</td><td class="xs muted">' + extra + "</td></tr>";
  });
  h += "</tbody></table></div>";
  return h;
}
function grantMatrix() {
  let h = '<div class="table-wrap"><table class="tbl matrix"><thead><tr><th>用户</th><th>角色</th>';
  D.groups.forEach(function (g) { h += '<th class="rot">' + g.name + "</th>"; });
  h += "<th>状态</th></tr></thead><tbody>";
  D.users.forEach(function (u) {
    h += "<tr><td><b>" + u.name + '</b><div class="xs muted mono">' + u.account + "</div></td><td>" +
      ADH.chip(ROLE_TONE[u.role], ADH_ROLES[u.role].label) + "</td>";
    D.groups.forEach(function (g) {
      const all = u.groups.indexOf("全部账户组") >= 0;
      const has = all || u.groups.indexOf(g.name) >= 0;
      h += '<td class="' + (has ? "yes" : "no") + '">' + (has ? "✓" : "—") + "</td>";
    });
    h += "<td>" + (u.status === "ENABLED" ? ADH.chip("ok", "启用", 1) : ADH.chip("danger", "已禁用")) +
      '<div class="mt4"><button class="btn xs" data-act="user-grant" data-v="' + u.id + '">编辑授权</button></div></td></tr>';
  });
  h += "</tbody></table></div>";
  return h;
}
/* 真实模式：用户 × 账户组授权矩阵（数据源为 GET /users 的 accountGroupNames；admin 视为全量） */
function grantMatrixLive() {
  const users = ((ADH_DATA.usersLive || {}).items) || [];
  const groups = D.groups || [];
  if (!users.length) return ADH.empty("暂无用户数据", "GET /v1/users 返回为空，或当前账号无 user:manage 权限");
  let h = '<div class="table-wrap"><table class="tbl matrix"><thead><tr><th>用户</th><th>角色</th>';
  groups.forEach(function (g) { h += '<th class="rot">' + ADH.esc(g.name) + "</th>"; });
  h += "<th>状态</th></tr></thead><tbody>";
  users.forEach(function (u) {
    const isAdmin = (u.roles || []).indexOf("admin") >= 0;
    const names = u.accountGroupNames || [];
    h += "<tr><td><b>" + ADH.esc(u.displayName) + '</b><div class="xs muted mono">' + ADH.esc(u.username) + "</div></td><td>" +
      (u.roles || []).map(function (r) { return ADH.chip(ROLE_TONE[r] || "neutral", roleLabel(r)); }).join(" ") + "</td>";
    groups.forEach(function (g) {
      const has = isAdmin || names.indexOf(g.name) >= 0;
      h += '<td class="' + (has ? "yes" : "no") + '">' + (has ? "✓" : "—") + "</td>";
    });
    h += "<td>" + (u.status === "ACTIVE" ? ADH.chip("ok", "启用", 1) : ADH.chip("danger", "已禁用")) +
      '<div class="mt4"><button class="btn xs" data-act="user-grant" data-v="' + u.id + '">编辑授权</button></div></td></tr>';
  });
  h += "</tbody></table></div>";
  return h;
}
/* 真实模式：功能权限矩阵（数据源为 GET /permissions 的 grants 与 GET /roles 的角色名） */
function roleMatrixLive() {
  const items = ADH_DATA.permissionsLive || [];
  const roles = ADH_DATA.rolesLive || [];
  if (!items.length) return ADH.empty("暂无权限矩阵", "GET /v1/permissions 返回为空");
  const codes = roles.length ? roles.map(function (r) { return r.code; }) : ROLE_ORDER;
  let h = '<div class="table-wrap"><table class="tbl matrix"><thead><tr><th>功能权限项</th>';
  codes.forEach(function (c) {
    const row = roles.filter(function (r) { return r.code === c; })[0] || {};
    h += '<th class="rot">' + ADH.esc(row.name || c) + '<div class="xs muted">' +
      (row.userCount === undefined ? c : "在用 " + row.userCount + " 人") + "</div></th>";
  });
  h += "<th>约束 / 说明</th></tr></thead><tbody>";
  items.forEach(function (item) {
    h += '<tr><td><span class="tag-code">' + ADH.esc(item.code) + "</span>" +
      '<div class="xs muted">' + ADH.esc(item.name) + (item.domain ? " · " + ADH.esc(item.domain) : "") + "</div></td>";
    codes.forEach(function (c) {
      const on = !!(item.grants && item.grants[c]);
      h += '<td class="' + (on ? "yes" : "no") + '">' + (on ? "✓" : "—") + "</td>";
    });
    h += '<td class="xs muted">' + (ADH.LOCK_REASON[item.code] || "常规权限") + "</td></tr>";
  });
  h += "</tbody></table></div>";
  return h;
}
function row(u, srv) {
  const last = srv ? u.createdAt : u.ip;
  return {
    c: [
      "<b>" + u.name + '</b><div class="xs muted mono">' + u.account + "</div>",
      (u.roles || [u.role]).map(function (r) { return ADH.chip(ROLE_TONE[r] || "neutral", roleLabel(r)); }).join(" "),
      '<div class="xs">' + u.groups.join("、") + "</div>",
      u.status === "ENABLED" ? ADH.chip("ok", "启用", 1) : ADH.chip("danger", "已禁用"),
      '<span class="mono xs">' + u.lastLogin + "</span>",
      '<span class="mono xs">' + (last === null || last === undefined || last === "" ? "—" : last) + "</span>",
      '<div class="flex gap4">' +
        '<button class="btn xs" data-act="user-detail" data-v="' + u.id + '">详情</button>' +
        '<button class="btn xs" data-act="user-grant" data-v="' + u.id + '">授权</button>' +
        '<button class="btn xs" data-act="user-role" data-v="' + u.id + '">改角色</button>' +
        
        '<button class="btn xs' + (u.status === "ENABLED" ? " danger-ghost" : "") + '" data-act="user-toggle" data-v="' + u.id + '">' +
          (u.status === "ENABLED" ? "禁用" : "启用") + "</button>" +
      "</div>"
    ],
    v: [u.name, u.role, u.groups.join(","), u.status, u.lastLogin, last, ""]
  };
}

ADH.page("users", {
  title: "用户与角色",
  subtitle: "账号生命周期 · 角色权限矩阵 · 账户组数据授权 · 变更即时生效",
  render: function () {
    if (!ADH.can("user.manage")) {
      return ADH.note("warn", "无访问权限", ADH.LOCK_REASON["user.manage"] + "。当前角色为 <b>" + ADH.roleLabel() + "</b>（" + ADH.rolePerson() +
        "），请在顶栏切换为管理员查看。");
    }
    const srv = srvOn();
    const tab = ADH.tabOf("users");
    const rows = srv ? (D.users || []) : list();
    const stats = usersStats();
    const admins = srv ? [] : enabledAdmins();
    const adminTotal = adminCount();
    const pendingAll = srv ? 0 : D.users.reduce(function (a, u) { return a + openTasks(u.name).length; }, 0);
    let h = '<div class="grid g4 mb12">';
    if (srv) {
      h += ADH.stat({ label: "用户总数", value: stats.total || 0, unit: "人", foot: '<span class="muted">启用 ' + (stats.active || 0) + " / 禁用 " + (stats.disabled || 0) + "（服务端全量）</span>" }) +
        ADH.stat({ label: "启用中的管理员", value: adminTotal, unit: "人", foot: ADH.chip(adminTotal > 1 ? "ok" : "warn", adminTotal > 1 ? "满足要求" : "仅剩 1 个，低于保护下限") }) +
        ADH.stat({ label: "角色数", value: stats.roleCount || 0, unit: "个", foot: '<span class="muted">四类角色</span>' }) +
        ADH.stat({ label: "账户组数", value: stats.groupCount || 0, unit: "个", foot: '<span class="muted">数据权限边界</span>' });
    } else {
      h += ADH.stat({ label: "用户总数", value: D.users.length, unit: "人", foot: '<span class="muted">启用 ' + D.users.filter(function (u) { return u.status === "ENABLED"; }).length + " / 禁用 " + D.users.filter(function (u) { return u.status !== "ENABLED"; }).length + "</span>" }) +
        ADH.stat({ label: "启用中的管理员", value: adminTotal, unit: "人", foot: ADH.chip(adminTotal > 1 ? "ok" : "warn", adminTotal > 1 ? "满足 BR-139" : "仅剩 1 个（BR-139 下限）") }) +
        ADH.stat({ label: "角色数", value: ROLE_ORDER.length, unit: "个", foot: '<span class="muted">admin / optimizer / designer / analyst</span>' }) +
        ADH.stat({ label: "未完成任务数", value: pendingAll, unit: "个", foot: '<span class="muted">可按用户接管</span>' });
    }
    h += "</div>";
    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("users", 15) + "用户与权限</h3>" +
      '<div class="right flex gap8">' +
        '<button class="btn sm" data-act="user-export">' + ADH.icon("download", 13) + "导出用户清单</button>" +
        '<button class="btn primary sm" data-act="user-new">' + ADH.icon("plus", 13) + "新建用户</button></div></div>";
    h += '<div class="tabs">' + [["users", "用户列表"], ["matrix", "角色权限矩阵"], ["grants", "账户组授权"]].map(function (t) {
      return '<button class="' + (tab === t[0] ? "on" : "") + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>";

    if (tab === "matrix") {
      h += '<div class="card-body">' + ADH.note("info", "权限模型", "权限 = <b>功能权限（RBAC）</b> × <b>数据权限（账户组）</b>。角色对应功能权限，账户组授权决定可见数据范围；两者需同时满足。") +
        '<div class="mt12">' + ADH.sec("功能权限矩阵") + (srv ? roleMatrixLive() : roleMatrix()) + "</div>" +
        '<div class="mt12">' + ADH.sec("数据权限与维度约束") + (srv
          ? ADH.note("warn", "真实模式下数据权限按「用户 ↔ 账户组」授权", "本表按角色汇总功能权限；逐用户的账户组授权明细请到「账户组授权」页签查看。")
          : scopeTable()) + "</div>" +
        '<div class="mt12">' + ADH.note("rule", "即时生效", "权限变更立即生效，无需重新登录。可在顶栏切换角色，观察导航与操作按钮的实时变化。") + "</div></div>";
      h += "</div>";
      return h;
    }
    if (tab === "grants") {
      h += '<div class="card-body">' + ADH.note("info", "授权维度", "用户 ↔ 账户组的授权关系决定其可见账户与可操作范围（FR-SYS-03）；未授权的账户组在列表、看板、导出中均不可见。") +
        '<div class="mt12">' + (srv ? grantMatrixLive() : grantMatrix()) + "</div>" +
        '<div class="mt12">' + ADH.note("rule", "与导出权限联动", "导出与看板查询同样受账户组数据权限约束，越权范围的行不会出现在结果中。") + "</div></div></div>";
      return h;
    }

    /* 契约用户状态为 ACTIVE / DISABLED，原型为 ENABLED / DISABLED（`toUser` 已投影回原型词表） */
    const statusOn = srv ? "ACTIVE" : "ENABLED";
    h += '<div class="card-body" style="padding-bottom:0"><div class="toolbar">' +
      '<div class="search">' + ADH.icon("search", 14) + '<input class="input" id="u-q" data-live="1" data-act="filter" data-k="q" data-tbl="tbl-users" placeholder="' + (srv ? "搜索姓名 / 账号（服务端）" : "搜索姓名 / 账号 / IP") + '" value="' + ADH.esc(ADH.f("q", "")) + '" /></div>' +
      '<select class="select" style="width:150px" data-live="1" data-act="filter" data-k="role" data-tbl="tbl-users"><option value="">全部角色</option>' +
        ROLE_ORDER.map(function (r) { return '<option value="' + r + '"' + (ADH.f("role", "") === r ? " selected" : "") + ">" + roleLabel(r) + "</option>"; }).join("") + "</select>" +
      '<div class="btn-group"><button class="' + (ADH.f("status", "") === "" ? "on" : "") + '" data-act="filter" data-k="status" data-tbl="tbl-users" data-v="">全部</button>' +
        '<button class="' + (ADH.f("status", "") === statusOn ? "on" : "") + '" data-act="filter" data-k="status" data-tbl="tbl-users" data-v="' + statusOn + '">启用</button>' +
        '<button class="' + (ADH.f("status", "") === "DISABLED" ? "on" : "") + '" data-act="filter" data-k="status" data-tbl="tbl-users" data-v="DISABLED">已禁用</button></div>' +
      ADH.filterChip("q") +
      (srv
        ? '<select class="select" style="width:150px" data-live="1" data-act="filter" data-k="sort" data-tbl="tbl-users">' +
          [["username", "账号 A→Z"], ["-createdAt", "最新创建"], ["createdAt", "最早创建"], ["-lastLoginAt", "最近登录"], ["displayName", "姓名 A→Z"]].map(function (o) {
            return '<option value="' + o[0] + '"' + (ADH.f("sort", "username") === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
          }).join("") + "</select>" + ADH.chip("info", "服务端分页", 1)
        : "") +
      '<div class="grow"></div><span class="xs muted">共 <b>' + (srv ? (D.usersMeta || {}).total || 0 : rows.length) + "</b> 个用户" +
      (srv ? ' <span class="xs muted">（服务端）</span>' : "") + "</span></div></div>";
    h += '<div class="card-body" style="padding-top:10px">' + ADH.tbl("tbl-users", [
      { label: "用户" }, { label: "角色" }, { label: "账户组（数据权限）" }, { label: "状态" },
      { label: "最近登录" }, { label: srv ? "创建时间" : "来源 IP" }, { label: "操作" }
    ], rows.map(function (u) { return row(u, srv); }), { sortable: !srv, pageSize: srv ? rows.length : 8 }) + "</div>";
    /* 服务端模式下由 live.pager 分页，表格不再自己翻页（pageSize = 本页条数） */
    if (srv) h += ADH.live.pager("users", D.usersMeta);
    h += '<div class="card-foot"><div class="grid g3">' +
      ADH.note("rule", "BR-139 最后管理员保护",
        "系统至少保留一个启用状态的管理员账号，禁止禁用或删除最后一个管理员。当前启用管理员：" +
        (srv ? adminTotal + " 个（禁用最后一个管理员时后端返回 60001）" : admins.map(function (a) { return a.name; }).join("、") + "。")) +
      (srv
        ? ADH.note("info", "BR-138 禁用后任务接管", "任务接管依赖任务中心（tasks 批次）；本批只做账号状态变更，禁用不会删除其未完成任务。")
        : ADH.note("rule", "BR-138 禁用后任务接管", "用户被禁用后，其创建但未完成的任务需保留并可由管理员接管：" + pendingAll + " 个待接管任务。")) +
      ADH.note("info", "FR-SYS-04 登录与鉴权", "账号密码 + 会话管理，预留 SSO；登录、失败、锁定均写入登录审计（FR-SYS-09）。") +
      "</div></div></div>";
    return h;
  }
});

ADH.action("user-export", function () {
  ADH.toast("已导出用户清单", "ok", "含角色与账户组授权关系；导出行为写入审计日志。");
});
ADH.action("user-new", function () {
  if (!ADH.assertPerm("user.manage")) return;
  ADH.overlay({
    kind: "modal", title: "新建用户", desc: "创建后立即生效，无需重新登录",
    body: ADH.sec("账号信息") + '<div class="grid g2">' +
        '<div class="field"><label>姓名</label><input class="input" placeholder="如：顾南" /></div>' +
        '<div class="field"><label>登录账号</label><input class="input mono" placeholder="如：gu.nan" /></div>' +
        '<div class="field"><label>角色</label><select class="select">' + ROLE_ORDER.map(function (r) { return "<option>" + ADH_ROLES[r].label + "（" + r + "）</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label>初始密码策略</label><select class="select"><option>系统生成随机密码 + 首次登录强制修改</option><option>邀请邮件设置密码</option></select></div>' +
      "</div>" +
      ADH.sec("数据权限（账户组）") +
      '<div class="flex wrap gap8">' + D.groups.map(function (g) {
        return '<label class="check"><input type="checkbox" /><span>' + g.name + "</span></label>";
      }).join("") + "</div>" +
      '<div class="mt12">' + ADH.note("rule", "按需授权", "未勾选账户组的用户无法查看对应账户的数据；admin 默认拥有全部账户组。") + "</div>",
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="user-save">创建用户</button>'
  });
});
ADH.action("user-save", function () {
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("用户已创建", "ok", "角色与数据权限立即生效；创建行为写入审计日志");
  ADH.routeTo("users");
});

ADH.action("user-detail", function (p) {
  const u = pick(p.v);
  if (!u) return;
  const allowed = Object.keys(ADH_PERM).filter(function (k) { return ADH_PERM[k][u.role]; });
  const denied = Object.keys(ADH_PERM).filter(function (k) { return !ADH_PERM[k][u.role]; });
  const tasks = openTasks(u.name);
  let taskHtml = tasks.length
    ? ADH.tbl("t-user-detail", [{ label: "任务" }, { label: "类型" }, { label: "状态" }, { label: "进度" }, { label: "操作" }],
        tasks.map(function (t) {
          return { c: ["<b>" + t.id + "</b>", t.type, ADH.statusChip(t.status), ADH.bar(t.progress), '<button class="btn xs" data-act="task-detail" data-v="' + t.id + '">查看</button>'] };
        }), { tight: true })
    : ADH.empty("该用户无未完成任务", "若禁用时存在未完成任务，任务将保留并可由管理员接管");
  ADH.overlay({
    title: "用户详情 · " + u.name,
    desc: u.account + " · " + ADH_ROLES[u.role].label + " · " + (u.status === "ENABLED" ? "启用中" : "已禁用"),
    body: ADH.sec("账号信息") + ADH.kv([
        ["姓名", u.name], ["登录账号", '<span class="tag-code">' + u.account + "</span>"],
        ["角色", ADH.chip(ROLE_TONE[u.role], ADH_ROLES[u.role].label)],
        ["状态", u.status === "ENABLED" ? ADH.chip("ok", "启用", 1) : ADH.chip("danger", "已禁用")],
        ["最近登录", u.lastLogin], ["最近来源 IP", '<span class="mono">' + u.ip + "</span>"]
      ]) +
      ADH.sec("数据权限（账户组）") +
      '<div class="flex wrap gap8">' + u.groups.map(function (g) { return '<span class="tag-code">' + g + "</span>"; }).join("") + "</div>" +
      '<div class="mt8 xs muted">数据维度：' + (u.role === "designer" ? "仅素材维度（线索类数据不可见）" : "账户 / Campaign / AdSet / Ad / 素材 全维度") + "</div>" +
      ADH.sec("功能权限") +
      '<div class="flex wrap gap8">' + allowed.map(function (k) { return ADH.chip("ok", k); }).join("") +
        denied.map(function (k) { return ADH.chip("neutral", k); }).join("") + "</div>" +
      ADH.sec("未完成任务") + taskHtml,
    foot: '<button class="btn" data-act="overlay-close">关闭</button>' +
      '<button class="btn" data-act="user-reset" data-v="' + u.id + '">重置密码</button><div class="grow"></div>' +
      (u.status === "ENABLED"
        ? '<button class="btn danger-ghost" data-act="user-toggle" data-v="' + u.id + '">禁用账号</button>'
        : '<button class="btn" data-act="user-takeover" data-v="' + u.id + '">接管未完成任务</button><button class="btn primary" data-act="user-toggle" data-v="' + u.id + '">启用账号</button>')
  });
});

ADH.action("user-toggle", function (p) {
  if (!ADH.assertPerm("user.manage")) return;
  const u = pick(p.v);
  if (!u) return;
  if (u.status === "ENABLED") {
    if (u.role === "admin" && enabledAdmins().length <= 1) {
      ADH.toast("操作被阻止", "warn", "系统需至少保留一个启用状态的管理员账号，当前仅 " + u.name + " 一个，禁止禁用或删除");
      return;
    }
    u.status = "DISABLED";
    ADH.act("overlay-close", { dataset: {} });
    ADH.render();
    const n = openTasks(u.name).length;
    ADH.toast("已禁用 " + u.name, "ok", "该用户 " + n + " 个未完成任务已保留，可由管理员接管；账号状态变更写入审计日志");
  } else {
    u.status = "ENABLED";
    ADH.act("overlay-close", { dataset: {} });
    ADH.render();
    ADH.toast("已启用 " + u.name, "ok", "账号状态变更立即生效并写入审计日志");
  }
});

ADH.action("user-takeover", function (p) {
  if (!ADH.assertPerm("user.manage")) return;
  const u = pick(p.v);
  if (!u) return;
  const n = openTasks(u.name).length;
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast(n ? "已接管 " + n + " 个任务" : "无需接管", n ? "ok" : "info",
    n ? "任务归属已转至 " + ADH.rolePerson() + "，可在任务中心继续执行或回滚（BR-138）"
      : u.name + " 当前没有未完成任务；该账号下已执行完毕的任务仍保留在任务中心");
});

ADH.action("user-role", function (p) {
  if (!ADH.assertPerm("user.manage")) return;
  const u = pick(p.v);
  if (!u) return;
  ADH.overlay({
    kind: "modal", title: "变更角色 · " + u.name, desc: "权限变更立即生效，无需重新登录",
    body: ADH.kv([["当前角色", ADH.chip(ROLE_TONE[u.role], ADH_ROLES[u.role].label)], ["账号", '<span class="tag-code">' + u.account + "</span>"]]) +
      ADH.sec("目标角色") +
      '<div class="tbl-empty" style="text-align:left;padding:6px 0">' + ROLE_ORDER.map(function (r) {
        return '<label class="check" style="display:flex;margin-bottom:6px"><input type="radio" name="r-' + u.id + '"' + (r === u.role ? " checked" : "") +
          " /><span><b>" + ADH_ROLES[r].label + "</b> <span class=\"xs muted\">" + r + " · 关注：" + ADH_ROLES[r].focus + "</span></span></label>";
      }).join("") + "</div>" +
      ADH.note("rule", "变更影响", "角色变更后：功能权限立即按 PRD 3.2 重算；若目标角色为 designer，数据维度将收窄至素材层级；变更前后值与操作人写入审计日志（BR-141）。"),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="user-role-save" data-v="' + u.id + '">保存角色</button>'
  });
});
ADH.action("user-role-save", function (p) {
  const u = pick(p.v);
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("角色已更新", "ok", (u ? u.name : "用户") + " 的权限立即生效，审计日志已记录变更前后值");
  ADH.routeTo("users");
});

ADH.action("user-grant", function (p) {
  if (!ADH.assertPerm("user.manage")) return;
  const u = pick(p.v);
  if (!u) return;
  const all = u.groups.indexOf("全部账户组") >= 0;
  ADH.overlay({
    kind: "modal", title: "账户组授权 · " + u.name, desc: "用户与账户组授权关系；未授权账户组的数据不可见",
    body: ADH.kv([["账号", '<span class="tag-code">' + u.account + "</span>"], ["角色", ADH.chip(ROLE_TONE[u.role], ADH_ROLES[u.role].label)]]) +
      ADH.sec("可授权的账户组") +
      '<div class="tbl-empty" style="text-align:left;padding:6px 0">' + D.groups.map(function (g) {
        const has = all || u.groups.indexOf(g.name) >= 0;
        return '<label class="check" style="display:flex;margin-bottom:6px"><input type="checkbox"' + (has ? " checked" : "") +
          ' /><span><b>' + g.name + "</b> <span class=\"xs muted\">" + g.desc + " · " + g.accounts + " 个账户 · 预算上限 $" + ADH.num(g.budgetCap) + "</span></span></label>";
      }).join("") + "</div>" +
      ADH.note("info", "授权粒度", "数据权限以账户组为单位授予；账户组内的新增账户自动对已授权用户可见（无需逐账户授权）。"),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="user-grant-save" data-v="' + u.id + '">保存授权</button>'
  });
});
ADH.action("user-grant-save", function (p) {
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("数据授权已保存", "ok", "立即生效；变更前后值（含账户组、操作人、IP、请求标识）写入审计日志");
  ADH.routeTo("users");
});

ADH.action("user-reset", function (p) {
  if (!ADH.assertPerm("user.manage")) return;
  const u = pick(p.v);
  if (!u) return;
  ADH.overlay({
    kind: "modal", title: "重置密码 · " + u.name,
    body: ADH.note("warn", "影响", "重置后该用户所有活跃会话将失效，需使用新密码重新登录。") +
      '<div class="mt12 grid g2">' +
        '<div class="field"><label>重置方式</label><select class="select"><option>系统生成随机密码</option><option>发送重置邮件</option></select></div>' +
        '<div class="field"><label>下次登录</label><select class="select"><option>强制修改密码</option><option>不强制</option></select></div>' +
      "</div>" + ADH.note("rule", "BR-143", "审计日志禁止记录明文令牌与个人信息，密码本身不落审计。"),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="user-reset-save" data-v="' + u.id + '">确认重置</button>'
  });
});
ADH.action("user-reset-save", function () {
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("密码已重置", "ok", "已通知账号持有人；重置操作写入审计日志（不记录密码明文）");
  ADH.routeTo("users");
});

ADH.action("user-del", function (p) {
  if (!ADH.assertPerm("user.manage")) return;
  const u = pick(p.v);
  if (!u) return;
  if (u.role === "admin" && enabledAdmins().length <= 1) {
    ADH.toast("删除被阻止", "warn", "禁止删除最后一个启用状态的管理员账号（" + u.name + "），请先指定另一位管理员");
    return;
  }
  ADH.toast("已提交删除", "info", "非最后管理员的账号可删除；删除后其未完成任务可由管理员接管");
});
})();

/* ---------------- 审计日志（8.2） ---------------- */
(function () {
const D = ADH_DATA;
const CATS = ["账户", "权限", "素材", "投放", "自动化", "数据", "归因"];
const MUST_AUDIT = [
  { cat: "账户", acts: "接入渠道、解绑账户、令牌刷新" },
  { cat: "权限", acts: "用户创建 / 禁用、角色变更、数据授权变更" },
  { cat: "素材", acts: "上传、删除、归档、重新提交审核" },
  { cat: "投放", acts: "批量创建、批量修改、批量启停、复制、删除" },
  { cat: "自动化", acts: "规则创建、启停、执行、回滚" },
  { cat: "数据", acts: "报表导出、数据重跑" },
  { cat: "归因", acts: "映射创建 / 修改 / 删除、用户数据删除请求" }
];
const LOGINS = [
  { at: "2026-09-20 10:12", user: "林可", account: "lin.ke", ip: "10.20.3.42", result: "SUCCESS", method: "账号密码", note: "会话 sess_4c81，有效期 8 小时" },
  { at: "2026-09-20 09:58", user: "周振业", account: "zhou.zy", ip: "10.20.3.11", result: "SUCCESS", method: "账号密码", note: "会话 sess_a91c，有效期 8 小时" },
  { at: "2026-09-20 09:31", user: "苏晴", account: "su.qing", ip: "10.20.4.08", result: "SUCCESS", method: "账号密码", note: "会话 sess_77bd" },
  { at: "2026-09-20 08:44", user: "陈默", account: "chen.mo", ip: "10.20.4.19", result: "SUCCESS", method: "账号密码", note: "会话 sess_2350" },
  { at: "2026-09-20 07:05", user: "施阳", account: "shi.yang", ip: "10.20.5.07", result: "SUCCESS", method: "账号密码", note: "会话 sess_d410" },
  { at: "2026-09-19 22:41", user: "调度器", account: "svc.scheduler", ip: "—", result: "SUCCESS", method: "服务账号", note: "令牌续期任务 auth_watch_2241" },
  { at: "2026-09-19 18:22", user: "何雨", account: "he.yu", ip: "10.20.5.31", result: "LOCKED", method: "账号密码", note: "连续 5 次密码错误，账号锁定 30 分钟" },
  { at: "2026-09-19 18:20", user: "何雨", account: "he.yu", ip: "10.20.5.31", result: "FAILED", method: "账号密码", note: "密码错误（第 3 次），剩余尝试 2 次" }
];

function catTone(cat) {
  return ({ "权限": "danger", "归因": "violet", "素材": "info", "投放": "brand", "自动化": "warn", "数据": "neutral", "账户": "ok" })[cat] || "neutral";
}
function loginChip(r) {
  if (r === "SUCCESS") return ADH.chip("ok", "登录成功", 1);
  if (r === "FAILED") return ADH.chip("warn", "登录失败");
  return ADH.chip("danger", "已锁定");
}
function auditList() {
  const q = String(ADH.f("q", "")).toLowerCase();
  const cat = ADH.f("cat", "");
  const who = ADH.f("who", "");
  return D.audit.filter(function (a) {
    if (q && (a.user + " " + a.obj + " " + a.action + " " + a.reqId).toLowerCase().indexOf(q) < 0) return false;
    if (cat && a.cat !== cat) return false;
    if (who && a.user !== who) return false;
    return true;
  });
}

ADH.page("audit", {
  title: "审计日志",
  subtitle: "关键写操作全量留痕 · 只可追加不可修改 · 按人 / 时间 / 对象 / 动作检索",
  render: function () {
    if (!ADH.can("audit.view")) {
      return ADH.note("warn", "无访问权限", ADH.LOCK_REASON["audit.view"] + "。当前角色为 <b>" + ADH.roleLabel() + "</b>，请在顶栏切换为管理员查看。");
    }
    const tab = ADH.tabOf("ops");
    const rows = auditList();
    const today = D.audit.filter(function (a) { return a.at.indexOf("2026-09-20") === 0; }).length;
    const people = D.audit.reduce(function (acc, a) { if (acc.indexOf(a.user) < 0) acc.push(a.user); return acc; }, []);
    const permCnt = D.audit.filter(function (a) { return a.cat === "权限"; }).length;
    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "日志条数", value: D.audit.length, unit: "条", foot: '<span class="muted">当前查询范围</span>' }) +
      ADH.stat({ label: "今日新增", value: today, unit: "条", foot: '<span class="muted">2026-09-20</span>' }) +
      ADH.stat({ label: "权限类变更", value: permCnt, unit: "条", foot: '<span class="muted">用户 / 角色 / 数据授权</span>' }) +
      ADH.stat({ label: "保留期", value: "≥12", unit: "个月", foot: ADH.chip("ok", "只可追加", 1) }) +
      "</div>";
    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("shield", 15) + '审计日志<span class="desc">FR-SYS-06 / 07</span></h3>' +
      '<div class="right flex gap8"><button class="btn sm" data-act="audit-immutable">' + ADH.icon("lock", 13) + "尝试修改记录</button>" +
      '<button class="btn sm" data-act="audit-export">' + ADH.icon("download", 13) + "导出审计日志</button></div></div>";
    h += '<div class="tabs">' + [["ops", "操作审计"], ["login", "登录审计"], ["must", "必须审计的动作"]].map(function (t) {
      return '<button class="' + (tab === t[0] ? "on" : "") + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>";

    if (tab === "must") {
      h += '<div class="card-body">' + ADH.note("rule", "BR-141 记录字段", "每条审计记录必须包含：<b>操作人、时间、IP、对象、动作、变更前后值、请求标识</b>。") +
        '<div class="mt12">' + ADH.tbl("t-must", [{ label: "类别" }, { label: "必须审计的动作" }, { label: "覆盖状态" }],
          MUST_AUDIT.map(function (m) {
            return { c: [ADH.chip(catTone(m.cat), m.cat), m.acts, ADH.chip("ok", "已覆盖", 1)] };
          }), { tight: true }) + "</div>" +
        '<div class="mt12 grid g2">' +
          ADH.note("rule", "BR-142 不可篡改", "审计日志<b>只可追加不可修改与删除</b>，保留期 ≥ 12 个月。任何修改 / 删除尝试都会被拒绝并记录。") +
          ADH.note("rule", "BR-143 脱敏", "禁止记录明文令牌与个人信息；令牌仅记录标识与到期时间，用户数据删除请求仅记录哈希标识。") +
        "</div></div></div>";
      return h;
    }
    if (tab === "login") {
      h += '<div class="card-body">' + ADH.tbl("t-login", [
        { label: "时间" }, { label: "用户" }, { label: "账号" }, { label: "来源 IP" }, { label: "结果" }, { label: "方式" }, { label: "说明" }
      ], LOGINS.map(function (l) {
        return { c: ['<span class="mono xs">' + l.at + "</span>", "<b>" + l.user + "</b>", '<span class="tag-code">' + l.account + "</span>",
          '<span class="mono xs">' + l.ip + "</span>", loginChip(l.result), '<span class="xs">' + l.method + "</span>", '<span class="xs muted">' + l.note + "</span>"],
          v: [l.at, l.user, l.account, l.ip, l.result, l.method, l.note] };
      }), { sortable: true, pageSize: 10 }) +
        '<div class="mt12">' + ADH.note("info", "FR-SYS-09 登录审计", "记录登录成功、失败与账号锁定事件，用于排查异常登录与暴力破解；锁定策略：连续 5 次失败锁定 30 分钟。") + "</div></div></div>";
      return h;
    }

    h += '<div class="card-body" style="padding-bottom:0"><div class="toolbar">' +
      '<div class="search">' + ADH.icon("search", 14) + '<input class="input" id="a-q" data-live="1" data-act="filter" data-k="q" placeholder="搜索操作人 / 对象 / 动作 / 请求标识" value="' + ADH.esc(ADH.f("q", "")) + '" /></div>' +
      '<select class="select" style="width:140px" data-live="1" data-act="filter" data-k="cat"><option value="">全部类别</option>' +
        CATS.map(function (c) { return '<option value="' + c + '"' + (ADH.f("cat", "") === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select>" +
      '<select class="select" style="width:150px" data-live="1" data-act="filter" data-k="who"><option value="">全部操作人</option>' +
        people.map(function (x) { return '<option value="' + x + '"' + (ADH.f("who", "") === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select>" +
      ADH.filterChip("q") + ADH.filterChip("cat") + ADH.filterChip("who") +
      '<div class="grow"></div><span class="xs muted">命中 <b>' + rows.length + "</b> / " + D.audit.length + " 条</span></div></div>";
    h += '<div class="card-body" style="padding-top:10px">' + ADH.tbl("tbl-audit", [
      { label: "时间" }, { label: "操作人 / IP" }, { label: "类别" }, { label: "动作" }, { label: "对象" },
      { label: "变更前 → 变更后" }, { label: "请求标识" }, { label: "操作" }
    ], rows.map(function (a) {
      return {
        c: ['<span class="mono xs">' + a.at + "</span>",
          "<b>" + a.user + '</b><div class="mono xs muted">' + a.ip + "</div>",
          ADH.chip(catTone(a.cat), a.cat),
          '<span class="xs">' + a.action + "</span>",
          '<span class="xs">' + a.obj + "</span>",
          '<span class="mono xs">' + a.before + '</span> <span class="muted">→</span> <span class="mono xs">' + a.after + "</span>",
          '<span class="tag-code">' + a.reqId + "</span>",
          '<button class="btn xs" data-act="audit-detail" data-v="' + a.reqId + '">详情</button>'],
        v: [a.at, a.user, a.cat, a.action, a.obj, a.before, a.reqId, ""]
      };
    }), { sortable: true, pageSize: 8 }) + "</div>";
    h += '<div class="card-foot"><div class="grid g2">' +
      ADH.note("rule", "BR-142 只可追加", "审计日志不可修改、不可删除，保留期 ≥ 12 个月。可点击右上角「尝试修改记录」验证系统拒绝行为。") +
      ADH.note("rule", "BR-143 脱敏要求", "禁止记录明文令牌与个人信息；令牌仅留标识与到期时间。") +
      "</div></div></div>";
    return h;
  }
});

ADH.action("audit-detail", function (p) {
  const a = D.audit.filter(function (x) { return x.reqId === p.v; })[0];
  if (!a) return;
  ADH.overlay({
    title: "审计记录 · " + a.reqId,
    desc: a.at + " · " + a.user + " · " + a.cat + " 类",
    body: ADH.sec("必含字段") + ADH.kv([
        ["操作人", "<b>" + a.user + "</b>"], ["时间", a.at], ["来源 IP", '<span class="mono">' + a.ip + "</span>"],
        ["对象", a.obj], ["动作", a.action], ["请求标识", '<span class="tag-code">' + a.reqId + "</span>"]
      ]) +
      ADH.sec("变更前后值") +
      '<div class="tbl-empty" style="text-align:left;padding:8px 0"><div class="grid g2">' +
        '<div><div class="xs muted">变更前</div><div class="mono">' + a.before + "</div></div>" +
        '<div><div class="xs muted">变更后</div><div class="mono">' + a.after + "</div></div>" +
      "</div></div>" +
      ADH.note("info", "记录不可篡改", "该记录只可追加不可修改与删除（BR-142）；如需更正，请追加一条新的更正说明记录。"),
    foot: '<button class="btn" data-act="overlay-close">关闭</button>'
  });
});
ADH.action("audit-immutable", function () {
  ADH.overlay({
    kind: "modal", title: "尝试修改审计记录",
    body: ADH.note("danger", "操作被拒绝", "BR-142：审计日志<b>只可追加不可修改与删除</b>。系统已拒绝本次修改请求，并将该拒绝行为本身记入审计。") +
      '<div class="mt12">' + ADH.kv([["请求动作", "UPDATE / DELETE on audit_log"], ["结果", ADH.chip("danger", "REJECTED")],
        ["拒绝对应规则", "BR-142 不可篡改"], ["留痕", '已写入审计（req_reject_0001）']]) + "</div>",
    foot: '<button class="btn" data-act="overlay-close">我知道了</button>'
  });
});
ADH.action("audit-export", function () {
  if (!ADH.assertPerm("audit.view")) return;
  ADH.toast("已创建审计导出任务", "ok", "导出含操作人 / 时间 / IP / 对象 / 动作 / 变更前后值 / 请求标识；导出行为本身同样写入审计");
});
})();

/* ---------------- 通知中心（8.3 / 7.5 告警） ---------------- */
(function () {
const D = ADH_DATA;
/* 真实接口模式：列表 / 筛选 / 排序 / 分页均由服务端完成 */
function srvOn() { return !!(ADH.live && ADH.live.serverList("notifications")); }
function totalCount() { return srvOn() ? ((D.notificationsMeta || {}).total || 0) : D.notifications.length; }
function ntf() {
  if (srvOn()) return D.notifications;
  const q = String(ADH.f("q", "")).toLowerCase();
  const type = ADH.f("type", "");
  const state = ADH.f("state", "");
  return D.notifications.filter(function (n) {
    if (q && (n.title + " " + n.body + " " + n.type).toLowerCase().indexOf(q) < 0) return false;
    if (type && n.type !== type) return false;
    if (state === "unread" && n.read) return false;
    if (state === "read" && !n.read) return false;
    return true;
  });
}
function unreadCount() {
  if (srvOn()) return (D.notificationsMeta || {}).unreadCount || 0;
  return D.notifications.filter(function (n) { return !n.read; }).length;
}
function pickNtf(v) { return D.notifications.filter(function (x) { return x.id === v; })[0]; }

ADH.page("notifications", {
  title: "通知中心",
  subtitle: "站内消息 · 已读未读 · 一键跳转对象 · 邮件与静默时段偏好",
  render: function () {
    const tab = ADH.tabOf("inbox");
    const rows = ntf();
    const unread = unreadCount();
    const types = D.alertTypes.filter(function (t) { return t.count > 0; }).length;
    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "未读消息", value: unread, unit: "条", foot: unread ? ADH.chip("danger", "待处理", 1) : ADH.chip("ok", "已全部处理", 1) }) +
      ADH.stat({ label: "消息总数", value: totalCount(), unit: "条", foot: '<span class="muted">' + (srvOn() ? "服务端分页" : "近 3 天") + "</span>" }) +
      ADH.stat({ label: "有事件的告警类型", value: types, unit: "类", foot: '<span class="muted">共 ' + D.alertTypes.length + " 类已配置</span>" }) +
      ADH.stat({ label: "通知渠道", value: 2, unit: "个", foot: ADH.chip("info", "站内 + 邮件", 1) }) +
      "</div>";
    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("bell", 15) + '通知与告警<span class="desc">FR-SYS-10 / 11 / 12</span></h3>' +
      '<div class="right flex gap8"><button class="btn sm" data-act="ntf-read-all">' + ADH.icon("check", 13) + "全部标为已读</button></div></div>";
    h += '<div class="tabs">' + [["inbox", "消息列表"], ["types", "告警类型"], ["prefs", "通知偏好"]].map(function (t) {
      return '<button class="' + (tab === t[0] ? "on" : "") + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>";

    if (tab === "types") {
      h += '<div class="card-body">' + ADH.note("rule", "BR-135 告警收敛", "同一对象同一类型 30 分钟内只发一次，内容聚合后再通知，避免消息风暴。") +
        '<div class="mt12">' + ADH.tbl("t-alert", [
          { label: "告警类型" }, { label: "触发条件" }, { label: "通知对象" }, { label: "近 3 天" }, { label: "静默时段" }, { label: "操作" }
        ], D.alertTypes.map(function (t) {
          return { c: [ADH.chip(t.tone, t.type), '<span class="xs">' + t.trigger + "</span>", '<span class="xs">' + t.to + "</span>",
            t.count ? "<b>" + t.count + "</b> 条" : '<span class="muted">0 条</span>',
            t.silent === "无" ? '<span class="xs muted">无</span>' : '<span class="mono xs">' + t.silent + "</span>",
            '<button class="btn xs" data-act="ntf-mute" data-v="' + ADH.esc(t.type) + '">静默设置</button>'],
            v: [t.type, t.trigger, t.to, t.count, t.silent, ""] };
        }), { sortable: true, pageSize: 12 }) + "</div>" +
        '<div class="mt12 grid g2">' +
          ADH.note("rule", "BR-136 静默时段", "支持按告警类型配置静默时段，静默期内只入库不推送（消息仍可在通知中心查看）。") +
          ADH.note("rule", "BR-137 必须可跳转", "每条告警需可点击跳转到对应对象，不允许只给文字：素材 → 素材详情、任务 → 任务详情、规则 → 规则详情。") +
        "</div></div></div>";
      return h;
    }
    if (tab === "prefs") {
      h += '<div class="card-body"><div class="grid g2">' +
        '<div>' + ADH.sec("通知渠道") +
          '<div class="tbl-empty" style="text-align:left;padding:6px 0">' +
            '<label class="check" style="display:flex;margin-bottom:8px"><input type="checkbox" checked /><span><b>站内消息</b> <span class=\"xs muted\">本期必备，通知中心 + 顶栏红点</span></span></label>' +
            '<label class="check" style="display:flex;margin-bottom:8px"><input type="checkbox" checked /><span><b>邮件通知</b> <span class=\"xs muted\">可选；仅推送「紧急」级别，按收敛后的聚合内容发送</span></span></label>' +
            '<label class="check" style="display:flex;margin-bottom:8px"><input type="checkbox" /><span><b>Webhook</b> <span class=\"xs muted\">扩展；需配置签名密钥与重试策略</span></span></label>' +
          "</div></div>" +
        '<div>' + ADH.sec("静默时段") +
          '<div class="grid g2">' +
            '<div class="field"><label>起始</label><input class="input mono" value="22:00" /></div>' +
            '<div class="field"><label>结束</label><input class="input mono" value="08:00" /></div>' +
          "</div>" +
          '<div class="field"><label>静默级别</label><select class="select"><option>仅静默「提醒 / 一般」，紧急告警仍然推送</option><option>静默全部（含紧急）</option></select></div>' +
          ADH.note("rule", "与 BR-136 一致", "静默时段内消息只入库不推送，紧急类告警默认不受静默影响。") +
        "</div></div>" +
        "<div class=\"mt12 flex gap8\"><button class=\"btn primary sm\" data-act=\"ntf-pref-save\">保存偏好</button>" +
        '<button class="btn sm" data-act="ntf-test">发送测试通知</button></div>' +
        '<div class="mt12">' + ADH.note("info", "FR-SYS-05 个人偏好", "默认视图、时区与通知偏好属于个人级设置，仅影响当前账号。") + "</div></div></div>";
      return h;
    }

    h += '<div class="card-body" style="padding-bottom:0"><div class="toolbar">' +
      (srvOn()
        ? ADH.chip("info", "服务端分页", 1)
        : '<div class="search">' + ADH.icon("search", 14) + '<input class="input" id="n-q" data-live="1" data-act="filter" data-k="q" placeholder="搜索标题 / 内容 / 类型" value="' + ADH.esc(ADH.f("q", "")) + '" /></div>') +
      '<select class="select" style="width:170px" data-live="1" data-act="filter" data-k="type"><option value="">全部告警类型</option>' +
        D.alertTypes.map(function (t) {
          const v = srvOn() ? (t.typeCode || t.type) : t.type;
          return '<option value="' + ADH.esc(v) + '"' + (ADH.f("type", "") === v ? " selected" : "") + ">" + t.type + "</option>";
        }).join("") + "</select>" +
      (srvOn()
        ? '<select class="select" style="width:150px" data-live="1" data-act="filter" data-k="sort">' +
            [["-createdAt", "最新优先"], ["createdAt", "最早优先"], ["-level", "级别优先"], ["isRead,-createdAt", "未读优先"]].map(function (o) {
              return '<option value="' + o[0] + '"' + (ADH.f("sort", "-createdAt") === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
            }).join("") + "</select>"
        : "") +
      '<div class="btn-group"><button class="' + (ADH.f("state", "") === "" ? "on" : "") + '" data-act="filter" data-k="state" data-v="">全部</button>' +
        '<button class="' + (ADH.f("state", "") === "unread" ? "on" : "") + '" data-act="filter" data-k="state" data-v="unread">未读 ' + unread + "</button>" +
        '<button class="' + (ADH.f("state", "") === "read" ? "on" : "") + '" data-act="filter" data-k="state" data-v="read">已读</button></div>' +
      '<div class="grow"></div><span class="xs muted">' + (srvOn() ? "共 <b>" + totalCount() + "</b> 条" : "命中 <b>" + rows.length + "</b> 条") + "</span></div></div>";
    h += '<div class="card-body" style="padding-top:10px">';
    h += rows.length ? rows.map(function (n) {
      return '<div class="card mb8" style="box-shadow:none' + (n.read ? ";opacity:.72" : "") + '"><div class="card-body">' +
        '<div class="flex center gap8 wrap">' + ADH.chip(n.tone, n.type) + '<span class="xs muted">' + n.at + "</span>" +
        (n.read ? "" : ADH.chip("brand", "未读", 1)) + '<div class="grow"></div>' +
        (n.read ? "" : '<button class="btn xs" data-act="ntf-read" data-v="' + n.id + '">标为已读</button>') +
        '<button class="btn xs primary" data-act="ntf-goto" data-v="' + n.id + '">跳转到对象</button></div>' +
        '<div class="mt8"><b>' + n.title + "</b></div>" +
        '<div class="xs muted mt4">' + n.body + "</div></div></div>";
    }).join("") : ADH.empty("没有符合条件的消息");
    h += "</div>";
    if (srvOn()) h += ADH.live.pager("notifications", D.notificationsMeta);
    h += '<div class="card-foot"><div class="grid g2">' +
      ADH.note("rule", "BR-137 可跳转", "每条告警都可点击跳转到对应对象，跳转后自动标记为已读。") +
      ADH.note("info", "BR-135 收敛与静默", "同类告警 30 分钟内聚合为一条；可在「告警类型」页按类型配置静默时段（BR-136）。") +
      "</div></div></div>";
    return h;
  }
});

ADH.action("ntf-read", function (p) {
  const n = pickNtf(p.v);
  if (!n) return;
  n.read = 1;
  ADH.render();
  ADH.toast("已标为已读", "ok", n.id + " · " + n.type);
});
ADH.action("ntf-read-all", function () {
  const n = unreadCount();
  D.notifications.forEach(function (x) { x.read = 1; });
  ADH.render();
  ADH.toast(n ? "已全部标为已读（" + n + " 条）" : "没有未读消息", n ? "ok" : "info");
});
ADH.action("ntf-goto", function (p) {
  const n = pickNtf(p.v);
  if (!n) return;
  n.read = 1;
  ADH.act("overlay-close", { dataset: {} });
  ADH.routeTo(n.link);
  ADH.toast("已跳转到对象页面", "info", "告警可跳转到对应对象（" + n.link + "）");
});
ADH.action("ntf-mute", function (p) {
  const t = D.alertTypes.filter(function (x) { return x.type === p.v; })[0];
  ADH.overlay({
    kind: "modal", title: "静默设置 · " + p.v,
    desc: "支持按告警类型配置静默时段",
    body: ADH.kv([["告警类型", ADH.chip(t ? t.tone : "neutral", p.v)], ["触发条件", t ? t.trigger : "—"],
        ["通知对象", t ? t.to : "—"], ["当前静默", t && t.silent !== "无" ? '<span class="mono">' + t.silent + "</span>" : "无"]]) +
      '<div class="mt12 grid g2">' +
        '<div class="field"><label>静默起始</label><input class="input mono" value="22:00" /></div>' +
        '<div class="field"><label>静默结束</label><input class="input mono" value="08:00" /></div>' +
      "</div>" + ADH.note("info", "静默期内行为", "静默期内只入库不推送，消息仍可在通知中心查看；恢复后不补发历史消息。"),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="ntf-mute-save">保存静默时段</button>'
  });
});
ADH.action("ntf-mute-save", function () {
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("静默时段已保存", "ok", "按告警类型生效；紧急类告警默认不受静默影响");
  ADH.routeTo("notifications");
});
ADH.action("ntf-pref-save", function () {
  ADH.toast("通知偏好已保存", "ok", "站内 + 邮件通道生效；邮件仅推送收敛后的紧急告警");
});
ADH.action("ntf-test", function () {
  ADH.toast("测试通知已发送", "ok", "站内消息即时可见；若已启用邮件，将同时发送到当前账号邮箱");
});
})();

/* ---------------- 系统配置（8.4） ---------------- */
(function () {
const D = ADH_DATA;
const THRESHOLDS = [
  { group: "账户", item: "账户余额告警阈值", value: "2,000 USD", note: "低于该值时触发「余额不足」告警并进入账户健康检测" },
  { group: "账户", item: "消耗异常倍数", value: "3.0 ×", note: "当日消耗 > 日均 3 倍时触发「消耗异常」（act_6613008 命中）" },
  { group: "账户", item: "限流比例阈值", value: "5%", note: "近 1 小时 429 比例超过该值标记「频繁限流」并自动降频" },
  { group: "渠道", item: "令牌过期预警", value: "7 天", note: "剩余有效期 < 7 天触发「令牌即将过期」" },
  { group: "归因", item: "未映射事件比例", value: "10%", note: "超过该比例触发「归因未映射」（当前 12.4%）" },
  { group: "归因", item: "对账差异阈值", value: "20%", note: "渠道与系统归因差异超过该值触发「对账差异」（09-17 为 22.9%）" },
  { group: "任务", item: "自动重试上限（限流 / 网络）", value: "5 次 / 15 分钟", note: "指数退避；内部错误类上限 3 次" },
  { group: "数据", item: "单次导出上限", value: "100 万行", note: "BR-132：超出则导出失败并提示拆分时间范围（EXP-2197 命中）" },
  { group: "数据", item: "看板查询降级阈值", value: "5 秒", note: "NFR-03：超过 5 秒自动降级为异步查询并通知" },
  { group: "自动化", item: "规则熔断阈值", value: "连续 3 次失败", note: "连续 3 次执行失败自动停用规则并告警（R-04 已熔断）" }
];
function groupRows(rows) {
  let out = [], last = null;
  rows.forEach(function (r) {
    if (r.group !== last) { out.push({ cls: "grp", c: ['<span class="xs">' + r.group + "</span>", "", ""] }); last = r.group; }
    out.push({ c: ['<span class="xs">' + r.item + "</span>", '<span class="mono">' + r.value + "</span>", '<span class="xs muted">' + r.note + "</span>"] });
  });
  return out;
}

ADH.page("settings", {
  title: "系统配置",
  subtitle: "全局参数 · 阈值 · 渠道能力矩阵 · 枚举字典",
  render: function () {
    const tab = ADH.tabOf("globals");
    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "基准币种", value: D.env.baseCurrency, foot: '<span class="muted">' + D.env.fxRate.sample + "</span>" }) +
      ADH.stat({ label: "基准时区", value: D.env.baseTimezone, foot: '<span class="muted">FR-SYS-14</span>' }) +
      ADH.stat({ label: "已接入渠道", value: D.channels.filter(function (c) { return c.status === "CONNECTED"; }).length + " / " + D.channels.length, foot: '<span class="muted">Meta 已接入，其余预留</span>' }) +
      ADH.stat({ label: "枚举字典项", value: D.errorDict.length + D.rejectCats.length, unit: "项", foot: '<span class="muted">错误分类 ' + D.errorDict.length + " / 拒审原因 " + D.rejectCats.length + "</span>" }) +
      "</div>";
    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("sliders", 15) + '系统配置<span class="desc">FR-SYS-14~17</span></h3>' +
      '<div class="right flex gap8"><button class="btn sm" data-act="cfg-export">' + ADH.icon("download", 13) + "导出配置</button>" +
      '<button class="btn primary sm" data-act="cfg-save">' + ADH.icon("save", 13) + "保存配置</button></div></div>";
    h += '<div class="tabs">' + [["globals", "全局参数"], ["thresholds", "阈值配置"], ["capability", "渠道能力矩阵"], ["dict", "枚举字典"]].map(function (t) {
      return '<button class="' + (tab === t[0] ? "on" : "") + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>";

    if (tab === "thresholds") {
      h += '<div class="card-body">' + ADH.note("rule", "阈值驱动告警", "告警类型（8.3）与账户健康检测均读取此处阈值；修改后对后续评估生效，不回溯历史告警。") +
        '<div class="mt12">' + ADH.tbl("t-thr", [{ label: "配置项" }, { label: "当前值" }, { label: "说明与命中示例" }], groupRows(THRESHOLDS), { tight: true }) + "</div>" +
        '<div class="mt12">' + ADH.note("warn", "变更影响面", "阈值变更会影响告警数量与规则触发频率，建议先在规则引擎的「演练」模式验证。") + "</div></div></div>";
      return h;
    }
    if (tab === "capability") {
      let mh = '<div class="table-wrap"><table class="tbl matrix"><thead><tr><th>渠道能力 / 接口特性</th>';
      D.channels.forEach(function (c) { mh += '<th class="rot">' + c.label + "</th>"; });
      mh += "<th>说明</th></tr></thead><tbody>";
      D.capability.forEach(function (c) {
        mh += '<tr><td><span class="xs">' + c.cap + "</span></td>";
        D.channels.forEach(function (ch) {
          const ok = !!c[ch.code];
          mh += '<td class="' + (ok ? "yes" : "no") + '">' + (ok ? "✓" : "—") + "</td>";
        });
        mh += '<td class="xs muted">驱动前端动态表单：不支持的字段在配置时自动隐藏或禁用</td></tr>';
      });
      mh += "</tbody></table></div>";
      h += '<div class="card-body">' + ADH.note("info", "FR-SYS-16 能力矩阵", "渠道能力矩阵用于驱动前端动态表单与校验规则：勾选的能力项才会在批量计划、模板与素材匹配中开放对应字段。") +
        '<div class="mt12">' + mh + "</div>" +
        '<div class="mt12 grid g2">' +
          ADH.note("rule", "预留渠道标记", "Google / TikTok 为架构预留（RESERVED），其适配器与能力项已登记，接入后表单按矩阵自动放开。") +
          ADH.note("info", "与校验联动", "提交前校验（6.3.3）读取本矩阵：渠道不支持的能力不参与校验，避免误报。") +
        "</div></div></div>";
      return h;
    }
    if (tab === "dict") {
      h += '<div class="card-body"><div class="grid g2">' +
        '<div>' + ADH.sec("错误分类字典（6.6.3）") +
          ADH.tbl("t-dict-err", [{ label: "分类" }, { label: "名称" }, { label: "可重试" }, { label: "处理建议" }],
            D.errorDict.map(function (e) {
              return { c: ['<span class="tag-code">' + e.cat + "</span>", '<span class="xs">' + e.label + "</span>",
                e.retry ? ADH.chip("ok", "自动重试", 1) : ADH.chip("warn", "需人工"),
                '<span class="xs muted">' + e.advice + "</span>"] };
            }), { tight: true }) + "</div>" +
        '<div>' + ADH.sec("拒审原因分类（5.2）") +
          ADH.tbl("t-dict-rej", [{ label: "分类" }, { label: "名称" }, { label: "判定说明" }],
            D.rejectCats.map(function (r) {
              return { c: ['<span class="tag-code">' + r.cat + "</span>", '<span class="xs">' + r.label + "</span>", '<span class="xs muted">' + r.detail + "</span>"] };
            }), { tight: true }) + "</div>" +
      "</div>" +
      '<div class="mt12 toolbar"><button class="btn sm" data-act="dict-add" data-v="ERROR">' + ADH.icon("plus", 13) + "新增错误分类</button>" +
      '<button class="btn sm" data-act="dict-add" data-v="REJECT">' + ADH.icon("plus", 13) + "新增拒审原因</button>" +
      '<button class="btn sm" data-act="dict-add" data-v="TAG">' + ADH.icon("plus", 13) + "新增标签</button>" +
      '<div class="grow"></div><span class="xs muted">FR-SYS-17：错误分类、拒审原因、标签均在此维护</span></div>' +
      '<div class="mt12">' + ADH.note("rule", "字典与流程联动", "错误分类字典决定任务失败后的重试策略与「需人工处理」标记；拒审原因分类用于素材中心的拒审归类与统计。") + "</div></div></div>";
      return h;
    }

    h += '<div class="card-body"><div class="grid g2">' +
      '<div>' + ADH.sec("基础参数") +
        '<div class="grid g2">' +
          '<div class="field"><label>基准币种</label><select class="select"><option>USD（美元）</option><option>CNY（人民币）</option><option>EUR（欧元）</option></select></div>' +
          '<div class="field"><label>基准时区</label><select class="select"><option>UTC+8（Asia/Shanghai）</option><option>UTC+0（UTC）</option><option>账户本地时区</option></select></div>' +
        "</div>" +
        '<div class="field"><label>汇率来源</label><input class="input" value="ECB 收盘价（每日更新）" /></div>' +
        '<div class="mt4">' + ADH.note("info", "换算口径", D.env.fxRate.note + "；" + D.env.fxRate.sample) + "</div>" +
      "</div>" +
      '<div>' + ADH.sec("数据留存与配额") +
        '<div class="grid g2">' +
          '<div class="field"><label>明细数据留存</label><input class="input mono" value="24 个月" /></div>' +
          '<div class="field"><label>聚合数据留存</label><input class="input mono" value="永久保留" /></div>' +
          '<div class="field"><label>审计日志留存</label><input class="input mono" value="≥ 12 个月" /></div>' +
          '<div class="field"><label>单次导出上限</label><input class="input mono" value="1,000,000 行" /></div>' +
        "</div>" +
        '<div class="mt4">' + ADH.note("rule", "NFR-09 / BR-132", "明细 24 个月、聚合数据永久保留；单次导出超过 100 万行将拒绝并提示拆分（EXP-2197 命中）。") + "</div>" +
      "</div></div>" +
      '<div class="mt12">' + ADH.sec("数据源与环境") +
        ADH.tbl("t-src", [{ label: "数据源" }, { label: "用途" }, { label: "状态" }], D.env.sources.map(function (s) {
          return { c: ["<b>" + s.label + "</b>", '<span class="xs">' + s.desc + "</span>",
            s.code === ADH.state.env ? ADH.chip("ok", "当前使用", 1) : ADH.chip("neutral", "可切换")] };
        }), { tight: true }) +
        '<div class="mt12">' + ADH.note("info", "三态数据源", "真实生产 / 沙箱 / 演示三套数据源并行支持，可在顶栏切换；切换后所有页面的数据与时效提示同步变化。") + "</div>" +
      "</div>" +
      '<div class="mt12">' + ADH.sec("容量设计参数") +
        '<div class="grid g4">' +
          ADH.stat({ label: "账户规模", value: D.env.capacity.accounts, unit: "个", foot: '<span class="muted">设计容量</span>' }) +
          ADH.stat({ label: "设计师 / 投手", value: D.env.capacity.designers, unit: "人", foot: '<span class="muted">并发在线 ≤ 10（NFR-08）</span>' }) +
          ADH.stat({ label: "单批广告数", value: D.env.capacity.adsPerBatch, unit: "条", foot: '<span class="muted">≤ 10 分钟完成（NFR-04）</span>' }) +
          ADH.stat({ label: "归因事件量", value: D.env.capacity.eventsPerDay, unit: "/ 天", foot: '<span class="muted">峰值 500 次/秒</span>' }) +
        "</div></div>" +
      "</div></div>";
    return h;
  }
});

ADH.action("cfg-save", function () {
  ADH.toast("配置已保存", "ok", "基准币种 / 时区 / 留存与配额的变更将写入审计日志并对后续查询生效");
});
ADH.action("cfg-export", function () {
  ADH.toast("已导出配置快照", "ok", "包含全局参数、阈值、渠道能力矩阵与枚举字典");
});
ADH.action("dict-add", function (p) {
  const kind = p.v || "ERROR";
  const title = kind === "REJECT" ? "新增拒审原因" : (kind === "TAG" ? "新增标签" : "新增错误分类");
  ADH.overlay({
    kind: "modal", title: title, desc: "枚举字典维护；变更写入审计日志",
    body: ADH.sec("字典项定义") + '<div class="grid g2">' +
        '<div class="field"><label>分类编码</label><input class="input mono" placeholder="' + (kind === "ERROR" ? "如 RATE_LIMIT" : "如 TEXT_OVERLAY") + '" /></div>' +
        '<div class="field"><label>显示名称</label><input class="input" placeholder="' + (kind === "ERROR" ? "如 渠道限流" : "如 文字占比过高") + '" /></div>' +
        (kind === "ERROR"
          ? '<div class="field"><label>是否可自动重试</label><select class="select"><option>是（指数退避，最多 5 次）</option><option>否（需人工处理）</option></select></div>'
          : '<div class="field"><label>适用渠道</label><select class="select"><option>Meta</option><option>全部渠道</option></select></div>') +
        '<div class="field"><label>优先级</label><select class="select"><option>最高</option><option>高</option><option>普通</option></select></div>' +
      "</div>" +
      '<div class="field"><label>处理建议 / 判定说明</label><input class="input" placeholder="面向投手的处理指引" /></div>' +
      ADH.note("info", "生效范围", "新增字典项后，任务失败归类、素材拒审统计与筛选器选项将自动包含该项。"),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="dict-save">保存字典项</button>'
  });
});
ADH.action("dict-save", function () {
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("字典项已保存", "ok", "错误归类与筛选器选项已更新；配置变更写入审计日志");
  ADH.routeTo("settings");
});
})();
