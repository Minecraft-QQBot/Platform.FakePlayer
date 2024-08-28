const { EventEmitter } = require('events');
const WebSocket = require('ws');

const Config = require('../Config.js');
const { encode, decode, logger } = require('../Utils.js');

class WebsocketListener extends EventEmitter {
    name = null;
    interval = null;

    bot = null;
    headers = null;
    
    websocket = null;
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
    }

    connect() {
        logger.info(`[${this.name}] [Listener] 正在尝试连接到机器人……`);
        this.websocket = new WebSocket(this.websocket_uri, { headers: this.headers });
        this.websocket.on('open', () => {
            this.regsiter_handlers(websocket);
        });
        this.websocket.on('close', () => {
            logger.info(`[${this.name}] [Listener] 与机器人的连接已断开！`);
            setTimeout(this.connect.bind(this), this.interval);
        });
        this.websocket.on('error', (error) => {
            logger.error(`[${this.name}] [Listener] 连接遇到错误：${error}`);
        });
        this.websocket.on('message', async (message) => {

        });
    }

    async deal_message(message) {
        const data = decode(message);
        logger.info(`[${this.name}] [Listener] 收到来自机器人的消息 ${data}`);
        let data_content = data.data;
        const response = await new Promise((resolve) => {
            this.emit(data.type, data_content, resolve);
        });
        if (response === undefined) return;
        if (response !== null) {
            logger.debug(`[${this.name}] [Listener] 向机器人发送消息 ${response}`);
            websocket.send(encode({ success: true, data: response }));
            return;
        }
        logger.warn(`[${this.name}] [Listener] 收到无法解析的消息！`);
        websocket.send(encode({ success: false }));
    }
}

module.exports = WebsocketListener;