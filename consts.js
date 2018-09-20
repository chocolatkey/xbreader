/* global module require */
const pkg = require("./package.json");
module.exports = {
    __VERSION__: JSON.stringify(pkg.version + "-" + (new Date).getTime()),
    __NAME__: JSON.stringify(pkg.name),
    __DEV__: true
};