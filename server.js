const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map();

wss.on('connection', (ws, req) => {
    console.log(`[СЕРВЕР] Новое физическое подключение!`);

    ws.on('message', (message, isBinary) => {
        // Если косилка шлет бинарный кадр камеры (isBinary)
        if (isBinary || Buffer.isBuffer(message)) {
            const remoteWs = clients.get('remote');
            if (remoteWs && remoteWs.readyState === 1) { // 1 означает OPEN
                remoteWs.send(message, { binary: true });
            }
            return;
        }

        // Если пришел обычный текст (регистрация)
        try {
            const data = JSON.parse(message);
            if (data.type === 'register') {
                const clientId = data.id;
                clients.set(clientId, ws);
                console.log(`[СЕРВЕР] Клиент успешно зарегистрирован: ${clientId}`);
                return;
            }
        } catch (err) {
            console.error('[СЕРВЕР] Ошибка парсинга текста:', err.message);
        }
    });

    ws.on('close', () => {
        for (let [id, clientWs] of clients.entries()) {
            if (clientWs === ws) {
                clients.delete(id);
                console.log(`[СЕРВЕР] Клиент отключился: ${id}`);
                break;
            }
        }
    });
});

console.log('Умный видеосервер запущен в облаке Render и готов к работе!');
