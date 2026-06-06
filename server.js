const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 }); // Render сам перенаправит внешний порт на этот
const clients = new Map();

wss.on('connection', (ws) => {
    let clientId = null;

    ws.on('message', (message, isBinary) => {
        // КРИТИЧЕСКИЙ СЛОЙ: Если пришли бинарные байты картинки (JFIF)
        // Мы просто пересылаем их клиенту 'remote' (нашему пульту в Минске)
        if (isBinary || Buffer.isBuffer(message)) {
            const remoteWs = clients.get('remote');
            if (remoteWs && remoteWs.readyState === 1) { // 1 означает OPEN
                remoteWs.send(message, { binary: true });
            }
            return; // Выходим, не допуская JSON.parse!
        }

        // Если пришел обычный текст (регистрация клиентов)
        try {
            const data = JSON.parse(message);
            if (data.type === 'register') {
                clientId = data.id;
                clients.set(clientId, ws);
                console.log(`Клиент зарегистрирован в облаке: ${clientId}`);
                return;
            }
        } catch (err) {
            console.error('Ошибка парсинга текста:', err.message);
        }
    });

    ws.on('close', () => {
        if (clientId) {
            clients.delete(clientId);
            console.log(`Клиент отключился: ${clientId}`);
        }
    });
});

console.log('Умный видеосервер запущен в облаке Render');
