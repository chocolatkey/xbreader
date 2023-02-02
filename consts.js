/* global module require */
const pkg = require("./package.json");
module.exports = {
    __VERSION__: pkg.version + "-" + (new Date).getTime(),
    __NAME__: pkg.name,
};