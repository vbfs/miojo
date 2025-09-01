#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DEFAULT_PORT = 3000;
const DEFAULT_DIR = process.cwd();

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
};

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

const colorize = (color, text) => `${colors[color]}${text}${colors.reset}`;

const banner = `
${colorize('cyan', '┌─────────────────────────────────────────────┐')}
${colorize('cyan', '│')}  ${colorize('bright', '🍜 miojo server cli')}              ${colorize('cyan', '│')}
${colorize('cyan', '│')}  ${colorize('blue', 'your spa ready in 3 minutes')}          ${colorize('cyan', '│')}
${colorize('cyan', '└─────────────────────────────────────────────┘')}
`;

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        port: DEFAULT_PORT,
        dir: DEFAULT_DIR,
        open: false,
        help: false,
        version: false,
        create: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '-p':
            case '--port':
                options.port = parseInt(args[++i]) || DEFAULT_PORT;
                break;
            case '-d':
            case '--dir':
                options.dir = path.resolve(args[++i]);
                break;
            case '-o':
            case '--open':
                options.open = true;
                break;
            case '-h':
            case '--help':
                options.help = true;
                break;
            case '-v':
            case '--version':
                options.version = true;
                break;
            case 'create':
                options.create = args[++i] || 'miojo-app';
                break;
            default:
                if (!isNaN(parseInt(arg))) {
                    options.port = parseInt(arg);
                }
                else if (fs.existsSync(arg)) {
                    options.dir = path.resolve(arg);
                }
                break;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
${banner}

${colorize('bright', 'usage:')}
  ${colorize('green', 'npx miojo')}                    # server on port 3000
  ${colorize('green', 'npx miojo 8080')}               # server on port 8080
  ${colorize('green', 'npx miojo -p 3000 -o')}         # server + open browser
  ${colorize('green', 'npx miojo create my-app')}      # create new project

${colorize('bright', 'options:')}
  ${colorize('yellow', '-p, --port <number>')}     server port (default: 3000)
  ${colorize('yellow', '-d, --dir <path>')}        directory to serve (default: current)
  ${colorize('yellow', '-o, --open')}              open browser automatically
  ${colorize('yellow', '-h, --help')}              show this help
  ${colorize('yellow', '-v, --version')}           show version
  ${colorize('yellow', 'create <name>')}           create new miojo project

${colorize('bright', 'examples:')}
  ${colorize('green', 'npx miojo')}
  ${colorize('green', 'npx miojo 8080 --open')}
  ${colorize('green', 'npx miojo --port 3000 --dir ./dist')}
  ${colorize('green', 'npx miojo create my-spa')}

${colorize('bright', 'shortcuts:')}
  ${colorize('green', 'npx create-miojo-app my-project')}    # create project
  ${colorize('green', 'npx miojo')}                         # quick server

${colorize('cyan', '📚 Documentation:')} https://github.com/your-username/miojo
`);
}

function showVersion() {
    const v = process.env.npm_package_version || '0.0.0';
    console.log(`🍜 miojo cli v${v}`);
}

function createProject(projectName) {
    const projectPath = path.join(process.cwd(), projectName);

    console.log(`${colorize('cyan', '🚀 Creating project:')} ${colorize('bright', projectName)}`);

    if (fs.existsSync(projectPath)) {
        console.log(`${colorize('red', '❌ Error:')} Directory '${projectName}' already exists!`);
        process.exit(1);
    }

    fs.mkdirSync(projectPath, { recursive: true });

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - miojo</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body class="bg-gray-100 min-h-screen">
    <div id="app"></div>
    <script src="https://unpkg.com/miojo@latest/dist/miojo.min.js"></script>
    <script src="app.js"></script>
</body>
</html>`;

    const appJs = `// ${projectName} - miojo app
console.log('🔥 starting ${projectName}...');

const app = miojo.createApp({ container: '#app' });

app.setState('appName', '${projectName}')
   .setState('count', 0);

const homeTemplate = \`
    <div class="fade-in min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div class="container mx-auto px-6 py-16">
            <div class="text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
                    <span class="text-2xl font-bold text-white">🍜</span>
                </div>f

                <h1 class="text-5xl font-bold text-gray-900 mb-4">{{ appName }}</h1>
                <p class="text-xl text-gray-600 mb-8">built with miojo</p>

                <div class="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto">
                    <h2 class="text-2xl font-bold mb-4">counter</h2>
                    <div class="text-6xl font-mono text-blue-600 mb-6">{{ count }}</div>

                    <div class="space-x-4">
                        <button onclick="decrementCount()" class="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition">
                            -1
                        </button>
                        <button onclick="incrementCount()" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition">
                            +1
                        </button>
                    </div>
                </div>

                <div class="mt-8 text-gray-600">
                    <p>✨ edit <code class="bg-gray-200 px-2 py-1 rounded">app.js</code> and see changes!</p>
                </div>
            </div>
        </div>
    </div>
\`;

window.incrementCount = () => app.updateState('count', c => c + 1);
window.decrementCount = () => app.updateState('count', c => c - 1);

app.route('/', () => {
    app.bindState(['appName', 'count'], homeTemplate)();
});

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});`;

    const packageJson = `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "app built with miojo",
  "main": "index.html",
  "scripts": {
    "dev": "npx miojo --open",
    "start": "npx miojo",
    "serve": "npx miojo 8080"
  },
  "keywords": ["miojo", "spa", "functional"],
  "author": "developer",
  "license": "MIT"
}`;

    fs.writeFileSync(path.join(projectPath, 'index.html'), indexHtml);
    fs.writeFileSync(path.join(projectPath, 'app.js'), appJs);
    fs.writeFileSync(path.join(projectPath, 'package.json'), packageJson);

    console.log(`${colorize('green', '✅ project created successfully!')}`);
    console.log(`
${colorize('bright', '📁 next steps:')}
  ${colorize('cyan', `cd ${projectName}`)}
  ${colorize('cyan', 'npx miojo --open')}

${colorize('bright', '🚀 available commands:')}
  ${colorize('yellow', 'npm run dev')}     # server + open browser
  ${colorize('yellow', 'npm start')}       # default server
  ${colorize('yellow', 'npm run serve')}   # server on port 8080
`);
}

