const { default: KeyvSqlite } = require("@keyv/sqlite");
const { default: Keyv } = require("keyv");
const { config } = require("../lib/config");

module.exports = {
    keyv: new Keyv(new KeyvSqlite(`sqlite://${config.database_path}`)),
};
