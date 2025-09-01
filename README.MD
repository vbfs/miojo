# 🍜 miojo

> your spa ready in 3 minutes

a lightweight, functional JavaScript framework for building single-page applications with routing, state management, and templating - all in ~4kb.

## features

- 🎯 **functional first** - built with functional programming principles
- 🚦 **built-in router** - spa routing with parameters and hooks
- 🗃️ **state management** - reactive state with subscriptions
- 🎨 **template engine** - handlebars-like templating system
- ♻️ **lifecycle hooks** - mount/unmount component lifecycle
- ⚡ **zero dependencies** - works in any modern browser
- 🚀 **dev server** - built-in cli development server

## quick start

### via cdn
```html
<!DOCTYPE html>
<html>
<head>
    <title>my miojo app</title>
</head>
<body>
    <div id="app"></div>
    <script src="https://unpkg.com/miojo"></script>
    <script>
        const app = miojo.createApp({ container: '#app' });

        app.setState('message', 'hello miojo!');

        app.route('/', () => {
            app.render('<h1>{{ message }}</h1>', { message: app.getState('message') });
        });

        app.init();
    </script>
</body>
</html>
```

### via cli
```bash
# create new project
npx miojo-server create my-app
cd my-app

# start development server
npx miojo-server --open
```

## api reference

### creating an app

```javascript
const app = Miojo.createApp({
    container: '#app' // css selector or dom element
});
```

### routing

#### basic routing
```javascript
// define routes
app.route('/', () => {
    app.render('<h1>home page</h1>');
});

app.route('/about', () => {
    app.render('<h1>about page</h1>');
});

// route with parameters
app.route('/user/:id', (params) => {
    app.render(`<h1>user ${params.id}</h1>`);
});

// navigate programmatically
app.navigate('/user/123');
```

#### route hooks
```javascript
// before route change
app.beforeRoute((path) => {
    console.log('navigating to:', path);
    // return false to cancel navigation
});

// after route change
app.afterRoute((path, params) => {
    console.log('navigated to:', path, params);
});
```

#### base path
```javascript
// automatically detects base path from url like /p/user/project
// or set manually
miojo.Router.setBase('/my-app');
```

### state management

#### basic state operations
```javascript
// set state
app.setState('count', 0);
app.setState('user', { name: 'john', age: 30 });

// get state
const count = app.getState('count');

// update state
app.updateState('count', count => count + 1);
app.updateState('user', user => ({ ...user, age: user.age + 1 }));
```

#### state subscriptions
```javascript
// subscribe to state changes
const unsubscribe = app.subscribe('count', (newValue) => {
    console.log('count changed:', newValue);
});

// unsubscribe
unsubscribe();
```

#### computed state
```javascript
// computed values from multiple state keys
const getFullName = app.computed(['firstName', 'lastName'], (first, last) => {
    return `${first} ${last}`;
});

console.log(getFullName()); // updates when firstName or lastName change
```

#### reactive rendering
```javascript
// automatically re-render when state changes
app.bindState(['count', 'message'], `
    <div>
        <h1>{{ message }}</h1>
        <p>count: {{ count }}</p>
        <button onclick="increment()">+1</button>
    </div>
`);

window.increment = () => app.updateState('count', c => c + 1);
```

### templating

#### variables
```javascript
const template = '<h1>{{ title }}</h1>';
const data = { title: 'hello world' };
app.render(template, data);
```

#### nested properties
```javascript
const template = '<p>{{ user.profile.name }}</p>';
const data = {
    user: {
        profile: { name: 'john doe' }
    }
};
app.render(template, data);
```

