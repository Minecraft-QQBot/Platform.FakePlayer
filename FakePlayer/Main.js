const Utils = require('./Scripts/Utils');
const Config = require('./Scripts/Config');
const Player = require('./Scripts/Player');

const config = Config.read_config();
if (config) Utils.logger.info('加载配置文件成功！');
else return Utils.logger.error('加载配置文件失败！已退出程序。');

for (const server of config.servers) {
    Utils.logger.info(`正在创建服务器 ${server.name}……`);
    const player = new Player(config.account, server);
    player.create_connection();
}

