/* ===== ADH 联调 · HTTP 客户端：baseURL / 鉴权 / 统一响应与错误码 ===== */
(function () {
  const BASE_KEY = "adh.apiBase";
  const TOKEN_KEY = "adh.accessToken";
  const DEFAULT_BASE = "http://127.0.0.1:8000";

  const http = { onUnauthorized: null, onError: null };

  http.baseUrl = function () {
    const saved = window.localStorage.getItem(BASE_KEY);
    return String(saved || DEFAULT_BASE).replace(/\/+$/, "");
  };
  http.setBaseUrl = function (url) {
    if (url) window.localStorage.setItem(BASE_KEY, String(url).replace(/\/+$/, ""));
  };
  http.token = function () { return window.localStorage.getItem(TOKEN_KEY) || ""; };
  http.setToken = function (t) {
    if (t) window.localStorage.setItem(TOKEN_KEY, t);
    else window.localStorage.removeItem(TOKEN_KEY);
  };
  http.hasToken = function () { return !!http.token(); };

  function buildQuery(query) {
    if (!query) return "";
    const parts = [];
    Object.keys(query).forEach(function (k) {
      const v = query[k];
      if (v === undefined || v === null || v === "") return;
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    });
    return parts.length ? "?" + parts.join("&") : "";
  }

  http.request = function (method, path, opts) {
    opts = opts || {};
    const url = http.baseUrl() + path + buildQuery(opts.query);
    const headers = { Accept: "application/json" };
    Object.keys(opts.headers || {}).forEach(function (k) { headers[k] = opts.headers[k]; });
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
    const token = http.token();
    if (token) headers.Authorization = "Bearer " + token;

    return window
      .fetch(url, {
        method: method,
        headers: headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
      })
      .then(function (res) {
        if (res.status === 204) return null;
        return res
          .json()
          .catch(function () { return null; })
          .then(function (payload) {
            if (res.ok) return payload && payload.data !== undefined ? payload.data : payload;
            const err = new Error((payload && payload.message) || "HTTP " + res.status);
            err.status = res.status;
            err.code = payload && payload.code;
            err.details = payload && payload.details;
            err.requestId = payload && payload.requestId;
            throw err;
          });
      })
      .catch(function (err) {
        if (err && err.status === 401 && http.onUnauthorized) http.onUnauthorized(err);
        if (http.onError) http.onError(err);
        throw err;
      });
  };

  http.get = function (path, opts) { return http.request("GET", path, opts); };
  http.post = function (path, body, opts) {
    return http.request("POST", path, Object.assign({}, opts || {}, { body: body === undefined ? {} : body }));
  };
  http.put = function (path, body, opts) {
    return http.request("PUT", path, Object.assign({}, opts || {}, { body: body }));
  };
  http.patch = function (path, body, opts) {
    return http.request("PATCH", path, Object.assign({}, opts || {}, { body: body }));
  };
  http.del = function (path, opts) { return http.request("DELETE", path, opts); };

  ADH.http = http;
})();