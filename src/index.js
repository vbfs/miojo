(() => {
  "use strict";

  // ============================================================================
  // FUNCTIONAL UTILITIES
  // ============================================================================

  const pipe = (...fns) => (value) => fns.reduce((acc, fn) => fn(acc), value);
  const compose = (...fns) => (value) => fns.reduceRight((acc, fn) => fn(acc), value);
  const curry = (fn) => (...args) => args.length >= fn.length ? fn(...args) : curry(fn.bind(null, ...args));
  const partial = (fn, ...presetArgs) => (...laterArgs) => fn(...presetArgs, ...laterArgs);

  // ============================================================================
  // TEMPLATE ENGINE
  // ============================================================================

  const TemplateEngine = (() => {
    const cache = new Map();
    const MAX_CACHE_SIZE = 100;

    // HTML escaping for XSS protection
    const escapeHTML = (str) => {
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const compileVariables = (template, data = {}, escape = true) => {
      try {
        // Raw output with {{{ }}} (no escaping)
        template = template.replace(/\{\{\{\s*([^}]+)\}\}\}/g, (match, key) => {
          const value = key.split(".").reduce((obj, prop) => obj?.[prop.trim()], data);
          return value !== undefined ? String(value) : "";
        });

        // Regular output with {{ }} (escaped)
        return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, key) => {
          const value = key.split(".").reduce((obj, prop) => obj?.[prop.trim()], data);
          return value !== undefined ? (escape ? escapeHTML(value) : String(value)) : "";
        });
      } catch (error) {
        console.error('Template variable compilation error:', error);
        return template;
      }
    };

    const compileEach = (template, data = {}) => {
      try {
        return template.replace(
          /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
          (match, arrayKey, loopTemplate) => {
            const array = data[arrayKey];
            if (!Array.isArray(array)) return "";

            return array
              .map((item, index) => {
                let compiled = loopTemplate;

                // Support nested properties: {{ this.user.name }}
                compiled = compiled.replace(/\{\{\s*this\.([\w.]+)\s*\}\}/g, (match, prop) => {
                  const value = prop.split('.').reduce((obj, p) => obj?.[p], item);
                  return value !== undefined ? escapeHTML(value) : "";
                });

                // Support simple this
                compiled = compiled.replace(/\{\{\s*this\s*\}\}/g, escapeHTML(item));

                // Support @index
                compiled = compiled.replace(/\{\{\s*@index\s*\}\}/g, String(index));

                // Support @first, @last
                compiled = compiled.replace(/\{\{\s*@first\s*\}\}/g, String(index === 0));
                compiled = compiled.replace(/\{\{\s*@last\s*\}\}/g, String(index === array.length - 1));

                return compiled;
              })
              .join("");
          }
        );
      } catch (error) {
        console.error('Template each compilation error:', error);
        return template;
      }
    };

    const compileIf = (template, data = {}) => {
      try {
        // Support if/else blocks
        template = template.replace(
          /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g,
          (match, condition, truthy, falsy) => {
            return data[condition] ? truthy : falsy;
          }
        );

        // Regular if blocks
        return template.replace(
          /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
          (match, condition, content) => {
            return data[condition] ? content : "";
          }
        );
      } catch (error) {
        console.error('Template if compilation error:', error);
        return template;
      }
    };

    const compileUnless = (template, data = {}) => {
      try {
        return template.replace(
          /\{\{#unless\s+(\w+)\}\}([\s\S]*?)\{\{\/unless\}\}/g,
          (match, condition, content) => {
            return !data[condition] ? content : "";
          }
        );
      } catch (error) {
        console.error('Template unless compilation error:', error);
        return template;
      }
    };

    const compile = curry((data, template) => {
      try {
        // Check cache first
        const cacheKey = JSON.stringify({ template, data });
        if (cache.has(cacheKey)) {
          return cache.get(cacheKey);
        }

        const result = pipe(
          (tmpl) => compileEach(tmpl, data),
          (tmpl) => compileIf(tmpl, data),
          (tmpl) => compileUnless(tmpl, data),
          (tmpl) => compileVariables(tmpl, data)
        )(template);

        // Cache with size limit (LRU-like behavior)
        if (cache.size >= MAX_CACHE_SIZE) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        cache.set(cacheKey, result);

        return result;
      } catch (error) {
        console.error('Template compilation error:', error);
        return `<div style="color: red; padding: 20px; border: 2px solid red;">
          <strong>Template Error:</strong> ${escapeHTML(error.message)}
        </div>`;
      }
    });

    return {
      compileVariables,
      compileEach,
      compileIf,
      compileUnless,
      compile,
      escapeHTML,
      clearCache: () => cache.clear()
    };
  })();

  // ============================================================================
  // ROUTER
  // ============================================================================

  const Router = (() => {
    const routes = new Map();
    const beforeRouteCallbacks = [];
    const afterRouteCallbacks = [];
    let basePath = "";
    let notFoundHandler = null;

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

    // Sanitize route parameters to prevent XSS
    const sanitizeParam = (param) => {
      return decodeURIComponent(param)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    };

    // Enhanced parameter extraction with wildcard support
    const extractParams = (pattern, path) => {
      const patternParts = pattern.split("/");
      const pathParts = path.split("/");

      const params = {};

      for (let i = 0; i < patternParts.length; i++) {
        const patternPart = patternParts[i];

        // Wildcard support
        if (patternPart === "*") {
          params.wildcard = pathParts.slice(i).map(sanitizeParam).join('/');
          return params;
        }

        // Named parameter
        if (patternPart.startsWith(":")) {
          if (!pathParts[i]) return null;
          params[patternPart.slice(1)] = sanitizeParam(pathParts[i]);
        } else if (patternPart !== pathParts[i]) {
          return null;
        }
      }

      return pathParts.length === patternParts.length ? params : null;
    };

    const findRoute = (path) => {
      // Exact match first
      if (routes.has(path)) {
        return { handler: routes.get(path), params: {} };
      }

      // Pattern matching
      for (const [pattern, handler] of routes) {
        const params = extractParams(pattern, path);
        if (params) return { handler, params };
      }

      return null;
    };

    const navigate = async (anyPath) => {
      const rel = stripBase(anyPath);

      // Execute before route callbacks
      const beforeResults = beforeRouteCallbacks.map((cb) => cb(rel));
      if (beforeResults.some((r) => r === false)) return;

      const route = findRoute(rel);

      if (route) {
        try {
          await route.handler(route.params);
          afterRouteCallbacks.forEach((cb) => cb(rel, route.params));
        } catch (error) {
          console.error('Route handler error:', error);
          if (notFoundHandler) {
            notFoundHandler({ error, path: rel });
          }
        }
      } else if (notFoundHandler) {
        notFoundHandler({ path: rel });
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

      notFound: (handler) => {
        notFoundHandler = handler;
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

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const State = (() => {
    const store = new Map();
    const subscribers = new Map();
    const persistKeys = new Set();
    const STORAGE_KEY = 'miojo_state';

    // Load persisted state from localStorage
    const loadPersisted = () => {
      try {
        if (typeof localStorage === 'undefined') return;

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.entries(parsed).forEach(([key, value]) => {
            store.set(key, value);
          });
        }
      } catch (error) {
        console.warn('Failed to load persisted state:', error);
      }
    };

    // Save persisted state to localStorage
    const savePersisted = () => {
      try {
        if (typeof localStorage === 'undefined') return;

        const toSave = {};
        persistKeys.forEach(key => {
          if (store.has(key)) {
            toSave[key] = store.get(key);
          }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (error) {
        console.warn('Failed to save persisted state:', error);
      }
    };

    const notifySubscribers = (key, value) => {
      const keySubscribers = subscribers.get(key) || [];
      keySubscribers.forEach((callback) => {
        try {
          callback(value, key);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    };

    // Initialize persisted state
    loadPersisted();

    return {
      set: curry((key, value) => {
        store.set(key, value);
        notifySubscribers(key, value);

        if (persistKeys.has(key)) {
          savePersisted();
        }

        return value;
      }),

      get: (key) => store.get(key),

      update: curry((key, updater) => {
        const currentValue = store.get(key);
        const newValue = updater(currentValue);
        store.set(key, newValue);
        notifySubscribers(key, newValue);

        if (persistKeys.has(key)) {
          savePersisted();
        }

        return newValue;
      }),

      subscribe: curry((key, callback) => {
        if (!subscribers.has(key)) {
          subscribers.set(key, []);
        }
        subscribers.get(key).push(callback);

        // Return unsubscribe function
        return () => {
          const keySubscribers = subscribers.get(key);
          if (keySubscribers) {
            const index = keySubscribers.indexOf(callback);
            if (index > -1) {
              keySubscribers.splice(index, 1);
            }
          }
        };
      }),

      // Computed values with memoization
      computed: curry((keys, computer) => {
        let cachedValue;
        let cachedKeys = [];
        let isInitialized = false;

        const compute = () => {
          const values = keys.map((key) => store.get(key));

          // Check if any value changed
          const hasChanged = !isInitialized || values.some((v, i) => v !== cachedKeys[i]);

          if (hasChanged) {
            try {
              cachedValue = computer(...values);
              cachedKeys = values;
              isInitialized = true;
            } catch (error) {
              console.error('Computed value error:', error);
              return undefined;
            }
          }

          return cachedValue;
        };

        // Subscribe to all keys
        keys.forEach((key) => {
          State.subscribe(key, compute);
        });

        return compute;
      }),

      // Mark a key as persistent
      persist: (key) => {
        persistKeys.add(key);
        savePersisted();
        return State;
      },

      // Clear persisted data
      clearPersisted: () => {
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch (error) {
          console.warn('Failed to clear persisted state:', error);
        }
      }
    };
  })();

  // ============================================================================
  // LIFECYCLE MANAGEMENT
  // ============================================================================

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

        current.onUnload.forEach((cb) => {
          try {
            cb();
          } catch (error) {
            console.error('Lifecycle onUnload error:', error);
          }
        });

        current = { onLoad: [], onUnload: [] };
        return Lifecycle;
      },

      promoteAndLoad: () => {
        current = next;
        next = { onLoad: [], onUnload: [] };

        current.onLoad.forEach((cb) => {
          try {
            cb();
          } catch (error) {
            console.error('Lifecycle onLoad error:', error);
          }
        });

        mountedOnce = true;
        return Lifecycle;
      },
    };
  })();

  // ============================================================================
  // HELPERS
  // ============================================================================

  const helpers = {
    // HTTP utilities
    http: {
      async request(url, options = {}) {
        try {
          const response = await fetch(url, options);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await response.json();
          }

          return await response.text();
        } catch (error) {
          console.error('HTTP request error:', error);
          throw error;
        }
      },

      get: (url, options = {}) =>
        helpers.http.request(url, { method: 'GET', ...options }),

      post: (url, data, options = {}) =>
        helpers.http.request(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...options.headers },
          body: JSON.stringify(data),
          ...options
        }),

      put: (url, data, options = {}) =>
        helpers.http.request(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...options.headers },
          body: JSON.stringify(data),
          ...options
        }),

      delete: (url, options = {}) =>
        helpers.http.request(url, { method: 'DELETE', ...options }),
    },

    // DOM utilities
    dom: {
      qs: (selector, parent = document) => parent.querySelector(selector),
      qsa: (selector, parent = document) => Array.from(parent.querySelectorAll(selector)),
      create: (tag, attrs = {}) => {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
          if (key === 'className') el.className = value;
          else if (key === 'textContent') el.textContent = value;
          else el.setAttribute(key, value);
        });
        return el;
      },
      addClass: (className, el) => el.classList.add(className),
      removeClass: (className, el) => el.classList.remove(className),
      toggleClass: (className, el) => el.classList.toggle(className),
      hasClass: (className, el) => el.classList.contains(className),
    },

    // Event delegation
    on: (event, selector, handler, options = {}) => {
      const listener = (e) => {
        const target = e.target.closest(selector);
        if (target) {
          handler.call(target, e);
        }
      };

      document.addEventListener(event, listener, options);

      // Return cleanup function
      return () => document.removeEventListener(event, listener, options);
    },

    // Performance utilities
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

  // ============================================================================
  // DOM DIFFING (Intelligent DOM Updates)
  // ============================================================================

  const DOMDiff = (() => {
    // Create a virtual node from a real DOM element
    const createVNode = (el) => {
      if (el.nodeType === Node.TEXT_NODE) {
        return { type: 'text', value: el.textContent };
      }

      if (el.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const vnode = {
        type: 'element',
        tag: el.tagName.toLowerCase(),
        attrs: {},
        children: []
      };

      // Copy attributes
      Array.from(el.attributes).forEach(attr => {
        vnode.attrs[attr.name] = attr.value;
      });

      // Copy children
      Array.from(el.childNodes).forEach(child => {
        const childVNode = createVNode(child);
        if (childVNode) vnode.children.push(childVNode);
      });

      return vnode;
    };

    // Parse HTML string to VNode tree
    const parseHTML = (html) => {
      const template = document.createElement('template');
      template.innerHTML = html.trim();

      const children = [];
      Array.from(template.content.childNodes).forEach(child => {
        const vnode = createVNode(child);
        if (vnode) children.push(vnode);
      });

      return children.length === 1 ? children[0] : { type: 'fragment', children };
    };

    // Check if two vnodes are the same type
    const sameVNode = (a, b) => {
      if (!a || !b) return false;
      if (a.type !== b.type) return false;
      if (a.type === 'text') return true;
      if (a.tag !== b.tag) return false;

      // Key-based reconciliation for lists
      const aKey = a.attrs?.key;
      const bKey = b.attrs?.key;
      if (aKey || bKey) {
        return aKey === bKey;
      }

      return true;
    };

    // Update attributes
    const updateAttributes = (el, oldAttrs = {}, newAttrs = {}) => {
      // Remove old attributes
      Object.keys(oldAttrs).forEach(key => {
        if (!(key in newAttrs)) {
          el.removeAttribute(key);
        }
      });

      // Add/update new attributes
      Object.keys(newAttrs).forEach(key => {
        const newValue = newAttrs[key];
        const oldValue = oldAttrs[key];

        if (newValue !== oldValue) {
          if (key === 'value' && el.tagName === 'INPUT') {
            // Special handling for input values to preserve cursor position
            if (document.activeElement !== el) {
              el.value = newValue;
            }
          } else if (key === 'checked') {
            el.checked = newValue === 'true' || newValue === 'checked';
          } else {
            el.setAttribute(key, newValue);
          }
        }
      });
    };

    // Diff and patch children
    const patchChildren = (parent, oldChildren = [], newChildren = []) => {
      const oldLen = oldChildren.length;
      const newLen = newChildren.length;
      const maxLen = Math.max(oldLen, newLen);

      for (let i = 0; i < maxLen; i++) {
        const oldVNode = oldChildren[i];
        const newVNode = newChildren[i];
        const childEl = parent.childNodes[i];

        if (!newVNode) {
          // Remove extra old nodes
          if (childEl) {
            parent.removeChild(childEl);
          }
        } else if (!oldVNode) {
          // Add new nodes
          const newEl = createElementFromVNode(newVNode);
          parent.appendChild(newEl);
        } else {
          // Patch existing nodes
          patch(childEl, oldVNode, newVNode);
        }
      }
    };

    // Create a real DOM element from a VNode
    const createElementFromVNode = (vnode) => {
      if (vnode.type === 'text') {
        return document.createTextNode(vnode.value);
      }

      if (vnode.type === 'fragment') {
        const fragment = document.createDocumentFragment();
        vnode.children.forEach(child => {
          fragment.appendChild(createElementFromVNode(child));
        });
        return fragment;
      }

      const el = document.createElement(vnode.tag);

      // Set attributes
      Object.keys(vnode.attrs || {}).forEach(key => {
        if (key === 'checked') {
          el.checked = vnode.attrs[key] === 'true' || vnode.attrs[key] === 'checked';
        } else {
          el.setAttribute(key, vnode.attrs[key]);
        }
      });

      // Add children
      (vnode.children || []).forEach(child => {
        el.appendChild(createElementFromVNode(child));
      });

      return el;
    };

    // Main patch function - diff and update DOM
    const patch = (el, oldVNode, newVNode) => {
      // Replace with new element if not same type
      if (!sameVNode(oldVNode, newVNode)) {
        const newEl = createElementFromVNode(newVNode);
        el.parentNode?.replaceChild(newEl, el);
        return;
      }

      // Update text nodes
      if (newVNode.type === 'text') {
        if (oldVNode.value !== newVNode.value) {
          el.textContent = newVNode.value;
        }
        return;
      }

      // Update attributes
      if (newVNode.type === 'element') {
        updateAttributes(el, oldVNode.attrs, newVNode.attrs);

        // Patch children
        patchChildren(el, oldVNode.children, newVNode.children);
      }
    };

    // Main diff function
    const diff = (container, oldHTML, newHTML) => {
      try {
        // Parse both HTML strings to VNode trees
        const oldVNode = oldHTML ? parseHTML(oldHTML) : null;
        const newVNode = parseHTML(newHTML);

        // If no old content, just set innerHTML
        if (!oldVNode || container.childNodes.length === 0) {
          container.innerHTML = newHTML;
          return;
        }

        // Create VNode from current DOM
        const currentVNode = createVNode(container.firstChild);

        // Patch the DOM
        if (container.childNodes.length > 0) {
          patch(container.firstChild, currentVNode, newVNode);
        } else {
          container.appendChild(createElementFromVNode(newVNode));
        }
      } catch (error) {
        console.error('DOM Diff error:', error);
        // Fallback to innerHTML on error
        container.innerHTML = newHTML;
      }
    };

    return {
      diff,
      parseHTML,
      createVNode,
      patch
    };
  })();

  // ============================================================================
  // APP CREATION
  // ============================================================================

  const createApp = (config = {}) => {
    const container = config.container || "#app";
    const useDiff = config.useDiff !== false; // Default to true
    const element = typeof container === "string"
      ? document.querySelector(container)
      : container;

    if (!element) {
      throw new Error(
        `Miojo Error: Container not found: "${container}"\n` +
        `Make sure the element exists in the DOM before calling createApp()`
      );
    }

    // Track last rendered HTML for diffing
    let lastHTML = '';

    const app = {
      // Router methods
      route: Router.add,
      navigate: Router.navigate,
      beforeRoute: Router.beforeRoute,
      afterRoute: Router.afterRoute,
      notFound: Router.notFound,

      // State methods
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
      persist: (key) => {
        State.persist(key);
        return app;
      },

      // Lifecycle methods
      onLoad: Lifecycle.onLoad,
      onUnload: Lifecycle.onUnload,

      // Rendering
      render: (template, data = {}) => {
        Lifecycle.triggerUnload();

        try {
          const compiledHTML = TemplateEngine.compile(data, template);

          if (useDiff) {
            // Use intelligent DOM diffing
            DOMDiff.diff(element, lastHTML, compiledHTML);
            lastHTML = compiledHTML;
          } else {
            // Fallback to innerHTML (faster but loses focus)
            element.innerHTML = compiledHTML;
          }
        } catch (error) {
          console.error('Render error:', error);
          const errorHTML = `<div style="color: red; padding: 20px;">
            <strong>Render Error:</strong> ${TemplateEngine.escapeHTML(error.message)}
          </div>`;

          if (useDiff) {
            DOMDiff.diff(element, lastHTML, errorHTML);
            lastHTML = errorHTML;
          } else {
            element.innerHTML = errorHTML;
          }
        }

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

      // Reactive rendering with cleanup support
      bindState: (keys, template, options = {}) => {
        const { debounce = 0 } = options;
        const unsubscribers = [];

        let renderWithState = () => {
          const stateData = Array.isArray(keys)
            ? keys.reduce((acc, key) => ({ ...acc, [key]: State.get(key) }), {})
            : { [keys]: State.get(keys) };

          app.render(template, stateData);
        };

        // Apply debouncing if specified
        if (debounce > 0) {
          renderWithState = helpers.debounce(renderWithState, debounce);
        }

        // Subscribe to all keys
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach((key) => {
          const unsub = State.subscribe(key, renderWithState);
          unsubscribers.push(unsub);
        });

        // Add cleanup method to prevent memory leaks
        renderWithState.cleanup = () => {
          unsubscribers.forEach(unsub => unsub());
        };

        return renderWithState;
      },

      init: () => {
        Router.init();
        return app;
      },
    };

    return app;
  };

  // ============================================================================
  // EXPORTS
  // ============================================================================

  const miojo = {
    createApp,
    Router,
    State,
    Lifecycle,
    TemplateEngine,
    DOMDiff,
    helpers,
    pipe,
    compose,
    curry,
    partial,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = miojo;
  } else if (typeof define === "function" && define.amd) {
    define(() => miojo);
  } else {
    window.miojo = miojo;
  }
})();
