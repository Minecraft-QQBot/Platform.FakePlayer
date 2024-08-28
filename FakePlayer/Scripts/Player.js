const mineflayer = require('mineflayer');

const { logger } = require('./Utils');
const WebsocketSender = require('./Websocket/Sender');
const WebsocketListener = require('./Websocket/Listener');

class Player {
    name = null;
    account = null;
    account_config = null;

    sender = null;
    listener = null;

    connected = false;
    already_connecting = false;

    constructor(account, server) {
        this.account = {
            host: server.host,
            port: server.port,
            auth: account.auth,
            username: account.username,
            password: account.password,
        };

        this.name = server.name;
        this.account_config = account;
        this.sender = new WebsocketSender(server.name);
        this.listener = new WebsocketListener(server.name);
        this.listener.on('message', this.broadcast_message.bind(this));
        this.listener.on('plauer_list', this.get_player_list.bind(this));
        this.listener.on('command', this.execute_command.bind(this));
        this.listener.on('mcdr_command', this.execute_mcdr_command.bind(this));

        this.sender.connect();
        this.listener.connect();
    }

    close_connection() {
        this.bot.quit();
        this.sender.close();
        this.listener.close();
    }

    create_connection() {
        logger.info(`[${this.name}] [Player] 正在连接到服务器 [${this.name}]……`);
        this.bot = mineflayer.createBot(this.account);
        this.listener.player = this.bot;

        this.bot.on('error', (error) => {
            logger.error(`[${this.name}] [Player] 遇到错误：${error}`);
            if (!this.already_connecting) {
                this.already_connecting = true;
                setTimeout(this.create_connection.bind(this), 10000);
            }
        });
        this.bot.on('death', () => {
            logger.warn(`[${this.name}] [Player] 假人死亡，正在重生……`);
            setTimeout(this.bot.respawn, 1000);
        });

        this.bot.on('kicked', this.on_kicked.bind(this));
        this.bot.on('message', this.on_message.bind(this));

        this.bot.once('login', this.on_login.bind(this));

        this.already_connecting = false;
    }

    async on_login() {
        const execute_command = (index) => {
            if (index >= this.account_config.execute_commands.length || (!this.connected)) return;
            logger.debug(`[${this.name}] [Player] 执行命令：${this.account_config.execute_commands[index]}`)
            this.bot.chat('/' + this.account_config.execute_commands[index]);
            setTimeout(execute_command.bind(this, (index + 1)), 1000);
        }

        this.connected = true;
        logger.info(`[${this.name}] [Player] 已连接到服务器 [${this.name}]！`);
        setTimeout(execute_command.bind(this, 0), 2000);
    }

    async on_kicked(reason) {
        this.connected = false;
        logger.warn(`[${this.name}] [Player] 被踢出服务器：${reason}`);
        if (!this.already_connecting) {
            this.already_connecting = true;
            setTimeout(this.create_connection.bind(this), 10000);
        }
    }

    async on_message(message) {
        const type = message.translate;
        if (!(type && message.with)) {
            logger.info(`[${this.name}] [Player] 收无法解析的到服务器消息：${message}`);
            return;
        }
        const player = message.with[0].text;
        if (player == this.bot.username) return;
        if (type.startsWith('death'))
            await this.sender.send_player_death(player, type);
        else if (type === 'multiplayer.player.left')
            await this.sender.send_player_left(player);
        else if (type === 'multiplayer.player.joined')
            await this.sender.send_player_joined(player);
        else if (type === 'chat.type.text')
            await this.sender.send_player_chat(player, message.with[1].text);
    }

    execute_command (data, resolve) {
        this.bot.chat(data.startsWith('/') ? data : `/${data}`);
        resolve('目前不支持获取执行命令的返回值！');
    }

    execute_mcdr_command (data, resolve) {
        this.bot.chat(data.startsWith('!!') ? data : `!!${data}`);
        resolve('目前不支持获取执行命令的返回值！');
    }

    get_player_list(data, resolve) {
        let players = [];
        for (const player of this.bot.players)
            if (player.username != this.bot.username)
                players.push(player.username);
        resolve(players);
    }

    broadcast_message(data, resolve) {
        if (this.account_config.permission) {
            this.bot.chat(`/tellraw @e ${JSON.stringify(data)}`);
            return resolve(undefined);
        }
        let text_message = '';
        for (const segment of data) text_message += segment.text;
        this.bot.chat(text_message);
        resolve(undefined);
    }
}

module.exports = Player;
