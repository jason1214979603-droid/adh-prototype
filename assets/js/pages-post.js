/* ================= 投放后 · 主页面 ================= */
(function () {
const D = ADH_DATA;
const RANGES = { today: { label: "今日", k: 0.055, days: 1 }, d7: { label: "近 7 天", k: 0.26, days: 7 }, d30: { label: "近 30 天", k: 1, days: 30 } };
const LEVELS = ["渠道", "广告账户", "Campaign", "AdSet", "Ad", "素材"];
function range() { const r = ADH.f("range", "d30"); return RANGES[r] ? r : "d30"; }
function seedOf(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h % 100000; }
/* 由消耗确定性派生出其余指标，保证同一对象每次一致 */
function derive(id, spend, k) {
  const rnd = adhRng(seedOf(id));
  const cpm = 7.4 + rnd() * 4.2;
  const impressions = Math.round(spend / cpm * 1000);
  const ctr = 0.0075 + rnd() * 0.008;
  const clicks = Math.round(impressions * ctr);
  const cvr = 0.018 + rnd() * 0.032;
  const convCh = Math.max(0, Math.round(clicks * cvr));
  const convSys = Math.round(convCh * (0.86 + rnd() * 0.09));
  const aov = 36 + rnd() * 52;
  return { impressions: impressions, clicks: clicks, ctr: ctr, cpc: clicks ? spend / clicks : 0, cpm: cpm,
    convCh: convCh, convSys: convSys, cpa: convCh ? spend / convCh : 0, roasCh: convCh * aov / (spend || 1), roasSys: convSys * aov / (spend || 1),
    value: convCh * aov, reach: Math.round(impressions / (1.35 + rnd() * 1.2)) };
}
function levelRows(lv) {
  const k = RANGES[range()].k;
  const rows = [];
  if (lv === 0) {
    const spend = D.accounts.reduce(function (a, x) { return a + adhAgg(x.series).spend; }, 0) * k;
    rows.push({ id: "meta", name: "Meta（Facebook / Instagram）", sub: "本期唯一落地渠道", spend: spend });
  } else if (lv === 1) {
    D.accounts.forEach(function (a) { rows.push({ id: String(a.id), name: a.name, sub: a.actId + " · " + a.currency + " · " + a.source, spend: adhAgg(a.series).spend * k, lag: a.lag }); });
  } else if (lv === 2) {
    D.tree.forEach(function (t) { t.campaigns.forEach(function (c) { rows.push({ id: c.id, name: c.name, sub: t.accountName + " · " + c.externalId, spend: c.spend * 30 * k / 0.55, source: c.source }); }); });
  } else if (lv === 3) {
    D.tree.forEach(function (t) { t.campaigns.forEach(function (c) { c.adsets.forEach(function (s) { rows.push({ id: s.id, name: s.name, sub: t.accountName + " · 日预算 $" + s.budget, spend: s.spend * 30 * k / 0.55 }); }); }); });
  } else if (lv === 4) {
    D.tree.forEach(function (t) { t.campaigns.forEach(function (c) { c.adsets.forEach(function (s) { s.ads.forEach(function (d) { rows.push({ id: d.id, name: d.name, sub: t.accountName + " · " + d.assetName, spend: d.spend * 30 * k / 0.55 }); }); }); }); });
  } else {
    D.assets.filter(function (a) { return a.status === "APPROVED"; }).forEach(function (a) {
      rows.push({ id: a.id, name: a.name, sub: a.id + " · " + a.type + " · " + a.ratio, spend: a.agg.spend * k });
    });
  }
  const out = rows.map(function (r) {
    const m = derive(r.id, r.spend);
    return Object.assign({}, r, m);
  });
  out.sort(function (a, b) { return b.spend - a.spend; });
  return out;
}
ADH.page("dashboard", {
  title: "数据看板", subtitle: "统一指标口径 · 多维下钻 · 双口径转化并列 · 数据时效可追溯",
  render: function () {
    const designerScope = ADH.dimensionScope() === "asset-only";
    const drill = designerScope ? 5 : Math.min(5, Number(ADH.f("drill", 0)));
    const rk = range();
    const rows = levelRows(drill);
    const tot = rows.reduce(function (o, r) {
      o.spend += r.spend; o.impressions += r.impressions; o.clicks += r.clicks; o.convCh += r.convCh; o.convSys += r.convSys; o.value += r.value; return o;
    }, { spend: 0, impressions: 0, clicks: 0, convCh: 0, convSys: 0, value: 0 });
    const ctr = tot.clicks / (tot.impressions || 1), cpc = tot.spend / (tot.clicks || 1), cpm = tot.spend / (tot.impressions || 1) * 1000;
    const roasCh = tot.value / (tot.spend || 1) * 0.98, roasSys = roasCh * 0.9;
    const days = D.accounts[0].series.map(function (r) { return r.date; });
    const kScale = RANGES[rk].k;
    const spendSeries = days.map(function (d, i) { return D.accounts.reduce(function (a, x) { return a + x.series[i].spend; }, 0) * kScale / 1; });
    const convSeries = days.map(function (d, i) { return D.accounts.reduce(function (a, x) { return a + x.series[i].conversions; }, 0) * kScale; });

    let h = "";
    /* 顶部口径与时效条 */
    h += '<div class="card mb12"><div class="card-body" style="padding:11px 14px"><div class="toolbar">' +
      '<div class="seg">' + Object.keys(RANGES).map(function (k) {
        return '<button class="' + (rk === k ? "on" : "") + '" data-act="filter" data-k="range" data-v="' + k + '">' + RANGES[k].label + "</button>";
      }).join("") + '<button data-act="date-picker">自定义区间</button></div>' +
      '<select class="select" style="width:150px" data-live="1" data-act="filter" data-k="compare">' + [["prev", "对比：上一周期"], ["yoy", "对比：去年同期"], ["custom", "对比：自定义"]].map(function (o) { return '<option value="' + o[0] + '"' + (ADH.f("compare", "prev") === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + '</select>' +
      '<select class="select" style="width:170px" data-live="1" data-act="filter" data-k="metricSet">' + [["default", "指标集：默认（10 项）"], ["conv", "指标集：转化向（CPA / ROAS）"], ["brand", "指标集：品牌向（CPM / 频次）"], ["asset", "指标集：素材向（CTR / CVR / 样本量）"]].map(function (o) { return '<option value="' + o[0] + '"' + (ADH.f("metricSet", "default") === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + '</select>' +
      '<div style="flex:1"></div>' +
      '<span class="chip plain">币种 USD（BR-115 汇率可追溯）</span>' +
      '<button class="btn sm" data-act="dash-refresh">' + ADH.icon("refresh", 13) + "重跑指定日期</button>" +
      (ADH.can("dashboard.export") ? '<button class="btn primary sm" data-act="dash-export">' + ADH.icon("download", 13) + "导出报表</button>" : '<button class="btn sm disabled" title="' + ADH.LOCK_REASON["dashboard.export"] + '">' + ADH.icon("lock", 13) + "导出</button>") +
      "</div></div>";
    /* 时效提示 BR-119 / BR-120 */
    h += '<div class="card-body" style="padding:0 14px 12px"><div class="flex gap8 wrap">' +
      '<span class="chip info">' + ADH.icon("clock", 12) + "渠道数据截止 " + D.env.freshness.channel + "</span>" +
      '<span class="chip brand">' + ADH.icon("clock", 12) + "归因数据截止 " + D.env.freshness.attribution + "</span>" +
      '<span class="chip warn">' + D.env.freshness.lagAccounts + " 个账户数据未就绪（已在列表标记，避免误读为 0）</span>" +
      '<span class="chip neutral">洞察日粒度次日 08:00 前完成（BR-121）</span>' +
      "</div></div></div>";

    /* 我的视图 FR-POST-17 */
    h += ADH.viewsBar();

    if (designerScope) h += ADH.note("warn", "当前角色（" + ADH.roleLabel() + "）的数据权限", "designer 仅可见<b>素材维度</b>看板，无法查看账户 / 计划维度的数据；导出同样仅限素材维度（PRD 3.2 权限矩阵）。") + '<div class="mt12"></div>';

    /* 指标卡 */
    h += '<div class="grid g6 mb12">' +
      ADH.stat({ label: "消耗", value: "$" + ADH.num(tot.spend, 0), def: "spend", foot: ADH.delta(0.084) + '<span class="muted">环比</span>', spark: ADH.spark(spendSeries.slice(-14), "#3355ff") }) +
      ADH.stat({ label: "曝光", value: ADH.short(tot.impressions), def: "impressions", foot: ADH.delta(-0.021) + '<span class="muted">环比</span>' }) +
      ADH.stat({ label: "点击", value: ADH.short(tot.clicks), def: "clicks", foot: ADH.delta(0.036) + '<span class="muted">环比</span>' }) +
      ADH.stat({ label: "CTR", value: ADH.pct(ctr, 2), def: "ctr", foot: ADH.delta(0.058) + '<span class="muted">环比</span>' }) +
      ADH.stat({ label: "CPC", value: "$" + cpc.toFixed(2), def: "cpc", foot: ADH.delta(-0.012) + '<span class="muted">环比</span>' }) +
      ADH.stat({ label: "CPM", value: "$" + cpm.toFixed(2), def: "cpm", foot: ADH.delta(0.031) + '<span class="muted">环比</span>' }) +
      ADH.stat({ label: "转化数（双口径）", dual: '<div class="row"><b class="mono" style="font-size:15px">' + ADH.num(tot.convCh) + '</b><span class="xs muted">渠道归因</span></div><div class="row"><b class="mono" style="font-size:15px">' + ADH.num(tot.convSys) + '</b><span class="xs muted">系统归因</span></div>',
        def: "conversions", foot: '<span class="muted">BR-112 必须同时展示</span>' }) +
      ADH.stat({ label: "CPA", value: "$" + (tot.spend / (tot.convCh || 1)).toFixed(2), def: "cpa", foot: ADH.delta(-0.045) + '<span class="muted">环比</span>' }) +
      ADH.stat({ label: "ROAS（双口径）", dual: '<div class="row"><b class="mono" style="font-size:15px">' + roasCh.toFixed(2) + '</b><span class="xs muted">渠道</span></div><div class="row"><b class="mono" style="font-size:15px">' + roasSys.toFixed(2) + '</b><span class="xs muted">系统</span></div>', def: "roas", foot: '<span class="muted">目标 2.00</span>' }) +
      ADH.stat({ label: "频次", value: (tot.impressions / (tot.impressions / 1.8) ).toFixed(2), def: "frequency", foot: ADH.delta(0.017) + '<span class="muted">环比</span>' }) +
      "</div>";

    /* 下钻路径 */
    h += '<div class="card mb12"><div class="card-head"><h3>' + ADH.icon("flow", 15) + '下钻路径<span class="desc">BR-116 保持筛选上下文，下钻不丢失时间与筛选项</span></h3><div class="right">' +
      '<div class="seg">' + LEVELS.map(function (l, i) {
        if (designerScope && i !== 5) return "";
        return '<button class="' + (drill === i ? "on" : "") + '" data-act="filter" data-k="drill" data-v="' + i + '">' + l + "</button>";
      }).join("") + "</div></div></div>" +
      '<div class="card-body" style="padding:10px 14px"><div class="flex center gap8 wrap">' +
      '<span class="xs muted">当前层级</span>' + LEVELS.slice(0, drill + 1).map(function (l, i) {
        return (i ? '<span class="tb-crumbs sep">›</span>' : "") + '<span class="' + (i === drill ? "chip brand" : "link small") + '"' + (i < drill ? ' data-act="filter" data-k="drill" data-v="' + i + '"' : "") + ">" + l + "</span>";
      }).join("") +
      '<span class="xs muted" style="margin-left:12px">时间：' + RANGES[rk].label + " · 筛选：账户组=北美主力组 · 渠道=meta（下钻时保持）</span>" +
      "</div></div></div>";

    /* 趋势 + 维度 */
    h += '<div class="grid g-3-2 mb12"><div class="card"><div class="card-head"><h3>消耗与转化趋势</h3><div class="right legend">' +
      '<span><i style="background:#3355ff"></i>消耗（USD）</span><span><i style="background:#12b76a"></i>转化数（渠道口径）</span><span><i style="background:#f79009"></i>转化数（系统口径）</span></div></div>' +
      '<div class="card-body">' + ADH.lineChart(days, [
        { name: "消耗", color: "#3355ff", vals: spendSeries, fill: 1 },
        { name: "渠道转化", color: "#12b76a", vals: convSeries.map(function (v) { return v * 8; }) },
        { name: "系统转化", color: "#f79009", vals: convSeries.map(function (v) { return v * 7.2; }) }
      ], { height: 210 }) + '<div class="xs muted mt8">注：转化曲线按同一纵轴缩放显示，用于观察趋势一致性；实际数值以表格与指标卡为准。</div></div></div>' +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("grid", 15) + "维度切换</h3></div><div class=\"card-body\">" +
      ADH.tbl("tbl-dim", [{ label: "维度类别" }, { label: "可选维度" }], [
        { c: ["组织维度", '<span class="xs">渠道 → 广告账户 → Campaign → AdSet → Ad → 素材</span>'] },
        { c: ["受众维度", '<span class="xs">受众名称、年龄、性别、地域</span>'] },
        { c: ["版位维度", '<span class="xs">Feed / Story / Reels、设备、操作系统</span>'] },
        { c: ["自定义维度", '<span class="xs">来自命名反向解析的字段（目标、素材类型、受众标签）</span>'] },
        { c: ["时间维度", '<span class="xs">日 / 周 / 月 / 自定义区间</span>'] }
      ], { tight: true }) +
      '<div class="mt12">' + ADH.note("info", "指标口径可查（FR-POST-16）", "所有指标均可查看定义；点击表格/指标卡旁的「口径」标签查看指标定义与数据来源。") + "</div>" +
      "</div></div></div>";

    /* 明细表 */
    const cols = [{ label: LEVELS[drill] }, { label: "消耗", cls: "num" }, { label: "曝光", cls: "num" }, { label: "点击", cls: "num" },
      { label: "CTR", cls: "num" }, { label: "CPC", cls: "num" }, { label: "CPM", cls: "num" },
      { label: "转化（渠道）", cls: "num" }, { label: "转化（系统）", cls: "num" }, { label: "CPA", cls: "num" }, { label: "ROAS", cls: "num" }, { label: "" }];
    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("list", 15) + "明细数据 · 按 " + LEVELS[drill] + ' 分组<span class="desc">BR-117 超出单页上限时降级为导出；BR-118 每个单元格可追溯来源</span></h3>' +
      '<div class="right"><span class="xs muted">共 ' + rows.length + " 行</span></div></div>" +
      ADH.tbl("tbl-dash", cols, rows.map(function (r) {
        return {
          c: ['<div><b>' + r.name + '</b>' + (r.lag ? ' <span class="chip warn">数据未就绪</span>' : "") + (r.source === "EXTERNAL" ? ' <span class="chip neutral">外部创建</span>' : "") + '<div class="xs muted mono">' + ADH.esc(r.sub) + "</div></div>",
            ADH.num(r.spend, 2), ADH.short(r.impressions), ADH.short(r.clicks), ADH.pct(r.ctr, 2), "$" + r.cpc.toFixed(2), "$" + r.cpm.toFixed(2),
            ADH.num(r.convCh), '<span style="color:var(--brand-2)">' + ADH.num(r.convSys) + "</span>", "$" + r.cpa.toFixed(2), r.roasCh.toFixed(2),
            '<button class="btn xs" data-act="drill-into" data-v="' + r.id + '">下钻</button>'],
          v: [r.name, r.spend, r.impressions, r.clicks, r.ctr, r.cpc, r.cpm, r.convCh, r.convSys, r.cpa, r.roasCh, ""]
        };
      }), { sortable: true, pageSize: 10, empty: "无数据" }) + "</div>";
    return h;
  }
});
ADH.action("date-picker", function () { ADH.toast("自定义时间区间", "info", "支持自定义区间与对比（上一周期 / 去年同期 / 自定义）"); });
ADH.action("dash-refresh", function () {
  ADH.toast("已触发表指定日期重跑", "ok", "FR-POST-20 支持手工触发指定日期数据重跑；BR-122 渠道数据回溯修订时按「以渠道最新为准」覆盖并记录修订日志");
});
ADH.action("dash-export", function () {
  if (!ADH.assertPerm("dashboard.export")) return;
  ADH.toast("已创建导出任务", "ok", "BR-129 异步导出，完成后通知；BR-130 越权范围的行不会出现在文件中；BR-131 文件包含口径说明与生成信息");
  ADH.routeTo("exports");
});
ADH.action("drill-into", function (p) {
  const cur = Math.min(5, Number(ADH.f("drill", 0)));
  if (cur === 5) { ADH.toast("已在最细粒度", "info", "素材层级为下钻终点；BR-117 明细超上限时降级为导出"); return; }
  ADH.set("drill", String(cur + 1));
  ADH.render();
  ADH.toast("已下钻到 " + LEVELS[cur + 1] + " 层级", "info", "BR-116：时间范围与筛选项已保留");
});
ADH.action("cell-source", function () {
  ADH.toast("指标来源追溯（BR-118）", "info", "该单元格指标可追溯：原始同步记录 2026-09-20 08:00（Insights 异步报表任务 insight_88213）+ 系统计算过程（消耗/点击）");
});
})();
/* ---------------- 预算分配 ---------------- */
(function () {
const D = ADH_DATA;
ADH.page("budget", {
  title: "预算分配", subtitle: "按计划 / 受众 / 素材对比消耗与效果 · 归一化对比 · 建议不自动执行",
  render: function () {
    const by = ADH.f("by", "campaign");
    const norm = ADH.f("norm", "on");
    const k = 1;
    let base = [];
    if (by === "audience") {
      base = D.audiences.map(function (a) { return { name: a.name, spend: a.size / 22000, roas: 1.6 + (a.size % 7) / 10, cpa: 12 + (a.size % 9) }; });
    } else if (by === "asset") {
      base = D.assets.slice(0, 10).map(function (a) { return { name: a.name, spend: a.agg.spend, roas: a.agg.roas, cpa: a.agg.cpa }; });
    } else {
      base = [];
      D.tree.forEach(function (t) { t.campaigns.forEach(function (c) { base.push({ name: c.name, account: t.accountName, spend: c.spend * 30 / 0.55, roas: 1.4 + (c.spend % 5) / 2, cpa: 9 + (c.spend % 7) }); }); });
    }
    const maxSpend = Math.max.apply(null, base.map(function (x) { return x.spend; }));
    const totSpend = base.reduce(function (a, x) { return a + x.spend; }, 0);
    const hiLo = base.filter(function (x) { return x.spend > maxSpend * 0.55 && x.roas < 1.8; });
    const loHi = base.filter(function (x) { return x.spend < maxSpend * 0.25 && x.roas > 2.6; });
    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "总消耗", value: "$" + ADH.num(totSpend, 0), foot: '<span class="muted">近 30 天 · 按 ' + (by === "audience" ? "受众" : by === "asset" ? "素材" : "计划") + " 维度拆分</span>" }) +
      ADH.stat({ label: "高消耗低效果", value: hiLo.length, unit: "个", foot: '<span style="color:var(--warn)">消耗占比 &gt; 55% 且 ROAS &lt; 1.8</span>' }) +
      ADH.stat({ label: "低消耗高效果", value: loHi.length, unit: "个", foot: '<span style="color:var(--ok)">可优先加量</span>' }) +
      ADH.stat({ label: "归一化对比", value: norm === "on" ? "已开启" : "已关闭", foot: '<span class="muted">BR-123 消除账户规模差异</span>' }) + "</div>";

    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("pie", 15) + '预算分配视图<span class="desc">' + (norm === "on" ? "已按账户归一切换，避免大账户永远占优" : "未归一：大账户天然占优") + "</span></h3><div class=\"right\">" +
      '<div class="seg">' + [["campaign", "按计划"], ["audience", "按受众"], ["asset", "按素材"]].map(function (x) {
        return '<button class="' + (by === x[0] ? "on" : "") + '" data-act="filter" data-k="by" data-v="' + x[0] + '">' + x[1] + "</button>";
      }).join("") + "</div>" +
      '<button class="btn sm" data-act="filter" data-k="norm" data-v="' + (norm === "on" ? "off" : "on") + '">' + ADH.icon("split", 13) + "按账户归一：" + (norm === "on" ? "开" : "关") + "</button></div></div>";
    h += '<div class="card-body"><div class="grid g-3-2"><div>' +
      ADH.hbars(base.slice(0, 10).map(function (x) {
        return { name: x.name, total: x.spend, fmt: "$" + ADH.num(x.spend, 0), color: x.roas < 1.8 ? "#f79009" : (x.roas > 2.6 ? "#0b9e6a" : "#3355ff") };
      })) + "</div><div>" +
      ADH.donut(base.slice(0, 6).map(function (x, i) {
        return { label: x.name, v: x.spend, color: ["#3355ff", "#7c3aed", "#0b9e6a", "#c2780a", "#0b7ec4", "#d92d20"][i % 6] };
      })) +
      '<div class="legend mt12">' + base.slice(0, 6).map(function (x, i) {
        return '<span><i style="background:' + ["#3355ff", "#7c3aed", "#0b9e6a", "#c2780a", "#0b7ec4", "#d92d20"][i % 6] + '"></i>' + x.name.slice(0, 16) + "</span>";
      }).join("") + "</div></div></div></div>";

    h += '<div class="card-body" style="border-top:1px solid var(--line)">' + ADH.sec("预算与效果偏差提示（FR-POST-22）") +
      '<div class="grid g2">' +
      ADH.note("warn", "高消耗低效果（" + hiLo.length + " 个）", hiLo.map(function (x) { return "· " + x.name + "（消耗 $" + ADH.num(x.spend, 0) + "，ROAS " + x.roas.toFixed(2) + "）"; }).join("<br/>") || "无") +
      ADH.note("ok", "低消耗高效果（" + loHi.length + " 个）", loHi.map(function (x) { return "· " + x.name + "（消耗 $" + ADH.num(x.spend, 0) + "，ROAS " + x.roas.toFixed(2) + "）"; }).join("<br/>") || "无") +
      "</div>" + ADH.sec("预算调整建议（FR-POST-23）") +
      ADH.tbl("tbl-sug", [{ label: "对象" }, { label: "当前消耗", cls: "num" }, { label: "ROAS", cls: "num" }, { label: "建议方向" }, { label: "建议依据（BR-125）" }, { label: "" }],
        base.slice(0, 6).map(function (x) {
          const up = x.roas > 2.4;
          return {
            c: [x.name, ADH.num(x.spend, 0), x.roas.toFixed(2),
              up ? ADH.chip("ok", "建议加量 +20%") : (x.roas < 1.8 ? ADH.chip("warn", "建议减量 / 暂停") : ADH.chip("neutral", "维持观察")),
              '<span class="xs muted">命中规则 ' + (x.roas < 1.8 ? "R-01 低效计划止损（近 3 天消耗 ≥ 50 且 ROAS < 1.0）" : "R-02 高潜计划加预算（近 3 天 ROAS ≥ 3.0）") + "；对比基准：账户组中位数 ROAS 2.07</span>",
              '<button class="btn xs" data-act="sug-apply" data-v="' + ADH.esc(x.name) + '">查看依据</button>'],
            v: [x.name, x.spend, x.roas, up ? 1 : 0, "", ""]
          };
        }), { sortable: true, tight: true }) +
      '<div class="mt12">' + ADH.note("danger", "BR-124 建议不自动执行", "推荐调整仅作为建议展示，<b>不自动执行</b>；自动执行必须走规则引擎并遵循其安全阀（生效时间段 / 单次影响上限 / 单日调整幅度上限 / 冷静期）。") + "</div>" +
      "</div></div>";
    return h;
  }
});
ADH.action("sug-apply", function (p) {
  ADH.overlay({
    kind: "modal", title: "建议依据 · " + p.v,
    body: ADH.sec("命中依据（BR-125）") + ADH.kv([["命中规则", "R-01 低效计划止损"], ["观察窗口", "近 3 天（2026-09-17 → 2026-09-19）"],
      ["指标快照", "消耗 82.40 USD · ROAS 0.68 · 曝光 24,180 · 转化 6"], ["对比数据", "账户组中位数 ROAS 2.07 / 中位数 CPA $14.20"],
      ["数据时间戳", D.env.freshness.channel + "（BR-75 数据未就绪时跳过评估）"]]) +
      ADH.sec("建议动作") + ADH.note("info", "仅建议，不自动执行", "如需自动执行，请将该判断配置为规则并启用（规则引擎含演练 / 观察模式与安全阀）。"),
    foot: '<button class="btn" data-act="overlay-close">关闭</button><div class="grow"></div><button class="btn primary" data-act="goto" data-page="rules">去规则引擎配置</button>'
  });
});
})();

/* ---------------- 素材效果 ---------------- */
(function () {
const D = ADH_DATA;
ADH.page("asset-perf", {
  title: "素材效果", subtitle: "效果排行 · 生命周期 · 疲劳预警 · 样本量标注",
  render: function () {
    const list = D.assets.filter(function (a) { return a.status === "APPROVED" || a.status === "REJECTED"; });
    const ranked = list.slice().sort(function (a, b) { return b.agg.roas - a.agg.roas; });
    const small = list.filter(function (a) { return a.agg.impressions < 30000; });
    const fatigue = list.filter(function (a) { return a.durability === "萎靡"; });
    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "在投素材", value: list.length, unit: "个", foot: '<span class="muted">已批准 + 已拒审</span>' }) +
      ADH.stat({ label: "最佳 ROAS", value: ranked[0].agg.roas.toFixed(2), foot: '<span class="muted">' + ranked[0].name + "</span>" }) +
      ADH.stat({ label: "疲劳预警", value: fatigue.length, unit: "个", foot: '<span style="color:var(--warn)">曝光量级 + CTR 衰减双条件</span>' }) +
      ADH.stat({ label: "样本不足已剔除", value: small.length, unit: "个", foot: '<span class="muted">BR-126 避免小样本结论误导</span>' }) + "</div>";

    h += '<div class="card mb12"><div class="card-head"><h3>' + ADH.icon("trend", 15) + '素材效果排行<span class="desc">BR-126 剔除样本量不足并标注样本量</span></h3>' +
      '<div class="right"><div class="seg"><button class="on">按 ROAS</button><button data-act="ap-sort" data-v="ctr">按 CTR</button><button data-act="ap-sort" data-v="cvr">按 CVR</button></div></div></div>' +
      ADH.tbl("tbl-ap", [{ label: "素材" }, { label: "消耗", cls: "num" }, { label: "ROI", cls: "num" }, { label: "曝光", cls: "num" }, { label: "样本量" }, { label: "CTR", cls: "num" }, { label: "CVR", cls: "num" }, { label: "ROAS", cls: "num" }, { label: "生命周期" }, { label: "" }],
        ranked.map(function (a) {
          const low = a.agg.impressions < 30000;
          const cvr = a.agg.conversions / (a.agg.clicks || 1);
          return {
            c: ['<b>' + a.name + '</b><div class="xs muted mono">' + a.id + " · " + a.type + " · " + a.ratio + " · " + a.tags.join("/") + "</div>",
              ADH.num(a.agg.spend, 2), ADH.roiHtml(a.agg.roas), ADH.short(a.agg.impressions),
              low ? ADH.chip("warn", "样本不足 · 已折叠") : ADH.chip("ok", "样本充足"),
              ADH.pct(a.agg.ctr, 2), ADH.pct(cvr, 2), a.agg.roas.toFixed(2),
              a.durability === "萎靡" ? ADH.chip("danger", "衰退") : (a.durability === "爬坡" ? ADH.chip("info", "爬坡") : ADH.chip("ok", "稳定")),
              '<button class="btn xs" data-act="ap-detail" data-v="' + a.id + '">详情</button>'],
            v: [a.name, a.agg.spend, ADH.roi(a.agg.roas), a.agg.impressions, low ? 0 : 1, a.agg.ctr, cvr, a.agg.roas, a.durability, ""]
          };
        }), { sortable: true, pageSize: 10, zebra: true }) + "</div>";

    h += '<div class="grid g-3-2">' +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("chart", 15) + '素材生命周期（上线 — 爬坡 — 衰退）</h3><div class="right"><select class="select" style="width:190px" data-act="filter" data-k="life">' +
      fatigue.concat(ranked.slice(0, 3)).slice(0, 5).map(function (a, i) { return '<option value="' + a.id + '"' + (i === 0 ? " selected" : "") + ">" + a.name + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="card-body">' + ADH.lineChart(D.assets[0].series.map(function (r) { return r.date; }), [
        { name: "CTR", color: "#3355ff", vals: D.assets[0].series.map(function (r) { return r.clicks / r.impressions * 100; }), fill: 1 },
        { name: "频次", color: "#f79009", vals: D.assets[0].series.map(function (r) { return r.frequency * 1.2; }) }
      ], { height: 190 }) + '<div class="xs muted mt8">爬坡期 CTR 上升；衰退期 CTR 下降同时频次上升（触达重合度升高）。</div></div></div>' +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("warn", 15) + "疲劳预警</h3></div><div class=\"card-body\">" +
      ADH.note("rule", "BR-128 疲劳判定条件", "必须<b>同时</b>参考曝光量级与 CTR 衰减幅度，不允许仅凭 CTR 下降判定。判定规则（R-03）：近 3 天 CTR 环比下降 ≥ 30% 且曝光 ≥ 10,000。") +
      '<div class="mt12">' + ADH.tbl("tbl-fat", [{ label: "素材" }, { label: "曝光" }, { label: "CTR 变化" }, { label: "标注" }],
        fatigue.map(function (a) { return { c: [a.name, ADH.short(a.agg.impressions), '<span style="color:var(--danger)">−39.2%</span>', ADH.chip("warn", "待迭代")] }; }), { tight: true }) + "</div>" +
      ADH.sec("素材标签化归因（FR-POST-30）") + ADH.hbars([
        { name: "霸总", total: 3.42, fmt: "ROAS 3.42", color: "#0b9e6a" },
        { name: "复仇", total: 2.86, fmt: "ROAS 2.86", color: "#3355ff" },
        { name: "甜宠", total: 2.31, fmt: "ROAS 2.31", color: "#7c3aed" },
        { name: "悬疑", total: 1.94, fmt: "ROAS 1.94", color: "#0b7ec4" },
        { name: "重生", total: 1.62, fmt: "ROAS 1.62", color: "#c2780a" },
        { name: "萌宝", total: 1.28, fmt: "ROAS 1.28", color: "#d92d20" }
      ]) + "</div></div></div>";
    return h;
  }
});
ADH.action("ap-sort", function () { ADH.toast("已切换排序口径", "info", "排行支持按 CTR / CVR / ROAS 切换；样本量不足的素材始终标注并折叠"); });
ADH.action("ap-detail", function (p) { ADH.action("asset-detail", { v: p.v }); });
})();
/* ---------------- 归因明细与对账 ---------------- */
(function () {
const D = ADH_DATA;
ADH.page("attr-detail", {
  title: "归因明细与对账", subtitle: "归因窗口 · 归因模型口径 · 事件去重 · 与渠道侧对账",
  render: function () {
    const windowVer = ADH.f("wv", "W2");
    const model = ADH.f("model", "last");
    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "原始事件（近 24h）", value: ADH.short(386420), unit: "条", foot: '<span class="muted">SDK + S2S 双链路</span>' }) +
      ADH.stat({ label: "去重后", value: ADH.short(372108), unit: "条", foot: '<span class="muted">BR-83 事件ID+渠道+事件名+时间窗</span>' }) +
      ADH.stat({ label: "归因命中", value: "91.2%", foot: '<span class="muted">未命中进入未映射池</span>' }) +
      ADH.stat({ label: "对账差异（2026-09-19）", value: "7.6%", foot: '<span class="muted">阈值 20% · 未告警</span>' }) + "</div>";

    h += '<div class="card mb12"><div class="card-head"><h3>' + ADH.icon("flow", 15) + '归因口径配置<span class="desc">窗口与模型均为「配置变更」，只影响变更后数据</span></h3><div class="right">' +
      '<select class="select" style="width:230px" data-act="filter" data-k="wv"><option value="W2"' + (windowVer === "W2" ? " selected" : "") + '>归因窗口版本 W2（点击 7 天 / 曝光 1 天）</option><option value="W1"' + (windowVer === "W1" ? " selected" : "") + '>窗口版本 W1（点击 1 天 / 曝光 0 天）</option></select>' +
      '<select class="select" style="width:230px" data-act="filter" data-k="model"><option value="last"' + (model === "last" ? " selected" : "") + '>归因模型：末次点击（当前支持）</option><option value="multi"' + (model === "multi" ? " selected" : "") + '>多触点 / 时序（未开放）</option><option value="inc"' + (model === "inc" ? " selected" : "") + '>增量归因（未开放）</option></select></div></div>' +
      '<div class="card-body"><div class="grid g3">' +
      ADH.note("info", "BR-84 / BR-85 窗口", "支持按渠道、按事件类型分别配置归因窗口，默认「点击 7 天 / 曝光 1 天」；窗口变更是配置变更，<b>只对变更后发生的转化生效</b>，历史数据按当时配置冻结，不允许回溯重算。") +
      ADH.note("info", "BR-86 / BR-87 / BR-88 版本与逾期", "每个归因结果必须记录所用窗口配置版本号；超出窗口的转化不入归因明细，计入<b>逾期转化统计</b>（用于评估窗口是否合理）；看板中所有归因类指标需标注所用窗口。") +
      ADH.note("warn", "BR-90 / BR-91 模型口径", "归因模型选择在<b>看板层</b>作为可切换口径，不改变底层明细数据；同一指标的多个归因口径必须同时可见并标注口径名称。") +
      "</div>" +
      '<div class="mt12">' + ADH.tbl("tbl-model2", [{ label: "归因模型" }, { label: "核心逻辑" }, { label: "适用场景" }, { label: "本期支持程度" }], [
        { c: ["Last Click（末次点击）", "转化前最后一次点击归功该广告", "效果广告，日常主用口径", ADH.chip("ok", "当前支持：按点击标识匹配")] },
        { c: ["多触点 / 时序归因", "按接触点贡献分配权重", "跨剧集预算分配", ADH.chip("info", "未开放：需留存全接触点链路")] },
        { c: ["增量归因", "投放组 vs 对照组的转化差值", "证明广告真实有效，防止把自然量算成广告功劳", ADH.chip("neutral", "未开放：需支持实验分组标记")] }
      ], { tight: true }) + "</div>" +
      '<div class="mt8 xs muted">BR-89 归因明细表必须同时存储「末次点击归因结果」与「完整触达链路」，后者用于未来多触点模型回溯；BR-92 增量归因所需的对照组标识字段 <span class="tag-code">is_control</span> 已在事件与投放对象上预留（本期允许为空）。</div></div></div>';

    h += '<div class="card mb12"><div class="card-head"><h3>' + ADH.icon("list", 15) + '原始事件与归因明细<span class="desc">BR-83 去重、BR-93/94 首次归因与再归因、BR-102~104 跨端与隐私</span></h3>' +
      '<div class="right"><button class="btn sm" data-act="privacy-del">用户数据删除请求</button></div></div>' +
      ADH.tbl("tbl-ev", [{ label: "事件" }, { label: "事件名" }, { label: "时间" }, { label: "点击标识" }, { label: "用户标识（哈希）" }, { label: "归因到的计划 / 素材" }, { label: "归因序号" }, { label: "去重" }, { label: "ATT 授权" }, { label: "窗口版本" }, { label: "价值", cls: "num" }],
        D.attrEvents.map(function (e) {
          const dup = e.dedup.indexOf("重复") === 0;
          return {
            c: ['<span class="tag-code">' + e.id + "</span>", '<b>' + e.name + "</b>", '<span class="mono xs">' + e.at + "</span>", '<span class="mono xs">' + e.clickId + "</span>",
              '<span class="mono xs">' + e.userId + "</span>", e.campaign === "—（未映射）" ? '<span style="color:var(--warn)">未映射（进入未映射池）</span>' : '<span class="xs">' + e.campaign + '<br/>' + e.asset + "</span>",
              e.seq === "—" ? '<span class="muted">—</span>' : ADH.chip("brand", e.seq), dup ? ADH.chip("warn", e.dedup) : ADH.chip("ok", e.dedup),
              e.attStatus === "AUTHORIZED" ? ADH.chip("info", "已授权") : ADH.chip("neutral", "未授权（降级归因）"),
              '<span class="tag-code">' + e.windowVer + "</span>", e.value ? ADH.num(e.value, 2) : "—"],
            v: [e.id, e.name, e.at, e.clickId, e.userId, e.campaign, e.seq, e.dedup, e.attStatus, e.windowVer, e.value]
          };
        }), { sortable: true, pageSize: 8, zebra: true }) + "</div>";

    h += '<div class="grid g-3-2">' +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("flow", 15) + '归因对账（7.1.10 / AC-14）</h3><div class="right"><span class="xs muted">差异阈值 20%</span></div></div>' +
      ADH.tbl("tbl-recon", [{ label: "日期" }, { label: "渠道消耗", cls: "num" }, { label: "系统消耗", cls: "num" }, { label: "消耗差异", cls: "num" }, { label: "渠道转化", cls: "num" }, { label: "系统归因转化", cls: "num" }, { label: "转化差异", cls: "num" }, { label: "告警" }, { label: "差异原因" }],
        D.recon.map(function (r) {
          return {
            c: ["<b>" + r.date + "</b>", ADH.num(r.spendChannel, 2), ADH.num(r.spendSys, 2), ADH.pct(r.diffSpend, 2), ADH.num(r.convChannel), ADH.num(r.convSys),
              '<b style="color:' + (r.alarm ? "var(--danger)" : "var(--ink)") + '">' + ADH.pct(r.diffConv, 1) + "</b>",
              r.alarm ? ADH.chip("danger", "超阈值") : ADH.chip("ok", "正常"), '<span class="xs muted">' + r.note + "</span>"],
            v: [r.date, r.spendChannel, r.spendSys, r.diffSpend, r.convChannel, r.convSys, r.diffConv, r.alarm, r.note]
          };
        }), { sortable: true, tight: true }) +
        '<div class="card-body" style="border-top:1px solid var(--line)">' + ADH.note("warn", "AC-14 / AC-15 对账验收口径", "每日生成对账报表，差异超阈值时告警并给出差异原因分类，可下钻到明细；任选 3 个账户，看板 30 天消耗合计与渠道后台差异 ≤ 0.5%（币种换算除外）。") + "</div></div>" +
      '<div class="grid" style="gap:12px">' +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("users", 15) + "跨端与隐私合规</h3></div><div class=\"card-body\">" +
      ADH.tbl("tbl-cd", [{ label: "项目" }, { label: "当前状态" }], [
        { c: ["跨端未归并转化", ADH.chip("warn", "312 单（1.8%）")] },
        { c: ["iOS ATT 未授权占比", ADH.chip("info", "42.6%")] },
        { c: ["跨端识别优先级", '<span class="xs">登录账号 ID（哈希）→ 渠道跨端标识 → （指纹方案本期不实现）</span>'] },
        { c: ["跨端归并规则", '<span class="xs">可配置且可关闭（BR-104）</span>'] },
        { c: ["数据最小化", '<span class="xs">仅采集归因必需字段；明文一律哈希；留存期限可配置</span>'] },
        { c: ["用户撤回同意", '<span class="xs">支持按用户标识删除 / 匿名化并记录操作</span>'] }
      ], { tight: true }) + "</div></div>" +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("shield", 15) + '对账差异原因分类</h3></div><div class="card-body">' +
      ADH.hbars([
        { name: "iOS ATT 未授权", total: 62, fmt: "62%", color: "#c2780a" },
        { name: "跨端未归并", total: 18, fmt: "18%", color: "#0b7ec4" },
        { name: "未映射事件", total: 12, fmt: "12%", color: "#d92d20" },
        { name: "窗口外逾期转化", total: 5, fmt: "5%", color: "#7c3aed" },
        { name: "其他", total: 3, fmt: "3%", color: "#94a3b8" }
      ]) + '<div class="mt12">' + ADH.note("info", "逾期转化统计（BR-87）", "超出归因窗口的转化不计入归因明细，但计入逾期转化统计，用于评估窗口配置是否合理。") + "</div></div></div>" +
      "</div></div>";
    return h;
  }
});
ADH.action("privacy-del", function () {
  ADH.overlay({
    kind: "modal", title: "用户数据删除 / 匿名化请求",
    body: ADH.note("warn", "合规要求", "用户撤回同意时须支持按用户标识删除或匿名化归因数据，并记录操作（审计日志）。操作不可逆。") +
      '<div class="mt12 field"><label>用户标识（哈希值，禁止输入明文个人信息）</label><input class="input mono" placeholder="u_h8f2a…" /></div>' +
      '<div class="mt8">' + ADH.note("info", "BR-143", "审计日志禁止记录明文令牌与个人信息。") + "</div>",
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn danger" data-act="overlay-close">确认删除 / 匿名化</button>'
  });
});
})();

