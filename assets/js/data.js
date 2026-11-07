/* ===== ADH 原型数据层（全部为演示数据） ===== */
const ADH_ENV = {
  today: "2026-09-20",
  now: "2026-09-20 10:24",
  baseCurrency: "USD",
  baseTimezone: "UTC+8",
  fxRate: { note: "基准币种换算：账户币种 → USD，汇率来源 ECB 2026-09-19 收盘", sample: "1 CNY = 0.1402 USD" },
  freshness: { channel: "2026-09-20 08:00", attribution: "2026-09-20 07:45", insight: "2026-09-19 日粒度已就绪", lagAccounts: 2 },
  capacity: { accounts: "50–200", designers: "1–10", adsPerBatch: 500, eventsPerDay: "100 万" },
  sources: [
    { code: "LIVE", label: "真实生产账户", desc: "Meta Marketing API 正式接入（目标形态）" },
    { code: "SANDBOX", label: "Meta 沙箱账户", desc: "用于测试投放流程，不产生真实消耗" },
    { code: "DEMO", label: "示例账户", desc: "内置示例数据，用于功能体验" }
  ]
};

const ADH_ROLES = {
  admin:     { label: "管理员",       person: "周振业", focus: "系统是否可用、授权是否失效、谁改了什么" },
  optimizer: { label: "投放优化师",   person: "林可",   focus: "建得快不快、跑得稳不稳、效果好不好" },
  designer:  { label: "素材设计师",   person: "苏晴",   focus: "素材有没有被拒审、哪版素材表现好" },
  analyst:   { label: "数据分析师",   person: "陈默",   focus: "口径是否统一、能不能下钻、能不能导出" }
};

/* 权限矩阵（PRD 3.2）：功能权限 × 数据权限（账户组） */
const ADH_PERM = {
  "account.bind":     { admin: 1, optimizer: 0, designer: 0, analyst: 0 },
  "account.view":     { admin: 1, optimizer: 1, designer: 1, analyst: 1 },
  "asset.upload":     { admin: 1, optimizer: 0, designer: 1, analyst: 0 },
  "asset.delete":     { admin: 1, optimizer: 0, designer: 0, analyst: 0 },
  "asset.perf":       { admin: 1, optimizer: 1, designer: 1, analyst: 1 },
  "template.edit":    { admin: 1, optimizer: 1, designer: 0, analyst: 0 },
  "plan.submit":      { admin: 1, optimizer: 1, designer: 0, analyst: 0 },
  "plan.approve":     { admin: 1, optimizer: 0, designer: 0, analyst: 0 },
  "ops.execute":      { admin: 1, optimizer: 1, designer: 0, analyst: 0 },
  "rule.edit":        { admin: 1, optimizer: 1, designer: 0, analyst: 0 },
  "dashboard.view":   { admin: 1, optimizer: 1, designer: 1, analyst: 1 },
  "dashboard.export": { admin: 1, optimizer: 1, designer: 1, analyst: 1 },
  "attr.view":        { admin: 1, optimizer: 1, designer: 0, analyst: 1 },
  "attr.edit":        { admin: 1, optimizer: 1, designer: 0, analyst: 0 },
  "user.manage":      { admin: 1, optimizer: 0, designer: 0, analyst: 0 },
  "audit.view":       { admin: 1, optimizer: 0, designer: 0, analyst: 0 },
  "lead.view":        { admin: 1, optimizer: 1, designer: 0, analyst: 0 }
};

/* 导航：大模块 → 主页面 */
const ADH_NAV = [
  { group: "工作台", items: [
    { id: "workbench", title: "工作台", icon: "home" }
  ]},
  { group: "投放前", items: [
    { id: "accounts",   title: "广告账户",   icon: "wallet", perm: "account.view" },
    { id: "channels",   title: "渠道接入与令牌", icon: "plug", perm: "account.view" },
    { id: "groups",     title: "账户组与数据权限", icon: "folder", perm: "account.view" },
    { id: "assets",     title: "素材中心",   icon: "image", perm: "asset.perf" }
  ]},
  { group: "投放中", items: [
    { id: "templates",  title: "广告结构模板", icon: "layers", perm: "account.view" },
    { id: "naming",     title: "命名规则引擎", icon: "tag", perm: "account.view" },
    { id: "batch-plan", title: "批量计划",   icon: "wand", perm: "plan.submit" },
    { id: "batch-ops",  title: "批量投放",   icon: "toggle", perm: "ops.execute" },
    { id: "tasks",      title: "任务中心",   icon: "list", perm: "account.view", badgeKey: "taskFail" },
    { id: "rules",      title: "自动化规则", icon: "bolt", perm: "rule.edit" }
  ]},
  { group: "投放后", items: [
    { id: "dashboard",  title: "数据看板",   icon: "chart", perm: "dashboard.view" },
    { id: "budget",     title: "预算分配",   icon: "pie", perm: "dashboard.view" },
    { id: "asset-perf", title: "素材效果",   icon: "trend", perm: "asset.perf" },
    { id: "attr-detail",title: "归因明细与对账", icon: "flow", perm: "attr.view" },
    { id: "exports",    title: "报表导出",   icon: "download", perm: "dashboard.export" }
  ]},
  { group: "系统管理", items: [
    { id: "users",      title: "用户与角色", icon: "users", perm: "user.manage" },
    { id: "audit",      title: "审计日志",   icon: "shield", perm: "audit.view" },
    { id: "notifications", title: "通知中心", icon: "bell", perm: "account.view" },
    { id: "settings",   title: "系统配置",   icon: "sliders", perm: "account.view" }
  ]}
];

