const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map();

wss.on('connection', (ws) => {
    let clientId = null;
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'register') {
                clientId = data.id;
                clients.set(clientId, ws);
                console.log(`Клиент зарегистрирован: ${clientId}`);
                return;
            }
            if (data.target && clients.has(data.target)) {
                clients.get(data.target).send(JSON.stringify({
                    sender: clientId,
                    payload: data.payload
                }));
            }
        } catch (err) {
            console.error('Ошибка обработки:', err);
        }
    });
    ws.on('close', () => {
        if (clientId) {
            clients.delete(clientId);
            console.log(`Клиент отключился: ${clientId}`);
        }
    });
});
console.log('Сигнальный WebRTC сервер запущен на порту 8080');
