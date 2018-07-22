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

    get language() {
        if(typeof navigator.language != "string") return "en";
        return (navigator.language.split("-")[0] == "ja") ? "ja" : "en";
    }
}