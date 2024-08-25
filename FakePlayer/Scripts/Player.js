const mineflayer = require('mineflayer');

const WebsocketSender = require('./Websocket/Sender');
const WebsocketListener = require('./Websocket/Listener');
const { logger } = require('./Utils');

class Player {
    name = null;
    execute_commands = null;

    account = null;
    bot_player = null;

    sender = null;
    listener = null;

    constructor(account, server) {
        this.account = {
            host: server.host,
            port: server.port,
            auth: account.auth,
            username: account.username,
            password: account.password,
        };

        this.name = server.name;
        this.execute_commands = account.execute_commands;
        this.sender = new WebsocketSender(server.name);
        this.listener = new WebsocketListener(server.name);

        this.create_connection();
    }

    create_connection() {
        this.bot_player = mineflayer.createBot(this.account);
        this.listener.player = this.bot_player;

        this.bot_player.on('error', (error) => {
            logger.error(`[Player] 遇到错误：${error.code}`);
        });
        this.bot_player.on('chat', this.on_chat.bind(this));
        this.bot_player.on('message', this.on_message.bind(this));

        this.bot_player.once('spawn', this.on_joined.bind(this));
    }

    async on_joined() {
        logger.info(`[Player] 已连接到服务器 ${this.name}！`);
        for (let command of this.execute_commands) this.bot_player.chat(command);
    }

    async on_message(message) {
        if (message.translate === 'multiplayer.player.joined') {
            console.warn(message.translate, message.with[0].text);
        } else logger.info(`[Player] 收无法解析的到服务器消息：${message.toString()}`);
    }

    async on_chat(username, message) {
        if (this.bot_player.username == username) return;
        if (await this.sender.send_message(username, message)) {
            this.bot_player.chat(`[${username}] ${message}`);
        }
    }
}

module.exports = Player;
