const WebSocket = require('ws');
const Config = require('../Config.js');
const { encode, decode, logger } = require('../Utils.js');

class WebsocketSender {
    tasks = [];
    responses = [];

    name = null;
    headers = null;
    interval = null;

    websocket = null;
    websocket_uri = null;

    constructor(name) {
        let config = Config.read_config();
        this.name = name;
        this.interval = config.reconnect_interval;
        this.websocket_uri = (config.uri + 'websocket/bot');

        this.headers = {
            type: 'FakePlayer',
            info: encode({token: config.token, name: name})
        };
    }

    connect() {
        logger.info(`[${this.name}] [Sender] 正在尝试连接到机器人……`);
        this.websocket = new WebSocket(this.websocket_uri, { headers: this.headers });

        this.websocket.on('open', () => {
            this.register_handlers(this.websocket);
            this.process_tasks();
        });
        this.websocket.on('error', (error) => {
            logger.error(`[${this.name}] [Sender] 连接遇到错误：${error}`);
        });
        this.websocket.on('close', () => {
            logger.info(`[Sender] 与机器人的连接已断开！`);
            setTimeout(() => this.connect(), this.interval);
        });
        this.websocket.on('message', (message) => {
            const response = decode(message);
            const response_resolve = this.responses.shift();
            response_resolve(response);
            logger.info(`[${this.name}] [Sender] 收到来自机器人的消息 ${response}`);
        });
    }

    async process_tasks() {
        while (this.tasks.length > 0) {
            let task = this.tasks.shift();
            if (!await this.send_data(task.event_type, task.data)) break;
        }
    }

    async send_data(event_type, data = null) {
        const message_data = { type: event_type, data };
    
        if (!(this.websocket && this.websocket.readyState === WebSocket.OPEN)) {
            logger.warn(`[${this.name}] [Sender] 与机器人服务器的链接已断开，无法发送数据！正在尝试重新连接……`);
            this.tasks.push(message_data);
            setTimeout(this.connect.bind(this), this.interval);
            return Promise.resolve(false);
        }
    
        this.websocket.send(encode(message_data));
        response_promise = new Promise((resolve) => {
            this.responses.push(resolve);
        });
        return await response_promise;
    }
    
    async send_synchronous_message(message) {
        logger.info(`[${this.name}] [Sender] 向 QQ 群发送消息 ${message}`);
        return await this.send_data('message', message);
    }

    async send_startup() {
        let response = await this.send_data('server_startup');
        if (response) logger.info(`[${this.name}] [Sender] 发送服务器启动消息成功！`);
        else logger.error(`[${this.name}] [Sender] 发送服务器启动消息失败！请检查配置或查看是否启动服务端，然后重试。`);
    }

    async send_shutdown() {
        if (await this.send_data('server_shutdown')) logger.info(`[${this.name}] [Sender] 发送服务器关闭消息成功！`);
        else logger.error(`[${this.name}] [Sender] 发送服务器关闭消息失败！请检查配置或查看是否启动服务端，然后重试。`);
    }

    async send_player_chat(player, message) {
        if (await this.send_data('player_chat', [player, message])) logger.info(`[${this.name}] [Sender] 发送玩家 ${player} 消息 ${message} 成功！`);
        else logger.error(`[${this.name}] [Sender] 发送玩家 ${player} 消息 ${message} 失败！请检查配置或查看是否启动服务端，然后重试。`);
    }

    async send_player_left(player) {
        if (await this.send_data('player_left', player)) logger.info(`[${this.name}] [Sender] 发送玩家 ${player} 离开消息成功！`);
        else logger.error(`[${this.name}] [Sender] 发送玩家 ${player} 离开消息失败！请检查配置或查看是否启动服务端，然后重试。`);
    }

    async send_player_joined(player) {
        if (await this.send_data('player_joined', player)) logger.info(`[${this.name}] [Sender] 发送玩家 ${player} 加入消息成功！`);
        else logger.error(`[${this.name}] [Sender] 发送玩家 ${player} 加入消息失败！请检查配置或查看是否启动服务端，然后重试。`);
    }

    async send_player_death(player, message) {
        if (await this.send_data('player_death', [player, message])) logger.info(`[${this.name}] [Sender] 发送玩家 ${player} 死亡消息 ${message} 成功！`);
        else logger.error(`[${this.name}] [Sender] 发送玩家 ${player} 死亡消息 ${message} 失败！请检查配置或查看是否启动服务端，然后重试。`);
    }
}

module.exports = WebsocketSender;
