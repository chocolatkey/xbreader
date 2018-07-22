import m from "mithril";
//import "whatwg-fetch";

import readView from "./views/read";

window.xbreader = (config) => {
    m.route(document.body, "/", {
        "/read/:id": new readView(config),
        "/preview/:id": "ddddd",
        "/lastpage": "lastpage",
        "/settings": "settingsz",
        "/help": "help"
    });
};