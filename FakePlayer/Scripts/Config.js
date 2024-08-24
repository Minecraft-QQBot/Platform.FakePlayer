const file = require("fs");

exports.read_config = () => {
    try {
        return JSON.parse(file.readFileSync("config.json", "Utf-8"));
    } catch (error) {
        if (error.code === "ENOENT")
            console.warn("[WARNING] 没有找到配置文件，请重新下载后编辑再次尝试！");
        return null;
    }
}
