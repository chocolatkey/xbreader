import m from "mithril";

import readView from "./views/read";
import errorView from "./views/error";

window.xbreader = (config) => {
    console.log(`${__NAME__} ${__VERSION__}`);
    const mountingPoint = config.mount ? config.mount : document.body;
    if(config.webpub) // Reader-only mode
        m.route(mountingPoint, "", {
            "": new readView(config),
            "/comments": "comments",
            "/lastpage": "lastpage",
            "/settings": "settings",
            "/help": "help",
            "/error/:code": new errorView(config),
            "/error/:code/:message": new errorView(config),
        });
    else // Complete reader mode
        m.route(mountingPoint, "/error/404", {
            "/read/:id": new readView(config),
            "/preview/:id": "preview",
            "/comments": "comments",
            "/lastpage": "lastpage",
            "/settings": "settings",
            "/help": "help",
            "/error/:code": new errorView(config),
            "/error/:code/:message": new errorView(config),
        });
};