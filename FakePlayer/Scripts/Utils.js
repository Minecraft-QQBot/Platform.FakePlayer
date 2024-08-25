const Utf8 = require('utf8');
const Base64 = require('base-64');

exports.encode = (data) => {
    return Base64.encode(Utf8.encode(JSON.stringify(data)));
};

exports.decode = (string) => {
    try {
        return JSON.parse(Utf8.decode(Base64.decode(string)));
    } catch (error) {
        console.warn('解码数据时遇到错误：', error);
    }
};

exports.logger = new Proxy(console, {
    get(target, key, receiver) {
        const origin_method = target[key];
        return (...args) => {
            const timestamp = new Date().toISOString();
            const prefix_message = `[${timestamp.replace('T',' ').replace('Z', '')}] [${key.toUpperCase()}]`;
            return origin_method.call(target, prefix_message, ...args);
        };
    }
});

