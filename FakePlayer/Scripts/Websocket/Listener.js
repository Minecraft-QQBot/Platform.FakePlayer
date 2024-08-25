const { EventEmitter } = require('events');
const { client: WebSocketClient } = require('websocket');

const Config = require('../Config.js');
const { encode, decode, logger } = require('../Utils.js');

class WebsocketListener extends EventEmitter {
    name = null;

    player = null;
    headers = null;
    
    websocket = null;
    websocket_uri = null

    constructor(name) {
        super();

        var config = Config.read_config();
        this.name = name;
        this.websocket_uri = (config.uri + 'websocket/minecraft');

        this.headers = {
            type: 'FakePlayer',
            info: encode({token: config.token, name: name})
        };

        this.websocket = new WebSocketClient();
        this.websocket.on('connect', (connection) => {
            this.emit('connected');
            this.regsiter_handlers(connection);
        });
        this.websocket.on('connectFailed', (error) => {
            logger.error(`[Listener] [${name}] 连接失败：${error}`);
            setTimeout(this.connect.bind(this), config.reconnect_interval);
        });

        this.connect();
    }

    regsiter_handlers(connection) {
        logger.info(`[Listener] [${this.name}] 与机器人的连接已建立！`);
        connection.on('close', (code, reason) => {
            logger.info(`[Listener] [${this.name}] 与机器人的连接已断开！`);
            this.emit('closed');
            setTimeout(this.connect, this.name.reconnect_interval);
        });
        connection.on('error', (error) => {
            logger.error(`[Listener] [${this.name}] 连接遇到错误：${error}`);
        });
        connection.on('message', (message) => {
            let data = decode(message.utf8Data);
            logger.info(`[Listener] [${this.name}] 收到来自机器人的消息 ${JSON.stringify(data)}`);
            let event_type = data.type;
            let data_content = data.data;
            let response = null;
            if (event_type === 'message') {
                logger.info(`tellraw @a ${JSON.stringify(data_content)}`);
                return;
            }
            else if (event_type === 'command') response = this.command(data_content);
            else if (event_type === 'player_list') response = this.player_list(data_content);
            if (response !== null) {
                logger.debug(`[Listener] [${this.name}] 向机器人发送消息 ${JSON.stringify(response)}`);
                this.websocket.sendUTF(encode({ success: true, data: response }));
                return;
            }
            logger.warning(`[Listener] [${this.name}] 收到无法解析的消息！`);
            this.websocket.sendUTF(encode({ success: false }));
        });
    }

    connect() {
        logger.info(`[Listener] [${this.name}] 正在尝试连接到机器人……`);
        this.websocket.connect(this.websocket_uri, null, null, this.headers);
    }

    command(command) {
        // 假设有一个方法来处理命令
        logger.info(`[Listener] [${this.name}] 执行命令: ${command}`);
        return '命令已发送，但由于 Rcon 未连接无返回值。';
    }

    player_list(data) {
        logger.info(`[Listener] [${this.name}] 获取玩家列表……`);
        return [];
    }
}

module.exports = WebsocketListener;
