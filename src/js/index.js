import m from "mithril";
//import "whatwg-fetch";

import readView from "./views/read";
import errorView from "./views/error";

window.xbreader = (config) => {
    console.log(`${__NAME__} ${__VERSION__}`);
    m.route(document.body, "/error/404", {
        "/read/:id": new readView(config),
        "/preview/:id": "ddddd",
        "/comments": "comments",
        "/lastpage": "lastpage",
        "/settings": "settings",
        "/help": "help",
        "/error/:code": new errorView(config),
        "/error/:code/:message": new errorView(config),
    });
};