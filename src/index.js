(() => {
  "use strict";

  const pipe = (...fns) => (value) => fns.reduce((acc, fn) => fn(acc), value);
  const compose = (...fns) => (value) => fns.reduceRight((acc, fn) => fn(acc), value);
  const curry = (fn) => (...args) => args.length >= fn.length ? fn(...args) : curry(fn.bind(null, ...args));

  const TemplateEngine = {
    compileVariables: (template, data = {}) => {
      return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, key) => {
        const value = key.split(".").reduce((obj, prop) => obj?.[prop.trim()], data);
        return value !== undefined ? String(value) : "";
      });
    },

    compileEach: (template, data = {}) => {
      return template.replace(
        /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
        (match, arrayKey, loopTemplate) => {
          const array = data[arrayKey];
          if (!Array.isArray(array)) return "";

          return array
            .map((item, index) => {
              let compiled = loopTemplate;
              compiled = compiled.replace(/\{\{\s*this\.(\w+)\s*\}\}/g, (match, prop) => {
                return item[prop] !== undefined ? String(item[prop]) : "";
              });
              compiled = compiled.replace(/\{\{\s*this\s*\}\}/g, String(item));
              compiled = compiled.replace(/\{\{\s*@index\s*\}\}/g, String(index));
              return compiled;
            })
            .join("");
        }
      );
    },

    compileIf: (template, data = {}) => {
      return template.replace(
        /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
        (match, condition, content) => {
          return data[condition] ? content : "";
        }
      );
    },

    compileUnless: (template, data = {}) => {
      return template.replace(
        /\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
        (match, condition, content) => {
          return !data[condition] ? content : "";
        }
      );
    },

    compile: curry((data, template) => {
      return pipe(
        (tmpl) => TemplateEngine.compileEach(tmpl, data),
        (tmpl) => TemplateEngine.compileIf(tmpl, data),
        (tmpl) => TemplateEngine.compileUnless(tmpl, data),
        (tmpl) => TemplateEngine.compileVariables(tmpl, data)
      )(template);
    }),
  };

  const Router = (() => {
    const routes = new Map();
    const beforeRouteCallbacks = [];
    const afterRouteCallbacks = [];
    let basePath = "";

    const norm = (s) => (s.endsWith("/") && s !== "/" ? s.slice(0, -1) : s);
    const setBase = (b) => {
      basePath = norm(b || "");
    };

    const stripBase = (path) => {
      const p = norm(path);
      if (!basePath) return p || "/";
      if (p === basePath) return "/";
      return p.startsWith(basePath + "/") ? p.slice(basePath.length) || "/" : p;
    };

    const addBase = (rel) => {
      const r = rel.startsWith("/") ? rel : "/" + rel;
      return basePath ? norm(basePath + r) : r;
    };

    const extractParams = (pattern, path) => {
      const patternParts = pattern.split("/");
      const pathParts = path.split("/");
      if (patternParts.length !== pathParts.length) return null;
      const params = {};
      for (let i = 0; i < patternParts.length; i++) {
        const part = patternParts[i];
        if (part.startsWith(":")) params[part.slice(1)] = pathParts[i];
        else if (part !== pathParts[i]) return null;
      }
      return params;
    };

    const findRoute = (path) => {
      for (const [pattern, handler] of routes) {
        if (pattern === path) return { handler, params: {} };
        const params = extractParams(pattern, path);
        if (params) return { handler, params };
      }
      return null;
    };

    const navigate = (anyPath) => {
      const rel = stripBase(anyPath);
      const beforeResults = beforeRouteCallbacks.map((cb) => cb(rel));
      if (beforeResults.some((r) => r === false)) return;
      const route = findRoute(rel);
      if (route) {
        route.handler(route.params);
        afterRouteCallbacks.forEach((cb) => cb(rel, route.params));
      }
    };

    return {
      add: curry((path, handler) => {
        routes.set(path, handler);
        return Router;
      }),
      navigate,
      setBase,
      beforeRoute: (cb) => {
        beforeRouteCallbacks.push(cb);
        return Router;
      },
      afterRoute: (cb) => {
        afterRouteCallbacks.push(cb);
        return Router;
      },
      init: () => {
        window.addEventListener("popstate", () => navigate(location.pathname));
        document.addEventListener("click", (e) => {
          const anchor = e.target.closest("a[href]");
          if (!anchor) return;
          const href = anchor.getAttribute("href");
          if (/^https?:\/\//i.test(href) || href.startsWith("#")) return;
          e.preventDefault();
          const rel = href.startsWith("/") ? href : "/" + href;
          const abs = addBase(rel);
          history.pushState(null, "", abs);
          navigate(abs);
        });

        if (stripBase(location.pathname) === "/" && !location.pathname.endsWith("/")) {
          history.replaceState(null, "", addBase("/"));
        }
        navigate(location.pathname);
        return Router;
      },
    };
  })();

  const State = (() => {
    const store = new Map();
    const subscribers = new Map();

    const notifySubscribers = (key, value) => {
      const keySubscribers = subscribers.get(key) || [];
      keySubscribers.forEach((callback) => callback(value, key));
    };

    return {
      set: curry((key, value) => {
        store.set(key, value);
        notifySubscribers(key, value);
        return value;
      }),

      get: (key) => store.get(key),

      update: curry((key, updater) => {
        const currentValue = store.get(key);
        const newValue = updater(currentValue);
        store.set(key, newValue);
        notifySubscribers(key, newValue);
        return newValue;
      }),

      subscribe: curry((key, callback) => {
        if (!subscribers.has(key)) {
          subscribers.set(key, []);
        }
        subscribers.get(key).push(callback);

        return () => {
          const keySubscribers = subscribers.get(key);
          const index = keySubscribers.indexOf(callback);
          if (index > -1) {
            keySubscribers.splice(index, 1);
          }
        };
      }),

      computed: curry((keys, computer) => {
        const compute = () => {
          const values = keys.map((key) => store.get(key));
          return computer(...values);
        };

        keys.forEach((key) => {
          State.subscribe(key, compute);
        });

        return compute;
      }),
    };
  })();

  const Lifecycle = (() => {
    let current = { onLoad: [], onUnload: [] };
    let next = { onLoad: [], onUnload: [] };
    let mountedOnce = false;

    return {
      onLoad: (cb) => {
        next.onLoad.push(cb);
        return Lifecycle;
      },
      onUnload: (cb) => {
        next.onUnload.push(cb);
        return Lifecycle;
      },

      triggerUnload: () => {
        if (!mountedOnce) return Lifecycle;
        current.onUnload.forEach((cb) => cb());
        current = { onLoad: [], onUnload: [] };
        return Lifecycle;
      },

      promoteAndLoad: () => {
        current = next;
        next = { onLoad: [], onUnload: [] };
        current.onLoad.forEach((cb) => cb());
        mountedOnce = true;
        return Lifecycle;
      },
    };
  })();

  const createApp = (config = {}) => {
    const container = config.container || "#app";
    const element = typeof container === "string" ? document.querySelector(container) : container;

    if (!element) {
      throw new Error(`Container not found`);
    }

    const app = {
      route: Router.add,
      navigate: Router.navigate,
      beforeRoute: Router.beforeRoute,
      afterRoute: Router.afterRoute,

      setState: curry((key, value) => {
        State.set(key, value);
        return app;
      }),
      getState: State.get,
      updateState: curry((key, updater) => {
        State.update(key, updater);
        return app;
      }),
      subscribe: State.subscribe,
      computed: State.computed,

      onLoad: Lifecycle.onLoad,
      onUnload: Lifecycle.onUnload,

      render: (template, data = {}) => {
        Lifecycle.triggerUnload();
        const compiledHTML = TemplateEngine.compile(data, template);
        element.innerHTML = compiledHTML;
        Lifecycle.promoteAndLoad();
        return app;
      },

      template: curry((templateStr, data) => {
        return TemplateEngine.compile(data, templateStr);
      }),

      component: (name, templateStr) => {
        return curry((data = {}) => {
          return app.template(templateStr, data);
        });
      },

      bindState: (keys, template) => {
        const renderWithState = () => {
          const stateData = Array.isArray(keys)
            ? keys.reduce((acc, key) => ({ ...acc, [key]: State.get(key) }), {})
            : { [keys]: State.get(keys) };

          app.render(template, stateData);
        };

        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach((key) => State.subscribe(key, renderWithState));

        return renderWithState;
      },

      init: () => {
        Router.init();
        return app;
      },
    };

    return app;
  };

  const helpers = {
    debounce: (fn, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    throttle: (fn, delay) => {
      let lastCall = 0;
      return (...args) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          return fn.apply(this, args);
        }
      };
    },
  };

  const miojo = {
    createApp,
    Router,
    State,
    Lifecycle,
    TemplateEngine,
    helpers,
    pipe,
    compose,
    curry,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = miojo;
  } else if (typeof define === "function" && define.amd) {
    define(() => miojo);
  } else {
    window.miojo = miojo;
  }
})();