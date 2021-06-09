import m from "mithril";

import readView from "./views/read";
import errorView from "./views/error";

/**
 * Exposes loader globally as a function
 */
window.xbreader = (config: XBConfig) => {
    console.log(`${__NAME__} ${__VERSION__}`);
    if(!config)
        config = {} as any as XBConfig;
    config.mount = config.mount ? config.mount : document.body;
    if(config.prefix)
        m.route.prefix = config.prefix;
    m.route(config.mount, "/error/404", {
        "/error/:code": () => new errorView(config),
        "/error/:code/:message": () => new errorView(config),
        "/:id...": {
            onmatch: () => new readView(config)
        }
    });
};