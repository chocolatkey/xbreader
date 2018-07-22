import { USECDN } from "../constants";
import { parse } from "./parseUri";
export default {
    seededRandom: function(seed, max, min) {
        max = max || 1;
        min = min || 0;
        seed = (seed * 9301 + 49297) % 233280;
        var rnd = seed / 233280;
        return min + rnd * (max - min);
    },
    // For now just Photon
    image: function(item, index) {
        if(!item) return null;
        if(!USECDN) return item;
        const ele = parse(item);
        let hash = index;
        for (var i = 0; i < ele.host.length; i++) {
            hash = ((hash << 5) - hash) + ele.host.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }

        return "https://i" + Math.floor(this.seededRandom(hash, 0, 2)) + ".wp.com/" + ele.authority + ele.path + "?quality=100&strip=all";
    }
};