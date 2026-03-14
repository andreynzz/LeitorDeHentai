function loadConfig() {
    try {
        return require("../config.json");
    } catch {
        return {};
    }
}

const config = loadConfig();

module.exports = {
    config,
};
