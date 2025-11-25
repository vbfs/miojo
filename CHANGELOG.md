# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.6] - 2025-01-25

### Added

#### Security
- **HTML Escaping**: Added automatic HTML escaping in templates to prevent XSS attacks
  - All `{{ }}` variables are now automatically escaped
  - Use `{{{ }}}` for raw HTML output when needed
  - Route parameters are sanitized to prevent injection attacks

#### Performance
- **Template Caching**: Implemented LRU cache for compiled templates (100 item limit)
- **Computed Memoization**: Computed values now cache results and only recompute when dependencies change
- **Debounced Rendering**: Added `debounce` option to `bindState()` for better performance

#### Features
- **HTTP Helpers**: Complete HTTP utility library
  - `miojo.helpers.http.get(url, options)`
  - `miojo.helpers.http.post(url, data, options)`
  - `miojo.helpers.http.put(url, data, options)`
  - `miojo.helpers.http.delete(url, options)`
  - Automatic JSON parsing and error handling

- **DOM Helpers**: Comprehensive DOM manipulation utilities
  - `miojo.helpers.dom.qs(selector)` - Query selector
  - `miojo.helpers.dom.qsa(selector)` - Query selector all
  - `miojo.helpers.dom.create(tag, attrs)` - Create elements
  - `miojo.helpers.dom.addClass/removeClass/toggleClass/hasClass()` - Class manipulation

- **Event Delegation**: Global event delegation helper
  - `miojo.helpers.on(event, selector, handler)` - Event delegation with cleanup function

- **State Persistence**: LocalStorage integration for persistent state
  - `app.persist(key)` - Mark state key as persistent
  - Automatic save/load from localStorage
  - `State.clearPersisted()` - Clear persisted data

- **Wildcard Routes**: Router now supports wildcard patterns
  - Example: `app.route('/api/*', handler)` matches any path under /api
  - Wildcard content available as `params.wildcard`

- **404 Handler**: Custom not found route handler
  - `app.notFound(handler)` - Handle 404 errors gracefully

- **Partial Function**: Added `partial()` functional utility for partial application

- **TypeScript Definitions**: Complete TypeScript type definitions in `dist/index.d.ts`

- **Template Enhancements**:
  - `{{#if condition}}...{{else}}...{{/if}}` - If/else blocks
  - `{{ @first }}` and `{{ @last }}` - Loop helpers for first/last items
  - Better nested property support in loops

#### Developer Experience
- **Better Error Messages**: More descriptive error messages throughout
  - Clear container not found errors
  - Template compilation errors with details
  - HTTP request errors with status codes

- **Error Boundaries**: All major functions wrapped in try-catch with proper error handling
  - Template compilation errors show user-friendly messages
  - Lifecycle callbacks won't crash the app
  - State subscriber errors are caught and logged

- **Cleanup Functions**: All subscriptions now return cleanup functions
  - `bindState().cleanup()` - Prevent memory leaks
  - `helpers.on()` returns unsubscribe function
  - `subscribe()` returns unsubscribe function

#### Security Headers
- **Dev Server Security**: Enhanced security headers in development server
  - Content Security Policy (CSP)
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: SAMEORIGIN
  - X-XSS-Protection
  - Referrer-Policy: strict-origin-when-cross-origin

### Fixed
- **Critical**: Fixed extra 'f' character in project scaffold template (bin/miojo.js:189)
- **Memory Leak**: Fixed memory leak in `bindState()` - now properly unsubscribes
- **Async Routes**: Router `navigate()` now supports async route handlers
- **Error Handling**: Added proper error handling in all lifecycle callbacks

### Changed
- **Breaking**: Template variables are now HTML-escaped by default
  - Migration: Use `{{{ variable }}}` for raw HTML output
- **Improved**: Computed values are now memoized for better performance
- **Improved**: Better error messages across the framework
- **Improved**: All callbacks now have error boundaries

### Performance Improvements
- Template compilation is now cached (up to 100 templates)
- Computed values only recalculate when dependencies change
- Debounced state updates available via options
- Reduced memory usage with proper cleanup

### Documentation
- Added comprehensive TypeScript definitions
- Added CHANGELOG.md
- Updated code comments throughout

## [0.0.5] - 2025-01-XX

### Changed
- Improved CLI help output
- Better bundle configuration
- Documentation improvements

## [0.0.4] - 2025-01-XX

### Changed
- Improved CLI server and documentation
- Bundle optimizations

## [0.0.3] - 2025-01-XX

### Added
- Initial stable release
- Core framework features
- CLI development server
- Project scaffolding

---

## Migration Guide: 0.0.5 → 0.0.6

### Breaking Changes

1. **HTML Escaping**: Template variables are now escaped by default
   ```javascript
   // Before (0.0.5)
   app.render('{{ html }}', { html: '<b>Bold</b>' });
   // Output: &lt;b&gt;Bold&lt;/b&gt;

   // After (0.0.6) - Use triple braces for raw HTML
   app.render('{{{ html }}}', { html: '<b>Bold</b>' });
   // Output: <b>Bold</b>
   ```

### New Features to Try

1. **State Persistence**
   ```javascript
   app.setState('user', null).persist('user');
   // User state now saved to localStorage!
   ```

2. **HTTP Helpers**
   ```javascript
   const users = await miojo.helpers.http.get('/api/users');
   await miojo.helpers.http.post('/api/users', { name: 'John' });
   ```

3. **Memory Leak Prevention**
   ```javascript
   const render = app.bindState('count', template);
   render();

   // Later, when changing routes:
   render.cleanup(); // Prevents memory leaks!
   ```

4. **404 Handling**
   ```javascript
   app.notFound(({ path }) => {
     app.render('<h1>404 - Page not found</h1><p>{{ path }}</p>', { path });
   });
   ```

5. **Wildcard Routes**
   ```javascript
   app.route('/api/*', (params) => {
     console.log(params.wildcard); // Everything after /api/
   });
   ```

### Recommended Updates

1. Check your templates for HTML that should be raw (use `{{{ }}}`)
2. Add `.persist()` to state keys you want saved
3. Use `bindState().cleanup()` when changing routes
4. Replace manual fetch calls with `miojo.helpers.http.*`
5. Add a 404 handler with `app.notFound()`

---

For more information, visit: https://github.com/vbfs/miojo
