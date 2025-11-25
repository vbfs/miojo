# 🍜 Miojo v0.0.6 - Examples

Este diretório contém exemplos práticos demonstrando todas as novas funcionalidades do Miojo v0.0.6.

## 📚 Exemplos Disponíveis

### 1. 🎯 Advanced Todo App (`advanced-todo-app.html`)
**Demonstra:** Todas as features principais em uma aplicação completa

**Features:**
- ✅ HTML Escaping automático (proteção XSS)
- ✅ State Persistence com localStorage
- ✅ Computed values com memoização
- ✅ Template caching
- ✅ Filtros e busca
- ✅ Stats dashboard
- ✅ Wildcard routes
- ✅ 404 handler
- ✅ Memory leak prevention
- ✅ Loop helpers (@first, @last, @index)
- ✅ If/else blocks

**Como usar:**
```bash
cd examples
npx miojo --open
# Navigate to advanced-todo-app.html
```

### 2. 🌐 HTTP Helpers Demo (`http-demo.html`)
**Demonstra:** Novos HTTP helpers para requisições AJAX

**Features:**
- `miojo.helpers.http.get()` - GET requests
- `miojo.helpers.http.post()` - POST com JSON
- `miojo.helpers.http.put()` - PUT updates
- `miojo.helpers.http.delete()` - DELETE requests
- Automatic JSON parsing
- Error handling
- Status code validation

