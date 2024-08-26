const { EventEmitter } = require('events');
const { client: WebSocketClient } = require('websocket');

const Config = require('../Config.js');
const { encode, decode, logger } = require('../Utils.js');

class WebsocketListener extends EventEmitter {
    name = null;
    interval = null;

    bot = null;
    headers = null;
    
    websocket_uri = null

    constructor(name) {
        super();

        var config = Config.read_config();
        this.name = name;
        this.interval = config.reconnect_interval;
        this.websocket_uri = (config.uri + 'websocket/minecraft');

        this.headers = {
            type: 'FakePlayer',
            info: encode({token: config.token, name: name})
        };

        this.connect();
    }

    connect() {
        logger.info(`[${this.name}] [Listener] 正在尝试连接到机器人……`);
        const websocket = new WebSocketClient();
        websocket.on('connect', (connection) => {
            this.regsiter_handlers(connection);
        });
        websocket.on('connectFailed', (error) => {
            logger.warn(`[${this.name}] [Listener] 连接失败：${error}`);
            setTimeout(this.connect.bind(this), this.interval);
        });
        websocket.connect(this.websocket_uri, null, null, this.headers);
    }

    regsiter_handlers(connection) {
        logger.info(`[${this.name}] [Listener] 与机器人的连接已建立！`);
        connection.on('close', (code, reason) => {
            logger.info(`[${this.name}] [Listener] 与机器人的连接已断开！`);
            setTimeout(this.connect.bind(this), this.interval);
        });
        connection.on('error', (error) => {
            logger.error(`[${this.name}] [Listener] 连接遇到错误：${error}`);
        });
        connection.on('message', async (message) => {
            const data = decode(message.utf8Data);
            logger.info(`[${this.name}] [Listener] 收到来自机器人的消息 ${data}`);
            let data_content = data.data;
            const response = await new Promise((resolve) => {
                this.emit(data.type, data_content, resolve);
            });
            if (response === undefined) return;
            if (response !== null) {
                logger.debug(`[${this.name}] [Listener] 向机器人发送消息 ${response}`);
                this.websocket.send(encode({ success: true, data: response }));
                return;
            }
            logger.warn(`[${this.name}] [Listener] 收到无法解析的消息！`);
            this.websocket.send(encode({ success: false }));
        });
    }
}

module.exports = WebsocketListener;
