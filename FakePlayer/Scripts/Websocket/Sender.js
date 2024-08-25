const { client: WebSocketClient } = require('websocket');

const Config = require('../Config.js');
const { encode, decode, logger } = require('../Utils.js');

class WebsocketSender {
    tasks = [];
    responses = [];

    name = null;
    headers = null;

    websocket = null;
    websocket_uri = null;

    constructor(name) {
        let config = Config.read_config();
        this.name = name;
        this.websocket_uri = (config.uri + 'websocket/bot');

        this.headers = {
            type: 'FakePlayer',
            info: encode({token: config.token, name: name})
        };

        this.websocket = new WebSocketClient();
        this.websocket.on('connect', (connection) => {
            this.register_handlers(connection);
            while (this.tasks.length > 0) {
                let task = this.tasks.shift();
                this.send_data(task.event_type, task.data);
            }
        });
        this.websocket.on('connectFailed', (error) => {
            logger.error(`[Sender] [${this.name}] 连接失败：${error.code}`);
        });

        this.connect();
    }

    connect() {
        logger.info(`[Sender] [${this.name}] 正在尝试连接到机器人……`);
        this.websocket.connect(this.websocket_uri);
    }

    register_handlers(connection) {
        logger.info(`[Sender] [${this.name}] 与机器人的连接已建立！`);
        connection.on('close', () => {
            logger.info(`[Sender] 与机器人的连接已断开！`);
        });
        connection.on('error', (error) => {
            logger.error(`[Sender] [${this.name}] 连接遇到错误：${error}`);
        });
        connection.on('message', (message) => {
            if (message.type === 'utf8') {
                let response = decode(message.utf8Data);
                this.responses.push(response.success);
                logger.info(`[Sender] [${this.name}] 收到来自机器人的消息 ${response}`);
            }
        });
    }

    send_data(event_type, data = null) {
        function wait_response(message_data) {
            return new Promise((resolve) => {
                const check_response = () => {
                    if (this.responses.length > 0) {
                        const success = this.responses.shift();
                        if (success) {
                            logger.info(`[Sender] [${this.name}] 发送数据 ${JSON.stringify(message_data)} 成功！`);
                            resolve(true);
                        } else {
                            logger.error(`[Sender] [${this.name}] 发送数据 ${JSON.stringify(message_data)} 失败！请检查机器人是否正常。`);
                            resolve(false);
                        }
                    } else {
                        setTimeout(check_response, 100);
                    }
                };
                check_response();
            });
        }

        let message_data = { type: event_type, data };
    
        if (!this.websocket || this.websocket.readyState !== this.websocket.OPEN) {
            logger.warn(`[Sender] [${this.name}] 与机器人服务器的链接已断开，无法发送数据！正在尝试重新连接……`);
            this.tasks.push(message_data);
            this.connect();
            return Promise.resolve(false);
        }
    
        this.websocket.sendUTF(encode(message_data));
        return wait_response(message_data);
    }
    
    async send_synchronous_message(message) {
        logger.info(`[Sender] [${this.name}] 向 QQ 群发送消息 ${message}`);
        return await this.send_data('message', message);
    }

    async send_startup() {
        let response = await this.send_data('server_startup');
        if (response) logger.info(`[Sender] [${this.name}] 发送服务器启动消息成功！`);
        else logger.error(`[Sender] [${this.name}] 发送服务器启动消息失败！请检查配置或查看是否启动服务端，然后重试。`);
    }

    async send_shutdown() {
        if (await this.send_data('server_shutdown')) logger.info(`[Sender] [${this.name}] 发送服务器关闭消息成功！`);
        else logger.error(`[Sender] [${this.name}] 发送服务器关闭消息失败！请检查配置或查看是否启动服务端，然后重试。`);
    }

    async send_player_chat(player, message) {
        if (await this.send_data('player_chat', [player, message])) logger.info(`[Sender] [${this.name}] 发送玩家 ${player} 消息 ${message} 成功！`);
        else logger.error(`[Sender] [${this.name}] 发送玩家 ${player} 消息 ${message} 失败！请检查配置或查看是否启动服务端，然后重试。`);
    }

    async send_player_left(player) {
        if (await this.send_data('player_left', player)) logger.info(`[Sender] [${this.name}] 发送玩家 ${player} 离开消息成功！`);
        else logger.error(`[Sender] [${this.name}] 发送玩家 ${player} 离开消息失败！请检查配置或查看是否启动服务端，然后重试。`);
    }

    async send_player_joined(player) {
        if (await this.send_data('player_joined', player)) logger.info(`[Sender] [${this.name}] 发送玩家 ${player} 加入消息成功！`);
        else logger.error(`[Sender] [${this.name}] 发送玩家 ${player} 加入消息失败！请检查配置或查看是否启动服务端，然后重试。`);
    }

    async send_player_death(player, message) {
        if (await this.send_data('player_death', [player, message])) logger.info(`[Sender] [${this.name}] 发送玩家 ${player} 死亡消息 ${message} 成功！`);
        else logger.error(`[Sender] [${this.name}] 发送玩家 ${player} 死亡消息 ${message} 失败！请检查配置或查看是否启动服务端，然后重试。`);
    }
}

module.exports = WebsocketSender;
