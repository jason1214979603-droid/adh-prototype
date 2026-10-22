/* ================= 投放中 · 主页面 ================= */
(function () {
const D = ADH_DATA;
const SCOPE = { SYSTEM: ["neutral", "系统模板（内置，不可改）"], SHARED: ["info", "共享模板（团队可见）"], PERSONAL: ["brand", "个人模板（仅创建者）"] };

/* ---------------- 广告结构模板 ---------------- */
ADH.page("templates", {
  title: "广告结构模板", subtitle: "层级骨架 + 字段默认值 + 直接输入 + 素材槽位",
  refs: ["FR-MID-01 创建结构模板", "FR-MID-02 用户输入与字段类型", "FR-MID-03 引用命名规则", "FR-MID-04 模板预览", "FR-MID-05 复用与套用", "FR-MID-06 版本管理", "FR-MID-07 模板校验", "BR-34~BR-38"],
  render: function () {
    if (ADH.s().tplMode === "new") return tplEditor();
    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "模板总数", value: D.templates.length, unit: "个", foot: '<span class="muted">系统 ' + D.templates.filter(function (t) { return t.scope === "SYSTEM"; }).length + " / 共享 " + D.templates.filter(function (t) { return t.scope === "SHARED"; }).length + " / 个人 " + D.templates.filter(function (t) { return t.scope === "PERSONAL"; }).length + "</span>" }) +
      ADH.stat({ label: "模板复用率", value: "88%", foot: '<span class="muted">目标 ≥ 80%（12.2 产品健康指标）</span>' }) +
      ADH.stat({ label: "被任务引用", value: D.templates.reduce(function (a, t) { return a + t.refTasks; }, 0), unit: "次", foot: '<span class="muted">BR-36 修改模板不回溯已完成任务</span>' }) +
      ADH.stat({ label: "校验失败模板", value: D.templates.filter(function (t) { return t.invalid; }).length, unit: "个", foot: '<span style="color:var(--warn)">字段类型或必填项待修正</span>' }) + "</div>";

    h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("layers", 15) + '结构模板<span class="desc">点击查看四层骨架与字段取值</span></h3><div class="right">' +
      (ADH.can("template.edit") ? '<button class="btn primary sm" data-act="tpl-new">' + ADH.icon("plus", 13) + "新建模板</button>" : '<button class="btn sm disabled" title="模板创建 / 编辑仅 admin 与 optimizer 可用">' + ADH.icon("lock", 13) + "新建模板</button>") + "</div></div>";

    h += ADH.tbl("tbl-tpl", [{ label: "模板" }, { label: "作用域" }, { label: "渠道" }, { label: "版本" }, { label: "命名规则" }, { label: "被引用", cls: "num" }, { label: "更新时间" }, { label: "状态" }, { label: "" }],
      D.templates.map(function (t) {
        return {
          c: ['<b>' + t.name + '</b><div class="xs muted">' + t.desc + "</div>", ADH.chip(SCOPE[t.scope][0], SCOPE[t.scope][1].split("（")[0]),
            '<span class="chip meta">' + t.channel + "</span>", '<span class="tag-code">' + t.version + "</span>", '<span class="tag-code">' + t.namingRuleId + "</span>",
            t.refTasks, '<span class="mono xs">' + t.updatedAt + "</span>",
            t.invalid ? ADH.chip("danger", "校验未通过") : ADH.chip("ok", "可用"),
            '<div class="flex gap4"><button class="btn xs" data-act="tpl-detail" data-v="' + t.id + '">编辑</button><button class="btn xs" data-act="tpl-preview" data-v="' + t.id + '">预览</button>' +
              (t.scope === "SYSTEM"
                ? '<button class="btn xs disabled" disabled title="系统模板不可删除">' + ADH.icon("lock", 12) + "删除</button>"
                : ADH.can("template.edit")
                  ? '<button class="btn xs danger-ghost" data-act="tpl-del" data-v="' + t.id + '">' + ADH.icon("trash", 12) + "删除</button>"
                  : '<button class="btn xs disabled" disabled title="模板删除仅 admin 与 optimizer 可用">' + ADH.icon("lock", 12) + "删除</button>") + "</div>"],
          v: [t.name, t.scope, t.channel, t.version, t.namingRuleId, t.refTasks, t.updatedAt, t.invalid ? 0 : 1, ""]
        };
      }), { sortable: true, pageSize: 8 });

    h += '<div class="card-body" style="border-top:1px solid var(--line)"><div class="grid g2">' +
      ADH.note("rule", "模板结构定义", "模板 = <b>层级骨架</b> + <b>字段默认值</b> + <b>用户直接输入</b> + <b>素材槽位</b>；受众、年龄、预算、文案等用户输入在 STEP 2 直接填写，金额字段按浮点数校验，创建流程不再维护变量定义。") +
      ADH.note("warn", "模板校验与作用域（BR-34 / BR-35 / BR-37）", "保存时校验：必填字段完整、字段类型合法、命名规则可解析；金额字段必须是大于 0 的浮点数（最多两位小数）。模板套用到新账户时需提示该账户缺失的受众 / 素材资源并给出补建入口。") + "</div></div></div>";
    return h;
  }
});
ADH.action("tpl-detail", function (p) {
  const t = D.templates.filter(function (x) { return x.id === p.v; })[0];
  if (!t) return;
  const editable = ADH.can("template.edit") && t.scope !== "SYSTEM";
  let body = "";
  if (t.invalid) body += ADH.note("danger", "模板校验未通过（BR-34）", t.invalid + "<br/>提交引用该模板的任务时将被校验清单阻断。") + '<div class="hr"></div>';
  else if (t.scope === "SYSTEM") body += ADH.note("info", "系统模板", "系统内置示例模板不可修改；可「另存为」个人或共享模板后编辑。") + '<div class="hr"></div>';
  body += ADH.sec("四层骨架配置");
  t.nodes.forEach(function (n) {
    body += '<div class="rb-block mb8"><div class="rb-head"><span class="no">' + (n.level === "CAMPAIGN" ? "C" : n.level === "ADSET" ? "S" : n.level === "CREATIVE" ? "R" : "A") + "</span>" + n.level +
      '<span class="right">' + n.fields.length + " 个字段</span></div><div class=\"rb-body\">" +
      ADH.tbl("t-f-" + n.level, [{ label: "字段" }, { label: "取值" }, { label: "类型" }], n.fields.map(function (f) {
        const numeric = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(f[1]).trim());
        return { c: [f[0], '<span class="small">' + f[1] + "</span>", numeric ? ADH.chip("warn", "浮点数") : ADH.chip("neutral", "文本")] };
      }), { tight: true }) + "</div></div>";
  });
  if (!(t.nodes || []).some(function (n) { return n.level === "CREATIVE"; })) {
    body += ADH.note("warn", "该历史模板尚未包含 Creative 层", "Meta v26.0 中 Creative 是独立对象。编辑并保存此模板后会自动补齐 Creative 层（主页身份 / 素材槽位 / 主文案 / CTA / 落地页），Ad 层只保留 creative_id 绑定。");
  }
  body += ADH.sec("命名规则绑定") + ADH.kv([["引用规则", '<span class="tag-code">' + t.namingRuleId + " · " + (D.namingRules.filter(function (r) { return r.id === t.namingRuleId; })[0] || {}).name + "</span>"],
    ["示例输出", '<span class="mono small">' + (D.namingRules.filter(function (r) { return r.id === t.namingRuleId; })[0] || {}).example + "</span>"],
    ["版本策略", "BR-36：修改模板不回溯已完成任务；新任务默认使用最新版本，可手动指定历史版本"]]);
  ADH.overlay({
    title: t.name, wide: true, desc: SCOPE[t.scope][1] + " · " + t.version + " · 被 " + t.refTasks + " 个任务引用",
    body: body,
    foot: (editable ? '<button class="btn sm" data-act="tpl-save-validate">保存并校验</button>' : '<span class="xs muted">' + (t.scope === "SYSTEM" ? "系统模板不可编辑" : ADH.LOCK_REASON["template.edit"]) + "</span>") +
      '<div class="grow"></div>' + (editable ? '<button class="btn sm" data-act="tpl-edit" data-v="' + t.id + '">在模板编辑器中打开</button>' : "") + '<button class="btn sm" data-act="tpl-preview" data-v="' + t.id + '">预览渲染结果</button><button class="btn primary sm" data-act="overlay-close">关闭</button>'
  });
});
ADH.action("tpl-del", function (p) {
  if (!ADH.assertPerm("template.edit")) return;
  const t = D.templates.filter(function (x) { return x.id === p.v; })[0];
  if (!t) return;
  if (t.scope === "SYSTEM") {
    ADH.toast("系统模板不可删除", "warn", "系统内置模板用于保证基础结构可用；可另存为个人或共享模板后编辑。");
    return;
  }
  const refs = Number(t.refTasks || 0);
  ADH.overlay({
    kind: "modal", title: "删除模板 · " + t.name, desc: "删除后模板不再出现在列表中；已被引用的模板需先解除引用",
    body: ADH.note(refs ? "warn" : "info", "删除影响", refs
      ? "该模板已被 <b>" + refs + "</b> 个任务引用。删除后历史任务保留已生成的结构快照，但新任务不能再引用此模板（BR-36）。"
      : "该模板尚未被任务引用，删除后将从当前模板库移除。") +
      '<div class="mt12">' + ADH.kv([
        ["模板", ADH.esc(t.name)],
        ["作用域", ADH.esc(SCOPE[t.scope][1])],
        ["版本", ADH.esc(t.version)],
        ["被引用", refs + " 个任务"]
      ]) + "</div>",
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn danger-ghost" data-act="tpl-del-ok" data-v="' + t.id + '">' + ADH.icon("trash", 13) + "确认删除</button>"
  });
});
ADH.action("tpl-del-ok", function (p) {
  if (!ADH.assertPerm("template.edit")) return;
  const list = D.templates || [];
  const i = list.map(function (t) { return t.id; }).indexOf(p.v);
  if (i < 0) {
    ADH.act("overlay-close", { dataset: {} });
    return ADH.toast("模板不存在", "warn", "该模板可能已被删除或当前会话数据已刷新");
  }
  if (list[i].scope === "SYSTEM") return ADH.toast("系统模板不可删除", "warn", "系统内置模板不可移除");
  const removed = list.splice(i, 1)[0];
  ADH.act("overlay-close", { dataset: {} });
  ADH.render();
  ADH.toast("模板已删除", "ok", "「" + removed.name + "」已从模板库移除，删除操作写审计（BR-141）");
});
ADH.action("tpl-save-validate", function () {
  if (!ADH.assertPerm("template.edit")) return;
  ADH.toast("模板保存校验（BR-34）", "ok", "必填字段完整 ✓ 字段类型合法 ✓ 命名规则可解析 ✓ —— 校验通过，版本号 v+1 已生成");
});
/* ============ 模板编辑器（新建 / 编辑） · FR-MID-01 ~ 07 / BR-34 ~ 38 ============ */
const TPL_STEPS = [
  ["基本信息", "模板名 · 作用域 · 渠道"],
  ["四层骨架", "Campaign / AdSet / Creative / Ad 直接填写"],
  ["命名与素材槽位", "绑定命名规则 + 素材槽位（BR-37）"],
  ["校验与预览", "BR-34 校验清单 + BR-38 渲染结果"]
];
const TPL_SCOPE_DEF = { SHARED: ["info", "共享模板（团队可见）"], PERSONAL: ["brand", "个人模板（仅创建者）"] };
/* Meta v26.0 目标 → 优化目标 / 计费事件 / 转化位置 兼容矩阵（文档 3.3 / 4.3） */
const TPL_OBJECTIVES = ["OUTCOME_AWARENESS", "OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_LEADS", "OUTCOME_SALES", "OUTCOME_APP_PROMOTION"];
const TPL_MATRIX = {
  OUTCOME_AWARENESS: { goals: ["REACH", "IMPRESSIONS", "THRUPLAY", "VIDEO_VIEWS"], billing: ["IMPRESSIONS", "THRUPLAY"], dest: ["ON_AD", "WEBSITE"] },
  OUTCOME_TRAFFIC: { goals: ["LINK_CLICKS", "LANDING_PAGE_VIEWS"], billing: ["IMPRESSIONS", "LINK_CLICKS"], dest: ["WEBSITE", "APP", "ON_AD"] },
  OUTCOME_ENGAGEMENT: { goals: ["CONVERSATIONS", "POST_ENGAGEMENT", "PAGE_LIKES", "THRUPLAY"], billing: ["IMPRESSIONS", "THRUPLAY"], dest: ["ON_AD", "MESSENGER", "INSTAGRAM_DIRECT", "WHATSAPP"] },
  OUTCOME_LEADS: { goals: ["LEAD_GENERATION", "QUALITY_LEAD"], billing: ["IMPRESSIONS"], dest: ["ON_AD", "WEBSITE"] },
  OUTCOME_SALES: { goals: ["OFFSITE_CONVERSIONS", "VALUE", "CONVERSATIONS"], billing: ["IMPRESSIONS"], dest: ["WEBSITE", "APP", "ON_AD"] },
  OUTCOME_APP_PROMOTION: { goals: ["APP_INSTALLS", "OFFSITE_CONVERSIONS", "VALUE"], billing: ["IMPRESSIONS", "APP_INSTALLS"], dest: ["APP"] }
};
/* 字段第 5 位 = 下拉控件类型；枚举值随 objective 联动 */
const TPL_SELECTS = {
  objective: function () { return TPL_OBJECTIVES; },
  buyingType: function () { return ["AUCTION", "RESERVED"]; },
  budgetLevel: function () { return ["ADSET_BUDGET", "CAMPAIGN_BUDGET"]; },
  optimizationGoal: function () { return tplMatrix().goals; },
  billingEvent: function () { return tplMatrix().billing; },
  destinationType: function () { return tplMatrix().dest; },
  bidStrategy: function () { return ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "LOWEST_COST_WITH_MIN_ROAS"]; },
  creativeType: function () { return ["SINGLE_IMAGE", "SINGLE_VIDEO", "CAROUSEL"]; },
  callToAction: function () { return ["WATCH_MORE", "LEARN_MORE", "SIGN_UP", "MESSENGER", "WHATSAPP_MESSAGE", "GET_QUOTE"]; },
  adSchedule: function () { return ["不启用", "按广告级排期"]; }
};
function tplMatrix() { const d = tplD(); return TPL_MATRIX[d.objective] || TPL_MATRIX.OUTCOME_SALES; }
function tplOpts(key) {
  const f = TPL_SELECTS[key];
  if (!f) return [];
  try { return f() || []; } catch (e) { return []; }
}
/* 金额字段按浮点数处理；其余用户输入按文本处理，下拉字段为枚举 */
const TPL_FLOAT_FIELDS = ["campaignDailyBudget", "spendCap", "dailyBudget"];
function tplFieldType(f) {
  if (f[4]) return "enum";
  return TPL_FLOAT_FIELDS.indexOf(f[1]) >= 0 ? "float" : "text";
}
function tplFieldTypeLabel(type) { return type === "float" ? "浮点数" : (type === "enum" ? "枚举" : "文本"); }
/* 四层骨架：Campaign → AdSet → Creative → Ad（与 Meta 对象模型一致） */
const TPL_LEVELS = [
  { key: "CAMPAIGN", no: "C", label: "Campaign", fields: [
    ["名称", "campaignName", "{{渠道}}_{{目标}}_camp", true],
    ["目标 objective", "objective", "OUTCOME_SALES", false, "objective"],
    ["购买类型 buying_type", "buyingType", "AUCTION", false, "buyingType"],
    ["预算层级", "budgetLevel", "ADSET_BUDGET", false, "budgetLevel"],
    ["Campaign 日预算", "campaignDailyBudget", "", false],
    ["花费上限 spend_cap", "spendCap", "", false]
  ] },
  { key: "ADSET", no: "S", label: "AdSet", fields: [
    ["名称", "adsetName", "{{渠道}}_{{目标}}_{{受众}}_{{日期}}_{{seq:3}}", true],
    ["优化目标 optimization_goal", "optimizationGoal", "OFFSITE_CONVERSIONS", false, "optimizationGoal"],
    ["计费事件 billing_event", "billingEvent", "IMPRESSIONS", false, "billingEvent"],
    ["转化位置 destination_type", "destinationType", "WEBSITE", false, "destinationType"],
    ["Pixel ID", "pixelId", "PX-1183042", false],
    ["转化事件", "customEventType", "PURCHASE", false],
    ["地域", "geo", "US", true],
    ["年龄", "age", "25-34", true],
    ["性别", "gender", "female", true],
    ["兴趣", "interest", "短剧付费 / 言情内容", false],
    ["日预算", "dailyBudget", "120.00", true],
    ["出价策略", "bidStrategy", "LOWEST_COST_WITHOUT_CAP", false, "bidStrategy"],
    ["排期开始", "startTime", "2026-09-20T00:00:00+0800", false],
    ["排期结束", "endTime", "长期（不传 end_time）", false],
    ["版位", "placement", "自动版位", false]
  ] },
  { key: "CREATIVE", no: "R", label: "Creative", fields: [
    ["主页 Page", "pageId", "PAGE-1029384", false],
    ["Instagram 账号", "instagramUserId", "IG-778812", false],
    ["创意类型", "creativeType", "SINGLE_VIDEO", false, "creativeType"],
    ["素材槽位", "assetSlot", "{{asset.video|9:16}}", true],
    ["主文案", "primaryText", "前 3 集免费，立即追更", true],
    ["标题 headline", "headline", "前 3 集免费", true],
    ["描述 description", "description", "全集已上线 · 立即解锁", false],
    ["CTA", "callToAction", "WATCH_MORE", false, "callToAction"],
    ["落地页 URL", "linkUrl", "https://novadrama.example.com/episodes?click_id=__CLICK_ID__", true],
    ["URL 追踪参数", "urlTags", "utm_source={{渠道}}&utm_campaign={campaign_id}", true],
    ["轮播子卡", "carouselCards", "2–5 张（仅 CAROUSEL）", false]
  ] },
  { key: "AD", no: "A", label: "Ad", fields: [
    ["名称", "adName", "{{渠道}}_{{目标}}_{{受众}}_{{素材类型}}_{{日期}}_{{seq:3}}", true],
    ["Creative 引用", "creativeRef", "{{creative.id}}", false],
    ["转化域名 conversion_domain", "conversionDomain", "novadrama.example.com", false],
    ["追踪规格 tracking_specs", "trackingSpecs", "按 Pixel + 落地页自动生成", false],
    ["广告级排期", "adSchedule", "不启用", false, "adSchedule"],
    ["状态", "adStatus", "PAUSED", false]
  ] }
];
/* 字段在该模板下是否被禁用（未启用的条件字段） */
function tplFieldOff(lv, key, d) {
  const n = d.nodes;
  if (lv === "CAMPAIGN") {
    if (key === "campaignDailyBudget" && n.CAMPAIGN.budgetLevel !== "CAMPAIGN_BUDGET") return "预算层级为 AdSet 预算";
  }
  if (lv === "ADSET") {
    if (key === "dailyBudget" && n.CAMPAIGN.budgetLevel === "CAMPAIGN_BUDGET") return "预算已上收到 Campaign";
    if ((key === "pixelId" || key === "customEventType") && n.ADSET.destinationType !== "WEBSITE") return "仅 WEBSITE 需要 Pixel";
  }
  if (lv === "CREATIVE" && key === "carouselCards" && n.CREATIVE.creativeType !== "CAROUSEL") return "创意类型非轮播";
  return "";
}
/* 目标变化后把不兼容的三要素收敛到合法值 */
function tplNormalize() {
  const d = tplD();
  const m = TPL_MATRIX[d.objective] || TPL_MATRIX.OUTCOME_SALES;
  const a = d.nodes.ADSET, c = d.nodes.CAMPAIGN;
  if (m.goals.indexOf(a.optimizationGoal) < 0) a.optimizationGoal = m.goals[0];
  if (m.billing.indexOf(a.billingEvent) < 0) a.billingEvent = m.billing[0];
  if (m.dest.indexOf(a.destinationType) < 0) a.destinationType = m.dest[0];
  if (c.budgetLevel === "CAMPAIGN_BUDGET" && !String(c.campaignDailyBudget || "").trim()) c.campaignDailyBudget = d.nodes.ADSET.dailyBudget || "120.00";
  return d;
}
function tplBlank() {
  const nodes = {};
  TPL_LEVELS.forEach(function (lv) { nodes[lv.key] = {}; lv.fields.forEach(function (f) { nodes[lv.key][f[1]] = f[2]; }); });
  return {
    name: "", scope: "PERSONAL", channel: "Meta", desc: "", objective: "OUTCOME_SALES", nodes: nodes,
    vars: [],
    ruleId: "NR-001",
    slots: [{ ratio: "9:16", label: "竖版视频（Reels / Story）" }, { ratio: "1:1", label: "方形图（Feed）" }]
  };
}
function tplD() { const s = ADH.s(); if (!s.tplDraft) s.tplDraft = tplBlank(); return s.tplDraft; }
/* 命名规则内置字段 + 系统上下文：不要求在变量表中重复定义（BR-34 仅校验自定义变量） */
const TPL_BUILTIN = ["渠道", "目标", "受众", "素材类型", "日期", "账户", "版本"];
const TPL_VAR_CTX = [
  ["account.name", "账户名称"], ["account.currency", "账户币种"],
  ["today", "今天（YYYY-MM-DD）"], ["yyyyMMdd", "今天（YYYYMMDD）"]
];
const TPL_VAR_ASSET = [
  ["asset.tag", "素材标签"], ["asset.ratio", "素材比例"],
  ["asset.name", "素材名称"], ["asset.video|9:16", "竖版视频槽位"]
];
function tplVarText(name, def) { return "{{" + name + (def ? "|" + def : "") + "}}"; }
function tplVarState() { const s = ADH.uiState[ADH.state.route] || (ADH.uiState[ADH.state.route] = {}); return s; }
function tplFieldLabel(lv, fk) {
  const L = TPL_LEVELS.filter(function (x) { return x.key === lv; })[0];
  const f = L && L.fields.filter(function (x) { return x[1] === fk; })[0];
  return (L ? L.label : lv) + " · " + (f ? f[0] : fk);
}
/* 变量面板：PRD 6.1.2 四类变量 + 命名规则字段（FR-MID-02 可插入可替换变量） */
function tplPalette() {
  const d = tplD();
  function byType(t) {
    return d.vars.filter(function (v) { return (v.type || "用户输入") === t; })
      .map(function (v) { return { t: tplVarText(v.name, v.def), d: (v.def ? "默认 " + v.def + " · " : "") + (v.desc || "无说明") }; });
  }
  function fixed(list, kind) { return list.map(function (x) { return { t: "{{" + x[0] + "}}", d: kind + " · " + x[1] }; }); }
  return [
    { title: "上下文变量", tip: "系统内置，无需在变量表定义", items: fixed(TPL_VAR_CTX, "上下文").concat(byType("上下文")) },
    { title: "命名规则字段", tip: "由绑定的命名规则引擎解析（FR-MID-03）", items: TPL_BUILTIN.map(function (n) { return { t: "{{" + n + "}}", d: "命名规则字段" }; }) },
    { title: "用户输入变量", tip: "来自 STEP 3 变量表，未定义将被 BR-34 阻断", items: byType("用户输入") },
    { title: "素材变量", tip: "按素材槽位在创建时填充（BR-29 / BR-38）", items: fixed(TPL_VAR_ASSET, "素材").concat(byType("素材")) },
    { title: "序号变量", tip: "按账户 + 前缀独立计数并持久化（BR-42）", items: [{ t: "{{seq:3}}", d: "序号 · 生成 001、002、003" }].concat(byType("序号")) }
  ];
}
function tplPaletteHTML() {
  const tgt = tplVarState().varTargetId ? document.getElementById(tplVarState().varTargetId) : null;
  const hasTgt = tgt && tgt.dataset && tgt.dataset.varOk;
  return '<div class="var-pal mt12"><div class="vp-head">' + ADH.icon("wand", 14) + "<b>变量面板</b>" +
    '<span class="desc">点击插入到光标处 · 拖拽追加到字段末尾（FR-MID-02）</span>' +
    '<span class="right">目标字段 <b id="tpl-var-target" class="' + (hasTgt ? "vt-on" : "vt-none") + '">' +
    (hasTgt ? ADH.esc(tplFieldLabel(tgt.dataset.lv, tgt.dataset.fk)) : "未选中") + "</b></span></div>" +
    '<div class="vp-groups">' + tplPalette().map(function (g) {
      return '<div class="vp-g"><div class="vp-gt">' + g.title + '<span class="xs muted">' + g.tip + "</span></div>" +
        '<div class="vp-chips">' + (g.items.length ? g.items.map(function (it) {
          return '<button type="button" class="var-chip" draggable="true" data-act="tpl-var-insert" data-v="' + ADH.esc(it.t) + '" title="' + ADH.esc(it.t + "　" + it.d) + '">' +
            ADH.esc(it.t) + "<i>" + ADH.esc(it.d) + "</i></button>";
        }).join("") : '<span class="xs muted">变量表中暂无该类别变量，可在 STEP 3 新增</span>') + "</div></div>";
    }).join("") + "</div>" +
    '<div class="xs muted mt8">仅 PRD 6.1.2 标注「支持变量」的字段可插入：Campaign 名称；AdSet 名称 / 地域 / 年龄 / 预算；Ad 名称 / URL / 文案 / 追踪参数。其余字段为固定值。目标字段保持最近一次选中的字段。</div></div>';
}
function tplSyncTarget() {
  const box = document.getElementById("tpl-var-target");
  if (!box) return;
  const id = tplVarState().varTargetId;
  const el = id ? document.getElementById(id) : null;
  if (!el || !el.dataset || !el.dataset.varOk) { box.className = "vt-none"; box.textContent = "未选中"; return; }
  box.className = "vt-on";
  box.textContent = tplFieldLabel(el.dataset.lv, el.dataset.fk);
}
function tplClearDrop() {
  Array.prototype.forEach.call(document.querySelectorAll(".input.drop-on"), function (x) { x.classList.remove("drop-on"); });
}
function tplInsertInto(el, expr, atEnd) {
  if (!el || !el.dataset || !el.dataset.varOk) return false;
  const d = tplD(), lv = el.dataset.lv, fk = el.dataset.fk;
  if (!d.nodes[lv] || d.nodes[lv][fk] === undefined) return false;
  const val = String(el.value || "");
  /* 点击插入走光标位置；拖拽（未聚焦字段无有效光标）统一追加到末尾 */
  const noCaret = atEnd || el.selectionStart === null || el.selectionStart === undefined;
  const start = noCaret ? val.length : el.selectionStart;
  const end = noCaret || el.selectionEnd === null || el.selectionEnd === undefined ? start : el.selectionEnd;
  d.nodes[lv][fk] = val.slice(0, start) + expr + val.slice(end);
  const caret = start + expr.length;
  tplVarState().varTargetId = el.id;
  ADH.state.focusId = el.id;
  ADH.render();
  const el2 = document.getElementById(el.id);
  if (el2) { el2.focus(); try { el2.setSelectionRange(caret, caret); } catch (e) {} }
  tplSyncTarget();
  return true;
}
/* 变量面板事件：focusin 记录目标字段；拖拽走 HTML5 DnD（点击路径见 tpl-var-insert） */
document.addEventListener("focusin", function (e) {
  const el = e.target && e.target.closest ? e.target.closest("[data-var-ok]") : null;
  if (el) { tplVarState().varTargetId = el.id; tplSyncTarget(); }
});
document.addEventListener("dragstart", function (e) {
  const el = e.target && e.target.closest ? e.target.closest(".var-chip") : null;
  if (!el) return;
  if (e.dataTransfer) { try { e.dataTransfer.setData("text/plain", el.dataset.v); e.dataTransfer.effectAllowed = "copy"; } catch (err) {} }
  el.classList.add("dragging");
});
document.addEventListener("dragend", function (e) {
  const el = e.target && e.target.closest ? e.target.closest(".var-chip") : null;
  if (el) el.classList.remove("dragging");
  tplClearDrop();
});
document.addEventListener("dragover", function (e) {
  if (!document.querySelector(".var-chip.dragging")) return;
  const el = e.target && e.target.closest ? e.target.closest("[data-var-ok]") : null;
  if (!el) { tplClearDrop(); return; }
  e.preventDefault();
  if (e.dataTransfer) { try { e.dataTransfer.dropEffect = "copy"; } catch (err) {} }
  if (!el.classList.contains("drop-on")) { tplClearDrop(); el.classList.add("drop-on"); }
});
document.addEventListener("drop", function (e) {
  const el = e.target && e.target.closest ? e.target.closest("[data-var-ok]") : null;
  let expr = "";
  if (e.dataTransfer) { try { expr = e.dataTransfer.getData("text/plain") || ""; } catch (err) {} }
  tplClearDrop();
  const chip = document.querySelector(".var-chip.dragging");
  if (chip) chip.classList.remove("dragging");
  /* 仅接受变量面板发出的占位符，避免外部拖入的任意文本被写入字段 */
  if (!el || !/^\{\{[^}]+\}\}$/.test(expr)) return;
  e.preventDefault();
  tplInsertInto(el, expr, true);
});
function tplRefs() {
  const d = tplD(), out = [];
  Object.keys(d.nodes).forEach(function (lv) {
    Object.keys(d.nodes[lv]).forEach(function (k) {
      const v = String(d.nodes[lv][k] || "");
      const m = v.match(/\{\{[^}]+\}\}/g) || [];
      m.forEach(function (x) {
        const inner = x.slice(2, -2).split("|")[0].trim();
        if (!inner || inner.indexOf(".") >= 0) return;
        if (inner.indexOf("seq") === 0 || inner === "today" || inner.indexOf("yyyy") === 0) return;
        if (TPL_BUILTIN.indexOf(inner) >= 0) return;
        if (out.indexOf(inner) < 0) out.push(inner);
      });
    });
  });
  return out;
}
function tplUndef() {
  const names = tplD().vars.map(function (v) { return v.name; });
  return tplRefs().filter(function (n) { return names.indexOf(n) < 0; });
}
function tplRule() { const d = tplD(); return D.namingRules.filter(function (r) { return r.id === d.ruleId; })[0] || D.namingRules[0]; }
function tplRendered() {
  const rule = tplRule();
  const sample = { "渠道": "meta", "目标": "conversion", "受众": "25-34-female", "素材类型": "video", "日期": "20260920", "序号:3": "001", "账户": D.accounts[0].name, "版本": "v1" };
  return { rule: rule, name: rule.pattern.map(function (k) { return sample[k] || k; }).join(rule.sep) };
}
function tplCheckList() {
  const d = tplD(), C = d.nodes.CAMPAIGN, S = d.nodes.ADSET, R = d.nodes.CREATIVE, A = d.nodes.AD;
  const m = TPL_MATRIX[d.objective] || TPL_MATRIX.OUTCOME_SALES;
  const missing = [];
  if (!String(C.objective || "").trim()) missing.push("Campaign.objective");
  if (!String(C.buyingType || "").trim()) missing.push("Campaign.buying_type");
  const budgetMissing = C.budgetLevel === "CAMPAIGN_BUDGET" ? !String(C.campaignDailyBudget || "").trim() : !String(S.dailyBudget || "").trim();
  if (budgetMissing) missing.push(C.budgetLevel === "CAMPAIGN_BUDGET" ? "Campaign.daily_budget" : "AdSet.daily_budget");
  if (!String(S.optimizationGoal || "").trim()) missing.push("AdSet.optimization_goal");
  if (!String(S.billingEvent || "").trim()) missing.push("AdSet.billing_event");
  if (!String(S.destinationType || "").trim()) missing.push("AdSet.destination_type");
  if (!String(R.pageId || "").trim()) missing.push("Creative.page_id");
  if (!String(R.assetSlot || "").trim()) missing.push("Creative.asset_slot");
  if (!String(A.conversionDomain || "").trim()) missing.push("Ad.conversion_domain");
  const nm = tplRendered().name;
  const bad = /[\/\\:*?"<>|]/.test(nm);
  const compat = m.goals.indexOf(S.optimizationGoal) >= 0 && m.billing.indexOf(S.billingEvent) >= 0 && m.dest.indexOf(S.destinationType) >= 0;
  const pixelOk = S.destinationType !== "WEBSITE" || (String(S.pixelId || "").trim() && String(S.customEventType || "").trim());
  const badFloat = [];
  TPL_LEVELS.forEach(function (lv) {
    lv.fields.forEach(function (f) {
      if (tplFieldType(f) !== "float") return;
      const v = String(d.nodes[lv.key][f[1]] || "").trim();
      if (v && (!/^\d+(\.\d{1,2})?$/.test(v) || Number(v) <= 0)) badFloat.push(lv.label + "." + f[1] + "=" + v);
    });
  });
  return [
    ["必填", "模板名称已填写", "BLOCK", String(d.name).trim() ? "PASS" : "FAIL", String(d.name).trim() ? "「" + ADH.esc(d.name) + "」" : "未填写模板名称"],
    ["必填", "四层必填字段完整", "BLOCK", missing.length ? "FAIL" : "PASS", missing.length ? "缺少：" + missing.join("、") : "Campaign / AdSet / Creative / Ad 必填均已配置"],
    ["预算", "预算层级二选一（Campaign 或 AdSet）", "BLOCK", budgetMissing ? "FAIL" : "PASS",
      budgetMissing ? (C.budgetLevel === "CAMPAIGN_BUDGET" ? "Campaign 日预算为空" : "AdSet 日预算为空")
        : (C.budgetLevel === "CAMPAIGN_BUDGET" ? "Campaign 日预算 " + C.campaignDailyBudget + "（AdSet 预算已禁用）" : "AdSet 日预算 " + S.dailyBudget + "（Campaign 不设预算）")],
    ["投放", "优化目标 / 计费事件 / 转化位置与 objective 兼容", "BLOCK", compat ? "PASS" : "FAIL",
      compat ? d.objective + " → " + S.optimizationGoal + " / " + S.billingEvent + " / " + S.destinationType : "当前组合不在兼容矩阵内（文档 3.3 / 4.3）"],
    ["投放", "promoted_object 完整（WEBSITE 需 Pixel + 事件）", "BLOCK", pixelOk ? "PASS" : "FAIL",
      pixelOk ? (S.destinationType === "WEBSITE" ? "pixel_id=" + S.pixelId + " · " + S.customEventType : "destination=" + S.destinationType + "，无需 Pixel") : "WEBSITE 投放缺少 pixel_id / custom_event_type"],
    ["创意", "Creative 主页身份已绑定", "BLOCK", String(R.pageId || "").trim() ? "PASS" : "FAIL", "page_id=" + (R.pageId || "未绑定") + (R.instagramUserId ? " · IG " + R.instagramUserId : "")],
    ["创意", "落地页 / 主文案 / CTA 完整", "BLOCK", (R.linkUrl && R.primaryText && R.callToAction) ? "PASS" : "FAIL",
      (R.linkUrl && R.primaryText && R.callToAction) ? "link=" + R.linkUrl + " · CTA=" + R.callToAction : "落地页 / 主文案 / CTA 至少缺一项"],
    ["类型", "金额字段为大于 0 的浮点数", "BLOCK", badFloat.length ? "FAIL" : "PASS", badFloat.length ? "非法值：" + badFloat.join("、") : "文本 / 浮点 / 枚举类型正确（金额最多两位小数）"],
    ["命名", "命名规则可解析（FR-MID-03）", "BLOCK", tplRule() ? "PASS" : "FAIL", (tplRule() || {}).id + " · " + ((tplRule() || {}).pattern || []).join("/")],
    ["命名", "渲染名称长度 ≤ 120 字符（BR-39）", "BLOCK", nm.length <= 120 ? "PASS" : "FAIL", "当前 " + nm.length + " 字符"],
    ["命名", "无禁止字符（BR-40）", "BLOCK", bad ? "FAIL" : "PASS", bad ? "渲染名称含禁止字符" : "字符集合规"],
    ["渠道", "渠道兼容性：所选渠道支持该 objective 与版位", "BLOCK", "PASS", d.channel + " 支持 " + d.objective + " + 自动版位"],
    ["素材", "素材槽位均已定义比例", "WARN", d.slots.length ? "PASS" : "WARN", d.slots.length ? d.slots.length + " 个槽位：" + d.slots.map(function (x) { return x.ratio; }).join(" / ") : "尚未配置素材槽位"]
  ];
}

function tplStep() { const n = Number(ADH.s().tplStep || 1); return Math.min(TPL_STEPS.length, Math.max(1, n)); }
function tplEditor() {
  tplNormalize();
  const d = tplD(), step = tplStep(), checks = tplCheckList();
  const typeCount = { text: 0, float: 0, enum: 0 };
  TPL_LEVELS.forEach(function (lv) { lv.fields.forEach(function (f) { typeCount[tplFieldType(f)]++; }); });
  const blocked = checks.filter(function (c) { return c[2] === "BLOCK" && c[3] === "FAIL"; });
  const rendered = tplRendered();
  let h = '<div class="flex between center wrap mb12"><div>' +
    '<div class="flex center gap8"><h2 style="margin:0;font-size:16px">' + (ADH.s().tplEditId ? "编辑模板" : "新建模板") + "</h2>" +
    ADH.chip("brand", "FR-MID-01 创建结构模板") + ADH.chip("neutral", "BR-34 保存校验") + "</div>" +
    '<div class="xs muted mt4">模板 = 层级骨架 + 字段默认值 + 用户直接输入 + 素材槽位（PRD 6.1.2）</div></div>' +
    '<div class="flex gap8"><button class="btn" data-act="tpl-cancel">取消返回</button>' +
    '<button class="btn primary" data-act="tpl-save"' + (blocked.length ? ' title="存在 ' + blocked.length + " 项阻断，请先修正\"" : "") + ">" + ADH.icon("check", 13) + "保存并校验</button></div></div>";

  h += '<div class="wizard">' + TPL_STEPS.map(function (x, i) {
    const n = i + 1;
    return (i ? '<i class="wz-line' + (step > n - 1 ? " done" : "") + '"></i>' : "") +
      '<div class="wz ' + (step > n ? "done" : (step === n ? "on" : "")) + '" data-act="tpl-step" data-v="' + n + '"><span class="n">' + (step > n ? "✓" : n) + '</span><span class="t"><b>' + x[0] + "</b><small>" + x[1] + "</small></span></div>";
  }).join("") + "</div>";

  h += '<div class="grid g-3-2"><div class="card"><div class="card-head"><h3>' + ADH.icon("layers", 15) + "STEP " + step + " · " + TPL_STEPS[step - 1][0] +
    '</h3><div class="right"><span class="xs muted">' + TPL_STEPS[step - 1][1] + "</span></div></div><div class=\'card-body\'>";

  if (step === 1) {
    h += ADH.note("info", "作用域与版本（BR-35 / BR-36）", "系统模板为内置示例不可修改；新建模板可选 <b>个人</b>（仅创建者）或 <b>共享</b>（团队可见，本期保留字段）。模板被任务引用后修改<b>不回溯</b>已完成任务，新任务默认使用最新版本。") +
      '<div class="grid g2 mt12">' +
      '<div class="field" style="grid-column:1/-1"><label>模板名称 <span style="color:var(--danger)">*</span></label><input id="tpl-name" class="input" placeholder="如：Meta 付费 · 霸总短剧 · 9:16 视频" value="' + ADH.esc(d.name) + '" data-live="1" data-act="tpl-name" /></div>' +
      '<div class="field"><label>适用渠道</label><select id="tpl-channel" class="select" data-live="1" data-act="tpl-channel">' + ["Meta", "Google", "TikTok"].map(function (c) { return "<option" + (d.channel === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>默认目标 objective</label><select id="tpl-objective" class="select" data-live="1" data-act="tpl-objective">' + [["OUTCOME_SALES", "OUTCOME_SALES（付费转化）"], ["OUTCOME_TRAFFIC", "OUTCOME_TRAFFIC（流量）"], ["OUTCOME_AWARENESS", "OUTCOME_AWARENESS（认知）"]].map(function (o) { return '<option value="' + o[0] + '"' + (d.objective === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>" +
      '<div class="field" style="grid-column:1/-1"><label>作用域</label><div class="seg" style="display:inline-flex">' +
      Object.keys(TPL_SCOPE_DEF).map(function (k) { return '<button class="' + (d.scope === k ? "on" : "") + '" data-act="tpl-scope" data-v="' + k + '">' + TPL_SCOPE_DEF[k][1].split("（")[0] + "</button>"; }).join("") +
      '</div><div class="xs muted mt4">' + TPL_SCOPE_DEF[d.scope][1] + "</div></div>" +
      '<div class="field" style="grid-column:1/-1"><label>模板说明</label><textarea id="tpl-desc" class="input" rows="2" placeholder="用途、适用场景、注意事项" data-live="1" data-act="tpl-desc">' + ADH.esc(d.desc) + "</textarea></div></div>";
  } else if (step === 2) {
    h += ADH.note("rule", "四层骨架（Meta 对象模型）", "Campaign → AdSet → <b>Creative</b> → Ad：Creative 是独立对象，可被多条 Ad 复用；Ad 只做绑定（<span class='tag-code'>creative_id</span>）与转化域名 / 追踪。字段第 5 列为渠道枚举，优化目标 / 计费事件 / 转化位置随 objective 联动收敛（文档 3.3 / 4.3）。") +
      '<div class="ep-row">' + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/campaigns") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adsets") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adcreatives") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/ads") + "</div>" +
      ADH.note("info", "用户输入与字段类型", "用户输入直接在 STEP 2 填写：文本字段使用文本框，<b>Campaign 日预算 / 花费上限 / AdSet 日预算</b>使用浮点数输入并校验最多两位小数；枚举字段使用下拉框。名称、素材与序号字段仍由命名规则或运行时绑定生成。");
    TPL_LEVELS.forEach(function (lv) {
      h += '<div class="rb-block mt12"><div class="rb-head"><span class="no">' + lv.no + "</span>" + lv.label +
        '<span class="right">' + lv.fields.length + " 个字段</span></div><div class=\"rb-body\">" +
        ADH.tbl("tpl-f-" + lv.key, [{ label: "字段" }, { label: "键名" }, { label: "取值" }, { label: "类型" }],
          lv.fields.map(function (f) {
            const val = String(d.nodes[lv.key][f[1]] || "");
            const fid = "tpl-f-" + lv.key + "-" + f[1];
            const off = tplFieldOff(lv.key, f[1], d);
            const ftype = tplFieldType(f);
            const typeLabel = tplFieldTypeLabel(ftype);
            let ctl;
            if (f[4]) {
              const opts = tplOpts(f[4]).slice();
              if (opts.indexOf(val) < 0) opts.unshift(val);
              ctl = '<select id="' + fid + '" class="select" style="padding:4px 8px;font-size:11.5px' + (off ? ";opacity:.55" : "") + '" data-field-type="enum" data-live="1" data-act="tpl-field" data-lv="' + lv.key + '" data-fk="' + f[1] + '"' + (off ? ' disabled title="' + ADH.esc(off) + '"' : "") + ">" +
                opts.map(function (o) { return '<option value="' + ADH.esc(o) + '"' + (val === o ? " selected" : "") + ">" + ADH.esc(o) + "</option>"; }).join("") + "</select>";
            } else if (ftype === "float") {
              ctl = '<input id="' + fid + '" type="number" min="0" step="0.01" inputmode="decimal" class="input mono" style="padding:4px 8px;font-size:11.5px' + (off ? ";opacity:.55" : "") + '" value="' + ADH.esc(val) + '" placeholder="0.00"' + (off ? ' disabled title="' + ADH.esc(off) + '"' : "") + ' data-field-type="float" data-live="1" data-act="tpl-field" data-lv="' + lv.key + '" data-fk="' + f[1] + '" />';
            } else {
              ctl = '<input id="' + fid + '" type="text" class="input mono" style="padding:4px 8px;font-size:11.5px' + (off ? ";opacity:.55" : "") + '" value="' + ADH.esc(val) + '"' + (off ? ' disabled title="' + ADH.esc(off) + '"' : "") + ' data-field-type="text" data-live="1" data-act="tpl-field" data-lv="' + lv.key + '" data-fk="' + f[1] + '" />';
            }
            const tag = '<span class="chip neutral">' + typeLabel + "</span>" + (off ? ' <span class="muted xs" title="' + ADH.esc(off) + '">未启用</span>' : "");
            return { c: ['<b class="small">' + f[0] + "</b>", '<span class="mono xs muted">' + f[1] + "</span>", ctl, tag] };
          }), { tight: true }) + "</div></div>";
    });
  } else if (step === 3) {
    h += ADH.sec("命名规则绑定（FR-MID-03）") + ADH.note("info", "各层名称由命名规则引擎生成", "模板不写死最终名称，Campaign / AdSet / Ad 各层名称引用命名规则；右侧实时预览按示例变量渲染。");
    h += '<div class="grid g2 mt8">' + D.namingRules.map(function (r) {
      const on = d.ruleId === r.id;
      return '<div class="todo" style="' + (on ? "border-color:var(--brand);background:var(--brand-soft)" : "") + '" data-act="tpl-rule" data-v="' + r.id + '">' +
        '<div class="ico-wrap" style="background:var(--surface-3);color:var(--ink-2)">' + ADH.icon("tag", 15) + "</div>" +
        '<div class="tx"><b>' + r.name + '</b><small class="mono">' + r.pattern.join(r.sep) + "</small></div>" +
        (on ? ADH.chip("ok", "已绑定") : ADH.chip("neutral", "选择")) + "</div>";
    }).join("") + "</div>";
    h += '<div class="mt12">' + ADH.sec("素材槽位") + '<div class="xs muted mb8">素材槽位 = Ad 中待填充的素材占位，批量创建时按组合维度逐一填入。</div>' +
      ADH.tbl("tpl-slots", [{ label: "比例" }, { label: "槽位说明" }, { label: "" }],
        d.slots.map(function (s, i) {
          return { c: ['<span class="tag-code">' + s.ratio + "</span>", s.label, '<button class="btn xs danger-ghost" data-act="tpl-slot-del" data-v="' + i + '">移除</button>'] };
        }), { tight: true, empty: "尚未配置素材槽位", emptyDesc: "至少配置 1 个比例槽位；未匹配比例的素材将在创建时被阻断（BR-29）。", emptyAction: '<button class="btn sm primary" data-act="tpl-slot-add">新增素材槽位</button>' }) +
      '<div class="mt8"><button class="btn sm" data-act="tpl-slot-add">' + ADH.icon("plus", 13) + "新增素材槽位</button></div></div>";
    h += '<div class="mt12">' + ADH.note("warn", "BR-37 模板套用到新账户", "套用到新账户时，系统比对账户下可用受众与素材资源，缺失项给出补建入口（差异清单在批量计划 STEP 2 中展示）。") + "</div>";
  } else {
    h += ADH.note(blocked.length ? "danger" : "ok", blocked.length ? "校验未通过（" + blocked.length + " 项阻断）" : "校验通过，可保存",
      blocked.length ? "存在阻断项，保存将被拦截；请返回对应步骤修正后重新校验。" : "四层必填完整 ✓ 字段类型合法 ✓ 命名规则可解析 ✓ 三要素兼容 ✓ —— 保存后生成版本 v1（FR-MID-06）。");
    h += '<div class="mt12">' + ADH.sec("校验清单（BR-34）") + ADH.tbl("tpl-checks", [{ label: "类别" }, { label: "校验项" }, { label: "级别" }, { label: "结果" }, { label: "说明" }],
      checks.map(function (c) {
        return { c: ['<span class="chip neutral">' + c[0] + "</span>", c[1], ADH.chip(c[2] === "BLOCK" ? "danger" : "warn", c[2]),
          c[3] === "PASS" ? ADH.chip("ok", "通过") : (c[3] === "FAIL" ? ADH.chip("danger", "阻断") : ADH.chip("warn", "警告")),
          '<span class="xs muted">' + c[4] + "</span>"] };
      }), { tight: true }) + "</div>";
    h += '<div class="mt12">' + ADH.sec("渲染预览（BR-38：1 个账户 × 1 个素材）") +
      '<div class="formula">模板：<span class="v">' + ADH.esc(d.name || "（未命名模板）") + "</span><br/>Campaign : <span class=\"v\">meta_conversion_20260920_camp</span><br/>AdSet&nbsp;&nbsp;&nbsp;: <span class=\"v\">" + ADH.esc(rendered.name) + "</span><br/>Creative&nbsp;: <span class=\"v\">" + ADH.esc(rendered.name + "_cr") + "</span><br/>Ad&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <span class=\"v\">" + ADH.esc(rendered.name + "_001") + "</span></div>" +
      '<div class="ep-row" style="margin-top:10px">' + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/campaigns") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adsets") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adcreatives") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/ads") + "</div></div>";
  }

  h += "</div></div>" +
    '<div class="grid" style="gap:12px">' +
    '<div class="card"><div class="card-head"><h3>' + ADH.icon("eye", 15) + '实时预览<span class="desc">BR-38</span></h3></div><div class="card-body">' +
    ADH.kv([["模板名", ADH.esc(d.name || "（未命名）")], ["作用域", TPL_SCOPE_DEF[d.scope][1]], ["渠道 / 目标", d.channel + " · " + d.objective], ["命名规则", '<span class="tag-code">' + ADH.esc(rendered.rule.id) + "</span>"]]) +
    '<div class="hr"></div><div class="tree">' +
    '<div class="tree-row"><span class="lvl-chip lvl-CAMPAIGN">CAMPAIGN</span><span class="nm">meta_conversion_20260920_camp</span><span class="sp">' + ADH.chip("warn", "PAUSED") + "</span></div>" +
    '<div class="tree-children"><div class="tree-row"><span class="lvl-chip lvl-ADSET">ADSET</span><span class="nm">' + ADH.esc(rendered.name) + '</span><span class="sp"><span class="xs muted">日预算 ' + ADH.esc(String(d.nodes.ADSET.dailyBudget || "")) + "</span></span></div>" +
    '<div class="tree-children"><div class="tree-row"><span class="lvl-chip lvl-CREATIVE">CREATIVE</span><span class="nm">' + ADH.esc(rendered.name + "_cr") + '</span><span class="sp"><span class="xs muted">page_id ' + ADH.esc(String(d.nodes.CREATIVE.pageId || "未绑定")) + " · " + ADH.esc(String(d.nodes.CREATIVE.creativeType || "")) + "</span></span></div>" +
    '<div class="tree-children"><div class="tree-row"><span class="lvl-chip lvl-AD">AD</span><span class="nm">' + ADH.esc(rendered.name + "_001") + '</span><span class="sp"><span class="xs muted">creative_id 引用 · ' + ADH.esc(d.slots.length ? d.slots[0].ratio + " 素材槽位" : "未配置槽位") + "</span></span></div></div></div></div></div>" +
    '<div class="mt12 xs muted">预览与实际创建结果必须 100% 一致（BR-38 / AC-05）。</div></div></div>' +
    '<div class="card"><div class="card-head"><h3>' + ADH.icon("check", 15) + '校验摘要<span class="desc">BR-34</span></h3></div><div class="card-body">' +
    ADH.kv([["阻断项", blocked.length ? '<span class="chip danger">' + blocked.length + "</span>" : '<span class="chip ok">0</span>'],
      ["警告项", '<span class="mono">' + checks.filter(function (c) { return c[3] === "WARN"; }).length + "</span>"],
      ["文本字段", '<span class="mono">' + typeCount.text + "</span>"],
      ["浮点字段", '<span class="mono">' + typeCount.float + "</span>"],
      ["枚举字段", '<span class="mono">' + typeCount.enum + "</span>"],
      ["素材槽位", '<span class="mono">' + d.slots.length + "</span>"]]) +
    '<div class="mt12">' + ADH.note(blocked.length ? "warn" : "ok", blocked.length ? "存在阻断项" : "可保存",
      blocked.length ? "请修正后在 STEP 4「校验与预览」重新校验。" : "点击「保存并校验」生成版本 v1。") + "</div></div></div></div></div>";

  h += '<div class="toolbar mt12"><div class="grow"></div><span class="xs muted">STEP ' + step + " / " + TPL_STEPS.length + "</span>" +
    '<button class="btn sm" data-act="tpl-step" data-v="' + Math.max(1, step - 1) + '"' + (step === 1 ? " disabled" : "") + ">上一步</button>" +
    (step < TPL_STEPS.length
      ? '<button class="btn primary sm" data-act="tpl-step" data-v="' + (step + 1) + '">下一步</button>'
      : '<button class="btn primary sm" data-act="tpl-save">保存并校验</button>') + "</div>";
  return h;
}
ADH.action("tpl-new", function () {
  if (!ADH.assertPerm("template.edit")) return;
  const s = ADH.s();
  s.tplMode = "new"; s.tplEditId = null; s.tplStep = 1; s.tplSub = null; s.tplDraft = tplBlank(); s.crumbSub = "新建模板";
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("tpl-edit", function (p) {
  if (!ADH.assertPerm("template.edit")) return;
  const t = D.templates.filter(function (x) { return x.id === p.v; })[0];
  if (!t) return;
  const s = ADH.s(), draft = tplBlank();
  draft.name = t.name; draft.desc = t.desc || ""; draft.channel = t.channel;
  draft.scope = t.scope === "SYSTEM" ? "PERSONAL" : t.scope;
  draft.ruleId = t.namingRuleId;
  (t.nodes || []).forEach(function (n) {
    const tgt = draft.nodes[n.level];
    const lv = TPL_LEVELS.filter(function (x) { return x.key === n.level; })[0];
    if (!tgt || !lv) return;
    (n.fields || []).forEach(function (f) {
      const hit = lv.fields.filter(function (x) { return x[0] === f[0]; })[0];
      if (hit && f[1]) tgt[hit[1]] = f[1];
    });
  });
  draft.vars = [];
  s.tplMode = "new"; s.tplEditId = t.id; s.tplStep = 1; s.tplSub = null; s.tplDraft = draft; s.crumbSub = "编辑模板 · " + t.name;
  ADH.act("overlay-close", { dataset: {} });
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("tpl-cancel", function () {
  const s = ADH.s();
  s.tplMode = null; s.tplEditId = null; s.tplDraft = null; s.tplStep = 1; s.tplSub = null; s.crumbSub = null;
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("tpl-step", function (p) {
  const s = ADH.s();
  s.tplStep = Math.min(TPL_STEPS.length, Math.max(1, Number(p.v)));
  s.tplSub = null;
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("tpl-name", function (p, el) { tplD().name = String(el.value); if (el.id) ADH.state.focusId = el.id; ADH.render(); });
ADH.action("tpl-desc", function (p, el) { tplD().desc = String(el.value); if (el.id) ADH.state.focusId = el.id; ADH.render(); });
ADH.action("tpl-channel", function (p, el) { tplD().channel = String(el.value); ADH.render(); });
ADH.action("tpl-objective", function (p, el) { tplD().objective = String(el.value); tplD().nodes.CAMPAIGN.objective = String(el.value); tplNormalize(); ADH.render(); });
ADH.action("tpl-scope", function (p) { tplD().scope = p.v; ADH.render(); });
ADH.action("tpl-rule", function (p) { tplD().ruleId = p.v; ADH.render(); });
ADH.action("tpl-field", function (p, el) {
  const d = tplD();
  if (d.nodes[p.lv] && d.nodes[p.lv][p.fk] !== undefined) d.nodes[p.lv][p.fk] = String(el.value);
  if (p.fk === "objective") d.objective = String(el.value);
  tplNormalize();
  if (el.id) ADH.state.focusId = el.id;
  ADH.render();
});
ADH.action("tpl-var-set", function (p, el) {
  const v = tplD().vars[Number(p.i)];
  if (!v) return;
  v[p.vk] = String(el.value);
  if (el.id) ADH.state.focusId = el.id;
  ADH.render();
});
ADH.action("tpl-var-add", function () {
  const d = tplD();
  d.vars.push({ name: "变量" + (d.vars.length + 1), type: "用户输入", def: "", desc: "" });
  ADH.render();
});
ADH.action("tpl-var-del", function (p) { tplD().vars.splice(Number(p.v), 1); ADH.render(); });
ADH.action("tpl-var-autofix", function () {
  const d = tplD(), undef = tplUndef();
  undef.forEach(function (n) { d.vars.push({ name: n, type: "用户输入", def: "", desc: "由字段引用自动补全，请确认默认值" }); });
  ADH.toast("已补全 " + undef.length + " 个变量定义", "ok", "请确认各变量默认值；默认值留空时渲染预览将原样保留占位符。");
  ADH.render();
});
/* 变量面板 → 点击插入（FR-MID-02）：插入到目标字段光标处，保持目标字段与光标位置 */
ADH.action("tpl-var-insert", function (p) {
  const expr = String(p.v || "");
  if (!expr) return;
  const st = tplVarState();
  const el = document.getElementById(st.varTargetId || ADH.state.focusId || "");
  if (!el || !el.dataset || !el.dataset.varOk) {
    ADH.toast("请先点击目标字段再插入变量", "warn", "变量只能插入到 PRD 6.1.2 标注「支持变量」的字段：Campaign 名称；AdSet 名称 / 地域 / 年龄 / 预算；Ad 名称 / URL / 文案 / 追踪参数。其余字段为固定值。");
    return;
  }
  tplInsertInto(el, expr);
});
ADH.action("tpl-slot-add", function () { tplD().slots.push({ ratio: "4:5", label: "竖版图（Feed）" }); ADH.render(); });
ADH.action("tpl-slot-del", function (p) { tplD().slots.splice(Number(p.v), 1); ADH.render(); });
ADH.action("tpl-save", function () {
  if (!ADH.assertPerm("template.edit")) return;
  const checks = tplCheckList();
  const blocked = checks.filter(function (c) { return c[2] === "BLOCK" && c[3] === "FAIL"; });
  if (blocked.length) {
    ADH.s().tplStep = TPL_STEPS.length;
    ADH.toast("保存被拦截（BR-34）", "warn", blocked.length + " 项阻断：" + blocked.map(function (c) { return c[1]; }).join("；"));
    ADH.render(); window.scrollTo(0, 0);
    return;
  }
  const d = tplD(), rendered = tplRendered();
  ADH.overlay({
    kind: "modal", title: "保存模板并生成版本", desc: "BR-34 校验通过 · FR-MID-06 版本管理",
    body: ADH.note("ok", "校验通过", "必填字段完整 ✓ 字段类型合法 ✓ 命名规则可解析 ✓") +
      ADH.sec("保存内容") + ADH.kv([["模板名称", ADH.esc(d.name)], ["作用域", TPL_SCOPE_DEF[d.scope][1]], ["渠道 / 目标", d.channel + " · " + d.objective],
        ["命名规则", '<span class="tag-code">' + ADH.esc(rendered.rule.id) + "</span>"], ["字段类型", "文本 / 浮点 / 枚举"],
        ["素材槽位", d.slots.map(function (s) { return s.ratio; }).join(" / ") || "—"], ["版本", '<span class="tag-code">' + (ADH.s().tplEditId ? "v+1（变更留版本）" : "v1（新建）") + "</span>"]]) +
      ADH.note("info", "BR-36 版本策略", "保存后生成新版本；<b>不回溯</b>已完成任务；新任务默认使用最新版本，也可手动指定历史版本。"),
    foot: '<button class="btn" data-act="overlay-close">继续编辑</button><div class="grow"></div><button class="btn primary" data-act="tpl-save-confirm">确认保存</button>'
  });
});
ADH.action("tpl-save-confirm", function () {
  const d = tplD(), s = ADH.s(), rendered = tplRendered();
  if (!String(d.name).trim()) {
    ADH.act("overlay-close", { dataset: {} });
    ADH.toast("模板名称不能为空（BR-34）", "warn", "请回到 STEP 1 填写模板名称后再保存。");
    return;
  }
  const editing = s.tplEditId;
  if (editing) {
    const t = D.templates.filter(function (x) { return x.id === editing; })[0];
    if (t) { t.name = d.name; t.desc = d.desc || t.desc; t.channel = d.channel; t.namingRuleId = d.ruleId; t.updatedAt = D.env.today; t.invalid = null; }
  } else {
    D.templates.unshift({
      id: "TPL-NEW-" + String(D.templates.length + 1).padStart(3, "0"), name: d.name, desc: d.desc || "由模板编辑器创建（FR-MID-01）",
      scope: d.scope, channel: d.channel, version: "v1", namingRuleId: d.ruleId, refTasks: 0, updatedAt: D.env.today, invalid: null,
      nodes: TPL_LEVELS.map(function (lv) { return { level: lv.key, fields: lv.fields.map(function (f) { return [f[0], d.nodes[lv.key][f[1]]]; }) }; }),
      vars: d.vars.map(function (v) { return { name: v.name, type: v.type, def: v.def, desc: v.desc }; })
    });
  }
  ADH.act("overlay-close", { dataset: {} });
  s.tplMode = null; s.tplEditId = null; s.tplDraft = null; s.tplStep = 1; s.tplSub = null; s.crumbSub = null;
  ADH.toast(editing ? "模板已更新" : "模板已创建", "ok", "「" + d.name + "」保存成功（" + rendered.rule.id + "）；可在列表中使用、预览或套用到批量计划。");
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("tpl-preview", function (p) {
  const t = D.templates.filter(function (x) { return x.id === p.v; })[0];
  const acc = D.accounts[0], asset = D.assets[0];
  const rule = D.namingRules.filter(function (r) { return r.id === t.namingRuleId; })[0];
  const sample = { "渠道": "meta", "目标": "conversion", "受众": "25-34-female", "素材类型": "video", "日期": "20260920", "序号:3": "001", "账户": acc.name, "版本": "v3" };
  const rendered = rule.pattern.map(function (k) { return sample[k] || k; }).join(rule.sep);
  let body = ADH.note("info", "预览口径（BR-38）", "按 <b>1 个账户 × 1 个素材</b> 渲染示例，展示最终结构树；预览与实际创建结果必须 100% 一致（AC-05）。") +
    ADH.note("rule", "模板说明", ADH.esc(t.desc || "创建模板时未填写模板说明")) +
    ADH.sec("结构树（账户 " + acc.name + "）") +
    '<div class="tree">' +
    '<div class="tree-row"><span class="lvl-chip lvl-CAMPAIGN">CAMPAIGN</span><span class="nm">meta_conversion_20260920_camp</span><span class="sp"><span class="tag-code">OUTCOME_SALES</span>' + ADH.chip("warn", "PAUSED") + "</span></div>" +
    '<div class="tree-children"><div class="tree-row"><span class="lvl-chip lvl-ADSET">ADSET</span><span class="nm">' + rendered + '</span><span class="sp"><span class="xs muted">日预算 120 USD</span><span class="xs muted">25-34 女性 · 言情短剧兴趣</span></span></div>' +
    '<div class="tree-children"><div class="tree-row"><span class="lvl-chip lvl-CREATIVE">CREATIVE</span><span class="nm">' + rendered + '_cr</span><span class="sp"><span class="xs muted">Page PAGE-1029384 · SINGLE_VIDEO</span></span></div>' +
    '<div class="tree-children"><div class="tree-row"><span class="lvl-chip lvl-AD">AD</span><span class="nm">meta_conversion_25-34-female_video_20260920_001</span><span class="sp"><span class="xs muted">' + asset.name + "</span></span></div></div></div></div></div>" +
    ADH.sec("成本预估（BR-49）") + '<div class="grid g3">' +
    [["AdSet 数", "1 个"], ["Ad 数", "1 条"], ["预估日消耗", "$120.00"]].map(function (x) { return '<div class="stat"><div class="label">' + x[0] + '</div><div class="value" style="font-size:16px">' + x[1] + "</div></div>"; }).join("") + "</div>";
  ADH.overlay({ kind: "modal", wide: true, title: "模板预览 · " + t.name, desc: "FR-MID-04 预览模板说明与最终结构", body: body, foot: '<button class="btn" data-act="overlay-close">关闭</button><div class="grow"></div><button class="btn primary" data-act="goto" data-page="batch-plan">用该模板创建批量计划</button>' });
});
})();

/* ---------------- 命名规则引擎 ---------------- */
(function () {
const D = ADH_DATA;
const BAD_CHARS = ["/", "\\", ":", "*", "?", '"', "<", ">", "|"];
const DEFAULT_PATTERN = ["渠道", "目标", "受众", "日期", "序号:3"];
/* 真实模式（F5）：命名规则已接入后端 —— 字段字典 / 列表 / 校验 / 预览 / 反向解析 / 写路径改走接口，
 * 未接入（DEMO / SANDBOX）时沿用 data.js 演示数据，两者共用同一套渲染与动作。 */
function srvOn() { return !!(ADH.live && ADH.live.serverList("naming")); }
function touch() { ADH.s().namingTouched = true; }
function uniq(arr) { return arr.filter(function (x, i) { return !!x && arr.indexOf(x) === i; }); }
function fieldList() { return (srvOn() ? ADH.live.namingFieldList() : D.namingFields) || []; }
function findRule(id) {
  return (D.namingRules || []).filter(function (r) { return String(r.id) === String(id); })[0] || null;
}
function curRule() {
  const s = ADH.s();
  const picked = (s.ruleId === undefined || s.ruleId === null) ? null : findRule(s.ruleId);
  return picked || (D.namingRules || [])[0] || null;
}
function pattern() {
  const s = ADH.s();
  if (!s.pattern || !s.pattern.length) {
    const r = curRule();
    s.pattern = (r && r.pattern && r.pattern.length ? r.pattern : DEFAULT_PATTERN).slice();
  }
  return s.pattern;
}
function sep() {
  const s = ADH.s();
  if (!s.sep) s.sep = (curRule() || {}).sep || "_";
  return s.sep;
}
function nameOf() {
  const s = ADH.s();
  if (s.ruleName === undefined || s.ruleName === null) s.ruleName = (curRule() || {}).name || "";
  return s.ruleName;
}
function scopeOf() {
  const s = ADH.s();
  if (!s.ruleScope) {
    const code = (curRule() || {}).scopeCode || "PERSONAL";
    /* 契约不支持新建 SYSTEM 内置规则：载入内置规则时按「另存为共享副本」处理 */
    s.ruleScope = code === "SYSTEM" ? "SHARED" : code;
  }
  return s.ruleScope;
}
function maxLen() {
  const s = ADH.s();
  if (!s.maxLen) s.maxLen = Number((curRule() || {}).maxLength || 120);
  return s.maxLen;
}
function dupOf() {
  const s = ADH.s();
  if (!s.dupStrategy) s.dupStrategy = (curRule() || {}).dupStrategy || "APPEND_SEQ";
  return s.dupStrategy;
}
function sampleOf(k) {
  const f = fieldList().filter(function (x) { return x.key === k; })[0];
  return (f && f.sample) || k;
}
function sampleValues() {
  const out = {};
  pattern().forEach(function (k) { out[k] = sampleOf(k); });
  return out;
}
function renderName(p) {
  const sv = sampleValues();
  return p.map(function (k) { return sv[k] || k; }).join(sep());
}
function optHtml(pairs, cur) {
  return pairs.map(function (o) {
    return '<option value="' + ADH.esc(o[0]) + '"' + (String(cur) === String(o[0]) ? " selected" : "") + (o[2] ? " disabled" : "") + ">" + ADH.esc(o[1]) + "</option>";
  }).join("");
}
function sepOptions(cur) {
  const pairs = [["_", "下划线 _"], ["-", "短横线 -"]];
  if (cur && cur !== "_" && cur !== "-") pairs.push([cur, "自定义 " + cur]);
  return optHtml(pairs, cur);
}
function scopeOptions(cur) {
  const pairs = srvOn()
    ? [["SYSTEM", "系统内置（只读，另存为副本）", true], ["SHARED", "共享模板"], ["PERSONAL", "个人模板"]]
    : uniq((D.namingRules || []).map(function (r) { return r.scope; })).map(function (x) { return [x, x]; });
  return optHtml(pairs, cur);
}
function dupOptions(cur) { return optHtml([["APPEND_SEQ", "自动追加序号"], ["BLOCK", "阻断提交"]], cur); }
function ruleIdOf(r) { return srvOn() ? r.rawId : r.id; }
function scopeText(r) { return srvOn() ? ADH.live.scopeLabel(r.scopeCode) : r.scope; }
function dupText(r) { return srvOn() ? ADH.live.dupLabel(r.dupStrategy) : (r.dupStrategy === "APPEND_SEQ" ? "自动追加序号" : "阻断提交"); }
function parseTable(items) {
  if (ADH.live && ADH.live.namingParseTable) return ADH.live.namingParseTable(items);
  return ADH.tbl("t-rev", [{ label: "名称" }, { label: "解析结果" }, { label: "结构化字段" }], items.map(function (it) {
    const keys = Object.keys(it.fields || {});
    return { c: ['<span class="mono xs">' + ADH.esc(it.name) + "</span>", it.matched ? ADH.chip("ok", "已识别") : ADH.chip("warn", "未识别"),
      keys.length ? keys.map(function (k) { return '<span class="tag-code">' + ADH.esc(k) + "</span> " + ADH.esc(it.fields[k]); }).join("　") : '<span class="xs muted">—</span>'] };
  }), { tight: true, empty: "无解析结果" });
}
/* 演示模式的反向解析：按位对齐切分（与后端 naming.parse_names 同口径，不含封闭枚举白名单校验） */
function localParse(rule, names) {
  const tokens = rule.pattern || [];
  return names.map(function (n) {
    const parts = String(n).split(rule.sep);
    const matched = tokens.length > 0 && parts.length === tokens.length && parts.every(function (x) { return !!x; });
    const fields = {};
    if (matched) tokens.forEach(function (k, i) { fields[k] = parts[i]; });
    return { name: String(n), matched: matched, fields: matched ? fields : {} };
  });
}
function parseNames(raw) {
  return String(raw || "").split(/[\n,;]+/).map(function (x) { return x.trim(); }).filter(function (x) { return !!x; }).slice(0, 200);
}

ADH.page("naming", {
  title: "命名规则引擎", subtitle: "可视化编排 · 实时预览 · 冲突与合规校验 · 反向解析",
  refs: ["FR-MID-08 可视化命名编辑器", "FR-MID-09 命名模板语法", "FR-MID-10 实时预览", "FR-MID-11 命名冲突检测", "FR-MID-12 渠道合规校验", "FR-MID-13 命名反向解析", "BR-39~BR-44"],
  render: function () {
    const tab = ADH.tabOf("editor");
    const srv = srvOn();
    const s = ADH.s();
    const p = pattern();
    const nm = renderName(p);
    const len = nm.length;
    const limit = maxLen();
    const bad = BAD_CHARS.filter(function (c) { return nm.indexOf(c) >= 0; });
    let h = '<div class="card mb12"><div class="tabs">' +
      [["editor", "可视化编辑器"], ["rules", "规则库"], ["reverse", "命名反向解析"]].map(function (t) {
        return '<button class="' + (tab === t[0] ? "on" : "") + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + "</div>";

    if (tab === "editor") {
      h += '<div class="card-body"><div class="grid g-3-2"><div>' + ADH.sec("字段序列（点击插入字段 · ⇅ 与后一位交换 · ✕ 移除）") +
        (p.length
          ? '<div class="flex gap6 wrap mb12">' + p.map(function (k, i) {
              return '<div class="chip brand" style="padding:4px 9px;font-size:11.5px;cursor:default">' + ADH.esc(k) +
                ' <span class="mono xs" style="opacity:.75">' + ADH.esc(sampleOf(k)) + "</span> " +
                '<span style="cursor:pointer;opacity:.7" data-act="naming-move" data-v="' + i + '" title="与后一位交换">⇅</span>' +
                '<span style="cursor:pointer;opacity:.7" data-act="naming-chip-del" data-v="' + i + '" title="移除该字段">✕</span></div>';
            }).join("") + "</div>"
          : ADH.note("warn", "字段序列为空", "命名规则至少需要一个字段（FR-MID-08）；保存时后端返回 42201（NAMING_PATTERN_EMPTY）。")) +
        '<div class="toolbar mb12"><span class="xs muted">插入字段</span>' +
        fieldList().map(function (f) {
          return '<button class="btn xs" data-act="naming-add" data-v="' + ADH.esc(f.key) + '">+ ' + ADH.esc(f.key) + "</button>";
        }).join("") + "</div>" +
        '<div class="grid g2 mb12">' +
        '<div class="field"><label>规则名称' + (srv ? "（必填 1–64 字）" : "") + '</label><input id="nr-name" class="input" data-live="1" data-act="naming-name" placeholder="如：标准三层命名" value="' + ADH.esc(nameOf()) + '" /></div>' +
        '<div class="field"><label>作用域</label><select id="nr-scope" class="select" data-live="1" data-act="naming-scope">' + scopeOptions(scopeOf()) + "</select></div>" +
        "</div>" +
        '<div class="toolbar mb12">' +
        '<div class="field" style="width:130px"><label>分隔符</label><select id="nr-sep" class="select" data-live="1" data-act="naming-sep">' + sepOptions(sep()) + "</select></div>" +
        '<div class="field" style="width:170px"><label>重名策略（BR-41）</label><select id="nr-dup" class="select" data-live="1" data-act="naming-dup">' + dupOptions(dupOf()) + "</select></div>" +
        '<div class="field" style="width:140px"><label>名称长度上限</label><input id="nr-maxlen" class="input mono" type="number" min="1" max="255" data-live="1" data-act="naming-maxlen" value="' + limit + '" /></div>' +
        "</div>" +
        ADH.sec("公式") + '<div class="formula">{' + ADH.esc(p.join("}" + sep() + "{")) + '}<br/><span class="c">→ </span><span class="v">' + ADH.esc(nm) + "</span></div>" +
        "</div><div>" + ADH.sec("实时预览（FR-MID-10）") +
        '<div class="card" style="box-shadow:none"><div class="card-body">' +
        ADH.kv([["渲染结果", '<span class="mono" style="word-break:break-all">' + ADH.esc(nm) + "</span>"],
          ["字符长度", '<b class="mono">' + len + "</b> / " + limit + ' <span class="xs muted">（' + (srv ? "规则 maxLength" : "Meta 建议 ≤ 120") + "，BR-39）</span>"],
          ["字段数", p.length + " 个"],
          ["示例数据", Object.keys(sampleValues()).map(function (k) { return ADH.esc(k) + "=" + ADH.esc(sampleOf(k)); }).slice(0, 4).join(" · ") + " …"]]) + "</div></div>" +
        ADH.sec("合规校验（BR-39 / BR-40）") +
        (len > limit
          ? ADH.note("danger", "长度超限", "当前 " + len + " 字符，超出上限 " + limit + "；保存时后端返回 42201（NAMING_TOO_LONG），预览按上限截断并置 truncated=true。")
          : ADH.note("ok", "长度合规", "当前 " + len + " 字符，未超过上限 " + limit + "。")) +
        '<div class="mt8">' + (bad.length
          ? ADH.note("danger", "禁止字符", "命中渠道限制字符：" + bad.join(" "))
          : ADH.note("ok", "字符集合规", "无渠道禁止字符；禁止字符在保存规则时即校验，不允许运行期才报错（BR-40）。")) + "</div>" +
        '<div class="mt8">' + ADH.note("info", "重名检测（BR-41 / BR-42）", "同一账户下出现重名时按规则的重名策略处理；序号计数需持久化，任务失败重跑时<b>复用</b>已分配的序号，避免同一对象出现两个名称。") + "</div>" +
        '<div class="mt12 flex gap8 wrap"><button class="btn primary sm" data-act="naming-save">保存规则</button>' +
        (srv ? '<button class="btn sm" data-act="naming-validate">服务端校验</button><button class="btn sm" data-act="naming-preview">服务端预览</button>' : "") +
        '<button class="btn sm" data-act="naming-test-dup">模拟重名检测</button></div>' +
        "</div></div></div>";
      if (srv && s.validateReport) {
        h += '<div class="card-body" style="border-top:1px solid var(--line)">' + ADH.sec("服务端校验报告（POST /v1/naming-rules/validate）") +
          ADH.live.namingIssueList(s.validateReport) + "</div>";
      }
      if (srv && s.preview) {
        h += '<div class="card-body" style="border-top:1px solid var(--line)">' + ADH.sec("服务端预览（POST /v1/naming-rules/{id}/preview）") +
          ADH.kv([["名称", '<span class="mono" style="word-break:break-all">' + ADH.esc(s.preview.name) + "</span>"],
            ["长度", s.preview.nameLength + " 字符"],
            ["是否截断", s.preview.truncated ? ADH.chip("warn", "已按 maxLength 截断") : ADH.chip("ok", "未截断")]]) + "</div>";
      }
      if (s.dupMsg) h += '<div class="card-body" style="border-top:1px solid var(--line)">' + s.dupMsg + "</div>";
      h += "</div>";
    } else if (tab === "rules") {
      const all = D.namingRules || [];
      const q = ADH.f("q", "");
      const scopeSel = ADH.f("scope", "");
      const rules = srv ? all : all.filter(function (r) {
        const hitQ = !q || (r.name + " " + r.pattern.join(r.sep) + " " + r.example).toLowerCase().indexOf(String(q).toLowerCase()) >= 0;
        return hitQ && (!scopeSel || r.scope === scopeSel);
      });
      h += '<div class="card-body" style="padding-bottom:0"><div class="toolbar">' +
        '<div class="search">' + ADH.icon("search", 14) + '<input class="input" id="nr-q" data-live="1" data-act="filter" data-k="q" placeholder="' + (srv ? "搜索规则名称（服务端）" : "搜索规则 / 公式 / 示例") + '" value="' + ADH.esc(q) + '" /></div>' +
        '<select class="select" style="width:170px" data-live="1" data-act="filter" data-k="scope">' +
        [["", "全部作用域"]].concat(srv
          ? [["SYSTEM", "系统内置"], ["SHARED", "共享模板"], ["PERSONAL", "个人模板"]]
          : uniq(all.map(function (r) { return r.scope; })).map(function (x) { return [x, x]; }))
          .map(function (o) { return '<option value="' + ADH.esc(o[0]) + '"' + (String(scopeSel) === String(o[0]) ? " selected" : "") + ">" + ADH.esc(o[1]) + "</option>"; }).join("") +
        "</select>" + ADH.filterChip("q") + ADH.filterChip("scope") +
        (srv
          ? '<select class="select" style="width:150px" data-live="1" data-act="filter" data-k="sort">' +
            [["-updatedAt", "最近更新"], ["name", "名称 A→Z"], ["version", "版本"]].map(function (o) {
              return '<option value="' + o[0] + '"' + (ADH.f("sort", "-updatedAt") === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
            }).join("") + "</select>" + ADH.chip("info", "服务端分页", 1)
          : "") +
        '<div class="grow"></div><span class="xs muted">共 <b>' + (srv ? (D.namingMeta || {}).total || 0 : rules.length) + "</b> 条规则" + (srv ? "（服务端）" : "") + "</span>" +
        '<button class="btn primary sm" data-act="naming-new">' + ADH.icon("plus", 13) + "新建规则</button></div></div>";
      h += '<div class="card-body" style="padding-top:10px">' +
        ADH.tbl("tbl-nr", [{ label: "规则" }, { label: "公式" }, { label: "作用域" }, { label: "分隔符" }, { label: "重名策略" }, { label: "引用模板", cls: "num" }, { label: "版本" }, { label: "示例输出" }, { label: "" }],
          rules.map(function (r) {
            return {
              c: ['<b>' + ADH.esc(r.name) + '</b><div class="xs muted mono">#' + ADH.esc(String(r.id)) + (r.updatedAt ? " · " + ADH.esc(r.updatedAt) : "") + "</div>",
                '<span class="mono xs">{' + ADH.esc(r.pattern.join("}" + r.sep + "{")) + "}</span>",
                ADH.chip("neutral", scopeText(r)),
                '<span class="tag-code">' + ADH.esc(r.sep) + "</span>",
                ADH.chip(r.dupStrategy === "APPEND_SEQ" ? "brand" : "warn", dupText(r)),
                Number(r.refTemplates || 0),
                '<span class="tag-code">' + ADH.esc(r.version || "v1") + "</span>",
                '<span class="mono xs">' + ADH.esc(r.example || "—") + "</span>",
                '<button class="btn xs" data-act="naming-load" data-v="' + ADH.esc(String(ruleIdOf(r))) + '">载入编辑器</button> <button class="btn xs" data-act="naming-del" data-v="' + ADH.esc(String(ruleIdOf(r))) + '">删除</button>'],
              v: [r.name, r.pattern.join(r.sep), srv ? r.scopeCode : r.scope, r.sep, r.dupStrategy, Number(r.refTemplates || 0), r.version, r.example, ""]
            };
          }),
          { sortable: !srv, tight: true, pageSize: srv ? rules.length : 8, empty: "规则库为空",
            emptyDesc: srv ? "点击「新建规则」创建第一条命名规则（POST /v1/naming-rules）" : "点击「新建规则」开始编排一条命名规则" }) + "</div>";
      if (srv) h += ADH.live.pager("naming", D.namingMeta);
      h += '<div class="card-foot"><div class="grid g2">' +
        ADH.note("info", "字段取值来源", "上下文变量（<span class='tag-code'>{{account.name}}</span> / <span class='tag-code'>{{today}}</span>）、用户输入变量、素材变量（<span class='tag-code'>{{asset.tag}}</span>）、序号变量（<span class='tag-code'>{{seq:3}}</span> 生成 001）。") +
        ADH.note("warn", "渠道合规（BR-39 / BR-40）", "长度上限按渠道取最小值（Meta 建议 ≤ 120 字符），超限阻断并提示裁剪建议；禁止字符在保存规则时即校验。") + "</div></div>";
      h += "</div>";
    } else {
      const all = D.namingRules || [];
      const revId = s.revRuleId || ((all[0] || {}).id);
      h += '<div class="card-body"><div class="grid g-2-1"><div>' + ADH.sec("从渠道侧名称还原结构化字段（BR-43）") +
        '<div class="field mb12"><label>渠道侧名称（每行一条，或逗号分隔；一次最多 200 条）</label>' +
        '<textarea id="rev-in" class="input mono" rows="4" data-live="1" data-act="rev-input">' + ADH.esc(s.revIn || "meta_conversion_25-34-female_20260920_001") + "</textarea></div>" +
        '<div class="toolbar mb12">' +
        '<div class="field" style="width:260px"><label>解析规则</label><select id="rev-rule" class="select" data-live="1" data-act="rev-rule">' +
        (all.length
          ? all.map(function (r) { return '<option value="' + ADH.esc(String(ruleIdOf(r))) + '"' + (String(revId) === String(ruleIdOf(r)) ? " selected" : "") + ">" + ADH.esc(r.name) + "</option>"; }).join("")
          : '<option value="">（规则库为空）</option>') +
        "</select></div><div class=\"grow\"></div>" +
        '<button class="btn primary sm" data-act="reverse-parse">解析名称</button></div>' +
        ADH.note("info", "反向解析用途", "外部创建（渠道后台上手工建）的对象优先通过命名反向解析自动建立归因映射；解析结果写入 <span class='tag-code'>naming_fields_json</span>，用于报表按受众 / 素材类型聚合。") +
        '<div class="mt12">' + (s.revResult || ADH.note("info", "尚未解析", "输入名称后点击「解析名称」，结果按所选规则反向对照。")) + "</div>" +
        '<div class="mt12">' + ADH.note("warn", "BR-44 解析失败", "反向解析失败的对象归入「未识别命名分组」，<b>不影响数据入库与统计</b>，未映射状态可在「归因明细与对账」中查看。") + "</div></div>" +
        "<div>" + ADH.sec("未识别命名分组") +
        (srv
          ? ADH.note("info", "契约无「未识别分组」列表接口", '反向解析只返回 <span class="tag-code">items[].matched</span> 与 <span class="tag-code">fields</span>，不反向推断规则，也没有未识别对象列表；未识别对象会在「归因明细与对账」中标记为未映射（BR-44 / BR-98）。另：取值本身含分隔符时无法唯一反解，返回 <span class="tag-code">matched=false</span>（契约已知限制）。')
          : ADH.tbl("tbl-un", [{ label: "对象" }, { label: "名称" }, { label: "来源" }], [
              { c: ['<span class="tag-code">1202100777</span>', '<span class="mono xs">Summer_Sale_2026_Final</span>', "渠道后台手工创建"] },
              { c: ['<span class="tag-code">1202300099</span>', '<span class="mono xs">ad copy test (do not touch)</span>', "渠道后台手工创建"] },
              { c: ['<span class="tag-code">1202301200</span>', '<span class="mono xs">adset_0920_new</span>', "渠道后台手工创建"] }
            ], { tight: true, empty: "无未识别分组" })) + "</div></div></div>";
    }
    h += "</div>";
    return h;
  }
});

ADH.action("naming-add", function (p) { touch(); pattern().push(p.v); ADH.render(); });
ADH.action("naming-chip-del", function (p) { touch(); pattern().splice(Number(p.v), 1); ADH.render(); });
ADH.action("naming-move", function (p) {
  touch();
  const i = Number(p.v), arr = pattern();
  if (i < arr.length - 1) { const t = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = t; }
  ADH.render();
});
ADH.action("naming-name", function (p, el) { touch(); ADH.s().ruleName = el && el.value !== undefined ? el.value : p.v; });
ADH.action("naming-sep", function (p, el) { touch(); ADH.s().sep = el && el.value !== undefined ? el.value : p.v; ADH.render(); });
ADH.action("naming-scope", function (p, el) { touch(); ADH.s().ruleScope = el && el.value ? el.value : p.v; ADH.render(); });
ADH.action("naming-dup", function (p, el) { touch(); ADH.s().dupStrategy = el && el.value ? el.value : p.v; ADH.render(); });
ADH.action("naming-maxlen", function (p, el) {
  touch();
  const v = Number(el && el.value !== undefined ? el.value : p.v);
  if (!(v > 0)) return;
  ADH.s().maxLen = Math.min(255, Math.floor(v));
  ADH.render();
});
ADH.action("naming-new", function () {
  touch();
  const s = ADH.s();
  s.tab = "editor";
  s.ruleId = null;
  s.ruleName = "";
  s.ruleScope = "PERSONAL";
  s.pattern = DEFAULT_PATTERN.slice();
  s.sep = "_";
  s.maxLen = 120;
  s.dupStrategy = "APPEND_SEQ";
  s.validateReport = null;
  s.preview = null;
  s.dupMsg = "";
  ADH.render();
  ADH.toast("已新建空规则草稿", "info", srvOn() ? "保存时按 POST /v1/naming-rules 落库（校验不通过返回 42201）" : "填写规则名称与字段序列后保存");
});
ADH.action("naming-load", function (p) {
  const r = findRule(p.v);
  if (!r) { ADH.toast("未找到该规则", "warn", "规则 #" + p.v + " 不在当前列表中"); return; }
  touch();
  const s = ADH.s();
  s.pattern = r.pattern.slice();
  s.sep = r.sep;
  s.ruleId = ruleIdOf(r);
  s.ruleName = r.name;
  s.ruleScope = r.scopeCode || r.scope;
  s.maxLen = Number(r.maxLength || 120);
  s.dupStrategy = r.dupStrategy || "APPEND_SEQ";
  s.tab = "editor";
  s.validateReport = null;
  s.preview = null;
  s.dupMsg = "";
  ADH.render();
  ADH.toast("已载入规则 " + r.name, "info", "可继续编辑字段序列并实时预览");
});
ADH.action("naming-save", function () {
  if (!ADH.assertPerm("template.edit")) return;
  const nm = renderName(pattern());
  ADH.toast("命名规则已保存", "ok", (nameOf() ? "名称 " + nameOf() + " · " : "") + "公式 {" + pattern().join(sep() + "}") + "} · 示例输出 " + nm + " · 长度 " + nm.length + " 字符 ≤ " + maxLen() + "，字符集合规");
});
ADH.action("naming-del", function (p) {
  if (!ADH.assertPerm("template.edit")) return;
  const r = findRule(p.v);
  if (!r) return;
  ADH.overlay({
    kind: "modal",
    title: "删除命名规则 · " + r.name,
    desc: srvOn() ? "DELETE /v1/naming-rules/" + r.id + " · 被模板引用时返回 409（40902）" : "演示数据仅本次会话内删除，刷新页面即恢复",
    body: ADH.note("warn", "删除影响", "删除后引用该规则的模板将无法解析名称；已被 " + Number(r.refTemplates || 0) + " 个模板引用时后端会拒绝删除（BR-41）。") +
      '<div class="mt12">' + ADH.kv([["规则", ADH.esc(r.name)], ["公式", '<span class="mono xs">{' + ADH.esc(r.pattern.join("}" + r.sep + "{")) + "}</span>"], ["作用域", ADH.esc(scopeText(r))]]) + "</div>",
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div>' +
      '<button class="btn danger-ghost" data-act="naming-del-ok" data-v="' + ADH.esc(String(ruleIdOf(r))) + '">确认删除</button>'
  });
});
ADH.action("naming-del-ok", function (p) {
  const list = D.namingRules || [];
  const i = list.map(function (r) { return String(ruleIdOf(r)); }).indexOf(String(p.v));
  if (i >= 0) list.splice(i, 1);
  const s = ADH.s();
  if (String(s.ruleId) === String(p.v)) { s.ruleId = null; s.ruleName = ""; s.validateReport = null; s.preview = null; }
  ADH.act("overlay-close", { dataset: {} });
  ADH.render();
  ADH.toast("命名规则已删除", "ok", "规则 #" + p.v + " 已从规则库移除，删除操作写审计（BR-141）");
});
ADH.action("naming-test-dup", function () {
  const existing = D.tree[0].campaigns[0].adsets[0].name;
  ADH.s().dupMsg = ADH.note("warn", "检测到同账户内重名", "<span class='mono small'>" + existing + "</span> 已存在于 " + D.tree[0].accountName +
    "。按 BR-41 默认策略自动追加序号 → <span class='mono small'>" + existing.replace("_001", "_002") + "</span>；也可配置为阻断提交。序号计数持久化，任务重跑复用已分配序号（BR-42）。");
  ADH.render();
});
ADH.action("rev-input", function (p, el) {
  ADH.s().revIn = el && el.value !== undefined ? el.value : p.v || "";
});
ADH.action("rev-rule", function (p, el) {
  ADH.s().revRuleId = el && el.value ? el.value : p.v;
  ADH.render();
});
ADH.action("reverse-parse", function (p, el) {
  const s = ADH.s();
  const raw = el && el.tagName === "TEXTAREA" ? el.value : s.revIn || "";
  s.revIn = raw;
  ADH.state.focusId = "rev-in";
  const names = parseNames(raw);
  if (!names.length) {
    s.revResult = ADH.note("warn", "请输入待解析的名称", "每行一条（本批最多 200 条，契约 NamingParseRequest.names）");
    ADH.render();
    return;
  }
  const rule = findRule(s.revRuleId) || (D.namingRules || [])[0];
  if (!rule) {
    s.revResult = ADH.note("warn", "暂无可用命名规则", "请先在「规则库」创建一条命名规则，或在编辑器中保存草稿");
    ADH.render();
    return;
  }
  s.revRuleId = ruleIdOf(rule);
  s.revResult = parseTable(localParse(rule, names));
  ADH.render();
});
})();
/* ---------------- 批量计划（程序化组合创建） ---------------- */
(function () {
const D = ADH_DATA;
const COPIES = ["前 3 集免费，马上追更", "全集已解锁，首月会员限时 5 折", "老用户回归：下一集免费看"];
function planSel() {
  const s = ADH.s();
  s.planAcc = s.planAcc || [];
  s.planAud = s.planAud || ["AU-01", "AU-02"];
  s.planAssets = s.planAssets || [];
  s.planCopy = s.planCopy || ["0"];
  s.planTpl = s.planTpl || "TPL-01";
  s.planBid = s.planBid || "LOWEST_COST_WITHOUT_CAP";
  if (s.planStart === undefined) s.planStart = "2026-09-20 00:00";
  if (s.planEnd === undefined) s.planEnd = "长期（不限）";
  if (s.planLanding === undefined) s.planLanding = "https://novadrama.example.com/episodes?utm_source={{渠道}}&utm_campaign={campaign_id}&click_id=__CLICK_ID__";
  return s;
}
function combos() {
  const s = planSel();
  const a = s.planAcc.length, t = s.planAud.length, c = s.planAssets.length, x = s.planCopy.length;
  return { a: a, t: t, c: c, x: x, adsets: a * t, ads: a * t * c * x, shards: Math.max(1, Math.ceil(a * t * c * x / 150)) };
}
function budget() { return Number(planSel().planBudget || 120); }
/* 批量计划的出价 / 排期 / 落地页真实写入 planSel，供 STEP 3 与 STEP 6 校验共用 */
const PLAN_BID = {
  OUTCOME_AWARENESS: ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP"],
  OUTCOME_TRAFFIC: ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP"],
  OUTCOME_ENGAGEMENT: ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP"],
  OUTCOME_LEADS: ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP"],
  OUTCOME_SALES: ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "MINIMUM_ROAS"],
  OUTCOME_APP_PROMOTION: ["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP"]
};
function planObjective() {
  const s = planSel();
  const t = D.templates.filter(function (x) { return x.id === s.planTpl; })[0];
  let obj = "OUTCOME_SALES";
  ((t && t.nodes) || []).forEach(function (n) {
    (n.fields || []).forEach(function (f) {
      if (String(f[0]).toLowerCase().indexOf("objective") >= 0) obj = String(f[1]).split(/[ \/]/)[0].trim();
    });
  });
  return obj;
}
function planBidOptions() {
  const s = planSel(), list = (PLAN_BID[planObjective()] || PLAN_BID.OUTCOME_SALES).slice();
  if (list.indexOf(s.planBid) < 0) list.unshift(s.planBid);
  return list;
}
function planScheduleOk() {
  const s = planSel();
  if (!s.planStart || !s.planEnd || s.planEnd.indexOf("长期") >= 0) return true;
  return String(s.planEnd) > String(s.planStart);
}
function planLandingOk() { return /^https?:\/\//.test(String(planSel().planLanding || "")); }
function planCheckResults() {
  const s = planSel(), cmb = combos(), dimsOk = !!(s.planAcc.length && s.planAssets.length);
  const objName = planObjective(), allowedBids = PLAN_BID[objName] || [], bidOk = allowedBids.indexOf(planSel().planBid) >= 0;
  const results = [
    ["组合", "至少选择 1 个账户与 1 个素材（FR-MID-14）", "BLOCK", dimsOk ? "PASS" : "FAIL", dimsOk ? "账户 " + s.planAcc.length + " 个 · 素材 " + s.planAssets.length + " 个，组合维度已就绪" : "账户 " + s.planAcc.length + " 个 · 素材 " + s.planAssets.length + " 个，需补全后才可提交（BR-46 不允许盲投）"],
    ["素材", "素材状态均为 APPROVED 且未被归档", "BLOCK", s.planAssets.length === 0 ? "FAIL" : "PASS", s.planAssets.length === 0 ? "未选择素材" : "已选 " + s.planAssets.length + " 个素材，全部为已批准状态"],
    ["素材", "视频素材具备目标比例变体", "BLOCK", "PASS", "自动裁剪变体已就绪（居中裁剪 + 安全区）"],
    ["受众", "受众规模 ≥ 渠道下限（1,000 人）", "BLOCK", "PASS", "所选受众规模均 ≥ 12.8 万"],
    ["受众", "受众在目标账户下可用", "BLOCK", "PASS", "6 个受众在所选账户下均可用"],
    ["命名", "名称长度、字符集合规", "BLOCK", "PASS", "最长名称 58 字符 ≤ 120，无禁止字符"],
    ["命名", "同账户内重名", "WARN", s.planAcc.length > 2 ? "WARN" : "PASS", s.planAcc.length > 2 ? "检测到 1 处重名，将按 BR-41 自动追加序号" : "无重名"],
    ["预算", "日预算 ≥ 渠道最低预算", "BLOCK", budget() < 5 ? "FAIL" : "PASS", budget() < 5 ? "日预算 " + budget() + " 低于最低 5 USD" : "日预算 " + budget() + " USD"],
    ["预算", "出价与优化目标匹配", "BLOCK", bidOk ? "PASS" : "FAIL", bidOk ? objName + " → " + planSel().planBid + " 在允许列表内" : planSel().planBid + " 不适用于 " + objName],
    ["排期", "结束时间晚于开始时间、时区一致", "BLOCK", planScheduleOk() ? "PASS" : "FAIL", planScheduleOk() ? planSel().planStart + " → " + planSel().planEnd + "（账户时区）" : "结束时间早于开始时间"],
    ["创意", "落地页 URL 合法且支持追踪参数", "BLOCK", planLandingOk() ? "PASS" : "FAIL", planLandingOk() ? "link=" + planSel().planLanding.slice(0, 58) + (planSel().planLanding.length > 58 ? "…" : "") : "落地页必须以 http(s):// 开头"],
    ["结构", "单账户 AdSet 数、单 AdSet 广告数未超渠道上限", "WARN", cmb.ads > 500 ? "WARN" : "PASS", cmb.ads > 500 ? "单批次 " + cmb.ads + " 条已超 500，将自动分片" : "未超渠道上限"],
    ["权限", "当前用户对目标账户有数据权限", "BLOCK", ADH.can("plan.submit") ? "PASS" : "FAIL", ADH.can("plan.submit") ? "已校验 " + s.planAcc.length + " 个账户的数据权限" : ADH.LOCK_REASON["plan.submit"]]
  ];
  return results;
}

/* 组合维度勾选：统一读写 s.planAcc / s.planAud / s.planAssets / s.planCopy。
   通用 sel / sel-all 动作写入的是 s.sel.<key>，与本页读取的 s.<key> 是两套状态，
   因此本页使用专用动作，保证「选中 → 组合数量 → 提交内容」三者一致（FR-MID-14 / FR-MID-15）。 */
function planDim(key) { return planSel()[key]; }
function planCheckbox(key, val) {
  const on = planDim(key).indexOf(val) >= 0;
  return '<label class="check"><input type="checkbox"' + (on ? " checked" : "") +
    ' data-act="plan-sel" data-key="' + key + '" data-v="' + ADH.esc(val) + '" /></label>';
}
ADH.action("plan-sel", function (p) {
  const arr = planDim(p.key);
  if (!Array.isArray(arr)) { ADH.toast("组合维度不存在", "warn", "未知的组合维度：" + ADH.esc(String(p.key)) + "。"); return; }
  const i = arr.indexOf(p.v);
  if (i >= 0) arr.splice(i, 1); else arr.push(p.v);
  ADH.render();
});
ADH.action("plan-sel-all", function (p) {
  const arr = planDim(p.key);
  if (!Array.isArray(arr)) { ADH.toast("组合维度不存在", "warn", "未知的组合维度：" + ADH.esc(String(p.key)) + "。"); return; }
  const all = String(p.values || "").split(",").filter(Boolean);
  const allOn = all.length > 0 && all.every(function (x) { return arr.indexOf(x) >= 0; });
  const keep = arr.filter(function (x) { return all.indexOf(x) < 0; });
  const next = allOn ? keep : keep.concat(all);
  arr.length = 0;
  next.forEach(function (x) { arr.push(x); });
  ADH.render();
});
const PLAN_REVIEW_STATUS = {
  DRAFT: ["neutral", "草稿"], PENDING: ["warn", "待审核"], REVIEWING: ["info", "审核中"],
  APPROVED: ["ok", "已通过"], REJECTED: ["danger", "已驳回"]
};
const PLAN_EXEC_STATUS = {
  NOT_SUBMITTED: ["neutral", "未提交"], QUEUED: ["info", "待执行"], RUNNING: ["brand", "执行中"],
  SUCCEEDED: ["ok", "已完成"], PARTIAL_FAILED: ["warn", "部分失败"], BLOCKED: ["danger", "已阻断"], PAUSED: ["neutral", "已暂停"]
};
function planTabs(active) {
  return '<div class="tabs pill mb12">' +
    '<button class="' + (active === "ledger" ? "" : "on") + '" data-act="plan-mode" data-v="new">新建计划</button>' +
    '<button class="' + (active === "ledger" ? "on" : "") + '" data-act="plan-mode" data-v="ledger">批量计划台账</button></div>';
}
function planLedgerFind(id) {
  return (D.planLedger || []).filter(function (p) { return p.id === id; })[0];
}
function planLedgerRows() {
  const q = String(ADH.f("plq", "")).trim().toLowerCase();
  const rs = String(ADH.f("plReview", ""));
  const es = String(ADH.f("plExec", ""));
  return (D.planLedger || []).filter(function (p) {
    if (rs && p.status !== rs) return false;
    if (es && p.execution !== es) return false;
    if (q && (p.id + " " + p.name + " " + p.submitter + " " + p.reviewer + " " + p.reviewNote).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}
function planLedgerRow(p) {
  const rev = PLAN_REVIEW_STATUS[p.status] || ["neutral", p.status];
  const ex = PLAN_EXEC_STATUS[p.execution] || ["neutral", p.execution];
  const canApprove = ADH.can("plan.approve") && (p.status === "PENDING" || p.status === "REVIEWING");
  const note = p.reviewNote && p.reviewNote.length > 34 ? p.reviewNote.slice(0, 34) + "…" : p.reviewNote;
  return {
    v: [p.id, p.submitter, p.accounts, p.dailyBudget, rev[1], p.reviewer, ex[1]],
    c: [
      '<b class="mono">' + ADH.esc(p.id) + '</b><div class="small">' + ADH.esc(p.name) + '</div>',
      '<b>' + ADH.esc(p.submitter) + '</b><div class="xs muted mono">' + ADH.esc(p.submittedAt) + '</div>',
      p.accounts + ' 个账户<div class="xs muted">' + p.objects + ' 条对象 · ' + ADH.esc(p.template) + '</div>',
      '<span class="mono">' + "$" + ADH.num(p.dailyBudget) + '</span><div class="xs muted">USD / 天</div>',
      ADH.chip(rev[0], rev[1], 1) + (p.reviewRound > 1 ? '<div class="xs muted">第 ' + p.reviewRound + ' 轮</div>' : ""),
      '<b class="small">' + ADH.esc(p.reviewer) + '</b><div class="xs muted mono">' + ADH.esc(p.reviewedAt) + '</div><div class="xs muted" title="' + ADH.esc(p.reviewNote) + '">' + ADH.esc(note) + '</div>',
      ADH.chip(ex[0], ex[1], 1) + (p.risk ? '<div class="xs muted">风险 ' + ADH.esc(p.risk) + '</div>' : ""),
      '<div class="btn-group"><button class="btn xs" data-act="plan-ledger-detail" data-v="' + p.id + '">详情</button>' +
        (canApprove ? '<button class="btn xs primary" data-act="plan-ledger-detail" data-v="' + p.id + '">审核</button>' : "") + '</div>'
    ]
  };
}
function planLedgerScreen() {
  const all = D.planLedger || [];
  const rows = planLedgerRows();
  const pending = all.filter(function (p) { return p.status === "PENDING" || p.status === "REVIEWING"; }).length;
  const approved = all.filter(function (p) { return p.status === "APPROVED"; }).length;
  const rejected = all.filter(function (p) { return p.status === "REJECTED"; }).length;
  const pendingExec = all.filter(function (p) { return p.execution === "QUEUED" || p.execution === "RUNNING"; }).length;

  let h = planTabs("ledger");
  h += '<div class="grid g4 mb12">' +
    ADH.stat({ label: "计划总数", value: all.length, unit: "个", foot: '<span class="muted">近 3 日提交的批量计划</span>' }) +
    ADH.stat({ label: "待审核 / 审核中", value: pending, unit: "个", foot: '<span style="color:var(--warn)">等待管理员处理</span>' }) +
    ADH.stat({ label: "已通过", value: approved, unit: "个", foot: '<span class="muted">其中 ' + pendingExec + ' 个待执行 / 执行中</span>' }) +
    ADH.stat({ label: "已驳回", value: rejected, unit: "个", foot: '<span class="muted">驳回后不执行，可修改后重提</span>' }) + '</div>';

  h += '<div class="card"><div class="card-head"><h3>' + ADH.icon("list", 15) + '批量计划审核台账</h3>' +
    '<div class="right"><span class="xs muted">审核通过后进入执行队列；驳回则阻断执行</span></div></div>' +
    '<div class="card-body" style="padding-bottom:0"><div class="toolbar">' +
    '<div class="search">' + ADH.icon("search", 14) + '<input class="input" id="plq" data-live="1" data-act="filter" data-k="plq" data-tbl="t-plan-ledger" placeholder="搜索计划编号 / 名称 / 提交人 / 审核意见" value="' + ADH.esc(ADH.f("plq", "")) + '" /></div>' +
    '<select class="select" style="width:160px" data-live="1" data-act="filter" data-k="plReview" data-tbl="t-plan-ledger">' +
      [["", "全部审核状态"], ["DRAFT", "草稿"], ["PENDING", "待审核"], ["REVIEWING", "审核中"], ["APPROVED", "已通过"], ["REJECTED", "已驳回"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (ADH.f("plReview", "") === o[0] ? " selected" : "") + '>' + o[1] + '</option>';
      }).join("") + '</select>' +
    '<select class="select" style="width:160px" data-live="1" data-act="filter" data-k="plExec" data-tbl="t-plan-ledger">' +
      [["", "全部执行状态"], ["NOT_SUBMITTED", "未提交"], ["QUEUED", "待执行"], ["RUNNING", "执行中"], ["SUCCEEDED", "已完成"], ["PARTIAL_FAILED", "部分失败"], ["BLOCKED", "已阻断"], ["PAUSED", "已暂停"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (ADH.f("plExec", "") === o[0] ? " selected" : "") + '>' + o[1] + '</option>';
      }).join("") + '</select>' +
    '<div class="grow"></div><span class="xs muted">筛选结果 <b>' + rows.length + '</b> / ' + all.length + ' 条</span></div></div>';

  const cols = [
    { label: "计划" }, { label: "提交人 / 时间" }, { label: "规模" }, { label: "日预算", cls: "num" },
    { label: "审核状态" }, { label: "审核人 / 时间 / 意见" }, { label: "执行状态" }, { label: "操作" }
  ];
  h += ADH.tbl("t-plan-ledger", cols, rows.map(planLedgerRow), {
    pageSize: 8, sortable: true,
    empty: "暂无符合条件的批量计划", emptyDesc: "调整筛选条件，或切换到「新建计划」提交一个新的批量计划。",
    emptyAction: '<button class="btn sm" data-act="plan-mode" data-v="new">新建计划</button>'
  });
  h += '<div class="mt12">' + ADH.note("info", "审核规则（BR-57）", "批量计划提交后进入审核队列：仅 <b>管理员</b> 可审核通过或驳回；审核通过后进入执行队列，驳回则阻断执行并保留审核意见。执行结果可在「任务中心」查看与重试。") + '</div>';
  return h;
}
function planLedgerDetail(p) {
  const rev = PLAN_REVIEW_STATUS[p.status] || ["neutral", p.status];
  const ex = PLAN_EXEC_STATUS[p.execution] || ["neutral", p.execution];
  const canApprove = ADH.can("plan.approve") && (p.status === "PENDING" || p.status === "REVIEWING");
  const hist = [
    { c: [p.submittedAt, p.submitter, "提交审核", "第 " + (p.reviewRound || 1) + " 轮 · 进入待审核队列"] }
  ];
  if (p.reviewedAt && p.reviewedAt !== "—") {
    hist.push({ c: [p.reviewedAt, p.reviewer, p.status === "REJECTED" ? "审核驳回" : "审核通过", p.reviewNote] });
  }
  const body =
    '<div class="flex center gap8 wrap mb12">' + ADH.chip(rev[0], rev[1], 1) + ADH.chip(ex[0], ex[1], 1) +
      '<span class="tag-code">渠道 Meta</span><span class="tag-code">模板 ' + ADH.esc(p.template) + '</span>' +
      (p.risk ? '<span class="tag-code">风险等级 ' + ADH.esc(p.risk) + '</span>' : "") + '</div>' +
    ADH.kv([
      ["计划编号", '<span class="mono">' + ADH.esc(p.id) + '</span>'],
      ["计划名称", '<b>' + ADH.esc(p.name) + '</b>'],
      ["提交人", ADH.esc(p.submitter) + ' · <span class="mono">' + ADH.esc(p.submittedAt) + '</span>'],
      ["执行规模", p.accounts + ' 个账户 · ' + p.objects + ' 条对象'],
      ["日预算", '<span class="mono">' + "$" + ADH.num(p.dailyBudget) + ' USD</span>'],
      ["审核状态", ADH.chip(rev[0], rev[1], 1)],
      ["审核人", ADH.esc(p.reviewer)],
      ["审核时间", '<span class="mono">' + ADH.esc(p.reviewedAt) + '</span>'],
      ["审核意见", ADH.esc(p.reviewNote)],
      ["执行状态", ADH.chip(ex[0], ex[1], 1)]
    ]) +
    ADH.sec("审核记录") +
    ADH.tbl("t-plan-ledger-hist", [{ label: "时间" }, { label: "操作人" }, { label: "动作" }, { label: "说明" }], hist, { tight: true }) +
    ADH.sec("审核处理") +
    (canApprove
      ? '<div class="field"><label>审核意见（通过时可选，驳回时必填）</label><textarea class="input" id="plan-review-note" rows="3" placeholder="例如：受众规模与预算符合账户规范，同意执行；或写明驳回原因与修改建议"></textarea><div class="xs muted mt4">审核结果会写入台账，并同步到审计日志；驳回后计划不会进入执行队列。</div></div>'
      : ADH.note("info", "当前为只读视图", p.status === "PENDING" || p.status === "REVIEWING"
          ? "当前角色（" + ADH.roleLabel() + "）无审核权限，仅管理员可审核通过或驳回。"
          : "该计划已完成审核，审核结果与意见见上方记录。"));

  ADH.modal({
    kind: "modal", wide: true,
    title: "计划详情 · " + p.id,
    desc: ADH.esc(p.name) + " · 第 " + (p.reviewRound || 1) + " 轮审核",
    body: body,
    foot: '<button class="btn" data-act="overlay-close">关闭</button><div class="grow"></div>' +
      (canApprove
        ? '<button class="btn danger" data-act="plan-ledger-reject" data-v="' + p.id + '">驳回</button>' +
          '<button class="btn primary" data-act="plan-ledger-approve" data-v="' + p.id + '">审核通过</button>'
        : "")
  });
}
ADH.action("plan-mode", function (p) {
  const s = ADH.s();
  if (p.v === "ledger") {
    s.planMode = "ledger";
    s.crumbSub = "批量计划台账";
  } else {
    s.planMode = null;
    s.crumbSub = null;
  }
  ADH.render();
});
ADH.action("plan-ledger-detail", function (p) {
  const plan = planLedgerFind(p.v);
  if (!plan) { ADH.toast("未找到该计划", "warn"); return; }
  planLedgerDetail(plan);
});
ADH.action("plan-ledger-approve", function (p) {
  if (!ADH.assertPerm("plan.approve")) return;
  const plan = planLedgerFind(p.v);
  if (!plan) { ADH.toast("未找到该计划", "warn"); return; }
  if (plan.status !== "PENDING" && plan.status !== "REVIEWING") { ADH.toast("该计划当前不可审核", "warn"); return; }
  const noteEl = document.getElementById("plan-review-note");
  const note = (noteEl && noteEl.value.trim()) || "结构与预算符合投放规范，同意执行";
  plan.status = "APPROVED";
  plan.execution = "QUEUED";
  plan.reviewer = ADH.rolePerson();
  plan.reviewedAt = "2026-09-20 11:05";
  plan.reviewNote = "通过：" + note.replace(/^通过：/, "");
  ADH.act("overlay-close", { dataset: {} });
  ADH.render();
  ADH.toast("计划已审核通过", "ok", plan.id + " 已写入执行队列，可在任务中心跟踪执行结果");
});
ADH.action("plan-ledger-reject", function (p) {
  if (!ADH.assertPerm("plan.approve")) return;
  const plan = planLedgerFind(p.v);
  if (!plan) { ADH.toast("未找到该计划", "warn"); return; }
  if (plan.status !== "PENDING" && plan.status !== "REVIEWING") { ADH.toast("该计划当前不可审核", "warn"); return; }
  const noteEl = document.getElementById("plan-review-note");
  const note = (noteEl && noteEl.value.trim()) || "";
  if (!note) { ADH.toast("请填写驳回原因", "warn", "驳回意见会写入台账并通知提交人，必填"); return; }
  plan.status = "REJECTED";
  plan.execution = "BLOCKED";
  plan.reviewer = ADH.rolePerson();
  plan.reviewedAt = "2026-09-20 11:05";
  plan.reviewNote = "驳回：" + note.replace(/^驳回：/, "");
  ADH.act("overlay-close", { dataset: {} });
  ADH.render();
  ADH.toast("计划已驳回", "warn", plan.id + " 已阻断执行，审核意见已写入台账");
});

ADH.page("batch-plan", {
  title: "批量计划", subtitle: "程序化组合创建：账户 × 受众 × 素材 × 文案 的笛卡尔积展开",
  refs: ["FR-MID-14 组合维度配置", "FR-MID-15 组合展开与数量计算", "FR-MID-16 提交前校验", "FR-MID-17 预览与成本预估", "FR-MID-18 分片提交与并发控制", "FR-MID-19 幂等与去重", "FR-MID-20 结果清单导出", "BR-45~BR-53", "流程二 组合批量创建"],
  render: function () {
    if (ADH.s().planMode === "ledger") return planLedgerScreen();
    if (ADH.s().planMode === "result") return planResultScreen();
    if (ADH.s().planMode === "precheck") return planPrecheckScreen();
    if (ADH.s().planMode === "pair") return pairScreen();
    const s = planSel();
    const step = ADH.wizardStep(1);
    const cmb = combos();
    const steps = [["选择账户", "1..N 个广告账户"], ["选择模板", "结构模板 + 命名规则"], ["填写变量", "受众 / 预算 / 出价 / 排期"], ["选择素材", "M 个素材（含槽位）"], ["展开预览", "组合数量 + 树 / 表视图"], ["校验提交", "结构化校验报告"]];
    const dimsOk = !!(s.planAcc.length && s.planAssets.length);
    let h = planTabs("new") + '<div class="wizard">' + steps.map(function (x, i) {
      const n = i + 1;
      return (i ? '<i class="wz-line' + (step > n - 1 ? " done" : "") + '"></i>' : "") +
        '<div class="wz ' + (step > n ? "done" : (step === n ? "on" : "")) + '" data-act="wizard" data-v="' + n + '"><span class="n">' + (step > n ? "✓" : n) +
        '</span><span class="t"><b>' + x[0] + "</b><small>" + x[1] + "</small></span></div>";
    }).join("") + "</div>";

    h += '<div class="grid g-3-2"><div class="card"><div class="card-head"><h3>' + ADH.icon("wand", 15) + "STEP " + step + " · " + steps[step - 1][0] + '</h3><div class="right"><span class="xs muted">' + steps[step - 1][1] + "</span></div></div><div class=\"card-body\">";

    if (step === 1) {
      const visible = D.accounts.filter(function (a) { return a.status !== "DISABLED"; });
      h += ADH.note("info", "数据权限过滤", "列表仅展示当前角色（" + ADH.roleLabel() + "）有数据权限的账户；越权账户不显示（BR-3.4）。") +
        '<div class="toolbar mt12 mb8"><span class="small">已选 <b>' + s.planAcc.length + "</b> 个账户</span>" +
        '<button class="btn xs" data-act="plan-sel-all" data-key="planAcc" data-values="' + visible.map(function (a) { return a.actId; }).join(",") + '">全选 / 取消</button></div>' +
        '<div style="border:1px solid var(--line);border-radius:9px;max-height:420px;overflow:auto">' + visible.map(function (a) {
          const on = s.planAcc.indexOf(a.actId) >= 0;
          return '<div class="tree-row" style="border-bottom:1px solid var(--line);border-radius:0" data-act="plan-sel" data-key="planAcc" data-v="' + a.actId + '">' +
            '<input type="checkbox" ' + (on ? "checked" : "") + ' style="accent-color:var(--brand)" />' +
            '<div class="grow"><b>' + a.name + '</b> <span class="tag-code">' + a.actId + '</span><div class="xs muted">' + a.currency + " · " + a.tz + " · " + a.source + "</div></div>" +
            ADH.healthChip(a.health) + "</div>";
        }).join("") + "</div>";
    } else if (step === 2) {
      h += ADH.note("info", "模板与命名规则", "模板定义四层骨架（Campaign / AdSet / Creative / Ad）与直接输入字段；各层名称由命名规则引擎生成（FR-MID-03）。模板本身不调用渠道，提交时按 <b>campaigns → adsets → adcreatives → ads</b> 顺序创建。") + '<div class="ep-row mt8">' + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/campaigns") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adsets") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adcreatives") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/ads") + "</div>" + '<div class="mt12">';
      D.templates.forEach(function (t) {
        const on = s.planTpl === t.id;
        h += '<div class="todo" style="' + (on ? "border-color:var(--brand);background:var(--brand-soft)" : "") + (t.invalid ? ";opacity:.6" : "") + '" data-act="plan-tpl" data-v="' + t.id + '">' +
          '<div class="ico-wrap" style="background:var(--surface-3);color:var(--ink-2)">' + ADH.icon("layers", 15) + "</div>" +
          '<div class="tx"><b>' + t.name + "</b><small>" + (t.nodes || []).reduce(function (n, x) { return n + (x.fields || []).length; }, 0) + " 个字段 · " + t.refTasks + " 次引用 · " + t.scope + (t.invalid ? ' · <span style="color:var(--danger)">' + t.invalid + "</span>" : "") + "</small></div>" +
          (on ? ADH.chip("ok", "已选择") : ADH.chip("neutral", "选择")) + "</div>";
      });
      h += "</div>";
      const missingAcc = D.accounts.filter(function (a) { return s.planAcc.indexOf(a.actId) >= 0 && a.currency !== "USD"; });
      if (missingAcc.length) h += '<div class="mt12">' + ADH.note("warn", "BR-37 模板套用到新账户的资源差异", "账户 " + missingAcc.map(function (a) { return a.name; }).join("、") + " 的币种与模板默认预算币种不一致（USD），提交前将按 BR-115 换算并提示；若模板引用的受众 / 素材在该账户不可用，会在此处提示缺失清单与补建入口。") + "</div>";
    } else if (step === 3) {
      h += ADH.sec("受众集合（组合维度之一）") + '<div class="grid g2">' + D.audiences.map(function (au) {
        return '<div class="file-row" style="margin:0"><div class="fmeta"><div class="fname">' + au.name + '</div><div class="fsub">' + au.type + " · 规模 " + ADH.short(au.size) + " · " + au.accountGroup + "</div></div>" +
          planCheckbox("planAud", au.id) + "</div>";
      }).join("") + "</div>" +
        ADH.sec("预算 / 出价 / 排期 / 落地页") + '<div class="ep-row mb8">' + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adsets") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adcreatives") + '</div>' +
        '<div class="xs muted mb8">预算、出价策略与排期在 AdSet 层配置；落地页在 Creative 层配置。Ad 层不再配置出价。</div>' +
        '<div class="grid g2">' +
        '<div class="field"><label>AdSet 日预算（USD）' + (budget() < 5 ? ' <span style="color:var(--danger)">低于渠道最低值 5</span>' : "") + '</label><input id="plan-budget" class="input mono" value="' + budget() + '" data-live="1" data-act="plan-budget" /></div>' +
        '<div class="field"><label>出价策略（随 objective 收敛）</label><select id="plan-bid" class="select" data-live="1" data-act="plan-bid">' +
        planBidOptions().map(function (b) { return '<option value="' + ADH.esc(b) + '"' + (planSel().planBid === b ? " selected" : "") + ">" + ADH.esc(b) + "</option>"; }).join("") + '</select><div class="xs muted mt4">当前 objective：<span class="tag-code">' + planObjective() + '</span></div></div>' +
        '<div class="field"><label>排期开始（账户时区）</label><input id="plan-start" class="input mono" value="' + ADH.esc(planSel().planStart) + '" data-live="1" data-act="plan-start" /></div>' +
        '<div class="field"><label>排期结束' + (!planScheduleOk() ? ' <span style="color:var(--danger)">早于开始时间</span>' : "") + '</label><input id="plan-end" class="input mono" value="' + ADH.esc(planSel().planEnd) + '" data-live="1" data-act="plan-end" /><div class="xs muted mt4">填写「长期（不限）」或 ISO 时间；lifetime_budget 时必须填结束时间</div></div>' +
        '<div class="field" style="grid-column:1/-1"><label>落地页 URL（支持 UTM 变量与 __CLICK_ID__）' + (!planLandingOk() ? ' <span style="color:var(--danger)">必须以 http(s):// 开头</span>' : "") + '</label><input id="plan-landing" class="input mono" value="' + ADH.esc(planSel().planLanding) + '" data-live="1" data-act="plan-landing" /></div></div>' +
        ADH.sec("文案集合（组合维度之一）") + COPIES.map(function (c, i) {
          return '<div class="file-row" style="margin:0 0 6px"><div class="fmeta"><div class="fname">' + c + '</div><div class="fsub">文案 ' + (i + 1) + "</div></div>" + planCheckbox("planCopy", String(i)) + "</div>";
        }).join("") +
        ADH.sec("组合模式（BR-47）") + '<div class="seg" style="display:inline-flex"><button class="on">笛卡尔积（全组合）</button><button data-act="plan-pair">配对模式（CSV 映射表）</button></div>' +
        '<div class="mt8 xs muted">配对模式：按 CSV / Excel 导入的映射表一对一创建，用于非全组合场景（如特定受众只配特定素材）。</div>';
    } else if (step === 4) {
      h += ADH.note("info", "素材槽位", "所选素材将作为 Ad 的素材槽位参与组合；素材状态必须为 APPROVED，被拒审素材不可被新计划引用（BR-29）。") + '<div class="ep-row mt8">' + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adimages") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/advideos") + "</div>" +
        '<div class="toolbar mt12 mb8"><span class="small">已选 <b>' + s.planAssets.length + "</b> 个素材</span>" +
        '<button class="btn xs" data-act="plan-sel-all" data-key="planAssets" data-values="' + D.assets.filter(function (a) { return a.status === "APPROVED"; }).map(function (a) { return a.id; }).join(",") + '">全选可用素材</button></div>' +
        '<div class="asset-grid">' + D.assets.filter(function (a) { return a.status === "APPROVED" || a.status === "REJECTED"; }).slice(0, 12).map(function (a) {
          const on = s.planAssets.indexOf(a.id) >= 0;
          const bad = a.status === "REJECTED";
          return '<div class="asset-card' + (on ? " sel" : "") + '" data-act="plan-sel" data-key="planAssets" data-v="' + a.id + '" style="' + (bad ? "opacity:.55" : "") + '">' +
            '<div class="thumb" style="background:' + (bad ? "linear-gradient(135deg,#94a3b8,#cbd5e1)" : "linear-gradient(135deg,#4f6bff,#7c3aed)") + '"><span class="ratio">' + a.ratio + '</span><span class="glyph">' + ADH.icon(a.type === "VIDEO" ? "play" : "image", 20) + "</span></div>" +
            '<div class="asset-meta"><div class="an">' + a.name + '</div><div class="as">' + (bad ? ADH.chip("danger", "已拒审 · 不可引用") : ADH.chip("ok", "可投放")) + '<span class="num">CTR ' + ADH.pct(a.agg.ctr, 2) + "</span></div></div></div>";
        }).join("") + "</div>";
    } else if (step === 5) {
      const over = cmb.ads > 500;
      h += '<div class="grid g4 mb12">' +
        ['<div class="stat"><div class="label">生成的 AdSet 数</div><div class="value">' + cmb.adsets + '</div><div class="foot xs muted">账户 a × 受众 t = ' + cmb.a + " × " + cmb.t + "</div></div>",
          '<div class="stat"><div class="label">生成的 Ad 数</div><div class="value">' + cmb.ads + '</div><div class="foot xs muted">a × t × 素材 c × 文案 x</div></div>',
          '<div class="stat"><div class="label">预估日消耗</div><div class="value">$' + ADH.num(cmb.adsets * budget(), 0) + '</div><div class="foot xs muted">Σ 各 AdSet 日预算</div></div>',
          '<div class="stat"><div class="label">分片数</div><div class="value">' + cmb.shards + '</div><div class="foot xs muted">超 500 自动分片 · 优先按账户切分</div></div>'].join("") + "</div>";
      h += over ? ADH.note("danger", "BR-45 单批次广告数超上限", "当前展开 <b>" + cmb.ads + "</b> 条广告，超过单批次上限 500。系统将自动按账户分组分片（优先按账户切分，其次按受众切分）；也可返回调整组合维度。")
        : ADH.note("ok", "组合数量在限制内", "当前 " + cmb.ads + " 条广告 ≤ 上限 500，可一次提交。");
      h += '<div class="ep-row mt12">' + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/campaigns") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adsets") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adcreatives") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/ads") + '</div>' + '<div class="toolbar mt12 mb8"><div class="btn-group"><button class="on">表格视图</button><button data-act="plan-tree">树视图</button></div><span class="xs muted">BR-46：展开结果必须在预览页完整可见，不允许盲投</span></div>';
      const rows = [];
      s.planAcc.slice(0, 3).forEach(function (act) {
        s.planAud.forEach(function (auid) {
          const au = D.audiences.filter(function (x) { return x.id === auid; })[0];
          s.planAssets.slice(0, 3).forEach(function (asid) {
            const as = D.assets.filter(function (x) { return x.id === asid; })[0];
            const copy = COPIES[Number(s.planCopy[0]) || 0];
            rows.push({ c: ['<span class="tag-code">' + act + "</span>", "meta_conversion_" + (au ? au.name.split(" ")[0] : "") + "_20260920_" + String(rows.length + 1).padStart(3, "0"),
              au ? au.name : "", as ? as.name : "", '<span class="xs muted">' + copy + "</span>", "$" + ADH.num(budget(), 0)] });
          });
        });
      });
      h += ADH.tbl("tbl-combo", [{ label: "账户" }, { label: "AdSet 名称（按命名规则生成）" }, { label: "受众" }, { label: "素材" }, { label: "文案" }, { label: "日预算", cls: "num" }], rows, { tight: true, pageSize: 8, empty: "请先完成前 4 步" });
      h += '<div class="mt8 xs muted">仅展示前若干组合，实际预览包含全部 ' + cmb.ads + " 条；支持导出完整清单。</div>";
    } else {
      h += ADH.note("info", "提交前校验（FR-MID-16）", "校验结果分为 <b>阻断（BLOCK）</b> 与 <b>警告（WARN）</b>；存在阻断项时不允许提交。提交前还会调用渠道 <span class='tag-code'>validate_only</span> + <span class='tag-code'>synchronous_ad_review</span> 预检。");
      const results = planCheckResults();
      h += '<div class="mt12">' + ADH.tbl("tbl-check", [{ label: "类别" }, { label: "校验项" }, { label: "级别" }, { label: "结果" }, { label: "说明" }], results.map(function (r) {
        return { c: [r[0], r[1], r[2] === "BLOCK" ? ADH.chip("danger", "阻断") : ADH.chip("warn", "警告"),
          r[3] === "PASS" ? ADH.chip("ok", "通过") : (r[3] === "WARN" ? ADH.chip("warn", "警告") : ADH.chip("danger", "未通过")), '<span class="xs">' + r[4] + "</span>"] };
      }), { tight: true }) + "</div>";
      const blocked = results.filter(function (r) { return r[3] === "FAIL"; }).length;
      h += '<div class="mt12">' + (blocked ? ADH.note("danger", "存在 " + blocked + " 项阻断", "请返回修正后再提交；提交按钮已禁用。") : ADH.note("ok", "校验通过，可以提交", "提交将生成异步任务并分片入队。")) + "</div>";
      h += ADH.sec("幂等与回滚") + ADH.kv([["幂等键", '<span class="tag-code">task_id + 组合索引 + 对象类型</span>'],
        ["重复提交", "同一任务重复点击提交不产生重复对象"],
        ["重试策略", "仅重试失败项，不重跑成功项；网络超时先回查渠道侧"],
        ["回滚边界", "仅支持删除「本次任务创建、且无投放数据」的对象；已有消耗的对象只能暂停 / 归档"]]);
    }
    h += "</div>";
    h += '<div class="drawer-foot" style="border-radius:0 0 12px 12px">' +
      '<button class="btn sm" data-act="wizard" data-v="prev"' + (step === 1 ? " disabled" : "") + ">上一步</button>" +
      '<div class="grow"></div><span class="xs muted">组合：账户 ' + cmb.a + " × 受众 " + cmb.t + " × 素材 " + cmb.c + " × 文案 " + cmb.x + " → AdSet " + cmb.adsets + " / Ad " + cmb.ads + "</span>" +
      (step < 6 ? '<button class="btn primary sm" data-act="wizard" data-v="next" data-max="6">下一步</button>' : '<button class="btn primary sm" data-act="plan-submit"' + (dimsOk ? "" : ' disabled title="存在阻断项：请先补全组合维度（账户 / 素材）"') + ">确认提交</button>") +
      "</div></div>";

    /* 右侧：实时组合计算器 */
    h += '<div class="grid" style="gap:12px">' +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("split", 15) + '实时组合计算<span class="desc">BR-45 / BR-49</span></h3></div><div class="card-body">' +
      ADH.hbars([
        { name: "账户 a", total: cmb.a, fmt: cmb.a + " 个", color: "#3355ff" },
        { name: "受众 t", total: cmb.t, fmt: cmb.t + " 个", color: "#7c3aed" },
        { name: "素材 c", total: cmb.c, fmt: cmb.c + " 个", color: "#0b9e6a" },
        { name: "文案 x", total: cmb.x, fmt: cmb.x + " 个", color: "#c2780a" }
      ]) + '<div class="hr"></div>' +
      ADH.kv([["AdSet 数", '<b class="mono">a × t = ' + cmb.adsets + "</b>"], ["Ad 数", '<b class="mono">a × t × c × x = ' + cmb.ads + "</b>"],
        ["单批次上限", '<span class="mono">500</span>' + (cmb.ads > 500 ? ' <span class="chip danger">超限</span>' : ' <span class="chip ok">通过</span>')],
        ["预估日消耗", '<b class="mono">$' + ADH.num(cmb.adsets * budget(), 0) + "</b>"], ["分片策略", "优先按账户切分，其次按受众切分"]]) +
      "</div></div>" +
      '<div class="card"><div class="card-head"><h3>' + ADH.icon("bolt", 15) + "安全设计</h3></div><div class=\"card-body\">" +
      ADH.note("rule", "幂等", "幂等键 = task_id + 组合索引 + 对象类型；适配层调用前先查本地映射表，命中则跳过创建（BR-50）。") +
      '<div class="mt8">' + ADH.note("info", "并发与限流", "超限自动分片，按渠道限流并发提交；RATE_LIMIT 指数退避，最大退避 15 分钟、最大重试 5 次（BR-64）。") + "</div>" +
      '<div class="mt8">' + ADH.note("warn", "Campaign 合并复用", "同一账户内 Campaign 默认合并复用（一个 Campaign 下挂多个 AdSet），可配置为每个受众独立 Campaign（BR-48）。") + "</div>" +
      "</div></div></div></div>";
    return h;
  }
});
ADH.action("plan-tpl", function (p) {
  const s = ADH.s();
  s.planTpl = p.v;
  if ((PLAN_BID[planObjective()] || []).indexOf(s.planBid) < 0) s.planBid = "LOWEST_COST_WITHOUT_CAP";
  ADH.render();
});
ADH.action("plan-budget", function (p, el) {
  ADH.s().planBudget = Number(String(el.value).replace(/[^\d.]/g, "")) || 0;
  ADH.state.focusId = "plan-budget";
  ADH.render();
});
ADH.action("plan-bid", function (p, el) {
  ADH.s().planBid = String(el.value);
  ADH.state.focusId = "plan-bid";
  ADH.render();
});
ADH.action("plan-start", function (p, el) {
  ADH.s().planStart = String(el.value);
  ADH.state.focusId = "plan-start";
  ADH.render();
});
ADH.action("plan-end", function (p, el) {
  ADH.s().planEnd = String(el.value);
  ADH.state.focusId = "plan-end";
  ADH.render();
});
ADH.action("plan-landing", function (p, el) {
  ADH.s().planLanding = String(el.value);
  ADH.state.focusId = "plan-landing";
  ADH.render();
});
/* ============ 配对模式（BR-47）：按 CSV / Excel 映射表一对一创建 ============ */
const PAIR_DIMS = [["account_id", "账户"], ["audience", "受众"], ["asset", "素材"], ["copy", "文案"], ["budget", "日预算"]];
function pairMap() {
  const s = ADH.s();
  if (!s.pairMap) s.pairMap = { account_id: "账户 account_id", audience: "受众 audience", asset: "素材 asset", copy: "文案 copy", budget: "日预算 budget" };
  return s.pairMap;
}
function pairRowsRaw() {
  const s = ADH.s();
  if (s.pairRows) return s.pairRows;
  const acc = D.accounts.map(function (a) { return a.actId; });
  const aud = D.audiences.slice(0, 4).map(function (a) { return a.name; });
  const okAssets = D.assets.filter(function (a) { return a.status === "APPROVED"; });
  const as = (okAssets.length ? okAssets : D.assets).slice(0, 4).map(function (a) { return a.name; });
  const cp = COPIES.slice(0, 3);
  const rows = [];
  for (let i = 0; i < 9; i++) {
    rows.push({
      account_id: acc[i % acc.length] || "—", audience: aud[i % aud.length] || "—",
      asset: as.length ? as[(i * 3) % as.length] : "—", copy: cp[i % cp.length] || "—",
      budget: String(60 + (i % 4) * 20)
    });
  }
  s.pairRows = rows;
  return rows;
}
/* 未导入时视为空，避免「还没导入却已经有预览数据」的误导 */
function pairRows() { return ADH.s().pairImported ? pairRowsRaw() : []; }
function pairUniq(rows, key) { const o = {}; rows.forEach(function (r) { o[r[key]] = 1; }); return Object.keys(o).length; }
function pairCart(rows) { return pairUniq(rows, "account_id") * pairUniq(rows, "audience") * pairUniq(rows, "asset") * pairUniq(rows, "copy"); }
function pairChecks(rows) {
  const map = pairMap();
  const unmapped = PAIR_DIMS.filter(function (d) { return !map[d[0]]; }).map(function (d) { return d[1]; });
  const vis = D.accounts.map(function (a) { return a.actId; });
  const badAcc = rows.map(function (r) { return r.account_id; }).filter(function (v, i, a) { return a.indexOf(v) === i && vis.indexOf(v) < 0; });
  const emptyCells = rows.filter(function (r) { return PAIR_DIMS.some(function (d) { return !String(r[d[0]] || "").trim(); }); }).length;
  return [
    ["映射", "文件列 → 组合维度 映射完整（5 列）", "BLOCK", unmapped.length ? "FAIL" : "PASS", unmapped.length ? "未映射：" + unmapped.join("、") : "5 个维度均已映射"],
    ["数据", "必填单元格无空值", "BLOCK", emptyCells ? "FAIL" : "PASS", emptyCells ? emptyCells + " 行存在空值，已跳过" : rows.length + " 行数据完整"],
    ["数量", "行数 ≤ 单批次上限 500（BR-45）", "BLOCK", rows.length > 500 ? "FAIL" : "PASS", "本次 " + rows.length + " 行 → 一对一生成 " + rows.length + " 个 AdSet"],
    ["权限", "行内账户均在当前角色数据权限内（BR-3.4）", "BLOCK", badAcc.length ? "FAIL" : "PASS", badAcc.length ? "越权账户：" + badAcc.join("、") : "账户均在授权范围内"],
    ["受众", "受众在目标账户下可用", "BLOCK", "PASS", rows.length + " 行受众均可用"],
    ["素材", "素材状态为 APPROVED（BR-29）", "BLOCK", "PASS", "引用的素材均为已批准状态"],
    ["命名", "同账户内重名（BR-41 策略）", "WARN", "PASS", "未检测到重名，如出现将自动追加序号"],
    ["去重", "幂等键命中则跳过创建（BR-50）", "WARN", "PASS", "幂等键 = task_id + 组合索引 + 对象类型"]
  ];
}
function pairScreen() {
  const s = ADH.s();
  const imported = !!s.pairImported;
  const rows = pairRows();
  const raw = pairRowsRaw();
  const map = pairMap();
  const checks = imported ? pairChecks(rows) : [];
  const blocked = checks.filter(function (c) { return c[2] === "BLOCK" && c[3] === "FAIL"; });
  const tpl = D.templates.filter(function (x) { return x.id === s.planTpl; })[0] || D.templates[0];
  const cartFull = pairCart(raw);

  let h = '<div class="flex between center wrap mb12"><div>' +
    '<div class="flex center gap8"><h2 style="margin:0;font-size:16px">配对模式 · 映射表一对一创建</h2>' + ADH.chip("brand", "BR-47") + ADH.chip("neutral", "替代笛卡尔积") + "</div>" +
    '<div class="xs muted mt4">按 CSV / Excel 导入的映射表一对一创建，用于非全组合场景（如特定受众只配特定素材）</div></div>' +
    '<div class="flex gap8"><button class="btn" data-act="plan-pair-back">返回全组合模式</button>' +
    '<button class="btn primary" data-act="plan-pair-submit"' + (blocked.length || !imported ? " disabled" : "") + ">" + ADH.icon("send", 13) + "提交配对创建</button></div></div>";

  h += '<div class="grid g4 mb12">' +
    ADH.stat({ label: "映射表行数", value: imported ? rows.length : "—", unit: imported ? "行" : "", foot: '<span class="muted">一对一创建，不做组合展开</span>' }) +
    ADH.stat({ label: "将生成 AdSet / Ad", value: imported ? rows.length + " / " + rows.length : "—", foot: '<span class="muted">每行 1 个 AdSet、1 条 Ad</span>' }) +
    ADH.stat({ label: "同等笛卡尔积", value: cartFull, unit: "条", foot: '<span style="color:var(--warn)">全组合会展开 ' + cartFull + " 条，配对模式按需只建 " + (imported ? rows.length : "N") + " 条</span>" }) +
    ADH.stat({ label: "阻断项", value: imported ? blocked.length : "—", unit: imported ? "项" : "", foot: !imported ? '<span class="muted">导入后自动校验</span>' : (blocked.length ? '<span style="color:var(--danger)">需处理后再提交</span>' : '<span class="muted">校验通过可提交</span>') }) + "</div>";

  h += '<div class="grid g-3-2"><div class="card"><div class="card-head"><h3>' + ADH.icon("upload", 15) + '导入映射表<span class="desc">FR-MID-14 / BR-47</span></h3>' +
    '<div class="right"><button class="btn xs" data-act="plan-pair-tpl">' + ADH.icon("download", 12) + "下载映射表模板</button></div></div><div class=\"card-body\">" +
    '<div class="grid g2 mb12">' +
      '<div class="field"><label>使用的结构模板</label><select class="select" data-live="1" data-act="plan-pair-tplsel">' + D.templates.map(function (x) { return '<option value="' + x.id + '"' + (tpl && tpl.id === x.id ? " selected" : "") + ">" + ADH.esc(x.name) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>单 AdSet 日预算来源</label><select class="select"><option selected>使用映射表内的 budget 列</option><option>统一使用固定值</option></select></div>' +
    "</div>";

  if (!imported) {
    h += '<div class="drag-hint" data-act="plan-pair-import"><div class="dh-t">' + ADH.icon("upload", 16) + " 点击导入 CSV / Excel 映射表</div>" +
      '<div class="xs muted">支持 .csv / .xlsx；首行为列名。演示环境将载入 ' + raw.length + ' 行样例数据。</div>' +
      '<div class="xs muted mt4">列名示例：' + PAIR_DIMS.map(function (d) { return '<span class="tag-code">' + d[0] + "</span>"; }).join(" ") + "</div></div>" +
      ADH.note("info", "为什么需要配对模式", "全组合模式下「账户 × 受众 × 素材 × 文案」会展开 " + cartFull + " 条对象，而本次只想为特定受众配特定素材，因此用映射表一对一创建（BR-47）。");
  } else {
    h += '<div class="file-row"><div class="fmeta"><div class="fname">' + ADH.icon("list", 13) + " mapping_20260920.csv</div>" +
      '<div class="fsub">' + rows.length + " 行 · 5 列 · 已解析 · 上传人 " + ADH.rolePerson() + '</div></div><span class="chip ok">已导入</span>' +
      '<button class="btn xs ml8" data-act="plan-pair-reimport">重新导入</button></div>';
    h += '<div class="mt16">' + ADH.sec("字段映射（文件列 → 组合维度）") +
      '<div class="xs muted mb8">系统按列名自动映射，可手动调整；未映射的维度视为不参与本次创建。</div>' +
      PAIR_DIMS.map(function (d) {
        return '<div class="map-row"><span class="mono small">' + ADH.esc(map[d[0]] || "—") + '</span><span class="tc" style="color:var(--ink-4)">→</span>' +
          '<select class="select" style="padding:4px 8px;font-size:11.5px" data-live="1" data-act="plan-pair-map" data-dim="' + d[0] + '">' +
          [d[1], "不使用"].concat(PAIR_DIMS.map(function (y) { return y[1]; }).filter(function (y) { return y !== d[1]; })).map(function (o) {
            return "<option" + (map[d[0]] && map[d[0]].indexOf(o.split(" ")[0]) >= 0 ? " selected" : "") + ">" + o + "</option>";
          }).join("") + "</select></div>";
      }).join("") + "</div>";
  }
  h += "</div></div>";

  h += '<div class="grid" style="gap:12px">' +
    '<div class="card"><div class="card-head"><h3>' + ADH.icon("check", 15) + '导入校验</h3></div><div class="card-body">' +
    (imported
      ? ADH.tbl("tbl-pair-checks", [{ label: "类别" }, { label: "校验项" }, { label: "级别" }, { label: "结果" }],
          checks.map(function (c) {
            return { c: ['<span class="chip neutral">' + c[0] + "</span>", '<div><div class="small">' + c[1] + '</div><div class="xs muted">' + c[4] + "</div></div>",
              ADH.chip(c[2] === "BLOCK" ? "danger" : "warn", c[2]),
              c[3] === "PASS" ? ADH.chip("ok", "通过") : ADH.chip("danger", "阻断")] };
          }), { tight: true })
      : ADH.emptyState({ icon: "upload", title: "导入映射表后自动校验", desc: "校验会检查列映射完整性、空值、行数上限、账户数据权限、受众可用性与素材审批状态，全部前置执行。", action: '<button class="btn sm primary" data-act="plan-pair-import">导入映射表</button>' })) + "</div></div>" +
    '<div class="card"><div class="card-head"><h3>' + ADH.icon("bolt", 15) + '安全设计</h3></div><div class="card-body">' +
    ADH.note("rule", "幂等与重跑（BR-50 / BR-51）", "幂等键 = task_id + 组合索引 + 对象类型；重跑仅重试失败行，不重复创建成功行。") +
    '<div class="mt8">' + ADH.note("warn", "回滚限制（BR-53）", "仅支持删除本次任务创建且<b>无投放数据</b>的对象；已有消耗的对象只能暂停 / 归档。") + "</div>" +
    '<div class="mt8">' + ADH.note("info", "分片与并发", "行数超 150 自动分片，按渠道限流并发提交（BR-64）。") + "</div></div></div></div></div>";

  h += '<div class="card mt12"><div class="card-head"><h3>' + ADH.icon("list", 15) + '一对一展开预览<span class="desc">BR-46 完整可见 · 不允许盲投</span></h3>' +
    '<div class="right"><span class="xs muted">共 ' + rows.length + " 行</span></div></div><div class=\"card-body\">" +
    ADH.tbl("tbl-pair-rows", [{ label: "行" }, { label: "账户" }, { label: "受众" }, { label: "素材" }, { label: "文案" }, { label: "日预算", cls: "num" }, { label: "生成对象" }],
      rows.map(function (r, i) {
        return { c: ['<span class="mono xs muted">#' + String(i + 1).padStart(2, "0") + "</span>", '<span class="tag-code">' + ADH.esc(r.account_id) + "</span>",
          '<span class="xs">' + ADH.esc(r.audience) + "</span>", '<span class="xs">' + ADH.esc(r.asset) + "</span>", '<span class="xs muted">' + ADH.esc(r.copy) + "</span>",
          "$" + ADH.esc(r.budget), '<span class="xs">1 AdSet + 1 Ad</span>' + ADH.chip("ok", "待创建")] };
      }), { tight: true, pageSize: 12, empty: "尚未导入映射表", emptyDesc: "点击左侧「导入映射表」载入 CSV / Excel 后，这里会逐行展示将创建的对象。", emptyAction: '<button class="btn sm primary" data-act="plan-pair-import">导入映射表</button>' }) +
    "</div></div>";

  h += '<div class="toolbar mt12"><span class="xs muted">配对模式不生成组合，行数即对象数</span><div class="grow"></div>' +
    '<button class="btn sm" data-act="plan-pair-back">返回全组合模式</button>' +
    '<button class="btn primary sm" data-act="plan-pair-submit"' + (blocked.length || !imported ? " disabled" : "") + ">提交配对创建</button></div>";
  return h;
}
ADH.action("plan-pair", function () {
  const s = ADH.s();
  s.planMode = "pair"; s.crumbSub = "配对模式（CSV 映射表）";
  if (!s.planTpl) s.planTpl = D.templates[0].id;
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("plan-pair-back", function () {
  const s = ADH.s(); s.planMode = null; s.crumbSub = null;
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("plan-pair-tpl", function () {
  ADH.toast("映射表模板已下载", "ok", "列名：" + PAIR_DIMS.map(function (d) { return d[0]; }).join(",") + "；填写后导入即可一对一创建。");
});
ADH.action("plan-pair-tplsel", function (p, el) { ADH.s().planTpl = String(el.value); ADH.render(); });
ADH.action("plan-pair-import", function () {
  const s = ADH.s(); s.pairImported = true;
  ADH.toast("映射表已解析", "ok", pairRows().length + " 行数据导入完成，列名与组合维度已自动映射，请确认后提交（BR-47）。");
  ADH.render();
});
ADH.action("plan-pair-reimport", function () {
  const s = ADH.s(); s.pairImported = false;
  ADH.render();
});
ADH.action("plan-pair-map", function (p, el) {
  const v = String(el.value);
  const m = pairMap();
  m[p.dim] = v === "不使用" ? "" : v;
  ADH.render();
});
ADH.action("plan-pair-submit", function () {
  if (!ADH.assertPerm("plan.submit")) return;
  if (!ADH.s().pairImported) { ADH.toast("尚未导入映射表", "warn", "请先导入 CSV / Excel 映射表（BR-47），再提交配对创建。"); return; }
  const rows = pairRows();
  const blocked = pairChecks(rows).filter(function (c) { return c[2] === "BLOCK" && c[3] === "FAIL"; });
  if (blocked.length) { ADH.toast("存在阻断项", "warn", blocked.map(function (c) { return c[1]; }).join("；")); return; }
  ADH.overlay({
    kind: "modal", title: "确认提交配对创建", desc: "映射表一对一 · 不做组合展开",
    body: ADH.note("info", "提交后", "系统按映射表逐行创建 1 个 AdSet + 1 条 Ad，并分片入队调用渠道适配层；成功后回写渠道侧 ID 与归因映射。") +
      ADH.sec("本次任务") + ADH.kv([["创建模式", "配对模式（一对一）"], ["映射表", "mapping_20260920.csv · " + rows.length + " 行"],
        ["生成 AdSet / Ad", rows.length + " / " + rows.length], ["同等全组合", pairCart(pairRowsRaw()) + " 条（本次不展开）"],
        ["幂等键", '<span class="tag-code">IDEM-PAIR-' + Math.random().toString(16).slice(2, 6) + "-20260920</span>"], ["提交人", ADH.rolePerson()]]),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="plan-pair-confirm">确认提交</button>'
  });
});
ADH.action("plan-pair-confirm", function () {
  ADH.act("overlay-close", { dataset: {} });
  const s = planNav();
  const n = pairRows().length;
  const t = planResultBuild("PAIR");
  s.step = 1; s.pairImported = false;
  s.planMode = "result"; s.planResTab = "rows"; s.crumbSub = "提交结果 · " + t.id;
  ADH.toast("提交完成 · 任务 " + t.id, "ok", "配对模式 " + n + " 行已按映射表一对一创建（BR-47）；逐条结果与失败重提见下方清单（FR-MID-20）。");
  ADH.render(); window.scrollTo(0, 0);
});
/* ============ 批量计划 · 提交结果（二级屏 FR-MID-15 / 18 / 19 / 20 · BR-45 ~ BR-53） ============ */
/* 结果页与任务中心共用同一份数据与失败处置逻辑：
   - 提交时把本次任务写入 ADH_DATA.tasks，并把任务 id 写入任务处置状态容器 ADH.taskStore()（与任务中心同一容器）
   - 逐条结果的分类与操作复用任务中心导出的 ADH.taskItemView / ADH.taskStats / ADH.taskOpsCell（见文件末尾导出块）
   因此「提交结果」与「任务中心」看到的是同一条任务、同一套 BR-51 / BR-52 / BR-63 / BR-64 处置。 */
const PLAN_RESULT_TABS = [["rows", "结果清单"], ["shards", "分片与并发"], ["idem", "幂等与去重"]];
const PLAN_OBJ_CN = { CAMPAIGN: "Campaign", ADSET: "AdSet", CREATIVE: "Creative", AD: "Ad" };
const PLAN_OBJ_EP = { CAMPAIGN: "/campaigns", ADSET: "/adsets", CREATIVE: "/adcreatives", AD: "/ads" };
function planObjEp(object) { return "POST /v26.0/act_{id}" + (PLAN_OBJ_EP[object] || ""); }
const PLAN_FAIL_POOL = [
  { cat: "RATE_LIMIT", code: "80004", retry: 1, msg: "User request limit reached (HTTP 429, retry after 120s)", advice: "限流类错误按 BR-64 指数退避自动重试（最大 15 分钟、5 次）" },
  { cat: "NETWORK", code: "LOCAL_TIMEOUT", retry: 1, msg: "请求超时（60s），渠道侧执行结果未知", advice: "先 tree.pull 回查渠道侧是否已创建，命中则标记成功（BR-52）" },
  { cat: "VALIDATION", code: "LOCAL_NAME_DUP", retry: 0, msg: "同账户内已存在同名对象", advice: "按 BR-41 自动追加序号后重试" },
  { cat: "BUSINESS", code: "2635011", retry: 0, msg: "Audience too small: 812 people (minimum 1,000)", advice: "业务条件不满足：放宽受众或改用相似受众后重试" },
  { cat: "POLICY", code: "1885189", retry: 0, msg: "Ad creative rejected: text overlay exceeds recommended area", advice: "政策类错误不可自动重试，替换素材后重试" }
];
const PLAN_FAIL_CAPPED = { cat: "RATE_LIMIT", code: "80004", retry: 5, msg: "User request limit reached (HTTP 429)", advice: "已达最大重试 5 次，需人工确认后再重试（BR-64）" };

function planHash(str) {
  let h = 2166136261; const x = String(str);
  for (let i = 0; i < x.length; i++) { h = (h ^ x.charCodeAt(i)) >>> 0; h = (h * 16777619) >>> 0; }
  return h;
}
function planSlug(t) { return String(t).replace(/[^0-9A-Za-z\u4e00-\u9fa5]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 16); }
function planPad(n, w) { return String(n).padStart(w, "0"); }
function planNav() {
  const s = planSel();
  s.planResTab = s.planResTab || "rows";
  s.planObjFilt = s.planObjFilt || "";
  s.planResFilt = s.planResFilt || "";
  return s;
}
function planTask() {
  const id = ADH.s().planResId;
  return id ? D.tasks.filter(function (x) { return x.id === id; })[0] : null;
}
function planNextId() {
  const s = ADH.s();
  s.planSeq = Number(s.planSeq || 16) + 1;
  return "T-20260920-" + planPad(s.planSeq, 3);
}
/* 提交后立即生成结果：行结构 = 本次组合展开，逐条结果确定性生成（演示数据） */
/* ============ 批量计划 · 渠道预检二级屏（validate_only + synchronous_ad_review） ============ */
function planPrecheckScreen() {
  const s = planNav(), cmb = combos(), checks = planCheckResults();
  const blocked = checks.filter(function (c) { return c[2] === "BLOCK" && c[3] === "FAIL"; });
  const stage = Number(s.precheckStage || 0);
  const done = stage >= 2;
  const creativeN = s.planAcc.length * s.planAssets.length * s.planCopy.length;
  function stageCard(no, title, desc, ok, fail) {
    const tone = fail ? "var(--danger-soft);color:var(--danger)" : (ok ? "var(--ok-soft);color:var(--ok)" : "var(--surface-3);color:var(--ink-3)");
    return '<div class="card" style="box-shadow:none"><div class="card-body">' +
      '<div class="flex center gap8"><span class="wz-num" style="width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:' + tone + ';font-weight:700;font-size:11px">' + (ok ? "✓" : (fail ? "!" : no)) + "</span>" +
      '<b style="font-size:12.5px">' + title + "</b>" + (fail ? ADH.chip("danger", "未通过") : (ok ? ADH.chip("ok", "通过") : ADH.chip("neutral", "待执行"))) + "</div>" +
      '<div class="xs muted" style="margin:6px 0 0">' + desc + "</div></div></div>";
  }
  let h = '<div class="flex between center wrap mb12"><div>' +
    '<div class="flex center gap8"><button class="btn sm" data-act="plan-precheck-back">← 返回上一步</button>' +
    '<h2 style="margin:0;font-size:15.5px">渠道预检</h2>' + ADH.chip("brand", "提交前校验") + ADH.chip("neutral", "不创建对象") + "</div>" +
    '<div class="xs muted mt4">先完成本地参数校验，再进行渠道同步审核；两阶段都通过后才允许正式提交。</div></div>' +
    '<div class="flex gap8 center">' + (done ? '<button class="btn sm" data-act="plan-precheck-reset">重新预检</button>' : "") + "</div></div>";

  h += '<div class="grid g4 mt12">' +
    [["本地校验", blocked.length ? blocked.length + " 项阻断" : "全部通过", blocked.length ? "需返回修正" : checks.length + " 项检查"],
      ["参数校验", done ? "通过" : "待执行", "参数 / 必填 / 结构"],
      ["同步审核", done ? "通过" : "待执行", "素材 / 文案 / 落地页政策"],
      ["本次对象", cmb.adsets + " AdSet · " + cmb.ads + " Ad", "另含 " + s.planAcc.length + " Campaign · " + creativeN + " Creative"]].map(function (x, i) {
      return '<div class="stat"><div class="label">' + x[0] + '</div><div class="value" style="font-size:15px;color:' + (i > 0 && i < 3 && done ? "var(--ok)" : (i === 0 && blocked.length ? "var(--danger)" : "inherit")) + '">' + x[1] + '</div><div class="foot xs muted">' + x[2] + "</div></div>";
    }).join("") + "</div>";

  h += '<div class="grid g3 mt16">' +
    stageCard("1", "本地结构校验", "检查组合维度、预算、出价、排期、落地页、命名与权限，不调用渠道。", !blocked.length, blocked.length > 0) +
    stageCard("2", "参数校验", "只校验参数与对象结构，不创建广告；可提前发现必填缺失与不合法组合。", done, false) +
    stageCard("3", "同步审核", "在参数校验基础上同步检查广告完整性，提前发现素材、文本、落地页与政策问题。", done, false) +
    "</div>";

  h += '<div class="card mt16"><div class="card-head"><h3>' + ADH.icon("list", 15) + '本地校验清单<span class="desc">阻断项必须为 0 才能运行渠道预检</span></h3><div class="right">' + (blocked.length ? ADH.chip("danger", blocked.length + " 项阻断") : ADH.chip("ok", "0 项阻断")) + "</div></div>" +
    '<div class="card-body">' + ADH.tbl("tbl-precheck", [{ label: "类别" }, { label: "校验项" }, { label: "级别" }, { label: "结果" }, { label: "说明" }],
      checks.map(function (r) {
        return { c: ['<span class="chip neutral">' + r[0] + "</span>", r[1], r[2] === "BLOCK" ? ADH.chip("danger", "阻断") : ADH.chip("warn", "警告"),
          r[3] === "PASS" ? ADH.chip("ok", "通过") : (r[3] === "WARN" ? ADH.chip("warn", "警告") : ADH.chip("danger", "未通过")), '<span class="xs">' + r[4] + "</span>"] };
      }), { tight: true }) + "</div></div>";

  if (!done) {
    h += '<div class="toolbar mt16"><span class="xs muted">' + (blocked.length ? "存在 " + blocked.length + " 项本地阻断，修正后才能运行渠道预检" : "本地校验通过，可运行渠道预检") + '</span><div class="grow"></div>' +
      '<button class="btn primary sm" data-act="plan-precheck-run"' + (blocked.length ? ' disabled title="请先修正本地阻断项"' : "") + ">" + ADH.icon("bolt", 13) + "运行渠道预检</button></div>";
  } else {
    h += '<div class="mt16">' + ADH.note("ok", "渠道预检通过", "参数校验与同步审核均未发现阻断问题。正式提交后仍需关注渠道审核状态。") + "</div>" +
      '<div class="toolbar mt16"><button class="btn sm" data-act="plan-precheck-back">返回修改</button><div class="grow"></div>' +
      '<span class="xs muted">预检通过不代表平台最终审核通过。</span>' +
      '<button class="btn primary sm" data-act="plan-precheck-confirm">' + ADH.icon("check", 13) + "确认提交</button></div>";
  }
  h += '<div class="mt12">' + ADH.note("warn", "超时与重复提交", "预检或创建请求超时且结果未知时，先回查渠道侧是否已创建，再决定重试或标记成功；同一任务重复提交不会产生重复对象。") + "</div>";
  return h;
}
function planResultBuild(mode) {
  const s = planSel(), bud = budget();
  const accs = s.planAcc.length ? s.planAcc.slice() : D.accounts.slice(0, 2).map(function (a) { return a.actId; });
  const audIds = (s.planAud && s.planAud.length) ? s.planAud.slice() : D.audiences.slice(0, 3).map(function (a) { return a.id; });
  const asIds = s.planAssets.length ? s.planAssets.slice() : D.assets.filter(function (a) { return a.status === "APPROVED"; }).slice(0, 4).map(function (a) { return a.id; });
  const cps = (s.planCopy && s.planCopy.length) ? s.planCopy.slice() : ["0"];
  const tpl = D.templates.filter(function (x) { return x.id === s.planTpl; })[0] || D.templates[0];
  const audName = function (id) { const o = D.audiences.filter(function (x) { return x.id === id; })[0]; return o ? o.name : id; };
  const asName = function (id) { const o = D.assets.filter(function (x) { return x.id === id; })[0]; return o ? o.name : id; };

  const rows = [];
  if (mode === "PAIR") {
    /* BR-47 配对模式：映射表逐行创建 1 个 AdSet + 1 条 Ad，不做笛卡尔积展开 */
    pairRowsRaw().forEach(function (r, i) {
      rows.push({ object: "ADSET", act: r.account_id, name: "pair_" + planSlug(r.audience) + "_adset_" + planPad(i + 1, 2),
        combination: "audience=" + r.audience + ", budget=" + r.budget });
      rows.push({ object: "CREATIVE", act: r.account_id, name: "pair_" + planSlug(r.asset) + "_cr_" + planPad(i + 1, 2),
        combination: "asset=" + r.asset + ", copy=" + r.copy });
      rows.push({ object: "AD", act: r.account_id, name: "pair_" + planSlug(r.asset) + "_ad_" + planPad(i + 1, 2),
        combination: "creative_id=上一步返回, copy=" + r.copy });
    });
  } else {
    /* BR-48：同账户内 Campaign 合并复用（1 个 Campaign 挂多个 AdSet） */
    accs.forEach(function (a, i) {
      rows.push({ object: "CAMPAIGN", act: a, name: "meta_conversion_" + planPad(i + 1, 2) + "_20260920_campaign",
        combination: "同账户内合并复用 Campaign（BR-48）" });
    });
    accs.forEach(function (a) {
      audIds.forEach(function (au) {
        rows.push({ object: "ADSET", act: a, name: "meta_" + planSlug(audName(au)) + "_adset",
          combination: "audience=" + au + ", budget=" + bud });
      });
    });
    /* Creative 是独立对象：按账户 × 素材 × 文案创建一次，可被同账户下多条 Ad 复用 */
    accs.forEach(function (a) {
      asIds.forEach(function (as2) {
        cps.forEach(function (cp) {
          rows.push({ object: "CREATIVE", act: a, name: "meta_" + planSlug(asName(as2)) + "_" + planPad(Number(cp) + 1, 2) + "_cr",
            combination: "asset=" + asName(as2) + (cps.length > 1 ? ", copy=" + COPIES[Number(cp) || 0] : "") });
        });
      });
    });
    accs.forEach(function (a) {
      audIds.forEach(function (au) {
        asIds.forEach(function (as2) {
          cps.forEach(function (cp) {
            rows.push({ object: "AD", act: a, name: "meta_" + planSlug(audName(au)) + "_" + planSlug(asName(as2)) + "_ad",
              combination: "audience=" + au + ", creative=meta_" + planSlug(asName(as2)) + "_" + planPad(Number(cp) + 1, 2) + "_cr" });
          });
        });
      });
    });
  }

  /* 幂等命中（BR-50）：第 2 个对象的幂等键在本地映射表中已存在 → 跳过创建，不重复建计划 */
  const skipPos = rows.length > 4 ? 1 : -1;
  /* 失败位置：按固定步长确定，末位强制承载「已达最大重试次数」场景（BR-64） */
  const others = [];
  rows.forEach(function (r, i) { if (i !== skipPos) others.push(i); });
  const failPos = others.filter(function (r, k) { return k % 7 === 3; });
  const capPos = others.length ? others[others.length - 1] : -1;
  if (capPos >= 0 && failPos.indexOf(capPos) < 0) failPos.push(capPos);

  const items = rows.map(function (r, i) {
    const it = { index: i + 1, object: r.object, target: r.act + " / " + PLAN_OBJ_CN[r.object], name: r.name,
      combination: r.combination, status: "SUCCESS", externalId: String(23850000000 + (planHash(r.name + r.act) % 8000000)),
      errorCategory: "", errorCode: "", errorMessage: "", retry: 0, advice: "" };
    if (i === skipPos) {
      it.status = "SKIPPED";
      it.externalId = String(23850000000 + (planHash(r.name) % 8000000));
      it.advice = "BR-50：幂等键命中本地映射表，跳过创建（对象已由任务 T-20260920-014 创建，不重复建计划）";
      return it;
    }
    const fi = failPos.indexOf(i);
    if (fi >= 0) {
      const t2 = (fi === failPos.length - 1 && failPos.length >= 2) ? PLAN_FAIL_CAPPED : PLAN_FAIL_POOL[fi % PLAN_FAIL_POOL.length];
      it.status = "FAILED"; it.externalId = "—";
      it.errorCategory = t2.cat; it.errorCode = t2.code; it.errorMessage = t2.msg; it.retry = t2.retry; it.advice = t2.advice;
      return it;
    }
    return it;
  });

  const failN = items.filter(function (x) { return x.status === "FAILED"; }).length;
  const skipN = items.filter(function (x) { return x.status === "SKIPPED"; }).length;
  const succN = items.length - failN - skipN;
  const shards = Math.max(1, Math.ceil(items.length / 150));
  const errSum = {};
  items.forEach(function (x) { if (x.status === "FAILED") errSum[x.errorCategory] = (errSum[x.errorCategory] || 0) + 1; });
  const id = planNextId();
  const t = {
    id: id, type: "BATCH_CREATE",
    title: (mode === "PAIR" ? "配对模式 · " : "") + accs.length + " 账户 × " + audIds.length + " 受众 × " + asIds.length + " 素材" + (cps.length > 1 ? " × " + cps.length + " 文案" : "") + " · 四层对象",
    status: failN ? "PARTIAL_FAILED" : "SUCCEEDED", progress: 100,
    total: items.length, success: succN + skipN, fail: failN,
    shardTotal: shards, shardDone: shards, createdBy: ADH.rolePerson(), channel: "meta",
    startedAt: "2026-09-20 10:" + planPad(20 + Number(ADH.s().planSeq), 2),
    duration: (1 + (items.length % 6)) + " 分 " + ((items.length * 3) % 60) + " 秒",
    template: mode === "PAIR" ? tpl.id : tpl.id, accounts: accs.length,
    idemKey: "IDEM-" + planHash(id).toString(16).slice(0, 4) + "-" + id,
    errorSummary: errSum, rollbackable: 1, items: items
  };
  D.tasks.unshift(t);
  const sn = planNav();
  sn.planResId = id; sn.planResMode = mode; sn.planResShards = shards;
  ADH.taskStore().taskId = id;
  sn.planResDaily = accs.length * audIds.length * bud;
  sn.planResAccs = accs.length; sn.planResAuds = audIds.length; sn.planResAssets = asIds.length;
  sn.sel = sn.sel || {}; sn.sel.taskRetry = [];
  /* 新一次提交的结果页从「全部对象 / 全部结果」开始，避免沿用上一次的筛选条件 */
  sn.planObjFilt = ""; sn.planResFilt = "";
  return t;
}
function planResultCell(t, it) {
  if (it.status === "SKIPPED") return ADH.chip("neutral", "幂等跳过") + '<div class="xs muted">命中映射表</div>';
  if (it.status === "SUCCESS") return ADH.chip("ok", "已创建") + '<div class="xs muted mono">' + ADH.esc(it.externalId) + "</div>";
  const v = ADH.taskItemView(t, it);
  if (v.marked) return ADH.chip("ok", "已重试成功") + '<div class="xs muted">第 ' + v.n + " 次 · 退避 " + ADH.taskBackoffMin(v.n) + " 分钟</div>";
  if (v.manual) return ADH.chip("neutral", "已人工处理") + '<div class="xs muted">失败四项记录保留并随清单导出</div>';
  return ADH.chip("danger", v.cat) + '<div class="xs muted mono">' + ADH.esc(it.errorCode) + "</div>";
}
function planResultScreen() {
  const s = planNav(), t = planTask();
  if (!t) {
    return '<div class="card"><div class="card-body">' + ADH.emptyState({ icon: "warn", title: "暂无本次提交结果",
      desc: "提交结果仅在本次提交后展示；历史任务的结果清单请在任务中心查看。",
      action: '<button class="btn sm primary" data-act="plan-result-back">返回批量计划</button>' }) + "</div></div>";
  }
  const tab = s.planResTab || "rows";
  const st = ADH.taskStats(t), status = ADH.taskDerivedStatus(t);
  const skipped = (t.items || []).filter(function (x) { return x.status === "SKIPPED"; });

  let acts = "";
  if (st.fail > 0 && ADH.can("ops.execute")) acts += '<button class="btn primary sm" data-act="task-retry-all" data-v="' + ADH.esc(t.id) + '">' + ADH.icon("refresh", 13) + "重提失败项（" + st.fail + "）</button>";
  acts += '<button class="btn sm" data-act="plan-result-task">' + ADH.icon("eye", 13) + "在任务中心查看</button>";
  acts += '<button class="btn sm" data-act="plan-result-export">' + ADH.icon("download", 13) + "导出结果清单</button>";
  if (!ADH.can("ops.execute")) acts += ADH.chip("warn", "当前角色无批量操作权限");

  let h = '<div class="flex between center wrap mb12"><div>' +
    '<div class="flex center gap8"><button class="btn sm" data-act="plan-result-back">← 返回批量计划</button>' +
    '<h2 style="margin:0;font-size:15.5px">批量创建提交结果</h2>' + ADH.statusChip(status) +
    ADH.chip("brand", s.planResMode === "PAIR" ? "配对模式" : "全组合") +
    (skipped.length ? ADH.chip("neutral", "幂等跳过 " + skipped.length + " 项") : "") +
    (st.marked ? ADH.chip("ok", "已重提成功 " + st.marked + " 项") : "") +
    (st.manual ? ADH.chip("neutral", "人工处理 " + st.manual + " 项") : "") + "</div>" +
    '<div class="xs muted mt4"><span class="mono">' + t.id + "</span> · " + t.title + " · 模板 " + ADH.esc(t.template) +
    " · 幂等键 <span class=\"mono\">" + t.idemKey + "</span> · 提交人 " + t.createdBy + " · " + t.startedAt + " · 耗时 " + t.duration + "</div></div>" +
    '<div class="flex gap8 wrap center">' + acts + "</div></div>";

  h += '<div class="card"><div class="tabs">' + PLAN_RESULT_TABS.map(function (x) {
    const n = x[0] === "rows" ? st.fail : (x[0] === "idem" ? skipped.length : 0);
    return '<button class="' + (tab === x[0] ? "on" : "") + '" data-act="plan-result-tab" data-v="' + x[0] + '">' + x[1] + (n > 0 ? "（" + n + "）" : "") + "</button>";
  }).join("") + "</div>";

  if (tab === "rows") {
    const objF = s.planObjFilt || "", resF = s.planResFilt || "";
    const all = t.items || [];
    const shown = all.filter(function (it) {
      if (objF && it.object !== objF) return false;
      if (resF) {
        const v = ADH.taskItemView(t, it);
        if (resF === "FAILED" && !(it.status === "FAILED" && !v.marked && !v.manual)) return false;
        if (resF === "RESOLVED" && !(it.status === "FAILED" && (v.marked || v.manual))) return false;
        if (resF === "SUCCESS" && it.status !== "SUCCESS") return false;
        if (resF === "SKIPPED" && it.status !== "SKIPPED") return false;
      }
      return true;
    });
    const retryKeys = all.filter(function (it) { const v = ADH.taskItemView(t, it); return v.retryable && !v.marked && !v.manual; })
      .map(function (it) { return ADH.taskKey(t, it); });
    const selN = ADH.sel("taskRetry").length;

    h += '<div class="card-body">';
    h += '<div class="grid g4 mb12">' +
      ADH.stat({ label: "创建对象", value: t.total, unit: "个", foot: '<span class="muted">Campaign + AdSet + Creative + Ad</span>' }) +
      ADH.stat({ label: "已创建", value: st.success, unit: "个", foot: '<span class="muted">含幂等跳过 ' + skipped.length + " 个</span>" }) +
      ADH.stat({ label: "失败待处理", value: st.fail, unit: "个", foot: st.fail ? '<span style="color:var(--danger)">可按分类重提</span>' : (st.manual ? '<span class="muted">另有 ' + st.manual + " 项已转人工处理" + "</span>" : '<span class="muted">无待处理失败项</span>') }) +
      ADH.stat({ label: "预估日消耗", value: "$" + ADH.num(s.planResDaily || 0, 0), foot: '<span class="muted">Σ 各 AdSet 日预算</span>' }) + "</div>";
    h += ADH.sec("提交摘要") + ADH.kv([
      ["任务 ID", '<span class="tag-code">' + t.id + "</span>"],
      ["幂等键", '<span class="tag-code">' + t.idemKey + "</span>"],
      ["创建模式", s.planResMode === "PAIR" ? "配对模式 · 映射表一对一" : "笛卡尔积 · 全组合展开"],
      ["组合维度", (s.planResAccs || t.accounts) + " 账户 × " + (s.planResAuds || 0) + " 受众 × " + (s.planResAssets || 0) + " 素材"],
      ["结构模板", ADH.esc(t.template)],
      ["分片提交", (s.planResShards || t.shardTotal) + " 片 · 已完成"],
      ["提交人", t.createdBy], ["提交时间", '<span class="mono">' + t.startedAt + "</span>"], ["执行耗时", t.duration]]);

    h += '<div class="toolbar mt16 mb8"><span class="small">结果清单 <b>' + shown.length + "</b> / " + t.total + " 条</span>" +
      '<select class="select" style="max-width:140px" data-live="1" data-act="filter" data-k="planObjFilt" data-tbl="tbl-plan-res">' +
      [["", "全部对象类型"], ["CAMPAIGN", "Campaign"], ["ADSET", "AdSet"], ["CREATIVE", "Creative"], ["AD", "Ad"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (objF === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select>" +
      '<select class="select" style="max-width:150px" data-live="1" data-act="filter" data-k="planResFilt" data-tbl="tbl-plan-res">' +
      [["", "全部结果"], ["SUCCESS", "已创建"], ["FAILED", "失败待处理"], ["RESOLVED", "已重提 / 已处理"], ["SKIPPED", "幂等跳过"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (resF === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select>" +
      '<div class="grow"></div>' +
      (selN ? '<button class="btn xs primary" data-act="task-retry-sel">' + ADH.icon("refresh", 12) + "重提所选（" + selN + "）</button>" : "") +
      '<button class="btn xs" data-act="sel-all" data-key="taskRetry" data-values="' + retryKeys.join(",") + '">全选可重提</button>' +
      '<button class="btn xs" data-act="sel-clear" data-k="planRes">清空选择</button></div>';

    h += ADH.tbl("tbl-plan-res", [{ label: "序号" }, { label: "" }, { label: "对象类型" }, { label: "名称 / 目标" }, { label: "组合 / 参数" }, { label: "渠道侧 ID" }, { label: "结果" }, { label: "操作" }],
      shown.map(function (it) {
        const v = ADH.taskItemView(t, it);
        return { c: ['<span class="mono xs muted">#' + planPad(it.index, 2) + "</span>",
          it.status === "FAILED" && !v.marked && !v.manual ? ADH.checkbox("taskRetry", v.k, "") : "",
          ADH.chip("neutral", PLAN_OBJ_CN[it.object] || it.object),
          '<div class="small">' + ADH.esc(it.name) + '</div><div class="xs muted">' + ADH.esc(it.target) + "</div>",
          '<span class="xs">' + ADH.esc(it.combination) + "</span>",
          it.status === "SKIPPED" ? '<span class="mono xs muted">—</span>' : '<span class="mono xs">' + ADH.esc(it.externalId) + "</span>",
          planResultCell(t, it), it.status === "FAILED" ? ADH.taskOpsCell(t, it) : '<span class="xs muted">—</span>'] };
      }), { tight: true, sortable: true, pageSize: 12, empty: "没有符合筛选条件的对象", emptyDesc: "调整上方「对象类型」与「结果」筛选条件后重试。" });

    h += '<div class="mt12">' + ADH.note("rule", "BR-50 幂等与重复提交（FR-MID-19）",
      "幂等键 = <b>task_id + 组合索引 + 对象类型</b>；适配层调用前先查本地映射表，命中则跳过创建。因此同一批量计划重复点击提交、或失败项重提，都不会产生重复对象。") + "</div>";
    h += '<div class="mt8">' + ADH.note("info", "BR-51 重试策略", "重提仅重试失败项，不重跑成功项；网络超时导致的「结果未知」需先 <b>tree.pull</b> 回查渠道侧再决定重试或标记成功（BR-52）。") + "</div>";
    h += '<div class="mt8">' + ADH.note("warn", "回滚边界", "回滚仅支持删除「本次任务创建、且无投放数据」的对象；已有消耗的对象只能暂停 / 归档。完整回滚预检在任务中心「回滚预检」页签。") + "</div>";
    h += "</div>";
  } else if (tab === "shards") {
    const shards2 = ADH.taskShards(t);
    h += '<div class="card-body">';
    h += '<div class="grid g4 mb12">' +
      ADH.stat({ label: "分片数", value: shards2.length, unit: "片", foot: '<span class="muted">单批次超 500 自动分片</span>' }) +
      ADH.stat({ label: "分片完成", value: t.shardDone + " / " + t.shardTotal, foot: '<span class="muted">断点续跑</span>' }) +
      ADH.stat({ label: "切分依据", value: "账户", foot: '<span class="muted">优先按账户，其次按受众</span>' }) +
      ADH.stat({ label: "并发策略", value: "限流并发", foot: '<span class="muted">RATE_LIMIT 指数退避</span>' }) + "</div>";
    h += ADH.tbl("tbl-plan-shard", [{ label: "分片" }, { label: "范围" }, { label: "状态" }, { label: "对象数", cls: "num" }, { label: "耗时" }],
      shards2.map(function (x) {
        return { c: ['<b class="mono">' + x.name + "</b>", '<span class="xs">' + x.range + "</span>", ADH.chip(x.tone, x.label), x.objects, x.duration],
          v: [x.name, x.range, x.label, x.objects, x.duration] };
      }), { tight: true, sortable: true });
    h += '<div class="mt12">' + ADH.note("info", "BR-45 单批次上限与切分", "单批次生成广告数上限 500；超过时按账户分组分片（优先按账户切分，其次按受众切分）。本次 " + t.total + " 个对象，分 " + shards2.length + " 片提交。") + "</div>";
    h += '<div class="mt8">' + ADH.note("info", "BR-64 并发与限流", "按渠道限流并发提交；限流类错误按指数退避 2^(n-1) 分钟自动重试，最大退避 15 分钟、最大 5 次（INTERNAL 上限 3 次）。") + "</div>";
    h += '<div class="mt8">' + ADH.note("info", "BR-65 进度持久化", "分片检查点与已创建对象 ID 全部落库，服务重启后可从断点续跑，不重复创建已成功的对象。") + "</div>";
    h += "</div>";
  } else {
    h += '<div class="card-body">';
    h += ADH.note("rule", "BR-50 幂等键构成", "幂等键 = <span class=\"mono\">task_id + 组合索引 + 对象类型</span>；适配层调用前先查本地映射表，命中则跳过创建（FR-MID-19）。") +
      '<div class="mt12">' + ADH.kv([
        ["本次幂等键", '<span class="tag-code">' + t.idemKey + "</span>"],
        ["命中映射表", skipped.length ? skipped.length + " 个对象（跳过创建）" : "无命中"],
        ["重复提交", "同一任务重复点击提交不产生重复对象"],
        ["重提失败项", "复用同一幂等键，不会重复创建已成功的对象"],
        ["映射表", "本地「任务 → 渠道侧对象 ID」映射（渠道适配层维护）"]]) + "</div>";
    h += '<div class="mt16">' + ADH.sec("幂等命中明细（本次跳过创建的对象）") +
      (skipped.length
        ? ADH.tbl("tbl-plan-idem", [{ label: "序号" }, { label: "对象类型" }, { label: "名称" }, { label: "组合 / 参数" }, { label: "渠道侧已有 ID" }, { label: "原因" }],
            skipped.map(function (it) {
              return { c: ['<span class="mono xs muted">#' + planPad(it.index, 2) + "</span>", ADH.chip("neutral", PLAN_OBJ_CN[it.object] || it.object),
                '<span class="small">' + ADH.esc(it.name) + "</span>", '<span class="xs">' + ADH.esc(it.combination) + "</span>",
                '<span class="mono xs">' + ADH.esc(it.externalId) + "</span>", '<span class="xs muted">' + ADH.esc(it.advice) + "</span>"] };
            }), { tight: true })
        : ADH.emptyState({ icon: "check", title: "本次没有幂等命中对象", desc: "所有对象都是首次创建；重复提交同一批量计划时可在此核对被跳过的对象与其渠道侧 ID。" }));
    h += '<div class="mt12">' + ADH.note("info", "BR-46 完整可见", "展开结果必须在预览页完整可见（支持表格视图与树视图切换），不允许盲投；提交后逐条结果同样完整可见并可导出（FR-MID-20）。") + "</div>";
    h += "</div>";
  }
  h += "</div>";
  return h;
}
ADH.action("plan-result", function () {
  const s = planNav();
  if (!s.planResId) { ADH.toast("暂无提交结果", "info", "请先完成批量计划向导并提交，提交后会自动进入结果页。"); return; }
  s.planMode = "result"; s.planResTab = s.planResTab || "rows";
  ADH.taskStore().taskId = s.planResId;
  s.crumbSub = "提交结果 · " + s.planResId;
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("plan-result-back", function () {
  const s = planNav();
  s.planMode = null; s.crumbSub = null; s.step = 1;
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("plan-result-tab", function (p) {
  const s = planNav();
  s.planMode = "result"; s.planResTab = p.v || "rows";
  ADH.render();
});
ADH.action("plan-result-task", function () {
  const t = planTask();
  if (!t) { ADH.toast("任务不存在", "warn", "请返回任务列表刷新后重试。"); return; }
  ADH.routeTo("tasks");
  ADH.act("task-open", { dataset: { v: t.id } });
});
ADH.action("plan-result-export", function () {
  if (!ADH.assertPerm("dashboard.export")) return;
  const t = planTask();
  ADH.toast("已创建导出任务", "ok", "结果清单（" + (t ? t.total : 0) + " 条对象 · 含渠道侧 ID、失败四项记录与幂等跳过原因）导出中，完成后生成下载链接（有效期 7 天）。");
});
ADH.action("plan-result-new", function () {
  const s = planNav();
  s.planMode = null; s.crumbSub = null; s.planResId = null; s.step = 1;
  s.planAcc = []; s.planAssets = []; s.sel = {};
  ADH.toast("已开始新的批量计划", "info", "组合维度已重置，可重新选择账户与素材（FR-MID-14）。");
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("plan-tree", function () { ADH.toast("树视图", "info", "BR-46 支持表格视图与树视图切换，展开结果完整可见。"); });
ADH.action("plan-submit", function () {
  if (!ADH.assertPerm("plan.submit")) return;
  const ps = planSel(), missing = [];
  if (!ps.planAcc.length) missing.push("至少选择 1 个广告账户");
  if (!ps.planAssets.length) missing.push("至少选择 1 个素材");
  if (missing.length) { ADH.toast("组合维度未就绪，提交被阻断", "warn", missing.join("；") + "。FR-MID-16：账户 / 素材为必选组合维度，不允许盲投（BR-46）。"); return; }
  const s = planNav();
  s.planMode = "precheck"; s.precheckStage = 0; s.step = 6; s.crumbSub = "渠道预检";
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("plan-precheck-run", function () {
  if (!ADH.assertPerm("plan.submit")) return;
  const blocked = planCheckResults().filter(function (c) { return c[2] === "BLOCK" && c[3] === "FAIL"; });
  if (blocked.length) { ADH.toast("本地校验未通过", "warn", "仍有 " + blocked.length + " 项阻断，请返回 STEP 6 修正后再预检。"); return; }
  const s = planNav();
  s.precheckStage = 2;
  ADH.toast("渠道预检通过", "ok", "validate_only 与 synchronous_ad_review 均通过，未创建任何对象；可确认提交。");
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("plan-precheck-reset", function () {
  planNav().precheckStage = 0;
  ADH.render();
});
ADH.action("plan-precheck-back", function () {
  const s = planNav();
  s.planMode = null; s.precheckStage = 0; s.step = 6; s.crumbSub = null;
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("plan-precheck-confirm", function () {
  if (!ADH.assertPerm("plan.submit")) return;
  const cmb = combos();
  if (Number(planNav().precheckStage || 0) < 2) { ADH.toast("尚未完成渠道预检", "warn", "请先运行 validate_only 与 synchronous_ad_review。"); return; }
  ADH.overlay({
    kind: "modal", title: "确认提交批量创建", desc: "预检已通过 · 正式创建会真实写入渠道",
    body: ADH.note("info", "提交后", "系统创建异步任务并分片入队，按 <b>Campaign → AdSet → Creative → Ad</b> 顺序调用渠道接口；成功后回写渠道侧 ID 与归因映射，失败项按错误分类标记。") +
      '<div class="ep-row" style="margin:10px 0">' + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/campaigns") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adsets") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/adcreatives") + ADH.ep("POST", "/v26.0/act_{AD_ACCOUNT_ID}/ads") + "</div>" +
      ADH.sec("本次任务") + ADH.kv([["模板", (D.templates.filter(function (t) { return t.id === ADH.s().planTpl; })[0] || {}).name],
        ["目标账户", ADH.s().planAcc.length + " 个"], ["生成 Campaign / AdSet / Creative / Ad", ADH.s().planAcc.length + " / " + cmb.adsets + " / " + cmb.ads + " / " + cmb.ads], ["分片数", cmb.shards + " 片"],
        ["预检", '<span class="chip ok">validate_only 通过</span> <span class="chip ok">synchronous_ad_review 通过</span>'],
        ["幂等键", '<span class="tag-code">IDEM-' + Math.random().toString(16).slice(2, 6) + '-20260920</span>'], ["提交人", ADH.rolePerson()]]),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn primary" data-act="plan-submit-confirm">确认提交</button>'
  });
});
ADH.action("plan-submit-confirm", function () {
  ADH.act("overlay-close", { dataset: {} });
  const s = planNav();
  s.step = 1;
  const t = planResultBuild("CARTESIAN");
  s.planMode = "result"; s.planResTab = "rows"; s.crumbSub = "提交结果 · " + t.id;
  ADH.toast("提交完成 · 任务 " + t.id, "ok", "共 " + t.total + " 个对象：已创建 " + t.success + " 个、失败 " + t.fail + " 个；逐条结果与失败重提见下方清单（FR-MID-20）。");
  ADH.render(); window.scrollTo(0, 0);
});
})();

/* ---------------- 批量投放（手动 / 自动） ---------------- */
(function () {
const D = ADH_DATA;
function accIdx() {
  const id = ADH.s().opsAcc || String(D.accounts[0].id);
  ADH.s().opsAcc = id;
  return id;
}
function treeOf() { return D.tree.filter(function (t) { return String(t.accountId) === String(accIdx()); })[0]; }
function opsAdsetRoas(s) { return 0.85 + (opsHash(s.id + "|roi") % 26) / 10; }
function opsCampaignRoas(c) {
  let spend = 0, weighted = 0;
  c.adsets.forEach(function (s) {
    const sp = Number(s.spend) || 0;
    if (s.hasData && sp > 0) { spend += sp; weighted += sp * opsAdsetRoas(s); }
  });
  return spend > 0 ? weighted / spend : 0.85 + (opsHash(c.id + "|roi") % 26) / 10;
}
function allNodes() {
  const t = treeOf(); const out = [];
  if (!t) return out;
  t.campaigns.forEach(function (c) { out.push(c); c.adsets.forEach(function (s) { out.push(s); s.ads.forEach(function (d) { out.push(d); }); }); });
  return out;
}
ADH.page("batch-ops", {
  title: "批量投放", subtitle: "手动批量操作 · 影响预览与二次确认 · 规则驱动的自动批量投放",
  refs: ["FR-MID-21 手动批量操作", "FR-MID-21A 影响预览与二次确认", "FR-MID-22 自动批量投放（规则驱动）", "FR-MID-22A 时间触发", "FR-MID-22B 事件触发自动执行", "FR-MID-22C 条件触发自动执行", "BR-54~BR-58"],
  render: function () {
    if (ADH.s().opsMode === "preview") return opsScreen();
    if (ADH.s().opsMode === "result") return opsResultScreen();
    const tab = ADH.tabOf("manual");
    const t = treeOf();
    const sel = ADH.sel("ops");
    const nodes = allNodes();
    const collapsed = ADH.s().opsCollapsed || {};
    let h = '<div class="card"><div class="tabs">' +
      [["manual", "手动批量投放"], ["auto", "自动批量投放（规则驱动）"]].map(function (x) {
        return '<button class="' + (tab === x[0] ? "on" : "") + '" data-act="tab" data-v="' + x[0] + '">' + x[1] + "</button>";
      }).join("") + "</div>";

    if (tab === "auto") {
      const fuseN = D.rules.filter(function (r) { return r.fuse; }).length;
      const execLog = D.ruleExec.slice().sort(function (a, b) { return b.at < a.at ? -1 : 1; });
      h += '<div class="card-body">' + ADH.note("warn", "自动投放说明", "本期的「自动」= <b>规则驱动</b>，不是 AI 智能优化。规则由投手显式配置，系统按调度执行，且必须<b>可追溯、可回滚、可熔断</b>。") +
        ADH.sec("三种触发方式") + ADH.tbl("tbl-trig", [{ label: "触发方式" }, { label: "说明" }, { label: "示例" }], [
          { c: ["时间触发", "按 Cron 表达式周期性评估", "每小时执行一次预算守护规则"] },
          { c: ["事件触发", "由系统事件触发", "素材被拒审 → 自动暂停引用它的广告"] },
          { c: ["条件触发", "指标满足阈值时触发", "ROAS &lt; 1.0 且消耗 &gt; 50 → 暂停"] }
        ], { tight: true });
      h += '<div class="mt16">' + ADH.sec("调度总览") +
        '<div class="xs muted mb8">系统按 Cron / 事件 / 条件评估规则，命中后走与手动批量操作<b>同一套</b>异步任务、影响上限与安全阀。</div>' +
        ADH.tbl("tbl-sched", [{ label: "规则" }, { label: "触发方式" }, { label: "下次执行" }, { label: "最近执行" }, { label: "单次上限" }, { label: "熔断状态" }, { label: "" }],
          D.rules.map(function (r) {
            return { c: ['<b>' + ADH.esc(r.name) + '</b><div class="xs muted mono">' + r.id + " · " + ADH.esc(r.action.label) + "</div>",
              '<span class="xs">' + ADH.esc(r.trigger.type === "EVENT" ? "事件触发" : "时间触发") + '</span><div class="xs muted mono">' + ADH.esc(r.trigger.label) + "</div>",
              '<span class="xs">' + ADH.esc(r.nextRun) + "</span>",
              '<span class="xs muted">' + ADH.esc(r.lastRunAt) + "</span>",
              '<span class="xs">' + r.guards.maxObjects + " 个</span>",
              r.fuse ? ADH.chip("danger", "已熔断") + '<div class="xs muted">' + ADH.esc(r.fuseReason || "") + "</div>" : ADH.chip("ok", "正常"),
              '<button class="btn xs" data-act="goto" data-page="rules">规则详情</button>'],
              v: [r.name, r.trigger.label, r.nextRun, r.lastRunAt, r.guards.maxObjects, r.fuse ? 1 : 0, ""] };
          }), { sortable: true, tight: true, pageSize: 6 }) + "</div>";
      h += '<div class="mt16">' + ADH.sec("最近自动执行记录") +
        '<div class="xs muted mb8">每条记录都包含：规则 ID · 命中对象 · 命中时指标快照 · 执行动作 · 执行前后值 · 渠道返回结果；可回滚的执行支持回滚。</div>' +
        ADH.tbl("tbl-autolog", [{ label: "时间" }, { label: "规则" }, { label: "模式" }, { label: "命中对象", cls: "num" }, { label: "执行动作" }, { label: "结果" }, { label: "指标快照" }, { label: "" }],
          execLog.map(function (x) {
            return { c: ['<span class="mono xs">' + ADH.esc(x.at) + "</span>",
              '<b>' + ADH.esc(x.ruleName) + '</b><div class="xs muted mono">' + ADH.esc(x.id) + "</div>",
              ADH.statusChip(x.mode), x.hit, '<span class="xs">' + ADH.esc(x.action) + "</span>", ADH.statusChip(x.result),
              '<span class="xs muted">' + ADH.esc(x.snap) + "</span>",
              '<button class="btn xs" data-act="exec-detail" data-v="' + x.id + '">明细' + (x.rollbackable ? " / 回滚" : "") + "</button>"],
              v: [x.at, x.ruleName, x.mode, x.hit, x.action, x.result, x.snap, ""] };
          }), { sortable: true, tight: true, pageSize: 6 }) + "</div>";
      h += '<div class="mt12 grid g3">' + ADH.note("info", "演练模式（BR-67）", "只输出「如果执行会做什么」，不真正下发渠道调用。") +
        ADH.note("info", "观察模式（BR-68）", "规则首次启用默认进入观察模式，至少运行一个周期并展示模拟结果后才允许切换为自动执行。") +
        ADH.note("info", "熔断（BR-71）", "连续 3 次执行失败触发熔断，自动暂停该规则并告警。当前已熔断 <b>" + fuseN + "</b> 条。") + "</div>" +
        '<div class="mt8">' + ADH.note("warn", "影响上限与数据时效", "单规则单次执行影响对象数上限 100，超出则截断并告警；规则评估依赖的指标数据必须有明确的数据时间戳，数据未就绪时跳过本次评估并记录原因，不允许用陈旧数据做决策。") + "</div>" +
        "</div>";
    } else {
      const sel = ADH.sel("ops");
      h += '<div class="card-body" style="padding:11px 14px"><div class="toolbar">' +
        '<span class="small">目标账户</span><select class="select" style="width:220px" data-act="filter" data-k="opsAcc">' +
        D.accounts.filter(function (a, i) { return D.tree.filter(function (x) { return x.accountId === a.id; }).length; }).map(function (a) {
          return '<option value="' + a.id + '"' + (String(a.id) === String(accIdx()) ? " selected" : "") + ">" + a.name + " · " + a.actId + "</option>";
        }).join("") + "</select>" +
        '<span class="chip plain">' + (t ? t.campaigns.length : 0) + " Campaign</span><span class=\"chip plain\">" + nodes.filter(function (n) { return n.level === "ADSET"; }).length + " AdSet</span><span class=\"chip plain\">" + nodes.filter(function (n) { return n.level === "AD"; }).length + " Ad</span>" +
        '<div style="flex:1"></div><button class="btn sm" data-act="ops-refresh">' + ADH.icon("refresh", 13) + "刷新渠道状态</button></div></div>";

      h += '<div class="card-body" style="border-top:1px solid var(--line)"><div class="toolbar mb12">' +
        '<span class="small">已选 <b>' + sel.length + "</b> 个对象</span>" +
        '<button class="btn xs" data-act="sel-all" data-key="ops" data-values="' + nodes.map(function (n) { return n.id; }).join(",") + '">全选 / 取消</button>' +
        '<button class="btn xs" data-act="sel-clear" data-k="ops">清空</button><div style="flex:1"></div>' +
        '<span class="xs muted">操作同样走异步任务，超 50 个对象强制异步</span><span class="xs muted" style="margin-left:10px">ROI 统计 Campaign / AdSet</span></div>';

      h += '<div class="ops-action-bar mb12">' +
        '<span class="xs muted">可用操作</span>' +
        '<button class="btn xs" data-act="ops-run" data-v="ENABLE">批量启用</button>' +
        '<button class="btn xs" data-act="ops-run" data-v="PAUSE">批量暂停</button>' +
        '<button class="btn xs" data-act="ops-run" data-v="BUDGET">批量改预算</button>' +
        '<button class="btn xs" data-act="ops-run" data-v="BID">批量改出价</button>' +
        '<button class="btn xs" data-act="ops-run" data-v="COPY">批量复制</button>' +
        (ADH.can("asset.delete") ? '<button class="btn xs danger-ghost" data-act="ops-run" data-v="DELETE">批量删除</button>' : '<button class="btn xs disabled" title="批量删除仅 admin 可执行">批量删除</button>') +
        '<div class="grow"></div><span class="xs muted">先勾选对象，再选择操作</span></div>';

      if (!t) h += ADH.empty("该账户暂无对象树数据");
      else {
        h += '<div class="ops-tree-scroll"><div class="tree ops-tree">';
        h += '<div class="ops-tree-head"><span class="ops-head-name">对象</span><span class="ops-cols">' +
          '<span class="ops-col budget">日预算</span><span class="ops-col spend">今日消耗</span><span class="ops-col roi" title="ROI 统计 Campaign / AdSet">ROI</span><span class="ops-col bid">出价</span><span class="ops-col status">状态</span></span></div>';
        t.campaigns.forEach(function (c) {
          const cOpen = !collapsed[c.id];
          h += '<div class="tree-row' + (sel.indexOf(c.id) >= 0 ? " sel" : "") + '" data-act="sel" data-key="ops" data-v="' + c.id + '">' +
            '<input type="checkbox" ' + (sel.indexOf(c.id) >= 0 ? "checked" : "") + ' style="accent-color:var(--brand)" />' +
            '<button class="ops-toggle" data-act="ops-toggle" data-v="' + c.id + '" title="' + (cOpen ? "折叠" : "展开") + '">' + ADH.icon(cOpen ? "down" : "chevron", 12) + '</button>' +
            '<span class="lvl-chip lvl-CAMPAIGN">CAMPAIGN</span>' +
            '<span class="nm"><span class="nm-text">' + c.name + (c.source === "EXTERNAL" ? " " + ADH.chip("neutral", "外部创建 · 只读") : "") + '</span></span>' +
            '<span class="ops-cols">' +
              '<span class="ops-col budget muted">—</span>' +
              '<span class="ops-col spend mono">' + "$" + ADH.num(c.spend, 2) + '</span>' +
              '<span class="ops-col roi">' + ADH.roiHtml(opsCampaignRoas(c)) + '</span>' +
              '<span class="ops-col bid muted">—</span>' +
              '<span class="ops-col status">' + ADH.statusChip(c.status) + '</span></span></div>';
          if (!cOpen) return;
          h += '<div class="tree-children">';
          c.adsets.forEach(function (s) {
            const sOpen = !collapsed[s.id];
            h += '<div class="tree-row' + (sel.indexOf(s.id) >= 0 ? " sel" : "") + '" data-act="sel" data-key="ops" data-v="' + s.id + '">' +
              '<input type="checkbox" ' + (sel.indexOf(s.id) >= 0 ? "checked" : "") + ' style="accent-color:var(--brand)" />' +
              '<button class="ops-toggle" data-act="ops-toggle" data-v="' + s.id + '" title="' + (sOpen ? "折叠" : "展开") + '">' + ADH.icon(sOpen ? "down" : "chevron", 12) + '</button>' +
              '<span class="lvl-chip lvl-ADSET">ADSET</span>' +
              '<span class="nm"><span class="nm-text">' + s.name + '</span></span>' +
              '<span class="ops-cols">' +
                '<span class="ops-col budget">' + "$" + s.budget + '</span>' +
                '<span class="ops-col spend mono">' + (s.hasData ? "$" + ADH.num(s.spend, 2) : '<span class="muted">—</span>') + '</span>' +
                '<span class="ops-col roi">' + (s.hasData ? ADH.roiHtml(opsAdsetRoas(s)) : '<span class="muted">—</span>') + '</span>' +
                '<span class="ops-col bid">' + (s.bid ? "$" + s.bid : "自动") + '</span>' +
                '<span class="ops-col status">' + ADH.statusChip(s.status) + '</span></span></div>';
            if (!sOpen) return;
            h += '<div class="tree-children">';
            s.ads.forEach(function (d) {
              h += '<div class="tree-row' + (sel.indexOf(d.id) >= 0 ? " sel" : "") + '" data-act="sel" data-key="ops" data-v="' + d.id + '">' +
                '<input type="checkbox" ' + (sel.indexOf(d.id) >= 0 ? "checked" : "") + ' style="accent-color:var(--brand)" />' +
                '<span class="lvl-chip lvl-AD">AD</span>' +
                '<span class="nm"><span class="nm-text">' + d.name + (d.source === "EXTERNAL" ? " " + ADH.chip("neutral", "外部创建") : "") + '</span>' +
                  '<span class="nm-sub">' + d.assetName + " · CTR " + ADH.pct(d.ctr, 2) + (d.hasData ? "" : " · 无消耗") + '</span></span>' +
                '<span class="ops-cols">' +
                  '<span class="ops-col budget muted">—</span>' +
                  '<span class="ops-col spend mono">' + (d.hasData ? "$" + ADH.num(d.spend, 2) : "—") + '</span>' +
                  '<span class="ops-col roi muted">—</span>' +
                  '<span class="ops-col bid muted">—</span>' +
                  '<span class="ops-col status">' + ADH.statusChip(d.status) + '</span></span></div>';
            });
            h += "</div>";
          });
          h += "</div>";
        });
        h += "</div></div>";
      }
      h += "</div>";
    }
    h += "</div>";
    h += '<div class="card mt12"><div class="card-body"><div class="grid g3">' +
      ADH.note("rule", "BR-54 影响预览必看", "批量操作前必须展示影响预览：受影响对象清单、变更前后对比、风险提示（预算上调幅度 &gt; 50% 时高亮警告）。") +
      ADH.note("info", "BR-56 / BR-58 并发与快照", "对同一对象的并发修改需加锁，后到请求等待前者完成后重新校验；所有批量操作记录操作前值（变更快照），用于回滚与审计。") +
      ADH.note("warn", "外部对象限制", "规则与批量操作不得对渠道侧维护的外部对象执行删除类动作，外部对象仅允许暂停 / 降预算。") +
      "</div></div></div>";
    return h;
  }
});
/* ================= 批量投放 · 二级屏（FR-MID-21 / 21A · BR-54 ~ BR-58） ================= */
/* 操作字典：与 PRD 6.4.1「支持层级」表一一对应 */
const OPS_META = {
  ENABLE: { label: "批量启用", type: "BATCH_UPDATE", kind: "status", after: "ACTIVE", levels: ["CAMPAIGN", "ADSET", "AD"], field: "status" },
  PAUSE: { label: "批量暂停", type: "BATCH_UPDATE", kind: "status", after: "PAUSED", levels: ["CAMPAIGN", "ADSET", "AD"], field: "status" },
  BUDGET: { label: "批量修改预算", type: "BATCH_UPDATE", kind: "budget", levels: ["CAMPAIGN", "ADSET"], field: "daily_budget" },
  BID: { label: "批量修改出价", type: "BATCH_UPDATE", kind: "bid", levels: ["ADSET"], field: "bid_amount" },
  COPY: { label: "批量复制", type: "BATCH_CREATE", kind: "copy", levels: ["CAMPAIGN", "ADSET", "AD"], field: "create" },
  ARCHIVE: { label: "批量归档", type: "BATCH_ARCHIVE", kind: "status", after: "ARCHIVED", levels: ["CAMPAIGN", "ADSET", "AD"], field: "status" },
  DELETE: { label: "批量删除", type: "BATCH_DELETE", kind: "status", after: "DELETED", levels: ["AD"], field: "status" }
};
const OPS_LVL_CN = { CAMPAIGN: "Campaign", ADSET: "AdSet", AD: "Ad" };
/* 当前用户无权限的账户（BR-57：任一账户无权限则整体拒绝，不做部分执行） */
const OPS_ACCT_DENY = {
  "act_2201055": "该账户不在当前用户的账户组授权范围内（BR-3.4 数据权限）",
  "act_3310221": "该账户授权已失效（OAuthException #190），需先重新授权（BR-09）"
};
function opsHash(str) { let h = 2166136261; const x = String(str); for (let i = 0; i < x.length; i++) { h = (h ^ x.charCodeAt(i)) >>> 0; h = (h * 16777619) >>> 0; } return h; }
function opsNav() { return ADH.s(); }
function opsOp() { const s = opsNav(); return OPS_META[s.opsOp] ? s.opsOp : "PAUSE"; }
function opsPMode() { return opsNav().opsParamMode === "ABS" ? "ABS" : "PCT"; }
function opsPVal() {
  const v = opsNav().opsParamVal;
  if (v === undefined || v === "" || isNaN(Number(v))) return opsPMode() === "ABS" ? 5 : 20;
  return Number(v);
}
function opsTabName() { return opsNav().opsTab || "impact"; }
function opsXacctOn() { return !!opsNav().opsXacct; }
function opsSnapOn() { const v = opsNav().opsSnapCommit; return v === undefined ? true : !!v; }
/* 有对象树数据的账户 = 可参与跨账户批量的候选账户 */
function opsPool() { return D.accounts.filter(function (a) { return D.tree.filter(function (x) { return x.accountId === a.id; }).length; }); }
function opsXacctSel() { return ADH.sel("opsXacct"); }
/* 本次批量操作的实际对象集合：当前账户勾选对象 + 跨账户勾选账户的首批对象（演示） */
function opsNodes() {
  const out = allNodes().filter(function (n) { return ADH.sel("ops").indexOf(n.id) >= 0; });
  if (opsXacctOn()) {
    opsXacctSel().forEach(function (actId) {
      const t = D.tree.filter(function (x) { return x.actId === actId; })[0];
      if (!t) return;
      const flat = [];
      t.campaigns.forEach(function (c) { flat.push(c); c.adsets.forEach(function (a) { flat.push(a); a.ads.forEach(function (d) { flat.push(d); }); }); });
      out.push.apply(out, flat.slice(0, 4));
    });
  }
  return out;
}
function opsDenied() {
  if (!opsXacctOn()) return [];
  return opsXacctSel().filter(function (a) { return !!OPS_ACCT_DENY[a]; });
}
function opsAccOf(nodeId) {
  let actId = "";
  D.tree.forEach(function (t) {
    t.campaigns.forEach(function (c) {
      if (c.id === nodeId) actId = t.actId;
      c.adsets.forEach(function (a) {
        if (a.id === nodeId) actId = t.actId;
        a.ads.forEach(function (d) { if (d.id === nodeId) actId = t.actId; });
      });
    });
  });
  return actId || "—";
}
function opsAccLimit(nodeId) {
  const actId = opsAccOf(nodeId);
  const a = D.accounts.filter(function (x) { return x.actId === actId; })[0];
  return a ? a.spendLimit : 1000;
}
function opsRegenName(n) { return String(n.name).replace(/_\d{2,}$/, "") + "_copy01"; }
/* 逐对象计算影响：变更前后 + 支持层级 + BR-73 外部对象 + BR-53 删除边界 + BR-54 高风险 */
function opsRows() {
  const op = opsOp(), meta = OPS_META[op], pm = opsPMode(), pv = opsPVal();
  return opsNodes().map(function (n, i) {
    const r = { n: n, idx: i, act: opsAccOf(n.id), skip: false, skipReason: "", risk: false, riskText: "",
      locked: false, lockedBy: "", before: "", after: "" };
    const lvlOk = meta.levels.indexOf(n.level) >= 0;
    let extBlock = "", costBlock = "";
    if (n.source === "EXTERNAL") {
      const down = pv < 0;
      if (op === "DELETE" || op === "ARCHIVE") extBlock = "渠道侧维护的外部对象不允许删除 / 归档，可改用「暂停」";
      else if (op === "BUDGET" && !down) extBlock = "外部对象仅允许暂停 / 降预算";
    }
    if (op === "DELETE" && n.hasData) costBlock = "已有投放数据，只能暂停 / 归档，不可删除";
    r.skip = !lvlOk || !!extBlock || !!costBlock;
    r.skipReason = [!lvlOk ? (meta.label + "不支持 " + OPS_LVL_CN[n.level] + " 层级") : "", extBlock, costBlock]
      .filter(Boolean).join("；");
    /* 变更前后对比 */
    if (meta.kind === "status") {
      r.before = n.status; r.after = meta.after;
      if (r.before === meta.after) r.riskText = "已是 " + meta.after + "，本次为幂等无变化";
    } else if (meta.kind === "budget" || meta.kind === "bid") {
      const auto = meta.kind === "bid" && !n.bid;
      const inherited = meta.kind === "budget" && n.level !== "ADSET" && !n.budget;
      const base = meta.kind === "bid" ? (n.bid || 4.2) : (n.level === "ADSET" ? n.budget : (n.budget || opsAccLimit(n.id)));
      const delta = pm === "PCT" ? base * pv / 100 : pv;
      const after = Math.round((base + delta) * 100) / 100;
      r.before = "$" + base + (auto ? "（自动出价按建议出价折算）" : "") + (inherited ? "（继承账户日预算）" : "");
      r.after = "$" + after;
      const pctUp = base ? ((after - base) / base) * 100 : 0;
      if (meta.kind === "budget" && pctUp > 50) { r.risk = true; r.riskText = "预算上调 " + Math.round(pctUp) + "% 超过 50%，高风险"; }
    } else if (meta.kind === "copy") {
      r.before = "—"; r.after = opsRegenName(n) + "（按命名规则重新生成）";
    }
    if (r.skip) { r.before = "—"; r.after = "—"; r.risk = false; r.riskText = ""; }
    r.locked = i % 3 === 1;
    r.lockedBy = r.locked ? "T-20260920-015（同账户另一投手发起的批量任务）" : "";
    return r;
  });
}
function opsStat() {
  const rows = opsRows(), s = opsNav();
  const exec = rows.filter(function (r) { return !r.skip; });
  const risk = exec.filter(function (r) { return r.risk; });
  const lock = exec.filter(function (r) { return r.locked; });
  const denied = opsDenied();
  const permOk = ADH.can("ops.execute");
  const asyncForced = exec.length > 50;
  const blocked = !permOk || denied.length > 0 || exec.length === 0 || (lock.length > 0 && !s.opsLockAck);
  return { rows: rows, exec: exec, skip: rows.length - exec.length, risk: risk.length, lock: lock.length,
    snapCount: exec.length, denied: denied, permOk: permOk, asyncForced: asyncForced, blocked: blocked };
}
function opsParamUI() {
  const op = opsOp(), pm = opsPMode(), pv = opsPVal();
  if (!(op === "BUDGET" || op === "BID")) return "";
  const presets = pm === "PCT" ? [-20, -10, 10, 20, 50, 60] : [-5, -2, 2, 5, 10];
  let h = ADH.sec("操作参数（" + (op === "BUDGET" ? "预算" : "出价") + "）");
  h += '<div class="toolbar mb8"><span class="small">调整方式</span>' +
    ["PCT", "ABS"].map(function (m) {
      return '<button class="btn xs' + (pm === m ? " primary" : "") + '" data-act="ops-param-mode" data-v="' + m + '">' + (m === "PCT" ? "百分比" : "绝对值") + "</button>";
    }).join("") + '<span class="xs muted">' + (pm === "PCT" ? "按当前值百分比调整（如 +20%）" : "直接调整绝对值（如 +5 USD）") + "</span></div>";
  h += '<div class="toolbar mb8"><span class="small">' + (pm === "PCT" ? "幅度" : "增量") + "</span>" +
    presets.map(function (o) {
      return '<button class="btn xs' + (Number(pv) === o ? " primary" : "") + '" data-act="ops-param" data-v="' + o + '">' + (o > 0 ? "+" : "") + o + (pm === "PCT" ? "%" : " USD") + "</button>";
    }).join("") +
    '<span class="xs muted">自定义</span><input id="ops-param-val" class="input" style="width:96px" data-live="input" data-act="ops-param-val" value="' + pv + '" /></div>';
  h += ADH.note("info", "支持绝对值与百分比", "PRD 6.4.1：批量修改预算支持绝对值与百分比（如 +20%）；批量修改出价支持绝对值与百分比。变更前值会写入变更快照（BR-58）。");
  return h;
}
function opsAcctUI() {
  const denied = opsDenied(), on = opsXacctOn();
  let h = '<div class="toolbar wrap">' +
    '<span class="small">目标账户</span>' + ADH.chip("brand", (treeOf() || {}).accountName || "—") +
    '<button class="btn xs' + (on ? " primary" : "") + '" data-act="ops-xacct">' + ADH.icon("layers", 12) + (on ? "已开启跨账户批量" : "开启跨账户批量") + "</button>" +
    '<span class="xs muted">BR-57：跨账户批量时，任一账户无权限则整体拒绝，不做部分执行</span></div>';
  if (!on) return h;
  const pool = opsPool(), sel = opsXacctSel();
  const others = pool.filter(function (a) { return String(a.id) !== String(accIdx()); });
  h += '<div class="mt8"><div class="toolbar mb8"><span class="small">附加账户（' + sel.length + " 个已选）</span>" +
    '<button class="btn xs" data-act="ops-xacct-all" data-values="' + others.map(function (a) { return a.actId; }).join(",") + '">全选 / 取消</button>' +
    '<span class="xs muted">用于演示 BR-57 跨账户权限校验与 BR-55 超 50 对象强制异步</span></div>' +
    '<div class="grid g3">' + others.map(function (a) {
      const bad = !!OPS_ACCT_DENY[a.actId];
      return '<label class="check"' + (bad ? ' title="' + ADH.esc(OPS_ACCT_DENY[a.actId]) + '"' : "") + '><input type="checkbox"' +
        (sel.indexOf(a.actId) >= 0 ? " checked" : "") + ' data-act="sel" data-key="opsXacct" data-v="' + a.actId + '" /><span>' +
        ADH.esc(a.name) + ' <span class="mono xs muted">' + a.actId + "</span> " + (bad ? ADH.chip("danger", "无权限") : ADH.chip("ok", "已授权")) + "</span></label>";
    }).join("") + "</div></div>";
  if (denied.length) {
    h += '<div class="mt8">' + ADH.note("danger", "BR-57 整体拒绝（不做部分执行）",
      "本次跨账户批量包含 <b>" + denied.length + "</b> 个无权限账户，系统将<b>整体拒绝</b>本次操作，不会对已授权账户做部分执行：" +
      denied.map(function (a) { return "<br>· <b>" + a + "</b> — " + OPS_ACCT_DENY[a]; }).join("") + "。请移除无权限账户或先完成授权。") + "</div>";
  }
  return h;
}
function opsSnapUI() {
  const on = opsSnapOn();
  return '<div class="mt8 toolbar wrap"><span class="small">变更快照</span>' +
    '<label class="check"><input type="checkbox"' + (on ? " checked" : "") + ' data-act="ops-snap" /><span>记录操作前值，用于回滚与审计（BR-58）</span></label>' +
    (on ? ADH.chip("ok", "已开启") : ADH.chip("warn", "已关闭 · 本次不可回滚")) +
    '<span class="xs muted">关闭后本次批量操作不满足 BR-58 审计要求，且无法回滚</span></div>';
}
function opsScreen() {
  const s = opsNav(), op = opsOp(), meta = OPS_META[op], tab = opsTabName(), st = opsStat();
  const filt = s.opsImpactFilt || "";
  const snapOn = opsSnapOn();
  let acts = "";
  Object.keys(OPS_META).forEach(function (k) {
    acts += '<button class="btn xs' + (k === op ? " primary" : "") + '" data-act="ops-run" data-v="' + k + '">' + OPS_META[k].label + "</button>";
  });
  let h = '<div class="flex between center wrap mb12"><div>' +
    '<div class="flex center gap8"><button class="btn sm" data-act="ops-back">← 返回批量投放</button>' +
    '<h2 style="margin:0;font-size:15.5px">批量操作 · 影响预览与二次确认</h2>' +
    ADH.chip(op === "DELETE" ? "danger" : "brand", meta.label) +
    ADH.chip("plain", "对象 " + st.rows.length + " 个") +
    (st.skip ? ADH.chip("neutral", "自动跳过 " + st.skip + " 个") : "") +
    (st.risk ? ADH.chip("danger", "高风险 " + st.risk + " 个") : "") +
    (st.lock ? ADH.chip("warn", "受并发锁影响 " + st.lock + " 个") : "") +
    (st.asyncForced ? ADH.chip("info", "强制异步（BR-55）") : "") + "</div>" +
    '<div class="xs muted mt4">账户「' + ADH.esc((treeOf() || {}).accountName || "—") + '」 · BR-54 影响预览 + BR-55 / 56 / 57 / 58 保护规则 · 提交后走异步任务并记录变更快照</div></div>' +
    '<div class="flex gap8 wrap center">' + acts + "</div></div>";
  if (!st.permOk) h += ADH.note("warn", "当前角色无批量投放权限", ADH.esc(ADH.LOCK_REASON["ops.execute"]) + "，仅可查看影响预览。") + '<div class="mb12"></div>';
  h += '<div class="card"><div class="card-body">' + ADH.sec("范围与权限") + opsAcctUI() + opsSnapUI() + "</div></div>";
  const tabs = [["impact", "影响预览", st.exec.length], ["guard", "并发与保护", st.lock], ["snap", "变更快照", st.snapCount]];
  h += '<div class="card mt12"><div class="tabs">' + tabs.map(function (x) {
    return '<button class="' + (tab === x[0] ? "on" : "") + '" data-act="ops-tab" data-v="' + x[0] + '">' + x[1] + (x[2] > 0 ? "（" + x[2] + "）" : "") + "</button>";
  }).join("") + "</div>";
  h += '<div class="card-body">';
  if (tab === "impact") h += opsImpactTab(st, filt);
  else if (tab === "guard") h += opsGuardTab(st, snapOn);
  else h += opsSnapTab(st, snapOn);
  h += "</div></div>";
  const blockedTxt = !st.permOk ? "当前角色无批量投放权限" : (st.denied.length ? "存在无权限账户，BR-57 整体拒绝" : (st.exec.length === 0 ? "没有可执行对象（全部被自动跳过）" : (st.lock > 0 && !s.opsLockAck ? "存在并发锁对象，请先确认等待策略（BR-56）" : "")));
  h += '<div class="card mt12"><div class="card-body"><div class="toolbar wrap">' +
    '<button class="btn" data-act="ops-back">取消</button>' +
    '<button class="btn warning" data-act="ops-rollback-demo">查看回滚边界（BR-53）</button>' +
    '<div style="flex:1"></div>' +
    (blockedTxt ? '<span class="chip danger">' + ADH.esc(blockedTxt) + "</span>" : '<span class="chip ok">校验通过，可执行</span>') +
    '<button class="btn primary" data-act="ops-confirm"' + (st.blocked ? ' disabled title="' + ADH.esc(blockedTxt) + '"' : "") + ">确认执行（" + st.exec.length + " 个对象）</button></div></div></div>";
  return h;
}
function opsImpactTab(st, filt) {
  const op = opsOp(), meta = OPS_META[op];
  let h = "";
  if (!st.rows.length) {
    h += ADH.emptyState({ icon: "target", title: "本次没有选中任何对象",
      desc: "返回批量投放列表勾选对象，或开启「跨账户批量」并选择附加账户（FR-MID-21）。",
      action: '<button class="btn sm primary" data-act="ops-back">返回选择对象</button>' });
    h += '<div class="mt12">' + ADH.note("info", "BR-54 影响预览", "批量操作前必须展示影响预览：受影响对象清单、变更前后对比、风险提示（预算上调幅度 &gt; 50% 时高亮警告）。") + "</div>";
    return h;
  }
  h += ADH.sec("影响概览");
  h += '<div class="grid g4 mb12">' +
    ADH.stat({ label: "待执行对象", value: st.exec.length, unit: "个", foot: '<span class="muted">已排除自动跳过项</span>' }) +
    ADH.stat({ label: "自动跳过", value: st.skip, unit: "个", foot: st.skip ? '<span class="muted">层级不支持 / 外部对象 / 有消耗不可删</span>' : '<span class="muted">无</span>' }) +
    ADH.stat({ label: "高风险变更", value: st.risk, unit: "个", foot: st.risk ? '<span style="color:var(--danger)">预算上调超过 50%（BR-54）</span>' : '<span class="muted">无</span>' }) +
    ADH.stat({ label: "执行方式", value: st.asyncForced ? "强制异步" : "异步", unit: "", foot: st.asyncForced ? '<span style="color:var(--warn)">超 50 个对象强制异步并跳转任务中心（BR-55）</span>' : '<span class="muted">批量操作统一走异步任务（BR-55）</span>' }) +
    "</div>";
  h += opsParamUI();
  h += ADH.sec("受影响对象清单（变更前后对比）");
  const chips = [["", "全部 " + st.rows.length], ["RISK", "仅高风险"], ["SKIP", "仅自动跳过"], ["EXTERNAL", "仅外部对象"], ["COST", "有消耗"]];
  h += '<div class="toolbar mb8">' + chips.map(function (c) {
    return '<button class="btn xs' + (filt === c[0] ? " primary" : "") + '" data-act="filter" data-k="opsImpactFilt" data-v="' + c[0] + '">' + c[1] + "</button>";
  }).join("") + '<span class="xs muted">支持按对象类型与结果筛选（BR-54 清单完整可见）</span></div>';
  const view = st.rows.filter(function (r) {
    if (filt === "RISK" && !r.risk) return false;
    if (filt === "SKIP" && !r.skip) return false;
    if (filt === "EXTERNAL" && r.n.source !== "EXTERNAL") return false;
    if (filt === "COST" && !r.n.hasData) return false;
    return true;
  });
  h += ADH.tbl("tbl-ops-impact", [{ label: "对象" }, { label: "层级" }, { label: "变更前" }, { label: "变更后" }, { label: "今日消耗" }, { label: "来源" }, { label: "并发" }, { label: "处置" }],
    view.map(function (r) {
      const afterTone = r.skip ? "var(--ink-3)" : (r.risk ? "var(--danger)" : "var(--ink)");
      return { c: [
        '<span class="xs mono">' + ADH.esc(r.n.name) + '</span><div class="xs muted mono">' + ADH.esc(r.act) + " · " + ADH.esc(r.n.id) + "</div>",
        '<span class="lvl-chip lvl-' + r.n.level + '">' + r.n.level + "</span>",
        '<span class="xs">' + ADH.esc(r.before || "—") + "</span>",
        '<b style="color:' + afterTone + '">' + ADH.esc(r.after || "—") + "</b>" + (r.risk ? '<div class="xs" style="color:var(--danger)">' + ADH.esc(r.riskText) + "</div>" : (r.riskText ? '<div class="xs muted">' + ADH.esc(r.riskText) + "</div>" : "")),
        "$" + ADH.num(r.n.spend, 2),
        r.n.source === "EXTERNAL" ? ADH.chip("neutral", "外部对象 · 仅可暂停 / 降预算") : ADH.chip("brand", "系统对象"),
        r.skip ? '<span class="xs muted">—</span>' : (r.locked ? ADH.chip("warn", "等待锁") + '<div class="xs muted">' + ADH.esc(r.lockedBy) + "</div>" : ADH.chip("ok", "空闲")),
        r.skip ? ADH.chip("neutral", "自动跳过") + '<div class="xs muted">' + ADH.esc(r.skipReason) + "</div>" : ADH.chip("info", "将执行")
      ], v: [r.n.name, r.n.level, r.before, r.after, r.n.spend, r.n.source, r.locked ? 1 : 0, r.skip ? 1 : 0] };
    }), { tight: true, pageSize: 10, sortable: true, empty: "没有符合筛选条件的对象", emptyDesc: "清除筛选条件后可查看完整清单。" });
  h += '<div class="mt12 grid g3">' +
    ADH.note("rule", "BR-54 影响预览必看", "批量操作前必须展示影响预览：受影响对象清单、变更前后对比、风险提示（预算上调幅度 &gt; 50% 时高亮警告）。") +
    ADH.note("info", "变更前值已记录（BR-58）", "所有批量操作记录操作前值，形成变更快照，用于回滚与审计；快照可在「变更快照」页签核对。") +
    ADH.note("warn", "BR-73 外部对象限制", "规则与批量操作不得对渠道侧维护的外部对象执行删除类动作，外部对象仅允许暂停 / 降预算。") +
    "</div>";
  h += '<div class="mt12">' + ADH.note("info", "层级支持范围", meta.label + " 支持层级：<b>" + meta.levels.map(function (l) { return OPS_LVL_CN[l]; }).join(" / ") + "</b>；不在支持范围内的对象会被自动跳过并在「处置」列标注原因。") + "</div>";
  return h;
}
function opsGuardTab(st, snapOn) {
  let h = ADH.sec("执行方式与保护规则");
  h += ADH.kv([
    ["异步执行", "批量操作统一走异步任务；本次对象 " + st.exec.length + " 个" + (st.asyncForced ? ' <span class="chip warn">超 50 个，强制异步并跳转任务中心</span>' : "（未超 50 个，仍走异步）")],
    ["并发锁", "对同一对象的并发修改需加锁：后到请求等待前者完成后<b>重新校验</b>，避免基于过期数据的覆盖写；本次有 " + st.lock + " 个对象被其他任务锁定"],
    ["跨账户权限", st.denied.length ? '<span style="color:var(--danger)">检测到 ' + st.denied.length + " 个无权限账户 → 整体拒绝，不做部分执行</span>" : "本次未包含无权限账户，权限校验通过"],
    ["变更快照", snapOn ? "已开启：写入操作前值，可在任务中心回滚" : '<span style="color:var(--warn)">已关闭：不会记录操作前值，将不满足审计要求</span>']
  ]);
  h += '<div class="mt16">' + ADH.sec("并发锁：等待并重新校验") +
    (st.lock === 0 ? ADH.emptyState({ icon: "check", title: "本次没有对象被其他任务锁定", desc: "所有对象锁均空闲，可直接下发。" })
      : ADH.tbl("tbl-ops-lock", [{ label: "对象" }, { label: "层级" }, { label: "锁定来源" }, { label: "处理策略" }],
        st.exec.filter(function (r) { return r.locked; }).map(function (r) {
          return { c: ['<span class="xs mono">' + ADH.esc(r.n.name) + "</span>", '<span class="lvl-chip lvl-' + r.n.level + '">' + r.n.level + "</span>",
            '<span class="xs">' + ADH.esc(r.lockedBy) + "</span>",
            '<span class="xs">等待前者完成后<b>重新校验</b>再执行（不使用过期快照覆盖写）</span>'] };
        }), { tight: true }) +
      '<div class="mt8"><label class="check"><input type="checkbox"' + (opsNav().opsLockAck ? " checked" : "") + ' data-act="ops-lock-ack" /><span>我已了解：被锁定的对象将排队等待，前者完成后重新校验再执行</span></label></div>') +
    "</div>";
  h += '<div class="mt16">' + ADH.sec("变更快照") +
    '<div class="xs muted">开关位于上方「范围与权限」区。快照在提交时随异步任务一并写入审计日志，用于回滚与审计；关闭后本次操作不可回滚。</div></div>';
  h += '<div class="mt16">' + ADH.sec("回滚边界（提交前确认）") +
    ADH.tbl("tbl-ops-rb", [{ label: "对象情形" }, { label: "可否回滚" }, { label: "可选处置" }], [
      { c: ["本次操作创建、且无投放数据", ADH.chip("ok", "可删除回滚"), "删除 / 暂停 / 归档"] },
      { c: ["已有投放数据（消耗 &gt; 0）", ADH.chip("warn", "不可删除"), "暂停 / 归档"] },
      { c: ["渠道侧维护的外部对象", ADH.chip("danger", "不可回滚"), "仅暂停 / 降预算"] }
    ], { tight: true }) + "</div>";
  h += '<div class="mt12 grid g3">' +
    ADH.note("info", "BR-55 为什么必须异步", "批量操作可能涉及数百对象与渠道限流，同步等待会导致请求超时；统一走异步任务，进度与失败明细在任务中心可查。") +
    ADH.note("warn", "并发修改保护", "避免「基于过期数据的覆盖写」：若期间他人已修改同一对象，本次将重新校验后再执行，并以渠道侧返回为准。") +
    ADH.note("danger", "跨账户整单校验", "跨账户批量时，只要任一账户无权限即整体拒绝，避免出现「部分账户生效、部分未生效」的不一致状态。") +
    "</div>";
  return h;
}
function opsSnapTab(st, snapOn) {
  const op = opsOp(), meta = OPS_META[op];
  if (!snapOn) {
    return ADH.emptyState({ icon: "warn", title: "变更快照已关闭", desc: "所有批量操作必须记录操作前值（变更快照），用于回滚与审计。请回到「并发与保护」页签重新开启。",
      action: '<button class="btn sm primary" data-act="ops-snap">立即开启变更快照</button>' });
  }
  let h = ADH.sec("变更快照（操作前值）");
  h += '<div class="xs muted mb8">快照在提交时随异步任务一并写入审计日志；回滚时以快照为准，并遵守回滚边界。</div>';
  h += ADH.tbl("tbl-ops-snap", [{ label: "对象" }, { label: "层级" }, { label: "变更字段" }, { label: "操作前值" }, { label: "操作后值" }, { label: "快照状态" }],
    st.rows.map(function (r) {
      return { c: ['<span class="xs mono">' + ADH.esc(r.n.name) + "</span>",
        '<span class="lvl-chip lvl-' + r.n.level + '">' + r.n.level + "</span>",
        '<span class="mono xs">' + meta.field + "</span>",
        '<span class="xs">' + ADH.esc(r.before || "—") + "</span>",
        '<span class="xs">' + ADH.esc(r.after || "—") + "</span>",
        r.skip ? ADH.chip("neutral", "跳过 · 未写快照") : ADH.chip("ok", "已记录")] };
    }), { tight: true, pageSize: 12 });
  h += '<div class="mt12">' + ADH.note("info", "快照与回滚的关系（BR-58 / BR-53）", "回滚以「变更快照 + 幂等键」为依据：本次操作创建且无投放数据的对象可删除，已有消耗的对象只能暂停 / 归档，外部对象不可回滚。") + "</div>";
  return h;
}
function opsResultTask() {
  const id = opsNav().opsResId;
  return id ? D.tasks.filter(function (x) { return x.id === id; })[0] : null;
}
function opsNextId() {
  let mx = 0;
  D.tasks.forEach(function (t) { const m = /^T-20260920-(\d+)$/.exec(t.id); if (m) mx = Math.max(mx, Number(m[1])); });
  return "T-20260920-" + String(mx + 1).padStart(3, "0");
}
function opsBuildResult() {
  const s = opsNav(), op = opsOp(), meta = OPS_META[op], st = opsStat(), snapOn = opsSnapOn();
  const exec = st.exec;
  const id = opsNextId();
  const items = exec.map(function (r, i) {
    const it = { index: i + 1, target: r.act + " / " + OPS_LVL_CN[r.n.level], name: r.n.name, level: r.n.level,
      combination: meta.field + ": " + (r.before || "—") + " → " + (r.after || "—"),
      status: "SUCCESS", externalId: String(12020000000 + (opsHash(r.n.id + op) % 900000)),
      errorCategory: "", errorCode: "", errorMessage: "", retry: 0, advice: "" };
    if (i % 5 === 2) {
      it.status = "FAILED"; it.externalId = "—";
      it.errorCategory = "RATE_LIMIT"; it.errorCode = "80004"; it.retry = 1;
      it.errorMessage = "User request limit reached (HTTP 429, retry after 120s)";
      it.advice = "限流类错误可指数退避自动重试（BR-64），仅重试失败项（BR-51）";
    } else if (i % 7 === 4) {
      it.status = "FAILED"; it.externalId = "—";
      it.errorCategory = op === "DELETE" ? "BUSINESS" : "VALIDATION"; it.errorCode = op === "DELETE" ? "2635011" : "100"; it.retry = 0;
      it.errorMessage = op === "DELETE" ? "Object has delivery data and cannot be deleted" : "Invalid parameter: this field is not editable for external objects";
      it.advice = "不可自动重试：修改配置或转人工处理（BR-63）";
    }
    return it;
  });
  const failN = items.filter(function (x) { return x.status === "FAILED"; }).length;
  const errSum = {};
  items.forEach(function (x) { if (x.status === "FAILED") errSum[x.errorCategory] = (errSum[x.errorCategory] || 0) + 1; });
  const shards = Math.max(1, Math.ceil(exec.length / 150));
  const t = {
    id: id, type: meta.type,
    title: meta.label + " · " + exec.length + " 个对象" + (opsXacctOn() ? "（跨账户 " + (opsXacctSel().length + 1) + " 个账户）" : ""),
    status: failN ? "PARTIAL_FAILED" : "SUCCEEDED", progress: 100,
    total: items.length, success: items.length - failN, fail: failN,
    shardTotal: shards, shardDone: shards, createdBy: ADH.rolePerson(), channel: "meta",
    startedAt: "2026-09-20 10:" + String(20 + (items.length % 30)).padStart(2, "0"),
    duration: (items.length % 5 + 1) + " 分 " + ((items.length * 7) % 60) + " 秒",
    template: "—", accounts: opsXacctOn() ? (opsXacctSel().length + 1) : 1,
    idemKey: "IDEM-" + opsHash(id + op).toString(16).slice(0, 4) + "-" + id,
    errorSummary: errSum, rollbackable: snapOn ? 1 : 0,
    opsOp: op, opsLabel: meta.label, opsField: meta.field, opsSnap: snapOn,
    opsAsync: 1, opsSkip: st.skip, opsLock: st.lock, opsDenied: st.denied.slice(),
    snapshots: snapOn ? exec.map(function (r) { return { obj: r.n.name, level: r.n.level, field: meta.field, before: r.before, after: r.after, act: r.act }; }) : [],
    items: items };
  D.tasks.unshift(t);
  s.opsResId = id; s.opsResFilt = "";
  ADH.taskStore().taskId = id;
  return t;
}
function opsResultScreen() {
  const s = opsNav(), t = opsResultTask();
  if (!t) {
    return '<div class="card"><div class="card-body">' + ADH.emptyState({ icon: "warn", title: "暂无本次批量操作结果",
      desc: "提交结果仅在本次提交后展示；历史任务请在任务中心查看。",
      action: '<button class="btn sm primary" data-act="ops-result-back">返回批量投放</button>' }) + "</div></div>";
  }
  const items = t.items || [], snap = t.snapshots || [];
  const failN = items.filter(function (x) { return x.status === "FAILED"; }).length;
  const okN = items.length - failN;
  const filt = s.opsResFilt || "";
  const shown = items.filter(function (x) {
    if (filt === "FAILED" && x.status !== "FAILED") return false;
    if (filt === "SUCCESS" && x.status !== "SUCCESS") return false;
    return true;
  });
  const acts = '<button class="btn sm" data-act="ops-result-task">' + ADH.icon("eye", 13) + "在任务中心查看</button>" +
    '<button class="btn sm" data-act="ops-result-export">' + ADH.icon("download", 13) + "导出结果清单</button>";
  let h = '<div class="flex between center wrap mb12"><div>' +
    '<div class="flex center gap8"><button class="btn sm" data-act="ops-result-back">← 返回批量投放</button>' +
    '<h2 style="margin:0;font-size:15.5px">批量操作提交结果</h2>' + ADH.statusChip(t.status) +
    ADH.chip("brand", t.opsLabel) +
    ADH.chip("info", t.opsAsync ? "异步任务" : "同步") +
    (t.opsSkip ? ADH.chip("neutral", "自动跳过 " + t.opsSkip + " 个") : "") +
    (t.opsSnap ? ADH.chip("ok", "已记录变更快照") : ADH.chip("warn", "未记录快照")) +
    (t.accounts > 1 ? ADH.chip("violet", "跨账户 " + t.accounts + " 个") : "") + "</div>" +
    '<div class="xs muted mt4"><span class="mono">' + t.id + "</span> · " + ADH.esc(t.title) + ' · 幂等键 <span class="mono">' + t.idemKey + "</span> · 提交人 " + ADH.esc(t.createdBy) + " · " + t.startedAt + " · 耗时 " + t.duration + "</div></div>" +
    '<div class="flex gap8 wrap center">' + acts + "</div></div>";
  h += '<div class="card"><div class="card-body"><div class="grid g4 mb12">' +
    ADH.stat({ label: "执行对象", value: items.length, unit: "个", foot: '<span class="muted">已排除自动跳过 ' + (t.opsSkip || 0) + " 个</span>" }) +
    ADH.stat({ label: "成功", value: okN, unit: "个", foot: '<span class="muted">渠道侧已回写并记录快照</span>' }) +
    ADH.stat({ label: "失败待处理", value: failN, unit: "个", foot: failN ? '<span style="color:var(--danger)">可在任务中心按分类重提（BR-51）</span>' : '<span class="muted">无待处理失败项</span>' }) +
    ADH.stat({ label: "分片", value: t.shardTotal, unit: "片", foot: '<span class="muted">超 50 个对象强制异步切分（BR-55）</span>' }) +
    "</div>";
  h += ADH.sec("提交摘要") + ADH.kv([
    ["任务 ID", '<span class="tag-code">' + t.id + "</span>"],
    ["任务类型", '<span class="tag-code">' + t.type + "</span> · " + ADH.esc(t.opsLabel)],
    ["幂等键", '<span class="tag-code">' + t.idemKey + "</span>"],
    ["执行方式", t.opsAsync ? "异步任务；" + (items.length > 50 ? "对象数超 50，已强制异步并跳转任务中心" : "对象数未超 50，仍统一走异步任务") : "同步"],
    ["跨账户校验", t.opsDenied.length ? '<span style="color:var(--danger)">整体拒绝：' + t.opsDenied.join("、") + "</span>" : "通过（未发现无权限账户）"],
    ["并发锁", (t.opsLock || 0) > 0 ? "本次有 " + t.opsLock + " 个对象排队等待前者完成并重新校验" : "无并发锁冲突"],
    ["变更快照", t.opsSnap ? '<span class="chip ok">已记录 ' + snap.length + " 条操作前值</span>" : '<span class="chip warn">未记录，不可回滚</span>'],
    ["回滚支持", t.rollbackable ? "支持按回滚边界处理（详见任务中心 → 回滚预检）" : "本次不支持回滚"]
  ]) + "</div></div>";
  h += '<div class="card mt12"><div class="tabs"><button class="on">结果清单（' + shown.length + " / " + items.length + '）</button></div><div class="card-body">';
  h += '<div class="toolbar mb8">' + [["", "全部"], ["SUCCESS", "仅成功"], ["FAILED", "仅失败"]].map(function (c) {
    return '<button class="btn xs' + (filt === c[0] ? " primary" : "") + '" data-act="filter" data-k="opsResFilt" data-v="' + c[0] + '">' + c[1] + "</button>";
  }).join("") + '<span class="xs muted">逐条对象结果（含渠道侧对象 ID 与操作前值）</span></div>';
  h += ADH.tbl("tbl-ops-result", [{ label: "序号" }, { label: "对象" }, { label: "层级" }, { label: "变更" }, { label: "结果" }, { label: "渠道侧 ID" }],
    shown.map(function (x) {
      return { c: ['<span class="mono xs muted">#' + String(x.index).padStart(2, "0") + "</span>",
        '<span class="xs mono">' + ADH.esc(x.name) + '</span><div class="xs muted mono">' + ADH.esc(x.target) + "</div>",
        '<span class="lvl-chip lvl-' + x.level + '">' + x.level + "</span>",
        '<span class="xs">' + ADH.esc(x.combination) + "</span>",
        x.status === "SUCCESS" ? ADH.chip("ok", "已执行") : ADH.chip("danger", x.errorCategory) + '<div class="xs muted mono">' + ADH.esc(x.errorCode) + "</div>",
        '<span class="mono xs">' + ADH.esc(x.externalId) + "</span>"],
        v: [x.index, x.name, x.level, x.combination, x.status, x.externalId] };
    }), { tight: true, pageSize: 12, empty: "没有符合筛选条件的结果", emptyDesc: "清除筛选条件后可查看完整结果清单。" });
  h += "</div></div>";
  if (snap.length) {
    h += '<div class="card mt12"><div class="card-body">' + ADH.sec("变更快照（操作前值）") +
      ADH.tbl("tbl-ops-resnap", [{ label: "对象" }, { label: "层级" }, { label: "字段" }, { label: "操作前值" }, { label: "操作后值" }, { label: "账户" }],
        snap.map(function (x) {
          return { c: ['<span class="xs mono">' + ADH.esc(x.obj) + "</span>", '<span class="lvl-chip lvl-' + x.level + '">' + x.level + "</span>",
            '<span class="mono xs">' + ADH.esc(x.field) + "</span>", '<span class="xs">' + ADH.esc(x.before || "—") + "</span>",
            '<span class="xs">' + ADH.esc(x.after || "—") + "</span>", '<span class="mono xs muted">' + ADH.esc(x.act) + "</span>"] };
        }), { tight: true, pageSize: 12 }) + "</div></div>";
  }
  h += '<div class="card mt12"><div class="card-body"><div class="grid g3">' +
    ADH.note("info", "BR-55 异步任务", "批量操作已作为异步任务下发：可在任务中心查看实时进度、分片明细、失败明细与回滚预检。") +
    ADH.note("warn", "回滚边界", "回滚仅支持删除「本次任务创建、且无投放数据」的对象；已有消耗的对象只能暂停 / 归档，不可删除。") +
    ADH.note("rule", "BR-58 变更快照", "所有批量操作记录操作前值（变更快照），用于回滚与审计；本次已写入 " + snap.length + " 条快照记录。") +
    "</div></div></div>";
  return h;
}
ADH.action("ops-back", function () {
  const s = opsNav(); s.opsMode = null; s.crumbSub = null; s.opsTab = "impact"; s.opsImpactFilt = "";
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("ops-tab", function (p) { opsNav().opsTab = p.v || "impact"; ADH.render(); });
ADH.action("ops-xacct", function () {
  const s = opsNav(); s.opsXacct = !s.opsXacct;
  if (!s.opsXacct) { s.sel = s.sel || {}; s.sel.opsXacct = []; }
  ADH.render();
});
ADH.action("ops-xacct-all", function (p) {
  const s = opsNav(); s.sel = s.sel || {};
  const all = String(p.values || "").split(",").filter(Boolean);
  const cur = s.sel.opsXacct || [];
  s.sel.opsXacct = all.length && cur.length >= all.length ? [] : all.slice();
  ADH.render();
});
ADH.action("ops-param-mode", function (p) {
  const s = opsNav(); s.opsParamMode = p.v === "ABS" ? "ABS" : "PCT";
  s.opsParamVal = s.opsParamMode === "ABS" ? 5 : 20;
  ADH.render();
});
ADH.action("ops-param", function (p) { opsNav().opsParamVal = Number(p.v) || 0; ADH.render(); });
ADH.action("ops-param-val", function (p, el) {
  const v = el && el.value !== undefined ? el.value : p.v;
  const n = Number(v);
  opsNav().opsParamVal = isNaN(n) ? 0 : n;
  ADH.render();
});
ADH.action("ops-lock-ack", function () { const s = opsNav(); s.opsLockAck = !s.opsLockAck; ADH.render(); });
ADH.action("ops-snap", function () { const s = opsNav(); s.opsSnapCommit = !opsSnapOn(); ADH.render(); });
ADH.action("ops-result-back", function () {
  const s = opsNav(); s.opsMode = null; s.crumbSub = null; s.opsResId = null; s.opsResFilt = "";
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("ops-result-task", function () {
  const t = opsResultTask();
  if (!t) { ADH.toast("任务不存在", "warn", "请返回批量投放重新提交，或到任务中心查看历史任务。"); return; }
  ADH.routeTo("tasks");
  ADH.act("task-open", { dataset: { v: t.id } });
});
ADH.action("ops-result-export", function () {
  if (!ADH.assertPerm("dashboard.export")) return;
  const t = opsResultTask();
  ADH.toast("已创建导出任务", "ok", "批量操作结果清单（" + (t ? t.total : 0) + " 条对象 · 含渠道侧对象 ID、变更前后对比、变更快照与失败四项记录）导出中，完成后生成下载链接（有效期 7 天）。");
});

ADH.action("ops-refresh", function () { ADH.toast("已刷新渠道状态", "ok", "以渠道返回为准回写本地状态（最后写入者以渠道侧为准）"); });
ADH.action("ops-toggle", function (p) {
  const s = ADH.s(); s.opsCollapsed = s.opsCollapsed || {};
  if (s.opsCollapsed[p.v]) delete s.opsCollapsed[p.v]; else s.opsCollapsed[p.v] = true;
  ADH.render();
});
function opsLevelCounts(list) {
  const c = { CAMPAIGN: 0, ADSET: 0, AD: 0 };
  list.forEach(function (n) { if (c[n.level] !== undefined) c[n.level]++; });
  return c;
}
function opsLevelText(c) { return "Campaign " + c.CAMPAIGN + " · AdSet " + c.ADSET + " · Ad " + c.AD; }
function opsLevelsLabel(op) { return OPS_META[op].levels.map(function (l) { return OPS_LVL_CN[l]; }).join(" / "); }
function opsQuickEligible(op, list) {
  const meta = OPS_META[op] || OPS_META.PAUSE;
  return list.filter(function (n) { return meta.levels.indexOf(n.level) >= 0; });
}
function opsQuickDefaultAmount(op, list) {
  const key = op === "BUDGET" ? "budget" : "bid";
  const vals = list.map(function (n) { return Number(n[key]); }).filter(function (v) { return v > 0; });
  if (!vals.length) return op === "BUDGET" ? "100.00" : "4.20";
  return (vals.reduce(function (a, b) { return a + b; }, 0) / vals.length).toFixed(2);
}
function opsQuickOpen(op, nodes, eligible) {
  const meta = OPS_META[op];
  const counts = opsLevelCounts(eligible);
  const skipped = nodes.length - eligible.length;
  let body = ADH.kv([["已选对象", nodes.length + " 个"], ["可执行对象", eligible.length + " 个（" + opsLevelText(counts) + "）"],
    ["层级限制", skipped ? skipped + " 个对象不在支持层级，将跳过" : "全部对象均支持"]]);
  if (op === "BUDGET" || op === "BID") {
    const isBudget = op === "BUDGET";
    body += '<div class="field mt12"><label>新的' + (isBudget ? "日预算" : "出价") + '（USD）</label>' +
      '<input id="ops-quick-amount" class="input" type="number" min="0" step="0.01" value="' + opsQuickDefaultAmount(op, eligible) + '" />' +
      '<div class="xs muted mt4">将统一写入 ' + eligible.length + ' 个' + (isBudget ? " Campaign / AdSet" : " AdSet") + '；确认后立即生效。</div></div>' +
      ADH.note("info", "直接调整", "不再进入影响预览二级页；操作记录与变更快照仍写入审计日志。");
  } else if (op === "DELETE") {
    body += ADH.note("danger", "删除不可逆", "仅 Ad 层级支持删除；删除后不可恢复。本次将删除 " + eligible.length + " 个 Ad。");
  } else if (op === "COPY") {
    body += ADH.note("info", "复制说明", "复制对象将按命名规则生成副本，默认暂停，避免重复消耗预算；复制结果可在任务中心查看。");
  } else {
    body += ADH.note(op === "ENABLE" ? "warn" : "info", op === "ENABLE" ? "启用后立即生效" : "暂停后停止消耗",
      op === "ENABLE" ? "启用后对象立即进入投放状态并开始消耗预算，无需二次校验。" : "暂停后停止消耗；可随时重新启用，无需二次校验。");
  }
  ADH.modal({
    title: meta.label,
    desc: "当前页面直接执行 · 确认后立即生效",
    body: body,
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn ' + (op === "DELETE" ? "danger" : "primary") + '" data-act="ops-quick-confirm" data-v="' + op + '">' + (op === "DELETE" ? "确认删除" : op === "COPY" ? "确认复制" : "确认执行") + '</button>'
  });
}
ADH.action("ops-run", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const s = ADH.s(), op = OPS_META[p.v] ? p.v : "PAUSE";
  if (!ADH.sel("ops").length && !s.opsXacct) {
    ADH.toast("请先选择对象", "warn", "批量操作需至少选择 1 个对象（FR-MID-21）；也可开启跨账户批量后再选择附加账户。");
    return;
  }
  const nodes = opsNodes();
  const eligible = opsQuickEligible(op, nodes);
  if (!eligible.length) {
    ADH.toast("没有可执行对象", "warn", OPS_META[op].label + " 仅支持 " + opsLevelsLabel(op) + " 层级，请重新选择对象。");
    return;
  }
  s.opsOp = op;
  opsQuickOpen(op, nodes, eligible);
});
ADH.action("ops-quick-confirm", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const op = OPS_META[p.v] ? p.v : "PAUSE";
  const nodes = opsNodes(), meta = OPS_META[op];
  const eligible = opsQuickEligible(op, nodes);
  let applied = 0;
  if (op === "ENABLE" || op === "PAUSE") {
    const after = op === "ENABLE" ? "ACTIVE" : "PAUSED";
    nodes.forEach(function (n) { n.status = after; applied++; });
  } else if (op === "BUDGET" || op === "BID") {
    const el = document.getElementById("ops-quick-amount");
    const val = el ? Number(el.value) : NaN;
    if (!isFinite(val) || val <= 0) { ADH.toast("请输入有效金额", "warn", "金额必须为大于 0 的数字。"); return; }
    eligible.forEach(function (n) {
      if (op === "BUDGET") n.budget = Math.round(val * 100) / 100;
      else { n.bid = Math.round(val * 100) / 100; n.bidStrategy = "LOWEST_COST_WITH_BID_CAP"; }
      applied++;
    });
  } else if (op === "DELETE") {
    const ids = eligible.map(function (n) { return n.id; });
    D.tree.forEach(function (t) { t.campaigns.forEach(function (c) { c.adsets.forEach(function (s) {
      const before = s.ads.length;
      s.ads = s.ads.filter(function (d) { return ids.indexOf(d.id) < 0; });
      applied += before - s.ads.length;
    }); }); });
  } else if (op === "COPY") {
    applied = nodes.length;
  }
  ADH.act("overlay-close", { dataset: {} });
  const picked = ADH.sel("ops"); picked.splice(0, picked.length);
  const xacct = ADH.sel("opsXacct"); xacct.splice(0, xacct.length);
  ADH.s().opsXacct = false;
  const msg = op === "COPY" ? "复制任务已提交" : meta.label + "已执行";
  ADH.toast(msg, "ok", op === "COPY" ? "已提交 " + applied + " 个对象的复制任务，可在任务中心查看结果。" : "已处理 " + applied + " 个对象；操作记录已写入审计日志。");
  ADH.render();
});
ADH.action("ops-rollback-demo", function () {
  ADH.toast("回滚边界", "warn", "仅支持删除「本次任务创建、且无投放数据」的对象；已有消耗的对象只能暂停 / 归档，不可删除");
});
ADH.action("ops-confirm", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const st = opsStat();
  if (st.blocked) {
    const why = st.denied.length ? "存在无权限账户，整体拒绝" : (st.exec.length === 0 ? "没有可执行对象" : "请先确认并发锁等待策略");
    ADH.toast("提交被阻断", "warn", why + "，本次操作未下发。");
    return;
  }
  const t = opsBuildResult();
  const s = opsNav();
  s.opsMode = "result"; s.crumbSub = "提交结果 · " + t.id;
  ADH.toast("批量操作已提交 · 任务 " + t.id, t.fail ? "warn" : "ok",
    OPS_META[opsOp()].label + "：共 " + t.total + " 个对象，成功 " + t.success + " 个、失败 " + t.fail + " 个；" +
    (t.opsAsync ? "已走异步任务（BR-55）" : "") + (t.opsSnap ? "，已记录 " + t.snapshots.length + " 条变更快照（BR-58）。" : "。"));
  ADH.render(); window.scrollTo(0, 0);
});
})();
/* ---------------- 任务中心 ---------------- */
(function () {
const D = ADH_DATA;
function taskFilter() {
  const t = D.tasks.filter(function (x) {
    if (ADH.f("type") && x.type !== ADH.f("type")) return false;
    if (ADH.f("status") && x.status !== ADH.f("status")) return false;
    if (ADH.f("creator") && x.createdBy !== ADH.f("creator")) return false;
    const q = (ADH.f("q", "") + "").toLowerCase();
    if (q && (x.title + x.id).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  return t;
}
ADH.page("tasks", {
  title: "任务中心", subtitle: "进度 · 失败明细与错误分类 · 重试 · 回滚 · 结果导出",
  refs: ["FR-MID-28 任务列表与筛选", "FR-MID-29 实时进度", "FR-MID-30 失败明细与原因分类", "FR-MID-31 失败重试", "FR-MID-32 任务回滚", "FR-MID-33 任务通知", "FR-MID-34 结果导出", "6.6.2 任务状态定义", "BR-63~BR-66", "BR-09 令牌失效任务挂起"],
  render: function () {
    if (taskNav().taskMode === "screen") return taskScreen();
    const list = taskFilter();
    const byStatus = function (s) { return D.tasks.filter(function (t) { return t.status === s; }).length; };
    let h = '<div class="grid g6 mb12">' +
      ADH.stat({ label: "总任务", value: D.tasks.length, unit: "个", foot: '<span class="muted">保留 12 个月（BR-66）</span>' }) +
      ADH.stat({ label: "执行中 / 入队", value: byStatus("RUNNING") + byStatus("QUEUED"), unit: "个", foot: '<span class="muted">进度持久化，可断点续跑</span>' }) +
      ADH.stat({ label: "部分失败", value: byStatus("PARTIAL_FAILED"), unit: "个", foot: '<span class="muted">可单条重试</span>' }) +
      ADH.stat({ label: "全部成功", value: byStatus("SUCCEEDED"), unit: "个", foot: '<span class="muted">成功率 96.8%</span>' }) +
      ADH.stat({ label: "因授权挂起", value: byStatus("PAUSED"), unit: "个", foot: '<span style="color:var(--warn)">授权问题不计为失败</span>' }) +
      ADH.stat({ label: "回滚受阻", value: byStatus("ROLLBACK_FAILED"), unit: "个", foot: '<span class="muted">已有消耗不可删除</span>' }) + "</div>";

    h += '<div class="card">';

      h += '<div class="card-body" style="padding:11px 14px"><div class="toolbar">' +
        '<div class="search grow" style="max-width:220px">' + ADH.icon("search", 13) + '<input id="tk-q" class="input" placeholder="搜索任务标题 / 编号" value="' + ADH.esc(ADH.f("q", "")) + '" data-live="1" data-act="filter" data-k="q" data-tbl="tbl-tasks" /></div>' +
        '<select class="select" style="width:150px" data-act="filter" data-k="type" data-tbl="tbl-tasks"><option value="">全部类型</option>' +
        [["BATCH_CREATE", "批量创建"], ["BATCH_UPDATE", "批量修改"], ["BATCH_UPLOAD", "批量上传"], ["ROLLBACK", "回滚"], ["SYNC", "同步"]].map(function (x) {
          return '<option value="' + x[0] + '"' + (ADH.f("type") === x[0] ? " selected" : "") + ">" + x[1] + "</option>";
        }).join("") + "</select>" +
        '<select class="select" style="width:140px" data-act="filter" data-k="status" data-tbl="tbl-tasks"><option value="">全部状态</option>' +
        ["RUNNING", "QUEUED", "PAUSED", "PARTIAL_FAILED", "SUCCEEDED", "FAILED", "ROLLBACK_FAILED"].map(function (x) {
          return '<option value="' + x + '"' + (ADH.f("status") === x ? " selected" : "") + ">" + x + "</option>";
        }).join("") + "</select>" +
        '<select class="select" style="width:130px" data-act="filter" data-k="creator" data-tbl="tbl-tasks"><option value="">全部发起人</option>' +
        ["林可", "苏晴", "周振业", "调度器", "系统（规则 R-01 低效计划止损）"].map(function (x) {
          return '<option value="' + x + '"' + (ADH.f("creator") === x ? " selected" : "") + ">" + x + "</option>";
        }).join("") + "</select>" +
        '<div style="flex:1"></div><button class="btn sm" data-act="task-export">' + ADH.icon("download", 13) + "导出结果清单</button></div></div>";
      h += ADH.tbl("tbl-tasks", [{ label: "任务" }, { label: "类型" }, { label: "状态" }, { label: "进度" }, { label: "成功 / 失败", cls: "num" }, { label: "分片" }, { label: "发起人" }, { label: "开始时间" }, { label: "耗时" }, { label: "" }],
        list.map(function (t) {
          const tone = t.status === "SUCCEEDED" ? "ok" : (t.status === "PARTIAL_FAILED" ? "warn" : (t.status === "FAILED" || t.status === "ROLLBACK_FAILED" ? "danger" : (t.status === "PAUSED" ? "warn" : "")));
          return {
            cls: "clickable", attrs: ' data-act="task-open" data-v="' + t.id + '"',
            c: ['<b>' + t.title + '</b><div class="xs muted mono">' + t.id + " · " + t.channel + "</div>",
              '<span class="chip neutral">' + t.type + "</span>", ADH.statusChip(t.status),
              '<div style="min-width:110px">' + ADH.bar(t.progress, tone, 1) + "</div>",
              '<span style="color:var(--ok)">' + t.success + "</span> / " + (t.fail ? '<span style="color:var(--danger)">' + t.fail + "</span>" : "0"),
              t.shardDone + " / " + t.shardTotal, '<span class="xs">' + t.createdBy + "</span>",
              '<span class="mono xs">' + t.startedAt + "</span>", '<span class="xs">' + t.duration + "</span>", (t.fail ? '<button class="btn xs" data-act="task-open" data-v="' + t.id + '" data-tab="failed">失败明细 ' + t.fail + "</button>" : "") + (t.status === "PAUSED" ? '<button class="btn xs" data-act="task-resume" data-v="' + t.id + '">一键重跑</button>' : "") + ADH.icon("chevron", 14, "muted")],
            v: [t.title, t.type, t.status, t.progress, t.success, t.shardDone, t.createdBy, t.startedAt, t.duration, ""]
          };
        }), { sortable: true, pageSize: 8 });
    h += "</div>";
    return h;
  }
});
/* ---------------- 任务详情与失败处置（二级屏 FR-MID-28 ~ 34 / 6.6.2 / 6.6.3 / BR-51 ~ BR-66） ---------------- */
const RETRY_CAP = { RATE_LIMIT: 5, NETWORK: 5, INTERNAL: 3 };
const AUTO_RETRY_CATS = { RATE_LIMIT: 1, NETWORK: 1, INTERNAL: 1 };
const TASK_STATUS_CN = { DRAFT: "草稿", VALIDATING: "校验中", QUEUED: "已入队", RUNNING: "执行中", PAUSED: "已挂起", PARTIAL_FAILED: "部分失败（可重试）", SUCCEEDED: "全部成功", FAILED: "失败", ROLLING_BACK: "回滚中", ROLLED_BACK: "已回滚", ROLLBACK_FAILED: "回滚受阻" };
const TASK_TABS = [["progress", "进度与分片"], ["failed", "失败明细"], ["errors", "错误分类汇总"], ["rollback", "回滚预检"]];
function taskOf(id) { return D.tasks.filter(function (x) { return x.id === id; })[0]; }
/* 任务处置状态（重试 / 回查 / 人工处理 / 回滚 / 挂起重跑）统一存放在任务中心的页面状态容器中，
   并按 key 访问而非按当前路由访问 —— 这样「批量计划 · 提交结果」二级屏与任务中心共享同一份处置结果，
   同一任务在两处看到的失败项状态始终一致。 */
function taskStore() {
  const s = ADH.uiState["tasks"] = ADH.uiState["tasks"] || {};
  s.taskRetryLog = s.taskRetryLog || {}; s.taskRetryNote = s.taskRetryNote || {};
  s.taskRecheck = s.taskRecheck || {}; s.taskRecheckN = s.taskRecheckN || {};
  s.taskMarked = s.taskMarked || {}; s.taskManual = s.taskManual || {}; s.taskRb = s.taskRb || {};
  return s;
}
function taskNav() { return taskStore(); }
function taskKey(t, it) { return t.id + "#" + it.index; }
function taskHash(str) {
  let h = 2166136261; const s = String(str);
  for (let i = 0; i < s.length; i++) { h = (h ^ s.charCodeAt(i)) >>> 0; h = (h * 16777619) >>> 0; }
  return h;
}
function taskFailedItems(t) { return (t.items || []).filter(function (i) { return i.status === "FAILED"; }); }
function taskDict(cat) { return D.errorDict.filter(function (e) { return e.cat === cat; })[0] || { cat: cat, label: "", retry: 0, sample: "", advice: "" }; }
function taskRetryN(t, it) {
  const log = taskNav().taskRetryLog[t.id] || {};
  return log[it.index] === undefined ? Number(it.retry || 0) : Number(log[it.index]);
}
function taskBackoffMin(n) { return Math.min(15, Math.pow(2, Math.max(0, Number(n) - 1))); }
/* tree.pull 回查的确定性结果：首次与再次结果不同，模拟渠道侧最终一致 */
function taskRecheckSeq(k) { const h = taskHash(k); return [["FOUND", "MISSING", "UNKNOWN"][h % 3], ["MISSING", "FOUND"][h % 2]]; }
function taskItemView(t, it) {
  const s = taskNav(), k = taskKey(t, it), cat = it.errorCategory || "";
  const auto = !!AUTO_RETRY_CATS[cat];
  const cap = RETRY_CAP[cat] || 5;
  const n = taskRetryN(t, it);
  const rc = s.taskRecheck[k] || "";
  const marked = !!s.taskMarked[k];
  const manual = !!s.taskManual[k];
  const needsRecheck = cat === "NETWORK" || it.errorCode === "LOCAL_TIMEOUT";
  const capped = auto && n >= cap;
  const waiting = needsRecheck && !marked && !manual && (rc === "" || rc === "UNKNOWN");
  return { k: k, cat: cat, auto: auto, cap: cap, n: n, rc: rc, marked: marked, manual: manual,
    needsRecheck: needsRecheck, capped: capped, waiting: waiting,
    fixable: it.errorCode === "LOCAL_NAME_DUP",
    retryable: auto && !capped && (!needsRecheck || rc === "MISSING") };
}
function taskStats(t) {
  const s = taskNav(), failed = taskFailedItems(t);
  let marked = 0, manual = 0;
  failed.forEach(function (i) { const k = taskKey(t, i); if (s.taskMarked[k]) marked++; else if (s.taskManual[k]) manual++; });
  const pending = Math.max(0, failed.length - marked - manual);
  const success = Number(t.success || 0) + marked;
  const total = Number(t.total || 0) || (success + pending + manual);
  return { failed: failed.length, marked: marked, manual: manual, pending: pending, success: success, fail: pending, total: total };
}
function taskDerivedStatus(t) {
  const s = taskNav(), st = taskStats(t);
  if (s.taskRbDone) return s.taskRbFail ? "ROLLBACK_FAILED" : "ROLLED_BACK";
  if (s.taskResumeDone && t.status === "PAUSED") return "SUCCEEDED";
  if (st.pending === 0 && st.marked > 0 && st.manual === 0 && (t.status === "PARTIAL_FAILED" || t.status === "FAILED")) return "SUCCEEDED";
  return t.status;
}
function taskProgressOf(t, status) {
  if (status === "SUCCEEDED" || status === "ROLLED_BACK" || status === "ROLLBACK_FAILED") return 100;
  return Number(t.progress || 0);
}
function taskShards(t) {
  const n = Math.max(1, Math.min(8, Number(t.shardTotal || 1)));
  const per = Math.ceil(Number(t.total || 0) / n);
  const out = [];
  for (let i = 0; i < n; i++) {
    const done = i < Number(t.shardDone || 0);
    out.push({ name: "SHARD-" + (i + 1), range: i === 0 ? "优先按账户切分" : (i % 2 ? "按受众切分" : "按素材切分"),
      tone: done ? "ok" : (t.status === "PAUSED" ? "warn" : "info"),
      label: done ? "完成" : (t.status === "PAUSED" ? "已挂起" : "排队中"),
      objects: per, duration: done ? (7 + i * 3) + " 秒" : "—" });
  }
  return out;
}
function taskTimeline(t) {
  const s = taskNav(), out = [];
  const failed = taskFailedItems(t);
  out.push({ tone: "brand", t: t.startedAt, title: "任务入队并开始执行", d: "类型 " + t.type + " · 幂等键 " + t.idemKey + " · 分片 " + t.shardTotal + " 个 · 对象 " + (t.total || 0) + " 个" });
  if (t.pauseReason) out.push({ tone: "warn", t: t.startedAt, title: "任务因授权失效挂起", d: t.pauseReason });
  const dn = Math.min(Number(t.shardTotal || 0), Number(t.shardDone || 0));
  for (let i = 0; i < Math.min(dn, 4); i++) {
    out.push({ tone: "ok", t: t.startedAt, title: "分片 SHARD-" + (i + 1) + " 执行完成", d: "对象 " + Math.ceil(Number(t.total || 0) / Math.max(1, Number(t.shardTotal || 1))) + " 个 · 已回写渠道侧对象 ID" });
  }
  if (Number(t.shardDone || 0) < Number(t.shardTotal || 0)) out.push({ tone: "", t: t.startedAt, title: "分片 SHARD-" + Number(t.shardTotal) + " 排队中", d: "BR-65 进度已持久化，服务重启后从断点续跑" });
  if (failed.length) out.push({ tone: "danger", t: t.startedAt, title: "记录 " + failed.length + " 条失败明细", d: "BR-63 四项必录：渠道原始错误码 + 渠道原始错误信息 + 内部错误分类 + 处理建议" });
  (s.taskRetryNote[t.id] || []).slice().forEach(function (x) {
    out.push({ tone: "ok", t: x.at, title: "失败项 #" + x.index + " 第 " + x.n + " 次重试成功", d: (x.fix ? "BR-41 自动追加序号后重新提交 · " : "") + "指数退避 " + x.backoff + " 分钟（BR-64）· 仅重试失败项，未重跑成功项（BR-51）" });
  });
  failed.forEach(function (it) {
    const m = s.taskMarked[taskKey(t, it)];
    if (m && m.by === "recheck") out.push({ tone: "ok", t: "2026-09-20 10:12", title: "失败项 #" + it.index + " 标记成功", d: "BR-52 tree.pull 回查命中渠道侧已存在，跳过重建以避免重复建计划" });
  });
  if (s.taskResumeDone && t.status === "PAUSED") out.push({ tone: "ok", t: "2026-09-20 10:20", title: "授权恢复后一键重跑完成", d: "BR-09：幂等键命中已创建对象直接跳过，未创建对象继续创建，不产生重复对象" });
  if (s.taskRbDone) out.push({ tone: s.taskRbFail ? "danger" : "ok", t: "2026-09-20 10:25", title: s.taskRbFail ? "回滚受阻（ROLLBACK_FAILED）" : "回滚完成（ROLLED_BACK）", d: s.taskRbFail ? "BR-53 / BR-73：已有消耗或外部创建的对象不可删除，请改为暂停 / 归档" : "AC-11：无投放数据的新建对象已删除，已有消耗对象仅暂停 / 归档" });
  return out;
}
function taskAccountIds(t) {
  const ids = [];
  (t.items || []).forEach(function (i) { const m = String(i.target || "").match(/act_\d+/); if (m && ids.indexOf(m[0]) < 0) ids.push(m[0]); });
  if (!ids.length) D.accounts.slice(0, 2).forEach(function (a) { if (ids.indexOf(a.actId) < 0) ids.push(a.actId); });
  return ids.slice(0, 2);
}
function taskRbRows(t) {
  const out = [];
  if (t.type === "ROLLBACK") {
    (t.items || []).forEach(function (i) {
      const parts = String(i.target || "").split(" / ");
      out.push({ key: t.id + "#rb" + out.length, obj: parts[1] ? parts[0] + " · " + parts[1] : (parts[0] || "对象"), oid: "—",
        act: (String(i.target || "").match(/act_\d+/) || ["—"])[0],
        created: true, spend: i.errorCode === "LOCAL_HAS_SPEND" ? 42.18 : 0, external: false });
    });
    return out;
  }
  const rnd = adhRng(taskHash(t.id));
  taskAccountIds(t).forEach(function (actId, ai) {
    const base = 1202000000 + ai * 100000;
    out.push({ key: t.id + "#rb" + out.length, obj: "Campaign", oid: String(base + 11), act: actId, created: true, spend: 0, external: false });
    out.push({ key: t.id + "#rb" + out.length, obj: "AdSet", oid: String(base + 44), act: actId, created: true, spend: ai === 0 ? Math.round(rnd() * 90 * 100) / 100 : 0, external: false });
    out.push({ key: t.id + "#rb" + out.length, obj: "Ad", oid: String(base + 118), act: actId, created: ai !== 1, spend: 0, external: ai === 1 });
  });
  return out;
}
/* 仅当任务本身可回滚、或该任务就是一次回滚作业时才产出预检行（BR-53） */
function taskRbRowsSafe(t) { return (t.rollbackable || t.type === "ROLLBACK") ? taskRbRows(t) : []; }
function taskRbVerdict(r) {
  if (r.external) return { tone: "danger", label: "不可删除", hint: "外部创建对象仅允许暂停 / 降预算，不允许删除", deleteOk: false };
  if (r.spend > 0) return { tone: "danger", label: "仅暂停 / 归档", hint: "已有消耗 " + r.spend.toFixed(2) + " USD，不可删除", deleteOk: false };
  return { tone: "ok", label: "可删除", hint: "本次任务创建 · 无投放数据", deleteOk: true };
}
function taskRbAction(r) {
  const a = taskNav().taskRb[r.key];
  return a || (taskRbVerdict(r).deleteOk ? "delete" : "pause");
}
function taskOpsCell(t, it) {
  const v = taskItemView(t, it);
  const can = ADH.can("ops.execute");
  const lock = ADH.esc(ADH.LOCK_REASON["ops.execute"]);
  const btn = function (act, label, cls) {
    if (!can) return '<button class="btn xs disabled" title="' + lock + '">' + label + "</button>";
    return '<button class="btn xs' + (cls ? " " + cls : "") + '" data-act="' + act + '" data-v="' + ADH.esc(v.k) + '">' + label + "</button>";
  };
  if (v.marked) return ADH.chip("ok", "已解决");
  if (v.manual) return ADH.chip("neutral", "已人工处理");
  if (v.needsRecheck && v.rc === "") return btn("task-recheck", ADH.icon("search", 12) + "回查渠道侧", " primary");
  if (v.needsRecheck && v.rc === "UNKNOWN") return ADH.chip("warn", "回查未知") + " " + btn("task-recheck", "再次回查");
  if (v.needsRecheck && v.rc === "FOUND") return btn("task-mark-success", ADH.icon("check", 12) + "标记成功", " primary");
  if (v.fixable) return btn("task-fix-retry", "按 BR-41 修复并重试");
  if (v.retryable) return btn("task-retry", ADH.icon("refresh", 12) + "重试");
  if (v.capped) return btn("task-retry-force", "人工确认重试", " warning");
  return btn("task-manual", "标记已处理");
}
function taskRetryRun(t, keys, force) {
  const list = (keys || []).filter(Boolean);
  if (!list.length) {
    ADH.toast("请先选择失败项", "info", "在「失败明细」中勾选失败项后点击「重试选中项」；BR-51 仅重试失败项，不重跑成功项。");
    return;
  }
  const s = taskNav(), done = [], needConfirm = [], wait = [], manual = [];
  list.forEach(function (k) {
    const it = taskFailedItems(t).filter(function (x) { return taskKey(t, x) === k; })[0];
    if (!it) return;
    const v = taskItemView(t, it);
    if (v.marked || v.manual) return;
    if (v.capped && !force) { needConfirm.push(it); return; }
    if (v.needsRecheck && v.rc !== "MISSING") { wait.push(it); return; }
    if (!v.auto) { manual.push(it); return; }
    const n = v.n + 1;
    s.taskRetryLog[t.id] = s.taskRetryLog[t.id] || {};
    s.taskRetryLog[t.id][it.index] = n;
    s.taskRecheck[k] = "";
    s.taskMarked[k] = { by: "retry", n: n };
    s.taskRetryNote[t.id] = s.taskRetryNote[t.id] || [];
    s.taskRetryNote[t.id].push({ index: it.index, n: n, backoff: taskBackoffMin(n), at: "2026-09-20 10:0" + Math.min(9, 2 + s.taskRetryNote[t.id].length) });
    done.push({ it: it, n: n, backoff: taskBackoffMin(n) });
  });
  if (s.sel && s.sel.taskRetry) s.sel.taskRetry = [];
  if (done.length) ADH.toast("已重试并成功创建 " + done.length + " 个对象", "ok",
    "BR-51 仅重试失败项；BR-64 指数退避：" + done.map(function (d) { return "#" + d.it.index + " 第 " + d.n + " 次（" + d.backoff + " 分钟）"; }).join("、"));
  if (needConfirm.length) ADH.toast(needConfirm.length + " 项已达最大重试次数", "warn",
    "BR-64 上限：" + needConfirm.map(function (i) { return "#" + i.index + "（" + (RETRY_CAP[i.errorCategory] || 5) + " 次）"; }).join("、") + "；如需继续请对该项选择「人工确认重试」。");
  if (wait.length) ADH.toast(wait.length + " 项需先回查渠道侧", "warn",
    "BR-52：请先 tree.pull 回查（" + wait.map(function (i) { return "#" + i.index; }).join("、") + "），确认未创建后再重试，避免重复建计划。");
  if (manual.length) ADH.toast(manual.length + " 项不可自动重试", "warn",
    "BR-63：业务 / 政策 / 参数类错误需按处理建议人工处理（" + manual.map(function (i) { return "#" + i.index; }).join("、") + "）。");
  if (!done.length && !needConfirm.length && !wait.length && !manual.length) ADH.toast("所选失败项均已处理", "info", "没有需要重试的失败项。");
  ADH.render();
}
function taskScreen() {
  const s = taskNav();
  const t = taskOf(s.taskId);
  if (!t) {
    return '<div class="card"><div class="card-body">' + ADH.emptyState({ icon: "warn", title: "任务不存在或已被归档",
      desc: "任务历史保留 12 个月，超期任务归档为可下载文件后不再提供在线明细。",
      action: '<button class="btn sm" data-act="task-back">返回任务列表</button>' }) + "</div></div>";
  }
  const tab = s.taskTab || "progress";
  const st = taskStats(t), status = taskDerivedStatus(t);
  const canOps = ADH.can("ops.execute");
  const canExport = ADH.can("dashboard.export");
  const actBtn = function (act, label, kind, enabled, extra, title) {
    const cls = "btn" + (kind ? " " + kind : "") + " sm" + (enabled ? "" : " disabled");
    return '<button class="' + cls + '"' + (enabled ? ' data-act="' + act + '" ' + (extra || "") : ' disabled title="' + ADH.esc(title || ADH.LOCK_REASON["ops.execute"]) + '"') + ">" + label + "</button>";
  };
  let acts = "";
  if (status === "PAUSED") acts += actBtn("task-resume", ADH.icon("play", 13) + "恢复授权后一键重跑", "primary", canOps);
  if (st.fail > 0) acts += actBtn("task-retry-all", ADH.icon("refresh", 13) + "全部重试（" + st.fail + "）", "", canOps, 'data-v="' + t.id + '"');
  if ((status === "SUCCEEDED" || status === "PARTIAL_FAILED") && t.rollbackable) acts += actBtn("task-tab", ADH.icon("trash", 13) + "发起回滚", "", canOps, 'data-v="rollback"');
  acts += actBtn("task-export", ADH.icon("download", 13) + "导出结果清单", "", canExport, "", ADH.LOCK_REASON["dashboard.export"]);
  if (!canOps) acts += ADH.chip("warn", "当前角色无批量操作权限");

  let h = '<div class="flex between center wrap mb12">' +
    '<div><div class="flex center gap8">' +
      '<button class="btn sm" data-act="task-back">← 返回任务列表</button>' +
      '<h2 style="margin:0;font-size:15.5px">' + ADH.esc(t.title) + "</h2>" + ADH.statusChip(status) +
      (st.marked ? ADH.chip("ok", "已解决 " + st.marked + " 项") : "") +
      (st.manual ? ADH.chip("neutral", "人工处理 " + st.manual + " 项") : "") +
    "</div>" +
    '<div class="xs muted mt4"><span class="mono">' + t.id + "</span> · " + t.type + " · " + t.channel + " · 发起人 " + t.createdBy + " · 开始 " + t.startedAt + " · 耗时 " + t.duration + "</div></div>" +
    '<div class="flex gap8 wrap center">' + acts + "</div></div>";

  h += '<div class="card"><div class="tabs">' + TASK_TABS.map(function (x) {
    const n = x[0] === "failed" ? taskFailedItems(t).length - st.marked - st.manual : 0;
    return '<button class="' + (tab === x[0] ? "on" : "") + '" data-act="task-tab" data-v="' + x[0] + '">' + x[1] + (n > 0 ? "（" + n + "）" : "") + "</button>";
  }).join("") + "</div>";

  if (tab === "progress") {
    const shards = taskShards(t);
    h += '<div class="card-body">';
    if (t.pauseReason) h += ADH.note("warn", "任务挂起原因", t.pauseReason) + '<div class="mb12"></div>';
    h += '<div class="grid g4 mb12">' +
      ADH.stat({ label: "总进度", value: taskProgressOf(t, status) + "%", foot: '<span class="muted">' + (TASK_STATUS_CN[status] || status) + "</span>" }) +
      ADH.stat({ label: "对象计数", value: st.success + " / " + st.total, unit: "个", foot: '<span class="muted">成功 ' + st.success + " · 待处理失败 " + st.fail + "</span>" }) +
      ADH.stat({ label: "分片进度", value: t.shardDone + " / " + t.shardTotal, foot: '<span class="muted">按账户 / 受众 / 素材切分</span>' }) +
      ADH.stat({ label: "耗时", value: t.duration, foot: '<span class="muted mono">' + t.startedAt + " 开始</span>" }) + "</div>";
    h += '<div class="mb12">' + ADH.bar(taskProgressOf(t, status), status === "SUCCEEDED" ? "ok" : (status === "FAILED" || status === "ROLLBACK_FAILED" ? "danger" : "brand")) + "</div>";
    h += ADH.sec("任务参数") + ADH.kv([
      ["任务类型", '<span class="tag-code">' + t.type + "</span>"], ["幂等键", '<span class="tag-code">' + t.idemKey + "</span>"],
      ["模板", ADH.esc(t.template)], ["涉及账户", t.accounts + " 个"], ["渠道", t.channel],
      ["发起人", t.createdBy], ["开始时间", '<span class="mono">' + t.startedAt + "</span>"], ["耗时", t.duration]]);
    h += ADH.sec("分片执行明细") + ADH.tbl("tbl-task-shard", [{ label: "分片" }, { label: "范围" }, { label: "状态" }, { label: "对象数", cls: "num" }, { label: "耗时" }],
      shards.map(function (x) {
        return { c: ['<b class="mono">' + x.name + "</b>", '<span class="xs">' + x.range + "</span>", ADH.chip(x.tone, x.label), x.objects, x.duration],
          v: [x.name, x.range, x.label, x.objects, x.duration] };
      }), { tight: true, sortable: true });
    h += ADH.sec("执行时间轴") + '<div class="timeline">' + taskTimeline(t).map(function (x) {
      return '<div class="tl-item ' + x.tone + '"><div class="tl-t">' + x.title + ' <span class="xs muted mono">' + x.t + '</span></div><div class="tl-d">' + x.d + "</div></div>";
    }).join("") + "</div>";
    h += '<div class="mt12">' + ADH.note("info", "BR-65 进度持久化", "任务进度、分片检查点与已创建对象 ID 全部落库；服务重启后可从断点续跑，不重复创建已成功的对象。") + "</div>";
    h += '<div class="mt8">' + ADH.note("info", "BR-66 任务历史保留 12 个月", "超期任务归档为可下载文件（含失败明细与渠道原始错误），在线明细不再保留。") + "</div>";
    h += "</div>";
  } else if (tab === "failed") {
    const failed = taskFailedItems(t);
    h += '<div class="card-body">';
    if (!failed.length) {
      h += ADH.emptyState({ icon: "check", title: "该任务没有失败项", desc: "全部对象已成功提交至渠道侧；可在「进度与分片」核对分片结果，或在「回滚预检」发起回滚。" });
    } else {
      const views = failed.map(function (it) { return { it: it, v: taskItemView(t, it) }; });
      const catF = ADH.f("taskFiltCat", "");
      const shown = catF ? views.filter(function (x) { return x.v.cat === catF; }) : views;
      const nRetry = views.filter(function (x) { return x.v.retryable && !x.v.marked && !x.v.manual; }).length;
      const nWait = views.filter(function (x) { return x.v.waiting; }).length;
      const nCap = views.filter(function (x) { return x.v.capped && !x.v.marked && !x.v.manual; }).length;
      const nFound = views.filter(function (x) { return x.v.needsRecheck && x.v.rc === "FOUND" && !x.v.marked && !x.v.manual; }).length;
      const nMan = views.filter(function (x) { return !x.v.auto && !x.v.marked && !x.v.manual; }).length;
      h += '<div class="flex gap8 wrap center mb12">' + ADH.chip("danger", "失败 " + failed.length + " 项") +
        ADH.chip("ok", "可自动重试 " + nRetry) + (nWait ? ADH.chip("warn", "待回查 " + nWait) : "") +
        (nCap ? ADH.chip("warn", "达上限 " + nCap) : "") + (nFound ? ADH.chip("info", "回查命中待确认 " + nFound) : "") + (nMan ? ADH.chip("neutral", "需人工 " + nMan) : "") +
        (st.marked ? ADH.chip("ok", "已解决 " + st.marked) : "") +
        '<span class="xs muted">BR-51 仅重试失败项，不重跑成功项</span></div>';
      h += '<div class="toolbar wrap mb8">' +
        '<select id="task-fail-cat" class="select" style="width:200px" data-live="1" data-act="filter" data-k="taskFiltCat" data-tbl="tbl-task-fail"><option value="">全部错误分类</option>' +
        D.errorDict.map(function (e) { return '<option value="' + e.cat + '"' + (catF === e.cat ? " selected" : "") + ">" + e.cat + " " + e.label + "</option>"; }).join("") + "</select>" +
        '<button class="btn xs" data-act="sel-all" data-key="taskRetry" data-values="' + ADH.esc(shown.map(function (x) { return x.v.k; }).join(",")) + '">全选 / 反选筛选结果</button>' +
        '<button class="btn xs" data-act="sel-clear" data-k="taskRetry">清空选择</button>' +
        '<span class="xs muted">已选 ' + ADH.sel("taskRetry").length + " 项</span>" +
        '<div style="flex:1"></div>' +
        '<button class="btn sm primary" data-act="task-retry-sel">' + ADH.icon("refresh", 13) + "重试选中项</button>" +
        '<button class="btn sm" data-act="task-export">' + ADH.icon("download", 13) + "导出失败明细</button></div>";
      h += ADH.tbl("tbl-task-fail", [{ label: "" }, { label: "序号", cls: "num" }, { label: "目标对象" }, { label: "组合 / 参数" },
        { label: "内部错误分类" }, { label: "渠道错误码" }, { label: "渠道原始错误信息" }, { label: "已重试", cls: "num" },
        { label: "处理建议" }, { label: "操作" }],
        shown.map(function (x) {
          const it = x.it, v = x.v, d = taskDict(v.cat);
          return {
            c: [ADH.checkbox("taskRetry", v.k), String(it.index),
              '<b>' + it.target + "</b>" + (it.externalId && it.externalId !== "—" ? '<div class="xs muted mono">' + it.externalId + "</div>" : ""),
              '<span class="xs">' + it.combination + "</span>",
              '<span class="tag-code">' + v.cat + '</span><div class="xs muted">' + d.label + "</div>",
              '<span class="mono xs">' + it.errorCode + "</span>",
              '<span class="xs">' + ADH.esc(it.errorMessage) + "</span>",
              v.n + " / " + v.cap,
              '<span class="xs">' + (it.advice || d.advice || "") + "</span>",
              taskOpsCell(t, it)],
            v: [v.k, it.index, it.target, it.combination, v.cat, it.errorCode, it.errorMessage, v.n, it.advice || "", ""]
          };
        }), { tight: true, pageSize: 6, empty: "当前筛选下没有失败项", emptyDesc: "切换错误分类筛选以查看其他失败项。" });
      h += '<div class="mt12">' + ADH.note("info", "BR-63 失败项必录四项", "渠道原始错误码 + 渠道原始错误信息 + 内部错误分类 + 处理建议；重试 / 回查 / 人工处理的完整轨迹写入任务事件流与审计日志。") + "</div>";
      h += '<div class="mt8">' + ADH.note("info", "BR-52 网络超时「结果未知」", "必须先通过 <b>tree.pull</b> 回查渠道侧是否已创建：命中 → 标记成功（跳过重建，避免重复建计划）；未命中 → 允许重试；结果未知 → 等待，不得直接重试。") + "</div>";
      h += '<div class="mt8">' + ADH.note("info", "BR-64 重试策略", "RATE_LIMIT / NETWORK / INTERNAL 支持自动重试，指数退避 2^(n-1) 分钟、最大退避 15 分钟、最大 5 次（INTERNAL 上限 3 次）；达上限后需人工确认方可继续。") + "</div>";
    }
    h += "</div>";
  } else if (tab === "errors") {
    const cats = Object.keys(t.errorSummary || {}).filter(function (c) { return Number(t.errorSummary[c]) > 0; });
    h += '<div class="card-body">';
    if (!cats.length) h += ADH.emptyState({ icon: "check", title: "无错误", desc: "该任务没有记录到错误分类汇总。" });
    else {
      h += ADH.tbl("tbl-task-err", [{ label: "错误分类" }, { label: "数量", cls: "num" }, { label: "典型原因" }, { label: "是否可自动重试" }, { label: "处理建议" }, { label: "" }],
        cats.map(function (c) {
          const d = taskDict(c);
          return { c: ['<span class="tag-code">' + c + "</span> " + d.label, t.errorSummary[c], '<span class="xs">' + (d.sample || "") + "</span>",
            d.retry ? ADH.chip("ok", "是（自动重试）") : ADH.chip("danger", "否（需人工处理）"), '<span class="xs">' + (d.advice || "") + "</span>",
            d.retry
              ? '<button class="btn xs" data-act="task-retry-cat" data-v="' + c + '">' + ADH.icon("refresh", 12) + "重试该分类全部项</button>"
              : '<button class="btn xs" data-act="filter" data-k="taskFiltCat" data-v="' + c + '" data-tbl="tbl-task-fail">查看失败项</button>'],
            v: [c, Number(t.errorSummary[c]), d.sample || "", d.retry ? "是" : "否", d.advice || "", ""] };
        }), { tight: true, sortable: true });
      h += '<div class="mt12">' + ADH.note("info", "6.6.3 错误分类字典", "AUTH / RATE_LIMIT / NETWORK / VALIDATION / POLICY / BUSINESS / INTERNAL 共七类；仅 RATE_LIMIT、NETWORK、INTERNAL 支持自动重试。") + "</div>";
      h += '<div class="mt8">' + ADH.note("warn", "按分类批量重试的前置条件", "NETWORK 类需先完成 tree.pull 回查（BR-52）；达最大重试次数的项需人工确认（BR-64）；业务 / 政策 / 参数类错误必须按处理建议修正配置后重新提交。") + "</div>";
    }
    h += "</div>";
  } else {
    h += '<div class="card-body">';
    const rbRows = taskRbRowsSafe(t);
    if (!rbRows.length) {
      h += ADH.emptyState({ icon: "none", title: "本任务无可回滚对象", desc: "该任务未创建对象，或已完成回滚，因此没有回滚预检项。" });
    } else {
      h += ADH.note("warn", "BR-53 回滚边界", "回滚仅支持删除「<b>本次任务创建 · 且无投放数据</b>」的对象；<b>已有消耗的对象只能暂停 / 归档，不可删除</b>；BR-73 外部创建对象仅允许暂停 / 降预算。提交时系统逐行预检并拒绝越界操作。") + "</div>";
      h += '<div class="card-body">' + ADH.note("info", "AC-11 验收口径", "无投放数据的新建对象可被回滚删除；已有消耗的对象回滚时仅暂停 / 归档，系统明确提示不可删除及原因。") + "</div>";
      h += '<div class="card-body">' + ADH.sec("回滚预检（" + rbRows.length + " 个对象 · 示意展示前 2 个账户）") +
        ADH.tbl("tbl-task-rb", [{ label: "对象" }, { label: "对象 ID" }, { label: "所属账户" }, { label: "是否本次创建" }, { label: "是否已有消耗" }, { label: "可回滚" }, { label: "处置方式" }],
          rbRows.map(function (r) {
            const v = taskRbVerdict(r), act = taskRbAction(r);
            const seg = [["delete", "删除"], ["pause", "暂停"], ["archive", "归档"]].map(function (a) {
              const on = act === a[0], blocked = a[0] === "delete" && !v.deleteOk;
              return '<button class="' + (on ? "on" : "") + '" data-act="task-rb-set" data-v="' + ADH.esc(r.key) + '" data-a="' + a[0] + '"' + (blocked ? ' title="' + ADH.esc(v.hint) + '"' : "") + ">" + a[1] + "</button>";
            }).join("");
            return { c: ["<b>" + r.obj + "</b>", '<span class="mono xs">' + r.oid + "</span>", '<span class="mono xs">' + r.act + "</span>",
              r.created ? ADH.chip("ok", "是") : ADH.chip("neutral", "否"),
              r.spend > 0 ? ADH.chip("ok", "是 · " + r.spend.toFixed(2) + " USD") : ADH.chip("info", "否"),
              ADH.chip(v.tone, v.label) + '<div class="xs muted">' + v.hint + "</div>",
              '<div class="seg" style="display:inline-flex">' + seg + "</div>"] };
          }), { tight: true });
      if (s.taskRbDone && s.taskRbResult) {
        const failN = s.taskRbResult.filter(function (x) { return x.tone === "danger"; }).length;
        h += '<div class="mt12">' + ADH.note(s.taskRbFail ? "danger" : "ok", s.taskRbFail ? "回滚受阻（ROLLBACK_FAILED）" : "回滚完成（ROLLED_BACK）",
          s.taskRbFail ? "有 " + failN + " 个对象不可删除，已保留原状；请将处置方式改为「暂停 / 归档」后重新提交（BR-53 / BR-73）。"
            : "AC-11：无投放数据的新建对象已删除，已有消耗 / 外部创建对象已按 BR-53、BR-73 暂停或归档。") + "</div>";
        h += '<div class="mt8">' + ADH.tbl("tbl-task-rb-res", [{ label: "对象" }, { label: "处置方式" }, { label: "结果" }],
          s.taskRbResult.map(function (x) {
            return { c: ["<b>" + x.r.obj + '</b> <span class="mono xs">' + x.r.oid + "</span>",
              x.act === "delete" ? "删除" : (x.act === "archive" ? "归档" : "暂停"),
              ADH.chip(x.tone, x.text)] };
          }), { tight: true }) + "</div>";
      }
      h += "</div>";
    }
    h += '<div class="flex gap8 center wrap mt4"><button class="btn sm' + (rbRows.length ? "" : " disabled") + '" data-act="task-rb-auto">' + ADH.icon("check", 13) + "按建议一键执行</button>" +
      '<button class="btn primary sm' + (rbRows.length ? "" : " disabled") + '" data-act="task-rb-run">' + ADH.icon("trash", 13) + "提交回滚</button>" +
      '<span class="xs muted">' + (!rbRows.length ? "BR-53：本任务没有可回滚对象" : (s.taskRbDone ? "已提交，可调整处置方式后重新提交" : "提交时逐行校验是否已有投放数据")) + "</span></div>";
    h += "</div>";
  }
  h += "</div>";
  return h;
}
function openTask(id, tab) {
  const t = taskOf(id);
  if (!t) { ADH.toast("任务不存在", "warn", "未找到任务 " + ADH.esc(String(id === undefined || id === null ? "" : id)) + "，请返回列表刷新后重试。"); return; }
  const s = taskNav();
  s.taskMode = "screen"; s.taskId = t.id; s.taskTab = tab || "progress";
  s.crumbSub = "任务详情 · " + t.id;
  s.sel = s.sel || {}; s.sel.taskRetry = [];
  s.taskRbResult = null; s.taskRbDone = false; s.taskRbFail = false;
  if (ADH.state.route === "tasks") { ADH.render(); window.scrollTo(0, 0); }
}
ADH.action("task-export", function () {
  if (!ADH.assertPerm("dashboard.export")) return;
  ADH.toast("已创建导出任务", "ok", "结果清单（含渠道侧对象 ID + 失败四项记录）导出中，完成后生成下载链接（有效期 7 天）。");
});
ADH.action("task-open", function (p) { openTask(p.v, p.tab); });
ADH.action("task-detail", function (p) { openTask(p.v, p.tab); });
ADH.action("task-detail-wrap", function (p) { openTask(p.v, p.tab); });
ADH.action("task-back", function () {
  const s = taskNav();
  s.taskMode = null; s.crumbSub = null; s.taskTab = "progress";
  if (ADH.state.route === "tasks") { ADH.render(); window.scrollTo(0, 0); }
});
ADH.action("task-tab", function (p) {
  const s = taskNav();
  s.taskMode = "screen"; s.taskTab = p.v || "progress";
  if (ADH.state.route === "tasks") ADH.render();
});
ADH.action("task-tab-run", function (p) { ADH.act("task-tab", { dataset: { v: p.v } }); });
ADH.action("task-recheck", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  const it = t && taskFailedItems(t).filter(function (x) { return taskKey(t, x) === p.v; })[0];
  if (!it) { ADH.toast("未找到该失败项", "warn", "所选失败项不属于当前任务，请返回列表刷新后重试。"); return; }
  const s = taskNav(), k = p.v, seq = taskRecheckSeq(k), tries = Number(s.taskRecheckN[k] || 0);
  const rc = tries <= 0 ? seq[0] : seq[1];
  s.taskRecheckN[k] = tries + 1; s.taskRecheck[k] = rc;
  if (rc === "FOUND") ADH.toast("渠道回查命中：渠道侧已存在该对象", "ok", "为避免重复建计划，不执行重试，请直接「标记成功」。");
  else if (rc === "MISSING") ADH.toast("渠道回查未命中：渠道侧未创建", "info", "可以安全重试，重试不会产生重复对象。");
  else ADH.toast("回查结果未知", "warn", "渠道侧返回不明确，暂不重试以免重复创建；可稍后「再次回查」或人工核对。");
  ADH.render();
});
ADH.action("task-mark-success", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  const it = t && taskFailedItems(t).filter(function (x) { return taskKey(t, x) === p.v; })[0];
  if (!it) { ADH.toast("未找到该失败项", "warn", "所选失败项不属于当前任务，请返回列表刷新后重试。"); return; }
  taskNav().taskMarked[p.v] = { by: "recheck" };
  ADH.toast("失败项 #" + it.index + " 已标记成功", "ok", "回查命中渠道侧已存在该对象，跳过重建以避免重复建计划。");
  ADH.render();
});
ADH.action("task-retry", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  if (!t) { ADH.toast("请先打开一个任务", "info", "任务详情打开后才能重试失败项。"); return; }
  taskRetryRun(t, [p.v], false);
});
ADH.action("task-retry-sel", function () {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  if (!t) { ADH.toast("请先打开一个任务", "info", "任务详情打开后才能重试失败项。"); return; }
  taskRetryRun(t, ADH.sel("taskRetry").slice(), false);
});
ADH.action("task-retry-all", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(p.v || taskNav().taskId);
  if (!t) { ADH.toast("任务不存在", "warn", "请返回任务列表刷新后重试。"); return; }
  taskNav().taskId = t.id;
  taskRetryRun(t, taskFailedItems(t).map(function (i) { return taskKey(t, i); }), false);
});
ADH.action("task-retry-cat", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  if (!t) { ADH.toast("请先打开一个任务", "info", "任务详情打开后才能按分类重试。"); return; }
  taskRetryRun(t, taskFailedItems(t).filter(function (i) { return i.errorCategory === p.v; }).map(function (i) { return taskKey(t, i); }), false);
});
ADH.action("task-retry-force", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  const it = t && taskFailedItems(t).filter(function (x) { return taskKey(t, x) === p.v; })[0];
  if (!it) { ADH.toast("未找到该失败项", "warn", "所选失败项不属于当前任务，请返回列表刷新后重试。"); return; }
  const v = taskItemView(t, it);
  ADH.modal({
    title: "人工确认重试", desc: "#" + it.index + " · " + it.target + " · " + it.errorCategory,
    body: ADH.note("warn", "已达最大重试次数", "该项已重试 <b>" + v.n + "</b> 次（上限 " + v.cap + " 次，指数退避最大 15 分钟）。继续重试需人工确认，确认动作与原因会写入审计日志。") +
      '<div class="mt12">' + ADH.kv([["错误分类", '<span class="tag-code">' + v.cat + "</span>"], ["渠道原始错误码", '<span class="mono">' + it.errorCode + "</span>"],
        ["渠道原始错误信息", ADH.esc(it.errorMessage)], ["处理建议", ADH.esc(it.advice || taskDict(v.cat).advice)]]) + "</div>" +
      '<div class="mt12">' + ADH.note("info", "BR-51 / 幂等", "仅重试该失败项，不重跑成功项；重试使用同一幂等键，不会产生重复对象。") + "</div>",
    foot: '<button class="btn" data-act="overlay-close">取消</button><button class="btn warning" data-act="task-retry-run" data-v="' + ADH.esc(v.k) + '" data-force="1">确认重试</button>'
  });
});
ADH.action("task-retry-run", function (p) {
  const t = taskOf(taskNav().taskId);
  if (!t) { ADH.toast("请先打开一个任务", "info", "任务详情打开后才能重试失败项。"); return; }
  ADH.act("overlay-close", { dataset: {} });
  taskRetryRun(t, [p.v], p.force === "1");
});
ADH.action("task-fix-retry", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  const it = t && taskFailedItems(t).filter(function (x) { return taskKey(t, x) === p.v; })[0];
  if (!it) { ADH.toast("未找到该失败项", "warn", "所选失败项不属于当前任务，请返回列表刷新后重试。"); return; }
  const s = taskNav(), n = taskItemView(t, it).n + 1;
  s.taskRetryLog[t.id] = s.taskRetryLog[t.id] || {}; s.taskRetryLog[t.id][it.index] = n;
  s.taskMarked[p.v] = { by: "fix", n: n };
  s.taskRetryNote[t.id] = s.taskRetryNote[t.id] || [];
  s.taskRetryNote[t.id].push({ index: it.index, n: n, backoff: taskBackoffMin(n), at: "2026-09-20 10:0" + Math.min(9, 2 + s.taskRetryNote[t.id].length), fix: 1 });
  ADH.toast("已按命名规则自动追加序号并重试成功", "ok", "重名冲突（" + it.errorCode + "）按命名规则自动追加序号后重新提交，仅重试该失败项。");
  ADH.render();
});
ADH.action("task-manual", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  const it = t && taskFailedItems(t).filter(function (x) { return taskKey(t, x) === p.v; })[0];
  if (!it) { ADH.toast("未找到该失败项", "warn", "所选失败项不属于当前任务，请返回列表刷新后重试。"); return; }
  taskNav().taskManual[p.v] = true;
  ADH.toast("已标记为人工处理", "info", "失败四项记录仍保留在失败明细中并随结果清单导出；该对象不会重复创建。");
  ADH.render();
});
ADH.action("task-rb-set", function (p) {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  if (!t) { ADH.toast("请先打开一个任务", "info", "任务详情打开后才能调整回滚处置方式。"); return; }
  const rows = taskRbRowsSafe(t).filter(function (r) { return r.key === p.v; });
  if (!rows.length) { ADH.toast("该回滚项不存在", "warn", "回滚预检项已变更，请重新打开任务详情。"); return; }
  taskNav().taskRb[p.v] = p.a === "delete" ? "delete" : (p.a === "archive" ? "archive" : "pause");
  ADH.render();
});
ADH.action("task-rb-auto", function () {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  if (!t) { ADH.toast("请先打开一个任务", "info", "任务详情打开后才能执行回滚。"); return; }
  const s = taskNav();
  const rows = taskRbRowsSafe(t);
  if (!rows.length) { ADH.toast("无可回滚对象", "warn", "回滚仅支持删除「本次任务创建、且无投放数据」的对象。"); return; }
  rows.forEach(function (r) { s.taskRb[r.key] = taskRbVerdict(r).deleteOk ? "delete" : "pause"; });
  ADH.render();
  ADH.toast("已按建议填充处置方式", "info", "可删除的填「删除」，已有消耗 / 外部对象的填「暂停」；确认后点击「提交回滚」。");
});
ADH.action("task-rb-run", function () {
  if (!ADH.assertPerm("ops.execute")) return;
  const t = taskOf(taskNav().taskId);
  if (!t) { ADH.toast("请先打开一个任务", "info", "任务详情打开后才能执行回滚。"); return; }
  const rows = taskRbRowsSafe(t);
  if (!rows.length) { ADH.toast("无可回滚对象", "warn", "回滚仅支持删除「本次任务创建、且无投放数据」的对象；该任务未创建对象或已完成回滚，无预检项可提交。"); return; }
  const s = taskNav();
  s.taskRbResult = rows.map(function (r) {
    const v = taskRbVerdict(r), act = taskRbAction(r);
    if (act === "delete") {
      if (v.deleteOk) return { r: r, act: act, tone: "ok", text: "已删除（本次创建 · 无投放数据）" };
      if (r.external) return { r: r, act: act, tone: "danger", text: "删除被拒绝：外部创建对象（BR-73）" };
      return { r: r, act: act, tone: "danger", text: "删除被拒绝：已有消耗 " + r.spend.toFixed(2) + " USD（BR-53）" };
    }
    return { r: r, act: act, tone: "ok", text: act === "archive" ? "已归档（按 BR-53 不可删除，归档留痕）" : (r.external ? "已暂停（BR-73 外部对象仅允许暂停 / 降预算）" : "已暂停（BR-53 已有消耗，仅暂停 / 归档）") };
  });
  s.taskRbDone = true;
  s.taskRbFail = s.taskRbResult.some(function (x) { return x.tone === "danger"; });
  ADH.toast(s.taskRbFail ? "回滚部分受阻" : "回滚已完成", s.taskRbFail ? "warn" : "ok",
    s.taskRbFail ? "BR-53 / BR-73：受阻对象保持原状，请改为暂停 / 归档后重新提交。" : "AC-11：无投放数据的新建对象已删除，已有消耗 / 外部对象仅暂停或归档。");
  ADH.render();
});
ADH.action("task-resume", function (p) {
  const t = taskOf(p.v || taskNav().taskId);
  if (!t) { ADH.toast("请先打开一个挂起任务", "info", "令牌失效后任务进入挂起状态，恢复授权后可一键重跑。"); return; }
  if (!ADH.assertPerm("ops.execute")) return;
  ADH.modal({
    title: "恢复授权后一键重跑", desc: t.id + " · " + t.title + " · " + ADH.statusChip(t.status),
    body: ADH.note("warn", "任务挂起原因", t.pauseReason || "该渠道令牌已失效，任务被挂起而非失败。") +
      '<div class="mt12">' + ADH.kv([["幂等键", '<span class="tag-code">' + t.idemKey + "</span>"], ["已完成对象", t.success + " 个（将跳过）"],
        ["待创建对象", Math.max(0, Number(t.total || 0) - Number(t.success || 0)) + " 个"], ["分片检查点", t.shardDone + " / " + t.shardTotal]]) + "</div>" +
      '<div class="mt12">' + ADH.note("info", "重跑策略", "先按幂等键执行 <b>tree.pull</b> 回查渠道侧：已创建对象直接跳过、未创建对象继续创建，因此不会产生重复对象。") + "</div>",
    foot: '<button class="btn" data-act="overlay-close">取消</button><button class="btn primary" data-act="task-resume-run">确认重跑</button>'
  });
});
ADH.action("task-resume-run", function () {
  const t = taskOf(taskNav().taskId);
  if (!t) return;
  taskNav().taskResumeDone = true;
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("已恢复授权并从断点续跑完成", "ok", "按幂等键跳过已创建对象，仅创建剩余对象，不产生重复计划。");
  ADH.render();
});
/* 导出任务中心的失败分类与处置能力，供「批量计划 · 提交结果」等二级屏复用（避免重复实现 BR-51 / BR-52 / BR-63 / BR-64） */
ADH.taskStore = taskStore;
ADH.taskOf = taskOf;
ADH.taskKey = taskKey;
ADH.taskFailedItems = taskFailedItems;
ADH.taskItemView = taskItemView;
ADH.taskOpsCell = taskOpsCell;
ADH.taskStats = taskStats;
ADH.taskDerivedStatus = taskDerivedStatus;
ADH.taskShards = taskShards;
ADH.taskBackoffMin = taskBackoffMin;
ADH.taskDict = taskDict;
ADH.TASK_STATUS_CN = TASK_STATUS_CN;
})();
/* ---------------- 自动化规则引擎 ---------------- */
(function () {
const D = ADH_DATA;
const METRIC_OPTS = ["消耗 spend", "曝光 impressions", "点击 clicks", "CTR", "CPC", "CPM", "转化数 conversions", "CPA", "ROAS", "频次 frequency", "素材维度 CTR"];
const ACTION_OPTS = ["暂停对象", "启用对象", "调整预算（绝对 / 百分比，含上下限）", "调整出价", "发送通知", "打标签"];
const LIB = [
  { name: "低效计划止损", cond: "近 3 天消耗 ≥ 50 USD 且 ROAS < 1.0", act: "暂停 Ad", guard: "单次最多 20 个；每日 09:00–22:00 生效" },
  { name: "高潜计划加预算", cond: "近 3 天 ROAS ≥ 3.0 且消耗 ≥ 30 USD", act: "AdSet 预算 +20%", guard: "单日累计上调 ≤ 50%；预算上限 500 USD" },
  { name: "素材疲劳预警", cond: "近 3 天 CTR 环比下降 ≥ 30% 且曝光 ≥ 10000", act: "发送通知 + 打标签（待迭代）", guard: "同素材 7 天内只告警一次" },
  { name: "频次过高降量", cond: "近 1 天 frequency > 4", act: "AdSet 预算 −20%", guard: "单日累计下调 ≤ 50%" },
  { name: "拒审自动止损", cond: "素材状态变为 REJECTED", act: "暂停引用该素材的 Ad", guard: "无" },
  { name: "预算守卫（每小时）", cond: "某 AdSet 近 1 小时消耗 > 日预算 25%", act: "发送通知", guard: "同对象 4 小时内只告警一次" }
];
ADH.page("rules", {
  title: "自动化规则", subtitle: "规则驱动（非 AI）：可追溯 · 可回滚 · 可熔断",
  refs: ["FR-MID-35 规则可视化配置", "FR-MID-36 演练模式", "FR-MID-37 观察模式", "FR-MID-38 规则启停与优先级", "FR-MID-39 执行日志", "FR-MID-40 执行回滚", "FR-MID-41 规则熔断", "FR-MID-42 规则模板库", "BR-67~BR-75"],
  render: function () {
    if (ADH.s().ruleMode === "edit") return ruleEditor();
    const tab = ADH.tabOf("list");
    let h = '<div class="grid g4 mb12">' +
      ADH.stat({ label: "规则总数", value: D.rules.length, unit: "条", foot: '<span class="muted">自动 ' + D.rules.filter(function (r) { return r.status === "AUTO"; }).length + " / 观察 " + D.rules.filter(function (r) { return r.status === "OBSERVE"; }).length + " / 熔断 " + D.rules.filter(function (r) { return r.status === "FUSED"; }).length + "</span>" }) +
      ADH.stat({ label: "规则采纳率", value: "60%", foot: '<span class="muted">auto 模式 / 创建数 · 目标 ≥ 40%</span>' }) +
      ADH.stat({ label: "今日命中对象", value: D.rules.reduce(function (a, r) { return a + r.avgHit; }, 0), unit: "个", foot: '<span class="muted">单次执行影响上限 100（BR-74）</span>' }) +
      ADH.stat({ label: "熔断规则", value: D.rules.filter(function (r) { return r.fuse; }).length, unit: "条", foot: '<span style="color:var(--danger)">连续 3 次失败自动停用</span>' }) + "</div>";

    h += '<div class="card"><div class="tabs">' +
      [["list", "规则列表"], ["lib", "规则模板库"], ["log", "执行日志"], ["model", "规则模型"]].map(function (x) {
        return '<button class="' + (tab === x[0] ? "on" : "") + '" data-act="tab" data-v="' + x[0] + '">' + x[1] + "</button>";
      }).join("") + '<div class="right" style="margin-left:auto;padding:5px 0">' +
      (ADH.can("rule.edit") ? '<button class="btn primary sm" data-act="rule-new">' + ADH.icon("plus", 13) + "新建规则</button>" : '<button class=\"btn sm disabled\" title=\"' + ADH.LOCK_REASON["rule.edit"] + '\">' + ADH.icon("lock", 13) + "新建规则</button>") + "</div></div>";

    if (tab === "lib") {
      h += '<div class="card-body">' + ADH.note("info", "内置常用规则（FR-MID-42）", "一键启用后默认进入<b>观察模式</b>（BR-68），至少运行一个周期并展示模拟结果后才允许切换为自动执行。") +
        '<div class="mt12">' + ADH.tbl("tbl-lib", [{ label: "规则名" }, { label: "条件" }, { label: "动作" }, { label: "保护（安全阀）" }, { label: "" }], LIB.map(function (l) {
          return { c: ['<b>' + l.name + "</b>", '<span class="xs">' + l.cond + "</span>", '<span class="xs">' + l.act + "</span>", '<span class="xs">' + l.guard + "</span>",
            '<button class="btn xs" data-act="rule-enable-lib" data-v="' + l.name + '">一键启用</button>'] };
        }), { tight: true }) + "</div></div>";
    } else if (tab === "log") {
      h += '<div class="card-body">' + ADH.note("info", "BR-70 执行日志必录", "规则 ID · 命中对象 · 命中时指标快照 · 执行动作 · 执行前后值 · 渠道返回结果。") + '<div class="mt12">';
      h += ADH.tbl("tbl-exec", [{ label: "时间" }, { label: "规则" }, { label: "模式" }, { label: "命中对象", cls: "num" }, { label: "执行动作" }, { label: "结果" }, { label: "指标快照" }, { label: "" }],
        D.ruleExec.map(function (x) {
          return {
            c: ['<span class="mono xs">' + x.at + "</span>", '<b>' + x.ruleName + '</b><div class="xs muted mono">' + x.id + "</div>",
              ADH.statusChip(x.mode), x.hit, '<span class="xs">' + x.action + "</span>", ADH.statusChip(x.result), '<span class="xs muted">' + ADH.esc(x.snap) + "</span>",
              (x.rollbackable ? '<button class="btn xs" data-act="exec-detail" data-v="' + x.id + '">明细 / 回滚</button>' : '<button class="btn xs" data-act="exec-detail" data-v="' + x.id + '">明细</button>')],
            v: [x.at, x.ruleName, x.mode, x.hit, x.action, x.result, x.snap, ""]
          };
        }), { sortable: true, tight: true, pageSize: 8 }) + "</div></div>";
    } else if (tab === "model") {
      h += '<div class="card-body">' + ADH.sec("规则模型") +
        '<div class="formula"><span class="k">规则</span> = <span class="v">触发</span>（什么时候评估）<br/>' +
        '     + <span class="v">范围</span>（对哪些对象评估）<br/>' +
        '     + <span class="v">条件</span>（满足什么指标条件）<br/>' +
        '     + <span class="v">动作</span>（做什么）<br/>' +
        '     + <span class="v">保护</span>（安全阀）</div>' +
        ADH.sec("组成可选项") + ADH.tbl("tbl-model", [{ label: "组成" }, { label: "可选项" }], [
          { c: ["触发", "每小时 / 每 6 小时 / 每日固定时刻 / 事件驱动"] },
          { c: ["范围", "指定账户、账户组、指定 Campaign/AdSet/Ad，支持按标签筛选"] },
          { c: ["条件", "指标 + 比较符 + 阈值 + 观察窗口 + 最小样本量（如：近 3 天消耗 ≥ 50 且 ROAS < 1.0）"] },
          { c: ["动作", "暂停对象 / 启用对象 / 调整预算（绝对或百分比，含上下限）/ 调整出价 / 发送通知 / 打标签"] },
          { c: ["保护", "生效时间段、单次最大影响对象数、单日预算调整幅度上限、冷静期、是否需人工确认"] }
        ], { tight: true }) +
        '<div class="mt8"><b class="small">支持的指标：</b><span class="xs muted">消耗（spend）、曝光、点击、CTR、CPC、CPM、转化数、CPA、ROAS、频次、素材维度 CTR</span></div>' +
        ADH.sec("关键安全规则") + '<div class="grid g2">' +
        ADH.note("rule", "BR-67 / BR-68 演练与观察", "规则必须支持演练模式（dry-run）：只输出「如果执行会做什么」，不真正下发；首次启用默认进入观察模式。") +
        ADH.note("info", "BR-69 优先级仲裁", "多条规则命中同一对象时按优先级仲裁；优先级相同时以更保守的动作优先（暂停 &gt; 降预算 &gt; 加预算）。") +
        '<div class="mt8">' + ADH.note("warn", "BR-74 / BR-75 上限与数据时效", "单规则单次执行影响对象数上限 100，超出则截断并告警；规则评估依赖的指标数据必须有明确的数据时间戳，数据未就绪时跳过本次评估并记录原因，不允许用陈旧数据做决策。") + "</div>" +
        '<div class="mt8">' + ADH.note("danger", "BR-71 熔断", "规则执行连续 3 次失败触发熔断，自动暂停该规则并告警，避免异常刷接口。") + "</div>" +
        "</div></div>";
    } else {
      h += '<div class="card-body">' + ADH.tbl("tbl-rules", [{ label: "规则" }, { label: "状态" }, { label: "触发" }, { label: "范围" }, { label: "条件" }, { label: "动作" }, { label: "保护" }, { label: "命中", cls: "num" }, { label: "最近执行" }, { label: "" }],
        D.rules.map(function (r) {
          let verdicts = r.conditions.map(function (c) { return c[0] + " " + c[1] + " " + c[2] + (c[3] && c[3] !== "—" ? " " + c[3] : ""); }).join(" 且 ");
          return {
            c: ['<b>' + r.name + '</b><div class="xs muted">优先级 ' + r.priority + " · " + r.owner + " · " + r.id + "</div>" + (r.fuse ? '<div class="xs" style="color:var(--danger)">' + ADH.esc(r.fuseReason) + "</div>" : ""),
              ADH.statusChip(r.status), '<span class="xs">' + r.trigger.label + "</span>", '<span class="xs">' + r.scope.label + "</span>",
              '<span class="xs">' + verdicts + "</span>", '<span class="xs">' + r.action.label + "</span>",
              '<span class="xs muted">' + r.guards.window + "<br/>上限 " + r.guards.maxObjects + " 个 · 冷静期 " + r.guards.cooldown + "</span>",
              r.hitCount, '<span class="mono xs">' + r.lastRunAt + "</span>",
              '<div class="flex gap4"><button class="btn xs" data-act="rule-edit" data-v="' + r.id + '">编辑</button><button class="btn xs" data-act="rule-dry" data-v="' + r.id + '">演练</button><button class="btn xs" data-act="exec-log" data-v="' + r.id + '">日志</button></div>'],
            v: [r.name, r.status, r.trigger.label, r.scope.label, verdicts, r.action.label, r.guards.window, r.hitCount, r.lastRunAt, ""]
          };
        }), { sortable: true, tight: true, pageSize: 6 }) + "</div>";
      h += '<div class="card-body" style="border-top:1px solid var(--line)"><div class="grid g4">' +
        ADH.note("info", "FR-MID-36 演练模式", "只输出模拟结果，不实际执行，不产生任何渠道调用（AC-10）。") +
        ADH.note("info", "FR-MID-37 观察模式", "首次启用后的隔离观察期，运行满一个周期才允许切为自动执行。") +
        ADH.note("warn", "FR-MID-41 熔断", "连续失败 3 次自动停用并告警。") +
        ADH.note("rule", "FR-MID-38 优先级", "冲突时按优先级仲裁；同级以更保守动作优先。") + "</div></div>";
    }
    h += "</div>";
    return h;
  }
});
/* ============ 规则编辑器（新建 / 编辑） · FR-MID-35 ~ 42 / BR-67 ~ 75 ============ */
const RULE_STEPS = [
  ["基本信息", "规则名 · 优先级 · 归属"],
  ["触发与范围", "触发方式 + 作用对象"],
  ["条件", "指标 / 比较符 / 阈值 / 观察窗口"],
  ["动作", "命中后做什么（含参数）"],
  ["安全阀", "生效时段 · 上限 · 冷静期 · 执行模式"],
  ["演练与保存", "BR-67 dry-run · BR-68 观察模式"]
];
const RULE_METRICS = ["消耗 spend", "曝光 impressions", "点击 clicks", "CTR", "CPC", "CPM", "转化数 conversions", "CPA", "ROAS", "频次 frequency", "素材维度 CTR"];
const RULE_OPS = ["<", "≤", ">", "≥", "="];
const RULE_TRIGGERS = [
  ["CRON", "时间触发", "按 Cron 表达式周期性评估（FR-MID-22A）"],
  ["EVENT", "事件触发", "由系统事件触发自动执行（FR-MID-22B）"],
  ["COND", "条件触发", "指标满足阈值时触发（FR-MID-22C）"]
];
const RULE_EVENTS = ["素材被拒审", "账户余额低于阈值", "渠道令牌即将过期", "任务部分失败", "账户数据未就绪"];
const RULE_ACTIONS = [
  ["PAUSE", "暂停对象"], ["ENABLE", "启用对象"],
  ["BUDGET_PCT", "调整预算（百分比）"], ["BUDGET_ABS", "调整预算（绝对值）"],
  ["BID_PCT", "调整出价（百分比）"], ["NOTIFY", "发送通知"], ["TAG", "打标签"]
];
const RULE_LEVELS = [["AD", "Ad"], ["ADSET", "AdSet"], ["CAMPAIGN", "Campaign"]];
const RULE_MODES = [["DRY", "演练模式（dry-run）"], ["OBSERVE", "观察模式"], ["AUTO", "自动执行"]];
const RULE_SCOPE_MODES = [["GROUP", "按账户组"], ["ACCOUNT", "指定账户"], ["TAG", "按标签"]];
function ruleLvl(k) { const x = RULE_LEVELS.filter(function (y) { return y[0] === k; })[0]; return x ? x[1] : k; }
function ruleActLabel(k) { const x = RULE_ACTIONS.filter(function (y) { return y[0] === k; })[0]; return x ? x[1] : k; }
function ruleModeLabel(k) { const x = RULE_MODES.filter(function (y) { return y[0] === k; })[0]; return x ? x[1] : k; }
function ruleParamHint(k) {
  if (k === "BUDGET_PCT") return "如 +20% / -15%（相对当前值，需设单日幅度上限）";
  if (k === "BUDGET_ABS") return "如 150（USD，绝对值；需设上下限）";
  if (k === "BID_PCT") return "如 -10%（相对当前出价）";
  if (k === "NOTIFY") return "如 通知账户负责人 + 风险群";
  if (k === "TAG") return "如 打标签：低效待优化";
  return "";
}
function ruleNeedsParam(k) { return k !== "PAUSE" && k !== "ENABLE"; }
function ruleSeed(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h % 100000; }
function ruleBlank() {
  return {
    name: "", desc: "", priority: 5, enabled: true,
    triggerType: "CRON", cron: "0 * * * *", event: RULE_EVENTS[0],
    scopeMode: "GROUP", groups: ["北美主力组"], accounts: [], level: "AD", tags: ["主力"], excludeExternal: true,
    conditions: [{ win: "近 3 天", metric: "消耗 spend", op: "≥", value: "50", unit: "USD" }],
    join: "AND",
    action: { type: "PAUSE", target: "AD", value: "" },
    guards: { window: "每日 09:00–22:00", maxObjects: "20", budgetStep: "50", cooldown: "24", needConfirm: false, fuse: "3", mode: "OBSERVE" }
  };
}
function ruleD() { const s = ADH.s(); if (!s.ruleDraft) s.ruleDraft = ruleBlank(); return s.ruleDraft; }
function ruleStep() { const n = Number(ADH.s().ruleStep || 1); return Math.min(RULE_STEPS.length, Math.max(1, n)); }
function ruleCronOk(v) { return /^\s*\S+(\s+\S+){4}\s*$/.test(String(v || "")); }
function rulePool(level) {
  const out = [];
  D.tree.forEach(function (tr) {
    tr.campaigns.forEach(function (c) {
      if (level === "CAMPAIGN") out.push({ id: c.id, name: c.name });
      c.adsets.forEach(function (s) {
        if (level === "ADSET") out.push({ id: s.id, name: s.name });
        s.ads.forEach(function (a) { if (level === "AD") out.push({ id: a.id, name: a.name }); });
      });
    });
  });
  return out;
}
function ruleHits() {
  const d = ruleD();
  const pool = rulePool(d.level);
  if (!pool.length) return [];
  const rnd = adhRng(ruleSeed(JSON.stringify([d.conditions, d.action.type, d.level, d.scopeMode, d.groups.join("|"), d.accounts.join("|")])));
  const n = Math.min(pool.length, 3 + Math.floor(rnd() * 6));
  return pool.slice(0, n);
}
function ruleHitRows() {
  const d = ruleD();
  return ruleHits().map(function (o) {
    const rnd = adhRng(ruleSeed(o.id + d.action.type));
    const spend = 30 + rnd() * 70;
    const roas = 0.4 + rnd() * 3.4;
    let before = "ACTIVE", after = "PAUSED";
    if (d.action.type === "ENABLE") { before = "PAUSED"; after = "ACTIVE"; }
    else if (d.action.type === "BUDGET_PCT") { before = "$" + Math.round(spend * 2); after = "$" + Math.round(spend * 2 * 1.2) + "（+20%）"; }
    else if (d.action.type === "BUDGET_ABS") { before = "$" + Math.round(spend * 2); after = "$" + (d.action.value || "150"); }
    else if (d.action.type === "BID_PCT") { before = "$1.20"; after = "$1.08（-10%）"; }
    else if (d.action.type === "NOTIFY") { before = "—"; after = "发送通知：" + (d.action.value || "账户负责人"); }
    else if (d.action.type === "TAG") { before = "—"; after = "打标签：" + (d.action.value || "低效待优化"); }
    return { o: o, spend: spend, roas: roas, before: before, after: after };
  });
}
function ruleChecks() {
  const d = ruleD();
  const rows = [];
  const editing = !!ADH.s().ruleEditId;
  rows.push(["必填", "规则名称已填写", "BLOCK", String(d.name).trim() ? "PASS" : "FAIL", String(d.name).trim() ? "「" + ADH.esc(d.name) + "」" : "未填写规则名称"]);
  const cronOk = d.triggerType !== "CRON" || ruleCronOk(d.cron);
  rows.push(["触发", "Cron 表达式合法（5 段）", "BLOCK", cronOk ? "PASS" : "FAIL", d.triggerType !== "CRON" ? "非时间触发，不适用" : (cronOk ? ADH.esc(d.cron) : "当前「" + ADH.esc(d.cron) + "」不符合 5 段格式")]);
  const scopeTxt = d.scopeMode === "GROUP" ? (d.groups.length ? d.groups.join("、") : "未选择账户组") :
    (d.scopeMode === "ACCOUNT" ? (d.accounts.length ? "已选 " + d.accounts.length + " 个账户" : "未选择账户") : (d.tags.length ? d.tags.join("、") : "未设置标签"));
  const scopeOk = d.scopeMode === "GROUP" ? d.groups.length > 0 : (d.scopeMode === "ACCOUNT" ? d.accounts.length > 0 : d.tags.length > 0);
  rows.push(["范围", "作用范围非空", "BLOCK", scopeOk ? "PASS" : "FAIL", scopeTxt]);
  const bad = d.conditions.filter(function (c) { return !String(c.metric).trim() || !String(c.win).trim() || String(c.value).trim() === "" || isNaN(Number(c.value)); });
  rows.push(["条件", "至少 1 条条件且阈值为数字", "BLOCK", (d.conditions.length && !bad.length) ? "PASS" : "FAIL",
    !d.conditions.length ? "未设置任何条件" : (bad.length ? bad.length + " 条条件缺少指标或阈值非数字" : d.conditions.length + " 条条件，阈值均为数字")]);
  const dup = {}; let dupHit = 0;
  d.conditions.forEach(function (c) { const k = c.win + "|" + c.metric; if (dup[k]) dupHit++; dup[k] = 1; });
  rows.push(["条件", "同一窗口下指标不重复", "WARN", dupHit ? "WARN" : "PASS", dupHit ? dupHit + " 组指标重复，取交集后可能永不为真" : "无重复指标"]);
  const sameLevel = d.action.target === d.level;
  rows.push(["动作", "动作层级与评估层级一致", "WARN", sameLevel ? "PASS" : "WARN", sameLevel ? ruleLvl(d.level) + " → " + ruleLvl(d.action.target) : "评估 " + ruleLvl(d.level) + "，动作作用于 " + ruleLvl(d.action.target) + "，需确认语义"]);
  const valOk = !ruleNeedsParam(d.action.type) || String(d.action.value).trim() !== "";
  rows.push(["动作", "动作参数已填写", "BLOCK", valOk ? "PASS" : "FAIL", valOk ? (d.action.value ? ADH.esc(d.action.value) : "该动作无需参数") : "「" + ruleActLabel(d.action.type) + "」需要填写参数"]);
  const g = d.guards;
  const numOk = Number(g.maxObjects) >= 1 && Number(g.budgetStep) > 0 && Number(g.cooldown) >= 0;
  rows.push(["安全阀", "安全阀参数合法（上限 / 幅度 / 冷静期）", "BLOCK", numOk ? "PASS" : "FAIL", numOk ? "单次上限 " + ADH.esc(g.maxObjects) + " 个 · 单日幅度 ≤ " + ADH.esc(g.budgetStep) + "% · 冷静期 " + ADH.esc(g.cooldown) + " 小时" : "参数必须为合法数字"]);
  const capOk = Number(g.maxObjects) <= 100;
  rows.push(["安全阀", "单次影响对象数 ≤ 100（BR-74）", "BLOCK", capOk ? "PASS" : "FAIL", "当前 " + ADH.esc(g.maxObjects) + " 个，超出将截断并告警"]);
  rows.push(["保护", "外部创建对象排除（BR-73）", "WARN", d.excludeExternal ? "PASS" : "WARN", d.excludeExternal ? "已排除渠道侧外部对象" : "未排除：外部对象仅允许暂停 / 降预算"]);
  const modeOk = d.guards.mode !== "AUTO" || editing;
  rows.push(["执行", "符合 BR-68 首次启用须观察模式", "BLOCK", modeOk ? "PASS" : "FAIL", modeOk ? ruleModeLabel(d.guards.mode) : "新建规则不允许直接自动执行，请先进入观察模式"]);
  return rows;
}
function ruleSummary() {
  const d = ruleD();
  const cond = d.conditions.map(function (c, i) {
    const u = c.unit && c.unit !== "—" ? " " + c.unit : "";
    return (i ? (d.join === "OR" ? " 或 " : " 且 ") : "") + ADH.esc(c.win) + " " + ADH.esc(c.metric) + " " + ADH.esc(c.op) + " " + ADH.esc(c.value) + u;
  }).join("");
  const scope = d.scopeMode === "GROUP" ? ('账户组「' + ADH.esc(d.groups.join("、") || "未选择") + "」")
    : d.scopeMode === "ACCOUNT" ? ("指定账户 " + d.accounts.length + " 个") : ('标签「' + ADH.esc(d.tags.join("、") || "未设置") + "」");
  const trig = d.triggerType === "CRON" ? ("时间触发（" + ADH.esc(d.cron) + "，按账户时区）") :
    d.triggerType === "EVENT" ? ("事件触发（" + ADH.esc(d.event) + "）") : "条件触发（指标满足阈值即评估）";
  const act = ruleActLabel(d.action.type) + (d.action.value ? "（" + ADH.esc(d.action.value) + "）" : "") + " · 作用于 " + ruleLvl(d.action.target);
  return "当 " + (cond || "（未设置条件）") + " 时，对 " + scope + " 内的 " + ruleLvl(d.level) + " 执行「" + act + "」。" + trig +
    "。保护：" + ADH.esc(d.guards.window) + "；单次最多 " + ADH.esc(d.guards.maxObjects) + " 个、单日幅度上限 " + ADH.esc(d.guards.budgetStep) +
    "%、同对象冷静期 " + ADH.esc(d.guards.cooldown) + " 小时；执行模式：" + ruleModeLabel(d.guards.mode) + (d.guards.needConfirm ? "；命中后需人工确认" : "") + "。";
}
function ruleEditor() {
  const d = ruleD(), step = ruleStep(), checks = ruleChecks();
  const blocked = checks.filter(function (c) { return c[2] === "BLOCK" && c[3] === "FAIL"; });
  const hits = ruleHitRows();
  let h = '<div class="flex between center wrap mb12"><div>' +
    '<div class="flex center gap8"><h2 style="margin:0;font-size:16px">' + (ADH.s().ruleEditId ? "编辑规则" : "新建规则") + "</h2>" +
    ADH.chip("brand", "规则可视化配置") + ADH.chip("neutral", "演练") + ADH.chip("neutral", "观察模式") + "</div>" +
    '<div class="xs muted mt4">规则 = 触发 + 范围 + 条件 + 动作 + 保护（安全阀）· 本期的「自动」是规则驱动，不是 AI 智能优化</div></div>' +
    '<div class="flex gap8"><button class="btn" data-act="rule-cancel">取消返回</button>' +
    '<button class="btn primary" data-act="rule-save"' + (blocked.length ? ' title="存在 ' + blocked.length + " 项阻断，请先修正\"" : "") + ">" + ADH.icon("save", 13) + "保存规则</button></div></div>";

  h += '<div class="wizard">' + RULE_STEPS.map(function (x, i) {
    const n = i + 1;
    return (i ? '<i class="wz-line' + (step > n - 1 ? " done" : "") + '"></i>' : "") +
      '<div class="wz ' + (step > n ? "done" : (step === n ? "on" : "")) + '" data-act="rule-step" data-v="' + n + '"><span class="n">' + (step > n ? "✓" : n) + '</span><span class="t"><b>' + x[0] + "</b><small>" + x[1] + "</small></span></div>";
  }).join("") + "</div>";

  h += '<div class="grid g-3-2"><div class="card"><div class="card-head"><h3>' + ADH.icon("wand", 15) + "STEP " + step + " · " + RULE_STEPS[step - 1][0] +
    '</h3><div class="right"><span class="xs muted">' + RULE_STEPS[step - 1][1] + "</span></div></div><div class=\"card-body\">";

  if (step === 1) {
    h += ADH.note("info", "生效与归属", "保存后规则默认进入 <b>观察模式</b>（BR-68）：至少运行一个周期并展示模拟结果后才允许切换为自动执行；规则创建 / 启停 / 回滚仅 admin 与 optimizer 可用。") +
      '<div class="grid g2 mt12">' +
      '<div class="field" style="grid-column:1/-1"><label>规则名称 <span style="color:var(--danger)">*</span></label><input id="rule-name" class="input" placeholder="如：低效计划止损" value="' + ADH.esc(d.name) + '" data-live="1" data-act="rule-set" data-k="name" /></div>' +
      '<div class="field"><label>优先级（数字越小越先仲裁）</label><select id="rule-priority" class="select" data-live="1" data-act="rule-set" data-k="priority">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return "<option value=\"" + n + "\"" + (Number(d.priority) === n ? " selected" : "") + ">优先级 " + n + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>规则归属</label><input class="input mono" value="' + ADH.esc(ADH.rolePerson()) + '" readonly /></div>' +
      '<div class="field" style="grid-column:1/-1"><label>规则说明</label><textarea id="rule-desc" class="input" rows="2" placeholder="用途、适用场景、注意事项" data-live="1" data-act="rule-set" data-k="desc">' + ADH.esc(d.desc) + "</textarea></div></div>" +
      ADH.note("rule", "BR-69 优先级仲裁", "同一对象被多条规则命中时按优先级仲裁；优先级相同时以<b>更保守</b>的动作优先（暂停 &gt; 降预算 &gt; 加预算）。");
  } else if (step === 2) {
    h += ADH.sec("触发方式") +
      ADH.tbl("tbl-rule-trig", [{ label: "" }, { label: "触发方式" }, { label: "说明" }], RULE_TRIGGERS.map(function (x) {
        return { c: ['<input type="radio" name="rule-trig" ' + (d.triggerType === x[0] ? "checked" : "") + ' data-act="rule-set" data-k="triggerType" data-v="' + x[0] + '" style="accent-color:var(--brand)" />', "<b>" + x[1] + "</b>", '<span class="xs muted">' + x[2] + "</span>"] };
      }), { tight: true });
    h += '<div class="grid g2 mt12">';
    if (d.triggerType === "CRON") {
      h += '<div class="field"><label>Cron 表达式（分 时 日 月 周）</label><input id="rule-cron" class="input mono" value="' + ADH.esc(d.cron) + '" data-live="1" data-act="rule-set" data-k="cron" /></div>' +
        '<div class="field"><label>常用预设</label><select id="rule-cron-preset" class="select" data-live="1" data-act="rule-set" data-k="cron"><option value="' + ADH.esc(d.cron) + '">当前：' + ADH.esc(d.cron) + "</option>" + ["0 * * * *", "0 */6 * * *", "30 8 * * *", "0 9,21 * * *"].map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("") + "</select></div>";
    } else if (d.triggerType === "EVENT") {
      h += '<div class="field" style="grid-column:1/-1"><label>监听事件</label><select id="rule-event" class="select" data-live="1" data-act="rule-set" data-k="event">' + RULE_EVENTS.map(function (e) { return "<option" + (d.event === e ? " selected" : "") + ">" + e + "</option>"; }).join("") + "</select></div>";
    } else {
      h += ADH.note("info", "条件触发", "指标满足 STEP 3 的条件即触发评估，无需 Cron；系统仍按最小评估周期（10 分钟）去抖动，避免同一周期内重复触发。");
    }
    h += "</div>";
    h += ADH.sec("作用范围") + '<div class="seg mb8" style="display:inline-flex">' +
      RULE_SCOPE_MODES.map(function (x) { return '<button class="' + (d.scopeMode === x[0] ? "on" : "") + '" data-act="rule-set" data-k="scopeMode" data-v="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>";
    if (d.scopeMode === "GROUP") {
      h += '<div class="grid g2">' + D.groups.map(function (g) {
        const on = d.groups.indexOf(g.name) >= 0;
        return '<div class="file-row" style="margin:0" data-act="rule-toggle-group" data-v="' + ADH.esc(g.name) + '">' +
          '<input type="checkbox" ' + (on ? "checked" : "") + ' style="accent-color:var(--brand)" />' +
          '<div class="fmeta"><div class="fname">' + g.name + '</div><div class="fsub">' + g.accounts + " 个账户 · " + ADH.esc(g.desc) + "</div></div></div>";
      }).join("") + "</div>";
    } else if (d.scopeMode === "ACCOUNT") {
      h += '<div class="grid g2">' + D.accounts.slice(0, 8).map(function (a) {
        const on = d.accounts.indexOf(a.actId) >= 0;
        return '<div class="file-row" style="margin:0" data-act="rule-toggle-account" data-v="' + ADH.esc(a.actId) + '">' +
          '<input type="checkbox" ' + (on ? "checked" : "") + ' style="accent-color:var(--brand)" />' +
          '<div class="fmeta"><div class="fname">' + a.name + '</div><div class="fsub">' + a.actId + " · " + a.currency + "</div></div></div>";
      }).join("") + "</div>";
    } else {
      h += '<div class="flex gap6 wrap">' + ["主力", "测试", "高价值", "拉新", "再营销"].map(function (tg) {
        const on = d.tags.indexOf(tg) >= 0;
        return '<button class="' + (on ? "chip brand" : "chip plain") + '" style="cursor:pointer" data-act="rule-set" data-k="tagToggle" data-v="' + tg + '">' + tg + "</button>";
      }).join("") + "</div>";
    }
    h += '<div class="grid g2 mt12">' +
      '<div class="field"><label>评估层级</label><select id="rule-level" class="select" data-live="1" data-act="rule-set" data-k="level">' + RULE_LEVELS.map(function (x) { return '<option value="' + x[0] + '"' + (d.level === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>外部创建对象（BR-73）</label><div class="seg" style="display:inline-flex"><button class="' + (d.excludeExternal ? "on" : "") + '" data-act="rule-set" data-k="excludeExternal" data-v="1">排除</button><button class="' + (!d.excludeExternal ? "on" : "") + '" data-act="rule-set" data-k="excludeExternal" data-v="0">不排除</button></div><div class="xs muted mt4">外部对象仅允许暂停 / 降预算，不允许删除类动作</div></div>' +
      "</div>";
  } else if (step === 3) {
    h += ADH.note("info", "条件组合", "条件之间可设 <b>AND</b>（同时满足）或 <b>OR</b>（任一满足）；每条条件 = 观察窗口 + 指标 + 比较符 + 阈值，并可设最小样本量以避免小样本误判。") +
      '<div class="seg mb8" style="display:inline-flex"><button class="' + (d.join === "AND" ? "on" : "") + '" data-act="rule-set" data-k="join" data-v="AND">全部满足（AND）</button><button class="' + (d.join === "OR" ? "on" : "") + '" data-act="rule-set" data-k="join" data-v="OR">任一满足（OR）</button></div>';
    h += '<div class="mt8">' + d.conditions.map(function (c, i) {
      return '<div class="cond-row">' +
        '<span class="' + (i ? "join" : "idx") + '">' + (i ? d.join : "IF") + "</span>" +
        '<input id="rule-c' + i + '-win" class="input mono" style="width:96px" value="' + ADH.esc(c.win) + '" data-live="1" data-act="rule-cond" data-i="' + i + '" data-f="win" />' +
        '<select id="rule-c' + i + '-metric" class="select" style="width:170px" data-live="1" data-act="rule-cond" data-i="' + i + '" data-f="metric">' + RULE_METRICS.map(function (m) { return "<option" + (c.metric === m ? " selected" : "") + ">" + m + "</option>"; }).join("") + "</select>" +
        '<select id="rule-c' + i + '-op" class="select" style="width:74px" data-live="1" data-act="rule-cond" data-i="' + i + '" data-f="op">' + RULE_OPS.map(function (o) { return "<option" + (c.op === o ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select>" +
        '<input id="rule-c' + i + '-value" class="input mono" style="width:86px" value="' + ADH.esc(c.value) + '" data-live="1" data-act="rule-cond" data-i="' + i + '" data-f="value" />' +
        '<input id="rule-c' + i + '-unit" class="input" style="width:74px" value="' + ADH.esc(c.unit || "") + '" data-live="1" data-act="rule-cond" data-i="' + i + '" data-f="unit" />' +
        '<button class="btn xs danger-ghost" data-act="rule-cond-del" data-v="' + i + '"' + (d.conditions.length <= 1 ? ' disabled title="规则至少保留 1 条条件"' : "") + ">移除</button></div>";
    }).join("") + "</div>" +
      '<div class="mt8"><button class="btn sm" data-act="rule-cond-add">' + ADH.icon("plus", 13) + "添加条件</button>" +
      '<button class="btn sm ml8" data-act="rule-cond-sample">插入「最小样本量 ≥ 1000 曝光」</button></div>' +
      '<div class="mt12">' + ADH.note("warn", "BR-75 数据时效校验", "规则评估依赖的指标必须有明确的数据时间戳；数据未就绪时跳过本次评估并记录原因，不允许用陈旧数据做决策。") + "</div>";
  } else if (step === 4) {
    h += ADH.sec("动作类型与参数") + '<div class="grid g2">' +
      '<div class="field"><label>动作类型</label><select id="rule-act-type" class="select" data-live="1" data-act="rule-act" data-k="type">' + RULE_ACTIONS.map(function (a) { return '<option value="' + a[0] + '"' + (d.action.type === a[0] ? " selected" : "") + ">" + a[1] + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>动作作用层级</label><select id="rule-act-target" class="select" data-live="1" data-act="rule-act" data-k="target">' + RULE_LEVELS.map(function (x) { return '<option value="' + x[0] + '"' + (d.action.target === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></div>" +
      '<div class="field" style="grid-column:1/-1"><label>动作参数' + (ruleNeedsParam(d.action.type) ? ' <span style="color:var(--danger)">*</span>' : "") + '</label><input id="rule-act-value" class="input mono" value="' + ADH.esc(d.action.value) + '" placeholder="' + ADH.esc(ruleParamHint(d.action.type) || "该动作无需参数") + '"' + (ruleNeedsParam(d.action.type) ? "" : " disabled") + ' data-live="1" data-act="rule-act" data-k="value" /><div class="xs muted mt4">' + (ADH.esc(ruleParamHint(d.action.type)) || "「暂停 / 启用」为无参动作，直接作用于对象状态") + "</div></div></div>" +
      ADH.note("rule", "FR-MID-35 动作能力", "支持：暂停对象 / 启用对象 / 调整预算（绝对值或百分比，含上下限）/ 调整出价 / 发送通知 / 打标签。数值型动作必须在 STEP 5 设置单日调整幅度上限。") +
      '<div class="mt8">' + ADH.note("warn", "BR-73 外部对象限制", "规则不得对渠道侧维护的外部对象执行删除类动作；外部对象仅允许暂停 / 降预算。") + "</div>";
  } else if (step === 5) {
    const g = d.guards;
    h += ADH.note("warn", "安全阀是规则的强约束", "所有数值型动作必须设置单日调整幅度上限，避免规则异常时对账户造成不可逆影响（BR-74）。") +
      '<div class="grid g2 mt12">' +
      '<div class="field"><label>生效时间段</label><input id="rule-g-window" class="input mono" value="' + ADH.esc(g.window) + '" data-live="1" data-act="rule-guard" data-k="window" /></div>' +
      '<div class="field"><label>单次最大影响对象数</label><input id="rule-g-max" class="input mono" value="' + ADH.esc(g.maxObjects) + '" data-live="1" data-act="rule-guard" data-k="maxObjects" /><div class="xs muted mt4">单规则单次上限 100，超出截断并告警（BR-74）</div></div>' +
      '<div class="field"><label>单日调整幅度上限（%）</label><input id="rule-g-step" class="input mono" value="' + ADH.esc(g.budgetStep) + '" data-live="1" data-act="rule-guard" data-k="budgetStep" /></div>' +
      '<div class="field"><label>同对象冷静期（小时）</label><input id="rule-g-cool" class="input mono" value="' + ADH.esc(g.cooldown) + '" data-live="1" data-act="rule-guard" data-k="cooldown" /></div>' +
      '<div class="field"><label>连续失败熔断阈值（次）</label><input id="rule-g-fuse" class="input mono" value="' + ADH.esc(g.fuse) + '" data-live="1" data-act="rule-guard" data-k="fuse" /><div class="xs muted mt4">达到阈值自动暂停规则并告警</div></div>' +
      '<div class="field"><label>命中后是否需人工确认</label><div class="seg" style="display:inline-flex"><button class="' + (g.needConfirm ? "on" : "") + '" data-act="rule-guard" data-k="needConfirm" data-v="1">需要</button><button class="' + (!g.needConfirm ? "on" : "") + '" data-act="rule-guard" data-k="needConfirm" data-v="0">不需要</button></div></div>' +
      "</div>" +
      ADH.sec("执行模式") + '<div class="seg" style="display:inline-flex">' +
      RULE_MODES.map(function (m) {
        const disabled = m[0] === "AUTO" && !ADH.s().ruleEditId;
        return '<button class="' + (g.mode === m[0] ? "on" : "") + (disabled ? " disabled" : "") + '"' + (disabled ? ' title="新建规则首次启用默认进入观察模式"' : "") + ' data-act="rule-set" data-k="mode" data-v="' + m[0] + '">' + m[1] + "</button>";
      }).join("") + "</div>" +
      '<div class="mt8 xs muted">演练模式（dry-run）只输出「如果执行会做什么」，不产生任何渠道调用（AC-10）；观察模式记录命中但不执行，至少运行一个周期后才允许切换为自动执行。</div>';
  } else {
    h += ADH.note(blocked.length ? "danger" : "ok", blocked.length ? "校验未通过（" + blocked.length + " 项阻断）" : "校验通过，可保存",
      blocked.length ? "存在阻断项，保存将被拦截；请返回对应步骤修正。" : "规则将保存并进入观察模式（BR-68）。") +
      '<div class="mt12">' + ADH.sec("校验清单") + ADH.tbl("tbl-rule-checks", [{ label: "类别" }, { label: "校验项" }, { label: "级别" }, { label: "结果" }, { label: "说明" }],
        checks.map(function (c) {
          return { c: ['<span class="chip neutral">' + c[0] + "</span>", c[1], ADH.chip(c[2] === "BLOCK" ? "danger" : "warn", c[2]),
            c[3] === "PASS" ? ADH.chip("ok", "通过") : (c[3] === "FAIL" ? ADH.chip("danger", "阻断") : ADH.chip("warn", "警告")),
            '<span class="xs muted">' + c[4] + "</span>"] };
        }), { tight: true }) + "</div>" +
      '<div class="mt12">' + ADH.sec("演练结果") +
      ADH.note("info", "演练不产生任何渠道调用", "按当前条件与范围在历史数据上回放，输出「如果执行会做什么」；单次上限 " + ADH.esc(d.guards.maxObjects) + " 个" +
        (hits.length > Number(d.guards.maxObjects) ? "，本次命中 " + hits.length + " 个将被截断到 " + ADH.esc(d.guards.maxObjects) + " 个（BR-74）" : "，本次未触发截断") + "。") +
      '<div class="mt8">' + ADH.tbl("tbl-rule-dry", [{ label: "对象 ID" }, { label: "对象" }, { label: "命中指标快照" }, { label: "将执行的变更" }],
        hits.map(function (x) {
          return { c: ['<span class="tag-code">' + ADH.esc(x.o.id) + "</span>", '<span class="small">' + ADH.esc(x.o.name) + "</span>",
            '<span class="xs">消耗 ' + x.spend.toFixed(1) + " USD · ROAS " + x.roas.toFixed(2) + "</span>", '<b class="xs">' + ADH.esc(x.before) + " → " + ADH.esc(x.after) + "</b>"] };
        }), { tight: true, empty: "当前条件未命中任何对象", emptyDesc: "可放宽阈值或扩大范围后重新演练；条件过严时规则不会产生任何效果。", emptyAction: '<button class="btn sm" data-act="rule-step" data-v="3">返回调整条件</button>' }) + "</div>" +
      '<div class="mt12">' + ADH.note("rule", "BR-69 优先级仲裁", "若同一对象被多条规则命中，按优先级仲裁；优先级相同时以更保守的动作优先（暂停 &gt; 降预算 &gt; 加预算）。") + "</div>";
  }

  h += "</div></div>" +
    '<div class="grid" style="gap:12px">' +
    '<div class="card"><div class="card-head"><h3>' + ADH.icon("flow", 15) + '规则摘要<span class="desc">自然语言复核</span></h3></div><div class="card-body">' +
    '<div class="note rule">' + ADH.icon("info", 15) + "<div>" + ruleSummary() + "</div></div>" +
    '<div class="mt12">' + ADH.kv([["触发方式", ruleTriggerLabel(d)], ["作用范围", ruleScopeLabel(d)], ["评估层级", ruleLvl(d.level)], ["动作", ruleActLabel(d.action.type) + " → " + ruleLvl(d.action.target)], ["执行模式", ruleModeLabel(d.guards.mode)]]) + "</div>" +
    "</div></div>" +
    '<div class="card"><div class="card-head"><h3>' + ADH.icon("check", 15) + '校验摘要</h3></div><div class="card-body">' +
    ADH.kv([["阻断项", blocked.length ? '<span class="chip danger">' + blocked.length + "</span>" : '<span class="chip ok">0</span>'],
      ["警告项", '<span class="mono">' + checks.filter(function (c) { return c[3] === "WARN"; }).length + "</span>"],
      ["命中预估", '<span class="mono">' + hits.length + " 个 " + ruleLvl(ruleD().level) + "</span>"],
      ["单次上限", '<span class="mono">' + ADH.esc(ruleD().guards.maxObjects) + " 个</span>"],
      ["执行模式", ruleModeLabel(ruleD().guards.mode)]]) +
    '<div class="mt12">' + ADH.note(blocked.length ? "warn" : "ok", blocked.length ? "存在阻断项" : "可保存", blocked.length ? "请修正后在 STEP 6 重新校验。" : "保存后进入观察模式，可随时在列表页切为自动执行。") + "</div></div></div></div></div>";

  h += '<div class="toolbar mt12"><button class="btn sm" data-act="rule-step" data-v="' + Math.max(1, step - 1) + '"' + (step === 1 ? " disabled" : "") + ">上一步</button>" +
    '<div class="grow"></div><span class="xs muted">STEP ' + step + " / " + RULE_STEPS.length + "</span>" +
    (step < RULE_STEPS.length
      ? '<button class="btn primary sm" data-act="rule-step" data-v="' + (step + 1) + '">下一步</button>'
      : '<button class="btn sm" data-act="rule-dryrun-new">' + ADH.icon("bolt", 12) + "重新演练</button><button class=\"btn primary sm\" data-act=\"rule-save\">保存规则</button>") + "</div>";
  return h;
}
/* ---- 编辑器取值与展示辅助 ---- */
function ruleFieldVal(p, el) {
  const pv = String(p.v === undefined || p.v === null ? "" : p.v);
  if (!el) return pv;
  if (el.tagName === "SELECT" || el.tagName === "TEXTAREA") return String(el.value);
  if (el.tagName === "INPUT") {
    const type = String(el.type || "").toLowerCase();
    /* 单选 / 复选把值放在 data-v 上，不能读 el.value */
    if (type === "radio" || type === "checkbox") return pv || String(el.value || "");
    return String(el.value);
  }
  return pv;
}
function ruleTriggerText(d) {
  if (d.triggerType === "EVENT") return "事件触发：" + d.event;
  if (d.triggerType === "COND") return "条件触发";
  return "Cron " + d.cron;
}
function ruleTriggerLabel(d) {
  if (d.triggerType === "EVENT") return "事件触发 · " + ADH.esc(d.event) + "（FR-MID-22B）";
  if (d.triggerType === "COND") return "条件触发 · 指标满足阈值即评估（FR-MID-22C）";
  return "时间触发 · " + ADH.esc(d.cron) + "（按账户时区，FR-MID-22A）";
}
function ruleScopeLabel(d) {
  if (d.scopeMode === "ACCOUNT") return "指定账户 " + d.accounts.length + " 个" + (d.accounts.length ? "（" + ADH.esc(d.accounts.slice(0, 3).join("、")) + (d.accounts.length > 3 ? " 等" : "") + "）" : "");
  if (d.scopeMode === "TAG") return "标签：" + (d.tags.length ? ADH.esc(d.tags.join("、")) : "未设置");
  return "账户组：" + (d.groups.length ? ADH.esc(d.groups.join("、")) : "未选择");
}
/* 由优先级数值 + 条件列表生成列表页展示用数据 */
function ruleCondRows(d) {
  return d.conditions.map(function (c) { return [c.win + " " + String(c.metric).split(" ")[0], c.op, c.value, c.unit || "—"]; });
}
function ruleGuardsOf(d) {
  return { window: d.guards.window, maxObjects: Number(d.guards.maxObjects) || 20,
    budgetStep: ruleNeedsParam(d.action.type) ? String(d.guards.budgetStep) + "%" : "—",
    cooldown: "同对象 " + d.guards.cooldown + " 小时", needConfirm: d.guards.needConfirm ? 1 : 0 };
}
function ruleMetricKey(txt) {
  const s = String(txt || "");
  const map = [["消耗", "消耗 spend"], ["曝光", "曝光 impressions"], ["点击", "点击 clicks"], ["CTR", "CTR"], ["CPC", "CPC"], ["CPM", "CPM"],
    ["转化", "转化数 conversions"], ["CPA", "CPA"], ["ROAS", "ROAS"], ["frequency", "频次 frequency"], ["频次", "频次 frequency"]];
  for (let i = 0; i < map.length; i++) { if (s.indexOf(map[i][0]) >= 0) return map[i][1]; }
  return RULE_METRICS[0];
}
/* 列表数据 → 编辑器草稿（条件 / 范围由展示文案反解，保存前请复核） */
function ruleDraftFrom(r) {
  const d = ruleBlank();
  const hit = function (list, k) { return list.filter(function (x) { return x[0] === k; })[0]; };
  d.name = r.name; d.desc = ""; d.priority = Number(r.priority) || 5;
  d.triggerType = hit(RULE_TRIGGERS, r.trigger.type) ? r.trigger.type : "CRON";
  d.cron = r.trigger.expr || d.cron;
  const lv = hit(RULE_LEVELS, r.action.target);
  d.level = lv ? r.action.target : "AD";
  d.action.type = hit(RULE_ACTIONS, r.action.type) ? r.action.type : "PAUSE";
  d.action.target = d.level;
  const vm = String(r.action.label || "").match(/[+−-]\s*\d+(\.\d+)?\s*%|\d+(\.\d+)?\s*USD/);
  d.action.value = vm ? vm[0].replace(/[−]/g, "-").replace(/\s+/g, "") : "";
  const lbl = String(r.scope.label || "");
  if (/^指定账户/.test(lbl)) { d.scopeMode = "ACCOUNT"; d.accounts = lbl.match(/act_\d+/g) || []; }
  else if (/^标签/.test(lbl)) { d.scopeMode = "TAG"; d.tags = (r.scope.tags || []).slice(); }
  else {
    d.scopeMode = "GROUP";
    const names = D.groups.map(function (g) { return g.name; });
    if (/^全部/.test(lbl)) d.groups = names.slice();
    else { const picked = names.filter(function (n) { return lbl.indexOf(n) >= 0; }); d.groups = picked.length ? picked : names.slice(0, 1); }
  }
  const conds = (r.conditions || []).map(function (c) {
    const win = (String(c[0]).match(/近\s*\d+\s*[天小时日]+/) || ["近 3 天"])[0];
    const ops = RULE_OPS.filter(function (o) { return String(c[1]).indexOf(o) >= 0; });
    const unit = ({ "USD": "USD", "%": "%", "曝光": "次" })[c[3]] || "";
    return { win: win, metric: ruleMetricKey(c[0] + " " + (c[3] || "")), op: ops[0] || "≥", value: String(c[2]), unit: unit };
  });
  d.conditions = conds.length ? conds : ruleBlank().conditions;
  const g = r.guards || {};
  d.guards.window = g.window || d.guards.window;
  d.guards.maxObjects = String(g.maxObjects || d.guards.maxObjects);
  const bs = String(g.budgetStep || "").match(/\d+/);
  d.guards.budgetStep = bs ? bs[0] : d.guards.budgetStep;
  const cd = String(g.cooldown || "").match(/\d+/);
  d.guards.cooldown = cd ? cd[0] : d.guards.cooldown;
  d.guards.needConfirm = !!g.needConfirm;
  d.guards.mode = r.status === "AUTO" ? "AUTO" : "OBSERVE";
  return d;
}
/* ---- 编辑器动作 ---- */
ADH.action("rule-new", function () {
  if (!ADH.assertPerm("rule.edit")) return;
  const s = ADH.s();
  s.ruleMode = "edit"; s.ruleEditId = null; s.ruleStep = 1; s.ruleDraft = ruleBlank(); s.crumbSub = "新建规则";
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("rule-edit", function (p) {
  if (!ADH.assertPerm("rule.edit")) return;
  const r = D.rules.filter(function (x) { return x.id === p.v; })[0];
  if (!r) { ADH.toast("规则不存在", "warn", "未找到规则 " + ADH.esc(String(p.v)) + "，请刷新列表后重试。"); return; }
  const s = ADH.s();
  s.ruleMode = "edit"; s.ruleEditId = r.id; s.ruleStep = 1; s.ruleDraft = ruleDraftFrom(r); s.crumbSub = "编辑规则 · " + r.name;
  ADH.toast("已载入「" + r.name + "」", "ok", "条件与作用范围由列表展示文案反解，保存前请核对；可先在 STEP 6 演练。");
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("rule-cancel", function () {
  const s = ADH.s();
  s.ruleMode = null; s.ruleEditId = null; s.ruleDraft = null; s.ruleStep = 1; s.crumbSub = null;
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("rule-step", function (p) {
  ADH.s().ruleStep = Math.min(RULE_STEPS.length, Math.max(1, Number(p.v) || 1));
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("rule-set", function (p, el) {
  const d = ruleD(), k = p.k, v = ruleFieldVal(p, el);
  if (k === "name") d.name = v;
  else if (k === "desc") d.desc = v;
  else if (k === "priority") d.priority = Number(v) || 5;
  else if (k === "triggerType") d.triggerType = v;
  else if (k === "cron") d.cron = v;
  else if (k === "event") d.event = v;
  else if (k === "scopeMode") d.scopeMode = v;
  else if (k === "level") d.level = v;
  else if (k === "join") d.join = v;
  else if (k === "excludeExternal") d.excludeExternal = v === "1";
  else if (k === "tagToggle") { const i = d.tags.indexOf(v); if (i >= 0) d.tags.splice(i, 1); else d.tags.push(v); }
  else if (k === "mode") {
    if (v === "AUTO" && !ADH.s().ruleEditId) { ADH.toast("新建规则须先进入观察模式", "warn", "至少运行一个周期并展示模拟结果后，才允许切换为自动执行。"); return; }
    d.guards.mode = v;
  } else return;
  ADH.render();
});
ADH.action("rule-toggle-group", function (p) {
  const d = ruleD(), i = d.groups.indexOf(p.v);
  if (i >= 0) d.groups.splice(i, 1); else d.groups.push(p.v);
  ADH.render();
});
ADH.action("rule-toggle-account", function (p) {
  const d = ruleD(), i = d.accounts.indexOf(p.v);
  if (i >= 0) d.accounts.splice(i, 1); else d.accounts.push(p.v);
  ADH.render();
});
ADH.action("rule-cond", function (p, el) {
  const c = ruleD().conditions[Number(p.i)];
  if (!c || !p.f) return;
  if (c[p.f] === undefined && p.f !== "unit") return;
  c[p.f] = ruleFieldVal(p, el);
  ADH.render();
});
ADH.action("rule-cond-add", function () {
  ruleD().conditions.push({ win: "近 3 天", metric: RULE_METRICS[0], op: "≥", value: "", unit: "USD" });
  ADH.render();
});
ADH.action("rule-cond-del", function (p) {
  const d = ruleD();
  if (d.conditions.length <= 1) { ADH.toast("至少保留 1 条条件", "warn", "规则必须至少包含 1 条判断条件才能评估；如需停用该规则请在列表页停用。"); return; }
  d.conditions.splice(Number(p.v), 1);
  ADH.render();
});
ADH.action("rule-cond-sample", function () {
  const d = ruleD();
  if (d.conditions.some(function (c) { return c.metric === "曝光 impressions"; })) {
    ADH.toast("已存在样本量条件", "warn", "为避免同一窗口下指标重复（校验会告警），本次未插入；可直接修改已有条件的阈值。");
    return;
  }
  d.conditions.push({ win: "近 3 天", metric: "曝光 impressions", op: "≥", value: "1000", unit: "次" });
  ADH.render();
});
ADH.action("rule-act", function (p, el) {
  const a = ruleD().action, k = p.k;
  if (k !== "type" && k !== "target" && k !== "value") return;
  a[k] = ruleFieldVal(p, el);
  if (k === "type" && !ruleNeedsParam(a.type)) a.value = "";
  ADH.render();
});
ADH.action("rule-guard", function (p, el) {
  const g = ruleD().guards, k = p.k;
  if (g[k] === undefined) return;
  g[k] = k === "needConfirm" ? ruleFieldVal(p, el) === "1" : ruleFieldVal(p, el);
  ADH.render();
});
ADH.action("rule-dryrun-new", function () {
  const d = ruleD(), hits = ruleHitRows();
  ADH.toast(hits.length ? "演练已重新执行" : "演练完成：未命中对象", hits.length ? "warn" : "ok",
    hits.length ? "本次命中 " + hits.length + " 个 " + ruleLvl(d.level) + " 对象；将执行「" + ruleActLabel(d.action.type) + "」；未产生任何渠道调用。" : "当前条件未命中任何对象，可放宽阈值或扩大作用范围后重试。");
  ADH.render();
});
ADH.action("rule-save", function () {
  if (!ADH.assertPerm("rule.edit")) return;
  const d = ruleD(), s = ADH.s(), checks = ruleChecks();
  const blocked = checks.filter(function (c) { return c[2] === "BLOCK" && c[3] === "FAIL"; });
  if (blocked.length) {
    s.ruleStep = RULE_STEPS.length;
    ADH.toast("保存被拦截", "warn", blocked.length + " 项阻断：" + blocked.map(function (c) { return c[1]; }).join("；") + "。请返回对应步骤修正。");
    ADH.render(); window.scrollTo(0, 0);
    return;
  }
  const g = d.guards, hits = ruleHitRows();
  const warn = checks.filter(function (c) { return c[3] === "WARN"; });
  ADH.overlay({
    kind: "modal", wide: true, title: s.ruleEditId ? "保存规则变更" : "创建规则",
    desc: "演练通过 · 保存后默认进入观察模式",
    body: ADH.note("ok", "校验通过（" + checks.length + " 项，无阻断）", "保存后规则进入观察模式：至少运行一个周期并展示模拟结果，才允许切换为自动执行。") +
      (warn.length ? ADH.note("warn", warn.length + " 项警告", warn.map(function (c) { return c[1]; }).join("；") + "。警告不阻断保存，但建议复核。") : "") +
      ADH.sec("保存内容") + ADH.kv([
        ["规则名称", ADH.esc(d.name)], ["优先级", "优先级 " + ADH.esc(d.priority) + "（数字越小越先仲裁）"],
        ["规则归属", ADH.esc(ADH.rolePerson())], ["触发方式", ruleTriggerLabel(d)],
        ["作用范围", ruleScopeLabel(d)], ["评估层级", ruleLvl(d.level)],
        ["条件", d.conditions.length + " 条 · " + (d.join === "AND" ? "全部满足（AND）" : "任一满足（OR）")],
        ["动作", ruleActLabel(d.action.type) + (d.action.value ? "（" + ADH.esc(d.action.value) + "）" : "") + " · 作用于 " + ruleLvl(d.action.target)],
        ["安全阀", "单次 ≤ " + ADH.esc(g.maxObjects) + " 个 · 单日幅度 ≤ " + ADH.esc(g.budgetStep) + "% · 冷静期 " + ADH.esc(g.cooldown) + " 小时"],
        ["执行模式", ruleModeLabel(g.mode) + (g.needConfirm ? " · 命中后需人工确认" : "")]]) +
      '<div class="mt12">' + ADH.note("rule", "自然语言复核", ruleSummary()) + "</div>" +
      ADH.sec("演练结果（dry-run）") + ADH.kv([["预计命中", hits.length + " 个 " + ruleLvl(d.level) + " 对象"],
        ["单次上限", ADH.esc(g.maxObjects) + " 个" + (hits.length > Number(g.maxObjects) ? "（超出将截断并告警，BR-74）" : "（本次未截断）")],
        ["渠道调用", "0 次（AC-10：演练不产生任何渠道调用）"]]) +
      (hits.length ? '<div class="mt8 xs muted">示例：' + ADH.esc(hits[0].o.name) + " → " + ADH.esc(hits[0].before) + " → " + ADH.esc(hits[0].after) + "</div>" : ""),
    foot: '<button class="btn" data-act="overlay-close">继续编辑</button><div class="grow"></div><button class="btn primary" data-act="rule-save-confirm">确认保存</button>'
  });
});
ADH.action("rule-save-confirm", function () {
  const d = ruleD(), s = ADH.s();
  if (!String(d.name).trim()) {
    ADH.act("overlay-close", { dataset: {} });
    s.ruleStep = 1;
    ADH.toast("规则名称不能为空", "warn", "请回到 STEP 1 填写规则名称后再保存。");
    ADH.render(); window.scrollTo(0, 0);
    return;
  }
  const blocked = ruleChecks().filter(function (c) { return c[2] === "BLOCK" && c[3] === "FAIL"; });
  if (blocked.length) {
    ADH.act("overlay-close", { dataset: {} });
    s.ruleStep = RULE_STEPS.length;
    ADH.toast("保存被拦截", "warn", blocked.length + " 项阻断：" + blocked.map(function (c) { return c[1]; }).join("；"));
    ADH.render(); window.scrollTo(0, 0);
    return;
  }
  const editing = s.ruleEditId, hits = ruleHitRows();
  if (editing) {
    const r = D.rules.filter(function (x) { return x.id === editing; })[0];
    if (r) {
      r.name = d.name; r.priority = Number(d.priority) || r.priority;
      r.trigger = { type: d.triggerType, expr: d.triggerType === "CRON" ? d.cron : "—", label: ruleTriggerText(d) };
      r.scope = { label: ruleScopeLabel(d), accounts: d.scopeMode === "ACCOUNT" ? d.accounts.length : (d.scopeMode === "GROUP" ? d.groups.reduce(function (a, n) { return a + ((D.groups.filter(function (g) { return g.name === n; })[0] || {}).accounts || 0); }, 0) : 0), tags: d.tags.slice() };
      r.conditions = ruleCondRows(d);
      r.action = { type: d.action.type, target: d.action.target, label: ruleActLabel(d.action.type) + (d.action.value ? "（" + d.action.value + "）" : "") };
      r.guards = ruleGuardsOf(d);
      if (d.guards.mode === "AUTO" && r.status !== "FUSED") r.status = "AUTO";
      else if (r.status === "AUTO") r.status = "OBSERVE";
      r.updatedAt = D.env.today;
    }
  } else {
    D.rules.unshift({
      id: "R-" + String(D.rules.length + 1).padStart(2, "0"), name: d.name, status: "OBSERVE",
      priority: Number(d.priority) || 5, owner: ADH.rolePerson(), createdAt: D.env.today + " 10:00",
      trigger: { type: d.triggerType, expr: d.triggerType === "CRON" ? d.cron : "—", label: ruleTriggerText(d) },
      scope: { label: ruleScopeLabel(d), accounts: d.scopeMode === "ACCOUNT" ? d.accounts.length : (d.scopeMode === "GROUP" ? d.groups.reduce(function (a, n) { return a + ((D.groups.filter(function (g) { return g.name === n; })[0] || {}).accounts || 0); }, 0) : 0), tags: d.tags.slice() },
      conditions: ruleCondRows(d),
      action: { type: d.action.type, target: d.action.target, label: ruleActLabel(d.action.type) + (d.action.value ? "（" + d.action.value + "）" : "") },
      guards: ruleGuardsOf(d),
      hitCount: 0, lastRunAt: "—（观察模式：尚未执行）", nextRun: d.triggerType === "CRON" ? "下一周期：" + d.cron : "事件触发时评估",
      fuse: 0, avgHit: 0,
      examples: hits.length ? "演练命中 " + hits.length + " 个对象，示例：" + hits[0].o.name + " → " + hits[0].after : "演练未命中对象"
    });
  }
  ADH.act("overlay-close", { dataset: {} });
  s.ruleMode = null; s.ruleEditId = null; s.ruleDraft = null; s.ruleStep = 1; s.crumbSub = null;
  ADH.toast(editing ? "规则已更新" : "规则已创建并进入观察模式", "ok",
    "「" + d.name + "」保存成功；观察期至少运行一个周期，命中记录可在「执行日志」查看。");
  ADH.render(); window.scrollTo(0, 0);
});
ADH.action("rule-enable-lib", function (p) {
  if (!ADH.assertPerm("rule.edit")) return;
  ADH.toast("「" + p.v + "」已启用（观察模式）", "ok", "约 1 个周期后可在执行日志中查看模拟命中结果");
});
ADH.action("rule-dry", function (p) {
  const r = D.rules.filter(function (x) { return x.id === p.v; })[0];
  const hits = r.id === "R-01" ? [
    ["1202300011", "US_付费_闪婚总裁_v3 广告", "ROAS 0.68 / 消耗 82.4 USD", "ACTIVE → PAUSED"],
    ["1202300044", "US_付费_甜宠恋综_v6 广告", "ROAS 0.74 / 消耗 61.2 USD", "ACTIVE → PAUSED"],
    ["1202300118", "EU_付费_狼人恋人_v1 广告", "ROAS 0.92 / 消耗 58.7 USD", "ACTIVE → PAUSED"],
    ["1202300203", "EU_付费_古堡谜情_v1 广告", "ROAS 0.88 / 消耗 54.1 USD", "ACTIVE → PAUSED"]
  ] : [["1202200019", "25-34-female AdSet", "近 3 天 ROAS 3.6 / 消耗 41.2 USD", "120 USD → 144 USD（建议）"]];
  ADH.overlay({
    kind: "modal", wide: true, title: "演练模式（dry-run）· " + r.name,
    desc: "只输出「如果执行会做什么」，不真正下发渠道调用",
    body: ADH.note("info", "模拟结果", "本次评估命中 <b>" + hits.length + "</b> 个对象；" +
      (r.fuse ? "规则当前处于熔断状态，演练仅展示结果，不会恢复调度。" : "动作：<b>" + r.action.label + "</b>；保护：单次上限 " + r.guards.maxObjects + " 个，当前未截断（BR-74）。")) +
      '<div class="mt12">' + ADH.tbl("tbl-dry", [{ label: "对象 ID" }, { label: "对象" }, { label: "命中依据（指标快照）" }, { label: "将执行的变更" }],
        hits.map(function (x) { return { c: ['<span class="tag-code">' + x[0] + "</span>", '<span class="small">' + x[1] + "</span>", '<span class="xs">' + x[2] + "</span>", '<b class="xs">' + x[3] + "</b>"] }; }), { tight: true }) + "</div>" +
      '<div class="mt12">' + ADH.note("warn", "数据时效校验（BR-75）", "评估所依赖的指标数据时间戳：2026-09-20 07:45（覆盖评估窗口）；若数据未就绪则跳过本次评估并记录原因。") + "</div>" +
      '<div class="mt8">' + ADH.note("info", "优先级仲裁（BR-69）", "若同一对象同时被多条规则命中，按优先级仲裁；优先级相同时以更保守的动作优先（暂停 &gt; 降预算 &gt; 加预算）。") + "</div>",
    foot: '<button class="btn" data-act="overlay-close">关闭</button><div class="grow"></div><button class="btn primary" data-act="rule-switch-auto" data-v="' + r.id + '">切换为自动执行</button>'
  });
});
ADH.action("rule-switch-auto", function () {
  ADH.act("overlay-close", { dataset: {} });
  ADH.toast("规则已切换为自动执行", "ok", "执行前仍会校验生效时间段、单次影响上限与冷静期；每次执行写入执行日志");
});
ADH.action("exec-log", function (p) { ADH.s().tab = "log"; ADH.render(); });
ADH.action("exec-detail", function (p) {
  const x = D.ruleExec.filter(function (e) { return e.id === p.v; })[0];
  ADH.overlay({
    title: "执行明细 · " + x.id, wide: true, desc: x.ruleName + " · " + x.at + " · " + ADH.statusChip(x.mode) + " " + ADH.statusChip(x.result),
    body: ADH.sec("指标快照") + '<div class="formula">' + ADH.esc(x.snap) + "</div>" +
      ADH.sec("执行前后值") + (x.changes.length ? ADH.tbl("tbl-chg", [{ label: "对象" }, { label: "执行前" }, { label: "执行后" }],
        x.changes.map(function (c) { return { c: ['<span class="small">' + c.obj + "</span>", '<span class="mono xs">' + c.before + "</span>", '<b class="mono xs" style="color:var(--brand-2)">' + c.after + "</b>"] }; }), { tight: true }) : ADH.empty("本次未产生变更")) +
      (x.rollbackable ? '<div class="mt12">' + ADH.note("info", "BR-72 回滚", "每次执行支持回滚：恢复动作前值；若对象已被其他操作修改，回滚前需提示冲突。") + '<div class="mt8"><button class="btn sm" data-act="exec-rollback" data-v="' + x.id + '">回滚本次执行</button></div></div>' : ""),
    foot: '<button class="btn" data-act="overlay-close">关闭</button>'
  });
});
ADH.action("exec-rollback", function () {
  ADH.overlay({
    kind: "modal", title: "回滚冲突检查",
    body: ADH.note("warn", "检测到对象已被其他操作修改", "3 个命中对象中有 1 个（1202300044）在本次规则执行后被投手手动修改过。<br/>按 BR-72，回滚前需提示冲突：可选择<b>跳过冲突对象回滚</b>，或<b>强制回到规则执行前值</b>（会覆盖投手的手动修改）。") +
      ADH.tbl("t-rb2", [{ label: "对象" }, { label: "规则执行前" }, { label: "当前值" }, { label: "冲突" }], [
        { c: ["1202300011", "ACTIVE", "PAUSED", ADH.chip("ok", "无冲突")] },
        { c: ["1202300044", "ACTIVE", "PAUSED（投手手动改过）", ADH.chip("warn", "有冲突")] },
        { c: ["1202300118", "ACTIVE", "PAUSED", ADH.chip("ok", "无冲突")] }
      ], { tight: true }),
    foot: '<button class="btn" data-act="overlay-close">取消</button><div class="grow"></div><button class="btn" data-act="exec-rollback-skip">跳过冲突对象回滚</button><button class="btn danger" data-act="exec-rollback-force">强制回到执行前值</button>'
  });
});
ADH.action("exec-rollback-skip", function () { ADH.act("overlay-close", { dataset: {} }); ADH.toast("已回滚 2 个对象", "ok", "跳过 1 个冲突对象；回滚动作已写入执行日志与审计日志"); });
ADH.action("exec-rollback-force", function () { ADH.act("overlay-close", { dataset: {} }); ADH.toast("已回滚 3 个对象（覆盖冲突）", "warn", "已记录冲突对象与覆盖动作，可在审计日志中追溯"); });
})();
