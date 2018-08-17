import { parse } from "./parseUri";
import sML from "./sMLstub";
import { MAX_FIT } from "../components/Page";
import Platform from "./platform";

const RESOLUTION_LOW = 1280;
const RESOLUTION_MEDIUM = 1600;
const RESOLUTION_HIGH = 2048;

const PRIVATE_IPS = /(^127\.)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)|(^[fF][cCdD])/;

export default {
    isApplicableHost: function(href) {
        const ele = parse(href);
        let applicable = true;
        const devhosts = [
            PRIVATE_IPS,
            /^localhost/,
        ];
        devhosts.forEach((host) => {
            if(ele.host.match(host)) {
                applicable = false;
            }
        });
        return applicable;
    },
    seededRandom: function(seed, max, min) {
        max = max || 1;
        min = min || 0;
        seed = (seed * 9301 + 49297) % 233280;
        var rnd = seed / 233280;
        return min + rnd * (max - min);
    },
    buildAwareSpec: function(item) {
        const ratio = window.devicePixelRatio || 1;
        let quality = 100;
        let height = item.height;
        if(item.height > window.innerHeight * ratio * 2)
            height = window.innerHeight * ratio * 2;
        if(sML.Mobile) {
            quality *= 0.9;
            height = Math.min(item.height, window.innerHeight * ratio);
        }
        if(ratio < 2) {
            height = MAX_FIT;
            quality = 95;
        }
        else
            quality *= 0.98;
        switch (new Platform().networkType) {
        case 1: // Medium network
            height = Math.min(item.height, RESOLUTION_MEDIUM);
            break;
        case 2: // Slow network
            height = Math.min(item.height, RESOLUTION_LOW);
            break;
        }
        return {
            quality: Math.floor(quality),
            height: height
        };
    },
    hash: function(host, index, min, max) {
        let hash = index;
        for (var i = 0; i < host.length; i++) {
            hash = ((hash << 5) - hash) + host.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.floor(this.seededRandom(hash, min, max));
    },
    // Google Proxy
    google: function(item, index) {
        const ele = parse(item.href);
        let spec = this.buildAwareSpec(item);
        if (spec.height == item.height)
            spec.height = 0;
        return `https://images${this.hash(ele.host, index, 0, 2)}-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&gadget=a&no_expand=1&resize_h=${spec.height}&rewriteMime=image/*&url=${item.href}`;
    },
    // Photon CDN
    photon: function(item, index) {
        const ele = parse(item.href);
        let hash = index;
        for (var i = 0; i < ele.host.length; i++) {
            hash = ((hash << 5) - hash) + ele.host.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        const spec = this.buildAwareSpec(item);
        return `https://i${this.hash(ele.host, index, 0, 2)}.wp.com/${ele.authority + ele.path}?strip=all&quality=${spec.quality}&h=${spec.height}`;
    },
    image: function(item, index) { // TODO preserve original query params
        if(!item) return null;
        if(!__CDN__) return item.href;
        if(!this.isApplicableHost(item.href)) return item.href;
        return this.photon(item, index);
        //return this.google(item, index);
    }
};