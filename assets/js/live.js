/* ===== ADH 联调 · 真实接口模式（登录 / 权限 / 数据接入） =====
 *
 * 模式开关沿用顶栏「数据源」三态（PRD 3.4）：
 *   DEMO / SANDBOX  → 使用 data.js 的演示数据（离线可跑）
 *   LIVE            → 走真实后端（需先登录），页面数据来自 API
 *
 * 设计：页面渲染函数不变，真实数据经本文件的投影器写入 ADH_DATA 同名字段，
 * 因此「演示 / 真实」只切换数据来源，UI 与交互保持一致。
 */
(function () {
  const live = {
    session: null,        // GET /v1/auth/me 的返回
    perms: null,          // 权限码数组（真实模式下取代静态 ADH_PERM）
    dictNotifications: null,
    alertTypes: null,     // 告警类型（alertRules + 字典）投影结果，只取一次
    loading: false,
    hint: "",
    groupDetail: {},      // 账户组详情缓存（编辑表单回填，F3.2）
    accountList: null,    // 全量账户选择列表（账户组 / 纳管表单，F3.2）
    userMatrix: null      // 用户 × 账户组授权矩阵（F3.2）
  };
  ADH.live = live;

  const ROLE_LABEL = { ADMIN: "管理员", OPTIMIZER: "投手", DESIGNER: "素材设计师", ANALYST: "数据分析师", UPLOADER: "上传者", TASK_OWNER: "任务发起人", RULE_OWNER: "规则创建者" };
  const TARGET_PAGE = { ACCOUNT: "accounts", ASSET: "assets", TASK: "tasks", RULE: "rules", TOKEN: "channels", EXPORT: "exports", ATTRIBUTION: "attr-detail", DASHBOARD: "dashboard" };

  live.wanted = function () { return ADH.state.env === "LIVE"; };
  live.active = function () { return live.wanted() && !!live.session; };

  /* ---------- 权限：真实模式用 /auth/me 的 permissions ---------- */
  const staticCan = ADH.can;
  ADH.can = function (action) {
    if (live.active() && live.perms) return live.perms.indexOf(action) >= 0;
    return staticCan(action);
  };
  const staticPerson = ADH.rolePerson;
  ADH.rolePerson = function () {
    return live.active() ? live.session.user.displayName : staticPerson();
  };

  /* ---------- 工具 ---------- */
  live.errorText = function (err) {
    if (!err) return "未知错误";
    const parts = [err.message || String(err)];
    if (err.code) parts.push("code=" + err.code);
    if (err.requestId) parts.push(err.requestId);
    return parts.join(" · ");
  };
  live.notifyError = function (title, err) { ADH.toast(title, "warn", live.errorText(err)); };
  live.formatTime = function (iso) {
    if (!iso) return "";
    return String(iso).replace("T", " ").slice(0, 16);
  };
  live.roleLabelOf = function (code) { return ROLE_LABEL[code] || code; };
  live.routeForTarget = function (targetType) { return TARGET_PAGE[targetType] || "workbench"; };
  /* 跳转目标：后端 `target.route` 命中原型页面 id 时优先使用，否则按目标类型兜底（BR-137） */
  live.linkOf = function (target) {
    const route = target && target.route;
    if (route && ADH.pages[route]) return route;
    return live.routeForTarget(target && target.targetType);
  };
  live.silentLabel = function (sh) { return sh && sh.start ? sh.start + "–" + sh.end : "无"; };

  /* ---------- 通知类型字典（FR-SYS-17，用于把 code 显示成中文名） ---------- */
  live.ensureNotificationLabels = function () {
    if (live.dictNotifications) return Promise.resolve(live.dictNotifications);
    return ADH.API.system.dictionary("notification_type", true).then(function (data) {
      const map = {};
      (data.items || []).forEach(function (item) { map[item.code] = item.label; });
      live.dictNotifications = map;
      return map;
    });
  };
  live.notificationLabel = function (code) {
    const map = live.dictNotifications || {};
    return map[code] || code;
  };
  /* 类型显示名：优先用告警规则的 name（与「告警类型」页、原型文案一致），
     规则缺失时回落到 `notification_type` 字典（FR-SYS-17）。 */
  live.typeLabel = function (code) {
    const rules = ADH_DATA.alertRules || [];
    const rule = rules.filter(function (r) { return r.type === code; })[0];
    return (rule && rule.name) || live.notificationLabel(code);
  };

  /* ---------- 投影器：后端 DTO → 原型数据形状 ---------- */
  live.toNotification = function (n) {
    const target = n.target || {};
    return {
      id: String(n.id),
      rawId: n.id,
      at: live.formatTime(n.createdAt),
      type: live.typeLabel(n.type),
      typeCode: n.type,
      level: n.level,
      tone: n.level === "CRITICAL" ? "danger" : (n.level === "WARNING" ? "warn" : "info"),
      read: n.isRead ? 1 : 0,
      title: n.title,
      body: n.content || "",
      count: n.aggregatedCount || 1,
      link: live.linkOf(target),
      target: target,
      channels: n.channels || []
    };
  };

  live.toAlertType = function (rule) {
    return {
      id: rule.id,
      type: rule.name || rule.type,
      typeCode: rule.type,
      trigger: rule.condition || "—",
      to: (rule.recipients || []).map(live.roleLabelOf).join(" + ") || "—",
      count: live.countByType(rule.type),
      tone: rule.level === "CRITICAL" ? "danger" : "warn",
      silent: live.silentLabel(rule.silentHours),
      enabled: rule.enabled,
      rule: rule
    };
  };

  live.countByType = function (code) {
    return (ADH_DATA.notifications || []).filter(function (n) { return n.typeCode === code; }).length;
  };
  live.findNotification = function (id) {
    return (ADH_DATA.notifications || []).filter(function (n) { return n.id === String(id); })[0];
  };

  /* ---------- 账户投影（F3）：后端 DTO → 原型 D.accounts[] / D.groups[] ---------- */
  const HEALTH_LABEL = {
    NORMAL: { code: "OK", label: "健康", tone: "ok" },
    WARNING: { code: "WARNING", label: "预警", tone: "warn" },
    ABNORMAL: { code: "ABNORMAL", label: "异常", tone: "danger" }
  };
  live.toMoney = function (money) {
    if (!money || money.amount === null || money.amount === undefined) return 0;
    const value = Number(money.amount);
    return isFinite(value) ? value : 0;
  };
  live.moneyText = function (money, digits) {
    if (!money || money.amount === null || money.amount === undefined) return '<span class="muted">—</span>';
    return ADH.num(live.toMoney(money), digits === undefined ? 2 : digits) + ' <span class="xs muted">' + ADH.esc(money.currency) + "</span>";
  };
  live.toHealth = function (dto) {
    const base = HEALTH_LABEL[dto.healthStatus] || { code: dto.healthStatus || "UNKNOWN", label: dto.healthStatus || "未知", tone: "neutral" };
    const issues = (dto.healthReasons || []).slice();
    if (dto.dataReady === false && !issues.length) issues.push("数据未就绪：尚未完成首次结构同步（BR-120）");
    return { code: base.code, label: base.label, tone: base.tone, status: dto.healthStatus, issues: issues };
  };
  live.toAccount = function (a) {
    return {
      id: a.id,
      rawId: a.id,
      actId: a.externalId,
      name: a.name,
      group: a.groupId === null || a.groupId === undefined ? "" : String(a.groupId),
      groupName: a.groupName || "",
      bm: "",
      currency: a.currency,
      tz: a.timezone,
      status: a.channelStatus || "ACTIVE",
      managedStatus: a.managedStatus,
      channelCode: a.channelCode,
      source: a.dataSource || "",
      balance: live.toMoney(a.balance),
      spendLimit: live.toMoney(a.spendLimit),
      todaySpend: live.toMoney(a.spendToday),
      dataReady: a.dataReady !== false,
      lag: a.dataReady === false,
      health: live.toHealth(a),
      objective: "",
      objects: a.entityCounts || { campaigns: 0, adsets: 0, ads: 0, creatives: 0 },
      lastSyncAt: a.lastSyncAt ? live.formatTime(a.lastSyncAt) : "尚未同步",
      series: []
    };
  };
  live.findAccount = function (id) {
    return (ADH_DATA.accounts || []).filter(function (a) { return String(a.id) === String(id); })[0];
  };
  /* 账户组：既是列表筛选维度，也是「账户组与数据权限」页签的数据源 */
  live.groupVisible = function (rawId) {
    const me = live.session;
    if (!me) return false;
    if (me.dataScope === "ALL") return true;
    return (me.accountGroups || []).some(function (g) { return g.id === rawId; });
  };
  live.toGroup = function (g) {
    return {
      id: String(g.id),
      rawId: g.id,
      name: g.name,
      desc: g.description || "—",
      accounts: g.accountCount || 0,
      users: g.userCount || 0,
      grants: [],
      budgetCap: live.toMoney(g.budgetCap),
      budgetCurrency: (g.budgetCap && g.budgetCap.currency) || "",
      visible: live.groupVisible(g.id)
    };
  };
  live.ensureAccountGroups = function () {
    if (live.accountGroups) return Promise.resolve(live.accountGroups);
    return ADH.API.accounts.groups({ pageSize: 200 }).then(function (page) {
      ADH_DATA.groups = (page.items || []).map(live.toGroup);
      live.accountGroups = ADH_DATA.groups;
      return live.accountGroups;
    });
  };
  /* 写操作后失效会话级缓存（F3.2）：账户组 / 统计 / 详情 / 选择列表 */
  live.invalidateAccountCaches = function () {
    live.accountGroups = null;
    live.accountStats = null;
    live.accountDetails = {};
    live.accountList = null;
    live.groupDetail = {};
  };
  /* 全量账户（供账户组编辑 / 纳管表单选择；不影响当前分页列表） */
  live.allAccounts = function () {
    if (live.accountList) return Promise.resolve(live.accountList);
    return ADH.API.accounts.list({ page: 1, pageSize: 200, sort: "name" }).then(function (page) {
      live.accountList = (page.items || []).map(live.toAccount);
      return live.accountList;
    });
  };

  /* ---------- 服务端列表：分页 / 筛选 / 排序（F2 样板） ----------
   * 约定（原型页面无需改渲染函数即可接入）：
   *   - 每个路由一份页状态 `uiState[route].srv = { page, pageSize }`；
   *   - 筛选值与排序沿用页面已有的 `ADH.f(k)`（`filter` 动作写入），由各路由的取数函数解释；
   *   - 筛选 / 排序变化时 `filter` 动作会把页码重置到第 1 页并重新取数；
   *   - 分页控件用 `live.pager(route, meta)` 渲染，动作 `srv-page` / `srv-size`。
   */
  const PAGE_SIZES = [10, 20, 50];

  live.serverRoutes = {};
  live.listState = function (route) {
    const ui = (ADH.uiState[route] = ADH.uiState[route] || {});
    ui.srv = ui.srv || { page: 1, pageSize: 10 };
    return ui.srv;
  };
  live.serverList = function (route) { return !!(live.active() && live.serverRoutes[route]); };
  /* 列表元数据约定：`ADH_DATA[<route>Meta]`（notificationsMeta / accountsMeta …） */
  live.listMeta = function (route) { return ADH_DATA[route + "Meta"] || {}; };

  live.pager = function (route, meta) {
    meta = meta || {};
    const st = live.listState(route);
    const size = Number(meta.pageSize || st.pageSize);
    const total = Number(meta.total || 0);
    const pages = Math.max(1, Math.ceil(total / size));
    const page = Math.max(1, Math.min(pages, Number(meta.page || st.page)));
    return (
      '<div class="card-foot"><div class="flex center gap8 wrap">' +
      '<span class="xs muted">共 <b>' + total + "</b> 条 · 第 " + page + " / " + pages + " 页</span>" +
      '<div class="btn-group">' +
      '<button class="btn xs" data-act="srv-page" data-v="prev"' + (page <= 1 ? " disabled" : "") + ">上一页</button>" +
      '<button class="btn xs" data-act="srv-page" data-v="next"' + (page >= pages ? " disabled" : "") + ">下一页</button>" +
      "</div>" +
      '<span class="xs muted">每页</span>' +
      '<select class="select" style="width:74px" data-live="1" data-act="srv-size">' +
      PAGE_SIZES.map(function (n) {
        return '<option value="' + n + '"' + (n === size ? " selected" : "") + ">" + n + "</option>";
      }).join("") +
      "</select>" +
      '<div class="grow"></div><span class="xs muted">分页 / 筛选 / 排序均由服务端完成</span>' +
      "</div></div>"
    );
  };

  /* ---------- 按路由接入 ---------- */
  live.projectors = {};

  live.ensureAlertTypes = function () {
    if (live.alertTypes) return Promise.resolve(live.alertTypes);
    return Promise.all([
      ADH.API.notifications.alertRules(),
      live.ensureNotificationLabels()
    ]).then(function (res) {
      ADH_DATA.alertRules = (res[0].items || []);
      ADH_DATA.alertTypes = ADH_DATA.alertRules.map(live.toAlertType);
      live.alertTypes = ADH_DATA.alertTypes;
      return live.alertTypes;
    });
  };

  live.serverRoutes.notifications = function () {
    const st = live.listState("notifications");
    const query = { page: st.page, pageSize: st.pageSize, sort: ADH.f("sort", "-createdAt") };
    const type = ADH.f("type", "");
    if (type) query.type = type;
    const state = ADH.f("state", "");
    if (state === "unread") query.isRead = "false";
    else if (state === "read") query.isRead = "true";
    return ADH.API.notifications.list(query).then(function (page) {
      ADH_DATA.notifications = (page.items || []).map(live.toNotification);
      ADH_DATA.notificationsMeta = {
        total: page.total,
        unreadCount: page.unreadCount,
        page: page.page,
        pageSize: page.pageSize
      };
      return ADH_DATA.notificationsMeta;
    });
  };

  live.fetchServerList = function (route) {
    const job = live.serverRoutes[route];
    return job ? job() : Promise.resolve(null);
  };

  live.projectors.notifications = function () {
    /* 先备好告警类型（类型显示名来自规则名），再取列表，保证标签一致 */
    return live.ensureAlertTypes().then(function () { return live.fetchServerList("notifications"); });
  };

  /* ---------- F3 账户列表：服务端分页 / 筛选 / 排序 + 头部统计 ---------- */
  live.serverRoutes.accounts = function () {
    const st = live.listState("accounts");
    const query = { page: st.page, pageSize: st.pageSize, sort: ADH.f("sort", "-createdAt") };
    if (ADH.f("q", "")) query.keyword = ADH.f("q", "");
    if (ADH.f("status", "")) query.channelStatus = ADH.f("status", "");
    if (ADH.f("group", "")) query.groupId = ADH.f("group", "");
    if (ADH.f("health", "")) query.healthStatus = ADH.f("health", "");
    if (ADH.f("source", "")) query.dataSource = ADH.f("source", "");
    return ADH.API.accounts.list(query).then(function (page) {
      ADH_DATA.accounts = (page.items || []).map(live.toAccount);
      ADH_DATA.accountsMeta = { total: page.total, page: page.page, pageSize: page.pageSize };
      return ADH_DATA.accountsMeta;
    });
  };

  /* 头部统计：`overview` 取汇总，渠道状态计数用最小分页查询取 total
   * （契约无「按渠道状态聚合」字段，不改后端；每会话只取一次，翻页 / 筛选不重复请求） */
  live.countAccounts = function (extra) {
    const query = { page: 1, pageSize: 1 };
    Object.keys(extra || {}).forEach(function (k) { query[k] = extra[k]; });
    return ADH.API.accounts.list(query).then(function (page) { return page.total || 0; });
  };
  live.loadAccountStats = function () {
    return Promise.all([
      ADH.API.accounts.overview(),
      live.countAccounts({ channelStatus: "ACTIVE" }),
      live.countAccounts({ channelStatus: "PAUSED" }),
      live.countAccounts({ channelStatus: "DISABLED" })
    ]).then(function (res) {
      const ov = res[0] || {};
      const spend = ov.spendTodayTotal || {};
      live.accountStats = {
        accountCount: ov.accountCount || 0,
        managedCount: ov.managedCount || 0,
        abnormalCount: (ov.abnormalCount || 0) + (ov.warningCount || 0),
        activeCount: res[1],
        pausedCount: res[2],
        disabledCount: res[3],
        lagAccountCount: ov.lagAccountCount || 0,
        balanceTotal: live.toMoney(ov.balanceTotal),
        spendTodayTotal: live.toMoney(ov.spendTodayTotal),
        baseCurrency: spend.currency || "",
        freshness: ov.dataFreshness || {}
      };
      ADH_DATA.accountsStats = live.accountStats;
      return live.accountStats;
    });
  };
  live.projectors.accounts = function () {
    return Promise.all([
      live.ensureAccountGroups(),
      live.fetchServerList("accounts"),
      live.accountStats ? Promise.resolve(live.accountStats) : live.loadAccountStats(),
      ADH.API.accounts.syncJobs({ page: 1, pageSize: 10 }).then(function (page) {
        ADH_DATA.syncJobsLive = { items: page.items || [], total: page.total || 0 };
        return ADH_DATA.syncJobsLive;
      })
    ]);
  };

  /* ---------- F3.2 账户组页：账户组 + 用户授权矩阵（FR-SYS-03 只读展示） ---------- */
  live.ensureUserMatrix = function () {
    if (live.userMatrix) return Promise.resolve(live.userMatrix);
    if (!ADH.can("user.manage")) {
      live.userMatrix = [];
      ADH_DATA.usersLive = { items: [], total: 0, error: "当前账号无 user.manage 权限，授权矩阵不可见" };
      return Promise.resolve(live.userMatrix);
    }
    return ADH.API.users
      .list({ page: 1, pageSize: 200 })
      .then(function (page) {
        live.userMatrix = page.items || [];
        ADH_DATA.usersLive = { items: live.userMatrix, total: page.total || live.userMatrix.length };
        return live.userMatrix;
      })
      .catch(function (err) {
        live.userMatrix = [];
        ADH_DATA.usersLive = { items: [], total: 0, error: live.errorText(err) };
        return live.userMatrix;
      });
  };
  live.projectors.groups = function () {
    return Promise.all([
      live.ensureAccountGroups(),
      live.accountStats ? Promise.resolve(live.accountStats) : live.loadAccountStats(),
      live.ensureUserMatrix()
    ]);
  };

  live.hydrate = function (opts) {
    opts = opts || {};
    if (!live.active()) return Promise.resolve(false);
    const job = live.projectors[ADH.state.route];
    if (!job) {
      live.hint = "本页暂未接入真实接口（" + ADH.state.route + "），仍展示演示数据";
      if (opts.render !== false) ADH.render();
      return Promise.resolve(false);
    }
    live.loading = true;
    if (opts.render !== false) ADH.render();
    return job()
      .then(function () {
        live.loading = false;
        live.hint = "";
        if (opts.render !== false) ADH.render();
        return true;
      })
      .catch(function (err) {
        live.loading = false;
        live.hint = "";
        if (opts.render !== false) ADH.render();
        live.notifyError("加载真实数据失败", err);
        return false;
      });
  };

  /* ---------- 登录 / 会话 ---------- */
  live.applySession = function (me) {
    live.session = me;
    live.perms = me.permissions || [];
    const role = (me.roles || [])[0];
    if (role && ADH_ROLES[role]) ADH.state.role = role;
  };

  live.restore = function () {
    if (!ADH.http.hasToken()) return Promise.resolve(false);
    return ADH.API.auth
      .me()
      .then(function (me) { live.applySession(me); return true; })
      .catch(function () { ADH.http.setToken(""); return false; });
  };

  live.login = function (username, password) {
    return ADH.API.auth.login(username, password).then(function (data) {
      ADH.http.setToken(data.accessToken);
      return ADH.API.auth.me();
    }).then(function (me) {
      live.applySession(me);
      ADH.toast("已连接真实接口", "ok", me.user.displayName + " · " + (me.roles || []).join("/"));
    });
  };

  live.logout = function () {
    const done = function () {
      ADH.http.setToken("");
      live.session = null;
      live.perms = null;
      ADH.state.env = "DEMO";
      live.refresh();
      ADH.toast("已退出登录", "info", "已切回演示数据源");
    };
    return ADH.API.auth.logout().then(done).catch(done);
  };

  /* ---------- 交互入口 ---------- */
  live.enter = function () {
    if (!live.wanted()) { live.refresh(); return; }
    if (live.session) { live.refresh(); return; }
    return live.restore().then(function (ok) {
      if (ok) live.refresh();
      else { live.refresh(); live.showLogin(); }
    });
  };

  live.showLogin = function () {
    ADH.overlay({
      kind: "modal",
      title: "连接真实接口",
      desc: "后端地址 " + ADH.http.baseUrl() + " · 登录后本页数据来自真实 API（PRD 3.4 数据源三态）",
      body:
        '<div class="grid g2">' +
        '<div class="field"><label>用户名</label><input class="input" id="live-user" value="admin" /></div>' +
        '<div class="field"><label>密码</label><input class="input" type="password" id="live-pass" value="" /></div>' +
        "</div>" +
        '<div class="field mt12"><label>后端地址</label><input class="input mono" id="live-base" value="' + ADH.esc(ADH.http.baseUrl()) + '" /></div>' +
        ADH.note("info", "演示账号", "管理员 <b>admin / Admin@12345</b>（种子初始管理员）；其余账号在「用户与角色」中创建。"),
      foot:
        '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
        '<button class="btn" data-act="live-login">登录并接入</button>'
    });
  };

  live.accountMenu = function () {
    if (!live.session) { live.showLogin(); return; }
    ADH.overlay({
      kind: "modal",
      title: "真实接口会话",
      desc: "角色与权限由后端 /v1/auth/me 下发（PRD 3.2），真实模式下不可手动切换",
      body: ADH.kv([
        ["登录用户", live.session.user.displayName + "（" + live.session.user.username + "）"],
        ["角色", (live.session.roles || []).join("、")],
        ["数据权限", live.session.dataScope === "ALL" ? "全部账户（不限账户组）" : "按账户组授权"],
        ["数据源", live.session.dataSource || "—"],
        ["接口地址", '<span class="mono xs">' + ADH.esc(ADH.http.baseUrl()) + "</span>"],
        ["权限码", '<span class="mono xs">' + (live.perms || []).length + " 项</span>"]
      ]),
      foot: '<button class="btn" data-act="overlay-close">关闭</button><div class="grow"></div>' +
        '<button class="btn" data-act="live-logout">退出登录</button>'
    });
  };

  live.refresh = function () {
    /* 会话级缓存：账户统计与账户组随登录会话变化，刷新时失效 */
    live.invalidateAccountCaches();
    if (live.invalidateUserCaches) live.invalidateUserCaches();
    ADH.render();
    if (live.active()) ADH.live.hydrate();
  };

  live.decorateTopbar = function () {
    const bar = document.getElementById("topbar");
    if (!bar) return;
    const old = bar.querySelector(".live-chip");
    if (old) old.parentNode.removeChild(old);
    if (!live.wanted()) return;
    const chip = document.createElement("div");
    chip.className = "live-chip";
    chip.style.cssText = "display:flex;align-items:center;gap:6px;margin-left:8px";
    if (ADH.live.loading) {
      chip.innerHTML = '<span class="tag">加载中…</span>';
    } else if (live.session) {
      chip.innerHTML =
        '<span class="tag ok">真实接口 · ' + ADH.esc(live.session.user.displayName) + "</span>" +
        (live.hint ? ADH.chip("warn", "本页未接入", 1) : "");
      chip.title = live.hint || "";
    } else {
      chip.innerHTML = '<button class="btn xs" data-act="live-login-open">未登录 · 点击登录</button>';
    }
    const spacer = bar.querySelector(".tb-spacer");
    if (spacer && spacer.nextSibling) bar.insertBefore(chip, spacer.nextSibling);
    else bar.appendChild(chip);
  };

  /* ---------- 动作注册 ---------- */
  const origRoleMenu = ADH.actions["role-menu"];
  ADH.action("role-menu", function (p, el) {
    if (live.wanted()) { live.accountMenu(); return; }
    return origRoleMenu(p, el);
  });
  const origSetRole = ADH.actions["set-role"];
  ADH.action("set-role", function (p, el) {
    if (live.wanted()) { ADH.toast("真实模式下不能切换角色", "warn", "角色由登录账号决定（PRD 3.2）"); return; }
    return origSetRole(p, el);
  });
  const origSetEnv = ADH.actions["set-env"];
  ADH.action("set-env", function (p, el) {
    origSetEnv(p, el);
    if (p && p.env === "LIVE") live.enter();
    else live.refresh();
  });
  ADH.action("live-login-open", function () { live.showLogin(); });
  ADH.action("live-logout", function () {
    ADH.act("overlay-close", { dataset: {} });
    live.logout();
  });
  ADH.action("live-login", function () {
    const user = (document.getElementById("live-user") || {}).value || "";
    const pass = (document.getElementById("live-pass") || {}).value || "";
    const base = (document.getElementById("live-base") || {}).value || "";
    if (base) ADH.http.setBaseUrl(base);
    if (!user || !pass) { ADH.toast("请输入用户名与密码", "warn"); return; }
    live.login(user, pass)
      .then(function () {
        ADH.act("overlay-close", { dataset: {} });
        live.refresh();
      })
      .catch(function (err) { live.notifyError("登录失败", err); });
  });

  /* 服务端列表动作：分页与每页条数（F2） */
  ADH.action("srv-page", function (p) {
    const route = ADH.state.route;
    if (!live.serverList(route)) return;
    const st = live.listState(route);
    const meta = live.listMeta(route);
    const size = Number(meta.pageSize || st.pageSize);
    const pages = Math.max(1, Math.ceil(Number(meta.total || 0) / size));
    let target = Number(p.v);
    if (p.v === "prev") target = st.page - 1;
    else if (p.v === "next") target = st.page + 1;
    if (!isFinite(target)) target = 1;
    st.page = Math.max(1, Math.min(pages, target));
    live.hydrate();
  });
  ADH.action("srv-size", function (p, el) {
    const route = ADH.state.route;
    if (!live.serverList(route)) return;
    const value = el && el.value ? el.value : p.v;
    const st = live.listState(route);
    st.pageSize = Math.max(1, Number(value) || st.pageSize);
    st.page = 1;
    live.hydrate();
  });
  /* 筛选 / 排序变化：服务端列表回到第 1 页并重新取数 */
  const origFilter = ADH.actions["filter"];
  ADH.action("filter", function (p, el) {
    origFilter(p, el);
    const route = ADH.state.route;
    if (!live.serverList(route)) return;
    live.listState(route).page = 1;
    live.hydrate();
  });

  /* 通知动作：真实模式下改调接口（BR-137 跳转同样按真实目标） */
  const origRead = ADH.actions["ntf-read"];
  ADH.action("ntf-read", function (p, el) {
    if (!live.active()) return origRead(p, el);
    const n = live.findNotification(p.v);
    if (!n) return;
    ADH.API.notifications
      .markRead(n.rawId, ADH.API.idemKey("ntf-read"))
      .then(function (data) {
        n.read = 1;
        if (data && typeof data.unreadCount === "number") ADH_DATA.notificationsMeta.unreadCount = data.unreadCount;
        ADH.render();
        ADH.toast("已标为已读", "ok", n.type);
      })
      .catch(function (err) { live.notifyError("标记已读失败", err); });
  });
  const origReadAll = ADH.actions["ntf-read-all"];
  ADH.action("ntf-read-all", function (p, el) {
    if (!live.active()) return origReadAll(p, el);
    ADH.API.notifications
      .markAllRead(ADH.API.idemKey("ntf-read-all"))
      .then(function (data) {
        (ADH_DATA.notifications || []).forEach(function (x) { x.read = 1; });
        if (data && typeof data.unreadCount === "number") ADH_DATA.notificationsMeta.unreadCount = data.unreadCount;
        ADH.render();
        ADH.toast("已全部标为已读", "ok", data && data.updated ? data.updated + " 条" : "");
      })
      .catch(function (err) { live.notifyError("全部已读失败", err); });
  });
  const origGoto = ADH.actions["ntf-goto"];
  ADH.action("ntf-goto", function (p, el) {
    if (!live.active()) return origGoto(p, el);
    const n = live.findNotification(p.v);
    if (!n) return;
    ADH.act("overlay-close", { dataset: {} });
    ADH.routeTo(n.link);
    ADH.toast("已跳转到对象页面", "info", "BR-137：告警可跳转（" + (n.target.route || n.link) + "）");
  });

  /* ---------- 账户详情 / 健康度 / 同步（F3）：抽屉按需取真实数据 ---------- */
  live.accountDetails = {};
  live.loadAccountDetail = function (id) {
    return Promise.all([ADH.API.accounts.detail(id), ADH.API.accounts.health(id)]).then(function (res) {
      live.accountDetails[String(id)] = { detail: res[0] || {}, health: res[1] || {} };
      return live.accountDetails[String(id)];
    });
  };
  live.healthLabel = function (status) {
    return (HEALTH_LABEL[status] || {}).label || status || "—";
  };
  live.healthTone = function (status) {
    if (status === "ABNORMAL") return "danger";
    if (status === "WARNING") return "warn";
    return "ok";
  };
  live.accountDrawer = function (id) {
    const data = live.accountDetails[String(id)];
    if (!data) return;
    const a = live.toAccount(data.detail);
    const detail = data.detail;
    const health = data.health || {};
    const sub = ADH.s().acctTab || "overview";
    const tabs = [["overview", "概览"], ["health", "健康检测"]];
    let body = '<div class="tabs pill mb12">' + tabs.map(function (x) {
      return '<button class="' + (sub === x[0] ? "on" : "") + '" data-act="acct-tab" data-v="' + x[0] + '">' + x[1] + "</button>";
    }).join("") + "</div>";
    if (sub === "health") {
      const issues = health.issues || [];
      body += ADH.sec("健康检测（FR-PRE-08）") + ADH.kv([
        ["当前状态", ADH.chip(live.healthTone(health.healthStatus), live.healthLabel(health.healthStatus), 1)],
        ["检查时间", health.checkedAt ? live.formatTime(health.checkedAt) : "—"],
        ["数据就绪", detail.dataReady ? ADH.chip("ok", "已就绪") : ADH.chip("warn", "未就绪（BR-120）")],
        ["异常项数", issues.length + " 项"]
      ]);
      body += issues.length
        ? ADH.tbl("tbl-acct-issue", [{ label: "问题码" }, { label: "说明" }, { label: "处置建议" }],
            issues.map(function (item) {
              return {
                c: [
                  ADH.chip(item.level === "CRITICAL" ? "danger" : "warn", ADH.esc(item.code || "ISSUE")),
                  '<span class="xs">' + ADH.esc(item.message || "") + "</span>",
                  '<span class="xs muted">' + ADH.esc(item.suggestion || "—") + "</span>"
                ]
              };
            }), { tight: true })
        : ADH.empty("当前无异常项");
      body += '<div class="mt12">' +
        ADH.note("info", "口径", "健康度取自后端最近一次账户健康快照（<span class=\"tag-code\">account_health</span>）；无快照时按账户状态与同步情况推断。") +
        "</div>";
    } else {
      const counts = detail.entityCounts || {};
      body += ADH.sec("账户基础信息（FR-PRE-06）") + ADH.kv([
        ["账户名", ADH.esc(a.name)],
        ["act_id", '<span class="tag-code">' + ADH.esc(a.actId) + "</span>"],
        ["账户 ID", '<span class="mono xs">' + a.id + "</span>"],
        ["渠道", ADH.esc(a.channelCode) + " " + ADH.chip("meta", ADH.esc(a.source || "—"))],
        ["账户组", ADH.esc(a.groupName || "—")],
        ["币种 / 时区", ADH.esc(a.currency) + " · " + ADH.esc(a.tz)],
        ["纳管状态", a.managedStatus === "MANAGED" ? ADH.chip("ok", "已纳管") : ADH.chip("neutral", "未纳管")],
        ["状态", ADH.statusChip(a.status)],
        ["健康度", ADH.chip(a.health.tone, a.health.label, 1)],
        ["账户余额", live.moneyText(detail.balance)],
        ["消费限额", live.moneyText(detail.spendLimit, 0) + '<span class="xs muted"> / 日</span>'],
        ["今日消耗", live.moneyText(detail.spendToday)],
        ["最近同步", ADH.esc(a.lastSyncAt)],
        ["tokenId", detail.tokenId === null || detail.tokenId === undefined ? '<span class="muted">—</span>' : '<span class="mono xs">' + detail.tokenId + "</span>"]
      ]);
      body += ADH.sec("已同步对象（统一对象模型）") + ADH.tbl("tbl-acct-obj",
        [{ label: "Campaign" }, { label: "AdSet" }, { label: "Ad" }, { label: "Creative" }],
        [{
          c: [counts.campaigns || 0, counts.adsets || 0, counts.ads || 0, counts.creatives || 0],
          v: [counts.campaigns || 0, counts.adsets || 0, counts.ads || 0, counts.creatives || 0]
        }], { tight: true });
      body += '<div class="mt12">' +
        ADH.note("warn", "口径提示", "洞察同步（B9）尚未接入，<b>今日消耗恒为 0</b>（BR-120）；对象数来自 <span class=\"tag-code\">ad_entity</span>，结构同步（B5）已接但演示库未写入对象。") +
        "</div>";
    }
    ADH.overlay({
      title: ADH.esc(detail.name || ("账户 " + id)),
      wide: true,
      desc: ADH.esc(a.actId) + " · " + ADH.esc(a.currency) + " / " + ADH.esc(a.tz) + " · " + ADH.esc(a.groupName || "未分组"),
      body: body,
      foot: '<span class="xs muted">真实接口数据 · 账户 ' + a.id + "</span>" +
        '<div class="grow"></div>' +
        '<button class="btn sm" data-act="acct-sync" data-v="' + a.id + '">' + ADH.icon("refresh", 13) + "手动触发同步</button>" +
        '<button class="btn sm" data-act="goto" data-page="batch-ops" data-sub="' + a.id + '">批量投放</button>' +
        '<button class="btn primary sm" data-act="overlay-close">关闭</button>'
    });
  };
  live.openAccountDrawer = function (id) {
    if (live.accountDetails[String(id)]) { live.accountDrawer(id); return Promise.resolve(true); }
    ADH.overlay({ title: "读取账户详情", desc: "GET /v1/ad-accounts/" + id, body: ADH.empty("正在读取账户详情…") });
    return live.loadAccountDetail(id)
      .then(function () { live.accountDrawer(id); return true; })
      .catch(function (err) {
        ADH.act("overlay-close", { dataset: {} });
        live.notifyError("读取账户详情失败", err);
        return false;
      });
  };
  const origAccountDetail = ADH.actions["account-detail"];
  ADH.action("account-detail", function (p, el) {
    if (!live.active()) return origAccountDetail(p, el);
    ADH.s().acctId = p.v;
    if (!ADH.s().acctTab) ADH.s().acctTab = "overview";
    return live.openAccountDrawer(p.v);
  });
  const origAcctSync = ADH.actions["acct-sync"];
  ADH.action("acct-sync", function (p, el) {
    if (!live.active()) return origAcctSync(p, el);
    ADH.API.accounts
      .sync(p.v, { mode: "FULL", includeCreatives: true }, ADH.API.idemKey("acct-sync"))
      .then(function (data) {
        const task = data.task || {};
        ADH.toast("已提交结构同步任务", "ok", task.taskId + " · " + task.status + "（FR-PRE-07 / NFR-11）");
        live.accountDetails = {};
        ADH.act("overlay-close", { dataset: {} });
        live.hydrate();
      })
      .catch(function (err) { live.notifyError("触发同步失败", err); });
  });

  const origGroupDetail = ADH.actions["account-group-detail"];
  ADH.action("account-group-detail", function (p, el) {
    if (!live.active()) return origGroupDetail(p, el);
    ADH.overlay({ title: "读取账户组", body: ADH.empty("正在读取账户组详情…") });
    ADH.API.accounts
      .group(p.v)
      .then(function (g) {
        live.groupDetail[String(g.id)] = g;
        const accounts = (g.accounts || []).map(live.toAccount);
        const users = g.grantedUsers || [];
        ADH.overlay({
          title: ADH.esc(g.name),
          desc: ADH.esc(g.description || "—"),
          body: ADH.sec("授权信息") + ADH.kv([
              ["账户组 ID", '<span class="tag-code">' + g.id + "</span>"],
              ["账户数", (g.accountCount || 0) + " 个"],
              ["授权用户", users.length ? ADH.esc(users.map(function (u) { return u.displayName; }).join("、")) : '<span class="muted">未授权任何用户</span>'],
              ["组内日预算上限", live.moneyText(g.budgetCap, 0)]
            ]) +
            ADH.sec("组内账户" + (accounts.length > 50 ? "（前 50 个）" : "")) + (accounts.length
              ? ADH.tbl("tbl-gg-live", [{ label: "账户" }, { label: "act_id" }, { label: "状态" }, { label: "健康度" }, { label: "今日消耗", cls: "num" }],
                  accounts.slice(0, 50).map(function (a) {
                    return { c: [ADH.esc(a.name), '<span class="mono small">' + ADH.esc(a.actId) + "</span>", ADH.statusChip(a.status),
                      ADH.chip(a.health.tone, a.health.label, 1), ADH.num(a.todaySpend, 2)] };
                  }), { tight: true })
              : ADH.empty("该账户组暂无账户")) +
            '<div class="mt12">' + ADH.note("info", "写操作", "账户组的新建 / 编辑 / 删除需 <span class=\"tag-code\">account.bind</span> 权限；删除前需先移出组内账户（否则返回 <span class=\"tag-code\">40902</span>），删除后同步回收授权（BR-3.4）。") + "</div>",
          foot:
            '<button class="btn" data-act="overlay-close">关闭</button>' +
            (ADH.can("account.bind")
              ? '<button class="btn sm" data-act="group-edit" data-v="' + g.id + '">' + ADH.icon("edit", 13) + "编辑</button>" +
                '<button class="btn sm" data-act="group-del" data-v="' + g.id + '">' + ADH.icon("trash", 13) + "删除</button>"
              : '<span class="xs muted">仅 account.bind 权限可编辑账户组</span>')
        });
      })
      .catch(function (err) {
        ADH.act("overlay-close", { dataset: {} });
        live.notifyError("读取账户组失败", err);
      });
  });

  /* ---------- F3.2 账户写操作：纳管 / 账户组 CRUD / 同步任务重试 ---------- */
  const CURRENCIES = ["CNY", "USD", "EUR", "GBP", "CAD", "SGD", "MYR", "IDR", "THB", "VND"];

  live.field = function (id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return String(el.value === undefined || el.value === null ? "" : el.value).trim();
  };
  live.checked = function (id) {
    const el = document.getElementById(id);
    return !!(el && el.checked);
  };
  live.amount = function (text) {
    if (!text) return null;
    const value = Number(String(text).replace(/,/g, ""));
    return isFinite(value) && value >= 0 ? value : null;
  };
  live.baseCurrency = function () {
    return (live.accountStats && live.accountStats.baseCurrency) || "CNY";
  };
  live.currencyOptions = function (selected) {
    const current = selected || live.baseCurrency();
    return CURRENCIES.map(function (code) {
      return '<option value="' + code + '"' + (code === current ? " selected" : "") + ">" + code + "</option>";
    }).join("");
  };
  /* 写操作收尾：失效缓存 → 提示 → 重渲染 → 重新取数 */
  live.afterWrite = function (title, detail) {
    ADH.act("overlay-close", { dataset: {} });
    live.invalidateAccountCaches();
    if (live.invalidateUserCaches) live.invalidateUserCaches();
    ADH.toast(title, "ok", detail || "");
    ADH.render();
    return live.hydrate();
  };

  /* --- 账户组：新建 / 编辑（同一表单） --- */
  live.accountPicker = function (accounts, selectedIds) {
    if (!accounts.length) return ADH.empty("暂无可选账户", "请先在「渠道接入」中纳管账户");
    return (
      '<div id="grp-acc" class="table-wrap" style="max-height:230px;overflow:auto;border:1px solid var(--line);border-radius:9px">' +
      accounts
        .map(function (a) {
          const on = selectedIds.indexOf(String(a.id)) >= 0;
          return (
            '<label class="check" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--line);cursor:pointer">' +
            '<input type="checkbox" class="grp-acc" value="' + a.id + '"' + (on ? " checked" : "") + " />" +
            '<span class="grow"><b class="small">' + ADH.esc(a.name) + '</b> <span class="tag-code">' + ADH.esc(a.actId) + "</span>" +
            '<div class="xs muted">' + ADH.esc(a.groupName || "未分组") + " · " + ADH.esc(a.currency) + " · " + ADH.esc(a.tz) + "</div></span>" +
            ADH.statusChip(a.status) +
            "</label>"
          );
        })
        .join("") +
      "</div>"
    );
  };
  live.pickedAccounts = function () {
    const box = document.getElementById("grp-acc");
    if (!box) return [];
    const nodes = box.querySelectorAll("input.grp-acc");
    const out = [];
    for (let i = 0; i < nodes.length; i += 1) if (nodes[i].checked) out.push(Number(nodes[i].value));
    return out;
  };
  live.groupForm = function (opts) {
    opts = opts || {};
    const group = opts.group || null;
    const edit = !!group;
    return live
      .allAccounts()
      .catch(function () {
        return [];
      })
      .then(function (accounts) {
        const selected = edit ? (group.accounts || []).map(function (a) { return String(a.id); }) : [];
        const budget = edit && group.budgetCap ? live.toMoney(group.budgetCap) : null;
        const currency = (edit && group.budgetCap && group.budgetCap.currency) || live.baseCurrency();
        const desc = edit ? group.description || "" : "";
        ADH.overlay({
          kind: "modal",
          wide: true,
          title: edit ? "编辑账户组" : "新建账户组",
          desc: "数据权限以账户组为单位授权（BR-3.4）· 写操作需 account.bind 权限并写入审计日志",
          body:
            ADH.sec("基本信息") +
            '<div class="grid g2">' +
            '<div class="field"><label>账户组名称（1–64 字符）</label><input class="input" id="grp-name" maxlength="64" placeholder="例如：日本站测试组" value="' +
            ADH.esc(edit ? group.name : "") +
            '" /></div>' +
            '<div class="field"><label>组内日预算上限（可选）</label><div class="flex gap8"><input class="input" id="grp-budget" placeholder="例如：1000" value="' +
            (budget === null ? "" : budget) +
            '" /><select class="select" id="grp-cur" style="width:96px">' +
            live.currencyOptions(currency) +
            "</select></div></div>" +
            '<div class="field" style="grid-column:1/-1"><label>说明（可选，≤200 字）</label><input class="input" id="grp-desc" maxlength="200" placeholder="用途与适用范围" value="' +
            ADH.esc(desc) +
            '" /></div></div>' +
            ADH.sec("组内账户（" + accounts.length + " 个可选）") +
            live.accountPicker(accounts, selected) +
            '<div class="mt12">' +
            ADH.note(
              "info",
              "接口",
              (edit ? "PATCH /v1/account-groups/" + group.id : "POST /v1/account-groups") +
                " · <span class=\"tag-code\">accountIds</span> 为<b>全量覆盖</b>；同名账户组返回 <span class=\"tag-code\">40901</span>；空请求体返回 <span class=\"tag-code\">42200</span>。"
            ) +
            "</div>",
          foot:
            '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
            '<button class="btn primary" data-act="group-save"' + (edit ? ' data-v="' + group.id + '"' : "") + ">" +
            (edit ? "保存修改" : "创建账户组") +
            "</button>"
        });
        return true;
      });
  };

  const origGroupNew = ADH.actions["group-new"];
  ADH.action("group-new", function (p, el) {
    if (!live.active()) return origGroupNew(p, el);
    if (!ADH.assertPerm("account.bind")) return;
    return live.groupForm({});
  });
  /* 详情未缓存时先取一次（列表页可直接点「编辑 / 删除」） */
  live.withGroup = function (id, fn) {
    const cached = live.groupDetail[String(id)];
    if (cached) return Promise.resolve(fn(cached));
    ADH.overlay({ title: "读取账户组", body: ADH.empty("正在读取账户组详情…") });
    return ADH.API.accounts
      .group(id)
      .then(function (g) {
        live.groupDetail[String(g.id)] = g;
        return fn(g);
      })
      .catch(function (err) {
        ADH.act("overlay-close", { dataset: {} });
        live.notifyError("读取账户组失败", err);
        return null;
      });
  };
  ADH.action("group-edit", function (p) {
    if (!live.active()) return;
    if (!ADH.assertPerm("account.bind")) return;
    live.withGroup(p.v, function (group) {
      live.groupForm({ group: group });
    });
  });
  ADH.action("group-save", function (p) {
    if (!live.active()) return;
    if (!ADH.assertPerm("account.bind")) return;
    const id = p && p.v !== undefined && p.v !== null && String(p.v) !== "" ? String(p.v) : "";
    const name = live.field("grp-name");
    if (!name) {
      ADH.toast("请填写账户组名称", "warn", "名称 1–64 字符，且不能与已有账户组重名");
      return;
    }
    const desc = live.field("grp-desc");
    const body = { name: name, accountIds: live.pickedAccounts() };
    /* 新建时空说明传 null；编辑时传空串表示清空说明（后端 description=null 视为不修改） */
    body.description = id ? desc : desc || null;
    const budget = live.amount(live.field("grp-budget"));
    if (budget !== null) body.budgetCap = { amount: String(budget), currency: live.field("grp-cur") || live.baseCurrency() };
    const request = id
      ? ADH.API.accounts.updateGroup(id, body, ADH.API.idemKey("group-update"))
      : ADH.API.accounts.createGroup(body, ADH.API.idemKey("group-create"));
    request
      .then(function (data) {
        live.afterWrite(
          id ? "账户组已更新" : "账户组已创建",
          ADH.esc(data.name) + " · 账户 " + (data.accountCount || 0) + " 个"
        );
      })
      .catch(function (err) {
        if (err && err.code === 40901) {
          ADH.toast("账户组名称重复", "warn", "已存在同名账户组，请更换名称（40901）");
          return;
        }
        if (err && err.code === 42200) {
          ADH.toast("参数校验失败", "warn", live.errorText(err));
          return;
        }
        live.notifyError("保存账户组失败", err);
      });
  });
  ADH.action("group-del", function (p) {
    if (!live.active()) return;
    if (!ADH.assertPerm("account.bind")) return;
    const id = String(p.v);
    live.withGroup(id, function (group) { live.groupDeleteConfirm(id, group); });
  });
  live.groupDeleteConfirm = function (id, group) {
    ADH.overlay({
      kind: "modal",
      title: "删除账户组",
      desc: "DELETE /v1/account-groups/" + id,
      body:
        ADH.note(
          "warn",
          "确认删除「" + ADH.esc(group.name || id) + "」",
          "组内仍有账户时后端会拒绝删除（<span class=\"tag-code\">40902</span>），需先移出账户；删除成功后该组的授权一并回收（BR-3.4）。"
        ) + '<div class="mt12 xs muted">删除动作写入审计日志（ACCOUNT / DELETE / ACCOUNT_GROUP）。</div>',
      foot:
        '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
        '<button class="btn danger" data-act="group-del-ok" data-v="' + id + '">确认删除</button>'
    });
  };
  ADH.action("group-del-ok", function (p) {
    if (!live.active()) return;
    ADH.API.accounts
      .deleteGroup(p.v, ADH.API.idemKey("group-delete"))
      .then(function () { live.afterWrite("账户组已删除", "授权已同步回收（BR-3.4）"); })
      .catch(function (err) {
        if (err && err.code === 40902) {
          ADH.toast("无法删除", "warn", live.errorText(err));
          return;
        }
        live.notifyError("删除账户组失败", err);
      });
  });

  /* --- 账户纳管：勾选 / 手动输入 act_id --- */
  live.bindForm = function () {
    return Promise.all([
      ADH.API.channels.list().catch(function () {
        return null;
      }),
      live.allAccounts().catch(function () {
        return [];
      }),
      live.ensureAccountGroups().catch(function () {
        return [];
      })
    ]).then(function (res) {
      const channels = ((res[0] || {}).items || []).filter(function (c) { return c.status === "ENABLED"; });
      const groups = res[2] || [];
      const channelOptions = channels.length
        ? channels.map(function (c) {
            return '<option value="' + c.code + '">' + ADH.esc(c.name) + "（" + ADH.esc(c.code) + "）</option>";
          }).join("")
        : '<option value="meta">Meta Ads（meta）</option>';
      ADH.overlay({
        kind: "modal",
        wide: true,
        title: "纳管账户",
        desc: "FR-PRE-04 · 勾选 / 输入渠道账户后落库，并按需创建首次全量结构同步任务（AC-01）",
        body:
          '<div class="grid g2">' +
          '<div class="field"><label>渠道</label><select class="select" id="bind-channel">' + channelOptions + "</select></div>" +
          '<div class="field"><label>目标账户组（可选）</label><select class="select" id="bind-group"><option value="">不指定（未分组）</option>' +
          groups.map(function (g) { return '<option value="' + g.rawId + '">' + ADH.esc(g.name) + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>数据源（可选）</label><select class="select" id="bind-source"><option value="">继承系统配置</option>' +
          ["LIVE", "DEMO", "SANDBOX"].map(function (s) { return '<option value="' + s + '">' + s + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>纳管后立即同步</label><label class="check" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="bind-sync" checked /><span class="small">创建首次全量结构同步任务（TREE_FULL）</span></label></div>' +
          "</div>" +
          '<div class="flex center gap8 mt12"><button class="btn sm" data-act="bind-pull">从渠道拉取可纳管账户</button>' +
          '<span class="xs muted">需该渠道已完成 OAuth 授权，否则返回 50201</span><div class="grow"></div></div>' +
          '<div class="mt12" id="bind-list">' +
          ADH.note("info", "可纳管账户", "点击「从渠道拉取」按渠道列出授权范围内的账户；也可直接在下方按 <span class=\"tag-code\">act_id</span> 手动输入。") +
          "</div>" +
          ADH.sec("手动输入 act_id") +
          '<div class="field"><textarea class="input" id="bind-ids" rows="3" placeholder="每行一个，例如：act_1183042（也支持逗号分隔）"></textarea></div>' +
          '<div class="mt12">' +
          ADH.note("info", "幂等", "已纳管的账户重复提交不会产生重复记录（计入 <span class=\"tag-code\">skippedCount</span>）；提交自动携带 <span class=\"tag-code\">Idempotency-Key</span>。") +
          "</div>",
        foot:
          '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
          '<button class="btn primary" data-act="bind-save">提交纳管</button>'
      });
      return true;
    });
  };
  ADH.action("acct-bind", function () {
    if (!live.active()) {
      ADH.toast("纳管账户需要真实接口", "info", "演示模式下请走「接入渠道」向导（FR-PRE-01）");
      return;
    }
    if (!ADH.assertPerm("account.bind")) return;
    live.bindForm();
  });
  ADH.action("bind-pull", function () {
    if (!live.active()) return;
    const channel = live.field("bind-channel");
    const box = document.getElementById("bind-list");
    if (box) box.innerHTML = ADH.empty("正在拉取可纳管账户…");
    ADH.API.accounts
      .discoverable(channel, { onlyUnmanaged: "false" })
      .then(function (data) {
        const items = data.items || [];
        if (!box) return;
        if (!items.length) {
          box.innerHTML = ADH.empty("该渠道下暂无可纳管账户");
          return;
        }
        box.innerHTML =
          ADH.note("info", "可纳管账户（" + items.length + " 个）", "勾选后与下方手动输入合并提交（自动去重）。") +
          '<div id="bind-acc" class="table-wrap" style="max-height:230px;overflow:auto;border:1px solid var(--line);border-radius:9px">' +
          items
            .map(function (a) {
              return (
                '<label class="check" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--line);cursor:pointer">' +
                '<input type="checkbox" class="bind-acc" value="' + ADH.esc(a.externalId) + '"' + (a.managed ? "" : " checked") + " />" +
                '<span class="grow"><b class="small">' + ADH.esc(a.name) + '</b> <span class="tag-code">' + ADH.esc(a.externalId) + "</span>" +
                '<div class="xs muted">' + ADH.esc(a.currency) + " · " + ADH.esc(a.timezone) + " · 余额 " + live.moneyText(a.balance) + "</div></span>" +
                (a.managed ? ADH.chip("ok", "已纳管") : ADH.chip("neutral", "未纳管")) +
                ADH.statusChip(a.channelStatus) +
                "</label>"
              );
            })
            .join("") +
          "</div>";
      })
      .catch(function (err) {
        if (box) box.innerHTML = ADH.note("warn", "拉取失败", ADH.esc(live.errorText(err)) + "（可改用手动输入 act_id）");
      });
  });
  ADH.action("bind-save", function () {
    if (!live.active()) return;
    if (!ADH.assertPerm("account.bind")) return;
    const ids = [];
    const box = document.getElementById("bind-acc");
    if (box) {
      const nodes = box.querySelectorAll("input.bind-acc");
      for (let i = 0; i < nodes.length; i += 1) if (nodes[i].checked) ids.push(nodes[i].value);
    }
    live
      .field("bind-ids")
      .split(/[\s,，、;；]+/)
      .forEach(function (item) {
        if (item && ids.indexOf(item) < 0) ids.push(item);
      });
    if (!ids.length) {
      ADH.toast("请选择或输入要纳管的账户", "warn", "至少 1 个 act_id");
      return;
    }
    const body = {
      channelCode: live.field("bind-channel"),
      externalIds: ids,
      syncImmediately: live.checked("bind-sync")
    };
    const groupId = live.field("bind-group");
    if (groupId) body.groupId = Number(groupId);
    const source = live.field("bind-source");
    if (source) body.dataSource = source;
    ADH.API.accounts
      .bind(body, ADH.API.idemKey("acct-bind"))
      .then(function (data) {
        const task = data.task || null;
        live.afterWrite(
          "纳管完成",
          "新增 " + (data.boundCount || 0) + " 个 · 跳过 " + (data.skippedCount || 0) + " 个" + (task ? " · 任务 " + task.taskId : " · 未创建同步任务")
        );
      })
      .catch(function (err) {
        if (err && err.code === 42200) {
          ADH.toast("参数校验失败", "warn", live.errorText(err));
          return;
        }
        live.notifyError("纳管账户失败", err);
      });
  });

  /* --- 同步任务重试（NFR-11）：仅终态失败可重试，其余返回 60002 --- */
  ADH.action("sync-retry", function (p) {
    if (!live.active()) {
      ADH.toast("重试需要真实接口", "info", "演示模式下不触发同步任务（NFR-11）");
      return;
    }
    if (!ADH.assertPerm("account.bind")) return;
    ADH.API.accounts
      .retryJob(p.v, ADH.API.idemKey("sync-retry"))
      .then(function (job) {
        ADH.toast("已提交重试", "ok", "#" + job.id + " · " + job.status + " · 第 " + (job.retryCount || 0) + " 次");
        live.accountDetails = {};
        live.hydrate();
      })
      .catch(function (err) {
        if (err && err.code === 60002) {
          ADH.toast("不能重试", "warn", live.errorText(err));
          return;
        }
        live.notifyError("重试同步任务失败", err);
      });
  });
  /* 越权拦截演示：真实模式下由服务端 40300 判定（BR-3.5 / BR-57） */
  const origTryDenied = ADH.actions["try-denied"];
  ADH.action("try-denied", function (p, el) {
    if (!live.active()) return origTryDenied(p, el);
    ADH.toast(
      "越权提交由服务端拒绝",
      "warn",
      "BR-3.5 / BR-57：目标账户不在数据权限范围内时返回 40300，且不执行任何部分写入；账号 " +
        (live.session ? live.session.user.displayName : "") +
        " · 数据范围 " +
        (live.session && live.session.dataScope === "ALL" ? "全部账户组" : "按账户组授权")
    );
  });

  /* 原型动作留档：真实模式回退用（F4） */
  const origUserNew = ADH.actions["user-new"];
  const origUserDetail = ADH.actions["user-detail"];
  const origUserToggle = ADH.actions["user-toggle"];
  const origUserRole = ADH.actions["user-role"];
  const origUserGrant = ADH.actions["user-grant"];
  const origUserTakeover = ADH.actions["user-takeover"];
  const origUserReset = ADH.actions["user-reset"];
  const origUserDel = ADH.actions["user-del"];
  const origUserExport = ADH.actions["user-export"];
  const ROLE_ORDER_CODES = ["admin", "optimizer", "designer", "analyst"];

  /* ================= F4 用户与角色（FR-SYS-01 ~ FR-SYS-03） ================= */

  /* 契约模块 1 的用户状态枚举是 `ACTIVE / DISABLED`，原型是 `ENABLED / DISABLED`；
   * `toUser` 统一投影到原型词表（页面两种模式共用一套渲染），`rawStatus` 保留契约值供写接口使用。 */
  live.toUser = function (u) {
    const roles = u.roles || [];
    const groups = u.accountGroupNames || [];
    const active = u.status === "ACTIVE";
    return {
      id: u.id,
      rawId: u.id,
      name: u.displayName,
      account: u.username,
      role: roles[0] || "optimizer",
      roles: roles,
      groups: groups.length ? groups : ["未授权"],
      status: active ? "ENABLED" : "DISABLED",
      rawStatus: u.status,
      enabled: active,
      lastLogin: u.lastLoginAt ? live.formatTime(u.lastLoginAt) : "—",
      createdAt: u.createdAt ? live.formatTime(u.createdAt) : "—"
    };
  };
  live.findUser = function (id) {
    return (
      (ADH_DATA.users || []).filter(function (u) { return String(u.rawId) === String(id); })[0] || null
    );
  };
  /* 用户角色 → 功能权限（真实模式由后端权限矩阵合成，原型用静态 ADH_PERM） */
  live.userPermissions = function (user) {
    const items = ADH_DATA.permissionsLive;
    if (!items) return null;
    const roles = (user && user.roles) || [];
    const allowed = [];
    const denied = [];
    items.forEach(function (item) {
      const on = roles.some(function (r) { return item.grants && item.grants[r]; });
      (on ? allowed : denied).push(item.code);
    });
    return { allowed: allowed, denied: denied };
  };

  /* 角色与权限矩阵（会话级缓存；`/roles` + `/permissions` 只读） */
  live.ensureRoles = function () {
    if (live.roles) return Promise.resolve(live.roles);
    return Promise.all([ADH.API.rbac.roles(), ADH.API.rbac.permissions()]).then(function (res) {
      live.roles = res[0].items || [];
      ADH_DATA.rolesLive = live.roles;
      ADH_DATA.permissionsLive = res[1].items || [];
      ADH_DATA.permissionsVersion = res[1].version || "v1";
      return live.roles;
    });
  };
  live.roleLabelLive = function (code) {
    const row = (live.roles || []).filter(function (r) { return r.code === code; })[0];
    return (row && row.name) || ROLE_LABEL[code] || code;
  };

  /* 用户列表：服务端分页 / 筛选 / 排序 */
  live.serverRoutes.users = function () {
    const st = live.listState("users");
    const query = { page: st.page, pageSize: st.pageSize, sort: ADH.f("sort", "username") };
    if (ADH.f("q", "")) query.keyword = ADH.f("q", "");
    if (ADH.f("role", "")) query.role = ADH.f("role", "");
    if (ADH.f("status", "")) query.status = ADH.f("status", "");
    if (ADH.f("group", "")) query.accountGroupId = ADH.f("group", "");
    return ADH.API.users.list(query).then(function (page) {
      ADH_DATA.users = (page.items || []).map(live.toUser);
      ADH_DATA.usersMeta = { total: page.total, page: page.page, pageSize: page.pageSize };
      return ADH_DATA.usersMeta;
    });
  };

  /* 头部统计：契约无聚合接口，用最小分页查询取 total；每会话只取一次（翻页 / 筛选不重复请求） */
  live.countUsers = function (extra) {
    const query = { page: 1, pageSize: 1 };
    Object.keys(extra || {}).forEach(function (k) { query[k] = extra[k]; });
    return ADH.API.users.list(query).then(function (page) { return page.total || 0; });
  };
  live.loadUserStats = function () {
    return Promise.all([
      live.countUsers({}),
      live.countUsers({ status: "ACTIVE" }),
      live.countUsers({ status: "DISABLED" }),
      live.countUsers({ role: "admin", status: "ACTIVE" })
    ]).then(function (res) {
      live.userStats = {
        total: res[0],
        active: res[1],
        disabled: res[2],
        activeAdmins: res[3],
        roleCount: (ADH_DATA.rolesLive || []).length,
        groupCount: (live.accountGroups || []).length
      };
      ADH_DATA.usersStats = live.userStats;
      return live.userStats;
    });
  };
  /* 写操作后失效用户侧缓存（矩阵 / 统计 / 详情） */
  live.invalidateUserCaches = function () {
    live.userMatrix = null;
    live.userStats = null;
    live.userDetail = {};
    ADH_DATA.usersLive = null;
    ADH_DATA.usersStats = null;
  };

  live.projectors.users = function () {
    return Promise.all([
      live.ensureRoles(),
      live.ensureAccountGroups(),
      live.fetchServerList("users"),
      live.ensureUserMatrix(),
      live.loadUserStats()
    ]);
  };

  /* 账户组多选（新建用户 / 编辑授权共用） */
  live.groupPicker = function (id, selected) {
    const groups = live.accountGroups || [];
    if (!groups.length) return ADH.empty("暂无账户组", "请先在「账户组」页签创建账户组");
    const picked = (selected || []).map(function (v) { return String(v); });
    return (
      '<div id="' + id + '" class="flex wrap gap8">' +
      groups
        .map(function (g) {
          const on = picked.indexOf(String(g.rawId)) >= 0;
          return (
            '<label class="check"><input type="checkbox" class="u-grp" value="' + g.rawId + '"' + (on ? " checked" : "") +
            " /><span>" + ADH.esc(g.name) + "</span></label>"
          );
        })
        .join("") +
      "</div>"
    );
  };
  live.pickedGroups = function (id) {
    const box = document.getElementById(id || "u-groups");
    if (!box) return [];
    const nodes = box.querySelectorAll("input.u-grp");
    const out = [];
    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i].checked) out.push(Number(nodes[i].value));
    }
    return out;
  };
  live.roleOptions = function (selected) {
    const rows = live.roles || [];
    const codes = rows.length ? rows.map(function (r) { return r.code; }) : ROLE_ORDER_CODES;
    return codes
      .map(function (code) {
        return (
          '<option value="' + code + '"' + (code === selected ? " selected" : "") + ">" +
          ADH.esc(live.roleLabelLive(code)) + "（" + code + "）</option>"
        );
      })
      .join("");
  };

  /* --- 新建用户（POST /users） --- */
  live.userForm = function () {
    ADH.overlay({
      kind: "modal",
      wide: true,
      title: "新建用户",
      desc: "POST /v1/users · 角色与账户组授权立即生效（BR-140），写操作记审计（BR-141）",
      body:
        ADH.sec("账号信息") +
        '<div class="grid g2">' +
        '<div class="field"><label>姓名（1–32 字）</label><input class="input" id="u-name" maxlength="32" placeholder="如：顾南" /></div>' +
        '<div class="field"><label>登录账号（字母开头，3–32 位）</label><input class="input mono" id="u-account" maxlength="32" placeholder="如：gu.nan" /></div>' +
        '<div class="field"><label>初始密码（8–128 位）</label><input class="input mono" id="u-pass" placeholder="提醒对方首次登录后修改" /></div>' +
        '<div class="field"><label>角色</label><select class="select" id="u-role">' + live.roleOptions("optimizer") + "</select></div></div>" +
        ADH.sec("数据权限（账户组，可多选）") +
        live.groupPicker("u-groups", []) +
        '<div class="mt12">' +
        ADH.note(
          "rule",
          "按需授权",
          "未勾选账户组的用户看不到任何账户数据；同名账号返回 <span class=\"tag-code\">40901</span>，字段不合规返回 <span class=\"tag-code\">42200</span>。"
        ) +
        "</div>",
      foot:
        '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
        '<button class="btn primary" data-act="user-save">创建用户</button>'
    });
  };
  ADH.action("user-new", function (p, el) {
    if (!live.active()) return origUserNew(p, el);
    if (!ADH.assertPerm("user.manage")) return;
    return live
      .ensureRoles()
      .then(function () { return live.ensureAccountGroups(); })
      .then(function () { live.userForm(); });
  });
  ADH.action("user-save", function () {
    if (!live.active()) return;
    if (!ADH.assertPerm("user.manage")) return;
    const name = live.field("u-name");
    const account = live.field("u-account");
    const password = live.field("u-pass");
    if (!name || !account) {
      ADH.toast("请填写姓名与登录账号", "warn", "登录账号需以字母开头，3–32 位（字母 / 数字 / . _ -）");
      return;
    }
    if (password.length < 8) {
      ADH.toast("初始密码至少 8 位", "warn", "契约 CreateUserRequest.password 要求 8–128 位（42200）");
      return;
    }
    const body = {
      username: account,
      displayName: name,
      password: password,
      roles: [live.field("u-role") || "optimizer"],
      accountGroupIds: live.pickedGroups("u-groups")
    };
    ADH.API.users
      .create(body, ADH.API.idemKey("user-create"))
      .then(function (u) {
        live.afterWrite("用户已创建", ADH.esc(u.displayName) + " · " + (u.roles || []).join(" / "));
      })
      .catch(function (err) {
        if (err && err.code === 40901) {
          ADH.toast("登录账号已存在", "warn", "请更换账号名（40901）");
          return;
        }
        if (err && err.code === 42200) {
          ADH.toast("参数校验失败", "warn", live.errorText(err));
          return;
        }
        live.notifyError("创建用户失败", err);
      });
  });

  /* --- 用户详情（GET /users/{id}） --- */
  live.openUserDrawer = function (raw) {
    const u = live.toUser(raw);
    const perm = live.userPermissions(u);
    const groups = (raw.accountGroups || []).map(function (g) { return g.name; });
    const detail = live.userDetail[String(u.rawId)];
    ADH.overlay({
      title: "用户详情 · " + u.name,
      desc: u.account + " · " + (u.roles || []).map(live.roleLabelLive).join(" / ") + " · " + (u.enabled ? "启用中" : "已禁用"),
      body:
        ADH.sec("账号信息") +
        ADH.kv([
          ["姓名", ADH.esc(u.name)],
          ["登录账号", '<span class="tag-code">' + ADH.esc(u.account) + "</span>"],
          ["角色", (u.roles || []).map(function (r) { return ADH.chip("brand", live.roleLabelLive(r)); }).join(" ")],
          ["状态", u.enabled ? ADH.chip("ok", "启用", 1) : ADH.chip("danger", "已禁用")],
          ["最近登录", '<span class="mono">' + u.lastLogin + "</span>"],
          ["创建时间", '<span class="mono">' + u.createdAt + "</span>"]
        ]) +
        ADH.sec("数据权限（账户组）") +
        (groups.length
          ? '<div class="flex wrap gap8">' + groups.map(function (g) { return '<span class="tag-code">' + ADH.esc(g) + "</span>"; }).join("") + "</div>"
          : ADH.empty("未授权任何账户组", "该用户看不到账户数据；可在「账户组授权」页签编辑")) +
        (perm
          ? ADH.sec("功能权限（PRD 3.2 · 由角色合成）") +
            '<div class="flex wrap gap8">' +
            perm.allowed.map(function (k) { return ADH.chip("ok", k); }).join("") +
            perm.denied.map(function (k) { return ADH.chip("neutral", k); }).join("") +
            "</div>"
          : "") +
        ADH.sec("未完成任务（BR-138）") +
        ADH.note("info", "本批未接入任务中心", "任务与接管接口属 <span class=\"tag-code\">tasks</span> 批次；此处只展示账号与授权信息，禁用用户不会丢失其未完成任务。") +
        (detail ? '<div class="mt12 xs muted">GET /v1/users/' + u.rawId + " 取自服务端详情接口</div>" : ""),
      foot:
        '<button class="btn" data-act="overlay-close">关闭</button>' +
        '<button class="btn" data-act="user-role" data-v="' + u.rawId + '">改角色</button>' +
        '<button class="btn" data-act="user-grant" data-v="' + u.rawId + '">编辑授权</button><div class="grow"></div>' +
        (u.enabled
          ? '<button class="btn danger-ghost" data-act="user-toggle" data-v="' + u.rawId + '">禁用账号</button>'
          : '<button class="btn primary" data-act="user-toggle" data-v="' + u.rawId + '">启用账号</button>')
    });
  };
  ADH.action("user-detail", function (p, el) {
    if (!live.active()) return origUserDetail(p, el);
    live.userDetail = live.userDetail || {};
    ADH.overlay({ title: "读取用户详情", body: ADH.empty("正在读取用户与授权…") });
    ADH.API.users
      .detail(p.v)
      .then(function (u) {
        live.userDetail[String(u.id)] = u;
        return live.ensureRoles().then(function () { return live.ensureAccountGroups(); });
      })
      .then(function () {
        live.openUserDrawer(live.userDetail[String(p.v)]);
      })
      .catch(function (err) {
        ADH.act("overlay-close", { dataset: {} });
        live.notifyError("读取用户详情失败", err);
      });
  });

  /* --- 启用 / 停用（POST /users/{id}/status） --- */
  ADH.action("user-toggle", function (p, el) {
    if (!live.active()) return origUserToggle(p, el);
    if (!ADH.assertPerm("user.manage")) return;
    const u = live.findUser(p.v);
    const next = u && u.rawStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const body = { status: next };
    if (next === "DISABLED") body.reason = "联调：管理员停用";
    ADH.API.users
      .setStatus(p.v, body, ADH.API.idemKey("user-status"))
      .then(function (data) {
        live.afterWrite(
          next === "ACTIVE" ? "已启用账号" : "已禁用账号",
          ADH.esc((data && data.displayName) || (u && u.name) || p.v) + " · 状态变更立即生效并记审计（BR-141）"
        );
      })
      .catch(function (err) {
        if (err && err.code === 60001) {
          ADH.toast("操作被阻止", "warn", "BR-139：系统需至少保留一个启用状态的管理员账号（60001）");
          return;
        }
        if (err && err.code === 40304) {
          ADH.toast("需要二次确认", "warn", live.errorText(err));
          return;
        }
        live.notifyError("变更用户状态失败", err);
      });
  });

  /* --- 改角色（PATCH /users/{id}） --- */
  ADH.action("user-role", function (p, el) {
    if (!live.active()) return origUserRole(p, el);
    if (!ADH.assertPerm("user.manage")) return;
    const u = live.findUser(p.v) || { name: p.v, role: "optimizer", rawId: p.v };
    live.ensureRoles().then(function () {
      ADH.overlay({
        kind: "modal",
        title: "变更角色 · " + u.name,
        desc: "PATCH /v1/users/" + u.rawId + " · BR-140 变更立即生效，无需重新登录",
        body:
          ADH.kv([["账号", '<span class="tag-code">' + ADH.esc(u.account || "") + "</span>"], ["当前角色", ADH.chip("brand", live.roleLabelLive(u.role))]]) +
          '<div class="mt12 field"><label>新角色</label><select class="select" id="u-role-edit">' + live.roleOptions(u.role) + "</select></div>" +
          ADH.note("rule", "影响范围", "角色决定功能权限，账户组授权决定数据范围；两者需同时满足（PRD 3.2）。"),
        foot:
          '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
          '<button class="btn primary" data-act="user-role-save" data-v="' + u.rawId + '">保存角色</button>'
      });
    });
  });
  ADH.action("user-role-save", function (p) {
    if (!live.active()) return;
    if (!ADH.assertPerm("user.manage")) return;
    const role = live.field("u-role-edit");
    if (!role) {
      ADH.toast("请选择角色", "warn", "角色为必填（minItems 1）");
      return;
    }
    ADH.API.users
      .update(p.v, { roles: [role] }, ADH.API.idemKey("user-role"))
      .then(function (data) {
        live.afterWrite("角色已更新", ADH.esc(data.displayName) + " → " + (data.roles || []).join(" / "));
      })
      .catch(function (err) {
        if (err && err.code === 42200) {
          ADH.toast("参数校验失败", "warn", live.errorText(err));
          return;
        }
        live.notifyError("更新角色失败", err);
      });
  });

  /* --- 编辑账户组授权（GET | PUT /users/{id}/grants，F3.2 遗留项收口） --- */
  ADH.action("user-grant", function (p, el) {
    if (!live.active()) return origUserGrant(p, el);
    if (!ADH.assertPerm("user.manage")) return;
    const u = live.findUser(p.v);
    ADH.overlay({ title: "读取数据权限", body: ADH.empty("正在读取该用户的账户组授权…") });
    Promise.all([ADH.API.users.grants(p.v), live.ensureAccountGroups()])
      .then(function (res) {
        const items = res[0].items || [];
        const selected = items.map(function (g) { return g.groupId; });
        ADH.overlay({
          kind: "modal",
          title: "编辑数据权限 · " + ((u && u.name) || p.v),
          desc: "PUT /v1/users/" + p.v + "/grants · 全量覆盖，空选表示不授予任何账户组",
          body:
            ADH.note("info", "授权维度", "用户 ↔ 账户组的授权关系决定可见账户与可操作范围（FR-SYS-03）；未授权范围在列表、看板、导出中均不可见（BR-130）。") +
            '<div class="mt12">' + ADH.sec("账户组（已授权 " + selected.length + " / " + (live.accountGroups || []).length + "）") + live.groupPicker("u-groups", selected) + "</div>",
          foot:
            '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
            '<button class="btn primary" data-act="user-grant-save" data-v="' + p.v + '">保存授权</button>'
        });
      })
      .catch(function (err) {
        ADH.act("overlay-close", { dataset: {} });
        live.notifyError("读取用户授权失败", err);
      });
  });
  ADH.action("user-grant-save", function (p) {
    if (!live.active()) return;
    if (!ADH.assertPerm("user.manage")) return;
    const ids = live.pickedGroups("u-groups");
    ADH.API.users
      .saveGrants(p.v, { accountGroupIds: ids }, ADH.API.idemKey("user-grants"))
      .then(function (data) {
        live.afterWrite("数据权限已更新", "已授权 " + ((data && data.items) || []).length + " 个账户组");
      })
      .catch(function (err) {
        if (err && err.code === 42200) {
          ADH.toast("参数校验失败", "warn", live.errorText(err));
          return;
        }
        live.notifyError("更新数据权限失败", err);
      });
  });

  /* 契约模块 1 未提供这些写操作（重置密码 / 删除用户 / 任务接管），真实模式只给出口径说明 */
  live.notInContract = function (title, detail) {
    ADH.toast(title, "info", detail);
  };
  ADH.action("user-takeover", function (p, el) {
    if (!live.active()) return origUserTakeover(p, el);
    live.notInContract("接管未完成任务需任务中心", "BR-138 的任务接管依赖 tasks 批次；届时通过 POST /v1/users/{id}/status 的 takeOverTaskIds 指定接管。");
  });
  ADH.action("user-reset", function (p, el) {
    if (!live.active()) return origUserReset(p, el);
    live.notInContract("契约模块 1 暂无重置密码接口", "联调批次尚未实现 POST /v1/users/{id}/password；当前改动账号密码请走部署侧。");
  });
  ADH.action("user-del", function (p, el) {
    if (!live.active()) return origUserDel(p, el);
    live.notInContract("契约模块 1 暂无删除用户接口", "用户停用请用「禁用账号」（POST /v1/users/{id}/status），历史任务与审计需保留（BR-138）。");
  });
  ADH.action("user-export", function (p, el) {
    if (!live.active()) return origUserExport(p, el);
    live.notInContract("用户清单导出属报表导出批次", "BR-129 导出统一走 POST /v1/exports 异步任务；本批未接入 exports，故不发起导出。");
  });

/* ================= F5 命名规则引擎（FR-MID-08 ~ FR-MID-13） ================= */

  /* 契约 `TemplateScope`（SYSTEM / SHARED / PERSONAL）与原型中文标签的映射；
   * 原型不允许新建系统内置规则，真实模式只提供 SHARED / PERSONAL。 */
  const SCOPE_LABEL = { SYSTEM: "系统内置", SHARED: "共享模板", PERSONAL: "个人模板" };
  const DUP_LABEL = { APPEND_SEQ: "自动追加序号", BLOCK: "阻断提交" };
  const NAMING_MAX_LENGTH = 120;

  live.namingScopes = ["SHARED", "PERSONAL"];
  live.scopeLabel = function (code) { return SCOPE_LABEL[code] || code || "—"; };
  live.dupLabel = function (code) { return DUP_LABEL[code] || code || "—"; };
  live.namingMaxLength = NAMING_MAX_LENGTH;

  live.toNamingRule = function (r) {
    return {
      id: r.id,
      rawId: r.id,
      name: r.name,
      pattern: (r.pattern || []).slice(),
      sep: r.separator || "_",
      scopeCode: r.scope || "SHARED",
      scope: SCOPE_LABEL[r.scope] || r.scope,
      maxLength: Number(r.maxLength || NAMING_MAX_LENGTH),
      dupStrategy: r.duplicateStrategy || "APPEND_SEQ",
      dupLabel: DUP_LABEL[r.duplicateStrategy] || r.duplicateStrategy,
      version: r.version || "v1",
      refTemplates: Number(r.refTemplateCount || 0),
      example: r.example || "",
      updatedAt: r.updatedAt ? live.formatTime(r.updatedAt) : "—",
      fieldMapping: r.fieldMapping || {}
    };
  };

  /* 命名字段字典（GET /naming-fields，8 条）：编辑器「插入字段」的数据源 */
  live.ensureNamingFields = function () {
    if (live.namingFields) return Promise.resolve(live.namingFields);
    return ADH.API.naming.fields().then(function (data) {
      live.namingFields = data.items || [];
      ADH_DATA.namingFieldsLive = live.namingFields;
      return live.namingFields;
    });
  };
  live.namingFieldList = function () { return live.namingFields || []; };
  live.namingMeta = function () { return ADH_DATA.namingMeta || {}; };
  live.findNamingRule = function (id) {
    return (ADH_DATA.namingRules || []).filter(function (r) { return String(r.rawId) === String(id); })[0] || null;
  };

  /* 命名规则列表：服务端分页 / 筛选（scope / keyword）/ 排序（updatedAt / name / version） */
  live.serverRoutes.naming = function () {
    const st = live.listState("naming");
    const query = { page: st.page, pageSize: st.pageSize, sort: ADH.f("sort", "-updatedAt") };
    if (ADH.f("scope", "")) query.scope = ADH.f("scope", "");
    if (ADH.f("q", "")) query.keyword = ADH.f("q", "");
    return ADH.API.naming.list(query).then(function (page) {
      ADH_DATA.namingRules = (page.items || []).map(live.toNamingRule);
      ADH_DATA.namingMeta = { total: page.total, page: page.page, pageSize: page.pageSize };
      /* 首次取数（用户尚未编辑过草稿）时用第一条真实规则初始化编辑器，避免沿用演示数据 */
      const ui = ADH.uiState.naming || (ADH.uiState.naming = {});
      if (!ui.namingTouched) live.namingEditorInit(ADH_DATA.namingRules[0] || null);
      return ADH_DATA.namingMeta;
    });
  };
  live.projectors.naming = function () {
    return Promise.all([live.ensureNamingFields(), live.fetchServerList("naming")]);
  };

  /* 编辑器当前 spec（校验 / 保存 / 预览共用一份口径） */
  live.namingDraftSpec = function () {
    const s = ADH.s();
    return {
      name: String(s.ruleName || "").trim(),
      pattern: (s.pattern || []).slice(),
      separator: s.sep || "_",
      scope: s.ruleScope || "PERSONAL",
      maxLength: Number(s.maxLen || NAMING_MAX_LENGTH),
      duplicateStrategy: s.dupStrategy || "APPEND_SEQ"
    };
  };
  /* 把（服务端 / 演示）规则灌进编辑器状态；系统内置规则按「另存为共享副本」处理，避免就地改动内置规则。
   * 置 `namingTouched` 后，重新取数不再覆盖用户正在编辑的草稿。 */
  live.namingDefaultPattern = ["渠道", "目标", "受众", "日期", "序号:3"];
  live.namingEditorInit = function (rule) {
    const s = ADH.uiState.naming || (ADH.uiState.naming = {});
    s.pattern = rule && rule.pattern && rule.pattern.length ? rule.pattern.slice() : live.namingDefaultPattern.slice();
    s.sep = (rule && rule.sep) || "_";
    s.ruleId = rule && rule.scopeCode !== "SYSTEM" ? rule.rawId : null;
    s.ruleName = rule ? (rule.scopeCode === "SYSTEM" ? rule.name + "（副本）" : rule.name) : "";
    s.ruleScope = rule && rule.scopeCode !== "SYSTEM" ? rule.scopeCode : "SHARED";
    s.maxLen = (rule && rule.maxLength) || NAMING_MAX_LENGTH;
    s.dupStrategy = (rule && rule.dupStrategy) || "APPEND_SEQ";
    s.validateReport = null;
    s.preview = null;
    s.dupMsg = "";
    s.namingTouched = true;
    return s;
  };

  live.namingIssueList = function (report) {
    const items = (report && report.issues) || [];
    if (!items.length) return ADH.note("ok", "服务端校验通过（BR-39 / BR-40）", "示例输出 " + '<span class="mono">' + ADH.esc((report && report.sample) || "—") + "</span>");
    return ADH.tbl(
      "t-nv",
      [{ label: "级别" }, { label: "问题" }, { label: "字段" }, { label: "依据" }],
      items.map(function (it) {
        return {
          c: [
            it.level === "ERROR" ? ADH.chip("danger", "阻断") : it.level === "WARNING" ? ADH.chip("warn", "警告") : ADH.chip("info", "提示"),
            "<b>" + ADH.esc(it.message) + '</b><div class="xs muted mono">' + ADH.esc(it.code) + "</div>",
            '<span class="tag-code">' + ADH.esc(it.field || "—") + "</span>",
            '<span class="xs muted">' + ADH.esc(it.prdRef || "—") + "</span>"
          ]
        };
      }),
      { tight: true, empty: "无问题" }
    );
  };

  live.namingParseTable = function (items) {
    const matched = items.filter(function (it) { return it.matched; }).length;
    const rows = items.map(function (it) {
      const keys = Object.keys(it.fields || {});
      return {
        c: [
          '<span class="mono xs">' + ADH.esc(it.name) + "</span>",
          it.matched ? ADH.chip("ok", "已识别") : ADH.chip("warn", "未识别"),
          keys.length
            ? keys.map(function (k) { return '<span class="tag-code">' + ADH.esc(k) + '</span> ' + ADH.esc(it.fields[k]); }).join("　")
            : '<span class="xs muted">—</span>'
        ]
      };
    });
    return (
      ADH.tbl("t-rev", [{ label: "名称" }, { label: "解析结果" }, { label: "结构化字段" }], rows, { tight: true, empty: "无解析结果" }) +
      '<div class="mt8">' +
      ADH.note(
        matched === items.length && items.length ? "ok" : "warn",
        "解析完成 " + matched + " / " + items.length + " 条",
        "取值本身含分隔符时无法唯一反解（契约已知限制，返回 matched=false）；解析结果写入 <span class=\"tag-code\">naming_fields_json</span>，失败对象归入未识别命名分组（BR-44，不影响入库）。"
      ) +
      "</div>"
    );
  };

  /* --- 规则库动作：新建 / 载入 / 删除（真实写路径） --- */
  const origNamingLoad = ADH.actions["naming-load"];
  const origNamingSave = ADH.actions["naming-save"];
  const origNamingTestDup = ADH.actions["naming-test-dup"];
  const origReverseParse = ADH.actions["reverse-parse"];
  const origNamingNew = ADH.actions["naming-new"];
  const origNamingDel = ADH.actions["naming-del"];
  const origNamingDelOk = ADH.actions["naming-del-ok"];

  ADH.action("naming-new", function (p, el) {
    if (!live.active()) return origNamingNew(p, el);
    if (!ADH.assertPerm("template.edit")) return;
    const s = live.namingEditorInit(null);
    s.tab = "editor";
    s.ruleId = null;
    s.ruleScope = "PERSONAL";
    ADH.render();
    ADH.toast("已新建空规则草稿", "info", "保存时按 POST /v1/naming-rules 落库（校验不通过返回 42201）");
  });

  ADH.action("naming-load", function (p, el) {
    if (!live.active()) return origNamingLoad(p, el);
    ADH.API.naming
      .detail(p.v)
      .then(function (raw) {
        const rule = live.toNamingRule(raw);
        live.namingEditorInit(rule);
        ADH.s().tab = "editor";
        ADH.render();
        ADH.toast("已载入规则 " + rule.name, "info", "字段序列与分隔符取自服务端（" + rule.version + "）");
      })
      .catch(function (err) { live.notifyError("读取命名规则失败", err); });
  });

  ADH.action("naming-validate", function () {
    if (!live.active()) return;
    const spec = live.namingDraftSpec();
    if (!spec.name) { ADH.toast("请先填写规则名称", "warn", "契约 NamingRuleSpec.name 必填（1–64 字）"); return; }
    if (!spec.pattern.length) { ADH.toast("至少需要一个字段", "warn", "契约 pattern 至少 1 项（FR-MID-08）"); return; }
    ADH.API.naming
      .validate(spec)
      .then(function (report) {
        ADH.s().validateReport = report;
        ADH.render();
        ADH.toast(report.passed ? "服务端校验通过" : "服务端校验未通过", report.passed ? "ok" : "warn",
          report.passed ? "示例输出 " + report.sample : (report.issues || []).length + " 条问题（保存会被阻断，42201）");
      })
      .catch(function (err) { live.notifyError("校验命名规则失败", err); });
  });

  ADH.action("naming-preview", function () {
    if (!live.active()) return;
    const s = ADH.s();
    const spec = live.namingDraftSpec();
    if (!spec.name || !spec.pattern.length) { ADH.toast("请先填写规则名称与字段序列", "warn", "预览需要一份完整规则"); return; }
    if (!s.ruleId) {
      /* 未落库的草稿：契约只有「按 id 预览」，用校验接口的 sample（同一命名引擎，AC-05 一致） */
      ADH.API.naming.validate(spec).then(function (report) {
        s.validateReport = report;
        ADH.render();
        ADH.toast(report.passed ? "草稿预览（validate.sample）" : "草稿尚不合规", report.passed ? "info" : "warn",
          report.passed ? report.sample : (report.issues || []).length + " 条问题");
      }).catch(function (err) { live.notifyError("预览命名规则失败", err); });
      return;
    }
    ADH.API.naming
      .preview(s.ruleId, { values: {} })
      .then(function (data) {
        s.preview = data;
        ADH.render();
        ADH.toast("服务端预览完成", data.truncated ? "warn" : "ok",
          data.name + " · " + data.nameLength + " 字符" + (data.truncated ? "（已按 maxLength 截断）" : ""));
      })
      .catch(function (err) { live.notifyError("预览命名规则失败", err); });
  });

  ADH.action("naming-save", function (p, el) {
    if (!live.active()) return origNamingSave(p, el);
    if (!ADH.assertPerm("template.edit")) return;
    const spec = live.namingDraftSpec();
    if (!spec.name) { ADH.toast("请先填写规则名称", "warn", "契约 NamingRuleSpec.name 必填（1–64 字）"); return; }
    if (!spec.pattern.length) { ADH.toast("至少需要一个字段", "warn", "契约 pattern 至少 1 项（FR-MID-08）"); return; }
    const id = ADH.s().ruleId;
    ADH.API.naming
      .validate(spec)
      .then(function (report) {
        ADH.s().validateReport = report;
        /* BR-40：服务端判定不合规时阻断保存（契约 create/update 返回 42201） */
        if (!report.passed) {
          ADH.render();
          ADH.toast("命名规则不合规，已阻断保存", "warn", (report.issues || []).length + " 条问题（42201）");
          return null;
        }
        return (id
          ? ADH.API.naming.update(id, spec, ADH.API.idemKey("naming-save"))
          : ADH.API.naming.create(spec, ADH.API.idemKey("naming-new"))
        ).then(function (data) {
          const rule = live.toNamingRule(data);
          live.namingEditorInit(rule);
          live.afterWrite(id ? "命名规则已更新" : "命名规则已创建",
            rule.name + " · " + rule.version + " · 示例 " + rule.example);
          return rule;
        });
      })
      .catch(function (err) {
        if (err && err.code === 40901) { ADH.toast("规则名称已存在", "warn", "请更换名称（40901）"); return; }
        if (err && err.code === 42201) {
          ADH.toast("命名规则不合规", "warn", live.errorText(err));
          return ADH.API.naming.validate(Object.assign({}, spec, { name: spec.name })).then(function (report) {
            ADH.s().validateReport = report;
            ADH.render();
          });
        }
        if (err && err.code === 42200) { ADH.toast("参数校验失败", "warn", live.errorText(err)); return; }
        live.notifyError("保存命名规则失败", err);
      });
  });

  ADH.action("naming-del", function (p, el) {
    if (!live.active()) return origNamingDel(p, el);
    if (!ADH.assertPerm("template.edit")) return;
    const rule = live.findNamingRule(p.v);
    if (!rule) return;
    ADH.overlay({
      kind: "modal",
      title: "删除命名规则 · " + rule.name,
      desc: "DELETE /v1/naming-rules/" + rule.rawId + " · 被模板引用时返回 409（40902）",
      body:
        ADH.note("warn", "删除影响", "删除后引用该规则的模板将无法解析名称；已被 " + rule.refTemplates + " 个模板引用时后端会拒绝删除（BR-41）。") +
        '<div class="mt12">' + ADH.kv([["规则", ADH.esc(rule.name)], ["公式", '<span class="mono xs">{' + rule.pattern.join("}" + rule.sep + "{") + "}</span>"], ["作用域", live.scopeLabel(rule.scopeCode)]]) + "</div>",
      foot:
        '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
        '<button class="btn danger-ghost" data-act="naming-del-ok" data-v="' + rule.rawId + '">确认删除</button>'
    });
  });
  ADH.action("naming-del-ok", function (p, el) {
    if (!live.active()) return origNamingDelOk(p, el);
    if (!ADH.assertPerm("template.edit")) return;
    const wasLoaded = String((ADH.uiState.naming || {}).ruleId) === String(p.v);
    ADH.API.naming
      .remove(p.v, ADH.API.idemKey("naming-del"))
      .then(function () {
        return live.afterWrite("命名规则已删除", "规则 #" + p.v + " 已从规则库移除，删除操作写审计（BR-141）");
      })
      .then(function () {
        /* 被删除的正是编辑器里加载的规则：重取数后回填第一条剩余规则，避免停在空壳草稿上 */
        if (wasLoaded) { live.namingEditorInit((ADH_DATA.namingRules || [])[0] || null); ADH.render(); }
      })
      .catch(function (err) {
        if (err && err.code === 40902) { ADH.toast("已被模板引用，无法删除", "warn", "请先解除模板引用（40902）"); return; }
        if (err && err.code === 40400) { ADH.toast("规则不存在", "warn", "可能已被其他人删除（40400）"); return; }
        live.notifyError("删除命名规则失败", err);
      });
  });

  ADH.action("naming-test-dup", function (p, el) {
    if (!live.active()) return origNamingTestDup(p, el);
    /* 契约没有「重名模拟」接口：只解释口径，实际冲突在任务层按 duplicateStrategy 处理 */
    ADH.s().dupMsg = ADH.note("info", "重名策略由契约字段决定（BR-41 / BR-42 / BR-143 审计）",
      "规则保存 <span class=\"tag-code\">duplicateStrategy</span>（APPEND_SEQ = 自动追加序号 / BLOCK = 阻断提交）与序号字段（<span class=\"tag-code\">序号:3</span>）；实际序号由任务层在创建时分配并持久化，失败重跑复用已分配序号（BR-42）。规则引擎只负责生成名称，不模拟冲突。");
    ADH.render();
  });

  /* --- 反向解析（POST /naming-rules/{id}/parse，支持多行批量） --- */
  ADH.action("rev-input", function (p, el) {
    ADH.s().revIn = el && el.value !== undefined ? el.value : ADH.s().revIn || "";
  });
  ADH.action("rev-rule", function (p, el) {
    ADH.s().revRuleId = el && el.value ? Number(el.value) : Number(p.v);
    ADH.render();
  });
  ADH.action("reverse-parse", function (p, el) {
    if (!live.active()) return origReverseParse(p, el);
    const raw = el && el.value !== undefined ? el.value : ADH.s().revIn || "";
    ADH.s().revIn = raw;
    ADH.state.focusId = "rev-in";
    const names = String(raw)
      .split(/[\n,;]+/)
      .map(function (x) { return x.trim(); })
      .filter(function (x) { return !!x; })
      .slice(0, 200);
    const rules = ADH_DATA.namingRules || [];
    const ruleId = ADH.s().revRuleId || ((rules[0] || {}).rawId);
    if (!names.length) { ADH.s().revResult = ADH.note("warn", "请输入待解析的名称", "每行一条（最多 200 条，契约 NamingParseRequest.names）"); ADH.render(); return; }
    if (!ruleId) { ADH.s().revResult = ADH.note("warn", "暂无可用命名规则", "请先在「规则库」创建规则，或到编辑器保存一条草稿"); ADH.render(); return; }
    ADH.API.naming
      .parse(ruleId, { names: names })
      .then(function (data) {
        ADH.s().revRuleId = ruleId;
        ADH.s().revResult = live.namingParseTable(data.items || []);
        ADH.render();
      })
      .catch(function (err) { live.notifyError("反向解析失败", err); });
  });

    /* 顶栏装饰 + 路由切换后按需拉取 */
  const origRenderTopbar = ADH.renderTopbar;
  ADH.renderTopbar = function () {
    origRenderTopbar();
    live.decorateTopbar();
  };
  const origRouteTo = ADH.routeTo;
  ADH.routeTo = function (id, params) {
    origRouteTo(id, params);
    if (live.active()) ADH.live.hydrate();
  };

  live.init = function () {
    if (!live.wanted()) return;
    live.enter();
  };
})();