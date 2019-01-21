import "@babel/polyfill";
import m from "mithril";

import readView from "./views/read";
import errorView from "./views/error";

/**
 * Exposes loader globally as a function
 */
window.xbreader = (config: XBConfig) => {
    console.log(`${__NAME__} ${__VERSION__}`);
    if(!config)
        config = {} as XBConfig;
    const mountingPoint = config.mount ? config.mount : document.body;
    if(config.prefix)
        m.route.prefix(config.prefix);
    m.route(mountingPoint, "/error/404", {
        "/error/:code": new errorView(config),
        "/error/:code/:message": new errorView(config),
        "/:id": {
            onmatch: () => {
                config.preview = false;
                return new readView(config);
            }
        },
        "/:id/preview": {
            onmatch: () => {
                config.preview = true;
                return new readView(config);
            }
        },
        "/:id/:page": {
            onmatch: () => {
                config.preview = false;
                return new readView(config);
            }
        }
    });
};