const { WebSocketServer } = require('ws');

// ИСПРАВЛЕНО: Берем порт, который требует Render, иначе трафик не зайдет в контейнер
const serverPort = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: serverPort });
const clients = new Map();

wss.on('connection', (ws, req) => {
    console.log(`[СЕРВЕР] Физический коннект! Всего клиентов на связи: ${wss.clients.size}`);

    ws.on('message', (message, isBinary) => {
        let messageString = '';
        if (Buffer.isBuffer(message)) {
            messageString = message.toString();
        } else if (typeof message === 'string') {
            messageString = message;
        }

        // 1. СНАЧАЛА ПРОВЕРЯЕМ СИСТЕМНЫЙ ТЕКСТ (JSON Регистрация)
        if (messageString.trim().startsWith('{')) {
            try {
                const data = JSON.parse(messageString);
                if (data.type === 'register' && data.id) {
                    ws.id = data.id; 
                    clients.set(ws.id, ws);
                    console.log(`[СЕРВЕР] Успешная регистрация: ${ws.id}`);
                    
                    // Сообщаем пульту, что косилка успешно зашла в сеть
                    if (ws.id === 'mower' && clients.has('remote')) {
                        clients.get('remote').send(JSON.stringify({ system: 'mower_online' }));
                    }
                    return; 
                }
            } catch (err) {
                // Если не JSON, идем дальше к стримингу
            }
        }

        // 2. СЛОЙ СТРИМИНГА ВИДЕО
        if (ws.id === 'mower') {
            const remoteWs = clients.get('remote');
            if (remoteWs && remoteWs.readyState === 1) { 
                remoteWs.send(message, { binary: true });
            }
            return; 
        }
    });

    ws.on('close', () => {
        if (ws.id) {
            clients.delete(ws.id);
            console.log(`[СЕРВЕР] Устройство отключилось: ${ws.id}`);
        }
    });
});

// Выводим порт в консоль для наглядности при старте
console.log(`Умный видеосервер запущен на порту ${serverPort} в облаке Render и готов к работе!`);
