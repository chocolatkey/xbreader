import { parse } from "./parseUri";
//import { MAX_FIT } from "../components/Page";
import sML from "./sMLstub";
import { MAX_FIT } from "../components/Page";
export default {
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
        return this.photon(item, index);
        //return this.google(item, index);
    }
};