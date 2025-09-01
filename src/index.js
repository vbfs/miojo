(() => {
  "use strict";

  // === UTILS FUNCIONAIS ===
  const pipe =
    (...fns) =>
    (value) =>
      fns.reduce((acc, fn) => fn(acc), value);
  const compose =
    (...fns) =>
    (value) =>
      fns.reduceRight((acc, fn) => fn(acc), value);
  const curry =
    (fn) =>
    (...args) =>
      args.length >= fn.length ? fn(...args) : curry(fn.bind(null, ...args));
  const partial =
    (fn, ...args1) =>
    (...args2) =>
      fn(...args1, ...args2);

  const TemplateEngine = {
    // Compilar variables {{ variable }}
    compileVariables: (template, data = {}) => {
      return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, key) => {
        const value = key
          .split(".")
          .reduce((obj, prop) => obj?.[prop.trim()], data);
        return value !== undefined ? String(value) : "";
      });
    },

    // Compilar loops {{#each items}}...{{/each}}
    compileEach: (template, data = {}) => {
      return template.replace(
        /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
        (match, arrayKey, loopTemplate) => {
          const array = data[arrayKey];
          if (!Array.isArray(array)) return "";

          return array
            .map((item, index) => {
              let compiled = loopTemplate;

              // Substituir {{ this.property }}
              compiled = compiled.replace(
                /\{\{\s*this\.(\w+)\s*\}\}/g,
                (match, prop) => {
                  return item[prop] !== undefined ? String(item[prop]) : "";
                }
              );

              // Substituir {{ this }}
              compiled = compiled.replace(/\{\{\s*this\s*\}\}/g, String(item));

              // Substituir {{ @index }}
              compiled = compiled.replace(
                /\{\{\s*@index\s*\}\}/g,
                String(index)
              );

              return compiled;
            })
            .join("");
        }
      );
    },

    // Compilar condicionais {{#if condition}}...{{/if}}
    compileIf: (template, data = {}) => {
      return template.replace(
        /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
        (match, condition, content) => {
          const value = data[condition];
          return value ? content : "";
        }
      );
    },

    // Compilar condicionais negativas {{#unless condition}}...{{/unless}}
    compileUnless: (template, data = {}) => {
      return template.replace(
        /\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
        (match, condition, content) => {
          const value = data[condition];
          return !value ? content : "";
        }
      );
    },

    // Função principal de compilação (pipe de transformações)
    compile: curry((data, template) => {
      return pipe(
        (tmpl) => TemplateEngine.compileEach(tmpl, data),
        (tmpl) => TemplateEngine.compileIf(tmpl, data),
        (tmpl) => TemplateEngine.compileUnless(tmpl, data),
        (tmpl) => TemplateEngine.compileVariables(tmpl, data)
      )(template);
    }),
  };

  // === ROUTER FUNCIONAL ===
  // === ROUTER FUNCIONAL ===
  const Router = (() => {
    const routes = new Map();
    const beforeRouteCallbacks = [];
    const afterRouteCallbacks = [];
    let basePath = ""; // <── NEW

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
      // aceita path absoluto (com base) ou relativo ("/counter")
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
      setBase, // <── NEW (expor)
      beforeRoute: (cb) => {
        beforeRouteCallbacks.push(cb);
        return Router;
      },
      afterRoute: (cb) => {
        afterRouteCallbacks.push(cb);
        return Router;
      },
      init: () => {
        // Detecta base automaticamente: /p/:id/:project
        if (!basePath) {
          const m = location.pathname.match(/^\/p\/[^/]+\/[^/]+/);
          if (m) setBase(m[0]);
        }

        window.addEventListener("popstate", () => navigate(location.pathname));
        document.addEventListener("click", (e) => {
          const anchor = e.target.closest("a[href]");
          if (!anchor) return;
          const href = anchor.getAttribute("href");
          // só internal links
          if (/^https?:\/\//i.test(href) || href.startsWith("#")) return;
          e.preventDefault();
          // href pode ser relativo ("user/123") ou absoluto ("/counter")
          const rel = href.startsWith("/") ? href : "/" + href;
          const abs = addBase(rel);
          history.pushState(null, "", abs);
          navigate(abs);
        });

        // Força barra no final do root para não quebrar caminhos relativos
        if (
          stripBase(location.pathname) === "/" &&
          !location.pathname.endsWith("/")
        ) {
          history.replaceState(null, "", addBase("/"));
        }
        navigate(location.pathname);
        return Router;
      },
    };
  })();

  // === STATE MANAGER FUNCIONAL ===
  const State = (() => {
    const store = new Map();
    const subscribers = new Map();

    const createSelector = (key) => () => store.get(key);

    const createAction = curry((key, updater, payload) => {
      const currentValue = store.get(key);
      const newValue =
        typeof updater === "function"
          ? updater(currentValue, payload)
          : updater;

      store.set(key, newValue);
      notifySubscribers(key, newValue);
      return newValue;
    });

    const notifySubscribers = (key, value) => {
      const keySubscribers = subscribers.get(key) || [];
      keySubscribers.forEach((callback) => callback(value, key));
    };

    return {
      set: curry((key, value) => {
        store.set(key, value);
        notifySubscribers(key, value);
        return value; // Apenas retorna o valor, não o State
      }),

      get: (key) => store.get(key),

      update: curry((key, updater) => {
        const currentValue = store.get(key);
        const newValue = updater(currentValue);
        store.set(key, newValue);
        notifySubscribers(key, newValue);
        return newValue; // Retorna apenas o novo valor
      }),

      subscribe: curry((key, callback) => {
        if (!subscribers.has(key)) {
          subscribers.set(key, []);
        }
        subscribers.get(key).push(callback);

        // Retorna função de unsubscribe
        return () => {
          const keySubscribers = subscribers.get(key);
          const index = keySubscribers.indexOf(callback);
          if (index > -1) {
            keySubscribers.splice(index, 1);
          }
        };
      }),

      // Selectors funcionais
      select: createSelector,

      // Actions funcionais
      action: createAction,

      // Estado computado
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

  // === LIFECYCLE HOOKS ===
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

  // === CORE miojo APP ===
  const createApp = (config = {}) => {
    const container = config.container || "#app";
    const element =
      typeof container === "string"
        ? document.querySelector(container)
        : container;

    if (!element) {
      throw new Error(`Container ${container} não encontrado`);
    }

    const app = {
      // Router integration
      route: Router.add,
      navigate: Router.navigate,
      beforeRoute: Router.beforeRoute,
      afterRoute: Router.afterRoute,

      // State integration
      setState: curry((key, value) => {
        State.set(key, value);
        return app; // Retorna app para method chaining
      }),
      getState: State.get,
      updateState: curry((key, updater) => {
        State.update(key, updater);
        return app; // Retorna app para method chaining
      }),
      subscribe: State.subscribe,
      computed: State.computed,

      // Lifecycle integration
      onLoad: Lifecycle.onLoad,
      onUnload: Lifecycle.onUnload,

      // Template rendering
      render: (template, data = {}) => {
        Lifecycle.triggerUnload(); // desmonta anterior (se houver)
        const compiledHTML = TemplateEngine.compile(data, template);
        element.innerHTML = compiledHTML; // injeta novo HTML
        Lifecycle.promoteAndLoad(); // promove callbacks e chama onLoad do novo
        return app;
      },

      // Template from string with data binding
      template: curry((templateStr, data) => {
        return TemplateEngine.compile(data, templateStr);
      }),

      // Component factory funcional
      component: (name, templateStr) => {
        return curry((data = {}) => {
          return app.template(templateStr, data);
        });
      },

      // Auto re-render on state change
      bindState: (keys, template) => {
        const renderWithState = () => {
          const stateData = Array.isArray(keys)
            ? keys.reduce(
                (acc, key) => ({
                  ...acc,
                  [key]: State.get(key),
                }),
                {}
              )
            : { [keys]: State.get(keys) };

          app.render(template, stateData);
        };

        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach((key) => State.subscribe(key, renderWithState));

        return renderWithState;
      },

      // Initialize app
      init: () => {
        Router.init();
        return app;
      },
    };

    return app;
  };

  // === HELPERS UTILITÁRIOS ===
  const helpers = {
    // Event handling funcional
    on: curry((event, selector, handler) => {
      document.addEventListener(event, (e) => {
        if (e.target.matches(selector)) {
          handler(e);
        }
      });
    }),

    // Fetch funcional
    http: {
      get: (url) => fetch(url).then((r) => r.json()),
      post: curry((url, data) =>
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }).then((r) => r.json())
      ),
    },

    // DOM utilities
    dom: {
      qs: (selector) => document.querySelector(selector),
      qsa: (selector) => Array.from(document.querySelectorAll(selector)),
      create: (tag) => document.createElement(tag),
      addClass: curry((className, element) => {
        element.classList.add(className);
        return element;
      }),
      removeClass: curry((className, element) => {
        element.classList.remove(className);
        return element;
      }),
    },

    // Functional utilities
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

  // === API PÚBLICA ===
  const miojo = {
    createApp,
    Router,
    State,
    Lifecycle,
    TemplateEngine,
    helpers,
    // Functional utilities
    pipe,
    compose,
    curry,
    partial,
  };

  // Export para diferentes ambientes
  if (typeof module !== "undefined" && module.exports) {
    module.exports = miojo;
  } else if (typeof define === "function" && define.amd) {
    define(() => miojo);
  } else {
    window.miojo = miojo;
  }
})();
