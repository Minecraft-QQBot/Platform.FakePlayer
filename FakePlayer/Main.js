const Config = require('./Scripts/Config.js');

const config = Config.read_config();
if (config) console.info("[INFO] 加载配置文件成功！");
else return console.error("[ERROR] 加载配置文件失败！已退出程序。");