function openBrowser(url) {
    const start = (process.platform === 'darwin' ? 'open' :
                  process.platform === 'win32' ? 'start' : 'xdg-open');
    require('child_process').exec(`${start} ${url}`, (err) => {
        if (err) {
            console.log(`${colorize('yellow', '⚠️')} could not open browser automatically`);
            console.log(`${colorize('cyan', '🔗 access:')} ${colorize('bright', url)}`);
        }
    });
}

function startServer(options) {
    console.log(banner);

    const server = http.createServer((request, response) => {
        const parsedUrl = url.parse(request.url, true);
        let pathname = decodeURIComponent(parsedUrl.pathname);
        pathname = pathname.split('?')[0].split('#')[0];

        let filePath = path.join(options.dir, pathname);

        const timestamp = new Date().toLocaleTimeString();
        console.log(`${colorize('cyan', `[${timestamp}]`)} ${colorize('white', request.method)} ${colorize('yellow', pathname)}`);

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                if (pathname.endsWith('/') || !path.extname(pathname)) {
                    filePath = path.join(filePath, 'index.html');
                } else {
                    filePath = path.join(options.dir, 'index.html');
                }
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    console.log(`${colorize('red', '❌')} ${filePath}`);
                    response.writeHead(404, { 'Content-Type': 'text/html' });
                    response.end(`
                        <html>
                            <head><title>404 - not found</title></head>
                            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                                <h1>🔍 404 - file not found</h1>
                                <p><code>${pathname}</code></p>
                                <a href="/">← back to home</a>
                            </body>
                        </html>
                    `);
                    return;
                }

                const ext = path.extname(filePath).toLowerCase();
                const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

                response.writeHead(200, {
                    'Content-Type': mimeType,
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                response.end(data);
                console.log(`${colorize('green', '✅')} ${filePath.replace(options.dir, '')}`);
            });
        });
    });

    server.listen(options.port, () => {
        const url = `http://localhost:${options.port}`;

        console.log(`${colorize('green', '✅ server running!')}`);
        console.log(`${colorize('cyan', '🌐 url:')} ${colorize('bright', url)}`);
        console.log(`${colorize('cyan', '📂 directory:')} ${colorize('white', options.dir)}`);
        console.log(`${colorize('cyan', '⏰ started:')} ${colorize('white', new Date().toLocaleString())}`);
        console.log('');
        console.log(`${colorize('yellow', '💡 to stop:')} ctrl+c`);
        console.log(`${colorize('yellow', '📝 for help:')} npx miojo --help`);
        console.log('');

        if (options.open) {
            setTimeout(() => openBrowser(url), 1000);
        }
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`${colorize('red', '❌ error:')} port ${options.port} already in use!`);
            console.log(`${colorize('yellow', '💡 try:')} npx miojo ${options.port + 1}`);
        } else {
            console.error(`${colorize('red', '❌ server error:')}`, err);
        }
        process.exit(1);
    });

    process.on('SIGINT', () => {
        console.log(`\n${colorize('yellow', '🛑 stopping server...')}`);
        server.close(() => {
            console.log(`${colorize('green', '✅ server stopped!')}`);
            process.exit(0);
        });
    });
}

function main() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        return;
    }

    if (options.version) {
        showVersion();
        return;
    }

    if (options.create) {
        createProject(options.create);
        return;
    }

    startServer(options);
}

if (require.main === module) {
    main();
}

module.exports = { startServer, createProject, showHelp, showVersion };