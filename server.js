const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map();

wss.on('connection', (ws, req) => {
    // ЖЕСТКИЙ ПЕРВИЧНЫЙ ЛОГ: Срабатывает при любом сетевом стуке в облако
    console.log(`[СЕРВЕР] Физический коннект! Всего клиентов на связи: ${wss.clients.size}`);

    ws.on('message', (message, isBinary) => {
        // 1. СЛОЙ СТРИМИНГА ВИДЕО: Если пришли бинарные байты картинки (JFIF)
        if (isBinary || Buffer.isBuffer(message)) {
            const remoteWs = clients.get('remote');
            if (remoteWs && remoteWs.readyState === 1) { // 1 — OPEN
                remoteWs.send(message, { binary: true });
            }
            return; 
        }

        // 2. СЛОЙ СИСТЕМНОГО ТЕКСТА (JSON Регистрация)
        try {
            const data = JSON.parse(message);
            if (data.type === 'register' && data.id) {
                // Привязываем ID устройства напрямую к объекту сокета, чтобы избежать путаницы с let/const
                ws.id = data.id; 
                clients.set(ws.id, ws);
                console.log(`[СЕРВЕР] Успешная регистрация: ${ws.id}`);
                
                // Подтверждаем пульту, что косилка зашла, если они оба в сети
                if (ws.id === 'mower' && clients.has('remote')) {
                    clients.get('remote').send(JSON.stringify({ system: 'mower_online' }));
                }
                return;
            }
        } catch (err) {
            console.error('[СЕРВЕР] Ошибка парсинга JSON текста:', err.message);
        }
    });

    ws.on('close', () => {
        if (ws.id) {
            clients.delete(ws.id);
            console.log(`[СЕРВЕР] Устройство отключилось: ${ws.id}`);
        }
    });
});

console.log('Умный видеосервер запущен в облаке Render и полностью готов к работе!');