/* 确定性随机（保证每次打开数据一致） */
function adhRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function adhDays(n, end) {
  const out = []; const base = new Date(end + "T00:00:00Z");
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 86400000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
/* 生成 30 天指标序列 */
function adhSeries(seed, scale, trend) {
  const rnd = adhRng(seed); const days = adhDays(30, ADH_ENV.today);
  return days.map(function (d, i) {
    const wk = [0.82, 0.9, 1, 1.05, 1.02, 0.94, 0.8][new Date(d + "T00:00:00Z").getUTCDay()];
    const drift = 1 + (trend || 0) * (i / 29);
    const spend = Math.round(scale * wk * drift * (0.86 + rnd() * 0.28) * 100) / 100;
    const cpm = 7.4 + rnd() * 3.6;
    const impressions = Math.round(spend / cpm * 1000);
    const ctr = 0.0088 + rnd() * 0.0075;
    const clicks = Math.max(1, Math.round(impressions * ctr));
    const cvr = 0.022 + rnd() * 0.028;
    const conversions = Math.max(0, Math.round(clicks * cvr));
    const aov = 38 + rnd() * 46;
    const convValue = Math.round(conversions * aov * 100) / 100;
    const reach = Math.round(impressions / (1.4 + rnd() * 1.1));
    return { date: d, spend: spend, impressions: impressions, clicks: clicks, conversions: conversions, convValue: convValue, reach: reach, frequency: Math.round((impressions / Math.max(1, reach)) * 100) / 100 };
  });
}
function adhAgg(series) {
  const a = series.reduce(function (o, r) {
    o.spend += r.spend; o.impressions += r.impressions; o.clicks += r.clicks;
    o.conversions += r.conversions; o.convValue += r.convValue; o.reach += r.reach; return o;
  }, { spend: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0, reach: 0 });
  const p = function (n, d) { return d > 0 ? Math.round(n / d * 10000) / 10000 : 0; };
  return {
    spend: Math.round(a.spend * 100) / 100, impressions: a.impressions, clicks: a.clicks,
    conversions: a.conversions, convValue: Math.round(a.convValue * 100) / 100,
    ctr: p(a.clicks, a.impressions), cpc: p(a.spend, a.clicks), cpm: p(a.spend * 1000, a.impressions),
    cpa: p(a.spend, a.conversions), roas: p(a.convValue, a.spend), frequency: p(a.impressions, a.reach),
    reach: a.reach
  };
}
/* ===== 渠道 ===== */
const ADH_CHANNELS = [
  { code: "meta", label: "Meta（Facebook / Instagram）", status: "CONNECTED", adapter: "Meta Adapter",
    scopes: ["ads_management", "ads_read", "business_management"], tokenType: "系统用户长期令牌",
    bms: [{ id: "bm_1029", name: "NovaDrama Media Ltd.", accounts: 12, tokenExpireDays: 41, lastOk: "2026-09-20 10:12", lastError: "—" },
          { id: "bm_2077", name: "ReelNest Media BM", accounts: 9, tokenExpireDays: 5, lastOk: "2026-09-20 10:09", lastError: "—" },
          { id: "bm_3341", name: "BingeOn Studio", accounts: 3, tokenExpireDays: 0.6, lastOk: "2026-09-19 22:41", lastError: "OAuthException #190 令牌已过期（2026-09-20 01:00 起）" }] },
  { code: "google", label: "Google Ads", status: "RESERVED", adapter: "Google Adapter（预留）", scopes: ["adwords"], tokenType: "Service Account", bms: [] },
  { code: "tiktok", label: "TikTok for Business", status: "RESERVED", adapter: "TikTok Adapter（预留）", scopes: ["ad.management"], tokenType: "长期令牌（预留）", bms: [] }
];
const ADH_CAPABILITY = [
  { cap: "三层结构（Campaign/AdSet/Ad）", meta: 1, google: 1, tiktok: 1 },
  { cap: "层级预算", meta: 1, google: 1, tiktok: 1 },
  { cap: "系统用户长期令牌", meta: 1, google: 0, tiktok: 0 },
  { cap: "自定义受众", meta: 1, google: 1, tiktok: 1 },
  { cap: "类似受众", meta: 1, google: 1, tiktok: 1 },
  { cap: "素材内容去重", meta: 1, google: 1, tiktok: 0 },
  { cap: "异步报表", meta: 1, google: 1, tiktok: 1 },
  { cap: "广告预览", meta: 1, google: 1, tiktok: 1 },
  { cap: "线索广告（Lead Ads）", meta: 1, google: 1, tiktok: 1 },
  { cap: "批量接口", meta: 1, google: 1, tiktok: 1 }
];

/* ===== 账户组 ===== */
const ADH_GROUPS = [
  { id: "g_us", name: "北美主力组", desc: "美国 + 加拿大，转化目标为主", accounts: 8, grants: ["admin", "optimizer", "analyst"], budgetCap: 4200 },
  { id: "g_eu", name: "欧洲拓展组", desc: "德法英西，短剧付费意愿较高，注意内容与广告合规", accounts: 6, grants: ["admin", "optimizer", "analyst", "designer"], budgetCap: 2600 },
  { id: "g_sea", name: "东南亚测试组", desc: "小预算多账户投放测试", accounts: 5, grants: ["admin", "optimizer"], budgetCap: 900 },
  { id: "g_app", name: "App 拉新组", desc: "应用安装链路，含再归因", accounts: 5, grants: ["admin", "optimizer", "analyst"], budgetCap: 3000 }
];

/* ===== 广告账户 ===== */
const ADH_ACCOUNTS = (function () {
  const raw = [
    ["act_1183042", "NovaDrama-US-付费转化", "g_us", "USD", "America/Los_Angeles", "ACTIVE", "LIVE", 18420.55, 60000, 1284.31, 0],
    ["act_1183043", "NovaDrama-US-试看召回", "g_us", "USD", "America/Los_Angeles", "ACTIVE", "LIVE", 9120.10, 40000, 742.88, 0],
    ["act_1183099", "NovaDrama-CA-新剧冷启", "g_us", "CAD", "America/Toronto", "ACTIVE", "LIVE", 4310.00, 20000, 386.42, 0],
    ["act_2201055", "ReelNest-DE-付费转化", "g_eu", "EUR", "Europe/Berlin", "ACTIVE", "LIVE", 11240.20, 50000, 968.09, 0],
    ["act_2201056", "ReelNest-France-新剧曝光", "g_eu", "EUR", "Europe/Paris", "PAUSED", "LIVE", 3320.75, 15000, 0, 0],
    ["act_2201088", "ReelNest-UK-付费转化", "g_eu", "GBP", "Europe/London", "ACTIVE", "LIVE", 1875.40, 30000, 611.27, 1],
    ["act_3310221", "BingeOn-SG-App拉新", "g_sea", "SGD", "Asia/Singapore", "ACTIVE", "SANDBOX", 2210.00, 8000, 205.14, 0],
    ["act_3310222", "BingeOn-MY-App拉新", "g_sea", "MYR", "Asia/Kuala_Lumpur", "ACTIVE", "SANDBOX", 940.30, 5000, 118.65, 0],
    ["act_3310230", "BingeOn-ID-新剧测试", "g_sea", "IDR", "Asia/Jakarta", "DISABLED", "SANDBOX", 0.00, 3000, 0, 1],
    ["act_4400901", "NovaDrama-App-拉新", "g_app", "USD", "Asia/Shanghai", "ACTIVE", "DEMO", 7640.90, 35000, 812.44, 0],
    ["act_4400902", "NovaDrama-App-再归因", "g_app", "USD", "Asia/Shanghai", "ACTIVE", "DEMO", 5210.00, 25000, 466.03, 0],
    ["act_4400920", "NovaDrama-App-留存实验", "g_app", "USD", "Asia/Shanghai", "ACTIVE", "DEMO", 3180.20, 12000, 233.71, 0],
    ["act_5512010", "ReelNest-ES-付费转化", "g_eu", "EUR", "Europe/Madrid", "ACTIVE", "LIVE", 6650.80, 22000, 512.36, 0],
    ["act_5512011", "ReelNest-IT-新剧测试", "g_eu", "EUR", "Europe/Rome", "ACTIVE", "LIVE", 1980.00, 9000, 176.42, 1],
    ["act_6613007", "BingeOn-TH-App拉新", "g_sea", "THB", "Asia/Bangkok", "ACTIVE", "SANDBOX", 1420.60, 6000, 131.88, 0],
    ["act_6613008", "BingeOn-VN-App拉新", "g_sea", "VND", "Asia/Ho_Chi_Minh", "ACTIVE", "SANDBOX", 880.40, 4000, 92.51, 0],
    ["act_7714088", "NovaDrama-US-素材A/B", "g_us", "USD", "America/New_York", "ACTIVE", "DEMO", 3920.15, 18000, 402.77, 0],
    ["act_7714089", "NovaDrama-US-版位实验", "g_us", "USD", "America/New_York", "ACTIVE", "DEMO", 2410.00, 14000, 288.14, 0]
  ];
  const healthPool = [
    { code: "OK", label: "健康", tone: "ok", issues: [] },
    { code: "BALANCE", label: "余额偏低", tone: "warn", issues: ["余额低于账户阈值 2000", "预计可支撑 1.6 天"] },
    { code: "RATE_LIMIT", label: "频繁限流", tone: "warn", issues: ["近 1 小时 429 比例 6.8%（阈值 5%）", "已自动降级调用频率"] },
    { code: "TOKEN", label: "授权失效", tone: "danger", issues: ["OAuthException #190 令牌过期", "该账户下 6 个待执行任务已置为 PAUSED"] },
    { code: "DISABLED", label: "账户停用", tone: "danger", issues: ["渠道侧账户状态 disabled", "已暂停该账户全部任务并告警"] },
    { code: "SPEND", label: "支出异常", tone: "warn", issues: ["当日消耗为日均 3.4 倍（阈值 3 倍）"] }
  ];
  const objPool = ["OUTCOME_SALES", "OUTCOME_TRAFFIC", "OUTCOME_APP_PROMOTION", "OUTCOME_AWARENESS"];
  return raw.map(function (r, i) {
    const hp = i === 8 ? healthPool[4] : (i === 5 ? healthPool[3] : (r[11] ? healthPool[1] : (i === 12 ? healthPool[2] : (i === 15 ? healthPool[5] : healthPool[0]))));
    return {
      id: i + 1, actId: r[0], name: r[1], group: r[2], currency: r[3], tz: r[4], status: r[5], source: r[6],
      balance: r[7], spendLimit: r[8], todaySpend: r[9], lag: !!r[11], health: hp,
      objective: objPool[i % objPool.length],
      bm: i < 6 ? "NovaDrama Media Ltd." : (i < 14 ? "ReelNest Media BM" : "BingeOn Studio"),
      lastSyncAt: r[11] ? "2026-09-19 21:30（同步未完成）" : "2026-09-20 08:00",
      objects: { campaigns: 4 + (i % 7), adsets: 9 + (i % 13), ads: 26 + (i % 41), creatives: 24 + (i % 37) },
      series: adhSeries(1000 + i, 60 + (i % 9) * 34, i % 3 === 0 ? 0.18 : (i % 3 === 1 ? -0.12 : 0.04))
    };
  });
})();
/* ===== 素材 ===== */
const ADH_ASSET_STATUS = {
  UPLOADED: { label: "已上传", tone: "neutral" }, VALIDATING: { label: "校验中", tone: "info" },
  READY: { label: "就绪", tone: "ok" }, INVALID: { label: "不合格", tone: "danger" },
  SUBMITTED: { label: "已提交渠道", tone: "info" }, IN_REVIEW: { label: "渠道审核中", tone: "warn" },
  APPROVED: { label: "已批准", tone: "ok" }, REJECTED: { label: "已拒审", tone: "danger" },
  ARCHIVED: { label: "已归档", tone: "neutral" }, TRANSCODE_FAILED: { label: "转码失败", tone: "danger" }
};
const ADH_REJECT_CATS = [
  { cat: "TEXT_OVERLAY", label: "文字占比过高", detail: "文字覆盖面积超过建议 20%" },
  { cat: "BRAND_CLAIM", label: "夸大宣称", detail: "含未经证明的效果承诺" },
  { cat: "PROHIBITED_CONTENT", label: "受限题材", detail: "涉及渠道政策禁止的题材或剧情内容" },
  { cat: "ADULT_CONTENT", label: "成人内容", detail: "画面或文案含性暗示" },
  { cat: "SENSATIONAL_CONTENT", label: "惊悚画面", detail: "含过度惊悚、血腥或煽动性剧情画面" }
];
const ADH_ASSETS = (function () {
  const names = ["US_付费_闪婚总裁_v3", "US_付费_替嫁新娘_v2", "EU_付费_狼人恋人_v1", "EU_品牌_复仇千金_v4",
    "SEA_拉新_末日余生_v2", "SEA_拉新_逆袭人生_v1", "APP_拉新_短剧精选_v5", "APP_再归因_老剧迷召回_v2",
    "US_再营销_未解锁剧集_v3", "EU_付费_古堡谜情_v1", "US_付费_甜宠恋综_v6", "SEA_拉新_校园心动_v3",
    "APP_留存_每日追剧_v1", "US_付费_萌宝归来_v2", "EU_付费_禁忌之恋_v1", "US_付费_龙王归来_v4",
    "SEA_拉新_狼人学院_v2", "APP_拉新_短剧社区_v3", "US_品牌_新剧上线_v2", "EU_付费_萌宝寻亲_v1",
    "US_付费_替身千金_v5", "SEA_拉新_重生复仇_v1", "APP_再归因_会员召回_v2", "US_付费_末日围城_v1",
    "EU_品牌_追剧季_v3", "SEA_拉新_霸总来袭_v4", "US_素材A/B_钩子测试_v1", "APP_留存_剧集榜单_v2"];
  const ratios = ["1:1", "4:5", "9:16", "16:9"];
  const statusSeq = ["APPROVED","APPROVED","IN_REVIEW","APPROVED","REJECTED","APPROVED","READY","APPROVED","APPROVED","IN_REVIEW",
    "APPROVED","REJECTED","APPROVED","APPROVED","VALIDATING","APPROVED","APPROVED","IN_REVIEW","APPROVED","APPROVED",
    "APPROVED","INVALID","APPROVED","APPROVED","APPROVED","REJECTED","APPROVED","ARCHIVED"];
  return names.map(function (n, i) {
    const isVideo = i % 3 !== 1;
    const st = statusSeq[i];
    const seed = 5000 + i * 7;
    const base = adhSeries(seed, 22 + (i % 7) * 9, i % 4 === 0 ? 0.22 : (i % 5 === 0 ? -0.3 : 0.05));
    const agg = adhAgg(base);
    const reject = st === "REJECTED" ? ADH_REJECT_CATS[i % ADH_REJECT_CATS.length] : null;
    return {
      id: "AS-" + String(2601 + i).padStart(4, "0"), name: n,
      type: isVideo ? "VIDEO" : "IMAGE", ratio: ratios[i % 4],
      w: [1080, 1080, 1080, 1920][i % 4], h: [1080, 1350, 1920, 1080][i % 4],
      durationMs: isVideo ? 8000 + (i % 6) * 4000 : 0,
      sizeMB: isVideo ? (6.4 + (i % 9) * 3.2) : (0.8 + (i % 5) * 0.6),
      status: st, tags: [["霸总","复仇","甜宠","悬疑","重生","狼人","萌宝"][i % 7], ["A/B","主打","长尾"][i % 3]],
      version: "v" + (1 + (i % 5)), uploadedBy: ["苏晴", "林可", "周振业"][i % 3],
      uploadedAt: "2026-09-" + String(3 + (i % 16)).padStart(2, "0") + " " + String(9 + (i % 9)).padStart(2, "0") + ":" + String(10 + i % 49).padStart(2, "0"),
      hash: "sha256:" + (0x1000000 + i * 99991).toString(16).slice(0, 12) + "…",
      reject: reject, rejectRaw: reject ? "Ad creative rejected: " + reject.detail + " (meta_policy_" + (2100 + i) + ")" : "",
      reviewTurns: 1 + (i % 3), submittedAt: st === "READY" || st === "VALIDATING" || st === "INVALID" || st === "UPLOADED" ? "—" : "2026-09-" + String(15 + (i % 5)).padStart(2, "0") + " 14:0" + (i % 9),
      agg: agg, series: base, usedBy: 1 + (i % 6), variants: ["ORIGINAL"].concat(i % 3 === 0 ? ["CROP 1:1"] : [], i % 4 === 0 ? ["CROP 9:16"] : [], isVideo ? ["TRANSCODE 720p"] : []),
      durability: i % 6 === 0 ? "萎靡" : (i % 4 === 0 ? "爬坡" : "稳定")
    };
  });
})();

/* ===== 受众 ===== */
const ADH_AUDIENCES = [
  { id: "AU-01", name: "25-34 女性 · 言情短剧兴趣", type: "SAVED", size: 2480000, accountGroup: "北美主力组" },
  { id: "AU-02", name: "近 30 天试看未付费", type: "CUSTOM", size: 128400, accountGroup: "北美主力组" },
  { id: "AU-03", name: "Lookalike 1% · 高价值付费用户", type: "LOOKALIKE", size: 3120000, accountGroup: "北美主力组" },
  { id: "AU-04", name: "35-44 女性 · 家庭伦理剧兴趣", type: "SAVED", size: 1870000, accountGroup: "欧洲拓展组" },
  { id: "AU-05", name: "App 沉默 30 天用户", type: "CUSTOM", size: 412000, accountGroup: "App 拉新组" },
  { id: "AU-06", name: "18-24 男女 · 悬疑/青春短剧兴趣", type: "SAVED", size: 2960000, accountGroup: "东南亚测试组" }
];

/* ===== 命名规则 ===== */
const ADH_NAMING_FIELDS = [
  { key: "渠道", kind: "const", values: ["meta", "google", "tiktok"], sample: "meta" },
  { key: "目标", kind: "objective", values: ["conversion", "traffic", "awareness", "app_install"], sample: "conversion" },
  { key: "受众", kind: "input", values: ["25-34-female", "18-24-mix", "lal1-paid"], sample: "25-34-female" },
  { key: "素材类型", kind: "asset", values: ["video", "image", "carousel"], sample: "video" },
  { key: "日期", kind: "date", values: ["yyyyMMdd", "yyyy-MM-dd"], sample: "20260920" },
  { key: "序号:3", kind: "seq", values: [], sample: "001" },
  { key: "账户", kind: "context", values: ["{{account.name}}"], sample: "NovaDrama-US-付费转化" },
  { key: "版本", kind: "input", values: ["v1", "v2"], sample: "v3" }
];
const ADH_NAMING_RULES = [
  { id: "NR-01", name: "标准三层命名", pattern: ["渠道", "目标", "受众", "素材类型", "日期", "序号:3"], sep: "_",
    scope: "系统模板", maxLength: 120, dupStrategy: "APPEND_SEQ", version: "v3", refTemplates: 4,
    example: "meta_conversion_25-34-female_video_20260920_001", updatedAt: "2026-09-18 16:20" },
  { id: "NR-02", name: "素材测试命名（含版本）", pattern: ["渠道", "目标", "受众", "素材类型", "版本", "日期", "序号:3"], sep: "_",
    scope: "个人模板", maxLength: 120, dupStrategy: "APPEND_SEQ", version: "v2", refTemplates: 1,
    example: "meta_conversion_25-34-female_video_v3_20260920_001", updatedAt: "2026-09-15 10:02" },
  { id: "NR-03", name: "品牌词曝光命名", pattern: ["渠道", "目标", "受众", "日期", "序号:3"], sep: "-",
    scope: "共享模板", maxLength: 120, dupStrategy: "BLOCK", version: "v1", refTemplates: 0,
    example: "meta-awareness-18-24-mix-20260920-001", updatedAt: "2026-09-11 09:44" }
];

/* ===== 结构模板 ===== */
const ADH_TEMPLATES = [
  { id: "TPL-01", name: "转化 · 单账户三层标准", scope: "SYSTEM", channel: "meta", version: "v4", namingRuleId: "NR-01",
    refTasks: 38, updatedAt: "2026-09-18 16:24", desc: "系统内置，不可修改",
    vars: [
      { name: "audience", type: "select", def: "25-34 女性 · 言情短剧兴趣", desc: "AdSet 受众" },
      { name: "budget", type: "number", def: "120", desc: "AdSet 日预算（USD）" },
      { name: "landingUrl", type: "text", def: "https://novadrama.example.com/episodes?utm_source={{渠道}}", desc: "剧集落地页 URL，支持 UTM 变量" },
      { name: "bidStrategy", type: "select", def: "LOWEST_COST_WITHOUT_CAP", desc: "出价策略" }
    ],
    nodes: [
      { level: "CAMPAIGN", fields: [["名称", "{{渠道}}_{{目标}}_{{日期}}_camp"], ["目标 objective", "OUTCOME_SALES"], ["预算优化开关", "CBO 关闭"], ["状态", "PAUSED"]] },
      { level: "ADSET", fields: [["名称", "{{渠道}}_{{目标}}_{{受众}}_{{日期}}_{{序号:3}}"], ["受众（地域/年龄/性别/兴趣）", "{{audience}}"], ["日预算", "{{budget}} USD"], ["出价策略", "{{bidStrategy}}"], ["排期", "2026-09-20 → 长期"], ["版位", "自动版位（排除 Audience Network）"], ["优化目标", "OFFSITE_CONVERSIONS / PURCHASE"]] },
      { level: "AD", fields: [["名称", "{{渠道}}_{{目标}}_{{受众}}_{{素材类型}}_{{日期}}_{{序号:3}}"], ["素材槽位", "{{asset.tag}} · 每 AdSet 挂 {{asset.count}} 条"], ["落地页 URL", "{{landingUrl}}"], ["文案", "前 3 集免费，立即追更"], ["CTA", "WATCH_MORE"], ["追踪参数", "utm_source=meta&utm_medium=paid&utm_campaign={campaign_id}&click_id=__CLICK_ID__"]] }
    ]},
  { id: "TPL-02", name: "App 拉新 · 多受众组合", scope: "SHARED", channel: "meta", version: "v2", namingRuleId: "NR-01",
    refTasks: 17, updatedAt: "2026-09-16 11:08", desc: "团队共享，适用于装链路",
    vars: [
      { name: "audience", type: "multi", def: "18-24 男女 · 悬疑/青春短剧兴趣 / App 沉默 30 天用户", desc: "支持多选 → 笛卡尔积" },
      { name: "budget", type: "number", def: "60", desc: "AdSet 日预算（USD）" },
      { name: "landingUrl", type: "text", def: "https://bingeon.example.com/app", desc: "短剧 App 下载页" }
    ],
    nodes: [
      { level: "CAMPAIGN", fields: [["名称", "{{渠道}}_app_install_{{日期}}"], ["目标 objective", "OUTCOME_APP_PROMOTION"], ["状态", "PAUSED"]] },
      { level: "ADSET", fields: [["名称", "{{渠道}}_app_install_{{受众}}_{{日期}}_{{序号:3}}"], ["受众", "{{audience}}"], ["日预算", "{{budget}} USD"], ["优化目标", "APP_INSTALL"], ["排期", "2026-09-20 → 长期"]] },
      { level: "AD", fields: [["名称", "{{渠道}}_app_install_{{受众}}_{{素材类型}}_{{日期}}_{{序号:3}}"], ["素材槽位", "{{asset.tag}}"], ["落地页 URL", "{{landingUrl}}"], ["CTA", "INSTALL_NOW"]] }
    ]},
  { id: "TPL-03", name: "再营销 · 试看未付费召回", scope: "PERSONAL", channel: "meta", version: "v1", namingRuleId: "NR-02",
    refTasks: 9, updatedAt: "2026-09-14 15:40", desc: "林可个人模板",
    vars: [
      { name: "audience", type: "select", def: "近 30 天试看未付费", desc: "自定义受众" },
      { name: "budget", type: "number", def: "80", desc: "AdSet 日预算（USD）" },
      { name: "landingUrl", type: "text", def: "https://novadrama.example.com/unlock", desc: "剧集解锁页" }
    ],
    nodes: [
      { level: "CAMPAIGN", fields: [["名称", "{{渠道}}_retarget_{{日期}}"], ["目标 objective", "OUTCOME_SALES"], ["状态", "PAUSED"]] },
      { level: "ADSET", fields: [["名称", "{{渠道}}_retarget_{{受众}}_{{日期}}_{{序号:3}}"], ["受众", "{{audience}}"], ["日预算", "{{budget}} USD"], ["优化目标", "OFFSITE_CONVERSIONS / PURCHASE"]] },
      { level: "AD", fields: [["名称", "{{渠道}}_retarget_{{受众}}_{{素材类型}}_{{版本}}_{{日期}}_{{序号:3}}"], ["素材槽位", "{{asset.tag}}"], ["文案", "还差一集就看完了，立即解锁"]] }
    ]},
  { id: "TPL-04", name: "品牌曝光 · 低成本铺量", scope: "SHARED", channel: "meta", version: "v3", namingRuleId: "NR-03",
    refTasks: 6, updatedAt: "2026-09-12 09:15", desc: "品牌向，CPM 优先",
    vars: [
      { name: "audience", type: "multi", def: "35-44 女性 · 家庭伦理剧兴趣 / 18-24 男女 · 悬疑/青春短剧兴趣", desc: "多受众" },
      { name: "budget", type: "number", def: "45", desc: "AdSet 日预算（USD）" },
      { name: "landingUrl", type: "text", def: "https://reelnest.example.com/new-release", desc: "新剧上线页" }
    ],
    nodes: [
      { level: "CAMPAIGN", fields: [["名称", "{{渠道}}-awareness-{{日期}}"], ["目标 objective", "OUTCOME_AWARENESS"], ["状态", "PAUSED"]] },
      { level: "ADSET", fields: [["名称", "{{渠道}}-awareness-{{受众}}-{{日期}}-{{序号:3}}"], ["受众", "{{audience}}"], ["日预算", "{{budget}} USD"], ["优化目标", "REACH"]] },
      { level: "AD", fields: [["名称", "{{渠道}}-awareness-{{受众}}-{{素材类型}}-{{日期}}-{{序号:3}}"], ["素材槽位", "{{asset.tag}}"]] }
    ]},
  { id: "TPL-05", name: "测试 · 极简草稿（未启用）", scope: "PERSONAL", channel: "meta", version: "v1", namingRuleId: "NR-01",
    refTasks: 0, updatedAt: "2026-09-19 20:31", desc: "存在未定义变量，保存被拦截",
    vars: [{ name: "audience", type: "select", def: "", desc: "未填写默认值" }],
    invalid: "变量 {{budget}} 未定义；命名规则可解析校验未通过",
    nodes: [
      { level: "CAMPAIGN", fields: [["名称", "{{渠道}}_{{目标}}_{{日期}}_camp"], ["目标 objective", "OUTCOME_SALES"]] },
      { level: "ADSET", fields: [["名称", "{{渠道}}_x_{{受众}}"], ["日预算", "{{budget}} USD"]] },
      { level: "AD", fields: [["名称", "{{渠道}}_ad_{{素材类型}}"]] }
    ]}
];
/* ===== 投放对象树（统一对象模型 UOM） ===== */
const ADH_TREE = (function () {
  const audits = ["25-34-female", "18-24-mix", "lal1-paid", "35-44-family-drama", "retarget-unlock"];
  const types = ["video", "image", "carousel"];
  const out = [];
  const accIdx = [0, 1, 3, 6, 9];
  accIdx.forEach(function (ai, k) {
    const acc = ADH_ACCOUNTS[ai];
    const cCount = 2 + (k % 2);
    const camps = [];
    for (let c = 0; c < cCount; c++) {
      const aud = audits[(k + c) % audits.length];
      const camp = {
        id: "C" + ai + c + "1", level: "CAMPAIGN", name: "meta_" + (acc.objective === "OUTCOME_APP_PROMOTION" ? "app_install" : "conversion") + "_2026091" + (c + 1) + "_camp",
        externalId: "1202" + (100000 + ai * 137 + c * 11), status: c === 1 && k === 1 ? "PAUSED" : "ACTIVE",
        source: c === 2 ? "EXTERNAL" : "SYSTEM", objective: acc.objective,
        budget: null, budgetType: "DAILY", bidStrategy: "LOWEST_COST_WITHOUT_CAP", bid: null,
        schedule: "2026-09-12 → 长期", spend: Math.round(acc.todaySpend * (0.3 + c * 0.12) * 100) / 100,
        hasData: true, taskId: "T-2026091" + (7 - k) + "-0", adsets: []
      };
      const aCount = 2 + ((c + k) % 2);
      for (let a = 0; a < aCount; a++) {
        const as = {
          id: camp.id + "-A" + a, level: "ADSET", name: "meta_conversion_" + aud + "_2026091" + (c + 1) + "_" + String(a + 1).padStart(3, "0"),
          externalId: "1202" + (200000 + ai * 311 + c * 17 + a), status: a === 1 ? "PAUSED" : "ACTIVE",
          source: "SYSTEM", objective: "OFFSITE_CONVERSIONS", budget: 60 + a * 40, budgetType: "DAILY",
          bidStrategy: a % 2 ? "LOWEST_COST_WITH_BID_CAP" : "LOWEST_COST_WITHOUT_CAP", bid: a % 2 ? 4.2 : null,
          schedule: "2026-09-12 → 长期", audience: aud,
          spend: Math.round(acc.todaySpend * (0.18 + a * 0.06) * 100) / 100,
          hasData: !(k === 3 && c === 1 && a === 1), taskId: "T-2026091" + (7 - k) + "-0", ads: []
        };
        const dCount = 3 + (a % 2);
        for (let d = 0; d < dCount; d++) {
          const asset = ADH_ASSETS[(ai * 3 + c * 2 + a + d) % ADH_ASSETS.length];
          as.ads.push({
            id: as.id + "-D" + d, level: "AD", name: "meta_conversion_" + aud + "_" + types[d % 3] + "_2026091" + (c + 1) + "_" + String(a + 1).padStart(3, "0") + String(d + 1).padStart(2, "0"),
            externalId: "1202" + (300000 + ai * 97 + c * 13 + a * 5 + d), status: d === 2 && a === 1 ? "PAUSED" : "ACTIVE",
            source: d === 1 && a === 0 ? "EXTERNAL" : "SYSTEM", assetId: asset.id, assetName: asset.name,
            landingUrl: "https://novadrama.example.com/episodes?utm_source=meta&click_id=__CLICK_ID__",
            spend: Math.round(acc.todaySpend * (0.06 + d * 0.02) * 100) / 100,
            hasData: !(k === 3 && c === 1 && a === 1 && d < 2), taskId: "T-2026091" + (7 - k) + "-0",
            ctr: Math.round((0.008 + (d % 4) * 0.003) * 10000) / 10000
          });
        }
        camp.adsets.push(as);
      }
      camps.push(camp);
    }
    out.push({ accountId: acc.id, accountName: acc.name, actId: acc.actId, campaigns: camps });
  });
  return out;
})();

/* ===== 错误分类字典（6.6.3） ===== */
const ADH_ERROR_DICT = [
  { cat: "AUTH", label: "鉴权失败", retry: 0, sample: "令牌过期、权限不足", advice: "需人工处理授权（重新授权后一键重跑）" },
  { cat: "RATE_LIMIT", label: "渠道限流", retry: 1, sample: "HTTP 429 / 用户请求过于频繁", advice: "指数退避自动重试，最大 15 分钟、5 次" },
  { cat: "NETWORK", label: "网络异常", retry: 1, sample: "超时、连接中断", advice: "先 tree.pull 回查渠道侧再决定重试" },
  { cat: "VALIDATION", label: "参数不合法", retry: 0, sample: "参数不合法、素材规格不符", advice: "需修改配置后重新提交" },
  { cat: "POLICY", label: "政策限制", retry: 0, sample: "广告政策、受众受限、特殊广告类别", advice: "需人工处理，参考渠道政策说明" },
  { cat: "BUSINESS", label: "业务条件不满足", retry: 0, sample: "余额不足、受众规模过小、预算低于最低值", advice: "需人工处理（充值 / 放宽受众 / 提高预算）" },
  { cat: "INTERNAL", label: "系统异常", retry: 1, sample: "内部服务异常", advice: "自动重试，上限 3 次" }
];

/* ===== 批量任务 ===== */
const ADH_TASKS = [
  { id: "T-20260920-016", type: "BATCH_CREATE", title: "东南亚测试组 · 2 账户 × 3 受众 × 4 素材",
    status: "PARTIAL_FAILED", progress: 100, total: 24, success: 19, fail: 5, shardTotal: 2, shardDone: 2,
    createdBy: "林可", channel: "meta", startedAt: "2026-09-20 09:40", duration: "9 分 12 秒",
    template: "TPL-03", accounts: 2, idemKey: "IDEM-5e77-20260920-016",
    errorSummary: { RATE_LIMIT: 2, NETWORK: 1, VALIDATION: 1, BUSINESS: 1 }, rollbackable: 1,
    items: [
      { index: 3, target: "act_3310221 / AdSet", combination: "audience=sea-suspense-male, budget=12", status: "FAILED", externalId: "—", errorCategory: "RATE_LIMIT", errorCode: "80004", errorMessage: "User request limit reached (HTTP 429, retry after 120s)", retry: 2, advice: "限流类错误可指数退避自动重试（最大 15 分钟、5 次）" },
      { index: 8, target: "act_3310221 / Ad", combination: "audience=sea-suspense-male, asset=SEA_拉新_末日余生_v2", status: "FAILED", externalId: "—", errorCategory: "RATE_LIMIT", errorCode: "80004", errorMessage: "User request limit reached (HTTP 429)", retry: 5, advice: "已达最大重试 5 次，需人工确认后再重试（BR-64）" },
      { index: 11, target: "act_3310221 / Ad", combination: "audience=sea-lal1-paid, asset=SEA_拉新_逆袭人生_v1", status: "FAILED", externalId: "—", errorCategory: "NETWORK", errorCode: "LOCAL_TIMEOUT", errorMessage: "请求超时（60s），渠道侧执行结果未知", retry: 1, advice: "先 tree.pull 回查渠道侧是否已创建，命中则标记成功（BR-52）" },
      { index: 17, target: "act_3310222 / AdSet", combination: "audience=sea-retarget-unlock, budget=10", status: "FAILED", externalId: "—", errorCategory: "VALIDATION", errorCode: "LOCAL_NAME_DUP", errorMessage: "同账户内已存在同名对象（SEA_拉新_末日余生_v2 · AdSet）", retry: 0, advice: "按 BR-41 自动追加序号后重试" },
      { index: 21, target: "act_3310222 / Ad", combination: "audience=sea-retarget-unlock, asset=SEA_再营销_未解锁剧集_v1", status: "FAILED", externalId: "—", errorCategory: "BUSINESS", errorCode: "2635011", errorMessage: "Audience too small: 812 people (minimum 1,000)", retry: 0, advice: "放宽受众或改用相似受众后重试" },
      { index: 1, target: "act_3310221 / Campaign", combination: "合并复用 Campaign", status: "SUCCESS", externalId: "1202400011", errorCategory: "", errorCode: "", errorMessage: "", retry: 0 }
    ]},
  { id: "T-20260920-014", type: "BATCH_CREATE", title: "3 账户 × 4 受众 × 5 素材 组合创建",
    status: "PARTIAL_FAILED", progress: 100, total: 60, success: 54, fail: 6, shardTotal: 4, shardDone: 4,
    createdBy: "林可", channel: "meta", startedAt: "2026-09-20 09:12", duration: "6 分 41 秒",
    template: "TPL-01", accounts: 3, idemKey: "IDEM-9f2c-20260920-014",
    errorSummary: { BUSINESS: 4, POLICY: 2 }, rollbackable: 1,
    items: [
      { index: 7, target: "act_1183042 / AdSet", combination: "audience=25-34-female, asset=US_付费_闪婚总裁_v3", status: "FAILED", externalId: "—", errorCategory: "BUSINESS", errorCode: "2446415", errorMessage: "Ad set budget must be at least $5.00 per day", retry: 0, advice: "日预算低于渠道最低值，调整为 ≥ 5 USD" },
      { index: 12, target: "act_1183042 / Ad", combination: "audience=18-24-mix, asset=US_素材A/B_钩子测试_v1", status: "FAILED", externalId: "—", errorCategory: "POLICY", errorCode: "1885189", errorMessage: "Ad creative rejected: text overlay exceeds recommended area", retry: 0, advice: "素材文字占比过高，替换素材后重试" },
      { index: 23, target: "act_1183043 / AdSet", combination: "audience=lal1-paid, budget=3", status: "FAILED", externalId: "—", errorCategory: "BUSINESS", errorCode: "2446415", errorMessage: "Ad set budget must be at least $5.00 per day", retry: 0, advice: "日预算低于渠道最低值" },
      { index: 31, target: "act_1183043 / Ad", combination: "audience=retarget-unlock, asset=US_再营销_未解锁剧集_v3", status: "FAILED", externalId: "—", errorCategory: "POLICY", errorCode: "1885189", errorMessage: "Ad creative rejected: sensational imagery not allowed", retry: 0, advice: "替换含过度惊悚或血腥画面的素材" },
      { index: 44, target: "act_4400901 / AdSet", combination: "audience=18-24-mix, budget=2", status: "FAILED", externalId: "—", errorCategory: "BUSINESS", errorCode: "2446415", errorMessage: "Ad set budget must be at least $5.00 per day", retry: 0, advice: "日预算低于渠道最低值" },
      { index: 52, target: "act_4400901 / Ad", combination: "audience=25-34-female, asset=APP_拉新_短视频_v5", status: "FAILED", externalId: "—", errorCategory: "BUSINESS", errorCode: "2635001", errorMessage: "Ad account spending limit reached for the day", retry: 2, advice: "账户当日消费限额触顶，次日自动重试" },
      { index: 1, target: "act_1183042 / Campaign", combination: "合并复用 Campaign", status: "SUCCESS", externalId: "1202100001", errorCategory: "", errorCode: "", errorMessage: "", retry: 0 }
    ]},
  { id: "T-20260920-013", type: "BATCH_UPDATE", title: "批量暂停低效 Ad（规则命中）",
    status: "SUCCEEDED", progress: 100, total: 20, success: 20, fail: 0, shardTotal: 1, shardDone: 1,
    createdBy: "系统（规则 R-01 低效计划止损）", channel: "meta", startedAt: "2026-09-20 09:00", duration: "48 秒",
    template: "—", accounts: 4, idemKey: "IDEM-7a10-rule-r01", errorSummary: {}, rollbackable: 1,
    items: [{ index: 1, target: "act_1183042 / Ad", combination: "规则命中：近 3 天 ROAS 0.68、消耗 82.4 USD", status: "SUCCESS", externalId: "1202300011", errorCategory: "", errorCode: "", errorMessage: "", retry: 0 }] },
  { id: "T-20260920-012", type: "BATCH_UPLOAD", title: "素材批量上传 128 个文件",
    status: "SUCCEEDED", progress: 100, total: 128, success: 126, fail: 2, shardTotal: 3, shardDone: 3,
    createdBy: "苏晴", channel: "meta", startedAt: "2026-09-20 08:41", duration: "4 分 12 秒",
    template: "—", accounts: 6, idemKey: "IDEM-3c8e-upload-128", errorSummary: { VALIDATION: 2 }, rollbackable: 0,
    items: [
      { index: 19, target: "文件", combination: "EU_品牌_复仇千金_v4.mp4（4.6 GB）", status: "FAILED", externalId: "—", errorCategory: "VALIDATION", errorCode: "LOCAL_SIZE", errorMessage: "单文件超过渠道规格上限（视频 ≤ 4GB）", retry: 0, advice: "压缩后重新上传" },
      { index: 88, target: "文件", combination: "US_付费_替身千金_v5.psd", status: "FAILED", externalId: "—", errorCategory: "VALIDATION", errorCode: "LOCAL_FORMAT", errorMessage: "格式不在允许列表（JPG/PNG/GIF/WEBP/MP4/MOV）", retry: 0, advice: "导出为 PNG/JPG 后重新上传" }
    ]},
  { id: "T-20260920-011", type: "SYNC", title: "账户对象树增量同步（6h）",
    status: "SUCCEEDED", progress: 100, total: 18, success: 18, fail: 0, shardTotal: 2, shardDone: 2,
    createdBy: "调度器", channel: "meta", startedAt: "2026-09-20 08:00", duration: "2 分 03 秒",
    template: "—", accounts: 18, idemKey: "SYNC-20260920-0800", errorSummary: {}, rollbackable: 0, items: [] },
  { id: "T-20260920-010", type: "BATCH_CREATE", title: "App 拉新 · 2 账户 × 3 受众 × 4 素材",
    status: "PAUSED", progress: 46, total: 24, success: 11, fail: 0, shardTotal: 2, shardDone: 1,
    createdBy: "林可", channel: "meta", startedAt: "2026-09-20 07:55", duration: "已挂起 2 小时 29 分",
    template: "TPL-02", accounts: 2, idemKey: "IDEM-b41d-20260920-010", errorSummary: { AUTH: 0 }, rollbackable: 1,
    pauseReason: "act_3310230 所属 BM（BingeOn Studio）令牌已失效 → 按 BR-09 该渠道下依赖任务进入 PAUSED 而非失败，恢复授权后可一键重跑",
    items: [] },
  { id: "T-20260919-009", type: "BATCH_CREATE", title: "欧洲转化 · 2 账户 × 3 受众 × 6 素材",
    status: "SUCCEEDED", progress: 100, total: 36, success: 36, fail: 0, shardTotal: 2, shardDone: 2,
    createdBy: "林可", channel: "meta", startedAt: "2026-09-19 20:10", duration: "7 分 22 秒",
    template: "TPL-01", accounts: 2, idemKey: "IDEM-5502-20260919-009", errorSummary: {}, rollbackable: 1, items: [] },
  { id: "T-20260919-008", type: "ROLLBACK", title: "回滚 T-20260919-007 全部对象",
    status: "ROLLBACK_FAILED", progress: 100, total: 12, success: 9, fail: 3, shardTotal: 1, shardDone: 1,
    createdBy: "林可", channel: "meta", startedAt: "2026-09-19 18:02", duration: "1 分 39 秒",
    template: "—", accounts: 1, idemKey: "ROLLBACK-20260919-007", errorSummary: { BUSINESS: 3 }, rollbackable: 0,
    items: [
      { index: 4, target: "act_2201055 / Ad", combination: "已有消耗 42.18 USD", status: "FAILED", externalId: "—", errorCategory: "BUSINESS", errorCode: "LOCAL_HAS_SPEND", errorMessage: "对象已有投放数据，不可删除，仅可暂停/归档（BR-53）", retry: 0, advice: "改为暂停或归档" }
    ]},
  { id: "T-20260919-007", type: "BATCH_CREATE", title: "实测重名冲突场景",
    status: "FAILED", progress: 100, total: 8, success: 0, fail: 8, shardTotal: 1, shardDone: 1,
    createdBy: "林可", channel: "meta", startedAt: "2026-09-19 17:40", duration: "22 秒",
    template: "TPL-05", accounts: 1, idemKey: "IDEM-0001-20260919-007", errorSummary: { VALIDATION: 8 }, rollbackable: 0, items: [] },
  { id: "T-20260919-006", type: "BATCH_UPDATE", title: "批量调整 100 个 AdSet 预算 +20%",
    status: "SUCCEEDED", progress: 100, total: 100, success: 97, fail: 3, shardTotal: 3, shardDone: 3,
    createdBy: "林可", channel: "meta", startedAt: "2026-09-19 15:20", duration: "2 分 51 秒",
    template: "—", accounts: 5, idemKey: "IDEM-9a11-20260919-006", errorSummary: { BUSINESS: 3 }, rollbackable: 1, items: [] },
  { id: "T-20260918-005", type: "BATCH_CREATE", title: "东南亚装机 · 1 账户 × 2 受众 × 4 素材",
    status: "SUCCEEDED", progress: 100, total: 8, success: 8, fail: 0, shardTotal: 1, shardDone: 1,
    createdBy: "周振业", channel: "meta", startedAt: "2026-09-18 16:05", duration: "1 分 12 秒",
    template: "TPL-02", accounts: 1, idemKey: "IDEM-2201-20260918-005", errorSummary: {}, rollbackable: 1, items: [] },
  { id: "T-20260918-004", type: "BATCH_UPLOAD", title: "素材批量上传 42 个文件",
    status: "SUCCEEDED", progress: 100, total: 42, success: 42, fail: 0, shardTotal: 1, shardDone: 1,
    createdBy: "苏晴", channel: "meta", startedAt: "2026-09-18 11:22", duration: "1 分 58 秒",
    template: "—", accounts: 3, idemKey: "IDEM-7712-upload-42", errorSummary: {}, rollbackable: 0, items: [] }
];
/* ===== 批量计划审核台账 ===== */
const ADH_PLAN_LEDGER = [
  { id: "BP-20260920-018", name: "东南亚测试组 · 新剧拉新", status: "PENDING", execution: "QUEUED",
    channel: "meta", template: "TPL-03", submitter: "林可", submittedAt: "2026-09-20 10:42",
    reviewer: "待分配", reviewedAt: "—", reviewNote: "等待管理员审核", reviewRound: 1,
    accounts: 2, objects: 24, dailyBudget: 360, risk: "低" },
  { id: "BP-20260920-017", name: "北美再营销 · 试看未付费召回", status: "APPROVED", execution: "RUNNING",
    channel: "meta", template: "TPL-03", submitter: "林可", submittedAt: "2026-09-20 09:58",
    reviewer: "周振业", reviewedAt: "2026-09-20 10:18", reviewNote: "通过：受众与预算符合账户规范", reviewRound: 1,
    accounts: 3, objects: 60, dailyBudget: 820, risk: "中" },
  { id: "BP-20260920-016", name: "欧洲品牌曝光 · 新剧上线", status: "REVIEWING", execution: "QUEUED",
    channel: "meta", template: "TPL-04", submitter: "苏晴", submittedAt: "2026-09-20 09:31",
    reviewer: "周振业", reviewedAt: "—", reviewNote: "审核中：核对相似受众规模与素材授权", reviewRound: 2,
    accounts: 2, objects: 18, dailyBudget: 540, risk: "中" },
  { id: "BP-20260920-015", name: "东南亚 Reels · 短剧 App 拉新", status: "REJECTED", execution: "BLOCKED",
    channel: "meta", template: "TPL-02", submitter: "林可", submittedAt: "2026-09-20 09:05",
    reviewer: "周振业", reviewedAt: "2026-09-20 09:22", reviewNote: "驳回：受众规模 812 小于最低 1,000，请放宽后重提", reviewRound: 1,
    accounts: 2, objects: 24, dailyBudget: 280, risk: "高" },
  { id: "BP-20260920-014", name: "北美转化 · 闪婚总裁主推", status: "APPROVED", execution: "SUCCEEDED",
    channel: "meta", template: "TPL-01", submitter: "林可", submittedAt: "2026-09-20 08:46",
    reviewer: "周振业", reviewedAt: "2026-09-20 09:02", reviewNote: "通过：常规转化结构，预算与命名合规", reviewRound: 1,
    accounts: 3, objects: 45, dailyBudget: 900, risk: "低" },
  { id: "BP-20260919-013", name: "欧洲低价测试 · 悬疑短剧", status: "REJECTED", execution: "BLOCKED",
    channel: "meta", template: "TPL-01", submitter: "苏晴", submittedAt: "2026-09-19 18:12",
    reviewer: "周振业", reviewedAt: "2026-09-19 18:40", reviewNote: "驳回：AdSet 日预算 3 USD 低于渠道最低值 5 USD", reviewRound: 1,
    accounts: 1, objects: 8, dailyBudget: 24, risk: "高" },
  { id: "BP-20260919-012", name: "App 拉新 · 东南亚短剧", status: "APPROVED", execution: "PARTIAL_FAILED",
    channel: "meta", template: "TPL-02", submitter: "林可", submittedAt: "2026-09-19 16:25",
    reviewer: "周振业", reviewedAt: "2026-09-19 16:41", reviewNote: "通过：2 个账户继续执行，失败对象由任务中心重试", reviewRound: 2,
    accounts: 4, objects: 72, dailyBudget: 1280, risk: "中" },
  { id: "BP-20260919-011", name: "北美续费 · 会员日预热", status: "DRAFT", execution: "NOT_SUBMITTED",
    channel: "meta", template: "TPL-03", submitter: "苏晴", submittedAt: "—",
    reviewer: "—", reviewedAt: "—", reviewNote: "草稿未提交审核", reviewRound: 0,
    accounts: 2, objects: 16, dailyBudget: 320, risk: "低" },
  { id: "BP-20260919-010", name: "欧洲再营销 · 已付费用户排除", status: "APPROVED", execution: "PAUSED",
    channel: "meta", template: "TPL-03", submitter: "林可", submittedAt: "2026-09-19 11:08",
    reviewer: "周振业", reviewedAt: "2026-09-19 11:26", reviewNote: "通过：按负责人要求暂停执行，重新启用前无需复审", reviewRound: 1,
    accounts: 2, objects: 20, dailyBudget: 460, risk: "低" },
  { id: "BP-20260918-009", name: "东南亚测试组 · 受众扩展", status: "PENDING", execution: "QUEUED",
    channel: "meta", template: "TPL-02", submitter: "苏晴", submittedAt: "2026-09-18 17:35",
    reviewer: "待分配", reviewedAt: "—", reviewNote: "等待管理员审核", reviewRound: 1,
    accounts: 2, objects: 24, dailyBudget: 280, risk: "中" }
];
/* ===== 自动化规则 ===== */
const ADH_RULES = [
  { id: "R-01", name: "低效计划止损", status: "AUTO", priority: 1, owner: "林可", createdAt: "2026-09-12 10:20",
    trigger: { type: "CRON", expr: "0 * * * *", label: "每小时" },
    scope: { label: "账户组：北美主力组 / 欧洲拓展组（6 个账户）", accounts: 6, tags: ["主力"] },
    conditions: [["近 3 天消耗", "≥", "50", "USD"], ["近 3 天 ROAS", "<", "1.0", "—"], ["最小样本量", "≥", "1000", "曝光"]],
    action: { type: "PAUSE", target: "AD", label: "暂停广告（Ad）" },
    guards: { window: "每日 09:00–22:00", maxObjects: 20, budgetStep: "—", cooldown: "同对象 24 小时", needConfirm: 0 },
    hitCount: 128, lastRunAt: "2026-09-20 09:00", nextRun: "2026-09-20 10:00",
    fuse: 0, avgHit: 11, examples: "近 3 天消耗 82.4 USD、ROAS 0.68 → 暂停 Ad" },
  { id: "R-02", name: "高潜计划加预算", status: "OBSERVE", priority: 2, owner: "林可", createdAt: "2026-09-18 15:02",
    trigger: { type: "CRON", expr: "0 9,21 * * *", label: "每日 09:00 / 21:00" },
    scope: { label: "指定账户：act_1183042、act_4400901", accounts: 2, tags: [] },
    conditions: [["近 3 天 ROAS", "≥", "3.0", "—"], ["近 3 天消耗", "≥", "30", "USD"]],
    action: { type: "BUDGET_PCT", target: "ADSET", label: "AdSet 预算 +20%" },
    guards: { window: "每日 09:00–22:00", maxObjects: 50, budgetStep: "单日累计上调 ≤ 50%；预算上限 500 USD", cooldown: "同对象 12 小时", needConfirm: 0 },
    hitCount: 0, lastRunAt: "2026-09-20 09:00（观察模式：仅记录未执行）", nextRun: "2026-09-20 21:00",
    fuse: 0, avgHit: 4, examples: "近 3 天 ROAS 3.6、消耗 41.2 USD → 建议 AdSet 预算 120 → 144 USD" },
  { id: "R-03", name: "素材疲劳预警", status: "AUTO", priority: 3, owner: "苏晴", createdAt: "2026-09-10 09:41",
    trigger: { type: "CRON", expr: "30 8 * * *", label: "每日 08:30" },
    scope: { label: "全部已授权账户组", accounts: 18, tags: [] },
    conditions: [["近 3 天 CTR 环比", "下降 ≥", "30", "%"], ["近 3 天曝光", "≥", "10000", "次"]],
    action: { type: "NOTIFY", target: "ASSET", label: "发送通知 + 打标签「待迭代」" },
    guards: { window: "全天", maxObjects: 100, budgetStep: "—", cooldown: "同素材 7 天一次", needConfirm: 0 },
    hitCount: 34, lastRunAt: "2026-09-20 08:30", nextRun: "2026-09-21 08:30",
    fuse: 0, avgHit: 3, examples: "CTR 由 1.42% 降至 0.86%（−39%），曝光 42,180 → 打标待迭代" },
  { id: "R-04", name: "频次过高降量", status: "FUSED", priority: 4, owner: "林可", createdAt: "2026-09-05 14:11",
    trigger: { type: "CRON", expr: "0 */6 * * *", label: "每 6 小时" },
    scope: { label: "账户组：东南亚测试组", accounts: 5, tags: [] },
    conditions: [["近 1 天 frequency", ">", "4", "—"]],
    action: { type: "BUDGET_PCT", target: "ADSET", label: "AdSet 预算 −20%" },
    guards: { window: "全天", maxObjects: 100, budgetStep: "单日累计下调 ≤ 50%", cooldown: "同对象 24 小时", needConfirm: 0 },
    hitCount: 19, lastRunAt: "2026-09-20 06:00（连续 3 次失败 → 熔断停用）", nextRun: "已熔断，暂停调度",
    fuse: 1, avgHit: 6, fuseReason: "连续 3 次执行失败（META_PERMISSION_DENIED：act_3310230 授权失效），已自动停用并告警（BR-71）",
    examples: "frequency 4.6 → AdSet 预算 80 → 64 USD" },
  { id: "R-05", name: "拒审自动止损", status: "AUTO", priority: 5, owner: "苏晴", createdAt: "2026-09-08 17:30",
    trigger: { type: "EVENT", expr: "asset.review = REJECTED", label: "事件驱动：素材状态变为 REJECTED" },
    scope: { label: "全部已授权账户组", accounts: 18, tags: [] },
    conditions: [["素材审核状态", "=", "REJECTED", "—"]],
    action: { type: "PAUSE", target: "AD", label: "暂停引用该素材的 Ad" },
    guards: { window: "全天", maxObjects: 100, budgetStep: "—", cooldown: "无", needConfirm: 0 },
    hitCount: 42, lastRunAt: "2026-09-20 09:47", nextRun: "事件驱动",
    fuse: 0, avgHit: 1, examples: "AS-2605 被拒审（惊悚画面）→ 暂停引用它的 3 条 Ad" }
];
const ADH_RULE_EXEC = [
  { id: "EX-8841", ruleId: "R-01", ruleName: "低效计划止损", at: "2026-09-20 09:00", mode: "AUTO", hit: 11,
    action: "暂停 Ad", result: "SUCCESS", rollbackable: 1,
    changes: [
      { obj: "1202300011 · US_付费_闪婚总裁_v3 广告", before: "ACTIVE", after: "PAUSED" },
      { obj: "1202300044 · US_付费_甜宠恋综_v6 广告", before: "ACTIVE", after: "PAUSED" },
      { obj: "1202300118 · EU_付费_狼人恋人_v1 广告", before: "ACTIVE", after: "PAUSED" }
    ], snap: "近 3 天消耗 82.4 USD / ROAS 0.68 / 曝光 24,180" },
  { id: "EX-8840", ruleId: "R-03", ruleName: "素材疲劳预警", at: "2026-09-20 08:30", mode: "AUTO", hit: 3,
    action: "通知 + 打标签", result: "SUCCESS", rollbackable: 1,
    changes: [{ obj: "AS-0013 · APP_留存_每日追剧_v1", before: "标签：[]", after: "标签：[待迭代]" }],
    snap: "CTR 1.42% → 0.86%（−39%），曝光 42,180" },
  { id: "EX-8839", ruleId: "R-02", ruleName: "高潜计划加预算", at: "2026-09-20 09:00", mode: "OBSERVE", hit: 4,
    action: "（观察模式）建议 AdSet 预算 +20%", result: "DRY_RUN", rollbackable: 0,
    changes: [
      { obj: "1202200019 · 25-34-female AdSet", before: "120 USD", after: "144 USD（建议）" },
      { obj: "1202200041 · lal1-paid AdSet", before: "200 USD", after: "240 USD（建议）" }
    ], snap: "近 3 天 ROAS 3.6 / 消耗 41.2 USD（样本充足）" },
  { id: "EX-8838", ruleId: "R-04", ruleName: "频次过高降量", at: "2026-09-20 06:00", mode: "AUTO", hit: 0,
    action: "—", result: "FAILED", rollbackable: 0,
    changes: [], snap: "META_PERMISSION_DENIED × 3（act_3310230 授权失效，需人工处理授权）" },
  { id: "EX-8837", ruleId: "R-05", ruleName: "拒审自动止损", at: "2026-09-20 09:47", mode: "AUTO", hit: 1,
    action: "暂停 Ad", result: "SUCCESS", rollbackable: 1,
    changes: [{ obj: "1202300902 · SEA_拉新_末日余生_v2 广告", before: "ACTIVE", after: "PAUSED" }],
    snap: "AS-2605 审核状态 = REJECTED（惊悚画面）" },
  { id: "EX-8836", ruleId: "R-01", ruleName: "低效计划止损", at: "2026-09-20 08:00", mode: "AUTO", hit: 0,
    action: "—", result: "SKIPPED", rollbackable: 0,
    changes: [], snap: "指标数据未就绪（数据时间戳 2026-09-20 07:45 未覆盖评估窗口）→ 按 BR-75 跳过本次评估并记录原因" }
];

/* ===== 归因映射与事件 ===== */
const ADH_ATTR_MAP = [
  { id: "AM-101", type: "对象映射", channelObj: "Campaign 1202100001", internal: "TPL-01 / 计划 20260917-01", event: "campaign_id=1202100001", from: "系统创建", status: "OK", rule: "创建时写入" },
  { id: "AM-102", type: "对象映射", channelObj: "AdSet 1202200019", internal: "受众 25-34-female", event: "adset_id=1202200019", from: "系统创建", status: "OK", rule: "创建时写入" },
  { id: "AM-103", type: "素材映射", channelObj: "Creative 7f2c91ab", internal: "AS-0001 US_付费_闪婚总裁_v3", event: "creative_id=7f2c91ab", from: "上传时写入", status: "OK", rule: "asset.upload 回写" },
  { id: "AM-104", type: "事件映射", channelObj: "click_id 5b8d…c41", internal: "计划 20260917-01 / 素材 AS-0001", event: "click_id=5b8d…c41", from: "归因匹配时写入", status: "OK", rule: "Last Click 命中" },
  { id: "AM-105", type: "参数映射", channelObj: "utm_campaign=meta_conversion_25-34-female", internal: "标签：目标=conversion、受众=25-34-female", event: "UTM 参数", from: "命名反向解析", status: "OK", rule: "BR-43 反解成功" },
  { id: "AM-106", type: "对象映射", channelObj: "Ad 1202300099（渠道后台手工创建）", internal: "未匹配", event: "ad_id=1202300099", from: "同步 + 反解失败", status: "UNMAPPED", rule: "进入未映射池" },
  { id: "AM-107", type: "对象映射", channelObj: "Campaign 1202100777（渠道后台手工创建）", internal: "未匹配", event: "campaign_id=1202100777", from: "同步 + 反解失败", status: "UNMAPPED", rule: "BR-44 归入未识别命名分组" },
  { id: "AM-108", type: "素材映射", channelObj: "Video 3d8a01f2 / Image 91c2aabb（多对一）", internal: "AS-0011 US_付费_甜宠恋综_v6", event: "creative_id 多个", from: "上传时写入", status: "OK", rule: "BR-97 多对一" },
  { id: "AM-109", type: "对象映射", channelObj: "AdSet 1202200501（一对多）", internal: "计划 20260910-04", event: "adset_id=1202200501", from: "系统创建", status: "OK", rule: "BR-97 一对多（模板套用）" },
  { id: "AM-110", type: "事件映射", channelObj: "click_id e71f…920", internal: "未匹配", event: "click_id=e71f…920", from: "归因匹配时写入", status: "UNMAPPED", rule: "未命中映射，进入未映射池" }
];
const ADH_UNMAPPED = [
  { event: "purchase", channel: "meta", count: 1842, ratio: 7.4, firstAt: "2026-09-20 00:12", reason: "click_id 未命中任何映射" },
  { event: "install", channel: "meta", count: 612, ratio: 5.1, firstAt: "2026-09-20 01:40", reason: "对象为渠道后台手工创建，命名反解失败" },
  { event: "start_trial", channel: "meta", count: 318, ratio: 2.6, firstAt: "2026-09-20 03:05", reason: "UTM 被渠道截断，参数映射缺失" },
  { event: "purchase", channel: "meta", count: 96, ratio: 1.2, firstAt: "2026-09-20 05:22", reason: "账户 act_3310230 授权失效期间上报" }
];
const ADH_ATTR_EVENTS = [
  { id: "EV-900231", name: "purchase", at: "2026-09-20 09:58:12", clickId: "5b8d…c41", userId: "u_h8f2a…", channel: "meta", campaign: "meta_conversion_25-34-female_20260917", asset: "AS-0001", seq: "首次归因（第 1 次）", dedup: "新事件", value: 128.4, currency: "USD", attStatus: "AUTHORIZED", windowVer: "W2（点击 7 天 / 曝光 1 天）", model: "Last Click" },
  { id: "EV-900232", name: "purchase", at: "2026-09-20 09:57:40", clickId: "5b8d…c41", userId: "u_h8f2a…", channel: "meta", campaign: "meta_conversion_25-34-female_20260917", asset: "AS-0001", seq: "—", dedup: "重复（事件ID+渠道+事件名+时间窗）", value: 128.4, currency: "USD", attStatus: "AUTHORIZED", windowVer: "W2", model: "Last Click" },
  { id: "EV-900233", name: "purchase", at: "2026-09-20 09:41:03", clickId: "e71f…920", userId: "u_a91bd…", channel: "meta", campaign: "—（未映射）", asset: "—", seq: "—", dedup: "新事件", value: 64.0, currency: "USD", attStatus: "DENIED", windowVer: "W2", model: "Last Click" },
  { id: "EV-900234", name: "purchase", at: "2026-09-20 09:22:55", clickId: "77aa…1b3", userId: "u_3c7de…", channel: "meta", campaign: "meta_conversion_lal1-paid_20260912", asset: "AS-0003", seq: "再归因（第 2 次）", dedup: "新事件", value: 219.9, currency: "USD", attStatus: "AUTHORIZED", windowVer: "W2", model: "Last Click" },
  { id: "EV-900235", name: "install", at: "2026-09-20 09:05:11", clickId: "—", userId: "u_ff021…", channel: "meta", campaign: "meta_app_install_18-24-mix_20260918", asset: "AS-0007", seq: "首次归因（第 1 次）", dedup: "新事件", value: 0, currency: "USD", attStatus: "DENIED", windowVer: "W2", model: "Last Click（无 click_id，降级为账号 ID 匹配）" },
  { id: "EV-900236", name: "purchase", at: "2026-09-20 08:47:30", clickId: "9cc4…77d", userId: "u_5b2fa…", channel: "meta", campaign: "meta_conversion_35-44-family-drama_20260914", asset: "AS-0004", seq: "首次归因（第 1 次）", dedup: "逾期（超出归因窗口）", value: 88.0, currency: "USD", attStatus: "AUTHORIZED", windowVer: "W2", model: "Last Click" }
];
const ADH_RECON = [
  { date: "2026-09-19", spendChannel: 84210.44, spendSys: 84198.02, diffSpend: 0.015, convChannel: 2148, convSys: 1986, diffConv: 0.0755, alarm: 0, note: "差异主要来自 iOS ATT 未授权设备（占 62%）" },
  { date: "2026-09-18", spendChannel: 79844.10, spendSys: 79801.55, diffSpend: 0.0005, convChannel: 2033, convSys: 1742, diffConv: 0.143, alarm: 0, note: "跨端未归并 214 单" },
  { date: "2026-09-17", spendChannel: 81220.90, spendSys: 81188.14, diffSpend: 0.0004, convChannel: 2201, convSys: 1698, diffConv: 0.2285, alarm: 1, note: "归因差异 22.9% 超阈值 20%，主因：映射覆盖率下降至 88.4%" },
  { date: "2026-09-16", spendChannel: 77960.21, spendSys: 77910.88, diffSpend: 0.0006, convChannel: 1980, convSys: 1691, diffConv: 0.146, alarm: 0, note: "正常波动" },
  { date: "2026-09-15", spendChannel: 76330.40, spendSys: 76290.11, diffSpend: 0.0005, convChannel: 1912, convSys: 1655, diffConv: 0.1344, alarm: 0, note: "正常波动" }
];
/* ===== 用户与权限 ===== */
const ADH_USERS = [
  { id: 1, name: "周振业", account: "zhou.zy", role: "admin", groups: ["全部账户组"], status: "ENABLED", lastLogin: "2026-09-20 09:58", ip: "10.20.3.11" },
  { id: 2, name: "林可", account: "lin.ke", role: "optimizer", groups: ["北美主力组", "欧洲拓展组", "App 拉新组"], status: "ENABLED", lastLogin: "2026-09-20 10:12", ip: "10.20.3.42" },
  { id: 3, name: "苏晴", account: "su.qing", role: "designer", groups: ["欧洲拓展组", "北美主力组"], status: "ENABLED", lastLogin: "2026-09-20 09:31", ip: "10.20.4.08" },
  { id: 4, name: "陈默", account: "chen.mo", role: "analyst", groups: ["北美主力组", "欧洲拓展组", "App 拉新组"], status: "ENABLED", lastLogin: "2026-09-20 08:44", ip: "10.20.4.19" },
  { id: 5, name: "何雨", account: "he.yu", role: "optimizer", groups: ["东南亚测试组"], status: "DISABLED", lastLogin: "2026-09-11 18:20", ip: "10.20.5.31" },
  { id: 6, name: "施阳", account: "shi.yang", role: "designer", groups: ["东南亚测试组"], status: "ENABLED", lastLogin: "2026-09-19 17:02", ip: "10.20.5.07" }
];

/* ===== 审计日志 ===== */
const ADH_AUDIT = [
  { at: "2026-09-20 10:12", user: "林可", ip: "10.20.3.42", cat: "投放", action: "批量创建任务提交", obj: "T-20260920-014（60 条广告）", before: "—", after: "状态 QUEUED", reqId: "req_9f2c41ab" },
  { at: "2026-09-20 09:58", user: "周振业", ip: "10.20.3.11", cat: "权限", action: "数据授权变更", obj: "用户 施阳 → 账户组 东南亚测试组", before: "无授权", after: "view + create", reqId: "req_71de02cc" },
  { at: "2026-09-20 09:47", user: "系统", ip: "—", cat: "自动化", action: "规则执行", obj: "R-05 拒审自动止损 → Ad 1202300902", before: "ACTIVE", after: "PAUSED", reqId: "rule_8837" },
  { at: "2026-09-20 09:31", user: "苏晴", ip: "10.20.4.08", cat: "素材", action: "素材重新提交审核", obj: "AS-0012 APP_再归因_会员召回_v2", before: "REJECTED", after: "SUBMITTED", reqId: "req_5b2119ff" },
  { at: "2026-09-20 09:00", user: "系统", ip: "—", cat: "自动化", action: "规则执行", obj: "R-01 低效计划止损 → 11 个 Ad", before: "ACTIVE", after: "PAUSED", reqId: "rule_8841" },
  { at: "2026-09-20 08:41", user: "苏晴", ip: "10.20.4.08", cat: "素材", action: "素材批量上传", obj: "128 个文件（2 个失败）", before: "—", after: "126 条素材记录", reqId: "req_3c8e77d1" },
  { at: "2026-09-20 08:00", user: "调度器", ip: "—", cat: "账户", action: "渠道令牌刷新", obj: "bm_1029 NovaDrama Media Ltd.", before: "剩余 48 天", after: "剩余 60 天", reqId: "job_sync_0800" },
  { at: "2026-09-20 08:00", user: "调度器", ip: "—", cat: "账户", action: "对象树增量同步", obj: "18 个账户", before: "—", after: "Campaign 142 / AdSet 386 / Ad 1,204", reqId: "job_sync_0800" },
  { at: "2026-09-20 07:45", user: "调度器", ip: "—", cat: "归因", action: "归因计算重跑", obj: "2026-09-19（未映射补建映射后）", before: "映射覆盖率 88.4%", after: "映射覆盖率 91.2%", reqId: "attr_rerun_0919" },
  { at: "2026-09-19 22:41", user: "系统", ip: "—", cat: "账户", action: "渠道授权失效标记", obj: "bm_3341 BingeOn Studio", before: "CONNECTED", after: "EXPIRED", reqId: "auth_watch_2241" },
  { at: "2026-09-19 20:10", user: "林可", ip: "10.20.3.42", cat: "投放", action: "批量创建任务提交", obj: "T-20260919-009（36 条广告）", before: "—", after: "状态 SUCCEEDED", reqId: "req_5502aa19" },
  { at: "2026-09-19 18:02", user: "林可", ip: "10.20.3.42", cat: "投放", action: "任务回滚", obj: "T-20260919-007（12 个对象）", before: "已创建", after: "9 成功 / 3 因已有消耗不可删除", reqId: "req_roll_0007" },
  { at: "2026-09-19 17:20", user: "陈默", ip: "10.20.4.19", cat: "数据", action: "报表导出", obj: "账户维度 30 天指标（8,420 行）", before: "—", after: "文件 report_20260919.xlsx", reqId: "req_exp_88213" },
  { at: "2026-09-19 16:05", user: "陈默", ip: "10.20.4.19", cat: "归因", action: "归因映射创建", obj: "AM-105 参数映射（UTM → 内部标签）", before: "无映射", after: "已建立", reqId: "req_am105c" },
  { at: "2026-09-20 09:58", user: "周振业", ip: "10.20.3.11", cat: "权限", action: "登录成功", obj: "控制台会话", before: "—", after: "会话建立", reqId: "req_login_0011" }
];

/* ===== 通知与告警 ===== */
const ADH_ALERT_TYPES = [
  { type: "素材拒审", trigger: "素材状态变为 REJECTED", to: "上传者 + 投手", count: 3, tone: "danger", silent: "无" },
  { type: "授权失效", trigger: "令牌失效或权限被撤销", to: "管理员", count: 1, tone: "danger", silent: "无" },
  { type: "令牌即将过期", trigger: "剩余有效期 < 7 天", to: "管理员", count: 2, tone: "warn", silent: "22:00–08:00" },
  { type: "账户异常", trigger: "停用 / 欠费 / 受限", to: "管理员 + 投手", count: 2, tone: "danger", silent: "无" },
  { type: "余额不足", trigger: "余额 < 阈值", to: "管理员", count: 1, tone: "warn", silent: "无" },
  { type: "任务失败", trigger: "任务终态为 FAILED 或 PARTIAL_FAILED", to: "任务发起人", count: 2, tone: "warn", silent: "无" },
  { type: "规则熔断", trigger: "规则连续失败 3 次", to: "规则创建者 + 管理员", count: 1, tone: "danger", silent: "无" },
  { type: "数据同步异常", trigger: "同步任务连续失败 2 次", to: "管理员", count: 0, tone: "warn", silent: "22:00–08:00" },
  { type: "归因未映射", trigger: "未映射事件比例 > 10%", to: "投手 + 数据分析师", count: 1, tone: "warn", silent: "无" },
  { type: "对账差异", trigger: "归因差异 > 20%", to: "数据分析师", count: 1, tone: "warn", silent: "无" },
  { type: "消耗异常", trigger: "当日消耗 > 日均 3 倍", to: "投手 + 管理员", count: 1, tone: "danger", silent: "无" }
];
const ADH_NOTIFICATIONS = [
  { id: "N-2211", at: "2026-09-20 09:47", type: "素材拒审", tone: "danger", read: 0,
    title: "AS-2605 SEA_拉新_末日余生_v2 被渠道拒审", body: "拒审原因原文：Ad creative rejected: sensational imagery not allowed (meta_policy_2105)。已自动暂停引用它的 3 条 Ad（规则 R-05）。", link: "assets" },
  { id: "N-2210", at: "2026-09-20 09:12", type: "任务失败", tone: "warn", read: 0,
    title: "任务 T-20260920-014 部分失败（54 成功 / 6 失败）", body: "失败分类：BUSINESS ×4、POLICY ×2。可在任务中心按错误分类筛选并单条重试。", link: "tasks" },
  { id: "N-2209", at: "2026-09-20 09:00", type: "规则熔断", tone: "danger", read: 0,
    title: "规则 R-04 频次过高降量 已熔断停用", body: "连续 3 次执行失败（META_PERMISSION_DENIED：act_3310230 授权失效），已自动停用并告警。", link: "rules" },
  { id: "N-2207", at: "2026-09-20 08:05", type: "令牌即将过期", tone: "warn", read: 0,
    title: "bm_2077 令牌剩余 5 天，bm_3341 已于 01:00 过期", body: "bm_3341 过期导致 6 个任务进入 PAUSED（非失败），恢复授权后可一键重跑。", link: "channels" },
  { id: "N-2206", at: "2026-09-20 07:50", type: "对账差异", tone: "warn", read: 1,
    title: "2026-09-17 归因差异 22.9%（阈值 20%）", body: "主因：映射覆盖率下降至 88.4%，已完成补建并重跑，覆盖率回升至 91.2%。", link: "attr-detail" },
  { id: "N-2205", at: "2026-09-20 07:12", type: "消耗异常", tone: "danger", read: 1,
    title: "act_6613008 当日消耗为日均 3.4 倍", body: "当日消耗 92.51 USD，日均 27.2 USD。已通知投手与管理员，未自动调整预算。", link: "accounts" },
  { id: "N-2204", at: "2026-09-19 22:41", type: "授权失效", tone: "danger", read: 1,
    title: "bm_3341 BingeOn Studio 授权失效", body: "OAuthException #190：令牌已过期。该渠道下依赖任务已置为 PAUSED。", link: "channels" },
  { id: "N-2203", at: "2026-09-19 20:18", type: "任务失败", tone: "warn", read: 1,
    title: "任务 T-20260919-008 回滚受阻（9 成功 / 3 失败）", body: "3 个对象已有投放数据，按 BR-53 仅可暂停/归档，不可删除。", link: "tasks" },
  { id: "N-2202", at: "2026-09-19 18:40", type: "数据同步异常", tone: "warn", read: 1,
    title: "act_2201088、act_5512011 同步未完成", body: "看板中这两账户已标记为「数据未就绪」，避免误读为 0。", link: "dashboard" }
];

/* ===== 导出任务 ===== */
const ADH_EXPORTS = [
  { id: "EXP-2201", at: "2026-09-19 17:20", by: "陈默", dim: "账户 → Campaign（2 层）", metrics: "消耗 / 曝光 / 点击 / CTR / CPC / 转化（双口径）/ CPA / ROAS", range: "2026-08-21 → 2026-09-19", rows: 8420, status: "DONE", expireAt: "2026-09-26 17:20", file: "adh_export_20260919_1720.xlsx" },
  { id: "EXP-2200", at: "2026-09-19 10:02", by: "林可", dim: "素材维度", metrics: "消耗 / CTR / CVR / ROAS / 样本量", range: "2026-09-01 → 2026-09-19", rows: 412, status: "DONE", expireAt: "2026-09-26 10:02", file: "adh_asset_20260919_1002.csv" },
  { id: "EXP-2199", at: "2026-09-18 16:44", by: "陈默", dim: "归因明细（计划下钻）", metrics: "转化数（系统归因）/ 转化价值 / 归因窗口版本", range: "2026-09-01 → 2026-09-18", rows: 128400, status: "DONE", expireAt: "2026-09-25 16:44", file: "adh_attr_20260918_1644.csv" },
  { id: "EXP-2198", at: "2026-09-20 10:05", by: "陈默", dim: "版位 × 设备 × 操作系统", metrics: "消耗 / CPM / CTR / ROAS", range: "2026-09-13 → 2026-09-20", rows: 0, status: "RUNNING", progress: 62, expireAt: "—", file: "—" },
  { id: "EXP-2197", at: "2026-09-20 09:58", by: "苏晴", dim: "素材维度", metrics: "消耗 / CTR / CVR / ROAS", range: "2026-01-01 → 2026-09-20", rows: 0, status: "FAILED", progress: 0, failReason: "预计行数 1,284,300 超过单次导出上限 100 万行（BR-132），请拆分时间范围", expireAt: "—", file: "—" }
];

/* ===== 指标口径定义 ===== */
const ADH_METRICS = [
  { key: "spend", label: "消耗", def: "期内广告花费", src: "渠道 Insights", type: "原始", fmt: "money" },
  { key: "impressions", label: "曝光", def: "广告展示次数", src: "渠道 Insights", type: "原始", fmt: "int" },
  { key: "clicks", label: "点击", def: "广告点击次数", src: "渠道 Insights", type: "原始", fmt: "int" },
  { key: "ctr", label: "CTR", def: "点击 / 曝光", src: "系统计算", type: "计算", fmt: "pct" },
  { key: "cpc", label: "CPC", def: "消耗 / 点击", src: "系统计算", type: "计算", fmt: "money" },
  { key: "cpm", label: "CPM", def: "消耗 / 曝光 × 1000", src: "系统计算", type: "计算", fmt: "money" },
  { key: "conversions", label: "转化数", def: "口径可选：渠道归因 / 系统归因（双口径并列展示）", src: "渠道 Insights + 系统归因", type: "双口径", fmt: "int" },
  { key: "cpa", label: "CPA", def: "消耗 / 转化数", src: "系统计算", type: "计算", fmt: "money" },
  { key: "roas", label: "ROAS", def: "转化价值 / 消耗", src: "系统计算", type: "计算", fmt: "ratio" },
  { key: "frequency", label: "频次", def: "曝光 / 触达人数", src: "渠道 Insights", type: "原始", fmt: "ratio" },
  { key: "ltv", label: "LTV", def: "用户生命周期价值（按期滚动计算）", src: "业务侧数据导入", type: "导入", fmt: "money" },
  { key: "retention", label: "留存率", def: "次日 / 7 日 / 30 日留存", src: "业务侧数据导入", type: "导入", fmt: "pct" }
];

/* ===== 提交前校验清单（6.3.3） ===== */
const ADH_PRECHECK = [
  { cat: "素材", item: "素材状态均为 APPROVED 且未被归档（BR-29）", mode: "BLOCK" },
  { cat: "素材", item: "视频素材具备目标比例变体（BR-62）", mode: "BLOCK" },
  { cat: "受众", item: "受众规模 ≥ 渠道下限（1,000 人）", mode: "BLOCK" },
  { cat: "受众", item: "受众在目标账户下可用（BR-37）", mode: "BLOCK" },
  { cat: "命名", item: "名称长度、字符集合规（BR-39 / BR-40）", mode: "BLOCK" },
  { cat: "命名", item: "同账户内重名（按 BR-41 策略）", mode: "WARN" },
  { cat: "预算", item: "日预算 ≥ 渠道最低预算", mode: "BLOCK" },
  { cat: "预算", item: "出价与优化目标匹配", mode: "BLOCK" },
  { cat: "排期", item: "结束时间晚于开始时间、时区一致", mode: "BLOCK" },
  { cat: "结构", item: "单账户 AdSet 数、单 AdSet 广告数未超渠道上限", mode: "WARN" },
  { cat: "权限", item: "当前用户对目标账户有数据权限（BR-3.5）", mode: "BLOCK" }
];

/* ===== 同步频率配置（5.1.4） ===== */
const ADH_SYNC_JOBS = [
  { data: "账户基础信息（名称/状态/币种/时区）", freq: "每日 1 次 + 手动触发", how: "同步接口", last: "2026-09-20 08:00", next: "2026-09-21 08:00" },
  { data: "账户余额与消费限额", freq: "每日 2 次（09:00 / 21:00）", how: "同步接口", last: "2026-09-20 09:00", next: "2026-09-20 21:00" },
  { data: "对象树（Campaign/AdSet/Ad/Creative）", freq: "每 6 小时增量 + 每日全量校验", how: "游标增量 + 全量比对", last: "2026-09-20 08:00", next: "2026-09-20 14:00" },
  { data: "对象状态变更（启停/归档/删除）", freq: "每 1 小时", how: "增量", last: "2026-09-20 10:00", next: "2026-09-20 11:00" },
  { data: "受众（Custom / Lookalike）", freq: "每日 1 次", how: "同步接口", last: "2026-09-20 08:10", next: "2026-09-21 08:10" },
  { data: "洞察数据（Insights，日粒度）", freq: "每日 08:00 前完成", how: "异步报表任务", last: "2026-09-20 07:45", next: "2026-09-21 07:45" }
];

/* ===== 全局数据出口 ===== */
const ADH_DATA = {
  env: ADH_ENV, roles: ADH_ROLES, perm: ADH_PERM, nav: ADH_NAV,
  channels: ADH_CHANNELS, capability: ADH_CAPABILITY, groups: ADH_GROUPS, accounts: ADH_ACCOUNTS,
  assets: ADH_ASSETS, assetStatus: ADH_ASSET_STATUS, rejectCats: ADH_REJECT_CATS,
  audiences: ADH_AUDIENCES, namingFields: ADH_NAMING_FIELDS, namingRules: ADH_NAMING_RULES,
  templates: ADH_TEMPLATES, tree: ADH_TREE, errorDict: ADH_ERROR_DICT, tasks: ADH_TASKS,
  planLedger: ADH_PLAN_LEDGER,
  rules: ADH_RULES, ruleExec: ADH_RULE_EXEC, attrMap: ADH_ATTR_MAP, unmapped: ADH_UNMAPPED,
  attrEvents: ADH_ATTR_EVENTS, recon: ADH_RECON, users: ADH_USERS, audit: ADH_AUDIT,
  alertTypes: ADH_ALERT_TYPES, notifications: ADH_NOTIFICATIONS, exports: ADH_EXPORTS,
  metrics: ADH_METRICS, precheck: ADH_PRECHECK, syncJobs: ADH_SYNC_JOBS
};
