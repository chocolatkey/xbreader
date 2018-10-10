import m from "mithril";

import readView from "./views/read";
import errorView from "./views/error";

window.xbreader = (config) => {
    console.log(`${__NAME__} ${__VERSION__}`);
    if(!config)
        config = {};
    //let rv = new readView(config);

    const mountingPoint = config.mount ? config.mount : document.body;
    if(config.prefix)
        m.route.prefix(config.prefix);
    m.route(mountingPoint, "/error/404", {
        "/:id": {
            onmatch: () => {
                return new readView(config);
            }
        },
        "/:id/preview": new readView(config),
        "/:id/comments": "comments", // commentView
        "/:id/lastpage": "lastpage", // lastPageView
        "/settings": "settings", // settingsView
        "/help": "help", // helpView
        "/error/:code": new errorView(),
        "/error/:code/:message": new errorView(),
    });
};