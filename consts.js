/* eslint-disable @typescript-eslint/no-var-requires */
/* global module require */

const pkg = require("./package.json");
module.exports = {
    __VERSION__: pkg.version + "-" + (new Date).getTime(),
    __NAME__: pkg.name,
    __DSN__: "https://f1e301b1464c459f8536743c6bf7ecec@sentry.chocolatkey.com/5",
    __GA_UA__: false
};