/* ---------------- 报表与导出 ---------------- */
(function () {
const D = ADH_DATA;
ADH.page("exports", {
  title: "报表导出", subtitle: "统一走异步任务 · 权限校验 · 口径说明随文件附带",
  render: function () {
    const running = D.exports.filter(function (e) { return e.status === "RUNNING"; }).length;
    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "导出任务", value: D.exports.length, unit: "个", foot: '<span class="muted">近 7 天</span>' }) +
      ADH.stat({ label: "进行中", value: running, unit: "个", foot: '<span class="muted">异步生成，完成后通知</span>' }) +
      ADH.stat({ label: "可下载", value: D.exports.filter(function (e) { return e.status === "DONE"; }).length, unit: "个", foot: '<span class="muted">链接有效期 7 天</span>' }) +
      ADH.stat({ label: "单次上限", value: "100 万行", foot: '<span class="muted">超出提示拆分（BR-132）</span>' }) + "</div>";

    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("download", 15) + "导出任务列表</h3><div class=\"right\">" +
      (ADH.can("dashboard.export") ? '<button class="btn primary sm" data-act="export-new">' + ADH.icon("plus", 13) + "新建导出</button>" : '<button class=\"btn sm disabled\" title=\"' + ADH.LOCK_REASON["dashboard.export"] + '\">' + ADH.icon("lock", 13) + "新建导出</button>") + "</div></div>" +
      ADH.tbl("tbl-exp", [{ label: "任务" }, { label: "维度" }, { label: "指标集" }, { label: "时间范围" }, { label: "行数", cls: "num" }, { label: "状态" }, { label: "生成人" }, { label: "生成时间" }, { label: "有效期" }, { label: "" }],
        D.exports.map(function (e) {
          return {
            c: ['<b class="mono">' + e.id + "</b>", '<span class="xs">' + e.dim + "</span>", '<span class="xs muted">' + e.metrics + "</span>",
              '<span class="mono xs">' + e.range + "</span>", e.rows ? ADH.num(e.rows) : "—",
              e.status === "DONE" ? ADH.chip("ok", "已完成") : (e.status === "RUNNING" ? ADH.chip("brand", "生成中 " + e.progress + "%") : ADH.chip("danger", "失败")),
              '<span class="xs">' + e.by + "</span>", '<span class="mono xs">' + e.at + "</span>",
              e.status === "DONE" ? '<span class="mono xs">' + e.expireAt + "</span>" : '<span class="xs muted">' + (e.failReason || "—") + "</span>",
              e.status === "DONE" ? '<button class="btn xs" data-act="export-download" data-v="' + e.id + '">下载</button>' : '<button class="btn xs" data-act="export-detail" data-v="' + e.id + '">详情</button>'],
            v: [e.id, e.dim, e.metrics, e.range, e.rows, e.status, e.by, e.at, e.expireAt, ""]
          };
        }), { sortable: true, pageSize: 8 }) +
      '<div class="card-body" style="border-top:1px solid var(--line)"><div class="grid g2">' +
      ADH.note("rule", "BR-130 / BR-133 权限与审计", "导出必须校验数据权限，越权范围的行不出现在文件中；导出行为写入审计日志（谁、导出了什么范围的数据）。") +
      ADH.note("info", "BR-131 文件必含信息", "导出的文件需包含：数据口径说明、时间范围、生成时间、生成人。") + "</div></div></div>";
    return h;
  }
});
ADH.action("export-new", function () {
  if (!ADH.assertPerm("dashboard.export")) return;
  ADH.overlay({
    kind: "modal", wide: true, title: "新建导出任务", desc: "统一走异步任务，完成后生成下载链接并通知（有效期 7 天）",
    body: ADH.sec("导出范围") + '<div class="grid g2">' +
      '<div class="field"><label>维度</label><select class="select"><option>账户 → Campaign（2 层）</option><option>账户 → Campaign → AdSet → Ad（4 层）</option><option>素材维度</option><option>版位 × 设备 × 操作系统</option><option>归因明细（计划下钻）</option></select></div>' +
      '<div class="field"><label>指标集</label><select class="select"><option>默认（消耗/曝光/点击/CTR/CPC/CPM/转化双口径/CPA/ROAS/频次）</option><option>转化向（转化/CPA/ROAS）</option><option>素材向（CTR/CVR/ROAS/样本量）</option></select></div>' +
      '<div class="field"><label>时间范围</label><input class="input mono" value="2026-08-21 → 2026-09-20" /></div>' +
      '<div class="field"><label>账户组范围</label><select class="select">' + D.groups.filter(function (g) { return g.grants.indexOf(ADH.state.role) >= 0; }).map(function (g) { return "<option>" + g.name + "</option>"; }).join("") + "</select></div>" +
      "</div>" + ADH.sec("文件将包含（BR-131）") +
      '<div class="formula"><span class="k">数据口径说明</span>：转化类指标同时包含「渠道归因」与「系统归因」两列；归因类指标标注窗口版本 W2（点击 7 天 / 曝光 1 天）<br/>' +
      '<span class="k">时间范围</span>：2026-08-21 → 2026-09-20（账户时区 UTC+8，基准币种 USD）<br/>' +
      '<span class="k">生成时间</span>：2026-09-20 10:24<br/><span class="k">生成人</span>：' + ADH.rolePerson() + "（" + ADH.roleLabel() + "）</div>" +
      ADH.sec("权限与上限校验") + ADH.tbl("t-expc", [{ label: "校验项" }, { label: "结果" }], [
        { c: ["数据权限校验", ADH.chip("ok", "通过 · 仅导出有权限账户组的行（BR-130）")] },
        { c: ["行数预估", ADH.chip("ok", "预计 8,420 行 ≤ 100 万行上限（BR-132）")] },
        { c: ["审计记录", ADH.chip("ok", "提交后写入审计日志（BR-133）")] }
      ], { tight: true }),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="export-submit">创建导出任务</button>'
  });
});
ADH.action("export-submit", function () {
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("导出任务已创建（EXP-2202）", "ok", "异步生成中，完成后通知并生成 7 天有效的下载链接");
  ADH.routeTo("exports");
});
ADH.action("export-download", function () { ADH.toast("开始下载", "ok", "文件包含口径说明、时间范围、生成时间与生成人（BR-131）"); });
ADH.action("export-detail", function (p) {
  const e = D.exports.filter(function (x) { return x.id === p.v; })[0];
  ADH.overlay({
    title: "导出任务 · " + e.id,
    body: ADH.kv([["状态", ADH.statusChip(e.status)], ["维度", e.dim], ["指标集", e.metrics], ["时间范围", e.range],
      ["生成人", e.by], ["生成时间", e.at], ["行数", e.rows ? ADH.num(e.rows) : "—"]]) +
      (e.failReason ? '<div class="mt12">' + ADH.note("danger", "失败原因", e.failReason) + "</div>" : "") +
      (e.status === "RUNNING" ? '<div class="mt12">' + ADH.bar(e.progress) + "</div>" : ""),
    foot: '<button class="btn" data-act="overlay-close">关闭</button>'
  });
});
})();
/* ---------------- 自定义指标视图（FR-POST-17） ---------------- */
(function () {
const METRIC_SETS = {
  "default": "默认（10 项）", "conv": "转化向（CPA / ROAS）", "brand": "品牌向（CPM / 频次）", "asset": "素材向（CTR / CVR / 样本量）"
};
const RANGE_LABEL = { today: "今日", d7: "近 7 天", d30: "近 30 天" };
const LEVEL_LABEL = ["渠道", "广告账户", "Campaign", "AdSet", "Ad", "素材"];

/* 预置视图（演示数据）；用户另存的视图追加到同一列表 */
ADH.savedViews = [
  { id: "V-01", name: "日常·账户级", owner: "林可", range: "d7", drill: 1, compare: "prev", metricSet: "default", shared: 1, updatedAt: "2026-09-19 18:20" },
  { id: "V-02", name: "转化向·计划级", owner: "林可", range: "d30", drill: 2, compare: "prev", metricSet: "conv", shared: 1, updatedAt: "2026-09-18 11:05" },
  { id: "V-03", name: "品牌向·同比", owner: "陈默", range: "d30", drill: 1, compare: "yoy", metricSet: "brand", shared: 0, updatedAt: "2026-09-17 09:40" },
  { id: "V-04", name: "素材向·素材级", owner: "苏晴", range: "d7", drill: 5, compare: "prev", metricSet: "asset", shared: 1, updatedAt: "2026-09-16 16:12" }
];
ADH.viewsSeq = 4;

function curRangeKey() { const r = ADH.f("range", "d30"); return RANGE_LABEL[r] ? r : "d30"; }
function curDrillKey() { const n = Number(ADH.f("drill", 0)); return isNaN(n) ? 0 : Math.max(0, Math.min(5, n)); }
function curMetricSet() { const k = ADH.f("metricSet", "default"); return METRIC_SETS[k] ? k : "default"; }
function curCompare() { const c = ADH.f("compare", "prev"); return c || "prev"; }
function viewById(id) { return ADH.savedViews.filter(function (v) { return v.id === id; })[0]; }
function currentConfig() {
  return { range: curRangeKey(), drill: curDrillKey(), compare: curCompare(), metricSet: curMetricSet() };
}
function isDirty(v) {
  if (!v) return false;
  const c = currentConfig();
  return v.range !== c.range || v.drill !== c.drill || v.compare !== c.compare || v.metricSet !== c.metricSet;
}
function canManage(v) { return ADH.state.role === "admin" || v.owner === ADH.rolePerson(); }

/* 看板顶部「我的视图」条：一键应用 / 另存 / 管理（FR-POST-17） */
ADH.viewsBar = function () {
  const cur = viewById(ADH.f("view", ""));
  const c = currentConfig();
  let h = '<div class="card mb12"><div class="card-body" style="padding:11px 14px"><div class="toolbar wrap">' +
    '<span class="xs muted">' + ADH.icon("save", 13) + " 我的视图</span>" +
    '<div class="btn-group">' + ADH.savedViews.map(function (v) {
      return '<button class="' + (cur && cur.id === v.id ? "on" : "") + '" data-act="view-apply" data-v="' + v.id + '" title="' +
        ADH.esc(v.name + " · " + v.owner + " · " + (v.shared ? "已共享" : "仅本人") + " · 更新于 " + v.updatedAt) + '">' +
        ADH.esc(v.name) + (v.shared ? "" : " · 私") + "</button>";
    }).join("") + "</div>" +
    (cur ? '<button class="btn xs" data-act="view-clear">' + ADH.icon("close", 12) + "取消应用</button>" : "") +
    '<div class="grow"></div>' +
    '<span class="xs muted">当前：' + RANGE_LABEL[c.range] + " · " + LEVEL_LABEL[c.drill] + " · " + METRIC_SETS[c.metricSet] + "</span>" +
    (cur ? (isDirty(cur) ? ADH.chip("warn", "已修改（未另存）") : ADH.chip("ok", "与视图一致", 1)) : "") +
    '<button class="btn xs" data-act="view-save">' + ADH.icon("plus", 12) + "另存为视图</button>" +
    '<button class="btn xs" data-act="view-manage">管理视图</button>' +
    "</div></div></div>";
  return h;
};

ADH.action("view-apply", function (p) {
  const v = viewById(p.v);
  if (!v) return;
  const s = ADH.s();
  s.range = v.range; s.drill = String(v.drill); s.compare = v.compare; s.metricSet = v.metricSet; s.view = v.id;
  ADH.render();
  ADH.toast("已应用视图「" + v.name + "」", "ok", RANGE_LABEL[v.range] + " · " + LEVEL_LABEL[v.drill] +
    " · " + METRIC_SETS[v.metricSet] + "（保存人 " + v.owner + "，视图属于个人，可共享）");
});
ADH.action("view-clear", function () {
  ADH.s().view = "";
  ADH.render();
  ADH.toast("已取消应用视图", "info", "当前筛选条件保留，可继续在此基础上调整并另存为新视图");
});
ADH.action("view-save", function () {
  const c = currentConfig();
  ADH.overlay({
    kind: "modal", title: "另存为视图", desc: "FR-POST-17：把当前维度 / 指标集 / 时间范围保存为常用视图",
    body: ADH.sec("视图内容（只读）") +
      ADH.kv([["时间范围", RANGE_LABEL[c.range]], ["下钻层级", LEVEL_LABEL[c.drill]],
        ["指标集", METRIC_SETS[c.metricSet]], ["对比口径", c.compare === "yoy" ? "去年同期" : (c.compare === "custom" ? "自定义" : "上一周期")]]) +
      ADH.sec("视图设置") +
      '<div class="grid g2">' +
        '<div class="field"><label>视图名称</label><input class="input" id="v-name" value="' + ADH.esc(ADH.rolePerson() + "的视图") + '" /></div>' +
        '<div class="field"><label>可见范围</label><select class="select" id="v-shared"><option value="0">仅本人可见</option><option value="1">共享给团队</option></select></div>' +
      "</div>" +
      ADH.note("info", "视图作用域", "视图保存的是「维度 + 指标集 + 时间范围 + 对比口径」的组合，不含具体数据快照；应用后按最新数据重新计算（FR-POST-18 时效提示同样适用）。"),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="view-save-commit">保存视图</button>'
  });
});
ADH.action("view-save-commit", function () {
  const c = currentConfig();
  const nameEl = document.getElementById("v-name");
  const sharedEl = document.getElementById("v-shared");
  ADH.viewsSeq++;
  const id = "V-" + String(10 + ADH.viewsSeq);
  const name = (nameEl && nameEl.value ? nameEl.value : "未命名视图");
  ADH.savedViews.push({
    id: id, name: name, owner: ADH.rolePerson(), range: c.range, drill: c.drill, compare: c.compare,
    metricSet: c.metricSet, shared: sharedEl && sharedEl.value === "1" ? 1 : 0, updatedAt: ADH_DATA.env.now
  });
  ADH.s().view = id;
  ADH.act("overlay-close", { dataset: {} });
  ADH.render();
  ADH.toast("视图已保存", "ok", name + "（" + (sharedEl && sharedEl.value === "1" ? "已共享给团队" : "仅本人可见") + "），可在「我的视图」中一键应用");
});
ADH.action("view-manage", function () {
  const rows = ADH.savedViews.map(function (v) {
    return {
      c: ["<b>" + ADH.esc(v.name) + "</b>", v.owner + (v.owner === ADH.rolePerson() ? ' <span class="tag">我</span>' : ""),
        ADH.chip(v.shared ? "info" : "neutral", v.shared ? "团队共享" : "仅本人"),
        '<span class="xs">' + RANGE_LABEL[v.range] + " / " + LEVEL_LABEL[v.drill] + "</span>",
        '<span class="xs">' + METRIC_SETS[v.metricSet] + "</span>",
        '<span class="mono xs">' + v.updatedAt + "</span>",
        '<div class="flex gap4"><button class="btn xs" data-act="view-apply" data-v="' + v.id + '">应用</button>' +
        (canManage(v) ? '<button class="btn xs danger-ghost" data-act="view-del" data-v="' + v.id + '">删除</button>' : '<button class="btn xs disabled" title="仅视图创建者或管理员可删除">删除</button>') + "</div>"]
    };
  });
  ADH.overlay({
    kind: "modal", wide: true, title: "管理我的视图", desc: "FR-POST-17：视图属于创建者；共享视图团队内可见，仅创建者与管理员可删除",
    body: ADH.tbl("t-views", [{ label: "视图名称" }, { label: "创建者" }, { label: "可见范围" }, { label: "范围 / 层级" }, { label: "指标集" }, { label: "更新时间" }, { label: "操作" }], rows, { tight: true }) +
      '<div class="mt12">' + ADH.note("info", "视图与权限", "视图只保存「怎么看」，不改变「能看什么」：数据可见范围仍由账户组数据权限决定（BR-3.4），共享视图不会放大任何人的数据范围。") + "</div>",
    foot: '<button class="btn" data-act="overlay-close">关闭</button><div class="grow"></div><button class="btn primary" data-act="view-save">另存当前为视图</button>'
  });
});
ADH.action("view-del", function (p) {
  const v = viewById(p.v);
  if (!v) return;
  if (!canManage(v)) {
    ADH.toast("无法删除", "warn", "视图「" + v.name + "」由 " + v.owner + " 创建，仅创建者或管理员可删除");
    return;
  }
  if (v.shared && ADH.state.role !== "admin") {
    ADH.toast("共享视图删除受保护", "warn", "「" + v.name + "」已共享给团队，请由管理员删除或先取消共享，避免影响他人");
    return;
  }
  ADH.savedViews = ADH.savedViews.filter(function (x) { return x.id !== v.id; });
  if (ADH.s().view === v.id) ADH.s().view = "";
  ADH.act("overlay-close", { dataset: {} });
  ADH.render();
  ADH.toast("视图已删除", "ok", v.name + "（删除记录写入审计日志 BR-141）");
});
})();

