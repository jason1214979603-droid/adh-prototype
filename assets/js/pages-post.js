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
      ADH.tbl("tbl-ap", [{ label: "素材" }, { label: "消耗", cls: "num" }, { label: "曝光", cls: "num" }, { label: "样本量" }, { label: "CTR", cls: "num" }, { label: "CVR", cls: "num" }, { label: "ROAS", cls: "num" }, { label: "生命周期" }, { label: "" }],
        ranked.map(function (a) {
          const low = a.agg.impressions < 30000;
          const cvr = a.agg.conversions / (a.agg.clicks || 1);
          return {
            c: ['<b>' + a.name + '</b><div class="xs muted mono">' + a.id + " · " + a.type + " · " + a.ratio + " · " + a.tags.join("/") + "</div>",
              ADH.num(a.agg.spend, 2), ADH.short(a.agg.impressions),
              low ? ADH.chip("warn", "样本不足 · 已折叠") : ADH.chip("ok", "样本充足"),
              ADH.pct(a.agg.ctr, 2), ADH.pct(cvr, 2), a.agg.roas.toFixed(2),
              a.durability === "萎靡" ? ADH.chip("danger", "衰退") : (a.durability === "爬坡" ? ADH.chip("info", "爬坡") : ADH.chip("ok", "稳定")),
              '<button class="btn xs" data-act="ap-detail" data-v="' + a.id + '">详情</button>'],
            v: [a.name, a.agg.spend, a.agg.impressions, low ? 0 : 1, a.agg.ctr, cvr, a.agg.roas, a.durability, ""]
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


/* ---------------- 出价与成本达成（PRD 7.3.2 出价策略） ---------------- */
(function () {
const D = ADH_DATA;
const STRATEGY = {
  LOWEST_COST_WITHOUT_CAP: "最低成本（无上限）",
  LOWEST_COST_WITH_BID_CAP: "最低成本（有出价上限）",
  COST_CAP: "成本上限"
};
const BID_RANGES = { today: { label: "今日", k: 0.055 }, d7: { label: "近 7 天", k: 0.26 }, d30: { label: "近 30 天", k: 1 } };
function bidRangeKey() { const r = ADH.f("range", "d30"); return BID_RANGES[r] ? r : "d30"; }
function bidK() { return BID_RANGES[bidRangeKey()].k; }
function seedOf(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h % 100000; }
function stratLabel(s) { return STRATEGY[s] || s; }
function rateChip(rate) {
  const over = (1 - rate) * 100;
  if (rate >= 1.05) return ADH.chip("ok", "优于目标 " + ((rate - 1) * 100).toFixed(0) + "%", 1);
  if (rate >= 0.95) return ADH.chip("ok", "基本达标");
  if (rate >= 0.85) return ADH.chip("warn", "超支 " + over.toFixed(0) + "%");
  return ADH.chip("danger", "显著超支 " + over.toFixed(0) + "%");
}
function adviceOf(r) {
  if (r.rate < 0.85) return { tone: "danger", text: "下调出价上限 / 暂停低效 AdSet", rule: "R-03 成本达成守护：近 3 天实际 CPA &gt; 目标 CPA × 1.15" };
  if (r.rate < 1) return { tone: "warn", text: "小幅下调出价上限 -5%", rule: "R-03 成本达成守护：实际 CPA 略高于目标 CPA" };
  if (r.rate >= 1.15) return { tone: "ok", text: "加量（提高预算而非抬高出价）", rule: "R-04 高潜对象加量：实际 CPA 优于目标 15% 以上" };
  return { tone: "neutral", text: "维持观察", rule: "无规则命中（达成率落在正负 15% 区间内）" };
}
/* AdSet 派生：目标 CPA / 实际 CPA / 达成率（确定性派生，保证同一对象每次一致） */
function bidRows() {
  const k = bidK();
  const out = [];
  D.tree.forEach(function (t) {
    t.campaigns.forEach(function (c) {
      c.adsets.forEach(function (s) {
        const rnd = adhRng(seedOf(s.id + "bid"));
        const spend = s.spend * 30 * k / 0.55;
        const cpm = 7.6 + rnd() * 4.6;
        const impressions = Math.round(spend / cpm * 1000);
        const ctr = 0.008 + rnd() * 0.009;
        const clicks = Math.max(1, Math.round(impressions * ctr));
        const cpa = 8.5 + rnd() * 12;
        const conv = Math.max(1, Math.round(spend / cpa));
        const capped = s.bidStrategy === "LOWEST_COST_WITH_BID_CAP";
        const target = 10.5 + rnd() * 7;
        out.push({
          id: s.id, name: s.name, account: t.accountName, camp: c.name,
          strategy: s.bidStrategy, bid: s.bid, budget: s.budget,
          spend: spend, impressions: impressions, clicks: clicks, conv: conv,
          cpc: spend / clicks, cpm: cpm, ctr: ctr,
          target: target, cpa: cpa, rate: target / cpa, capped: capped, hasData: s.hasData
        });
      });
    });
  });
  out.sort(function (a, b) { return b.spend - a.spend; });
  return out;
}
/* 调价历史（演示数据；来源为渠道侧对象变更记录回查，BR-118 可追溯来源） */
const BID_HISTORY = [
  { at: "2026-09-16 20:10", obj: "meta_conversion_lal1-paid_20260913_001", strat: "COST_CAP", from: 13.5, to: 15.0, amt: 0.111, change: "", why: "目标 CPA 上调（成本上限）", cpa3: 16.4, cpa7: 14.9, cpc3: 1.42, cpc7: 1.31, verdict: "改善", note: "上限上调后放量恢复，实际 CPA 在第 5 天回落到目标内" },
  { at: "2026-09-14 11:35", obj: "meta_conversion_25-34-female_20260911_002", strat: "LOWEST_COST_WITH_BID_CAP", from: 4.2, to: 3.6, amt: -0.143, change: "", why: "下调出价上限 -14%", cpa3: 19.8, cpa7: 21.3, cpc3: 1.08, cpc7: 0.94, verdict: "恶化", note: "出价上限压得过低，量级萎缩、转化样本不足，CPA 反而上升" },
  { at: "2026-09-12 19:05", obj: "meta_conversion_retarget-unlock_20260908_001", strat: "COST_CAP", from: null, to: null, amt: 0, change: "策略切换：最低成本（无上限）→ 成本上限", why: "为波动的 CPA 加上硬约束", cpa3: 11.2, cpa7: 11.9, cpc3: 1.05, cpc7: 1.02, verdict: "改善", note: "为下滑的 CPA 加上硬约束后波动收敛，达成率回到 100%" },
  { at: "2026-09-10 09:50", obj: "meta_conversion_18-24-mix_20260905_001", strat: "LOWEST_COST_WITH_BID_CAP", from: 3.8, to: 4.6, amt: 0.211, change: "", why: "上调出价上限 +21%", cpa3: 13.1, cpa7: 12.4, cpc3: 1.22, cpc7: 1.18, verdict: "改善", note: "竞争期提价抢量，量级与 CPA 同时改善" },
  { at: "2026-09-07 21:30", obj: "meta_conversion_35-44-family-drama_20260903_001", strat: "COST_CAP", from: 16.0, to: 16.0, amt: 0, change: "未改出价（仅调整日预算）", why: "验证预算变化对 CPA 的影响", cpa3: 15.4, cpa7: 15.1, cpc3: 1.33, cpc7: 1.30, verdict: "持平", note: "预算调整不影响出价，作为对照样本纳入" },
  { at: "2026-09-04 14:20", obj: "meta_conversion_lal1-paid_20260901_003", strat: "LOWEST_COST_WITH_BID_CAP", from: 5.5, to: 4.2, amt: -0.236, change: "", why: "下调出价上限 -24%", cpa3: 24.6, cpa7: 26.8, cpc3: 0.86, cpc7: 0.79, verdict: "恶化", note: "出价上限低于市场竞价水平，曝光骤降，CPA 失真上升" },
  { at: "2026-09-01 10:00", obj: "meta_conversion_25-34-female_20260828_002", strat: "COST_CAP", from: 12.0, to: 13.5, amt: 0.125, change: "", why: "目标 CPA 上调 +12.5%", cpa3: 14.2, cpa7: 13.4, cpc3: 1.28, cpc7: 1.24, verdict: "改善", note: "季节性 CPM 上行期同步上调目标，达成率回到 100%" }
];
ADH.page("bidding", {
  title: "出价与成本达成",
  subtitle: "目标 CPA 达成率 · CPC / CPM 趋势对比 · 出价调整历史与效果对照",
  render: function () {
    const tab = ADH.tabOf("cost");
    const rows = bidRows();
    const bs = ADH.f("bs", "all");
    const rateFilter = ADH.f("rate", "all");
    const view = rows.filter(function (r) {
      if (bs !== "all" && r.strategy !== bs) return false;
      if (rateFilter === "miss" && r.rate >= 1) return false;
      if (rateFilter === "hit" && r.rate < 1) return false;
      return true;
    });
    const sum = function (list, f) { return list.reduce(function (a, r) { return a + f(r); }, 0); };
    const vSpend = sum(view, function (r) { return r.spend; });
    const vConv = sum(view, function (r) { return r.conv; });
    const vTarget = sum(view, function (r) { return r.target * r.conv; });
    const vCpa = vConv ? vSpend / vConv : 0;
    const vTargetAvg = vConv ? vTarget / vConv : 0;
    const vRate = vCpa ? vTargetAvg / vCpa : 1;
    const miss = view.filter(function (r) { return r.rate < 1; });
    const cappedSpend = sum(view.filter(function (r) { return r.capped; }), function (r) { return r.spend; });
    const advRows = view.filter(function (r) { return adviceOf(r).tone !== "neutral"; });
    const sel = ADH.sel("bidSel");

    let h = '<div class="card mb12"><div class="card-body" style="padding:11px 14px"><div class="toolbar wrap">' +
      '<span class="xs muted">' + ADH.icon("clock", 13) + " 时间范围</span>" +
      '<div class="seg">' + Object.keys(BID_RANGES).map(function (kk) {
        return '<button class="' + (bidRangeKey() === kk ? "on" : "") + '" data-act="filter" data-k="range" data-v="' + kk + '">' + BID_RANGES[kk].label + "</button>";
      }).join("") + "</div>" +
      '<span class="chip plain">' + ADH.icon("clock", 12) + "渠道数据截止 " + ADH.esc(D.env.freshness.channel) + "</span>" +
      (D.env.freshness.lagAccounts ? '<span class="chip warn">' + D.env.freshness.lagAccounts + " 个账户数据未就绪（BR-120）</span>" : "") +
      '<span class="chip neutral">目标 CPA 达成率 = 目标 CPA / 实际 CPA</span>' +
      '<div class="grow"></div>' +
      '<button class="btn sm" data-act="bid-refresh">' + ADH.icon("refresh", 13) + "重跑指定日期</button>" +
      '<button class="btn primary sm" data-act="bid-export">' + ADH.icon("download", 13) + "导出报表</button>" +
      "</div></div></div>";

    h += '<div class="card mb12"><div class="card-head"><h3>' + ADH.icon("target", 15) + '出价与成本达成<span class="desc">PRD 7.3.2 出价策略 · FR-POST-24 / 25 / 26</span></h3>' +
      '<div class="right"><div class="seg">' + [["cost", "成本达成"], ["trend", "CPC / CPM 趋势"], ["history", "调价历史与效果"]].map(function (t) {
        return '<button class="' + (tab === t[0] ? "on" : "") + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + "</div></div></div>";

    if (tab === "cost") {
      h += '<div class="card-body">' +
        '<div class="grid g4 mb12">' +
          ADH.stat({ label: "目标 CPA 加权达成率", value: view.length ? (vRate * 100).toFixed(1) : "—", unit: view.length ? "%" : "", def: "cpa",
            foot: view.length
              ? ((vRate >= 1 ? ADH.chip("ok", "整体达成", 1) : ADH.chip("warn", "整体未达成", 1)) + '<span class="muted">目标均价 $' + vTargetAvg.toFixed(2) + " / 实际均价 $" + vCpa.toFixed(2) + "</span>")
              : '<span class="muted">当前筛选下没有对象，无法计算达成率</span>' }) +
          ADH.stat({ label: "达标对象", value: view.length - miss.length, unit: "个", foot: '<span class="muted">当前筛选下共 ' + view.length + " 个 AdSet</span>" }) +
          ADH.stat({ label: "未达标对象", value: miss.length, unit: "个", foot: '<span style="color:var(--warn)">实际 CPA 高于目标 CPA；仅给出建议，不自动执行（BR-124）</span>' }) +
          ADH.stat({ label: "出价上限覆盖消耗", value: (vSpend ? cappedSpend / vSpend * 100 : 0).toFixed(1), unit: "%", foot: '<span class="muted">其余走最低成本（无上限），由渠道自动出价</span>' }) +
        "</div>" +
        '<div class="toolbar mb12">' +
          '<span class="xs muted">出价策略</span><div class="seg">' +
            [["all", "全部"], ["LOWEST_COST_WITHOUT_CAP", "最低成本（无上限）"], ["LOWEST_COST_WITH_BID_CAP", "最低成本（有上限）"], ["COST_CAP", "成本上限"]].map(function (x) {
              return '<button class="' + (bs === x[0] ? "on" : "") + '" data-act="filter" data-k="bs" data-v="' + x[0] + '">' + x[1] + "</button>";
            }).join("") + "</div>" +
          '<span class="xs muted">达成情况</span><div class="seg">' +
            [["all", "全部"], ["hit", "达标"], ["miss", "未达标"]].map(function (x) {
              return '<button class="' + (rateFilter === x[0] ? "on" : "") + '" data-act="filter" data-k="rate" data-v="' + x[0] + '">' + x[1] + "</button>";
            }).join("") + "</div>" +
          '<div class="grow"></div><span class="xs muted">' + view.length + " / " + rows.length + " 条 · 消耗 $" + ADH.num(vSpend, 0) + "</span>" +
        "</div>" +
        ADH.tbl("t-bid", [{ label: "对象（AdSet）" }, { label: "广告账户" }, { label: "出价策略" }, { label: "出价上限", cls: "num" },
          { label: "目标 CPA", cls: "num" }, { label: "实际 CPA", cls: "num" }, { label: "达成率", cls: "num" }, { label: "消耗", cls: "num" },
          { label: "结论" }, { label: "" }],
          view.map(function (r) {
            const adv = adviceOf(r);
            return {
              c: ['<span class="mono xs">' + ADH.esc(r.name) + "</span>" + (r.hasData ? "" : ' <span class="chip warn">数据未就绪</span>'),
                '<span class="xs">' + ADH.esc(r.account) + "</span>",
                '<span class="xs">' + stratLabel(r.strategy) + "</span>",
                r.capped ? "$" + Number(r.bid).toFixed(2) : '<span class="muted">—</span>',
                "$" + r.target.toFixed(2), "$" + r.cpa.toFixed(2), ADH.pct(r.rate, 0), "$" + ADH.num(r.spend, 0),
                rateChip(r.rate) + " " + ADH.chip(adv.tone, adv.text),
                '<button class="btn xs" data-act="bid-detail" data-v="' + r.id + '">依据 / 建议</button>'],
              v: [r.name, r.account, stratLabel(r.strategy), r.capped ? Number(r.bid) : 0, r.target, r.cpa, r.rate, r.spend, 0, 0]
            };
          }), { sortable: true, pageSize: 12, tight: true, empty: "当前筛选下没有匹配的 AdSet", emptyDesc: "试试切换「出价策略」或「达成情况」筛选；「成本上限」策略在本期没有实际投放对象，切到该筛选项为空属正常。", emptyAction: '<button class="btn sm" data-act="filter" data-k="bs" data-v="all">查看全部策略</button>' }) +
        '<div class="mt12 grid g2">' +
          ADH.note("rule", "FR-POST-24 成本达成口径", "达成率 = 目标 CPA ÷ 实际 CPA，<b>≥ 100% 视为达成</b>；整体达成率按转化量加权，避免小样本对象拉偏结论。") +
          ADH.note("warn", "BR-124 / BR-125 建议不自动执行", "本页所有「建议方向」仅为展示，<b>不自动执行</b>，且必须给出依据（命中规则 + 对比基准）。如需自动执行，请配置规则引擎并启用安全阀。") +
        "</div>" +
        '<div class="mt12">' + ADH.sec("出价建议（不自动执行 · BR-124 / BR-125）") +
          '<div class="xs muted mb8">勾选多个对象可批量采纳建议；「维持观察」的对象无需调整，不进入建议清单。</div>' +
          '<div class="toolbar mb8 wrap"><span class="small">已选 <b>' + sel.length + '</b> 个对象</span>' +
            '<button class="btn xs" data-act="sel-all" data-key="bidSel" data-values="' + advRows.map(function (r) { return r.id; }).join(",") + '">全选 / 取消</button>' +
            '<button class="btn xs" data-act="sel-clear" data-key="bidSel">清空</button>' +
            '<div class="grow"></div>' +
            '<button class="btn primary sm" data-act="bid-batch-apply"' + (sel.length ? "" : " disabled") + ">" + ADH.icon("check", 13) + "批量采纳建议（" + sel.length + "）</button>" +
          "</div>" +
          ADH.tbl("t-bid-advice", [{ label: "" }, { label: "对象（AdSet）" }, { label: "实际 CPA", cls: "num" }, { label: "目标 CPA", cls: "num" }, { label: "超出目标", cls: "num" },
            { label: "建议方向" }, { label: "建议依据（BR-125）" }, { label: "" }],
            advRows.map(function (r) {
              const adv = adviceOf(r);
              const gap = (r.cpa - r.target) / r.target;
              return {
                c: [ADH.checkbox("bidSel", r.id, ""), '<span class="mono xs">' + ADH.esc(r.name) + "</span>" + (r.hasData ? "" : ' <span class="chip warn">数据未就绪</span>'), "$" + r.cpa.toFixed(2), "$" + r.target.toFixed(2), ADH.delta(gap, true),
                  ADH.chip(adv.tone, adv.text),
                  '<span class="xs muted">命中规则 ' + adv.rule + "；对比基准：账户组加权目标 CPA $" + vTargetAvg.toFixed(2) + "；数据时间戳 " + ADH.esc(D.env.freshness.channel) + "</span>",
                  '<div class="flex gap4"><button class="btn xs" data-act="bid-detail" data-v="' + r.id + '">依据</button><button class="btn xs" data-act="bid-apply" data-v="' + r.id + '">采纳</button></div>'],
                v: [0, r.name, r.cpa, r.target, gap, 0, 0, 0]
              };
            }), { sortable: true, tight: true, pageSize: 12, empty: "当前筛选下没有需要调整的对象", emptyDesc: "「维持观察」的对象不进入建议清单。若筛选为「成本上限」策略，该策略本期暂无实际投放对象，切回其他策略即可看到建议。", emptyAction: '<button class="btn sm" data-act="filter" data-k="bs" data-v="all">查看全部策略</button>' }) +
        "</div></div>";
    } else if (tab === "trend") {
      const days = D.accounts[0].series.map(function (r) { return r.date; });
      const cpcS = days.map(function (d, i) {
        const sp = D.accounts.reduce(function (a, x) { return a + x.series[i].spend; }, 0);
        const ck = D.accounts.reduce(function (a, x) { return a + x.series[i].clicks; }, 0);
        return ck ? sp / ck : 0;
      });
      const cpmS = days.map(function (d, i) {
        const sp = D.accounts.reduce(function (a, x) { return a + x.series[i].spend; }, 0);
        const im = D.accounts.reduce(function (a, x) { return a + x.series[i].impressions; }, 0);
        return im ? sp / im * 1000 : 0;
      });
      const byStrat = {};
      rows.forEach(function (r) {
        const o = byStrat[r.strategy] = byStrat[r.strategy] || { name: stratLabel(r.strategy), n: 0, spend: 0, clicks: 0, imp: 0, conv: 0, tval: 0 };
        o.n++; o.spend += r.spend; o.clicks += r.clicks; o.imp += r.impressions; o.conv += r.conv; o.tval += r.target * r.conv;
      });
      const stList = Object.keys(byStrat).map(function (kk) {
        const o = byStrat[kk];
        o.cpc = o.spend / (o.clicks || 1); o.cpm = o.spend / (o.imp || 1) * 1000;
        o.ctr = o.clicks / (o.imp || 1); o.cpa = o.spend / (o.conv || 1);
        o.rate = o.spend ? o.tval / o.spend : 1;
        return o;
      }).sort(function (a, b) { return b.spend - a.spend; });
      const avg = function (arr) { return arr.reduce(function (a, b) { return a + b; }, 0) / (arr.length || 1); };
      h += '<div class="card-body">' +
        '<div class="grid g2">' +
          '<div><div class="flex gap8 mb8"><span class="chip brand"><i class="d"></i>平均 CPC $' + avg(cpcS).toFixed(2) + '</span><span class="xs muted">美元 / 点击</span></div>' +
            ADH.lineChart(days, [{ name: "CPC", color: "#3355ff", vals: cpcS, fill: true }], { height: 170 }) + "</div>" +
          '<div><div class="flex gap8 mb8"><span class="chip violet"><i class="d"></i>平均 CPM $' + avg(cpmS).toFixed(2) + '</span><span class="xs muted">美元 / 千次曝光</span></div>' +
            ADH.lineChart(days, [{ name: "CPM", color: "#7c3aed", vals: cpmS, fill: true }], { height: 170 }) + "</div>" +
        "</div>" +
        '<div class="xs muted mt8">CPC 与 CPM 量级相差约 10 倍，因此<b>分开展示</b>而非共用一根坐标轴，避免量级小的曲线被压成一条直线。</div>' +
        '<div class="mt12">' + ADH.sec("按出价策略对比（FR-POST-25）") +
          '<div class="grid g2">' +
            '<div><div class="xs muted mb8">平均 CPC（美元 / 点击）</div>' +
              ADH.hbars(stList.map(function (o) { return { name: o.name, total: o.cpc, fmt: "$" + o.cpc.toFixed(2), color: "#3355ff" }; })) + "</div>" +
            '<div><div class="xs muted mb8">平均 CPM（美元 / 千次曝光）</div>' +
              ADH.hbars(stList.map(function (o) { return { name: o.name, total: o.cpm, fmt: "$" + o.cpm.toFixed(2), color: "#7c3aed" }; })) + "</div>" +
          "</div></div>" +
        '<div class="mt12">' + ADH.sec("出价策略指标对比（含口径标注 · FR-POST-16 / BR-90）") +
          ADH.tbl("t-bid-strat", [{ label: "出价策略" }, { label: "对象数", cls: "num" }, { label: "消耗", cls: "num" }, { label: "平均 CPC", cls: "num" },
            { label: "平均 CPM", cls: "num" }, { label: "平均 CTR", cls: "num" }, { label: "平均 CPA", cls: "num" }, { label: "达成率", cls: "num" }],
            stList.map(function (o) {
              return { c: ["<b>" + o.name + "</b>", o.n, "$" + ADH.num(o.spend, 0), "$" + o.cpc.toFixed(2), "$" + o.cpm.toFixed(2),
                ADH.pct(o.ctr, 2), "$" + o.cpa.toFixed(2), ADH.pct(o.rate, 0)],
                v: [o.name, o.n, o.spend, o.cpc, o.cpm, o.ctr, o.cpa, o.rate] };
            }), { sortable: true, tight: true }) +
        "</div>" +
        '<div class="mt12 grid g2">' +
          ADH.note("info", "CPC / CPM 的解释边界", "CPC 与 CPM 反映<b>流量成本</b>，CPA 反映<b>经营成本</b>：CPM 上升但 CPA 下降，说明素材与受众匹配度提升，不应单独按 CPM 涨跌判断出价是否合理。") +
          ADH.note("rule", "成本上限策略本期为空", "本期对象实际只用了「最低成本（无上限 / 有出价上限）」两种策略；切到「成本上限」筛选后为空属正常 —— 策略维度按对象实际配置聚合，不虚构数据。") +
        "</div></div>";
    } else {
      const good = BID_HISTORY.filter(function (x) { return x.verdict === "改善"; }).length;
      const bad = BID_HISTORY.filter(function (x) { return x.verdict === "恶化"; }).length;
      const flat = BID_HISTORY.length - good - bad;
      h += '<div class="card-body">' +
        '<div class="grid g4 mb12">' +
          ADH.stat({ label: "调价次数", value: BID_HISTORY.length, unit: "次", foot: '<span class="muted">近 30 天 · 来源渠道侧对象变更记录</span>' }) +
          ADH.stat({ label: "改善", value: good, unit: "次", foot: ADH.chip("ok", "调整后 CPA 下降", 1) }) +
          ADH.stat({ label: "恶化", value: bad, unit: "次", foot: ADH.chip("danger", "调整后 CPA 上升", 1) }) +
          ADH.stat({ label: "持平", value: flat, unit: "次", foot: '<span class="muted">作为对照样本纳入</span>' }) +
        "</div>" +
        ADH.note("info", "调价历史来源与对照口径", "记录来自渠道侧对象变更（modified）回查并与系统内操作日志对齐（BR-118 可追溯来源）；每条记录关联<b>调整后 3 天</b>与<b>调整后 7 天</b>两个效果窗口，用于判断这次调价是改善还是恶化。") +
        '<div class="mt12">' + ADH.tbl("t-bid-hist", [{ label: "调整时间" }, { label: "对象（AdSet）" }, { label: "出价策略" }, { label: "调整前", cls: "num" },
          { label: "调整后", cls: "num" }, { label: "幅度", cls: "num" }, { label: "后 3 天 CPA", cls: "num" }, { label: "后 7 天 CPA", cls: "num" },
          { label: "结论" }, { label: "" }],
          BID_HISTORY.map(function (x, i) {
            return {
              c: ['<span class="mono xs">' + x.at + "</span>", '<span class="mono xs">' + ADH.esc(x.obj) + "</span>",
                '<span class="xs">' + stratLabel(x.strat) + "</span>",
                x.from === null ? '<span class="muted">—</span>' : "$" + x.from.toFixed(2),
                x.to === null ? '<span class="muted">—</span>' : "$" + x.to.toFixed(2),
                x.amt ? ADH.delta(x.amt) : '<span class="xs muted">' + x.change + "</span>",
                "$" + x.cpa3.toFixed(2), "$" + x.cpa7.toFixed(2),
                ADH.chip(x.verdict === "改善" ? "ok" : (x.verdict === "恶化" ? "danger" : "neutral"), x.verdict, 1),
                '<button class="btn xs" data-act="bid-history-detail" data-v="' + i + '">对照详情</button>'],
              v: [x.at, x.obj, stratLabel(x.strat), x.from === null ? 0 : x.from, x.to === null ? 0 : x.to, x.amt, x.cpa3, x.cpa7, 0, 0]
            };
          }), { sortable: true, tight: true }) +
        "</div>" +
        '<div class="mt12">' + ADH.sec("效果对照：调整后 3 天 vs 调整后 7 天（CPA）") +
          ADH.hbars(BID_HISTORY.map(function (x) {
            return { name: x.at.slice(5) + " " + x.obj.replace("meta_conversion_", "").slice(0, 26),
              segs: [{ v: x.cpa3, color: "#3355ff", label: "后 3 天 CPA" }, { v: x.cpa7, color: x.verdict === "恶化" ? "#d92d20" : "#0b9e6a", label: "后 7 天 CPA" }],
              total: Math.max(x.cpa3, x.cpa7), fmt: "$" + x.cpa3.toFixed(1) + " → " + x.cpa7.toFixed(1) };
          })) +
          '<div class="xs muted mt8">每行左段为「调整后 3 天 CPA」、右段为「调整后 7 天 CPA」，两段对比可判断调整效果是否持续。</div>' +
        "</div>" +
        '<div class="mt12 grid g2">' +
          ADH.note("ok", "有效调价特征", "上调出价上限以抢量，或在 CPA 下滑期为它加上硬约束（切换成本上限），多数在 7 天内看到 CPA 回落。") +
          ADH.note("danger", "无效调价特征", "把出价上限压到低于市场竞价水平，会导致曝光骤降、转化样本不足，CPA 反而失真上升 —— 复核时应同时看曝光量级，不能只看 CPA。") +
        "</div></div>";
    }
    h += "</div>";
    return h;
  }
});
ADH.action("bid-detail", function (p) {
  const r = bidRows().filter(function (x) { return x.id === p.v; })[0];
  if (!r) return;
  const adv = adviceOf(r);
  ADH.overlay({
    kind: "drawer", title: "出价依据与建议 · " + r.name,
    desc: r.account + " · " + stratLabel(r.strategy) + " · " + BID_RANGES[bidRangeKey()].label,
    body: ADH.sec("成本达成") + ADH.kv([
        ["目标 CPA", "$" + r.target.toFixed(2)], ["实际 CPA", "$" + r.cpa.toFixed(2)],
        ["达成率", ADH.chip(r.rate >= 1 ? "ok" : "warn", ADH.pct(r.rate, 0), 1)],
        ["出价策略", stratLabel(r.strategy)],
        ["出价上限", r.capped ? "$" + Number(r.bid).toFixed(2) : "未设置（渠道自动出价）"],
        ["日预算", "$" + r.budget], ["消耗", "$" + ADH.num(r.spend, 2)],
        ["CPC / CPM", "$" + r.cpc.toFixed(2) + " / $" + r.cpm.toFixed(2)],
        ["转化量（渠道口径）", ADH.num(r.conv) + " 次"],
        ["数据时间戳", ADH.esc(D.env.freshness.channel) + (r.hasData ? "" : "（该对象本轮同步未完成，BR-120）")]
      ]) +
      ADH.sec("建议动作（BR-124 仅建议，不自动执行）") +
      ADH.note(adv.tone === "neutral" ? "info" : adv.tone, adv.text, "命中依据：" + adv.rule + "；对比基准取账户组加权值而非对象自身历史，避免自我参照。") +
      ADH.sec("可追溯来源（BR-118）") +
      ADH.kv([["渠道侧对象 ID", '<span class="tag-code">' + ADH.esc(r.id) + "</span>"], ["数据来源", "Meta Marketing API · insights（对象级）"],
        ["同步任务", '<span class="tag-code">T-20260920-0' + (r.capped ? "3" : "1") + "</span>"],
        ["计算过程", "实际 CPA = 消耗 ÷ 渠道口径转化数；达成率 = 目标 CPA ÷ 实际 CPA"]]) +
      (r.hasData ? "" : ADH.note("warn", "数据未就绪", "该对象本轮渠道同步未完成，实际 CPA 与达成率仅供参考，不应误读为 0（BR-120）。")),
    foot: '<button class="btn" data-act="overlay-close">关闭</button><div class="grow"></div>' +
      '<button class="btn" data-act="bid-apply" data-v="' + ADH.esc(r.id) + '">采纳建议</button>' +
      '<button class="btn primary" data-act="goto" data-page="rules">去规则引擎配置自动执行</button>'
  });
});
ADH.action("bid-apply", function (p) {
  const r = bidRows().filter(function (x) { return x.id === p.v; })[0];
  const name = r ? r.name : p.v;
  ADH.overlay({
    kind: "modal", title: "采纳建议 · " + name,
    desc: "BR-124：推荐调整仅作为建议展示，不自动执行",
    body: ADH.note("warn", "本次采纳不会直接修改渠道侧出价", "采纳后不会直接修改渠道侧出价。真实落地有两种方式：<b>① 人工执行</b> —— 跳转批量操作，走人工确认；<b>② 配置为规则自动执行</b> —— 规则引擎，含演练 / 观察模式与安全阀（生效时间段、单次影响上限、单日调整幅度上限、冷静期）。") +
      (r ? ADH.kv([["对象", '<span class="mono xs">' + ADH.esc(r.name) + "</span>"],
        ["当前出价上限", r.capped ? "$" + Number(r.bid).toFixed(2) : "未设置"],
        ["实际 CPA / 目标 CPA", "$" + r.cpa.toFixed(2) + " / $" + r.target.toFixed(2)],
        ["建议方向", adviceOf(r).text]]) : ""),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
      '<button class="btn" data-act="goto" data-page="rules">配置自动执行规则</button>' +
      '<button class="btn primary" data-act="bid-apply-confirm">知悉（不执行真实调价）</button>'
  });
});
ADH.action("bid-apply-confirm", function () {
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("已记录采纳意图", "ok", "BR-124：未自动执行任何调价；如需自动执行请在规则引擎配置并启用安全阀");
});
ADH.action("bid-history-detail", function (p) {
  const x = BID_HISTORY[Number(p.v)];
  if (!x) return;
  const trendText = x.cpa7 < x.cpa3 ? "7 天窗口优于 3 天窗口，效果仍在延续" : "7 天窗口未优于 3 天窗口，效果未持续";
  ADH.overlay({
    kind: "drawer", title: "调价效果对照",
    desc: x.at + " · " + x.obj,
    body: ADH.sec("本次调整（FR-POST-26）") + ADH.kv([
        ["对象", '<span class="mono xs">' + ADH.esc(x.obj) + "</span>"],
        ["出价策略", stratLabel(x.strat)],
        ["调整前 → 调整后", (x.from === null ? "—" : "$" + x.from.toFixed(2)) + " → " + (x.to === null ? "—" : "$" + x.to.toFixed(2))],
        ["幅度 / 性质", x.amt ? ADH.delta(x.amt) : x.change],
        ["调整原因", x.why],
        ["记录来源", "渠道侧对象变更（modified）回查 + 系统操作日志对齐（BR-118）"]
      ]) +
      ADH.sec("效果对照") + ADH.tbl("t-hist-cmp", [{ label: "指标" }, { label: "调整后 3 天", cls: "num" }, { label: "调整后 7 天", cls: "num" }, { label: "判断" }], [
        { c: ["实际 CPA", "$" + x.cpa3.toFixed(2), "$" + x.cpa7.toFixed(2), ADH.chip(x.cpa7 < x.cpa3 ? "ok" : "warn", x.cpa7 < x.cpa3 ? "7 天后继续回落" : "7 天后未继续回落")] },
        { c: ["CPC", "$" + x.cpc3.toFixed(2), "$" + x.cpc7.toFixed(2), ADH.chip(x.cpc7 < x.cpc3 ? "ok" : "warn", x.cpc7 < x.cpc3 ? "流量成本下降" : "流量成本上升")] }
      ], { tight: true }) +
      ADH.sec("结论") + ADH.note(x.verdict === "恶化" ? "danger" : (x.verdict === "改善" ? "ok" : "info"), x.verdict, x.note + "（" + trendText + "）"),
    foot: '<button class="btn" data-act="overlay-close">关闭</button>'
  });
});
ADH.action("bid-refresh", function () {
  ADH.overlay({
    kind: "modal", title: "重跑指定日期", desc: "BR-122：渠道可能回溯修订历史数据，重跑按「以渠道最新为准」覆盖并记录修订日志",
    body: '<div class="grid g2">' +
        '<div class="field"><label>重跑日期</label><input class="input" type="date" value="' + ADH.esc(D.env.today) + '" /></div>' +
        '<div class="field"><label>重跑范围</label><select class="select"><option selected>全部账户</option><option>仅数据未就绪账户（' + D.env.freshness.lagAccounts + ' 个）</option></select></div>' +
      "</div>" +
      ADH.note("info", "重跑影响", "重跑会覆盖该日期已有的渠道指标与派生指标（CPC / CPM / CPA / 达成率），并写入修订日志；不改变归因侧结果。"),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="bid-refresh-run">开始重跑</button>'
  });
});
ADH.action("bid-refresh-run", function () {
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("重跑任务已提交", "ok", "可在任务中心查看进度；完成后按渠道最新数据覆盖并记录修订日志（BR-122）");
});
ADH.action("bid-export", function () {
  ADH.toast("已提交导出", "ok", "含目标 CPA 达成率、CPC / CPM 趋势与调价历史；附带口径说明、时间范围、生成时间与生成人（BR-131），仅包含数据权限范围内对象（BR-130）");
});
/* ---- 批量采纳建议（BR-124 / BR-125） ---- */
function bidBatchRows() {
  const ids = ADH.sel("bidSel");
  return bidRows().filter(function (r) { return ids.indexOf(r.id) >= 0; });
}
ADH.action("bid-batch-apply", function () {
  const rows = bidBatchRows();
  if (!rows.length) { ADH.toast("请先选择对象", "warn", "在出价建议表中勾选需要采纳建议的对象，可先点「全选 / 取消」。"); return; }
  const all = bidRows();
  const vSpendAll = all.reduce(function (a, r) { return a + r.spend; }, 0);
  const spend = rows.reduce(function (a, r) { return a + r.spend; }, 0);
  const share = vSpendAll ? spend / vSpendAll : 0;
  const down = rows.filter(function (r) { return r.rate < 1; });
  const up = rows.filter(function (r) { return r.rate >= 1.15; });
  const cd = rows.filter(function (r) { return seedOf(r.id + "cool") % 4 === 0; });
  const valveShare = share <= 0.3;
  const blocked = (valveShare ? 0 : rows.length - cd.length) + cd.length;
  const valveWhy = [];
  if (!valveShare) valveWhy.push("单次影响上限超限");
  if (cd.length) valveWhy.push(cd.length + " 个对象处于冷静期");
  ADH.overlay({
    kind: "modal", wide: true, title: "批量采纳出价建议（" + rows.length + " 个对象）",
    desc: "采纳后仅记录调价意图，不直接修改渠道侧出价",
    body: ADH.note("warn", "不自动执行（BR-124）", "采纳后不会直接修改渠道侧出价。真实落地需二选一：<b>① 人工执行</b> —— 走批量投放并人工确认；<b>② 规则引擎自动执行</b> —— 配置安全阀后由规则下发。") +
      ADH.sec("影响面汇总") +
      '<div class="grid g4 mb12">' +
        ADH.stat({ label: "涉及对象", value: rows.length, unit: "个", foot: '<span class="muted">本次采纳建议的 AdSet 数</span>' }) +
        ADH.stat({ label: "涉及消耗", value: "$" + ADH.num(spend, 0), foot: '<span class="muted">占当前口径总消耗 ' + ADH.pct(share, 1) + "</span>" }) +
        ADH.stat({ label: "下调类建议", value: down.length, unit: "个", foot: '<span class="muted">实际 CPA 高于目标（含暂停低效 AdSet）</span>' }) +
        ADH.stat({ label: "加量类建议", value: up.length, unit: "个", foot: '<span class="muted">CPA 优于目标 15% 以上，提高预算而非抬高出价</span>' }) +
      "</div>" +
      ADH.sec("安全阀检查（BR-124）") +
      ADH.tbl("t-bid-valve", [{ label: "安全阀" }, { label: "阈值" }, { label: "本次" }, { label: "结果" }], [
        { c: ["生效时间段", "09:00 – 22:00", "10:15（当前）", ADH.chip("ok", "通过")] },
        { c: ["单次影响上限", "≤ 全量消耗 30%", ADH.pct(share, 1), valveShare ? ADH.chip("ok", "通过") : ADH.chip("danger", "超限")] },
        { c: ["单日调整幅度上限", "≤ 10% / 对象", "5%（建议幅度）", ADH.chip("ok", "通过")] },
        { c: ["冷静期", "距上次调整 ≥ 7 天", cd.length + " 个对象仍在冷静期", cd.length ? ADH.chip("warn", "命中 " + cd.length + " 个") : ADH.chip("ok", "通过")] }
      ], { tight: true }) +
      ADH.sec("演练结果（dry-run）") +
      ADH.note(blocked ? "warn" : "ok", blocked ? "演练：将被拦截 " + blocked + " 条" : "演练：全部可执行",
        "演练模式不写入渠道。本次共 <b>" + rows.length + "</b> 条变更，其中 <b>" + blocked + "</b> 条因安全阀被拦截" +
        (valveWhy.length ? "（" + valveWhy.join("；") + "）" : "") + "。") +
      ADH.sec("涉及对象明细") +
      ADH.tbl("t-bid-batch", [{ label: "对象（AdSet）" }, { label: "实际 / 目标 CPA" }, { label: "建议方向" }, { label: "命中规则（BR-125）" }],
        rows.map(function (r) {
          const adv = adviceOf(r);
          return { c: ['<span class="mono xs">' + ADH.esc(r.name) + "</span>", "$" + r.cpa.toFixed(2) + " / $" + r.target.toFixed(2), ADH.chip(adv.tone, adv.text), '<span class="xs muted">' + adv.rule + "</span>"] };
        }), { tight: true }),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
      '<button class="btn" data-act="goto" data-page="rules">配置规则自动执行</button>' +
      '<button class="btn primary" data-act="bid-batch-confirm">知悉并记录（不执行真实调价）</button>'
  });
});
ADH.action("bid-batch-confirm", function () {
  const n = bidBatchRows().length;
  ADH.act("overlay-close", { dataset: {} });
  ADH.s().sel = {};
  ADH.toast("已记录批量采纳意图（" + n + " 个对象）", "ok", "BR-124：未自动执行任何调价；如需自动执行请在规则引擎配置并启用安全阀（生效时间段 / 单次影响上限 / 单日幅度上限 / 冷静期）。");
  ADH.render();
});
})();
