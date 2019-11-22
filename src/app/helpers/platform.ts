export const language = () => {
    return navigator.language.split("-")[0];
};

const WebPChecker = () => {
    const elem = document.createElement("canvas");
    if (elem.getContext && elem.getContext("2d"))
        // was able or not to get WebP representation
        return elem.toDataURL("image/webp").indexOf("data:image/webp") == 0;
    else
        // very old browser like IE 8, canvas not supported
        return false;
};

export const networkType = () => {
    // @ts-ignore: Network Information API is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if(!connection || !connection.effectiveType) // Not supported
        return 0;
    if(connection.effectiveType.indexOf("2g") >= 0)
        return 2;
    if(connection.effectiveType.indexOf("3g") >= 0)
        return 1;

    return 0; // Unknown or other
};

export const checkRequestAnimationFrame = () => {
    var lastTime = 0;
    var vendors = ["ms", "moz", "webkit", "o"];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+"RequestAnimationFrame"];
        window.cancelAnimationFrame = 
          window[vendors[x]+"CancelAnimationFrame"] || window[vendors[x]+"CancelRequestAnimationFrame"];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback:Function) {
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
};

export const canWebP = WebPChecker();

export const canDrawBitmap = ("createImageBitmap" in window);