export default class Platform {
    /**
     * Determine if browser supports unprefixed transform property.
     * Google Chrome since version 26 supports prefix-less transform
     * @returns {string} - Transform property supported by client.
     */
    static webkitOrNot() {
        const style = document.documentElement.style;
        if (typeof style.transform === "string") {
            return "transform";
        }
        return "WebkitTransform";
    }

    static checkRequestAnimationFrame() {
        var lastTime = 0;
        var vendors = ["ms", "moz", "webkit", "o"];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+"RequestAnimationFrame"];
            window.cancelAnimationFrame = 
              window[vendors[x]+"CancelAnimationFrame"] || window[vendors[x]+"CancelRequestAnimationFrame"];
        }

        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
                    timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
        }

        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
        }
    }

    /**
     * Get network type (limited compatibility: https://caniuse.com/#feat=netinfo)
     * Types:
     * 0 = fast or unknown (default)
     * 1 = medium (3G)
     * 2 = slow (2G)
     */
    static networkType() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if(!connection) // Not supported
            return 0;
        if(connection.effectiveType.indexOf("2g") >= 0)
            return 2;
        if(connection.effectiveType.indexOf("3g") >= 0)
            return 1;
        return 0; // Unknown or other
    }

    static language() {
        return navigator.language.split("-")[0];
    }
}