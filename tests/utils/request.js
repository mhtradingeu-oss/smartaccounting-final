const { URL } = require('url');

class TestRequest {
  constructor(app, method, path) {
    this.app = app;
    this.method = method.toUpperCase();
    this.path = path || '/';
    this.headers = {};
    this.queryParams = {};
    this.body = undefined;
    this._promise = null;
  }

  set(name, value) {
    this.headers[name] = value;
    return this;
  }

  query(params = {}) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        delete this.queryParams[key];
      } else if (Array.isArray(value)) {
        this.queryParams[key] = value.map((entry) => String(entry));
      } else {
        this.queryParams[key] = String(value);
      }
    });
    return this;
  }

  send(payload) {
    if (payload !== undefined) {
      this.body = payload;
    }
    return this;
  }

  then(resolve, reject) {
    return this._getPromise().then(resolve, reject);
  }

  catch(reject) {
    return this._getPromise().catch(reject);
  }

  _getPromise() {
    if (!this._promise) {
      this._promise = this._execute();
    }
    return this._promise;
  }

  async _execute() {
    if (typeof global.requestApp !== 'function') {
      throw new Error('global.requestApp is not defined; ensure tests/setup.js runs before requests.');
    }
    const url = this._buildUrl();
    const response = await global.requestApp({
      app: this.app,
      method: this.method,
      url,
      headers: this.headers,
      body: this.body,
    });
    return response;
  }

  _buildUrl() {
    const normalizedPath =
      this.path.startsWith('http://') || this.path.startsWith('https://')
        ? this.path
        : `http://example.com${this.path}`;
    const url = new URL(normalizedPath);
    Object.entries(this.queryParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        url.searchParams.delete(key);
        value.forEach((entry) => url.searchParams.append(key, entry));
      } else if (value === undefined || value === null) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    return `${url.pathname}${url.search}`;
  }
}

module.exports = (app) => ({
  get: (path) => new TestRequest(app, 'GET', path),
  post: (path) => new TestRequest(app, 'POST', path),
  put: (path) => new TestRequest(app, 'PUT', path),
  patch: (path) => new TestRequest(app, 'PATCH', path),
  delete: (path) => new TestRequest(app, 'DELETE', path),
  head: (path) => new TestRequest(app, 'HEAD', path),
  options: (path) => new TestRequest(app, 'OPTIONS', path),
});
