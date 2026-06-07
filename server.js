const { WebSocketServer } = require('ws');

const serverPort = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: serverPort });
const clients = new Map();

wss.on('connection', (ws, req) => {
    // Выводим реальное число подключений для отладки
    console.log(`[СЕРВЕР] Физический коннект! Всего сокетов в памяти: ${wss.clients.size}`);

    ws.on('message', (message, isBinary) => {
        let messageString = '';
        if (Buffer.isBuffer(message)) {
            messageString = message.toString();
        } else if (typeof message === 'string') {
            messageString = message;
        }

        // 1. СЛОЙ СИСТЕМНОГО ТЕКСТА И КОМАНД (JSON)
        if (messageString.trim().startsWith('{')) {
            try {
                const data = JSON.parse(messageString);
                
                // Обработка регистрации устройств
                if (data.type === 'register' && data.id) {
                    
                    // ЖЕСТКАЯ ЗАЩИТА ОТ ДУБЛИКАТОВ И ЗАВИСАНИЙ:
                    // Если устройство с таким ID уже было в сети — принудительно гасим старый сокет!
                    if (clients.has(data.id)) {
                        console.log(`[ЗАЩИТА] Удаляем зависший дубликат устройства: ${data.id}`);
                        const oldWs = clients.get(data.id);
                        try { oldWs.close(); } catch(e) {} // Закрываем старое соединение
                        clients.delete(data.id);
                    }

                    ws.id = data.id; 
                    clients.set(ws.id, ws);
                    console.log(`[СЕРВЕР] Успешная регистрация: ${ws.id}. Активных устройств: ${clients.size}`);
                    
                    if (ws.id === 'mower' && clients.has('remote')) {
                        clients.get('remote').send(JSON.stringify({ system: 'mower_online' }));
                    }
                    return; 
                }

                // Пересылка команд управления от remote к mower
                if (data.type === 'control' && data.cmd) {
                    const mowerWs = clients.get('mower');
                    if (mowerWs && mowerWs.readyState === 1) {
                        mowerWs.send(data.cmd); 
                    }
                    return;
                }
            } catch (err) {
                // Игнорируем ошибки парсинга, идем к видео
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
            // Удаляем из карты только если текущий закрывающийся сокет совпадает с тем, что лежит в Map
            if (clients.get(ws.id) === ws) {
                clients.delete(ws.id);
                console.log(`[СЕРВЕР] Устройство отключилось штатно: ${ws.id}`);
            }
        }
    });
});

console.log(`Умный видеосервер запущен на порту ${serverPort} в облаке Render и готов к работе!`);
