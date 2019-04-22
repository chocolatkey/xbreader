import { parse } from "./parseUri";
import sML from "./sMLstub";
import Platform from "./platform";
import Link from "xbreader/models/Link";

const RESOLUTION_LOW = 1280;
const RESOLUTION_MEDIUM = 1600;
const RESOLUTION_HIGH = 2048;

const PRIVATE_IPS = /(^127\.)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)|(^[fF][cCdD])/;
const NG_IMG_MATCHER = /^((.*)nebel\/img\/[A-Za-z0-9+\/=\-_.]+\/)(\d{1,5})\.jpg$/;

export default {
    isApplicableHost: function(href: string) {
        const ele = parse(href);
        let applicable = true;
        const devhosts = [
            PRIVATE_IPS,
            /^localhost/,
            /\.local$/
        ];
        devhosts.forEach((host) => {
            if(ele.host.match(host)) {
                applicable = false;
            }
        });
        if (!/^(?:[a-z]+:)?\/\//i.test(href))
            applicable = false;
        return applicable;
    },
    seededRandom: function(seed: number, max: number, min: number) {
        max = max || 1;
        min = min || 0;
        seed = (seed * 9301 + 49297) % 233280;
        var rnd = seed / 233280;
        return min + rnd * (max - min);
    },
    makeNewDimensions: function(item: Link, newHeight: number) {
        item.Width = Math.floor(newHeight / item.Height * item.Width);
        item.Height = newHeight;
    },
    buildAwareSpec: function(item: Link) {
        let height = item.Height;
        let dDimension = item.Height;
        let tmode = false;
        if((item.Height / item.Width) > 2) { // Very tall image, most likely toon image
            dDimension = item.Width;
            tmode = true;
        }
        const ratio = window.devicePixelRatio || 1;
        let quality = 100;
        if(dDimension > (tmode ? window.innerWidth : window.innerHeight) * ratio * 2)
            height = (tmode ? window.innerWidth : window.innerHeight) * ratio * 2;
        if(sML.Mobile) {
            quality *= 0.9;
            height = tmode ? height : Math.min(dDimension, window.innerHeight * ratio);
        }
        if(ratio < 2) {
            if(height > RESOLUTION_MEDIUM) height = Math.floor(height * 0.9);
            quality = 95;
        } else
            quality *= 0.98;
        switch (Platform.networkType()) {
            case 1: // Medium network
                height = Math.min(dDimension, RESOLUTION_MEDIUM, height);
                break;
            case 2: // Slow network
                height = Math.min(dDimension, RESOLUTION_LOW, height);
                break;
        }
        return {
            quality: Math.floor(quality),
            height: height
        };
    },
    hash: function(host: string, index: number, min: number, max: number) {
        let hash = index;
        for (var i = 0; i < host.length; i++) {
            hash = ((hash << 5) - hash) + host.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.floor(this.seededRandom(hash, min, max));
    },
    // Google Proxy
    google: function(item: Link, index: number) {
        const ele = parse(item.Href);
        let spec = this.buildAwareSpec(item);
        /* if (spec.height >= item.Height)
            spec.height = 0; */
        this.makeNewDimensions(item, spec.height);
        return `https://images${this.hash(ele.host, index, 0, 2)}-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&gadget=a&no_expand=1${item.Height ? "&resize_h=" + item.Height : ""}&rewriteMime=image/*&url=${encodeURIComponent(item.Href)}`;
    },
    // Photon CDN
    // Be aware that URLs with query parameters will not work here
    photon: function(item: Link, index: number) {
        const ele = parse(item.Href);
        const spec = this.buildAwareSpec(item);
        this.makeNewDimensions(item, spec.height);
        return `https://i${this.hash(ele.host, index, 0, 2)}.wp.com/${ele.authority + ele.path}?strip=all&quality=${spec.quality}${item.Height ? "&h=" + item.Height : ""}`;
    },
    // NebelGrind Gate
    nebelgrind: function(item: Link) {
        const match = item.Href.match(NG_IMG_MATCHER);
        if(!match) return item.Href;
        if(!item.Height) return item.Href;
        let givenDimension = this.buildAwareSpec(item).height;
        // Help backend by only requesting fixed resolutions, since this function is replicated in NG's backend anyway
        if (givenDimension <= ((RESOLUTION_LOW + RESOLUTION_MEDIUM) / 2)) {
            givenDimension = RESOLUTION_LOW;
        } else if (givenDimension <= ((RESOLUTION_MEDIUM + RESOLUTION_HIGH) / 2)) {
            givenDimension = RESOLUTION_MEDIUM;
        } else {
            givenDimension = RESOLUTION_HIGH;
        }
        this.makeNewDimensions(item, givenDimension);
        return `${match[1]}${givenDimension}.jpg`;
    },
    image: function(item: Link, index: number) { // TODO preserve original query params
        if(!item) return null;
        if(!this.isApplicableHost(item.Href) || !item.findFlag("isImage")) return item.Href;
        const whatcdn = window.xbconfig.cdn; // TODO not the global (need to figure out how to pass this through the class chain)
        switch (whatcdn) {
            case "photon":
                return this.photon(item, index);
            case "google":
                return this.google(item, index);
            case "nebelgrind":
                return this.nebelgrind(item, index);
            default:
                return item.Href;
        }
    }
};