#### loops
```javascript
const template = `
    <ul>
        {{#each items}}
            <li>{{ this.name }} - ${{ this.price }}</li>
        {{/each}}
    </ul>
`;

const data = {
    items: [
        { name: 'apple', price: 1.99 },
        { name: 'banana', price: 0.99 }
    ]
};

app.render(template, data);
```

#### loop helpers
```javascript
const template = `
    {{#each users}}
        <div data-index="{{ @index }}">
            {{ @index }}: {{ this.name }}
        </div>
    {{/each}}
`;
```

#### conditionals
```javascript
const template = `
    {{#if isLoggedIn}}
        <p>welcome back!</p>
    {{/if}}

    {{#unless isLoading}}
        <button>click me</button>
    {{/unless}}
`;

const data = { isLoggedIn: true, isLoading: false };
app.render(template, data);
```

### lifecycle hooks

```javascript
app.onLoad(() => {
    console.log('component mounted');
    // initialize component
});

app.onUnload(() => {
    console.log('component unmounting');
    // cleanup timers, event listeners, etc.
});
```

### components

#### functional components
```javascript
// create reusable component
const Button = app.component('button', `
    <button class="{{ className }}" onclick="{{ onClick }}">
        {{ text }}
    </button>
`);

// use component
const buttonHtml = Button({
    className: 'btn btn-primary',
    text: 'click me',
    onClick: 'handleClick()'
});

app.render(buttonHtml);
```

#### complex components
```javascript
const UserCard = app.component('user-card', `
    <div class="card">
        <img src="{{ avatar }}" alt="{{ name }}">
        <h3>{{ name }}</h3>
        <p>{{ email }}</p>
        {{#if isActive}}
            <span class="badge">active</span>
        {{/if}}
        <div class="stats">
            {{#each stats}}
                <div>{{ this.label }}: {{ this.value }}</div>
            {{/each}}
        </div>
    </div>
`);

const userData = {
    avatar: '/avatar.jpg',
    name: 'jane doe',
    email: 'jane@example.com',
    isActive: true,
    stats: [
        { label: 'posts', value: 42 },
        { label: 'followers', value: 1337 }
    ]
};

app.render(UserCard(userData));
```

### helpers

#### event handling
```javascript
// functional event delegation
miojo.helpers.on('click', '.btn', (event) => {
    console.log('button clicked:', event.target);
});

miojo.helpers.on('submit', 'form', (event) => {
    event.preventDefault();
    // handle form
});
```

#### http requests
```javascript
// get request
const data = await miojo.helpers.http.get('/api/users');

// post request
const result = await miojo.helpers.http.post('/api/users', {
    name: 'john',
    email: 'john@example.com'
});
```

#### dom utilities
```javascript
const { dom } = miojo.helpers;

// query selectors
const element = dom.qs('.my-class');
const elements = dom.qsa('.my-class');

// create elements
const div = dom.create('div');

// class manipulation
dom.addClass('active', element);
dom.removeClass('inactive', element);
```

#### performance utilities
```javascript
// debounced function
const search = miojo.helpers.debounce((query) => {
    // search logic
}, 300);

// throttled function
const scroll = miojo.helpers.throttle(() => {
    // scroll handler
}, 16);
```

### functional programming utilities

```javascript
const { pipe, compose, curry, partial } = miojo;

// pipe functions left to right
const processData = pipe(
    data => data.filter(x => x.active),
    data => data.map(x => x.name),
    data => data.sort()
);

// compose functions right to left
const transform = compose(
    x => x.toUpperCase(),
    x => x.trim(),
    x => x.replace(/\s+/g, '_')
);

// curry functions
const add = curry((a, b) => a + b);
const add5 = add(5);
console.log(add5(3)); // 8

// partial application
const greet = (greeting, name) => `${greeting}, ${name}!`;
const sayHello = partial(greet, 'hello');
console.log(sayHello('world')); // "hello, world!"
```

## examples

### counter app
```javascript
const app = miojo.createApp({ container: '#app' });

app.setState('count', 0);

const template = `
    <div class="counter">
        <h1>{{ count }}</h1>
        <button onclick="decrement()">-</button>
        <button onclick="increment()">+</button>
    </div>
`;

window.increment = () => app.updateState('count', c => c + 1);
window.decrement = () => app.updateState('count', c => c - 1);

app.route('/', () => {
    app.bindState('count', template)();
});

app.init();
```

### todo app
```javascript
const app = miojo.createApp({ container: '#app' });

app.setState('todos', [])
   .setState('newTodo', '');

const template = `
    <div class="todo-app">
        <h1>todos</h1>

        <form onsubmit="addTodo(event)">
            <input value="{{ newTodo }}" onchange="updateNewTodo(event)" placeholder="add todo...">
            <button type="submit">add</button>
        </form>

        <ul>
            {{#each todos}}
                <li>
                    <input type="checkbox" {{ this.completed ? 'checked' : '' }} onchange="toggleTodo({{ @index }})">
                    <span class="{{ this.completed ? 'completed' : '' }}">{{ this.text }}</span>
                    <button onclick="removeTodo({{ @index }})">×</button>
                </li>
            {{/each}}
        </ul>
    </div>
`;

window.addTodo = (event) => {
    event.preventDefault();
    const text = app.getState('newTodo');
    if (text.trim()) {
        app.updateState('todos', todos => [...todos, { text, completed: false }]);
        app.setState('newTodo', '');
    }
};

window.updateNewTodo = (event) => {
    app.setState('newTodo', event.target.value);
};

window.toggleTodo = (index) => {
    app.updateState('todos', todos =>
        todos.map((todo, i) =>
            i === index ? { ...todo, completed: !todo.completed } : todo
        )
    );
};

window.removeTodo = (index) => {
    app.updateState('todos', todos => todos.filter((_, i) => i !== index));
};

app.route('/', () => {
    app.bindState(['todos', 'newTodo'], template)();
});

app.init();
```

### spa with routing
```javascript
const app = miojo.createApp({ container: '#app' });

app.setState('users', []);

// layouts
const layout = (content) => `
    <nav>
        <a href="/">home</a>
        <a href="/users">users</a>
        <a href="/about">about</a>
    </nav>
    <main>${content}</main>
`;

// pages
app.route('/', () => {
    app.render(layout('<h1>welcome home</h1>'));
});

app.route('/users', async () => {
    const users = await miojo.helpers.http.get('/api/users');
    app.setState('users', users);

    const usersPage = `
        <h1>users</h1>
        <div class="users">
            {{#each users}}
                <div class="user-card">
                    <h3><a href="/users/{{ this.id }}">{{ this.name }}</a></h3>
                    <p>{{ this.email }}</p>
                </div>
            {{/each}}
        </div>
    `;

    app.render(layout(app.template(usersPage, { users })));
});

app.route('/users/:id', async (params) => {
    const user = await miojo.helpers.http.get(`/api/users/${params.id}`);

    const userPage = `
        <h1>{{ name }}</h1>
        <p>{{ email }}</p>
        <p>joined: {{ joinDate }}</p>
        <a href="/users">← back to users</a>
    `;

    app.render(layout(app.template(userPage, user)));
});

app.route('/about', () => {
    app.render(layout('<h1>about us</h1><p>we build great apps</p>'));
});

app.init();
```

## cli usage

### development server
```bash
# start server on default port 3000
npx miojo-server

# custom port
npx miojo-server 8080
npx miojo-server --port 3000

# open browser automatically
npx miojo-server --open

# serve specific directory
npx miojo-server --dir ./dist

# combined options
npx miojo-server --port 8080 --dir ./public --open
```

### project creation
```bash
# create new project
npx miojo-server create my-app
npx create-miojo-app my-app

cd my-app
npm run dev  # starts server and opens browser
```

### cli options
```bash
-p, --port <number>     server port (default: 3000)
-d, --dir <path>       directory to serve (default: current)
-o, --open             open browser automatically
-h, --help             show help
-v, --version          show version
create <name>          create new miojo project
```

## advanced patterns

### middleware pattern
```javascript
// create middleware for authentication
const authMiddleware = (next) => (path) => {
    if (path.startsWith('/admin') && !app.getState('isLoggedIn')) {
        app.navigate('/login');
        return false;
    }
    return next(path);
};

app.beforeRoute(authMiddleware((path) => {
    console.log('navigating to:', path);
}));
```

### store pattern
```javascript
// create centralized store
const store = {
    // actions
    login: (user) => {
        app.setState('user', user);
        app.setState('isLoggedIn', true);
    },

    logout: () => {
        app.setState('user', null);
        app.setState('isLoggedIn', false);
        app.navigate('/');
    },

    // getters
    isAuthenticated: () => app.getState('isLoggedIn'),
    currentUser: () => app.getState('user'),
};

// use in components
window.store = store;
```

### component composition
```javascript
const Header = app.component('header', `
    <header>
        <h1>{{ title }}</h1>
        {{#if showNav}}
            <nav>{{ nav }}</nav>
        {{/if}}
    </header>
`);

const Nav = app.component('nav', `
    <ul>
        {{#each items}}
            <li><a href="{{ this.href }}">{{ this.text }}</a></li>
        {{/each}}
    </ul>
`);

// compose components
const page = Header({
    title: 'my app',
    showNav: true,
    nav: Nav({
        items: [
            { href: '/', text: 'home' },
            { href: '/about', text: 'about' }
        ]
    })
});
```

## browser support

- chrome 60+
- firefox 55+
- safari 10.1+
- edge 79+

## size

- core: ~8kb gzipped
- with cli: ~12kb

## contributing

1. fork the repository
2. create your feature branch (`git checkout -b feature/amazing-feature`)
3. commit your changes (`git commit -m 'add amazing feature'`)
4. push to the branch (`git push origin feature/amazing-feature`)
5. open a pull request

## license

mit © [your name]

---

🍜 **miojo** - your spa ready in 3 minutes
