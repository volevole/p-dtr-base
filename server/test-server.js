// test-server.js
const express = require('express');
const app = express();

// Отслеживаем регистрацию
const originalGet = app.get;
const routes = [];

app.get = function(path, ...handlers) {
    console.log(`[REGISTER] GET ${path}`);
    routes.push({ path, handlers: handlers.length });
    return originalGet.call(this, path, ...handlers);
};

// Простейшие маршруты
app.get('/api/test-abc', (req, res) => {
    console.log('HIT: /api/test-abc');
    res.json({ test: 'abc' });
});

app.get('/api/proxy-image', (req, res) => {
    console.log('HIT: /api/proxy-image');
    res.json({ proxy: 'image' });
});

app.get('/api/debug-simple', (req, res) => {
    console.log('HIT: /api/debug-simple');
    res.json({ debug: 'simple' });
});

app.get('/api/check-token', (req, res) => {
    console.log('HIT: /api/check-token');
    res.json({ token: 'check' });
});

app.get('/api/debug-routes', (req, res) => {
    console.log('HIT: /api/debug-routes');
    
    // Получаем реальные маршруты из Express
    const realRoutes = [];
    
    function processLayer(layer, path = '') {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods);
            realRoutes.push({
                path: path + layer.route.path,
                methods: methods
            });
        }
    }
    
    if (app._router && app._router.stack) {
        app._router.stack.forEach(layer => {
            processLayer(layer);
        });
    }
    
    res.json({
        message: 'Debug routes endpoint',
        routes: realRoutes,
        trackedRoutes: routes,
        routerExists: !!app._router,
        stackLength: app._router ? app._router.stack.length : 0
    });
});

// Middleware для логирования всех запросов
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`\nTest server started on port ${PORT}`);
    console.log('Test these URLs:');
    console.log('http://localhost:3002/api/test-abc');
    console.log('http://localhost:3002/api/proxy-image');
    console.log('http://localhost:3002/api/debug-simple');
    console.log('http://localhost:3002/api/check-token');
    console.log('http://localhost:3002/api/debug-routes');
});