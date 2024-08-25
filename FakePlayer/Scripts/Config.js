const file = require("fs");

var config = null;

exports.read_config = () => {
    try {
        if (config) return config;
        return (config = JSON.parse(file.readFileSync("config.json", "Utf-8")));
    } catch (error) {
        if (error.code === "ENOENT")
            console.warn("[WARNING] 没有找到配置文件，请重新下载后编辑再次尝试！");
        return null;
    }
}
