import m from "mithril";

import readView from "./views/read";
import errorView from "./views/error";

/**
 * Expose globally as a function
 */
window.xbreader = (config) => {
    console.log(`${__NAME__} ${__VERSION__}`);
    if(!config)
        config = {};
    const mountingPoint = config.mount ? config.mount : document.body;
    if(config.prefix)
        m.route.prefix(config.prefix);
    m.route(mountingPoint, "/error/404", {
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
        },
        "/error/:code": new errorView(),
        "/error/:code/:message": new errorView(),
    });
};