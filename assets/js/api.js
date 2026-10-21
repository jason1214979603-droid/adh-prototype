/* ===== ADH 联调 · 接口封装：页面只依赖 API.*，不直接拼 URL ===== */
(function () {
  const API = {};

  API.auth = {
    login: function (username, password) {
      return ADH.http.post("/v1/auth/login", { username: username, password: password });
    },
    me: function () { return ADH.http.get("/v1/auth/me"); },
    logout: function () { return ADH.http.post("/v1/auth/logout", {}); }
  };

  API.accounts = {
    list: function (query) { return ADH.http.get("/v1/ad-accounts", { query: query }); },
    overview: function (query) { return ADH.http.get("/v1/ad-accounts/overview", { query: query }); },
    detail: function (id) { return ADH.http.get("/v1/ad-accounts/" + encodeURIComponent(id)); },
    health: function (id) { return ADH.http.get("/v1/ad-accounts/" + encodeURIComponent(id) + "/health"); },
    sync: function (id, body, key) {
      return ADH.http.post("/v1/ad-accounts/" + encodeURIComponent(id) + "/sync", body || {}, { idempotencyKey: key });
    },
    /* F3.2 写操作：纳管 / 账户组 CRUD / 同步任务重试 */
    bind: function (body, key) { return ADH.http.post("/v1/ad-accounts/bind", body, { idempotencyKey: key }); },
    discoverable: function (channelCode, query) {
      return ADH.http.get("/v1/channels/" + encodeURIComponent(channelCode) + "/discoverable-accounts", { query: query });
    },
    groups: function (query) { return ADH.http.get("/v1/account-groups", { query: query }); },
    group: function (id) { return ADH.http.get("/v1/account-groups/" + encodeURIComponent(id)); },
    createGroup: function (body, key) { return ADH.http.post("/v1/account-groups", body, { idempotencyKey: key }); },
    updateGroup: function (id, body, key) {
      return ADH.http.patch("/v1/account-groups/" + encodeURIComponent(id), body, { idempotencyKey: key });
    },
    deleteGroup: function (id, key) {
      return ADH.http.del("/v1/account-groups/" + encodeURIComponent(id), { idempotencyKey: key });
    },
    syncJobs: function (query) { return ADH.http.get("/v1/sync-jobs", { query: query }); },
    retryJob: function (id, key) {
      return ADH.http.post("/v1/sync-jobs/" + encodeURIComponent(id) + "/retry", {}, { idempotencyKey: key });
    }
  };

  /* 渠道（账户纳管需要渠道清单）与用户（账户组授权矩阵） */
  API.channels = {
    list: function (query) { return ADH.http.get("/v1/channels", { query: query }); }
  };

  /* 用户与数据授权（FR-SYS-01~03）：列表 / 详情 / 新建 / 更新 / 启停 / 授权读写 */
  API.users = {
    list: function (query) { return ADH.http.get("/v1/users", { query: query }); },
    detail: function (id) { return ADH.http.get("/v1/users/" + encodeURIComponent(id)); },
    create: function (body, key) { return ADH.http.post("/v1/users", body, { idempotencyKey: key }); },
    update: function (id, body, key) {
      return ADH.http.patch("/v1/users/" + encodeURIComponent(id), body, { idempotencyKey: key });
    },
    setStatus: function (id, body, key) {
      return ADH.http.post("/v1/users/" + encodeURIComponent(id) + "/status", body, { idempotencyKey: key });
    },
    grants: function (id) { return ADH.http.get("/v1/users/" + encodeURIComponent(id) + "/grants"); },
    saveGrants: function (id, body, key) {
      return ADH.http.put("/v1/users/" + encodeURIComponent(id) + "/grants", body, { idempotencyKey: key });
    }
  };

  /* 命名规则引擎（FR-MID-08~13）：规则 CRUD / 校验 / 预览 / 反向解析 / 字段字典 */
  API.naming = {
    list: function (query) { return ADH.http.get("/v1/naming-rules", { query: query }); },
    detail: function (id) { return ADH.http.get("/v1/naming-rules/" + encodeURIComponent(id)); },
    create: function (body, key) { return ADH.http.post("/v1/naming-rules", body, { idempotencyKey: key }); },
    update: function (id, body, key) {
      return ADH.http.patch("/v1/naming-rules/" + encodeURIComponent(id), body, { idempotencyKey: key });
    },
    remove: function (id, key) {
      return ADH.http.del("/v1/naming-rules/" + encodeURIComponent(id), { idempotencyKey: key });
    },
    validate: function (body) { return ADH.http.post("/v1/naming-rules/validate", body); },
    preview: function (id, body) {
      return ADH.http.post("/v1/naming-rules/" + encodeURIComponent(id) + "/preview", body);
    },
    parse: function (id, body) {
      return ADH.http.post("/v1/naming-rules/" + encodeURIComponent(id) + "/parse", body);
    },
    fields: function () { return ADH.http.get("/v1/naming-fields"); }
  };

  /* 角色与权限矩阵（FR-SYS-01 / FR-SYS-02） */
  API.rbac = {
    roles: function () { return ADH.http.get("/v1/roles"); },
    permissions: function () { return ADH.http.get("/v1/permissions"); }
  };

  API.notifications = {
    list: function (query) { return ADH.http.get("/v1/notifications", { query: query }); },
    markRead: function (id, key) {
      return ADH.http.post("/v1/notifications/" + encodeURIComponent(id) + "/read", {}, { idempotencyKey: key });
    },
    markAllRead: function (key) {
      return ADH.http.post("/v1/notifications/read-all", {}, { idempotencyKey: key });
    },
    preferences: function () { return ADH.http.get("/v1/notification-preferences"); },
    savePreferences: function (body, key) {
      return ADH.http.put("/v1/notification-preferences", body, { idempotencyKey: key });
    },
    alertRules: function (query) { return ADH.http.get("/v1/alert-rules", { query: query }); },
    updateAlertRule: function (id, body, key) {
      return ADH.http.patch("/v1/alert-rules/" + encodeURIComponent(id), body, { idempotencyKey: key });
    }
  };

  API.system = {
    configs: function (query) { return ADH.http.get("/v1/system-configs", { query: query }); },
    updateConfigs: function (body, key) {
      return ADH.http.put("/v1/system-configs", body, { idempotencyKey: key });
    },
    dictionaries: function () { return ADH.http.get("/v1/dictionaries"); },
    dictionary: function (type, includeDisabled) {
      return ADH.http.get("/v1/dictionaries/" + encodeURIComponent(type), {
        query: { includeDisabled: includeDisabled ? "true" : "" }
      });
    },
    createDictionaryItem: function (type, body, key) {
      return ADH.http.post("/v1/dictionaries/" + encodeURIComponent(type) + "/items", body, { idempotencyKey: key });
    },
    updateDictionaryItem: function (type, code, body, key) {
      return ADH.http.patch(
        "/v1/dictionaries/" + encodeURIComponent(type) + "/items/" + encodeURIComponent(code),
        body,
        { idempotencyKey: key }
      );
    },
    deleteDictionaryItem: function (type, code, key) {
      return ADH.http.del(
        "/v1/dictionaries/" + encodeURIComponent(type) + "/items/" + encodeURIComponent(code),
        { idempotencyKey: key }
      );
    }
  };

  API.exports = {
    list: function (query) { return ADH.http.get("/v1/exports", { query: query }); },
    detail: function (id) { return ADH.http.get("/v1/exports/" + encodeURIComponent(id)); },
    create: function (body, key) { return ADH.http.post("/v1/exports", body, { idempotencyKey: key }); },
    remove: function (id, key) {
      return ADH.http.del("/v1/exports/" + encodeURIComponent(id), { idempotencyKey: key });
    }
  };

  /* 幂等键：同一动作重复提交只生效一次 */
  API.idemKey = function (scope) {
    return scope + "-" + Date.now() + "-" + Math.floor(Math.random() * 1e6);
  };

  ADH.API = API;
})();