#!/usr/bin/env node

/**
 * miojo CLI Server
 * Executar via: npx miojo-server ou npx create-miojo-app
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configurações
const DEFAULT_PORT = 3000;
const DEFAULT_DIR = process.cwd();

// MIME types
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

// Cores para terminal
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

// Função para colorir texto
const colorize = (color, text) => `${colors[color]}${text}${colors.reset}`;

// Banner ASCII
const banner = `
${colorize('cyan', '┌─────────────────────────────────────────────┐')}
${colorize('cyan', '│')}  ${colorize('bright', '🍜 miojo server cli')}              ${colorize('cyan', '│')}
${colorize('cyan', '│')}  ${colorize('blue', 'your spa ready in 3 minutes')}                   ${colorize('cyan', '│')}
${colorize('cyan', '└─────────────────────────────────────────────┘')}
`;

// Parsear argumentos
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
                // Se é um número, assumir que é porta
                if (!isNaN(parseInt(arg))) {
                    options.port = parseInt(arg);
                }
                // Se é um path, assumir que é diretório
                else if (fs.existsSync(arg)) {
                    options.dir = path.resolve(arg);
                }
                break;
        }
    }

    return options;
}

// Mostrar ajuda
function showHelp() {
    console.log(`
${banner}

${colorize('bright', 'USO:')}
  ${colorize('green', 'npx miojo-server')}                    # Servidor na porta 3000
  ${colorize('green', 'npx miojo-server 8080')}               # Servidor na porta 8080
  ${colorize('green', 'npx miojo-server -p 3000 -o')}         # Servidor + abrir browser
  ${colorize('green', 'npx miojo-server create meu-app')}     # Criar novo projeto

${colorize('bright', 'OPÇÕES:')}
  ${colorize('yellow', '-p, --port <número>')}     Porta do servidor (padrão: 3000)
  ${colorize('yellow', '-d, --dir <caminho>')}     Diretório a servir (padrão: atual)
  ${colorize('yellow', '-o, --open')}              Abrir navegador automaticamente
  ${colorize('yellow', '-h, --help')}              Mostrar esta ajuda
  ${colorize('yellow', '-v, --version')}           Mostrar versão
  ${colorize('yellow', 'create <nome>')}           Criar novo projeto miojo

${colorize('bright', 'EXEMPLOS:')}
  ${colorize('green', 'npx miojo-server')}
  ${colorize('green', 'npx miojo-server 8080 --open')}
  ${colorize('green', 'npx miojo-server --port 3000 --dir ./dist')}
  ${colorize('green', 'npx miojo-server create minha-spa')}

${colorize('bright', 'ATALHOS:')}
  ${colorize('green', 'npx create-miojo-app meu-projeto')}    # Criar projeto
  ${colorize('green', 'npx miojo')}                          # Servidor rápido

${colorize('cyan', '📚 Documentação:')} https://github.com/seu-usuario/miojo
`);
}

// Mostrar versão
function showVersion() {
  const v = process.env.npm_package_version || '0.0.0';
  console.log(`🍜 miojo cli v${v}`);
}

// Criar novo projeto
function createProject(projectName) {
    const projectPath = path.join(process.cwd(), projectName);

    console.log(`${colorize('cyan', '🚀 Criando projeto:')} ${colorize('bright', projectName)}`);

    if (fs.existsSync(projectPath)) {
        console.log(`${colorize('red', '❌ Erro:')} Diretório '${projectName}' já existe!`);
        process.exit(1);
    }

    // Criar diretório
    fs.mkdirSync(projectPath, { recursive: true });

    // Template index.html
    const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName} - miojo v2.0</title>
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
    <script src="https://unpkg.com/miojo-v2@latest/dist/miojo.min.js"></script>
    <script src="app.js"></script>
</body>
</html>`;

    // Template app.js
    const appJs = `// ${projectName} - miojo v2.0 App
console.log('🔥 Iniciando ${projectName}...');

// Criar aplicação
const app = Beni.createApp({ container: '#app' });

// Estados iniciais
app.setState('appName', '${projectName}')
   .setState('count', 0);

// Template principal
const homeTemplate = \`
    <div class="fade-in min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div class="container mx-auto px-6 py-16">
            <div class="text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl mb-6 shadow-lg">
                    <span class="text-2xl font-bold text-white">B</span>
                </div>

                <h1 class="text-5xl font-bold text-gray-900 mb-4">{{ appName }}</h1>
                <p class="text-xl text-gray-600 mb-8">Criado com miojo v2.0</p>

                <div class="bg-white rounded-2xl p-8 shadow-lg max-w-md mx-auto">
                    <h2 class="text-2xl font-bold mb-4">Counter</h2>
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
                    <p>✨ Edite <code class="bg-gray-200 px-2 py-1 rounded">app.js</code> e veja as mudanças!</p>
                </div>
            </div>
        </div>
    </div>
\`;

// Funções do contador
window.incrementCount = () => app.updateState('count', c => c + 1);
window.decrementCount = () => app.updateState('count', c => c - 1);

// Rota principal
app.route('/', () => {
    app.bindState(['appName', 'count'], homeTemplate)();
});

// Inicializar app
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});`;

    // Template package.json
    const packageJson = `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "Aplicação criada com miojo v2.0",
  "main": "index.html",
  "scripts": {
    "dev": "npx miojo-server --open",
    "start": "npx miojo-server",
    "serve": "npx miojo-server 8080"
  },
  "keywords": ["miojo", "spa", "functional"],
  "author": "Desenvolvedor",
  "license": "MIT"
}`;

    // Criar arquivos
    fs.writeFileSync(path.join(projectPath, 'index.html'), indexHtml);
    fs.writeFileSync(path.join(projectPath, 'app.js'), appJs);
    fs.writeFileSync(path.join(projectPath, 'package.json'), packageJson);

    console.log(`${colorize('green', '✅ Projeto criado com sucesso!')}`);
    console.log(`
${colorize('bright', '📁 Próximos passos:')}
  ${colorize('cyan', `cd ${projectName}`)}
  ${colorize('cyan', 'npx miojo-server --open')}

${colorize('bright', '🚀 Comandos disponíveis:')}
  ${colorize('yellow', 'npm run dev')}     # Servidor + abrir browser
  ${colorize('yellow', 'npm start')}       # Servidor padrão
  ${colorize('yellow', 'npm run serve')}   # Servidor na porta 8080
`);
}

// Abrir navegador
function openBrowser(url) {
    const start = (process.platform === 'darwin' ? 'open' :
                  process.platform === 'win32' ? 'start' : 'xdg-open');
    require('child_process').exec(`${start} ${url}`, (err) => {
        if (err) {
            console.log(`${colorize('yellow', '⚠️')} Não foi possível abrir o navegador automaticamente`);
            console.log(`${colorize('cyan', '🔗 Acesse:')} ${colorize('bright', url)}`);
        }
    });
}

// Função principal do servidor
function startServer(options) {
    console.log(banner);

    const server = http.createServer((request, response) => {
        const parsedUrl = url.parse(request.url, true);
        let pathname = decodeURIComponent(parsedUrl.pathname);
        pathname = pathname.split('?')[0].split('#')[0];

        let filePath = path.join(options.dir, pathname);

        // Log da requisição
        const timestamp = new Date().toLocaleTimeString();
        console.log(`${colorize('cyan', `[${timestamp}]`)} ${colorize('white', request.method)} ${colorize('yellow', pathname)}`);

        // Auto-detecção de arquivo
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
                            <head><title>404 - Not Found</title></head>
                            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                                <h1>🔍 404 - Arquivo não encontrado</h1>
                                <p><code>${pathname}</code></p>
                                <a href="/">← Voltar para Home</a>
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

        console.log(`${colorize('green', '✅ Servidor rodando!')}`);
        console.log(`${colorize('cyan', '🌐 URL:')} ${colorize('bright', url)}`);
        console.log(`${colorize('cyan', '📂 Diretório:')} ${colorize('white', options.dir)}`);
        console.log(`${colorize('cyan', '⏰ Iniciado:')} ${colorize('white', new Date().toLocaleString())}`);
        console.log('');
        console.log(`${colorize('yellow', '💡 Para parar:')} Ctrl+C`);
        console.log(`${colorize('yellow', '📝 Para ajuda:')} npx miojo-server --help`);
        console.log('');

        if (options.open) {
            setTimeout(() => openBrowser(url), 1000);
        }
    });

    // Error handling
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`${colorize('red', '❌ Erro:')} Porta ${options.port} já está em uso!`);
            console.log(`${colorize('yellow', '💡 Tente:')} npx miojo-server ${options.port + 1}`);
        } else {
            console.error(`${colorize('red', '❌ Erro do servidor:')}`, err);
        }
        process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log(`\n${colorize('yellow', '🛑 Parando servidor...')}`);
        server.close(() => {
            console.log(`${colorize('green', '✅ Servidor parado!')}`);
            process.exit(0);
        });
    });
}

// Main function
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

// Executar se for chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { startServer, createProject, showHelp, showVersion };