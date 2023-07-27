import sML from "./sMLstub";

export const language = () => {
    return navigator.language.split("-")[0];
};

const WebPChecker = () => {
    if(sML.UA?.Blink && sML.UA.Blink[0] >= 32)
        // Shortcut for Blink browsers, which have supported WebP for a loooong time
        return true;

    if(sML.UA?.Firefox && sML.UA.Firefox[0] >= 65)
        // Firefox doesn't support canvas detection method, do UA check instead
        return true;

    if(sML.UA?.Safari && sML.UA.Safari[0] >= 14) {
        // Safari doesn't support canvas detection method
        if(sML.OS?.macOS && sML.OS.macOS[0] <= 12)
            // "Safari 14.0 – 15.6 has full support of WebP, but requires macOS 11 Big Sur or later."
            if(sML.UA.Safari[0] < 16) return false;

        // Safari supports WebP now!
        return true;
    }

    const elem = document.createElement("canvas");
    if (elem.getContext && elem.getContext("2d"))
        // was able or not to get WebP representation
        return elem.toDataURL("image/webp").indexOf("data:image/webp") === 0;
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

export const canWebP = WebPChecker();

export const canDrawBitmap = ("createImageBitmap" in window);