**API usada:** JSONPlaceholder (https://jsonplaceholder.typicode.com)

### 3. 💾 State Persistence Demo (`persistence-demo.html`)
**Demonstra:** State persistence com localStorage

**Features:**
- Auto-save para localStorage
- Auto-load na inicialização
- Seleção de quais states persistir
- Suporte para objetos e arrays
- Método `clearPersisted()`
- Comparação entre state persistido e não-persistido

**Teste:**
1. Altere valores
2. Recarregue a página
3. Valores persistem!

### 4. 🛡️ Security & XSS Protection (`security-demo.html`)
**Demonstra:** Proteção contra ataques XSS

**Features:**
- HTML escaping automático
- Teste de ataques XSS comuns
- Comparação entre output escapado e raw
- Sistema de comentários seguro
- Sanitização de route parameters
- Exemplos práticos de vulnerabilidades

**Ataques testados:**
- `<script>alert('XSS')</script>`
- `<img src=x onerror='alert(1)'>`
- `<svg onload=alert(1)>`
- `<iframe src=javascript:alert(1)>`
- E mais...

## 🚀 Como Executar os Exemplos

### Opção 1: Dev Server (Recomendado)
```bash
cd miojo
npx miojo examples --open
```

### Opção 2: Abrir diretamente no navegador
```bash
# No diretório examples/
open advanced-todo-app.html
# ou
start advanced-todo-app.html  # Windows
```

### Opção 3: Live Server
Se você usa VS Code:
1. Instale a extensão "Live Server"
2. Right-click no arquivo HTML
3. "Open with Live Server"

## 📖 Conceitos Demonstrados

### 1. Security First
```javascript
// ❌ v0.0.5 - Vulnerável a XSS
{{ userInput }}  // HTML não escapado

// ✅ v0.0.6 - Seguro por padrão
{{ userInput }}  // HTML automaticamente escapado

// Para HTML confiável:
{{{ trustedHTML }}}  // Raw output (use com cuidado!)
```

### 2. State Persistence
```javascript
// Auto-save para localStorage
app.setState('user', { name: 'John' })
   .persist('user');

// Auto-load na próxima visita
const user = app.getState('user');  // Dados persistidos!
```

### 3. HTTP Helpers
```javascript
// GET request
const users = await miojo.helpers.http.get('/api/users');

// POST with JSON
const newUser = await miojo.helpers.http.post('/api/users', {
  name: 'John',
  email: 'john@example.com'
});

// PUT update
await miojo.helpers.http.put('/api/users/1', { name: 'Jane' });

// DELETE
await miojo.helpers.http.delete('/api/users/1');
```

### 4. Computed Values (Memoized)
```javascript
// Apenas recalcula quando dependências mudam
const getTotal = app.computed(['items', 'tax'], (items, tax) => {
  return items.reduce((sum, item) => sum + item.price, 0) * (1 + tax);
});

// Chamadas subsequentes retornam valor em cache
getTotal();  // Calcula
getTotal();  // Cache (não recalcula)
```

### 5. Memory Leak Prevention
```javascript
// bindState agora retorna cleanup function
const render = app.bindState('count', template);
render();

// Limpar quando trocar de rota
app.onUnload(() => {
  render.cleanup();  // Previne memory leaks!
});
```

### 6. Enhanced Templates
```javascript
// If/Else
{{#if user.isLoggedIn}}
  <p>Welcome {{ user.name }}!</p>
{{else}}
  <a href="/login">Login</a>
{{/if}}

// Loop helpers
{{#each items}}
  <li class="{{ @first ? 'first' : '' }} {{ @last ? 'last' : '' }}">
    #{{ @index }}: {{ this.name }}
  </li>
{{/each}}
```

### 7. Wildcard Routes
```javascript
// Match anything under /api/
app.route('/api/*', (params) => {
  console.log(params.wildcard);  // Everything after /api/
});

// Nested wildcards
app.route('/docs/:version/*', (params) => {
  console.log(params.version);   // e.g., "v1"
  console.log(params.wildcard);  // e.g., "guide/intro"
});
```

### 8. 404 Handler
```javascript
app.notFound(({ path, error }) => {
  app.render(`
    <h1>404 - Not Found</h1>
    <p>Page {{ path }} doesn't exist</p>
  `, { path });
});
```

## 🎓 Learning Path

Recomendamos explorar os exemplos nesta ordem:

1. **security-demo.html** - Entenda a proteção XSS (IMPORTANTE!)
2. **persistence-demo.html** - Aprenda sobre state persistence
3. **http-demo.html** - Veja os HTTP helpers em ação
4. **advanced-todo-app.html** - Veja tudo integrado

## 🐛 Debugging

### Console Logs
Todos os exemplos incluem logs úteis no console:
- `🔄 Computing...` - Computed values sendo recalculados
- `📝 State changed` - State updates
- `✅ Success` - Operações bem-sucedidas
- `❌ Error` - Erros capturados

### LocalStorage
Para inspecionar dados persistidos:
```javascript
// No console do navegador
localStorage.getItem('miojo_state')

// Limpar tudo
miojo.State.clearPersisted()
```

### Performance
Abra o DevTools Performance tab para ver:
- Template caching em ação
- Computed value memoization
- Memory leak prevention

## 📊 Comparação com v0.0.5

| Feature | v0.0.5 | v0.0.6 |
|---------|---------|---------|
| XSS Protection | ❌ | ✅ Auto |
| State Persistence | ❌ | ✅ Built-in |
| HTTP Helpers | ❌ | ✅ Complete |
| Template Caching | ❌ | ✅ LRU Cache |
| Computed Memoization | ❌ | ✅ Auto |
| Memory Leak Fix | ❌ | ✅ Cleanup |
| Wildcard Routes | ❌ | ✅ Yes |
| 404 Handler | ❌ | ✅ Custom |
| If/Else Templates | ❌ | ✅ Yes |
| Loop Helpers | Basic | ✅ @first, @last |

## 💡 Dicas e Truques

### 1. Performance
```javascript
// Use debounce para inputs de busca
app.bindState('searchQuery', template, { debounce: 300 });
```

### 2. Segurança
```javascript
// SEMPRE escape user input (padrão)
{{ userInput }}

// Apenas use raw para content confiável
{{{ adminControlledHTML }}}
```

### 3. State Management
```javascript
// Persista apenas o necessário
app.setState('userId', 123).persist('userId');
app.setState('sessionToken', 'abc');  // Não persista tokens!
```

### 4. Error Handling
```javascript
try {
  const data = await miojo.helpers.http.get('/api/data');
} catch (error) {
  app.setState('error', error.message);
}
```

## 🔗 Links Úteis

- [Main README](../README.MD)
- [CHANGELOG](../CHANGELOG.md)
- [GitHub Issues](https://github.com/vbfs/miojo/issues)
- [TypeScript Definitions](../dist/index.d.ts)

## 🤝 Contribuindo

Quer adicionar mais exemplos? Pull requests são bem-vindos!

1. Crie um novo arquivo HTML em `examples/`
2. Documente as features demonstradas
3. Adicione uma seção neste README
4. Abra um PR

## 📝 Licença

MIT © Vinícius Barreto

---

🍜 **Miojo** - Your SPA ready in 3 minutes!
